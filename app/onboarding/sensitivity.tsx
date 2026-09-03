import { useState } from 'react';
import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { OnboardingStep, OptionRow } from '../../components';
import { showAlert } from '../../lib/alert';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { messageFor } from '../../lib/errors';
import type { Language } from '../../lib/language';
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_LEVELS,
  type SensitivityLevel,
} from '../../types/profile';

const COPY = {
  en: {
    title: 'How sensitive is your skin?',
    subtitle: 'This sets how cautiously Dewly warns you about strong actives.',
    saving: 'Saving…',
    finish: 'Finish',
    saveFailed: "Couldn't save your profile",
    ok: 'OK',
  },
  tr: {
    title: 'Cildin ne kadar hassas?',
    subtitle: 'Bu, Dewly’nin güçlü aktifler konusunda seni ne kadar temkinli uyaracağını belirler.',
    saving: 'Kaydediliyor…',
    finish: 'Bitir',
    saveFailed: 'Profilin kaydedilemedi',
    ok: 'Tamam',
  },
} as const;

const DESCRIPTIONS: Record<Language, Record<SensitivityLevel, string>> = {
  en: {
    'not-sensitive': 'New products rarely cause a reaction',
    slightly: 'The occasional sting or patch of redness',
    very: 'Reacts often — I introduce actives slowly',
  },
  tr: {
    'not-sensitive': 'Yeni ürünler nadiren tepki yaratıyor',
    slightly: 'Arada bir yanma ya da kızarıklık oluyor',
    very: 'Sık tepki veriyor — aktifleri yavaş yavaş deniyorum',
  },
};

export default function SensitivityStep() {
  const { draft, updateDraft, completeOnboarding } = useProfile();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const t = COPY[language];

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      // `replace`, not `push`: the finished flow should not be reachable via
      // the back gesture from Home.
      router.replace('/home');
    } catch (caught) {
      setSaving(false);
      // Was `error.message` — the raw Supabase text, English even here. The
      // code maps to a translated sentence instead.
      showAlert(t.saveFailed, messageFor(caught, language), [{ text: t.ok }]);
    }
  };

  return (
    <OnboardingStep
      step={6}
      title={t.title}
      subtitle={t.subtitle}
      canAdvance={draft.sensitivity !== undefined && !saving}
      nextLabel={saving ? t.saving : t.finish}
      onBack={() => goBackOr('/onboarding/age')}
      onNext={finish}
    >
      {SENSITIVITY_LEVELS.map((level) => (
        <OptionRow
          key={level}
          label={SENSITIVITY_LABELS[language][level]}
          description={DESCRIPTIONS[language][level]}
          selected={draft.sensitivity === level}
          onPress={() => updateDraft({ sensitivity: level })}
        />
      ))}
    </OnboardingStep>
  );
}
