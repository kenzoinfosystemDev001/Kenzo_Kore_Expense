import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

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
    console.error('Kenzo Kore UI Error Boundary caught an exception:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-white font-sans relative overflow-hidden">
          {/* Cyber ambient glow */}
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#00A3FF]/10 blur-[160px] pointer-events-none" />
          
          <div className="max-w-md w-full glass-panel border border-[#00C8FF]/20 rounded-3xl p-8 text-center space-y-6 relative z-10 shadow-[0_0_50px_rgba(0,163,255,0.15)]">
            <div className="w-16 h-16 rounded-2xl bg-[#00A3FF]/10 border border-[#00C8FF]/30 flex items-center justify-center mx-auto text-[#00C8FF]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] text-[#00C8FF] font-extrabold uppercase tracking-widest block">KENZO INFOSYSTEMS SECURITY</span>
              <h2 className="text-xl font-bold text-white">Application Session Restored</h2>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                An unexpected state transition occurred during session initialization. Click below to reload your dashboard.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Corporate Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
