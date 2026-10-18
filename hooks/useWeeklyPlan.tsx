import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './useAuth';
import {
  asyncStorageWeeklyPlanStore,
  type WeeklyPlanStore,
} from '../lib/weekly-plan-store';
import { createSupabaseWeeklyPlanStore } from '../lib/supabase-weekly-plan-store';
import { emptyPlan, type WeeklyPlan } from '../types/week';

/**
 * Same three-state contract as `useShelf` / `useProfile`: `failed` is not an
 * empty plan. Collapsing them would let a dropped connection show "no plan yet"
 * over a plan that exists, and the next save would replace it with nothing.
 */
export type WeeklyPlanStatus = 'loading' | 'ready' | 'failed';

type WeeklyPlanContextValue = {
  /** Null means the user has never made a plan — the Routine screen's fallback. */
  plan: WeeklyPlan | null;
  status: WeeklyPlanStatus;
  reload: () => Promise<void>;
  /** Persists a plan and commits it to state. Rethrows so callers can report. */
  savePlan: (plan: WeeklyPlan) => Promise<void>;
  /** Drops the plan entirely, back to "none yet". */
  clearPlan: () => Promise<void>;
};

const WeeklyPlanContext = createContext<WeeklyPlanContextValue | null>(null);

export function WeeklyPlanProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Overrides the auth-derived store. Used by tests. */
  store?: WeeklyPlanStore;
}) {
  const { userId, isUserPending } = useAuth();

  /**
   * NOT wrapped in `guardStore`.
   *
   * That guard exists to stop a failed READ turning into a destructive write,
   * and it works by refusing saves until a load succeeded. Here the same
   * protection comes from `status`: the Weekly screen refuses to render an
   * editable calendar while the status is `failed`, so there is no path from a
   * failed read to a save. Wrapping would additionally block the legitimate
   * first-ever save, when there is genuinely nothing to load.
   */
  const activeStore = useMemo<WeeklyPlanStore>(
    () =>
      store ??
      (userId ? createSupabaseWeeklyPlanStore(userId) : asyncStorageWeeklyPlanStore),
    [store, userId]
  );

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [status, setStatus] = useState<WeeklyPlanStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    activeStore
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setPlan(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [activeStore, attempt]);

  // While the migration is still deciding which store is real, the LOCAL one is
  // active and its empty result would read as "no plan" over a saved plan.
  const effectiveStatus: WeeklyPlanStatus = isUserPending ? 'loading' : status;

  const reload = useCallback(async () => {
    setAttempt((n) => n + 1);
  }, []);

  const savePlan = useCallback(
    async (next: WeeklyPlan) => {
      await activeStore.save(next);
      setPlan(next);
    },
    [activeStore]
  );

  const clearPlan = useCallback(async () => {
    await activeStore.clear();
    setPlan(null);
  }, [activeStore]);

  const value = useMemo<WeeklyPlanContextValue>(
    () => ({ plan, status: effectiveStatus, reload, savePlan, clearPlan }),
    [plan, effectiveStatus, reload, savePlan, clearPlan]
  );

  return (
    <WeeklyPlanContext.Provider value={value}>{children}</WeeklyPlanContext.Provider>
  );
}

export function useWeeklyPlan() {
  const context = useContext(WeeklyPlanContext);
  if (!context) {
    throw new Error('useWeeklyPlan must be used inside a <WeeklyPlanProvider>.');
  }
  return context;
}

/** Convenience for the "build it myself" path — a blank, manual plan. */
export function blankPlan(): WeeklyPlan {
  return emptyPlan('manual');
}
