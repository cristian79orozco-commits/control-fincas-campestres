import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Capturado error en componente:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            maxWidth: '650px',
            margin: '3rem auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>
            {this.props.fallbackTitle || 'Se produjo un problema al cargar esta sección'}
          </h2>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Se ha prevenido el bloqueo de la aplicación. Puedes intentar recargar el módulo o volver a intentarlo.
          </p>

          {this.state.error && (
            <div
              style={{
                background: 'var(--surface-2)',
                padding: '0.85rem',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--danger)',
                marginBottom: '1.5rem',
                overflowX: 'auto',
                maxHeight: '120px',
              }}
            >
              {this.state.error.toString()}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} /> Reintentar
            </button>
            <button
              type="button"
              className="btn"
              onClick={this.handleReload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
