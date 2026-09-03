import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { Chip, OnboardingStep } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import { CONCERNS, CONCERN_LABELS, type Concern } from '../../types/profile';

const COPY = {
  en: {
    title: 'What would you like to work on?',
    subtitle:
      'Choose as many as apply — these drive which ingredients Dewly flags for you.',
    pickOne: 'Pick at least one to continue.',
    selected: (n: number) => `${n} selected`,
  },
  tr: {
    title: 'Neyi iyileştirmek istersin?',
    subtitle:
      'Sana uyan hepsini seç — Dewly’nin hangi içerikleri işaretleyeceğini bunlar belirler.',
    pickOne: 'Devam etmek için en az bir tane seç.',
    selected: (n: number) => `${n} seçildi`,
  },
} as const;

export default function ConcernsStep() {
  const { draft, updateDraft } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  const toggle = (concern: Concern) => {
    const next = draft.concerns.includes(concern)
      ? draft.concerns.filter((c) => c !== concern)
      : [...draft.concerns, concern];
    updateDraft({ concerns: next });
  };

  return (
    <OnboardingStep
      step={3}
      title={t.title}
      subtitle={t.subtitle}
      hint={draft.concerns.length === 0 ? t.pickOne : t.selected(draft.concerns.length)}
      canAdvance={draft.concerns.length > 0}
      onBack={() => goBackOr('/onboarding/skin-type')}
      onNext={() => router.push('/onboarding/goals')}
    >
      <View style={styles.grid}>
        {CONCERNS.map((concern) => (
          <Chip
            key={concern}
            label={CONCERN_LABELS[language][concern]}
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
