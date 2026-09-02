import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOr } from '../lib/navigation';

import {
  Badge,
  BrandTile,
  Button,
  Card,
  Chip,
  ErrorState,
  Screen,
  Text,
} from '../components';
import { TimingEvidence } from '../components/TimingEvidence';
import { showAlert } from '../lib/alert';
import { useAnalysis } from '../hooks/useAnalysis';
import { useLanguage } from '../hooks/useLanguage';
import { useShelf } from '../hooks/useShelf';
import { messageFor } from '../lib/errors';
import { parseInciList, resolveTokens } from '../lib/inci';
import { lookupBarcode, OBF_ATTRIBUTION, type ObfProduct } from '../lib/obf';
import { findCatalogueIdByBarcode } from '../lib/supabase-shelf-store';
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
    saveFailedTitle: "Couldn't save",
    ok: 'OK',
    fromObf: 'Pulled from Open Beauty Facts — check everything and save.',
    obfLoading: 'Fetching the product…',
    obfFailedTitle: "Couldn't reach Open Beauty Facts",
    obfMissingTitle: 'Product not found',
    obfMissingBody:
      "That barcode isn't in Open Beauty Facts. You can still add the product by hand.",
    obfRetry: 'Try again',
    obfManual: 'Add it manually instead',
    obfBack: 'Back to search',
    obfNoIngredients:
      'This record has no ingredient list. The name and brand will still be saved — paste the list on the Analyze screen later.',
    obfResolved: (matched: number, total: number) =>
      `${matched} of ${total} ingredients recognised and saved.`,
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
    saveFailedTitle: 'Kaydedilemedi',
    ok: 'Tamam',
    fromObf: 'Open Beauty Facts’ten alındı — kontrol edip kaydet.',
    obfLoading: 'Ürün getiriliyor…',
    obfFailedTitle: 'Open Beauty Facts’e ulaşılamadı',
    obfMissingTitle: 'Ürün bulunamadı',
    obfMissingBody:
      'Bu barkod Open Beauty Facts’te yok. Ürünü yine de elle ekleyebilirsin.',
    obfRetry: 'Tekrar dene',
    obfManual: 'Bunun yerine elle ekle',
    obfBack: 'Aramaya dön',
    obfNoIngredients:
      'Bu kayıtta içerik listesi yok. Adı ve markası yine de kaydedilecek — listeyi sonra Analiz ekranında yapıştırabilirsin.',
    obfResolved: (matched: number, total: number) =>
      `${total} içerikten ${matched} tanesi tanındı ve kaydedildi.`,
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
  const { id, source, barcode } = useLocalSearchParams<{
    id?: string;
    source?: string;
    barcode?: string;
  }>();
  const { getProduct, status, reload } = useShelf();
  const fromObf = source === 'obf' && typeof barcode === 'string' && barcode.length > 0;

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.gate}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // Editing against a shelf we failed to read would save a product built from
  // blank initialisers, and the guarded store would reject the write anyway.
  if (status === 'failed') {
    return (
      <Screen scroll>
        <ErrorState onRetry={() => void reload()} />
      </Screen>
    );
  }

  const editing = id ? getProduct(id) : undefined;

  // Only the barcode travels in the URL, and the product is re-fetched here.
  // The alternative — serialising name, brand and a 2 KB ingredient list
  // into query params — breaks on web (URL length) and loses everything on a
  // reload. A barcode round-trips: pasting /product?source=obf&barcode=… into a
  // browser rebuilds the whole screen.
  if (fromObf) {
    return <ObfProductLoader barcode={barcode} />;
  }

  return (
    <ProductForm
      // Remount if the target product changes, so initialisers re-run.
      key={editing?.id ?? 'new'}
      editing={editing}
      fromAnalysis={source === 'analysis'}
    />
  );
}

/**
 * Fetches one Open Beauty Facts product, then mounts the ordinary form with it.
 *
 * Kept separate from `ProductForm` so the form still seeds its state from
 * `useState` initialisers that run exactly once — the same reason the shelf is
 * gated above. Mounting the form first and filling it in from an effect would
 * fight the "user has touched this field" flags.
 */
function ObfProductLoader({ barcode }: { barcode: string }) {
  const { language } = useLanguage();
  const t = COPY[language];

  const [product, setProduct] = useState<ObfProduct | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    lookupBarcode(barcode)
      .then((found) => {
        if (cancelled) return;
        setProduct(found);
        // A miss is not a failure: OBF simply does not have this product.
        setState(found ? 'ready' : 'missing');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught);
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [barcode, attempt]);

  if (state === 'loading') {
    return (
      <Screen>
        <View style={styles.gate}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption" tone="muted">
            {t.obfLoading}
          </Text>
        </View>
      </Screen>
    );
  }

  if (state !== 'ready' || !product) {
    const failed = state === 'failed';
    return (
      <Screen scroll>
        <Card style={styles.obfProblem}>
          <Badge label="!" tone={failed ? 'danger' : 'warning'} />
          <Text variant="h2">{failed ? t.obfFailedTitle : t.obfMissingTitle}</Text>
          <Text variant="body" tone="muted">
            {failed ? messageFor(error, language) : t.obfMissingBody}
          </Text>
          <View style={styles.obfProblemActions}>
            {failed ? (
              <Button
                label={t.obfRetry}
                variant="secondary"
                onPress={() => setAttempt((n) => n + 1)}
              />
            ) : null}
            <Button
              label={t.obfManual}
              variant="secondary"
              onPress={() => router.replace('/product')}
            />
            <Button
              label={t.obfBack}
              variant="secondary"
              onPress={() => router.replace('/obf-search')}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  return <ProductForm key={product.barcode} editing={undefined} fromAnalysis={false} obf={product} />;
}

function ProductForm({
  editing,
  fromAnalysis,
  obf,
}: {
  editing: ShelfProduct | undefined;
  fromAnalysis: boolean;
  /** Set when the product came from the Open Beauty Facts search. */
  obf?: ObfProduct;
}) {
  const { addProduct, updateProduct } = useShelf();
  const { result } = useAnalysis();

  // Ingredients carried over from an analysis, used for the fallback guess and
  // stored on the product for Phase 7's conflict engine.
  const analysisIngredients = useMemo(
    () => (fromAnalysis ? (result?.matched ?? []).map((m) => m.ingredient.inci_name) : []),
    [fromAnalysis, result]
  );

  /**
   * OBF's ingredient text put through the SAME Phase 5 pipeline as a pasted
   * list — `parseInciList` then `resolveTokens`, both pure and offline. Nothing
   * bespoke: an OBF list and a hand-pasted one resolve identically, so the step
   * guess and the conflict engine see one kind of input.
   *
   * OBF text is messy in ways a label is not. Some contributors flatten
   * "Caprylic/Capric Triglyceride" into two comma-separated fragments, some
   * paste a whole paragraph. Unresolvable tokens are simply dropped here and
   * the count is reported below, so the user can see how much was understood.
   */
  const obfResolution = useMemo(() => {
    if (!obf?.ingredientsText) return { names: [] as string[], total: 0 };
    const tokens = parseInciList(obf.ingredientsText);
    const names = resolveTokens(tokens)
      .map((r) => r.canonical)
      .filter((n): n is string => n !== null);
    // De-duplicated: OBF lists repeat ingredients more often than labels do.
    return { names: [...new Set(names)], total: tokens.length };
  }, [obf]);

  const [name, setName] = useState(editing?.name ?? obf?.name ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? obf?.brand ?? '');
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
  const ingredientNames =
    editing?.ingredientNames ?? (obf ? obfResolution.names : analysisIngredients);
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
      // Preserved on edit so re-saving does not strip the product's origin.
      barcode: editing?.barcode ?? obf?.barcode ?? null,
    };

    // Wrapped because `setSaving(false)` used to exist only on the success
    // path: a rejected write left the button spinning forever with no message,
    // and the rejection surfaced as an unhandled promise.
    try {
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        // `products.barcode` is unique and the catalogue is shared, so if
        // somebody has already added this bottle we join their row rather than
        // minting a second id that the constraint would reject.
        const existingId = obf ? await findCatalogueIdByBarcode(obf.barcode) : null;
        await addProduct(existingId ? { ...payload, id: existingId } : payload);
      }
      router.replace('/shelf');
    } catch (caught) {
      setSaving(false);
      showAlert(t.saveFailedTitle, messageFor(caught, language), [{ text: t.ok }]);
    }
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
            {obf ? t.fromObf : fromAnalysis && !editing ? t.fromAnalysis : t.subtitle}
          </Text>
        </View>

        {/* The brand tile, plus an honest account of how much of the OBF
            record we could use. Both outcomes are common enough to state. */}
        {obf ? (
          <Card style={styles.obfCard}>
            <View style={styles.obfRow}>
              <BrandTile brand={obf.brand} name={obf.name} size={96} />
              <View style={styles.obfMeta}>
                <Text variant="caption" tone="muted">
                  {obf.barcode}
                </Text>
                <Text variant="caption" tone="muted">
                  {obf.ingredientsText
                    ? t.obfResolved(obfResolution.names.length, obfResolution.total)
                    : t.obfNoIngredients}
                </Text>
              </View>
            </View>
            <Text variant="caption" tone="muted">
              {OBF_ATTRIBUTION}
            </Text>
          </Card>
        ) : null}

        {editing ? (
          <View style={styles.editImage}>
            <BrandTile brand={editing.brand} name={editing.name} size={96} />
          </View>
        ) : null}

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

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t.whyLink}
        onPress={() => router.push('/timings')}
        hitSlop={8}
        style={styles.whyLink}
      >
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
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  obfCard: { marginTop: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  obfRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  obfMeta: { flex: 1, gap: spacing.xs },
  obfProblem: { marginTop: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  obfProblemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editImage: { marginTop: spacing.lg, alignItems: 'flex-start' },
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
  // Had marginTop only, so the target was the height of one caption line.
  whyLink: {
    marginTop: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingRight: spacing.sm,
  },
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
