import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { Chip, OnboardingStep } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import { GOALS, GOAL_LABELS, type Goal } from '../../types/profile';

const COPY = {
  en: {
    title: 'What are you hoping for?',
    subtitle: 'Your goals shape how routines get suggested later.',
    optional: 'Optional — you can skip this one.',
    selected: (n: number) => `${n} selected`,
    skip: 'Skip',
    next: 'Continue',
  },
  tr: {
    title: 'Ne elde etmek istiyorsun?',
    subtitle: 'Hedeflerin, ilerideki rutin önerilerini şekillendirir.',
    optional: 'İsteğe bağlı — bu adımı atlayabilirsin.',
    selected: (n: number) => `${n} seçildi`,
    skip: 'Atla',
    next: 'Devam',
  },
} as const;

export default function GoalsStep() {
  const { draft, updateDraft } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  const toggle = (goal: Goal) => {
    const next = draft.goals.includes(goal)
      ? draft.goals.filter((g) => g !== goal)
      : [...draft.goals, goal];
    updateDraft({ goals: next });
  };

  return (
    <OnboardingStep
      step={3}
      title={t.title}
      subtitle={t.subtitle}
      // Goals are optional: unlike concerns they do not gate any Phase 5
      // matching, so requiring one would be a dead end for an unsure user.
      hint={draft.goals.length === 0 ? t.optional : t.selected(draft.goals.length)}
      canAdvance
      nextLabel={draft.goals.length === 0 ? t.skip : t.next}
      onBack={() => goBackOr('/onboarding')}
      onNext={() => router.push('/onboarding/age')}
    >
      <View style={styles.grid}>
        {GOALS.map((goal) => (
          <Chip
            key={goal}
            label={GOAL_LABELS[language][goal]}
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
