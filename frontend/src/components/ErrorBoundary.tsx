import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-white font-sans">
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-[#00C8FF]/20 text-center space-y-6 shadow-[0_0_50px_rgba(0,163,255,0.15)]">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">System Recovered from Error</h2>
              <p className="text-xs text-gray-400 mt-2 font-sans leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred. Your state has been safely isolated.'}
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,163,255,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Enterprise Session</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
