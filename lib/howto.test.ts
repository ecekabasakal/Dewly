/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { applyCopy, howToFor, howtoDisclaimer, isEmptyGuidance } from './howto';
import { STEP_ORDER } from '../types/db';
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

// ---------------------------------------------------------------------------
// Static layer
// ---------------------------------------------------------------------------

describe('applyCopy', () => {
  /**
   * The join that keeps the feature whole. A step type with no entry renders no
   * guidance at all, so a step added to `STEP_ORDER` without copy would go
   * silently blank rather than fail anywhere visible.
   */
  const EACH_STEP = STEP_ORDER.map((step) => [step] as const);

  test.each(EACH_STEP)('%s has copy in both languages and both lengths', (step) => {
    for (const language of ['en', 'tr'] as const) {
      for (const detail of ['long', 'short'] as const) {
        const copy = applyCopy(step, language, detail);
        expect(copy).not.toBeNull();
        expect(copy!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('short is genuinely shorter than long, not a duplicate', () => {
    for (const step of STEP_ORDER) {
      for (const language of ['en', 'tr'] as const) {
        const long = applyCopy(step, language, 'long')!;
        const short = applyCopy(step, language, 'short')!;
        expect(short).not.toBe(long);
        expect(short.length).toBeLessThan(long.length);
      }
    }
  });

  test('is bilingual', () => {
    for (const step of STEP_ORDER) {
      expect(applyCopy(step, 'en', 'long')).not.toBe(applyCopy(step, 'tr', 'long'));
    }
  });

  test('an unknown step yields null rather than throwing', () => {
    expect(applyCopy('not_a_step' as StepType, 'en', 'long')).toBeNull();
  });
});

describe('howtoDisclaimer', () => {
  test('is present and bilingual', () => {
    expect(howtoDisclaimer('en').length).toBeGreaterThan(0);
    expect(howtoDisclaimer('tr').length).toBeGreaterThan(0);
    expect(howtoDisclaimer('en')).not.toBe(howtoDisclaimer('tr'));
  });
});

// ---------------------------------------------------------------------------
// Dynamic layer — reusing the two engines, not re-implementing them
// ---------------------------------------------------------------------------

describe('howToFor — timing', () => {
  test('a retinol serum is suggested for the evening, with its rule attached', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const guidance = howToFor(retinol, [retinol], 'en');

    expect(guidance.timing).not.toBeNull();
    expect(guidance.timing!.time).toBe('pm');
    // The evidence and citations come from `timing_rules.json` untouched.
    expect(guidance.timing!.rule.evidence).toBe('strong');
    expect(guidance.timing!.rule.sources.length).toBeGreaterThan(0);
    expect(guidance.timing!.rule.reason.length).toBeGreaterThan(0);
  });

  test('a sunscreen is suggested for the morning', () => {
    const spf = product('Daily Sunscreen', 'spf', 'am', ['Zinc Oxide']);
    expect(howToFor(spf, [spf], 'en').timing?.time).toBe('am');
  });

  /** Most products work at either end of the day; inventing advice is noise. */
  test('a plain moisturizer gets no timing line at all', () => {
    const cream = product('Simple Cream', 'moisturizer', 'both', ['Glycerin']);
    expect(howToFor(cream, [cream], 'en').timing).toBeNull();
  });

  test('the timing reason is translated', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const en = howToFor(retinol, [retinol], 'en');
    const tr = howToFor(retinol, [retinol], 'tr');
    expect(en.timing!.rule.reason).not.toBe(tr.timing!.rule.reason);
    // The recommendation itself is a fact about the molecule, not the language.
    expect(en.timing!.time).toBe(tr.timing!.time);
  });
});

describe('howToFor — conflicts', () => {
  /**
   * The headline case. A retinoid and an exfoliating acid on the same night
   * fire `retinoid-x-exfoliating-acid`, and the finding must reach BOTH
   * products' guidance — the advice is useless if it only appears under one.
   */
  test('an acid on the same night surfaces on both products', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const acid = product('Glycolic Acid Toner', 'exfoliant', 'pm', ['Glycolic Acid']);
    const shelf = [retinol, acid];

    for (const item of shelf) {
      const guidance = howToFor(item, shelf, 'en');
      expect(guidance.conflicts.length).toBeGreaterThan(0);
      expect(guidance.conflicts[0]!.severity).toBe('high');
      expect(guidance.conflicts[0]!.recommendation.length).toBeGreaterThan(0);
      expect(guidance.conflicts[0]!.sources.length).toBeGreaterThan(0);
    }
  });

  test('splitting them across slots clears the note from both', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const acid = product('Glycolic Acid Toner', 'exfoliant', 'am', ['Glycolic Acid']);
    const shelf = [retinol, acid];

    for (const item of shelf) {
      expect(howToFor(item, shelf, 'en').conflicts).toEqual([]);
    }
  });

  /** A bystander must not inherit someone else's clash. */
  test('an unrelated product on the same shelf stays clean', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const acid = product('Glycolic Acid Toner', 'exfoliant', 'pm', ['Glycolic Acid']);
    const cream = product('Simple Cream', 'moisturizer', 'both', ['Glycerin']);
    const shelf = [retinol, acid, cream];

    expect(howToFor(cream, shelf, 'en').conflicts).toEqual([]);
  });

  /**
   * `am_without_spf` is about a whole morning routine and carries no products,
   * so no product's id can match it. It belongs in the Routine screen's
   * conflict section, not under one step.
   */
  test('a routine-level finding never attaches itself to a product', () => {
    const serum = product('Vitamin C Serum', 'serum', 'am', ['Ascorbic Acid']);
    const shelf = [serum];

    // The finding exists on the shelf...
    expect(howToFor(serum, shelf, 'en').conflicts).toEqual([]);
  });

  /**
   * The add form: the product is not saved yet, so it is not on the shelf. The
   * guidance still has to answer "what would this clash with if I added it".
   */
  test('an unsaved draft is evaluated against the shelf it would join', () => {
    const acid = product('Glycolic Acid Toner', 'exfoliant', 'pm', ['Glycolic Acid']);
    const draft = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);

    const guidance = howToFor(draft, [acid], 'en');
    expect(guidance.conflicts.length).toBeGreaterThan(0);
    expect(guidance.conflicts[0]!.products.map((p) => p.name)).toContain(draft.name);
  });

  test('the conflict recommendation is translated', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const acid = product('Glycolic Acid Toner', 'exfoliant', 'pm', ['Glycolic Acid']);
    const shelf = [retinol, acid];

    const en = howToFor(retinol, shelf, 'en').conflicts[0]!;
    const tr = howToFor(retinol, shelf, 'tr').conflicts[0]!;
    expect(en.recommendation).not.toBe(tr.recommendation);
    expect(en.key).toBe(tr.key);
  });
});

// ---------------------------------------------------------------------------
// The two layers together
// ---------------------------------------------------------------------------

describe('howToFor — both layers', () => {
  /**
   * One call carries BOTH lengths, because both are shown in one place — the
   * short line by default, the long one when the reader expands it. Asking for
   * guidance can no longer return a partial answer, which is what made the two
   * screens disagree about the same bottle.
   */
  test('both lengths come back from a single lookup', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const guidance = howToFor(retinol, [retinol], 'en');

    expect(guidance.applyShort).toBe(applyCopy('serum', 'en', 'short'));
    expect(guidance.applyLong).toBe(applyCopy('serum', 'en', 'long'));
    // The disclosure has something to reveal: the two are genuinely different.
    expect(guidance.applyShort).not.toBe(guidance.applyLong);
  });

  test('both lengths are bilingual, and the dynamic half is unaffected', () => {
    const retinol = product('Retinol Night Serum', 'serum', 'pm', ['Retinol']);
    const en = howToFor(retinol, [retinol], 'en');
    const tr = howToFor(retinol, [retinol], 'tr');

    expect(en.applyShort).not.toBe(tr.applyShort);
    expect(en.applyLong).not.toBe(tr.applyLong);
    // Expanding is a presentation change, not a different suggestion.
    expect(en.timing!.time).toBe(tr.timing!.time);
  });

  /** Every step the disclosure can appear on has a longer version to show. */
  test('every step type has something behind the disclosure', () => {
    for (const step of STEP_ORDER) {
      const item = product(`A ${step}`, step, 'both');
      const guidance = howToFor(item, [item], 'en');
      expect(guidance.applyShort).not.toBeNull();
      expect(guidance.applyLong).not.toBeNull();
      expect(guidance.applyLong).not.toBe(guidance.applyShort);
    }
  });

  test('every step type produces something worth rendering', () => {
    for (const step of STEP_ORDER) {
      const item = product(`A ${step}`, step, 'both');
      expect(isEmptyGuidance(howToFor(item, [item], 'en'))).toBe(false);
    }
  });

  test('a product whose step has no copy and no rules renders nothing', () => {
    const orphan = product('Mystery', 'not_a_step' as StepType, 'both');
    expect(isEmptyGuidance(howToFor(orphan, [orphan], 'en'))).toBe(true);
  });
});
