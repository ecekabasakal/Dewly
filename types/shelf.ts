import type { Language } from '../lib/language';
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
  /**
   * EAN/GTIN, present only when the product came from Open Beauty Facts.
   *
   * Doubles as the "where did this come from" marker: `products.source` is
   * derived from it rather than stored separately on the client.
   */
  barcode?: string | null;
  addedAt: string;
};

/**
 * `barcode` is OPTIONAL on purpose, so `SHELF_VERSION` does not move.
 *
 * `parseShelf` discards the entire snapshot when the version does not match —
 * bumping it would wipe the local shelf of anyone upgrading. An added optional
 * field needs no migration: old rows simply read back as `undefined`. The same
 * rule made REMOVING `imageUrl` free: a stale snapshot still carrying one
 * parses fine, and nothing reads it.
 */
export const SHELF_VERSION = 1;

/** What is persisted — versioned so a shape change can be migrated later. */
export type ShelfSnapshot = {
  version: number;
  products: ShelfProduct[];
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

// Keyed by language first — see the note on the profile labels for why.

export const STEP_LABELS: Record<Language, Record<StepType, string>> = {
  en: {
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
  },
  tr: {
    oil_cleanser: 'Yağ bazlı temizleyici',
    water_cleanser: 'Su bazlı temizleyici',
    exfoliant: 'Peeling',
    toner: 'Tonik',
    essence: 'Esans',
    serum: 'Serum',
    eye_cream: 'Göz kremi',
    moisturizer: 'Nemlendirici',
    face_oil: 'Yüz yağı',
    spf: 'Güneş koruyucu',
  },
};

/**
 * AM/PM stay as-is in Turkish: they are read as clock abbreviations here, and
 * "ÖÖ / ÖS" would be less recognisable to a Turkish skincare reader than the
 * English pair everyone already sees on product packaging.
 */
export const TIME_OF_DAY_LABELS: Record<Language, Record<ProductTimeOfDay, string>> = {
  en: { am: 'AM', pm: 'PM', both: 'AM + PM' },
  tr: { am: 'AM', pm: 'PM', both: 'AM + PM' },
};

/** Position in the canonical routine order. Lower runs first. */
export function stepRank(step: StepType): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * A v4 UUID.
 *
 * Must be a real UUID since Phase 8: this id becomes `products.id`, which is a
 * Postgres `uuid` column, so the old base-36 string would be rejected on
 * insert. Generating it client-side (rather than letting the database default
 * fill it) keeps the local and remote rows identified the same way, which is
 * what makes the offline-first write path and the migration straightforward.
 *
 * `Math.random` is fine here — these are row identifiers, not secrets.
 */
export function newProductId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** True for ids created before Phase 8, which are not valid UUIDs. */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
