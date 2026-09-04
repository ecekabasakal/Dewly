import { ScrollView, StyleSheet, View } from 'react-native';

import { DiscoverColumn } from './DiscoverColumn';
import { Text } from './Text';
import { useLanguage } from '../hooks/useLanguage';
import { colors, fonts, PANEL_WIDTH, spacing } from '../theme';

const COPY = {
  en: { title: 'Discover' },
  tr: { title: 'Keşfet' },
} as const;

/**
 * The persistent Discover rail: a fixed-width green column down the right of
 * every desktop tab screen.
 *
 * ## Where it is mounted
 *
 * In `app/(tabs)/_layout.tsx`, as a sibling of the whole `<Tabs>` navigator
 * rather than inside any screen. That is what makes it persistent and
 * consistent: it does not unmount when you switch tabs, it does not need each
 * of the five screens to opt in, and a screen added later gets it for free.
 * The tab screens simply have less width to lay out in, which they already
 * discover through `desktopContentWidth`.
 *
 * ## Why it scrolls separately
 *
 * Its own `ScrollView`, so a long feed does not drag the page with it and a
 * long page does not scroll the feed away. The rail is a companion to the
 * screen, not part of its document.
 *
 * On narrow viewports this is never rendered at all — the caller gates on
 * `useHasDiscoverPanel`, so the phone tree contains none of it.
 */
export function DiscoverPanel() {
  const { language } = useLanguage();

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{COPY[language].title}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DiscoverColumn onPanel />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: PANEL_WIDTH,
    height: '100%',
    backgroundColor: colors.panel.bg,
    paddingTop: spacing.xl,
    // The rail reads as a plane behind the app rather than a card beside it,
    // so it gets an edge rather than a shadow.
    borderLeftWidth: 1,
    borderLeftColor: colors.panel.muted,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.panel.ink,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
});
