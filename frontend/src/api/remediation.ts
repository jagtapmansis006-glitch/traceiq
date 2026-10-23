import type {
  N8nRemediateResponse,
  RemediateResponse,
  RemediationOutcome,
  VerifyResponse,
} from '../types/remediation'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env

// 'direct' = call FastAPI (works now). 'n8n' = call the n8n webhooks (team contract).
export const isN8n = env?.VITE_BACKEND_MODE === 'n8n'

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      isN8n
        ? 'Cannot reach n8n. Is it running on port 5678?'
        : 'Cannot reach the backend. Is it running on port 8000?',
    )
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (typeof j.error === 'string') detail = j.error
      else if (typeof j.detail === 'string') detail = j.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export async function runRemediation(
  incidentId: string,
  actionId: string,
): Promise<RemediationOutcome> {
  const body = { incident_id: incidentId, action_id: actionId }

  if (isN8n) {
    const r = await post<N8nRemediateResponse>('/webhook/traceiq-remediate', body)
    if (r.status === 'failed') throw new Error(r.error ?? 'Remediation failed')
    return {
      message: r.message ?? 'Action executed (simulated).',
      before: r.before ?? {},
      after: r.after ?? {},
      resolved: Boolean(r.resolved ?? r.verified),
    }
  }

  const r = await post<RemediateResponse>('/api/remediate', body)
  const v = await post<VerifyResponse>('/api/verify', { incident_id: incidentId })
  return {
    message: r.message,
    before: r.before,
    after: r.after,
    resolved: v.verified,
  }
}