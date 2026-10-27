import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { NAV_ITEMS, NAV_LABELS, PAGE_INFO, type View } from '../nav'
import { updateProfile, useProfile } from '../profile'

type Command = { id: string; label: string; hint: string; group: string; run: () => void }

type Props = {
  open: boolean
  onClose: () => void
  onNavigate: (view: View) => void
  onSignOut: () => void
}

function PaletteBody({ onClose, onNavigate, onSignOut }: Omit<Props, 'open'>) {
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const { animations } = useProfile()

  const commands = useMemo<Command[]>(() => {
    const pages: Array<Exclude<View, 'NotFound'>> = ['Home', ...NAV_ITEMS]
    return [
      ...pages.map((v) => ({
        id: `go-${v}`,
        label: v === 'Home' ? 'Home' : NAV_LABELS[v],
        hint: PAGE_INFO[v],
        group: 'Go to',
        run: () => onNavigate(v),
      })),
      {
        id: 'toggle-motion',
        label: animations ? 'Turn animations off' : 'Turn animations on',
        hint: 'Switch the motion effects',
        group: 'Actions',
        run: () => updateProfile({ animations: !animations }),
      },
      {
        id: 'sign-out',
        label: 'Sign out',
        hint: 'Return to the welcome screen',
        group: 'Actions',
        run: onSignOut,
      },
    ]
  }, [animations, onNavigate, onSignOut])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(needle))
  }, [commands, q])

  const choose = (c: Command | undefined) => {
    if (!c) return
    c.run()
    onClose()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[index])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          className="palette-input"
          autoFocus
          value={q}
          placeholder="Search pages and actions…"
          onChange={(e) => {
            setQ(e.target.value)
            setIndex(0)
          }}
          onKeyDown={onKey}
        />
        <ul className="palette-list">
          {results.length === 0 ? (
            <li className="palette-empty">Nothing matches “{q}”.</li>
          ) : (
            results.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`palette-item${i === index ? ' is-active' : ''}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(c)}
                >
                  <span className="palette-group">{c.group}</span>
                  <strong>{c.label}</strong>
                  <span className="muted">{c.hint}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="palette-foot">↑↓ to move · Enter to open · Esc to close</div>
      </div>
    </div>
  )
}

// The body only exists while open, so it starts fresh every time.
function CommandPalette({ open, ...rest }: Props) {
  return open ? <PaletteBody {...rest} /> : null
}

export default CommandPalette