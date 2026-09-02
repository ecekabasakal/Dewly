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
  /** Soft sage-cream — the product tile ground. Cool enough to read as a
   *  separate object on butter without competing with the green ink on it. */
  sage: '#E7EFE0',
  /** One step down from sage, for the tile's outline. */
  sageEdge: '#D5E2CC',

  /**
   * Warm-tinted neutrals. Deliberately not pure gray: a cool #888 next to
   * butter reads as dirty, so every step carries a slight yellow-green cast.
   *
   * Currently unreferenced — every surface and ink role below resolves to a
   * brand value or a bespoke hex. Kept as the reference ramp, but note that
   * `gray400` measures 2.25:1 on butter and `gray500` 3.68:1, so neither is
   * safe as text if this ramp is ever wired up.
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
  /**
   * Secondary copy, captions, helper text, input placeholders and the inactive
   * tab tint.
   *
   * Was `#6B7F79`, which measured 3.78:1 on butter — below the 4.5:1 WCAG AA
   * needs for normal text, and this is the default for every `caption` in the
   * app at 13px. Darkened until it clears AA on all three surfaces it actually
   * lands on, keeping the same desaturated blue-green hue:
   *
   *   butter #FBF2CC -> 5.01:1
   *   cream  #FDF8E3 -> 5.29:1
   *   white  #FFFFFF -> 5.63:1
   */
  muted: '#5A6B66',
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
  /**
   * The product tile (`components/BrandTile`). One look everywhere a product
   * is listed, so a shelf reads as a set rather than a mixed bag of
   * third-party photography.
   *
   * `ink` is the brand green at 8.56:1 on sage — comfortably past WCAG AA even
   * at the smallest tile size, where the brand name can drop to 9px.
   */
  tile: { bg: palette.sage, border: palette.sageEdge, ink: palette.green },

  status: {
    success: { bg: '#DCEFE4', fg: '#1B5E3F', border: '#B6DCC6' },
    warning: { bg: '#FBECCB', fg: '#7A5312', border: '#EDD49B' },
    danger: { bg: '#F8DFDA', fg: '#8A2B1C', border: '#EBBDB3' },
    info: { bg: '#DCE9EC', fg: '#1C5560', border: '#B4D2D9' },
  },
} as const;

export type StatusTone = keyof typeof colors.status;
