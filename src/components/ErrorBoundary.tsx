import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Without this, any render-time throw leaves the user staring at an empty page
 * with no explanation and no way back.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Shrinkpic crashed:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-md w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Shrinkpic hit an unexpected error. Your images were never uploaded anywhere —
            reloading starts a fresh session.
          </p>
          <pre className="text-left text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/60 rounded-lg p-3 mb-4 overflow-x-auto">
            {error.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 dark:bg-brand-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Shrinkpic
          </button>
        </div>
      </div>
    );
  }
}
