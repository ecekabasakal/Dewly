/**
 * INCI list parsing, normalization and matching.
 *
 * Resolution runs entirely on bundled data (aliases + canonical names), so a
 * pasted list resolves instantly and offline. Only the ingredient *content*
 * is fetched from Supabase afterwards — see `lib/analysis.ts`.
 */

import aliasFile from '../data/ingredient_aliases.json';
import ingredientsFile from '../data/ingredients.json';

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Turkish letters that Unicode decomposition will not fix.
 *
 * NFKD splits accented Latin letters into base + combining mark, which we then
 * strip — that handles ç, ğ, ö, ü, ş. But `ı` (U+0131 dotless i) is its own
 * base letter with nothing to decompose, so it survives and must be mapped
 * explicitly. Without this, "yağı" and "yagi" would not meet.
 */
const TURKISH_FOLD: Record<string, string> = {
  ı: 'i',
  İ: 'i',
};

/** Dropped outright rather than replaced with a space. */
const STRIPPED = /[.()[\]{}"'`®™©]/g;

/** Kept because the alias file keeps them: `alpha-arbutin`, `caprylic/capric`. */
const KEPT_PUNCTUATION = /[^a-z0-9/+\- ]+/g;

/**
 * Canonical normalizer — mirrors how `data/ingredient_aliases.json` keys were
 * built: lowercased, accent-stripped, punctuation-collapsed.
 *
 * Verified against the alias file: 290 of its 291 keys are already fixed points
 * of this function. The one exception (`salyangoz musı`) is an inconsistency in
 * the file itself, which is why the lookup index normalizes its own keys on
 * load rather than trusting them verbatim.
 */
export function normalizeToken(raw: string): string {
  let value = raw.toLowerCase();

  for (const [from, to] of Object.entries(TURKISH_FOLD)) {
    value = value.split(from).join(to);
  }

  value = value.normalize('NFKD').replace(/\p{M}+/gu, '');
  value = value.replace(STRIPPED, '');
  value = value.replace(KEPT_PUNCTUATION, ' ');

  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Second-chance form: also flattens `-`, `/` and `+` to spaces.
 *
 * The alias file already lists both spellings for the variants its authors
 * anticipated ("alpha arbutin" and "alpha-arbutin"). This catches the ones they
 * did not — "copper tripeptide 1" for "Copper Tripeptide-1", say.
 *
 * Safe to use as a fallback because no two aliases or canonical names collide
 * under it for the current dataset; if that ever changes, the index build below
 * drops the ambiguous entry rather than guessing.
 */
export function looseToken(raw: string): string {
  return normalizeToken(raw).replace(/[/+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Lookup index
// ---------------------------------------------------------------------------

const rawAliases: Record<string, string> = aliasFile.aliases;
const canonicalNames: string[] = (ingredientsFile as { inci_name: string }[]).map(
  (row) => row.inci_name
);

/** Exact (normalized) lookup: alias key or canonical name -> canonical name. */
const strictIndex = new Map<string, string>();
/** Flattened lookup, only consulted when `strictIndex` misses. */
const looseIndex = new Map<string, string>();
/** Loose keys that map to more than one canonical name; never auto-resolved. */
const looseAmbiguous = new Set<string>();

function addLoose(key: string, canonical: string) {
  if (!key) return;
  const existing = looseIndex.get(key);
  if (existing && existing !== canonical) {
    looseAmbiguous.add(key);
    return;
  }
  looseIndex.set(key, canonical);
}

// Canonical names first so a name always wins over an alias pointing elsewhere.
for (const name of canonicalNames) {
  strictIndex.set(normalizeToken(name), name);
  addLoose(looseToken(name), name);
}

for (const [alias, canonical] of Object.entries(rawAliases)) {
  const key = normalizeToken(alias);
  if (!strictIndex.has(key)) strictIndex.set(key, canonical);
  addLoose(looseToken(alias), canonical);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type ParsedToken = {
  /** As the user typed it, trimmed — shown back to them verbatim. */
  raw: string;
  normalized: string;
  /** Position in the pasted list (0-based). Label order ≈ concentration order. */
  index: number;
};

/**
 * Splits a pasted ingredient list into tokens.
 *
 * Separators are commas, semicolons and newlines. Bullet characters and
 * leading list markers are stripped, and a trailing period is dropped, because
 * real labels are pasted with all of those attached.
 *
 * A slash is deliberately NOT a separator: "Caprylic/Capric Triglyceride" is a
 * single ingredient, and splitting it would produce two unmatched fragments.
 */
export function parseInciList(text: string): ParsedToken[] {
  return text
    .split(/[,;\n\r]+/)
    .map((piece) => piece.replace(/^[\s\-•*·]+/, '').replace(/\.\s*$/, '').trim())
    .filter((piece) => piece.length > 0)
    .map((raw, index) => ({ raw, normalized: normalizeToken(raw), index }))
    .filter((token) => token.normalized.length > 0);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** How a token was matched — surfaced in the UI so a loose match is visible. */
export type MatchVia = 'exact' | 'alias' | 'loose';

export type Resolution = {
  token: ParsedToken;
  canonical: string | null;
  via: MatchVia | null;
};

export function resolveToken(token: ParsedToken): Resolution {
  const exact = strictIndex.get(token.normalized);
  if (exact) {
    // Distinguish "typed the canonical name" from "typed a known synonym".
    // Compare normalized forms, not raw lowercase: the canonical name may carry
    // punctuation the normalizer strips, e.g. "Cocos Nucifera (Coconut) Oil".
    const via: MatchVia =
      normalizeToken(exact) === token.normalized ? 'exact' : 'alias';
    return { token, canonical: exact, via };
  }

  const loose = looseToken(token.raw);
  if (loose && !looseAmbiguous.has(loose)) {
    const hit = looseIndex.get(loose);
    if (hit) return { token, canonical: hit, via: 'loose' };
  }

  return { token, canonical: null, via: null };
}

export function resolveTokens(tokens: ParsedToken[]): Resolution[] {
  return tokens.map(resolveToken);
}

/** Exposed for the debug line on the results screen. */
export const INDEX_STATS = {
  canonicalCount: canonicalNames.length,
  aliasCount: Object.keys(rawAliases).length,
  ambiguousLooseKeys: looseAmbiguous.size,
};
