import { GlyphGrid, Pointer, Specimen, Tone, clear, hash, slant } from '../grid';

/** The frond unrolls from its base over this long. */
const GROW_MS = 8000;
/** Share of the rachis unrolled at the start and at the end; the rest is coiled. */
const UNROLLED = [0.32, 0.93];
/** Turns of the coil that holds the rest, and how small its centre gets. */
const COIL_TURNS = 1.9;
const COIL_INNER = 0.12;
/** Pairs of pinnae (the leaflets) along the rachis. */
const PINNAE = 11;
/** Points on the rachis curve. */
const RACHIS_POINTS = 90;
/** Below this share of the height the fern turns to binary, over this band. */
const DISSOLVE = 0.64;
const BAND = 0.1;
/** How far, in rows, binary drips below the frond. */
const DRIP = 9;

/** Which stroke wins a cell: the rachis over a pinna over a pinnule. */
const RACHIS = 3;
const MIDRIB = 2;
const PINNULE = 1;

interface Pt {
  x: number;
  y: number;
}

/**
 * The home page's fern: a frond drawn as line art in characters, unrolling
 * the way a fern does. Every stroke is set in the character that follows
 * its direction (| / - \), so the rachis, the pinnae and their pinnules read
 * as a botanical drawing. The upper rachis starts rolled in a coil; as it
 * grows the coil travels up and shrinks, and each pair of pinnae opens as
 * the coil lets it go. Below the middle the fern turns into binary that
 * drips downward, the plant becoming the code that drew it.
 */
export class Fern implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 9, cellWidth: 5.6, lineHeight: 9 };

  private cols = 0;
  private rows = 0;
  private count = 0;
  private glyph: string[] = [];
  private prio = new Uint8Array(0);
  private tone = new Uint8Array(0);
  private alpha = new Float32Array(0);
  /** Cells of the coil, which stay leaves while the binary takes the base. */
  private keep = new Uint8Array(0);

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.glyph = new Array<string>(cols * rows).fill('');
    this.prio = new Uint8Array(cols * rows);
    this.tone = new Uint8Array(cols * rows);
    this.alpha = new Float32Array(cols * rows);
    this.keep = new Uint8Array(cols * rows);
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    const p = t === Infinity ? 1 : Math.min(1, t / GROW_MS);
    const grow = p * p * (3 - 2 * p);
    const breeze = t === Infinity ? 0 : Math.sin(t / 2600) * 0.015;
    this.glyph.fill('');
    this.prio.fill(0);
    this.keep.fill(0);
    this.draw(grow, breeze);

    clear(grid);
    const { cols, rows } = this;
    const fall = t === Infinity ? 0 : Math.floor(t / 150);
    let count = 0;
    for (let row = 0; row < rows; row++) {
      const y = row / rows;
      // How far into binary this row is: 0 above the band, 1 below it.
      const digital = Math.min(1, Math.max(0, (y - DISSOLVE) / BAND));
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (!this.glyph[i]) continue;
        count++;
        if (digital > 0 && !this.keep[i] && hash(col, row * 3) < digital) {
          // Binary, flickering downward, and dripping below the stroke.
          const a = this.alpha[i] * (1 - (0.5 * Math.max(0, y - 0.8)) / 0.2);
          set(grid, i, hash(col, row - fall) > 0.5 ? '1' : '0', a, Tone.Soft);
          const drop = (fall + Math.floor(hash(col, row) * 40)) % (DRIP * 3);
          if (drop < DRIP && hash(row, col) < 0.35) {
            const below = i + (drop + 1) * cols;
            if (below < grid.char.length && !this.glyph[below]) {
              set(
                grid,
                below,
                hash(col, drop - fall) > 0.5 ? '1' : '0',
                a * (1 - drop / DRIP) * 0.6,
                Tone.Muted,
              );
            }
          }
        } else {
          set(grid, i, this.glyph[i], this.alpha[i], this.tone[i]);
        }
      }
    }
    this.count = count;
    return p < 1;
  }

  readout(): string {
    return `a fern frond, unrolling · ${this.count.toLocaleString('en-US')} characters`;
  }

  /** Draw the frond unrolled by `g` (0 to 1). */
  private draw(g: number, breeze: number): void {
    const { cellWidth, lineHeight } = this.font;
    const width = this.cols * cellWidth;
    const height = this.rows * lineHeight;
    // The largest box of the frond's proportions, centred.
    const w = Math.min(width, height * 0.74);
    const h = w / 0.74;
    const origin = { x: (width - w) / 2, y: (height - h) / 2 };

    const line = rachis(w, h, breeze).map((p) => ({ x: p.x + origin.x, y: p.y + origin.y }));
    const len = [0];
    for (let i = 1; i < line.length; i++) {
      len.push(len[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
    }
    const total = len[len.length - 1];
    const u = UNROLLED[0] + (UNROLLED[1] - UNROLLED[0]) * g;

    // The unrolled part ends at the last rachis point before `u`; the coil
    // holds the length left over and starts there, along the same tangent.
    let end = 1;
    while (end < line.length - 1 && len[end + 1] <= u * total) end++;
    const [tx, ty] = tangent(line[end - 1], line[end]);
    const coil = new Coil(line[end], tx, ty, total - len[end]);

    // The rachis, two strokes wide near the base.
    const path = [...line.slice(0, end + 1), ...coil.points()];
    for (let i = 1; i < path.length; i++) {
      this.stroke(path[i - 1], path[i], RACHIS, Tone.Soft, 0.95, i > end);
      if (len[Math.min(i, end)] < total * 0.3 && i <= end) {
        const shift = { x: cellWidth * 0.9, y: 0 };
        this.stroke(add(path[i - 1], shift), add(path[i], shift), RACHIS, Tone.Soft, 0.7);
      }
    }

    for (let k = 0; k < PINNAE; k++) {
      const s = 0.1 + (0.82 * k) / (PINNAE - 1);
      for (const side of [-1, 1]) {
        // The two sides of a pair sit a little apart, as on a real rachis.
        const at = (s + (side > 0 ? 0.018 : 0)) * total;
        if (at <= len[end]) {
          let j = 1;
          while (j < end && len[j] < at) j++;
          const open = smooth(0, 0.1, u - at / total);
          const size = w * 0.46 * taper(s) * open;
          const [px, py] = tangent(line[j - 1], line[j]);
          if (size >= cellWidth * 1.5) this.pinna(line[j], px, py, side, size);
        } else if (side > 0) {
          // Still rolled up: a short leaflet on the outside of the coil.
          const c = coil.at(at - len[end]);
          const size = Math.min(c.r * 0.9, w * 0.1 * taper(s));
          if (size >= cellWidth) {
            const d = lean(c.ty, -c.tx, c.tx, c.ty, 0.5);
            this.stroke(
              c,
              { x: c.x + d.x * size, y: c.y + d.y * size },
              PINNULE,
              Tone.Mint,
              0.75,
              true,
            );
          }
        }
      }
    }
  }

  /**
   * One pinna at `at`, on `side` of the rachis's tangent, leaning toward the
   * tip: a midrib with short pinnules along both its edges, pointing outward.
   */
  private pinna(at: Pt, tx: number, ty: number, side: number, size: number): void {
    const dir = lean(ty * side, -tx * side, tx, ty, 0.72);
    const point = (f: number) => ({
      x: at.x + dir.x * size * f + tx * size * f * f * 0.2,
      y: at.y + dir.y * size * f + ty * size * f * f * 0.2,
    });
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      this.stroke(point((i - 1) / steps), point(i / steps), MIDRIB, Tone.Lichen, 0.9);
    }
    const count = Math.max(2, Math.floor(size / (this.font.cellWidth * 1.8)));
    for (let i = 1; i <= count; i++) {
      const f = i / (count + 1);
      const from = point(f);
      const along = point(Math.min(1, f + 0.02));
      const [mx, my] = tangent(from, along);
      const flip = i % 2 ? 1 : -1;
      const d = lean(my * flip, -mx * flip, mx, my, 0.65);
      const reach = Math.max(this.font.cellWidth * 1.2, size * 0.12 * (1 - 0.6 * f));
      this.stroke(
        from,
        { x: from.x + d.x * reach, y: from.y + d.y * reach },
        PINNULE,
        Tone.Mint,
        0.55 + 0.3 * hash(i, count),
      );
    }
  }

  /** Set the cells along a straight segment in the character for its direction. */
  private stroke(a: Pt, b: Pt, prio: number, tone: number, alpha: number, keep = false): void {
    const { cellWidth, lineHeight } = this.font;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const ch = slant(dx, dy);
    const n = Math.ceil(Math.max(Math.abs(dx) / cellWidth, Math.abs(dy) / lineHeight) * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const col = Math.floor((a.x + (dx * i) / n) / cellWidth);
      const row = Math.floor((a.y + (dy * i) / n) / lineHeight);
      if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
      const c = row * this.cols + col;
      if (this.prio[c] > prio) continue;
      this.prio[c] = prio;
      this.glyph[c] = ch;
      this.tone[c] = tone;
      this.alpha[c] = alpha;
      this.keep[c] = keep ? 1 : 0;
    }
  }
}

function set(grid: GlyphGrid, i: number, ch: string, alpha: number, tone: number): void {
  grid.char[i] = ch;
  grid.alpha[i] = alpha;
  grid.tone[i] = tone;
}

/** The rachis at full length: a cubic curve from below the bottom edge to the top. */
function rachis(w: number, h: number, breeze: number): Pt[] {
  const p0 = { x: w * 0.5, y: h * 1.04 };
  const p1 = { x: w * 0.36, y: h * 0.66 };
  const p2 = { x: w * (0.64 + breeze), y: h * 0.36 };
  const p3 = { x: w * (0.54 + breeze * 2), y: h * 0.06 };
  const pts: Pt[] = [];
  for (let i = 0; i <= RACHIS_POINTS; i++) {
    const s = i / RACHIS_POINTS;
    const a = (1 - s) ** 3;
    const b = 3 * (1 - s) ** 2 * s;
    const c = 3 * (1 - s) * s * s;
    const d = s ** 3;
    pts.push({
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    });
  }
  return pts;
}

/**
 * The rolled-up rest of the rachis: a logarithmic spiral that leaves the tip
 * along its tangent, turns to the right and tightens toward its centre, sized
 * so its arc holds `length`.
 */
class Coil {
  private readonly k = Math.log(1 / COIL_INNER) / (COIL_TURNS * Math.PI * 2);
  private readonly r0: number;
  private readonly cx: number;
  private readonly cy: number;
  private readonly a0: number;

  constructor(
    tip: Pt,
    tx: number,
    ty: number,
    private readonly length: number,
  ) {
    const k = this.k;
    this.r0 = (length * k) / (Math.sqrt(1 + k * k) * (1 - COIL_INNER));
    // The centre is to the right of the tangent; the tip sits at angle a0.
    this.cx = tip.x - ty * this.r0;
    this.cy = tip.y + tx * this.r0;
    this.a0 = Math.atan2(-tx, ty);
  }

  /** The point `d` along the coil, its radius there and its tangent. */
  at(d: number): Pt & { r: number; tx: number; ty: number } {
    const k = this.k;
    const left = 1 - (Math.min(d, this.length) * k) / (this.r0 * Math.sqrt(1 + k * k));
    const phi = -Math.log(Math.max(COIL_INNER, left)) / k;
    const r = this.r0 * Math.exp(-k * phi);
    const a = this.a0 + phi;
    // The tangent of r(phi) e^(i a): radial part -k r, angular part r.
    const dx = -k * Math.cos(a) - Math.sin(a);
    const dy = -k * Math.sin(a) + Math.cos(a);
    const n = Math.hypot(dx, dy);
    return {
      x: this.cx + r * Math.cos(a),
      y: this.cy + r * Math.sin(a),
      r,
      tx: dx / n,
      ty: dy / n,
    };
  }

  points(): Pt[] {
    const steps = Math.round(COIL_TURNS * 60);
    const pts: Pt[] = [];
    for (let i = 1; i <= steps; i++) pts.push(this.at((i / steps) * this.length));
    return pts;
  }
}

/** A unit direction between normal (nx, ny) and tangent (tx, ty), `n` of the way to the normal. */
function lean(nx: number, ny: number, tx: number, ty: number, n: number): Pt {
  const x = nx * n + tx * (1 - n);
  const y = ny * n + ty * (1 - n);
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

/** The frond's outline: widest a quarter of the way up, narrowing to the tip. */
function taper(s: number): number {
  return s < 0.28 ? 0.5 + 0.5 * smooth(0, 0.28, s) : Math.max(0.1, 1 - (s - 0.28) / 0.78);
}

function tangent(a: Pt, b: Pt): [number, number] {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return [(b.x - a.x) / l, (b.y - a.y) / l];
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
