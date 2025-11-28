import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error in subtree:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: '16px', border: '1px solid var(--err)', background: 'var(--bg-elev1)', color: 'var(--fg)' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Subtab failed to render</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>An error occurred inside this panel. Please check console for details.</div>
          </div>
        )
      );
    }
    return this.props.children as React.ReactElement;
  }
}

