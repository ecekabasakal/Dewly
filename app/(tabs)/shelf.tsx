import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Badge, Button, Card, Screen, Text } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { useShelf } from '../../hooks/useShelf';
import { groupByStep } from '../../lib/routine';
import type { Language } from '../../lib/language';
import { colors, spacing } from '../../theme';
import { STEP_LABELS, TIME_OF_DAY_LABELS, type ShelfProduct } from '../../types/shelf';

const COPY = {
  en: {
    title: 'My shelf',
    emptySubtitle: 'The products you own, in routine order.',
    subtitle: (n: number) =>
      `${n} product${n === 1 ? '' : 's'}, grouped by step.`,
    add: 'Add a product',
    viewRoutine: 'View AM / PM routine',
    removeTitle: 'Remove product?',
    removeBody: (name: string) => `"${name}" will be taken off your shelf.`,
    cancel: 'Cancel',
    remove: 'Remove',
    edit: 'Edit',
    savedIngredients: (n: number) => `${n} ingredients saved from an analysis`,
    emptyTitle: 'Nothing here yet',
    emptyBody:
      'Add the products you already use and Dewly will order them into a morning and evening routine.',
    emptyHint:
      'You can also add a product straight from an ingredient analysis — the step gets guessed for you.',
    analyze: 'Analyze a product',
  },
  tr: {
    title: 'Rafım',
    emptySubtitle: 'Sahip olduğun ürünler, rutin sırasına göre.',
    subtitle: (n: number) => `${n} ürün, adımlara göre gruplanmış.`,
    add: 'Ürün ekle',
    viewRoutine: 'AM / PM rutinini gör',
    removeTitle: 'Ürün kaldırılsın mı?',
    removeBody: (name: string) => `"${name}" rafından kaldırılacak.`,
    cancel: 'İptal',
    remove: 'Kaldır',
    edit: 'Düzenle',
    savedIngredients: (n: number) => `Bir analizden kaydedilen ${n} içerik`,
    emptyTitle: 'Burada henüz bir şey yok',
    emptyBody:
      'Kullandığın ürünleri ekle, Dewly bunları sabah ve akşam rutinine göre sıralasın.',
    emptyHint:
      'Bir ürünü doğrudan içerik analizinden de ekleyebilirsin — adımı senin için tahmin edilir.',
    analyze: 'Bir ürünü analiz et',
  },
} as const;

export default function ShelfScreen() {
  const { products, isLoaded, removeProduct } = useShelf();
  const { language } = useLanguage();
  const t = COPY[language];

  if (!isLoaded) return null;

  const groups = groupByStep(products);

  const confirmRemove = (product: ShelfProduct) => {
    Alert.alert(t.removeTitle, t.removeBody(product.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.remove,
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
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {products.length === 0 ? t.emptySubtitle : t.subtitle(products.length)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t.add}
          size="lg"
          fullWidth
          onPress={() => router.push('/product')}
        />
        {products.length > 0 ? (
          <Button
            label={t.viewRoutine}
            variant="secondary"
            fullWidth
            onPress={() => router.navigate('/routine')}
          />
        ) : null}
      </View>

      {products.length === 0 ? <EmptyState language={language} /> : null}

      {groups.map((group) => (
        <View key={group.step} style={styles.group}>
          <Text variant="caption" tone="muted" style={styles.groupTitle}>
            {STEP_LABELS[language][group.step].toUpperCase()}
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
                    label={TIME_OF_DAY_LABELS[language][product.timeOfDay]}
                    tone={product.timeOfDay === 'both' ? 'info' : 'success'}
                  />
                </View>

                {product.ingredientNames.length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {t.savedIngredients(product.ingredientNames.length)}
                  </Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Button
                    label={t.edit}
                    variant="secondary"
                    onPress={() => router.push(`/product?id=${product.id}`)}
                  />
                  <Button
                    label={t.remove}
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

function EmptyState({ language }: { language: Language }) {
  const t = COPY[language];

  return (
    <Card style={styles.empty}>
      <Text variant="h2">{t.emptyTitle}</Text>
      <Text variant="body" tone="muted">
        {t.emptyBody}
      </Text>
      <Text variant="caption" tone="muted">
        {t.emptyHint}
      </Text>
      <Button
        label={t.analyze}
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
