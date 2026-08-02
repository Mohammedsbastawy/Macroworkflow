class SafeStorage {
  private isAvailable: boolean;
  private inMemoryStore: Record<string, string> = {};

  constructor() {
    this.isAvailable = false;
    if (typeof window !== "undefined") {
      try {
        const testKey = "__storage_test__";
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        this.isAvailable = true;
      } catch (e) {
        console.warn("localStorage is not available, using in-memory fallback.", e);
      }
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable && typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback
      }
    }
    return this.inMemoryStore[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback
      }
    }
    this.inMemoryStore[key] = String(value);
  }

  removeItem(key: string): void {
    if (this.isAvailable && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback
      }
    }
    delete this.inMemoryStore[key];
  }
}

export const safeStorage = new SafeStorage();
