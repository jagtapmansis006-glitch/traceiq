import { useCallback, useEffect, useMemo, useState } from 'react'
import './pages.css'
import { INCIDENT_IDS, getTimeline } from '../api/backend'
import { AnimatedList } from '../components/bits'
import { useTheme } from '../theme'

interface LogRow {
  incidentId: string
  service: string
  timestamp: string
  source: string
  message: string
}

type Load =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ok'; rows: LogRow[]; failed: string[] }

export default function LogsPage() {
  const [load, setLoad] = useState<Load>({ phase: 'loading' })
  const [query, setQuery] = useState('')
  const [incident, setIncident] = useState('all')
  const [source, setSource] = useState('all')

  const { resolved } = useTheme()

  const fetchAll = useCallback(async () => {
    setLoad({ phase: 'loading' })
    const results = await Promise.allSettled(INCIDENT_IDS.map(getTimeline))
    const rows: LogRow[] = []
    const failed: string[] = []
    let firstError = ''
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        r.value.timeline.forEach((e) =>
          rows.push({
            incidentId: r.value.incident_id,
            service: r.value.service,
            timestamp: e.timestamp,
            source: e.source,
            message: e.message,
          }),
        )
      } else {
        failed.push(INCIDENT_IDS[i])
        if (!firstError) {
          firstError =
            r.reason instanceof Error ? r.reason.message : 'Request failed'
        }
      }
    })
    if (failed.length === INCIDENT_IDS.length) {
      setLoad({ phase: 'error', message: firstError })
      return
    }
    rows.sort(
      (a, b) =>
        a.incidentId.localeCompare(b.incidentId) ||
        a.timestamp.localeCompare(b.timestamp),
    )
    setLoad({ phase: 'ok', rows, failed })
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const allRows = load.phase === 'ok' ? load.rows : []
  const sources = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.source))).sort(),
    [allRows],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter(
      (r) =>
        (incident === 'all' || r.incidentId === incident) &&
        (source === 'all' || r.source === source) &&
        (q === '' ||
          r.message.toLowerCase().includes(q) ||
          r.service.toLowerCase().includes(q)),
    )
  }, [allRows, query, incident, source])

  return (
    <>
      <div className="page-head">
        <h1>Logs</h1>
        <p className="subtitle">
          Sample log events served by the backend for the demo incidents. These
          are not live production logs.
        </p>
      </div>

      <div className="toolbar toolbar-wrap">
        <input
          className="log-search"
          type="search"
          placeholder="Search message or service…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search logs"
        />
        <select
          className="log-select"
          value={incident}
          onChange={(e) => setIncident(e.target.value)}
          aria-label="Filter by incident"
        >
          <option value="all">All incidents</option>
          {INCIDENT_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <select
          className="log-select"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Filter by source"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={fetchAll}
          disabled={load.phase === 'loading'}
        >
          Refresh
        </button>
        Log events for each incident, collected by the backend.
      </div>

      {load.phase === 'loading' ? (
        <section className="panel">
          <p className="muted">Loading logs…</p>
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

      {load.phase === 'ok' && load.failed.length > 0 ? (
        <div className="notice notice-warn">
          Could not load logs for: {load.failed.join(', ')}.
        </div>
      ) : null}

      {load.phase === 'ok' ? (
        visible.length === 0 ? (
          <section className="panel">
            <h2>No matching logs</h2>
            <p className="muted">Try clearing the search or filters.</p>
          </section>
        ) : (
          <section className="panel">
            <p className="muted log-count">
              Showing {visible.length} of {allRows.length} events
            </p>
            <AnimatedList
              items={visible}
              theme={resolved}
              frame={false}
              animation="slide"
              width="100%"
              maxHeight={560}
              gap={6}
              radius={12}
              renderItem={(r) => (
                <div className="log-line">
                  <code className="log-time">{r.timestamp}</code>
                  <code className="log-inc">{r.incidentId}</code>
                  <span className="src-pill">{r.source}</span>
                  <span className="log-msg">
                    <strong>{r.service}</strong> · {r.message}
                  </span>
                </div>
              )}
            />
          </section>
        )
      ) : null}
    </>
  )
}