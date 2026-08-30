import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme';

/**
 * Auth runs on the root Stack, outside `(tabs)` — the tab bar must not appear
 * before someone is signed in, for the same reason onboarding doesn't.
 *
 * This layout also owns the redirect OUT of auth once a session exists, which
 * is the counterpart to the guards on `(tabs)` and `onboarding`. Without it,
 * signing up succeeds, the session is set, and the user simply stays on the
 * sign-up screen forever: the gate in `app/index.tsx` only runs on the `/`
 * route, and after sign-up we are on `/auth/sign-up`.
 *
 * Redirecting to `/` rather than `/home` on purpose — the index gate is the one
 * place that decides between onboarding and the tabs, and it should stay that
 * way.
 */
export default function AuthLayout() {
  const { isLoaded, sessionUserId } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (sessionUserId) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

const styles = {
  loading: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.background,
  },
};
