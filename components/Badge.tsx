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
      <Text variant="caption" style={[styles.label, { color: scheme.fg }]}>
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
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
