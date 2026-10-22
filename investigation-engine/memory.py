"""
TraceIQ incident memory.

Inspired by H-MEM from Meterless (github.com/Meterless/Meterless, engines/hmem):
a long-term memory of past incidents that is SAVED after each investigation and
RECALLED when a similar incident comes in.

HONESTY NOTE: the H-MEM reference implementation is TypeScript/Node.js, while this
engine is Python. This module is therefore a simple JSON-file store in the same
style, NOT the Meterless code. That is why memory_source is "local-memory".
"""
import json
import os
import re
import threading
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEMORY_FILE = os.getenv("TRACEIQ_MEMORY_FILE", os.path.join(BASE_DIR, "memory_store.json"))
MEMORY_SOURCE = "local-memory"   # use "meterless-hmem" ONLY if the Meterless code did the work
MAX_RECORDS = 200
SIMILARITY_THRESHOLD = 0.35

_lock = threading.Lock()

STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "was", "were", "are", "has",
    "have", "had", "not", "but", "into", "than", "then", "its", "due", "after",
    "before", "caused", "causing", "causes", "service", "services", "which", "while",
    "when", "over", "under", "above", "below", "about", "also", "more",
}


def _load() -> list:
    try:
        if not os.path.exists(MEMORY_FILE):
            return []
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        print("--- MEMORY load error:", str(e)[:150])
        return []


def _write(records: list):
    tmp = MEMORY_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
    os.replace(tmp, MEMORY_FILE)


def _tokens(text: str) -> set:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


def save_incident(incident_id: str, service: str, root_cause: str, fix: str) -> bool:
    """Stores one finished investigation as a long-term memory record."""
    try:
        record = {
            "incident_id": incident_id,
            "service": service,
            "root_cause": root_cause,
            "fix": fix,
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        with _lock:
            records = [r for r in _load() if r.get("incident_id") != incident_id]
            records.append(record)
            _write(records[-MAX_RECORDS:])
        print(f"--- MEMORY saved {incident_id} ---")
        return True
    except Exception as e:
        print("--- MEMORY save error (ignored):", str(e)[:150])
        return False


def recall_similar(incident_id: str, service: str, root_cause: str):
    """Returns the most similar PAST incident (same service or similar root cause), or None."""
    try:
        with _lock:
            records = _load()

        current_tokens = _tokens(root_cause)
        best, best_score = None, 0.0

        for r in records:
            if r.get("incident_id") == incident_id:
                continue   # never match the incident with itself

            same_service = (r.get("service", "").lower() == (service or "").lower())
            past_tokens = _tokens(r.get("root_cause", ""))
            union = current_tokens | past_tokens
            sim = len(current_tokens & past_tokens) / len(union) if union else 0.0
            similar_cause = sim >= SIMILARITY_THRESHOLD

            if not (same_service or similar_cause):
                continue

            score = sim + (0.5 if same_service else 0.0)
            if score > best_score or (score == best_score and best and r.get("timestamp", "") > best.get("timestamp", "")):
                best, best_score = r, score
                if same_service and similar_cause:
                    reason = "same service and similar root cause"
                elif same_service:
                    reason = "same service"
                else:
                    reason = "similar root cause"
                best = dict(r, _reason=reason)

        if not best:
            return None

        print(f"--- MEMORY recalled {best['incident_id']} ({best['_reason']}) ---")
        return {
            "id": best["incident_id"],
            "root_cause": best["root_cause"],
            "fix": best["fix"],
            "match_reason": best["_reason"],
        }
    except Exception as e:
        print("--- MEMORY recall error (ignored):", str(e)[:150])
        return None


def list_incidents() -> list:
    """All stored records, newest first (for proof screenshots)."""
    with _lock:
        return list(reversed(_load()))


def clear_memory() -> int:
    """Deletes all records (use before a rehearsal or the real demo)."""
    with _lock:
        count = len(_load())
        _write([])
    return count