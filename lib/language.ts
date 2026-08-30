import { getLocales } from 'expo-localization';

export const LANGUAGES = ['en', 'tr'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Narrows unknown input (stored JSON, a route param) to a Language. */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

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

/**
 * Picks one side of a bilingual pair.
 *
 * Every `*_en` / `*_tr` column in the dataset is read through this, so the
 * fallback rule is written once: prefer the asked-for language, fall back to
 * the other rather than rendering an empty string. A missing translation should
 * degrade to the wrong language, never to nothing.
 */
export function pick(
  language: Language,
  en: string | null | undefined,
  tr: string | null | undefined
): string {
  const preferred = language === 'tr' ? tr : en;
  return preferred ?? en ?? tr ?? '';
}
