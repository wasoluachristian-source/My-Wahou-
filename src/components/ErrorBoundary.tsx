import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('my Wahou UI Error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('mywahou_last_contact');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleResetAuth = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-violet-600/30">
              <MessageSquare className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-white mb-1">
                my Wahou
              </h2>
              <p className="text-xs text-zinc-400">
                Une micro-erreur d'affichage s'est produite lors du chargement.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="truncate">
                {this.state.error?.message || 'Erreur temporaire de rendu.'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger l'application</span>
              </button>

              <button
                onClick={this.handleResetAuth}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs transition active:scale-95"
              >
                Réinitialiser la session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
