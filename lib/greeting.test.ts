import { describe, expect, test } from 'bun:test';

import { displayNameFromEmail, greetingFor, greetingText } from './greeting';

/** Local time on a fixed day, so these do not drift with the test machine. */
const at = (hour: number) => new Date(2026, 0, 15, hour, 30, 0);

describe('greetingFor', () => {
  test.each([
    [5, 'morning'],
    [9, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [15, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [22, 'evening'],
  ] as const)('%i:30 is %s', (hour, expected) => {
    expect(greetingFor(at(hour))).toBe(expected);
  });

  // Evening wraps midnight rather than introducing a fourth state — someone
  // doing their PM routine at 1am is still having an evening.
  test.each([0, 2, 4])('%i:30 is still evening', (hour) => {
    expect(greetingFor(at(hour))).toBe('evening');
  });

  test('is bilingual', () => {
    expect(greetingText('en', at(9))).toBe('Good morning');
    expect(greetingText('tr', at(9))).toBe('Günaydın');
    expect(greetingText('tr', at(20))).toBe('İyi akşamlar');
  });
});

describe('displayNameFromEmail', () => {
  test('splits the separators people actually use', () => {
    expect(displayNameFromEmail('ada.lovelace@example.com')).toBe('Ada Lovelace');
    expect(displayNameFromEmail('ada_lovelace@example.com')).toBe('Ada Lovelace');
    expect(displayNameFromEmail('ada-lovelace@example.com')).toBe('Ada Lovelace');
    expect(displayNameFromEmail('ada+skincare@example.com')).toBe('Ada Skincare');
  });

  test('drops the trailing digits people add to claim a handle', () => {
    expect(displayNameFromEmail('ece99@example.com')).toBe('Ece');
    expect(displayNameFromEmail('ecekabasakal8@gmail.com')).toBe('Ecekabasakal');
  });

  test('capitalises without destroying the rest of the word', () => {
    expect(displayNameFromEmail('mcdonald@example.com')).toBe('Mcdonald');
    // Not `.toUpperCase()` on the whole string.
    expect(displayNameFromEmail('ADA@example.com')).toBe('ADA');
  });

  test('handles non-ASCII names', () => {
    expect(displayNameFromEmail('çiğdem@example.com')).toBe('Çiğdem');
  });

  // Every one of these should fall back to a nameless greeting rather than
  // printing something that reads as a bug.
  test.each([
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
    ['12345@example.com', 'all digits'],
    ['___@example.com', 'only separators'],
    ['averyveryverylongemailaddresshandle@example.com', 'too long to be a name'],
  ])('returns null for %s (%s)', (email) => {
    expect(displayNameFromEmail(email as string | null)).toBeNull();
  });

  test('accepts a name right at the length limit', () => {
    expect(displayNameFromEmail('alexandra.rodriguez@x.com')).toBe('Alexandra Rodriguez');
  });
});
