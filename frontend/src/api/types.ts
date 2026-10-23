// Types that mirror the FastAPI backend (investigation-engine/main.py).
// If the backend changes a field, change it here first and let TypeScript
// point out every screen that needs updating.

export type HealthResponse = {
  status: string
  llm_configured: boolean
  working_model: string | null
  // Only sent by mock-backend.mjs (the stand-in dev server). The real
  // backend never sends it, so the UI can warn when you are not talking
  // to the real investigation engine.
  mock?: boolean
}

export type TimelineEvent = {
  timestamp: string
  source: string
  message: string
}

export type HypothesisStatus = 'REJECTED' | 'PLAUSIBLE' | 'SUPPORTED'

export type Hypothesis = {
  id: string
  title: string
  status: HypothesisStatus
  reason: string
}

export type ActionRisk = 'Low' | 'Medium' | 'High'

export type RecommendedAction = {
  id: string
  action: string
  risk: ActionRisk
  rollback: string
}

// "llm"      = the AI model produced this answer.
// "fallback" = the backend used a canned answer because the model failed
//              or no API key is configured. The UI must always show this.
export type ResultSource = 'llm' | 'fallback'

export type InvestigationRequest = {
  incident_id: string
  service: string
}

export type InvestigationResult = {
  incident_id: string
  service: string
  source: ResultSource
  model: string | null
  status: string
  timestamp: string | null
  timeline: TimelineEvent[]
  hypotheses_evaluated: Hypothesis[]
  root_cause: string
  confidence: string
  confidence_pct: number
  evidence: string[]
  recommended_actions: RecommendedAction[]
}

export type TimelineResponse = {
  incident_id: string
  service: string
  timeline: TimelineEvent[]
}

export type RemediationResult = {
  status: string
  message: string
  before: Record<string, number>
  after: Record<string, number>
  verified: boolean
}

export type VerifyResult = {
  incident_id: string
  status: 'resolved' | 'unresolved'
  verified: boolean
  metrics: {
    before: Record<string, number>
    after: Record<string, number>
  }
  message: string
}
