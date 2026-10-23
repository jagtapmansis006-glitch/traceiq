// TraceIQ stand-in backend for frontend development.
//
//   node mock-backend.mjs
//
// This is NOT the real investigation engine. It replays ONE recorded answer
// (INC-001, captured from the teammates' real backend fallback output) so the
// frontend can be built and tested without Python or Docker. It reports itself
// as a mock on /health so the top bar says so. Stop it and start the real
// backend on the same port (8000) and the frontend works unchanged.

import http from 'node:http'

const PORT = Number(process.env.PORT ?? 8000)
const DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 1500)

const TIMELINE_001 = [
  { timestamp: '10:00:12', source: 'deployment', message: 'New deployment of checkout-service v1.4.2 completed successfully.' },
  { timestamp: '10:03:45', source: 'metrics', message: 'HTTP 500 error rate surged by 300% on payment gateway calls.' },
  { timestamp: '10:04:10', source: 'database', message: 'Database connection pool reached 100% capacity (max connections: 500).' },
  { timestamp: '10:04:50', source: 'gateway', message: 'API Gateway triggered circuit breaker due to downstream timeout.' },
]

const RESULT_001 = {
  incident_id: 'INC-001',
  service: 'checkout-service',
  source: 'fallback',
  model: null,
  status: 'completed',
  timestamp: null,
  timeline: TIMELINE_001,
  hypotheses_evaluated: [
    { id: 'H1', title: 'Bad Deployment Regression', status: 'REJECTED', reason: 'Deployment occurred at 10:00, but failures surged after retries at 10:03.' },
    { id: 'H2', title: 'Database Connection Exhaustion', status: 'PLAUSIBLE', reason: 'Database pool reached 100% capacity at 10:04.' },
    { id: 'H3', title: 'Retry Storm Overload', status: 'SUPPORTED', reason: 'Retry volume surged by 300% at 10:03, saturating the DB pool.' },
  ],
  root_cause: 'Retry Storm causing Database Connection Exhaustion',
  confidence: 'High',
  confidence_pct: 90,
  evidence: [
    'Retry volume surged by 300% at 10:03, saturating the DB pool.',
    'Database pool reached 100% capacity at 10:04.',
  ],
  recommended_actions: [
    { id: 'A1', action: 'Add exponential backoff with jitter to checkout-service retries', risk: 'Low', rollback: 'Revert the retry configuration to the previous values' },
    { id: 'A2', action: 'Temporarily rate-limit retry traffic at the API gateway', risk: 'Medium', rollback: 'Remove the gateway rate limit' },
  ],
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readJson = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch {
        resolve(null)
      }
    })
  })

const noRecording = (id) =>
  `Mock server only has a recorded result for INC-001 (asked for ${id}). Start the real backend to investigate the others.`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', llm_configured: false, working_model: null, mock: true })
  }

  if (req.method === 'GET' && url.pathname === '/api/timeline') {
    const id = url.searchParams.get('incident_id') ?? 'INC-001'
    if (id !== 'INC-001') return sendJson(res, 404, { detail: noRecording(id) })
    return sendJson(res, 200, { incident_id: 'INC-001', service: 'checkout-service', timeline: TIMELINE_001 })
  }

  if (req.method === 'POST' && url.pathname === '/api/investigate') {
    const body = await readJson(req)
    if (!body || typeof body.incident_id !== 'string') {
      return sendJson(res, 422, { detail: 'Request body must be JSON with incident_id and service.' })
    }
    return setTimeout(() => {
      if (body.incident_id !== 'INC-001') return sendJson(res, 404, { detail: noRecording(body.incident_id) })
      sendJson(res, 200, RESULT_001)
    }, DELAY_MS)
  }

  sendJson(res, 404, { detail: 'Not Found (the mock server only implements health, timeline and investigate)' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TraceIQ MOCK backend listening on http://localhost:${PORT}`)
  console.log('This is a stand-in, not the real investigation engine. Ctrl+C to stop.')
})
