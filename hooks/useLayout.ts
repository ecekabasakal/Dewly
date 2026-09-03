import { useWindowDimensions } from 'react-native';
import { isWideViewport, layoutModeFor, type LayoutMode } from '../theme/layout';

/**
 * Which of the three layouts the current viewport should get.
 *
 * `useWindowDimensions` rather than a CSS media query because it is the one
 * API that works on both targets: react-native-web recomputes it on window
 * resize, and native reports orientation changes through the same hook. A
 * media query would be web-only, and `Dimensions.get()` read once would not
 * react to a browser resize at all.
 *
 * A phone in portrait is 320-430pt, so it never reaches even the first
 * breakpoint — native is unaffected without needing a `Platform` check. A
 * tablet in landscape does reach `desktop`, which is the right answer there.
 */
export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  return layoutModeFor(width);
}

/**
 * The simple signal for screens: is this the desktop layout?
 *
 * Screens should branch on this and nothing else — the breakpoint numbers stay
 * in `theme/layout.ts` so they can move without touching a screen.
 */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return isWideViewport(width);
}
