/**
 * Deterministic randomness for the generated artwork.
 *
 * Every drawing on this site is procedural, and every one of them has to come
 * out identical on the server, on the client, and on the next change-detection
 * pass — otherwise the prerendered SVG and the hydrated one disagree, and the
 * artwork visibly reshuffles the first time Angular re-renders it. So there is
 * no Math.random anywhere in `art/`: a drawing is a pure function of its seed.
 */

/** mulberry32 — small, fast, and good enough for scattering rectangles. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so a slug can be used directly as a seed. */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Uniform in [min, max). */
export function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}
