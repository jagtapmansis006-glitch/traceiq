import { useCallback, useEffect, useState } from 'react'
import './pages.css'

interface Health {
  status: string
  llm_configured: boolean
  working_model: string | null
}

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ok'; health: Health }

function Badge({ kind, label }: { kind: string; label: string }) {
  return <span className={`int-badge int-${kind}`}>{label}</span>
}

export default function IntegrationsPage() {
  const [state, setState] = useState<State>({ phase: 'loading' })

  const check = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await fetch('/health')
      if (!res.ok) throw new Error(`Backend answered with status ${res.status}`)
      setState({ phase: 'ok', health: (await res.json()) as Health })
    } catch (e) {
      setState({
        phase: 'error',
        message:
          e instanceof Error ? e.message : 'Cannot reach the backend on port 8000.',
      })
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const backendBadge =
    state.phase === 'loading' ? (
      <Badge kind="checking" label="Checking…" />
    ) : state.phase === 'error' ? (
      <Badge kind="unavailable" label="Unavailable" />
    ) : (
      <Badge kind="connected" label="Connected" />
    )

  const nemotronBadge =
    state.phase === 'loading' ? (
      <Badge kind="checking" label="Checking…" />
    ) : state.phase === 'error' ? (
      <Badge kind="unavailable" label="Unavailable" />
    ) : state.health.llm_configured ? (
      <Badge kind="connected" label="Connected" />
    ) : (
      <Badge kind="notconfigured" label="Not configured" />
    )

  return (
    <>
      <div className="page-head">
        <h1>Integrations</h1>
        <p className="subtitle">
          Live status of each integration. A card only says Connected when the
          backend confirms it.
        </p>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className="btn"
          onClick={check}
          disabled={state.phase === 'loading'}
        >
          Re-check
        </button>
        {state.phase === 'error' ? (
          <span className="muted">{state.message}</span>
        ) : null}
      </div>

      <div className="card-grid">
        <div className="int-card">
          <div className="int-top">
            <h2>Investigation backend</h2>
            {backendBadge}
          </div>
          <p>FastAPI service that runs investigations and simulated remediation.</p>
          <p className="int-note">Checked live via /health.</p>
        </div>

        <div className="int-card">
          <div className="int-top">
            <h2>NVIDIA Nemotron</h2>
            {nemotronBadge}
          </div>
          <p>Language model that proposes root causes and recommended actions.</p>
          <p className="int-note">
            {state.phase === 'ok' && state.health.working_model
              ? `Active model: ${state.health.working_model}`
              : state.phase === 'ok'
                ? 'Key loaded. A model is selected on the first investigation.'
                : 'Model status unknown until the backend responds.'}
          </p>
        </div>

        <div className="int-card">
          <div className="int-top">
            <h2>Zetaris</h2>
            <Badge kind="notconfigured" label="Not configured" />
          </div>
          <p>Required sponsor integration for evidence data.</p>
          <p className="int-note">
            No adapter exists yet. It will be added once the official setup docs
            and credentials are available.
          </p>
        </div>

        <div className="int-card">
          <div className="int-top">
            <h2>Meterless</h2>
            <Badge kind="notconfigured" label="Not configured" />
          </div>
          <p>Required sponsor integration for model access and usage metering.</p>
          <p className="int-note">
            No adapter exists yet. It will be added once the official setup docs
            and credentials are available.
          </p>
        </div>

        <div className="int-card">
          <div className="int-top">
            <h2>n8n workflows</h2>
            <Badge kind="checking" label="Not verified" />
          </div>
          <p>Workflow exports exist in the backend repo.</p>
          <p className="int-note">
            This page does not check n8n, so its status is unknown.
          </p>
        </div>
      </div>
    </>
  )
}