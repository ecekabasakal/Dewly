import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Badge, Button, Card, Chip, ErrorState, Screen, Text } from '../../components';
import { ConflictCheck } from '../../components/ConflictCheck';
import { useLanguage } from '../../hooks/useLanguage';
import { findConflicts } from '../../lib/conflicts';
import { useShelf } from '../../hooks/useShelf';
import { buildRoutine, type Routine, type RoutineSlot } from '../../lib/routine';
import type { Language } from '../../lib/language';
import { colors, fonts, radius, spacing } from '../../theme';
import { STEP_LABELS, TIME_OF_DAY_LABELS } from '../../types/shelf';

const COPY = {
  en: {
    title: 'Your routine',
    subtitle: 'Ordered the way skincare layers — thinnest to richest, SPF last.',
    morning: 'Morning',
    evening: 'Evening',
    emptyTitle: 'No products yet',
    emptyBody: 'Add what you own and Dewly will put it in order for you.',
    goToShelf: 'Go to my shelf',
    wrongSlotBadge: 'WRONG SLOT',
    spfInPm: (names: string[]) =>
      `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} SPF, which only works in ` +
      `daylight. Move ${names.length === 1 ? 'it' : 'them'} to AM.`,
    amOnlyBadge: 'AM ONLY',
    nothingScheduled: (slot: RoutineSlot) =>
      `Nothing scheduled for the ${slot === 'am' ? 'morning' : 'evening'}`,
    nothingScheduledBody: (slot: RoutineSlot) =>
      `Your shelf has products, but none are marked ${slot === 'am' ? 'AM' : 'PM'}. ` +
      `Edit a product to change when you use it.`,
    missingTitle: "STEPS YOU DON'T HAVE",
    missingHint: "A routine doesn't need every step — this is just what's absent.",
    editShelf: 'Edit shelf',
    whyTimings: 'Why these timings?',
  },
  tr: {
    title: 'Rutinin',
    subtitle: 'Cilt bakımının katman sırasına göre — en hafiften en zengine, SPF en sonda.',
    morning: 'Sabah',
    evening: 'Akşam',
    emptyTitle: 'Henüz ürün yok',
    emptyBody: 'Sahip olduklarını ekle, Dewly senin için sıraya koysun.',
    goToShelf: 'Rafıma git',
    wrongSlotBadge: 'YANLIŞ ZAMAN',
    spfInPm: (names: string[]) =>
      `${names.join(', ')} güneş koruyucu ve yalnızca gün ışığında işe yarar. ` +
      `AM'ye taşı.`,
    amOnlyBadge: 'SADECE AM',
    nothingScheduled: (slot: RoutineSlot) =>
      `${slot === 'am' ? 'Sabah' : 'Akşam'} için planlanmış bir şey yok`,
    nothingScheduledBody: (slot: RoutineSlot) =>
      `Rafında ürün var ama hiçbiri ${slot === 'am' ? 'AM' : 'PM'} olarak işaretlenmemiş. ` +
      `Ne zaman kullandığını değiştirmek için ürünü düzenle.`,
    missingTitle: 'SENDE OLMAYAN ADIMLAR',
    missingHint: 'Bir rutinde her adım olmak zorunda değil — bu sadece eksik olanlar.',
    editShelf: 'Rafı düzenle',
    whyTimings: 'Bu zamanlamalar neden?',
  },
} as const;

export default function RoutineScreen() {
  const { products, status, reload } = useShelf();
  // `?slot=pm` opens straight to the evening routine — handy for a link from a
  // future evening reminder, and for deep-linking during testing.
  const params = useLocalSearchParams<{ slot?: string }>();
  const [slot, setSlot] = useState<RoutineSlot>(params.slot === 'pm' ? 'pm' : 'am');

  const { language } = useLanguage();
  const t = COPY[language];

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const routine = buildRoutine(products, slot);
  // Conflicts are checked across the WHOLE shelf, not just the visible slot —
  // an evening clash still matters while you are looking at the morning.
  const findings = findConflicts(products);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {t.subtitle}
        </Text>
      </View>

      <View style={styles.tabs}>
        <Chip label={t.morning} selected={slot === 'am'} onPress={() => setSlot('am')} />
        <Chip label={t.evening} selected={slot === 'pm'} onPress={() => setSlot('pm')} />
      </View>

      {/* A failed shelf read renders as an error, not as "no products yet" —
          the empty state would misreport the user's routine as empty. */}
      {status === 'failed' ? (
        <ErrorState onRetry={() => void reload()} />
      ) : products.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="h2">{t.emptyTitle}</Text>
          <Text variant="body" tone="muted">
            {t.emptyBody}
          </Text>
          <Button
            label={t.goToShelf}
            variant="secondary"
            onPress={() => router.navigate('/shelf')}
          />
        </Card>
      ) : (
        <>
          <RoutineList routine={routine} language={language} />
          <ConflictCheck findings={findings} language={language} />
        </>
      )}
    </Screen>
  );
}

function RoutineList({ routine, language }: { routine: Routine; language: Language }) {
  const { entries, warnings, missingSteps, slot } = routine;
  const t = COPY[language];

  return (
    <>
      {warnings.map((warning) => (
        <View
          key={warning.kind}
          style={[styles.warning, styles.warningDanger]}
        >
          <Badge label={t.wrongSlotBadge} tone="danger" />
          <Text variant="caption" style={styles.warningText}>
            {t.spfInPm(warning.productNames)}
          </Text>
        </View>
      ))}

      {entries.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="h2">{t.nothingScheduled(slot)}</Text>
          <Text variant="body" tone="muted">
            {t.nothingScheduledBody(slot)}
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
                  <Text
                    variant="caption"
                    tone="muted"
                    numberOfLines={2}
                    style={styles.stepLabel}
                  >
                    {STEP_LABELS[language][entry.product.stepType].toUpperCase()}
                  </Text>
                  {entry.misplaced ? <Badge label={t.amOnlyBadge} tone="danger" /> : null}
                </View>
                <Text variant="h2">{entry.product.name}</Text>
                {entry.product.brand ? (
                  <Text variant="caption" tone="muted">
                    {entry.product.brand} ·{' '}
                    {TIME_OF_DAY_LABELS[language][entry.product.timeOfDay]}
                  </Text>
                ) : (
                  <Text variant="caption" tone="muted">
                    {TIME_OF_DAY_LABELS[language][entry.product.timeOfDay]}
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
            {t.missingTitle}
          </Text>
          <View style={styles.gapsRow}>
            {missingSteps.map((step) => (
              <View key={step} style={styles.gapChip}>
                <Text variant="caption" tone="muted">
                  {STEP_LABELS[language][step]}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {t.missingHint}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t.editShelf}
          variant="secondary"
          onPress={() => router.navigate('/shelf')}
        />
        <Button
          label={t.whyTimings}
          variant="secondary"
          onPress={() => router.push('/timings')}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  stepLabel: { letterSpacing: 1.1, flex: 1 },
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
