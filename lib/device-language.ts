import { getLocales } from 'expo-localization';
import type { Language } from './language';

/**
 * The language to start in when the user has never chosen one.
 *
 * Only a default: once a choice is saved, `useLanguage` prefers it over this,
 * so someone reading Turkish on an English phone stays in Turkish.
 */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}
