import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme';

export default function OnboardingLayout() {
  const { isLoaded, sessionUserId } = useAuth();

  // Onboarding writes to the signed-in user's profile row, so it sits behind
  // the same gate as the tabs — and likewise renders nothing until auth
  // resolves rather than flashing the flow at a signed-out visitor.
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!sessionUserId) return <Redirect href="/auth/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        // Back is driven by the on-screen Back button so the footer is the one
        // way to move; the swipe gesture would skip the draft-saving handler.
        gestureEnabled: false,
      }}
    />
  );
}
