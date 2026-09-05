import { describe, expect, test } from 'bun:test';

import {
  brandThemeFor,
  evidenceLabel,
  EVIDENCE_LEVELS,
  ingredientOfTheDay,
  sourceLabel,
  trendingIngredients,
} from './discover';
import { parseInciList, resolveToken } from './inci';
import discoverFile from '../data/discover.json';

describe('trendingIngredients', () => {
  test('returns the curated feed in editorial order', () => {
    const en = trendingIngredients('en');
    expect(en.length).toBe(discoverFile.trending.length);
    expect(en[0]!.inciName).toBe(discoverFile.trending[0]!.inci_name);
  });

  /**
   * The join that makes the whole feature honest. Every card is tappable and
   * runs an analysis of its INCI name, so an entry naming an ingredient the
   * database does not have would lead straight to "nothing recognized".
   */
  test('every entry resolves against the ingredient database', () => {
    for (const item of trendingIngredients('en')) {
      const [token] = parseInciList(item.inciName);
      expect(token).toBeDefined();
      expect(resolveToken(token!).canonical).toBe(item.inciName);
    }
  });

  test('every entry carries a valid evidence grade', () => {
    for (const item of trendingIngredients('en')) {
      expect(EVIDENCE_LEVELS).toContain(item.evidence);
    }
  });

  /**
   * The point of the feature. If nothing were graded below `established` the
   * badge would be decoration — this asserts the feed actually admits when the
   * evidence is thin.
   */
  test('the feed is honest about unsettled ingredients', () => {
    const grades = trendingIngredients('en').map((i) => i.evidence);
    expect(grades).toContain('established');
    expect(grades.some((g) => g === 'emerging' || g === 'evolving')).toBe(true);
  });

  test('every entry cites a source', () => {
    for (const item of trendingIngredients('en')) {
      expect(item.source).not.toBeNull();
      expect(item.source!.url).toMatch(/^https:\/\//);
    }
  });

  test('is bilingual — notes and source labels differ by language', () => {
    const en = trendingIngredients('en');
    const tr = trendingIngredients('tr');
    expect(en.length).toBe(tr.length);
    expect(en[0]!.trendNote).not.toBe(tr[0]!.trendNote);
    expect(sourceLabel(en[0]!.source!, 'en')).not.toBe(sourceLabel(tr[0]!.source!, 'tr'));
  });

  test('no note is empty in either language', () => {
    for (const language of ['en', 'tr'] as const) {
      for (const item of trendingIngredients(language)) {
        expect(item.trendNote.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('brandThemeFor', () => {
  test('is stable within a day and changes across days', () => {
    const day1a = brandThemeFor('en', new Date('2026-03-01T08:00:00Z'));
    const day1b = brandThemeFor('en', new Date('2026-03-01T22:00:00Z'));
    const day2 = brandThemeFor('en', new Date('2026-03-02T08:00:00Z'));

    expect(day1a.id).toBe(day1b.id);
    expect(day2.id).not.toBe(day1a.id);
  });

  test('cycles through every theme rather than favouring one', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 30; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day));
      seen.add(brandThemeFor('en', date).id);
    }
    expect(seen.size).toBe(discoverFile.brand_themes.length);
  });

  test('is bilingual', () => {
    const date = new Date('2026-03-01T08:00:00Z');
    expect(brandThemeFor('en', date).label).not.toBe(brandThemeFor('tr', date).label);
    // The query is the OBF search term, so it must NOT be translated.
    expect(brandThemeFor('en', date).query).toBe(brandThemeFor('tr', date).query);
  });

  test('never returns an empty query', () => {
    for (let day = 0; day < 20; day += 1) {
      const theme = brandThemeFor('en', new Date(Date.UTC(2026, 5, 1 + day)));
      expect(theme.query.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('ingredientOfTheDay', () => {
  test('is stable within a day and changes across days', () => {
    const morning = ingredientOfTheDay('en', new Date('2026-03-01T00:05:00Z'));
    const night = ingredientOfTheDay('en', new Date('2026-03-01T23:55:00Z'));
    const tomorrow = ingredientOfTheDay('en', new Date('2026-03-02T09:00:00Z'));

    expect(morning!.inciName).toBe(night!.inciName);
    expect(tomorrow!.inciName).not.toBe(morning!.inciName);
  });

  /** Deterministic, not random — the same date always yields the same card. */
  test('the same date always gives the same ingredient', () => {
    const date = new Date('2026-07-14T12:00:00Z');
    const picks = Array.from({ length: 20 }, () => ingredientOfTheDay('en', date)!.inciName);
    expect(new Set(picks).size).toBe(1);
  });

  test('cycles through the whole feed rather than favouring one', () => {
    const seen = new Set<string>();
    for (let day = 0; day < discoverFile.trending.length * 2; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day));
      seen.add(ingredientOfTheDay('en', date)!.inciName);
    }
    expect(seen.size).toBe(trendingIngredients('en').length);
  });

  /** Every card the sidebar can ever show carries a grade and a usable name. */
  test('every day lands on a complete, gradeable card', () => {
    for (let day = 0; day < 40; day += 1) {
      const item = ingredientOfTheDay('en', new Date(Date.UTC(2026, 0, 1 + day)))!;
      expect(item.inciName.trim().length).toBeGreaterThan(0);
      expect(EVIDENCE_LEVELS).toContain(item.evidence);
      // The card falls back to the trend note when there is no common name, so
      // one of the two must always be there for the second line.
      expect((item.commonName ?? item.trendNote).trim().length).toBeGreaterThan(0);
    }
  });

  test('is bilingual, and picks the same ingredient in both languages', () => {
    const date = new Date('2026-03-01T08:00:00Z');
    const en = ingredientOfTheDay('en', date)!;
    const tr = ingredientOfTheDay('tr', date)!;
    // The INCI name is the same molecule in both; only the prose is translated.
    expect(en.inciName).toBe(tr.inciName);
    expect(en.trendNote).not.toBe(tr.trendNote);
  });

  /** Dates before the epoch must not crash on a negative modulo. */
  test('survives a pre-epoch date', () => {
    expect(ingredientOfTheDay('en', new Date('1969-01-01T00:00:00Z'))).not.toBeNull();
  });
});

describe('evidenceLabel', () => {
  test('every grade has a non-empty label in both languages', () => {
    for (const level of EVIDENCE_LEVELS) {
      expect(evidenceLabel(level, 'en').length).toBeGreaterThan(0);
      expect(evidenceLabel(level, 'tr').length).toBeGreaterThan(0);
    }
  });

  test('the grades are distinguishable from each other', () => {
    for (const language of ['en', 'tr'] as const) {
      const labels = EVIDENCE_LEVELS.map((level) => evidenceLabel(level, language));
      expect(new Set(labels).size).toBe(EVIDENCE_LEVELS.length);
    }
  });

  test('is translated', () => {
    expect(evidenceLabel('established', 'en')).not.toBe(evidenceLabel('established', 'tr'));
  });
});
