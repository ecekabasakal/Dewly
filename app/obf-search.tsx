import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Badge, BrandTile, Button, Card, Screen, Text } from '../components';
import { useLanguage } from '../hooks/useLanguage';
import { goBackOr } from '../lib/navigation';
import { messageFor } from '../lib/errors';
import { findProducts, isBarcode, OBF_ATTRIBUTION, type ObfProduct } from '../lib/obf';
import { colors, fonts, radius, spacing, typography } from '../theme';

const COPY = {
  en: {
    title: 'Find a product',
    subtitle:
      'Search Open Beauty Facts by name or brand, or type a barcode from the back of the bottle.',
    inputLabel: 'Product name or barcode',
    placeholder: 'e.g. CeraVe Moisturising Cream, or 3337875598996',
    search: 'Search',
    searching: 'Searching…',
    barcodeMode: 'BARCODE',
    nameMode: 'NAME SEARCH',
    resultCount: (n: number) => `${n} result${n === 1 ? '' : 's'}`,
    noResultsTitle: 'Nothing found',
    noResultsBody:
      "Open Beauty Facts is community-built, so plenty of products aren't in it yet. You can still add this one by hand.",
    notFoundTitle: 'No product with that barcode',
    notFoundBody:
      "That barcode isn't in Open Beauty Facts yet. Check the digits, or add the product by hand.",
    addManually: 'Add it manually instead',
    noIngredients: 'NO INGREDIENTS',
    noIngredientsHint: "We'll still save the name and brand — you can paste the list yourself.",
    choose: 'Use this product',
    failedTitle: "Couldn't reach Open Beauty Facts",
    retry: 'Try again',
    cancel: 'Cancel',
    hint: 'Tip: a barcode is 8–14 digits, printed under the bars.',
  },
  tr: {
    title: 'Ürün bul',
    subtitle:
      'Open Beauty Facts’te ada veya markaya göre ara, ya da şişenin arkasındaki barkodu yaz.',
    inputLabel: 'Ürün adı veya barkod',
    placeholder: 'ör. CeraVe Moisturising Cream, ya da 3337875598996',
    search: 'Ara',
    searching: 'Aranıyor…',
    barcodeMode: 'BARKOD',
    nameMode: 'AD ARAMASI',
    resultCount: (n: number) => `${n} sonuç`,
    noResultsTitle: 'Bir şey bulunamadı',
    noResultsBody:
      'Open Beauty Facts topluluk tarafından oluşturuluyor, bu yüzden birçok ürün henüz yok. Bu ürünü elle de ekleyebilirsin.',
    notFoundTitle: 'Bu barkodla ürün yok',
    notFoundBody:
      'Bu barkod henüz Open Beauty Facts’te yok. Rakamları kontrol et ya da ürünü elle ekle.',
    addManually: 'Bunun yerine elle ekle',
    noIngredients: 'İÇERİK YOK',
    noIngredientsHint: 'Adı ve markayı yine de kaydederiz — listeyi kendin yapıştırabilirsin.',
    choose: 'Bu ürünü kullan',
    failedTitle: 'Open Beauty Facts’e ulaşılamadı',
    retry: 'Tekrar dene',
    cancel: 'İptal',
    hint: 'İpucu: barkod, çizgilerin altında yazan 8–14 haneli sayıdır.',
  },
} as const;

type Status = 'idle' | 'loading' | 'done' | 'failed';

/**
 * Search Open Beauty Facts and hand a chosen product to the product form.
 *
 * Deliberately typing-only. Camera scanning is a later phase, and keeping this
 * screen keyboard-driven means the whole flow is exercisable in the iOS
 * simulator and in a browser, where there is no camera to scan with.
 *
 * The screen never dead-ends. Every empty or failed outcome offers manual
 * entry, because OBF's cosmetics coverage is thin enough that "not found" is a
 * normal answer rather than a fault.
 */
export default function ObfSearchScreen() {
  const { language } = useLanguage();
  const t = COPY[language];

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<ObfProduct[]>([]);
  const [error, setError] = useState<unknown>(null);
  /** What the results on screen are for — the live input may have moved on. */
  const [searched, setSearched] = useState('');

  const trimmed = query.trim();
  const looksLikeBarcode = isBarcode(trimmed);
  const canSearch = trimmed.length > 0 && status !== 'loading';

  const run = async () => {
    if (!canSearch) return;
    setStatus('loading');
    setError(null);
    setSearched(trimmed);
    try {
      setResults(await findProducts(trimmed));
      setStatus('done');
    } catch (caught) {
      setError(caught);
      setResults([]);
      setStatus('failed');
    }
  };

  // Straight to the manual form, with nothing carried over.
  const addManually = () => router.replace('/product');

  const choose = (product: ObfProduct) =>
    router.replace(`/product?source=obf&barcode=${encodeURIComponent(product.barcode)}`);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="h1">{t.title}</Text>
          <Text variant="body" tone="muted">
            {t.subtitle}
          </Text>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="caption" tone="muted" style={styles.label}>
              {t.inputLabel.toUpperCase()}
            </Text>
            {trimmed.length > 0 ? (
              <Badge label={looksLikeBarcode ? t.barcodeMode : t.nameMode} tone="info" />
            ) : null}
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.placeholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            // Not `numeric`: the same box takes names, and locking the keyboard
            // to digits would make the name half of the feature unusable.
            inputMode="search"
            returnKeyType="search"
            onSubmitEditing={run}
            accessibilityLabel={t.inputLabel}
          />
          <Text variant="caption" tone="muted">
            {t.hint}
          </Text>
        </View>

        <Button
          label={status === 'loading' ? t.searching : t.search}
          onPress={run}
          disabled={!canSearch}
          loading={status === 'loading'}
          fullWidth
          size="lg"
          style={styles.submit}
        />

        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {status === 'failed' ? (
          <Card style={StyleSheet.flatten([styles.notice, styles.danger])}>
            <Badge label="!" tone="danger" />
            <Text variant="h2">{t.failedTitle}</Text>
            <Text variant="caption" style={styles.noticeText}>
              {messageFor(error, language)}
            </Text>
            <View style={styles.noticeActions}>
              <Button label={t.retry} variant="secondary" onPress={run} />
              <Button label={t.addManually} variant="secondary" onPress={addManually} />
            </View>
          </Card>
        ) : null}

        {status === 'done' && results.length === 0 ? (
          <Card style={styles.notice}>
            <Text variant="h2">
              {isBarcode(searched) ? t.notFoundTitle : t.noResultsTitle}
            </Text>
            <Text variant="body" tone="muted">
              {isBarcode(searched) ? t.notFoundBody : t.noResultsBody}
            </Text>
            <Button label={t.addManually} variant="secondary" onPress={addManually} />
          </Card>
        ) : null}

        {status === 'done' && results.length > 0 ? (
          <View style={styles.results}>
            <Text variant="caption" tone="muted" style={styles.resultCount}>
              {t.resultCount(results.length)}
            </Text>
            {results.map((product) => (
              // NOT a pressable Card. A `Card onPress` plus the button below
              // nests one <button> inside another on web: invalid HTML, a React
              // hydration error, and an ambiguous tap target for a screen
              // reader. One explicit action per card instead.
              <Card key={product.barcode} style={styles.result}>
                <View style={styles.resultRow}>
                  <BrandTile brand={product.brand} name={product.name} size={72} />
                  <View style={styles.resultBody}>
                    <Text variant="h2" numberOfLines={2}>
                      {product.name}
                    </Text>
                    {product.brand ? (
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {product.brand}
                      </Text>
                    ) : null}
                    <Text variant="caption" tone="muted">
                      {product.barcode}
                    </Text>
                    <View style={styles.flags}>
                      {!product.ingredientsText ? (
                        <Badge label={t.noIngredients} tone="warning" />
                      ) : null}
                    </View>
                  </View>
                </View>
                {!product.ingredientsText ? (
                  <Text variant="caption" tone="muted">
                    {t.noIngredientsHint}
                  </Text>
                ) : null}
                <Button label={t.choose} variant="secondary" onPress={() => choose(product)} />
              </Card>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button label={t.addManually} variant="secondary" onPress={addManually} />
          <Button label={t.cancel} variant="secondary" onPress={() => goBackOr('/shelf')} />
        </View>

        {/* ODbL requires attribution wherever the data is shown. */}
        <Text variant="caption" tone="muted" style={styles.attribution}>
          {OBF_ATTRIBUTION}
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: spacing.lg, gap: spacing.sm },
  field: { marginTop: spacing.xl, gap: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: { letterSpacing: 1.2 },
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
  },
  submit: { marginTop: spacing.lg },
  loading: { marginTop: spacing.xl, alignItems: 'center' },
  notice: { marginTop: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  danger: {
    backgroundColor: colors.status.danger.bg,
    borderColor: colors.status.danger.border,
  },
  noticeText: { color: colors.text },
  noticeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  results: { marginTop: spacing.xl, gap: spacing.md },
  resultCount: { letterSpacing: 1.2 },
  result: { gap: spacing.md, alignItems: 'flex-start' },
  resultRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  // Without flex the title cannot shrink and a long product name pushes the
  // card out of the screen — the same rule as every other title-in-a-row here.
  resultBody: { flex: 1, gap: 2 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  footer: { marginTop: spacing['2xl'], gap: spacing.sm, alignItems: 'flex-start' },
  attribution: { marginTop: spacing.xl },
});
