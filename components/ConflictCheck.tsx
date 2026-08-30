import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from './index';
import { SourceLink } from './TimingEvidence';
import {
  clearMessage,
  conflictDisclaimer,
  resolveFinding,
  type ConflictFinding,
  type Severity,
} from '../lib/conflicts';
import type { Language } from '../lib/language';
import { colors, fonts, radius, spacing } from '../theme';
import { TIME_OF_DAY_LABELS } from '../types/shelf';

/**
 * Severity maps to badge tone. `low` deliberately lands on `info` rather than a
 * third warning colour — a low-severity note should read as information, not a
 * dimmer alarm.
 */
const SEVERITY_TONE: Record<Severity, 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const COPY = {
  en: {
    heading: 'Conflict check',
    subtitle: (n: number) =>
      n === 0
        ? 'Dewly looked at your morning and evening routines separately.'
        : `${n} thing${n === 1 ? '' : 's'} worth knowing about your routine.`,
    solution: 'What you can do',
    triggeredBy: 'From',
    morning: 'Morning',
    evening: 'Evening',
    wholeRoutine: 'Whole routine',
    sources: 'Sources',
  },
  tr: {
    heading: 'Çakışma kontrolü',
    subtitle: (n: number) =>
      n === 0
        ? 'Dewly sabah ve akşam rutinlerini ayrı ayrı inceledi.'
        : `Rutininde bilmeye değer ${n} nokta var.`,
    solution: 'Ne yapabilirsin',
    triggeredBy: 'Şu ürünlerden',
    morning: 'Sabah',
    evening: 'Akşam',
    wholeRoutine: 'Tüm rutin',
    sources: 'Kaynaklar',
  },
} as const;

export function ConflictCheck({
  findings,
  language,
}: {
  findings: ConflictFinding[];
  language: Language;
}) {
  const t = COPY[language];

  return (
    <View style={styles.section}>
      <Text variant="caption" tone="muted" style={styles.sectionTitle}>
        {t.heading.toUpperCase()}
      </Text>
      <Text variant="caption" tone="muted">
        {t.subtitle(findings.length)}
      </Text>

      <View style={styles.body}>
        {findings.length === 0 ? (
          <View style={styles.clear}>
            <Badge label="✓" tone="success" />
            <Text variant="body" style={styles.clearText}>
              {clearMessage(language)}
            </Text>
          </View>
        ) : (
          findings.map((finding) => (
            <FindingCard key={finding.key} finding={finding} language={language} t={t} />
          ))
        )}
      </View>

      <View style={styles.disclaimer}>
        <Text variant="caption" tone="muted">
          {conflictDisclaimer(language)}
        </Text>
      </View>
    </View>
  );
}

function FindingCard({
  finding,
  language,
  t,
}: {
  finding: ConflictFinding;
  language: Language;
  // Union of both languages: `as const` makes each variant's literal types
  // distinct, so keying on 'en' alone would reject the Turkish copy.
  t: (typeof COPY)[Language];
}) {
  const r = resolveFinding(finding, language);
  const slotLabel =
    r.slot === 'am' ? t.morning : r.slot === 'pm' ? t.evening : t.wholeRoutine;

  return (
    <Card style={StyleSheet.flatten([styles.card, cardAccent(r.severity)])}>
      <View style={styles.headerRow}>
        <Badge label={r.severityLabel.toUpperCase()} tone={SEVERITY_TONE[r.severity]} />
        <Badge label={slotLabel.toUpperCase()} />
      </View>

      <Text variant="h2">{r.title}</Text>

      <Badge label={r.evidenceLabel.toUpperCase()} tone="info" />

      <Text style={styles.explanation}>{r.explanation}</Text>

      {/* The advice, framed as an option rather than an instruction. */}
      <View style={styles.solution}>
        <Text variant="caption" tone="muted" style={styles.solutionLabel}>
          {t.solution.toUpperCase()}
        </Text>
        <Text variant="caption" style={styles.solutionText}>
          {r.recommendation}
        </Text>
      </View>

      {r.products.length > 0 ? (
        <Text variant="caption" tone="muted">
          {/* Each product shows its own time_of_day, so an "AM + PM" product
              appearing in a morning finding reads as intentional rather than
              looking like the two slots were pooled together. */}
          {t.triggeredBy}:{' '}
          {r.products
            .map((p) => `${p.name} (${TIME_OF_DAY_LABELS[language][p.timeOfDay]})`)
            .join(' · ')}
        </Text>
      ) : null}

      <View style={styles.sources}>
        <Text variant="caption" tone="muted" style={styles.sourcesLabel}>
          {t.sources.toUpperCase()}
        </Text>
        {r.sources.map((source) => (
          <SourceLink key={source.url} source={source} language={language} />
        ))}
      </View>
    </Card>
  );
}

function cardAccent(severity: Severity) {
  const scheme = colors.status[SEVERITY_TONE[severity]];
  return { borderColor: scheme.border, borderWidth: 1.5 };
}

const styles = StyleSheet.create({
  section: { marginTop: spacing['2xl'], gap: spacing.sm },
  sectionTitle: { letterSpacing: 1.2 },
  body: { marginTop: spacing.md, gap: spacing.md },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.status.success.bg,
    borderColor: colors.status.success.border,
  },
  clearText: { flex: 1, color: colors.status.success.fg },
  // No `alignItems: 'flex-start'` here: it stops the title and explanation from
  // wrapping at the card's width, clipping them mid-sentence. Badge already
  // sets its own `alignSelf: 'flex-start'`, so the badges stay hugged.
  card: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  explanation: { marginTop: spacing.xs },
  solution: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  solutionLabel: { letterSpacing: 1.1 },
  solutionText: { color: colors.text, fontFamily: fonts.bodyMedium },
  sources: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.xs },
  sourcesLabel: { letterSpacing: 1.1 },
  disclaimer: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
