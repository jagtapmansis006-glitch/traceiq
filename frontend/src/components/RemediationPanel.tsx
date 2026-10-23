import { useEffect, useState } from 'react'
import './RemediationPanel.css'
import { runRemediation } from '../api/remediation'
import { addActivity } from '../state/activity'
import StarButton from './StarButton'
import type {
  Metrics,
  RemediationAction,
  RemediationOutcome,
} from '../types/remediation'

type Status = 'pending' | 'rejected' | 'running' | 'done' | 'failed'

interface AuditEntry {
  time: string
  text: string
}

interface Latest {
  actionId: string
  outcome: RemediationOutcome
}

interface Props {
  incidentId: string
  actions: RemediationAction[]
}

function MetricsTable({ before, after }: { before: Metrics; after: Metrics }) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  if (keys.length === 0) {
    return <p className="rem-muted">The backend returned no metrics.</p>
  }
  return (
    <table className="rem-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{before[k] ?? '-'}</td>
            <td>{after[k] ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function RemediationPanel({ incidentId, actions }: Props) {
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [latest, setLatest] = useState<Latest | null>(null)
  const [confirming, setConfirming] = useState<RemediationAction | null>(null)
  const [ack, setAck] = useState(false)

  // Start fresh whenever a new investigation result arrives
  useEffect(() => {
    setStatus({})
    setAudit([])
    setError(null)
    setLatest(null)
    setConfirming(null)
    setAck(false)
  }, [incidentId, actions])

  const busy = Object.values(status).includes('running')

  const log = (
    text: string,
    kind: 'remediation' | 'verification' | 'error' = 'remediation',
  ) => {
    setAudit((a) => [...a, { time: new Date().toLocaleTimeString(), text }])
    addActivity({ kind, text, incidentId })
  }

  const setOne = (id: string, s: Status) =>
    setStatus((prev) => ({ ...prev, [id]: s }))

  function openConfirm(a: RemediationAction) {
    setAck(false)
    setConfirming(a)
  }

  function closeConfirm() {
    setConfirming(null)
    setAck(false)
  }

  async function confirmApprove() {
    const a = confirming
    if (!a) return
    closeConfirm()
    setError(null)
    setOne(a.id, 'running')
    log(`Operator approved ${a.id} (${a.risk} risk): ${a.action}`)
    try {
      const outcome = await runRemediation(incidentId, a.id)
      setOne(a.id, 'done')
      setLatest({ actionId: a.id, outcome })
      log(`Simulated execution of ${a.id} finished. Nothing real was changed.`)
      log(
        outcome.resolved
          ? 'Verification (simulated): resolved'
          : 'Verification (simulated): still failing',
        'verification',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Remediation failed'
      setOne(a.id, 'failed')
      setError(msg)
      log(`Execution of ${a.id} failed: ${msg}`, 'error')
    }
  }

  function reject(a: RemediationAction) {
    setOne(a.id, 'rejected')
    log(`Operator rejected ${a.id}`)
  }

  if (actions.length === 0) {
    return (
      <section className="rem-panel">
        <h3>Recommended actions</h3>
        <p className="rem-muted">No actions were recommended for this incident.</p>
      </section>
    )
  }

  return (
    <section className="rem-panel">
      <div className="rem-head">
        <h3>Recommended actions</h3>
        <span className="rem-sim">Simulated. Nothing runs on real systems.</span>
      </div>

      {error && (
        <div className="rem-error" role="alert">
          {error}
        </div>
      )}

      <ul className="rem-list">
        {actions.map((a) => {
          const s = status[a.id] ?? 'pending'
          return (
            <li key={a.id} className="rem-item">
              <div className="rem-row">
                <strong>{a.action}</strong>
                <span className={`rem-risk rem-risk-${a.risk.toLowerCase()}`}>
                  {a.risk} risk
                </span>
              </div>
              <p className="rem-muted">Rollback: {a.rollback}</p>

              {(s === 'pending' || s === 'failed') && (
                <div className="rem-buttons">
                  <StarButton disabled={busy} onClick={() => openConfirm(a)}>
                    {s === 'failed' ? 'Retry' : 'Approve fix'}
                  </StarButton>
                  <button
                    className="rem-btn"
                    disabled={busy}
                    onClick={() => reject(a)}
                  >
                    Reject
                  </button>
                </div>
              )}
              {s === 'running' && (
                <p className="rem-muted">Running simulated action…</p>
              )}
              {s === 'done' && <p className="rem-ok">Executed (simulated)</p>}
              {s === 'rejected' && (
                <p className="rem-muted">Rejected by operator</p>
              )}
            </li>
          )
        })}
      </ul>

      {latest && (
        <div className="rem-verify">
          <div
            className={`rem-banner ${latest.outcome.resolved ? 'rem-banner-ok' : 'rem-banner-bad'}`}
            role="status"
          >
            <strong>{latest.outcome.resolved ? 'Resolved' : 'Still failing'}</strong>
            <span>{latest.outcome.message}</span>
          </div>
          <MetricsTable
            before={latest.outcome.before}
            after={latest.outcome.after}
          />
          <p className="rem-muted">
            Metrics reported by the backend after the fix.
          </p>
        </div>
      )}

      {audit.length > 0 && (
        <div className="rem-audit">
          <strong>Audit trail</strong>
          <ul>
            {audit.map((e, i) => (
              <li key={i}>
                <span className="rem-time">{e.time}</span> {e.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirming && (
        <div className="rem-overlay" onClick={closeConfirm}>
          <div
            className="rem-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rem-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="rem-dialog-title">Approve this fix?</h4>
            <p>{confirming.action}</p>
            <p className="rem-muted">
              Risk: {confirming.risk}. Rollback: {confirming.rollback}
            </p>
            <p className="rem-muted">
              Only in-memory values change. Nothing touches a real system.
            </p>
            {confirming.risk === 'High' && (
              <label className="rem-ack">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                I understand this is high risk and I approve it.
              </label>
            )}
            <div className="rem-buttons">
              <StarButton
                disabled={confirming.risk === 'High' && !ack}
                onClick={confirmApprove}
              >
                Confirm
              </StarButton>
              <button className="rem-btn" onClick={closeConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}