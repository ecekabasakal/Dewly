import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLanguage, type Language } from './language';

/**
 * Persistence boundary for the chosen language — same shape as `ProfileStore`
 * and `ShelfStore`.
 *
 * Deliberately NOT per-user, unlike those two. The language is a device-level
 * preference: the sign-in screen has to render in it before there is a user to
 * key it by, so it lives in AsyncStorage and stays put across sign-outs.
 */
export interface LanguageStore {
  load(): Promise<Language | null>;
  save(language: Language): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'dewly.language.v1';

export const asyncStorageLanguageStore: LanguageStore = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    // Storage is untrusted: anything that isn't a language we know is treated
    // as "never chosen", so the caller falls back to the device language.
    return isLanguage(raw) ? raw : null;
  },

  async save(language) {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
