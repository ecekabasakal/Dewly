import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { AuthForm } from '../../components/AuthForm';
import { Text } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { fonts, spacing } from '../../theme';

const COPY = {
  en: {
    title: 'Welcome back',
    subtitle: 'Sign in to reach your shelf and routine on any device.',
    submit: 'Sign in',
    noAccount: "Don't have an account?",
    signUp: 'Create one',
  },
  tr: {
    title: 'Tekrar hoş geldin',
    subtitle: 'Rafına ve rutinine her cihazdan ulaşmak için giriş yap.',
    submit: 'Giriş yap',
    noAccount: 'Hesabın yok mu?',
    signUp: 'Hesap oluştur',
  },
} as const;

export default function SignInScreen() {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <AuthForm
      mode="sign-in"
      title={t.title}
      subtitle={t.subtitle}
      submitLabel={t.submit}
      footer={
        <>
          <Text variant="caption" tone="muted">
            {t.noAccount}
          </Text>
          <Pressable onPress={() => router.replace('/auth/sign-up')}>
            <Text variant="body" tone="primary" style={styles.link}>
              {t.signUp}
            </Text>
          </Pressable>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.bodySemi, paddingVertical: spacing.xs },
});
