import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Badge, Button, Card, Screen, Text } from '../../components';
import { useShelf } from '../../hooks/useShelf';
import { groupByStep } from '../../lib/routine';
import { colors, spacing } from '../../theme';
import { STEP_LABELS, TIME_OF_DAY_LABELS, type ShelfProduct } from '../../types/shelf';

export default function ShelfScreen() {
  const { products, isLoaded, removeProduct } = useShelf();

  if (!isLoaded) return null;

  const groups = groupByStep(products);

  const confirmRemove = (product: ShelfProduct) => {
    Alert.alert('Remove product?', `"${product.name}" will be taken off your shelf.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removeProduct(product.id);
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">My shelf</Text>
        <Text variant="body" tone="muted">
          {products.length === 0
            ? 'The products you own, in routine order.'
            : `${products.length} product${products.length === 1 ? '' : 's'}, grouped by step.`}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Add a product"
          size="lg"
          fullWidth
          onPress={() => router.push('/product')}
        />
        {products.length > 0 ? (
          <Button
            label="View AM / PM routine"
            variant="secondary"
            fullWidth
            onPress={() => router.navigate('/routine')}
          />
        ) : null}
      </View>

      {products.length === 0 ? <EmptyState /> : null}

      {groups.map((group) => (
        <View key={group.step} style={styles.group}>
          <Text variant="caption" tone="muted" style={styles.groupTitle}>
            {STEP_LABELS[group.step].toUpperCase()}
          </Text>
          <View style={styles.groupBody}>
            {group.products.map((product) => (
              <Card key={product.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <Text variant="h2">{product.name}</Text>
                    {product.brand ? (
                      <Text variant="caption" tone="muted">
                        {product.brand}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={TIME_OF_DAY_LABELS[product.timeOfDay]}
                    tone={product.timeOfDay === 'both' ? 'info' : 'success'}
                  />
                </View>

                {product.ingredientNames.length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {product.ingredientNames.length} ingredients saved from an analysis
                  </Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Button
                    label="Edit"
                    variant="secondary"
                    onPress={() => router.push(`/product?id=${product.id}`)}
                  />
                  <Button
                    label="Remove"
                    variant="secondary"
                    onPress={() => confirmRemove(product)}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function EmptyState() {
  return (
    <Card style={styles.empty}>
      <Text variant="h2">Nothing here yet</Text>
      <Text variant="body" tone="muted">
        Add the products you already use and Dewly will order them into a morning
        and evening routine.
      </Text>
      <Text variant="caption" tone="muted">
        You can also add a product straight from an ingredient analysis — the step
        gets guessed for you.
      </Text>
      <Button
        label="Analyze a product"
        variant="secondary"
        onPress={() => router.navigate('/analyze')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  empty: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  group: { marginTop: spacing.xl },
  groupTitle: { letterSpacing: 1.2 },
  groupBody: { marginTop: spacing.md, gap: spacing.md },
  card: { gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { flex: 1, gap: 2 },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
