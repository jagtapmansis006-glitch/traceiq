import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as RMouseEvent, PointerEvent as RPointerEvent } from 'react'
import type { InvestigationResult } from '../api/types'
import './servicemap.css'

const W = 900
const H = 520

type Svc = {
  id: string
  label: string
  role: string
  x: number
  y: number
  r: number
  aliases: string[]
}

// Fixed demo topology. Aliases are used to match names found in the incident text.
const SERVICES: Svc[] = [
  { id: 'frontend', label: 'frontend', role: 'Web app that customers use', x: 80, y: 260, r: 28, aliases: ['frontend'] },
  { id: 'api-gateway', label: 'api-gateway', role: 'Entry point for every API call', x: 260, y: 260, r: 32, aliases: ['apigateway', 'gateway'] },
  { id: 'auth-service', label: 'auth-service', role: 'Logins and tokens', x: 450, y: 90, r: 24, aliases: ['authservice', 'auth'] },
  { id: 'checkout', label: 'checkout', role: 'Handles orders and carts', x: 450, y: 260, r: 30, aliases: ['checkout'] },
  { id: 'worker', label: 'worker', role: 'Runs background jobs', x: 450, y: 440, r: 24, aliases: ['worker'] },
  { id: 'redis', label: 'redis', role: 'Fast cache', x: 650, y: 90, r: 22, aliases: ['redis', 'cache'] },
  { id: 'database', label: 'database', role: 'Main data store', x: 650, y: 260, r: 32, aliases: ['database', 'postgres', 'mysql'] },
  { id: 'payment', label: 'payment', role: 'Takes card payments', x: 650, y: 440, r: 26, aliases: ['payment'] },
  { id: 'notifications', label: 'notifications', role: 'Sends emails and alerts', x: 820, y: 440, r: 20, aliases: ['notification', 'email'] },
]

const EDGES: [string, string][] = [
  ['frontend', 'api-gateway'],
  ['api-gateway', 'auth-service'],
  ['api-gateway', 'checkout'],
  ['api-gateway', 'worker'],
  ['auth-service', 'redis'],
  ['checkout', 'database'],
  ['checkout', 'payment'],
  ['worker', 'database'],
  ['payment', 'notifications'],
]

const BY_ID = new Map(SERVICES.map((s) => [s.id, s]))

// Breadth-first walk from the frontend: this is the order the agent explores.
const ROOT = 'frontend'
const PARENT = new Map<string, string>()
const DEPTH = new Map<string, number>([[ROOT, 0]])
const ORDER: string[] = [ROOT]
for (let i = 0; i < ORDER.length; i++) {
  const cur = ORDER[i]
  for (const [a, b] of EDGES) {
    if (a === cur && !DEPTH.has(b)) {
      DEPTH.set(b, (DEPTH.get(cur) ?? 0) + 1)
      PARENT.set(b, cur)
      ORDER.push(b)
    }
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const short = (s: string) => (s.length > 110 ? `${s.slice(0, 107)}…` : s)
const mentions = (text: string, svc: Svc) => svc.aliases.some((a) => text.includes(a))

// Guess the problem node from the root-cause text (deepest mentioned service wins).
function findProblem(result: InvestigationResult): string {
  const text = norm(result.root_cause ?? '')
  const hits = SERVICES.filter((s) => mentions(text, s))
  if (hits.length > 0) {
    return hits.reduce((a, b) => ((DEPTH.get(b.id) ?? 0) > (DEPTH.get(a.id) ?? 0) ? b : a)).id
  }
  const svc = norm(result.service ?? '')
  const bySvc = SERVICES.find((s) => mentions(svc, s))
  return bySvc ? bySvc.id : 'database'
}

function pathTo(id: string): string[] {
  const ids = [id]
  let cur = id
  while (PARENT.has(cur)) {
    cur = PARENT.get(cur) as string
    ids.unshift(cur)
  }
  return ids
}

function edgePath(a: Svc, b: Svc) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  return `M${a.x},${a.y} Q${mx - dy * 0.12},${my + dx * 0.12} ${b.x},${b.y}`
}

type Status = 'idle' | 'scan' | 'ok' | 'bad'
type Cam = { x: number; y: number; k: number }
const HOME: Cam = { x: 0, y: 0, k: 1 }

const STATUS_TEXT: Record<Status, string> = {
  idle: 'Not examined yet',
  scan: 'Being examined…',
  ok: 'Looks healthy',
  bad: 'Likely problem area',
}

type InnerProps = { result: InvestigationResult; onReplay: () => void }

function MapInner({ result, onReplay }: InnerProps) {
  const problemId = useMemo(() => findProblem(result), [result])
  const stopCount = ORDER.indexOf(problemId) + 1
  const problemPath = useMemo(() => pathTo(problemId), [problemId])

  const [step, setStep] = useState(0)
  const [found, setFound] = useState(false)
  const [cam, setCam] = useState<Cam>(HOME)
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [tip, setTip] = useState({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; active: boolean } | null>(null)
  const moved = useRef(false)

  // The investigation clock: reveal one service at a time, then confirm the finding.
  useEffect(() => {
    if (step < stopCount) {
      const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : 1100)
      return () => clearTimeout(t)
    }
    if (!found) {
      const t = setTimeout(() => setFound(true), 1200)
      return () => clearTimeout(t)
    }
  }, [step, stopCount, found])

  // Log events from the real investigation, grouped by service.
  const events = useMemo(() => {
    const map = new Map<string, { count: number; last: string }>()
    for (const e of result.timeline ?? []) {
      const src = norm(e.source)
      const svc = SERVICES.find((s) => mentions(src, s))
      if (!svc) continue
      const f = map.get(svc.id)
      if (f) {
        f.count += 1
        f.last = e.message
      } else {
        map.set(svc.id, { count: 1, last: e.message })
      }
    }
    return map
  }, [result])

  const revealed = new Set(ORDER.slice(0, step))
  const current = step > 0 ? ORDER[step - 1] : null

  const statusOf = (id: string): Status => {
    if (!revealed.has(id)) return 'idle'
    if (id === problemId) return found ? 'bad' : 'scan'
    return id === current ? 'scan' : 'ok'
  }

  const pathEdges = new Set<string>()
  problemPath.forEach((id, i) => {
    if (i > 0) pathEdges.add(`${problemPath[i - 1]}>${id}`)
  })

  const hoverNeighbors = new Set<string>()
  if (hover) {
    hoverNeighbors.add(hover)
    for (const [a, b] of EDGES) {
      if (a === hover) hoverNeighbors.add(b)
      if (b === hover) hoverNeighbors.add(a)
    }
  }

  // Scroll to zoom around the cursor.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = svg.getBoundingClientRect()
      const px = ((e.clientX - r.left) * W) / r.width
      const py = ((e.clientY - r.top) * H) / r.height
      setCam((c) => {
        const k = Math.max(0.6, Math.min(3.5, c.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
        return { k, x: px - ((px - c.x) * k) / c.k, y: py - ((py - c.y) * k) / c.k }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (f: number) =>
    setCam((c) => {
      const k = Math.max(0.6, Math.min(3.5, c.k * f))
      return { k, x: W / 2 - ((W / 2 - c.x) * k) / c.k, y: H / 2 - ((H / 2 - c.y) * k) / c.k }
    })

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    drag.current = { sx: e.clientX, sy: e.clientY, x: cam.x, y: cam.y, active: false }
    moved.current = false
  }
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    const svg = svgRef.current
    if (!d || !svg) return
    if (!d.active) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return
      d.active = true
      moved.current = true
      svg.setPointerCapture(e.pointerId)
    }
    const r = svg.getBoundingClientRect()
    setCam((c) => ({
      ...c,
      x: d.x + ((e.clientX - d.sx) * W) / r.width,
      y: d.y + ((e.clientY - d.sy) * H) / r.height,
    }))
  }
  const onUp = () => {
    drag.current = null
  }

  const showTip = (e: RMouseEvent, id: string) => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    setHover(id)
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const sel = selected ?? (found ? problemId : current)
  const selSvc = sel ? BY_ID.get(sel) : undefined
  const selStatus = sel ? statusOf(sel) : 'idle'
  const selEvents = sel ? events.get(sel) : undefined
  const callers = sel ? EDGES.filter(([, b]) => b === sel).map(([a]) => a) : []
  const calls = sel ? EDGES.filter(([a]) => a === sel).map(([, b]) => b) : []
  const hovered = hover ? BY_ID.get(hover) : undefined
  const hoveredStatus = hover ? statusOf(hover) : 'idle'

  const pillText = step === 0 ? 'Starting…' : found ? 'Root cause found' : 'Investigating…'
  const pillClass = found ? 'is-found' : 'is-busy'
  const pct = Math.round((Math.min(step, stopCount) / stopCount) * 100)

  const probeEdge =
    current && !found && PARENT.has(current)
      ? { from: BY_ID.get(PARENT.get(current) as string), to: BY_ID.get(current) }
      : null

  const feed = ORDER.slice(0, step).slice().reverse()

  return (
    <section className="panel sm-panel" aria-labelledby="sm-heading">
      <div className="sm-head">
        <div>
          <h2 id="sm-heading">Live investigation map</h2>
          <p className="kind-label">
            Inferred · the agent walks the service map from the frontend until it reaches the
            problem. Red = likely root cause, green = checked and fine.
          </p>
        </div>
        <div className="sm-tools">
          <span className={`sm-pill ${pillClass}`}>
            <i aria-hidden="true" />
            {pillText}
          </span>
          <button type="button" className="btn" onClick={onReplay}>
            ↻ Replay
          </button>
          <button type="button" className="btn" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="btn" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="btn" onClick={() => setCam(HOME)}>
            Reset
          </button>
        </div>
      </div>

      <div className="sm-progress" aria-hidden="true">
        <span style={{ width: `${pct}%` }} className={found ? 'is-found' : undefined} />
      </div>

      <div className="sm-wrap">
        <div className="sm-box" ref={boxRef} onMouseLeave={() => setHover(null)}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="sm-svg"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            role="img"
            aria-label="Service map showing the order services were investigated"
          >
            <defs>
              <linearGradient id="sm-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff8fb8" />
                <stop offset="100%" stopColor="#ffb98a" />
              </linearGradient>
            </defs>

            <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
              {/* faint base links */}
              {EDGES.map(([a, b]) => {
                const A = BY_ID.get(a) as Svc
                const B = BY_ID.get(b) as Svc
                return <path key={`base-${a}-${b}`} d={edgePath(A, B)} className="sm-link" />
              })}

              {/* links the agent has already walked */}
              {EDGES.map(([a, b]) => {
                if (!revealed.has(a) || !revealed.has(b)) return null
                const isPath = found && pathEdges.has(`${a}>${b}`)
                if (isPath) return null
                const A = BY_ID.get(a) as Svc
                const B = BY_ID.get(b) as Svc
                return (
                  <path
                    key={`ok-${a}-${b}`}
                    d={edgePath(A, B)}
                    pathLength={1}
                    className="sm-walked"
                  />
                )
              })}

              {/* the final red path to the problem */}
              {found
                ? problemPath.slice(1).map((id, i) => {
                    const A = BY_ID.get(problemPath[i]) as Svc
                    const B = BY_ID.get(id) as Svc
                    const d = edgePath(A, B)
                    return (
                      <g key={`red-${id}`}>
                        <path d={d} pathLength={1} className="sm-redpath" style={{ animationDelay: `${i * 0.25}s` }} />
                        <path d={d} className="sm-redflow" />
                      </g>
                    )
                  })
                : null}

              {/* the probe travelling to the service being checked */}
              {probeEdge && probeEdge.from && probeEdge.to ? (
                <circle key={`probe-${step}`} r="6" className="sm-probe">
                  <animateMotion dur="0.9s" fill="freeze" path={edgePath(probeEdge.from, probeEdge.to)} />
                </circle>
              ) : null}

              {/* services */}
              {SERVICES.map((s) => {
                const st = statusOf(s.id)
                const dim = hover !== null && !hoverNeighbors.has(s.id)
                return (
                  <g
                    key={s.id}
                    transform={`translate(${s.x} ${s.y})`}
                    onMouseEnter={(e) => showTip(e, s.id)}
                    onMouseMove={(e) => showTip(e, s.id)}
                    onClick={() => {
                      if (!moved.current) setSelected(s.id)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <g
                      className={`sm-node is-${st}${hover === s.id ? ' is-hover' : ''}${dim ? ' is-dim' : ''}`}
                    >
                      {st === 'scan' ? (
                        <>
                          <circle r={s.r + 6} className="sm-scan" />
                          <circle r={s.r + 11} className="sm-spin" />
                        </>
                      ) : null}
                      {st === 'bad' ? (
                        <>
                          <circle r={s.r + 8} className="sm-alert" />
                          <circle r={s.r + 8} className="sm-alert sm-alert-2" />
                          <circle r={s.r + 6} className="sm-halo" />
                        </>
                      ) : null}
                      <circle r={s.r} className="sm-dot" />
                      <text className="sm-mark" textAnchor="middle" dy="5">
                        {st === 'bad' ? '!' : st === 'ok' ? '✓' : st === 'scan' ? '•••' : ''}
                      </text>
                      <text className="sm-label" textAnchor="middle" y={s.r + 18}>
                        {s.label}
                      </text>
                    </g>
                  </g>
                )
              })}
            </g>
          </svg>

          {hovered ? (
            <div
              className="sm-tip"
              style={{
                left: Math.max(8, Math.min(tip.x + 16, (boxRef.current?.clientWidth ?? 600) - 260)),
                top: tip.y + 16,
              }}
            >
              <strong>{hovered.label}</strong>
              <span className={`badge sm-badge is-${hoveredStatus}`}>{STATUS_TEXT[hoveredStatus]}</span>
              <p>{hovered.role}</p>
              <p className="sm-tip-msg">
                {events.get(hovered.id)
                  ? `${events.get(hovered.id)?.count} log event(s) in this investigation`
                  : 'No log events from this service'}
              </p>
            </div>
          ) : null}

          <div className="sm-legend">
            <span><i className="lg-idle" /> Not examined</span>
            <span><i className="lg-scan" /> Checking</span>
            <span><i className="lg-ok" /> Healthy</span>
            <span><i className="lg-bad" /> Problem</span>
            <span className="muted">Scroll to zoom · drag to move · click a node</span>
          </div>
        </div>

        <aside className="sm-side" aria-label="Investigation details">
          <div className="sm-card">
            <h3>Investigation log</h3>
            {feed.length === 0 ? (
              <p className="muted">Starting at the frontend…</p>
            ) : (
              <ol className="sm-feed">
                {feed.map((id) => {
                  const st = statusOf(id)
                  const svc = BY_ID.get(id) as Svc
                  return (
                    <li key={id} className={`is-${st}`}>
                      <i aria-hidden="true" />
                      <div>
                        <strong>{svc.label}</strong>
                        <span>
                          {st === 'scan'
                            ? 'Checking…'
                            : st === 'bad'
                              ? 'Problem located here'
                              : 'Examined · not the root cause'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {found ? (
            <div className="sm-card sm-found">
              <h3>Root cause located</h3>
              <p>{result.root_cause}</p>
              <p className="muted">Agent confidence: {result.confidence_pct}%</p>
            </div>
          ) : null}

          {selSvc ? (
            <div className="sm-card">
              <h3>{selSvc.label}</h3>
              <span className={`badge sm-badge is-${selStatus}`}>{STATUS_TEXT[selStatus]}</span>
              <p className="sm-role">{selSvc.role}</p>
              <dl className="sm-deps">
                <dt>Called by</dt>
                <dd>{callers.length ? callers.join(', ') : 'nobody (entry point)'}</dd>
                <dt>Calls</dt>
                <dd>{calls.length ? calls.join(', ') : 'nothing further'}</dd>
                <dt>Log events</dt>
                <dd>{selEvents ? selEvents.count : 0}</dd>
              </dl>
              {selEvents ? <p className="sm-last">Latest: {short(selEvents.last)}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

export default function ServiceMap({ result }: { result: InvestigationResult }) {
  const [run, setRun] = useState(0)
  return (
    <MapInner
      key={`${run}:${result.incident_id}:${result.root_cause}`}
      result={result}
      onReplay={() => setRun((r) => r + 1)}
    />
  )
}