import { router } from 'expo-router';

import { OnboardingStep, OptionRow } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import { AGE_RANGES, AGE_RANGE_LABELS } from '../../types/profile';

export default function AgeStep() {
  const { draft, updateDraft } = useProfile();

  return (
    <OnboardingStep
      step={4}
      title="How old are you?"
      subtitle="Some actives — retinoids especially — come with age-related guidance."
      canAdvance={draft.ageRange !== undefined}
      onBack={() => router.back()}
      onNext={() => router.push('/onboarding/sensitivity')}
    >
      {AGE_RANGES.map((range) => (
        <OptionRow
          key={range}
          label={AGE_RANGE_LABELS[range]}
          selected={draft.ageRange === range}
          onPress={() => updateDraft({ ageRange: range })}
        />
      ))}
    </OnboardingStep>
  );
}
