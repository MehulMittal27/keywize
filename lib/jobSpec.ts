/**
 * Keeps maxPrice inside [idealPrice, idealPrice * 100]. A budget below the
 * ideal price makes no sense (nothing to negotiate down to), and an
 * unbounded ceiling defeats the point of a "hard maximum".
 */
export function clampMaxPrice(idealPrice: number, maxPrice: number): number {
  const min = idealPrice;
  const max = idealPrice * 100;
  return Math.min(Math.max(maxPrice, min), max);
}
