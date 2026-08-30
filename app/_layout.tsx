import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisProvider } from '../hooks/useAnalysis';
import { AuthProvider } from '../hooks/useAuth';
import { LanguageProvider } from '../hooks/useLanguage';
import { ProfileProvider } from '../hooks/useProfile';
import { ShelfProvider } from '../hooks/useShelf';
import { colors, useAppFonts } from '../theme';

// Hold the native splash until the fonts are in, so the first paint is
// already branded — no flash of system serif behind Fraunces.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Treat a font error as "ready": better to fall back to system fonts than
  // to leave the user staring at the splash screen indefinitely.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* Outermost: shelf, analysis and timing screens all read the language. */}
      <LanguageProvider>
        {/* Auth wraps the data providers: both derive their store from the
            signed-in user, and neither may read before auth has resolved. */}
        <AuthProvider>
          <ProfileProvider>
            {/* Inside ProfileProvider: analysis is personalised with the profile. */}
            <AnalysisProvider>
              <ShelfProvider>
                <View style={styles.root} onLayout={onLayoutRootView}>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                      // The flow is linear; sliding forward matches the progress bar.
                      animation: 'slide_from_right',
                    }}
                  />
                </View>
              </ShelfProvider>
            </AnalysisProvider>
          </ProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
