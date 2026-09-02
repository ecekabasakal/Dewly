import { afterEach, describe, expect, test } from 'bun:test';

import { errorCode } from './errors';
import { findProducts, isBarcode, lookupBarcode, searchByName } from './obf';

/**
 * These tests are about the MESSY DATA, not the transport.
 *
 * Open Beauty Facts is crowdsourced, so the interesting cases are all shapes of
 * incomplete record: no ingredients, no brand, no name at all, a corporate
 * pile-up in `brands`, and the two different ways OBF says "not found". Each
 * one below is a real pattern taken from live OBF records.
 */

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Replaces `fetch` with one that always returns `body`, and records the URL. */
function stubFetch(body: unknown, options: { status?: number } = {}) {
  const calls: string[] = [];
  const status = options.status ?? 200;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as typeof fetch;
  return calls;
}

describe('isBarcode', () => {
  test('accepts EAN-8 through GTIN-14', () => {
    expect(isBarcode('40058153')).toBe(true);
    expect(isBarcode('3337875598996')).toBe(true);
    expect(isBarcode('0062600621757')).toBe(true);
  });

  test('rejects names, and digit strings outside the retail range', () => {
    expect(isBarcode('cerave')).toBe(false);
    expect(isBarcode('niacinamide 10%')).toBe(false);
    expect(isBarcode('1234567')).toBe(false);
    expect(isBarcode('123456789012345')).toBe(false);
    // A name that merely contains digits must not be treated as a barcode.
    expect(isBarcode('The Ordinary 10')).toBe(false);
  });

  test('tolerates surrounding whitespace, as typed', () => {
    expect(isBarcode('  3337875598996  ')).toBe(true);
  });
});

describe('lookupBarcode', () => {
  test('normalizes a complete record', async () => {
    stubFetch({
      status: 1,
      product: {
        code: '3337875598996',
        product_name: 'Moisturising cream',
        brands: 'CeraVe',
        ingredients_text: 'Aqua, Glycerin, Cetearyl Alcohol',
      },
    });

    const product = await lookupBarcode('3337875598996');

    expect(product).not.toBeNull();
    expect(product!.name).toBe('Moisturising cream');
    expect(product!.brand).toBe('CeraVe');
    expect(product!.ingredientsText).toBe('Aqua, Glycerin, Cetearyl Alcohol');
  });

  test('prefers the English field when the contributor filled both', async () => {
    stubFetch({
      status: 1,
      product: {
        code: '1',
        product_name: 'Crème hydratante',
        product_name_en: 'Moisturising cream',
        ingredients_text: 'Aqua, Glycérine',
        ingredients_text_en: 'Aqua, Glycerin',
      },
    });

    const product = await lookupBarcode('1');
    expect(product!.name).toBe('Moisturising cream');
    expect(product!.ingredientsText).toBe('Aqua, Glycerin');
  });

  test('falls back to generic_name when product_name is blank', async () => {
    // OBF stores an absent field as "" at least as often as it omits it.
    stubFetch({ status: 1, product: { code: '1', product_name: '  ', generic_name: 'Hand cream' } });

    const product = await lookupBarcode('1');
    expect(product!.name).toBe('Hand cream');
  });

  test('keeps only the first brand from a corporate pile-up', async () => {
    stubFetch({
      status: 1,
      product: { code: '1', product_name: 'Moisturizing Lotion', brands: 'Nestlé, Cetaphil, Galderma' },
    });

    const product = await lookupBarcode('1');
    expect(product!.brand).toBe('Nestlé');
  });

  // Photos were removed in favour of `components/BrandTile`. This asserts the
  // removal rather than the old behaviour: OBF still SERVES these fields, so
  // nothing but a test stops them creeping back into the payload and the type.
  test('never requests or returns an image, even when OBF offers one', async () => {
    const calls = stubFetch({
      status: 1,
      product: {
        code: '1',
        product_name: 'X',
        image_front_url: 'https://images.openbeautyfacts.org/a.400.jpg',
        image_front_small_url: 'https://images.openbeautyfacts.org/a.200.jpg',
        image_url: 'https://images.openbeautyfacts.org/a.jpg',
      },
    });

    const product = await lookupBarcode('1');

    expect(calls[0]).not.toContain('image');
    expect(JSON.stringify(product)).not.toContain('image');
    expect(Object.keys(product!).sort()).toEqual([
      'barcode',
      'brand',
      'ingredientsText',
      'name',
    ]);
  });

  test('reports missing ingredients and missing brand as null, not as an error', async () => {
    stubFetch({ status: 1, product: { code: '1', product_name: 'Bare record' } });

    const product = await lookupBarcode('1');
    expect(product!.ingredientsText).toBeNull();
    expect(product!.brand).toBeNull();
  });

  // OBF signals "no such product" two different ways, and both must read as a
  // miss. Treating the 404 as a transport failure showed a red "Couldn't reach
  // Open Beauty Facts" box for a barcode OBF had answered about perfectly well.
  test('returns null for OBF’s status:0 miss, which arrives as HTTP 200', async () => {
    stubFetch({ code: '00000000', status: 0, status_verbose: 'no code or invalid code' });
    expect(await lookupBarcode('0000000000000')).toBeNull();
  });

  test('returns null for the HTTP 404 flavour of a miss', async () => {
    stubFetch({}, { status: 404 });
    expect(await lookupBarcode('9999999999994')).toBeNull();
  });

  test('requests only the fields we render', async () => {
    const calls = stubFetch({ status: 1, product: { code: '1', product_name: 'X' } });
    await lookupBarcode('1');
    // An unfiltered OBF document is ~50 KB of tag hierarchies we never read.
    expect(calls[0]).toContain('fields=');
    expect(calls[0]).toContain('ingredients_text');
  });

  // The 404 above is a miss; every other bad status is still a real failure.
  test('an HTTP failure surfaces as a translatable load-failed', async () => {
    stubFetch({}, { status: 500 });
    expect(await lookupBarcode('1').then(() => null, errorCode)).toBe('load-failed');
  });

  test('a transport rejection surfaces as load-failed too', async () => {
    globalThis.fetch = (async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;
    expect(await lookupBarcode('1').then(() => null, errorCode)).toBe('load-failed');
  });
});

describe('searchByName', () => {
  test('drops barcode-only stubs that have no name to show', async () => {
    stubFetch({
      products: [
        { code: '1', product_name: 'Niacinamide Toner', brands: 'Plum' },
        // A scan somebody started and never finished. Rendering this as a card
        // gives the user nothing to choose between.
        { code: '6111255614868' },
        { code: '3', product_name: '   ' },
      ],
    });

    const results = await searchByName('niacinamide');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('Niacinamide Toner');
  });

  test('an empty query never hits the network', async () => {
    const calls = stubFetch({ products: [] });
    expect(await searchByName('   ')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  test('survives a response with no products array at all', async () => {
    stubFetch({ count: 0 });
    expect(await searchByName('nothing')).toEqual([]);
  });
});

describe('findProducts', () => {
  test('routes digits to the barcode endpoint', async () => {
    const calls = stubFetch({ status: 1, product: { code: '3337875598996', product_name: 'X' } });
    const results = await findProducts('3337875598996');

    expect(calls[0]).toContain('/api/v2/product/3337875598996.json');
    expect(results).toHaveLength(1);
  });

  test('routes text to the search endpoint', async () => {
    const calls = stubFetch({ products: [] });
    await findProducts('cerave moisturising cream');

    expect(calls[0]).toContain('/cgi/search.pl');
    expect(calls[0]).toContain('search_terms=cerave%20moisturising%20cream');
  });

  test('a barcode miss is an empty list, not a throw', async () => {
    stubFetch({ status: 0 });
    expect(await findProducts('0000000000000')).toEqual([]);
  });
});
