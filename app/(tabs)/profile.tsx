import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Badge, Button, Card, Chip, Screen, Text } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useProfile } from '../../hooks/useProfile';
import { colors, spacing } from '../../theme';
import {
  AGE_RANGE_LABELS,
  SENSITIVITY_LABELS,
  SKIN_TYPE_LABELS,
} from '../../types/profile';

const COPY = {
  en: {
    title: 'Profile',
    subtitle: 'Your account and how Dewly is set up for you.',
    accountSection: 'Account',
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutBody:
      'Your profile and shelf stay saved to your account — sign back in to pick up where you left off.',
    cancel: 'Cancel',
    skinSection: 'Skin profile',
    noProfile: 'No skin profile yet.',
    editProfile: 'Redo onboarding',
    resetSection: 'Reset',
    resetTitle: 'Reset onboarding?',
    resetBody:
      'This clears your saved skin profile and starts the questions again. Your shelf is not affected.',
    reset: 'Reset onboarding',
    resetHint: 'Clears your skin profile and runs the questions again.',
    languageSection: 'Language',
    languageHint:
      'Applies across the whole app and is remembered on this device.',
    profileSummary: (concerns: number, goals: number) =>
      `${concerns} concerns · ${goals} goals`,
    syncNote: 'Saved to your account and synced across your devices.',
  },
  tr: {
    title: 'Profil',
    subtitle: 'Hesabın ve Dewly’nin sana göre ayarları.',
    accountSection: 'Hesap',
    signedInAs: 'Giriş yapılan hesap',
    signOut: 'Çıkış yap',
    signOutTitle: 'Çıkış yapılsın mı?',
    signOutBody:
      'Profilin ve rafın hesabında kayıtlı kalır — tekrar giriş yaptığında kaldığın yerden devam edersin.',
    cancel: 'İptal',
    skinSection: 'Cilt profili',
    noProfile: 'Henüz bir cilt profili yok.',
    editProfile: 'Soruları tekrar yanıtla',
    resetSection: 'Sıfırla',
    resetTitle: 'Profil sıfırlansın mı?',
    resetBody:
      'Kayıtlı cilt profilin silinir ve sorular baştan başlar. Rafın etkilenmez.',
    reset: 'Profili sıfırla',
    resetHint: 'Cilt profilini siler ve soruları tekrar sorar.',
    languageSection: 'Dil',
    languageHint:
      'Uygulamanın tamamında geçerlidir ve bu cihazda hatırlanır.',
    profileSummary: (concerns: number, goals: number) =>
      `${concerns} cilt sorunu · ${goals} hedef`,
    syncNote: 'Hesabına kaydedilir ve cihazların arasında eşitlenir.',
  },
} as const;

export default function ProfileScreen() {
  const { email, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { profile, isLoaded, resetProfile } = useProfile();
  const t = COPY[language];

  const confirmSignOut = () => {
    Alert.alert(t.signOutTitle, t.signOutBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.signOut,
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  const confirmReset = () => {
    Alert.alert(t.resetTitle, t.resetBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.reset,
        style: 'destructive',
        onPress: async () => {
          await resetProfile();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">{t.title}</Text>
        <Text variant="body" tone="muted">
          {t.subtitle}
        </Text>
      </View>

      <Section title={t.accountSection}>
        <Card style={styles.card}>
          <Text variant="caption" tone="muted">
            {t.signedInAs}
          </Text>
          <Text variant="h2">{email ?? '—'}</Text>
          <Text variant="caption" tone="muted">
            {t.syncNote}
          </Text>
          <Button label={t.signOut} variant="secondary" onPress={confirmSignOut} />
        </Card>
      </Section>

      <Section title={t.skinSection}>
        <Card style={styles.card}>
          {isLoaded && profile ? (
            <>
              <View style={styles.row}>
                <Text variant="h2">{SKIN_TYPE_LABELS[language][profile.skinType]}</Text>
                <Badge
                  label={SENSITIVITY_LABELS[language][profile.sensitivity].toUpperCase()}
                  tone="info"
                />
              </View>
              <Text variant="caption" tone="muted">
                {AGE_RANGE_LABELS[language][profile.ageRange]} ·{' '}
                {t.profileSummary(profile.concerns.length, profile.goals.length)}
              </Text>
            </>
          ) : (
            <Text variant="body" tone="muted">
              {t.noProfile}
            </Text>
          )}
          <Button
            label={t.editProfile}
            variant="secondary"
            onPress={() => router.push('/onboarding')}
          />
        </Card>
      </Section>

      {/* The app's one language control. Writes to the persisted LanguageProvider,
          so every screen re-renders on tap and the choice survives a restart. */}
      <Section title={t.languageSection}>
        <Card style={styles.card}>
          <View style={styles.langRow}>
            <Chip label="EN" selected={language === 'en'} onPress={() => setLanguage('en')} />
            <Chip label="TR" selected={language === 'tr'} onPress={() => setLanguage('tr')} />
          </View>
          <Text variant="caption" tone="muted">
            {t.languageHint}
          </Text>
        </Card>
      </Section>

      <Section title={t.resetSection}>
        <Card style={StyleSheet.flatten([styles.card, styles.danger])}>
          <Text variant="caption" tone="muted">
            {t.resetHint}
          </Text>
          <Button label={t.reset} variant="secondary" onPress={confirmReset} />
        </Card>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" tone="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, gap: spacing.sm },
  section: { marginTop: spacing.xl },
  sectionTitle: { letterSpacing: 1.2 },
  sectionBody: { marginTop: spacing.md },
  card: { gap: spacing.sm, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  danger: { borderColor: colors.status.danger.border },
});
