/** 4pt spacing scale — every padding/margin/gap in the app comes from here. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/**
 * Generous, soft corners to match the rounded caps in the logo.
 *
 * `card` / `cardLg` / `hero` are the three CARD steps, and they are what new
 * surfaces should reach for. The bare t-shirt sizes stay for everything that is
 * not a card — inputs, tiles, badges — so the two uses never fight over one
 * number. Ordered by value so the scale still reads as a ramp.
 */
export const radius = {
  sm: 8,
  md: 12,
  /** Standard content card: metric tiles, routine steps, list rows. */
  card: 14,
  lg: 16,
  /** Grouped or emphasised card. */
  cardLg: 18,
  xl: 24,
  /** Hero and feature cards — the softest corner in the app. */
  hero: 26,
  pill: 999,
} as const;
