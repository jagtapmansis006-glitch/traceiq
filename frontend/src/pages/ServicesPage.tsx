import { useCallback, useEffect, useState } from 'react'
import './pages.css'
import {
  INCIDENT_IDS,
  getTimeline,
  getVerifyState,
  type VerifyState,
} from '../api/backend'

interface Row {
  incidentId: string
  service: string
  events: number
  state: VerifyState
}

type Load =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ok'; rows: Row[] }

export default function ServicesPage() {
  const [load, setLoad] = useState<Load>({ phase: 'loading' })

  const fetchAll = useCallback(async () => {
    setLoad({ phase: 'loading' })
    try {
      const rows = await Promise.all(
        INCIDENT_IDS.map(async (id) => {
          const [t, s] = await Promise.all([getTimeline(id), getVerifyState(id)])
          return {
            incidentId: id,
            service: t.service || 'unknown-service',
            events: t.timeline.length,
            state: s,
          }
        }),
      )
      setLoad({ phase: 'ok', rows })
    } catch (e) {
      setLoad({
        phase: 'error',
        message: e instanceof Error ? e.message : 'Could not load services.',
      })
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return (
    <>
      <div className="page-head">
        <h1>Services</h1>
        <p className="subtitle">
          Services affected by the demo incidents. Metrics come from the
          backend&apos;s simulated incident state, not live monitoring.
        </p>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className="btn"
          onClick={fetchAll}
          disabled={load.phase === 'loading'}
        >
          Refresh
        </button>
      </div>

      {load.phase === 'loading' ? (
        <section className="panel">
          <p className="muted">Loading services…</p>
        </section>
      ) : null}

      {load.phase === 'error' ? (
        <div className="notice notice-error" role="alert">
          <p>{load.message}</p>
          <button type="button" className="btn" onClick={fetchAll}>
            Retry
          </button>
        </div>
      ) : null}

      {load.phase === 'ok' && load.rows.length === 0 ? (
        <section className="panel">
          <h2>No services found</h2>
          <p className="muted">The backend returned no incident data.</p>
        </section>
      ) : null}

      {load.phase === 'ok' && load.rows.length > 0 ? (
        <div className="card-grid">
          {load.rows.map((r) => {
            const resolved = r.state.status === 'resolved'
            const keys = Object.keys(r.state.metrics.before)
            return (
              <div className="int-card" key={r.incidentId}>
                <div className="int-top">
                  <h2>{r.service}</h2>
                  <span
                    className={`int-badge ${resolved ? 'int-connected' : 'int-unavailable'}`}
                  >
                    {resolved ? 'Recovered (simulated)' : 'Degraded (simulated)'}
                  </span>
                </div>
                <p className="int-note">
                  Incident {r.incidentId} · {r.events} log events
                </p>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>At incident</th>
                      <th>Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{r.state.metrics.before[k]}</td>
                        <td>{r.state.metrics.after[k] ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}