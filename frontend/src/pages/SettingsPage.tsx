import { useState } from 'react'
import { useBackendHealth } from '../api/useBackendHealth'
import { updateProfile, useProfile } from '../profile'
import { setPrefs, usePrefs } from '../prefs'
import { clearActivity } from '../state/activity'
import ThemeToggle from '../components/ThemeToggle'

const ROLES = ['On-call engineer', 'SRE', 'Developer', 'Engineering manager']

function clearSavedAnswers() {
  let count = 0
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('traceiq:last-result:')) {
        localStorage.removeItem(key)
        count += 1
      }
    }
  } catch {
    // Storage unavailable: nothing to clear.
  }
  return count
}

function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const profile = useProfile()
  const prefs = usePrefs()
  const { health, recheck } = useBackendHealth()
  const [note, setNote] = useState('')
  const [sure, setSure] = useState(false)

  const backend =
    health.state === 'checking'
      ? 'Checking…'
      : health.state === 'offline'
        ? `Offline. ${health.reason}`
        : health.info.mock
          ? 'Online (mock backend, not the real engine)'
          : health.info.llm_configured
            ? `Online. Model: ${health.info.working_model ?? 'selected on first run'}`
            : 'Online, but no AI key: fallback answers only'

  const online = health.state === 'online'

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">Your profile, appearance and data. Everything here is stored only in this browser.</p>

      <div className="set-grid">
        <section className="panel set-card">
          <h2>Profile</h2>
          <p className="kind-label">No password, no server account</p>
          <div className="set-who">
            <span className="set-avatar" aria-hidden="true">
              {(profile.name.trim()[0] ?? '?').toUpperCase()}
            </span>
            <div>
              <strong>{profile.name || 'Unnamed'}</strong>
              <small>{profile.role}</small>
            </div>
          </div>
          <label className="set-field">
            <span>Name</span>
            <input
              value={profile.name}
              maxLength={30}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </label>
          <label className="set-field">
            <span>Role</span>
            <select value={profile.role} onChange={(e) => updateProfile({ role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={onSignOut}>
            Sign out
          </button>
        </section>

        <section className="panel set-card">
          <h2>Appearance</h2>
          <p className="kind-label">Theme and effects</p>
          <div className="set-row">
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <label className="set-switch">
            <input
              type="checkbox"
              checked={prefs.background}
              onChange={(e) => setPrefs({ background: e.target.checked })}
            />
            <span>
              <strong>Molten metal background</strong>
              <small>Turn off if the page feels slow.</small>
            </span>
          </label>
          <label className="set-field">
            <span>Background intensity: {Math.round(prefs.intensity * 100)}%</span>
            <input
              type="range"
              min={0.2}
              max={1.5}
              step={0.1}
              value={prefs.intensity}
              disabled={!prefs.background}
              onChange={(e) => setPrefs({ intensity: Number(e.target.value) })}
            />
          </label>
          <label className="set-switch">
            <input
              type="checkbox"
              checked={prefs.sparks}
              onChange={(e) => setPrefs({ sparks: e.target.checked })}
            />
            <span>
              <strong>Click sparks</strong>
              <small>The yellow stars when you click.</small>
            </span>
          </label>
          <label className="set-switch">
            <input
              type="checkbox"
              checked={profile.animations}
              onChange={(e) => updateProfile({ animations: e.target.checked })}
            />
            <span>
              <strong>Animations</strong>
              <small>Card entrances, the map and charts.</small>
            </span>
          </label>
          <p className="muted set-tip">
            Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to search.
          </p>
        </section>

        <section className="panel set-card">
          <h2>Backend</h2>
          <p className="kind-label">Live status</p>
          <p className="set-status">
            <i className={`set-dot ${online ? 'on' : 'off'}`} aria-hidden="true" />
            {backend}
          </p>
          <button type="button" className="btn" onClick={recheck}>
            Check again
          </button>
        </section>

        <section className="panel set-card">
          <h2>Your data</h2>
          <p className="kind-label">Saved in this browser only</p>
          <p>
            Saved answers let the last investigation show if the backend stops. Agent activity is
            this session&apos;s record of approvals.
          </p>
          <div className="set-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const n = clearSavedAnswers()
                setNote(`Removed ${n} saved answer${n === 1 ? '' : 's'}.`)
              }}
            >
              Clear saved answers
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                clearActivity()
                setNote('Agent activity cleared.')
              }}
            >
              Clear agent activity
            </button>
          </div>
          <div className="set-danger">
            {sure ? (
              <>
                <span>Reset every setting and sign out?</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    clearSavedAnswers()
                    clearActivity()
                    setPrefs({ sparks: true, background: true, intensity: 1 })
                    setSure(false)
                    onSignOut()
                  }}
                >
                  Yes, reset
                </button>
                <button type="button" className="btn" onClick={() => setSure(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={() => setSure(true)}>
                Reset everything
              </button>
            )}
          </div>
          {note ? (
            <p className="muted" role="status">
              {note}
            </p>
          ) : null}
        </section>
      </div>
    </>
  )
}

export default SettingsPage