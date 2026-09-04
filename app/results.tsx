import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { goBackOr } from '../lib/navigation';

import { AnalysisResult, Button, Card, Chip, Screen, Text } from '../components';
import { recognizedSummary } from '../components/AnalysisResult';
import { useAnalysis } from '../hooks/useAnalysis';
import { useIsWide } from '../hooks/useLayout';
import { useLanguage } from '../hooks/useLanguage';
import { appErrorMessage } from '../lib/errors';
import type { AnalysisResult as AnalysisResultData } from '../lib/analysis';
import type { Language } from '../lib/language';
import { colors, radius, spacing } from '../theme';

/**
 * Screen chrome only. Everything about the analysis itself — the summary, the
 * ingredient cards, the unmatched tokens, the disclaimer — lives in
 * `components/AnalysisResult`, which the desktop Analyze tab renders too.
 */
const UI = {
  en: {
    title: "What's in it",
    analyzeAnother: 'Analyze another',
    addToShelf: 'Add to my shelf',
    noneTitle: 'Nothing recognized',
    noneBody:
      "Dewly couldn't match any of that against its ingredient database. That usually means the text wasn't an INCI list, or it came through garbled.",
    noneTipsTitle: 'What to check',
    noneTips: [
      'Paste the "Ingredients" list from the back of the pack, not the marketing description.',
      'Keep the commas — they are how Dewly separates one ingredient from the next.',
      'Photo-to-text can mangle long INCI names; a quick reread usually spots it.',
    ] as string[],
    noneUnrecognized: 'What you pasted',
    tryAgain: 'Edit and try again',
    errorTitle: 'Something went wrong',
    errorFallback: 'Please try again.',
    back: 'Back',
  },
  tr: {
    title: 'İçinde ne var',
    analyzeAnother: 'Başka bir ürün analiz et',
    addToShelf: 'Rafıma ekle',
    noneTitle: 'Hiçbir içerik tanınmadı',
    noneBody:
      'Dewly bunların hiçbirini içerik veritabanıyla eşleştiremedi. Bu genellikle metnin bir INCI listesi olmadığı ya da bozuk geldiği anlamına gelir.',
    noneTipsTitle: 'Şunları kontrol et',
    noneTips: [
      'Ambalajın arkasındaki "İçindekiler" listesini yapıştır, tanıtım yazısını değil.',
      'Virgülleri koru — Dewly içerikleri birbirinden onlarla ayırıyor.',
      'Fotoğraftan metne çevirme uzun INCI adlarını bozabilir; hızlı bir kontrol genelde yakalar.',
    ] as string[],
    noneUnrecognized: 'Yapıştırdığın metin',
    tryAgain: 'Düzenleyip tekrar dene',
    errorTitle: 'Bir şeyler ters gitti',
    errorFallback: 'Lütfen tekrar deneyin.',
    back: 'Geri',
  },
} as const;

export default function ResultsScreen() {
  const { result, status, error } = useAnalysis();
  const { language, setLanguage } = useLanguage();
  const isWide = useIsWide();
  const t = UI[language];

  /**
   * On desktop the results are shown INLINE on the Analyze tab, so this route
   * has nothing to add — and pushing it would replace the whole window,
   * sidebar included, because `/results` is a root route rather than a tab.
   *
   * The redirect matters for more than the button that no longer navigates
   * here: `/results` is a real URL that can be bookmarked or reloaded into, and
   * it has to land somewhere coherent at every width. The analysis lives in
   * context, so `/analyze` renders it immediately.
   */
  if (isWide) return <Redirect href="/analyze" />;

  if (status === 'idle' || (!result && status !== 'error')) {
    return <Redirect href="/analyze" />;
  }

  if (status === 'error') {
    return (
      <Screen>
        <View style={styles.header}>
          <Text variant="h1">{t.errorTitle}</Text>
          <Text variant="body" tone="muted">
            {/* Was `error` — the raw Supabase message, English on every screen
                including Turkish ones. `error` is now a code we translate. */}
            {error ? appErrorMessage(error, language) : t.errorFallback}
          </Text>
          <Button label={t.back} variant="secondary" onPress={() => goBackOr('/analyze')} />
        </View>
      </Screen>
    );
  }

  if (!result) return null;

  // Nothing matched. The normal layout degrades badly here — two "0" tiles and
  // an "ALL INGREDIENTS (0)" heading over blank space — and this is the most
  // likely first-run failure, since it is what a typo'd or non-INCI paste
  // produces. Explain it and give the user a way forward instead.
  if (result.matched.length === 0) {
    return (
      <Screen scroll>
        <NothingRecognized result={result} language={language} />
        <View style={styles.actions}>
          <Button
            label={t.tryAgain}
            fullWidth
            size="lg"
            onPress={() => router.replace('/analyze')}
          />
          <Button label={t.back} variant="secondary" onPress={() => goBackOr('/analyze')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {recognizedSummary(result, language)}
        </Text>
      </View>

      <View style={styles.langRow}>
        <Chip label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} />
        <Chip label="TR" selected={language === 'tr'} onPress={() => setLanguage('tr')} />
      </View>

      {/* One column — the phone list, unchanged. */}
      <AnalysisResult result={result} language={language} />

      <View style={styles.actions}>
        {/* Carries the matched ingredients into the shelf, so the step guess can
            fall back to them when the product name is uninformative. */}
        <Button
          label={t.addToShelf}
          fullWidth
          size="lg"
          onPress={() => router.push('/product?source=analysis')}
        />
        <Button
          label={t.analyzeAnother}
          variant="secondary"
          onPress={() => router.replace('/analyze')}
        />
        {/* An explicit Back, matching product.tsx and timings.tsx. This screen
            is pushed onto the root stack with no header, so without it the only
            way out was the swipe gesture or Android's hardware button. */}
        <Button label={t.back} variant="secondary" onPress={() => goBackOr('/analyze')} />
      </View>
    </Screen>
  );
}

/**
 * The "nothing matched" explainer.
 *
 * Exported so the desktop Analyze panel shows the same thing rather than an
 * empty grid — it is the most likely first-run outcome and deserves one
 * explanation, not two.
 */
export function NothingRecognized({
  result,
  language,
}: {
  result: AnalysisResultData;
  language: Language;
}) {
  const t = UI[language];

  return (
    <>
      <View style={styles.header}>
        <Text variant="h1">{t.noneTitle}</Text>
        <Text variant="body" tone="muted">
          {t.noneBody}
        </Text>
      </View>

      <Card style={styles.noneCard}>
        <Text variant="caption" tone="muted" style={styles.sectionTitle}>
          {t.noneTipsTitle.toUpperCase()}
        </Text>
        {t.noneTips.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Text variant="caption" tone="muted" style={styles.tipBullet}>
              •
            </Text>
            <Text variant="caption" tone="muted" style={styles.tipText}>
              {tip}
            </Text>
          </View>
        ))}
      </Card>

      {/* The tokens stay visible: seeing exactly what was parsed is usually
          what makes the mistake obvious. */}
      {result.unmatched.length > 0 ? (
        <View style={styles.section}>
          <Text variant="caption" tone="muted" style={styles.sectionTitle}>
            {t.noneUnrecognized.toUpperCase()}
          </Text>
          <View style={[styles.sectionBody, styles.chipRow]}>
            {result.unmatched.map((token) => (
              <View key={`${token.index}-${token.raw}`} style={styles.unmatchedChip}>
                <Text variant="caption" tone="muted">
                  {token.raw}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  noneCard: { marginTop: spacing.xl, gap: spacing.sm },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipBullet: { lineHeight: 18 },
  tipText: { flex: 1 },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  section: { marginTop: spacing.xl },
  sectionTitle: { letterSpacing: 1.2 },
  sectionBody: { marginTop: spacing.md, gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unmatchedChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  actions: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'stretch' },
});
