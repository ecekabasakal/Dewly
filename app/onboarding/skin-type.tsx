import { router } from 'expo-router';
import { goBackOr } from '../../lib/navigation';

import { OnboardingStep, OptionRow } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import type { Language } from '../../lib/language';
import { SKIN_TYPES, SKIN_TYPE_LABELS, type SkinType } from '../../types/profile';

const COPY = {
  en: {
    title: "What's your skin type?",
    subtitle: 'Pick the one that sounds most like your skin on an average day.',
  },
  tr: {
    title: 'Cilt tipin nedir?',
    subtitle: 'Ortalama bir günde cildine en çok uyanı seç.',
  },
} as const;

const DESCRIPTIONS: Record<Language, Record<SkinType, string>> = {
  en: {
    dry: 'Feels tight, flaky patches',
    oily: 'Shiny by midday, visible pores',
    combination: 'Oily T-zone, dry cheeks',
    sensitive: 'Reacts easily, stings or flushes',
    normal: 'Balanced, few complaints',
  },
  tr: {
    dry: 'Gergin hissettiriyor, pul pul dökülüyor',
    oily: 'Öğlene doğru parlıyor, gözenekler belirgin',
    combination: 'T bölgesi yağlı, yanaklar kuru',
    sensitive: 'Kolay tepki veriyor, yanma veya kızarma oluyor',
    normal: 'Dengeli, pek şikâyet yok',
  },
};

export default function SkinTypeStep() {
  const { draft, updateDraft } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <OnboardingStep
      step={2}
      title={t.title}
      subtitle={t.subtitle}
      canAdvance={draft.skinType !== undefined}
      onBack={() => goBackOr('/onboarding')}
      onNext={() => router.push('/onboarding/concerns')}
    >
      {SKIN_TYPES.map((type) => (
        <OptionRow
          key={type}
          label={SKIN_TYPE_LABELS[language][type]}
          description={DESCRIPTIONS[language][type]}
          selected={draft.skinType === type}
          onPress={() => updateDraft({ skinType: type })}
        />
      ))}
    </OnboardingStep>
  );
}
