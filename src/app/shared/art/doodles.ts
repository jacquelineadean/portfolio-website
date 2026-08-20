import { rng, seedFrom } from './rng';
import { sketchArc, sketchArrowHead } from './sketch';

/**
 * The hand-drawn marks that sit around the type.
 *
 * They carry no information — they are the pencil in the margin, the thing that
 * says a person was working here. Four of them, because a page needs a small
 * vocabulary of marks rather than one mark used everywhere, and each is drawn
 * from its own seed so two `sweep`s on the same page are not the same line
 * twice.
 */
export type DoodleShape = 'sweep' | 'hook' | 'corner' | 'loop';

export interface Doodle {
  width: number;
  height: number;
  paths: string[];
}

const SIZE = { width: 200, height: 120 };

export function doodle(shape: DoodleShape, seed: string): Doodle {
  const rand = rng(seedFrom(`${shape}:${seed}`));
  return { ...SIZE, paths: strokes(shape, rand) };
}

function strokes(shape: DoodleShape, rand: () => number): string[] {
  switch (shape) {
    // A long shallow curve, the kind drawn in one pass with the wrist rather
    // than the fingers, so it is flatter and steadier than the rest.
    case 'sweep':
      return [sketchArc(100, 210, 180, -2.35, -0.79, rand, 1.6)];

    // The same curve with a tick at the leading end — a mark that points at
    // whatever it has been placed beside.
    case 'hook': {
      const arc = sketchArc(96, 195, 165, -2.5, -1.05, rand, 1.5);
      const tip = { x: 96 + Math.cos(-2.5) * 165, y: 195 + Math.sin(-2.5) * 165 };
      const behind = { x: 96 + Math.cos(-2.36) * 165, y: 195 + Math.sin(-2.36) * 165 };
      return [arc, ...sketchArrowHead(tip, behind, rand, 13, 0.8)];
    }

    // Anchored off-canvas so only the bend of it shows, the way a compass arc
    // runs off the edge of the page.
    case 'corner':
      return [sketchArc(-30, 165, 150, -1.35, -0.12, rand, 1.5)];

    // Drops from above and turns back on itself, ending in an arrow. This is
    // the one that gets placed where something needs pointing out.
    case 'loop':
    default: {
      const arc = sketchArc(120, 40, 88, 2.55, 4.9, rand, 1.5);
      const tip = { x: 120 + Math.cos(2.55) * 88, y: 40 + Math.sin(2.55) * 88 };
      const behind = { x: 120 + Math.cos(2.34) * 88, y: 40 + Math.sin(2.34) * 88 };
      return [arc, ...sketchArrowHead(tip, behind, rand, 14, 0.8)];
    }
  }
}
