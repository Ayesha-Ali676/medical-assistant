import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#fff3cd',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <AlertTriangle style={{ color: '#ff6b6b', width: '64px', height: '64px', marginBottom: '20px' }} />
          <h1 style={{ color: '#d32f2f', marginBottom: '10px' }}>Application Error</h1>
          <p style={{ color: '#666', marginBottom: '20px', maxWidth: '600px', textAlign: 'center' }}>
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '5px',
              padding: '15px',
              maxWidth: '600px',
              overflow: 'auto',
              maxHeight: '300px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#d32f2f',
              marginBottom: '20px'
            }}>
              <strong>Error Details:</strong>
              <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
