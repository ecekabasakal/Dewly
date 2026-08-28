import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { analyzeInciList, type AnalysisResult } from '../lib/analysis';
import { useProfile } from './useProfile';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Holds the most recent analysis so the paste screen and the results screen can
 * share it.
 *
 * The alternative — passing the pasted text as a route param — would put a
 * 1–2 KB ingredient list in the URL, which breaks down on web and makes the
 * results screen re-run the query on every navigation.
 */
type AnalysisContextValue = {
  status: Status;
  input: string;
  result: AnalysisResult | null;
  error: string | null;
  /** Runs the analysis; resolves true on success so the caller can navigate. */
  analyze: (text: string) => Promise<boolean>;
  reset: () => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [status, setStatus] = useState<Status>('idle');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (text: string) => {
      setStatus('loading');
      setError(null);
      setInput(text);

      try {
        const next = await analyzeInciList(text, profile);
        setResult(next);
        setStatus('ready');
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setStatus('error');
        return false;
      }
    },
    // Not language-dependent: the result carries no rendered text, so changing
    // language re-renders rather than re-querying.
    [profile]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setInput('');
    setResult(null);
    setError(null);
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({ status, input, result, error, analyze, reset }),
    [status, input, result, error, analyze, reset]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used inside an <AnalysisProvider>.');
  }
  return context;
}
