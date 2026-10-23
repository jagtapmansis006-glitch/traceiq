import { useMemo, useState } from 'react'
import IncidentTable from '../components/IncidentTable'
import { DEMO_DATA_NOTICE, DEMO_INCIDENTS } from '../data/demoIncidents'

type Props = { onInvestigate: (id: string, service: string) => void }

function IncidentsPage({ onInvestigate }: Props) {
  const [filter, setFilter] = useState('all')

  const sorted = useMemo(
    () =>
      [...DEMO_INCIDENTS].sort(
        (a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
      ),
    [],
  )
  const severities = ['all', ...Array.from(new Set(sorted.map((i) => i.severity)))]
  const shown = filter === 'all' ? sorted : sorted.filter((i) => i.severity === filter)

  return (
    <>
      <h1>Incidents</h1>
      <p className="subtitle">
        All demo incidents across monitored services, ordered by latest detection time.
      </p>
      <p className="demo-note">{DEMO_DATA_NOTICE}</p>
      <div className="toolbar" role="group" aria-label="Filter by severity">
        {severities.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn${filter === s ? ' btn-primary' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <p className="muted">Click an incident to investigate it.</p>
      <section className="panel" aria-label="Incident list">
        <IncidentTable caption="Demo incident list" incidents={shown} onSelect={onInvestigate} />
      </section>
    </>
  )
}

export default IncidentsPage