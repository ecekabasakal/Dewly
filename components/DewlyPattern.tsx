import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { DEWLY_PATTERN_XML } from './dewly-pattern';

/**
 * The sidebar's backdrop: 36 mint line-art doodles — bottles, droppers, jars,
 * tubes, pumps, drops, leaves, sprigs — scattered at 8-16% opacity on the deep
 * green ground.
 *
 * ## Why `react-native-svg` rather than Views
 *
 * `SunriseMark` is hand-built from Views because it is three primitives: a
 * half-disc, seven rays and a horizon line. This is a different problem — 36
 * groups of arcs and bezier paths — and rebuilding it in Views would be
 * hundreds of lines that only approximate the approved artwork. So the asset
 * is rendered as the vector it is, through `react-native-svg`, which is in
 * Expo's bundled native modules (installed at the SDK-pinned 15.15.4) and has
 * a real web implementation, so one code path serves both targets.
 *
 * The XML arrives as a string from `dewly-pattern.ts` rather than an import of
 * the `.svg`, because Metro has no text transformer for SVG — see
 * `scripts/build-pattern.ts` for that trade and for the C2PA metadata strip.
 *
 * ## Layering
 *
 * Absolutely filled and mounted as the FIRST child of the rail, so every
 * sibling paints over it — on native by child order, on web because
 * react-native-web gives every View `position: relative`, which makes the
 * siblings positioned elements that paint after this one in DOM order. No
 * `zIndex` anywhere: a negative one would drop the pattern behind the rail's
 * own background colour and hide it completely.
 *
 * `pointerEvents="none"` so nothing here can swallow a tap meant for a nav row
 * or the ingredient card.
 *
 * ## Fit
 *
 * `xMidYMid slice` is `background-size: cover` — the artwork scales until it
 * covers the rail and the overflow is cropped, so there is no tiling seam and
 * no band of bare green at the bottom of a tall window. The viewBox is
 * 250x760 against a 248pt-wide rail, so the crop is horizontal: at a 900pt
 * window the pattern draws 296pt wide and loses 24pt off each side, which
 * costs nothing because the doodles are scattered rather than composed — no
 * motif is the subject. A very tall window (1400+) enlarges them by about 1.9x,
 * the one visible cost of `slice` over a seam.
 *
 * `memo` because the rail re-renders on every navigation and the XML is parsed
 * on each render otherwise.
 */
export const DewlyPattern = memo(function DewlyPattern() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SvgXml
        xml={DEWLY_PATTERN_XML}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
      />
    </View>
  );
});
