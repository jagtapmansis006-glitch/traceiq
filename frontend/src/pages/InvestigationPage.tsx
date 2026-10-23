import { useEffect, useState } from 'react'
import { useInvestigation } from '../api/useInvestigation'
import InvestigationReport from '../components/InvestigationReport'
import InvestigationLoader from '../components/InvestigationLoader'
import StarButton from '../components/StarButton'
import { SAMPLE_INCIDENTS } from '../data/sampleIncidents'
import { PRESETS, type Preset } from '../data/investigationPresets'
import './pages.css'

type Props = { request?: { id: string; service: string; n: number } | null }

function InvestigationPage({ request }: Props) {
  const [incidentId, setIncidentId] = useState(SAMPLE_INCIDENTS[0].id)
  const { state, run, cancel } = useInvestigation()

  useEffect(() => {
    if (!request) return
    if (SAMPLE_INCIDENTS.some((i) => i.id === request.id)) setIncidentId(request.id)
    run({ incident_id: request.id, service: request.service })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n])

  const selected =
    SAMPLE_INCIDENTS.find((incident) => incident.id === incidentId) ?? SAMPLE_INCIDENTS[0]
  const busy = state.phase === 'running'

  const start = () => run({ incident_id: selected.id, service: selected.service })

  const runPreset = (preset: Preset) => {
    if (SAMPLE_INCIDENTS.some((incident) => incident.id === preset.incident_id)) {
      setIncidentId(preset.incident_id)
    }
    run({ incident_id: preset.incident_id, service: preset.service })
  }

  return (
    <>
      <h1>Investigation</h1>
      <p className="subtitle">
        Pick an incident and run the investigation agent. Every result on this page comes
        from the TraceIQ backend; this page does not make anything up.
      </p>

      <section className="panel preset-panel" aria-label="Quick shorts">
        <span className="preset-label">Quick start</span>
        <div className="preset-row">
          {PRESETS.map((preset) => (
            <button
              key={preset.incident_id}
              type="button"
              className="btn preset-btn"
              disabled={busy}
              onClick={() => runPreset(preset)}
            >
              <code>{preset.incident_id}</code> {preset.service}
            </button>
          ))}
        </div>
      </section>

      <section className="panel run-panel" aria-label="Run an investigation">
        <label className="field">
          <span>Incident</span>
          <select
            value={incidentId}
            disabled={busy}
            onChange={(event) => setIncidentId(event.target.value)}
          >
            {SAMPLE_INCIDENTS.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.id} · {incident.service}
              </option>
            ))}
          </select>
        </label>
        <StarButton disabled={busy} onClick={start}>
          {busy ? 'Investigating…' : 'Run investigation'}
        </StarButton>
        {busy ? (
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        ) : null}
      </section>

      {state.phase === 'idle' ? (
        <section className="panel empty-panel">
          <h2>No investigation yet</h2>
          <p className="muted">
            Choose an incident and press <strong>Run investigation</strong>. The agent will
            reconstruct the timeline, weigh competing root causes and recommend actions.
          </p>
        </section>
      ) : null}

      {state.phase === 'running' ? (
        <InvestigationLoader
          incidentId={state.request.incident_id}
          startedAt={state.startedAt}
        />
      ) : null}

      {state.phase === 'error' ? (
        <section className="panel notice notice-error" role="alert">
          <h2>Investigation failed</h2>
          <p>{state.message}</p>
          {state.kind === 'network' ? (
            <p className="muted">
              Check that the backend is running. The status in the top bar shows whether this
              page can reach it.
            </p>
          ) : null}
          <button type="button" className="btn" onClick={() => run(state.request)}>
            Retry
          </button>
        </section>
      ) : null}

      {state.phase === 'done' ? (
        <InvestigationReport result={state.result} cachedAt={state.cachedAt} />
      ) : null}
    </>
  )
}

export default InvestigationPage