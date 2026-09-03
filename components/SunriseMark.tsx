import { StyleSheet, View } from 'react-native';
import { radius } from '../theme';

/**
 * Dewly's brand mark: a half-disc sun on a horizon, with seven rays.
 *
 * Redrawn from `assets/dewly_symbol.svg` in Views rather than imported, because
 * the app has no SVG renderer. That also lets each layer take its own opacity,
 * which is what makes it work as a faint background motif as well as a logo.
 *
 * Extracted from the home hero once the desktop sidebar needed the same mark —
 * two hand-built copies of a seven-ray sun would drift apart on the first tweak.
 *
 * Everything scales from `size`, which is the sun's RADIUS, so a call site
 * picks one number. Rays orbit outside that radius, so the drawn area is
 * roughly `size * 3` wide — see `width`/`height` below.
 */
export type SunriseMarkProps = {
  /** Radius of the half-disc. The mark's full width is about 3x this. */
  size?: number;
  color: string;
  /** Per-layer opacity. Defaults suit a faint motif; pass 1s for a logo. */
  discOpacity?: number;
  rayOpacity?: number;
  horizonOpacity?: number;
  /** Extends the horizon past the rays, so it can run off a card's edge. */
  horizonExtends?: boolean;
};

/** Degrees from vertical, matching the seven rays in the source SVG. */
const RAY_ANGLES = [-72, -48, -24, 0, 24, 48, 72] as const;

export function SunriseMark({
  size = 30,
  color,
  discOpacity = 0.16,
  rayOpacity = 0.3,
  horizonOpacity = 0.22,
  horizonExtends = true,
}: SunriseMarkProps) {
  const orbit = size * 1.53;
  const rayLength = size * 0.43;
  const rayWidth = Math.max(1.5, size * 0.083);
  const width = horizonExtends ? size * 6 : orbit * 2;
  const height = orbit + size * 0.5;

  return (
    <View style={{ width, height }} pointerEvents="none">
      <View
        style={[
          styles.horizon,
          { bottom: size * 0.5, backgroundColor: color, opacity: horizonOpacity },
        ]}
      />

      {/* Square centred on the sun's centre, so every ray orbits one point. */}
      <View
        style={{
          position: 'absolute',
          left: width / 2 - orbit,
          bottom: size * 0.5 - orbit,
          width: orbit * 2,
          height: orbit * 2,
        }}
      >
        {RAY_ANGLES.map((angle) => (
          <View
            key={angle}
            style={[
              styles.ray,
              {
                left: orbit - rayWidth / 2,
                top: orbit - rayLength / 2,
                width: rayWidth,
                height: rayLength,
                backgroundColor: color,
                opacity: rayOpacity,
                // Rotate first, then push along the rotated axis.
                transform: [{ rotate: `${angle}deg` }, { translateY: -orbit }],
              },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.disc,
          {
            left: width / 2 - size,
            bottom: size * 0.5,
            width: size * 2,
            height: size,
            borderTopLeftRadius: size,
            borderTopRightRadius: size,
            backgroundColor: color,
            opacity: discOpacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    borderRadius: radius.pill,
  },
  ray: { position: 'absolute', borderRadius: radius.pill },
  disc: { position: 'absolute' },
});
