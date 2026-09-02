/**
 * Open Beauty Facts client.
 *
 * OBF is a community-maintained, ODbL-licensed catalogue of cosmetics — free,
 * no key, no auth. It gives us the thing we cannot generate ourselves: a
 * manufacturer's ingredient list, keyed by barcode or name.
 *
 * Photos are deliberately NOT requested. OBF serves them, but third-party
 * product photography is inconsistent enough — different backgrounds, crops
 * and lighting, missing entirely for a large share of records — that a shelf
 * built from it read as a scrapbook. `components/BrandTile` renders a
 * typographic tile instead, so nothing here fetches, stores or returns an
 * image URL.
 *
 * ## Endpoints
 *
 * Barcode lookup uses the modern v2 read endpoint:
 *   GET /api/v2/product/{barcode}.json?fields=…
 *
 * Name search uses the legacy CGI endpoint:
 *   GET /cgi/search.pl?search_terms=…&search_simple=1&action=process&json=1
 *
 * The legacy one deliberately: `/api/v2/search` exists but only filters by
 * tags (`categories_tags_en=…`) and has no free-text `search_terms`, so it
 * cannot answer "cerave moisturising cream". Both accept the same `fields=`
 * whitelist, which matters — an unfiltered OBF product document is ~50 KB of
 * nutrition scores and tag hierarchies we have no use for. Filtered, a page of
 * 12 results is a couple of KB.
 *
 * ## The data is messy, and that is the normal case
 *
 * OBF is crowdsourced, so every field is optional and several exist in half a
 * dozen language variants. Coverage for cosmetics is far thinner than for
 * food. Everything below is written to degrade rather than fail: a product
 * with no ingredients, no brand, or no name is a normal result, not an error,
 * and the UI offers manual entry for exactly that reason.
 */

import { AppError } from './errors';

/** OBF asks callers to identify themselves; anonymous traffic may be throttled. */
const USER_AGENT = 'Dewly/1.0 (skincare routine builder; open-beauty-facts client)';

const BASE = 'https://world.openbeautyfacts.org';

/**
 * Only the fields we render. See the note above on payload size.
 *
 * Both the `_en` and the bare variant of name/ingredients are requested: OBF
 * fills whichever the contributor used, and for a French or Turkish
 * contributor the bare field is the only one populated.
 */
const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'generic_name_en',
  'brands',
  'ingredients_text',
  'ingredients_text_en',
].join(',');

/** A slow lookup that never resolves is worse than a clean "try again". */
const TIMEOUT_MS = 12_000;

/** OBF caps `page_size` at 100; a dozen is a screenful without a wall of cards. */
const PAGE_SIZE = 12;

/**
 * One product, already cleaned up. Everything except `barcode` is nullable
 * because in OBF everything except the barcode genuinely can be missing.
 */
export type ObfProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  /** The ingredient list verbatim, before any parsing. */
  ingredientsText: string | null;
};

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/** OBF stores absent fields as `""` as often as it omits them. */
function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * `brands` is a comma-separated list, and the order is not meaningful:
 * "Nestlé, Cetaphil, Galderma" is one product from a corporate family tree.
 * The first entry is the closest thing to an answer, and showing three names
 * on a card helps nobody.
 */
function firstBrand(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return text(raw.split(',')[0]);
}

type RawProduct = Record<string, unknown>;

function toProduct(raw: RawProduct): ObfProduct | null {
  const barcode = text(raw.code);
  if (!barcode) return null;

  // English first where the contributor supplied it, then whatever they did.
  // `generic_name` is the fallback because plenty of records leave
  // `product_name` blank and describe the product there instead.
  const name =
    text(raw.product_name_en) ??
    text(raw.product_name) ??
    text(raw.generic_name_en) ??
    text(raw.generic_name);

  return {
    barcode,
    name,
    brand: firstBrand(raw.brands),
    ingredientsText: text(raw.ingredients_text_en) ?? text(raw.ingredients_text),
  };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/** Distinguishes "OBF says it has no such product" from "OBF did not answer". */
const NOT_FOUND = Symbol('obf-not-found');

async function getJson(
  url: string,
  // Only the barcode endpoint sets this. See `lookupBarcode` for why.
  options: { treat404AsMiss?: boolean } = {}
): Promise<unknown | typeof NOT_FOUND> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (options.treat404AsMiss && response.status === 404) return NOT_FOUND;
    if (!response.ok) {
      throw new AppError('load-failed', `open beauty facts responded ${response.status}`);
    }
    return (await response.json()) as unknown;
  } catch (caught) {
    if (caught instanceof AppError) throw caught;
    // A timeout abort and a dead connection are the same thing to the user: we
    // could not reach OBF. `load-failed` already reads "check your connection
    // and try again", which is the right sentence, so no new error code —
    // `AppErrorCode` stays short on purpose.
    throw new AppError('load-failed', caught instanceof Error ? caught.message : String(caught));
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Digits only, 8–14 long — EAN-8 through GTIN-14, which covers retail barcodes. */
export function isBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value.trim());
}

/**
 * Looks up one product by barcode.
 *
 * Returns `null` for "no such product", which is an ordinary outcome and not
 * an error: OBF's cosmetics coverage is patchy and a miss should offer manual
 * entry, not a red box. Only transport failures throw.
 */
export async function lookupBarcode(barcode: string): Promise<ObfProduct | null> {
  const code = barcode.trim();

  // OBF signals "no such product" in TWO different ways, and both have to be
  // read as a miss or the screen accuses the network of a fault OBF does not
  // have:
  //
  //   HTTP 200 + `{"status": 0}`  — e.g. 0000000000000
  //   HTTP 404                    — e.g. 9999999999994
  //
  // Which one you get depends on how far the barcode gets through OBF's own
  // validation, so neither the status code nor the body is sufficient alone.
  const body = await getJson(
    `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    { treat404AsMiss: true }
  );
  if (body === NOT_FOUND) return null;

  const parsed = body as { status?: number; product?: RawProduct } | null;
  if (!parsed || parsed.status === 0 || !parsed.product) return null;
  return toProduct(parsed.product);
}

/**
 * Free-text search by product or brand name.
 *
 * Results with no name at all are dropped: OBF has plenty of barcode-only
 * stubs contributed by a scan that was never completed, and a card reading
 * "(no name)" is not a result the user can act on.
 */
export async function searchByName(query: string): Promise<ObfProduct[]> {
  const term = query.trim();
  if (term.length === 0) return [];

  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(term)}` +
    `&search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}&fields=${FIELDS}`;

  const body = (await getJson(url)) as { products?: RawProduct[] } | null;
  const products = Array.isArray(body?.products) ? body.products : [];

  return products
    .map(toProduct)
    .filter((product): product is ObfProduct => product !== null && product.name !== null);
}

/**
 * One entry point for the search box, so the screen does not have to ask the
 * user which kind of thing they typed. A run of digits is a barcode; anything
 * else is a name.
 */
export async function findProducts(query: string): Promise<ObfProduct[]> {
  const term = query.trim();
  if (isBarcode(term)) {
    const hit = await lookupBarcode(term);
    return hit ? [hit] : [];
  }
  return searchByName(term);
}

/**
 * Shown wherever OBF data is displayed. Required by the ODbL.
 *
 * No longer credits photos — we stopped rendering them, and claiming to use
 * something we do not is its own kind of inaccurate attribution.
 */
export const OBF_ATTRIBUTION = 'Data: Open Beauty Facts (ODbL)';
