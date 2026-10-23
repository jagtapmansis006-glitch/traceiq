export const DEMO_DATA_NOTICE =
  'Demo dataset only. Incident IDs and services match the backend sample logs, but dates, severities and statuses are canned examples, not live production telemetry.'

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'investigating' | 'monitoring' | 'resolved'

export type DemoIncident = {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  service: string
  occurredAt: string
  detectedAt: string
}

export const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: 'INC-001',
    title: 'Checkout 500 errors with database pool at capacity',
    severity: 'critical',
    status: 'investigating',
    service: 'checkout-service',
    occurredAt: '2026-10-21T10:03:45.000Z',
    detectedAt: '2026-10-21T10:04:50.000Z',
  },
  {
    id: 'INC-002',
    title: 'Login timeouts with Redis session store near memory limit',
    severity: 'high',
    status: 'open',
    service: 'auth-service',
    occurredAt: '2026-10-21T14:15:00.000Z',
    detectedAt: '2026-10-21T14:18:22.000Z',
  },
  {
    id: 'INC-003',
    title: 'Payment processing timeouts with growing transaction queue',
    severity: 'high',
    status: 'open',
    service: 'payment-service',
    occurredAt: '2026-10-21T16:45:10.000Z',
    detectedAt: '2026-10-21T16:48:30.000Z',
  },
  {
    id: 'INC-004',
    title: 'TLS handshake failures after certificate expiry',
    severity: 'critical',
    status: 'open',
    service: 'api-gateway',
    occurredAt: '2026-10-21T09:00:00.000Z',
    detectedAt: '2026-10-21T09:03:30.000Z',
  },
]

export function isOpenIncident(incident: DemoIncident) {
  return incident.status !== 'resolved'
}

export function openIncidentCount(incidents: DemoIncident[] = DEMO_INCIDENTS) {
  return incidents.filter(isOpenIncident).length
}

export function servicesMonitoredCount(
  incidents: DemoIncident[] = DEMO_INCIDENTS,
) {
  return new Set(incidents.map((incident) => incident.service)).size
}

export function meanTimeToDetectMinutes(
  incidents: DemoIncident[] = DEMO_INCIDENTS,
) {
  if (incidents.length === 0) return 0
  const totalMinutes = incidents.reduce((sum, incident) => {
    const occurred = Date.parse(incident.occurredAt)
    const detected = Date.parse(incident.detectedAt)
    return sum + (detected - occurred) / 60_000
  }, 0)

  return Math.round(totalMinutes / incidents.length)
}

export function recentIncidents(
  limit = 5,
  incidents: DemoIncident[] = DEMO_INCIDENTS,
) {
  return [...incidents]
    .sort(
      (left, right) =>
        Date.parse(right.detectedAt) - Date.parse(left.detectedAt),
    )
    .slice(0, limit)
}

export function formatDetectionTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}