import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

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
import { showAlert } from '../../lib/alert';
import { useIsWide } from '../../hooks/useLayout';
import { useLanguage } from '../../hooks/useLanguage';
import { useShelf } from '../../hooks/useShelf';
import { blankPlan, useWeeklyPlan } from '../../hooks/useWeeklyPlan';
import { messageFor } from '../../lib/errors';
import { conflictDisclaimer, resolveFinding } from '../../lib/conflicts';
import {
  cellConflicts,
  generateWeeklyPlan,
  moveProduct,
  productsFor,
  removeFromCell,
} from '../../lib/weekly-plan';
import type { Language } from '../../lib/language';
import { colors, fonts, radius, spacing } from '../../theme';
import { STEP_LABELS, type ShelfProduct } from '../../types/shelf';
import {
  isEmptyPlan,
  PLAN_SLOT_LABELS,
  PLAN_SLOTS,
  todayWeekday,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  WEEKDAYS,
  type PlanSlot,
  type Weekday,
  type WeeklyPlan,
} from '../../types/week';

const COPY = {
  en: {
    title: 'Your week',
    subtitle:
      'Which products go on which day. Actives are spread across the week so they never share an evening.',
    suggest: 'Suggest a plan for me',
    resuggest: 'Regenerate',
    startBlank: 'Build it myself',
    reset: 'Clear the plan',
    noPlanTitle: 'No weekly plan yet',
    noPlanBody:
      'Dewly can spread your actives across the week using your own shelf — retinoids and acids on separate evenings, everyday products every day. Or start from a blank week and place things yourself.',
    emptyShelfTitle: 'Add some products first',
    emptyShelfBody: 'A weekly plan is built from your shelf, so there is nothing to plan yet.',
    goToShelf: 'Go to my shelf',
    today: 'TODAY',
    suggestedBadge: 'SUGGESTED',
    manualBadge: 'YOURS',
    nothing: 'Nothing yet',
    add: 'Add a product',
    move: 'Move',
    remove: 'Remove',
    cancel: 'Cancel',
    moveTitle: (name: string) => `Where should ${name} go?`,
    unplaced: (names: string[]) =>
      `No room left for ${names.join(', ')} without creating a clash. Add ${
        names.length === 1 ? 'it' : 'them'
      } to a day yourself if you want ${names.length === 1 ? 'it' : 'them'} in.`,
    resetConfirm: 'Clear the whole plan?',
    resetBody: 'The Routine screen goes back to showing your full shelf each day.',
    overwriteConfirm: 'Replace your plan?',
    overwriteBody: 'You have edited this week yourself. Generating a new plan replaces it.',
    saveFailed: "Couldn't save the plan",
    pickDay: 'Pick a day',
  },
  tr: {
    title: 'Haftan',
    subtitle:
      'Hangi ürün hangi gün. Aktifler haftaya yayılır, böylece aynı akşama denk gelmezler.',
    suggest: 'Benim için bir plan öner',
    resuggest: 'Yeniden oluştur',
    startBlank: 'Kendim oluşturayım',
    reset: 'Planı temizle',
    noPlanTitle: 'Henüz haftalık plan yok',
    noPlanBody:
      'Dewly aktiflerini kendi rafına göre haftaya yayabilir — retinoidler ve asitler ayrı akşamlara, her gün kullanılanlar her güne. Ya da boş bir haftadan başlayıp kendin yerleştir.',
    emptyShelfTitle: 'Önce birkaç ürün ekle',
    emptyShelfBody: 'Haftalık plan rafından oluşturulur, şu an planlanacak bir şey yok.',
    goToShelf: 'Rafıma git',
    today: 'BUGÜN',
    suggestedBadge: 'ÖNERİLEN',
    manualBadge: 'SENİN',
    nothing: 'Henüz yok',
    add: 'Ürün ekle',
    move: 'Taşı',
    remove: 'Çıkar',
    cancel: 'Vazgeç',
    moveTitle: (name: string) => `${name} nereye gitsin?`,
    unplaced: (names: string[]) =>
      `${names.join(', ')} için çakışma yaratmadan yer kalmadı. İstersen kendin bir güne ekleyebilirsin.`,
    resetConfirm: 'Tüm plan temizlensin mi?',
    resetBody: 'Rutin ekranı yeniden her gün tüm rafını göstermeye döner.',
    overwriteConfirm: 'Planın değiştirilsin mi?',
    overwriteBody: 'Bu haftayı kendin düzenledin. Yeni plan oluşturmak mevcut planı değiştirir.',
    saveFailed: 'Plan kaydedilemedi',
    pickDay: 'Bir gün seç',
  },
} as const;

/** What the move sheet is currently acting on. */
type MoveTarget = { product: ShelfProduct; day: Weekday; slot: PlanSlot };

export default function WeeklyScreen() {
  const { products, status: shelfStatus, reload: reloadShelf } = useShelf();
  const { plan, status, savePlan, clearPlan, reload } = useWeeklyPlan();
  const { language } = useLanguage();
  const isWide = useIsWide();
  const t = COPY[language];

  const [moving, setMoving] = useState<MoveTarget | null>(null);
  const [unplaced, setUnplaced] = useState<string[]>([]);

  const busy = status === 'loading' || shelfStatus === 'loading';
  const failed = status === 'failed' || shelfStatus === 'failed';

  const persist = async (next: WeeklyPlan) => {
    try {
      await savePlan(next);
    } catch (error) {
      showAlert(t.saveFailed, messageFor(error, language));
    }
  };

  /** Path (a): accept a generated plan. */
  const suggest = async () => {
    const run = async () => {
      const { plan: generated, unplaced: left } = generateWeeklyPlan(products);
      setUnplaced(left);
      await persist(generated);
    };

    // A hand-edited plan is the user's work — never silently replaced.
    if (plan && plan.source === 'manual' && !isEmptyPlan(plan)) {
      showAlert(t.overwriteConfirm, t.overwriteBody, [
        { text: t.cancel, style: 'cancel' },
        { text: t.resuggest, onPress: () => void run() },
      ]);
      return;
    }
    await run();
  };

  /** Path (c): start from a blank week and place everything by hand. */
  const startBlank = async () => {
    setUnplaced([]);
    await persist(blankPlan());
  };

  const reset = () => {
    showAlert(t.resetConfirm, t.resetBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.reset,
        style: 'destructive',
        onPress: () => {
          setUnplaced([]);
          void clearPlan().catch((error) =>
            showAlert(t.saveFailed, messageFor(error, language))
          );
        },
      },
    ]);
  };

  /** Path (b): move an already-placed product to a different day/slot. */
  const commitMove = async (to: { day: Weekday; slot: PlanSlot }) => {
    if (!plan || !moving) return;
    const next = moveProduct(plan, moving.product.id, to, {
      day: moving.day,
      slot: moving.slot,
    });
    setMoving(null);
    await persist(next);
  };

  const drop = async (target: MoveTarget) => {
    if (!plan) return;
    setMoving(null);
    await persist(
      removeFromCell(plan, target.product.id, { day: target.day, slot: target.slot })
    );
  };

  if (busy) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const body = (
    <>
      <View style={isWide ? styles.wideHeader : styles.header}>
        <View style={styles.headerText}>
          <Text variant="h1">{t.title}</Text>
          <Text variant="body" tone="muted">
            {t.subtitle}
          </Text>
        </View>
        {plan && !isEmptyPlan(plan) ? (
          <Badge
            label={plan.source === 'suggested' ? t.suggestedBadge : t.manualBadge}
            tone={plan.source === 'suggested' ? 'info' : 'success'}
          />
        ) : null}
      </View>

      {failed ? (
        <View style={styles.errorWrap}>
          <ErrorState
            onRetry={() => {
              void reload();
              void reloadShelf();
            }}
          />
        </View>
      ) : products.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="h2">{t.emptyShelfTitle}</Text>
          <Text variant="body" tone="muted">
            {t.emptyShelfBody}
          </Text>
          <Button
            label={t.goToShelf}
            variant="secondary"
            onPress={() => router.navigate('/shelf')}
          />
        </Card>
      ) : plan === null ? (
        // The offer. Both paths out of here are one tap, and neither is
        // pre-selected — the generated plan is a suggestion, not a default.
        <Card style={styles.empty}>
          <Text variant="h2">{t.noPlanTitle}</Text>
          <Text variant="body" tone="muted">
            {t.noPlanBody}
          </Text>
          <View style={styles.emptyActions}>
            <Button label={t.suggest} onPress={() => void suggest()} />
            <Button label={t.startBlank} variant="secondary" onPress={() => void startBlank()} />
          </View>
        </Card>
      ) : (
        <>
          <View style={styles.actions}>
            <Button label={t.resuggest} variant="secondary" onPress={() => void suggest()} />
            <Button label={t.reset} variant="secondary" onPress={reset} />
          </View>

          {unplaced.length > 0 ? (
            <View style={styles.unplaced}>
              <Badge label={t.suggestedBadge} tone="warning" />
              <Text variant="caption" style={styles.unplacedText}>
                {t.unplaced(
                  unplaced
                    .map((id) => products.find((p) => p.id === id)?.name)
                    .filter((name): name is string => name !== undefined)
                )}
              </Text>
            </View>
          ) : null}

          <View style={isWide ? styles.weekWide : styles.week}>
            {WEEKDAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                plan={plan}
                shelf={products}
                language={language}
                wide={isWide}
                onPick={(product, slot) => setMoving({ product, day, slot })}
              />
            ))}
          </View>

          <View style={styles.disclaimer}>
            <Text variant="caption" tone="muted">
              {conflictDisclaimer(language)}
            </Text>
          </View>
        </>
      )}

      {moving ? (
        <MoveSheet
          target={moving}
          language={language}
          onMove={(to) => void commitMove(to)}
          onRemove={() => void drop(moving)}
          onCancel={() => setMoving(null)}
        />
      ) : null}
    </>
  );

  return isWide ? <DesktopPage>{body}</DesktopPage> : <Screen scroll>{body}</Screen>;
}

/**
 * One day of the calendar: a header, then the morning and evening cells.
 *
 * A column on desktop and a stacked card on the phone, but the same component —
 * the difference is which flex direction the parent uses, so the two can never
 * show different products for a Tuesday.
 */
function DayColumn({
  day,
  plan,
  shelf,
  language,
  wide,
  onPick,
}: {
  day: Weekday;
  plan: WeeklyPlan;
  shelf: ShelfProduct[];
  language: Language;
  wide: boolean;
  onPick: (product: ShelfProduct, slot: PlanSlot) => void;
}) {
  const t = COPY[language];
  const isToday = day === todayWeekday();

  return (
    <Card style={StyleSheet.flatten([styles.day, wide && styles.dayWide, isToday && styles.dayToday])}>
      <View style={styles.dayHeader}>
        <Text variant="caption" tone="muted" style={styles.dayName}>
          {wide ? WEEKDAY_SHORT[language][day] : WEEKDAY_LABELS[language][day].toUpperCase()}
        </Text>
        {isToday ? <Badge label={t.today} tone="success" /> : null}
      </View>

      {PLAN_SLOTS.map((slot) => (
        <SlotCell
          key={slot}
          plan={plan}
          shelf={shelf}
          day={day}
          slot={slot}
          language={language}
          onPick={onPick}
        />
      ))}
    </Card>
  );
}

/**
 * One AM or PM cell.
 *
 * The conflict check runs per cell, against exactly the products the user has
 * put on that evening, and renders the SAME resolved finding the Routine
 * screen's conflict cards show — severity badge, evidence badge, recommendation
 * and citations. That is what makes a hand edit honest: drag a retinoid onto an
 * acid night and the warning is the one from `conflict_rules.json`, not a
 * softer message written for the planner.
 */
function SlotCell({
  plan,
  shelf,
  day,
  slot,
  language,
  onPick,
}: {
  plan: WeeklyPlan;
  shelf: ShelfProduct[];
  day: Weekday;
  slot: PlanSlot;
  language: Language;
  onPick: (product: ShelfProduct, slot: PlanSlot) => void;
}) {
  const t = COPY[language];
  const items = productsFor(plan, shelf, day, slot);
  const findings = cellConflicts(items, slot).map((finding) =>
    resolveFinding(finding, language)
  );

  return (
    <View style={styles.slot}>
      <Text variant="caption" tone="muted" style={styles.slotLabel}>
        {PLAN_SLOT_LABELS[language][slot].toUpperCase()}
      </Text>

      {items.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t.nothing}
        </Text>
      ) : (
        items.map((product) => (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityLabel={`${product.name} — ${t.move}`}
            onPress={() => onPick(product, slot)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <BrandTile brand={product.brand} name={product.name} size={48} />
            <View style={styles.itemText}>
              <Text variant="caption" tone="muted" numberOfLines={1} style={styles.itemStep}>
                {STEP_LABELS[language][product.stepType].toUpperCase()}
              </Text>
              <Text variant="caption" numberOfLines={2} style={styles.itemName}>
                {product.name}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      {findings.map((finding) => (
        <View key={finding.key} style={styles.conflict}>
          <View style={styles.conflictHeader}>
            <Badge label={finding.severityLabel.toUpperCase()} tone="danger" />
            <Badge label={finding.evidenceLabel.toUpperCase()} tone="info" />
          </View>
          <Text variant="caption" style={styles.conflictText}>
            {finding.title}
          </Text>
          <Text variant="caption" tone="muted">
            {finding.recommendation}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The move control.
 *
 * A list of the fourteen destinations rather than drag-and-drop: dragging is
 * unreliable inside a scroll view on the phone and needs a gesture library the
 * app does not carry, and a 7x2 grid of buttons is faster to hit anyway.
 */
function MoveSheet({
  target,
  language,
  onMove,
  onRemove,
  onCancel,
}: {
  target: MoveTarget;
  language: Language;
  onMove: (to: { day: Weekday; slot: PlanSlot }) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const t = COPY[language];

  return (
    <Card style={styles.sheet}>
      <Text variant="h2">{t.moveTitle(target.product.name)}</Text>
      <Text variant="caption" tone="muted">
        {t.pickDay}
      </Text>

      {PLAN_SLOTS.map((slot) => (
        <View key={slot} style={styles.sheetRow}>
          <Text variant="caption" tone="muted" style={styles.slotLabel}>
            {PLAN_SLOT_LABELS[language][slot].toUpperCase()}
          </Text>
          <View style={styles.sheetDays}>
            {WEEKDAYS.map((day) => (
              <Chip
                key={day}
                label={WEEKDAY_SHORT[language][day]}
                selected={day === target.day && slot === target.slot}
                onPress={() => onMove({ day, slot })}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.sheetActions}>
        <Button label={t.remove} variant="secondary" onPress={onRemove} />
        <Button label={t.cancel} variant="secondary" onPress={onCancel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  wideHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headerText: { flex: 1, gap: spacing.sm },
  errorWrap: { marginTop: spacing.xl },

  empty: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },

  unplaced: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.status.warning.bg,
    borderColor: colors.status.warning.border,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  unplacedText: { color: colors.text },

  // Phone: one card per day, stacked. Desktop: seven columns side by side.
  week: { marginTop: spacing.lg, gap: spacing.md },
  weekWide: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },

  day: { gap: spacing.md, backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong },
  dayWide: { flex: 1, padding: spacing.md },
  dayToday: { borderColor: colors.primary, borderWidth: 1.5 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  dayName: { letterSpacing: 1.2, fontFamily: fonts.bodySemi },

  slot: { gap: spacing.xs },
  slotLabel: { letterSpacing: 1.1 },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs },
  pressed: { opacity: 0.7 },
  itemText: { flex: 1, gap: 2 },
  itemStep: { letterSpacing: 1 },
  itemName: { color: colors.text, fontFamily: fonts.bodyMedium },

  conflict: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.status.danger.bg,
    borderColor: colors.status.danger.border,
    gap: spacing.xs,
  },
  conflictHeader: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  conflictText: { color: colors.text, fontFamily: fonts.bodySemi },

  disclaimer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  sheet: { marginTop: spacing.xl, gap: spacing.md },
  sheetRow: { gap: spacing.xs },
  sheetDays: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
