/**
 * Conflict / interaction engine.
 *
 * Evaluates the shelf against `data/conflict_rules.json` one time-slot at a
 * time and returns findings. Like `lib/timing.ts`, findings carry NO rendered
 * text — language is resolved at render by `resolveFinding`, so the EN/TR
 * toggle re-renders without re-running the engine.
 */

import conflictFile from '../data/conflict_rules.json';
import { normalizeToken } from './inci';
import type { Language } from './language';
import type { ProductTimeOfDay, ShelfProduct, StepType } from '../types/shelf';

export type Severity = 'high' | 'medium' | 'low';
export type EvidenceStrength = 'strong' | 'preference' | 'rule';
export type Slot = 'am' | 'pm';

type RawSource = { label_en: string; label_tr: string; url: string };

type TriggerSide = { canonical: string[]; keywords: string[] };

type RawPairRule = {
  id: string;
  trigger: { a: TriggerSide; b: TriggerSide };
  same_slot_only: boolean;
  severity: Severity;
  evidence_strength: EvidenceStrength;
  title_en: string;
  title_tr: string;
  explanation_en: string;
  explanation_tr: string;
  recommendation_en: string;
  recommendation_tr: string;
  sources: RawSource[];
};

type RawDerivedRule = {
  id: string;
  type: 'count_in_slot' | 'am_without_spf';
  counts?: {
    categories_or_flags?: string[];
    canonical?: string[];
    keywords?: string[];
  };
  threshold?: number;
  severity: Severity;
  evidence_strength: EvidenceStrength;
  title_en: string;
  title_tr: string;
  explanation_en: string;
  explanation_tr: string;
  recommendation_en: string;
  recommendation_tr: string;
  sources: RawSource[];
};

type RawFile = {
  severity_badges: Record<Severity, Record<Language, string>>;
  evidence_badges: Record<EvidenceStrength, Record<Language, string>>;
  clear_message: Record<Language, string>;
  disclaimer: Record<Language, string>;
  pair_rules: RawPairRule[];
  derived_rules: RawDerivedRule[];
};

const FILE = conflictFile as unknown as RawFile;

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export type ConflictFinding = {
  /** Stable key for React lists: rule id + slot. */
  key: string;
  ruleId: string;
  /** `all` only for a pair rule with same_slot_only = false. */
  slot: Slot | 'all';
  severity: Severity;
  evidence: EvidenceStrength;
  /**
   * Products that caused the finding, in shelf order, each with its own
   * time_of_day. The slot is carried per product because a `both` product
   * legitimately appears in an AM finding — without showing that, the list
   * reads as if the engine had pooled the two slots together.
   */
  products: { name: string; timeOfDay: ProductTimeOfDay }[];
  rule: RawPairRule | RawDerivedRule;
};

export type ResolvedFinding = {
  key: string;
  slot: Slot | 'all';
  severity: Severity;
  evidence: EvidenceStrength;
  severityLabel: string;
  evidenceLabel: string;
  title: string;
  explanation: string;
  recommendation: string;
  products: { name: string; timeOfDay: ProductTimeOfDay }[];
  sources: { label: string; url: string }[];
};

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Keywords normalized once, with the same normalizer used for INCI matching. */
function normalizeKeywords(keywords: string[] | undefined): string[] {
  return (keywords ?? []).map(normalizeToken).filter((k) => k.length > 0);
}

/**
 * Does a product satisfy one side of a trigger?
 *
 * Canonical ingredients are checked first — an INCI list is hard evidence about
 * what is in the bottle. The product name is only consulted as a fallback,
 * because most manually-added products have no ingredients attached and the
 * name is all we have.
 */
function productMatches(
  product: ShelfProduct,
  canonical: string[],
  normalizedKeywords: string[]
): boolean {
  const canonicalSet = new Set(canonical);
  if (product.ingredientNames.some((name) => canonicalSet.has(name))) return true;

  const haystack = ` ${normalizeToken(product.name)} `;
  return normalizedKeywords.some((keyword) => haystack.includes(keyword));
}

function inSlot(product: ShelfProduct, slot: Slot): boolean {
  const time: ProductTimeOfDay = product.timeOfDay;
  return time === 'both' || time === slot;
}

// ---------------------------------------------------------------------------
// SPF detection
// ---------------------------------------------------------------------------

const UV_FILTERS = new Set([
  'Zinc Oxide',
  'Titanium Dioxide',
  'Ethylhexyl Methoxycinnamate',
  'Butyl Methoxydibenzoylmethane',
  'Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine',
  'Diethylamino Hydroxybenzoyl Hexyl Benzoate',
]);

const SPF_KEYWORDS = ['spf', 'sunscreen', 'sunblock', 'gunes', 'uv filtre'];

function isSunscreen(product: ShelfProduct): boolean {
  if (product.stepType === 'spf') return true;
  if (product.ingredientNames.some((name) => UV_FILTERS.has(name))) return true;
  const haystack = ` ${normalizeToken(product.name)} `;
  return SPF_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

// ---------------------------------------------------------------------------
// Pair rules
// ---------------------------------------------------------------------------

const PAIR_INDEX = FILE.pair_rules.map((rule) => ({
  rule,
  aKeywords: normalizeKeywords(rule.trigger.a.keywords),
  bKeywords: normalizeKeywords(rule.trigger.b.keywords),
}));

/**
 * A pair rule fires when side A and side B are both present in the same slot,
 * satisfied by TWO DIFFERENT products.
 *
 * Requiring distinct products matters: a single serum formulated with both
 * retinol and an acid is the formulator's problem, not a layering mistake, and
 * the rule's own advice ("separate them onto alternating nights") would be
 * nonsense for one bottle. Without this check, such a product would flag itself.
 */
function evaluatePairRule(
  entry: (typeof PAIR_INDEX)[number],
  products: ShelfProduct[],
  slot: Slot | 'all'
): ConflictFinding | null {
  const { rule, aKeywords, bKeywords } = entry;

  const sideA = products.filter((p) =>
    productMatches(p, rule.trigger.a.canonical, aKeywords)
  );
  const sideB = products.filter((p) =>
    productMatches(p, rule.trigger.b.canonical, bKeywords)
  );

  if (sideA.length === 0 || sideB.length === 0) return null;

  const offenders: ShelfProduct[] = [];
  for (const a of sideA) {
    for (const b of sideB) {
      if (a.id === b.id) continue;
      if (!offenders.includes(a)) offenders.push(a);
      if (!offenders.includes(b)) offenders.push(b);
    }
  }

  if (offenders.length === 0) return null;

  return {
    key: `${rule.id}:${slot}`,
    ruleId: rule.id,
    slot,
    severity: rule.severity,
    evidence: rule.evidence_strength,
    products: products
      .filter((p) => offenders.includes(p))
      .map((p) => ({ name: p.name, timeOfDay: p.timeOfDay })),
    rule,
  };
}

// ---------------------------------------------------------------------------
// Derived rules
// ---------------------------------------------------------------------------

/**
 * `categories_or_flags: ["exfoliant_or_strong_acid"]`.
 *
 * There is no `exfoliant` ingredient category in the dataset — the categories
 * describe what an ingredient *is* (humectant, active, spf_filter…), not what a
 * product does. So this is treated as a product-level flag: the product counts
 * if its routine step is `exfoliant`, which catches a manually-added "AHA Toner"
 * with no ingredient list attached.
 */
const EXFOLIANT_STEP: StepType = 'exfoliant';

function countsAsExfoliant(
  product: ShelfProduct,
  rule: RawDerivedRule,
  keywords: string[]
): boolean {
  const flags = rule.counts?.categories_or_flags ?? [];
  if (flags.includes('exfoliant_or_strong_acid') && product.stepType === EXFOLIANT_STEP) {
    return true;
  }
  return productMatches(product, rule.counts?.canonical ?? [], keywords);
}

function evaluateDerivedRule(
  rule: RawDerivedRule,
  products: ShelfProduct[],
  slot: Slot
): ConflictFinding | null {
  if (rule.type === 'count_in_slot') {
    const keywords = normalizeKeywords(rule.counts?.keywords);
    const matching = products.filter((p) => countsAsExfoliant(p, rule, keywords));
    const threshold = rule.threshold ?? 2;

    if (matching.length < threshold) return null;

    return {
      key: `${rule.id}:${slot}`,
      ruleId: rule.id,
      slot,
      severity: rule.severity,
      evidence: rule.evidence_strength,
      products: matching.map((p) => ({ name: p.name, timeOfDay: p.timeOfDay })),
      rule,
    };
  }

  if (rule.type === 'am_without_spf') {
    // Only meaningful for the morning, and only once the user has actually
    // built a morning routine — an empty slot is not a missing-SPF problem.
    if (slot !== 'am') return null;
    if (products.length === 0) return null;
    if (products.some(isSunscreen)) return null;

    return {
      key: `${rule.id}:${slot}`,
      ruleId: rule.id,
      slot,
      severity: rule.severity,
      evidence: rule.evidence_strength,
      products: [],
      rule,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const SLOT_ORDER: Record<Slot | 'all', number> = { am: 0, pm: 1, all: 2 };

export function findConflicts(shelf: ShelfProduct[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const slots: Slot[] = ['am', 'pm'];

  for (const slot of slots) {
    const productsInSlot = shelf.filter((p) => inSlot(p, slot));

    for (const entry of PAIR_INDEX) {
      // A rule that is NOT same-slot-only is evaluated once against the whole
      // shelf below, rather than per slot.
      if (!entry.rule.same_slot_only) continue;
      const finding = evaluatePairRule(entry, productsInSlot, slot);
      if (finding) findings.push(finding);
    }

    for (const rule of FILE.derived_rules) {
      const finding = evaluateDerivedRule(rule, productsInSlot, slot);
      if (finding) findings.push(finding);
    }
  }

  // Cross-slot pair rules: both sides anywhere on the shelf. No rule in the
  // current file uses this, but the field exists so the engine honours it.
  for (const entry of PAIR_INDEX) {
    if (entry.rule.same_slot_only) continue;
    const finding = evaluatePairRule(entry, shelf, 'all');
    if (finding) findings.push(finding);
  }

  return findings.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot];
  });
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function resolveFinding(
  finding: ConflictFinding,
  language: Language
): ResolvedFinding {
  const rule = finding.rule;
  const tr = language === 'tr';

  return {
    key: finding.key,
    slot: finding.slot,
    severity: finding.severity,
    evidence: finding.evidence,
    severityLabel: FILE.severity_badges[finding.severity][language],
    evidenceLabel: FILE.evidence_badges[finding.evidence][language],
    title: tr ? rule.title_tr : rule.title_en,
    explanation: tr ? rule.explanation_tr : rule.explanation_en,
    recommendation: tr ? rule.recommendation_tr : rule.recommendation_en,
    products: finding.products,
    sources: rule.sources.map((source) => ({
      label: tr ? source.label_tr : source.label_en,
      url: source.url,
    })),
  };
}

export function clearMessage(language: Language): string {
  return FILE.clear_message[language];
}

export function conflictDisclaimer(language: Language): string {
  return FILE.disclaimer[language];
}
