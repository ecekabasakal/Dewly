/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { findConflicts, resolveFinding } from './conflicts';
import type { ProductTimeOfDay, ShelfProduct, StepType } from '../types/shelf';

let seq = 0;
function product(
  name: string,
  stepType: StepType,
  timeOfDay: ProductTimeOfDay,
  ingredientNames: string[] = []
): ShelfProduct {
  seq += 1;
  return {
    id: `p${seq}`,
    name,
    brand: null,
    stepType,
    timeOfDay,
    ingredientNames,
    addedAt: new Date(2020, 0, seq).toISOString(),
  };
}

const ids = (shelf: ShelfProduct[]) =>
  findConflicts(shelf).map((f) => `${f.ruleId}:${f.slot}`);

describe('same_slot_only', () => {
  test('fires when both sides are in the SAME slot', () => {
    const shelf = [
      product('Retinol Night Serum', 'serum', 'pm', ['Retinol']),
      product('Benzoyl Peroxide Spot Gel', 'serum', 'pm', ['Benzoyl Peroxide']),
    ];
    expect(ids(shelf)).toContain('retinoid-x-benzoyl-peroxide:pm');
  });

  test('does NOT fire when the sides are split across slots', () => {
    const shelf = [
      product('Retinol Night Serum', 'serum', 'pm', ['Retinol']),
      product('Benzoyl Peroxide Spot Gel', 'serum', 'am', ['Benzoyl Peroxide']),
    ];
    expect(ids(shelf)).not.toContain('retinoid-x-benzoyl-peroxide:pm');
    expect(ids(shelf)).not.toContain('retinoid-x-benzoyl-peroxide:am');
  });

  test('only lists products actually in the firing slot', () => {
    const shelf = [
      product('Retinol Night Serum', 'serum', 'pm', ['Retinol']),
      product('Benzoyl Peroxide Spot Gel', 'serum', 'pm', ['Benzoyl Peroxide']),
      // An AM-only retinoid must not leak into the PM finding.
      product('Morning Retinal', 'serum', 'am', ['Retinal']),
    ];
    const finding = findConflicts(shelf).find(
      (f) => f.ruleId === 'retinoid-x-benzoyl-peroxide' && f.slot === 'pm'
    );
    expect(finding).toBeDefined();
    expect(finding!.products.map((p) => p.name)).not.toContain('Morning Retinal');
  });

  test('a "both" product counts in each slot', () => {
    const shelf = [
      product('Retinol Treatment', 'serum', 'both', ['Retinol']),
      product('Benzoyl Peroxide Gel', 'serum', 'am', ['Benzoyl Peroxide']),
    ];
    // The retinoid IS used in the morning, so the morning clash is real.
    expect(ids(shelf)).toContain('retinoid-x-benzoyl-peroxide:am');
    expect(ids(shelf)).not.toContain('retinoid-x-benzoyl-peroxide:pm');
  });

  test('one product containing both sides does not flag itself', () => {
    const shelf = [product('Retinol + Glycolic Duo', 'serum', 'pm', ['Retinol', 'Glycolic Acid'])];
    expect(ids(shelf)).not.toContain('retinoid-x-exfoliating-acid:pm');
  });
});

describe('over-exfoliation derived rule', () => {
  test('two exfoliating acids in one slot fire it, matched by INGREDIENTS', () => {
    const shelf = [
      product('Glycolic Acid Toner', 'toner', 'pm', ['Glycolic Acid']),
      product('Salicylic Acid Serum', 'serum', 'pm', ['Salicylic Acid']),
    ];
    expect(ids(shelf)).toContain('over-exfoliation-load:pm');
  });

  test('matched by NAME alone when no ingredients are attached', () => {
    const shelf = [
      product('Glycolic Glow Toner', 'toner', 'pm'),
      product('Salicylic Clarifying Serum', 'serum', 'pm'),
    ];
    expect(ids(shelf)).toContain('over-exfoliation-load:pm');
  });

  test('matched by the exfoliant STEP flag alone', () => {
    const shelf = [
      product('Weekly Resurfacing Pads', 'exfoliant', 'pm'),
      product('Gentle Polish', 'exfoliant', 'pm'),
    ];
    expect(ids(shelf)).toContain('over-exfoliation-load:pm');
  });

  test('does NOT fire below the threshold of 2', () => {
    const shelf = [product('Glycolic Acid Toner', 'toner', 'pm', ['Glycolic Acid'])];
    expect(ids(shelf)).not.toContain('over-exfoliation-load:pm');
  });

  test('does NOT fire when the two acids are in different slots', () => {
    const shelf = [
      product('Glycolic Acid Toner', 'toner', 'am', ['Glycolic Acid']),
      product('Salicylic Acid Serum', 'serum', 'pm', ['Salicylic Acid']),
    ];
    expect(ids(shelf)).not.toContain('over-exfoliation-load:am');
    expect(ids(shelf)).not.toContain('over-exfoliation-load:pm');
  });
});

describe('clean routine', () => {
  test('produces zero findings', () => {
    const shelf = [
      product('Gentle Foaming Cleanser', 'water_cleanser', 'both'),
      product('Hydrating Toner', 'toner', 'both'),
      product('Ceramide Moisturizer', 'moisturizer', 'both'),
      product('Airy Sunscreen SPF50', 'spf', 'am', ['Zinc Oxide']),
    ];
    expect(findConflicts(shelf)).toHaveLength(0);
  });

  test('an AM routine without sunscreen is flagged', () => {
    const shelf = [
      product('Hydrating Toner', 'toner', 'am'),
      product('Glow Serum', 'serum', 'am'),
    ];
    expect(ids(shelf)).toContain('am-missing-spf:am');
  });

  test('an empty shelf produces nothing', () => {
    expect(findConflicts([])).toHaveLength(0);
  });
});

describe('presentation', () => {
  test('resolves copy and citations in both languages', () => {
    const shelf = [
      product('Retinol Night Serum', 'serum', 'pm', ['Retinol']),
      product('Benzoyl Peroxide Spot Gel', 'serum', 'pm', ['Benzoyl Peroxide']),
    ];
    const finding = findConflicts(shelf)[0]!;

    for (const language of ['en', 'tr'] as const) {
      const resolved = resolveFinding(finding, language);
      expect(resolved.title.length).toBeGreaterThan(0);
      expect(resolved.explanation.length).toBeGreaterThan(0);
      expect(resolved.recommendation.length).toBeGreaterThan(0);
      expect(resolved.severityLabel.length).toBeGreaterThan(0);
      expect(resolved.sources.length).toBeGreaterThan(0);
      expect(resolved.products.length).toBe(2);
      expect(resolved.sources.every((s) => s.url.startsWith('http'))).toBe(true);
    }
  });

  test('sorts high severity before medium', () => {
    const shelf = [
      product('Retinol Night Serum', 'serum', 'pm', ['Retinol']),
      product('Benzoyl Peroxide Gel', 'serum', 'pm', ['Benzoyl Peroxide']),
      product('Vitamin C Serum', 'serum', 'pm', ['Ascorbic Acid']),
      product('Sunscreen', 'spf', 'am', ['Zinc Oxide']),
    ];
    const severities = findConflicts(shelf).map((f) => f.severity);
    expect(severities[0]).toBe('high');
    expect(severities).toContain('medium');
    expect(severities.indexOf('high')).toBeLessThan(severities.indexOf('medium'));
  });
});
