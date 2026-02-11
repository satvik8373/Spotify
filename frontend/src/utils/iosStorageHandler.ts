/**
 * iOS PWA Storage Handler
 * Handles storage issues specific to iOS PWA standalone mode
 */

// Detect iOS PWA mode
export const isIOSPWA = (): boolean => {
  return ('standalone' in window.navigator) && (window.navigator as any).standalone === true;
};

// In-memory fallback storage for when localStorage fails
class MemoryStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }
}

// Fallback storage instances
const memoryLocalStorage = new MemoryStorage();
const memorySessionStorage = new MemoryStorage();

// Test if storage is available
let localStorageAvailable = true;
let sessionStorageAvailable = true;

try {
  const testKey = '__storage_test__';
  localStorage.setItem(testKey, 'test');
  localStorage.removeItem(testKey);
} catch (e) {
  localStorageAvailable = false;
  console.warn('localStorage not available, using memory fallback');
}

try {
  const testKey = '__storage_test__';
  sessionStorage.setItem(testKey, 'test');
  sessionStorage.removeItem(testKey);
} catch (e) {
  sessionStorageAvailable = false;
  console.warn('sessionStorage not available, using memory fallback');
}

/**
 * Safe localStorage wrapper with iOS PWA fallback
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (localStorageAvailable) {
        return localStorage.getItem(key);
      }
      return memoryLocalStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem failed, using memory fallback', e);
      localStorageAvailable = false;
      return memoryLocalStorage.getItem(key);
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (localStorageAvailable) {
        localStorage.setItem(key, value);
        return;
      }
      memoryLocalStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage.setItem failed, using memory fallback', e);
      localStorageAvailable = false;
      
      // If quota exceeded, try to clear some space
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        try {
          // Clear old cache entries
          const keys = Object.keys(localStorage);
          keys.forEach(k => {
            if (k.includes('_cache') || k.includes('metrics') || k.includes('_old')) {
              try {
                localStorage.removeItem(k);
              } catch {}
            }
          });
          // Try again
          localStorage.setItem(key, value);
          localStorageAvailable = true;
          return;
        } catch {}
      }
      
      memoryLocalStorage.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    try {
      if (localStorageAvailable) {
        localStorage.removeItem(key);
        return;
      }
      memoryLocalStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage.removeItem failed, using memory fallback', e);
      localStorageAvailable = false;
      memoryLocalStorage.removeItem(key);
    }
  },

  clear(): void {
    try {
      if (localStorageAvailable) {
        localStorage.clear();
        return;
      }
      memoryLocalStorage.clear();
    } catch (e) {
      console.warn('localStorage.clear failed, using memory fallback', e);
      localStorageAvailable = false;
      memoryLocalStorage.clear();
    }
  },

  get length(): number {
    try {
      if (localStorageAvailable) {
        return localStorage.length;
      }
      return memoryLocalStorage.length;
    } catch (e) {
      localStorageAvailable = false;
      return memoryLocalStorage.length;
    }
  },

  key(index: number): string | null {
    try {
      if (localStorageAvailable) {
        return localStorage.key(index);
      }
      return memoryLocalStorage.key(index);
    } catch (e) {
      localStorageAvailable = false;
      return memoryLocalStorage.key(index);
    }
  }
};

/**
 * Safe sessionStorage wrapper with iOS PWA fallback
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (sessionStorageAvailable) {
        return sessionStorage.getItem(key);
      }
      return memorySessionStorage.getItem(key);
    } catch (e) {
      console.warn('sessionStorage.getItem failed, using memory fallback', e);
      sessionStorageAvailable = false;
      return memorySessionStorage.getItem(key);
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (sessionStorageAvailable) {
        sessionStorage.setItem(key, value);
        return;
      }
      memorySessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('sessionStorage.setItem failed, using memory fallback', e);
      sessionStorageAvailable = false;
      memorySessionStorage.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    try {
      if (sessionStorageAvailable) {
        sessionStorage.removeItem(key);
        return;
      }
      memorySessionStorage.removeItem(key);
    } catch (e) {
      console.warn('sessionStorage.removeItem failed, using memory fallback', e);
      sessionStorageAvailable = false;
      memorySessionStorage.removeItem(key);
    }
  },

  clear(): void {
    try {
      if (sessionStorageAvailable) {
        sessionStorage.clear();
        return;
      }
      memorySessionStorage.clear();
    } catch (e) {
      console.warn('sessionStorage.clear failed, using memory fallback', e);
      sessionStorageAvailable = false;
      memorySessionStorage.clear();
    }
  },

  get length(): number {
    try {
      if (sessionStorageAvailable) {
        return sessionStorage.length;
      }
      return memorySessionStorage.length;
    } catch (e) {
      sessionStorageAvailable = false;
      return memorySessionStorage.length;
    }
  },

  key(index: number): string | null {
    try {
      if (sessionStorageAvailable) {
        return sessionStorage.key(index);
      }
      return memorySessionStorage.key(index);
    } catch (e) {
      sessionStorageAvailable = false;
      return memorySessionStorage.key(index);
    }
  }
};

/**
 * Get storage status for debugging
 */
export const getStorageStatus = () => {
  return {
    localStorage: localStorageAvailable ? 'available' : 'fallback',
    sessionStorage: sessionStorageAvailable ? 'available' : 'fallback',
    isIOSPWA: isIOSPWA()
  };
};
