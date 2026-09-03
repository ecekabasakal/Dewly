import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';

import {
  BrandTile,
  Button,
  Card,
  Chip,
  DesktopPage,
  ErrorState,
  MetricCard,
  Screen,
  SunriseMark,
  Text,
  type MetricTone,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useIsWide } from '../../hooks/useLayout';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { useShelf } from '../../hooks/useShelf';
import { findConflicts } from '../../lib/conflicts';
import { greetingText, resolveDisplayName } from '../../lib/greeting';
import { buildRoutine, type Routine, type RoutineSlot } from '../../lib/routine';
import type { Language } from '../../lib/language';
import { colors, elevation, fonts, gradients, radius, spacing } from '../../theme';
import { CONCERN_LABELS, SKIN_TYPE_LABELS, type Profile } from '../../types/profile';
import { STEP_LABELS, type ShelfProduct } from '../../types/shelf';

const COPY = {
  en: {
    heroFallbackName: 'Welcome back',
    skinSummary: (skin: string, concerns: string) => `${skin} skin · ${concerns}`,
    skinOnly: (skin: string) => `${skin} skin`,
    analyze: 'Analyze a product',
    metricProducts: 'products on your shelf',
    metricIngredients: 'ingredients recognised',
    metricCautions: 'cautions flagged',
    routineTitle: "Today's routine",
    morning: 'Morning',
    evening: 'Evening',
    routineEmptyTitle: 'Nothing scheduled yet',
    routineEmptyBody:
      'Add the products you already use and Dewly will put them in the right order.',
    buildShelf: 'Build my shelf',
    seeAll: 'See the full routine',
    startTitle: 'Start with one product',
    startBody:
      'Paste an ingredient list, or look a product up by name, and Dewly will tell you what is in it.',
    skinCardTitle: 'Your skin',
    skinCardConcerns: 'What you want to work on',
    skinCardNoConcerns: 'No concerns picked — you can change that in Profile.',
    tipTitle: 'How the order works',
    tipBody:
      'Dewly layers your routine thinnest to richest, and always puts SPF last in the morning. Change a product’s step or time on its own page.',
  },
  tr: {
    heroFallbackName: 'Tekrar hoş geldin',
    skinSummary: (skin: string, concerns: string) => `${skin} cilt · ${concerns}`,
    skinOnly: (skin: string) => `${skin} cilt`,
    analyze: 'Bir ürünü analiz et',
    metricProducts: 'rafındaki ürün',
    metricIngredients: 'tanınan içerik',
    metricCautions: 'dikkat işareti',
    routineTitle: 'Bugünün rutini',
    morning: 'Sabah',
    evening: 'Akşam',
    routineEmptyTitle: 'Henüz bir şey planlanmadı',
    routineEmptyBody: 'Kullandığın ürünleri ekle, Dewly onları doğru sıraya koysun.',
    buildShelf: 'Rafımı oluştur',
    seeAll: 'Rutinin tamamını gör',
    startTitle: 'Tek bir ürünle başla',
    startBody:
      'Bir içerik listesi yapıştır ya da ürünü adıyla ara; Dewly içinde ne olduğunu anlatsın.',
    skinCardTitle: 'Cildin',
    skinCardConcerns: 'Üzerinde çalışmak istediklerin',
    skinCardNoConcerns: 'Cilt sorunu seçilmedi — Profil’den değiştirebilirsin.',
    tipTitle: 'Sıralama nasıl çalışıyor',
    tipBody:
      'Dewly rutinini en hafiften en zengine doğru katmanlar ve sabahları güneş koruyucuyu hep en sona koyar. Bir ürünün adımını veya zamanını kendi sayfasından değiştirebilirsin.',
  },
} as const;

/** The routine preview stays a preview — the Routine tab owns the full list. */
const PREVIEW_STEPS = 3;
/** The desktop column is taller, so it can show more before it needs the link. */
const PREVIEW_STEPS_WIDE = 5;
/** The metric row is always three slots wide, filled or not. See `MetricRow`. */
const METRIC_SLOTS = 3;

type Metric = { key: string; value: number; label: string; tone: MetricTone };

/**
 * Everything both layouts need, computed once.
 *
 * The desktop and phone trees differ enough to be separate components, but the
 * data behind them must not: two copies of "which metrics are real" would drift
 * into showing different numbers at different window widths.
 */
type HomeData = {
  greeting: string;
  name: string;
  summary: string;
  profile: Profile;
  metrics: Metric[];
  routine: Routine | null;
  shelfStatus: 'loading' | 'ready' | 'failed';
  products: ShelfProduct[];
  slot: RoutineSlot;
  setSlot: (slot: RoutineSlot) => void;
  reloadShelf: () => void;
  language: Language;
};

export default function Home() {
  const { profile, status, reload } = useProfile();
  const { products, status: shelfStatus, reload: reloadShelf } = useShelf();
  const { email } = useAuth();
  const { language } = useLanguage();
  const isWide = useIsWide();
  const t = COPY[language];

  const [slot, setSlot] = useState<RoutineSlot>(() =>
    new Date().getHours() >= 17 ? 'pm' : 'am'
  );

  const shelfReady = shelfStatus === 'ready';

  // Every metric is counted from the user's own rows. Nothing here is a score.
  const metrics = useMemo<Metric[]>(() => {
    if (!shelfReady) return [];

    const ingredientCount = new Set(products.flatMap((p) => p.ingredientNames)).size;
    const cautionCount = findConflicts(products).length;

    const all: Metric[] = [
      { key: 'products', value: products.length, label: t.metricProducts, tone: 'owned' },
      {
        key: 'ingredients',
        value: ingredientCount,
        label: t.metricIngredients,
        tone: 'understood',
      },
      { key: 'cautions', value: cautionCount, label: t.metricCautions, tone: 'attention' },
    ];

    // An ingredient or caution count of zero is not a fact worth a card — it
    // only means nothing has been analysed yet. The shelf count is kept even at
    // zero, because "0 products" genuinely answers its own question.
    return all.filter((metric) => metric.key === 'products' || metric.value > 0);
  }, [shelfReady, products, t]);

  const routine = useMemo(
    () => (shelfReady ? buildRoutine(products, slot) : null),
    [shelfReady, products, slot]
  );

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // A failed read is NOT "no profile". Redirecting to onboarding here would
  // walk the user through the questions again and overwrite the profile they
  // already have — the same failure mode the entry gate now avoids.
  if (status === 'failed') {
    return (
      <Screen scroll>
        <ErrorState onRetry={() => void reload()} />
      </Screen>
    );
  }

  // Reachable if storage is cleared while this screen is mounted.
  if (!profile) return <Redirect href="/onboarding" />;

  const concerns = profile.concerns
    .map((concern) => CONCERN_LABELS[language][concern].toLocaleLowerCase())
    .join(', ');
  const skin = SKIN_TYPE_LABELS[language][profile.skinType];

  const data: HomeData = {
    greeting: greetingText(language),
    // A saved name always wins; the email inference is the fallback for users
    // who onboarded before the name step existed, or who skipped it.
    name: resolveDisplayName(profile.name, email) ?? t.heroFallbackName,
    summary: profile.concerns.length > 0 ? t.skinSummary(skin, concerns) : t.skinOnly(skin),
    profile,
    metrics,
    routine,
    shelfStatus,
    products,
    slot,
    setSlot,
    reloadShelf: () => void reloadShelf(),
    language,
  };

  return isWide ? <HomeDesktop {...data} /> : <HomeMobile {...data} />;
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/** Unchanged from before the desktop layout existed. */
function HomeMobile(data: HomeData) {
  const t = COPY[data.language];

  return (
    <Screen scroll>
      <Hero greeting={data.greeting} name={data.name} summary={data.summary} />

      <MetricRow metrics={data.metrics} style={styles.metricsMobile} />

      <Button
        label={t.analyze}
        size="lg"
        fullWidth
        onPress={() => router.navigate('/analyze')}
        style={styles.cta}
      />

      <View style={styles.sectionHeader}>
        <Text variant="h2" style={styles.sectionTitle}>
          {t.routineTitle}
        </Text>
        <SlotToggle slot={data.slot} setSlot={data.setSlot} language={data.language} />
      </View>

      <RoutineBlock data={data} previewSteps={PREVIEW_STEPS} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------

/**
 * The dashboard layout: full-width hero, a metric row, then a two-column split.
 *
 * The split puts the routine on the left because it is the thing that changes
 * daily and is read top to bottom; the right column holds what is stable — who
 * you are, the one action, and how to read the order. Weighting it 3:2 rather
 * than 1:1 keeps a routine step's product name on one line at the breakpoint.
 */
function HomeDesktop(data: HomeData) {
  const t = COPY[data.language];

  return (
    <DesktopPage>
      <Hero greeting={data.greeting} name={data.name} summary={data.summary} wide />

      <MetricRow metrics={data.metrics} style={styles.metricsWide} />

      <View style={styles.columns}>
        <View style={styles.columnMain}>
          <View style={styles.sectionHeaderWide}>
            <Text variant="h2" style={styles.sectionTitle}>
              {t.routineTitle}
            </Text>
            <SlotToggle slot={data.slot} setSlot={data.setSlot} language={data.language} />
          </View>
          <RoutineBlock data={data} previewSteps={PREVIEW_STEPS_WIDE} />
        </View>

        <View style={styles.columnSide}>
          <Card style={styles.sideCard}>
            <Text variant="caption" tone="muted" style={styles.sideLabel}>
              {t.skinCardTitle.toUpperCase()}
            </Text>
            <Text variant="h2">{SKIN_TYPE_LABELS[data.language][data.profile.skinType]}</Text>
            <Text variant="caption" tone="muted">
              {t.skinCardConcerns}
            </Text>
            {data.profile.concerns.length > 0 ? (
              <View style={styles.chips}>
                {data.profile.concerns.map((concern) => (
                  <Chip
                    key={concern}
                    label={CONCERN_LABELS[data.language][concern]}
                    selected
                  />
                ))}
              </View>
            ) : (
              <Text variant="caption" tone="muted">
                {t.skinCardNoConcerns}
              </Text>
            )}
          </Card>

          <Button
            label={t.analyze}
            size="lg"
            fullWidth
            onPress={() => router.navigate('/analyze')}
          />

          <Card style={styles.sideCard}>
            <Text variant="caption" tone="muted" style={styles.sideLabel}>
              {t.tipTitle.toUpperCase()}
            </Text>
            <Text variant="caption" tone="muted">
              {t.tipBody}
            </Text>
          </Card>
        </View>
      </View>
    </DesktopPage>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/**
 * Always three slots wide, padded with empty flex spacers.
 *
 * Without the padding a lone "0 products on your shelf" card stretched across
 * the whole row and read as a broken layout rather than one statistic. Spacers
 * rather than a percentage cap because the cards then keep exactly the width
 * they have in the full three-card case, at any container width.
 */
function MetricRow({ metrics, style }: { metrics: Metric[]; style: object }) {
  if (metrics.length === 0) return null;

  return (
    <View style={[styles.metrics, style]}>
      {metrics.map((metric) => (
        <MetricCard
          key={metric.key}
          value={metric.value}
          label={metric.label}
          tone={metric.tone}
        />
      ))}
      {Array.from({ length: METRIC_SLOTS - metrics.length }, (_, index) => (
        <View key={`slot-${index}`} style={styles.metricSpacer} />
      ))}
    </View>
  );
}

function SlotToggle({
  slot,
  setSlot,
  language,
}: {
  slot: RoutineSlot;
  setSlot: (slot: RoutineSlot) => void;
  language: Language;
}) {
  const t = COPY[language];
  return (
    <View style={styles.slotToggle}>
      <Chip label={t.morning} selected={slot === 'am'} onPress={() => setSlot('am')} />
      <Chip label={t.evening} selected={slot === 'pm'} onPress={() => setSlot('pm')} />
    </View>
  );
}

/** The routine list plus its loading, failed and two empty states. */
function RoutineBlock({ data, previewSteps }: { data: HomeData; previewSteps: number }) {
  const t = COPY[data.language];
  const { routine, shelfStatus, products, slot } = data;

  // A failed shelf read is not "still loading". The first read right after
  // sign-in can 401 while the fresh JWT settles, and gating only on `ready`
  // left this section spinning forever with no way back.
  if (shelfStatus === 'failed') {
    return (
      <View style={styles.routineError}>
        <ErrorState onRetry={data.reloadShelf} />
      </View>
    );
  }

  if (shelfStatus !== 'ready') {
    return (
      <View style={styles.routineLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <Card style={styles.empty}>
        <Text variant="h2">{t.startTitle}</Text>
        <Text variant="body" tone="muted">
          {t.startBody}
        </Text>
        <Button
          label={t.buildShelf}
          variant="secondary"
          onPress={() => router.navigate('/shelf')}
        />
      </Card>
    );
  }

  if (!routine || routine.entries.length === 0) {
    return (
      <Card style={styles.empty}>
        <Text variant="h2">{t.routineEmptyTitle}</Text>
        <Text variant="body" tone="muted">
          {t.routineEmptyBody}
        </Text>
        <Button
          label={t.buildShelf}
          variant="secondary"
          onPress={() => router.navigate('/shelf')}
        />
      </Card>
    );
  }

  return (
    <View style={styles.steps}>
      {routine.entries.slice(0, previewSteps).map((entry) => (
        <RoutineStep
          key={entry.product.id}
          position={entry.position}
          product={entry.product}
          language={data.language}
        />
      ))}
      {routine.entries.length > previewSteps ? (
        <Button
          label={t.seeAll}
          variant="secondary"
          fullWidth
          onPress={() => router.navigate(`/routine?slot=${slot}`)}
        />
      ) : null}
    </View>
  );
}

/**
 * The greeting hero.
 *
 * The one place in the app that carries the brand at full volume: deep green
 * gradient, mint eyebrow, the name in Fraunces. Everything below it is quiet by
 * comparison, which is the point — spend the boldness once.
 *
 * `wide` only changes the proportions. At 1100px the phone padding would leave
 * a 150px-tall band across the top of the screen, so the desktop variant is
 * taller and the name and mark scale with it.
 */
function Hero({
  name,
  greeting,
  summary,
  wide = false,
}: {
  name: string;
  greeting: string;
  summary: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.heroWrap, wide && styles.heroWrapWide]}>
      <LinearGradient {...gradients.hero} style={[styles.hero, wide && styles.heroWide]}>
        {/* The horizon runs off the card's right edge and is cut by
            `overflow: hidden`, so it reads as a sun rising past the frame
            rather than a logo pasted in the corner. */}
        <View style={[styles.mark, wide && styles.markWide]} pointerEvents="none">
          <SunriseMark size={wide ? 44 : 30} color={colors.onHero.eyebrow} />
        </View>

        <Text style={styles.eyebrow}>{greeting.toLocaleUpperCase()}</Text>
        <Text style={[styles.heroName, wide && styles.heroNameWide]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.heroSummary} numberOfLines={2}>
          {summary}
        </Text>
      </LinearGradient>
    </View>
  );
}

function RoutineStep({
  position,
  product,
  language,
}: {
  position: number;
  product: ShelfProduct;
  language: Language;
}) {
  return (
    <Card style={styles.step}>
      <BrandTile brand={product.brand} name={product.name} size={48} />
      <View style={styles.stepText}>
        <Text variant="caption" tone="muted" style={styles.stepLabel} numberOfLines={1}>
          {STEP_LABELS[language][product.stepType].toUpperCase()}
        </Text>
        <Text variant="h2" numberOfLines={2}>
          {product.name}
        </Text>
      </View>
      <Text style={styles.stepNumber}>{position}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // The shadow lives on a wrapper, not on the gradient: a shadow and
  // `overflow: hidden` on the same node clip each other on web.
  heroWrap: {
    marginTop: spacing.lg,
    borderRadius: radius.hero,
    ...elevation.md,
  },
  heroWrapWide: { marginTop: 0 },
  hero: {
    borderRadius: radius.hero,
    padding: spacing.xl,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  heroWide: { padding: spacing['2xl'], paddingVertical: spacing['3xl'] },
  eyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.onHero.eyebrow,
  },
  heroName: {
    fontFamily: fonts.headingBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.onHero.title,
    marginTop: spacing.xs,
    // The sun mark occupies the card's bottom-right; a long name would
    // otherwise run into its rays.
    paddingRight: spacing['2xl'],
  },
  heroNameWide: { fontSize: 46, lineHeight: 52 },
  heroSummary: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onHero.body,
    opacity: 0.85,
    marginTop: spacing.xs,
    paddingRight: spacing['3xl'],
  },

  mark: { position: 'absolute', right: -34, bottom: -18 },
  markWide: { right: -30, bottom: -22 },

  metrics: { flexDirection: 'row', gap: spacing.sm },
  metricsMobile: { marginTop: spacing.lg },
  metricsWide: { marginTop: spacing.xl, gap: spacing.md },
  /** Holds a slot open so the real cards keep their three-across width. */
  metricSpacer: { flex: 1 },

  cta: { marginTop: spacing.lg },

  sectionHeader: { marginTop: spacing['2xl'], gap: spacing.md },
  sectionHeaderWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: { letterSpacing: -0.2 },
  slotToggle: { flexDirection: 'row', gap: spacing.sm },

  columns: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing['2xl'] },
  // 3:2 rather than an even split — a routine step needs the room for a
  // product name, the side column only holds chips and short copy.
  columnMain: { flex: 3 },
  columnSide: { flex: 2, gap: spacing.md },
  sideCard: { gap: spacing.sm, alignItems: 'flex-start' },
  sideLabel: { letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },

  routineLoading: { marginTop: spacing.xl, alignItems: 'center' },
  routineError: { marginTop: spacing.lg },
  empty: { gap: spacing.md, alignItems: 'flex-start' },

  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Without flex the text column cannot shrink and a long Turkish product name
  // pushes the step number off the card.
  stepText: { flex: 1, gap: 2 },
  stepLabel: { letterSpacing: 1 },
  stepNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.muted,
    opacity: 0.5,
  },
});
