import { GlyphGrid, Pointer, Specimen, Tone, bit, bits, clear, hash } from '../grid';
import { Mask } from '../mask';

/**
 * The run it is woven from: the seasonal tornado model's ledger card on the
 * Oklahoma contract (experiments/tornado-ok/ledger.jsonl, card exp-0002),
 * the worst populated reliability bin, and the contract's tolerance.
 */
const LEDGER =
  'tornado-ok · exp-0002 · BSS +0.1201 · AUC 0.8175 · bin 0.2–0.3 · said 24.5% · saw 32.2% · off by 7.7 pp · tolerance 5 pp · calibration fails · ';
/** The ledger card as bits, eight per character. */
const LEDGER_BITS = bits(LEDGER);
const GLIDE_MS = 3200;

/**
 * The Readiness Loop's specimen: a swallowtail, the butterfly of the
 * butterfly effect, woven from the numbers of one real forecasting run. The
 * wings' inner cells are the ledger card's bits, read left to right; the
 * veins, margins and spots are cut out of them, and the rims are drawn
 * brighter, in gold. It glides, its wings opening and closing.
 */
export class Butterfly implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 9, cellWidth: 5.6, lineHeight: 9 };

  private readonly mask = new Mask();
  private cols = 0;
  private rows = 0;

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.mask.resize(cols, rows, this.font.cellWidth, this.font.lineHeight);
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    const phase = t === Infinity ? 0 : (t / GLIDE_MS) * Math.PI * 2;
    const open = 0.78 + 0.22 * Math.cos(phase) ** 2;
    const lift = t === Infinity ? 0 : Math.sin(phase * 0.5) * 0.015;
    this.paint(open, lift);

    clear(grid);
    let k = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const c = this.mask.at(col, row);
        if (c < 0.12) continue;
        const i = row * this.cols + col;
        const body = this.mask.region(col, row) > 200;
        if (c > 0.92 && !body) {
          // Inside a wing cell: the ledger's bits, left to right, top to bottom.
          grid.char[i] = LEDGER_BITS[k++ % LEDGER_BITS.length];
          grid.alpha[i] = 0.3 + 0.35 * hash(col, row);
          grid.tone[i] = Tone.Soft;
        } else {
          grid.char[i] = bit(col, row);
          grid.alpha[i] = Math.min(1, 0.55 + c * 0.45);
          grid.tone[i] = body ? Tone.Ink : Tone.Gold;
        }
      }
    }
    return false;
  }

  readout(): string {
    return 'said 24.5%, saw 32.2% · off by 7.7 points against a 5-point tolerance';
  }

  /** Draw the wings, opened by `open` (1 is flat), and the body. */
  private paint(open: number, lift: number): void {
    const ctx = this.mask.begin();
    const { x: ox, y: oy, w, h } = this.mask.box(1.15);
    const cx = ox + w / 2;
    const cy = oy + h * (0.44 + lift);

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(side * open * 0.92, 0.92);
      wings(ctx, w, h);
      ctx.restore();
    }

    // The body, solid, over the wings' roots.
    ctx.fillStyle = Mask.fill(240);
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.03, w * 0.018, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.18, w * 0.022, 0, Math.PI * 2);
    ctx.fill();
    // Antennae.
    ctx.strokeStyle = Mask.fill(240);
    ctx.lineWidth = w * 0.006;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.19);
      ctx.quadraticCurveTo(cx + side * w * 0.03, cy - h * 0.3, cx + side * w * 0.08, cy - h * 0.36);
      ctx.stroke();
    }
    this.mask.end();
  }
}

/**
 * One side's wings, drawn to the right of the body at the origin: a forewing
 * reaching up and out, a hindwing with a swallowtail's tail. Veins, a dark
 * margin band and spots are cut out of them, so the wings read as cells.
 */
function wings(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = Mask.fill(80);
  // Forewing.
  ctx.beginPath();
  ctx.moveTo(w * 0.01, -h * 0.06);
  ctx.bezierCurveTo(w * 0.12, -h * 0.34, w * 0.34, -h * 0.4, w * 0.47, -h * 0.36);
  ctx.bezierCurveTo(w * 0.46, -h * 0.22, w * 0.42, -h * 0.06, w * 0.34, h * 0.04);
  ctx.bezierCurveTo(w * 0.22, h * 0.07, w * 0.09, h * 0.06, w * 0.01, h * 0.05);
  ctx.closePath();
  ctx.fill();
  // Hindwing, with its tail.
  ctx.beginPath();
  ctx.moveTo(w * 0.01, h * 0.05);
  ctx.bezierCurveTo(w * 0.16, h * 0.04, w * 0.33, h * 0.08, w * 0.34, h * 0.18);
  ctx.bezierCurveTo(w * 0.33, h * 0.27, w * 0.24, h * 0.32, w * 0.18, h * 0.34);
  ctx.bezierCurveTo(w * 0.17, h * 0.42, w * 0.15, h * 0.52, w * 0.13, h * 0.56);
  ctx.bezierCurveTo(w * 0.1, h * 0.5, w * 0.1, h * 0.4, w * 0.1, h * 0.34);
  ctx.bezierCurveTo(w * 0.06, h * 0.3, w * 0.02, h * 0.2, w * 0.01, h * 0.1);
  ctx.closePath();
  ctx.fill();

  // Cut the veins, the margin band and the spots out of the wings.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = w * 0.007;
  const veins: [number, number][] = [
    [0.44, -0.34],
    [0.42, -0.24],
    [0.38, -0.12],
    [0.32, -0.01],
    [0.3, 0.14],
    [0.26, 0.25],
    [0.15, 0.32],
  ];
  for (const [x, y] of veins) {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.02);
    ctx.quadraticCurveTo(w * x * 0.55, h * y * 0.4, w * x, h * y);
    ctx.stroke();
  }
  // A cell across the forewing.
  ctx.beginPath();
  ctx.moveTo(w * 0.2, -h * 0.24);
  ctx.quadraticCurveTo(w * 0.24, -h * 0.1, w * 0.18, h * 0.02);
  ctx.stroke();
  // The margin: a band just inside the edge of each wing, with spots in it.
  ctx.lineWidth = w * 0.006;
  ctx.beginPath();
  ctx.moveTo(w * 0.17, -h * 0.31);
  ctx.bezierCurveTo(w * 0.3, -h * 0.35, w * 0.4, -h * 0.33, w * 0.42, -h * 0.3);
  ctx.bezierCurveTo(w * 0.41, -h * 0.18, w * 0.37, -h * 0.06, w * 0.3, h * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.29, h * 0.12);
  ctx.bezierCurveTo(w * 0.3, h * 0.2, w * 0.25, h * 0.27, w * 0.18, h * 0.3);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = -0.32 + k * 0.07;
    ctx.beginPath();
    ctx.arc(w * (0.44 - Math.abs(a + 0.1) * 0.3), h * a, w * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(w * (0.3 - k * 0.04), h * (0.17 + k * 0.035), w * 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
