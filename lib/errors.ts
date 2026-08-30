import type { Language } from './language';

/**
 * The failures the UI actually distinguishes.
 *
 * Deliberately coarse. Every screen that can fail has to choose a sentence and
 * a recovery action, and there are only a few genuinely different answers:
 * "we couldn't read your data", "we couldn't write it", "we won't write it
 * because we never read it". Adding a code means adding a screen state, so the
 * list stays short on purpose.
 */
export type AppErrorCode =
  | 'load-failed'
  | 'save-failed'
  /** A write was refused because the preceding load failed. See `guardStore`. */
  | 'not-loaded'
  | 'unknown';

/**
 * An error carrying a code the UI can translate, with the technical detail
 * kept separate.
 *
 * The split is the point. Supabase's own messages are English, developer-facing
 * and often meaningless to a user ("JWT expired", "PGRST116"). They used to be
 * interpolated straight into `Error.message` and rendered, which put raw English
 * on a Turkish screen. Now the raw text lives in `detail`, which is logged in
 * development and never displayed; screens render `appErrorMessage(code, …)`.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Raw upstream text. For logs and debugging — never render this. */
  readonly detail?: string;

  constructor(code: AppErrorCode, detail?: string) {
    // `message` is for the developer looking at a stack trace, not the user.
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Narrows an unknown catch value to a code.
 *
 * Uses a duck-typed check rather than `instanceof`: an AppError thrown across a
 * module boundary that Metro has loaded twice would fail `instanceof` while
 * still being, for every purpose that matters here, an AppError.
 */
export function errorCode(caught: unknown): AppErrorCode {
  if (
    typeof caught === 'object' &&
    caught !== null &&
    'code' in caught &&
    isAppErrorCode((caught as { code: unknown }).code)
  ) {
    return (caught as { code: AppErrorCode }).code;
  }
  return 'unknown';
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    value === 'load-failed' ||
    value === 'save-failed' ||
    value === 'not-loaded' ||
    value === 'unknown'
  );
}

const COPY = {
  en: {
    'load-failed': "Couldn't load your data. Check your connection and try again.",
    'save-failed': "Couldn't save that. Check your connection and try again.",
    'not-loaded':
      "Your data hasn't loaded yet, so nothing was changed. Try again once it loads.",
    unknown: 'Something went wrong. Please try again.',
  },
  tr: {
    'load-failed': 'Verilerin yüklenemedi. Bağlantını kontrol edip tekrar dene.',
    'save-failed': 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
    'not-loaded':
      'Verilerin henüz yüklenmedi, bu yüzden hiçbir şey değiştirilmedi. Yüklendiğinde tekrar dene.',
    unknown: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
  },
} as const satisfies Record<Language, Record<AppErrorCode, string>>;

/** The user-facing sentence for a failure. Resolved at render, like all copy. */
export function appErrorMessage(code: AppErrorCode, language: Language): string {
  return COPY[language][code];
}

/** Convenience for a catch block that only needs the sentence. */
export function messageFor(caught: unknown, language: Language): string {
  return appErrorMessage(errorCode(caught), language);
}
