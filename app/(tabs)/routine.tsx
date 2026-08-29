import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Badge, Button, Card, Chip, Screen, Text } from '../../components';
import { ConflictCheck } from '../../components/ConflictCheck';
import { useLanguage } from '../../hooks/useLanguage';
import { findConflicts } from '../../lib/conflicts';
import { useShelf } from '../../hooks/useShelf';
import { buildRoutine, type Routine, type RoutineSlot } from '../../lib/routine';
import { colors, fonts, radius, spacing } from '../../theme';
import { STEP_LABELS, TIME_OF_DAY_LABELS } from '../../types/shelf';

export default function RoutineScreen() {
  const { products, isLoaded } = useShelf();
  // `?slot=pm` opens straight to the evening routine — handy for a link from a
  // future evening reminder, and for deep-linking during testing.
  const params = useLocalSearchParams<{ slot?: string }>();
  const [slot, setSlot] = useState<RoutineSlot>(params.slot === 'pm' ? 'pm' : 'am');

  const { language } = useLanguage();

  if (!isLoaded) return null;

  const routine = buildRoutine(products, slot);
  // Conflicts are checked across the WHOLE shelf, not just the visible slot —
  // an evening clash still matters while you are looking at the morning.
  const findings = findConflicts(products);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">Your routine</Text>
        <Text variant="body" tone="muted">
          Ordered the way skincare layers — thinnest to richest, SPF last.
        </Text>
      </View>

      <View style={styles.tabs}>
        <Chip label="Morning" selected={slot === 'am'} onPress={() => setSlot('am')} />
        <Chip label="Evening" selected={slot === 'pm'} onPress={() => setSlot('pm')} />
      </View>

      {products.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="h2">No products yet</Text>
          <Text variant="body" tone="muted">
            Add what you own and Dewly will put it in order for you.
          </Text>
          <Button
            label="Go to my shelf"
            variant="secondary"
            onPress={() => router.navigate('/shelf')}
          />
        </Card>
      ) : (
        <>
          <RoutineList routine={routine} />
          <ConflictCheck findings={findings} language={language} />
        </>
      )}
    </Screen>
  );
}

function RoutineList({ routine }: { routine: Routine }) {
  const { entries, warnings, missingSteps, slot } = routine;

  return (
    <>
      {warnings.map((warning) => (
        <View
          key={warning.kind}
          style={[styles.warning, styles.warningDanger]}
        >
          <Badge label="WRONG SLOT" tone="danger" />
          <Text variant="caption" style={styles.warningText}>
            {`${warning.productNames.join(', ')} ${
              warning.productNames.length === 1 ? 'is' : 'are'
            } SPF, which only works in daylight. Move ${
              warning.productNames.length === 1 ? 'it' : 'them'
            } to AM.`}
          </Text>
        </View>
      ))}

      {entries.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="h2">
            Nothing scheduled for the {slot === 'am' ? 'morning' : 'evening'}
          </Text>
          <Text variant="body" tone="muted">
            Your shelf has products, but none are marked{' '}
            {slot === 'am' ? 'AM' : 'PM'}. Edit a product to change when you use it.
          </Text>
        </Card>
      ) : (
        <View style={styles.steps}>
          {entries.map((entry) => (
            <View key={entry.product.id} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text variant="caption" style={styles.stepNumberText}>
                  {entry.position}
                </Text>
              </View>

              <Card
                style={StyleSheet.flatten([
                  styles.stepCard,
                  entry.misplaced && styles.stepCardFlagged,
                ])}
              >
                <View style={styles.stepHeader}>
                  <Text variant="caption" tone="muted" style={styles.stepLabel}>
                    {STEP_LABELS[entry.product.stepType].toUpperCase()}
                  </Text>
                  {entry.misplaced ? <Badge label="AM ONLY" tone="danger" /> : null}
                </View>
                <Text variant="h2">{entry.product.name}</Text>
                {entry.product.brand ? (
                  <Text variant="caption" tone="muted">
                    {entry.product.brand} · {TIME_OF_DAY_LABELS[entry.product.timeOfDay]}
                  </Text>
                ) : (
                  <Text variant="caption" tone="muted">
                    {TIME_OF_DAY_LABELS[entry.product.timeOfDay]}
                  </Text>
                )}
              </Card>
            </View>
          ))}
        </View>
      )}

      {missingSteps.length > 0 && entries.length > 0 ? (
        <View style={styles.gaps}>
          <Text variant="caption" tone="muted" style={styles.gapsTitle}>
            STEPS YOU DON'T HAVE
          </Text>
          <View style={styles.gapsRow}>
            {missingSteps.map((step) => (
              <View key={step} style={styles.gapChip}>
                <Text variant="caption" tone="muted">
                  {STEP_LABELS[step]}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" tone="muted">
            A routine doesn't need every step — this is just what's absent.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Edit shelf"
          variant="secondary"
          onPress={() => router.navigate('/shelf')}
        />
        <Button
          label="Why these timings?"
          variant="secondary"
          onPress={() => router.push('/timings')}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  empty: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  warning: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  warningDanger: {
    backgroundColor: colors.status.danger.bg,
    borderColor: colors.status.danger.border,
  },
  warningWarn: {
    backgroundColor: colors.status.warning.bg,
    borderColor: colors.status.warning.border,
  },
  warningText: { color: colors.text },
  steps: { marginTop: spacing.xl, gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  stepNumberText: { color: colors.onPrimary, fontFamily: fonts.bodySemi },
  stepCard: { flex: 1, gap: 2 },
  stepCardFlagged: {
    borderColor: colors.status.danger.border,
    borderWidth: 1.5,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepLabel: { letterSpacing: 1.1 },
  gaps: { marginTop: spacing['2xl'], gap: spacing.sm },
  gapsTitle: { letterSpacing: 1.2 },
  gapsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gapChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
});
