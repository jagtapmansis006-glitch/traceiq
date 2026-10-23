import { Component } from 'react'
import type { ReactNode } from 'react'

type State = { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" role="alert" style={{ padding: 20 }}>
          <h2>Something went wrong on this page</h2>
          <p className="muted">Copy the message below and send it to me:</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary