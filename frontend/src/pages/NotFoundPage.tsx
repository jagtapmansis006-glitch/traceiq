import StarButton from '../components/StarButton'
import './howitworks.css'

type NotFoundPageProps = {
  onHome: () => void
}

function NotFoundPage({ onHome }: NotFoundPageProps) {
  return (
    <div className="notfound">
      <section className="panel notfound-panel how-block" style={{ ['--d' as string]: 0 }}>
        <p className="notfound-code">404</p>
        <h1>This page does not exist</h1>
        <StarButton onClick={onHome}>Back home</StarButton>
      </section>
    </div>
  )
}

export default NotFoundPage
