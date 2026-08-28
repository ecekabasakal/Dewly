import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { OnboardingStep, OptionRow } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_LEVELS,
  type SensitivityLevel,
} from '../../types/profile';

const DESCRIPTIONS: Record<SensitivityLevel, string> = {
  'not-sensitive': 'New products rarely cause a reaction',
  slightly: 'The occasional sting or patch of redness',
  very: 'Reacts often — I introduce actives slowly',
};

export default function SensitivityStep() {
  const { draft, updateDraft, completeOnboarding } = useProfile();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      // `replace`, not `push`: the finished flow should not be reachable via
      // the back gesture from Home.
      router.replace('/home');
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Couldn't save your profile",
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <OnboardingStep
      step={5}
      title="How sensitive is your skin?"
      subtitle="This sets how cautiously Dewly warns you about strong actives."
      canAdvance={draft.sensitivity !== undefined && !saving}
      nextLabel={saving ? 'Saving…' : 'Finish'}
      onBack={() => goBackOr('/onboarding')}
      onNext={finish}
    >
      {SENSITIVITY_LEVELS.map((level) => (
        <OptionRow
          key={level}
          label={SENSITIVITY_LABELS[level]}
          description={DESCRIPTIONS[level]}
          selected={draft.sensitivity === level}
          onPress={() => updateDraft({ sensitivity: level })}
        />
      ))}
    </OnboardingStep>
  );
}
