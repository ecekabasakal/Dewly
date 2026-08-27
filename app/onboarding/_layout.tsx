import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function OnboardingLayout() {
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
