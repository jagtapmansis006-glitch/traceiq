export const NAV_ITEMS = [
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
  export type View = NavItem | 'Home'
  export const TOP_TABS: NavItem[] = [
    'Overview',
    'Incidents',
    'Investigation',
    'Agent Activity',
  ]
  
  export const NAV_LABELS: Record<NavItem, string> = {
    Overview: 'Overview',
    Incidents: 'Incidents',
    Investigation: 'Investigation',
    Services: 'Services',
    Logs: 'Logs',
    'Agent Activity': 'Agents',
    Integrations: 'Integrations',
    Settings: 'Settings',
  }
  export const PAGE_INFO: Record<View, string> = {
    Home: 'The landing page',
    Overview: 'Health, trends and recent incidents',
    Incidents: 'All incidents and their status',
    Investigation: 'Run the AI root-cause investigation',
    Services: 'Services and their status',
    Logs: 'Log events for each incident',
    'Agent Activity': 'What the agent did, step by step',
    Integrations: 'Connected tools',
    Settings: 'Profile and preferences',
  }