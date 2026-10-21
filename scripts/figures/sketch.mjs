/**
 * The site's hand-drawn line, for drawings that leave the Angular app.
 *
 * A port of src/app/shared/art/rng.ts and sketch.ts: the same seeded random
 * source, the same wobble and the same corner overshoot, so a box drawn here
 * matches the boxes the labs draw at runtime.
 */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const between = (rand, min, max) => min + rand() * (max - min);
const round = (n) => Math.round(n * 100) / 100;

export function smoothPath(points, close = false) {
  if (points.length < 2) return '';
  const pts = close ? [points[points.length - 1], ...points, points[0], points[1]] : points;
  const first = close ? points[0] : pts[0];
  let d = `M${round(first.x)} ${round(first.y)}`;
  const start = close ? 1 : 0;
  const end = close ? pts.length - 2 : pts.length - 1;
  for (let i = start; i < end; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${round(c1x)} ${round(c1y)},${round(c2x)} ${round(c2y)},${round(p2.x)} ${round(p2.y)}`;
  }
  return close ? `${d}Z` : d;
}

export function wobble(points, rand, amount) {
  return points.map((p) => ({
    x: p.x + between(rand, -amount, amount),
    y: p.y + between(rand, -amount, amount),
  }));
}

export function sketchLine(a, b, rand, amount = 1.1, overshoot = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const from = { x: a.x - ux * overshoot * rand(), y: a.y - uy * overshoot * rand() };
  const to = { x: b.x + ux * overshoot * rand(), y: b.y + uy * overshoot * rand() };
  const steps = Math.max(2, Math.round(len / 22));
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  const wobbled = wobble(points, rand, amount);
  wobbled[0] = points[0];
  wobbled[wobbled.length - 1] = points[points.length - 1];
  return smoothPath(wobbled);
}

export function sketchRect(x, y, w, h, rand, amount = 1) {
  const tl = { x, y };
  const tr = { x: x + w, y };
  const br = { x: x + w, y: y + h };
  const bl = { x, y: y + h };
  const over = Math.min(w, h) * 0.06 + 2;
  return [
    sketchLine(tl, tr, rand, amount, over),
    sketchLine(tr, br, rand, amount, over),
    sketchLine(br, bl, rand, amount, over),
    sketchLine(bl, tl, rand, amount, over),
  ];
}

export function sketchArrowHead(tip, tail, rand, size = 9, amount = 0.7) {
  const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
  const spread = 0.42;
  return [-spread, spread].map((offset) =>
    sketchLine(
      tip,
      {
        x: tip.x - Math.cos(angle + offset) * size,
        y: tip.y - Math.sin(angle + offset) * size,
      },
      rand,
      amount,
    ),
  );
}

/** A wobbly line through several points, for curved arrows and chart marks. */
export function sketchCurve(points, rand, amount = 1) {
  return smoothPath(
    wobble(points, rand, amount).map((p, i, all) =>
      i === 0 || i === all.length - 1 ? points[i] : p,
    ),
  );
}
