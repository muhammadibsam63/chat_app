import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a rendering failure from blanking the whole application. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Render error', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fatal">
        <div className="fatal-inner">
          <p className="eyebrow">Unexpected error</p>
          <h1 className="display-2">This view could not be rendered.</h1>
          <p className="lede">
            The interface hit an unrecoverable state. Reloading usually resolves it — the data itself is safe.
          </p>
          <button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>
            Reload the site
          </button>
        </div>
      </div>
    );
  }
}
