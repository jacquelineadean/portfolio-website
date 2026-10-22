import { GlyphGrid, Pointer, Specimen, Tone, clear, hash, slant } from '../grid';
import { Mask } from '../mask';

/**
 * The four mental models of Four Mental Models, Illustrated, with the
 * minutes each owns in the post's 45-minute round and what it says each one
 * does.
 */
const MODELS = [
  {
    name: 'understand the question',
    from: 0,
    to: 8,
    tone: Tone.Mist,
    words:
      'an eight-item checklist · who consumes the output · a naive design to draw signals · ask for a hint · ',
  },
  {
    name: 'pick the right building blocks',
    from: 8,
    to: 18,
    tone: Tone.Lichen,
    words:
      'forty primitives · start from the access pattern · choose the primitive that serves it · name a vendor last · ',
  },
  {
    name: 'go deeper, on purpose',
    from: 18,
    to: 36,
    tone: Tone.Gold,
    words:
      'five layers of depth · load-bearing · novel · close to the team · capacity math · latency · tradeoffs · ',
  },
  {
    name: 'discuss, and course-correct',
    from: 36,
    to: 45,
    tone: Tone.Rust,
    words:
      'six interviewer signals · check direction in three seconds · five escape hatches · end strong · ',
  },
];
const CENTRE_WORDS = '45';
const LEAF_WORDS = '62 of 100 points grade reasoning · ';
/** The petals open clockwise from the upper left, in the round's order. */
const ANGLES = [-2.25, -0.68, 0.9, 2.47];
/** Mask regions: petals 20, 40, 60, 80; the centre and the leaves. */
const CENTRE = 120;
const LEAF = 180;
/** The stem grows, then the petals open, over this long. */
const BLOOM_MS = 4200;

interface Pt {
  x: number;
  y: number;
}

/**
 * Four Mental Models' specimen: a flower written in the post's own words.
 * Each petal is one model, its area set by the minutes that model owns in a
 * 45-minute round (going deeper takes eighteen, so its petal is largest),
 * and its text is what the post says that model does. The petals open
 * clockwise in the round's order around a centre written in 45s; the leaves
 * carry the rubric's weight, and the stem is drawn in line. Pointing at a
 * petal names it.
 */
export class Flower implements Specimen {
  readonly font = {
    family: "'Instrument Serif', Georgia, serif",
    size: 12,
    cellWidth: 5.4,
    lineHeight: 10,
  };

  private readonly mask = new Mask();
  private cols = 0;
  private rows = 0;
  private hovered = -1;
  private stem: Pt[] = [];

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.mask.resize(cols, rows, this.font.cellWidth, this.font.lineHeight);
  }

  frame(grid: GlyphGrid, t: number, pointer: Pointer | null): boolean {
    const p = t === Infinity ? 1 : Math.min(1, t / BLOOM_MS);
    const sway = t === Infinity ? 0 : Math.sin(t / 3100) * 0.03;
    this.paint(p, sway);
    this.hovered = pointer ? petalOf(this.mask.region(pointer.col, pointer.row)) : -1;

    clear(grid);
    const { cellWidth, lineHeight } = this.font;
    // The stem, as a line two characters wide, under everything else.
    for (let i = 1; i < this.stem.length; i++) {
      const a = this.stem[i - 1];
      const b = this.stem[i];
      const ch = slant(b.x - a.x, b.y - a.y);
      for (const dx of [0, cellWidth * 0.9]) {
        const col = Math.floor((b.x + dx) / cellWidth);
        const row = Math.floor(b.y / lineHeight);
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
        const k = row * this.cols + col;
        grid.char[k] = ch;
        grid.alpha[k] = dx ? 0.5 : 0.85;
        grid.tone[k] = Tone.Mint;
      }
    }

    // One running text per region, written row by row through its cells,
    // so words break where the shape's edge cuts them.
    const cursor = new Map<number, number>();
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.3) continue;
        const region = this.mask.region(col, row);
        const petal = petalOf(region);
        const key = petal >= 0 ? petal : Math.abs(region - CENTRE) < 15 ? CENTRE : LEAF;
        const text = petal >= 0 ? MODELS[petal].words : key === CENTRE ? CENTRE_WORDS : LEAF_WORDS;
        const k = cursor.get(key) ?? Math.floor(hash(key) * text.length);
        cursor.set(key, k + 1);
        const ch = text[k % text.length];
        const i = row * this.cols + col;
        // A space in the text still hides the stem behind it.
        grid.char[i] = ch === ' ' ? '' : ch;
        if (ch === ' ') continue;
        // The rim is written brighter than the inside, so each shape's edge reads.
        const rim = c < 0.9 || this.mask.at(col, row - 1) < 0.3 || this.mask.at(col, row + 1) < 0.3;
        const dim = this.hovered >= 0 && petal !== this.hovered ? 0.4 : 1;
        grid.alpha[i] = (rim ? 1 : 0.68) * dim;
        grid.tone[i] = petal >= 0 ? MODELS[petal].tone : key === CENTRE ? Tone.Gold : Tone.Mint;
      }
    }
    return p < 1;
  }

  readout(): string {
    if (this.hovered >= 0) {
      const m = MODELS[this.hovered];
      return `minutes ${m.from} to ${m.to} · ${m.name}`;
    }
    return '45 minutes, four models · each petal sized by its minutes';
  }

  /** Draw the leaves, petals and centre at bloom `p` (0 to 1); keep the stem's line. */
  private paint(p: number, sway: number): void {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(0.85);
    const grow = smooth(0, 0.45, p);
    const open = 1 - Math.pow(1 - smooth(0.3, 1, p), 3);

    // The plant leans a little in the breeze, from its base.
    const base = { x: ox + w * 0.5, y: oy + h * 1.02 };
    const head = { x: base.x + Math.sin(sway) * h * 0.6, y: oy + h * 0.4 };
    const top = { x: base.x + (head.x - base.x) * grow, y: base.y + (head.y - base.y) * grow };
    const ctrl = { x: ox + w * 0.42, y: oy + h * 0.74 };
    this.stem = [];
    for (let i = 0; i <= 60; i++) {
      const s = i / 60;
      this.stem.push({
        x: (1 - s) ** 2 * base.x + 2 * (1 - s) * s * ctrl.x + s * s * top.x,
        y: (1 - s) ** 2 * base.y + 2 * (1 - s) * s * ctrl.y + s * s * top.y,
      });
    }

    // Two leaves, once the stem is past them.
    const leafGrow = smooth(0.25, 0.6, p);
    if (leafGrow > 0) {
      ctx.fillStyle = Mask.fill(LEAF);
      leaf(ctx, this.stem[22], -2.5, w * 0.3 * leafGrow);
      leaf(ctx, this.stem[12], -0.55, w * 0.26 * leafGrow);
    }

    // The petals, each as long as the square root of its minutes, so its
    // area follows the minutes.
    if (open > 0) {
      const longest = Math.sqrt(18);
      const lens = MODELS.map((m) => w * 0.4 * (Math.sqrt(m.to - m.from) / longest) * open);
      MODELS.forEach((_, k) => {
        ctx.fillStyle = Mask.fill(20 + k * 20);
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(ANGLES[k] + sway);
        petal(ctx, lens[k]);
        ctx.fill();
        ctx.restore();
      });
      // Cut each petal's outline out of whatever lies under it, so the four
      // read as four shapes where they overlap.
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = this.font.lineHeight * 0.9;
      MODELS.forEach((_, k) => {
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(ANGLES[k] + sway);
        petal(ctx, lens[k]);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }

    // The centre, over the petals' roots.
    const r = w * Math.max(grow * 0.5, open);
    ctx.fillStyle = Mask.fill(CENTRE);
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, r * 0.075, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    this.mask.end();
  }
}

/** The path of a broad petal along +x from the origin, rounded at its tip with a small notch. */
function petal(ctx: CanvasRenderingContext2D, len: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.22, -len * 0.44, len * 0.92, -len * 0.52, len * 0.99, -len * 0.06);
  ctx.lineTo(len * 0.92, 0);
  ctx.lineTo(len * 0.99, len * 0.06);
  ctx.bezierCurveTo(len * 0.92, len * 0.52, len * 0.22, len * 0.44, 0, 0);
  ctx.closePath();
}

/** A pointed leaf from `at` toward angle `a`. */
function leaf(ctx: CanvasRenderingContext2D, at: Pt, a: number, len: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.45, len * 0.22, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** The petal a mask region belongs to, or -1. */
function petalOf(region: number): number {
  for (let k = 0; k < 4; k++) if (Math.abs(region - (20 + k * 20)) < 8) return k;
  return -1;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
