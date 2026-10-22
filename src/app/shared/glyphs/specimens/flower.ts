import { GlyphGrid, Pointer, Specimen, Tone, clear, hash } from '../grid';
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
const STEM_WORDS = 'forty-five minutes · ';
const LEAF_WORDS = '62 of 100 points grade reasoning · ';
/** Mask regions: petals 20, 40, 60, 80; the stem and the leaf. */
const STEM = 150;
const LEAF = 180;
/** The stem grows, then the petals open, over this long. */
const BLOOM_MS = 4200;

/**
 * Four Mental Models' specimen: a flower written in the post's own words.
 * Each petal is one model, its size set by the minutes that model owns in a
 * 45-minute round (going deeper takes eighteen, so its petal is largest),
 * and its text is what the post says that model does. The stem is written in
 * minutes and the leaf in the rubric's weight. Pointing at a petal names it.
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

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.mask.resize(cols, rows, this.font.cellWidth, this.font.lineHeight);
  }

  frame(grid: GlyphGrid, t: number, pointer: Pointer | null): boolean {
    const p = t === Infinity ? 1 : Math.min(1, t / BLOOM_MS);
    const sway = t === Infinity ? 0 : Math.sin(t / 3100) * 0.035;
    this.paint(p, sway);
    this.hovered = pointer ? petalOf(this.mask.region(pointer.col, pointer.row)) : -1;

    clear(grid);
    // One running text per region, written row by row through its cells,
    // so words break where the shape's edge cuts them.
    const cursor = new Map<number, number>();
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.3) continue;
        const region = this.mask.region(col, row);
        const petal = petalOf(region);
        const key = petal >= 0 ? petal : Math.abs(region - STEM) < 15 ? STEM : LEAF;
        const text = petal >= 0 ? MODELS[petal].words : key === STEM ? STEM_WORDS : LEAF_WORDS;
        const k = cursor.get(key) ?? Math.floor(hash(key) * text.length);
        cursor.set(key, k + 1);
        const ch = text[k % text.length];
        if (ch === ' ') continue;
        const i = row * this.cols + col;
        grid.char[i] = ch;
        const dim = this.hovered >= 0 && petal !== this.hovered ? 0.45 : 1;
        grid.alpha[i] = Math.min(1, 0.45 + c * 0.55) * dim;
        grid.tone[i] = petal >= 0 ? MODELS[petal].tone : key === STEM ? Tone.Soft : Tone.Mint;
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

  /** Draw the stem, leaf and petals at bloom `p` (0 to 1). */
  private paint(p: number, sway: number): void {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(0.85);
    ctx.translate(ox, oy);
    const base = { x: w * 0.5, y: h * 1.02 };
    // The whole plant leans a little in the breeze, from its base.
    ctx.translate(base.x, base.y);
    ctx.rotate(sway);
    ctx.translate(-base.x, -base.y);

    const head = { x: w * 0.5, y: h * 0.36 };
    const grow = Math.min(1, p / 0.45);
    const open = Math.max(0, (p - 0.35) / 0.65);
    const easeOpen = 1 - Math.pow(1 - open, 3);

    // The stem, rising to the head.
    const top = {
      x: head.x + (base.x - head.x) * (1 - grow),
      y: base.y + (head.y - base.y) * grow,
    };
    ctx.strokeStyle = Mask.fill(STEM);
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.035;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(w * 0.56, h * 0.7, top.x, top.y);
    ctx.stroke();

    // A leaf, once the stem is past it.
    if (grow > 0.5) {
      const leafGrow = Math.min(1, (grow - 0.5) / 0.5);
      ctx.fillStyle = Mask.fill(LEAF);
      ctx.beginPath();
      const lx = w * 0.53;
      const ly = h * 0.74;
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(
        lx + w * 0.16 * leafGrow,
        ly - h * 0.12 * leafGrow,
        lx + w * 0.3 * leafGrow,
        ly - h * 0.2 * leafGrow,
      );
      ctx.quadraticCurveTo(lx + w * 0.12 * leafGrow, ly - h * 0.02 * leafGrow, lx, ly);
      ctx.fill();
    }

    // The petals, each as long as the square root of its minutes, so its
    // area follows the minutes.
    if (easeOpen > 0) {
      const longest = Math.sqrt(18);
      // Four petals in an X, the way a four-petalled flower opens.
      const angles = [-2.45, -0.7, 0.55, 2.55];
      MODELS.forEach((m, k) => {
        const len = w * 0.42 * (Math.sqrt(m.to - m.from) / longest) * easeOpen;
        const a = angles[k];
        ctx.fillStyle = Mask.fill(20 + k * 20);
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.3, -len * 0.34, len * 0.92, -len * 0.26, len, 0);
        ctx.bezierCurveTo(len * 0.92, len * 0.26, len * 0.3, len * 0.34, 0, 0);
        ctx.fill();
        ctx.restore();
      });
    }
    this.mask.end();
  }
}

/** The petal a mask region belongs to, or -1. */
function petalOf(region: number): number {
  for (let k = 0; k < 4; k++) if (Math.abs(region - (20 + k * 20)) < 8) return k;
  return -1;
}
