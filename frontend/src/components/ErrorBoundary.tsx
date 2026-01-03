import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  console.error('Application Error:', error);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">
          We're sorry, but there was an error loading the application.
        </p>
        <details className="mb-6 text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
            Error details (click to expand)
          </summary>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback || ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Error Boundary caught an error:', error, errorInfo);
        
        // Log to external service in production
        if (import.meta.env.PROD) {
          // You can add error reporting service here
          console.error('Production error:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          });
        }
      }}
      onReset={() => {
        // Clear any error state
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;