/**
 * Skin profile captured during onboarding (Phase 4).
 *
 * Stored locally for now; Phase 8 syncs it to Supabase per user.
 */

import type { Language } from '../lib/language';

// ---------------------------------------------------------------------------
// Skin type
// ---------------------------------------------------------------------------

export const SKIN_TYPES = [
  'dry',
  'oily',
  'combination',
  'sensitive',
  'normal',
] as const;

export type SkinType = (typeof SKIN_TYPES)[number];

// ---------------------------------------------------------------------------
// Concerns
// ---------------------------------------------------------------------------

/**
 * These values are a CONTRACT with `data/ingredients.json`: every member must
 * appear in some ingredient's `targets_concerns`, because Phase 5 matches a
 * user's concerns against that column to decide what is "good for you".
 *
 * Verified against the seeded dataset — all 11 appear, and the dataset contains
 * no concern outside this list. Changing either side without the other silently
 * breaks the mapping, so keep them in step.
 */
export const CONCERNS = [
  'acne',
  'hyperpigmentation',
  'aging',
  'redness',
  'dryness',
  'dullness',
  'oiliness',
  'texture',
  'sensitivity',
  'pores',
  'barrier',
] as const;

export type Concern = (typeof CONCERNS)[number];

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const GOALS = [
  'hydration',
  'brightening',
  'anti-aging',
  'calming',
  'oil-control',
  'barrier-repair',
] as const;

export type Goal = (typeof GOALS)[number];

// ---------------------------------------------------------------------------
// Age range
// ---------------------------------------------------------------------------

export const AGE_RANGES = ['under-18', '18-24', '25-34', '35-44', '45-plus'] as const;

export type AgeRange = (typeof AGE_RANGES)[number];

// ---------------------------------------------------------------------------
// Sensitivity
// ---------------------------------------------------------------------------

export const SENSITIVITY_LEVELS = ['not-sensitive', 'slightly', 'very'] as const;

export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * A finished profile. Every field is set — a partially answered flow is a
 * `ProfileDraft`, which keeps "in progress" and "done" from being the same
 * shape and removes the need for null checks after onboarding.
 */
export type Profile = {
  /**
   * What to call the user. OPTIONAL everywhere — the onboarding step can be
   * skipped, and every reader must cope with null.
   *
   * First name only, by design: it exists to make the home greeting personal,
   * not to identify anyone. `null` and `''` are the same thing here, and
   * `normalizeDisplayName` collapses them so callers only handle one.
   */
  name?: string | null;
  skinType: SkinType;
  concerns: Concern[];
  goals: Goal[];
  ageRange: AgeRange;
  sensitivity: SensitivityLevel;
  /** ISO timestamp of when onboarding was completed. */
  completedAt: string;
  /** Bumped when the profile shape changes, so old stored data can be migrated. */
  version: number;
};

/** In-progress answers. Multi-selects start as empty arrays, not undefined. */
export type ProfileDraft = {
  name?: string | null;
  skinType?: SkinType;
  concerns: Concern[];
  goals: Goal[];
  ageRange?: AgeRange;
  sensitivity?: SensitivityLevel;
};

/**
 * Stays at 1 even though `Profile` gained a field.
 *
 * `parseProfile` discards the whole stored profile when the version does not
 * match, which would push every existing user back through onboarding. An added
 * OPTIONAL field needs no migration — older rows simply read back with `name`
 * undefined, which is exactly what skipping the step produces anyway.
 */
export const PROFILE_VERSION = 1;

export const EMPTY_DRAFT: ProfileDraft = {
  concerns: [],
  goals: [],
};

/** Longer than this is not a first name, and it wraps the home hero. */
export const MAX_NAME_LENGTH = 24;

/**
 * Trims a typed name to what gets stored, or `null` if there is nothing left.
 *
 * One function so onboarding and the Settings editor cannot disagree about
 * whether "  " is a name. Collapses inner whitespace too, so a stray double
 * space does not survive into the greeting.
 */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (value.length === 0) return null;
  return value.slice(0, MAX_NAME_LENGTH);
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------
//
// Stored values stay machine-readable (they are matched against the database);
// these are only for rendering.
//
// Keyed by language FIRST, so every call site has to name a language to reach a
// string. That ordering is the point: `CONCERN_LABELS[concern]` used to compile
// and silently return English, which is exactly how these leaked past the
// toggle. Now it doesn't type-check.

export const SKIN_TYPE_LABELS: Record<Language, Record<SkinType, string>> = {
  en: {
    dry: 'Dry',
    oily: 'Oily',
    combination: 'Combination',
    sensitive: 'Sensitive',
    normal: 'Normal',
  },
  tr: {
    dry: 'Kuru',
    oily: 'Yağlı',
    combination: 'Karma',
    sensitive: 'Hassas',
    normal: 'Normal',
  },
};

export const CONCERN_LABELS: Record<Language, Record<Concern, string>> = {
  en: {
    acne: 'Acne',
    hyperpigmentation: 'Dark spots',
    aging: 'Fine lines',
    redness: 'Redness',
    dryness: 'Dryness',
    dullness: 'Dullness',
    oiliness: 'Oiliness',
    texture: 'Texture',
    sensitivity: 'Sensitivity',
    pores: 'Pores',
    barrier: 'Barrier damage',
  },
  tr: {
    acne: 'Akne',
    hyperpigmentation: 'Leke',
    aging: 'İnce çizgiler',
    redness: 'Kızarıklık',
    dryness: 'Kuruluk',
    dullness: 'Donukluk',
    oiliness: 'Yağlanma',
    texture: 'Cilt dokusu',
    sensitivity: 'Hassasiyet',
    pores: 'Gözenekler',
    barrier: 'Bariyer hasarı',
  },
};

export const GOAL_LABELS: Record<Language, Record<Goal, string>> = {
  en: {
    hydration: 'Hydration',
    brightening: 'Brightening',
    'anti-aging': 'Anti-aging',
    calming: 'Calming',
    'oil-control': 'Oil control',
    'barrier-repair': 'Barrier repair',
  },
  tr: {
    hydration: 'Nemlendirme',
    brightening: 'Aydınlatma',
    'anti-aging': 'Yaşlanma karşıtı',
    calming: 'Yatıştırma',
    'oil-control': 'Yağ kontrolü',
    'barrier-repair': 'Bariyer onarımı',
  },
};

export const AGE_RANGE_LABELS: Record<Language, Record<AgeRange, string>> = {
  en: {
    'under-18': 'Under 18',
    '18-24': '18–24',
    '25-34': '25–34',
    '35-44': '35–44',
    '45-plus': '45+',
  },
  tr: {
    'under-18': '18 yaş altı',
    '18-24': '18–24',
    '25-34': '25–34',
    '35-44': '35–44',
    '45-plus': '45+',
  },
};

export const SENSITIVITY_LABELS: Record<Language, Record<SensitivityLevel, string>> = {
  en: {
    'not-sensitive': 'Not sensitive',
    slightly: 'Slightly sensitive',
    very: 'Very sensitive',
  },
  tr: {
    'not-sensitive': 'Hassas değil',
    slightly: 'Biraz hassas',
    very: 'Çok hassas',
  },
};
