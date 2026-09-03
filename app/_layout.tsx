import { useCallback, type ReactNode } from 'react';
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
import { useLayoutMode } from '../hooks/useLayout';
import { colors, elevation, MAX_CONTENT_WIDTH, useAppFonts } from '../theme';

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
                <AppFrame onLayout={onLayoutRootView}>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                      // The flow is linear; sliding forward matches the progress bar.
                      animation: 'slide_from_right',
                    }}
                  />
                </AppFrame>
              </ShelfProvider>
            </AnalysisProvider>
          </ProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

/**
 * Centres the whole app in a fixed-width column on wide viewports.
 *
 * ## Why it lives here and not in `components/Screen`
 *
 * `Screen` wraps the content of one screen, but the bottom tab bar is a sibling
 * of the screens, not part of any of them — constraining `Screen` would leave a
 * 1400px-wide tab bar under a 480px column. The Tabs navigator renders INSIDE
 * this Stack, so constraining here catches the tab bar, every tab screen, the
 * auth screens and the onboarding flow from one place, and nothing new has to
 * opt in.
 *
 * ## Why `useWindowDimensions` rather than a media query
 *
 * It is the one API that works on both targets: react-native-web recomputes it
 * on window resize, and native reports orientation changes through the same
 * hook. A CSS media query would be web-only, and `Dimensions.get()` read once
 * would not react to a browser resize at all.
 *
 * Below the breakpoint every wide style drops out and this is a plain
 * full-bleed `View` — the exact tree the app had before, so a phone renders
 * identically.
 */
function AppFrame({
  children,
  onLayout,
}: {
  children: ReactNode;
  onLayout: () => void;
}) {
  // Only the middle mode centres a phone-width column. `desktop` fills the
  // window — the sidebar and `DesktopPage` do the constraining there — and
  // `mobile` is full-bleed as it has always been.
  const centered = useLayoutMode() === 'centered';

  return (
    <View style={[styles.page, centered && styles.pageWide]} onLayout={onLayout}>
      <View style={[styles.column, centered && styles.columnWide]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** The full viewport. Butter on a phone; the deeper surround when centred. */
  page: { flex: 1, backgroundColor: colors.background },
  pageWide: { backgroundColor: colors.surround },

  /** The app itself. Full-bleed until the breakpoint. */
  column: { flex: 1, width: '100%', backgroundColor: colors.background },
  columnWide: {
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    // Edges only — the column runs the full height, so a top or bottom border
    // would be a line across nothing.
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    // Lifts the column off the surround, so the narrower app reads as a
    // deliberate frame rather than content that failed to fill the window.
    ...elevation.md,
  },
});
