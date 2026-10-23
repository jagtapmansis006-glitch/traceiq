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
  
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await fetch(path, init)
    } catch {
      throw new Error('Cannot reach the backend. Is it running on port 8000?')
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
    return (await res.json()) as T
  }
  
  export const getHealth = () => request<Health>('/health')
  
  export const getTimeline = (id: string) =>
    request<TimelineResponse>(`/api/timeline?incident_id=${encodeURIComponent(id)}`)
  
  export const getVerifyState = (id: string) =>
    request<VerifyState>('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: id }),
    })
  
  export const resetDemo = () =>
    request<{ status: string }>('/api/reset', { method: 'POST' })