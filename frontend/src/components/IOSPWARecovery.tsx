import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * iOS PWA Recovery Component
 * Detects and handles iOS PWA-specific crashes and errors
 */
export const IOSPWARecovery = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Only run in iOS PWA mode
    const isIOSPWA = ('standalone' in window.navigator) && (window.navigator as any).standalone === true;
    if (!isIOSPWA) return;

    // Check for repeated errors
    const checkErrorHistory = () => {
      try {
        const lastError = sessionStorage.getItem('last_error');
        if (lastError) {
          const errorData = JSON.parse(lastError);
          const timeSinceError = Date.now() - errorData.timestamp;
          
          // If error happened less than 5 seconds ago, increment counter
          if (timeSinceError < 5000) {
            const count = parseInt(sessionStorage.getItem('error_count') || '0') + 1;
            setErrorCount(count);
            sessionStorage.setItem('error_count', count.toString());
            
            // Show recovery if multiple errors
            if (count >= 2) {
              setShowRecovery(true);
            }
          } else {
            // Reset counter if error was long ago
            sessionStorage.setItem('error_count', '0');
          }
        }
      } catch (e) {
        // Storage not available
      }
    };

    checkErrorHistory();

    // Monitor for storage quota issues
    const monitorStorage = () => {
      try {
        // Test if we can write to storage
        const testKey = '__ios_pwa_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          setShowRecovery(true);
        }
      }
    };

    monitorStorage();
    const interval = setInterval(monitorStorage, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    try {
      // Clear localStorage cache items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('_cache') || key.includes('metrics') || key.includes('_old')) {
          try {
            localStorage.removeItem(key);
          } catch {}
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Clear error count
      sessionStorage.setItem('error_count', '0');
      
      // Reload
      window.location.href = window.location.href.split('?')[0] + '?cleared=' + Date.now();
    } catch (e) {
      // Fallback reload
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    try {
      sessionStorage.setItem('error_count', '0');
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  if (!showRecovery) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">App Recovery</h2>
        </div>
        
        <p className="text-muted-foreground mb-6">
          The app encountered {errorCount > 1 ? 'multiple errors' : 'an error'}. 
          Clearing the cache may help resolve the issue.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Cache & Reload
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          If problems persist, try closing the app completely and reopening it.
        </p>
      </div>
    </div>
  );
};
