import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
type ProfileContextValue = {
  /** null until loaded, then the saved profile or null if never onboarded. */
  profile: Profile | null;
  /** False until the first storage read resolves — gate navigation on this. */
  isLoaded: boolean;
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
  const activeStore = useMemo<ProfileStore>(
    () => store ?? (userId ? createSupabaseProfileStore(userId) : asyncStorageProfileStore),
    [store, userId]
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);

  useEffect(() => {
    let cancelled = false;

    activeStore
      .load()
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch(() => {
        // A failed read must not wedge the app on a blank screen; treat it as
        // "not onboarded" and let the user through the flow again.
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [activeStore]);

  const updateDraft = useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const completeOnboarding = useCallback(async () => {
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
  }, [draft, activeStore]);

  const resetProfile = useCallback(async () => {
    await activeStore.clear();
    setProfile(null);
    setDraft(EMPTY_DRAFT);
  }, [activeStore]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoaded,
      hasCompletedOnboarding: profile !== null,
      draft,
      updateDraft,
      resetDraft,
      completeOnboarding,
      resetProfile,
    }),
    [profile, isLoaded, draft, updateDraft, resetDraft, completeOnboarding, resetProfile]
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
