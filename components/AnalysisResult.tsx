import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from './Badge';
import { Card } from './Card';
import { Chip } from './Chip';
import { Text } from './Text';
import {
  describe,
  headsUpCopy,
  type AnalysisResult as AnalysisResultData,
  type AnalyzedIngredient,
  type HeadsUpKind,
} from '../lib/analysis';
import type { Language } from '../lib/language';
import { colors, radius, spacing, type StatusTone } from '../theme';
import { CONCERN_LABELS, type Concern } from '../types/profile';

const HEADS_UP_TONE: Record<HeadsUpKind, StatusTone> = {
  caution: 'warning',
  fragrance: 'warning',
  comedogenic: 'warning',
  'active-on-sensitive': 'info',
};

const UI = {
  en: {
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
    poreBadge: (n: number) => `PORE ${n}/5`,
    activeBadge: 'ACTIVE',
    forYouBadge: 'FOR YOU',
    disclaimer:
      'Dewly provides educational information only and is not medical advice. Ingredient effects vary from person to person. If you have a skin condition or are unsure about a product, speak to a dermatologist. Patch test anything new.',
  },
  tr: {
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
    poreBadge: (n: number) => `GÖZENEK ${n}/5`,
    activeBadge: 'AKTİF',
    forYouBadge: 'SİZE UYGUN',
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

export type AnalysisResultProps = {
  result: AnalysisResultData;
  language: Language;
  /**
   * Columns for the ingredient grid. 1 is the phone layout, and is the default
   * so a caller that does not care cannot accidentally get a desktop grid.
   */
  columns?: number;
};

/**
 * The body of an analysis: summary, the personalised sections, the ingredient
 * cards, the unmatched tokens and the disclaimer.
 *
 * Extracted from `app/results.tsx` when the desktop layout needed the same
 * content in a multi-column grid inside the Analyze tab. Two copies of ~200
 * lines of card rendering would have drifted on the first tweak, so both the
 * phone route and the desktop panel render this and differ only in `columns`.
 *
 * Deliberately holds no screen chrome — no title, no navigation buttons. Those
 * differ between the two hosts, and keeping them out is what lets one component
 * serve a pushed route and an inline panel.
 */
/**
 * "13 of 14 ingredients recognized · 1 not recognized".
 *
 * A string rather than a rendered node, because the two hosts put it in
 * different places: the phone screen has it in its header above the language
 * chips, the desktop panel under its own heading. Returning the sentence lets
 * each place it without this component dictating the order — which is what a
 * first attempt got wrong, moving the line below the chips on the phone.
 */
export function recognizedSummary(result: AnalysisResultData, language: Language): string {
  const t = UI[language];
  return (
    t.recognized(result.matched.length, result.totalTokens) +
    (result.unmatched.length > 0 ? t.notRecognizedSuffix(result.unmatched.length) : '')
  );
}

export function AnalysisResult({ result, language, columns = 1 }: AnalysisResultProps) {
  const t = UI[language];
  const goodForYou = result.matched.filter((m) => m.matchedConcerns.length > 0);
  const headsUp = result.matched.filter((m) => m.headsUp.length > 0);

  return (
    <>
      {/* Summary strip so the two personalised signals are visible before scrolling. */}
      <View style={styles.summaryRow}>
        <SummaryTile value={goodForYou.length} label={t.matchYourConcerns} tone="success" />
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
        <IngredientGrid columns={columns} items={result.matched} language={language} />
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
            {result.duplicates.map((d) => `${d.canonical} (×${d.tokens.length})`).join(', ')}
          </Text>
        </Section>
      ) : null}

      <View style={styles.disclaimer}>
        <Text variant="caption" tone="muted">
          {t.disclaimer}
        </Text>
      </View>
    </>
  );
}

/**
 * Lays the ingredient cards out in `columns`.
 *
 * At one column this is the plain stacked list the phone has always had — the
 * wrap and the width cap never engage, so the phone tree is unchanged.
 *
 * Above one, `flexWrap` plus a percentage `flexBasis` does the work, because
 * React Native has no CSS grid. The basis is computed to leave room for the
 * gaps: three columns at 31.5% is 94.5% of the row, and the remaining 5.5% is
 * the two gutters. Items in a wrapped line stretch to the tallest card by
 * default, so rows stay level rather than ragged.
 */
function IngredientGrid({
  columns,
  items,
  language,
}: {
  columns: number;
  items: AnalyzedIngredient[];
  language: Language;
}) {
  // The phone list. `Section`'s own `gap` spaces the cards, exactly as before —
  // no wrapper, no width cap, nothing for the grid styles to touch.
  if (columns <= 1) {
    return (
      <>
        {items.map((m) => (
          <IngredientCard key={m.ingredient.id} analyzed={m} language={language} />
        ))}
      </>
    );
  }

  // Leave ~2.75% of the row per gutter: 3 columns at 31.5% is 94.5%, and the
  // remaining 5.5% is the two gaps.
  const basis = `${(100 - (columns - 1) * 2.75) / columns}%` as `${number}%`;

  return (
    <View style={styles.grid}>
      {items.map((m) => (
        // The cell stretches to the tallest card on its line; `fill` makes the
        // card grow into it, so a row's cards end level instead of ragged.
        <View key={m.ingredient.id} style={[styles.gridCell, { flexBasis: basis }]}>
          <IngredientCard analyzed={m} language={language} fill />
        </View>
      ))}
    </View>
  );
}

function IngredientCard({
  analyzed,
  language,
  fill = false,
}: {
  analyzed: AnalyzedIngredient;
  language: Language;
  /** Grow to the grid cell's height. Never set in the one-column phone list. */
  fill?: boolean;
}) {
  const { ingredient, matchedConcerns, headsUp, via, token } = analyzed;
  const description = describe(ingredient, language);
  const isGoodForYou = matchedConcerns.length > 0;

  return (
    <Card
      style={StyleSheet.flatten([
        styles.card,
        isGoodForYou && styles.cardHighlighted,
        fill && styles.cardFill,
      ])}
    >
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
        <Badge label={CATEGORY_LABELS[language][ingredient.category] ?? ingredient.category} />
        {ingredient.is_active ? <Badge label={UI[language].activeBadge} tone="info" /> : null}
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
            {matchedConcerns.map((c) => CONCERN_LABELS[language][c as Concern] ?? c).join(', ')}
          </Text>
        </View>
      ) : null}

      {headsUp.map((flag) => {
        const { label, detail } = headsUpCopy(flag, ingredient, language);
        const scheme = colors.status[HEADS_UP_TONE[flag.kind]];
        return (
          <View
            key={flag.kind}
            style={[styles.flag, { backgroundColor: scheme.bg, borderColor: scheme.border }]}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    // Cards on one line share the line's height, so rows stay level.
    alignItems: 'stretch',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHighlighted: { borderColor: colors.status.success.border, borderWidth: 1.5 },
  cardFill: { flex: 1 },
  gridCell: { minWidth: 0 },
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
});
