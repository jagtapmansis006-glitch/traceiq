import { useSyncExternalStore } from 'react'

const KEY = 'traceiq:prefs'

export type Prefs = { sparks: boolean; background: boolean; intensity: number }

const DEFAULTS: Prefs = { sparks: true, background: true, intensity: 1 }

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    // Storage blocked: use defaults.
  }
  return DEFAULTS
}

let current = read()
const listeners = new Set<() => void>()

export function setPrefs(next: Partial<Prefs>) {
  current = { ...current, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Still applies for this visit.
  }
  listeners.forEach((l) => l())
}

export function usePrefs() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}