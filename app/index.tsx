import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

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
 *   no profile          -> /onboarding   (outside the tabs, so no tab bar)
 *   signed in + profile -> /home         (the tab app)
 *
 * Every "loading" branch renders a spinner rather than redirecting. Redirecting
 * on unresolved state would bounce a signed-in user through the sign-in screen,
 * or a returning user back through onboarding, for the frame before the answer
 * arrives.
 */
export default function Index() {
  const { isLoaded: authLoaded, sessionUserId, userId, isMigrating } = useAuth();
  const { isLoaded: profileLoaded, hasCompletedOnboarding } = useProfile();

  if (!authLoaded) {
    authLog('gate: waiting for auth…');
    return <Loading />;
  }
  if (!sessionUserId) {
    authLog('gate: no session -> /auth/sign-in');
    return <Redirect href="/auth/sign-in" />;
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
