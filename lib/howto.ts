/**
 * "How to use" guidance for a product — two layers, combined here.
 *
 * ## The two layers, and why they are separate
 *
 * **Static** is per STEP TYPE and never varies: an oil cleanser is massaged
 * onto dry skin and emulsified whoever owns it. That copy is curation, so it
 * lives in `data/howto_steps.json` bundled beside `conflict_rules.json` and
 * `timing_rules.json` — same pattern, offline, no query, and an editor can
 * reword it without a migration.
 *
 * **Dynamic** is per PRODUCT and per SHELF: when to use it, and what not to
 * pair it with. That is not curation and must never be written by hand, because
 * it depends on what else the user owns. It comes from the two engines that
 * already exist — `suggestTiming` over `timing_rules.json`, and `findConflicts`
 * over `conflict_rules.json` — and nothing is re-implemented here. This module
 * only asks them about one product and hands back what they said.
 *
 * The split matters for honesty as much as for architecture: the static half is
 * general advice and carries the file's own disclaimer, while the dynamic half
 * keeps the evidence grade and the citations the engines attach to it. A
 * sentence about photosensitivity that traces to a source and a sentence about
 * rinsing with lukewarm water should not look equally authoritative.
 */

import howtoFile from '../data/howto_steps.json';
import {
  findConflicts,
  resolveFinding,
  type ResolvedFinding,
} from './conflicts';
import type { Language } from './language';
import { resolveRule, suggestTiming, type ResolvedRule } from './timing';
import type { ShelfProduct, StepType } from '../types/shelf';

type RawStep = {
  apply_long_en: string;
  apply_long_tr: string;
  apply_short_en: string;
  apply_short_tr: string;
};

type RawFile = {
  disclaimer_en: string;
  disclaimer_tr: string;
  steps: Record<string, RawStep>;
};

const FILE = howtoFile as unknown as RawFile;

/**
 * Which of the two static lengths to read out of the file.
 *
 * Both are now fetched for every product and shown in the same place — the
 * short line by default, the long one when the reader asks for it — so this is
 * an argument to the lookup rather than a mode a screen picks. See
 * `components/HowToApply`.
 */
export type HowToDetail = 'long' | 'short';

/** The static per-step copy, or null for a step the file does not cover. */
export function applyCopy(
  step: StepType,
  language: Language,
  detail: HowToDetail
): string | null {
  const entry = FILE.steps[step];
  if (!entry) return null;

  if (detail === 'long') {
    return language === 'tr' ? entry.apply_long_tr : entry.apply_long_en;
  }
  return language === 'tr' ? entry.apply_short_tr : entry.apply_short_en;
}

export function howtoDisclaimer(language: Language): string {
  return language === 'tr' ? FILE.disclaimer_tr : FILE.disclaimer_en;
}

/** The subset of a product the guidance actually needs. */
export type HowToProduct = Pick<
  ShelfProduct,
  'id' | 'name' | 'stepType' | 'timeOfDay' | 'ingredientNames'
>;

export type HowToGuidance = {
  /**
   * Static, from the step type. Null when the step has no entry.
   *
   * BOTH lengths, because both are shown in one place: `applyShort` is what a
   * step card carries by default, and `applyLong` takes its slot when the
   * reader expands the block. Returning both here rather than making the
   * caller choose is what keeps the two screens from drifting into different
   * amounts of advice about the same bottle.
   */
  applyShort: string | null;
  applyLong: string | null;
  /**
   * Dynamic. Null when no timing rule fires — most products genuinely work at
   * either end of the day, and inventing a suggestion for them would be noise.
   */
  timing: { time: 'am' | 'pm'; rule: ResolvedRule } | null;
  /** Dynamic. Every finding on the shelf that names THIS product. */
  conflicts: ResolvedFinding[];
};

/**
 * Everything to show about one product, in one language.
 *
 * `shelf` is the context the dynamic half needs. If the product is not already
 * in it — the add form, where nothing is saved yet — it is appended, so the
 * screen can answer "what would this clash with if I added it" before the user
 * commits. That is the same question the Routine screen answers after the fact,
 * asked one step earlier.
 *
 * Findings with no products attached are excluded by construction rather than
 * by a special case: `am_without_spf` fires about a whole morning routine and
 * carries an empty product list, so no product's id can match it. It belongs on
 * the Routine screen's conflict section, which shows every finding, not on an
 * individual step.
 */
export function howToFor(
  product: HowToProduct,
  shelf: ShelfProduct[],
  language: Language
): HowToGuidance {
  const timingMatch = suggestTiming(product.name, product.ingredientNames);
  // `suggestTiming` returns `both` with a null rule when nothing fires. A
  // suggestion is only worth showing when a rule stands behind it.
  const timing =
    timingMatch.rule && timingMatch.time !== 'both'
      ? {
          time: timingMatch.time,
          rule: resolveRule(timingMatch.rule, language),
        }
      : null;

  const context = shelf.some((p) => p.id === product.id)
    ? shelf
    : [...shelf, product as ShelfProduct];

  const conflicts = findConflicts(context)
    .filter((finding) => finding.products.some((p) => p.id === product.id))
    .map((finding) => resolveFinding(finding, language));

  return {
    applyShort: applyCopy(product.stepType, language, 'short'),
    applyLong: applyCopy(product.stepType, language, 'long'),
    timing,
    conflicts,
  };
}

/** True when there is nothing to render, so a caller can skip the block. */
export function isEmptyGuidance(guidance: HowToGuidance): boolean {
  return (
    guidance.applyShort === null &&
    guidance.applyLong === null &&
    guidance.timing === null &&
    guidance.conflicts.length === 0
  );
}
