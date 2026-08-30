import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncStorageProfileStore } from './profile-store';
import { asyncStorageShelfStore } from './shelf-store';
import { createSupabaseProfileStore } from './supabase-profile-store';
import { createSupabaseShelfStore } from './supabase-shelf-store';
import { isUuid, newProductId, type ShelfProduct } from '../types/shelf';

/**
 * One-time migration of device-local data into Supabase on first sign-in.
 *
 * Strategy, and why:
 *
 *  - **Remote wins.** Local data is only pushed when the remote side is EMPTY.
 *    Signing in on a second device must not overwrite the profile and shelf
 *    that device already has with whatever happened to be cached locally.
 *
 *  - **Additive, never destructive.** Nothing local is deleted. If the push
 *    fails halfway, the local copy is still there and the next sign-in retries,
 *    because the "done" marker is only written after a clean run.
 *
 *  - **Marked per user id.** Two accounts on one device each get their own
 *    migration, and neither re-runs.
 *
 *  - **Never blocks sign-in.** A migration failure is logged and swallowed;
 *    the user still reaches the app, just without their old local data yet.
 */

const doneKey = (userId: string) => `dewly.migrated.v1.${userId}`;

function log(step: string, detail?: unknown) {
  if (!__DEV__) return;
  if (detail === undefined) console.log(`[dewly:migrate] ${step}`);
  else console.log(`[dewly:migrate] ${step}`, detail);
}

export type MigrationOutcome = {
  ran: boolean;
  profileMigrated: boolean;
  productsMigrated: number;
  error?: string;
};

/**
 * Pre-Phase-8 products carry a base-36 id that Postgres will reject as a uuid.
 * Reissue those so the migration doesn't fail on legacy rows.
 */
function withValidIds(products: ShelfProduct[]): ShelfProduct[] {
  return products.map((product) =>
    isUuid(product.id) ? product : { ...product, id: newProductId() }
  );
}

export async function migrateLocalDataToSupabase(
  userId: string
): Promise<MigrationOutcome> {
  const key = doneKey(userId);

  try {
    if (await AsyncStorage.getItem(key)) {
      log('already migrated for this user — skipping');
      return { ran: false, profileMigrated: false, productsMigrated: 0 };
    }

    const remoteProfileStore = createSupabaseProfileStore(userId);
    const remoteShelfStore = createSupabaseShelfStore(userId);

    log('reading local + remote state…');
    const [localProfile, localShelf, remoteProfile, remoteShelf] = await Promise.all([
      asyncStorageProfileStore.load(),
      asyncStorageShelfStore.load(),
      remoteProfileStore.load(),
      remoteShelfStore.load(),
    ]);
    log(
      `local: profile=${localProfile ? 'yes' : 'no'} shelf=${localShelf.length} | ` +
        `remote: profile=${remoteProfile ? 'yes' : 'no'} shelf=${remoteShelf.length}`
    );

    let profileMigrated = false;
    if (localProfile && !remoteProfile) {
      log('writing skin_profiles…');
      await remoteProfileStore.save(localProfile);
      log('skin_profiles written');
      profileMigrated = true;
    } else {
      log('skin_profiles: nothing to migrate (remote wins)');
    }

    let productsMigrated = 0;
    if (localShelf.length > 0 && remoteShelf.length === 0) {
      const products = withValidIds(localShelf);
      log(`writing products + user_shelf (${products.length})…`);
      await remoteShelfStore.save(products);
      log('products + user_shelf written');
      productsMigrated = products.length;
    } else {
      log('shelf: nothing to migrate (remote wins)');
    }

    // Routines are derived from the shelf (lib/routine.ts), so there is nothing
    // separate to migrate — writing the shelf writes the routine.
    log('routines: derived from the shelf, nothing to write');

    await AsyncStorage.setItem(key, new Date().toISOString());

    return { ran: true, profileMigrated, productsMigrated };
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : String(caught);
    // Deliberately not rethrown: a failed migration must not lock the user out
    // of an app they have just signed into. The marker stays unwritten, so the
    // next sign-in tries again.
    log(`FAILED — deferred, will retry next sign-in: ${error}`);
    return { ran: false, profileMigrated: false, productsMigrated: 0, error };
  }
}
