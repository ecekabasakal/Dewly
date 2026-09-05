import { useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Badge,
  BrandTile,
  Button,
  Card,
  Chip,
  DesktopPage,
  ErrorState,
  Screen,
  Text,
} from '../../components';
import { ConflictCheck } from '../../components/ConflictCheck';
import { useIsWide } from '../../hooks/useLayout';
import { useLanguage } from '../../hooks/useLanguage';
import type { ConflictFinding } from '../../lib/conflicts';
import { findConflicts } from '../../lib/conflicts';
import { useShelf } from '../../hooks/useShelf';
import {
  buildRoutine,
  type Routine,
  type RoutineEntry,
  type RoutineSlot,
} from '../../lib/routine';
import type { Language } from '../../lib/language';
import {
  colors,
  desktopContentWidth,
  fonts,
  radius,
  routineStepColumns,
  spacing,
} from '../../theme';
import {
  STEP_LABELS,
  STEP_ORDER,
  type ShelfProduct,
  type StepType,
  TIME_OF_DAY_LABELS,
} from '../../types/shelf';

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
    stepsTitle: 'THE ORDER',
    stepsCount: (n: number) => `${n} step${n === 1 ? '' : 's'} in this routine`,
    orderTitle: 'THE ORDER DEWLY WILL USE',
    orderHint: "You don't need every step — add what you own and these fill in.",
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
    stepsTitle: 'SIRA',
    stepsCount: (n: number) => `Bu rutinde ${n} adım var`,
    orderTitle: 'DEWLY’NİN KULLANACAĞI SIRA',
    orderHint: 'Her adım olmak zorunda değil — sahip olduklarını ekle, burası dolsun.',
  },
} as const;

export default function RoutineScreen() {
  const { products, status, reload } = useShelf();
  // `?slot=pm` opens straight to the evening routine — handy for a link from a
  // future evening reminder, and for deep-linking during testing.
  const params = useLocalSearchParams<{ slot?: string }>();
  const [slot, setSlot] = useState<RoutineSlot>(params.slot === 'pm' ? 'pm' : 'am');

  const { language } = useLanguage();
  const isWide = useIsWide();
  const { width } = useWindowDimensions();
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

  if (isWide) {
    return (
      <RoutineDesktop
        status={status}
        products={products}
        routine={routine}
        findings={findings}
        slot={slot}
        setSlot={setSlot}
        reload={() => void reload()}
        columns={routineStepColumns(desktopContentWidth(width))}
        language={language}
      />
    );
  }

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
  const { entries, missingSteps, slot } = routine;
  const t = COPY[language];

  return (
    <>
      <SpfWarnings routine={routine} language={language} />

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
            <StepCard key={entry.product.id} entry={entry} language={language} />
          ))}
        </View>
      )}

      {missingSteps.length > 0 && entries.length > 0 ? (
        <MissingSteps steps={missingSteps} language={language} />
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

// ---------------------------------------------------------------------------
// Shared pieces — identical markup on both layouts, so the phone cannot drift
// ---------------------------------------------------------------------------

/** One numbered step: position marker, brand tile, step label, product. */
function StepCard({ entry, language }: { entry: RoutineEntry; language: Language }) {
  const t = COPY[language];

  return (
    <View style={styles.stepRow}>
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
        <View style={styles.stepBody}>
          <BrandTile brand={entry.product.brand} name={entry.product.name} size={48} />
          <View style={styles.stepText}>
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
          </View>
        </View>
      </Card>
    </View>
  );
}

function MissingSteps({ steps, language }: { steps: StepType[]; language: Language }) {
  const t = COPY[language];

  return (
    <View style={styles.gaps}>
      <Text variant="caption" tone="muted" style={styles.gapsTitle}>
        {t.missingTitle}
      </Text>
      <View style={styles.gapsRow}>
        {steps.map((step) => (
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
  );
}

function SpfWarnings({ routine, language }: { routine: Routine; language: Language }) {
  const t = COPY[language];

  return (
    <>
      {routine.warnings.map((warning) => (
        <View key={warning.kind} style={[styles.warning, styles.warningDanger]}>
          <Badge label={t.wrongSlotBadge} tone="danger" />
          <Text variant="caption" style={styles.warningText}>
            {t.spfInPm(warning.productNames)}
          </Text>
        </View>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------

/**
 * Splits an ordered list into COLUMN-MAJOR columns.
 *
 * Column-major (1-2-3 down the left, 4-5-6 down the right) rather than
 * row-major: the routine is a sequence, and reading it top-to-bottom is the
 * same motion the phone teaches. Row-major would ask the eye to zig-zag across
 * a gutter between every consecutive pair of steps.
 *
 * Short columns are kept rather than dropped — an empty `stepColumn` is a
 * `flex: 1` spacer, so a lone step keeps the width it would have had in a full
 * two-column routine instead of stretching across the whole page.
 */
function splitIntoColumns<T>(items: T[], columns: number): T[][] {
  if (columns <= 1) return [items];
  const perColumn = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, index) =>
    items.slice(index * perColumn, (index + 1) * perColumn)
  );
}

type RoutineDesktopProps = {
  status: 'ready' | 'failed';
  products: ShelfProduct[];
  routine: Routine;
  findings: ConflictFinding[];
  slot: RoutineSlot;
  setSlot: (next: RoutineSlot) => void;
  reload: () => void;
  columns: number;
  language: Language;
};

/**
 * Desktop Routine: a full-width header with the actions on the right, the
 * AM/PM toggle, the steps in up to two columns, then the conflict check across
 * the whole content width.
 *
 * The steps are two columns of ONE slot rather than AM and PM side by side.
 * Side-by-side would read well but it costs the toggle its job — two slots on
 * screen at once makes the AM/PM chips decorative, and it halves the width for
 * every step permanently, including the mornings where a user has three
 * products and the evening column would sit half empty. Two columns of the
 * selected slot keep the toggle meaningful, and a 6-step routine that took a
 * scroll on the phone now fits above the fold.
 *
 * The conflict check gets the full content width, below the steps and behind a
 * hairline. It is the one section here whose cards carry a paragraph of
 * explanation, an advice block and a list of citations — it is the reason to
 * put the steps in columns at all, since that is what leaves it room.
 */
function RoutineDesktop({
  status,
  products,
  routine,
  findings,
  slot,
  setSlot,
  reload,
  columns,
  language,
}: RoutineDesktopProps) {
  const t = COPY[language];
  const { entries, missingSteps } = routine;

  return (
    <DesktopPage>
      <View style={styles.wideHeader}>
        <View style={styles.wideHeaderText}>
          <Text variant="h1">{t.title}</Text>
          <Text variant="body" tone="muted">
            {t.subtitle}
          </Text>
        </View>
        {/* The two actions the phone parks at the bottom of the scroll. There
            is room for them beside the title, so they stay visible. */}
        <View style={styles.wideHeaderActions}>
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
      </View>

      {status === 'failed' ? (
        <View style={styles.wideError}>
          <ErrorState onRetry={reload} />
        </View>
      ) : products.length === 0 ? (
        <EmptyRoutineWide language={language} />
      ) : (
        <>
          <View style={styles.tabs}>
            <Chip label={t.morning} selected={slot === 'am'} onPress={() => setSlot('am')} />
            <Chip label={t.evening} selected={slot === 'pm'} onPress={() => setSlot('pm')} />
          </View>

          <SpfWarnings routine={routine} language={language} />

          {entries.length === 0 ? (
            <Card style={styles.empty}>
              <Text variant="h2">{t.nothingScheduled(slot)}</Text>
              <Text variant="body" tone="muted">
                {t.nothingScheduledBody(slot)}
              </Text>
            </Card>
          ) : (
            <>
              <View style={styles.wideSectionHeader}>
                <Text variant="caption" tone="muted" style={styles.gapsTitle}>
                  {t.stepsTitle}
                </Text>
                <Text variant="caption" tone="muted">
                  {t.stepsCount(entries.length)}
                </Text>
              </View>

              <View style={styles.stepColumns}>
                {splitIntoColumns(entries, columns).map((column, index) => (
                  <View key={index} style={styles.stepColumn}>
                    {column.map((entry) => (
                      <StepCard key={entry.product.id} entry={entry} language={language} />
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}

          {missingSteps.length > 0 && entries.length > 0 ? (
            <MissingSteps steps={missingSteps} language={language} />
          ) : null}

          <View style={styles.wideConflicts}>
            <ConflictCheck findings={findings} language={language} />
          </View>
        </>
      )}
    </DesktopPage>
  );
}

/**
 * The wide empty state.
 *
 * The phone's version is one short card, which on a 820pt page reads as a
 * dialog someone forgot to centre. Here the same copy takes the left third and
 * the canonical step order fills the rest, so the card answers "what will this
 * screen become" instead of only "there is nothing here". The chips are
 * `STEP_ORDER` itself — the same list the routine is sorted by, not a mockup.
 */
function EmptyRoutineWide({ language }: { language: Language }) {
  const t = COPY[language];

  return (
    <Card style={styles.wideEmpty}>
      <View style={styles.wideEmptyText}>
        <Text variant="h2">{t.emptyTitle}</Text>
        <Text variant="body" tone="muted">
          {t.emptyBody}
        </Text>
        <Button label={t.goToShelf} onPress={() => router.navigate('/shelf')} />
      </View>

      <View style={styles.wideEmptyOrder}>
        <Text variant="caption" tone="muted" style={styles.gapsTitle}>
          {t.orderTitle}
        </Text>
        <View style={styles.gapsRow}>
          {STEP_ORDER.map((step) => (
            <View key={step} style={styles.gapChip}>
              <Text variant="caption" tone="muted">
                {STEP_LABELS[language][step]}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="caption" tone="muted">
          {t.orderHint}
        </Text>
      </View>
    </Card>
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
  stepBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  // Without flex the text column cannot shrink beside the thumbnail, and a long
  // Turkish product name pushes the card past the screen edge.
  stepText: { flex: 1, gap: 2 },
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

  // --- desktop only ---
  wideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xl,
  },
  wideHeaderText: { flex: 1, gap: spacing.sm },
  wideHeaderActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  wideError: { marginTop: spacing.xl },
  wideSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing['2xl'],
  },
  stepColumns: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  // `flex: 1` on every column, including an empty one — see `splitIntoColumns`.
  stepColumn: { flex: 1, gap: spacing.md },
  // A hairline rather than a heading change: the conflict check brings its own
  // section title, and the rule is what marks it as a band of its own after the
  // two columns of steps close.
  wideConflicts: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  wideEmpty: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing['2xl'],
    alignItems: 'flex-start',
  },
  wideEmptyText: { flex: 2, gap: spacing.md, alignItems: 'flex-start' },
  wideEmptyOrder: { flex: 3, gap: spacing.sm },
});
