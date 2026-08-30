/**
 * Guesses a product's routine step.
 *
 * Two passes, in order:
 *   1. Keywords in the product name (English + Turkish).
 *   2. The product's ingredients, when the name says nothing useful.
 *
 * The guess is always a suggestion. Every caller shows it pre-selected and
 * lets the user change it before saving — a wrong guess should cost one tap,
 * never a wrong routine.
 */

import ingredientsFile from '../data/ingredients.json';
import { normalizeToken } from './inci';
import type { Language } from './language';
import type { StepType } from '../types/shelf';

export type GuessSource = 'name' | 'ingredients';

/**
 * Why a step was guessed, stored WITHOUT rendered text.
 *
 * Same rule as Phase 5's `HeadsUp`: the reason used to be a ready-made English
 * sentence, so a guess computed in English stayed English after the toggle
 * flipped. The variant plus its value is the language-independent fact;
 * `guessReasonText` turns it into a sentence at render time.
 */
export type GuessReason =
  | { kind: 'name-pattern'; value: string }
  | { kind: 'uv-filter'; value: string }
  | { kind: 'contains'; value: string }
  | { kind: 'rich-base' }
  | { kind: 'built-around'; value: string };

export type StepGuess = {
  stepType: StepType | null;
  source: GuessSource | null;
  /** What triggered the guess, shown to the user so the suggestion is legible. */
  reason: GuessReason | null;
};

/**
 * Ordered keyword rules — FIRST MATCH WINS, so the list runs most-specific
 * first. That ordering is doing real work:
 *
 *   "Cleansing Oil"  contains both `cleansing` and `oil` -> oil_cleanser, not face_oil
 *   "Eye Cream"      contains `cream`                    -> eye_cream, not moisturizer
 *   "Güneş Kremi"    contains `krem`                     -> spf, not moisturizer
 *
 * Patterns are matched against the NORMALIZED name, so they are written in
 * accent-free lowercase: `gunes`, not `güneş`. This reuses the exact normalizer
 * from Phase 5's INCI matching, so Turkish diacritics fold the same way in both
 * features rather than drifting apart.
 */
const NAME_RULES: { step: StepType; patterns: string[] }[] = [
  // Eye care before any generic cream rule.
  { step: 'eye_cream', patterns: ['eye cream', 'eye serum', 'eye care', 'goz kremi', 'goz bakim', 'goz serum'] },

  // Sun care before generic cream/lotion.
  { step: 'spf', patterns: ['spf', 'sunscreen', 'sun screen', 'sun cream', 'sunblock', 'uv protect', 'gunes kremi', 'gunes koruyucu', 'gunes'] },

  // Oil-based cleansers before both cleanser and face-oil rules.
  { step: 'oil_cleanser', patterns: ['oil cleanser', 'cleansing oil', 'cleansing balm', 'balm cleanser', 'yag temizleyici', 'temizleyici yag', 'temizleme yagi', 'makyaj temizleme yagi'] },

  // Exfoliants before toner: "exfoliating toner" should be an exfoliant.
  { step: 'exfoliant', patterns: ['exfoliant', 'exfoliating', 'peeling', 'peel ', 'aha', 'bha', 'pha', 'scrub', 'clarifying pad', 'peeling jel'] },

  { step: 'water_cleanser', patterns: ['cleanser', 'cleansing gel', 'cleansing foam', 'face wash', 'facewash', 'foaming', 'micellar', 'temizleyici', 'yuz yikama', 'misel su'] },
  { step: 'toner', patterns: ['toner', 'tonik', 'tonic'] },
  { step: 'essence', patterns: ['essence', 'esans', 'first treatment', 'ferment water'] },
  { step: 'serum', patterns: ['serum', 'ampoule', 'ampul', 'booster', 'concentrate'] },

  // Face oil before moisturizer so "Face Oil" isn't caught by a cream rule.
  { step: 'face_oil', patterns: ['face oil', 'facial oil', 'yuz yagi', 'bakim yagi'] },

  { step: 'moisturizer', patterns: ['moisturizer', 'moisturiser', 'moisturizing cream', 'nemlendirici', 'nem kremi', 'lotion', 'losyon', 'emulsion', 'emulsiyon', 'gel cream', 'cream', 'krem'] },
];

/**
 * Ingredient-based fallback, checked in this order.
 *
 * Only used when the name is uninformative ("The Ordinary 10% Niacinamide",
 * "Klairs Supple Preparation"). Deliberately conservative: it returns null
 * rather than guessing from weak evidence, because a blank picker is a smaller
 * annoyance than a confidently wrong one.
 */
const EXFOLIATING_ACIDS = new Set([
  'Glycolic Acid',
  'Salicylic Acid',
  'Lactic Acid',
  'Mandelic Acid',
]);

type IngredientRow = { inci_name: string; category: string; is_active: boolean };

const INGREDIENT_INDEX = new Map<string, IngredientRow>(
  (ingredientsFile as IngredientRow[]).map((row) => [row.inci_name, row])
);

function guessFromIngredients(ingredientNames: string[]): StepGuess {
  const rows = ingredientNames
    .map((name) => INGREDIENT_INDEX.get(name))
    .filter((row): row is IngredientRow => row !== undefined);

  if (rows.length === 0) {
    return { stepType: null, source: null, reason: null };
  }

  // A UV filter is unambiguous — nothing else contains one.
  const filter = rows.find((row) => row.category === 'spf_filter');
  if (filter) {
    return {
      stepType: 'spf',
      source: 'ingredients',
      reason: { kind: 'uv-filter', value: filter.inci_name },
    };
  }

  const acid = rows.find((row) => EXFOLIATING_ACIDS.has(row.inci_name));
  if (acid) {
    return {
      stepType: 'exfoliant',
      source: 'ingredients',
      reason: { kind: 'contains', value: acid.inci_name },
    };
  }

  // Occlusives and emollients dominating the list reads as a cream, not a serum.
  const richCount = rows.filter(
    (row) => row.category === 'occlusive' || row.category === 'emollient'
  ).length;
  if (richCount >= 3 && richCount / rows.length >= 0.3) {
    return {
      stepType: 'moisturizer',
      source: 'ingredients',
      reason: { kind: 'rich-base' },
    };
  }

  const active = rows.find((row) => row.is_active);
  if (active) {
    return {
      stepType: 'serum',
      source: 'ingredients',
      reason: { kind: 'built-around', value: active.inci_name },
    };
  }

  return { stepType: null, source: null, reason: null };
}

export function guessStepFromName(name: string): StepGuess {
  const normalized = normalizeToken(name);
  if (!normalized) return { stepType: null, source: null, reason: null };

  // Pad so a pattern ending in a space (e.g. "peel ") can match at the end.
  const haystack = ` ${normalized} `;

  for (const rule of NAME_RULES) {
    const hit = rule.patterns.find((pattern) => haystack.includes(pattern));
    if (hit) {
      return {
        stepType: rule.step,
        source: 'name',
        reason: { kind: 'name-pattern', value: hit.trim() },
      };
    }
  }

  return { stepType: null, source: null, reason: null };
}

export function guessStep(name: string, ingredientNames: string[] = []): StepGuess {
  const byName = guessStepFromName(name);
  if (byName.stepType) return byName;
  return guessFromIngredients(ingredientNames);
}

/**
 * SPF is a morning step. Used to pre-select AM and to warn on a PM placement.
 */
export function isAmOnlyStep(step: StepType): boolean {
  return step === 'spf';
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const REASON_COPY = {
  en: {
    'name-pattern': (v: string) => `matched “${v}”`,
    'uv-filter': (v: string) => `contains the UV filter ${v}`,
    contains: (v: string) => `contains ${v}`,
    'rich-base': () => 'rich in occlusives and emollients',
    'built-around': (v: string) => `built around ${v}`,
  },
  tr: {
    'name-pattern': (v: string) => `adında “${v}” geçiyor`,
    'uv-filter': (v: string) => `${v} güneş filtresi içeriyor`,
    contains: (v: string) => `${v} içeriyor`,
    'rich-base': () => 'örtücü ve yumuşatıcı açısından zengin',
    'built-around': (v: string) => `${v} üzerine kurulu`,
  },
} as const;

/** Resolves a guess reason to display text. Called at render, so the toggle works. */
export function guessReasonText(reason: GuessReason, language: Language): string {
  const t = REASON_COPY[language];
  switch (reason.kind) {
    case 'name-pattern':
      return t['name-pattern'](reason.value);
    case 'uv-filter':
      return t['uv-filter'](reason.value);
    case 'contains':
      return t.contains(reason.value);
    case 'rich-base':
      return t['rich-base']();
    case 'built-around':
      return t['built-around'](reason.value);
  }
}
