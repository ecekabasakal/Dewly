import { StyleSheet, View } from 'react-native';
import { colors, elevation, fonts, radius, spacing } from '../theme';
import { Text } from './Text';

/** Which accent role the ring carries. See `colors.accents`. */
export type MetricTone = keyof typeof colors.accents;

export type MetricCardProps = {
  value: number;
  /** Two short lines at most — it sits under a 44pt ring in a third of the row. */
  label: string;
  tone: MetricTone;
};

/**
 * One number about the user's own data, in a row of three.
 *
 * Every value shown here is counted from what the user actually has. There is
 * no score, no grade and no index: an invented "skin health: 82" would be the
 * single least trustworthy thing in a product whose whole job is telling people
 * what is really in the bottle. A card with nothing real behind it is omitted
 * by the caller rather than filled with a placeholder.
 *
 * The ring is the accent; the numeral inside it is `colors.text`. That split is
 * deliberate — the accent inks are 1.8–2.8:1 on their own grounds, fine for a
 * stroke and nowhere near legible as type.
 */
export function MetricCard({ value, label, tone }: MetricCardProps) {
  const accent = colors.accents[tone];

  return (
    <View style={styles.card}>
      <View style={[styles.ring, { backgroundColor: accent.bg, borderColor: accent.ink }]}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text variant="caption" tone="muted" style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fraunces, not the body face: the numeral is the thing being read here, and
  // the serif is what makes the row feel like a spread rather than a dashboard.
  value: {
    fontFamily: fonts.headingBold,
    fontSize: 19,
    lineHeight: 24,
    color: colors.text,
  },
  label: { textAlign: 'center' },
});
