import { between } from './rng';

/**
 * Hand-drawn geometry.
 *
 * The reference for this is a pencil line: it never lands exactly on the ideal
 * path, it wanders off it by a fraction of a millimetre and back, and a drawn
 * shape usually overshoots at its corners because the hand keeps moving after
 * the stroke should have stopped. Both are reproduced here rather than faked
 * with a filter, because a filter distorts the line's ends and the ends are
 * where the drawn quality actually reads.
 *
 * Everything returns an SVG path `d` string, and everything takes the random
 * source as an argument so a caller can decide what is stable between renders.
 */

export interface Pt {
  x: number;
  y: number;
}

/**
 * A Catmull-Rom spline through `points`, emitted as cubic Béziers.
 *
 * The wobble is applied to the sample points and the curve is drawn through
 * them; smoothing after the fact is what turns per-point noise into something
 * that reads as one continuous unsteady line rather than as static.
 */
export function smoothPath(points: Pt[], close = false): string {
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

/** Nudge every point off the ideal path by up to `amount`. */
export function wobble(points: Pt[], rand: () => number, amount: number): Pt[] {
  return points.map((p) => ({
    x: p.x + between(rand, -amount, amount),
    y: p.y + between(rand, -amount, amount),
  }));
}

/**
 * A drawn straight line. `overshoot` runs the stroke past both ends, which is
 * what stops a sketched box from looking like a CSS border.
 */
export function sketchLine(a: Pt, b: Pt, rand: () => number, amount = 1.1, overshoot = 0): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const from = { x: a.x - ux * overshoot * rand(), y: a.y - uy * overshoot * rand() };
  const to = { x: b.x + ux * overshoot * rand(), y: b.y + uy * overshoot * rand() };

  const steps = Math.max(2, Math.round(len / 22));
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  // The ends stay put: a drawn line wanders in the middle, not at the point
  // where the pencil was placed or lifted.
  const wobbled = wobble(points, rand, amount);
  wobbled[0] = points[0];
  wobbled[wobbled.length - 1] = points[points.length - 1];
  return smoothPath(wobbled);
}

/** A drawn box: four independent strokes, each overshooting its corner. */
export function sketchRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rand: () => number,
  amount = 1,
): string[] {
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

/** A drawn arc, `from`/`to` in radians. */
export function sketchArc(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  rand: () => number,
  amount = 1.4,
): string {
  const span = Math.abs(to - from);
  const steps = Math.max(6, Math.round((span * radius) / 18));
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = from + ((to - from) * i) / steps;
    // Radius drifts along the sweep as well as position, so the curve is not a
    // perfect circle wearing noise.
    const r = radius + between(rand, -amount, amount) * 1.6;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return smoothPath(wobble(points, rand, amount * 0.4));
}

/** A drawn arrow head at `tip`, opening back along the direction from `tail`. */
export function sketchArrowHead(
  tip: Pt,
  tail: Pt,
  rand: () => number,
  size = 9,
  amount = 0.7,
): string[] {
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

/** A closed blob — a circle whose radius wanders. Used for hazard contours. */
export function blob(
  cx: number,
  cy: number,
  radius: number,
  rand: () => number,
  lobes = 9,
  variance = 0.28,
): { path: string; polygon: Pt[] } {
  const points: Pt[] = [];
  for (let i = 0; i < lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2;
    const r = radius * (1 + between(rand, -variance, variance));
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.72 });
  }
  return { path: smoothPath(points, true), polygon: densify(points) };
}

/**
 * The hit-test polygon is sampled off the same control points rather than off
 * the rendered curve. A Catmull-Rom spline bulges outside its control polygon,
 * so testing against the raw points would call footprints outside the drawn
 * contour "inside" it; interpolating between them is close enough to the curve
 * that the highlight lands where the line is.
 */
function densify(points: Pt[], per = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Ray casting. */
export function inside(point: Pt, polygon: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      hit = !hit;
    }
  }
  return hit;
}

/** Two decimal places — the paths are inlined into the bundle. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
