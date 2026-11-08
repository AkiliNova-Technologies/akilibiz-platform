/**
 * Safe Storage Utility
 * 
 * Provides localStorage-like API that works in all environments,
 * including PyWebView where localStorage might not be available.
 * 
 * Usage:
 *   import { safeStorage } from '@/utils/safeStorage';
 *   
 *   // Replace localStorage.getItem with:
 *   safeStorage.getItem('key');
 *   
 *   // Replace localStorage.setItem with:
 *   safeStorage.setItem('key', 'value');
 */

// In-memory fallback storage
const memoryStorage: Record<string, string> = {};

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = isLocalStorageAvailable();

if (!storageAvailable) {
  console.warn('⚠️ localStorage not available, using in-memory storage (data will not persist)');
}

export const safeStorage = {
  /**
   * Get an item from storage
   */
  getItem(key: string): string | null {
    try {
      if (storageAvailable) {
        return localStorage.getItem(key);
      }
      return memoryStorage[key] ?? null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return memoryStorage[key] ?? null;
    }
  },

  /**
   * Set an item in storage
   */
  setItem(key: string, value: string): void {
    try {
      if (storageAvailable) {
        localStorage.setItem(key, value);
      }
      // Also store in memory as backup
      memoryStorage[key] = value;
    } catch (error) {
      console.error('Storage setItem error:', error);
      memoryStorage[key] = value;
    }
  },

  /**
   * Remove an item from storage
   */
  removeItem(key: string): void {
    try {
      if (storageAvailable) {
        localStorage.removeItem(key);
      }
      delete memoryStorage[key];
    } catch (error) {
      console.error('Storage removeItem error:', error);
      delete memoryStorage[key];
    }
  },

  /**
   * Clear all storage
   */
  clear(): void {
    try {
      if (storageAvailable) {
        localStorage.clear();
      }
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    } catch (error) {
      console.error('Storage clear error:', error);
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  },

  /**
   * Get number of items in storage
   */
  get length(): number {
    try {
      if (storageAvailable) {
        return localStorage.length;
      }
      return Object.keys(memoryStorage).length;
    } catch {
      return Object.keys(memoryStorage).length;
    }
  },

  /**
   * Get key at index
   */
  key(index: number): string | null {
    try {
      if (storageAvailable) {
        return localStorage.key(index);
      }
      const keys = Object.keys(memoryStorage);
      return keys[index] ?? null;
    } catch {
      const keys = Object.keys(memoryStorage);
      return keys[index] ?? null;
    }
  },

  /**
   * Check if storage is using localStorage or memory fallback
   */
  isUsingLocalStorage(): boolean {
    return storageAvailable;
  }
};

// Also export sessionStorage equivalent
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memoryStorage[`session_${key}`] ?? null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      memoryStorage[`session_${key}`] = value;
    }
  },

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      delete memoryStorage[`session_${key}`];
    }
  },

  clear(): void {
    try {
      sessionStorage.clear();
    } catch {
      Object.keys(memoryStorage)
        .filter(k => k.startsWith('session_'))
        .forEach(k => delete memoryStorage[k]);
    }
  }
};

export default safeStorage;
