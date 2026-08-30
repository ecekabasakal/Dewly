import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Badge, Button, Card, Chip, Screen, Text } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import {
  AGE_RANGE_LABELS,
  CONCERN_LABELS,
  GOAL_LABELS,
  SENSITIVITY_LABELS,
  SKIN_TYPE_LABELS,
} from '../../types/profile';

const COPY = {
  en: {
    tagline: "Paste a product's ingredient list and Dewly will tell you what's in it.",
    analyze: 'Analyze ingredients',
    shelf: 'My shelf',
    routine: 'My routine',
    skinType: 'Skin type',
    sensitivity: 'Sensitivity',
    age: 'Age',
    concerns: 'Concerns',
    concernsCount: (n: number) => `${n} selected — matched against \`targets_concerns\``,
    goals: 'Goals',
    noGoals: 'None selected — this step is optional.',
  },
  tr: {
    tagline: 'Bir ürünün içerik listesini yapıştır, Dewly içinde ne olduğunu anlatsın.',
    analyze: 'İçerikleri analiz et',
    shelf: 'Rafım',
    routine: 'Rutinim',
    skinType: 'Cilt tipi',
    sensitivity: 'Hassasiyet',
    age: 'Yaş',
    concerns: 'Cilt sorunları',
    concernsCount: (n: number) => `${n} seçildi — \`targets_concerns\` ile eşleştiriliyor`,
    goals: 'Hedefler',
    noGoals: 'Hiçbiri seçilmedi — bu adım isteğe bağlı.',
  },
} as const;

export default function Home() {
  const { profile, isLoaded } = useProfile();
  const { language } = useLanguage();
  const t = COPY[language];

  if (!isLoaded) return null;
  // Reachable if storage is cleared while this screen is mounted.
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="display">Dewly</Text>
        <Text variant="body" tone="muted">
          {t.tagline}
        </Text>
        <Button
          label={t.analyze}
          size="lg"
          fullWidth
          onPress={() => router.navigate('/analyze')}
          style={styles.cta}
        />
        <View style={styles.ctaRow}>
          <Button
            label={t.shelf}
            variant="secondary"
            onPress={() => router.navigate('/shelf')}
            style={styles.ctaHalf}
          />
          <Button
            label={t.routine}
            variant="secondary"
            onPress={() => router.navigate('/routine')}
            style={styles.ctaHalf}
          />
        </View>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="h2">{t.skinType}</Text>
          <Badge
            label={SKIN_TYPE_LABELS[language][profile.skinType].toUpperCase()}
            tone="success"
          />
        </View>
        <Text variant="caption" tone="muted">
          {t.sensitivity}: {SENSITIVITY_LABELS[language][profile.sensitivity]} · {t.age}:{' '}
          {AGE_RANGE_LABELS[language][profile.ageRange]}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="h2">{t.concerns}</Text>
        <Text variant="caption" tone="muted">
          {t.concernsCount(profile.concerns.length)}
        </Text>
        <View style={styles.grid}>
          {profile.concerns.map((concern) => (
            <Chip key={concern} label={CONCERN_LABELS[language][concern]} selected />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text variant="h2">{t.goals}</Text>
        {profile.goals.length > 0 ? (
          <View style={styles.grid}>
            {profile.goals.map((goal) => (
              <Chip key={goal} label={GOAL_LABELS[language][goal]} selected />
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="muted">
            {t.noGoals}
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  cta: { marginTop: spacing.md },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  ctaHalf: { flex: 1 },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
