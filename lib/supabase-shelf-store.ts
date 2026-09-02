import { supabase } from './supabase';
import { AppError } from './errors';
import type { ShelfStore } from './shelf-store';
import type { ProductTimeOfDay, ShelfProduct, StepType } from '../types/shelf';

/**
 * Supabase-backed shelf storage.
 *
 * The shelf spans two tables, matching the schema's intent:
 *   - `products`   — the shared catalogue (name, brand, step, ingredients)
 *   - `user_shelf` — who owns it and WHEN they use it (`time_of_day`)
 *
 * `time_of_day` lives on the join row, not on the product: the bottle is
 * shared, but "I use this in the morning" is personal to one user.
 *
 * Routines are NOT stored. They stay a pure function of the shelf
 * (`lib/routine.ts`), so syncing the shelf syncs the routine and there is no
 * second copy that can drift. The `routines` / `routine_steps` tables remain
 * reserved for named, hand-reordered routines.
 */

/** Maps canonical INCI names to `ingredients.id`, for `products.ingredient_ids`. */
async function idsForNames(names: string[]): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, inci_name')
    .in('inci_name', names);

  if (error) throw new AppError('load-failed', `resolve ingredients: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.inci_name, row.id]));
}

async function namesForIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, inci_name')
    .in('id', ids);

  if (error) throw new AppError('load-failed', `resolve ingredients: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.id, row.inci_name]));
}

/**
 * Of the given product ids, the ones this user may write.
 *
 * A row that does not exist yet counts as writable — the insert half of the
 * upsert will create it and set `created_by`.
 */
async function ownedProductIds(ids: string[], userId: string): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const { data, error } = await supabase
    .from('products')
    .select('id, created_by')
    .in('id', ids);

  if (error) throw new AppError('load-failed', `check product ownership: ${error.message}`);

  const foreign = new Set(
    (data ?? []).filter((row) => row.created_by !== userId).map((row) => row.id)
  );
  return new Set(ids.filter((id) => !foreign.has(id)));
}

/**
 * The catalogue id for a barcode, if some user has already added that product.
 *
 * Called before creating a shelf entry from Open Beauty Facts so both users end
 * up pointing at one `products` row. Without it the second user's insert would
 * hit `products.barcode`'s unique constraint with a freshly generated id and
 * the save would fail outright.
 *
 * Returns null on a read failure as well as on a miss. That is deliberate: the
 * worst case is a duplicate-key error on save, which is recoverable and
 * reported, whereas blocking the add on a catalogue lookup would make an
 * optional optimisation load-bearing.
 */
export async function findCatalogueIdByBarcode(barcode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

export function createSupabaseShelfStore(userId: string): ShelfStore {
  return {
    async load() {
      const { data, error } = await supabase
        .from('user_shelf')
        .select('product_id, added_at, time_of_day, products(*)')
        .eq('user_id', userId);

      if (error) throw new AppError('load-failed', `load shelf: ${error.message}`);

      const rows = (data ?? []) as unknown as {
        product_id: string;
        added_at: string;
        time_of_day: ProductTimeOfDay;
        products: {
          id: string;
          name: string;
          brand: string | null;
          barcode: string | null;
          step_type: StepType | null;
          ingredient_ids: string[];
        } | null;
      }[];

      // Resolve every ingredient id across the whole shelf in ONE query rather
      // than one per product.
      const allIds = [...new Set(rows.flatMap((r) => r.products?.ingredient_ids ?? []))];
      const names = await namesForIds(allIds);

      return rows
        .filter((row) => row.products !== null)
        .map((row) => {
          const p = row.products!;
          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            // A shelf entry always has a step in our model; fall back rather
            // than dropping a product because the column is nullable in SQL.
            stepType: p.step_type ?? 'serum',
            timeOfDay: row.time_of_day,
            barcode: p.barcode,
            ingredientNames: p.ingredient_ids
              .map((id) => names.get(id))
              .filter((n): n is string => n !== undefined),
            addedAt: row.added_at,
          } satisfies ShelfProduct;
        })
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    },

    /**
     * Replaces the user's whole shelf.
     *
     * `ShelfStore.save` takes the full array, so this mirrors that: upsert
     * every product and membership row, then delete memberships that are no
     * longer present. Deleting only the join rows — never `products` — because
     * the catalogue is shared and another user may own the same bottle.
     */
    async save(products) {
      const allNames = [...new Set(products.flatMap((p) => p.ingredientNames))];
      const ids = await idsForNames(allNames);

      if (products.length > 0) {
        // `products` is a SHARED catalogue, and Open Beauty Facts makes that
        // real: two users adding the same bottle now land on the same row,
        // because the add flow reuses an existing `products.id` when the
        // barcode already exists (`findCatalogueIdByBarcode`).
        //
        // Rewriting a row somebody else created is both wrong and blocked —
        // the "users update own products" policy is scoped to `created_by =
        // auth.uid()`, so the UPDATE half of an upsert against a foreign row
        // fails at the RLS layer and takes the whole save with it. Skip those
        // rows: the catalogue entry is already there, and all this user needs
        // is the `user_shelf` membership written below.
        const owned = await ownedProductIds(
          products.map((p) => p.id),
          userId
        );
        const writable = products.filter((p) => owned.has(p.id));

        if (writable.length > 0) {
          const { error: productError } = await supabase.from('products').upsert(
            writable.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              barcode: p.barcode ?? null,
              step_type: p.stepType,
              ingredient_ids: p.ingredientNames
                .map((name) => ids.get(name))
                .filter((id): id is string => id !== undefined),
              // Derived rather than stored on the client: a barcode is only
              // ever set by the Open Beauty Facts flow.
              source: p.barcode ? 'open_beauty_facts' : 'manual',
              created_by: userId,
            })),
            { onConflict: 'id' }
          );
          if (productError) {
            throw new AppError('save-failed', `save products: ${productError.message}`);
          }
        }

        const { error: shelfError } = await supabase.from('user_shelf').upsert(
          products.map((p) => ({
            user_id: userId,
            product_id: p.id,
            added_at: p.addedAt,
            time_of_day: p.timeOfDay,
          })),
          { onConflict: 'user_id,product_id' }
        );
        if (shelfError) {
          throw new AppError('save-failed', `save shelf: ${shelfError.message}`);
        }
      }

      const keep = products.map((p) => p.id);
      const remove = supabase.from('user_shelf').delete().eq('user_id', userId);
      const { error: deleteError } = await (keep.length > 0
        ? remove.not('product_id', 'in', `(${keep.join(',')})`)
        : remove);

      if (deleteError) {
        throw new AppError('save-failed', `prune shelf: ${deleteError.message}`);
      }
    },

    async clear() {
      const { error } = await supabase.from('user_shelf').delete().eq('user_id', userId);
      if (error) throw new AppError('save-failed', `clear shelf: ${error.message}`);
    },
  };
}
