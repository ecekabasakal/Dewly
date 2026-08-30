import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOr } from '../lib/navigation';

import { Badge, Button, Card, Chip, Screen, Text } from '../components';
import { TimingEvidence } from '../components/TimingEvidence';
import { useAnalysis } from '../hooks/useAnalysis';
import { useLanguage } from '../hooks/useLanguage';
import { useShelf } from '../hooks/useShelf';
import { guessReasonText, guessStep, isAmOnlyStep } from '../lib/step-guess';
import {
  resolveRule,
  suggestTiming,
  timingDisclaimer,
  type TimingMatch,
} from '../lib/timing';
import type { Language } from '../lib/language';
import { colors, fonts, radius, spacing, typography } from '../theme';
import {
  STEP_LABELS,
  STEP_ORDER,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_OPTIONS,
  type ProductTimeOfDay,
  type ShelfProduct,
  type StepType,
} from '../types/shelf';

const COPY = {
  en: {
    editTitle: 'Edit product',
    addTitle: 'Add a product',
    fromAnalysis: 'Carried over from your analysis — check the step and save.',
    subtitle: 'Name it, confirm the step, and Dewly slots it into your routine.',
    nameLabel: 'Product name',
    namePlaceholder: 'e.g. Cleansing Oil',
    brandLabel: 'Brand (optional)',
    brandPlaceholder: 'e.g. Beauty of Joseon',
    guessedBadge: 'GUESSED',
    guessedFromName: 'from the product name',
    guessedFromIngredients: 'from the ingredients',
    looksLike: 'Looks like a',
    changeIfWrong: "Change it below if that's wrong.",
    stepLabel: 'Step',
    whenLabel: 'When do you use it?',
    headsUpBadge: 'HEADS UP',
    spfAtNight: (time: string) =>
      `SPF only works during the day. Saving this as ${time} will flag it in your evening routine.`,
    ingredientNote: (n: number) => `${n} ingredients will be saved with this product.`,
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    addToShelf: 'Add to shelf',
  },
  tr: {
    editTitle: 'Ürünü düzenle',
    addTitle: 'Ürün ekle',
    fromAnalysis: 'Analizinden aktarıldı — adımı kontrol edip kaydet.',
    subtitle: 'Adını yaz, adımı onayla; Dewly onu rutinine yerleştirsin.',
    nameLabel: 'Ürün adı',
    namePlaceholder: 'örn. Temizleme Yağı',
    brandLabel: 'Marka (isteğe bağlı)',
    brandPlaceholder: 'örn. Beauty of Joseon',
    guessedBadge: 'TAHMİN',
    guessedFromName: 'ürün adından',
    guessedFromIngredients: 'içeriklerden',
    looksLike: 'Bu bir',
    changeIfWrong: 'Yanlışsa aşağıdan değiştirebilirsin.',
    stepLabel: 'Adım',
    whenLabel: 'Ne zaman kullanıyorsun?',
    headsUpBadge: 'DİKKAT',
    spfAtNight: (time: string) =>
      `Güneş koruyucu yalnızca gündüz işe yarar. ${time} olarak kaydedersen akşam rutininde işaretlenir.`,
    ingredientNote: (n: number) => `Bu ürünle birlikte ${n} içerik kaydedilecek.`,
    cancel: 'İptal',
    saveChanges: 'Değişiklikleri kaydet',
    addToShelf: 'Rafa ekle',
  },
} as const;

/**
 * Gate on the shelf being loaded before mounting the form.
 *
 * The form seeds its state from `editing` via `useState` initialisers, which
 * run once. If it mounted while the shelf was still loading, `editing` would be
 * undefined and every field would initialise blank — the product would appear
 * to load (the title says "Edit") but the name, brand and time would be lost,
 * and saving would silently overwrite them.
 */
export default function AddProductScreen() {
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const { getProduct, isLoaded } = useShelf();

  if (!isLoaded) return null;

  const editing = id ? getProduct(id) : undefined;

  return (
    <ProductForm
      // Remount if the target product changes, so initialisers re-run.
      key={editing?.id ?? 'new'}
      editing={editing}
      fromAnalysis={source === 'analysis'}
    />
  );
}

function ProductForm({
  editing,
  fromAnalysis,
}: {
  editing: ShelfProduct | undefined;
  fromAnalysis: boolean;
}) {
  const { addProduct, updateProduct } = useShelf();
  const { result } = useAnalysis();

  // Ingredients carried over from an analysis, used for the fallback guess and
  // stored on the product for Phase 7's conflict engine.
  const analysisIngredients = useMemo(
    () => (fromAnalysis ? (result?.matched ?? []).map((m) => m.ingredient.inci_name) : []),
    [fromAnalysis, result]
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [stepType, setStepType] = useState<StepType | null>(editing?.stepType ?? null);
  const [timeOfDay, setTimeOfDay] = useState<ProductTimeOfDay>(editing?.timeOfDay ?? 'both');
  const [saving, setSaving] = useState(false);
  // Once the user picks a step themselves, stop overwriting it as they keep typing.
  const [stepTouched, setStepTouched] = useState(editing !== undefined);
  // Timing has its own "touched" flag: overriding the step shouldn't freeze the
  // timing suggestion, and vice versa.
  const [timeTouched, setTimeTouched] = useState(editing !== undefined);

  const { language } = useLanguage();
  const t = COPY[language];
  const ingredientNames = editing?.ingredientNames ?? analysisIngredients;
  const guess = useMemo(
    () => guessStep(name, ingredientNames),
    [name, ingredientNames]
  );
  const timing = useMemo(
    () => suggestTiming(name, ingredientNames),
    [name, ingredientNames]
  );

  // Apply the guess while the user hasn't overridden it.
  useEffect(() => {
    if (stepTouched) return;
    setStepType(guess.stepType);
  }, [guess.stepType, stepTouched]);

  // Same for the timing suggestion.
  useEffect(() => {
    if (timeTouched) return;
    setTimeOfDay(timing.time);
  }, [timing.time, timeTouched]);

  // SPF is a morning step — steer the default rather than silently allowing PM.
  useEffect(() => {
    if (stepType && isAmOnlyStep(stepType) && timeOfDay !== 'am') {
      setTimeOfDay('am');
    }
    // Only when the step changes; the user may still override afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepType]);

  const spfAtNight = stepType != null && isAmOnlyStep(stepType) && timeOfDay !== 'am';
  const canSave = name.trim().length > 0 && stepType !== null && !saving;

  const save = async () => {
    if (!stepType || !name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      stepType,
      timeOfDay,
      ingredientNames,
    };

    if (editing) {
      await updateProduct(editing.id, payload);
    } else {
      await addProduct(payload);
    }
    router.replace('/shelf');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="h1">{editing ? t.editTitle : t.addTitle}</Text>
          <Text variant="body" tone="muted">
            {fromAnalysis && !editing ? t.fromAnalysis : t.subtitle}
          </Text>
        </View>

        <Field label={t.nameLabel}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.namePlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
            accessibilityLabel={t.nameLabel}
          />
        </Field>

        <Field label={t.brandLabel}>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder={t.brandPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
            accessibilityLabel={t.brandLabel}
          />
        </Field>

        {guess.stepType && !stepTouched ? (
          <Card style={styles.guessCard}>
            <View style={styles.guessHeader}>
              <Badge label={t.guessedBadge} tone="info" />
              <Text variant="caption" tone="muted">
                {guess.source === 'name' ? t.guessedFromName : t.guessedFromIngredients}
              </Text>
            </View>
            <Text variant="body">
              {t.looksLike}{' '}
              <Text style={styles.bold}>{STEP_LABELS[language][guess.stepType]}</Text>
              {guess.reason ? ` — ${guessReasonText(guess.reason, language)}.` : '.'}
            </Text>
            <Text variant="caption" tone="muted">
              {t.changeIfWrong}
            </Text>
          </Card>
        ) : null}

        <Field label={t.stepLabel}>
          <View style={styles.grid}>
            {STEP_ORDER.map((step) => (
              <Chip
                key={step}
                label={STEP_LABELS[language][step]}
                selected={stepType === step}
                onPress={() => {
                  setStepTouched(true);
                  setStepType(step);
                }}
              />
            ))}
          </View>
        </Field>

        <Field label={t.whenLabel}>
          <View style={styles.grid}>
            {TIME_OF_DAY_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={TIME_OF_DAY_LABELS[language][option]}
                selected={timeOfDay === option}
                onPress={() => {
                  setTimeTouched(true);
                  setTimeOfDay(option);
                }}
              />
            ))}
          </View>
        </Field>

        <TimingSuggestion
          timing={timing}
          language={language}
          overridden={timeTouched && timing.rule !== null && timeOfDay !== timing.time}
        />

        {spfAtNight ? (
          <View style={styles.warning}>
            <Badge label={t.headsUpBadge} tone="warning" />
            <Text variant="caption" style={styles.warningText}>
              {t.spfAtNight(TIME_OF_DAY_LABELS[language][timeOfDay])}
            </Text>
          </View>
        ) : null}

        {ingredientNames.length > 0 ? (
          <Text variant="caption" tone="muted" style={styles.ingredientNote}>
            {t.ingredientNote(ingredientNames.length)}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button label={t.cancel} variant="secondary" onPress={() => goBackOr('/shelf')} />
          <Button
            label={editing ? t.saveChanges : t.addToShelf}
            onPress={save}
            disabled={!canSave}
            loading={saving}
            style={styles.save}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const TIMING_COPY = {
  en: {
    suggested: (time: string) => `Suggested: ${time}`,
    noRule: 'No timing rule applies — most products work morning or night.',
    fromIngredient: (value: string) => `Because this contains ${value}.`,
    fromName: (value: string) => `Because the name mentions “${value}”.`,
    overridden: "You've chosen a different time. That's fine — this is guidance, not a lock.",
    whyLink: 'Why these timings?',
  },
  tr: {
    suggested: (time: string) => `Önerilen: ${time}`,
    noRule: 'Uygun bir zamanlama kuralı yok — çoğu ürün sabah da akşam da kullanılabilir.',
    fromIngredient: (value: string) => `Çünkü içeriğinde ${value} var.`,
    fromName: (value: string) => `Çünkü adında “${value}” geçiyor.`,
    overridden: 'Farklı bir zaman seçtiniz. Sorun değil — bu bir yönlendirme, zorunluluk değil.',
    whyLink: 'Bu zamanlamalar neden?',
  },
} as const;

/**
 * Inline evidence for the suggested time. Always rendered, including the
 * no-rule case — "nothing applies here" is itself useful information, and
 * hiding the block would make the feature feel intermittent.
 */
function TimingSuggestion({
  timing,
  language,
  overridden,
}: {
  timing: TimingMatch;
  language: Language;
  overridden: boolean;
}) {
  const t = TIMING_COPY[language];
  const resolved = timing.rule ? resolveRule(timing.rule, language) : null;

  return (
    <Card style={styles.timingCard}>
      <View style={styles.timingHeader}>
        <Text variant="h2">
          {t.suggested(TIME_OF_DAY_LABELS[language][timing.time])}
        </Text>
      </View>

      {resolved ? (
        <>
          {timing.matchedValue ? (
            <Text variant="caption" tone="muted">
              {timing.matchedOn === 'ingredient'
                ? t.fromIngredient(timing.matchedValue)
                : t.fromName(timing.matchedValue)}
            </Text>
          ) : null}
          <TimingEvidence rule={resolved} language={language} />
        </>
      ) : (
        <Text variant="caption" tone="muted">
          {t.noRule}
        </Text>
      )}

      {overridden ? (
        <Text variant="caption" tone="muted" style={styles.overridden}>
          {t.overridden}
        </Text>
      ) : null}

      <Pressable onPress={() => router.push('/timings')} style={styles.whyLink}>
        <Text variant="caption" tone="primary" style={styles.whyLinkText}>
          {t.whyLink} →
        </Text>
      </Pressable>

      <Text variant="caption" tone="muted" style={styles.disclaimer}>
        {timingDisclaimer(language)}
      </Text>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="muted" style={styles.fieldLabel}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  field: { marginTop: spacing.xl, gap: spacing.sm },
  fieldLabel: { letterSpacing: 1.2 },
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  guessCard: { marginTop: spacing.xl, gap: spacing.sm },
  guessHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bold: { fontFamily: fonts.bodySemi },
  warning: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.status.warning.bg,
    borderColor: colors.status.warning.border,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  warningText: { color: colors.text },
  ingredientNote: { marginTop: spacing.lg },
  timingCard: { marginTop: spacing.lg, gap: spacing.sm },
  timingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overridden: { marginTop: spacing.xs },
  whyLink: { marginTop: spacing.xs },
  whyLinkText: { fontFamily: fonts.bodySemi },
  disclaimer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: {
    marginTop: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  save: { flexGrow: 1, maxWidth: 220 },
});
