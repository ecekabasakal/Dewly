import { STEP_ORDER, type StepType } from './db';

export { STEP_ORDER, type StepType };

/**
 * When a product is used.
 *
 * The database's `time_of_day` enum is `am | pm` because it lives on a
 * *routine* row. On a shelf *product* the honest answer is often "both", so
 * this adds that third value. A `both` product simply appears in each routine;
 * when Phase 8 syncs, it becomes two `routine_steps` rows.
 */
export const TIME_OF_DAY_OPTIONS = ['am', 'pm', 'both'] as const;
export type ProductTimeOfDay = (typeof TIME_OF_DAY_OPTIONS)[number];

export type ShelfProduct = {
  id: string;
  name: string;
  brand: string | null;
  stepType: StepType;
  timeOfDay: ProductTimeOfDay;
  /**
   * Canonical INCI names, present when the product was added from an analysis.
   * Feeds the step guess, and gives Phase 7's conflict engine what it needs
   * without another lookup.
   */
  ingredientNames: string[];
  addedAt: string;
};

export const SHELF_VERSION = 1;

/** What is persisted — versioned so a shape change can be migrated later. */
export type ShelfSnapshot = {
  version: number;
  products: ShelfProduct[];
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const STEP_LABELS: Record<StepType, string> = {
  oil_cleanser: 'Oil cleanser',
  water_cleanser: 'Water cleanser',
  exfoliant: 'Exfoliant',
  toner: 'Toner',
  essence: 'Essence',
  serum: 'Serum',
  eye_cream: 'Eye cream',
  moisturizer: 'Moisturizer',
  face_oil: 'Face oil',
  spf: 'SPF',
};

export const TIME_OF_DAY_LABELS: Record<ProductTimeOfDay, string> = {
  am: 'AM',
  pm: 'PM',
  both: 'AM + PM',
};

/** Position in the canonical routine order. Lower runs first. */
export function stepRank(step: StepType): number {
  return STEP_ORDER.indexOf(step);
}

export function newProductId(): string {
  // Good enough for a device-local list; Phase 8 will use the DB's uuid.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
