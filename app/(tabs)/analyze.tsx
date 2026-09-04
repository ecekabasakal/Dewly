import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { recognizedSummary } from '../../components/AnalysisResult';
import {
  AnalysisResult,
  Badge,
  Button,
  Card,
  DesktopPage,
  Screen,
  Text,
} from '../../components';
import { NothingRecognized } from '../results';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useIsWide } from '../../hooks/useLayout';
import { useLanguage } from '../../hooks/useLanguage';
import { appErrorMessage, type AppErrorCode } from '../../lib/errors';
import { parseInciList } from '../../lib/inci';
import type { AnalysisResult as AnalysisResultData } from '../../lib/analysis';
import type { Language } from '../../lib/language';
import {
  colors,
  desktopContentWidth,
  fonts,
  radius,
  resultsGridColumns,
  spacing,
  typography,
} from '../../theme';

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
    lookupHint: "Or let us fetch the list for you, if the product is in Open Beauty Facts.",
    lookup: 'Look up a product online',
    failedBadge: 'COULDN’T ANALYZE',
    retry: 'Try again',
    resultsTitle: "What's in it",
    addToShelf: 'Add to my shelf',
    awaitingTitle: 'Nothing analyzed yet',
    awaitingBody:
      'Paste a list above and the breakdown appears here — every ingredient Dewly recognises, what it does, and which of your concerns it targets.',
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
    lookupHint: 'Ya da ürün Open Beauty Facts’te varsa listeyi biz getirelim.',
    lookup: 'Ürünü çevrimiçi ara',
    failedBadge: 'ANALİZ EDİLEMEDİ',
    retry: 'Tekrar dene',
    resultsTitle: 'İçinde ne var',
    addToShelf: 'Rafıma ekle',
    awaitingTitle: 'Henüz bir analiz yok',
    awaitingBody:
      'Yukarıya bir liste yapıştır; Dewly’nin tanıdığı her içerik, ne işe yaradığı ve hangi endişeni hedeflediği burada görünsün.',
  },
} as const;

const SAMPLE = `Aqua, Glycerin, Niacinamide, Butylene Glycol, Centella Asiatica Extract, Sodium Hyaluronate, Panthenol, Squalane, Cocos Nucifera (Coconut) Oil, Tocopherol, Parfum, Limonene, Phenoxyethanol`;

export default function PasteScreen() {
  const [text, setText] = useState('');
  const { analyze, status, error, result } = useAnalysis();
  const { language } = useLanguage();
  const isWide = useIsWide();
  const { width } = useWindowDimensions();
  const t = COPY[language];

  const tokenCount = parseInciList(text).length;
  const isLoading = status === 'loading';
  const canSubmit = tokenCount > 0 && !isLoading;

  // On failure we deliberately stay put. `useAnalysis` records the error, and
  // the block below renders it inline — previously the error was only readable
  // on the results screen, which this never navigated to, so a failed analysis
  // looked like a dead button.
  //
  // On desktop it stays put on SUCCESS too: the results render beside the input
  // rather than on a pushed route. `/results` is a root route, so navigating
  // there would replace the whole window including the sidebar — and keeping
  // the box on screen means "analyze another" is just editing it.
  const run = async () => {
    const ok = await analyze(text);
    if (ok && !isWide) router.push('/results');
  };

  const failed = status === 'error';

  if (isWide) {
    return (
      <AnalyzeDesktop
        text={text}
        setText={setText}
        run={run}
        canSubmit={canSubmit}
        isLoading={isLoading}
        failed={failed}
        error={error}
        result={result}
        tokenCount={tokenCount}
        columns={resultsGridColumns(desktopContentWidth(width))}
        language={language}
      />
    );
  }

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
          <Text variant="caption" tone="muted">
            {t.lookupHint}
          </Text>
          <Button
            label={t.lookup}
            variant="secondary"
            onPress={() => router.push('/obf-search')}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/**
 * Desktop Analyze: the input on top, the results filling the width below.
 *
 * Input on top rather than in a left column, deliberately. The results are the
 * point of this screen and they want horizontal room — a 320px input rail would
 * cost the grid a whole column at the 900 breakpoint. On top it is a compact
 * card that scrolls away, and the grid gets the full content width.
 *
 * The box stays mounted with its text in it, so re-analyzing an edited list is
 * one click rather than a round trip through another screen.
 */
function AnalyzeDesktop({
  text,
  setText,
  run,
  canSubmit,
  isLoading,
  failed,
  error,
  result,
  tokenCount,
  columns,
  language,
}: {
  text: string;
  setText: (next: string) => void;
  run: () => void;
  canSubmit: boolean;
  isLoading: boolean;
  failed: boolean;
  error: AppErrorCode | null;
  result: AnalysisResultData | null;
  tokenCount: number;
  columns: number;
  language: Language;
}) {
  const t = COPY[language];

  return (
    <DesktopPage>
      <View style={styles.wideHeader}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {t.subtitle}
        </Text>
      </View>

      <Card style={styles.wideInputCard}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder={t.placeholder}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.wideInput]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t.inputLabel}
        />

        <View style={styles.wideActions}>
          <Text variant="caption" tone="muted" style={styles.wideCount}>
            {tokenCount === 0 ? t.empty : t.detected(tokenCount)}
          </Text>
          {text.length > 0 ? (
            <Button label={t.clear} variant="secondary" onPress={() => setText('')} />
          ) : (
            <Button label={t.useSample} variant="secondary" onPress={() => setText(SAMPLE)} />
          )}
          <Button label={t.lookup} variant="secondary" onPress={() => router.push('/obf-search')} />
          <Button
            label={isLoading ? t.analyzing : t.analyze}
            onPress={run}
            disabled={!canSubmit}
            loading={isLoading}
            size="lg"
            style={styles.wideSubmit}
          />
        </View>

        {failed ? (
          <View style={styles.error}>
            <Badge label={t.failedBadge} tone="danger" />
            <Text variant="caption" style={styles.errorText}>
              {appErrorMessage(error ?? 'unknown', language)}
            </Text>
            <Button label={t.retry} variant="secondary" onPress={run} />
          </View>
        ) : null}
      </Card>

      {result && result.matched.length > 0 ? (
        <View style={styles.wideResults}>
          <View style={styles.wideResultsHeader}>
            <View style={styles.wideResultsTitle}>
              <Text variant="h2">{t.resultsTitle}</Text>
              <Text variant="caption" tone="muted">
                {recognizedSummary(result, language)}
              </Text>
            </View>
            <Button
              label={t.addToShelf}
              variant="secondary"
              onPress={() => router.push('/product?source=analysis')}
            />
          </View>
          <AnalysisResult result={result} language={language} columns={columns} />
        </View>
      ) : result ? (
        // Parsed, but nothing matched — the same explainer the phone shows,
        // rather than an empty grid under a "0 ingredients" heading.
        <View style={styles.wideResults}>
          <NothingRecognized result={result} language={language} />
        </View>
      ) : (
        <Card style={styles.wideAwaiting}>
          <Text variant="h2">{t.awaitingTitle}</Text>
          <Text variant="body" tone="muted">
            {t.awaitingBody}
          </Text>
        </Card>
      )}
    </DesktopPage>
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

  // --- desktop only ---
  wideHeader: { gap: spacing.sm },
  wideInputCard: { marginTop: spacing.xl, gap: spacing.md },
  wideInput: { marginTop: 0, minHeight: 120, alignSelf: 'stretch' },
  wideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Pushes the buttons to the right of the counter.
  wideCount: { flex: 1 },
  wideSubmit: { minWidth: 160 },
  wideResults: { marginTop: spacing['2xl'] },
  wideResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  wideResultsTitle: { flex: 1, gap: 2 },
  wideAwaiting: { marginTop: spacing['2xl'], gap: spacing.sm, alignItems: 'flex-start' },
});
