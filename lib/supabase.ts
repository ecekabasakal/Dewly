import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
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
 * Auth options:
 *   - `storage: AsyncStorage` — React Native has no localStorage, so without
 *     this the session lives in memory and is lost on every app restart. Safe
 *     to keep on web too: metro resolves the package's non-`.native` build
 *     there, which is a thin promise wrapper over `window.localStorage`, so
 *     sessions persist across a browser reload the same way.
 *   - `detectSessionInUrl` — WEB ONLY. Supabase's confirmation and recovery
 *     emails send the user to a URL carrying the tokens in the fragment
 *     (`#access_token=…`). With this off, the browser lands on the app and
 *     nothing reads them: the confirmation link appears to do nothing and the
 *     user is still signed out. Off outside the web, where there is no such URL.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Refresh the access token only while the app is in the foreground.
 *
 * supabase-js refreshes on a timer; left running in the background it burns
 * requests and can fire while the OS has the process suspended. Supabase's own
 * React Native guidance is to drive it from AppState.
 *
 * Native only, deliberately. On web supabase-js already installs its own
 * `visibilitychange` handling for exactly this, and react-native-web maps
 * AppState onto the same event — so running both means every tab switch races
 * two start/stop calls against one refresh ticker.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
