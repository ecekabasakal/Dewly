import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { deviceLanguage, type Language } from '../lib/language';
import { asyncStorageLanguageStore, type LanguageStore } from '../lib/language-store';

/**
 * The app's language — the single source of truth for every screen.
 *
 * Hoisted out of `AnalysisProvider` in Phase 6, then persisted here: the toggle
 * in Settings writes through to storage, so the choice survives a restart
 * instead of snapping back to the device locale.
 *
 * Not a full i18n runtime. Two things read from it: the `*_en` / `*_tr` columns
 * in the dataset, and the per-screen `COPY` tables. Both resolve at RENDER
 * time, which is what makes flipping the toggle re-render the whole tree
 * rather than leaving already-computed strings in the old language.
 */
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  /**
   * False until the stored choice has been read. Screens don't need to gate on
   * this — `language` is always a usable value — but it exists so a future
   * splash gate can avoid the one-frame flash of the device default.
   */
  isLoaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  store = asyncStorageLanguageStore,
}: {
  children: ReactNode;
  /** Overrides the AsyncStorage-backed store. Used by tests. */
  store?: LanguageStore;
}) {
  // Start on the device language so the first paint is never blank, then swap
  // to the saved choice once storage answers.
  const [language, setLanguageState] = useState<Language>(() => deviceLanguage());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    store
      .load()
      .then((saved) => {
        if (!cancelled && saved) setLanguageState(saved);
      })
      .catch(() => {
        // A failed read just means "no saved choice" — the device default is
        // already in state, so there is nothing to recover from.
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [store]);

  const setLanguage = useCallback(
    (next: Language) => {
      // Set state first: the UI must switch on the tap, not after a disk write.
      setLanguageState(next);
      void store.save(next).catch(() => {
        // Persisting is best-effort. Losing the write costs the choice on the
        // next launch; blocking the toggle on it would cost it right now.
      });
    },
    [store]
  );

  const value = useMemo(
    () => ({ language, setLanguage, isLoaded }),
    [language, setLanguage, isLoaded]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside a <LanguageProvider>.');
  }
  return context;
}
