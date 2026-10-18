import type { Language } from '../lib/language';

/**
 * The weekly plan's shape.
 *
 * ## Why a plan is STORED when a routine is not
 *
 * `lib/routine.ts` derives the daily routine from the shelf and stores nothing,
 * deliberately — there is no second copy to drift. A weekly plan is different
 * in kind: "retinol on Monday and Thursday" is a CHOICE, not a consequence of
 * the shelf. Two users with identical shelves can hold different plans, and the
 * generator's output is a suggestion the user may edit or discard. That is
 * exactly the stateful, hand-orderable thing `routines` / `routine_steps` were
 * reserved for in `db/schema.sql`.
 */

/** ISO 8601 order: Monday first. Matches Postgres `isodow`. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const PLAN_SLOTS = ['am', 'pm'] as const;
export type PlanSlot = (typeof PLAN_SLOTS)[number];

/**
 * Day number as stored in `routine_steps.day_of_week`.
 *
 * ISO 1-7 with Monday = 1, NOT Postgres's `extract(dow)` which puts Sunday at
 * 0. Picked because the UI is Monday-first and an off-by-one between the two
 * conventions would silently shift a whole plan by a day.
 */
export function weekdayNumber(day: Weekday): number {
  return WEEKDAYS.indexOf(day) + 1;
}

export function weekdayFromNumber(value: number): Weekday | null {
  return WEEKDAYS[value - 1] ?? null;
}

/**
 * Today, as a `Weekday`.
 *
 * `getDay()` is 0-6 Sunday-first, so this is where that convention is converted
 * and nowhere else.
 */
export function todayWeekday(date: Date = new Date()): Weekday {
  const sundayFirst = date.getDay();
  return WEEKDAYS[(sundayFirst + 6) % 7]!;
}

/** Product ids assigned to one day, split by slot. */
export type PlanDay = Record<PlanSlot, string[]>;

export type WeeklyPlan = {
  version: number;
  days: Record<Weekday, PlanDay>;
  /**
   * Where the plan came from. Shown to the user so an auto-generated plan does
   * not masquerade as something they built, and so "Suggest a plan" can warn
   * before overwriting hand-made work.
   */
  source: 'suggested' | 'manual';
  updatedAt: string;
};

/** Bumped when the stored shape changes. A mismatch is discarded, not migrated. */
export const WEEKLY_PLAN_VERSION = 1;

export function emptyPlan(source: WeeklyPlan['source'] = 'manual'): WeeklyPlan {
  const days = {} as Record<Weekday, PlanDay>;
  for (const day of WEEKDAYS) days[day] = { am: [], pm: [] };

  return {
    version: WEEKLY_PLAN_VERSION,
    days,
    source,
    updatedAt: new Date().toISOString(),
  };
}

/** True when nothing is scheduled anywhere — the "no plan yet" signal. */
export function isEmptyPlan(plan: WeeklyPlan): boolean {
  return WEEKDAYS.every(
    (day) => plan.days[day].am.length === 0 && plan.days[day].pm.length === 0
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const WEEKDAY_LABELS: Record<Language, Record<Weekday, string>> = {
  en: {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  },
  tr: {
    mon: 'Pazartesi',
    tue: 'Salı',
    wed: 'Çarşamba',
    thu: 'Perşembe',
    fri: 'Cuma',
    sat: 'Cumartesi',
    sun: 'Pazar',
  },
};

/** Three-letter forms for the calendar column headers. */
export const WEEKDAY_SHORT: Record<Language, Record<Weekday, string>> = {
  en: { mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN' },
  tr: { mon: 'PZT', tue: 'SAL', wed: 'ÇAR', thu: 'PER', fri: 'CUM', sat: 'CMT', sun: 'PAZ' },
};

export const PLAN_SLOT_LABELS: Record<Language, Record<PlanSlot, string>> = {
  en: { am: 'Morning', pm: 'Evening' },
  tr: { am: 'Sabah', pm: 'Akşam' },
};
