import { useEffect, useState } from 'react'
import { Cubes, ThoughtLine } from './bits'
import { useTheme } from '../theme'
import './loader.css'

const STEPS = [
  'Reading the incident logs',
  'Building the timeline',
  'Proposing competing hypotheses',
  'Checking each one against the evidence',
  'Drafting recommended actions',
]

type InvestigationLoaderProps = {
  incidentId: string
  startedAt: number
  onCancel?: () => void
}

function InvestigationLoader({ incidentId, onCancel }: InvestigationLoaderProps) {
  const { resolved } = useTheme()
  const dark = resolved === 'dark'
  const [count, setCount] = useState(1)

  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.min(STEPS.length, c + 1)), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="panel loader" role="status" aria-live="polite">
      <div className="loader-cubes" aria-hidden="true">
        <Cubes
          gridSize={8}
          faceColor={dark ? '#2a1a33' : '#fff1f6'}
          edgeColor={dark ? '#ff8fb8' : '#e0689a'}
          rippleColor="#35b8a6"
          maxAngle={60}
          radius={3.5}
          perspective={0.5}
        />
      </div>
      <ThoughtLine
        working
        label={`Investigating ${incidentId}…`}
        steps={STEPS.slice(0, count)}
        color="var(--text-h)"
        fontSize={18}
        collapsible
      />
      <p className="muted">
        The steps above are paced by a timer. The backend sends one finished answer, so they
        are not live signals. The first run can take up to a minute while the model warms up.
      </p>
      {onCancel ? (
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </section>
  )
}

export default InvestigationLoader