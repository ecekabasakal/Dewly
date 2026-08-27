import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { Text } from './Text';

export type OptionRowProps = {
  label: string;
  /** Optional second line — used to explain a skin type or sensitivity level. */
  description?: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Full-width choice row for single-select steps.
 *
 * Chips suit multi-select (many short labels, order-free), but a single-select
 * question reads better as a vertical list: one tap target per line, and room
 * for a clarifying description.
 */
export function OptionRow({ label, description, selected, onPress }: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <Text
          variant="body"
          tone={selected ? 'onPrimary' : 'default'}
          style={styles.label}
        >
          {label}
        </Text>
        {description ? (
          <Text
            variant="caption"
            tone={selected ? 'onPrimary' : 'muted'}
            style={selected && styles.descriptionSelected}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <View style={[styles.dot, selected ? styles.dotSelected : styles.dotEmpty]}>
        {selected ? <View style={styles.dotInner} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 60,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { opacity: 0.8 },
  copy: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodyMedium },
  // The cream-on-green caption needs a touch of transparency or it competes
  // with the label above it.
  descriptionSelected: { opacity: 0.85 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { borderColor: colors.onPrimary },
  dotEmpty: { borderColor: colors.borderStrong },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.onPrimary,
  },
});
