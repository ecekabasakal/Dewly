import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, MAX_DESKTOP_WIDTH, spacing } from '../theme';

export type DesktopPageProps = {
  children: ReactNode;
};

/**
 * The content area beside the desktop sidebar.
 *
 * `Screen` is the phone equivalent and stays exactly as it is — this is a
 * sibling for the desktop branch rather than a replacement, so nothing about
 * the mobile layout depends on it.
 *
 * Two nested containers on purpose. The outer one scrolls and paints butter
 * across the whole remaining window, so an ultra-wide monitor is filled with
 * background rather than a hard edge where the content stops. The inner one is
 * capped at `MAX_DESKTOP_WIDTH` and centred, so a routine step never becomes a
 * metre-wide line with the product name adrift at one end.
 */
export function DesktopPage({ children }: DesktopPageProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
    // Centres the capped column without stretching short pages.
    alignItems: 'center',
  },
  column: { width: '100%', maxWidth: MAX_DESKTOP_WIDTH },
});
