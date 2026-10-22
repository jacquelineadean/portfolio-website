import { GlyphGrid, Pointer, Specimen, Tone, clear, hash, lace } from '../grid';
import { Mask } from '../mask';

/** The fiddlehead grows from its base and loosens its coil over this long. */
const GROW_MS = 5200;
/** Turns of the coil, tight to loosened. */
const TURNS = [2.5, 1.45];
/** Leaflets along the straight stem, and along the coil's outer edge. */
const STEM_LEAVES = 16;
const COIL_LEAVES = 34;
/** Points on the straight stretch of the centre line. */
const STEM_POINTS = 60;
/** Below this share of the height the fern turns to binary, over this band. */
const DISSOLVE = 0.6;
const BAND = 0.12;

/** Region numbers in the mask's green channel. */
const STEM = 120;
const LEAF = 200;

interface Pt {
  x: number;
  y: number;
}

/**
 * The home page's fern: a fiddlehead drawn in characters, unfurling. Its
 * stem rises from the bottom and coils at the top; leaflets open along it
 * from the base up while the coil loosens. Below the middle the fern turns
 * into binary that trickles downward, the plant becoming the code that drew
 * it.
 */
export class Fern implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 9, cellWidth: 5.6, lineHeight: 9 };

  private readonly mask = new Mask();
  private cols = 0;
  private rows = 0;
  private count = 0;

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.mask.resize(cols, rows, this.font.cellWidth, this.font.lineHeight);
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    const p = t === Infinity ? 1 : Math.min(1, t / GROW_MS);
    const grow = 1 - Math.pow(1 - p, 3);
    const breeze = t === Infinity ? 0 : Math.sin(t / 2600) * 0.02;
    this.paint(grow, breeze);

    clear(grid);
    const { cols, rows } = this;
    const fall = t === Infinity ? 0 : Math.floor(t / 150);
    let count = 0;
    for (let row = 0; row < rows; row++) {
      const y = row / rows;
      // How far into binary this row is: 0 above the band, 1 below it.
      const digital = Math.min(1, Math.max(0, (y - DISSOLVE) / BAND));
      for (let col = 0; col < cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.1) continue;
        const i = row * cols + col;
        if (digital > 0 && hash(col, row * 3) < digital) {
          // Binary, breaking up toward the bottom, scrolling down.
          if (hash(col + 11, row) < 0.12 + 0.45 * Math.max(0, y - DISSOLVE - BAND)) continue;
          grid.char[i] = hash(col, row - fall) > 0.5 ? '1' : '0';
          grid.alpha[i] = Math.min(1, 0.3 + c * 0.7) * (1 - (0.5 * Math.max(0, y - 0.8)) / 0.2);
          grid.tone[i] = Tone.Soft;
        } else {
          const stem = Math.abs(this.mask.region(col, row) - STEM) < 30;
          grid.char[i] = lace(c, col, row);
          grid.alpha[i] = Math.min(1, 0.35 + c * 0.75);
          grid.tone[i] = stem ? Tone.Ink : c < 0.85 ? Tone.Lichen : Tone.Mint;
        }
        count++;
      }
    }
    this.count = count;
    return p < 1;
  }

  readout(): string {
    return `a fiddlehead, unfurling · ${this.count.toLocaleString('en-US')} characters`;
  }

  /** Draw the stem and leaflets at growth `g` (0 to 1) into the mask. */
  private paint(g: number, breeze: number): void {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(0.74);
    ctx.translate(ox, oy);
    const line = centerline(w, h, g, breeze);

    // How much of the line exists yet: the fern grows from its base.
    const shown = Math.max(2, Math.floor(line.length * Math.min(1, g * 1.15)));

    ctx.fillStyle = Mask.fill(LEAF);
    // Leaflets on the stem, alternating sides, opening as the stem reaches them.
    for (let k = 0; k < STEM_LEAVES; k++) {
      const s = 0.22 + (k / STEM_LEAVES) * 0.74;
      const idx = Math.floor(s * STEM_POINTS);
      if (idx >= shown) break;
      const open = Math.min(1, (shown - idx) / 24);
      const side = k % 2 ? 1 : -1;
      const size = w * 0.25 * smooth(0.15, 0.4, s) * (1 - 0.35 * s) * open;
      if (size >= 2) leaflet(ctx, line, idx, side, size);
    }
    // Small leaflets packed along the coil, both edges, smaller inward.
    for (let k = 0; k < COIL_LEAVES; k++) {
      const idx = STEM_POINTS + 2 + Math.floor((k / COIL_LEAVES) * (line.length - STEM_POINTS - 6));
      if (idx >= shown) break;
      const f = k / COIL_LEAVES;
      const size = w * 0.1 * (1 - f * 0.8) * Math.min(1, (shown - idx) / 20);
      if (size >= 1.5)
        leaflet(ctx, line, idx, k % 3 === 2 ? -1 : 1, size * (k % 3 === 2 ? 0.6 : 1));
    }

    // The stem, thick at the base and thin into the coil.
    ctx.strokeStyle = Mask.fill(STEM);
    ctx.lineCap = 'round';
    for (let i = 1; i < shown; i++) {
      const f = i / line.length;
      ctx.lineWidth = w * (0.04 - 0.03 * f);
      ctx.beginPath();
      ctx.moveTo(line[i - 1].x, line[i - 1].y);
      ctx.lineTo(line[i].x, line[i].y);
      ctx.stroke();
    }
    this.mask.end();
  }
}

/**
 * The fern's spine: a curve up from below the bottom edge, then a spiral that
 * coils tighter toward its end. `g` loosens the coil; `breeze` leans it.
 */
function centerline(w: number, h: number, g: number, breeze: number): Pt[] {
  const pts: Pt[] = [];
  const base = { x: w * 0.5, y: h * 1.03 };
  const r0 = w * (0.21 + 0.05 * g);
  const top = { x: w * (0.74 + breeze), y: h * 0.36 };
  const ctrl = { x: w * 0.86, y: h * 0.7 };
  for (let i = 0; i <= STEM_POINTS; i++) {
    const s = i / STEM_POINTS;
    pts.push({
      x: (1 - s) * (1 - s) * base.x + 2 * (1 - s) * s * ctrl.x + s * s * top.x,
      y: (1 - s) * (1 - s) * base.y + 2 * (1 - s) * s * ctrl.y + s * s * top.y,
    });
  }
  // The coil: from the right of its centre, up and over to the left, inward.
  const turns = TURNS[0] + (TURNS[1] - TURNS[0]) * g;
  const centre = { x: top.x - r0, y: top.y };
  const k = Math.log(1 / 0.07) / (turns * Math.PI * 2);
  const steps = Math.round(turns * 70);
  for (let i = 1; i <= steps; i++) {
    const th = -(i / steps) * turns * Math.PI * 2;
    const r = r0 * Math.exp(k * th);
    pts.push({ x: centre.x + r * Math.cos(th), y: centre.y + r * Math.sin(th) });
  }
  return pts;
}

/**
 * One leaflet at point `idx` of the centre line, on `side` (1: the side the
 * line turns toward, the coil's outside; -1: the other), leaning toward the
 * tip, its edge cut into lobes.
 */
function leaflet(
  ctx: CanvasRenderingContext2D,
  line: Pt[],
  idx: number,
  side: number,
  size: number,
): void {
  const at = line[idx];
  const next = line[Math.min(line.length - 1, idx + 1)];
  const tl = Math.hypot(next.x - at.x, next.y - at.y) || 1;
  const tx = (next.x - at.x) / tl;
  const ty = (next.y - at.y) / tl;
  // Outward normal for side 1 is to the tangent's left.
  const nx = ty * side;
  const ny = -tx * side;
  const ux = nx * 0.82 + tx * 0.4;
  const uy = ny * 0.82 + ty * 0.4;
  const ul = Math.hypot(ux, uy);
  const steps = 16;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let j = 0; j <= steps; j++) {
    const f = j / steps;
    const sx = at.x + (ux / ul) * size * f + tx * size * f * f * 0.35;
    const sy = at.y + (uy / ul) * size * f + ty * size * f * f * 0.35;
    const lobe = 0.6 + 0.4 * Math.abs(Math.sin(f * Math.PI * 4.5));
    const half = size * 0.2 * Math.sin(Math.PI * Math.min(1, f * 1.05)) * lobe;
    left.push({ x: sx - (uy / ul) * half, y: sy + (ux / ul) * half });
    right.push({ x: sx + (uy / ul) * half, y: sy - (ux / ul) * half });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let j = right.length - 1; j >= 0; j--) ctx.lineTo(right[j].x, right[j].y);
  ctx.closePath();
  ctx.fill();
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
