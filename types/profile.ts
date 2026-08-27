/**
 * Skin profile captured during onboarding (Phase 4).
 *
 * Stored locally for now; Phase 8 syncs it to Supabase per user.
 */

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
  skinType?: SkinType;
  concerns: Concern[];
  goals: Goal[];
  ageRange?: AgeRange;
  sensitivity?: SensitivityLevel;
};

export const PROFILE_VERSION = 1;

export const EMPTY_DRAFT: ProfileDraft = {
  concerns: [],
  goals: [],
};

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------
//
// Stored values stay machine-readable (they are matched against the database);
// these are only for rendering.

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: 'Dry',
  oily: 'Oily',
  combination: 'Combination',
  sensitive: 'Sensitive',
  normal: 'Normal',
};

export const CONCERN_LABELS: Record<Concern, string> = {
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
};

export const GOAL_LABELS: Record<Goal, string> = {
  hydration: 'Hydration',
  brightening: 'Brightening',
  'anti-aging': 'Anti-aging',
  calming: 'Calming',
  'oil-control': 'Oil control',
  'barrier-repair': 'Barrier repair',
};

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  'under-18': 'Under 18',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-plus': '45+',
};

export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  'not-sensitive': 'Not sensitive',
  slightly: 'Slightly sensitive',
  very: 'Very sensitive',
};
