import { StyleSheet, View } from 'react-native';
import { useLanguage } from '../hooks/useLanguage';
import { colors, radius, spacing } from '../theme';
import { Text } from './Text';

/**
 * Turkish puts the ordinal before the total and uses a different connector, so
 * this is a function of both numbers rather than a template with two holes
 * punched in an English sentence.
 */
const COPY = {
  en: { progress: (step: number, total: number) => `Step ${step} of ${total}` },
  tr: { progress: (step: number, total: number) => `${total} adımdan ${step}.` },
} as const;

export type ProgressBarProps = {
  /** 1-based. */
  step: number;
  total: number;
};

export function ProgressBar({ step, total }: ProgressBarProps) {
  const clamped = Math.min(Math.max(step, 1), total);
  const { language } = useLanguage();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: clamped }}
      style={styles.wrapper}
    >
      <View style={styles.track}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, index < clamped ? styles.filled : styles.empty]}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {COPY[language].progress(clamped, total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  // Discrete segments rather than one continuous bar: with only five steps the
  // user can see how much is left at a glance, and each step feels bounded.
  track: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 5, borderRadius: radius.pill },
  filled: { backgroundColor: colors.primary },
  empty: { backgroundColor: colors.borderStrong, opacity: 0.5 },
});
