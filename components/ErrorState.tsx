import { StyleSheet, View } from 'react-native';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';
import { useLanguage } from '../hooks/useLanguage';
import { appErrorMessage, type AppErrorCode } from '../lib/errors';
import { spacing } from '../theme';

const COPY = {
  en: { title: 'Something went wrong', retry: 'Try again', badge: 'ERROR' },
  tr: { title: 'Bir şeyler ters gitti', retry: 'Tekrar dene', badge: 'HATA' },
} as const;

export type ErrorStateProps = {
  /** Picks the explanatory sentence. Never pass raw upstream text. */
  code?: AppErrorCode;
  onRetry?: () => void;
  /** Overrides the default retry label. */
  retryLabel?: string;
};

/**
 * The failure counterpart to an empty state.
 *
 * Exists so "we couldn't load this" can never again be rendered as "you have
 * nothing" — the two look identical to a user, but only one of them means it is
 * safe to start writing. Every screen backed by a store shows this instead of
 * its empty state when the load failed.
 */
export function ErrorState({ code = 'load-failed', onRetry, retryLabel }: ErrorStateProps) {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <Card style={styles.card}>
      <Badge label={t.badge} tone="danger" />
      <Text variant="h2">{t.title}</Text>
      <Text variant="body" tone="muted">
        {appErrorMessage(code, language)}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel ?? t.retry} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  action: { marginTop: spacing.xs },
});
