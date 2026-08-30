import { AppError } from './errors';

/**
 * Structural shape shared by `ProfileStore` and `ShelfStore`.
 *
 * Two type parameters because the two are not symmetric: `ProfileStore.load`
 * returns `Profile | null` but `save` takes a non-null `Profile`.
 */
export interface LoadableStore<Loaded, Saved> {
  load(): Promise<Loaded>;
  save(value: Saved): Promise<void>;
  clear(): Promise<void>;
}

export type GuardState = 'never-loaded' | 'ready' | 'failed';

export type GuardedStore<Loaded, Saved> = LoadableStore<Loaded, Saved> & {
  /** Current guard state, for the UI to branch on. */
  state(): GuardState;
};

/**
 * Refuses to write until a load has actually succeeded.
 *
 * ## The bug this exists to prevent
 *
 * `createSupabaseShelfStore().save()` is a REPLACE: it upserts the array it is
 * given and then deletes every `user_shelf` row not in it. That is correct only
 * when the array it receives is a faithful copy of what the server holds.
 *
 * Before this guard, a transient read failure broke that assumption and
 * silently destroyed data:
 *
 *   1. `load()` rejects — a dropped connection, an expired token, a 500.
 *   2. `useShelf` caught it and called `setProducts([])`.
 *   3. The shelf screen cannot tell that from a genuinely empty shelf, so it
 *      renders "Nothing here yet".
 *   4. The user adds one product. `save([theNewOne])` runs, and the delete
 *      sweeps away the ten products still sitting on the server.
 *
 * A network blip became permanent data loss, with no error shown at any point.
 * The same shape applied to the profile: a failed read looked like "never
 * onboarded", sent the user through onboarding, and the resulting `save()`
 * overwrote their real profile.
 *
 * ## Why the guard lives here and not in the hook
 *
 * The dangerous operation is the write, so the check belongs next to it. Put in
 * the hook it would protect only the screens; here it also covers
 * `lib/migrate.ts`, which writes to both stores during first sign-in and is
 * exactly the code path where a half-read remote state is most likely.
 *
 * Fails closed: the initial state is `never-loaded`, so a store that has not
 * been read yet will not write either.
 */
export function guardStore<Loaded, Saved>(
  inner: LoadableStore<Loaded, Saved>
): GuardedStore<Loaded, Saved> {
  let state: GuardState = 'never-loaded';

  const refuseUnlessReady = (operation: string) => {
    if (state !== 'ready') {
      throw new AppError(
        'not-loaded',
        `refusing to ${operation}: last load was "${state}", so the in-memory ` +
          `copy may not reflect the server and writing it could delete rows`
      );
    }
  };

  return {
    async load() {
      try {
        const value = await inner.load();
        state = 'ready';
        return value;
      } catch (caught) {
        // Stay failed and rethrow. Callers must not treat this as "empty".
        state = 'failed';
        throw caught;
      }
    },

    async save(value) {
      refuseUnlessReady('save');
      return inner.save(value);
    },

    async clear() {
      // `clear` is guarded too. It is less destructive in principle — the user
      // asked for the data to go — but running it against a store whose state
      // is unknown still deletes server rows on the strength of a failed read.
      refuseUnlessReady('clear');
      return inner.clear();
    },

    state: () => state,
  };
}
