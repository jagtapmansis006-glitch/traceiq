import { useBackendHealth } from '../api/useBackendHealth'
import ThemeToggle from "./ThemeToggle";

type TopBarProps = {
  onMenuClick: () => void
}

function TopBar({ onMenuClick }: TopBarProps) {
  const { health, recheck } = useBackendHealth()

  const label =
    health.state === 'checking'
      ? 'Checking backend…'
      : health.state === 'online'
        ? health.info.mock
          ? 'Mock backend · not the real engine'
          : health.info.llm_configured
            ? 'Backend online · AI model configured'
            : 'Backend online · no AI key (fallback answers)'
        : 'Backend offline'

  const title =
    health.state === 'offline'
      ? `${health.reason} Click to retry.`
      : health.state === 'online' && health.info.working_model
        ? `Model: ${health.info.working_model}`
        : undefined

  return (
    <header className="topbar">
      <button
        type="button"
        className="menu-button"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <span />
        <span />
        <span />
      </button>
      <label className="search">
        <span className="sr-only">Search</span>
        <input type="search" placeholder="Search incidents, services, traces…" />
      </label>
      <div className="topbar-actions">
        <button
          type="button"
          className="status status-button"
          role="status"
          title={title}
          onClick={recheck}
        >
          <span className={`status-dot is-${health.state}${
              health.state === 'online' && health.info.mock ? ' is-mock' : ''
            }`} aria-hidden="true" />
          <span>{label}</span>
        </button>
        <ThemeToggle />
        <div className="profile" title="Operator">
          <span className="sr-only">Operator profile</span>
          TO
        </div>
      </div>
    </header>
  )
}

export default TopBar
