import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Badge, Button, Screen, Text } from './index';
import { authLog, useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { colors, fonts, radius, spacing, typography } from '../theme';

const COPY = {
  en: {
    emailLabel: 'Email',
    passwordLabel: 'Password',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'At least 6 characters',
    passwordHintSignUp: 'Use at least 6 characters.',
    missingFields: 'Enter your email and password.',
    working: 'Just a moment…',
    noticeBadge: '✓',
  },
  tr: {
    emailLabel: 'E-posta',
    passwordLabel: 'Şifre',
    emailPlaceholder: 'siz@ornek.com',
    passwordPlaceholder: 'En az 6 karakter',
    passwordHintSignUp: 'En az 6 karakter kullanın.',
    missingFields: 'E-posta ve şifrenizi girin.',
    working: 'Bir saniye…',
    noticeBadge: '✓',
  },
} as const;

export type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  title: string;
  subtitle: string;
  submitLabel: string;
  /** Rendered under the form — the link to the other screen. */
  footer: React.ReactNode;
};

export function AuthForm({ mode, title, subtitle, submitLabel, footer }: AuthFormProps) {
  const { language } = useLanguage();
  const { signIn, signUp } = useAuth();
  const t = COPY[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Carries its own tone: a "check your inbox" notice must not be painted red.
  const [feedback, setFeedback] = useState<
    { kind: 'error' | 'notice'; message: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setFeedback({ kind: 'error', message: t.missingFields });
      return;
    }

    setBusy(true);
    setFeedback(null);

    const result =
      mode === 'sign-up'
        ? await signUp(email, password, language)
        : await signIn(email, password, language);

    if (!result.ok) {
      authLog(`${mode}: showing ${result.kind} to user — "${result.message}"`);
      setFeedback({ kind: result.kind, message: result.message });
      setBusy(false);
      return;
    }

    // On success `app/auth/_layout.tsx` sees the session and redirects to `/`,
    // unmounting this screen. Clearing `busy` anyway is belt-and-braces: if the
    // redirect is ever delayed, the user sees a live button rather than a
    // spinner that never stops.
    authLog(`${mode}: success — waiting for the auth layout to redirect`);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="display">Dewly</Text>
          <Text variant="h1" style={styles.title}>
            {title}
          </Text>
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        </View>

        <View style={styles.field}>
          <Text variant="caption" tone="muted" style={styles.label}>
            {t.emailLabel.toUpperCase()}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.emailPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel={t.emailLabel}
          />
        </View>

        <View style={styles.field}>
          <Text variant="caption" tone="muted" style={styles.label}>
            {t.passwordLabel.toUpperCase()}
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.passwordPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            onSubmitEditing={submit}
            accessibilityLabel={t.passwordLabel}
          />
          {mode === 'sign-up' ? (
            <Text variant="caption" tone="muted">
              {t.passwordHintSignUp}
            </Text>
          ) : null}
        </View>

        {feedback ? (
          <View
            style={[
              styles.feedback,
              feedback.kind === 'notice' ? styles.notice : styles.error,
            ]}
          >
            <Badge
              label={feedback.kind === 'notice' ? t.noticeBadge : '!'}
              tone={feedback.kind === 'notice' ? 'success' : 'danger'}
            />
            <Text variant="caption" style={styles.feedbackText}>
              {feedback.message}
            </Text>
          </View>
        ) : null}

        <Button
          label={busy ? t.working : submitLabel}
          onPress={submit}
          disabled={busy}
          loading={busy}
          fullWidth
          size="lg"
          style={styles.submit}
        />

        <View style={styles.footer}>{footer}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: spacing['2xl'], gap: spacing.xs },
  title: { marginTop: spacing.md },
  field: { marginTop: spacing.xl, gap: spacing.sm },
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
  feedback: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  error: {
    backgroundColor: colors.status.danger.bg,
    borderColor: colors.status.danger.border,
  },
  notice: {
    backgroundColor: colors.status.success.bg,
    borderColor: colors.status.success.border,
  },
  feedbackText: { color: colors.text },
  submit: { marginTop: spacing.xl },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
});
