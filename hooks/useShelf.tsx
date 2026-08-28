import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { asyncStorageShelfStore, type ShelfStore } from '../lib/shelf-store';
import { newProductId, type ShelfProduct } from '../types/shelf';

export type NewShelfProduct = Omit<ShelfProduct, 'id' | 'addedAt'>;

type ShelfContextValue = {
  products: ShelfProduct[];
  /** False until the first storage read resolves — gate rendering on this. */
  isLoaded: boolean;
  addProduct: (input: NewShelfProduct) => Promise<ShelfProduct>;
  updateProduct: (id: string, patch: Partial<NewShelfProduct>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  clearShelf: () => Promise<void>;
  getProduct: (id: string) => ShelfProduct | undefined;
};

const ShelfContext = createContext<ShelfContextValue | null>(null);

export function ShelfProvider({
  children,
  store = asyncStorageShelfStore,
}: {
  children: ReactNode;
  /** Injectable so Phase 8 can pass a Supabase-backed store, and tests a fake. */
  store?: ShelfStore;
}) {
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    store
      .load()
      .then((loaded) => {
        if (!cancelled) setProducts(loaded);
      })
      .catch(() => {
        // A failed read must not wedge the app; start from an empty shelf.
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [store]);

  /**
   * Single write path: compute the next list, persist, then commit to state.
   * State only moves after the write resolves, so what is on screen always
   * matches what is on disk.
   */
  const commit = useCallback(
    async (next: ShelfProduct[]) => {
      await store.save(next);
      setProducts(next);
    },
    [store]
  );

  const addProduct = useCallback(
    async (input: NewShelfProduct) => {
      const product: ShelfProduct = {
        ...input,
        id: newProductId(),
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
    await store.clear();
    setProducts([]);
  }, [store]);

  const getProduct = useCallback(
    (id: string) => products.find((product) => product.id === id),
    [products]
  );

  const value = useMemo<ShelfContextValue>(
    () => ({
      products,
      isLoaded,
      addProduct,
      updateProduct,
      removeProduct,
      clearShelf,
      getProduct,
    }),
    [products, isLoaded, addProduct, updateProduct, removeProduct, clearShelf, getProduct]
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
