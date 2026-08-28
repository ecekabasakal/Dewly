import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOr } from '../lib/navigation';

import { Badge, Button, Card, Chip, Screen, Text } from '../components';
import { TimingEvidence } from '../components/TimingEvidence';
import { useLanguage } from '../hooks/useLanguage';
import { allRules, timingDisclaimer, type ResolvedRule } from '../lib/timing';
import { colors, radius, spacing } from '../theme';

const COPY = {
  en: {
    title: 'Why these timings?',
    intro:
      'Dewly suggests a time of day from the ingredients and the product name. Every suggestion comes from one of the rules below, with its source.',
    morning: 'Morning (AM)',
    evening: 'Evening (PM)',
    strengthTitle: 'What the badges mean',
    strengths: [
      ['Rule', 'A settled fact about how the ingredient works.'],
      ['Strong suggestion', 'Backed by a regulator or clinical literature.'],
      ['General preference', 'Common practice, not an official requirement.'],
    ] as [string, string][],
    back: 'Back',
  },
  tr: {
    title: 'Bu zamanlamalar neden?',
    intro:
      'Dewly, içeriklere ve ürün adına bakarak bir kullanım zamanı önerir. Her öneri aşağıdaki kurallardan birine ve kaynağına dayanır.',
    morning: 'Sabah (AM)',
    evening: 'Akşam (PM)',
    strengthTitle: 'Rozetler ne anlama geliyor',
    strengths: [
      ['Kural', 'İçeriğin nasıl çalıştığına dair yerleşik bir gerçek.'],
      ['Güçlü öneri', 'Bir düzenleyici kurum veya klinik literatür tarafından destekleniyor.'],
      ['Genel tercih', 'Yaygın uygulama, resmi bir zorunluluk değil.'],
    ] as [string, string][],
    back: 'Geri',
  },
} as const;

export default function TimingsScreen() {
  const { language, setLanguage } = useLanguage();
  const t = COPY[language];
  const rules = allRules(language);

  const morning = rules.filter((rule) => rule.recommendedTime === 'am');
  const evening = rules.filter((rule) => rule.recommendedTime === 'pm');

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {t.intro}
        </Text>
      </View>

      <View style={styles.langRow}>
        <Chip label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} />
        <Chip label="TR" selected={language === 'tr'} onPress={() => setLanguage('tr')} />
      </View>

      <RuleGroup title={t.morning} rules={morning} language={language} />
      <RuleGroup title={t.evening} rules={evening} language={language} />

      <View style={styles.legend}>
        <Text variant="caption" tone="muted" style={styles.sectionTitle}>
          {t.strengthTitle.toUpperCase()}
        </Text>
        {t.strengths.map(([label, meaning]) => (
          <View key={label} style={styles.legendRow}>
            <Text variant="caption" style={styles.legendLabel}>
              {label}
            </Text>
            <Text variant="caption" tone="muted" style={styles.legendMeaning}>
              {meaning}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <Text variant="caption" tone="muted">
          {timingDisclaimer(language)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label={t.back} variant="secondary" onPress={() => goBackOr('/home')} />
      </View>
    </Screen>
  );
}

function RuleGroup({
  title,
  rules,
  language,
}: {
  title: string;
  rules: ResolvedRule[];
  language: 'en' | 'tr';
}) {
  if (rules.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text variant="caption" tone="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.groupBody}>
        {rules.map((rule) => (
          <Card key={rule.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text variant="h2">{ruleTitle(rule.id, language)}</Text>
              <Badge
                label={rule.recommendedTime.toUpperCase()}
                tone={rule.recommendedTime === 'am' ? 'success' : 'info'}
              />
            </View>
            <TimingEvidence rule={rule} language={language} />
          </Card>
        ))}
      </View>
    </View>
  );
}

/**
 * Human titles for each rule id. Kept here rather than in the data file so the
 * JSON stays a pure rules/citation source without display copy in it.
 */
function ruleTitle(id: string, language: 'en' | 'tr'): string {
  const titles: Record<string, { en: string; tr: string }> = {
    'retinoid-pm': { en: 'Retinoids', tr: 'Retinoidler' },
    'aha-pm': { en: 'AHAs (glycolic, lactic, mandelic)', tr: 'AHA’lar (glikolik, laktik, mandelik)' },
    'bha-pm': { en: 'BHA (salicylic acid)', tr: 'BHA (salisilik asit)' },
    'vitaminc-am': { en: 'Vitamin C', tr: 'C vitamini' },
    'spf-am': { en: 'Sunscreen', tr: 'Güneş koruyucu' },
  };
  return titles[id]?.[language] ?? id;
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  group: { marginTop: spacing.xl },
  sectionTitle: { letterSpacing: 1.2 },
  groupBody: { marginTop: spacing.md, gap: spacing.md },
  card: { gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  legend: { marginTop: spacing['2xl'], gap: spacing.sm },
  legendRow: { gap: 2 },
  legendLabel: { color: colors.text },
  legendMeaning: {},
  disclaimer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: { marginTop: spacing.lg, alignItems: 'flex-start' },
});
