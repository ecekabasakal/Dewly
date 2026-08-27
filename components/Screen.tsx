import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Off by default so lists can own scrolling. */
  scroll?: boolean;
  /** Remove the default horizontal gutter (for edge-to-edge lists). */
  noPadding?: boolean;
  backgroundColor?: string;
  /** Which insets to honor. Bottom is excluded by default for tab bars. */
  edges?: readonly Edge[];
  contentContainerStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll = false,
  noPadding = false,
  backgroundColor = colors.background,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
}: ScreenProps) {
  const padding = noPadding ? null : styles.padded;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padding, styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  scrollContent: { paddingBottom: spacing['3xl'] },
});
