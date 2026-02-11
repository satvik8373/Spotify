/**
 * iOS-safe storage handler
 * Provides fallback storage implementations for iOS PWA and incognito mode
 */

class MemoryStorage implements Storage {
    private data: Map<string, string> = new Map();

    get length(): number {
        return this.data.size;
    }

    clear(): void {
        this.data.clear();
    }

    getItem(key: string): string | null {
        return this.data.get(key) ?? null;
    }

    key(index: number): string | null {
        const keys = Array.from(this.data.keys());
        return keys[index] ?? null;
    }

    removeItem(key: string): void {
        this.data.delete(key);
    }

    setItem(key: string, value: string): void {
        this.data.set(key, value);
    }
}

function createSafeStorage(storageType: 'localStorage' | 'sessionStorage'): Storage {
    try {
        const storage = storageType === 'localStorage' ? window.localStorage : window.sessionStorage;
        const testKey = '__storage_test__';
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        return storage;
    } catch {
        return new MemoryStorage();
    }
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
