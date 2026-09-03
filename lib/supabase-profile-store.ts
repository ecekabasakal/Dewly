import { supabase } from './supabase';
import { AppError } from './errors';
import type { ProfileStore } from './profile-store';
import {
  PROFILE_VERSION,
  type AgeRange,
  type Concern,
  type Goal,
  type Profile,
  type SensitivityLevel,
  type SkinType,
} from '../types/profile';

/**
 * Supabase-backed profile storage.
 *
 * This is the implementation `ProfileStore` was made an interface for: no
 * screen or hook changes, only the object handed to `ProfileProvider`.
 *
 * Every query is scoped by `user_id`. That is belt-and-braces — the RLS policy
 * on `skin_profiles` already restricts rows to `auth.uid()` — but it keeps the
 * intent visible at the call site and means a misconfigured policy fails closed
 * in an obvious way rather than silently returning someone else's row.
 */
export function createSupabaseProfileStore(userId: string): ProfileStore {
  return {
    async load() {
      const { data, error } = await supabase
        .from('skin_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new AppError('load-failed', `load profile: ${error.message}`);
      if (!data) return null;

      return {
        name: data.name,
        skinType: data.skin_type as SkinType,
        concerns: data.concerns as Concern[],
        goals: data.goals as Goal[],
        ageRange: data.age_range as AgeRange,
        sensitivity: data.sensitivity as SensitivityLevel,
        completedAt: data.completed_at,
        version: data.version,
      } satisfies Profile;
    },

    async save(profile) {
      // `user_id` is the primary key, so one upsert covers both "first time"
      // and "changed their answers" without a read first.
      const { error } = await supabase.from('skin_profiles').upsert(
        {
          user_id: userId,
          // `?? null` rather than omitting the key: an omitted column leaves the
          // previous value in place on an upsert, so clearing a name in Settings
          // would silently keep the old one.
          name: profile.name ?? null,
          skin_type: profile.skinType,
          concerns: profile.concerns,
          goals: profile.goals,
          age_range: profile.ageRange,
          sensitivity: profile.sensitivity,
          version: profile.version ?? PROFILE_VERSION,
          completed_at: profile.completedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw new AppError('save-failed', `save profile: ${error.message}`);
    },

    async clear() {
      const { error } = await supabase
        .from('skin_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw new AppError('save-failed', `clear profile: ${error.message}`);
    },
  };
}
