from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any, List, Literal, Optional, Union
from contextlib import asynccontextmanager
import copy
import hashlib
import json
import os
import time
import threading
from dotenv import load_dotenv
from openai import OpenAI

# Reads NVIDIA_API_KEY from the .env file (or from the environment inside Docker)
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------
# NVIDIA client (key comes from .env, never hardcode it here)
# ---------------------------------------------------------------
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

client = None
if NVIDIA_API_KEY:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY,
        timeout=30.0,
        max_retries=0,
    )
else:
    print("WARNING: NVIDIA_API_KEY not found - using fallback responses only.")

# Models to try, in order. Only models listed as live for your key are used.
PREFERRED_MODELS = [
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
]

# Skip models that are not plain chat models
SKIP_WORDS = ("embed", "rerank", "guard", "safety", "reward", "vision",
              "clip", "parse", "retriev", "whisper", "tts", "asr", "image",
              "diffusion", "code", "coder")

TIME_BUDGET_SECONDS = 50   # must stay under the n8n timeout (60 s)

BAD_MODELS = set()      # models that returned 404/410 (retired / no access)
WORKING_MODEL = None    # last model that worked
_model_cache = {"time": 0.0, "ids": []}

# Saved AI answers, so repeat calls (and the demo) are instant
LLM_CACHE = {}
LAST_ACTIONS = {}       # last recommended actions per incident

SAMPLE_FILES = {
    "INC-001": "sample_logs.json",
    "INC-002": "sample_logs_2.json",
    "INC-003": "sample_logs_3.json",
    "INC-004": "sample_logs_4.json",
}

# Services used for the startup warm-up
WARMUP_TARGETS = [
    ("INC-001", "checkout-service"),
    ("INC-002", "auth-service"),
    ("INC-003", "payment-service"),
    ("INC-004", "api-gateway"),
]

# Checks for the built-in sample incidents only (not for custom logs)
REQUIRED_WORDS = {
    "INC-001": ["retry", "retries"],
    "INC-002": ["redis"],
    "INC-003": ["stripe"],
    "INC-004": ["cert", "tls"],
}
FORBIDDEN_WORDS = {
    "INC-001": ["leak", "introduced", "bug"],
}


def confidence_label(pct: int) -> str:
    if pct >= 80:
        return "High"
    if pct >= 50:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------
# Fallback responses (demo safety net)
# ---------------------------------------------------------------
FALLBACKS = {
    "INC-001": {
        "root_cause": "A 300% surge in client retries at 10:03:10 caused HTTP 500 errors, which exhausted the database connection pool and tripped the API Gateway circuit breaker.",
        "confidence_pct": 87,
        "hypotheses_evaluated": [
            {"id": "H1", "title": "Bad Deployment Regression", "status": "REJECTED", "reason": "[10:00:12] Deployment completed successfully; failures only began after the retry surge at [10:03:10]."},
            {"id": "H2", "title": "Database Connection Exhaustion", "status": "PLAUSIBLE", "reason": "[10:04:10] Pool reached 100% capacity, but this happened after the retry surge and the 500 errors."},
            {"id": "H3", "title": "Retry Storm Overload", "status": "SUPPORTED", "reason": "[10:03:10] Retry volume surged by 300%, which preceded the errors at [10:03:45] and the pool saturation at [10:04:10]."},
        ],
        "evidence": [
            "[10:03:10] Client retry volume to the payment gateway surged by 300%",
            "[10:03:45] HTTP 500 error rate surged by 300% on payment gateway calls",
            "[10:04:10] Database connection pool reached 100% capacity (max connections: 500)",
            "[10:04:50] API Gateway triggered circuit breaker due to downstream timeout",
        ],
        "recommended_actions": [
            {"id": "A1", "action": "Add exponential backoff with jitter to client retries and cap the retry rate to the payment gateway", "risk": "Low", "rollback": "Revert the retry configuration to the previous values"},
            {"id": "A2", "action": "Temporarily raise the database connection pool limit", "risk": "Medium", "rollback": "Revert the pool limit to 500"},
        ],
    },
    "INC-002": {
        "root_cause": "Redis session store memory utilization reached 95% at 14:15:00, causing upstream 504 Gateway Timeouts on token validation.",
        "confidence_pct": 90,
        "hypotheses_evaluated": [
            {"id": "H1", "title": "PostgreSQL Query Lock", "status": "REJECTED", "reason": "[14:20:05] PostgreSQL query queue depth remained normal."},
            {"id": "H2", "title": "Redis Memory Exhaustion", "status": "SUPPORTED", "reason": "[14:15:00] Redis memory hit 95%, followed by 504 errors at [14:18:22]."},
            {"id": "H3", "title": "API Gateway Misconfiguration", "status": "PLAUSIBLE", "reason": "[14:18:22] Gateway returned 504s, but the Redis threshold at [14:15:00] came first."},
        ],
        "evidence": [
            "[14:15:00] Redis session store memory utilization reached 95% threshold",
            "[14:18:22] Gateway returning 504 Gateway Timeout for login token validation requests",
            "[14:20:05] PostgreSQL query queue depth normal, indicating auth service is failing upstream of DB",
        ],
        "recommended_actions": [
            {"id": "A1", "action": "Evict expired sessions and stale keys from the Redis session store", "risk": "Low", "rollback": "No data rollback needed; affected users simply log in again"},
            {"id": "A2", "action": "Increase Redis maxmemory and set an eviction policy (allkeys-lru)", "risk": "Medium", "rollback": "Revert maxmemory and the eviction policy to the previous values"},
        ],
    },
    "INC-003": {
        "root_cause": "Stripe payment gateway latency spiked above 4000ms at 16:45:10, causing the transaction queue to back up with 1,200 pending checkout requests.",
        "confidence_pct": 92,
        "hypotheses_evaluated": [
            {"id": "H1", "title": "Internal Payment Worker Crash", "status": "REJECTED", "reason": "[16:46:00] Workers were active but queued behind slow external responses."},
            {"id": "H2", "title": "Stripe Gateway Latency", "status": "SUPPORTED", "reason": "[16:45:10] Stripe latency spiked above 4000ms before the queue backlog at [16:46:00]."},
            {"id": "H3", "title": "Database Deadlock", "status": "REJECTED", "reason": "No log line reports database locks or pool saturation."},
        ],
        "evidence": [
            "[16:45:10] Stripe payment gateway response latency spiked above 4000ms",
            "[16:46:00] Transaction queue backing up with 1,200 pending checkout requests",
            "[16:48:30] High error rate alarm triggered for payment processing timeouts",
        ],
        "recommended_actions": [
            {"id": "A1", "action": "Enable a request timeout and circuit breaker for Stripe calls and queue failed payments for retry", "risk": "Low", "rollback": "Disable the circuit breaker flag"},
            {"id": "A2", "action": "Scale out payment workers to drain the pending backlog", "risk": "Medium", "rollback": "Scale workers back to the original count"},
        ],
    },
    "INC-004": {
        "root_cause": "The TLS certificate for api.internal.example.com expired at 09:00:00 after auto-renewal failed, causing TLS handshake failures on upstream calls.",
        "confidence_pct": 95,
        "hypotheses_evaluated": [
            {"id": "H1", "title": "Backend Service Outage", "status": "REJECTED", "reason": "[09:00:42] Failures are TLS handshake errors ('certificate has expired'), not backend crashes."},
            {"id": "H2", "title": "Expired TLS Certificate", "status": "SUPPORTED", "reason": "[09:00:00] The certificate expired and handshake failures began at [09:00:42]."},
            {"id": "H3", "title": "Gateway Traffic Overload", "status": "REJECTED", "reason": "No log line shows a traffic increase; errors began right after the expiry at [09:00:00]."},
        ],
        "evidence": [
            "[08:00:00] Auto-renewal job for the TLS certificate failed; certificate expires in 1 hour",
            "[09:00:00] TLS certificate for api.internal.example.com expired",
            "[09:00:42] TLS handshake failures surged to 85% ('certificate has expired')",
            "[09:02:15] HTTP 503 error rate reached 70% on requests routed through the gateway",
        ],
        "recommended_actions": [
            {"id": "A1", "action": "Renew and deploy the TLS certificate for api.internal.example.com", "risk": "Low", "rollback": "Redeploy the previous gateway TLS configuration"},
            {"id": "A2", "action": "Fix the auto-renewal job and add certificate expiry alerts", "risk": "Low", "rollback": "Disable the renewal job and alert rule"},
        ],
    },
}

# Used when the AI fails on custom logs (no sample answer exists for them)
GENERIC_FALLBACK = {
    "root_cause": "The engine could not complete an automated analysis of these logs. Review the timeline manually.",
    "confidence_pct": 30,
    "hypotheses_evaluated": [
        {"id": "H1", "title": "Automated analysis unavailable", "status": "PLAUSIBLE", "reason": "The AI service did not return a valid analysis for these logs."},
    ],
    "evidence": [],
    "recommended_actions": [],
}

for _fb in list(FALLBACKS.values()) + [GENERIC_FALLBACK]:
    _fb["confidence"] = confidence_label(_fb["confidence_pct"])


# ---------------------------------------------------------------
# Request models
# ---------------------------------------------------------------
class IncidentRequest(BaseModel):
    incident_id: str
    service: str
    logs: Optional[Union[List[Any], str]] = None
    timestamp: Optional[str] = None


class RemediateRequest(BaseModel):
    incident_id: str
    action_id: str


class VerifyRequest(BaseModel):
    incident_id: str


# ---------------------------------------------------------------
# AI answer models (Pydantic validation)
# ---------------------------------------------------------------
class Hypothesis(BaseModel):
    id: str
    title: str
    status: Literal["REJECTED", "PLAUSIBLE", "SUPPORTED"]
    reason: str


class Action(BaseModel):
    id: str
    action: str
    risk: Literal["Low", "Medium", "High"]
    rollback: str


class LLMResult(BaseModel):
    root_cause: str
    confidence_pct: int = Field(ge=0, le=100)
    hypotheses_evaluated: List[Hypothesis]
    evidence: List[str]
    recommended_actions: List[Action]


# ---------------------------------------------------------------
# Simulated incident state (for remediate / verify)
# ---------------------------------------------------------------
INITIAL_STATES = {
    "INC-001": {"db_pool_pct": 100, "error_rate_pct": 42},
    "INC-002": {"redis_memory_pct": 95, "timeout_rate_pct": 30},
    "INC-003": {"gateway_latency_ms": 4200, "queue_depth": 1200},
    "INC-004": {"cert_days_remaining": 0, "tls_error_rate_pct": 85},
}
FIXED_STATES = {
    "INC-001": {"db_pool_pct": 38, "error_rate_pct": 1},
    "INC-002": {"redis_memory_pct": 52, "timeout_rate_pct": 0},
    "INC-003": {"gateway_latency_ms": 180, "queue_depth": 5},
    "INC-004": {"cert_days_remaining": 90, "tls_error_rate_pct": 0},
}
GENERIC_INITIAL = {"error_rate_pct": 40}
GENERIC_FIXED = {"error_rate_pct": 1}

incident_states = copy.deepcopy(INITIAL_STATES)


def reset_state(incident_id: str):
    incident_states[incident_id] = copy.deepcopy(INITIAL_STATES.get(incident_id, GENERIC_INITIAL))


# ---------------------------------------------------------------
# Loading and normalising logs
# ---------------------------------------------------------------
def load_incident_data(incident_id: str):
    """Loads the sample log file for a known incident ID."""
    filename = SAMPLE_FILES.get(incident_id)
    if not filename:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown incident_id '{incident_id}' and no logs were provided.",
        )

    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Incident data file {filename} not found.")

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"{filename} has a JSON syntax error: {e}. Check for a missing comma or bracket.",
        )


def normalize_logs(logs) -> list:
    """Turns request logs (strings or objects) into timeline events."""
    if isinstance(logs, str):
        logs = logs.splitlines()

    events = []
    for item in logs or []:
        if isinstance(item, dict):
            events.append({
                "timestamp": str(item.get("timestamp", "")),
                "source": str(item.get("source", "log")),
                "message": str(item.get("message", item.get("msg", ""))),
            })
            continue

        text = str(item).strip()
        if not text:
            continue

        ts, source, msg = "", "log", text
        if text.startswith("[") and "]" in text:
            ts, rest = text[1:].split("]", 1)
            msg = rest.strip()
        else:
            parts = text.split(None, 1)
            if len(parts) == 2 and ":" in parts[0] and any(c.isdigit() for c in parts[0]):
                ts, msg = parts

        if msg.startswith("(") and ")" in msg:
            source, rest = msg[1:].split(")", 1)
            msg = rest.lstrip(" :-").strip()

        events.append({"timestamp": ts.strip(), "source": source.strip().lower() or "log", "message": msg})

    return events


def get_events(incident_id: str, logs):
    """Returns (sorted events, used_sample). Uses request logs if given, else the sample file."""
    events = normalize_logs(logs) if logs else []
    if events:
        return sorted(events, key=lambda x: x["timestamp"]), False

    data = load_incident_data(incident_id)
    return sorted(data["timeline_events"], key=lambda x: x["timestamp"]), True


# ---------------------------------------------------------------
# Prompt and AI calling
# ---------------------------------------------------------------
def timeline_to_text(events: list) -> str:
    return "\n".join(
        [f"[{e['timestamp']}] ({e['source'].upper()}): {e['message']}" for e in events]
    )


def build_prompt(service: str, events: list, timestamp: Optional[str]) -> str:
    reported = f"\nIncident reported at: {timestamp}\n" if timestamp else ""
    return f"""
You are TraceIQ, an evidence-driven AI incident investigator. Analyze the incident timeline for service '{service}' and evaluate competing hypotheses to find the root cause.
{reported}
Timeline:
{timeline_to_text(events)}

STRICT RULES:
1. Use ONLY facts stated in the timeline above. Do NOT invent causes, components, metrics or events that are not in the timeline (for example, do not claim a "leak" unless a log line says so).
2. Every "reason" must quote at least one exact timestamp from the timeline as evidence.
3. Calculate time gaps carefully from the timestamps. Do not guess them.
4. A cause must happen BEFORE its effects. Reject hypotheses where the timing does not fit.
5. If the evidence does not prove the cause, give a confidence_pct below 70 and say what is unknown.
6. A deployment that happened earlier is only a correlation. Do NOT call a deployment the cause unless a log line shows the deployment itself failing or changing behavior.
7. Never write phrases like "introduced code changes" or "introduced a bug" unless a log line says so.
8. The root cause must be the EARLIEST abnormal event in the chain that can explain the later ones. Never name a later event (such as pool exhaustion) as the root cause if an earlier abnormal event (such as a traffic or retry surge) came first and could have produced it.
9. Exactly ONE hypothesis must describe the root cause you name and have status "SUPPORTED". Its title must restate that root cause in plain words. The other two hypotheses must be alternative explanations that are REJECTED or PLAUSIBLE. Never mark all three hypotheses REJECTED.
10. "evidence" must contain 3 to 5 strings, each copying one timeline line with its exact timestamp, in the form "[timestamp] message".
11. "recommended_actions" must contain 1 or 2 concrete fixes that address the root cause. Each has an "id" ("A1", "A2"), a one-sentence "action", a "risk" ("Low", "Medium" or "High"), and a one-sentence "rollback" that says how to undo it.

12. A deployment log that says it "completed successfully" is NOT an abnormal event. Start the chain at the first log line that reports abnormal behaviour (a surge, spike, failure, expiry or saturation).

Example of the exact JSON shape (the values are placeholders, write your own from the timeline):
{{"root_cause": "...", "confidence_pct": 80, "hypotheses_evaluated": [{{"id": "H1", "title": "...", "status": "REJECTED", "reason": "[hh:mm:ss] ..."}}, {{"id": "H2", "title": "...", "status": "SUPPORTED", "reason": "[hh:mm:ss] ..."}}, {{"id": "H3", "title": "...", "status": "PLAUSIBLE", "reason": "[hh:mm:ss] ..."}}], "evidence": ["[hh:mm:ss] ..."], "recommended_actions": [{{"id": "A1", "action": "...", "risk": "Low", "rollback": "..."}}]}}

Respond with ONLY a valid JSON object (no explanation, no markdown) with these keys:
- "root_cause": one sentence, based only on timeline evidence
- "confidence_pct": integer from 0 to 100
- "hypotheses_evaluated": a list of exactly 3 objects, each with "id" (H1, H2, H3), "title", "status" (REJECTED, PLAUSIBLE, or SUPPORTED), and "reason" (one short sentence quoting timestamps)
- "evidence": list of strings (rule 10)
- "recommended_actions": list of objects (rule 11)
"""


def extract_json(text: str) -> dict:
    """Pulls the JSON object out of the model's reply, even with extra text around it."""
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON found in model response")
    return json.loads(text[start:end])


def validate_result(incident_id: str, raw: dict, check_words: bool) -> dict:
    """Validates and cleans the AI answer. Raises ValueError if it is not good enough."""
    if not isinstance(raw, dict):
        raise ValueError("Answer is not a JSON object")

    raw = dict(raw)

    # --- normalise common model quirks ---
    pct = raw.get("confidence_pct")
    if isinstance(pct, str):
        pct = pct.replace("%", "").strip()
    try:
        pct = float(pct)
    except (TypeError, ValueError):
        raise ValueError("confidence_pct is missing or not a number")
    if 0 < pct <= 1:
        pct *= 100
    raw["confidence_pct"] = int(round(pct))

    hyps = raw.get("hypotheses_evaluated")
    if isinstance(hyps, list) and len(hyps) > 3:
        # keep the SUPPORTED one, then fill up to 3 with the others
        sup = [h for h in hyps if isinstance(h, dict) and str(h.get("status", "")).upper() == "SUPPORTED"][:1]
        rest = [h for h in hyps if not any(h is x for x in sup)]
        hyps = sup + rest[:3 - len(sup)]
        raw["hypotheses_evaluated"] = hyps
    for i, h in enumerate(raw.get("hypotheses_evaluated") or []):
        if isinstance(h, dict):
            h["id"] = f"H{i + 1}"
            h["status"] = str(h.get("status", "")).upper()
            if not h.get("title"):
                h["title"] = str(h.get("hypothesis") or h.get("name") or h.get("cause") or "")
            if not h.get("reason"):
                h["reason"] = str(h.get("explanation") or h.get("rationale") or h.get("evidence") or "")

    if isinstance(raw.get("evidence"), list):
        raw["evidence"] = [e if isinstance(e, str) else json.dumps(e) for e in raw["evidence"]]

    for i, a in enumerate(raw.get("recommended_actions") or []):
        if isinstance(a, dict):
            a["id"] = f"A{i + 1}"
            a["risk"] = str(a.get("risk", "")).capitalize()
            if not a.get("action"):
                a["action"] = str(a.get("description") or a.get("fix") or a.get("step") or "")
            if not a.get("rollback"):
                a["rollback"] = str(a.get("rollback_plan") or "Revert the change to the previous configuration")

    # --- Pydantic structure check ---
    result = LLMResult.model_validate(raw).model_dump()

    # --- content checks ---
    if len(result["hypotheses_evaluated"]) != 3:
        raise ValueError("Need exactly 3 hypotheses")
    statuses = [h["status"] for h in result["hypotheses_evaluated"]]
    if statuses.count("SUPPORTED") != 1:
        raise ValueError("Exactly one hypothesis must be SUPPORTED")
    if not 1 <= len(result["recommended_actions"]) <= 3:
        raise ValueError("Need 1 to 3 recommended actions")
    if len(result["evidence"]) < 1:
        raise ValueError("Evidence list is empty")

    if check_words:
        root = result["root_cause"].lower()
        required = REQUIRED_WORDS.get(incident_id)
        if required and not any(w in root for w in required):
            raise ValueError("Root cause does not match the log evidence")
        if any(w in root for w in FORBIDDEN_WORDS.get(incident_id, [])):
            raise ValueError("Root cause contains an unsupported claim")

    result["confidence"] = confidence_label(result["confidence_pct"])
    return result


def get_candidate_models():
    """Asks NVIDIA which models are live, then returns a SHORT ordered list."""
    now = time.time()
    if _model_cache["ids"] and now - _model_cache["time"] < 600:
        return _model_cache["ids"]

    live = []
    try:
        live = [m.id for m in client.models.list().data]
    except Exception as e:
        print("--- Could not list models:", str(e)[:150])

    ordered = [m for m in PREFERRED_MODELS if (not live or m in live)]
    extras = [m for m in live
              if m not in ordered and not any(w in m.lower() for w in SKIP_WORDS)]
    ordered += extras[:2]   # at most 2 extra models, to avoid long loops

    _model_cache["time"] = now
    _model_cache["ids"] = ordered
    return ordered


def call_model(model_name: str, prompt: str):
    """Calls one model. Turns off 'thinking' mode for speed; retries without it if rejected."""
    kwargs = dict(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1800,
    )
    try:
        return client.chat.completions.create(
            **kwargs,
            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
        )
    except Exception as e:
        s = str(e)
        if "400" in s or "422" in s:
            return client.chat.completions.create(**kwargs)
        raise


def ask_llm(prompt: str, deadline: float) -> dict:
    """Tries models until one returns JSON; remembers the working one."""
    global WORKING_MODEL

    if client is None:
        raise RuntimeError("No NVIDIA API key configured")

    candidates = [m for m in get_candidate_models() if m not in BAD_MODELS]
    if WORKING_MODEL and WORKING_MODEL in candidates:
        candidates.remove(WORKING_MODEL)
        candidates.insert(0, WORKING_MODEL)

    last_error = None
    for model_name in candidates:
        attempts = 2 if model_name == WORKING_MODEL else 1   # retry the known-good model once
        for _ in range(attempts):
            if time.time() > deadline:
                raise RuntimeError("Time budget exceeded")
            try:
                completion = call_model(model_name, prompt)
                text = completion.choices[0].message.content or ""
                result = extract_json(text)
                WORKING_MODEL = model_name
                print(f"--- LLM OK using model: {model_name} ---")
                return result
            except Exception as e:
                print(f"--- Model {model_name} failed: {str(e)[:150]}")
                last_error = e
                if "404" in str(e) or "410" in str(e):
                    BAD_MODELS.add(model_name)
                    break   # no point retrying a dead model

    raise RuntimeError(f"All models failed. Last error: {last_error}")


def ask_llm_checked(incident_id: str, prompt: str, check_words: bool) -> dict:
    """Asks the AI, validates the answer, and retries ONCE if it is not good enough."""
    deadline = time.time() + TIME_BUDGET_SECONDS
    for attempt in (1, 2):
        raw = ask_llm(prompt, deadline)
        try:
            return validate_result(incident_id, raw, check_words)
        except Exception as e:
            print(f"--- Answer for {incident_id} rejected (attempt {attempt}/2): {str(e)[:150]}")
    raise RuntimeError(f"AI answer for {incident_id} failed validation after retry")


def investigate_core(incident_id: str, service: str, events: list,
                     timestamp: Optional[str], used_sample: bool):
    """Returns (result, source). Uses the cache, then the AI, then the fallback."""
    digest = hashlib.md5(timeline_to_text(events).encode("utf-8")).hexdigest()
    cache_key = (incident_id, service, digest)

    if cache_key in LLM_CACHE:
        return LLM_CACHE[cache_key], "llm"

    try:
        result = ask_llm_checked(
            incident_id, build_prompt(service, events, timestamp), check_words=used_sample
        )
        LLM_CACHE[cache_key] = result
        return result, "llm"
    except Exception as e:
        print("--- NVIDIA API ERROR ---", str(e)[:200])
        fallback = FALLBACKS.get(incident_id) if used_sample else None
        return (fallback or GENERIC_FALLBACK), "fallback"


def warmup():
    """Runs in the background at startup: asks the AI about each sample incident and saves the answers."""
    for inc_id, service in WARMUP_TARGETS:
        try:
            events, used_sample = get_events(inc_id, None)
            result, source = investigate_core(inc_id, service, events, None, used_sample)
            print(f"--- WARMUP done for {inc_id} (source: {source}) ---")
        except Exception as e:
            print(f"--- WARMUP failed for {inc_id}: {str(e)[:200]}")
    print("--- WARMUP finished ---")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if client is not None:
        threading.Thread(target=warmup, daemon=True).start()
    yield


app = FastAPI(title="TraceIQ API", version="1.1", lifespan=lifespan)


# ---------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------
@app.get("/health")
def health():
    """Used by the n8n health webhook."""
    return {"status": "ok", "llm_configured": client is not None, "working_model": WORKING_MODEL}


@app.get("/api/models")
def list_models():
    """Shows which models are being used right now."""
    if client is None:
        raise HTTPException(status_code=400, detail="No NVIDIA API key configured")
    return {
        "models": get_candidate_models(),
        "working_model": WORKING_MODEL,
        "cached_answers": len(LLM_CACHE),
    }


@app.get("/api/timeline")
def get_timeline(incident_id: str = "INC-001"):
    """Returns the sorted chronological timeline events for a given incident."""
    data = load_incident_data(incident_id)
    sorted_events = sorted(data["timeline_events"], key=lambda x: x["timestamp"])
    return {
        "incident_id": data.get("incident_id", incident_id),
        "service": data.get("service", ""),
        "timeline": sorted_events,
    }


@app.post("/api/investigate")
def run_investigation(request: IncidentRequest):
    try:
        events, used_sample = get_events(request.incident_id, request.logs)

        result, source_val = investigate_core(
            request.incident_id, request.service, events, request.timestamp, used_sample
        )

        # A new investigation means the incident is "open" again (clean rehearsals)
        reset_state(request.incident_id)
        LAST_ACTIONS[request.incident_id] = result.get("recommended_actions", [])

        return {
            "incident_id": request.incident_id,
            "service": request.service,
            "source": source_val,
            "model": WORKING_MODEL if source_val == "llm" else None,
            "status": "completed",
            "timestamp": request.timestamp,
            "timeline": events,
            "hypotheses_evaluated": result.get("hypotheses_evaluated", []),
            "root_cause": result.get("root_cause", ""),
            "confidence": result.get("confidence", "Medium"),
            "confidence_pct": result.get("confidence_pct", 0),
            "evidence": result.get("evidence", []),
            "recommended_actions": result.get("recommended_actions", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/remediate")
def run_remediation(request: RemediateRequest):
    """Simulates executing a fix action and updates the incident state."""
    inc_id = request.incident_id

    if inc_id not in incident_states:
        reset_state(inc_id)

    before_state = copy.deepcopy(incident_states[inc_id])
    after_state = copy.deepcopy(FIXED_STATES.get(inc_id, GENERIC_FIXED))
    incident_states[inc_id] = after_state

    action_text = ""
    for a in LAST_ACTIONS.get(inc_id, []):
        if a.get("id") == request.action_id:
            action_text = a.get("action", "")

    message = f"Successfully executed action {request.action_id}"
    if action_text:
        message += f" ({action_text})"
    message += f" for {inc_id}"

    return {
        "status": "executed",
        "message": message,
        "before": before_state,
        "after": after_state,
        "verified": after_state == FIXED_STATES.get(inc_id, GENERIC_FIXED),
    }


@app.post("/api/verify")
def verify_incident(request: VerifyRequest):
    """Returns before and after metrics and whether the incident is really resolved."""
    inc_id = request.incident_id

    initial = copy.deepcopy(INITIAL_STATES.get(inc_id, GENERIC_INITIAL))
    current = copy.deepcopy(incident_states.get(inc_id, initial))
    fixed = FIXED_STATES.get(inc_id, GENERIC_FIXED)
    resolved = current == fixed

    return {
        "incident_id": inc_id,
        "status": "resolved" if resolved else "unresolved",
        "verified": resolved,
        "metrics": {"before": initial, "after": current},
        "message": (
            "System metrics have normalized and verification checks passed successfully."
            if resolved
            else "Metrics have not recovered yet. Run a remediation action and verify again."
        ),
    }


@app.post("/api/reset")
def reset_all():
    """Puts every incident back into its broken starting state (use between rehearsals)."""
    incident_states.clear()
    incident_states.update(copy.deepcopy(INITIAL_STATES))
    return {"status": "reset", "incidents": list(incident_states.keys())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)