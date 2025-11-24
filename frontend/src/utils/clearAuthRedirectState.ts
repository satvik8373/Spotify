/**
 * Clear any Firebase auth redirect state that might cause
 * "missing initial state" errors in PWA/WebView
 */
export const clearAuthRedirectState = () => {
  try {
    // Clear session storage items related to Firebase auth redirect
    const sessionKeys = [
      'auth_redirect',
      'firebase:redirectUser',
      'firebase:pendingRedirect'
    ];
    
    sessionKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore if sessionStorage is not accessible
      }
    });
    
    // Clear any Firebase auth redirect state from sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('firebase') && (key.includes('redirect') || key.includes('pending'))) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore errors
    }
    
    // Also clear from localStorage if present
    try {
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.includes('firebase') && key.includes('redirect')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore errors
    }
  } catch (error) {
    console.warn('Could not clear auth redirect state:', error);
  }
};

// Auto-clear on module load
if (typeof window !== 'undefined') {
  clearAuthRedirectState();
}
