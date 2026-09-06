/**
 * Turns `assets/dewly_pattern.svg` into the string module the app imports.
 *
 * Two reasons this is a build step rather than a direct import:
 *
 *  - Metro has no transformer for reading an `.svg` as TEXT. Adding
 *    `react-native-svg-transformer` plus a `metro.config.js` would be a second
 *    dependency and a build-config file to maintain, for one asset.
 *  - The source file carries a C2PA provenance manifest in `<metadata>` that
 *    is 42% of its bytes (7.7KB of 18.7KB) and is not drawing instructions.
 *    Shipping it to every client would be dead weight.
 *
 * Cleaning here rather than on disk keeps the exported asset as the untouched
 * source of truth — a re-export from the design tool would put the C2PA data
 * straight back, and this step removes it every time instead of relying on
 * someone remembering to hand-edit the file again.
 *
 * Run after editing the SVG:  bun run build:pattern
 */

const SOURCE = 'assets/dewly_pattern.svg';
const OUTPUT = 'components/dewly-pattern.ts';

/**
 * The one namespace prefix SVG itself uses (`xlink:href`). Everything else —
 * `xmlns:c2pa`, an editor's `xmlns:inkscape`, `xmlns:sodipodi` — is metadata
 * that survives into the render.
 */
const KEPT_PREFIX = 'xlink';

const svg = await Bun.file(SOURCE).text();

const stripped = svg
  .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
  // Namespace DECLARATIONS: `xmlns:c2pa="…"`. The bare `xmlns="…"` has no
  // colon and is left alone — React accepts it on an <svg>.
  .replace(/\s+xmlns:(?!xlink=)[\w.-]+\s*=\s*"[^"]*"/g, '')
  // Namespaced ATTRIBUTES: `c2pa:foo="…"`. None today, but the same export
  // path that produced `xmlns:c2pa` can produce these.
  .replace(
    new RegExp(`\\s+(?!${KEPT_PREFIX}:)[A-Za-z_][\\w.-]*:[\\w.-]+\\s*=\\s*"[^"]*"`, 'g'),
    ''
  );

if (!stripped.includes('<svg') || !stripped.includes('viewBox')) {
  throw new Error(`${SOURCE} is not an SVG with a viewBox`);
}
if (stripped.includes('<metadata>')) {
  throw new Error('metadata survived the strip');
}
/**
 * The guard for the bug this cleanup exists to fix.
 *
 * `react-native-svg` forwards every attribute it parses to the DOM on web, so
 * a leftover `xmlns:c2pa` reached React as an `xmlnsC2pa` prop and logged
 * "React does not recognize the `xmlnsC2pa` prop on a DOM element" on every
 * mount. Failing the build is better than shipping a warning nobody reads.
 */
const leftover = stripped.match(
  new RegExp(`\\s(?!${KEPT_PREFIX}:)[A-Za-z_][\\w.-]*:[\\w.-]+\\s*=`, 'g')
);
if (leftover) {
  throw new Error(`namespaced attributes survived the strip: ${leftover.join(', ')}`);
}

const module = `/**
 * GENERATED — do not edit. Run \`bun run build:pattern\` instead.
 *
 * Source: ${SOURCE} (C2PA \`<metadata>\` stripped; see scripts/build-pattern.ts).
 */

export const DEWLY_PATTERN_XML = ${JSON.stringify(stripped)};
`;

await Bun.write(OUTPUT, module);
console.log(`${OUTPUT}: ${svg.length} -> ${stripped.length} bytes`);
