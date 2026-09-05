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
 * Run after editing the SVG:  bun run build:pattern
 */

const SOURCE = 'assets/dewly_pattern.svg';
const OUTPUT = 'components/dewly-pattern.ts';

const svg = await Bun.file(SOURCE).text();
const stripped = svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, '');

if (!stripped.includes('<svg') || !stripped.includes('viewBox')) {
  throw new Error(`${SOURCE} is not an SVG with a viewBox`);
}
if (stripped.includes('<metadata>')) {
  throw new Error('metadata survived the strip');
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
