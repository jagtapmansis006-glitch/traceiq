import { useState } from 'react'
import './howitworks.css'

const STEPS = [
  { title: 'Logs', text: 'Collect the raw events that describe what the system actually did.' },
  { title: 'Timeline', text: 'Order those events so the story of the incident is visible.' },
  { title: 'Hypotheses', text: 'Propose competing causes and weigh each one against the evidence.' },
  { title: 'Approved fix', text: 'Recommend a change with risk and rollback, then wait for a human yes.' },
  { title: 'Verify', text: 'Check that the approved action actually restored the service.' },
]

const BUILT_WITH = ['NVIDIA Nemotron', 'FastAPI', 'React', 'Vercel']

function HowItWorksPage() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="how-page">
      <header className="how-block" style={{ ['--d' as string]: 0 }}>
        <h1>How TraceIQ works</h1>
        <p className="how-sub">From noisy logs to an approved fix, with evidence at every step.</p>
      </header>

      <section className="how-block" style={{ ['--d' as string]: 1 }} aria-label="Investigation flow">
        <p className="kind-label">The flow</p>
        <div className="how-flow">
          {STEPS.map((step, i) => (
            <article key={step.title} className="flow-step how-step" style={{ ['--i' as string]: i }}>
              <span className="flow-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-block" style={{ ['--d' as string]: 2 }} aria-labelledby="demo-heading">
        <h2 id="demo-heading">Watch the demo</h2>
        <div className="how-video panel">
          <video
            controls
            playsInline
            src="/demo.mp4"
            onLoadedData={() => setLoaded(true)}
            onError={() => setLoaded(false)}
            className={loaded ? 'is-ready' : undefined}
          />
          {loaded ? null : (
            <div className="how-video-ph">
              <span className="how-play" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="30" />
                  <path d="M26 20v24l20-12z" />
                </svg>
              </span>
              <p>Demo video coming soon</p>
            </div>
          )}
        </div>
      </section>

      <section className="how-block" style={{ ['--d' as string]: 3 }} aria-label="Built with">
        <h2>Built with</h2>
        <ul className="how-chips">
          {BUILT_WITH.map((name) => (
            <li key={name}>
              <span className="hero-pill">{name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default HowItWorksPage
