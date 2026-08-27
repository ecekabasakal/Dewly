import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Chip, Screen, Text } from '../components';
import { colors, spacing, typography } from '../theme';

/**
 * Design-system reference screen. Not part of the user flow — reach it at
 * `/kitchen-sink` to eyeball every component and type-scale step at once.
 *
 * Fonts, splash and safe-area now live in `app/_layout.tsx`, so this is a
 * plain route.
 */
export default function KitchenSink() {
  const [concerns, setConcerns] = useState<string[]>(['Acne']);
  const [loading, setLoading] = useState(false);

  const toggle = (name: string) =>
    setConcerns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const simulateLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <Screen scroll>
      <Section title="Type scale">
        <Text variant="display">Dewly</Text>
        <Text variant="h1">Build your routine</Text>
        <Text variant="h2">Ingredient analysis</Text>
        <Text variant="body">
          Paste an ingredient list and Dewly tells you what each INCI name
          actually does for your skin.
        </Text>
        <Text variant="caption" tone="muted">
          CAPTION · Educational information only, not medical advice.
        </Text>
      </Section>

      <Section title="Text tones">
        <Text tone="default">Default ink on butter</Text>
        <Text tone="muted">Muted secondary copy</Text>
        <Text tone="primary">Primary green emphasis</Text>
      </Section>

      <Section title="Buttons">
        <Button label="Analyze ingredients" onPress={simulateLoad} fullWidth />
        <Button label="Secondary action" variant="secondary" fullWidth />
        <Button label="Large primary" size="lg" fullWidth />
        <Button label="Loading" loading={loading} onPress={simulateLoad} fullWidth />
        <Button label="Disabled" disabled fullWidth />
      </Section>

      <Section title="Chips (multi-select)">
        <View style={styles.row}>
          {['Acne', 'Dryness', 'Redness', 'Aging', 'Dark spots'].map((name) => (
            <Chip
              key={name}
              label={name}
              selected={concerns.includes(name)}
              onPress={() => toggle(name)}
            />
          ))}
        </View>
        <Text variant="caption" tone="muted">
          Selected: {concerns.length ? concerns.join(', ') : 'none'}
        </Text>
      </Section>

      <Section title="Badges">
        <View style={styles.row}>
          <Badge label="NEUTRAL" />
          <Badge label="SAFE" tone="success" />
          <Badge label="CAUTION" tone="warning" />
          <Badge label="HIGH RISK" tone="danger" />
          <Badge label="NOTE" tone="info" />
        </View>
      </Section>

      <Section title="Cards">
        <Card>
          <View style={styles.cardHeader}>
            <Text variant="h2">Niacinamide</Text>
            <Badge label="SAFE" tone="success" />
          </View>
          <Text variant="caption" tone="muted">
            Vitamin B3 · Brightening
          </Text>
          <Text style={styles.cardBody}>
            Supports the skin barrier and helps even out tone. Plays well with
            most actives in an evening routine.
          </Text>
          <View style={styles.row}>
            <Chip label="Humectant" />
            <Chip label="Antioxidant" />
          </View>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text variant="h2">Retinol + AHA</Text>
            <Badge label="HIGH RISK" tone="danger" />
          </View>
          <Text variant="caption" tone="muted">
            Interaction · Same-night use
          </Text>
          <Text style={styles.cardBody}>
            Layering a retinoid with an exfoliating acid can over-strip the
            barrier. Consider alternating nights instead.
          </Text>
        </Card>

        <Card onPress={simulateLoad}>
          <Text variant="h2">Pressable card</Text>
          <Text variant="caption" tone="muted">
            Tap me — used for product and routine-step rows.
          </Text>
        </Card>
      </Section>

      <Section title="Surfaces">
        <View style={styles.swatchRow}>
          <Swatch label="butter" color={colors.background} />
          <Swatch label="cream" color={colors.surface} />
          <Swatch label="green" color={colors.primary} />
          <Swatch label="green2" color={colors.primaryMuted} />
        </View>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" tone="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: color }]} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  sectionTitle: { letterSpacing: 1.2 },
  sectionBody: { marginTop: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardBody: { ...typography.body, color: colors.text, marginVertical: spacing.sm },
  swatchRow: { flexDirection: 'row', gap: spacing.lg },
  swatch: { alignItems: 'center', gap: spacing.xs },
  swatchChip: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
