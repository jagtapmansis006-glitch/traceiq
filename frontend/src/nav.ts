export const NAV_ITEMS = [
    'Overview',
    'Incidents',
    'Investigation',
    'Services',
    'Logs',
    'Agent Activity',
    'Integrations',
    'Settings',
    'How it works',
  ] as const
  
  export type NavItem = (typeof NAV_ITEMS)[number]
  export type View = NavItem | 'Home' | 'NotFound'
  export const TOP_TABS: NavItem[] = [
    'Overview',
    'Incidents',
    'Investigation',
    'Agent Activity',
    'How it works',
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
    'How it works': 'How it works',
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
    'How it works': 'The investigation flow and a short demo',
    NotFound: 'This page does not exist',
  }
  
  export const VIEW_HASH: Record<Exclude<View, 'NotFound'>, string> = {
    Home: '#/',
    Overview: '#/dashboard',
    Incidents: '#/incidents',
    Investigation: '#/investigation',
    Services: '#/services',
    Logs: '#/logs',
    'Agent Activity': '#/agent-activity',
    Integrations: '#/integrations',
    Settings: '#/settings',
    'How it works': '#/how-it-works',
  }
  
  const HASH_TO_VIEW = Object.fromEntries(
    Object.entries(VIEW_HASH).map(([view, hash]) => [hash, view]),
  ) as Record<string, Exclude<View, 'NotFound'>>
  
  export function viewFromHash(hash: string): View {
    if (hash === '' || hash === '#') return 'Home'
    return HASH_TO_VIEW[hash] ?? 'NotFound'
  }
  
  export function hashForView(view: Exclude<View, 'NotFound'>): string {
    return VIEW_HASH[view]
  }
