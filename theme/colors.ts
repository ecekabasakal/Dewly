/**
 * Dewly color tokens.
 *
 * `palette` holds raw brand values. `colors` maps them to semantic roles —
 * always style against `colors` so a future re-skin only touches this file.
 */

export const palette = {
  /** Deep dew green — primary brand color, logo, primary buttons. */
  green: '#0F4A43',
  /** Lighter green — secondary accents, active states, links. */
  green2: '#2E7A6E',
  /** Butter — the signature app background. */
  butter: '#FBF2CC',
  /** Cream — a shade lighter than butter, used for raised surfaces. */
  cream: '#FDF8E3',

  /**
   * Warm-tinted neutrals. Deliberately not pure gray: a cool #888 next to
   * butter reads as dirty, so every step carries a slight yellow-green cast.
   */
  gray50: '#FAF8F4',
  gray100: '#F1EEE7',
  gray200: '#E3DFD5',
  gray300: '#CDC7B9',
  gray400: '#A9A294',
  gray500: '#837C6E',
  gray600: '#635D52',
  gray700: '#47423A',
  gray800: '#2E2A25',
  gray900: '#1A1714',

  white: '#FFFFFF',
} as const;

export const colors = {
  // Brand
  primary: palette.green,
  primaryMuted: palette.green2,
  accent: palette.butter,

  // Surfaces
  /** Default screen background. */
  background: palette.butter,
  /** Cards and raised blocks — one step lighter than the background. */
  surface: palette.cream,
  /** Highest elevation (modals, sheets). */
  surfaceElevated: palette.white,

  // Content
  /** Body/heading ink. Green-tinted rather than black, to stay on-brand. */
  text: '#14302C',
  /** Secondary copy, captions, helper text. */
  muted: '#6B7F79',
  /** Text placed on top of a primary-colored surface. */
  onPrimary: palette.cream,

  // Lines
  /** Hairlines and card outlines, tuned to sit on butter. */
  border: '#E6DBB4',
  borderStrong: '#D6C894',

  /**
   * Status tones. Each pairs a tint background with readable foreground text.
   * Phase 7's conflict engine maps severity high/medium/low onto these.
   */
  status: {
    success: { bg: '#DCEFE4', fg: '#1B5E3F', border: '#B6DCC6' },
    warning: { bg: '#FBECCB', fg: '#7A5312', border: '#EDD49B' },
    danger: { bg: '#F8DFDA', fg: '#8A2B1C', border: '#EBBDB3' },
    info: { bg: '#DCE9EC', fg: '#1C5560', border: '#B4D2D9' },
  },
} as const;

export type StatusTone = keyof typeof colors.status;
