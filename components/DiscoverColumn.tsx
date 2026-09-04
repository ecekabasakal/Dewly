import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BrandTile } from './BrandTile';
import { Card } from './Card';
import { Text } from './Text';
import { useLanguage } from '../hooks/useLanguage';
import {
  BRAND_RESULT_COUNT,
  brandThemeFor,
  sourceLabel,
  trendingIngredients,
  type EvidenceLevel,
  type TrendingIngredient,
} from '../lib/discover';
import { searchByName, type ObfProduct } from '../lib/obf';
import { colors, fonts, radius, spacing } from '../theme';

const COPY = {
  en: {
    trendingTitle: 'Trending in skincare',
    trendingHint:
      'What the industry is talking about, with how settled the evidence actually is.',
    brandsTitle: 'Discover brands',
    brandsHint: (theme: string) => `${theme}, from the Open Beauty Facts catalogue.`,
    brandsEmpty: 'Nothing to show from Open Beauty Facts right now.',
    brandsFailed: "Couldn't reach Open Beauty Facts.",
    source: 'Source',
    attribution: 'Data: Open Beauty Facts (ODbL)',
    evidence: {
      established: 'ESTABLISHED',
      emerging: 'EMERGING',
      evolving: 'EVOLVING',
    } satisfies Record<EvidenceLevel, string>,
    evidenceHint: {
      established: 'Well studied, broadly agreed.',
      emerging: 'Real research, still early.',
      evolving: 'The claims are ahead of the evidence.',
    } satisfies Record<EvidenceLevel, string>,
  },
  tr: {
    trendingTitle: 'Cilt bakımında öne çıkanlar',
    trendingHint: 'Sektörün konuştukları — ve kanıtın gerçekte ne kadar oturmuş olduğu.',
    brandsTitle: 'Markaları keşfet',
    brandsHint: (theme: string) => `${theme}, Open Beauty Facts kataloğundan.`,
    brandsEmpty: 'Şu anda Open Beauty Facts’ten gösterilecek bir şey yok.',
    brandsFailed: 'Open Beauty Facts’e ulaşılamadı.',
    source: 'Kaynak',
    attribution: 'Veri: Open Beauty Facts (ODbL)',
    evidence: {
      established: 'YERLEŞİK',
      emerging: 'YENİ',
      evolving: 'GELİŞEN',
    } satisfies Record<EvidenceLevel, string>,
    evidenceHint: {
      established: 'İyi çalışılmış, geniş kabul görmüş.',
      emerging: 'Gerçek araştırma var, henüz erken.',
      evolving: 'İddialar kanıtın önünde.',
    } satisfies Record<EvidenceLevel, string>,
  },
} as const;

export type DiscoverColumnProps = {
  /** Cap the trending list. The persistent rail shows the whole feed. */
  maxTrending?: number;
  /**
   * Rendered on the green Discover rail rather than the butter page.
   *
   * The app-wide `colors.muted` was tuned against butter and cream and drops to
   * 3.67:1 on the panel's ground — under AA. Anything sitting DIRECTLY on the
   * panel switches to `colors.panel.muted` (4.92:1), and the cards go white for
   * a cleaner separation. Text INSIDE a card is unaffected: it sits on white.
   */
  onPanel?: boolean;
};

/**
 * The Discover feed — an editorial column for the empty right-hand space on
 * wide screens.
 *
 * Two sources, deliberately labelled as such. The trending list is our own
 * curation over our own ingredient database; the brands are live Open Beauty
 * Facts results. Neither is sponsored and nothing here is ranked by anyone
 * paying, which is why every trend card carries an evidence grade and a source
 * link rather than a call to action.
 *
 * ## Keeping it from reading as advertising
 *
 * The grade is the mechanism. Several of 2026's loudest ingredients are
 * genuinely unsettled, and the feed says so on the card — `evolving` is
 * rendered exactly as prominently as `established`, never collapsed behind a
 * tap. The three grades share one low-saturation palette so the badge reads as
 * information rather than a traffic light: it describes how settled the science
 * is, not whether the ingredient is dangerous.
 *
 * The caller decides whether there is room; this renders unconditionally.
 */
export function DiscoverColumn({
  maxTrending,
  onPanel = false,
}: DiscoverColumnProps = {}) {
  const { language } = useLanguage();
  const t = COPY[language];

  const all = trendingIngredients(language);
  const trending = maxTrending ? all.slice(0, maxTrending) : all;
  const theme = brandThemeFor(language);
  // One style object, spread onto every label that lands on the panel ground.
  const onPanelInk = onPanel ? styles.panelInk : null;

  const [brands, setBrands] = useState<ObfProduct[] | null>(null);
  const [brandsFailed, setBrandsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBrands(null);
    setBrandsFailed(false);

    searchByName(theme.query)
      .then((found) => {
        if (!cancelled) setBrands(found.slice(0, BRAND_RESULT_COUNT));
      })
      .catch(() => {
        // A side column must never take the screen down with it. The trending
        // half is bundled and still renders; this half says it is unavailable.
        if (!cancelled) setBrandsFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [theme.query]);

  return (
    <View style={styles.column}>
      <View style={styles.group}>
        <Text variant="caption" tone="muted" style={[styles.groupTitle, onPanelInk]}>
          {t.trendingTitle.toUpperCase()}
        </Text>
        <Text variant="caption" tone="muted" style={onPanelInk}>
          {t.trendingHint}
        </Text>
        <View style={styles.cards}>
          {trending.map((item) => (
            <TrendCard key={item.inciName} item={item} language={language} onPanel={onPanel} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text variant="caption" tone="muted" style={[styles.groupTitle, onPanelInk]}>
          {t.brandsTitle.toUpperCase()}
        </Text>
        <Text variant="caption" tone="muted" style={onPanelInk}>
          {t.brandsHint(theme.label)}
        </Text>

        <View style={styles.cards}>
          {brandsFailed ? (
            <Text variant="caption" tone="muted" style={onPanelInk}>
              {t.brandsFailed}
            </Text>
          ) : brands === null ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.muted} />
            </View>
          ) : brands.length === 0 ? (
            <Text variant="caption" tone="muted" style={onPanelInk}>
              {t.brandsEmpty}
            </Text>
          ) : (
            brands.map((product) => (
              <BrandCard key={product.barcode} product={product} onPanel={onPanel} />
            ))
          )}
        </View>

        {/* ODbL requires attribution wherever the data is shown. */}
        <Text variant="caption" tone="muted" style={[styles.attribution, onPanelInk]}>
          {t.attribution}
        </Text>
      </View>
    </View>
  );
}

/**
 * One trending ingredient.
 *
 * Tapping runs an analysis of its INCI name. Dewly has no standalone
 * ingredient-detail route, and the results screen already renders exactly what
 * a detail view would — the description, category, comedogenic rating, cautions
 * and whether it targets the user's own concerns — so this reuses it rather
 * than adding a second way to display the same record.
 */
function TrendCard({
  item,
  language,
  onPanel,
}: {
  item: TrendingIngredient;
  language: 'en' | 'tr';
  onPanel: boolean;
}) {
  const t = COPY[language];
  const scheme = colors.evidence[item.evidence];

  // The Card itself is NOT pressable. It holds two sibling controls — open the
  // ingredient, open the source — and a pressable Card around a pressable
  // source row would nest one <button> inside another on web: invalid HTML, a
  // hydration error, and an ambiguous target for a screen reader.
  return (
    <Card style={StyleSheet.flatten([styles.card, onPanel && styles.cardOnPanel])}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.inciName}
        onPress={() =>
          router.push(`/analyze?prefill=${encodeURIComponent(item.inciName)}`)
        }
        style={({ pressed }) => [styles.trendBody, pressed && styles.pressed]}
      >
        <Text variant="h2" numberOfLines={2}>
          {item.inciName}
        </Text>
        {item.commonName && item.commonName !== item.inciName ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {item.commonName}
          </Text>
        ) : null}

        <Text variant="caption" tone="muted" style={styles.trendNote}>
          {item.trendNote}
        </Text>

        {/* Never collapsed, never behind a tap — this is the honesty of the feed. */}
        <View
          style={[
            styles.evidence,
            { backgroundColor: scheme.bg, borderColor: scheme.border },
          ]}
        >
          <Text style={[styles.evidenceLabel, { color: scheme.fg }]}>
            {t.evidence[item.evidence]}
          </Text>
          <Text style={[styles.evidenceHint, { color: scheme.fg }]}>
            {t.evidenceHint[item.evidence]}
          </Text>
        </View>
      </Pressable>

      {item.source ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={sourceLabel(item.source, language)}
          onPress={() => void Linking.openURL(item.source!.url)}
          hitSlop={6}
          style={styles.sourceRow}
        >
          <Text variant="caption" tone="primary" numberOfLines={2}>
            {t.source}: {sourceLabel(item.source, language)}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** One Open Beauty Facts product. Brand tile, never a photo. */
function BrandCard({ product, onPanel }: { product: ObfProduct; onPanel: boolean }) {
  return (
    <Card
      style={StyleSheet.flatten([styles.brandCard, onPanel && styles.cardOnPanel])}
      onPress={() =>
        router.push(`/product?source=obf&barcode=${encodeURIComponent(product.barcode)}`)
      }
    >
      <BrandTile brand={product.brand} name={product.name} size={44} />
      <View style={styles.brandText}>
        <Text variant="caption" numberOfLines={2} style={styles.brandName}>
          {product.name}
        </Text>
        {product.brand ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing['2xl'] },
  group: { gap: spacing.sm },
  groupTitle: { letterSpacing: 1.2 },
  cards: { gap: spacing.md, marginTop: spacing.xs },
  loading: { paddingVertical: spacing.lg, alignItems: 'center' },
  /** Labels sitting directly on the panel ground. See the `onPanel` prop. */
  panelInk: { color: colors.panel.muted },
  /** White rather than cream: 1.54:1 against the panel, cream only 1.44:1. */
  cardOnPanel: { backgroundColor: colors.panel.card, borderColor: colors.panel.bg },

  card: { gap: spacing.xs, alignItems: 'stretch' },
  trendBody: { gap: 2 },
  trendNote: { marginTop: spacing.xs },
  pressed: { opacity: 0.7 },

  evidence: {
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  evidenceLabel: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 1.1 },
  evidenceHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },

  sourceRow: { minHeight: 32, justifyContent: 'center' },

  brandCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Without flex the text column cannot shrink and a long product name pushes
  // the card past the rail's width.
  brandText: { flex: 1, gap: 2 },
  brandName: { fontFamily: fonts.bodySemi },

  attribution: { marginTop: spacing.sm },
});
