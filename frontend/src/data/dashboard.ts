// SAMPLE DATA for the Overview charts. Replace with real numbers later.
export const TREND_LABELS = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM']

export const TREND_SERIES = [
  { name: 'Critical', color: '#e0584a', values: [2, 3, 2, 5, 7, 6, 4, 3] },
  { name: 'High', color: '#ffa05a', values: [6, 8, 7, 11, 12, 10, 9, 7] },
  { name: 'Medium', color: '#f2c14e', values: [10, 12, 14, 16, 18, 15, 13, 12] },
  { name: 'Low', color: '#35b8a6', values: [5, 7, 8, 9, 8, 7, 6, 5] },
]

export const SERVICE_HEALTH = [
  { label: 'Healthy', value: 8, color: '#35b8a6' },
  { label: 'Degraded', value: 2, color: '#ffb35a' },
  { label: 'Critical', value: 2, color: '#e0584a' },
]

export const RECENT_INCIDENTS = [
  { id: 'INC-001', title: 'API error rate spike', severity: 'Critical', ago: '2m ago' },
  { id: 'INC-002', title: 'Checkout latency increased', severity: 'High', ago: '12m ago' },
  { id: 'INC-003', title: 'Database connection issues', severity: 'High', ago: '24m ago' },
  { id: 'INC-004', title: 'Worker retries elevated', severity: 'Medium', ago: '42m ago' },
]

export const FLOW_STEPS = ['Collect evidence', 'Analyze', 'Identify root cause', 'Recommend actions']