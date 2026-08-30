import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * Typed Supabase client. The `Database` generic flows through every query, so
 * `.from('ingredients').select()` returns `Ingredient[]` and unknown table or
 * column names are compile errors.
 *
 * Auth options are the React Native set:
 *   - `storage: AsyncStorage` — React Native has no localStorage, so without
 *     this the session lives in memory and is lost on every app restart.
 *   - `detectSessionInUrl: false` — there is no URL to parse outside the web.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Refresh the access token only while the app is in the foreground.
 *
 * supabase-js refreshes on a timer; left running in the background it burns
 * requests and can fire while the OS has the process suspended. Supabase's own
 * React Native guidance is to drive it from AppState.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
