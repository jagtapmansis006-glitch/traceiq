import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { View } from '../nav'
import { updateProfile, useProfile } from '../profile'

const ROLES = ['On-call engineer', 'SRE', 'Developer', 'Engineering manager']

type Props = {
  onNavigate: (view: View) => void
  onSignOut: () => void
}

function AccountMenu({ onNavigate, onSignOut }: Props) {
  const { name, role, signedIn } = useProfile()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftRole, setDraftRole] = useState(ROLES[0])
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = draft.trim()
    if (!clean) return
    updateProfile({ name: clean, role: draftRole, signedIn: true })
    setDraft('')
    setOpen(false)
  }

  return (
    <div className="account-wrap" ref={ref}>
      <button
        type="button"
        className="nav-avatar"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={signedIn ? `${name} · account` : 'Sign in or create a profile'}
        onClick={() => setOpen((o) => !o)}
      >
        {signedIn && name ? name.charAt(0).toUpperCase() : '👤'}
      </button>

      {open ? (
        <div className="account-menu" role="dialog" aria-label="Account">
          {signedIn ? (
            <>
              <div className="account-who">
                <strong>{name}</strong>
                <span className="muted">{role}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onNavigate('Settings')
                }}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              <strong>Sign in or create a profile</strong>
              <label>
                <span>Your name</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={30}
                  placeholder="e.g. Tejas"
                  autoFocus
                />
              </label>
              <label>
                <span>Role</span>
                <select value={draftRole} onChange={(e) => setDraftRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
                Continue
              </button>
              <p className="account-note">
                A local profile saved only in this browser. No password, no server account.
              </p>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default AccountMenu