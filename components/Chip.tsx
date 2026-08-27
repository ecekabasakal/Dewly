import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  /** Filled state. Drives the multi-select concern pickers in onboarding. */
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function Chip({ label, selected = false, onPress, disabled }: ChipProps) {
  const interactive = !!onPress && !disabled;

  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : undefined}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && interactive && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        variant="caption"
        tone={selected ? 'onPrimary' : 'default'}
        style={styles.label}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14 },
});
