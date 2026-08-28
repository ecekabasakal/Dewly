import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { deviceLanguage, type Language } from '../lib/language';

/**
 * The app's content language.
 *
 * Hoisted out of `AnalysisProvider` in Phase 6: the shelf and timing screens
 * need it too, and reaching into the analysis context for a language setting
 * was the wrong dependency. Still not a full i18n layer — it only chooses which
 * `*_en` / `*_tr` column to read.
 */
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => deviceLanguage());

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside a <LanguageProvider>.');
  }
  return context;
}
