/**
 * Layout tokens for the responsive content column.
 *
 * Dewly is a mobile-first app, and on a desktop browser that is a real design
 * problem rather than a stylistic one: stretched to 1400px the hero card
 * becomes a squat green band, the three metric cards turn into wide empty
 * slabs, and a routine step is a thin line of text adrift in whitespace. Every
 * proportion in the app was chosen against a phone-width column.
 *
 * So above a breakpoint the app renders in a fixed-width column, centred, with
 * the page behind it in a deeper tone.
 */

/**
 * The column's width above the breakpoint.
 *
 * 480 rather than a typical 640–768 content width, because this is not a
 * document — it is a phone app being shown on a bigger screen, and every card,
 * type size and gutter in it was tuned at ~430. 480 gives the hero a little
 * more room without letting it flatten, and keeps a routine step's product name
 * on the same number of lines it uses on a phone.
 */
export const MAX_CONTENT_WIDTH = 480;

/**
 * Below this, the column is a no-op and the app fills the viewport.
 *
 * 600 rather than 480 so the constraint only engages when there is enough room
 * for the surround to read as intentional. Switching on at exactly 480 would
 * give a 500px window a 10px margin either side, which looks like a rendering
 * bug rather than a decision.
 *
 * Phones never reach 600pt in portrait, so this is automatically inert on
 * native — no `Platform` check needed. A tablet in landscape does cross it and
 * gets the same centred column, which is the right answer there too.
 */
export const WIDE_BREAKPOINT = 600;

/** Whether the centred column should engage at this viewport width. */
export function isWideViewport(width: number): boolean {
  return width >= WIDE_BREAKPOINT;
}
