/**
 * Deliberately free of native imports.
 *
 * `deviceLanguage` used to live here, and its `expo-localization` import made
 * this module — and everything that reads `pick` — unloadable in `bun test`.
 * It now sits in `lib/device-language.ts`, so the language vocabulary and the
 * bilingual `pick` rule stay testable. Same pure/impure split as
 * `lib/tile-fit.ts` and `theme/layout.ts`.
 */
export const LANGUAGES = ['en', 'tr'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Narrows unknown input (stored JSON, a route param) to a Language. */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
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
