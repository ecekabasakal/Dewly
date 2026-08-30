import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Badge, Button, Screen, Text } from '../../components';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useLanguage } from '../../hooks/useLanguage';
import { appErrorMessage } from '../../lib/errors';
import { parseInciList } from '../../lib/inci';
import { colors, fonts, radius, spacing, typography } from '../../theme';

const COPY = {
  en: {
    title: 'Analyze a product',
    subtitle:
      'Paste the ingredient list from the back of the bottle. Commas or new lines both work.',
    placeholder: 'Aqua, Glycerin, Niacinamide…',
    inputLabel: 'Ingredient list',
    empty: 'Nothing to analyze yet',
    detected: (n: number) => `${n} ingredient${n === 1 ? '' : 's'} detected`,
    clear: 'Clear',
    analyzing: 'Analyzing…',
    analyze: 'Analyze',
    noBottle: 'Not near a bottle?',
    useSample: 'Use a sample list',
    failedBadge: 'COULDN’T ANALYZE',
    retry: 'Try again',
  },
  tr: {
    title: 'Bir ürünü analiz et',
    subtitle:
      'Şişenin arkasındaki içerik listesini yapıştır. Virgül de satır sonu da olur.',
    placeholder: 'Aqua, Glycerin, Niacinamide…',
    inputLabel: 'İçerik listesi',
    empty: 'Henüz analiz edilecek bir şey yok',
    detected: (n: number) => `${n} içerik bulundu`,
    clear: 'Temizle',
    analyzing: 'Analiz ediliyor…',
    analyze: 'Analiz et',
    noBottle: 'Yanında ürün yok mu?',
    useSample: 'Örnek liste kullan',
    failedBadge: 'ANALİZ EDİLEMEDİ',
    retry: 'Tekrar dene',
  },
} as const;

const SAMPLE = `Aqua, Glycerin, Niacinamide, Butylene Glycol, Centella Asiatica Extract, Sodium Hyaluronate, Panthenol, Squalane, Cocos Nucifera (Coconut) Oil, Tocopherol, Parfum, Limonene, Phenoxyethanol`;

export default function PasteScreen() {
  const [text, setText] = useState('');
  const { analyze, status, error } = useAnalysis();
  const { language } = useLanguage();
  const t = COPY[language];

  const tokenCount = parseInciList(text).length;
  const isLoading = status === 'loading';
  const canSubmit = tokenCount > 0 && !isLoading;

  // On failure we deliberately stay put. `useAnalysis` records the error, and
  // the block below renders it inline — previously the error was only readable
  // on the results screen, which this never navigated to, so a failed analysis
  // looked like a dead button.
  const run = async () => {
    const ok = await analyze(text);
    if (ok) router.push('/results');
  };

  const failed = status === 'error';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="h1">{t.title}</Text>
          <Text variant="body" tone="muted">
            {t.subtitle}
          </Text>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder={t.placeholder}
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t.inputLabel}
        />

        <View style={styles.meta}>
          <Text variant="caption" tone="muted">
            {tokenCount === 0 ? t.empty : t.detected(tokenCount)}
          </Text>
          {text.length > 0 ? (
            // Was a bare <Text onPress>: the tappable area was the glyphs
            // themselves, about 30x18pt. Now a Pressable with real padding.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.clear}
              onPress={() => setText('')}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Text variant="caption" tone="primary">
                {t.clear}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Button
          label={isLoading ? t.analyzing : t.analyze}
          onPress={run}
          disabled={!canSubmit}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.submit}
        />

        {failed ? (
          <View style={styles.error}>
            <Badge label={t.failedBadge} tone="danger" />
            <Text variant="caption" style={styles.errorText}>
              {appErrorMessage(error ?? 'unknown', language)}
            </Text>
            <Button label={t.retry} variant="secondary" onPress={run} />
          </View>
        ) : null}

        <View style={styles.sampleBlock}>
          <Text variant="caption" tone="muted">
            {t.noBottle}
          </Text>
          <Button
            label={t.useSample}
            variant="secondary"
            onPress={() => setText(SAMPLE)}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xl,
    minHeight: 180,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
  },
  meta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Room for the 44pt Clear button without shifting the counter.
    minHeight: 44,
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    // Cancels the padding so the label stays flush with the input's right edge.
    marginRight: -spacing.sm,
  },
  submit: { marginTop: spacing.lg },
  error: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.status.danger.bg,
    borderColor: colors.status.danger.border,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  errorText: { color: colors.text },
  sampleBlock: { marginTop: spacing['2xl'], gap: spacing.sm, alignItems: 'flex-start' },
});
