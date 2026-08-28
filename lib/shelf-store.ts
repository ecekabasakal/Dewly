import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHELF_VERSION, type ShelfProduct, type ShelfSnapshot } from '../types/shelf';

/**
 * Persistence boundary for the shelf — same shape as `ProfileStore`.
 *
 * `useShelf` talks to this interface and never to AsyncStorage directly, so
 * Phase 8 can drop in a Supabase-backed implementation (`user_shelf` +
 * `products`) without touching a screen.
 */
export interface ShelfStore {
  load(): Promise<ShelfProduct[]>;
  save(products: ShelfProduct[]): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'dewly.shelf.v1';

/**
 * Narrow unknown JSON back to products.
 *
 * Storage is untrusted: it may hold data from an older build. Individual bad
 * rows are dropped rather than failing the whole load, so one corrupt entry
 * cannot cost the user their entire shelf.
 */
function parseShelf(raw: string): ShelfProduct[] {
  try {
    const value = JSON.parse(raw) as Partial<ShelfSnapshot> | null;
    if (!value || typeof value !== 'object') return [];
    if (value.version !== SHELF_VERSION) return [];
    if (!Array.isArray(value.products)) return [];

    return value.products.filter((product): product is ShelfProduct => {
      if (!product || typeof product !== 'object') return false;
      return (
        typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        typeof product.stepType === 'string' &&
        typeof product.timeOfDay === 'string' &&
        Array.isArray(product.ingredientNames)
      );
    });
  } catch {
    return [];
  }
}

export const asyncStorageShelfStore: ShelfStore = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? parseShelf(raw) : [];
  },

  async save(products) {
    const snapshot: ShelfSnapshot = { version: SHELF_VERSION, products };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
