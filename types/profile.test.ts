import { describe, expect, test } from 'bun:test';

import { MAX_NAME_LENGTH, normalizeDisplayName } from './profile';

/**
 * The name is optional at every layer, so the interesting cases are all the
 * ways "no name" can arrive: never typed, typed then deleted, or whitespace.
 * All three have to collapse to the same `null`, because the home hero decides
 * between a name and a fallback with `??` and `''` would win that test while
 * rendering as an empty headline.
 */
describe('normalizeDisplayName', () => {
  test('keeps an ordinary name unchanged', () => {
    expect(normalizeDisplayName('Ece')).toBe('Ece');
    expect(normalizeDisplayName('Ada Lovelace')).toBe('Ada Lovelace');
  });

  test.each([
    ['', 'empty string'],
    ['   ', 'spaces only'],
    ['\n\t ', 'whitespace only'],
    [null, 'null'],
    [undefined, 'undefined'],
  ])('collapses %p to null (%s)', (input) => {
    expect(normalizeDisplayName(input as string | null)).toBeNull();
  });

  test('trims the edges', () => {
    expect(normalizeDisplayName('  Ece  ')).toBe('Ece');
  });

  test('collapses inner whitespace, so a stray double space never reaches the hero', () => {
    expect(normalizeDisplayName('Ada   Lovelace')).toBe('Ada Lovelace');
    expect(normalizeDisplayName('Ada\tLovelace')).toBe('Ada Lovelace');
  });

  test('caps the length so the hero headline cannot be pushed to three lines', () => {
    const long = 'Bartholomew Montgomery Fitzgerald';
    const result = normalizeDisplayName(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(MAX_NAME_LENGTH);
  });

  test('keeps non-ASCII names intact', () => {
    expect(normalizeDisplayName('Çiğdem')).toBe('Çiğdem');
    expect(normalizeDisplayName(' Şule ')).toBe('Şule');
  });

  test('is idempotent — running it twice changes nothing', () => {
    for (const input of ['  Ada   Lovelace ', 'Ece', 'Çiğdem']) {
      const once = normalizeDisplayName(input);
      expect(normalizeDisplayName(once)).toBe(once);
    }
  });
});
