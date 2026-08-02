/** A plain 2D point, pixel-space or feature-space depending on context. */
export type Vec2 = [number, number];

/**
 * Straight port of main.py's euclidean(): Euclidean distance between two
 * equal-length flat vectors (used both for 40-dim pose feature vectors and
 * plain 2D points).
 */
export function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
