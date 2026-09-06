import { describe, expect, test } from 'bun:test';

import {
  estimateEmWidth,
  fitFontSize,
  fitTileLabel,
  MAX_LINES,
  MIN_FONT_SIZE,
  tileInitials,
  tilePadding,
  wrappedEmWidth,
} from './tile-fit';

/**
 * `BrandTile` sizes its label with an estimate instead of measuring, because
 * `adjustsFontSizeToFit` is iOS-only and `onTextLayout` costs a second render
 * pass on every tile in a list. The estimate is only safe while it stays at or
 * above the real advance widths — under-estimating is what produced "CeraV /
 * e", a six-letter brand broken across two lines on the shelf.
 *
 * The ratios below were measured from Fraunces_600SemiBold rendered in the app
 * (a hidden span at 100px, width / (100 * length)). This pins the model to them
 * so a future tweak to `CHAR_EM` cannot quietly reintroduce clipping.
 */
const MEASURED: [brand: string, emPerChar: number][] = [
  ['CeraVe', 0.571],
  ['Cetaphil', 0.511],
  ['Nivea', 0.547],
  ['La Roche Posay', 0.539],
  ['Neutrogena', 0.571],
  ['The Ordinary', 0.546],
  ['Beauty of Joseon', 0.511],
  ['Dermalogica', 0.566],
  ['Bioderma', 0.597],
  ['Avene', 0.591],
  ['COSRX', 0.719],
  ['Snail Mucin Essence', 0.515],
  ['Paulas Choice', 0.521],
  ['Garnier', 0.539],
  ['Eucerin', 0.54],
  ['SVR', 0.69],
  ['Isdin', 0.495],
  ['Klairs', 0.493],
];

/** The sizes the app actually renders: routine, shelf, search, detail. */
const TILE_SIZES = [48, 56, 72, 96];

describe('estimateEmWidth', () => {
  test.each(MEASURED)('never under-estimates %s', (brand, emPerChar) => {
    expect(estimateEmWidth(brand)).toBeGreaterThanOrEqual(emPerChar * brand.length);
  });

  test('stays within a third of the truth, so text is not shrunk pointlessly', () => {
    for (const [brand, emPerChar] of MEASURED) {
      expect(estimateEmWidth(brand) / (emPerChar * brand.length)).toBeLessThan(1.35);
    }
  });

  // All-caps is the case a single average gets wrong in the UNSAFE direction:
  // COSRX is ~45% wider per character than Klairs.
  test('models capitals as wider than lowercase', () => {
    expect(estimateEmWidth('COSRX')).toBeGreaterThan(estimateEmWidth('cosrx'));
  });

  test('treats non-ASCII capitals as capitals', () => {
    // A Turkish brand must not be measured as if Ş and Ğ were lowercase.
    expect(estimateEmWidth('ŞĞİ')).toBe(estimateEmWidth('ABC'));
  });

  test('spaces and punctuation are narrower than letters', () => {
    expect(estimateEmWidth('a a')).toBeLessThan(estimateEmWidth('aaa'));
    expect(estimateEmWidth('a-a')).toBeLessThan(estimateEmWidth('aaa'));
  });

  test('an empty string measures zero', () => {
    expect(estimateEmWidth('')).toBe(0);
  });
});

describe('wrappedEmWidth', () => {
  test('a single word is its own width — there is nothing to split', () => {
    expect(wrappedEmWidth('CeraVe')).toBe(estimateEmWidth('CeraVe'));
  });

  /**
   * The regression. Sizing off `estimateEmWidth(text) / 2` assumes two lines
   * share the string evenly, which word wrapping never does. "La Roche Posay"
   * was sized so that "La Roche" no longer fit one line, and rendered as
   * "La / Roche" with "Posay" lost to an ellipsis.
   */
  test('accounts for the dead space at the end of a wrapped line', () => {
    const even = estimateEmWidth('La Roche Posay') / 2;
    expect(wrappedEmWidth('La Roche Posay')).toBeGreaterThan(even);
  });

  test('picks the split whose wider line is narrowest', () => {
    // "La Roche" + "Posay" beats "La" + "Roche Posay".
    expect(wrappedEmWidth('La Roche Posay')).toBeCloseTo(
      estimateEmWidth('La Roche'),
      5
    );
  });

  test('is never narrower than the longest single word', () => {
    for (const [brand] of MEASURED) {
      const longest = Math.max(...brand.split(' ').map(estimateEmWidth));
      expect(wrappedEmWidth(brand)).toBeGreaterThanOrEqual(longest);
    }
  });

  test('an empty label measures zero', () => {
    expect(wrappedEmWidth('   ')).toBe(0);
  });
});

describe('fitFontSize', () => {
  /**
   * The regression. At 56pt "CeraVe" was sized off the whole-string average,
   * overflowed one line, and wrapped to "CeraV / e" on the shelf.
   */
  test.each(TILE_SIZES)('the longest word fits one line at %ipt', (size) => {
    const inner = size - tilePadding(size) * 2;
    for (const [brand] of MEASURED) {
      const fontSize = fitFontSize(brand, size);
      const widest = Math.max(
        ...brand.split(' ').map((word) => estimateEmWidth(word) * fontSize)
      );
      // Allowed to bust only when already at the legibility floor, where the
      // ellipsis takes over rather than the word breaking.
      if (fontSize > MIN_FONT_SIZE) expect(widest).toBeLessThanOrEqual(inner + 0.01);
    }
  });

  test('never returns anything below the legibility floor', () => {
    for (const size of TILE_SIZES) {
      expect(fitFontSize('Some Extremely Long Product Name Here', size))
        .toBeGreaterThanOrEqual(MIN_FONT_SIZE);
    }
  });

  test('scales with the tile, so one design reads at every size', () => {
    const small = fitFontSize('CeraVe', 48);
    const large = fitFontSize('CeraVe', 96);
    expect(large).toBeGreaterThan(small);
  });

  test('caps at a fifth of the tile so a short brand does not balloon', () => {
    expect(fitFontSize('A', 96)).toBeLessThanOrEqual(96 * 0.2);
  });

  test('a longer name is sized at or below a shorter one', () => {
    const short = fitFontSize('Nivea', 72);
    const long = fitFontSize('Beauty of Joseon', 72);
    expect(long).toBeLessThanOrEqual(short);
  });
});

describe('tileInitials', () => {
  test.each([
    ['Neutrogena', 'N'],
    ['Cetaphil', 'C'],
    ['La Roche Posay', 'LRP'],
    ['Beauty of Joseon', 'BoJ'],
    ['The Ordinary', 'TO'],
    ['COSRX', 'C'],
  ])('%s -> %s', (brand, expected) => {
    expect(tileInitials(brand)).toBe(expected);
  });

  test('caps at three, so a long name does not become a word again', () => {
    expect(tileInitials('One Two Three Four Five').length).toBe(3);
  });

  /** Bilingual: a Turkish brand must not lose its diacritics or its case. */
  test('preserves case and non-ASCII initials', () => {
    expect(tileInitials('Şifa Bitkisel')).toBe('ŞB');
    expect(tileInitials('cosrx')).toBe('c');
  });

  test('survives odd spacing', () => {
    expect(tileInitials('  La   Roche  ')).toBe('LR');
    expect(tileInitials('')).toBe('');
  });
});

describe('fitTileLabel', () => {
  /**
   * The regression this exists for. At the 48pt routine and shelf tile these
   * names were handed to the renderer at the 9pt floor while still too wide
   * for the box, and every renderer the app ships to breaks the word rather
   * than overflow: "Neutrog / ena", "Cetaphi / l".
   */
  test.each([
    ['Neutrogena', 'N'],
    ['Cetaphil', 'C'],
    ['La Roche Posay', 'LRP'],
    ['Beauty of Joseon', 'BoJ'],
  ])('%s falls back to %s on a 48pt tile', (brand, expected) => {
    expect(fitTileLabel(brand, 48).label).toBe(expected);
  });

  /** The names that already worked must not be traded away for the fix. */
  test.each(['CeraVe', 'COSRX', 'Paulas Choice', 'Nivea', 'Klairs'])(
    '%s still renders whole on a 48pt tile',
    (brand) => {
      expect(fitTileLabel(brand, 48).label).toBe(brand);
    }
  );

  /** A bigger tile has the room, so the full name comes back. */
  test('the detail tile shows every brand in full', () => {
    for (const [brand] of MEASURED) {
      expect(fitTileLabel(brand, 96).label).toBe(brand);
    }
  });

  test('the fallback is driven by fit, not by a hardcoded size', () => {
    // Neutrogena needs a ~69pt tile before its 10 letters clear the floor.
    expect(fitTileLabel('Neutrogena', 56).label).toBe('N');
    expect(fitTileLabel('Neutrogena', 72).label).toBe('Neutrogena');
  });

  /**
   * The guarantee, stated directly: whatever a tile draws fits inside it at a
   * legible size, on every size the app renders. No word is ever sawn in half
   * and no second line is ever lost to an ellipsis.
   */
  test.each(TILE_SIZES)('what is drawn always fits at %ipt', (size) => {
    const inner = size - tilePadding(size) * 2;
    for (const [brand] of MEASURED) {
      const { label, fontSize } = fitTileLabel(brand, size);
      expect(fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
      // Widest wrapped line inside the box: covers the mid-word break AND the
      // dropped-word case, since a name that needs three lines busts this too.
      expect(wrappedEmWidth(label) * fontSize).toBeLessThanOrEqual(inner + 0.01);
      expect(fontSize * 1.15 * MAX_LINES).toBeLessThanOrEqual(inner + 0.01);
    }
  });

  test('an empty label is left alone rather than turned into initials', () => {
    expect(fitTileLabel('', 48).label).toBe('');
  });
});
