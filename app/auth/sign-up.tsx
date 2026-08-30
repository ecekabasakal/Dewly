import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { AuthForm } from '../../components/AuthForm';
import { Text } from '../../components';
import { useLanguage } from '../../hooks/useLanguage';
import { fonts, spacing } from '../../theme';

const COPY = {
  en: {
    title: 'Create your account',
    subtitle: 'Your skin profile, shelf and routine are saved to your account.',
    submit: 'Create account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
  tr: {
    title: 'Hesabını oluştur',
    subtitle: 'Cilt profilin, rafın ve rutinin hesabına kaydedilir.',
    submit: 'Hesap oluştur',
    haveAccount: 'Zaten hesabın var mı?',
    signIn: 'Giriş yap',
  },
} as const;

export default function SignUpScreen() {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <AuthForm
      mode="sign-up"
      title={t.title}
      subtitle={t.subtitle}
      submitLabel={t.submit}
      footer={
        <>
          <Text variant="caption" tone="muted">
            {t.haveAccount}
          </Text>
          <Pressable onPress={() => router.replace('/auth/sign-in')}>
            <Text variant="body" tone="primary" style={styles.link}>
              {t.signIn}
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
