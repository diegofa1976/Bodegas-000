
import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-black">Algo no ha salido como esperábamos</h2>
            <p className="text-stone-500 max-w-xs mx-auto">Se ha producido un error inesperado en la mesa de trabajo.</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
          >
            Reiniciar aplicación
          </button>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default ErrorBoundary;
