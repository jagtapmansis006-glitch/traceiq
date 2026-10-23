import { useBackendHealth } from '../api/useBackendHealth'
import { TOP_TABS, NAV_LABELS, type View } from '../nav'
import AccountMenu from './AccountMenu'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { useProfile } from '../profile'

type TopNavProps = {
  active: View
  onNavigate: (view: View) => void
  onOpenSearch: () => void
  onSignOut: () => void
}

function TopNav({ active, onNavigate, onOpenSearch, onSignOut }: TopNavProps) {
  const { health, recheck } = useBackendHealth()
  const profile = useProfile()
  const signedIn = profile.name.trim() !== ''
  const label =
    health.state === 'checking'
      ? 'Checking…'
      : health.state === 'offline'
        ? 'Offline'
        : health.info.mock
          ? 'Mock backend'
          : health.info.llm_configured
            ? 'AI online'
            : 'No AI key'

  const title =
    health.state === 'checking'
      ? 'Checking the backend…'
      : health.state === 'offline'
        ? `${health.reason} Click to retry.`
        : health.info.mock
          ? 'Mock backend: not the real engine.'
          : health.info.llm_configured
            ? `Backend online. Model: ${health.info.working_model ?? 'selected on first run'}`
            : 'Backend online, but no AI key: fallback answers only.'

  const dotClass =
    health.state === 'online' && health.info.mock ? 'is-mock' : `is-${health.state}`

  return (
    <header className="topnav">
      <button type="button" className="nav-brand" aria-label="TraceIQ home" onClick={() => onNavigate('Home')}>
        <Logo />
        <span className="nav-name">
          <strong>TraceIQ</strong>
          <span>AI Incident Intelligence</span>
        </span>
      </button>

      <nav className="nav-tabs" aria-label="Primary">
        {TOP_TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={active === item ? 'is-active' : undefined}
            aria-current={active === item ? 'page' : undefined}
            onClick={() => onNavigate(item)}
          >
            {NAV_LABELS[item]}
          </button>
        ))}
      </nav>

      <div className="nav-right">
        <button type="button" className="nav-pill nav-search-btn" onClick={onOpenSearch}>
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>

        <button type="button" className="nav-status" title={title} onClick={recheck}>
          <span className={`nav-dot ${dotClass}`} aria-hidden="true" />
          <span>{label}</span>
        </button>

        <ThemeToggle />
        {signedIn ? (
          <button
            type="button"
            className={`nav-gear${active === 'Settings' ? ' is-active' : ''}`}
            aria-label="Settings"
            title="Settings"
            onClick={() => onNavigate('Settings')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        ) : null}
        <AccountMenu onNavigate={onNavigate} onSignOut={onSignOut} />
      </div>
    </header>
  )
}

export default TopNav