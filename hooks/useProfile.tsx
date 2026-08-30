import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppError } from '../lib/errors';
import { guardStore } from '../lib/guarded-store';
import { asyncStorageProfileStore, type ProfileStore } from '../lib/profile-store';
import { createSupabaseProfileStore } from '../lib/supabase-profile-store';
import { useAuth } from './useAuth';
import {
  EMPTY_DRAFT,
  PROFILE_VERSION,
  type Profile,
  type ProfileDraft,
} from '../types/profile';

/**
 * Owns the skin profile: the saved one, plus the in-progress onboarding draft.
 *
 * Draft answers live here rather than in route params so a step can be revisited
 * with its previous answer intact, and so the flow does not lose state on a
 * fast-refresh during development.
 */
/**
 * `failed` is distinct from "no profile", and the difference is load-bearing.
 *
 * A failed read used to surface as `profile === null`, which the entry gate
 * reads as "never onboarded" — so a network blip sent a returning user through
 * onboarding, and finishing it overwrote their real profile on the server.
 */
export type ProfileStatus = 'loading' | 'ready' | 'failed';

type ProfileContextValue = {
  /** null until loaded, then the saved profile or null if never onboarded. */
  profile: Profile | null;
  status: ProfileStatus;
  /** True only when a read actually succeeded — never true after a failure. */
  isLoaded: boolean;
  /** Re-runs the load. Drives the retry button on the entry gate. */
  reload: () => Promise<void>;
  hasCompletedOnboarding: boolean;

  draft: ProfileDraft;
  updateDraft: (patch: Partial<ProfileDraft>) => void;
  resetDraft: () => void;

  /** Promotes the draft to a saved Profile. Throws if a required answer is missing. */
  completeOnboarding: () => Promise<Profile>;
  /** Clears the saved profile and the draft. Used by the dev reset control. */
  resetProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Overrides the auth-derived store. Used by tests. */
  store?: ProfileStore;
}) {
  const { userId } = useAuth();

  // The seam this interface existed for: signed in reads and writes Supabase,
  // signed out falls back to local so nothing crashes before the auth gate.
  // Guarded so a failed read can never be written back over a real profile.
  const activeStore = useMemo<ProfileStore>(
    () =>
      guardStore(
        store ?? (userId ? createSupabaseProfileStore(userId) : asyncStorageProfileStore)
      ),
    [store, userId]
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    activeStore
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // Deliberately NOT `setProfile(null)`. That is indistinguishable from
        // "never onboarded" and is what used to push a returning user back
        // through the flow, overwriting their profile at the end of it.
        setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [activeStore, attempt]);

  const reload = useCallback(async () => {
    setAttempt((n) => n + 1);
  }, []);

  const updateDraft = useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const completeOnboarding = useCallback(async () => {
    // Refuse before touching the draft. The guarded store would reject this
    // anyway, but failing here keeps the reason precise: we do not know whether
    // this user already has a profile, so saving could overwrite one.
    if (status !== 'ready') {
      throw new AppError('not-loaded', `completeOnboarding blocked: status=${status}`);
    }

    const { skinType, ageRange, sensitivity, concerns, goals } = draft;

    if (!skinType || !ageRange || !sensitivity) {
      throw new Error(
        'Cannot complete onboarding: skin type, age range and sensitivity are all required.'
      );
    }

    const completed: Profile = {
      skinType,
      concerns,
      goals,
      ageRange,
      sensitivity,
      completedAt: new Date().toISOString(),
      version: PROFILE_VERSION,
    };

    await activeStore.save(completed);
    setProfile(completed);
    setDraft(EMPTY_DRAFT);
    return completed;
  }, [draft, activeStore, status]);

  const resetProfile = useCallback(async () => {
    await activeStore.clear();
    setProfile(null);
    setDraft(EMPTY_DRAFT);
  }, [activeStore]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      status,
      isLoaded: status === 'ready',
      reload,
      hasCompletedOnboarding: profile !== null,
      draft,
      updateDraft,
      resetDraft,
      completeOnboarding,
      resetProfile,
    }),
    [profile, status, reload, draft, updateDraft, resetDraft, completeOnboarding, resetProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside a <ProfileProvider>.');
  }
  return context;
}
