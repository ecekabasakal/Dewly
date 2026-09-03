import type { Language } from './language';

/**
 * The home hero's greeting and the name it addresses.
 *
 * Pure, so it can be tested without a renderer — same reason `lib/tile-fit.ts`
 * lives outside its component.
 */

export type TimeOfDayGreeting = 'morning' | 'afternoon' | 'evening';

const COPY: Record<Language, Record<TimeOfDayGreeting, string>> = {
  en: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  tr: {
    morning: 'Günaydın',
    afternoon: 'İyi günler',
    evening: 'İyi akşamlar',
  },
};

/**
 * Which greeting to show, from the local hour.
 *
 * Computed rather than fixed to "Good morning": a greeting that is wrong for
 * sixteen hours a day is worse than no greeting, and skincare is a routine
 * people open at both ends of the day.
 *
 * Boundaries are 05:00 and 18:00. Evening wraps midnight, so 02:00 is evening
 * rather than a fourth "good night" state — three greetings cover the day
 * without any of them being a stretch.
 */
export function greetingFor(date: Date = new Date()): TimeOfDayGreeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

export function greetingText(language: Language, date?: Date): string {
  return COPY[language][greetingFor(date)];
}

/**
 * A display name derived from the sign-in email.
 *
 * ## Read this before using it elsewhere
 *
 * Dewly does not collect a name. The profile holds skin type, concerns, goals,
 * age range and sensitivity — nothing personal enough to greet someone by. So
 * this INFERS one from the email local part, which is a guess: it is right for
 * `ada.lovelace@…` and wrong for `xx_skincare_99@…`.
 *
 * It is used in exactly one place, the home hero, where being approximately
 * right is better than "Hello there" — and it degrades to `null` rather than
 * printing something mangled, so the hero can fall back to a nameless greeting.
 *
 * The real fix is a name field in onboarding. Until then this is a deliberate,
 * contained approximation and not a general-purpose identity helper.
 */
export function displayNameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const local = email.split('@')[0];
  if (!local) return null;

  const words = local
    // `ada.lovelace`, `ada_lovelace`, `ada-lovelace` are all one name.
    .split(/[._\-+]+/)
    // Trailing digits are almost always disambiguation, not part of a name.
    .map((part) => part.replace(/\d+$/, ''))
    .filter((part) => part.length > 0)
    // A pure-numeric or single-letter local part carries no name to show.
    .filter((part) => /[a-zA-ZÀ-ɏ]/.test(part));

  if (words.length === 0) return null;

  const name = words
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');

  // Beyond this it is not a name, it is a handle — and it would wrap the hero
  // headline onto three lines.
  return name.length <= 22 ? name : null;
}
