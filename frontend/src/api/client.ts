import type {
  HealthResponse,
  InvestigationRequest,
  InvestigationResult,
  RemediationResult,
  TimelineResponse,
  VerifyResult,
} from './types'

// All requests use relative URLs. In development the Vite dev server forwards
// them to the backend (see vite.config.ts), so the browser never hits CORS.
// For a deployed build, set VITE_API_BASE_URL (e.g. https://api.example.com).
// This value is a public URL, never a secret.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse'

export class ApiError extends Error {
  kind: ApiErrorKind
  status: number | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  timeoutMs?: number
  // Only safe (read-only) requests are retried automatically.
  retries?: number
  signal?: AbortSignal
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function requestOnce<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', body, timeoutMs = 10_000, signal } = options
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onCallerAbort = () => controller.abort()
  signal?.addEventListener('abort', onCallerAbort)

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      let detail: string | null = null
      try {
        const data = (await response.json()) as { detail?: unknown }
        if (typeof data.detail === 'string') detail = data.detail
      } catch {
        // Response had no JSON body.
      }
      // A gateway/proxy error, or a server error with no explanation, means
      // the backend itself is down or crashed rather than rejecting our request.
      const unreachable =
        [502, 503, 504].includes(response.status) || (response.status >= 500 && detail === null)
      if (unreachable) {
        throw new ApiError(
          'network',
          `The backend is not reachable (HTTP ${response.status}). Is it running?`,
          response.status,
        )
      }
      throw new ApiError(
        'http',
        detail ?? (response.statusText || `Request failed (${response.status})`),
        response.status,
      )
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new ApiError('parse', 'The backend returned a response that is not valid JSON.')
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (timedOut) {
      throw new ApiError('timeout', `The backend did not answer within ${Math.round(timeoutMs / 1000)}s.`)
    }
    if (signal?.aborted) {
      throw new ApiError('network', 'The request was cancelled.')
    }
    throw new ApiError('network', 'Cannot reach the backend. Is it running?')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const retries = options.retries ?? 0
  let attempt = 0
  for (;;) {
    try {
      return await requestOnce<T>(path, options)
    } catch (error) {
      const retryable =
        error instanceof ApiError &&
        (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500)
      if (!retryable || attempt >= retries || options.signal?.aborted) throw error
      attempt += 1
      await sleep(400 * attempt)
    }
  }
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const r = await request<{ working_model?: string | null }>('/api/models', { timeoutMs: 4_000, signal })
  return { status: 'ok', llm_configured: Boolean(r.working_model), working_model: r.working_model ?? null }
}

export function getTimeline(incidentId: string, signal?: AbortSignal) {
  return request<TimelineResponse>(
    `/api/timeline?incident_id=${encodeURIComponent(incidentId)}`,
    { retries: 2, signal },
  )
}

// Investigations call an AI model and can be slow, so the timeout is long.
// They are not retried automatically; the user presses "Retry" in the UI.
export function investigate(payload: InvestigationRequest, signal?: AbortSignal) {
  return request<InvestigationResult>('/webhook/traceiq', {
    method: 'POST',
    body: payload,
    timeoutMs: 120_000,
    signal,
  })
}

export function remediate(incidentId: string, actionId: string, signal?: AbortSignal) {
  return request<RemediationResult>('/api/remediate', {
    method: 'POST',
    body: { incident_id: incidentId, action_id: actionId },
    signal,
  })
}

export function verifyIncident(incidentId: string, signal?: AbortSignal) {
  return request<VerifyResult>('/api/verify', {
    method: 'POST',
    body: { incident_id: incidentId },
    signal,
  })
}

export function resetDemoState(signal?: AbortSignal) {
  return request<{ status: string; incidents: string[] }>('/api/reset', {
    method: 'POST',
    signal,
  })
}
