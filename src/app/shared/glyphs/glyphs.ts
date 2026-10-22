import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GlyphGrid, Pointer, SCRAMBLE, Specimen, TONES, hash, newGrid } from './grid';

/** How long the scramble-in takes when a specimen first comes into view. */
const REVEAL_MS = 1800;
/** How far, in cells, the pointer stirs the characters around it. */
const STIR = 5;
/** Frames between redraws once a specimen has settled and only shimmers. */
const IDLE_EVERY = 3;

/**
 * A form drawn in characters on a canvas: the specimen decides what each cell
 * shows, this component draws it.
 *
 * On first sight every cell scrambles through random glyphs and settles on
 * its own, in a random order, over a couple of seconds. After that a few
 * cells flicker at a time, and the pointer stirs the cells near it, as wind
 * would. The loop runs only while the specimen is on screen. Under reduced
 * motion it draws the finished picture once and stops.
 */
@Component({
  selector: 'app-glyphs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      [attr.tabindex]="interactive() ? 0 : null"
      role="img"
      [attr.aria-label]="label() + (readout() ? '. ' + readout() : '')"
      (pointermove)="move($event)"
      (pointerleave)="pointer = null"
      (click)="tap($event)"
      (keydown)="key($event)"
    ></canvas>
    @if (showReadout()) {
      <p class="glyphs-readout" aria-hidden="true">{{ readout() }}</p>
    }
  `,
  host: { class: 'glyphs', '[class.is-interactive]': 'interactive()' },
})
export class Glyphs {
  readonly specimen = input.required<Specimen>();
  /** Width over height of the canvas. */
  readonly ratio = input(1);
  /** What the drawing shows, for screen readers. */
  readonly label = input.required<string>();
  readonly showReadout = input(true);
  /** Taps and arrow keys reach the specimen. */
  readonly interactive = input(false);

  protected readonly readout = signal('');
  protected pointer: Pointer | null = null;

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private grid: GlyphGrid = newGrid(1, 1);
  private tones: string[] = [];
  private size = { w: 0, h: 0 };
  private start = 0;
  private raf = 0;
  private frameNo = 0;
  private visible = false;
  private settled = false;
  private readonly reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');
      this.readTones();

      let lastWidth = 0;
      const resize = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        if (!width || width === lastWidth) return;
        lastWidth = width;
        requestAnimationFrame(() => this.resize(width));
      });
      resize.observe(this.host);

      const view = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) {
          if (!this.start) this.start = performance.now();
          this.loop();
        } else {
          cancelAnimationFrame(this.raf);
          this.raf = 0;
          this.specimen().sleep?.();
        }
      });
      view.observe(canvas);

      // The faces load with the page; draw again once they have, so no
      // specimen is left set in a fallback face.
      document.fonts?.ready.then(() => this.draw(this.now()));

      destroyRef.onDestroy(() => {
        resize.disconnect();
        view.disconnect();
        cancelAnimationFrame(this.raf);
        this.specimen().sleep?.();
      });
    });
  }

  protected move(event: PointerEvent): void {
    const cell = this.cellAt(event);
    this.pointer = cell;
    if (!this.raf && this.visible) this.loop();
  }

  protected tap(event: MouseEvent): void {
    if (!this.interactive()) return;
    const cell = this.cellAt(event);
    if (cell && this.specimen().tap?.(cell.col, cell.row)) this.wake();
  }

  protected key(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = step[event.key];
    if (!move) return;
    event.preventDefault();
    if (this.specimen().key?.(move[0], move[1])) this.wake();
  }

  private wake(): void {
    this.settled = false;
    if (!this.raf && this.visible) this.loop();
    else this.draw(this.now());
  }

  private now(): number {
    if (this.reduced) return Infinity;
    return this.start ? performance.now() - this.start : 0;
  }

  private cellAt(event: MouseEvent): Pointer | null {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const f = this.specimen().font;
    const col = Math.floor((event.clientX - rect.left) / f.cellWidth);
    const row = Math.floor((event.clientY - rect.top) / f.lineHeight);
    if (col < 0 || row < 0 || col >= this.grid.cols || row >= this.grid.rows) return null;
    return { col, row };
  }

  private readTones(): void {
    const style = getComputedStyle(this.host);
    this.tones = TONES.map((name) => style.getPropertyValue(name).trim() || '#ebe5cc');
  }

  private resize(width: number): void {
    const canvas = this.canvasRef().nativeElement;
    const height = Math.round(width / this.ratio());
    const f = this.specimen().font;
    const cols = Math.max(8, Math.floor(width / f.cellWidth));
    const rows = Math.max(8, Math.floor(height / f.lineHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = { w: width, h: height };
    if (cols !== this.grid.cols || rows !== this.grid.rows) {
      this.grid = newGrid(cols, rows);
      this.specimen().setup(cols, rows);
    }
    this.readTones();
    this.draw(this.now());
  }

  private loop(): void {
    if (this.raf) return;
    const frame = () => {
      this.raf = 0;
      if (!this.visible) return;
      this.frameNo++;
      // Once settled, redraw only every few frames: the shimmer does not
      // need sixty, and the page has other work.
      if (!this.settled || this.pointer || this.frameNo % IDLE_EVERY === 0) this.draw(this.now());
      if (!this.reduced) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private draw(t: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.size.w) return;
    const grid = this.grid;
    const specimen = this.specimen();
    const animating = specimen.frame(grid, t, this.pointer);
    const text = specimen.readout();
    if (text !== this.readout()) this.readout.set(text);
    this.settled = !animating && t > REVEAL_MS;

    const f = specimen.font;
    ctx.clearRect(0, 0, this.size.w, this.size.h);
    ctx.font = `${f.weight ?? 400} ${f.size}px ${f.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const reveal = t === Infinity ? 1 : Math.min(1, t / REVEAL_MS);
    const tick = Math.floor(t / 90);
    const p = this.pointer;
    let tone = -1;

    for (let i = 0; i < grid.char.length; i++) {
      let ch = grid.char[i];
      let a = grid.alpha[i];
      if (!ch || a <= 0.01) continue;
      const col = i % grid.cols;
      const row = (i / grid.cols) | 0;

      // Still settling: a scrambled glyph, fainter, until its turn comes.
      const h = hash(col, row);
      if (reveal < 1 && h > reveal) {
        if (h - reveal > 0.35) continue;
        ch = SCRAMBLE[Math.floor(hash(i, tick) * SCRAMBLE.length)];
        a *= 0.55;
      } else if (t !== Infinity && hash(i, tick) > 0.997) {
        // The shimmer: one cell in a few hundred flickers each tick.
        ch = SCRAMBLE[Math.floor(hash(tick, i) * SCRAMBLE.length)];
      }

      // The pointer's wind.
      if (p) {
        const d = Math.hypot((col - p.col) * 0.6, row - p.row);
        if (d < STIR && hash(i, tick + 7) > d / STIR) {
          ch = SCRAMBLE[Math.floor(hash(i, tick + 3) * SCRAMBLE.length)];
          a = Math.min(1, a + 0.35);
        }
      }

      if (grid.tone[i] !== tone) {
        tone = grid.tone[i];
        ctx.fillStyle = this.tones[tone] ?? this.tones[0];
      }
      ctx.globalAlpha = a;
      ctx.fillText(ch, (col + 0.5) * f.cellWidth, (row + 0.5) * f.lineHeight);
    }
    ctx.globalAlpha = 1;
  }
}
