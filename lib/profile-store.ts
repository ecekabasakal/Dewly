import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROFILE_VERSION, type Profile } from '../types/profile';

/**
 * Persistence boundary for the skin profile.
 *
 * `useProfile` talks to this interface and never to AsyncStorage directly, so
 * Phase 8 can add a Supabase-backed implementation (or one that writes through
 * to both) without touching a single screen. That is the whole reason this is
 * an interface rather than three exported functions.
 */
export interface ProfileStore {
  load(): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'dewly.profile.v1';

/**
 * Narrow unknown JSON back to a Profile.
 *
 * Storage is untrusted input: it may hold data written by an older build, or
 * be corrupt. Anything unrecognised is treated as "no profile" so the user is
 * re-onboarded rather than dropped into a screen reading undefined fields.
 */
function parseProfile(raw: string): Profile | null {
  try {
    const value = JSON.parse(raw) as Partial<Profile> | null;

    if (!value || typeof value !== 'object') return null;
    if (value.version !== PROFILE_VERSION) return null;

    const { skinType, concerns, goals, ageRange, sensitivity, completedAt, name } = value;

    if (
      typeof skinType !== 'string' ||
      typeof ageRange !== 'string' ||
      typeof sensitivity !== 'string' ||
      typeof completedAt !== 'string' ||
      !Array.isArray(concerns) ||
      !Array.isArray(goals)
    ) {
      return null;
    }

    // `name` is optional, so its absence is fine — but a non-string in that slot
    // would reach the home hero and render as "[object Object]". Drop the bad
    // value rather than the whole profile: the name is the least important
    // field here, and losing it costs a greeting, not the user's answers.
    if (name != null && typeof name !== 'string') {
      return { ...(value as Profile), name: null };
    }

    return value as Profile;
  } catch {
    return null;
  }
}

export const asyncStorageProfileStore: ProfileStore = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? parseProfile(raw) : null;
  },

  async save(profile) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
