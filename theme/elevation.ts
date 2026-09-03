import type { ViewStyle } from 'react-native';
import { palette } from './colors';

/**
 * Layered shadow tokens.
 *
 * ## Why these are `boxShadow` strings
 *
 * The app previously used `shadowColor` / `shadowOpacity` / `shadowRadius` /
 * `shadowOffset` + `elevation`, which meant two mutually exclusive systems
 * (iOS shadow* vs Android elevation) and a permanent console warning on web:
 *
 *   "shadow*" style props are deprecated. Use "boxShadow".
 *
 * `boxShadow` replaces all five props with one, and both renderers this app
 * ships to accept the CSS string form:
 *
 *   - React Native 0.76+ parses it in `processBoxShadow`, splitting on commas,
 *     so a multi-layer shadow works natively on iOS AND Android.
 *   - react-native-web passes the string straight through to CSS.
 *
 * That is what makes a LAYERED shadow possible at all. `shadowRadius` could
 * only ever describe one shadow, so the old cards had a single 12pt blur doing
 * both jobs; two stacked shadows read as a soft object sitting on a surface
 * rather than a card with a halo.
 *
 * ## Why green rather than black
 *
 * A neutral black shadow on butter greys the background and reads as dirt.
 * Every layer is brand green at low alpha, so the shade stays inside the
 * palette's warm-green world.
 */

/** rgba() from a hex, so the alpha layers stay tied to the palette. */
function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GREEN = palette.green;

export const elevation = {
  /**
   * Resting cards — shelf rows, metric tiles, routine steps.
   * A tight contact shadow plus a wide soft one.
   */
  sm: {
    boxShadow: `0px 1px 2px ${tint(GREEN, 0.05)}, 0px 4px 12px ${tint(GREEN, 0.06)}`,
  },
  /**
   * Lifted surfaces — the home hero. Same two-layer construction, pushed
   * further so the card floats without the blur turning muddy.
   */
  md: {
    boxShadow: `0px 2px 4px ${tint(GREEN, 0.06)}, 0px 12px 28px ${tint(GREEN, 0.14)}`,
  },
} as const satisfies Record<string, ViewStyle>;

export type ElevationLevel = keyof typeof elevation;
