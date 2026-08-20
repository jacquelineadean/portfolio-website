import { rng, seedFrom } from './rng';
import { Pt, sketchArrowHead, sketchLine, sketchRect, smoothPath, wobble } from './sketch';

/**
 * A boxes-and-arrows diagram, drawn rather than rendered.
 *
 * The subject is the one this site is actually about: putting a facade in front
 * of a legacy core so traffic can be moved onto new services a slice at a time,
 * with the old path still standing until the new one is proven. It is a real
 * diagram, so it gets a label and a role rather than being hidden as decoration.
 */

export interface SketchLabel {
  text: string;
  x: number;
  y: number;
  /** Set on the annotations, which are smaller and set in the margin voice. */
  aside?: boolean;
  /** Box labels centre in their box; the asides hang off a specific edge. */
  anchor?: 'start' | 'middle' | 'end';
}

export interface SystemSketch {
  width: number;
  height: number;
  /** Box outlines and connectors, in draw order. */
  strokes: string[];
  /** Drawn after the strokes so a connector never crosses a word. */
  labels: SketchLabel[];
  description: string;
}

// Wider than the drawing strictly needs. The migration note has to sit in clear
// space between the fan-out arrows and the arrow it annotates, and at 560 there
// was no such gap — the note ran back across both arrows to find room.
const W = 640;
const H = 300;

export function systemSketch(seed = 'strangler'): SystemSketch {
  const rand = rng(seedFrom(seed));

  const boxes = [
    { x: 10, y: 120, w: 104, h: 52, label: 'Clients' },
    { x: 170, y: 120, w: 112, h: 52, label: 'Facade' },
    { x: 430, y: 26, w: 150, h: 56, label: 'Legacy core' },
    { x: 430, y: 212, w: 150, h: 56, label: 'New service' },
  ];

  const strokes: string[] = [];
  const labels: SketchLabel[] = [];

  for (const box of boxes) {
    strokes.push(...sketchRect(box.x, box.y, box.w, box.h, rand, 1.1));
    labels.push({ text: box.label, x: box.x + box.w / 2, y: box.y + box.h / 2 + 5 });
  }

  // A short connector takes less wobble than a long one: the same amount of
  // wander over 46px reads as a shaky hand rather than a steady one moving fast.
  strokes.push(...arrow({ x: 118, y: 146 }, { x: 164, y: 146 }, { x: 141, y: 143 }, rand, 0.5));
  strokes.push(...arrow({ x: 286, y: 136 }, { x: 424, y: 62 }, { x: 350, y: 120 }, rand));
  strokes.push(...arrow({ x: 286, y: 156 }, { x: 424, y: 234 }, { x: 350, y: 172 }, rand));

  // The migration itself: one route at a time moves off the old path. Drawn down
  // the outside of both boxes rather than between them, which leaves the middle
  // of the frame clear for the note that explains it.
  strokes.push(...arrow({ x: 592, y: 88 }, { x: 592, y: 206 }, { x: 624, y: 147 }, rand, 1.5, 12));

  // Both asides hang off an edge rather than sitting on a point. The migration
  // note is right-aligned against the arrow it belongs to, in the gap between
  // the two boxes on the right — set any further left it runs back across the
  // fan-out arrows, which is where it started.
  labels.push({ text: 'one route at a time', x: 575, y: 152, aside: true, anchor: 'end' });
  labels.push({ text: 'still serving', x: 430, y: 18, aside: true, anchor: 'start' });

  return {
    width: W,
    height: H,
    strokes,
    labels,
    description:
      'A hand-drawn diagram: clients call a facade, which routes to either the legacy core or a new service, with routes moved from the legacy core to the new service one at a time while the old path keeps serving.',
  };
}

/** A curved connector with a head, drawn through a single control point. */
function arrow(
  from: Pt,
  to: Pt,
  control: Pt,
  rand: () => number,
  amount = 1.1,
  head = 10,
): string[] {
  const points: Pt[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    points.push({
      x: inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x,
      y: inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y,
    });
  }
  const wobbled = wobble(points, rand, amount);
  wobbled[0] = points[0];
  wobbled[steps] = points[steps];
  return [smoothPath(wobbled), ...sketchArrowHead(to, points[steps - 2], rand, head, 0.7)];
}

/** Re-exported so the component can draw a rule under a heading in the same hand. */
export function sketchRule(width: number, seed: string): string {
  const rand = rng(seedFrom(seed));
  return sketchLine({ x: 0, y: 4 }, { x: width, y: 4 }, rand, 1.3);
}
