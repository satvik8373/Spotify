/**
 * WebView Detection and Configuration Utilities
 * Handles WebView-specific authentication and caching issues
 */

/**
 * Detect if the app is running in a WebView
 */
export const isWebView = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for common WebView indicators
  const isAndroidWebView = /wv|webview/.test(userAgent) || 
                           /; wv\)/.test(userAgent) ||
                           (window as any).AndroidInterface !== undefined;
  
  const isIOSWebView = /(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(userAgent) ||
                       (window as any).webkit?.messageHandlers !== undefined;
  
  const isCapacitor = (window as any).Capacitor !== undefined;
  
  return isAndroidWebView || isIOSWebView || isCapacitor;
};

/**
 * Detect if running in Capacitor app
 */
export const isCapacitorApp = (): boolean => {
  return (window as any).Capacitor !== undefined;
};

/**
 * Clear all auth-related cache and storage
 * Call this before authentication to prevent stale data issues
 */
export const clearAuthCache = (): void => {
  try {
    // Clear localStorage auth items
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.includes('firebase') || key.includes('auth') || key.includes('google')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage auth items
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (key.includes('firebase') || key.includes('auth') || key.includes('google')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Auth cache cleared');
  } catch (error) {
    console.warn('⚠️ Could not clear auth cache:', error);
  }
};

/**
 * Configure WebView for optimal authentication
 * Call this on app initialization
 */
export const configureWebViewAuth = (): void => {
  if (!isWebView()) {
    return;
  }
  
  console.log('🔧 Configuring WebView for authentication...');
  
  // Clear any stale auth state
  clearAuthCache();
  
  // Disable service worker in WebView to prevent caching issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
  
  // Add WebView class to body for CSS targeting
  document.body.classList.add('webview-mode');
  
  console.log('✅ WebView configured for authentication');
};

/**
 * Get environment info for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    isWebView: isWebView(),
    isCapacitor: isCapacitorApp(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasSessionStorage: typeof sessionStorage !== 'undefined',
  };
};

/**
 * Force reload without cache (useful after updates)
 */
export const forceReloadWithoutCache = (): void => {
  if (isWebView()) {
    // Clear cache first
    clearAuthCache();
    
    // Force reload
    window.location.href = window.location.href + '?t=' + Date.now();
  } else {
    // Standard hard reload for browsers
    window.location.reload();
  }
};
