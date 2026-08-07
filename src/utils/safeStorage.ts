/**
 * localStorage is not always available: Safari Private Browsing, embedded
 * WebViews and some enterprise policies throw on access. Every read/write in
 * the app goes through here so a storage failure can never blank the UI.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn(`Could not read "${key}" from localStorage`, error);
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Could not write "${key}" to localStorage`, error);
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Could not remove "${key}" from localStorage`, error);
    }
  },
};
