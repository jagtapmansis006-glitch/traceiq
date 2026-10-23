import './seenbefore.css'

type Past = { id?: string; root_cause?: string; fix?: string } | string

function SeenBefore({ past }: { past: unknown }) {
  if (!past) return null

  const p: Past = typeof past === 'string' ? past : (past as Past)
  const obj = typeof p === 'object' ? p : null
  const id = obj?.id
  const cause = obj?.root_cause
  const fix = obj?.fix
  if (!id && !cause && !fix && typeof p !== 'string') return null

  return (
    <aside className="seen panel" aria-label="Seen before">
      <h2>{id ? `Seen before in ${id}` : 'Seen before'}</h2>
      {typeof p === 'string' ? <p>{p}</p> : null}
      {cause ? (
        <p>
          <strong>Root cause then:</strong> {cause}
        </p>
      ) : null}
      {fix ? (
        <p>
          <strong>Fix that worked:</strong> {fix}
        </p>
      ) : null}
    </aside>
  )
}

export default SeenBefore