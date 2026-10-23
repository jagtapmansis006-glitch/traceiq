import { useEffect, useId, useState } from 'react'
import './charts.css'

export function useCountUp(target: number, ms = 2200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

type StatCardProps = {
  label: string
  value: number
  decimals?: number
  suffix?: string
  delta?: string
  hint: string
  glyph: string
  tone: 'ok' | 'bad' | 'info' | 'good'
}

export function StatCard({ label, value, decimals = 0, suffix = '', delta, hint, glyph, tone }: StatCardProps) {
  const shown = useCountUp(value)
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-glyph" aria-hidden="true">{glyph}</span>
        <span>{label}</span>
      </div>
      <div className="stat-value">
        {shown.toFixed(decimals)}
        <small>{suffix}</small>
        {delta ? <em>{delta}</em> : null}
      </div>
      <p className="stat-hint">{hint}</p>
    </article>
  )
}

type Series = { name: string; color: string; values: number[] }

export function TrendChart({ labels, series }: { labels: string[]; series: Series[] }) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const W = 600
  const H = 230
  const L = 34
  const R = 10
  const T = 10
  const B = 26
  const n = labels.length
  const max = Math.ceil(Math.max(...series.flatMap((s) => s.values)) / 10) * 10 || 10
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1)
  const y = (v: number) => T + (H - T - B) * (1 - v / max)

  const line = (vals: number[]) =>
    vals
      .map((v, i) => {
        if (i === 0) return `M${x(0)},${y(v)}`
        const mx = (x(i - 1) + x(i)) / 2
        return `C${mx},${y(vals[i - 1])} ${mx},${y(v)} ${x(i)},${y(v)}`
      })
      .join(' ')
  const area = (vals: number[]) => `${line(vals)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round((px - L) / ((W - L - R) / (n - 1)))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.name} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} className="grid-line" />
            <text x={L - 6} y={y(max * f) + 4} textAnchor="end" className="axis-text">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={H - 6} textAnchor="middle" className="axis-text">
            {l}
          </text>
        ))}
        {series.map((s, i) => (
          <path key={`a-${s.name}`} d={area(s.values)} fill={`url(#${uid}-${i})`} className="area-fade" />
        ))}
        {series.map((s) => (
          <path key={s.name} d={line(s.values)} stroke={s.color} pathLength={1} className="trend-line" />
        ))}
        {hover !== null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="hover-line" />
            {series.map((s) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        ) : null}
      </svg>
      {hover !== null ? (
        <div className="trend-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{labels[hover]}</strong>
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} /> {s.name}: {s.values[hover]}
            </span>
          ))}
        </div>
      ) : null}
      <div className="trend-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

type Segment = { label: string; value: number; color: string }

export function Donut({ segments, centerLabel }: { segments: Segment[]; centerLabel: string }) {
  const [hover, setHover] = useState<string | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  let acc = 0
  const active = segments.find((s) => s.label === hover)

  return (
    <div className="donut">
      <div className="donut-ring">
        <svg viewBox="0 0 42 42">
          <g transform="rotate(-90 21 21)">
            <circle cx="21" cy="21" r="15.9155" className="donut-track" />
            {segments.map((s, i) => {
              const len = (s.value / total) * 100
              const el = (
                <circle
                  key={s.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  pathLength={100}
                  stroke={s.color}
                  strokeDasharray={`${Math.max(0, len - 1.2)} ${100 - Math.max(0, len - 1.2)}`}
                  strokeDashoffset={-acc}
                  className={`donut-seg${hover === s.label ? ' is-hover' : ''}`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                  onMouseEnter={() => setHover(s.label)}
                  onMouseLeave={() => setHover(null)}
                />
              )
              acc += len
              return el
            })}
          </g>
        </svg>
        <div className="donut-center">
          <strong>{active ? active.value : total}</strong>
          <span>{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.label} onMouseEnter={() => setHover(s.label)} onMouseLeave={() => setHover(null)}>
            <i style={{ background: s.color }} /> {s.label}
            <b>
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </b>
          </li>
        ))}
      </ul>
    </div>
  )
}