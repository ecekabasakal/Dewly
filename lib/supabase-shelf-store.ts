import { supabase } from './supabase';
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

  if (error) throw new Error(`Couldn't resolve ingredients: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.inci_name, row.id]));
}

async function namesForIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, inci_name')
    .in('id', ids);

  if (error) throw new Error(`Couldn't resolve ingredients: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.id, row.inci_name]));
}

export function createSupabaseShelfStore(userId: string): ShelfStore {
  return {
    async load() {
      const { data, error } = await supabase
        .from('user_shelf')
        .select('product_id, added_at, time_of_day, products(*)')
        .eq('user_id', userId);

      if (error) throw new Error(`Couldn't load your shelf: ${error.message}`);

      const rows = (data ?? []) as unknown as {
        product_id: string;
        added_at: string;
        time_of_day: ProductTimeOfDay;
        products: {
          id: string;
          name: string;
          brand: string | null;
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
        const { error: productError } = await supabase.from('products').upsert(
          products.map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            step_type: p.stepType,
            ingredient_ids: p.ingredientNames
              .map((name) => ids.get(name))
              .filter((id): id is string => id !== undefined),
            source: 'manual',
            created_by: userId,
          })),
          { onConflict: 'id' }
        );
        if (productError) {
          throw new Error(`Couldn't save your products: ${productError.message}`);
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
          throw new Error(`Couldn't save your shelf: ${shelfError.message}`);
        }
      }

      const keep = products.map((p) => p.id);
      const remove = supabase.from('user_shelf').delete().eq('user_id', userId);
      const { error: deleteError } = await (keep.length > 0
        ? remove.not('product_id', 'in', `(${keep.join(',')})`)
        : remove);

      if (deleteError) {
        throw new Error(`Couldn't update your shelf: ${deleteError.message}`);
      }
    },

    async clear() {
      const { error } = await supabase.from('user_shelf').delete().eq('user_id', userId);
      if (error) throw new Error(`Couldn't clear your shelf: ${error.message}`);
    },
  };
}
