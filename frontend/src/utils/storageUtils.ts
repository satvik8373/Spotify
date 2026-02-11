/**
 * Safe storage utilities that never throw errors
 * Handles cases where storage is not available (incognito mode, privacy settings, iOS PWA, etc.)
 */

import { safeLocalStorage, safeSessionStorage } from './iosStorageHandler';

/**
 * Safely get an item from localStorage
 * @param key - The key to retrieve
 * @returns The value or null if not found or storage unavailable
 */
export function getLocalStorage(key: string): string | null {
    try {
        return safeLocalStorage.getItem(key);
    } catch (error) {
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
        return safeSessionStorage.getItem(key);
    } catch (error) {
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
        safeLocalStorage.setItem(key, value);
        return true;
    } catch (error) {
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
        safeSessionStorage.setItem(key, value);
        return true;
    } catch (error) {
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
        safeLocalStorage.removeItem(key);
        return true;
    } catch (error) {
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
        safeSessionStorage.removeItem(key);
        return true;
    } catch (error) {
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
        const item = safeLocalStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
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
        const item = safeSessionStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
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
        safeLocalStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
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
        safeSessionStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
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
        safeLocalStorage.setItem(testKey, 'test');
        safeLocalStorage.removeItem(testKey);
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
        safeSessionStorage.setItem(testKey, 'test');
        safeSessionStorage.removeItem(testKey);
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
        safeLocalStorage.clear();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Safely clear all items from sessionStorage
 * @returns true if successful, false otherwise
 */
export function clearSessionStorage(): boolean {
    try {
        safeSessionStorage.clear();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Safely get all keys from localStorage
 * @returns Array of keys or empty array if storage unavailable
 */
export function getLocalStorageKeys(): string[] {
    try {
        const keys: string[] = [];
        for (let i = 0; i < safeLocalStorage.length; i++) {
            const key = safeLocalStorage.key(i);
            if (key) keys.push(key);
        }
        return keys;
    } catch (error) {
        return [];
    }
}

/**
 * Safely get all keys from sessionStorage
 * @returns Array of keys or empty array if storage unavailable
 */
export function getSessionStorageKeys(): string[] {
    try {
        const keys: string[] = [];
        for (let i = 0; i < safeSessionStorage.length; i++) {
            const key = safeSessionStorage.key(i);
            if (key) keys.push(key);
        }
        return keys;
    } catch (error) {
        return [];
    }
}
