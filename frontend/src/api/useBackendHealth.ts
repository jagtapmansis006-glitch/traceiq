import { useCallback, useEffect, useState } from 'react'
import { getHealth } from './client'
import type { HealthResponse } from './types'

export type BackendHealth =
  | { state: 'checking' }
  | { state: 'online'; info: HealthResponse }
  | { state: 'offline'; reason: string }

const POLL_INTERVAL_MS = 10_000

// Asks the real backend (/health) whether it is alive, now and every 15s.
// Never assumes "healthy": until the backend answers, the state is "checking".
export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealth>({ state: 'checking' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then((info) => {
        if (!controller.signal.aborted) setHealth({ state: 'online', info })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const reason = error instanceof Error ? error.message : 'Unknown error'
        setHealth({ state: 'offline', reason })
      })

    const timer = setTimeout(() => setTick((value) => value + 1), POLL_INTERVAL_MS)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [tick])

  const recheck = useCallback(() => {
    setHealth({ state: 'checking' })
    setTick((value) => value + 1)
  }, [])

  return { health, recheck }
}
