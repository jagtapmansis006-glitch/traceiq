import { MetallicPaint } from './bits'
import { useTheme } from '../theme'
import './logo.css'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100">
<circle cx="42" cy="42" r="30" fill="none" stroke="#000" stroke-width="12"/>
<path d="M70 70 L90 90" stroke="#000" stroke-width="15" stroke-linecap="round"/>
<path d="M23 46 H34 L40 29 L47 55 L53 42 H61" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`

let gl: boolean | null = null
function hasWebGL2() {
  if (gl === null) {
    try {
      gl = !!document.createElement('canvas').getContext('webgl2')
    } catch {
      gl = false
    }
  }
  return gl
}

function Logo({ size = 46 }: { size?: number }) {
  const { resolved } = useTheme()

  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden="true">
      {hasWebGL2() ? (
        <MetallicPaint
          imageSrc={SRC}
          color="#ff9ec4"
          scale={0.9}
          density={2}
          dispersion={0.35}
          edgeBend={0.7}
          lightMode={resolved === 'light'}
        />
      ) : (
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="logo-fb" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8fb8" />
              <stop offset="100%" stopColor="#ffb98a" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#logo-fb)" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="42" cy="42" r="30" strokeWidth="12" />
            <path d="M70 70 L90 90" strokeWidth="15" />
            <path d="M23 46 H34 L40 29 L47 55 L53 42 H61" strokeWidth="7" />
          </g>
        </svg>
      )}
    </span>
  )
}

export default Logo