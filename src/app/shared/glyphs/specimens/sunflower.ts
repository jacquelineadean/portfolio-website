import { GlyphGrid, Pointer, Specimen, Tone, clear, slant } from '../grid';
import { Mask } from '../mask';

/** The post's best case for one user on one H100: an 8B model at batch one. */
const TOKENS_PER_S = 209;
/** The golden angle: each seed turns this far from the last. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** The text the tokens spell, the post's opening line. */
const TEXT =
  'Every LLM request crosses seven layers of software before a GPU multiplies anything. ';
/** The seven layers, centre outward, in the post's colours. */
const LAYERS = [Tone.Mist, Tone.Rust, Tone.Mint, Tone.Lilac, Tone.Gold, Tone.Rust, Tone.Lichen];
const PETALS = 34;
/** How long a head stays full before the next request starts at the centre. */
const HOLD_MS = 2600;

/**
 * The AI Inference Stack's specimen: a sunflower whose seeds are tokens.
 * Seeds arrive at 209 a second, the post's best case for one user, each on
 * the golden angle from the last, spiralling out from the centre; each shows
 * the next character of the post's opening line. The head is banded in the
 * seven layers' colours, centre to rim, and ringed with petals.
 */
export class Sunflower implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 10, cellWidth: 6.2, lineHeight: 10 };

  private readonly mask = new Mask();
  private cols = 0;
  private rows = 0;
  private seeds = 0;
  private capacity = 1;
  private cycleStart = 0;

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.mask.resize(cols, rows, this.font.cellWidth, this.font.lineHeight);
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    const { x: ox, y: oy, w, h } = this.mask.box(1);
    const head = { x: ox + w * 0.5, y: oy + h * 0.4 };
    const radius = Math.min(w, h) * 0.24;
    // One seed per cell's area, so the head fills solid with tokens.
    const spacing = Math.sqrt((this.font.cellWidth * this.font.lineHeight) / Math.PI);
    this.capacity = Math.floor((radius / spacing) ** 2);

    const elapsed = t === Infinity ? Infinity : t - this.cycleStart;
    const fill = (this.capacity / TOKENS_PER_S) * 1000;
    if (t !== Infinity && elapsed > fill + HOLD_MS) this.cycleStart = t;
    this.seeds = Math.min(
      this.capacity,
      Math.floor(((t === Infinity ? fill : t - this.cycleStart) / 1000) * TOKENS_PER_S),
    );

    const stem = this.paint(head, radius, t);
    clear(grid);
    const { cellWidth, lineHeight } = this.font;
    // The stem, as a line two characters wide.
    for (let i = 1; i < stem.length; i++) {
      const ch = slant(stem[i].x - stem[i - 1].x, stem[i].y - stem[i - 1].y);
      for (const dx of [0, cellWidth * 0.9]) {
        const col = Math.floor((stem[i].x + dx) / cellWidth);
        const row = Math.floor(stem[i].y / lineHeight);
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
        grid.char[row * this.cols + col] = ch;
        grid.alpha[row * this.cols + col] = dx ? 0.45 : 0.8;
        grid.tone[row * this.cols + col] = Tone.Mint;
      }
    }
    // Petals and the leaf from the mask, each cell in the stroke that
    // follows its petal outward from the head (or along the leaf).
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.3) continue;
        const i = row * this.cols + col;
        const petal = this.mask.region(col, row) < 100;
        const x = (col + 0.5) * cellWidth;
        const y = (row + 0.5) * lineHeight;
        grid.char[i] = petal ? slant(x - head.x, y - head.y) : slant(-1, -0.45);
        grid.alpha[i] = petal ? 0.35 + c * 0.55 : 0.3 + c * 0.4;
        grid.tone[i] = petal ? Tone.Gold : Tone.Mint;
      }
    }
    // The seeds: the newest at the rim of what has grown, all on the spiral.
    for (let k = 0; k < this.seeds; k++) {
      const r = spacing * Math.sqrt(k + 0.5);
      const a = k * GOLDEN;
      const col = Math.floor((head.x + r * Math.cos(a)) / this.font.cellWidth);
      const row = Math.floor((head.y + r * Math.sin(a)) / this.font.lineHeight);
      if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
      const i = row * this.cols + col;
      const ch = TEXT[k % TEXT.length];
      grid.char[i] = ch === ' ' ? '·' : ch;
      const fresh = this.seeds - k < 30 ? 1 : 0.75;
      grid.alpha[i] = fresh;
      grid.tone[i] = LAYERS[Math.min(LAYERS.length - 1, Math.floor((r / radius) * LAYERS.length))];
    }
    return true;
  }

  readout(): string {
    return `${this.seeds.toLocaleString('en-US')} tokens · ${TOKENS_PER_S} a second, the best case for one user on one H100`;
  }

  tap(): boolean {
    this.cycleStart = -Infinity;
    return true;
  }

  /** Petals around the head and a leaf into the mask; returns the stem's line. */
  private paint(
    head: { x: number; y: number },
    radius: number,
    t: number,
  ): { x: number; y: number }[] {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(1);
    const sway = t === Infinity ? 0 : Math.sin(t / 2900) * 0.04;

    const stem: { x: number; y: number }[] = [];
    const from = { x: head.x, y: head.y + radius * 1.6 };
    const ctrl = { x: ox + w * 0.46, y: oy + h * 0.8 };
    const to = { x: ox + w * 0.5, y: oy + h * 1.02 };
    for (let i = 0; i <= 50; i++) {
      const s = i / 50;
      stem.push({
        x: (1 - s) ** 2 * from.x + 2 * (1 - s) * s * ctrl.x + s * s * to.x,
        y: (1 - s) ** 2 * from.y + 2 * (1 - s) * s * ctrl.y + s * s * to.y,
      });
    }
    ctx.fillStyle = Mask.fill(200);
    ctx.beginPath();
    ctx.moveTo(ox + w * 0.48, oy + h * 0.82);
    ctx.quadraticCurveTo(ox + w * 0.3, oy + h * 0.72, ox + w * 0.18, oy + h * 0.74);
    ctx.quadraticCurveTo(ox + w * 0.32, oy + h * 0.84, ox + w * 0.48, oy + h * 0.86);
    ctx.fill();

    ctx.fillStyle = Mask.fill(40);
    for (let k = 0; k < PETALS; k++) {
      const a = (k / PETALS) * Math.PI * 2 + sway + (k % 2) * 0.05;
      const len = radius * (k % 2 ? 0.62 : 0.78);
      ctx.save();
      ctx.translate(head.x + Math.cos(a) * radius * 0.92, head.y + Math.sin(a) * radius * 0.92);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(len * 0.5, 0, len * 0.5, radius * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Clear the head, where the seeds go.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius * 0.98, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.mask.end();
    return stem;
  }
}
