/**
 * The weekly plan generator.
 *
 * ## What this module does NOT do
 *
 * It contains no dermatology. Every decision traces to one of the two engines
 * that already exist and to the source-backed rule files behind them:
 *
 *   - WHEN a product goes  -> `suggestTiming` over `data/timing_rules.json`
 *   - WHAT cannot share a night -> `findConflicts` over `data/conflict_rules.json`
 *
 * There is no synergy model here, no "these work well together", no ordering
 * beyond the canonical step order the shelf already carries. This is layer #2:
 * distribution and timing only. A claim this file cannot trace to a rule file
 * is a claim it does not make.
 *
 * ## The one primitive everything is built on
 *
 * `clashes(a, b, slot)` asks the CONFLICT ENGINE whether two products may share
 * an evening, by handing it a two-product shelf with both forced into that slot
 * and seeing whether it objects. That is the whole incompatibility model —
 * retinoid + acid, retinoid + benzoyl peroxide and the two-exfoliant
 * over-exfoliation rule all fall out of it without being named here. A rule
 * added to the JSON file changes the plan with no edit to this file.
 */

import { findConflicts } from './conflicts';
import { suggestTiming } from './timing';
import type { ShelfProduct, StepType } from '../types/shelf';
import { stepRank } from '../types/shelf';
import {
  emptyPlan,
  WEEKDAYS,
  type PlanSlot,
  type Weekday,
  type WeeklyPlan,
} from '../types/week';

/**
 * Evenings that may carry a restricted product, in the order they are filled.
 *
 * Alternating first — Mon, Wed, Fri, Sun — so the first four actives land with
 * a clear night between them. That is requirement 3's "rest nights" expressed
 * as an ordering rather than as a rule the generator has to check afterwards:
 * fill in this order and the gaps exist by construction.
 *
 * The remaining three are the overflow, used only when a shelf has more actives
 * than the spaced nights can hold. A dense week is still better than dropping a
 * product the user owns off the plan entirely.
 */
const NIGHT_PRIORITY: Weekday[] = ['mon', 'wed', 'fri', 'sun', 'tue', 'thu', 'sat'];

/**
 * How many nights a week one restricted product is scheduled.
 *
 * Two, not "as many as fit". The cap is the whole point of requirement 3 — a
 * retinoid every night is the over-use pattern the conflict file's
 * `over-exfoliation-load` rule exists to warn about, and a generator that
 * produced it would be arguing with the engine it is built on.
 */
const NIGHTS_PER_RESTRICTED = 2;

/** Forces a product into one slot, for a hypothetical the engine can evaluate. */
function inSlot(product: ShelfProduct, slot: PlanSlot): ShelfProduct {
  return { ...product, timeOfDay: slot };
}

/**
 * Would these two products conflict if used in the same slot on the same day?
 *
 * Asks the real engine rather than pattern-matching step types here. Findings
 * that name only one of the pair are ignored — `am_without_spf` fires on a
 * one-product morning and is about the routine, not about this pair.
 */
export function clashes(a: ShelfProduct, b: ShelfProduct, slot: PlanSlot): boolean {
  if (a.id === b.id) return false;

  const pair = [inSlot(a, slot), inSlot(b, slot)];
  return findConflicts(pair).some((finding) => {
    const ids = new Set(finding.products.map((p) => p.id));
    return ids.has(a.id) && ids.has(b.id);
  });
}

/**
 * The slot a product belongs in.
 *
 * The timing engine wins when a rule fires — that is the source-backed answer,
 * and it is what puts retinoids and acids at night and vitamin C and SPF in the
 * morning without this file naming any of them. Otherwise the user's own
 * `timeOfDay` stands, because they set it and nothing here knows better.
 *
 * `both` means both slots, which is how a cleanser or a moisturiser ends up in
 * the morning AND the evening.
 */
export function slotsFor(product: ShelfProduct): PlanSlot[] {
  const suggestion = suggestTiming(product.name, product.ingredientNames);
  const time = suggestion.rule ? suggestion.time : product.timeOfDay;

  if (time === 'both') return ['am', 'pm'];
  return [time];
}

/**
 * Products that cannot be used freely — the ones needing distribution.
 *
 * Derived, never declared: a product is restricted when the conflict engine
 * objects to it sharing a slot with at least one other product on this shelf.
 * That set is exactly the set that needs spacing, and it is empty for a shelf
 * of cleansers and moisturisers, which is the correct answer for such a shelf.
 */
export function restrictedIds(shelf: ShelfProduct[]): Set<string> {
  const restricted = new Set<string>();

  for (const a of shelf) {
    for (const b of shelf) {
      if (a.id === b.id) continue;
      for (const slot of slotsFor(a)) {
        if (!slotsFor(b).includes(slot)) continue;
        if (clashes(a, b, slot)) {
          restricted.add(a.id);
          restricted.add(b.id);
        }
      }
    }
  }

  return restricted;
}

export type PlanGeneration = {
  plan: WeeklyPlan;
  /**
   * Products the generator could not place without creating a conflict.
   *
   * Reported rather than forced in. A generator that quietly produced the clash
   * it exists to prevent would be worse than one that says it ran out of room.
   */
  unplaced: string[];
};

/**
 * Builds a 7-day plan from the shelf.
 *
 * Three passes, in this order:
 *
 *   1. **Everyday products** — everything the conflict engine has no objection
 *      to — go into every day, in each slot `slotsFor` gives them. A cleanser
 *      is a cleanser on Tuesday.
 *   2. **Restricted products** get `NIGHTS_PER_RESTRICTED` days each, taken
 *      from `NIGHT_PRIORITY` so the spacing is built in. A day is only offered
 *      if the product clashes with nothing already scheduled there — checked
 *      with the same `clashes` primitive, so the guarantee is the engine's, not
 *      this function's.
 *   3. Anything that found no day is returned in `unplaced`.
 *
 * Deterministic: the same shelf always produces the same plan, so it is
 * testable and the user is not shown a different suggestion each time they tap.
 */
export function generateWeeklyPlan(shelf: ShelfProduct[]): PlanGeneration {
  const plan = emptyPlan('suggested');
  const restricted = restrictedIds(shelf);
  const byId = new Map(shelf.map((product) => [product.id, product]));

  // Pass 1 — the everyday layer.
  for (const product of shelf) {
    if (restricted.has(product.id)) continue;
    for (const slot of slotsFor(product)) {
      for (const day of WEEKDAYS) plan.days[day][slot].push(product.id);
    }
  }

  // Pass 2 — distribute what cannot be used freely.
  //
  // Most-constrained first: a product that clashes with three others has fewer
  // viable nights than one that clashes with a single product, and placing the
  // flexible one first is how a greedy pass paints itself into a corner.
  const queue = shelf
    .filter((product) => restricted.has(product.id))
    .map((product) => ({
      product,
      degree: shelf.filter((other) =>
        slotsFor(product).some(
          (slot) => slotsFor(other).includes(slot) && clashes(product, other, slot)
        )
      ).length,
    }))
    .sort(
      (a, b) =>
        b.degree - a.degree ||
        stepRank(a.product.stepType) - stepRank(b.product.stepType) ||
        a.product.addedAt.localeCompare(b.product.addedAt)
    )
    .map((entry) => entry.product);

  const unplaced: string[] = [];

  for (const product of queue) {
    let placed = 0;

    for (const slot of slotsFor(product)) {
      for (const day of NIGHT_PRIORITY) {
        if (placed >= NIGHTS_PER_RESTRICTED) break;

        const already = plan.days[day][slot];
        if (already.includes(product.id)) continue;

        const conflicted = already.some((id) => {
          const other = byId.get(id);
          return other ? clashes(product, other, slot) : false;
        });
        if (conflicted) continue;

        already.push(product.id);
        placed += 1;
      }
    }

    if (placed === 0) unplaced.push(product.id);
  }

  // Pass 3 — canonical step order inside every cell, so a day reads the way the
  // Routine screen reads. Sorting once here means no screen has to.
  for (const day of WEEKDAYS) {
    for (const slot of ['am', 'pm'] as const) {
      plan.days[day][slot].sort((left, right) => {
        const a = byId.get(left);
        const b = byId.get(right);
        if (!a || !b) return 0;
        return (
          stepRank(a.stepType) - stepRank(b.stepType) ||
          a.addedAt.localeCompare(b.addedAt)
        );
      });
    }
  }

  return { plan, unplaced };
}

// ---------------------------------------------------------------------------
// Reading a plan back
// ---------------------------------------------------------------------------

/**
 * The products scheduled for one day and slot, resolved against the shelf.
 *
 * Ids that no longer resolve are dropped rather than rendered as a gap: a
 * product removed from the shelf leaves a stale id in the plan, and the plan is
 * not rewritten on every shelf edit. Filtering at read time is what keeps a
 * deleted product from breaking the Weekly and Today screens.
 */
export function productsFor(
  plan: WeeklyPlan,
  shelf: ShelfProduct[],
  day: Weekday,
  slot: PlanSlot
): ShelfProduct[] {
  const byId = new Map(shelf.map((product) => [product.id, product]));
  return plan.days[day][slot]
    .map((id) => byId.get(id))
    .filter((product): product is ShelfProduct => product !== undefined);
}

/**
 * Moves a product to a different day and slot.
 *
 * Pure — returns a new plan and marks it `manual`, because any hand edit means
 * the plan is no longer the generator's suggestion and "Suggest a plan" should
 * warn before replacing it.
 */
export function moveProduct(
  plan: WeeklyPlan,
  productId: string,
  to: { day: Weekday; slot: PlanSlot },
  from?: { day: Weekday; slot: PlanSlot }
): WeeklyPlan {
  const next = structuredClone(plan);

  if (from) {
    next.days[from.day][from.slot] = next.days[from.day][from.slot].filter(
      (id) => id !== productId
    );
  }

  const target = next.days[to.day][to.slot];
  if (!target.includes(productId)) target.push(productId);

  next.source = 'manual';
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Removes a product from one cell. Also marks the plan manual. */
export function removeFromCell(
  plan: WeeklyPlan,
  productId: string,
  cell: { day: Weekday; slot: PlanSlot }
): WeeklyPlan {
  const next = structuredClone(plan);
  next.days[cell.day][cell.slot] = next.days[cell.day][cell.slot].filter(
    (id) => id !== productId
  );
  next.source = 'manual';
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Drops every reference to a product. Called when it leaves the shelf.
 *
 * Kept separate from `removeFromCell` because this is housekeeping rather than
 * a user decision — it must NOT flip `source` to manual.
 */
export function forgetProduct(plan: WeeklyPlan, productId: string): WeeklyPlan {
  const next = structuredClone(plan);
  for (const day of WEEKDAYS) {
    for (const slot of ['am', 'pm'] as const) {
      next.days[day][slot] = next.days[day][slot].filter((id) => id !== productId);
    }
  }
  return next;
}

/**
 * The conflict findings for one cell of the calendar.
 *
 * The SAME engine and the same resolved findings the Routine screen's conflict
 * cards render, run over just the products the user put on that evening. This
 * is what makes a hand edit honest: move a retinoid onto an acid night and the
 * warning that appears is the one from `conflict_rules.json`, with its severity,
 * its evidence grade and its citations — not a second, softer message written
 * for the planner.
 */
export function cellConflicts(products: ShelfProduct[], slot: PlanSlot) {
  if (products.length < 2) return [];
  return findConflicts(products.map((product) => inSlot(product, slot))).filter(
    // Routine-level findings (`am_without_spf`) carry no products and are not
    // about this cell's pairing.
    (finding) => finding.products.length > 0
  );
}

/** Step types that never belong in the evening, for the move UI's guard rails. */
export function isAmOnly(step: StepType): boolean {
  return step === 'spf';
}
