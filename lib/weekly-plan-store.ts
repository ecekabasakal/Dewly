import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WEEKDAYS,
  WEEKLY_PLAN_VERSION,
  type PlanDay,
  type Weekday,
  type WeeklyPlan,
} from '../types/week';

/**
 * Persistence boundary for the weekly plan — same shape as `ShelfStore` and
 * `ProfileStore`, for the same reason.
 *
 * `useWeeklyPlan` talks to this interface and never to AsyncStorage or Supabase
 * directly, so the signed-out and signed-in cases are one code path with two
 * implementations injected, and `guardStore` can wrap either.
 */
export interface WeeklyPlanStore {
  /** Null means "no plan yet", which is different from an empty plan. */
  load(): Promise<WeeklyPlan | null>;
  save(plan: WeeklyPlan): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'dewly.weeklyPlan.v1';

/**
 * Narrow unknown JSON back to a plan.
 *
 * Storage is untrusted. A version mismatch discards the whole snapshot rather
 * than migrating it — the plan is cheap to regenerate and a half-understood
 * plan is worse than an honest "none yet". Within a valid snapshot, unknown
 * days and non-string ids are dropped individually so one bad entry cannot cost
 * the user their week.
 */
export function parsePlan(raw: string): WeeklyPlan | null {
  try {
    const value = JSON.parse(raw) as Partial<WeeklyPlan> | null;
    if (!value || typeof value !== 'object') return null;
    if (value.version !== WEEKLY_PLAN_VERSION) return null;
    if (!value.days || typeof value.days !== 'object') return null;

    const days = {} as Record<Weekday, PlanDay>;
    for (const day of WEEKDAYS) {
      const stored = (value.days as Record<string, unknown>)[day] as
        | Partial<PlanDay>
        | undefined;
      days[day] = {
        am: Array.isArray(stored?.am) ? stored!.am.filter(isId) : [],
        pm: Array.isArray(stored?.pm) ? stored!.pm.filter(isId) : [],
      };
    }

    return {
      version: WEEKLY_PLAN_VERSION,
      days,
      source: value.source === 'suggested' ? 'suggested' : 'manual',
      updatedAt:
        typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export const asyncStorageWeeklyPlanStore: WeeklyPlanStore = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? parsePlan(raw) : null;
  },

  async save(plan) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
