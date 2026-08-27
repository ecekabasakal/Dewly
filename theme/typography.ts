import type { TextStyle } from 'react-native';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

/**
 * Font family names as registered with the native font manager.
 *
 * Weight lives in the family name, not in `fontWeight` — Android ignores
 * numeric weights on custom fonts, so picking the right file is the only
 * reliable way to get bold text on both platforms.
 */
export const fonts = {
  headingBold: 'Fraunces_700Bold',
  headingSemi: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

/**
 * Type scale. Fraunces (a high-contrast serif) carries the headings for the
 * editorial, apothecary feel; Inter keeps body copy and long INCI ingredient
 * lists legible at small sizes.
 */
export const typography = {
  display: {
    fontFamily: fonts.headingBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fonts.headingBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fonts.headingSemi,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Loads every font the type scale references.
 *
 * Returns `[loaded, error]`. Callers should hold rendering until one of the
 * two is truthy — treating an error as "ready" so a font CDN failure degrades
 * to system fonts instead of hanging on a blank screen forever.
 */
export function useAppFonts() {
  return useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
}
