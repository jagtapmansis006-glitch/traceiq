import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, investigate } from './client'
import type { ApiErrorKind } from './client'
import type { InvestigationRequest, InvestigationResult } from './types'

export type InvestigationState =
  | { phase: 'idle' }
  | { phase: 'running'; request: InvestigationRequest; startedAt: number }
  | {
      phase: 'done'
      request: InvestigationRequest
      result: InvestigationResult
      // null = fresh answer from the backend. A date = saved earlier (offline mode).
      cachedAt: string | null
    }
  | {
      phase: 'error'
      request: InvestigationRequest
      message: string
      kind: ApiErrorKind | 'unknown'
    }

type CacheEntry = { savedAt: string; result: InvestigationResult }

const cacheKey = (request: InvestigationRequest) =>
  `traceiq:last-result:${request.incident_id}:${request.service}`

function saveCache(request: InvestigationRequest, result: InvestigationResult) {
  try {
    const entry: CacheEntry = { savedAt: new Date().toISOString(), result }
    localStorage.setItem(cacheKey(request), JSON.stringify(entry))
  } catch {
    // Storage unavailable or full: offline mode simply will not have this entry.
  }
}

function loadCache(request: InvestigationRequest): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(request))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    return entry && entry.result ? entry : null
  } catch {
    return null
  }
}

// Runs one investigation at a time against the real backend.
// Starting a new run (or cancelling) ignores the answer of any older run.
// If the backend cannot be reached, the last real answer saved for the same
// incident is shown instead, and the page labels it as cached.
export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>({ phase: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  const run = useCallback((request: InvestigationRequest) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ phase: 'running', request, startedAt: Date.now() })

    investigate(request, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        saveCache(request, result)
        setState({ phase: 'done', request, result, cachedAt: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError) {
          const unreachable = error.kind === 'network' || error.kind === 'timeout'
          const cached = unreachable ? loadCache(request) : null
          if (cached) {
            setState({
              phase: 'done',
              request,
              result: cached.result,
              cachedAt: cached.savedAt,
            })
            return
          }
          setState({ phase: 'error', request, message: error.message, kind: error.kind })
        } else {
          setState({ phase: 'error', request, message: 'Something unexpected went wrong.', kind: 'unknown' })
        }
      })
  }, [])

  // Stops waiting for the answer. The backend may still finish the request.
  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState({ phase: 'idle' })
  }, [])

  useEffect(() => () => controllerRef.current?.abort(), [])

  return { state, run, cancel }
}