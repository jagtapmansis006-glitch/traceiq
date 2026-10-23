import { Fragment, useEffect, useState, useSyncExternalStore } from 'react'
import './pages.css'
import { clearActivity, getActivity, subscribe } from '../state/activity'
import { AnimatedList, StarBorder } from '../components/bits'
import { useTheme } from '../theme'

const STEPS = [
  'Collect logs',
  'Hypothesize',
  'Validate against evidence',
  'Recommend actions',
  'Human approval',
  'Simulated run + verify',
]

export default function AgentActivityPage({ onInvestigate }: { onInvestigate: () => void }) {
  const events = useSyncExternalStore(subscribe, getActivity)
  const newestFirst = [...events].reverse()
  const { resolved } = useTheme()
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <div className="page-head">
        <h1>Agent Activity</h1>
        <p className="subtitle">
          A record of actions taken in this session. Each entry is something
          that actually happened, with no hidden reasoning shown.
        </p>
      </div>

      <section className="panel page-section">
        <h2>Investigation workflow</h2>
        <p className="muted">How TraceIQ handles an incident (a description, not live status):</p>
        <div className="flow">
          {STEPS.map((s, i) => (
            <Fragment key={s}>
              {i > 0 ? <i>→</i> : null}
              <span className={i === active ? 'flow-on' : undefined}>{s}</span>
            </Fragment>
          ))}
        </div>
      </section>

      <div className="toolbar">
        <button
          type="button"
          className="btn"
          onClick={clearActivity}
          disabled={events.length === 0}
        >
          Clear
        </button>
        <span className="muted">{events.length} event(s) this session</span>
      </div>

      {events.length === 0 ? (
        <section className="panel">
          <h2>No activity yet</h2>
          <p className="muted">
            Run an investigation and approve an action. Events will appear here.
          </p>
          <StarBorder theme={resolved} onClick={onInvestigate}>
            Run an investigation
          </StarBorder>
        </section>
      ) : (
        <AnimatedList
          items={newestFirst}
          theme={resolved}
          frame={false}
          animation="slide"
          width="100%"
          maxHeight={520}
          renderItem={(e) => (
            <div className="act-line">
              <time>{e.time}</time>
              <span className={`kind-pill kind-${e.kind}`}>{e.kind}</span>
              <span className="act-text">
                {e.incidentId ? <strong>{e.incidentId}: </strong> : null}
                {e.text}
              </span>
            </div>
          )}
        />
      )}
    </>
  )
}