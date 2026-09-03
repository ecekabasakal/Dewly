import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';

import {
  BrandTile,
  Button,
  Card,
  Chip,
  ErrorState,
  MetricCard,
  Screen,
  Text,
  type MetricTone,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { useShelf } from '../../hooks/useShelf';
import { findConflicts } from '../../lib/conflicts';
import { displayNameFromEmail, greetingText } from '../../lib/greeting';
import { buildRoutine, type RoutineSlot } from '../../lib/routine';
import type { Language } from '../../lib/language';
import { colors, elevation, fonts, gradients, radius, spacing } from '../../theme';
import { CONCERN_LABELS, SKIN_TYPE_LABELS } from '../../types/profile';
import { STEP_LABELS, type ShelfProduct } from '../../types/shelf';

const COPY = {
  en: {
    heroFallbackName: 'Welcome back',
    skinSummary: (skin: string, concerns: string) => `${skin} skin · ${concerns}`,
    skinOnly: (skin: string) => `${skin} skin`,
    noConcerns: 'no concerns picked',
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
  },
  tr: {
    heroFallbackName: 'Tekrar hoş geldin',
    skinSummary: (skin: string, concerns: string) => `${skin} cilt · ${concerns}`,
    skinOnly: (skin: string) => `${skin} cilt`,
    noConcerns: 'cilt sorunu seçilmedi',
    analyze: 'Bir ürünü analiz et',
    metricProducts: 'rafındaki ürün',
    metricIngredients: 'tanınan içerik',
    metricCautions: 'dikkat işareti',
    routineTitle: 'Bugünün rutini',
    morning: 'Sabah',
    evening: 'Akşam',
    routineEmptyTitle: 'Henüz bir şey planlanmadı',
    routineEmptyBody:
      'Kullandığın ürünleri ekle, Dewly onları doğru sıraya koysun.',
    buildShelf: 'Rafımı oluştur',
    seeAll: 'Rutinin tamamını gör',
    startTitle: 'Tek bir ürünle başla',
    startBody:
      'Bir içerik listesi yapıştır ya da ürünü adıyla ara; Dewly içinde ne olduğunu anlatsın.',
  },
} as const;

/** The routine preview stays a preview — the Routine tab owns the full list. */
const PREVIEW_STEPS = 3;

/**
 * The brand mark's seven rays, in degrees from vertical.
 *
 * Taken from `assets/dewly_symbol.svg`, where they sit evenly across the half
 * the sun occupies: one straight up, three either side at 24° steps.
 */
const RAY_ANGLES = [-72, -48, -24, 0, 24, 48, 72] as const;

/** Sun geometry, in points. The half-disc's radius drives everything else. */
const SUN_RADIUS = 30;
/** Distance from the sun's centre to each ray's midpoint. */
const RAY_ORBIT = 46;
const RAY_LENGTH = 13;
const RAY_WIDTH = 2.5;

export default function Home() {
  const { profile, status, reload } = useProfile();
  const { products, status: shelfStatus, reload: reloadShelf } = useShelf();
  const { email } = useAuth();
  const { language } = useLanguage();
  const t = COPY[language];

  const [slot, setSlot] = useState<RoutineSlot>(() =>
    new Date().getHours() >= 17 ? 'pm' : 'am'
  );

  const shelfReady = shelfStatus === 'ready';

  // Every metric is counted from the user's own rows. Nothing here is a score.
  const metrics = useMemo(() => {
    if (!shelfReady) return [];

    const ingredientCount = new Set(products.flatMap((p) => p.ingredientNames)).size;
    const cautionCount = findConflicts(products).length;

    const all: { key: string; value: number; label: string; tone: MetricTone }[] = [
      { key: 'products', value: products.length, label: t.metricProducts, tone: 'owned' },
      {
        key: 'ingredients',
        value: ingredientCount,
        label: t.metricIngredients,
        tone: 'understood',
      },
      { key: 'cautions', value: cautionCount, label: t.metricCautions, tone: 'attention' },
    ];

    // An ingredient count of zero is not a fact worth a card — it only means
    // nothing has been analysed yet. The shelf count is kept even at zero
    // because "0 products" is genuinely the answer to that question.
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

  return (
    <Screen scroll>
      <Hero
        // A saved name always wins. The email inference is a guess kept only
        // for users who onboarded before the name step existed, or who skipped
        // it; the nameless greeting is the floor when neither yields anything.
        name={profile.name ?? displayNameFromEmail(email) ?? t.heroFallbackName}
        greeting={greetingText(language)}
        summary={
          profile.concerns.length > 0 ? t.skinSummary(skin, concerns) : t.skinOnly(skin)
        }
      />

      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              value={metric.value}
              label={metric.label}
              tone={metric.tone}
            />
          ))}
        </View>
      ) : null}

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
        <View style={styles.slotToggle}>
          <Chip label={t.morning} selected={slot === 'am'} onPress={() => setSlot('am')} />
          <Chip label={t.evening} selected={slot === 'pm'} onPress={() => setSlot('pm')} />
        </View>
      </View>

      {/* A failed shelf read is not "still loading". The first read right after
          sign-in can 401 while the fresh JWT settles, and gating only on
          `ready` left this section spinning forever with no way back. */}
      {shelfStatus === 'failed' ? (
        <View style={styles.routineError}>
          <ErrorState onRetry={() => void reloadShelf()} />
        </View>
      ) : !shelfReady ? (
        <View style={styles.routineLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
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
      ) : routine && routine.entries.length === 0 ? (
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
      ) : (
        <View style={styles.steps}>
          {routine!.entries.slice(0, PREVIEW_STEPS).map((entry) => (
            <RoutineStep
              key={entry.product.id}
              position={entry.position}
              product={entry.product}
              language={language}
            />
          ))}
          {routine!.entries.length > PREVIEW_STEPS ? (
            <Button
              label={t.seeAll}
              variant="secondary"
              fullWidth
              onPress={() => router.navigate(`/routine?slot=${slot}`)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

/**
 * The greeting hero.
 *
 * The one place in the app that carries the brand at full volume: deep green
 * gradient, mint eyebrow, the name in Fraunces. Everything below it is quiet by
 * comparison, which is the point — spend the boldness once.
 *
 * The corner motif is Dewly's own mark, redrawn: `assets/dewly_symbol.svg` is a
 * half-disc sun sitting on a horizon line with seven rays, and this is that
 * same construction in Views — a half-rounded rectangle, a hairline, and seven
 * bars rotated around the sun's centre.
 *
 * Rebuilt rather than imported because the app has no SVG renderer, and this
 * way the mark inherits the mint token, needs no asset, and can be tuned per
 * layer. The horizon runs off the card's right edge and is cut by
 * `overflow: hidden`, so it reads as a sun rising past the frame rather than a
 * logo pasted in the corner.
 */
function Hero({
  name,
  greeting,
  summary,
}: {
  name: string;
  greeting: string;
  summary: string;
}) {
  return (
    <View style={styles.heroWrap}>
      <LinearGradient {...gradients.hero} style={styles.hero}>
        <View style={styles.mark} pointerEvents="none">
          <View style={styles.markRays}>
            {RAY_ANGLES.map((angle) => (
              <View
                key={angle}
                style={[
                  styles.ray,
                  // Rotate first, then push along the rotated axis — that puts
                  // each ray on the same orbit around the sun's centre.
                  { transform: [{ rotate: `${angle}deg` }, { translateY: -RAY_ORBIT }] },
                ]}
              />
            ))}
          </View>
          <View style={styles.markDisc} />
          <View style={styles.markHorizon} />
        </View>

        <Text style={styles.eyebrow}>{greeting.toLocaleUpperCase()}</Text>
        <Text style={styles.heroName} numberOfLines={2}>
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
  hero: {
    borderRadius: radius.hero,
    padding: spacing.xl,
    gap: spacing.xs,
    overflow: 'hidden',
  },
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
    // Same gutter as the summary below: the sun mark occupies the card's
    // bottom-right, and a long name would otherwise run into its rays.
    paddingRight: spacing['2xl'],
  },
  heroSummary: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onHero.body,
    opacity: 0.85,
    marginTop: spacing.xs,
    // Keeps the summary clear of the sunrise rings on a narrow screen.
    paddingRight: spacing['3xl'],
  },

  // Anchored past the right edge so the horizon line is cut by the card rather
  // than stopping inside it.
  mark: {
    position: 'absolute',
    right: -34,
    // Low enough that the rays clear the headline's descenders. The card clips
    // whatever falls past its bottom edge.
    bottom: -18,
    width: 180,
    height: 120,
  },
  /** Sits ON the horizon: flat edge down, rounded top. */
  markDisc: {
    position: 'absolute',
    left: 90 - SUN_RADIUS,
    bottom: 30,
    width: SUN_RADIUS * 2,
    height: SUN_RADIUS,
    borderTopLeftRadius: SUN_RADIUS,
    borderTopRightRadius: SUN_RADIUS,
    backgroundColor: colors.onHero.eyebrow,
    opacity: 0.16,
  },
  markHorizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    height: 1.5,
    borderRadius: radius.pill,
    backgroundColor: colors.onHero.eyebrow,
    opacity: 0.22,
  },
  /** Square centred on the sun's centre, so every ray orbits the same point. */
  markRays: {
    position: 'absolute',
    left: 90 - RAY_ORBIT,
    bottom: 30 - RAY_ORBIT,
    width: RAY_ORBIT * 2,
    height: RAY_ORBIT * 2,
  },
  ray: {
    position: 'absolute',
    left: RAY_ORBIT - RAY_WIDTH / 2,
    top: RAY_ORBIT - RAY_LENGTH / 2,
    width: RAY_WIDTH,
    height: RAY_LENGTH,
    borderRadius: radius.pill,
    backgroundColor: colors.onHero.eyebrow,
    opacity: 0.3,
  },

  metrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cta: { marginTop: spacing.lg },

  sectionHeader: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  sectionTitle: { letterSpacing: -0.2 },
  slotToggle: { flexDirection: 'row', gap: spacing.sm },

  routineLoading: { marginTop: spacing.xl, alignItems: 'center' },
  routineError: { marginTop: spacing.lg },
  empty: { marginTop: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },

  steps: { marginTop: spacing.lg, gap: spacing.md },
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
