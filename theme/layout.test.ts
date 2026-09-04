import { describe, expect, test } from 'bun:test';

import {
  CENTERED_BREAKPOINT,
  desktopContentWidth,
  DESKTOP_BREAKPOINT,
  isWideViewport,
  layoutModeFor,
  MAX_CONTENT_WIDTH,
  MAX_DESKTOP_WIDTH,
  resultsGridColumns,
} from './layout';

describe('layoutModeFor', () => {
  /**
   * The requirement that outranks everything else here: a phone must get the
   * layout it had before any of this existed. These are real portrait widths.
   */
  test.each([
    [320, 'iPhone SE (1st gen)'],
    [375, 'iPhone SE / 13 mini'],
    [390, 'iPhone 14'],
    [402, 'iPhone 16 Pro'],
    [430, 'iPhone 16 Pro Max'],
    [412, 'Pixel 8'],
  ])('%ipt (%s) is mobile', (width) => {
    expect(layoutModeFor(width)).toBe('mobile');
    expect(isWideViewport(width)).toBe(false);
  });

  test.each([
    [600, 'the centred breakpoint itself'],
    [768, 'iPad portrait'],
    [899, 'one below desktop'],
  ])('%ipt (%s) is centered', (width) => {
    expect(layoutModeFor(width)).toBe('centered');
    // Screens must NOT take the desktop branch here — a sidebar plus two
    // columns does not fit, which is the reason this middle mode exists.
    expect(isWideViewport(width)).toBe(false);
  });

  test.each([
    [900, 'the desktop breakpoint itself'],
    [1024, 'iPad landscape'],
    [1280, 'laptop'],
    [1920, 'desktop'],
    [3440, 'ultrawide'],
  ])('%ipt (%s) is desktop', (width) => {
    expect(layoutModeFor(width)).toBe('desktop');
    expect(isWideViewport(width)).toBe(true);
  });

  test('each boundary is exact', () => {
    expect(layoutModeFor(CENTERED_BREAKPOINT - 1)).toBe('mobile');
    expect(layoutModeFor(CENTERED_BREAKPOINT)).toBe('centered');
    expect(layoutModeFor(DESKTOP_BREAKPOINT - 1)).toBe('centered');
    expect(layoutModeFor(DESKTOP_BREAKPOINT)).toBe('desktop');
  });
});

describe('the breakpoints and the widths they gate agree', () => {
  test('the modes are ordered', () => {
    expect(CENTERED_BREAKPOINT).toBeLessThan(DESKTOP_BREAKPOINT);
  });

  /**
   * Engaging the centred column at exactly its own width would give a 490px
   * window a 5px margin either side, which reads as a rendering bug rather
   * than a decision.
   */
  test('the centred column has visible surround the moment it engages', () => {
    expect((CENTERED_BREAKPOINT - MAX_CONTENT_WIDTH) / 2).toBeGreaterThanOrEqual(48);
  });

  /** The desktop cap must be reachable, or it would never do anything. */
  test('the desktop column is wider than the phone column but capped', () => {
    expect(MAX_DESKTOP_WIDTH).toBeGreaterThan(MAX_CONTENT_WIDTH);
    expect(MAX_DESKTOP_WIDTH).toBeGreaterThan(DESKTOP_BREAKPOINT);
  });

  /**
   * At the moment the sidebar appears there must still be usable room beside
   * it for two columns — the sizing argument behind picking 900.
   */
  test('the sidebar leaves workable content width at the breakpoint', () => {
    const SIDEBAR = 248;
    const PADDING = 32 * 2;
    expect(DESKTOP_BREAKPOINT - SIDEBAR - PADDING).toBeGreaterThanOrEqual(560);
  });
});

describe('desktopContentWidth', () => {
  test('subtracts the sidebar and the page gutters', () => {
    // 900 window - 248 sidebar - 64 gutters = 588.
    expect(desktopContentWidth(900)).toBe(588);
    expect(desktopContentWidth(1280)).toBe(968);
  });

  test('caps at the desktop column so ultrawide does not sprawl', () => {
    expect(desktopContentWidth(1920)).toBe(MAX_DESKTOP_WIDTH);
    expect(desktopContentWidth(3440)).toBe(MAX_DESKTOP_WIDTH);
  });

  test('never goes negative', () => {
    expect(desktopContentWidth(200)).toBe(0);
  });
});

describe('resultsGridColumns', () => {
  /**
   * The cards hold an INCI name, a badge row and a sentence. These assert the
   * card width that actually falls out, not just the column count — the count
   * alone can be "right" while the cards are unreadably narrow or absurdly
   * wide. This is what caught the 442pt cards the first threshold produced.
   */
  test.each([
    [900, 2],
    [1140, 3],
    [1280, 3],
    [1920, 3],
  ])('a %ipt window gives %i columns', (windowWidth, expected) => {
    expect(resultsGridColumns(desktopContentWidth(windowWidth))).toBe(expected);
  });

  test('every desktop width lands on a comfortable card width', () => {
    for (let w = DESKTOP_BREAKPOINT; w <= 2560; w += 20) {
      const content = desktopContentWidth(w);
      const columns = resultsGridColumns(content);
      const gaps = (columns - 1) * 16;
      const card = (content - gaps) / columns;
      expect(card).toBeGreaterThanOrEqual(250);
      expect(card).toBeLessThanOrEqual(430);
    }
  });

  test('falls back to a single column when there is no room', () => {
    expect(resultsGridColumns(400)).toBe(1);
  });
});
