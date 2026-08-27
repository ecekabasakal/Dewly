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
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
