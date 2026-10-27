import { useCallback, useEffect, useState } from 'react'
import TopNav from './components/TopNav'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'
import Overview from './components/Overview'
import HomePage from './pages/HomePage'
import HowItWorksPage from './pages/HowItWorksPage'
import IncidentsPage from './pages/IncidentsPage'
import InvestigationPage from './pages/InvestigationPage'
import IntegrationsPage from './pages/IntegrationsPage'
import AgentActivityPage from './pages/AgentActivityPage'
import ServicesPage from './pages/ServicesPage'
import LogsPage from './pages/LogsPage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import { updateProfile, useProfile } from './profile'
import { hashForView, viewFromHash, type View } from './nav'
import { ClickSpark } from './components/bits'
import './App.css'
import './theme.css'
import './nav.css'
import './round4.css'
import './theme-dark.css'
import NavBlur from './components/NavBlur'
import MoltenBackground from './components/MoltenBackground'
import { usePrefs } from './prefs'

function App() {
  const { animations } = useProfile()
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash))
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [request, setRequest] = useState<{ id: string; service: string; n: number } | null>(null)
  const prefs = usePrefs()
  const go = useCallback((next: View) => {
    if (next !== 'NotFound') window.location.hash = hashForView(next)
    setView(next)
  }, [])
  const investigate = useCallback((id: string, service: string) => {
    setRequest({ id, service, n: Date.now() })
    go('Investigation')
  }, [go])

  useEffect(() => {
    document.documentElement.dataset.motion = animations ? 'on' : 'off'
  }, [animations])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const sync = () => setView(viewFromHash(window.location.hash))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const signOut = useCallback(() => {
    updateProfile({ name: '', signedIn: false })
  }, [])

  return (
    <ClickSpark sparkColor="#ff9ec4" disabled={!prefs.sparks}>
      <div className="shell">
        <MoltenBackground />
        <main className="content"></main>
        <NavBlur />
        <TopNav
          active={view}
          onNavigate={go}
          onOpenSearch={() => setPaletteOpen(true)}
          onSignOut={signOut}
        />
        <main className="content">
          <ErrorBoundary key={view}>
            {view === 'Home' ? (
              <HomePage
                onOpenDashboard={() => go('Overview')}
                onInvestigate={() => go('Investigation')}
              />
            ) : null}
            {view === 'Overview' ? <Overview /> : null}
            {view === 'Incidents' ? <IncidentsPage onInvestigate={investigate} /> : null}
            <div hidden={view !== 'Investigation'}>
              <InvestigationPage request={request} />
            </div>
            {view === 'Services' ? <ServicesPage /> : null}
            {view === 'Logs' ? <LogsPage /> : null}
            {view === 'Agent Activity' ? (
              <AgentActivityPage onInvestigate={() => go('Investigation')} />
            ) : null}
            {view === 'Integrations' ? <IntegrationsPage /> : null}
            {view === 'Settings' ? <SettingsPage onSignOut={signOut} /> : null}
            {view === 'How it works' ? <HowItWorksPage /> : null}
            {view === 'NotFound' ? <NotFoundPage onHome={() => go('Home')} /> : null}
          </ErrorBoundary>
        </main>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={go}
          onSignOut={signOut}
        />
      </div>
    </ClickSpark>
  )
}

export default App
