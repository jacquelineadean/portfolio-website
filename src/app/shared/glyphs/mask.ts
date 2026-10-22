/**
 * A drawing surface one pixel per character cell. A specimen draws its form
 * here with ordinary canvas calls, in the display's own CSS pixels; reading
 * the pixels back gives each cell's coverage, from 0 (empty) to 1 (inside),
 * with the antialiased rim in between, which the ramp turns into lighter
 * glyphs at the edges.
 *
 * Several shapes can share one mask by drawing in different colours: the red
 * channel holds coverage and the green channel a region number, so a flower
 * can know which petal a cell belongs to.
 */
export class Mask {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private data: Uint8ClampedArray = new Uint8ClampedArray(0);
  cols = 0;
  rows = 0;
  /** The display's size in CSS pixels, the space shapes are drawn in. */
  width = 0;
  height = 0;

  resize(cols: number, rows: number, cellWidth: number, lineHeight: number): void {
    this.cols = cols;
    this.rows = rows;
    this.width = cols * cellWidth;
    this.height = rows * lineHeight;
    this.canvas.width = cols;
    this.canvas.height = rows;
  }

  /**
   * The largest box of width over height `aspect` centred in the display,
   * for a form drawn to its own proportions whatever the canvas's shape.
   */
  box(aspect: number): { x: number; y: number; w: number; h: number } {
    const w = Math.min(this.width, this.height * aspect);
    const h = w / aspect;
    return { x: (this.width - w) / 2, y: (this.height - h) / 2, w, h };
  }

  /** Clear, and return a context that draws in display pixels. */
  begin(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cols, this.rows);
    ctx.setTransform(this.cols / this.width, 0, 0, this.rows / this.height, 0, 0);
    return ctx;
  }

  /** Read the drawing back; call once after drawing, before sampling. */
  end(): void {
    this.data = this.ctx.getImageData(0, 0, this.cols, this.rows).data;
  }

  /** Coverage of a cell, 0 to 1. */
  at(col: number, row: number): number {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 0;
    return this.data[(row * this.cols + col) * 4 + 3] / 255;
  }

  /** The region a cell was drawn in: the green channel of its colour. */
  region(col: number, row: number): number {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 0;
    return this.data[(row * this.cols + col) * 4 + 1];
  }

  /** The colour that marks region `n` when drawing. */
  static fill(n: number): string {
    return `rgb(255, ${n}, 0)`;
  }
}
