import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useProfile } from '../hooks/useProfile';
import { colors } from '../theme';

/**
 * Entry gate: decides between onboarding and home.
 *
 * Renders a spinner rather than redirecting while `isLoaded` is false —
 * redirecting on an unresolved profile would send a returning user through
 * onboarding again for the split second before storage answers.
 */
export default function Index() {
  const { isLoaded, hasCompletedOnboarding } = useProfile();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={hasCompletedOnboarding ? '/home' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
