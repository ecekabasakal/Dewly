import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';

import { Sidebar } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useIsWide } from '../../hooks/useLayout';
import { useLanguage } from '../../hooks/useLanguage';
import { colors, fonts, spacing } from '../../theme';

/**
 * Tab labels. The rest of the app's chrome is still English-only, but these
 * four words are the app's permanent furniture — worth translating.
 */
const LABELS = {
  en: { home: 'Home', analyze: 'Analyze', routine: 'Routine', shelf: 'Shelf', profile: 'Profile' },
  tr: { home: 'Ana sayfa', analyze: 'Analiz', routine: 'Rutin', shelf: 'Rafım', profile: 'Profil' },
} as const;

export default function TabsLayout() {
  const { language } = useLanguage();
  const { isLoaded, sessionUserId } = useAuth();
  const isWide = useIsWide();
  const t = LABELS[language];

  // Auth is required. Render NOTHING until auth resolves — returning <Tabs/>
  // while `isLoaded` is false paints the tab bar for a frame before the
  // redirect lands, which looks like the gate failed. Deep-linking straight to
  // /home with no session made that window visible.
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!sessionUserId) return <Redirect href="/auth/sign-in" />;

  return (
    <Tabs
      /**
       * Above the desktop breakpoint the bar becomes a left rail; below it,
       * `undefined` makes the navigator fall back to its OWN `BottomTabBar`.
       *
       * That fallback is the whole zero-regression story: the phone bar is not
       * a re-implementation that could drift from the original, it is
       * literally the stock component with the same options it always had.
       */
      tabBar={isWide ? (props) => <Sidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        // The navigator switches its container to `flexDirection: 'row'` for
        // 'left', which is what puts the rail beside the content.
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // Cream against the butter background, so the bar reads as a raised
        // surface rather than a separate slab of colour.
        tabBarStyle: isWide
          ? undefined
          : {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          // 88 leaves room for the iOS home indicator / Android gesture bar.
          // A browser has neither, so the same number reads as a band of dead
          // cream along the bottom of the window.
          height: Platform.OS === 'web' ? 64 : 88,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingVertical: spacing.xs },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: t.analyze,
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: t.routine,
          tabBarIcon: ({ color, size }) => (
            <Feather name="sunrise" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: t.shelf,
          tabBarIcon: ({ color, size }) => (
            <Feather name="layers" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
