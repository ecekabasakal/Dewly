import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { migrateLocalDataToSupabase } from '../lib/migrate';
import { authErrorMessage } from '../lib/auth-errors';
import type { Language } from '../lib/language';

/**
 * `kind` distinguishes a genuine failure from an outcome that did not sign the
 * user in but is not an error either.
 *
 * The email-confirmation case is the reason: sign-up SUCCEEDS but returns no
 * session, and reporting that identically to a wrong password meant "Account
 * created — check your inbox" was rendered in the red danger box behind a `!`
 * badge. Right words, wrong signal.
 */
export type AuthResult =
  | { ok: true }
  | { ok: false; kind: 'error' | 'notice'; message: string };

type AuthContextValue = {
  session: Session | null;
  /**
   * The signed-in user, exposed ONLY once their one-time local->Supabase
   * migration has settled.
   *
   * This ordering is load-bearing. `ProfileProvider` and `ShelfProvider` build
   * their Supabase store from this id and read once when it appears; if it were
   * exposed the instant the session arrived, they would read an empty remote
   * profile while the migration was still uploading and send a returning user
   * back through onboarding.
   */
  userId: string | null;
  /** The session's user id regardless of migration state. */
  sessionUserId: string | null;
  /**
   * True while it is not yet known which store a signed-in user owns — the
   * persisted session has not been read, or it has and the migration that
   * publishes `userId` is still running.
   *
   * `ProfileProvider` and `ShelfProvider` fall back to the LOCAL store while
   * `userId` is null, which is right for a signed-out visitor and wrong for a
   * signed-in one: their local copy is empty, and reporting it as a successful
   * read means "no profile" and "empty shelf". On a phone that window is
   * invisible because every cold start goes through the `/` gate, which waits.
   * In a browser you can land straight on `/home` by reloading or following a
   * link, and that screen redirects a profile-less user into onboarding — so a
   * refresh threw a fully onboarded user back to question 1. Both providers
   * report `loading` while this is true.
   */
  isUserPending: boolean;
  email: string | null;
  /** False until the persisted session has been read — gate navigation on this. */
  isLoaded: boolean;
  /** True while the first-sign-in migration is running. */
  isMigrating: boolean;
  signUp: (email: string, password: string, language: Language) => Promise<AuthResult>;
  signIn: (email: string, password: string, language: Language) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

/** The gate waits on the migration, so it must be bounded. */
const MIGRATION_TIMEOUT_MS = 10_000;

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Logs what the app decided about auth, and why.
 *
 * A persisted session is invisible from the outside: the app simply opens on
 * the tabs, which is indistinguishable from the gate not running at all. This
 * line makes the difference legible in the Metro console.
 *
 * Dev only — it prints the signed-in email, which has no place in a release
 * build's logs.
 */
export function authLog(step: string, detail?: unknown) {
  if (!__DEV__) return;
  if (detail === undefined) console.log(`[dewly:auth] ${step}`);
  else console.log(`[dewly:auth] ${step}`, detail);
}

function logAuthState(event: string, session: Session | null, error?: unknown) {
  if (!__DEV__) return;

  if (error) {
    console.log(`[dewly:auth] ${event} — error:`, error);
    return;
  }
  if (!session) {
    console.log(`[dewly:auth] ${event} — no session -> sign-in required`);
    return;
  }

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  console.log(
    `[dewly:auth] ${event} — session for ${session.user.email} ` +
      `(expires ${new Date(expiresAt).toISOString()}, ` +
      `${expiresAt < Date.now() ? 'EXPIRED' : 'valid'}) -> signed in`
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migratedUserId, setMigratedUserId] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Read the persisted session first, then subscribe. Subscribing alone is
    // not enough: on a cold start the listener may not fire before the first
    // render, and the gate would flash the sign-in screen at a signed-in user.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        logAuthState('launch', data.session);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSession(null);
        logAuthState('launch (getSession failed)', null, error);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setIsLoaded(true);
      logAuthState(event, next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const sessionUserId = session?.user.id ?? null;

  // Run the one-time migration as soon as a session appears, and only then
  // publish the user id downstream.
  useEffect(() => {
    if (!sessionUserId) {
      setMigratedUserId(null);
      setIsMigrating(false);
      return;
    }
    if (migratedUserId === sessionUserId) return;

    let cancelled = false;
    setIsMigrating(true);
    authLog(`migration: starting for ${sessionUserId}`);

    // Hard time limit. The migration is awaited before the gate will let the
    // user through, so a request that never settles — a hung socket, a
    // permission error that stalls — would leave the app on a spinner forever.
    // Losing the migration is recoverable (it retries next sign-in); losing
    // access to the app is not.
    const timeout = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), MIGRATION_TIMEOUT_MS)
    );

    void Promise.race([migrateLocalDataToSupabase(sessionUserId), timeout])
      .then((outcome) => {
        if (outcome === 'timeout') {
          authLog(`migration: TIMED OUT after ${MIGRATION_TIMEOUT_MS}ms — continuing anyway`);
        } else {
          authLog('migration: finished', outcome);
        }
      })
      .catch((error: unknown) => {
        // Should be unreachable — migrateLocalDataToSupabase catches its own
        // failures — but a rejection here must not strand the user either.
        authLog('migration: unexpected rejection — continuing anyway', error);
      })
      .finally(() => {
        if (cancelled) return;
        authLog('migration: releasing the gate');
        setMigratedUserId(sessionUserId);
        setIsMigrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUserId, migratedUserId]);

  const signUp = useCallback(
    async (email: string, password: string, language: Language): Promise<AuthResult> => {
      authLog('signUp: calling supabase.auth.signUp…');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        authLog('signUp: FAILED', error.message);
        return { ok: false, kind: 'error', message: authErrorMessage(error, language) };
      }
      authLog(
        `signUp: ok — user=${data.user?.email ?? 'none'} session=${data.session ? 'yes' : 'NO'}`
      );

      // With "Confirm email" enabled, signUp succeeds but returns no session.
      // Say so plainly rather than dropping the user on a screen that silently
      // refuses to move on.
      if (!data.session) {
        authLog('signUp: no session returned -> email confirmation is ON');
        return {
          ok: false,
          kind: 'notice',
          message: authErrorMessage('email-confirmation', language),
        };
      }
      authLog('signUp: session established -> auth layout will redirect to /');
      return { ok: true };
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string, language: Language): Promise<AuthResult> => {
      authLog('signIn: calling supabase.auth.signInWithPassword…');
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        authLog('signIn: FAILED', error.message);
        return { ok: false, kind: 'error', message: authErrorMessage(error, language) };
      }
      authLog('signIn: ok -> auth layout will redirect to /');
      return { ok: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMigratedUserId(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId: migratedUserId,
      sessionUserId,
      isUserPending: !isLoaded || (sessionUserId !== null && migratedUserId === null),
      email: session?.user.email ?? null,
      isLoaded,
      isMigrating,
      signUp,
      signIn,
      signOut,
    }),
    [session, sessionUserId, migratedUserId, isLoaded, isMigrating, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return context;
}
