import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Chip, OnboardingStep } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import { CONCERNS, CONCERN_LABELS, type Concern } from '../../types/profile';

export default function ConcernsStep() {
  const { draft, updateDraft } = useProfile();

  const toggle = (concern: Concern) => {
    const next = draft.concerns.includes(concern)
      ? draft.concerns.filter((c) => c !== concern)
      : [...draft.concerns, concern];
    updateDraft({ concerns: next });
  };

  return (
    <OnboardingStep
      step={2}
      title="What would you like to work on?"
      subtitle="Choose as many as apply — these drive which ingredients Dewly flags for you."
      hint={
        draft.concerns.length === 0
          ? 'Pick at least one to continue.'
          : `${draft.concerns.length} selected`
      }
      canAdvance={draft.concerns.length > 0}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/goals')}
    >
      <View style={styles.grid}>
        {CONCERNS.map((concern) => (
          <Chip
            key={concern}
            label={CONCERN_LABELS[concern]}
            selected={draft.concerns.includes(concern)}
            onPress={() => toggle(concern)}
          />
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
