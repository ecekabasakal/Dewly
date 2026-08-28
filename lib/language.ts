import { getLocales } from 'expo-localization';

export type Language = 'en' | 'tr';

/**
 * The app's content language.
 *
 * The dataset carries EN and TR copy, so we pick TR for Turkish devices and
 * fall back to EN for everything else. There is no full i18n layer yet — this
 * only chooses which `description_*` / `caution_*` column to read.
 */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}
