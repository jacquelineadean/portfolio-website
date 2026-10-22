/**
 * The shared pieces of the glyph specimens: a grid of character cells, the
 * tones they are drawn in, and the density ramp.
 */

/** One character per cell, row-major. An empty string leaves the cell blank. */
export interface GlyphGrid {
  cols: number;
  rows: number;
  char: string[];
  /** 0 to 1. */
  alpha: Float32Array;
  /** An index into TONES. */
  tone: Uint8Array;
}

/**
 * The colours a specimen draws in, by role. Each is a CSS custom property,
 * read from the specimen's own element, so a specimen on beige paper draws in
 * the paper's ink.
 */
export const TONES = [
  '--color-ink',
  '--color-ink-soft',
  '--color-ink-muted',
  '--color-green',
  '--color-yellow',
  '--color-mint',
  '--color-purple',
  '--color-red',
  '--color-blue',
] as const;

/** Indexes into TONES, by name. */
export const Tone = {
  Ink: 0,
  Soft: 1,
  Muted: 2,
  Lichen: 3,
  Gold: 4,
  Mint: 5,
  Lilac: 6,
  Rust: 7,
  Mist: 8,
} as const;

/** Characters from sparse to dense, for drawing a density as a glyph. */
export const RAMP = ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

/** What a cell shows while it is still settling, or when the pointer stirs it. */
export const SCRAMBLE = '01<>/\\|=+*#%@$&?!:;{}[]~';

export interface Pointer {
  col: number;
  row: number;
}

export function newGrid(cols: number, rows: number): GlyphGrid {
  return {
    cols,
    rows,
    char: new Array<string>(cols * rows).fill(''),
    alpha: new Float32Array(cols * rows),
    tone: new Uint8Array(cols * rows),
  };
}

export function clear(grid: GlyphGrid): void {
  grid.char.fill('');
  grid.alpha.fill(0);
  grid.tone.fill(0);
}

/** The glyph for a density from 0 to 1. */
export function ramp(density: number): string {
  const i = Math.max(1, Math.min(RAMP.length - 1, Math.round(density * (RAMP.length - 1))));
  return RAMP[i];
}

/**
 * The glyph for a cell of a filled shape with coverage `c`, drawn as lace:
 * light marks inside, heavier ones along the rim where coverage falls off,
 * so a solid area reads as a form with an outline and not a slab of type.
 */
export function lace(c: number, col: number, row: number): string {
  const rim = 1 - Math.abs(2 * Math.min(1, c) - 1);
  return ramp(0.04 + rim * 0.62 + hash(col, row) * 0.16);
}

/** The character that draws a segment's direction on screen: | / - or \. */
export function slant(dx: number, dy: number): string {
  const deg = ((Math.atan2(-dy, dx) * 180) / Math.PI + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return '-';
  if (deg < 67.5) return '/';
  if (deg < 112.5) return '|';
  return '\\';
}

/** A stable pseudo-random number in [0, 1) for a cell, so patterns do not flicker. */
export function hash(a: number, b = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/**
 * A specimen draws one form as characters. The canvas component owns the
 * canvas, the reveal, the pointer and the animation loop; a specimen fills
 * the grid for a moment in time.
 */
export interface Specimen {
  /** The face cells are set in, and the cell size in CSS pixels. */
  readonly font: {
    family: string;
    size: number;
    weight?: number;
    cellWidth: number;
    lineHeight: number;
  };
  /** Called whenever the grid is resized. */
  setup(cols: number, rows: number): void;
  /**
   * Fill the grid for `t` milliseconds after the specimen came into view
   * (Infinity: the finished picture). Return true while the specimen still
   * changes on its own, so the loop keeps running.
   */
  frame(grid: GlyphGrid, t: number, pointer: Pointer | null): boolean;
  /** One line about the current state, shown under the specimen. */
  readout(): string;
  /** A tap on a cell; true if the specimen changed. */
  tap?(col: number, row: number): boolean;
  /** Arrow keys, for specimens that take them. */
  key?(dx: number, dy: number): boolean;
  /** The canvas left the screen: stop anything that runs on its own, such as a video. */
  sleep?(): void;
}
