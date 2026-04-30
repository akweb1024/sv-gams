import React from 'react'
import { Link } from 'react-router-dom'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state-card">
          <h3>Something went wrong on this page</h3>
          <p>Please return to Spaces and try again.</p>
          <Link to="/spaces" className="btn-primary" style={{ marginTop: '10px', display: 'inline-block' }}>
            Back to Spaces
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

export default AppErrorBoundary
