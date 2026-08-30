import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { ErrorState, Screen } from '../components';
import { authLog, useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { colors } from '../theme';

/**
 * Entry gate. Order matters, and each step waits for real data:
 *
 *   auth loading        -> spinner
 *   not signed in       -> /auth/sign-in
 *   migrating           -> spinner (first sign-in moves local data up)
 *   profile loading     -> spinner
 *   profile load FAILED -> error + retry  (never onboarding — see below)
 *   no profile          -> /onboarding   (outside the tabs, so no tab bar)
 *   signed in + profile -> /home         (the tab app)
 *
 * Every "loading" branch renders a spinner rather than redirecting. Redirecting
 * on unresolved state would bounce a signed-in user through the sign-in screen,
 * or a returning user back through onboarding, for the frame before the answer
 * arrives.
 *
 * The failure branch is the important one. A failed profile read used to look
 * identical to "never onboarded", so a network blip sent a returning user into
 * onboarding — and finishing it overwrote their real profile on the server.
 * Now the gate stops and offers a retry instead of guessing.
 */
export default function Index() {
  const { isLoaded: authLoaded, sessionUserId, userId, isMigrating } = useAuth();
  const {
    isLoaded: profileLoaded,
    status: profileStatus,
    reload: reloadProfile,
    hasCompletedOnboarding,
  } = useProfile();

  if (!authLoaded) {
    authLog('gate: waiting for auth…');
    return <Loading />;
  }
  if (!sessionUserId) {
    authLog('gate: no session -> /auth/sign-in');
    return <Redirect href="/auth/sign-in" />;
  }

  if (userId && profileStatus === 'failed') {
    authLog('gate: profile read FAILED -> error + retry (NOT onboarding)');
    return (
      <Screen>
        <View style={styles.gate}>
          <ErrorState onRetry={() => void reloadProfile()} />
        </View>
      </Screen>
    );
  }

  // `userId` only appears once migration has settled; until then the profile
  // store is still the local one and its answer would be misleading.
  if (isMigrating || !userId || !profileLoaded) {
    authLog(
      `gate: waiting (migrating=${isMigrating} userReady=${Boolean(userId)} profileLoaded=${profileLoaded})`
    );
    return <Loading />;
  }

  const target = hasCompletedOnboarding ? '/home' : '/onboarding';
  authLog(`gate: signed in, profile=${hasCompletedOnboarding ? 'yes' : 'no'} -> ${target}`);
  return <Redirect href={target} />;
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: 'center' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
