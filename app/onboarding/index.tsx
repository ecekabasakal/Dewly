import { router } from 'expo-router';

import { OnboardingStep, OptionRow } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import { SKIN_TYPES, SKIN_TYPE_LABELS, type SkinType } from '../../types/profile';

const DESCRIPTIONS: Record<SkinType, string> = {
  dry: 'Feels tight, flaky patches',
  oily: 'Shiny by midday, visible pores',
  combination: 'Oily T-zone, dry cheeks',
  sensitive: 'Reacts easily, stings or flushes',
  normal: 'Balanced, few complaints',
};

export default function SkinTypeStep() {
  const { draft, updateDraft } = useProfile();

  return (
    <OnboardingStep
      step={1}
      title="What's your skin type?"
      subtitle="Pick the one that sounds most like your skin on an average day."
      canAdvance={draft.skinType !== undefined}
      onNext={() => router.push('/onboarding/concerns')}
    >
      {SKIN_TYPES.map((type) => (
        <OptionRow
          key={type}
          label={SKIN_TYPE_LABELS[type]}
          description={DESCRIPTIONS[type]}
          selected={draft.skinType === type}
          onPress={() => updateDraft({ skinType: type })}
        />
      ))}
    </OnboardingStep>
  );
}
