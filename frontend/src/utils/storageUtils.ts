/**
 * Safe storage utilities that never throw errors
 * Handles cases where storage is not available (incognito mode, privacy settings, etc.)
 */

/**
 * Safely get an item from localStorage
 * @param key - The key to retrieve
 * @returns The value or null if not found or storage unavailable
 */
export function getLocalStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to access localStorage for key "${key}":`, error);
        return null;
    }
}

/**
 * Safely get an item from sessionStorage
 * @param key - The key to retrieve
 * @returns The value or null if not found or storage unavailable
 */
export function getSessionStorage(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to access sessionStorage for key "${key}":`, error);
        return null;
    }
}

/**
 * Safely set an item in localStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setLocalStorage(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write to localStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Safely set an item in sessionStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setSessionStorage(key: string, value: string): boolean {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write to sessionStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Safely remove an item from localStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export function removeLocalStorage(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove from localStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Safely remove an item from sessionStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export function removeSessionStorage(key: string): boolean {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove from sessionStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Safely get and parse JSON from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - The default value to return if parsing fails or storage unavailable
 * @returns The parsed value or defaultValue
 */
export function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.warn(`Failed to parse JSON from localStorage for key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safely get and parse JSON from sessionStorage
 * @param key - The key to retrieve
 * @param defaultValue - The default value to return if parsing fails or storage unavailable
 * @returns The parsed value or defaultValue
 */
export function getSessionStorageJSON<T>(key: string, defaultValue: T): T {
    try {
        const item = sessionStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.warn(`Failed to parse JSON from sessionStorage for key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safely stringify and set JSON in localStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setLocalStorageJSON<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to write JSON to localStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Safely stringify and set JSON in sessionStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setSessionStorageJSON<T>(key: string, value: T): boolean {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to write JSON to sessionStorage for key "${key}":`, error);
        return false;
    }
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is accessible, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if sessionStorage is available
 * @returns true if sessionStorage is accessible, false otherwise
 */
export function isSessionStorageAvailable(): boolean {
    try {
        const testKey = '__storage_test__';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely clear all items from localStorage
 * @returns true if successful, false otherwise
 */
export function clearLocalStorage(): boolean {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.warn('Failed to clear localStorage:', error);
        return false;
    }
}

/**
 * Safely clear all items from sessionStorage
 * @returns true if successful, false otherwise
 */
export function clearSessionStorage(): boolean {
    try {
        sessionStorage.clear();
        return true;
    } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
        return false;
    }
}

/**
 * Safely get all keys from localStorage
 * @returns Array of keys or empty array if storage unavailable
 */
export function getLocalStorageKeys(): string[] {
    try {
        return Object.keys(localStorage);
    } catch (error) {
        console.warn('Failed to get localStorage keys:', error);
        return [];
    }
}

/**
 * Safely get all keys from sessionStorage
 * @returns Array of keys or empty array if storage unavailable
 */
export function getSessionStorageKeys(): string[] {
    try {
        return Object.keys(sessionStorage);
    } catch (error) {
        console.warn('Failed to get sessionStorage keys:', error);
        return [];
    }
}
