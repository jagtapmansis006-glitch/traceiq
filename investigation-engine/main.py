import json
import os
import re
from typing import Optional
 
from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel
 
app = FastAPI(title="TraceIQ API", version="1.1")
 
# ---------------------------------------------------------------------------
# Settings (change the model name in the quotes below if you switch models)
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "45"))
 
client = OpenAI(
    base_url=NVIDIA_BASE_URL,
    api_key=os.environ.get("NVIDIA_API_KEY", "missing-key"),
    timeout=LLM_TIMEOUT,
    max_retries=0,
)
 
CONF_TO_PCT = {"High": 90, "Medium": 60, "Low": 30}
 
 
class IncidentRequest(BaseModel):
    incident_id: str
    service: str
    logs: Optional[list] = None
    timestamp: Optional[str] = None
 
 
# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def load_incident_data(incident_id: str):
    """Loads the sample log file for an incident ID (falls back to sample_logs.json)."""
    file_mapping = {
        "INC-001": "sample_logs.json",
        "INC-002": "sample_logs_2.json",
    }
    wanted = file_mapping.get(incident_id, "sample_logs.json")
 
    candidates = []
    for name in (wanted, "sample_logs.json"):
        candidates.append(os.path.join(BASE_DIR, name))
        candidates.append(name)
 
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
 
    raise HTTPException(status_code=404, detail="Incident data source not found.")
 
 
def events_from_logs(logs, request_timestamp):
    """Turns raw log lines sent in the request into timeline events."""
    default_ts = ""
    if request_timestamp and len(request_timestamp) >= 19:
        default_ts = request_timestamp[11:19]
 
    events = []
    for item in logs:
        if isinstance(item, dict):
            events.append({
                "timestamp": str(item.get("timestamp", default_ts)),
                "source": str(item.get("source", "logs")),
                "message": str(item.get("message", json.dumps(item))),
            })
            continue
 
        line = str(item).strip()
        if not line:
            continue
        match = re.match(r"^\[?(\d{2}:\d{2}:\d{2})\]?\s*(.*)$", line)
        if match:
            events.append({"timestamp": match.group(1), "source": "logs", "message": match.group(2) or line})
        else:
            events.append({"timestamp": default_ts, "source": "logs", "message": line})
    return events
 
 
def clean_events(raw_events):
    events = []
    for e in raw_events:
        events.append({
            "timestamp": str(e.get("timestamp", "")),
            "source": str(e.get("source", "unknown")),
            "message": str(e.get("message", "")),
        })
    return sorted(events, key=lambda x: x["timestamp"])
 
 
# ---------------------------------------------------------------------------
# Model output handling
# ---------------------------------------------------------------------------
def extract_json(text):
    """Pulls the first JSON object out of the model's reply (handles think tags and code fences)."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL).strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in model output")
    return json.loads(text[start:end + 1])
 
 
def normalize_result(ai):
    """Validates and cleans the model's JSON so the response shape never breaks."""
    root_cause = str(ai.get("root_cause", "")).strip()
    if not root_cause:
        raise ValueError("Model returned no root_cause")
 
    confidence = str(ai.get("confidence", "")).strip().capitalize()
    if confidence not in CONF_TO_PCT:
        confidence = "Medium"
 
    try:
        pct = int(float(ai.get("confidence_pct")))
        pct = max(0, min(100, pct))
    except (TypeError, ValueError):
        pct = CONF_TO_PCT[confidence]
 
    hypotheses = []
    for i, h in enumerate(ai.get("hypotheses_evaluated") or []):
        if not isinstance(h, dict):
            continue
        status = str(h.get("status", "PLAUSIBLE")).strip().upper()
        if status not in ("REJECTED", "PLAUSIBLE", "SUPPORTED"):
            status = "PLAUSIBLE"
        hypotheses.append({
            "id": str(h.get("id", "H" + str(i + 1))),
            "title": str(h.get("title", "")),
            "status": status,
            "reason": str(h.get("reason", "")),
        })
 
    actions = []
    for i, a in enumerate(ai.get("recommended_actions") or []):
        if not isinstance(a, dict):
            continue
        risk = str(a.get("risk", "Medium")).strip().capitalize()
        if risk not in ("Low", "Medium", "High"):
            risk = "Medium"
        actions.append({
            "id": str(a.get("id", "A" + str(i + 1))),
            "action": str(a.get("action", "")),
            "risk": risk,
            "rollback": str(a.get("rollback", "")),
        })
 
    return {
        "root_cause": root_cause,
        "confidence": confidence,
        "confidence_pct": pct,
        "hypotheses_evaluated": hypotheses,
        "recommended_actions": actions,
    }
 
 
def fallback_result():
    """Canned analysis used only when the model call fails."""
    return {
        "root_cause": "Retry Storm causing Database Connection Exhaustion",
        "confidence": "High",
        "confidence_pct": 90,
        "hypotheses_evaluated": [
            {"id": "H1", "title": "Bad Deployment Regression", "status": "REJECTED",
             "reason": "Deployment occurred at 10:00, but failures surged after retries at 10:03."},
            {"id": "H2", "title": "Database Connection Exhaustion", "status": "PLAUSIBLE",
             "reason": "Database pool reached 100% capacity at 10:04."},
            {"id": "H3", "title": "Retry Storm Overload", "status": "SUPPORTED",
             "reason": "Retry volume surged by 300% at 10:03, saturating the DB pool."},
        ],
        "recommended_actions": [
            {"id": "A1", "action": "Add exponential backoff with jitter to checkout-service retries",
             "risk": "Low", "rollback": "Revert the retry configuration to the previous values"},
            {"id": "A2", "action": "Temporarily rate-limit retry traffic at the API gateway",
             "risk": "Medium", "rollback": "Remove the gateway rate limit"},
        ],
    }
 
 
def build_prompt(service, timeline_text):
    return f"""You are TraceIQ, an evidence-driven AI incident investigator.
Analyze the incident timeline for service '{service}' and find the root cause.
Use ONLY facts present in the timeline. Do not invent events, numbers or times.
 
Timeline:
{timeline_text}
 
Reply with ONE valid JSON object and nothing else (no markdown, no commentary), with these keys:
- "root_cause": string, one clear sentence
- "confidence": "High", "Medium" or "Low"
- "confidence_pct": integer from 0 to 100
- "hypotheses_evaluated": list of exactly 3 objects, each with "id" (H1, H2, H3), "title", "status" (REJECTED, PLAUSIBLE or SUPPORTED) and "reason" (cite times from the timeline)
- "recommended_actions": list of 1 to 3 objects, each with "id" (A1, A2, A3), "action", "risk" (Low, Medium or High) and "rollback"
"""
 
 
# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
 
 
@app.get("/api/timeline")
def get_timeline(incident_id: str = "INC-001"):
    """Returns the sorted chronological timeline events for a given incident."""
    try:
        data = load_incident_data(incident_id)
        return {
            "incident_id": data.get("incident_id", incident_id),
            "service": data.get("service", "checkout-service"),
            "timeline": clean_events(data["timeline_events"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 
@app.post("/api/investigate")
def run_investigation(request: IncidentRequest):
    try:
        if request.logs:
            sorted_events = clean_events(events_from_logs(request.logs, request.timestamp))
        else:
            data = load_incident_data(request.incident_id)
            sorted_events = clean_events(data["timeline_events"])
 
        if not sorted_events:
            raise HTTPException(status_code=400, detail="No log events to analyze.")
 
        timeline_text = "\n".join(
            "[{}] ({}): {}".format(e["timestamp"], e["source"].upper(), e["message"])
            for e in sorted_events
        )
 
        source = "llm"
        try:
            completion = client.chat.completions.create(
                model=NVIDIA_MODEL,
                messages=[{"role": "user", "content": build_prompt(request.service, timeline_text)}],
                temperature=0.2,
                max_tokens=4096,
            )
            message = completion.choices[0].message
            text = message.content or getattr(message, "reasoning_content", None) or ""
            result = normalize_result(extract_json(text))
        except Exception as ai_err:
            print("--- NVIDIA API ERROR ---", type(ai_err).__name__, str(ai_err)[:300], flush=True)
            result = fallback_result()
            source = "fallback"
 
        supported = [h["reason"] for h in result["hypotheses_evaluated"] if h["status"] == "SUPPORTED"]
        plausible = [h["reason"] for h in result["hypotheses_evaluated"] if h["status"] == "PLAUSIBLE"]
 
        return {
            "incident_id": request.incident_id,
            "service": request.service,
            "status": "completed",
            "source": source,
            "timeline": sorted_events,
            "hypotheses_evaluated": result["hypotheses_evaluated"],
            "root_cause": result["root_cause"],
            "confidence": result["confidence"],
            "confidence_pct": result["confidence_pct"],
            "evidence": supported + plausible,
            "recommended_actions": result["recommended_actions"],
        }
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
