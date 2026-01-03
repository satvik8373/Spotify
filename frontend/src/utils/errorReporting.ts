// Error reporting utility for production debugging
export const reportError = (error: Error, context?: string) => {
  console.error(`[${context || 'Unknown'}] Error:`, error);
  console.error('Stack trace:', error.stack);
  
  // In production, you might want to send this to an error reporting service
  if (import.meta.env.PROD) {
    // Example: Send to error reporting service
    // errorReportingService.captureException(error, { context });
  }
};

export const reportReactError = (error: Error, errorInfo: any) => {
  console.error('React Error:', error);
  console.error('Component Stack:', errorInfo?.componentStack);
  
  if (import.meta.env.PROD) {
    // Report React-specific errors
    // errorReportingService.captureException(error, { 
    //   extra: { componentStack: errorInfo?.componentStack }
    // });
  }
};

// Check for common React issues
export const checkReactEnvironment = () => {
  try {
    // Check if React is properly loaded
    if (typeof React === 'undefined') {
      throw new Error('React is not defined');
    }
    
    // Check if ReactDOM is properly loaded
    if (typeof ReactDOM === 'undefined') {
      throw new Error('ReactDOM is not defined');
    }
    
    // Check for multiple React instances
    const reactVersion = React.version;
    console.log('React version:', reactVersion);
    
    return true;
  } catch (error) {
    reportError(error as Error, 'React Environment Check');
    return false;
  }
};