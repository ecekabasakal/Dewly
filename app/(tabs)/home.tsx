import { Alert, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Badge, Button, Card, Chip, Screen, Text } from '../../components';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import {
  AGE_RANGE_LABELS,
  CONCERN_LABELS,
  GOAL_LABELS,
  SENSITIVITY_LABELS,
  SKIN_TYPE_LABELS,
} from '../../types/profile';

export default function Home() {
  const { profile, isLoaded, resetProfile } = useProfile();

  if (!isLoaded) return null;
  // Reachable if storage is cleared while this screen is mounted.
  if (!profile) return <Redirect href="/onboarding" />;

  const confirmReset = () => {
    Alert.alert(
      'Reset onboarding?',
      'This clears your saved profile and starts the flow from step 1. For testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetProfile();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const savedAt = new Date(profile.completedAt);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="display">Dewly</Text>
        <Text variant="body" tone="muted">
          Paste a product's ingredient list and Dewly will tell you what's in it.
        </Text>
        <Button
          label="Analyze ingredients"
          size="lg"
          fullWidth
          onPress={() => router.navigate('/analyze')}
          style={styles.cta}
        />
        <View style={styles.ctaRow}>
          <Button
            label="My shelf"
            variant="secondary"
            onPress={() => router.navigate('/shelf')}
            style={styles.ctaHalf}
          />
          <Button
            label="My routine"
            variant="secondary"
            onPress={() => router.navigate('/routine')}
            style={styles.ctaHalf}
          />
        </View>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="h2">Skin type</Text>
          <Badge label={SKIN_TYPE_LABELS[profile.skinType].toUpperCase()} tone="success" />
        </View>
        <Text variant="caption" tone="muted">
          Sensitivity: {SENSITIVITY_LABELS[profile.sensitivity]} · Age:{' '}
          {AGE_RANGE_LABELS[profile.ageRange]}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="h2">Concerns</Text>
        <Text variant="caption" tone="muted">
          {profile.concerns.length} selected — matched against `targets_concerns`
        </Text>
        <View style={styles.grid}>
          {profile.concerns.map((concern) => (
            <Chip key={concern} label={CONCERN_LABELS[concern]} selected />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text variant="h2">Goals</Text>
        {profile.goals.length > 0 ? (
          <View style={styles.grid}>
            {profile.goals.map((goal) => (
              <Chip key={goal} label={GOAL_LABELS[goal]} selected />
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="muted">
            None selected — this step is optional.
          </Text>
        )}
      </Card>

      <View style={styles.debug}>
        <Text variant="caption" tone="muted">
          Saved {savedAt.toLocaleString()} · profile v{profile.version}
        </Text>
        <Button label="Reset onboarding" variant="secondary" onPress={confirmReset} />
        <Text variant="caption" tone="muted">
          Force-quit and reopen the app to confirm the profile survives a restart.
        </Text>
      </View>
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
  debug: { marginTop: spacing['2xl'], gap: spacing.md, alignItems: 'flex-start' },
});
