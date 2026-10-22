import { GlyphGrid, Pointer, Specimen, Tone, clear, lace } from '../grid';
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
    // One seed per cell's area, roughly, so seeds do not pile on one cell.
    const spacing = Math.max(this.font.cellWidth, this.font.lineHeight) * 0.62;
    this.capacity = Math.floor((radius / spacing) ** 2);

    const elapsed = t === Infinity ? Infinity : t - this.cycleStart;
    const fill = (this.capacity / TOKENS_PER_S) * 1000;
    if (t !== Infinity && elapsed > fill + HOLD_MS) this.cycleStart = t;
    this.seeds = Math.min(
      this.capacity,
      Math.floor(((t === Infinity ? fill : t - this.cycleStart) / 1000) * TOKENS_PER_S),
    );

    this.paint(head, radius, t);
    clear(grid);
    // Petals, stem and leaf from the mask, as lace.
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.15) continue;
        const i = row * this.cols + col;
        const petal = this.mask.region(col, row) < 100;
        grid.char[i] = lace(c, col, row);
        grid.alpha[i] = Math.min(1, 0.2 + c * 0.5);
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

  /** Petals around the head, a stem and a leaf. */
  private paint(head: { x: number; y: number }, radius: number, t: number): void {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(1);
    const sway = t === Infinity ? 0 : Math.sin(t / 2900) * 0.04;

    ctx.strokeStyle = Mask.fill(200);
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.03;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y + radius);
    ctx.quadraticCurveTo(ox + w * 0.46, oy + h * 0.8, ox + w * 0.5, oy + h * 1.02);
    ctx.stroke();
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
      ctx.ellipse(len * 0.5, 0, len * 0.5, radius * 0.07, 0, 0, Math.PI * 2);
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
  }
}
