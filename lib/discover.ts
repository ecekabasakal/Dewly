import discoverFile from '../data/discover.json';
import ingredientsFile from '../data/ingredients.json';
import { pick, type Language } from './language';

/**
 * The Discover feed's data layer.
 *
 * ## Why the editorial fields are NOT database columns
 *
 * The eight trending ingredients themselves ARE in the database — they went
 * into `data/ingredients.json` and seed like every other row, because their
 * name, category, description and `targets_concerns` are facts the analysis
 * engine reads.
 *
 * The trend note, the evidence grade and the sources are a different kind of
 * thing: curation. They change when an editor changes their mind, not when the
 * molecule does. Putting them in `ingredients` would mean four columns that are
 * NULL for 116 of 124 rows, a boolean that cannot express editorial ORDER, and
 * a schema migration every time the framing is reworded.
 *
 * So they live in `data/discover.json`, bundled — the same pattern this app
 * already uses for `conflict_rules.json`, `timing_rules.json` and
 * `ingredient_aliases.json`, all of which are curation resolved offline. The
 * upshot: the feed renders instantly, works offline, keeps its hand-picked
 * order, and needs no SQL at all.
 */

/**
 * How much is actually known about an ingredient's effect.
 *
 * The honesty mechanism of this feature. Several of 2026's loudest ingredients
 * are genuinely unsettled, and a feed that showed them with the same confidence
 * as glycerin would be marketing. The grade is rendered on every card and is
 * never collapsed or hidden.
 */
export const EVIDENCE_LEVELS = ['established', 'emerging', 'evolving'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type DiscoverSource = {
  label_en: string;
  label_tr: string;
  url: string;
};

/** One trending ingredient, editorial fields joined to its database row. */
export type TrendingIngredient = {
  inciName: string;
  /** From `data/ingredients.json` — what the ingredient actually is. */
  commonName: string | null;
  trendNote: string;
  evidence: EvidenceLevel;
  source: DiscoverSource | null;
};

/** A curated search that Open Beauty Facts actually has products for. */
export type BrandTheme = {
  id: string;
  query: string;
  label: string;
};

type RawTrending = {
  inci_name: string;
  trend_note_en: string;
  trend_note_tr: string;
  evidence: string;
  sources: DiscoverSource[];
};

type RawTheme = { id: string; query: string; label_en: string; label_tr: string };

const RAW_TRENDING = (discoverFile as { trending: RawTrending[] }).trending;
const RAW_THEMES = (discoverFile as { brand_themes: RawTheme[] }).brand_themes;

const COMMON_NAMES = new Map(
  (ingredientsFile as { inci_name: string; common_name: string | null }[]).map((row) => [
    row.inci_name,
    row.common_name,
  ])
);

function isEvidenceLevel(value: string): value is EvidenceLevel {
  return (EVIDENCE_LEVELS as readonly string[]).includes(value);
}

/**
 * The trending feed, in editorial order.
 *
 * An entry naming an ingredient that is not in the database is dropped rather
 * than rendered: tapping a card runs an analysis of that name, and a card that
 * leads to "nothing recognized" is worse than one that is absent. That can only
 * happen if the two files fall out of step, which is exactly what the test
 * covering this asserts against.
 */
export function trendingIngredients(language: Language): TrendingIngredient[] {
  return RAW_TRENDING.filter((row) => COMMON_NAMES.has(row.inci_name)).map((row) => ({
    inciName: row.inci_name,
    commonName: COMMON_NAMES.get(row.inci_name) ?? null,
    trendNote: pick(language, row.trend_note_en, row.trend_note_tr),
    evidence: isEvidenceLevel(row.evidence) ? row.evidence : 'evolving',
    source: row.sources[0] ?? null,
  }));
}

/**
 * Which brand theme to show today.
 *
 * Rotated by date rather than randomised per render: a feed that reshuffles
 * every time React re-renders is disorienting, and one that never changes stops
 * being a feed. Deterministic from the date, so it is testable and stable for
 * the whole day.
 */
export function brandThemeFor(language: Language, date: Date = new Date()): BrandTheme {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  const raw = RAW_THEMES[Math.abs(dayNumber) % RAW_THEMES.length]!;
  return {
    id: raw.id,
    query: raw.query,
    label: pick(language, raw.label_en, raw.label_tr),
  };
}

/** How many OBF products the brand card shows. Enough to browse, not a catalogue. */
export const BRAND_RESULT_COUNT = 3;

export function sourceLabel(source: DiscoverSource, language: Language): string {
  return pick(language, source.label_en, source.label_tr);
}
