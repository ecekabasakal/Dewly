import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { useAuth } from '../hooks/useAuth';
import { useIsWide } from '../hooks/useLayout';
import { useLanguage } from '../hooks/useLanguage';
import { useProfile } from '../hooks/useProfile';
import { evidenceLabel, ingredientOfTheDay } from '../lib/discover';
import { resolveDisplayName } from '../lib/greeting';
import type { Language } from '../lib/language';
import { colors, fonts, palette, radius, SIDEBAR_WIDTH, spacing } from '../theme';
import { SKIN_TYPE_LABELS } from '../types/profile';
import { DewlyPattern } from './DewlyPattern';
import { SunriseMark } from './SunriseMark';
import { Text } from './Text';

const COPY = {
  en: {
    you: 'You',
    noProfile: 'No skin profile yet',
    skin: (type: string) => `${type} skin`,
    today: 'TODAY IN SKINCARE',
  },
  tr: {
    you: 'Sen',
    noProfile: 'Henüz cilt profili yok',
    skin: (type: string) => `${type} cilt`,
    today: 'BUGÜN CİLT BAKIMINDA',
  },
} as const;

/**
 * The desktop navigation rail, replacing the bottom tab bar above the desktop
 * breakpoint.
 *
 * Rendered through the navigator's own `tabBar` prop, so it is not a parallel
 * navigation system: the routes, their order, their labels and their icons all
 * still come from `<Tabs.Screen>`, and `state.index` is the single source of
 * truth for what is active. Adding a tab adds it here with no edit.
 *
 * Below the breakpoint the `tabBar` prop is left undefined entirely, which
 * makes the navigator fall back to its own `BottomTabBar` — so the phone bar is
 * not a re-implementation that could drift, it is literally the stock one.
 */
export function Sidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { language } = useLanguage();
  const { profile } = useProfile();
  const { email } = useAuth();
  // The rail itself is only mounted above the desktop breakpoint, so this is
  // true whenever this component renders today. It is here so the card stays
  // desktop-only on its own terms rather than by inheritance — a tablet
  // rotating to portrait, or any future reuse of `Sidebar`, drops the card
  // without needing to remember that it should.
  const isWide = useIsWide();
  const t = COPY[language];

  const name = resolveDisplayName(profile?.name, email) ?? t.you;

  return (
    <View style={styles.sidebar}>
      {/* First child, so everything below paints over it. See `DewlyPattern`. */}
      <DewlyPattern />

      <View style={styles.brand}>
        <SunriseMark
          size={13}
          color={palette.mint}
          discOpacity={0.95}
          rayOpacity={0.75}
          horizonOpacity={0.55}
          horizonExtends={false}
        />
        <Text style={styles.wordmark}>dewly</Text>
      </View>

      {/* See `spacerTop` — the rail's slack is split 2:3 across these two
          rather than dumped into one gap in the middle. */}
      <View style={styles.spacerTop} />

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.nav}
        showsVerticalScrollIndicator={false}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const label = options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                // The navigator's own event, so a tab press behaves exactly as
                // it does on the bottom bar — including popping to the top of
                // an already-focused tab.
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={({ pressed }) => [
                styles.item,
                focused && styles.itemActive,
                pressed && !focused && styles.itemPressed,
              ]}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? palette.mint : palette.cream,
                size: 20,
              })}
              <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.spacerBottom} />

      <View style={styles.bottom}>
        {isWide ? <IngredientOfTheDay language={language} /> : null}

        <View style={styles.user}>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {profile ? t.skin(SKIN_TYPE_LABELS[language][profile.skinType]) : t.noProfile}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The rail's editorial footer: one trending ingredient, rotated daily.
 *
 * Same data and same destination as a Discover trend card — `data/discover.json`
 * through `ingredientOfTheDay`, and a tap runs an analysis of the INCI name, so
 * the sidebar and the rail agree about what an ingredient card does. Nothing
 * here is a second copy of the feed's content.
 *
 * The evidence badge keeps the Discover palette exactly: a light ground with
 * its own dark ink, unchanged by the dark rail behind it. Re-tinting it to sit
 * "more naturally" on the green would have meant re-deriving three foreground
 * colours, and a grade that looks different in two places is a grade the user
 * has to learn twice.
 *
 * Contrast on the card ground (#175A50):
 *   eyebrow  mint  #7FD8C4 -> 4.79:1
 *   name     white #FFFFFF -> 8.03:1
 *   note     cream #FDF8E3 -> 7.54:1
 *   badge ink on its own ground -> 5.88:1 (evolving) to 6.72:1 (emerging)
 *
 * No opacity on any of them, unlike the nav labels above — an opacity would
 * make those measured numbers wrong.
 */
function IngredientOfTheDay({ language }: { language: Language }) {
  const t = COPY[language];
  const item = ingredientOfTheDay(language);
  if (!item) return null;

  const scheme = colors.evidence[item.evidence];
  // The common name is the friendlier line where there is one; the trend note
  // is the fallback, and for something like Ectoin it IS the only plain-English
  // description available.
  const note =
    item.commonName && item.commonName !== item.inciName
      ? item.commonName
      : item.trendNote;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.today}: ${item.inciName}`}
      onPress={() => router.push(`/analyze?prefill=${encodeURIComponent(item.inciName)}`)}
      style={({ pressed }) => [styles.today, pressed && styles.todayPressed]}
    >
      <Text style={styles.todayEyebrow}>{t.today}</Text>
      <Text style={styles.todayName} numberOfLines={2}>
        {item.inciName}
      </Text>
      <Text style={styles.todayNote} numberOfLines={2}>
        {note}
      </Text>

      <View
        style={[
          styles.todayEvidence,
          { backgroundColor: scheme.bg, borderColor: scheme.border },
        ]}
      >
        <Text style={[styles.todayEvidenceLabel, { color: scheme.fg }]}>
          {evidenceLabel(item.evidence, language)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    // Kept even though the pattern paints its own identical ground: it is what
    // the rail looks like for the frame before the SVG is up, and if the
    // pattern ever fails to render the rail is still deep green rather than
    // transparent.
    backgroundColor: colors.primary,
    // Clips the `slice` overflow — the artwork is scaled to cover, so it is
    // wider than the rail by design.
    overflow: 'hidden',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: palette.white,
  },

  // `flexShrink` so a short window shortens the nav into a scroll rather than
  // pushing the card and the user block off the bottom. It is the only thing
  // here that gives way — the two spacers stop at their `minHeight`, and the
  // bottom group keeps its natural size.
  navScroll: { flexGrow: 0, flexShrink: 1 },
  // 8 rather than 4, and 14pt of padding rather than 12: the nav absorbs ~30pt
  // of the rail's slack as breathing room inside itself instead of leaving it
  // to a spacer, and five rows read calmer for it.
  nav: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
  },
  // A filled pill rather than a text-colour change alone: at a glance the
  // active row should be findable without reading it.
  itemActive: { backgroundColor: palette.greenLift },
  itemPressed: { backgroundColor: palette.greenDeep },
  itemLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: palette.cream,
    opacity: 0.82,
  },
  itemLabelActive: { fontFamily: fonts.bodySemi, color: palette.mint, opacity: 1 },

  /**
   * The rail's leftover height, split rather than pooled.
   *
   * A 248x900 rail holds roughly 550pt of content, so about 350pt is slack —
   * and `space-between` used to pour all of it into one gap, which is what
   * read as a hole with the nav jammed against the wordmark above it. Two
   * weighted spacers spend the same 350 as ~140 above the nav and ~210 below:
   * no single void, and both gaps scale with the window instead of one fixed
   * number that is right at 900 and wrong at 1400.
   *
   * 2:3 rather than 1:1 deliberately. Equal gaps park the nav on the rail's
   * exact centre, which makes the wordmark look abandoned at the top; the
   * smaller share above keeps the nav reading as part of the upper group while
   * still clearing the logo. The larger share below is what stops the
   * ingredient card from looking bolted to the bottom edge — the air in front
   * of it is now a deliberate interval, not everything left over.
   *
   * `minHeight` on each is the short-window floor: 32 keeps the nav off the
   * wordmark and 24 keeps it off the card once the spacers have collapsed and
   * `navScroll` has started to shrink.
   */
  spacerTop: { flex: 2, minHeight: spacing['2xl'] },
  spacerBottom: { flex: 3, minHeight: spacing.xl },
  bottom: { gap: spacing.lg },

  today: {
    backgroundColor: palette.greenLift,
    borderRadius: radius.cardLg,
    borderWidth: 1,
    // A hairline so the card cannot be mistaken for an active nav pill, which
    // is the same green fill one step above it.
    borderColor: palette.green2,
    padding: spacing.md,
    gap: spacing.xs,
  },
  todayPressed: { opacity: 0.85 },
  todayEyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: palette.mint,
  },
  todayName: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.white,
  },
  todayNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: palette.cream,
  },
  todayEvidence: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  todayEvidenceLabel: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 1.1 },

  user: {
    gap: 2,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.greenLift,
  },
  userName: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: palette.white,
  },
  /**
   * Cream, not mint — the one thing the pattern forced to change.
   *
   * This line sits DIRECTLY on the rail with no surface of its own, so where a
   * doodle stroke passes behind it the local ground lifts from #0F4A43 to
   * about #216158. Mint at 0.85 measured 4.86:1 on the bare rail but only
   * 3.58:1 over the densest doodle — under AA — and mint cannot be rescued by
   * dropping the opacity either (4.29:1 at full strength). Cream at the same
   * 0.85 holds 5.39:1 in that worst case.
   *
   * Mint is not lost from the rail: it still carries the wordmark's sunrise,
   * the active nav row and the card's eyebrow, all of which sit on opaque
   * grounds where it measures 4.79:1 or better.
   */
  userMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.cream,
    opacity: 0.85,
  },
});
