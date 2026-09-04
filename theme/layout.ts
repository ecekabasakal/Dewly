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

/** The desktop navigation rail's width. Consumed by `components/Sidebar`. */
export const SIDEBAR_WIDTH = 248;

/** Horizontal padding inside `components/DesktopPage`, per side. */
export const DESKTOP_PAGE_PADDING = 32;

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

/**
 * How much room a desktop screen actually has, from the window width.
 *
 * Window minus the sidebar minus the page's own gutters, then capped. Derived
 * rather than measured with `onLayout` so a grid can pick its column count on
 * the first render instead of after a layout pass — a results grid that
 * reflows one frame after paint is visible.
 */
export function desktopContentWidth(windowWidth: number): number {
  const available = windowWidth - SIDEBAR_WIDTH - DESKTOP_PAGE_PADDING * 2;
  return Math.max(0, Math.min(available, MAX_DESKTOP_WIDTH));
}

/**
 * Columns for a grid of ingredient cards at a given content width.
 *
 * The cards hold an INCI name, a row of badges and a sentence of description,
 * so the aim is to keep every card between about 250 and 430pt wide: below 250
 * the description breaks into a column of two-word lines, above 430 a short one
 * leaves a hole beside it.
 *
 *   588  (at the 900px breakpoint) -> 2 columns of ~286
 *   819                            -> 2 columns of ~402
 *   820                            -> 3 columns of ~263
 *   1100 (the cap)                 -> 3 columns of ~356
 *
 * The 820 threshold is not a round number, and that is the point: at 900 the
 * band just below it produced 442pt cards — wide enough that a one-line
 * description sat alone in a card twice its height. 820 is where two columns
 * stop being comfortable and three start, given a 16pt gutter.
 *
 * Never more than 3. A fourth column at the 1100 cap gives ~257pt cards, which
 * is inside the range but leaves no room for the wider INCI names.
 */
export function resultsGridColumns(contentWidth: number): number {
  if (contentWidth >= 820) return 3;
  if (contentWidth >= 520) return 2;
  return 1;
}
