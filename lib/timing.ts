/**
 * Source-backed AM/PM timing suggestions.
 *
 * Every suggestion traces back to a rule in `data/timing_rules.json`, which
 * carries its own evidence strength, reason and citations. Nothing here invents
 * advice — this module only matches and formats.
 */

import timingFile from '../data/timing_rules.json';
import { normalizeToken } from './inci';
import type { Language } from './language';
import type { ProductTimeOfDay } from '../types/shelf';

export type EvidenceStrength = 'rule' | 'strong' | 'preference';

type RawSource = { label_en: string; label_tr: string; url: string };

type RawRule = {
  id: string;
  trigger: {
    canonical: string[];
    keywords_en: string[];
    keywords_tr: string[];
  };
  recommended_time: 'am' | 'pm';
  evidence_strength: EvidenceStrength;
  reason_en: string;
  reason_tr: string;
  sources: RawSource[];
};

type RawFile = {
  evidence_badges: Record<EvidenceStrength, Record<Language, string>>;
  disclaimer: Record<Language, string>;
  rules: RawRule[];
};

const FILE = timingFile as unknown as RawFile;

export type TimingSource = { label: string; url: string };

/** A rule with its text resolved into one language, ready to render. */
export type ResolvedRule = {
  id: string;
  recommendedTime: 'am' | 'pm';
  evidence: EvidenceStrength;
  evidenceLabel: string;
  reason: string;
  sources: TimingSource[];
};

export type TimingMatch = {
  /** What to pre-select. `both` when no rule applies. */
  time: ProductTimeOfDay;
  /** The rule that fired, or null when defaulted. */
  rule: RawRule | null;
  /** Which side of the trigger matched — shown so the suggestion is legible. */
  matchedOn: 'ingredient' | 'name' | null;
  /** The specific ingredient or keyword that matched. */
  matchedValue: string | null;
};

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

/**
 * Keywords are normalized once at load with the SAME normalizer used for INCI
 * matching, so `güneş kremi` in the rules file and a user typing `Güneş Kremi`
 * both collapse to `gunes kremi`. Writing the file's Turkish keywords with
 * their diacritics intact is therefore safe.
 */
const RULE_INDEX = FILE.rules.map((rule) => ({
  rule,
  canonical: new Set(rule.trigger.canonical),
  keywords: [...rule.trigger.keywords_en, ...rule.trigger.keywords_tr]
    .map(normalizeToken)
    .filter((keyword) => keyword.length > 0),
}));

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Suggests a time of day for a product.
 *
 * TWO passes, not one:
 *   1. Every rule's `canonical` list against the resolved ingredients.
 *   2. Only if nothing matched, every rule's keywords against the name.
 *
 * Within each pass, rules are evaluated in file order and the first match wins.
 *
 * The passes are separated because an INCI list is hard evidence about what is
 * in the bottle, while a product name is marketing copy that can actively
 * mislead. A single interleaved pass gets "Retinol Free Brightening Serum"
 * (which contains ascorbic acid, no retinoid) wrong: the retinoid rule sits
 * earlier in the file, so its NAME keyword would beat the vitamin C rule's
 * INGREDIENT evidence and send a morning product to the evening. Checking all
 * ingredients first removes that whole class of error.
 *
 * Returns `both` when nothing matches — the honest default, since most
 * products genuinely work at either end of the day.
 */
export function suggestTiming(
  productName: string,
  ingredientNames: string[] = []
): TimingMatch {
  // Pass 1 — ingredients.
  for (const entry of RULE_INDEX) {
    const ingredientHit = ingredientNames.find((name) => entry.canonical.has(name));
    if (ingredientHit) {
      return {
        time: entry.rule.recommended_time,
        rule: entry.rule,
        matchedOn: 'ingredient',
        matchedValue: ingredientHit,
      };
    }
  }

  // Pass 2 — name keywords.
  const normalizedName = normalizeToken(productName);
  if (normalizedName) {
    const haystack = ` ${normalizedName} `;
    for (const entry of RULE_INDEX) {
      const keywordHit = entry.keywords.find((keyword) => haystack.includes(keyword));
      if (keywordHit) {
        return {
          time: entry.rule.recommended_time,
          rule: entry.rule,
          matchedOn: 'name',
          matchedValue: keywordHit,
        };
      }
    }
  }

  return { time: 'both', rule: null, matchedOn: null, matchedValue: null };
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function resolveRule(rule: RawRule, language: Language): ResolvedRule {
  return {
    id: rule.id,
    recommendedTime: rule.recommended_time,
    evidence: rule.evidence_strength,
    evidenceLabel: FILE.evidence_badges[rule.evidence_strength][language],
    reason: language === 'tr' ? rule.reason_tr : rule.reason_en,
    sources: rule.sources.map((source) => ({
      label: language === 'tr' ? source.label_tr : source.label_en,
      url: source.url,
    })),
  };
}

/** All rules, resolved and grouped for the sources screen. */
export function allRules(language: Language): ResolvedRule[] {
  return FILE.rules.map((rule) => resolveRule(rule, language));
}

export function timingDisclaimer(language: Language): string {
  return FILE.disclaimer[language];
}

export function evidenceLabel(
  strength: EvidenceStrength,
  language: Language
): string {
  return FILE.evidence_badges[strength][language];
}
