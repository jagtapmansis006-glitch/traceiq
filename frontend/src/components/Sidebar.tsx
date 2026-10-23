const NAV_ITEMS = [
  'Overview',
  'Incidents',
  'Investigation',
  'Services',
  'Logs',
  'Agent Activity',
  'Integrations',
  'Settings',
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

type SidebarProps = {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  open: boolean
  onClose: () => void
}

function Sidebar({ activeItem, onNavigate, open, onClose }: SidebarProps) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${open ? ' is-open' : ''}`}
        aria-label="Close navigation"
        hidden={!open}
        onClick={onClose}
      />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">TraceIQ</span>
        </div>
        <nav>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={item === activeItem ? 'is-active' : undefined}
                  onClick={() => onNavigate(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
