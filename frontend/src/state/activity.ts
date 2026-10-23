export type ActivityKind = 'investigation' | 'remediation' | 'verification' | 'error'

export interface ActivityEvent {
  id: number
  time: string
  kind: ActivityKind
  text: string
  incidentId?: string
}

let events: ActivityEvent[] = []
let nextId = 1
const listeners = new Set<() => void>()

export function addActivity(e: {
  kind: ActivityKind
  text: string
  incidentId?: string
}) {
  events = [
    ...events,
    { id: nextId++, time: new Date().toLocaleTimeString(), ...e },
  ]
  listeners.forEach((l) => l())
}

export function clearActivity() {
  events = []
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getActivity() {
  return events
}