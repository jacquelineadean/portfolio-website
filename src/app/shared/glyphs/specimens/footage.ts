import { GlyphGrid, Pointer, Specimen, Tone, clear, dither } from '../grid';

export interface FootageSource {
  /** A recording: the path without its extension; .webm and .mp4 sit beside it. */
  video?: string;
  /** A still: the first frame of the recording, or a picture on its own. */
  poster: string;
  /** Dark marks on a light ground (an app's page, a painting) draw as dense bits. */
  light: boolean;
}

/** Cells lighter than this (or darker, on a dark ground) stay blank. */
const FLOOR = 0.14;

/**
 * Real footage drawn in binary: a recording of an app, or a picture, sampled
 * one pixel per cell. Each cell's brightness sets its opacity and dithers it
 * between 0 and 1; its hue picks a tone, so a blue search frontier stays blue and an
 * orange path stays orange. A recording plays while it is on screen and
 * holds still when it is not; under reduced motion only the still is drawn.
 */
export class Footage implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 8, cellWidth: 5, lineHeight: 8 };

  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private readonly still = new Image();
  private video: HTMLVideoElement | null = null;
  private cols = 0;
  private rows = 0;

  constructor(private readonly source: FootageSource) {
    this.still.decoding = 'async';
    this.still.src = source.poster;
  }

  setup(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.canvas.width = cols;
    this.canvas.height = rows;
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    clear(grid);
    const frame = this.frameSource(t);
    if (!frame) return true;
    const { cols, rows, ctx } = this;
    ctx.clearRect(0, 0, cols, rows);
    // Cover the grid, cropping whichever way the source is wider.
    const sw = frame.width;
    const sh = frame.height;
    if (!sw || !sh) return true;
    const cellAspect = this.font.lineHeight / this.font.cellWidth;
    const scale = Math.max(cols / sw, (rows * cellAspect) / sh);
    const dw = sw * scale;
    const dh = (sh * scale) / cellAspect;
    ctx.drawImage(frame.el, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    const data = ctx.getImageData(0, 0, cols, rows).data;

    for (let i = 0; i < cols * rows; i++) {
      const r = data[i * 4] / 255;
      const g = data[i * 4 + 1] / 255;
      const b = data[i * 4 + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const density = this.source.light ? 1 - lum : lum;
      if (density < FLOOR) continue;
      grid.char[i] = dither(density, i % cols, (i / cols) | 0);
      grid.alpha[i] = Math.min(1, 0.25 + density * 0.85);
      grid.tone[i] = toneOf(r, g, b, max, min);
    }
    return false;
  }

  readout(): string {
    return '';
  }

  /** Pause off screen; the component calls this when the canvas leaves view. */
  sleep(): void {
    this.video?.pause();
  }

  private frameSource(t: number): { el: CanvasImageSource; width: number; height: number } | null {
    if (this.source.video && t !== Infinity) {
      const video = this.video ?? this.makeVideo(this.source.video);
      if (video.paused) video.play().catch(() => {});
      if (video.readyState >= 2)
        return { el: video, width: video.videoWidth, height: video.videoHeight };
    }
    if (this.still.complete && this.still.naturalWidth) {
      return { el: this.still, width: this.still.naturalWidth, height: this.still.naturalHeight };
    }
    return null;
  }

  private makeVideo(path: string): HTMLVideoElement {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = video.canPlayType('video/webm; codecs="vp9"') ? `${path}.webm` : `${path}.mp4`;
    this.video = video;
    return video;
  }
}

/** A tone for a colour: greys to ink, and hues to the palette's nearest accent. */
function toneOf(r: number, g: number, b: number, max: number, min: number): number {
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.22) return Tone.Ink;
  let hue: number;
  if (max === r) hue = ((g - b) / (max - min)) % 6;
  else if (max === g) hue = (b - r) / (max - min) + 2;
  else hue = (r - g) / (max - min) + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 18 || hue >= 330) return Tone.Rust;
  if (hue < 65) return Tone.Gold;
  if (hue < 170) return Tone.Lichen;
  if (hue < 260) return Tone.Mist;
  return Tone.Lilac;
}
