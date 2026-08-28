import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useLanguage } from '../../hooks/useLanguage';
import { colors, fonts, spacing } from '../../theme';

/**
 * Tab labels. The rest of the app's chrome is still English-only, but these
 * four words are the app's permanent furniture — worth translating.
 */
const LABELS = {
  en: { home: 'Home', analyze: 'Analyze', routine: 'Routine', shelf: 'Shelf' },
  tr: { home: 'Ana sayfa', analyze: 'Analiz', routine: 'Rutin', shelf: 'Rafım' },
} as const;

export default function TabsLayout() {
  const { language } = useLanguage();
  const t = LABELS[language];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // Cream against the butter background, so the bar reads as a raised
        // surface rather than a separate slab of colour.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          height: 88,
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
    </Tabs>
  );
}
