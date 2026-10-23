// The incidents the investigation backend can analyse. The IDs and services
// match the sample log files that ship with the backend
// (investigation-engine/sample_logs*.json). This is demo data, not a live feed.

export type SampleIncident = {
  id: string
  service: string
}

export const SAMPLE_INCIDENTS_NOTICE =
  'Sample incidents only: these IDs match the demo log files that ship with the investigation backend. They are not live production telemetry.'

export const SAMPLE_INCIDENTS: SampleIncident[] = [
  { id: 'INC-001', service: 'checkout-service' },
  { id: 'INC-002', service: 'auth-service' },
  { id: 'INC-003', service: 'payment-service' },
  { id: 'INC-004', service: 'api-gateway' },
]
