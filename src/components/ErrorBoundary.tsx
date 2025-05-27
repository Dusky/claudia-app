import React from 'react';
import { useAppStore } from '../store/appStore';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console with structured format
    console.group('🚨 Application Error Caught by ErrorBoundary');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // Display error in CRT terminal
    this.displayErrorInTerminal(error, errorInfo);
  }

  private displayErrorInTerminal(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Get the app store instance to access terminal
      const store = useAppStore.getState();
      
      // Format error for terminal display
      const errorMessage = this.formatErrorForTerminal(error, errorInfo);
      
      // Add error to terminal output
      store.addLines({
        id: `error-${Date.now()}`,
        type: 'error',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        user: 'claudia'
      });
    } catch (terminalError) {
      console.error('Failed to display error in terminal:', terminalError);
    }
  }

  private formatErrorForTerminal(error: Error, errorInfo: React.ErrorInfo): string {
    const timestamp = new Date().toISOString();
    
    return `
[ERROR] ${timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 APPLICATION ERROR

${error.name}: ${error.message}

STACK TRACE:
${error.stack || 'No stack trace available'}

COMPONENT STACK:
${errorInfo.componentStack}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error recovery options:
• Type /clear to clear the terminal and continue
• Type /reload to refresh the application  
• Press F5 to hard refresh the page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleClearTerminal = () => {
    try {
      const store = useAppStore.getState();
      store.setLines([]);
      this.handleRetry();
    } catch (error) {
      console.error('Failed to clear terminal:', error);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          color: '#ff0000',
          fontFamily: 'Monaco, "Courier New", monospace',
          fontSize: '14px',
          padding: '20px',
          overflow: 'auto',
          zIndex: 9999,
          background: 'linear-gradient(45deg, #000000 0%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            border: '2px solid #ff0000',
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)'
          }}>
            <h1 style={{ 
              color: '#ff0000', 
              margin: '0 0 20px 0',
              fontSize: '24px',
              textShadow: '0 0 10px #ff0000'
            }}>
              🚨 SYSTEM ERROR
            </h1>
            
            <div style={{ marginBottom: '20px' }}>
              <strong>Error:</strong> {this.state.error?.name || 'Unknown Error'}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <strong>Message:</strong> {this.state.error?.message || 'No error message'}
            </div>
            
            {this.state.error?.stack && (
              <details style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#ffff00' }}>
                  Stack Trace (click to expand)
                </summary>
                <pre style={{ 
                  marginTop: '10px', 
                  padding: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontSize: '12px',
                  color: '#cccccc'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            {this.state.errorInfo?.componentStack && (
              <details style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#ffff00' }}>
                  Component Stack (click to expand)
                </summary>
                <pre style={{ 
                  marginTop: '10px', 
                  padding: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontSize: '12px',
                  color: '#cccccc'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              flexWrap: 'wrap',
              marginTop: '30px' 
            }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#00ff00',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textShadow: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#00cc00';
                  e.currentTarget.style.boxShadow = '0 0 10px #00ff00';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#00ff00';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔄 Retry
              </button>
              
              <button
                onClick={this.handleClearTerminal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffff00',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  textShadow: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#cccc00';
                  e.currentTarget.style.boxShadow = '0 0 10px #ffff00';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffff00';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🗑️ Clear Terminal
              </button>
              
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff6600',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#cc5500';
                  e.currentTarget.style.boxShadow = '0 0 10px #ff6600';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6600';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔄 Reload Page
              </button>
            </div>
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#666666',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 'auto'
          }}>
            This error was also logged to the CRT terminal (if available) and browser console.
            <br />
            Check DevTools Console for additional debugging information.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}