import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { Badge } from './Badge';
import { Text } from './Text';
import type { EvidenceStrength, ResolvedRule, TimingSource } from '../lib/timing';
import type { Language } from '../lib/language';

/**
 * Evidence strength maps to badge tone so the visual weight matches the claim:
 * a hard rule reads as settled, a preference reads as neutral. This is the
 * whole point of surfacing `evidence_strength` — "SPF is daytime only" and
 * "many people prefer vitamin C in the morning" should not look identical.
 */
const EVIDENCE_TONE: Record<EvidenceStrength, 'success' | 'warning' | 'info'> = {
  rule: 'success',
  strong: 'warning',
  preference: 'info',
};

const COPY = {
  en: { source: 'Source', sources: 'Sources', openFailed: "Couldn't open the link" },
  tr: { source: 'Kaynak', sources: 'Kaynaklar', openFailed: 'Bağlantı açılamadı' },
} as const;

export function SourceLink({
  source,
  language,
}: {
  source: TimingSource;
  language: Language;
}) {
  const open = async () => {
    try {
      const supported = await Linking.canOpenURL(source.url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(source.url);
    } catch {
      // Show the URL rather than failing silently — the citation is the point.
      Alert.alert(COPY[language].openFailed, source.url);
    }
  };

  return (
    <Pressable
      accessibilityRole="link"
      onPress={open}
      style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
    >
      <Text variant="caption" style={styles.sourceIcon}>
        ↗
      </Text>
      <Text variant="caption" style={styles.sourceLabel}>
        {source.label}
      </Text>
    </Pressable>
  );
}

/**
 * Renders a rule's evidence badge, reason and citations.
 * Shared by the inline suggestion on the add screen and the sources screen, so
 * the two can never drift apart.
 */
export function TimingEvidence({
  rule,
  language,
  showReason = true,
}: {
  rule: ResolvedRule;
  language: Language;
  showReason?: boolean;
}) {
  const t = COPY[language];

  return (
    <View style={styles.wrapper}>
      <Badge label={rule.evidenceLabel.toUpperCase()} tone={EVIDENCE_TONE[rule.evidence]} />

      {showReason ? (
        <Text variant="caption" style={styles.reason}>
          {rule.reason}
        </Text>
      ) : null}

      <View style={styles.sources}>
        <Text variant="caption" tone="muted" style={styles.sourcesLabel}>
          {(rule.sources.length === 1 ? t.source : t.sources).toUpperCase()}
        </Text>
        {rule.sources.map((source) => (
          <SourceLink key={source.url} source={source} language={language} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm, alignItems: 'flex-start' },
  reason: { color: colors.text },
  sources: { gap: spacing.xs, alignSelf: 'stretch', marginTop: spacing.xs },
  sourcesLabel: { letterSpacing: 1.1 },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  pressed: { opacity: 0.65 },
  sourceIcon: { color: colors.primaryMuted, fontFamily: fonts.bodySemi },
  sourceLabel: { flex: 1, color: colors.primary, fontFamily: fonts.bodyMedium },
});
