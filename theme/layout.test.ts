import { describe, expect, test } from 'bun:test';

import { isWideViewport, MAX_CONTENT_WIDTH, WIDE_BREAKPOINT } from './layout';

describe('isWideViewport', () => {
  /**
   * The requirement that matters most: a phone must be byte-for-byte the layout
   * it had before this existed. These are real portrait widths in points.
   */
  test.each([
    [320, 'iPhone SE (1st gen)'],
    [375, 'iPhone SE / 13 mini'],
    [390, 'iPhone 14'],
    [402, 'iPhone 16 Pro'],
    [430, 'iPhone 16 Pro Max'],
    [412, 'Pixel 8'],
  ])('%ipt (%s) stays full-bleed', (width) => {
    expect(isWideViewport(width)).toBe(false);
  });

  test.each([
    [768, 'iPad portrait'],
    [1024, 'iPad landscape'],
    [1280, 'laptop'],
    [1920, 'desktop'],
  ])('%ipt (%s) gets the centred column', (width) => {
    expect(isWideViewport(width)).toBe(true);
  });

  test('the breakpoint itself is wide, one point under is not', () => {
    expect(isWideViewport(WIDE_BREAKPOINT)).toBe(true);
    expect(isWideViewport(WIDE_BREAKPOINT - 1)).toBe(false);
  });

  /**
   * The breakpoint has to clear the column by enough that the surround reads as
   * a decision. Engaging at exactly `MAX_CONTENT_WIDTH` would give a 490px
   * window a 5px margin, which looks like a bug.
   */
  test('leaves a visible margin the moment it engages', () => {
    const marginEachSide = (WIDE_BREAKPOINT - MAX_CONTENT_WIDTH) / 2;
    expect(marginEachSide).toBeGreaterThanOrEqual(48);
  });

  test('the column never exceeds the breakpoint that reveals it', () => {
    expect(MAX_CONTENT_WIDTH).toBeLessThan(WIDE_BREAKPOINT);
  });
});
