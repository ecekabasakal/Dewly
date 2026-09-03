import { palette } from './colors';

/**
 * Gradient tokens, in the shape `expo-linear-gradient` takes.
 *
 * Kept as data rather than a component so a gradient is a token like any other
 * colour: screens spread `{...gradients.hero}` onto `<LinearGradient>` instead
 * of each inventing its own stops and angle.
 *
 * `expo-linear-gradient` renders natively on iOS/Android and compiles to a CSS
 * `linear-gradient` on web, so one token covers all three platforms.
 */
export const gradients = {
  /**
   * The home hero. Deep green at the top-left corner lifting toward the
   * bottom-right, so the eyebrow and headline sit on the DARKEST part of the
   * ramp — see the note on `palette.greenLift` for the contrast this protects.
   *
   * Three stops rather than two: a straight two-stop ramp across a wide card
   * banded visibly on device, and the midpoint smooths it.
   */
  hero: {
    colors: [palette.greenDeep, palette.green, palette.greenLift] as const,
    locations: [0, 0.55, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;
