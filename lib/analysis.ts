/**
 * Turns a pasted INCI list into a personalised analysis.
 *
 * Split from `lib/inci.ts` on purpose: matching is pure and offline, this layer
 * is the one that touches the network and the user's profile.
 */

import { supabase } from './supabase';
import { parseInciList, resolveTokens, type ParsedToken, type MatchVia } from './inci';
import { AppError } from './errors';
import { pick, type Language } from './language';
import type { Ingredient } from '../types/db';
import type { Concern, Profile } from '../types/profile';

export type HeadsUpKind =
  | 'caution'
  | 'fragrance'
  | 'comedogenic'
  | 'active-on-sensitive';

/**
 * A flag, stored WITHOUT any rendered text.
 *
 * Language is resolved at render time by `headsUpCopy`, not baked in here.
 * Freezing the strings at analysis time meant the EN/TR toggle silently left
 * every flag in whichever language was active when Analyze was pressed.
 */
export type HeadsUp =
  | { kind: 'caution' }
  | { kind: 'fragrance'; sensitive: boolean }
  | { kind: 'comedogenic'; rating: number; relevant: boolean }
  | { kind: 'active-on-sensitive' };

export type AnalyzedIngredient = {
  ingredient: Ingredient;
  token: ParsedToken;
  via: MatchVia;
  /** Intersection of the ingredient's targets and the user's concerns. */
  matchedConcerns: Concern[];
  headsUp: HeadsUp[];
};

export type AnalysisResult = {
  matched: AnalyzedIngredient[];
  /** Tokens that resolved to nothing — always shown, never silently dropped. */
  unmatched: ParsedToken[];
  /** Same ingredient listed twice; kept out of `matched` to avoid duplicate cards. */
  duplicates: { canonical: string; tokens: ParsedToken[] }[];
  totalTokens: number;
};

/** Comedogenic ratings at or above this are worth mentioning. */
const COMEDOGENIC_THRESHOLD = 3;

/** Concerns for which a pore-clogging ingredient actually matters. */
const CLOG_SENSITIVE_CONCERNS: Concern[] = ['acne', 'pores', 'oiliness'];

/**
 * Copy for the flags Dewly generates itself.
 *
 * The ingredient text comes from the database in both languages; these strings
 * do not, so they are translated here. Without this the card would mix a
 * Turkish description with an English warning.
 */
const COPY = {
  en: {
    caution: 'Caution',
    fragrance: 'Fragrance',
    strongActive: 'Strong active',
    fragranceSensitive:
      'A fragrance component. You told us your skin reacts easily, so this is one to watch.',
    fragrancePlain: 'A fragrance component — a common trigger for reactive skin.',
    comedogenicRelevant:
      'Rated likely to clog pores, which matters given the concerns you picked.',
    comedogenicPlain: 'Rated likely to clog pores for some people.',
    activeSensitive: 'An active ingredient. With reactive skin, introduce it slowly.',
    pore: (n: number) => `Comedogenic ${n}/5`,
  },
  tr: {
    caution: 'Dikkat',
    fragrance: 'Koku',
    strongActive: 'Güçlü aktif',
    fragranceSensitive:
      'Bir koku bileşeni. Cildinizin kolay tepki verdiğini belirttiniz, bu yüzden dikkat edin.',
    fragrancePlain: 'Bir koku bileşeni — hassas ciltlerde sık görülen bir tetikleyici.',
    comedogenicRelevant:
      'Gözenek tıkama ihtimali yüksek; seçtiğiniz endişeler için önemli olabilir.',
    comedogenicPlain: 'Bazı kişilerde gözenekleri tıkayabilir.',
    activeSensitive: 'Aktif bir içerik. Hassas ciltte yavaş başlayın.',
    pore: (n: number) => `Komedojenik ${n}/5`,
  },
} as const;

function buildHeadsUp(ingredient: Ingredient, profile: Profile | null): HeadsUp[] {
  const flags: HeadsUp[] = [];
  const concerns = profile?.concerns ?? [];
  const isSensitiveSkin =
    profile?.skinType === 'sensitive' ||
    profile?.sensitivity === 'very' ||
    concerns.includes('sensitivity');

  // A caution exists if EITHER language column has text; which one is shown is
  // decided at render time.
  if (ingredient.caution_en || ingredient.caution_tr) {
    flags.push({ kind: 'caution' });
  }

  if (ingredient.category === 'fragrance') {
    flags.push({ kind: 'fragrance', sensitive: isSensitiveSkin });
  }

  const rating = ingredient.comedogenic_rating;
  if (rating != null && rating >= COMEDOGENIC_THRESHOLD) {
    flags.push({
      kind: 'comedogenic',
      rating,
      relevant: concerns.some((c) => CLOG_SENSITIVE_CONCERNS.includes(c)),
    });
  }

  // Only flagged when the user actually said their skin is reactive — otherwise
  // every serum would carry a warning and the signal would be worthless.
  if (ingredient.is_active && isSensitiveSkin) {
    flags.push({ kind: 'active-on-sensitive' });
  }

  return flags;
}

/** Resolves a flag to display text. Called at render, so the toggle works. */
export function headsUpCopy(
  flag: HeadsUp,
  ingredient: Ingredient,
  language: Language
): { label: string; detail: string } {
  const t = COPY[language];

  switch (flag.kind) {
    case 'caution':
      // `pick` falls back across languages rather than dropping a genuine
      // warning because one column happens to be empty.
      return {
        label: t.caution,
        detail: pick(language, ingredient.caution_en, ingredient.caution_tr),
      };
    case 'fragrance':
      return {
        label: t.fragrance,
        detail: flag.sensitive ? t.fragranceSensitive : t.fragrancePlain,
      };
    case 'comedogenic':
      return {
        label: t.pore(flag.rating),
        detail: flag.relevant ? t.comedogenicRelevant : t.comedogenicPlain,
      };
    case 'active-on-sensitive':
      return { label: t.strongActive, detail: t.activeSensitive };
  }
}

export function describe(ingredient: Ingredient, language: Language): string | null {
  return pick(language, ingredient.description_en, ingredient.description_tr) || null;
}

/**
 * Language is deliberately NOT a parameter: the result is language-independent
 * so switching EN/TR re-renders without re-querying Supabase.
 */
export async function analyzeInciList(
  text: string,
  profile: Profile | null
): Promise<AnalysisResult> {
  const tokens = parseInciList(text);
  const resolutions = resolveTokens(tokens);

  const unmatched = resolutions.filter((r) => r.canonical === null).map((r) => r.token);

  // Collapse repeats: a label may list the same ingredient twice, and two
  // different synonyms can resolve to one canonical name.
  const firstByCanonical = new Map<string, { token: ParsedToken; via: MatchVia }>();
  const repeats = new Map<string, ParsedToken[]>();

  for (const r of resolutions) {
    if (!r.canonical || !r.via) continue;
    const seen = firstByCanonical.get(r.canonical);
    if (seen) {
      repeats.set(r.canonical, [...(repeats.get(r.canonical) ?? [seen.token]), r.token]);
    } else {
      firstByCanonical.set(r.canonical, { token: r.token, via: r.via });
    }
  }

  const names = [...firstByCanonical.keys()];

  if (names.length === 0) {
    return { matched: [], unmatched, duplicates: [], totalTokens: tokens.length };
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .in('inci_name', names);

  if (error) {
    throw new AppError('load-failed', `load ingredient details: ${error.message}`);
  }

  const byName = new Map((data ?? []).map((row) => [row.inci_name, row]));

  const matched: AnalyzedIngredient[] = [];
  const missingFromDb: ParsedToken[] = [];

  for (const [canonical, { token, via }] of firstByCanonical) {
    const ingredient = byName.get(canonical);
    if (!ingredient) {
      // Resolved locally but absent from the database — treat as unrecognised
      // rather than rendering a blank card.
      missingFromDb.push(token);
      continue;
    }

    const userConcerns = profile?.concerns ?? [];
    const matchedConcerns = (ingredient.targets_concerns as Concern[]).filter((c) =>
      userConcerns.includes(c)
    );

    matched.push({
      ingredient,
      token,
      via,
      matchedConcerns,
      headsUp: buildHeadsUp(ingredient, profile),
    });
  }

  // Preserve the order the user pasted — label order approximates concentration.
  matched.sort((a, b) => a.token.index - b.token.index);

  return {
    matched,
    unmatched: [...unmatched, ...missingFromDb].sort((a, b) => a.index - b.index),
    duplicates: [...repeats.entries()].map(([canonical, tokens]) => ({ canonical, tokens })),
    totalTokens: tokens.length,
  };
}
