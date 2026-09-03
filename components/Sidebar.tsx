import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useProfile } from '../hooks/useProfile';
import { resolveDisplayName } from '../lib/greeting';
import { colors, fonts, palette, radius, spacing } from '../theme';
import { SKIN_TYPE_LABELS } from '../types/profile';
import { SunriseMark } from './SunriseMark';
import { Text } from './Text';

const COPY = {
  en: { you: 'You', noProfile: 'No skin profile yet', skin: (type: string) => `${type} skin` },
  tr: { you: 'Sen', noProfile: 'Henüz cilt profili yok', skin: (type: string) => `${type} cilt` },
} as const;

export const SIDEBAR_WIDTH = 248;

/**
 * The desktop navigation rail, replacing the bottom tab bar above the desktop
 * breakpoint.
 *
 * Rendered through the navigator's own `tabBar` prop, so it is not a parallel
 * navigation system: the routes, their order, their labels and their icons all
 * still come from `<Tabs.Screen>`, and `state.index` is the single source of
 * truth for what is active. Adding a tab adds it here with no edit.
 *
 * Below the breakpoint the `tabBar` prop is left undefined entirely, which
 * makes the navigator fall back to its own `BottomTabBar` — so the phone bar is
 * not a re-implementation that could drift, it is literally the stock one.
 */
export function Sidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { language } = useLanguage();
  const { profile } = useProfile();
  const { email } = useAuth();
  const t = COPY[language];

  const name = resolveDisplayName(profile?.name, email) ?? t.you;

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <SunriseMark
          size={13}
          color={palette.mint}
          discOpacity={0.95}
          rayOpacity={0.75}
          horizonOpacity={0.55}
          horizonExtends={false}
        />
        <Text style={styles.wordmark}>dewly</Text>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.nav}
        showsVerticalScrollIndicator={false}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const label = options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                // The navigator's own event, so a tab press behaves exactly as
                // it does on the bottom bar — including popping to the top of
                // an already-focused tab.
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={({ pressed }) => [
                styles.item,
                focused && styles.itemActive,
                pressed && !focused && styles.itemPressed,
              ]}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? palette.mint : palette.cream,
                size: 20,
              })}
              <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.user}>
        <Text style={styles.userName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.userMeta} numberOfLines={1}>
          {profile ? t.skin(SKIN_TYPE_LABELS[language][profile.skinType]) : t.noProfile}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: palette.white,
  },

  navScroll: { flexGrow: 0, marginTop: spacing['2xl'] },
  nav: { gap: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
  },
  // A filled pill rather than a text-colour change alone: at a glance the
  // active row should be findable without reading it.
  itemActive: { backgroundColor: palette.greenLift },
  itemPressed: { backgroundColor: palette.greenDeep },
  itemLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: palette.cream,
    opacity: 0.82,
  },
  itemLabelActive: { fontFamily: fonts.bodySemi, color: palette.mint, opacity: 1 },

  user: {
    gap: 2,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.greenLift,
  },
  userName: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: palette.white,
  },
  userMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.mint,
    opacity: 0.85,
  },
});
