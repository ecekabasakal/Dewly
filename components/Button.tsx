import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /** Layout overrides only (width, flex, margins) — visual style stays in the variant. */
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  // Block taps while loading so a slow request can't be fired twice.
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizes[size],
        isPrimary ? styles.primary : styles.secondary,
        fullWidth && styles.fullWidth,
        // Darken rather than fade, so the press reads on a butter background.
        pressed && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.onPrimary : colors.primary}
        />
      ) : (
        <Text
          variant="body"
          tone={isPrimary ? 'onPrimary' : 'primary'}
          style={[styles.label, size === 'lg' && styles.labelLg]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const sizes = StyleSheet.create({
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 46 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], minHeight: 54 },
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryMuted,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  secondaryPressed: {
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.45 },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontFamily: fonts.bodySemi },
  labelLg: { fontSize: 17 },
});
