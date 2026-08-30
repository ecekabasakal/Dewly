import { describe, expect, test } from 'bun:test';

import { errorCode } from './errors';
import { guardStore, type LoadableStore } from './guarded-store';
import type { ShelfProduct } from '../types/shelf';

/**
 * A stand-in for `createSupabaseShelfStore` with the same destructive `save`
 * semantics: whatever array it is handed becomes the entire shelf, and anything
 * absent from it is deleted.
 *
 * `rows` therefore models the SERVER. The assertions below are about what
 * survives in it, which is the thing the real bug destroyed.
 */
function fakeRemoteShelf(initial: ShelfProduct[]) {
  let rows = [...initial];
  let failNextLoad = false;
  const calls = { load: 0, save: 0, clear: 0 };

  const store: LoadableStore<ShelfProduct[], ShelfProduct[]> = {
    async load() {
      calls.load += 1;
      if (failNextLoad) {
        failNextLoad = false;
        throw new Error('network: connection reset');
      }
      return [...rows];
    },
    async save(products) {
      calls.save += 1;
      // The replace-and-delete the guard exists to keep away from bad input.
      rows = [...products];
    },
    async clear() {
      calls.clear += 1;
      rows = [];
    },
  };

  return {
    store,
    calls,
    rows: () => rows,
    breakNextLoad: () => {
      failNextLoad = true;
    },
  };
}

function product(id: string, name: string): ShelfProduct {
  return {
    id,
    name,
    brand: null,
    stepType: 'serum',
    timeOfDay: 'both',
    ingredientNames: [],
    addedAt: `2026-01-0${id}T00:00:00.000Z`,
  };
}

const EXISTING = [product('1', 'Niacinamide Serum'), product('2', 'Snail Essence')];

describe('guardStore', () => {
  test('a failed load followed by an add does NOT delete existing rows', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    // 1. The read fails, the way a dropped connection would.
    remote.breakNextLoad();
    await expect(guarded.load()).rejects.toThrow();
    expect(guarded.state()).toBe('failed');

    // 2. The screen shows an empty shelf and the user adds a product. This is
    //    the exact call that used to wipe the server.
    const added = [product('3', 'Rice Toner')];
    await expect(guarded.save(added)).rejects.toThrow();

    // 3. The server is untouched: both original products are still there, and
    //    the destructive save never reached the inner store.
    expect(remote.calls.save).toBe(0);
    expect(remote.rows()).toHaveLength(2);
    expect(remote.rows().map((p) => p.name).sort()).toEqual([
      'Niacinamide Serum',
      'Snail Essence',
    ]);
  });

  test('the refusal is reported as `not-loaded`, not a generic failure', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    remote.breakNextLoad();
    await expect(guarded.load()).rejects.toThrow();

    // The screen needs to tell "we won't write" apart from "the write failed",
    // because only the first one means the user's data is still intact.
    const caught = await guarded.save([product('3', 'Rice Toner')]).catch((e: unknown) => e);
    expect(errorCode(caught)).toBe('not-loaded');
  });

  test('fails closed: no write is allowed before any load', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    expect(guarded.state()).toBe('never-loaded');
    await expect(guarded.save([product('3', 'Rice Toner')])).rejects.toThrow();
    await expect(guarded.clear()).rejects.toThrow();
    expect(remote.calls.save).toBe(0);
    expect(remote.calls.clear).toBe(0);
    expect(remote.rows()).toHaveLength(2);
  });

  test('clear is refused after a failed load', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    remote.breakNextLoad();
    await expect(guarded.load()).rejects.toThrow();
    await expect(guarded.clear()).rejects.toThrow();

    expect(remote.calls.clear).toBe(0);
    expect(remote.rows()).toHaveLength(2);
  });

  test('writes work normally once a load has succeeded', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    const loaded = await guarded.load();
    expect(guarded.state()).toBe('ready');
    expect(loaded).toHaveLength(2);

    await guarded.save([...loaded, product('3', 'Rice Toner')]);
    expect(remote.rows()).toHaveLength(3);

    // A genuine removal still replaces the full list — the guard permits the
    // destructive save, it only insists the list came from a real read.
    await guarded.save([product('1', 'Niacinamide Serum')]);
    expect(remote.rows()).toHaveLength(1);
  });

  test('recovers: a successful retry after a failure re-enables writes', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const guarded = guardStore(remote.store);

    remote.breakNextLoad();
    await expect(guarded.load()).rejects.toThrow();
    expect(guarded.state()).toBe('failed');

    // The retry button on the shelf screen.
    const loaded = await guarded.load();
    expect(guarded.state()).toBe('ready');
    expect(loaded).toHaveLength(2);

    await guarded.save([...loaded, product('3', 'Rice Toner')]);
    expect(remote.rows()).toHaveLength(3);
  });

  test('a save failure does not silently flip the guard to ready', async () => {
    const remote = fakeRemoteShelf(EXISTING);
    const failingSave = guardStore({
      ...remote.store,
      async save() {
        throw new Error('network: write timed out');
      },
    });

    await failingSave.load();
    await expect(failingSave.save([product('3', 'Rice Toner')])).rejects.toThrow();
    // Still ready: the read is known-good, so a retry of the write is safe.
    expect(failingSave.state()).toBe('ready');
    expect(remote.rows()).toHaveLength(2);
  });
});
