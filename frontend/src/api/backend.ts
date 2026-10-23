export interface TimelineEvent {
  timestamp: string
  source: string
  message: string
}
export interface TimelineResponse {
  incident_id: string
  service: string
  timeline: TimelineEvent[]
}
export interface Health {
  status: string
  llm_configured: boolean
  working_model: string | null
}
export interface VerifyState {
  status: 'resolved' | 'unresolved'
  metrics: {
    before: Record<string, number>
    after: Record<string, number>
  }
}
export const INCIDENT_IDS = ['INC-001', 'INC-002', 'INC-003', 'INC-004']
const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '')
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new Error('Cannot reach the backend. Is n8n running?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (typeof j.detail === 'string') detail = j.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  const data = await res.json()
  // n8n wraps responses in an array; unwrap it.
  return (Array.isArray(data) ? data[0] : data) as T
}
export const getHealth = async (): Promise<Health> => {
  const h = await request<{ n8n?: string; engine?: string }>('/webhook/traceiq-health')
  return { status: h.engine === 'up' ? 'ok' : 'down', llm_configured: h.engine === 'up', working_model: null }
}
export const getTimeline = (id: string) =>
  request<TimelineResponse>(`/webhook/traceiq-timeline?incident_id=${encodeURIComponent(id)}`)
export const getVerifyState = (id: string) =>
  request<VerifyState>('/webhook/traceiq-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: id }),
  })
export const resetDemo = () =>
  request<{ status: string }>('/api/reset', { method: 'POST' })