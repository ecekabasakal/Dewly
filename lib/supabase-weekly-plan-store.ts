import { supabase } from './supabase';
import { AppError } from './errors';
import type { WeeklyPlanStore } from './weekly-plan-store';
import {
  emptyPlan,
  WEEKDAYS,
  weekdayFromNumber,
  weekdayNumber,
  type PlanSlot,
  type WeeklyPlan,
} from '../types/week';
import type { StepType } from '../types/shelf';

/**
 * Supabase-backed weekly plan.
 *
 * ## The mapping onto `routines` / `routine_steps`
 *
 * These tables were reserved in `db/schema.sql` for exactly this — a named,
 * hand-orderable routine — and this is the feature that finally uses them.
 *
 *   `routines`      TWO rows per user: `('weekly', 'am')` and `('weekly', 'pm')`.
 *                   The slot lives here because `routines.time_of_day` already
 *                   exists and means precisely this.
 *   `routine_steps` one row per (product, day), with the new `day_of_week`
 *                   column carrying ISO 1-7, Monday = 1.
 *
 * Two routine rows rather than fourteen (one per day/slot) because the day is a
 * property of the STEP, not of the routine: "my evening routine" is one thing
 * that happens on several evenings. Fourteen rows would also mean fourteen
 * `routines` inserts on every save and a much noisier delete pass.
 *
 * `step_order` is the product's position within its own day and slot, so the
 * plan's canonical ordering survives a round trip.
 *
 * ## Why the whole plan is rewritten on save
 *
 * `WeeklyPlanStore.save` takes the entire plan, mirroring `ShelfStore`. Rather
 * than diffing, this deletes the user's steps and reinserts them inside one
 * logical save. A weekly plan is at most a few dozen rows, and a diff would
 * need to reason about a unique constraint on (routine, day, order) that a
 * partial update can transiently violate.
 */

const ROUTINE_NAME = 'weekly';

type RoutineRow = { id: string; time_of_day: PlanSlot };

/** Finds or creates the two routine rows this user's plan hangs off. */
async function ensureRoutines(userId: string): Promise<Record<PlanSlot, string>> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, time_of_day')
    .eq('user_id', userId)
    .eq('name', ROUTINE_NAME);

  if (error) throw new AppError('load-failed', `load routines: ${error.message}`);

  const existing = new Map(
    ((data ?? []) as RoutineRow[]).map((row) => [row.time_of_day, row.id])
  );
  const missing = (['am', 'pm'] as PlanSlot[]).filter((slot) => !existing.has(slot));

  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from('routines')
      .insert(
        missing.map((slot) => ({
          user_id: userId,
          name: ROUTINE_NAME,
          time_of_day: slot,
        }))
      )
      .select('id, time_of_day');

    if (insertError) {
      throw new AppError('save-failed', `create routine: ${insertError.message}`);
    }
    for (const row of (created ?? []) as RoutineRow[]) {
      existing.set(row.time_of_day, row.id);
    }
  }

  return { am: existing.get('am')!, pm: existing.get('pm')! };
}

export function createSupabaseWeeklyPlanStore(userId: string): WeeklyPlanStore {
  return {
    async load() {
      const { data: routines, error: routineError } = await supabase
        .from('routines')
        .select('id, time_of_day')
        .eq('user_id', userId)
        .eq('name', ROUTINE_NAME);

      if (routineError) {
        throw new AppError('load-failed', `load routines: ${routineError.message}`);
      }

      const rows = (routines ?? []) as RoutineRow[];
      // No routine rows at all means the user has never made a plan. That is
      // NOT an empty plan — the Weekly screen offers to generate one, and the
      // Routine screen falls back to its pre-planner behaviour.
      if (rows.length === 0) return null;

      const slotFor = new Map(rows.map((row) => [row.id, row.time_of_day]));

      const { data: steps, error: stepError } = await supabase
        .from('routine_steps')
        .select('routine_id, product_id, day_of_week, step_order')
        .in(
          'routine_id',
          rows.map((row) => row.id)
        )
        .order('step_order', { ascending: true });

      if (stepError) {
        throw new AppError('load-failed', `load routine steps: ${stepError.message}`);
      }

      const plan = emptyPlan('manual');
      let any = false;

      for (const step of (steps ?? []) as {
        routine_id: string;
        product_id: string;
        day_of_week: number;
        step_order: number;
      }[]) {
        const slot = slotFor.get(step.routine_id);
        const day = weekdayFromNumber(step.day_of_week);
        // A row with a day outside 1-7 cannot have come from this client. Drop
        // it rather than failing the load over one bad row.
        if (!slot || !day) continue;
        plan.days[day][slot].push(step.product_id);
        any = true;
      }

      // Rows existed but none were usable — still a plan, just an empty one the
      // user cleared. Returning null here would re-offer generation forever.
      if (!any) return plan;
      return plan;
    },

    async save(plan: WeeklyPlan) {
      const routineIds = await ensureRoutines(userId);

      const { error: deleteError } = await supabase
        .from('routine_steps')
        .delete()
        .in('routine_id', [routineIds.am, routineIds.pm]);

      if (deleteError) {
        throw new AppError('save-failed', `clear routine steps: ${deleteError.message}`);
      }

      // `step_type` is NOT NULL on the table and is documented as a snapshot
      // taken at insert time, so reordering never depends on the catalogue. The
      // plan holds ids only, so it is read back from `products` in one query
      // rather than one per step.
      const productIds = [
        ...new Set(
          WEEKDAYS.flatMap((day) => [...plan.days[day].am, ...plan.days[day].pm])
        ),
      ];

      if (productIds.length === 0) return;

      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, step_type')
        .in('id', productIds);

      if (productError) {
        throw new AppError('save-failed', `resolve products: ${productError.message}`);
      }

      const stepTypes = new Map(
        ((products ?? []) as { id: string; step_type: StepType | null }[]).map((row) => [
          row.id,
          row.step_type ?? 'serum',
        ])
      );

      const rows: {
        routine_id: string;
        product_id: string;
        day_of_week: number;
        step_order: number;
        step_type: StepType;
      }[] = [];

      for (const day of WEEKDAYS) {
        for (const slot of ['am', 'pm'] as PlanSlot[]) {
          plan.days[day][slot].forEach((productId, index) => {
            // A plan can outlive a product: an id no longer in the catalogue
            // would violate the foreign key and fail the whole save.
            if (!stepTypes.has(productId)) return;
            rows.push({
              routine_id: routineIds[slot],
              product_id: productId,
              day_of_week: weekdayNumber(day),
              step_order: index,
              step_type: stepTypes.get(productId)!,
            });
          });
        }
      }

      if (rows.length === 0) return;

      const { error: insertError } = await supabase.from('routine_steps').insert(rows);
      if (insertError) {
        throw new AppError('save-failed', `save routine steps: ${insertError.message}`);
      }
    },

    async clear() {
      // Deleting the routine rows cascades to their steps, and makes `load`
      // return null again — "no plan yet" rather than "an empty plan".
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('user_id', userId)
        .eq('name', ROUTINE_NAME);

      if (error) throw new AppError('save-failed', `clear plan: ${error.message}`);
    },
  };
}
