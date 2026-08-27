/**
 * Seeds `data/ingredients.json` into the Supabase `ingredients` table.
 *
 * Run with:   bun run seed:ingredients
 *
 * ---------------------------------------------------------------------------
 * Credentials
 * ---------------------------------------------------------------------------
 * This script needs the SERVICE ROLE key, not the anon key. `ingredients` is
 * public-read but write-protected: there is no INSERT policy, so an anon key
 * gets `42501 permission denied`. The service role bypasses RLS entirely.
 *
 * Set it locally in `.env` (already gitignored):
 *
 *     SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Find it in the Supabase dashboard under
 * Project Settings -> API -> Project API keys -> `service_role`.
 *
 * SECURITY — three rules for this key:
 *   1. Never prefix it with EXPO_PUBLIC_. That prefix inlines the value into
 *      the app bundle, publishing a key that bypasses every RLS policy.
 *   2. Never import it from `lib/supabase.ts` or any file under `app/`,
 *      `components/`, or `hooks/`. It belongs to build-time scripts only.
 *   3. Never commit it. `.gitignore` covers `.env`; keep it that way.
 * ---------------------------------------------------------------------------
 *
 * Re-runnable: rows are upserted on `inci_name`, so running twice updates in
 * place rather than duplicating. Nothing is ever deleted.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '../types/db';
import rawIngredients from '../data/ingredients.json';

const BATCH_SIZE = 50;

const INGREDIENT_CATEGORIES = [
  'humectant',
  'occlusive',
  'emollient',
  'active',
  'antioxidant',
  'spf_filter',
  'preservative',
  'fragrance',
  'solvent',
  'other',
] as const;

type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

/** Shape of one record in `data/ingredients.json`. */
type SeedRecord = {
  inci_name: string;
  common_name: string | null;
  category: string;
  functions: string[];
  targets_concerns: string[];
  description_en: string | null;
  description_tr: string | null;
  caution_en: string | null;
  caution_tr: string | null;
  comedogenic_rating: number | null;
  is_active: boolean;
};

/** Thrown for every expected failure; `main().catch` turns it into exit code 1. */
class SeedError extends Error {}

function fail(message: string): never {
  throw new SeedError(message);
}

/**
 * Reads the `role` claim from a Supabase key.
 *
 * Supabase keys are JWTs; decoding the payload is a local sanity check, not
 * authentication — the server still validates the signature. Returns undefined
 * for anything that isn't a decodable JWT, so unrecognised key formats are
 * allowed through rather than blocked on a heuristic.
 *
 * Uses `atob` rather than `Buffer` to avoid depending on Node type definitions
 * in a project whose other code targets React Native.
 */
function readKeyRole(key: string): string | undefined {
  const segments = key.split('.');
  if (segments.length !== 3) return undefined;

  const base64 = segments[1]!.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    return (JSON.parse(atob(padded)) as { role?: string }).role;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Validate before writing
// ---------------------------------------------------------------------------

/** Blank source fields become NULL so "no caution" is one value, not two. */
function nullIfBlank(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRow(record: SeedRecord, index: number): TablesInsert<'ingredients'> {
  const where = `data/ingredients.json[${index}] (${record.inci_name ?? 'unnamed'})`;

  if (!record.inci_name?.trim()) {
    fail(`${where}: inci_name is required and cannot be blank.`);
  }

  if (!INGREDIENT_CATEGORIES.includes(record.category as IngredientCategory)) {
    fail(
      `${where}: category "${record.category}" is not a member of the ingredient_category enum.\n` +
        `  Allowed: ${INGREDIENT_CATEGORIES.join(', ')}`
    );
  }

  const rating = record.comedogenic_rating;
  if (rating != null && (!Number.isInteger(rating) || rating < 0 || rating > 5)) {
    fail(
      `${where}: comedogenic_rating ${rating} violates the CHECK constraint (0-5, or null).`
    );
  }

  return {
    inci_name: record.inci_name.trim(),
    common_name: nullIfBlank(record.common_name),
    category: record.category as IngredientCategory,
    functions: record.functions ?? [],
    targets_concerns: record.targets_concerns ?? [],
    description_en: nullIfBlank(record.description_en),
    description_tr: nullIfBlank(record.description_tr),
    caution_en: nullIfBlank(record.caution_en),
    caution_tr: nullIfBlank(record.caution_tr),
    comedogenic_rating: rating ?? null,
    is_active: record.is_active ?? false,
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    fail(
      'Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL). Add it to .env — see .env.example.'
    );
  }

  if (!serviceRoleKey) {
    fail(
      'Missing SUPABASE_SERVICE_ROLE_KEY.\n' +
        '  Add it to .env (Supabase dashboard -> Project Settings -> API -> service_role).\n' +
        '  Do NOT use the anon key: ingredients has no INSERT policy, so writes are denied.'
    );
  }

  // Catch an anon key here rather than as a confusing 42501 mid-run.
  const role = readKeyRole(serviceRoleKey);
  if (role && role !== 'service_role') {
    fail(
      `SUPABASE_SERVICE_ROLE_KEY carries role "${role}", not "service_role".\n` +
        '  This looks like the anon key. Writes to `ingredients` will be rejected by RLS.'
    );
  }

  const records = rawIngredients as unknown as SeedRecord[];

  if (!Array.isArray(records) || records.length === 0) {
    fail('data/ingredients.json is empty or not an array.');
  }

  const rows = records.map(toRow);

  // The DB has a unique index on lower(inci_name); a case-only duplicate would
  // slip past the upsert's `inci_name` conflict target and fail the insert.
  const seen = new Map<string, string>();
  for (const row of rows) {
    const key = row.inci_name.toLowerCase();
    const previous = seen.get(key);
    if (previous) {
      fail(
        `Duplicate ingredient: "${previous}" and "${row.inci_name}" collide on the ` +
          'unique index over lower(inci_name). Remove one before seeding.'
      );
    }
    seen.set(key, row.inci_name);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${rows.length} ingredients -> ${supabaseUrl}`);

  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batchCount = Math.ceil(rows.length / BATCH_SIZE);

    const { data, error } = await supabase
      .from('ingredients')
      .upsert(batch, { onConflict: 'inci_name' })
      .select('id');

    if (error) {
      fail(
        `Batch ${batchNumber}/${batchCount} failed: ${error.message}` +
          (error.hint ? `\n  Hint: ${error.hint}` : '')
      );
    }

    written += data?.length ?? 0;
    console.log(`  batch ${batchNumber}/${batchCount} — ${data?.length ?? 0} rows`);
  }

  const { count, error: countError } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.warn(`\n⚠ Seeded ${written} rows, but the count check failed: ${countError.message}`);
    return;
  }

  const actives = rows.filter((r) => r.is_active).length;
  console.log(
    `\n✔ Upserted ${written} ingredients (${actives} flagged is_active).` +
      `\n  ingredients now holds ${count} rows.`
  );
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
