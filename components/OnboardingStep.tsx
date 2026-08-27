import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { Screen } from './Screen';
import { Text } from './Text';

export const ONBOARDING_STEP_COUNT = 5;

export type OnboardingStepProps = {
  step: number;
  title: string;
  subtitle?: string;
  /** Shown under the options — used to say a step is optional. */
  hint?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  /** Disables Next until the step's requirement is met. */
  canAdvance: boolean;
  nextLabel?: string;
};

/**
 * Shared chrome for every onboarding step: progress, question, options, footer.
 *
 * Keeping this in one place means the five step screens hold only their own
 * question and answer handling, so adding or reordering a step is a small edit.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
  hint,
  children,
  onBack,
  onNext,
  canAdvance,
  nextLabel = 'Continue',
}: OnboardingStepProps) {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <ProgressBar step={step} total={ONBOARDING_STEP_COUNT} />
        <Text variant="h1" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.options}>{children}</View>

      {hint ? (
        <Text variant="caption" tone="muted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {onBack ? (
          <Button label="Back" variant="secondary" onPress={onBack} />
        ) : (
          // Keeps Next right-aligned on step 1, where there is nothing to go back to.
          <View />
        )}
        <Button
          label={nextLabel}
          onPress={onNext}
          disabled={!canAdvance}
          style={styles.next}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  title: { marginTop: spacing.sm },
  options: { marginTop: spacing.xl, gap: spacing.md },
  hint: { marginTop: spacing.md },
  footer: {
    marginTop: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  next: { flexGrow: 1, maxWidth: 220 },
});
