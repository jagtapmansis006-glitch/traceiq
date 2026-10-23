import { useSyncExternalStore } from 'react'

export type Profile = {
  name: string
  role: string
  signedIn: boolean
  animations: boolean
}

const KEY = 'traceiq:profile'
const DEFAULT: Profile = { name: '', role: 'On-call engineer', signedIn: false, animations: true }

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

let current: Profile = load()
const listeners = new Set<() => void>()

export function updateProfile(patch: Partial<Profile>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Storage unavailable: the profile just lasts until the page is closed.
  }
  listeners.forEach((l) => l())
}

export function useProfile(): Profile {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
    },
    () => current,
  )
}
