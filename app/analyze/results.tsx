import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Badge, Button, Card, Chip, Screen, Text } from '../../components';
import { useAnalysis } from '../../hooks/useAnalysis';
import {
  describe,
  headsUpCopy,
  type AnalyzedIngredient,
  type HeadsUpKind,
} from '../../lib/analysis';
import type { Language } from '../../lib/language';
import { colors, radius, spacing } from '../../theme';
import { CONCERN_LABELS, type Concern } from '../../types/profile';
import type { StatusTone } from '../../theme';

const HEADS_UP_TONE: Record<HeadsUpKind, StatusTone> = {
  caution: 'warning',
  fragrance: 'warning',
  comedogenic: 'warning',
  'active-on-sensitive': 'info',
};

/**
 * Results-screen copy. Not a full i18n layer — the rest of the app is still
 * English-only (that's a v2 goal). These strings are translated because this
 * screen is where meaning matters most, the disclaimer especially.
 */
const UI = {
  en: {
    title: "What's in it",
    recognized: (m: number, t: number) => `${m} of ${t} ingredients recognized`,
    notRecognizedSuffix: (n: number) => ` · ${n} not recognized`,
    matchYourConcerns: 'match your concerns',
    worthALook: 'worth a look',
    goodForYou: 'Good for you',
    goodForYouHint: 'These target concerns you picked during onboarding.',
    allIngredients: (n: number) => `All ingredients (${n})`,
    notRecognized: (n: number) => `Not recognized (${n})`,
    notRecognizedHint:
      "Dewly doesn't have these in its database yet — that doesn't mean anything is wrong with them.",
    listedTwice: 'Listed more than once',
    targetsYour: 'Targets your',
    matchedLoosely: (raw: string) => `Matched loosely from “${raw}”.`,
    analyzeAnother: 'Analyze another',
    poreBadge: (n: number) => `PORE ${n}/5`,
    activeBadge: 'ACTIVE',
    forYouBadge: 'FOR YOU',
    errorTitle: 'Something went wrong',
    errorFallback: 'Please try again.',
    back: 'Back',
    disclaimer:
      'Dewly provides educational information only and is not medical advice. Ingredient effects vary from person to person. If you have a skin condition or are unsure about a product, speak to a dermatologist. Patch test anything new.',
  },
  tr: {
    title: 'İçinde ne var',
    recognized: (m: number, t: number) => `${t} içerikten ${m} tanesi tanındı`,
    notRecognizedSuffix: (n: number) => ` · ${n} tanınmadı`,
    matchYourConcerns: 'endişelerinizle eşleşiyor',
    worthALook: 'dikkat edilmeli',
    goodForYou: 'Size uygun',
    goodForYouHint: 'Bunlar, başlangıçta seçtiğiniz endişeleri hedefliyor.',
    allIngredients: (n: number) => `Tüm içerikler (${n})`,
    notRecognized: (n: number) => `Tanınmayan (${n})`,
    notRecognizedHint:
      'Bunlar henüz Dewly veritabanında yok — bu, onlarda bir sorun olduğu anlamına gelmez.',
    listedTwice: 'Birden fazla kez listelenmiş',
    targetsYour: 'Şunu hedefliyor',
    matchedLoosely: (raw: string) => `“${raw}” ifadesinden yaklaşık eşleşme.`,
    analyzeAnother: 'Başka bir ürün analiz et',
    poreBadge: (n: number) => `GÖZENEK ${n}/5`,
    activeBadge: 'AKTİF',
    forYouBadge: 'SİZE UYGUN',
    errorTitle: 'Bir şeyler ters gitti',
    errorFallback: 'Lütfen tekrar deneyin.',
    back: 'Geri',
    disclaimer:
      'Dewly yalnızca eğitim amaçlı bilgi sunar, tıbbi tavsiye değildir. İçeriklerin etkisi kişiden kişiye değişir. Bir cilt rahatsızlığınız varsa veya bir ürün konusunda emin değilseniz bir dermatoloğa danışın. Yeni ürünleri önce küçük bir alanda deneyin.',
  },
} as const;

const CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  en: {
    humectant: 'Humectant',
    occlusive: 'Occlusive',
    emollient: 'Emollient',
    active: 'Active',
    antioxidant: 'Antioxidant',
    spf_filter: 'SPF filter',
    preservative: 'Preservative',
    fragrance: 'Fragrance',
    solvent: 'Solvent',
    other: 'Other',
  },
  tr: {
    humectant: 'Nemlendirici',
    occlusive: 'Örtücü',
    emollient: 'Yumuşatıcı',
    active: 'Aktif',
    antioxidant: 'Antioksidan',
    spf_filter: 'Güneş filtresi',
    preservative: 'Koruyucu',
    fragrance: 'Koku',
    solvent: 'Çözücü',
    other: 'Diğer',
  },
};

export default function ResultsScreen() {
  const { result, status, error, language, setLanguage } = useAnalysis();

  if (status === 'idle' || (!result && status !== 'error')) {
    return <Redirect href="/analyze" />;
  }

  if (status === 'error') {
    return (
      <Screen>
        <View style={styles.header}>
          <Text variant="h1">{UI[language].errorTitle}</Text>
          <Text variant="body" tone="muted">
            {error ?? UI[language].errorFallback}
          </Text>
          <Button
            label={UI[language].back}
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  if (!result) return null;

  const goodForYou = result.matched.filter((m) => m.matchedConcerns.length > 0);
  const headsUp = result.matched.filter((m) => m.headsUp.length > 0);
  const t = UI[language];

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {t.recognized(result.matched.length, result.totalTokens)}
          {result.unmatched.length > 0
            ? t.notRecognizedSuffix(result.unmatched.length)
            : ''}
        </Text>
      </View>

      <View style={styles.langRow}>
        <Chip label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} />
        <Chip label="TR" selected={language === 'tr'} onPress={() => setLanguage('tr')} />
      </View>

      {/* Summary strip so the two personalised signals are visible before scrolling. */}
      <View style={styles.summaryRow}>
        <SummaryTile
          value={goodForYou.length}
          label={t.matchYourConcerns}
          tone="success"
        />
        <SummaryTile value={headsUp.length} label={t.worthALook} tone="warning" />
      </View>

      {goodForYou.length > 0 ? (
        <Section title={t.goodForYou}>
          <Text variant="caption" tone="muted">
            {t.goodForYouHint}
          </Text>
          <View style={styles.chipRow}>
            {goodForYou.map((m) => (
              <Chip key={m.ingredient.id} label={m.ingredient.inci_name} selected />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={t.allIngredients(result.matched.length)}>
        {result.matched.map((m) => (
          <IngredientCard key={m.ingredient.id} analyzed={m} language={language} />
        ))}
      </Section>

      {result.unmatched.length > 0 ? (
        <Section title={t.notRecognized(result.unmatched.length)}>
          <Text variant="caption" tone="muted">
            {t.notRecognizedHint}
          </Text>
          <View style={styles.chipRow}>
            {result.unmatched.map((token) => (
              <View key={`${token.index}-${token.raw}`} style={styles.unmatchedChip}>
                <Text variant="caption" tone="muted">
                  {token.raw}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {result.duplicates.length > 0 ? (
        <Section title={t.listedTwice}>
          <Text variant="caption" tone="muted">
            {result.duplicates
              .map((d) => `${d.canonical} (×${d.tokens.length})`)
              .join(', ')}
          </Text>
        </Section>
      ) : null}

      <View style={styles.disclaimer}>
        <Text variant="caption" tone="muted">
          {t.disclaimer}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t.analyzeAnother}
          variant="secondary"
          onPress={() => router.replace('/analyze')}
        />
      </View>
    </Screen>
  );
}

function IngredientCard({
  analyzed,
  language,
}: {
  analyzed: AnalyzedIngredient;
  language: 'en' | 'tr';
}) {
  const { ingredient, matchedConcerns, headsUp, via, token } = analyzed;
  const description = describe(ingredient, language);
  const isGoodForYou = matchedConcerns.length > 0;

  return (
    <Card style={StyleSheet.flatten([styles.card, isGoodForYou && styles.cardHighlighted])}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text variant="h2">{ingredient.inci_name}</Text>
          {ingredient.common_name && ingredient.common_name !== ingredient.inci_name ? (
            <Text variant="caption" tone="muted">
              {ingredient.common_name}
            </Text>
          ) : null}
        </View>
        {isGoodForYou ? <Badge label={UI[language].forYouBadge} tone="success" /> : null}
      </View>

      <View style={styles.badgeRow}>
        <Badge
          label={CATEGORY_LABELS[language][ingredient.category] ?? ingredient.category}
        />
        {ingredient.is_active ? (
          <Badge label={UI[language].activeBadge} tone="info" />
        ) : null}
        {ingredient.comedogenic_rating != null ? (
          <Badge
            label={UI[language].poreBadge(ingredient.comedogenic_rating)}
            tone={ingredient.comedogenic_rating >= 3 ? 'warning' : 'success'}
          />
        ) : null}
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {matchedConcerns.length > 0 ? (
        <View style={styles.concernRow}>
          <Text variant="caption" tone="muted">
            {UI[language].targetsYour}:{' '}
            {matchedConcerns.map((c) => CONCERN_LABELS[c as Concern] ?? c).join(', ')}
          </Text>
        </View>
      ) : null}

      {headsUp.map((flag) => {
        const { label, detail } = headsUpCopy(flag, ingredient, language);
        const scheme = colors.status[HEADS_UP_TONE[flag.kind]];
        return (
          <View
            key={flag.kind}
            style={[
              styles.flag,
              { backgroundColor: scheme.bg, borderColor: scheme.border },
            ]}
          >
            <Badge label={label.toUpperCase()} tone={HEADS_UP_TONE[flag.kind]} />
            <Text variant="caption" style={styles.flagText}>
              {detail}
            </Text>
          </View>
        );
      })}

      {/* A loose match is a guess; say so rather than presenting it as certain. */}
      {via === 'loose' ? (
        <Text variant="caption" tone="muted">
          {UI[language].matchedLoosely(token.raw)}
        </Text>
      ) : null}
    </Card>
  );
}

function SummaryTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: StatusTone;
}) {
  const scheme = colors.status[tone];
  return (
    <View style={[styles.tile, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
      <Text variant="h1" style={{ color: scheme.fg }}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: scheme.fg }}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" tone="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  tile: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  section: { marginTop: spacing.xl },
  sectionTitle: { letterSpacing: 1.2 },
  sectionBody: { marginTop: spacing.md, gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHighlighted: { borderColor: colors.status.success.border, borderWidth: 1.5 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  description: { marginTop: spacing.xs },
  concernRow: { marginTop: spacing.xs },
  flag: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  flagText: { color: colors.text },
  unmatchedChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  disclaimer: {
    marginTop: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: { marginTop: spacing.lg, alignItems: 'flex-start' },
});
