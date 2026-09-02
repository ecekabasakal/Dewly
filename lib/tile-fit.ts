/**
 * Text sizing for `components/BrandTile`.
 *
 * Pure and dependency-free, like `lib/inci.ts` and for the same reason: it is
 * the part worth testing, and importing `react-native` into it would put it out
 * of reach of `bun test`.
 */

/** Two lines is the budget: three at tile scale is unreadable. */
export const MAX_LINES = 2;

/** Below this the serif stops being legible, so the label ellipsizes instead. */
export const MIN_FONT_SIZE = 9;

/**
 * Inner gutter for a tile of `size`.
 *
 * Proportional, not fixed. A flat 8pt gutter is a comfortable margin on the
 * 96pt detail tile and a third of the whole 48pt routine tile — which left
 * "CeraVe" unable to fit one line at any legible size, so it wrapped to
 * "CeraV / e". Scaling the gutter keeps the tile looking like one object at
 * every size instead of a differently-proportioned one at each.
 */
export function tilePadding(size: number): number {
  return Math.max(4, Math.round(size * 0.11));
}

/**
 * Advance width per character, in ems of the font size.
 *
 * Measured from Fraunces_600SemiBold rendered in the app, across the brand
 * names this actually has to hold. A single average does not work — the spread
 * is far too wide to collapse into one number:
 *
 *   COSRX   0.719 em/char        Klairs  0.493 em/char
 *   SVR     0.690                Isdin   0.495
 *
 * An all-caps brand is roughly 45% wider per character than a lowercase one,
 * so one average either clips the caps or needlessly shrinks everything else.
 * Splitting by character class tracks the real widths within a third, and every
 * value here is rounded UP from what was measured: over-estimating shrinks text
 * slightly, under-estimating breaks a word in half.
 */
const CHAR_EM = {
  /** Capitals and digits. Above COSRX's measured 0.719. */
  wide: 0.74,
  /** Lowercase. Above Bioderma's 0.597, the widest lowercase-heavy name. */
  narrow: 0.58,
  /** Spaces, hyphens, punctuation. */
  thin: 0.32,
} as const;

function charEm(ch: string): number {
  if (/[\s\p{P}]/u.test(ch)) return CHAR_EM.thin;
  if (/\d/.test(ch)) return CHAR_EM.wide;
  // A case test rather than an A-Z range, so Ş, Ğ, İ and É are measured as the
  // capitals they are — Turkish brand names are squarely in scope.
  if (ch !== ch.toLowerCase() && ch === ch.toUpperCase()) return CHAR_EM.wide;
  return CHAR_EM.narrow;
}

/** Width of `text` in ems. Must never come in UNDER the real advance width. */
export function estimateEmWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  return em;
}

/**
 * The width the widest LINE will need once the label wraps, in ems.
 *
 * Not the same as `estimateEmWidth(text) / MAX_LINES`, and the difference is
 * visible. Text wraps at word boundaries, so two lines do not share the string
 * evenly — the leftover at the end of a line is dead space. Sizing "La Roche
 * Posay" off the even split gave a font at which "La Roche" was already too
 * wide for one line, so it wrapped to "La / Roche" and dropped "Posay" to an
 * ellipsis.
 *
 * With a two-line budget the problem is small enough to solve exactly rather
 * than approximate: try every split point and keep the one whose wider line is
 * narrowest. A single word has no split, which correctly yields its own width —
 * the constraint that stops a word breaking in half.
 */
export function wrappedEmWidth(text: string): number {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return 0;

  const space = charEm(' ');
  const ems = words.map(estimateEmWidth);
  const lineEm = (from: number, to: number) => {
    let width = 0;
    for (let i = from; i <= to; i += 1) width += ems[i]! + (i > from ? space : 0);
    return width;
  };

  const whole = lineEm(0, words.length - 1);
  if (words.length === 1) return whole;

  let best = whole;
  for (let split = 0; split < words.length - 1; split += 1) {
    const widest = Math.max(lineEm(0, split), lineEm(split + 1, words.length - 1));
    if (widest < best) best = widest;
  }
  return best;
}

/**
 * The largest font size that fits `text` in `MAX_LINES` inside a `size` tile.
 *
 * ## Why this is computed rather than measured
 *
 * React Native's `adjustsFontSizeToFit` is iOS-only — a no-op on Android and on
 * react-native-web, so the same brand name would render at three different
 * sizes across the three platforms this app ships to. `onTextLayout` works
 * everywhere but costs a second render pass per tile, and a shelf renders a
 * dozen of them.
 *
 * So: estimate. Two limits, smaller wins.
 *
 *   1. **Width of the widest wrapped line** — see `wrappedEmWidth`, which also
 *      covers the single-word case that stops "CeraVe" breaking into
 *      "CeraV / e".
 *   2. **Height** — two lines of leading inside the tile's inner box.
 *
 * When the estimate is wrong it is wrong small, and `numberOfLines` catches the
 * remainder with an ellipsis rather than letting text spill outside the tile.
 */
export function fitFontSize(text: string, size: number): number {
  const inner = size - tilePadding(size) * 2;
  // The ceiling scales with the tile so a 48pt routine tile and a 96pt detail
  // tile read as the same object at two zoom levels.
  const max = Math.max(MIN_FONT_SIZE, size * 0.2);

  const byWidth = inner / Math.max(wrappedEmWidth(text), 0.1);
  const byHeight = inner / (MAX_LINES * 1.15);

  return Math.max(MIN_FONT_SIZE, Math.min(max, byWidth, byHeight));
}
