import { rng, seedFrom } from './rng';
import { Pt, sketchArrowHead, sketchRect, smoothPath, wobble } from './sketch';

/**
 * A distributed system, drawn rather than rendered.
 *
 * Deliberately vendor-neutral: every box is a primitive — gateway, service,
 * cache, store, queue, worker — rather than a product, because the shape is
 * what carries over between stacks and the product names are what date. It is
 * a real diagram, so it gets a role and a description rather than being hidden
 * as decoration.
 *
 * The three paths through it are the point. A read goes client → gateway →
 * service → cache. A write goes service → store. Anything that can wait goes
 * service → queue → worker → store, off the request path entirely. Most of what
 * makes these systems hard lives in the arrows rather than the boxes.
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

const W = 620;
const H = 380;

export function systemSketch(seed = 'distributed'): SystemSketch {
  const rand = rng(seedFrom(seed));

  const boxes = [
    { x: 6, y: 164, w: 96, h: 48, label: 'Client' },
    { x: 140, y: 164, w: 104, h: 48, label: 'Gateway' },
    { x: 284, y: 164, w: 110, h: 48, label: 'Service' },
    { x: 452, y: 54, w: 104, h: 48, label: 'Cache' },
    { x: 452, y: 164, w: 104, h: 48, label: 'Store' },
    { x: 284, y: 290, w: 110, h: 48, label: 'Queue' },
    { x: 452, y: 290, w: 104, h: 48, label: 'Worker' },
  ];

  const strokes: string[] = [];
  const labels: SketchLabel[] = [];

  // A second outline behind the service, offset the way a stack of paper is.
  // It says "more than one of these" without a label and without drawing three
  // boxes that would each need their own arrows.
  strokes.push(...sketchRect(298, 152, 110, 48, rand, 1));

  for (const box of boxes) {
    strokes.push(...sketchRect(box.x, box.y, box.w, box.h, rand, 1.1));
    labels.push({ text: box.label, x: box.x + box.w / 2, y: box.y + box.h / 2 + 5 });
  }

  // A short connector takes less wobble than a long one: the same amount of
  // wander over 34px reads as a shaky hand rather than a steady one moving fast.
  strokes.push(...arrow({ x: 102, y: 188 }, { x: 136, y: 188 }, { x: 119, y: 185 }, rand, 0.5));
  strokes.push(...arrow({ x: 244, y: 188 }, { x: 280, y: 188 }, { x: 262, y: 185 }, rand, 0.5));

  // Read path, up to the cache. Both of these leave from clear of the stacked
  // outline behind the service, or they read as starting from the wrong box.
  strokes.push(...arrow({ x: 412, y: 176 }, { x: 448, y: 90 }, { x: 437, y: 150 }, rand));
  // Write path, straight across to the store.
  strokes.push(...arrow({ x: 412, y: 196 }, { x: 448, y: 194 }, { x: 430, y: 192 }, rand, 0.6));
  // Everything that can wait, down onto the queue and back around.
  strokes.push(...arrow({ x: 339, y: 216 }, { x: 339, y: 286 }, { x: 350, y: 251 }, rand));
  strokes.push(...arrow({ x: 398, y: 314 }, { x: 448, y: 314 }, { x: 423, y: 311 }, rand, 0.6));
  strokes.push(...arrow({ x: 506, y: 286 }, { x: 506, y: 216 }, { x: 524, y: 251 }, rand));

  // Two asides, no more. Each hangs off an edge rather than sitting on a point,
  // and each sits in space no stroke passes through.
  labels.push({ text: 'n replicas', x: 284, y: 141, aside: true, anchor: 'start' });
  labels.push({ text: 'off the request path', x: 398, y: 362, aside: true, anchor: 'start' });

  return {
    width: W,
    height: H,
    strokes,
    labels,
    description:
      'A hand-drawn diagram of a distributed system: a client calls a gateway, which routes to a stateless service running as several replicas. The service reads through a cache, writes to a store, and publishes work to a queue that a worker consumes and writes back to the store, off the request path.',
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
