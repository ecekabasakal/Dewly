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
   * Warm accent family. Each is an ink paired with its own tinted ground, so a
   * chip, ring or badge is always a two-token pair rather than an ink dropped
   * on whatever surface happens to be behind it.
   *
   * These carry MEANING on the home screen and should keep carrying it: peach
   * is attention, sage is what you own, blue is what we understand. Mint is the
   * odd one out — it exists only to sit on the deep green hero, where the other
   * three are too dark to read.
   */
  peach: '#EE9F5B',
  peachBg: '#FBE7D2',
  leaf: '#6E9A6B',
  leafBg: '#E4EFDE',
  blue: '#5E90A8',
  blueBg: '#DCEAF0',
  /**
   * Only legible on the dark hero: 7.7:1 on `greenDeep`, 4.79:1 on `greenLift`,
   * but 1.49:1 on butter. Never put mint on a light surface.
   */
  mint: '#7FD8C4',

  /**
   * The hero gradient's stops: brand green deepened, then lifted.
   *
   * `greenLift` was #1A6459 until the mint eyebrow was measured against it at
   * 4.16:1 — under AA for small text, and the eyebrow is small tracked caps.
   * Darkened until mint clears 4.5:1 anywhere on the ramp, so the eyebrow stays
   * legible wherever the gradient happens to fall behind it.
   */
  greenDeep: '#0A3833',
  greenLift: '#175A50',

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
  /**
   * The page BEHIND the app on wide viewports, where the content is a centred
   * column rather than the whole window. See `theme/layout.ts`.
   *
   * A half-step down from butter — 1.15:1, enough to read as a separate plane
   * without becoming a second background colour competing with the app's own.
   * Never has text on it, so contrast is a matter of taste rather than AA.
   */
  surround: '#EFE3B2',

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

  /**
   * Accent roles, named for the JOB rather than the hue, so a screen asks for
   * "attention" and not "peach". Re-tinting the app later means editing this
   * map; it should never mean grepping for a hex.
   *
   * Each pairs `ink` with the `bg` it is designed to sit on. Measured:
   *
   *   attention  #EE9F5B on #FBE7D2 -> 1.79:1
   *   owned      #6E9A6B on #E4EFDE -> 2.72:1
   *   understood #5E90A8 on #DCEAF0 -> 2.83:1
   *
   * Those are far under AA, and that is fine because `ink` is never text. It
   * draws the ring around a metric; the numeral inside is `colors.text`, which
   * measures 11.4–11.9:1 on all three grounds, and the caption below is
   * `colors.muted` at 4.58–4.75:1. Using `ink` for a label would fail — the
   * pairing is a ring colour and a ground, not a foreground and a background.
   */
  accents: {
    /** Something the user may want to look at. Cautions, flags. */
    attention: { ink: palette.peach, bg: palette.peachBg },
    /** Things the user has. Shelf counts, collections. */
    owned: { ink: palette.leaf, bg: palette.leafBg },
    /** Things Dewly has understood. Recognised ingredients, matches. */
    understood: { ink: palette.blue, bg: palette.blueBg },
  },

  /** Reserved for type placed ON the hero gradient. */
  onHero: {
    /** The eyebrow — mint reads as dawn light against the deep green. */
    eyebrow: palette.mint,
    /** Headline. */
    title: palette.white,
    /** Supporting line. Cream rather than a transparent white so it stays
     *  a fixed, checkable value instead of drifting with the gradient. */
    body: palette.cream,
  },

  /**
   * Evidence grades on the Discover feed.
   *
   * Three calm, distinguishable states rather than a traffic light. A red
   * "evolving" badge would read as a warning, and the grade is not a warning —
   * it says how settled the science is, not whether the ingredient is risky.
   * So they differ in hue but share the same low saturation, and none of them
   * shouts. `fg` on `bg` clears AA at badge size in all three.
   */
  evidence: {
    /** Well studied, broadly agreed. */
    established: { bg: '#DCEFE4', fg: '#1B5E3F', border: '#B6DCC6' },
    /** Real research, still thin or early. */
    emerging: { bg: '#DCE9EC', fg: '#1C5560', border: '#B4D2D9' },
    /** Genuinely unsettled — the claim is ahead of the evidence. */
    evolving: { bg: '#EFE7DC', fg: '#6B5334', border: '#DCCBB4' },
  },

  status: {
    success: { bg: '#DCEFE4', fg: '#1B5E3F', border: '#B6DCC6' },
    warning: { bg: '#FBECCB', fg: '#7A5312', border: '#EDD49B' },
    danger: { bg: '#F8DFDA', fg: '#8A2B1C', border: '#EBBDB3' },
    info: { bg: '#DCE9EC', fg: '#1C5560', border: '#B4D2D9' },
  },
} as const;

export type StatusTone = keyof typeof colors.status;
