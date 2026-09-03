/**
 * Responsive layout tokens.
 *
 * Dewly is a phone app first, and the web build has to serve three genuinely
 * different situations rather than stretch one layout across all of them:
 *
 *   mobile    < 600   the app, full-bleed. What a phone always gets.
 *   centered  600-899 the same phone layout in a 480px column, centred on a
 *                     deeper ground. A narrow desktop window or a tablet in
 *                     portrait: too wide to fill honestly, too narrow for a
 *                     sidebar and two columns.
 *   desktop   >= 900  a real desktop layout — left sidebar nav, wide content
 *                     area, multi-column screens.
 *
 * Three modes rather than two because collapsing `centered` into `desktop`
 * would put a 248px sidebar and a two-column split into a 650px window, where
 * the right-hand column would be about 240px wide. And collapsing it into
 * `mobile` brings back the edge-to-edge sprawl the centred column exists to fix.
 */

export const CENTERED_BREAKPOINT = 600;

/**
 * Where the desktop layout takes over.
 *
 * 900 because that is roughly where the sidebar plus a two-column content area
 * stops being cramped: 900 - 248 sidebar - 64 of padding leaves ~590 for
 * content, which splits into a ~350 / ~230 pair. Below that the right column
 * is too narrow for a profile card, which is why `centered` exists.
 */
export const DESKTOP_BREAKPOINT = 900;

/** The phone column's width in `centered` mode. See the mode table above. */
export const MAX_CONTENT_WIDTH = 480;

/**
 * The desktop content column, INSIDE the sidebar's remaining space.
 *
 * Capped so an ultra-wide monitor does not stretch a routine step into a metre
 * of whitespace with a product name adrift at one end. Beyond this the butter
 * background simply continues.
 */
export const MAX_DESKTOP_WIDTH = 1100;

export type LayoutMode = 'mobile' | 'centered' | 'desktop';

export function layoutModeFor(width: number): LayoutMode {
  if (width >= DESKTOP_BREAKPOINT) return 'desktop';
  if (width >= CENTERED_BREAKPOINT) return 'centered';
  return 'mobile';
}

/** The signal screens branch on. True only in `desktop`. */
export function isWideViewport(width: number): boolean {
  return layoutModeFor(width) === 'desktop';
}
