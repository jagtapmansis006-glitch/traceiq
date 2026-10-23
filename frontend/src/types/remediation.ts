export type Risk = 'Low' | 'Medium' | 'High'

export interface RemediationAction {
  id: string
  action: string
  risk: Risk
  rollback: string
}

export type Metrics = Record<string, number>

export interface RemediateResponse {
  status: string
  message: string
  before: Metrics
  after: Metrics
  verified: boolean
}

export interface VerifyResponse {
  incident_id: string
  status: 'resolved' | 'unresolved'
  verified: boolean
  metrics: { before: Metrics; after: Metrics }
  message: string
}

export interface N8nRemediateResponse {
  status?: string
  error?: string
  message?: string
  before?: Metrics
  after?: Metrics
  verified?: boolean
  resolved?: boolean
}

// One shape the UI uses, whichever backend mode is active
export interface RemediationOutcome {
  message: string
  before: Metrics
  after: Metrics
  resolved: boolean
}