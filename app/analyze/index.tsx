import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Button, Screen, Text } from '../../components';
import { useAnalysis } from '../../hooks/useAnalysis';
import { parseInciList } from '../../lib/inci';
import { colors, fonts, radius, spacing, typography } from '../../theme';

const SAMPLE = `Aqua, Glycerin, Niacinamide, Butylene Glycol, Centella Asiatica Extract, Sodium Hyaluronate, Panthenol, Squalane, Cocos Nucifera (Coconut) Oil, Tocopherol, Parfum, Limonene, Phenoxyethanol`;

export default function PasteScreen() {
  const [text, setText] = useState('');
  const { analyze, status } = useAnalysis();

  const tokenCount = parseInciList(text).length;
  const isLoading = status === 'loading';
  const canSubmit = tokenCount > 0 && !isLoading;

  const run = async () => {
    const ok = await analyze(text);
    if (ok) router.push('/analyze/results');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="h1">Analyze a product</Text>
          <Text variant="body" tone="muted">
            Paste the ingredient list from the back of the bottle. Commas or new
            lines both work.
          </Text>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder="Aqua, Glycerin, Niacinamide…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Ingredient list"
        />

        <View style={styles.meta}>
          <Text variant="caption" tone="muted">
            {tokenCount === 0
              ? 'Nothing to analyze yet'
              : `${tokenCount} ingredient${tokenCount === 1 ? '' : 's'} detected`}
          </Text>
          {text.length > 0 ? (
            <Text variant="caption" tone="primary" onPress={() => setText('')}>
              Clear
            </Text>
          ) : null}
        </View>

        <Button
          label={isLoading ? 'Analyzing…' : 'Analyze'}
          onPress={run}
          disabled={!canSubmit}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.submit}
        />

        <View style={styles.sampleBlock}>
          <Text variant="caption" tone="muted">
            Not near a bottle?
          </Text>
          <Button
            label="Use a sample list"
            variant="secondary"
            onPress={() => setText(SAMPLE)}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xl,
    minHeight: 180,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
  },
  meta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submit: { marginTop: spacing.lg },
  sampleBlock: { marginTop: spacing['2xl'], gap: spacing.sm, alignItems: 'flex-start' },
});
