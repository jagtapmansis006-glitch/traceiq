export interface Preset {
    incident_id: string
    service: string
  }
  
  export const PRESETS: Preset[] = [
    { incident_id: 'INC-001', service: 'checkout-service' },
    { incident_id: 'INC-002', service: 'auth-service' },
    { incident_id: 'INC-003', service: 'payment-service' },
    { incident_id: 'INC-004', service: 'api-gateway' },
  ]