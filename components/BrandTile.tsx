import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { fitFontSize, MAX_LINES, tilePadding } from '../lib/tile-fit';
import { colors, fonts, radius } from '../theme';

export type BrandTileProps = {
  /** Preferred label. Falls back to `name`, then to a neutral icon. */
  brand?: string | null;
  /** The product name, used when there is no brand — manual adds, mostly. */
  name?: string | null;
  /** Square edge length in points. */
  size?: number;
};

/**
 * The one visual stand-in for a product, everywhere a product is listed.
 *
 * Replaces the Open Beauty Facts photo path. Third-party product photography
 * is wildly inconsistent — different backgrounds, crops, lighting and aspect
 * ratios, and missing entirely for a good share of OBF records — so a shelf
 * built from it looked like a scrapbook, and the no-photo case was visibly a
 * hole rather than a design. A typographic tile is the same object every time,
 * needs no network, cannot 404, and works offline.
 *
 * Falls back brand -> name -> icon, so a manually added product with no brand
 * still gets a real label rather than an anonymous square.
 *
 * Uses `RNText` directly instead of the app's `Text`: the type scale's job is
 * to stop call sites inventing sizes, and this is the one place that has to
 * compute one. See `lib/tile-fit.ts` for how.
 */
export function BrandTile({ brand, name, size = 64 }: BrandTileProps) {
  const label = brand?.trim() || name?.trim() || '';
  const box = {
    width: size,
    height: size,
    borderRadius: radius.md,
    // Same source as the fit calculation, so the two cannot drift apart.
    padding: tilePadding(size),
  };

  if (!label) {
    return (
      <View style={[styles.tile, box]} accessible={false}>
        <Feather name="droplet" size={Math.round(size * 0.34)} color={colors.tile.ink} />
      </View>
    );
  }

  const fontSize = fitFontSize(label, size);

  return (
    <View style={[styles.tile, box]}>
      <RNText
        numberOfLines={MAX_LINES}
        ellipsizeMode="tail"
        style={[styles.label, { fontSize, lineHeight: Math.round(fontSize * 1.15) }]}
        // The brand is repeated in the card text beside every tile, so
        // announcing it twice only slows a screen reader down.
        accessible={false}
        importantForAccessibility="no"
      >
        {label}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tile.bg,
    borderWidth: 1,
    borderColor: colors.tile.border,
    // Tiles sit next to text that must not shift when a long name wraps.
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.headingSemi,
    color: colors.tile.ink,
    textAlign: 'center',
  },
});
