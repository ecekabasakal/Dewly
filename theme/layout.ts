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

/** The persistent Discover rail on the right of every desktop tab screen. */
export const PANEL_WIDTH = 270;

/**
 * Where the Discover rail becomes affordable.
 *
 * Higher than `DESKTOP_BREAKPOINT` on purpose. The sidebar and the rail
 * together take 518pt of chrome, so at 900 the content column would be
 *
 *   900 - 248 sidebar - 270 rail - 64 gutters = 318pt
 *
 * which cannot hold a routine step (a 48pt tile plus two lines of product
 * name) or a results card. 1150 is the first width where the content keeps a
 * workable ~568pt and the grid still manages two columns.
 *
 * Between `DESKTOP_BREAKPOINT` and this, screens get the sidebar and the full
 * content width but no rail — the layout the app had before the rail existed.
 */
export const PANEL_BREAKPOINT = 1150;

/**
 * The content cap once the rail is up.
 *
 * Lower than `MAX_DESKTOP_WIDTH` because the rail also caps the grid at two
 * columns: at the full 1100 those two would be 542pt each, roughly a
 * paragraph-and-a-half wide. 820 keeps them at ~402, the top of the range the
 * ingredient cards were designed for.
 */
export const MAX_DESKTOP_WIDTH_WITH_PANEL = 820;

/** Whether the Discover rail should be mounted at this viewport width. */
export function hasDiscoverPanel(width: number): boolean {
  return width >= PANEL_BREAKPOINT;
}

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
  const panel = hasDiscoverPanel(windowWidth) ? PANEL_WIDTH : 0;
  const cap = panel > 0 ? MAX_DESKTOP_WIDTH_WITH_PANEL : MAX_DESKTOP_WIDTH;
  const available = windowWidth - SIDEBAR_WIDTH - panel - DESKTOP_PAGE_PADDING * 2;
  return Math.max(0, Math.min(available, cap));
}

/**
 * The most columns a results grid may use at this viewport.
 *
 * Two once the rail is up. That is the trade the rail buys: the grid gives up
 * a column so Discover can stay on screen while results are shown, instead of
 * vanishing the moment an analysis lands.
 */
export function maxGridColumns(windowWidth: number): number {
  return hasDiscoverPanel(windowWidth) ? 2 : 3;
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
export function resultsGridColumns(contentWidth: number, maxColumns = 3): number {
  const natural = contentWidth >= 820 ? 3 : contentWidth >= 520 ? 2 : 1;
  return Math.max(1, Math.min(natural, maxColumns));
}

/**
 * Columns for the ordered routine steps at a given content width.
 *
 * A step is a 32pt position marker, a 48pt brand tile and a product name that
 * must not break into a column of two-word lines. The phone is the yardstick:
 * 375 - 32 gutter - 32 marker - 12 - 32 card padding - 48 tile - 12 leaves the
 * name about 207pt, and that is the width the step card was drawn against.
 * A second column is only worth having when each one still clears it:
 *
 *   689 -> 1 column                        (two would give a 200pt name)
 *   690 -> 2 columns of 337, name ~201     (the floor)
 *   820 (the cap with the rail up)   -> 2 of 402, name ~266
 *   837 (the widest the rail-less band reaches) -> 2 of 410
 *
 * Below the floor one full-width column beats two cramped ones — the steps
 * simply run wider than they do on a phone, which is not a regression.
 *
 * Never three. A NUMBERED sequence in three columns stops reading as an order
 * and starts reading as a grid of tiles.
 */
export function routineStepColumns(contentWidth: number): number {
  return contentWidth >= 690 ? 2 : 1;
}
