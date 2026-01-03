import { removeSessionStorage, removeLocalStorage, getSessionStorageKeys, getLocalStorageKeys } from './storageUtils';

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
      removeSessionStorage(key);
    });

    // Clear any Firebase auth redirect state from sessionStorage
    const keys = getSessionStorageKeys();
    keys.forEach(key => {
      if (key.includes('firebase') && (key.includes('redirect') || key.includes('pending'))) {
        removeSessionStorage(key);
      }
    });

    // Also clear from localStorage if present
    const localKeys = getLocalStorageKeys();
    localKeys.forEach(key => {
      if (key.includes('firebase') && key.includes('redirect')) {
        removeLocalStorage(key);
      }
    });
  } catch (error) {
    console.warn('Could not clear auth redirect state:', error);
  }
};

// Auto-clear on module load
if (typeof window !== 'undefined') {
  clearAuthRedirectState();
}
