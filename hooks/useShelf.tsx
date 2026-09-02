import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { guardStore } from '../lib/guarded-store';
import { asyncStorageShelfStore, type ShelfStore } from '../lib/shelf-store';
import { createSupabaseShelfStore } from '../lib/supabase-shelf-store';
import { useAuth } from './useAuth';
import { newProductId, type ShelfProduct } from '../types/shelf';

export type NewShelfProduct = Omit<ShelfProduct, 'id' | 'addedAt'> & {
  /**
   * Force the catalogue id instead of minting one.
   *
   * Only the Open Beauty Facts flow passes this, and only when that barcode is
   * already in `products`: reusing the existing row keeps two users who own the
   * same bottle on one catalogue entry, and avoids a unique-constraint failure
   * on `products.barcode`. Everything else omits it and gets a fresh uuid.
   */
  id?: string;
};

/**
 * `failed` is a first-class state, not an empty shelf.
 *
 * Collapsing the two is what let a dropped connection wipe a user's shelf:
 * screens rendered "Nothing here yet", the user added a product, and the
 * replace-style save deleted everything the failed read never returned. Screens
 * must branch on this before showing an empty state.
 */
export type ShelfStatus = 'loading' | 'ready' | 'failed';

type ShelfContextValue = {
  products: ShelfProduct[];
  status: ShelfStatus;
  /** True only when a read actually succeeded — never true after a failure. */
  isLoaded: boolean;
  /** Re-runs the load. Drives the retry button on the failure state. */
  reload: () => Promise<void>;
  addProduct: (input: NewShelfProduct) => Promise<ShelfProduct>;
  updateProduct: (id: string, patch: Partial<NewShelfProduct>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  clearShelf: () => Promise<void>;
  getProduct: (id: string) => ShelfProduct | undefined;
};

const ShelfContext = createContext<ShelfContextValue | null>(null);

export function ShelfProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Overrides the auth-derived store. Used by tests. */
  store?: ShelfStore;
}) {
  const { userId, isUserPending } = useAuth();

  // Signed in reads and writes Supabase; signed out falls back to local so
  // nothing crashes before the auth gate has resolved. Wrapped in `guardStore`
  // so no write can run against a shelf we failed to read.
  const activeStore = useMemo<ShelfStore>(
    () =>
      guardStore(
        store ?? (userId ? createSupabaseShelfStore(userId) : asyncStorageShelfStore)
      ),
    [store, userId]
  );
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [status, setStatus] = useState<ShelfStatus>('loading');
  // Bumped by `reload` to re-run the effect below.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    activeStore
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setProducts(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // Do NOT fall back to an empty shelf. `products` stays whatever we last
        // knew (empty on a cold start), but `status` says the value is not
        // trustworthy, and the guarded store refuses writes regardless.
        setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [activeStore, attempt]);

  /**
   * Same reasoning as `ProfileProvider`: while `isUserPending`, `activeStore`
   * is still the LOCAL store even though someone is signed in, and its empty
   * result would render "Nothing here yet" over a shelf that exists on the
   * server. Report `loading` until the real store is known.
   */
  const effectiveStatus: ShelfStatus = isUserPending ? 'loading' : status;

  const reload = useCallback(async () => {
    setAttempt((n) => n + 1);
  }, []);

  /**
   * Single write path: compute the next list, persist, then commit to state.
   * State only moves after the write resolves, so what is on screen always
   * matches what is on disk — and a rejected write leaves the UI truthful.
   *
   * Failures are rethrown, never swallowed: callers show the error.
   */
  const commit = useCallback(
    async (next: ShelfProduct[]) => {
      await activeStore.save(next);
      setProducts(next);
    },
    [activeStore]
  );

  const addProduct = useCallback(
    async (input: NewShelfProduct) => {
      const product: ShelfProduct = {
        ...input,
        id: input.id ?? newProductId(),
        addedAt: new Date().toISOString(),
      };
      await commit([...products, product]);
      return product;
    },
    [commit, products]
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<NewShelfProduct>) => {
      await commit(
        products.map((product) => (product.id === id ? { ...product, ...patch } : product))
      );
    },
    [commit, products]
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await commit(products.filter((product) => product.id !== id));
    },
    [commit, products]
  );

  const clearShelf = useCallback(async () => {
    await activeStore.clear();
    setProducts([]);
  }, [activeStore]);

  const getProduct = useCallback(
    (id: string) => products.find((product) => product.id === id),
    [products]
  );

  const value = useMemo<ShelfContextValue>(
    () => ({
      products,
      status: effectiveStatus,
      isLoaded: effectiveStatus === 'ready',
      reload,
      addProduct,
      updateProduct,
      removeProduct,
      clearShelf,
      getProduct,
    }),
    [
      products,
      effectiveStatus,
      reload,
      addProduct,
      updateProduct,
      removeProduct,
      clearShelf,
      getProduct,
    ]
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}

export function useShelf() {
  const context = useContext(ShelfContext);
  if (!context) {
    throw new Error('useShelf must be used inside a <ShelfProvider>.');
  }
  return context;
}
