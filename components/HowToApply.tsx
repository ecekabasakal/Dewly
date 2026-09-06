import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from './Badge';
import { Text } from './Text';
import { SourceLink } from './TimingEvidence';
import {
  howToFor,
  howtoDisclaimer,
  isEmptyGuidance,
  type HowToProduct,
} from '../lib/howto';
import type { Severity } from '../lib/conflicts';
import type { Language } from '../lib/language';
import type { EvidenceStrength } from '../lib/timing';
import { colors, fonts, radius, spacing } from '../theme';
import type { ShelfProduct } from '../types/shelf';

/** Same mapping the timing suggestion uses, so one grade reads one way. */
const EVIDENCE_TONE: Record<EvidenceStrength, 'success' | 'warning' | 'info'> = {
  rule: 'success',
  strong: 'warning',
  preference: 'info',
};

/** Same mapping `ConflictCheck` uses. */
const SEVERITY_TONE: Record<Severity, 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const COPY = {
  en: {
    heading: 'How to use',
    morning: 'Best in the morning',
    evening: 'Best in the evening',
    watchOut: 'Watch out',
    show: 'Show',
    hide: 'Hide',
    sources: 'Sources',
  },
  tr: {
    heading: 'Nasıl kullanılır',
    morning: 'Sabah kullanımı önerilir',
    evening: 'Akşam kullanımı önerilir',
    watchOut: 'Dikkat',
    show: 'Göster',
    hide: 'Gizle',
    sources: 'Kaynaklar',
  },
} as const;

export type HowToApplyProps = {
  product: HowToProduct;
  /** The shelf the dynamic half is evaluated against. See `howToFor`. */
  shelf: ShelfProduct[];
  language: Language;
  /**
   * Render the timing rule's reason and citations inline.
   *
   * On by default. The product screen turns it off — and only that half, not
   * the timing line itself — because its own `TimingSuggestion` card sits
   * directly above and already carries both. Two copies of one citation on one
   * screen is not more evidence, it is noise.
   */
  showTimingEvidence?: boolean;
};

/**
 * "How to use" — both static lengths in one place, plus the dynamic layer.
 *
 * ## The disclosure
 *
 * The short apply line is always visible: one sentence is cheap enough to show
 * under every step, and a routine where each step says nothing until tapped is
 * a routine that reads as empty. Pressing "Show" swaps the LONG copy into the
 * same slot rather than adding it below — the long version already contains
 * everything the short one says, so stacking them would make the reader parse
 * the same instruction twice to find the extra detail.
 *
 * Identical on the Routine step cards and the product screen. The earlier
 * split — long on one screen, short on the other — meant the same bottle got
 * different amounts of advice depending on where you looked at it, and there
 * was no way to get the detail without leaving the screen you were on.
 *
 * ## What is never behind the tap
 *
 * The timing line, the conflicts and the disclaimer stay visible in both
 * states. That is deliberate for the conflicts especially: this app does not
 * collapse a warning behind a control the reader has to know to press, the
 * same rule the Discover feed follows with its evidence grades. The disclaimer
 * stays for the same reason — advice is on screen while collapsed, so the
 * caveat has to be too.
 *
 * ## What is static and what is not
 *
 * The apply copy is per step type and identical for everyone, so it gets no
 * badge and no citation — it has none to give. Everything below it came from
 * an engine and keeps that engine's own treatment: the timing line carries the
 * evidence badge and sources `TimingEvidence` shows on the add screen, and a
 * conflict carries the severity badge, recommendation and sources
 * `ConflictCheck` shows on the Routine screen. Nothing is restated in this
 * component's words.
 */
export function HowToApply({
  product,
  shelf,
  language,
  showTimingEvidence = true,
}: HowToApplyProps) {
  const [open, setOpen] = useState(false);
  const t = COPY[language];

  const guidance = howToFor(product, shelf, language);
  if (isEmptyGuidance(guidance)) return null;

  // The long copy takes the short one's slot when expanded. Falls back to
  // whichever exists, so a step with only one of the two still renders.
  const apply = open
    ? (guidance.applyLong ?? guidance.applyShort)
    : (guidance.applyShort ?? guidance.applyLong);
  const canExpand = guidance.applyLong !== null && guidance.applyLong !== guidance.applyShort;

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="caption" tone="muted" style={styles.heading}>
          {t.heading.toUpperCase()}
        </Text>

        {canExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${t.heading} — ${product.name}`}
            onPress={() => setOpen((value) => !value)}
            hitSlop={8}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          >
            <Text variant="caption" tone="primary" style={styles.toggleAction}>
              {open ? t.hide : t.show}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {apply ? (
        <Text variant="caption" style={styles.apply}>
          {apply}
        </Text>
      ) : null}

      {guidance.timing ? (
        <View style={styles.line}>
          <View style={styles.lineHeader}>
            <Text variant="caption" style={styles.lineTitle}>
              {guidance.timing.time === 'am' ? t.morning : t.evening}
            </Text>
            <Badge
              label={guidance.timing.rule.evidenceLabel.toUpperCase()}
              tone={EVIDENCE_TONE[guidance.timing.rule.evidence]}
            />
          </View>

          {showTimingEvidence ? (
            <>
              <Text variant="caption" tone="muted">
                {guidance.timing.rule.reason}
              </Text>
              <Sources
                sources={guidance.timing.rule.sources}
                label={t.sources}
                language={language}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {guidance.conflicts.map((finding) => (
        <View key={finding.key} style={[styles.line, styles.conflict]}>
          <View style={styles.lineHeader}>
            <Text variant="caption" style={styles.lineTitle}>
              {t.watchOut}
            </Text>
            <Badge
              label={finding.severityLabel.toUpperCase()}
              tone={SEVERITY_TONE[finding.severity]}
            />
            <Badge label={finding.evidenceLabel.toUpperCase()} tone="info" />
          </View>

          {/* The recommendation, not the explanation: this block answers "what
              do I do with this bottle", and the full explanation is in the
              Routine screen's conflict section. */}
          <Text variant="caption" style={styles.recommendation}>
            {finding.recommendation}
          </Text>

          <Sources sources={finding.sources} label={t.sources} language={language} />
        </View>
      ))}

      <Text variant="caption" tone="muted" style={styles.disclaimer}>
        {howtoDisclaimer(language)}
      </Text>
    </View>
  );
}

function Sources({
  sources,
  label,
  language,
}: {
  sources: { label: string; url: string }[];
  label: string;
  language: Language;
}) {
  if (sources.length === 0) return null;

  return (
    <View style={styles.sources}>
      <Text variant="caption" tone="muted" style={styles.sourcesLabel}>
        {label.toUpperCase()}
      </Text>
      {sources.map((source) => (
        <SourceLink key={source.url} source={source} language={language} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { letterSpacing: 1.1 },
  toggle: {
    // Pushes the control to the right of the section label.
    marginLeft: 'auto',
    // 44pt: this is the control that reveals the detail, and it sits in a list
    // where a bare word would be an easy miss.
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    // Cancels the padding so the label stays flush with the card's edge.
    marginRight: -spacing.sm,
  },
  pressed: { opacity: 0.7 },
  toggleAction: { fontFamily: fonts.bodyMedium },

  apply: { color: colors.text },

  line: {
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  // A conflict is the one thing in this block that is a warning rather than
  // information, so it gets the tinted ground the rest does not.
  conflict: {
    backgroundColor: colors.status.warning.bg,
    borderColor: colors.status.warning.border,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  lineTitle: { color: colors.text, fontFamily: fonts.bodySemi },
  recommendation: { color: colors.text },

  sources: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.xs },
  sourcesLabel: { letterSpacing: 1.1 },

  disclaimer: { marginTop: spacing.xs },
});
