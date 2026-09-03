import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, elevation, radius, spacing } from '../theme';

export type CardProps = {
  children: ReactNode;
  /** Pass to make the whole card tappable (product cards, routine steps). */
  onPress?: () => void;
  style?: ViewStyle;
};

export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    // Cream on butter is a low-contrast pairing by design; a soft green-tinted
    // shadow does the lifting that a stronger border would make feel heavy.
    //
    // Was four `shadow*` props plus `elevation`, which react-native-web has
    // deprecated and warned about on every render. `elevation.sm` is one
    // `boxShadow` that both renderers understand, and it can layer two shadows
    // where the old single `shadowRadius` could only describe one.
    ...elevation.sm,
  },
  pressed: { opacity: 0.85 },
});
