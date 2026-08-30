import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing, type StatusTone } from '../theme';
import { Text } from './Text';

export type BadgeProps = {
  label: string;
  /**
   * Status tone. Phase 7 maps conflict severity onto these:
   * high → danger, medium → warning, low → info.
   */
  tone?: StatusTone | 'neutral';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const scheme =
    tone === 'neutral'
      ? { bg: colors.surface, fg: colors.muted, border: colors.border }
      : colors.status[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: scheme.bg, borderColor: scheme.border }]}
    >
      {/* Single line by design — a badge that wraps reads as a broken pill
          rather than a label. Turkish labels run longer than their English
          equivalents ("SADECE AM", "GÜÇLÜ KANIT"), so in a constrained row the
          badge shrinks and ellipsizes instead of pushing the title out. */}
      <Text
        variant="caption"
        numberOfLines={1}
        style={[styles.label, { color: scheme.fg }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    // May shrink when a row runs out of width, but never below what a couple
    // of characters plus the ellipsis needs.
    flexShrink: 1,
    minWidth: 44,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
