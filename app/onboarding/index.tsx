import { StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';

import { OnboardingStep } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { colors, fonts, radius, spacing, typography } from '../../theme';
import { MAX_NAME_LENGTH, normalizeDisplayName } from '../../types/profile';

const COPY = {
  en: {
    title: 'What should we call you?',
    subtitle: 'Just a first name — it only shows up on your own home screen.',
    label: 'First name',
    placeholder: 'e.g. Ece',
    hint: "Optional. You can add or change this later in Profile.",
    skip: 'Skip',
  },
  tr: {
    title: 'Sana nasıl hitap edelim?',
    subtitle: 'Sadece adın — yalnızca kendi ana sayfanda görünür.',
    label: 'Ad',
    placeholder: 'ör. Ece',
    hint: 'İsteğe bağlı. Sonradan Profil’den ekleyebilir veya değiştirebilirsin.',
    skip: 'Geç',
  },
} as const;

/**
 * Step 1 — the name.
 *
 * First because it is the one question that is not about skin: opening with
 * "what should we call you?" reads as an introduction, where opening with
 * "what's your skin type?" reads as a form.
 *
 * Optional end to end. The footer button is always enabled and simply changes
 * label — "Skip" with the field empty, "Continue" once something is typed — so
 * there is one control that always says what it will do, rather than a disabled
 * primary next to a separate skip link.
 */
export default function NameStep() {
  const { draft, updateDraft, profile } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  // Seeded from the saved profile so "Redo onboarding" arrives with the name
  // already filled in. Without this, redoing the flow to change a skin type
  // would quietly clear a name the user never touched. `draft.name` wins once
  // the field has been edited — including when it has been edited to empty,
  // which is `''` and not nullish, so clearing still works.
  const typed = draft.name ?? profile?.name ?? '';
  const hasName = normalizeDisplayName(typed) !== null;

  const advance = () => {
    // Normalised on the way out, so nothing downstream has to trim it again.
    updateDraft({ name: normalizeDisplayName(typed) });
    router.push('/onboarding/skin-type');
  };

  return (
    <OnboardingStep
      step={1}
      title={t.title}
      subtitle={t.subtitle}
      hint={t.hint}
      canAdvance
      nextLabel={hasName ? undefined : t.skip}
      onNext={advance}
    >
      <TextInput
        value={typed}
        onChangeText={(next) => updateDraft({ name: next })}
        placeholder={t.placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        maxLength={MAX_NAME_LENGTH}
        returnKeyType="done"
        onSubmitEditing={advance}
        accessibilityLabel={t.label}
      />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
  },
});
