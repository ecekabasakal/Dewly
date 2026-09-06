import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from './Badge';
import { Text } from './Text';
import { SourceLink } from './TimingEvidence';
import {
  howToFor,
  howtoDisclaimer,
  isEmptyGuidance,
  type HowToDetail,
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
  detail: HowToDetail;
  /**
   * Collapse behind a disclosure, closed by default.
   *
   * On the Routine screen this is on: a routine is a list to work down, and a
   * paragraph plus citations under every one of six steps turns it into an
   * essay. The guidance is one tap away and the routine stays scannable.
   * Off on the product screen, where there is one product and the guidance is
   * the point of the block.
   */
  collapsible?: boolean;
};

/**
 * The two guidance layers, rendered together.
 *
 * ## What is static and what is not
 *
 * The apply paragraph is per step type and identical for everyone — it gets no
 * badge and no citation, because it has none to give, and the file's own
 * disclaimer sits under the block saying so.
 *
 * Everything below it came from an engine and keeps the treatment that engine's
 * output already has elsewhere in the app: the timing line carries its evidence
 * badge and its sources exactly as `TimingEvidence` shows them on the add
 * screen, and a conflict carries its severity badge, its recommendation and its
 * sources exactly as `ConflictCheck` shows them on the Routine screen. Nothing
 * here restates a claim in this component's own words — a user who has seen the
 * conflict section should recognise the same finding here.
 *
 * ## Short vs long
 *
 * `short` drops the static copy to one line and the timing to its badge and
 * heading, because the full reason and its citations are already on screen in
 * the product form's own timing card. It keeps the conflict in full: that is
 * the one thing the product screen has no other way to say.
 */
export function HowToApply({
  product,
  shelf,
  language,
  detail,
  collapsible = false,
}: HowToApplyProps) {
  const [open, setOpen] = useState(!collapsible);
  const t = COPY[language];

  const guidance = howToFor(product, shelf, language, detail);
  if (isEmptyGuidance(guidance)) return null;

  const long = detail === 'long';

  const body = (
    <View style={styles.body}>
      {guidance.apply ? (
        <Text variant="caption" style={styles.apply}>
          {guidance.apply}
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

          {/* The reason and its citations only on the long form — the product
              screen already shows both in its own timing card. */}
          {long ? (
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

  if (!collapsible) {
    return (
      <View style={styles.block}>
        <Text variant="caption" tone="muted" style={styles.heading}>
          {t.heading.toUpperCase()}
        </Text>
        {body}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t.heading} — ${product.name}`}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text variant="caption" tone="muted" style={styles.heading}>
          {t.heading.toUpperCase()}
        </Text>
        {/* A conflict is the one thing worth seeing while the block is shut. */}
        {guidance.conflicts.length > 0 ? (
          <Badge
            label={guidance.conflicts[0]!.severityLabel.toUpperCase()}
            tone={SEVERITY_TONE[guidance.conflicts[0]!.severity]}
          />
        ) : null}
        <Text variant="caption" tone="primary" style={styles.toggleAction}>
          {open ? t.hide : t.show}
        </Text>
      </Pressable>

      {open ? body : null}
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
  block: { marginTop: spacing.md, gap: spacing.xs },
  heading: { letterSpacing: 1.1 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // 44pt: this is the control that reveals the guidance, and it sits in a
    // list where a short row would be easy to miss.
    minHeight: 44,
  },
  pressed: { opacity: 0.7 },
  // Pushes the show/hide action to the right of the heading and the badge.
  toggleAction: { marginLeft: 'auto', fontFamily: fonts.bodyMedium },

  body: { gap: spacing.sm },
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
