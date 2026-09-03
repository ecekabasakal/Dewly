import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { OnboardingStep, OptionRow } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { AGE_RANGES, AGE_RANGE_LABELS } from '../../types/profile';

const COPY = {
  en: {
    title: 'How old are you?',
    subtitle: 'Some actives — retinoids especially — come with age-related guidance.',
  },
  tr: {
    title: 'Kaç yaşındasın?',
    subtitle:
      'Bazı aktifler — özellikle retinoidler — yaşa bağlı yönlendirmelerle birlikte gelir.',
  },
} as const;

export default function AgeStep() {
  const { draft, updateDraft } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <OnboardingStep
      step={5}
      title={t.title}
      subtitle={t.subtitle}
      canAdvance={draft.ageRange !== undefined}
      onBack={() => goBackOr('/onboarding/goals')}
      onNext={() => router.push('/onboarding/sensitivity')}
    >
      {AGE_RANGES.map((range) => (
        <OptionRow
          key={range}
          label={AGE_RANGE_LABELS[language][range]}
          selected={draft.ageRange === range}
          onPress={() => updateDraft({ ageRange: range })}
        />
      ))}
    </OnboardingStep>
  );
}
