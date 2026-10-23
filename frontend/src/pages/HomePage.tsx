import { useMemo } from 'react'
import { DitherVeil, FolderFloat, OrbitImages, ReflectiveCard } from '../components/bits'
import StarButton from '../components/StarButton'
import { useTheme } from '../theme'
import './home.css'

type HomePageProps = {
  onOpenDashboard: () => void
  onInvestigate: () => void
}

const PLANETS = [
  { name: 'Logs', c1: '#9fe3d3', c2: '#35b8a6' },
  { name: 'Timeline', c1: '#ffe0b8', c2: '#ffa860' },
  { name: 'Hypotheses', c1: '#ffc4d8', c2: '#ff7eb3' },
  { name: 'Evidence', c1: '#e2d4ff', c2: '#a98bff' },
]

const hexToRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mixHex = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const m = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`
}

const planetImage = (p: (typeof PLANETS)[number], dark: boolean) => {
  const N = 20
  const cell = 10
  const ink = dark ? '#ffffff' : '#3a1226'
  const halo = dark ? '#1a1120' : '#ffffff'
  const tones = [
    mixHex(p.c2, '#000000', 0.45),
    p.c2,
    p.c1,
    mixHex(p.c1, '#ffffff', 0.6),
  ]
  const light = [-0.5, -0.6, 0.62]
  const len = Math.hypot(light[0], light[1], light[2])
  let rects = ''
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5 - N / 2) / (N / 2)
      const ny = (y + 0.5 - N / 2) / (N / 2)
      const r2 = nx * nx + ny * ny
      if (r2 > 1) continue
      const nz = Math.sqrt(1 - r2)
      const d = Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2]) / len)
      const tone = tones[Math.min(3, Math.floor(d * 4))]
      rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${tone}"/>`
    }
  }
  const size = p.name.length > 8 ? 24 : 30
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" shape-rendering="crispEdges">
${rects}
<text x="100" y="${100 + size * 0.35}" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-weight="900" font-size="${size}" fill="${ink}" stroke="${halo}" stroke-opacity="0.8" stroke-width="6" paint-order="stroke">${p.name}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const STEPS = [
  { title: 'Collect evidence', text: 'Builds a timeline of what was actually observed in the incident logs.' },
  { title: 'Weigh hypotheses', text: 'Proposes competing root causes and judges each one against the evidence.' },
  { title: 'Explain the cause', text: 'Reports the likeliest cause, its confidence and the evidence it cites.' },
  { title: 'Fix with approval', text: 'Recommends actions with risk and rollback. A human approves every one.' },
]

const FEATURES = [
  { title: 'Evidence first', sub: 'Three labels', items: ['Observed', 'Inferred', 'Assumed'] },
  { title: 'Competing hypotheses', sub: 'Every cause judged', items: ['Supported', 'Plausible', 'Rejected'] },
  { title: 'Safe remediation', sub: 'You stay in control', items: ['Needs approval', 'Rollback plan', 'Verified after'] },
]

function HomePage({ onOpenDashboard, onInvestigate }: HomePageProps) {
  const { resolved } = useTheme()
  const dark = resolved === 'dark'
  const planets = useMemo(() => PLANETS.map((p) => ({ src: planetImage(p, dark), alt: p.name })), [dark])
  const folder = dark
    ? {
        folderColor: '#5a2d45',
        frontColor: '#7a3d5c',
        paperColor: '#f4e6ee',
        itemColor: '#2d1c38',
        itemTextColor: '#fff5fa',
        labelColor: '#fff5fa',
      }
    : {
        folderColor: '#f0a3c0',
        frontColor: '#ffc7da',
        paperColor: '#ffffff',
        itemColor: '#ffffff',
        itemTextColor: '#5c2a40',
        labelColor: '#3a1226',
      }

  return (
    <>
      <section className="hero hero-wide">
        <div className="hero-copy">
          <span className="hero-pill">
            <i aria-hidden="true" /> AI-powered incident investigation
          </span>
          <h1>
            Find the root cause.
            <br />
            <em>Show the evidence.</em>
          </h1>
          <p className="hero-lead">
            TraceIQ investigates an outage like a careful engineer: it builds the timeline,
            argues competing explanations, checks each against the evidence, and recommends a
            fix that only runs after you approve it.
          </p>
          <div className="hero-actions">
            <StarButton className="hero-cta" onClick={onOpenDashboard}>
              Open dashboard
            </StarButton>
            <button type="button" className="btn hero-cta" onClick={onInvestigate}>
              Try an investigation
            </button>
          </div>
          <ul className="hero-tags" aria-label="Highlights">
            <li>NVIDIA Nemotron model</li>
            <li>Human-approved fixes</li>
            <li>Evidence-backed answers</li>
          </ul>
        </div>

        <div className="stage" aria-label="Logs, timeline, hypotheses and evidence orbiting TraceIQ">
          <OrbitImages
            images={planets}
            shape="ellipse"
            radiusX={540}
            radiusY={330}
            rotation={-12}
            duration={40}
            itemSize={190}
            itemRadius={0}
            depth={0.6}
            showPath
            pathColor={dark ? 'rgba(255,143,184,0.4)' : 'rgba(214,69,127,0.35)'}
            pathDash={7}
            hoverSpeed={0.25}
            shadow={0}
            centerContent={
              <div className="veil">
                <DitherVeil
                  src="/earth.svg"
                  fit="contain"
                  pattern="bayer"
                  pixelSize={4}
                  contrast={1.25}
                  inkColor={dark ? '#120d1c' : '#fbf7ff'}
                  paperColor={dark ? '#cdb8ff' : '#6d4fc2'}
                  revealRadius={170}
                  softness={0.7}
                  linger={1.2}
                  wander
                />
              </div>
            }
          />
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-heading">
        <h2 id="how-heading">How an investigation works</h2>
        <div className="reflect-grid">
          {STEPS.map((step, index) => (
            <ReflectiveCard
              key={step.title}
              theme={dark ? 'dark' : 'light'}
              tint={dark ? '#ffb3cf' : '#ffffff'}
              width="100%"
              height={230}
              radius={22}
              roughness={0.35}
              tiltStrength={10}
            >
              <div className="rc-step">
                <span className="rc-num">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </ReflectiveCard>
          ))}
        </div>
      </section>

      <section className="home-section folder-section" aria-label="Principles">
        <div className="folder-grid">
          {FEATURES.map((f) => (
            <FolderFloat
              key={f.title}
              items={f.items}
              label={f.title}
              sublabel={f.sub}
              trigger="hover"
              closeOnSelect={false}
              width={230}
              height={150}
              spread={130}
              lift={28}
              {...folder}
            />
          ))}
        </div>
        <p className="muted folder-hint">Hover a folder.</p>
      </section>

      <p className="home-note">
        TraceIQ recommends fixes and waits for your approval before anything runs.
      </p>
    </>
  )
}

export default HomePage