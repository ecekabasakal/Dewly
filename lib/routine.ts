/**
 * Derives the AM and PM routines from the shelf.
 *
 * The routine is NOT stored. It is a pure function of the shelf, so persisting
 * the shelf persists the routine — and there is no second copy of the same
 * information that can drift out of sync when a product is edited or removed.
 * (The `routines` / `routine_steps` tables in `db/schema.sql` exist for Phase 8,
 * where a user can name and hand-reorder multiple routines. That is a different,
 * genuinely stateful feature.)
 */

import {
  STEP_ORDER,
  stepRank,
  type ProductTimeOfDay,
  type ShelfProduct,
  type StepType,
} from '../types/shelf';
import { isAmOnlyStep } from './step-guess';

export type RoutineSlot = 'am' | 'pm';

export type RoutineEntry = {
  product: ShelfProduct;
  /** 1-based position shown in the UI. */
  position: number;
  /** True when this product is in a slot it shouldn't be (SPF at night). */
  misplaced: boolean;
};

export type Routine = {
  slot: RoutineSlot;
  entries: RoutineEntry[];
  /** Steps with nothing in them — drives the "what's missing" hint. */
  missingSteps: StepType[];
  warnings: RoutineWarning[];
};

export type RoutineWarning =
  | { kind: 'spf-in-pm'; productNames: string[] }
  | { kind: 'no-spf-in-am' };

function appliesTo(timeOfDay: ProductTimeOfDay, slot: RoutineSlot): boolean {
  return timeOfDay === 'both' || timeOfDay === slot;
}

export function buildRoutine(products: ShelfProduct[], slot: RoutineSlot): Routine {
  const inSlot = products.filter((product) => appliesTo(product.timeOfDay, slot));

  // Canonical K-beauty order comes from STEP_ORDER, which mirrors the
  // `step_type` enum's declaration order in db/schema.sql. Ties (two serums)
  // keep insertion order so the user's own sequencing is preserved.
  const ordered = [...inSlot].sort((a, b) => {
    const byStep = stepRank(a.stepType) - stepRank(b.stepType);
    if (byStep !== 0) return byStep;
    return a.addedAt.localeCompare(b.addedAt);
  });

  const entries: RoutineEntry[] = ordered.map((product, index) => ({
    product,
    position: index + 1,
    misplaced: slot === 'pm' && isAmOnlyStep(product.stepType),
  }));

  const present = new Set(ordered.map((product) => product.stepType));
  const missingSteps = STEP_ORDER.filter((step) => {
    if (present.has(step)) return false;
    // SPF is never "missing" at night.
    if (slot === 'pm' && isAmOnlyStep(step)) return false;
    return true;
  });

  const warnings: RoutineWarning[] = [];

  const misplaced = entries.filter((entry) => entry.misplaced);
  if (misplaced.length > 0) {
    warnings.push({
      kind: 'spf-in-pm',
      productNames: misplaced.map((entry) => entry.product.name),
    });
  }

  // Only worth saying once the user has actually built a morning routine.
  if (slot === 'am' && ordered.length > 0 && !present.has('spf')) {
    warnings.push({ kind: 'no-spf-in-am' });
  }

  return { slot, entries, missingSteps, warnings };
}

/** Groups the shelf by step, in canonical order, skipping empty steps. */
export function groupByStep(
  products: ShelfProduct[]
): { step: StepType; products: ShelfProduct[] }[] {
  return STEP_ORDER.map((step) => ({
    step,
    products: products
      .filter((product) => product.stepType === step)
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
  })).filter((group) => group.products.length > 0);
}
