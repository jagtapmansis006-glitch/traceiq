# TraceIQ: Handover v2 (for the dashboard developer)

Updated 21 Oct 2026. Replaces the 20 Oct handover. The dashboard talks ONLY to n8n (port 5678), never to the engine directly.

Rules: treat every field as optional, we only ever add fields, never rename or remove.

## 1. Run the backend on your machine

1. Install Docker Desktop and Git.
2. `git clone <repo URL>` (Mansi will invite you to the private repo).
3. Create a file named `.env` in the project folder with one line: `NVIDIA_API_KEY=<your own key from build.nvidia.com>`. Never commit this file.
4. `docker compose up -d`
5. n8n editor: http://localhost:5678. Each workflow must be **Published** (import the three `traceiq-*.json` files from the repo if they are missing).

Or skip all this and call Mansi's machine: use her IP instead of `localhost` (port 5678 must be allowed in her Windows Firewall).

## 2. Endpoints (all via n8n, base http://localhost:5678)

### 2.1 Investigate: POST /webhook/traceiq

Request:
```json
{ "incident_id": "INC-001", "service": "checkout-service" }
```
Optional extra fields: `logs` (array of strings), `timestamp` (ISO string).

Use these exact pairs for the preset buttons (the engine pre-computes and caches these, so they answer instantly):

| Preset | incident_id | service |
|---|---|---|
| 1 | INC-001 | checkout-service |
| 2 | INC-002 | auth-service |
| 3 | INC-003 | payment-service |
| 4 | INC-004 | api-gateway |

Any other service name triggers a live AI call (4 to 40 s).

Response fields: `incident_id`, `service`, `status`, `source` ("llm" or "fallback"), `root_cause`, `confidence` (High/Medium/Low), `confidence_pct` (0 to 100), `timeline[]` (`timestamp` as HH:MM:SS, `source`, `message`), `hypotheses_evaluated[]` (`id`, `title`, `status` = REJECTED / PLAUSIBLE / SUPPORTED, `reason`), `evidence[]` (strings), `recommended_actions[]` (`id`, `action`, `risk` = Low/Medium/High, `rollback`).

Notes:
- `source: "fallback"` means the AI failed or was rejected and a saved answer was returned. Show a small "Fallback" badge. Hide the badge if the field is missing.
- A call can take up to about 40 s for non-cached input. Show a loading state and disable the button.
- Running Investigate again resets the incident to its broken state (useful for rehearsals).

Errors: HTTP 502 with `{ "status": "failed", "error": "..." }` when the engine is down. HTTP 400 with `{ "status": "failed", "error": "..." }` when `incident_id` or `service` is missing. Also handle a network failure (n8n not running).

### 2.2 Approve fix: POST /webhook/traceiq-remediate

Call this only after the user clicks Approve and confirms. Use an `id` from `recommended_actions`.

Request:
```json
{ "incident_id": "INC-001", "action_id": "A1" }
```

Response (200):
```json
{
  "incident_id": "INC-001",
  "action_id": "A1",
  "status": "executed",
  "message": "Successfully executed action A1 (...) for INC-001",
  "before": { "db_pool_pct": 100, "error_rate_pct": 42 },
  "after":  { "db_pool_pct": 38,  "error_rate_pct": 1 },
  "verified": true,
  "resolved": true
}
```

- The keys inside `before` and `after` differ per incident (for example `redis_memory_pct`, `gateway_latency_ms`, `cert_days_remaining`). Render them generically as label/value pairs, not by fixed names.
- Show a green "Resolved" banner when `verified` is true, otherwise a "Still failing" banner.
- Errors: 400 (missing `incident_id` or `action_id`) and 502 (engine down) both return `{ "status": "failed", "error": "..." }`. Show the error. Never show success on an error.
- IMPORTANT: remediation is SIMULATED by design. It changes in-memory numbers only, no real system. Be honest about that if asked.

### 2.3 Health: GET /webhook/traceiq-health

Response: `{ "n8n": "up", "engine": "up" }` or `{ "n8n": "up", "engine": "down" }`.
Poll every 10 s and show a green or red dot in the header. If the request itself fails, treat n8n as down.

## 3. Your task list (from the plan)

Day 1: input and call, loading state, error state, root cause and confidence gauge, timeline (accept HH:MM:SS and full ISO), hypotheses cards coloured by status, evidence list, source badge.
Day 2: recommended actions panel with risk badge, rollback note and an Approve button with a confirmation dialog, remediation call and before/after result, health dot, four preset buttons, offline demo mode (save one real JSON response per incident, show a small "cached" label when the backend is down), polish.

## 4. Questions

Ask Mansi (n8n, repo) or Member 2 (engine and answers).
