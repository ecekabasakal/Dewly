import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Chip, OnboardingStep } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import { GOALS, GOAL_LABELS, type Goal } from '../../types/profile';

export default function GoalsStep() {
  const { draft, updateDraft } = useProfile();

  const toggle = (goal: Goal) => {
    const next = draft.goals.includes(goal)
      ? draft.goals.filter((g) => g !== goal)
      : [...draft.goals, goal];
    updateDraft({ goals: next });
  };

  return (
    <OnboardingStep
      step={3}
      title="What are you hoping for?"
      subtitle="Your goals shape how routines get suggested later."
      // Goals are optional: unlike concerns they do not gate any Phase 5
      // matching, so requiring one would be a dead end for an unsure user.
      hint={
        draft.goals.length === 0
          ? 'Optional — you can skip this one.'
          : `${draft.goals.length} selected`
      }
      canAdvance
      nextLabel={draft.goals.length === 0 ? 'Skip' : 'Continue'}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/age')}
    >
      <View style={styles.grid}>
        {GOALS.map((goal) => (
          <Chip
            key={goal}
            label={GOAL_LABELS[goal]}
            selected={draft.goals.includes(goal)}
            onPress={() => toggle(goal)}
          />
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
