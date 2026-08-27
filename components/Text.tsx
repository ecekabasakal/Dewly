import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from '../theme';

type Tone = 'default' | 'muted' | 'primary' | 'onPrimary';

export type TextProps = RNTextProps & {
  /** Slot in the type scale. Defaults to `body`. */
  variant?: TypographyVariant;
  /** Semantic color role, so call sites never hardcode a hex. */
  tone?: Tone;
  center?: boolean;
};

const tones: Record<Tone, string> = {
  default: colors.text,
  muted: colors.muted,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
};

export function Text({
  variant = 'body',
  tone = 'default',
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: tones[tone] },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
