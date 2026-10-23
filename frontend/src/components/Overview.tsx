import { useEffect, useState } from 'react'
import { useBackendHealth } from '../api/useBackendHealth'
import { FLOW_STEPS, RECENT_INCIDENTS, SERVICE_HEALTH, TREND_LABELS, TREND_SERIES } from '../data/dashboard'
import { Donut, StatCard, TrendChart } from './charts'
import './overview.css'
import { AnimatedList } from './bits'
import { useTheme } from '../theme'
import { useProfile } from '../profile'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Overview() {
  const { health } = useBackendHealth()
  const { resolved } = useTheme()
  const [step, setStep] = useState(0)
  const { name } = useProfile()

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % FLOW_STEPS.length), 1600)
    return () => clearInterval(id)
  }, [])

  const online = health.state === 'online'
  const pill =
    health.state === 'checking' ? 'Checking backend…' : online ? 'Backend online' : 'Backend offline'

  return (
    <>
      <div className="ov-top">
        <div>
          <h1>
            {greeting()}, {name || 'there'} <span className="wave">👋</span>
          </h1>
          <p className="muted">Here’s what’s happening with your systems today.</p>
        </div>
        <div className={`ov-pill ${online ? 'is-on' : 'is-off'}`}>
          <i aria-hidden="true" />
          <span>{pill}</span>
        </div>
      </div>

      <div className="metrics ov-kpis">
        <StatCard label="System health" value={98.6} decimals={1} suffix="%" delta="+0.4%" hint="Availability" glyph="+" tone="ok" />
        <StatCard label="Active incidents" value={4} hint="Needs attention" glyph="!" tone="bad" />
        <StatCard label="MTTR" value={12} suffix="m" delta="-38%" hint="Mean time to resolve" glyph="◷" tone="info" />
        <StatCard label="Resolved today" value={28} delta="+12%" hint="Incidents resolved" glyph="✓" tone="good" />
      </div>

      <div className="overview-grid ov-main">
        <section className="panel ov-card">
          <h2>Incident trend</h2>
          <p className="kind-label">Hover the chart</p>
          <TrendChart labels={TREND_LABELS} series={TREND_SERIES} />
        </section>

        <section className="panel ov-card">
          <h2>Service health</h2>
          <p className="kind-label">Hover a segment</p>
          <Donut segments={SERVICE_HEALTH} centerLabel="Services" />
        </section>

        <section className="panel ov-card">
          <h2>Recent incidents</h2>
          <AnimatedList
            items={RECENT_INCIDENTS}
            theme={resolved}
            frame={false}
            showGradients={false}
            animation="slide"
            width="100%"
            maxHeight={360}
            renderItem={(i) => (
              <div className="inc-line">
                <div className="inc-main">
                  <strong>{i.title}</strong>
                  <span>{i.id}</span>
                </div>
                <span className={`badge severity-${i.severity.toLowerCase()}`}>{i.severity}</span>
                <span className="inc-ago">{i.ago}</span>
              </div>
            )}
          />
        </section>
      </div>

      <section className="panel ov-flow">
        <h2>AI investigation</h2>
        <div className="ov-steps">
          {FLOW_STEPS.map((name, i) => (
            <div key={name} className={`ov-step${i === step ? ' is-on' : ''}${i < step ? ' is-done' : ''}`}>
              <span>{i < step ? '✓' : i + 1}</span>
              {name}
            </div>
          ))}
        </div>
        <p className="muted ov-flow-note">Illustrative loop. Run a real one on the Investigation page.</p>
      </section>
    </>
  )
}

export default Overview