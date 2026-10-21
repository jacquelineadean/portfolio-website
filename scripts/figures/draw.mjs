import {
  rng,
  seedFrom,
  sketchArrowHead,
  sketchCurve,
  sketchLine,
  sketchRect,
  smoothPath,
} from './sketch.mjs';

/** The site's palette (src/styles/_variables.scss), for fills the drawings set directly. */
export const C = {
  ink: '#1f1e1a',
  soft: '#47463f',
  muted: '#6e6b61',
  card: '#fffdf9',
  paper: '#f7f5f0',
  blue: '#4285f4',
  red: '#ea4335',
  yellow: '#f9ab00',
  green: '#34a853',
  purple: '#a142f4',
  tint: {
    blue: '#e4edfd',
    red: '#fce5e1',
    yellow: '#fdf0d3',
    green: '#e1f2e6',
    purple: '#efe3fd',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => Math.round(v * 100) / 100;

/**
 * One drawing in chronicle's diagram format.
 *
 * chronicle styles every <text> at 15px and ignores a font-size attribute, so
 * larger or smaller type is a scale transform around the text's anchor point.
 * Strokes carry their colour as attributes and no class, so chronicle's own
 * `.line` and `.box` rules never restyle them and `draw` can stroke them on.
 */
export class Drawing {
  constructor(seed, width, height) {
    this.rand = rng(seedFrom(seed));
    this.width = width;
    this.height = height;
  }

  svg(body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}">\n${body}\n</svg>\n`;
  }

  /** Text at (x, y). `s` scales it from 15px; `cls` takes chronicle colour classes such as f-muted. */
  text(x, y, str, { s = 1, w, cls, a = 'middle' } = {}) {
    const attrs = [`text-anchor="${a}"`];
    if (w) attrs.push(`font-weight="${w}"`);
    if (cls) attrs.push(`class="${cls}"`);
    if (s === 1) return `<text x="${n(x)}" y="${n(y)}" ${attrs.join(' ')}>${esc(str)}</text>`;
    return `<text transform="translate(${n(x)} ${n(y)}) scale(${s})" x="0" y="0" ${attrs.join(' ')}>${esc(str)}</text>`;
  }

  strokes(paths, { color = C.ink, width = 1.6, dash } = {}) {
    const extra = dash ? ` stroke-dasharray="${dash}"` : '';
    return paths
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`,
      )
      .join('');
  }

  fill(x, y, w, h, color, rx = 10) {
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}" fill="${color}"/>`;
  }

  /** A drawn box: a tinted fill under four overshooting strokes. */
  rect(
    x,
    y,
    w,
    h,
    { tint = C.card, color = C.ink, width = 1.6, rx = 10, dash, amount = 0.9 } = {},
  ) {
    const paths = sketchRect(x, y, w, h, this.rand, amount);
    return this.fill(x, y, w, h, tint, rx) + this.strokes(paths, { color, width, dash });
  }

  /** A pill: a rounded fill with a sketched outline and one centred label. */
  pill(x, y, w, h, label, { tint = C.card, color = C.ink, s = 0.95, w: weight, cls, dot } = {}) {
    let out = this.rect(x, y, w, h, { tint, color, rx: h / 2, width: 1.3, amount: 0.6 });
    const cy = y + h / 2 + 5 * s;
    if (dot) {
      out += `<circle cx="${n(x + 18)}" cy="${n(y + h / 2)}" r="5" fill="${dot}"/>`;
      out += this.text(x + 32, cy, label, { s, w: weight, cls, a: 'start' });
    } else {
      out += this.text(x + w / 2, cy, label, { s, w: weight, cls });
    }
    return out;
  }

  /** A box with a bold title and muted lines under it, centred. */
  box(x, y, w, h, title, lines = [], { tint, color, s = 1.15, gap = 22 } = {}) {
    const block = 20 * s + lines.length * gap;
    let ty = y + h / 2 - block / 2 + 15 * s;
    let out = this.rect(x, y, w, h, { tint, color });
    out += this.text(x + w / 2, ty, title, { s, w: 600 });
    lines.forEach((line, i) => {
      out += this.text(x + w / 2, ty + 8 + (i + 1) * gap, line, { s: 0.92, cls: 'f-muted' });
    });
    return out;
  }

  /**
   * An arrow along `points`, drawn in the direction of travel so a chronicle
   * flow can run a packet along it. Returns the group; the path inside has
   * `id` and the group `g-<id>`.
   */
  arrow(id, points, { color = C.soft, width = 1.6, dash, head = true, wobble = 0.6 } = {}) {
    const d =
      points.length === 2
        ? sketchLine(points[0], points[1], this.rand, wobble)
        : points.length > 2 && wobble === 0
          ? smoothPath(points)
          : sketchCurve(densify(points), this.rand, wobble);
    const extra = dash ? ` stroke-dasharray="${dash}"` : '';
    let out = `<path id="${id}" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;
    if (head) {
      const tip = points[points.length - 1];
      const tail = tailOf(points);
      out += this.strokes(sketchArrowHead(tip, tail, this.rand, 10, 0.5), { color, width });
    }
    return group(`g-${id}`, out);
  }

  /** A hand-drawn tick. */
  tick(x, y, size = 12, color = C.green) {
    return this.strokes(
      [
        sketchLine(
          { x: x - size * 0.6, y },
          { x: x - size * 0.15, y: y + size * 0.5 },
          this.rand,
          0.4,
        ),
        sketchLine(
          { x: x - size * 0.15, y: y + size * 0.5 },
          { x: x + size * 0.7, y: y - size * 0.6 },
          this.rand,
          0.4,
        ),
      ],
      { color, width: 2.6 },
    );
  }

  /** A hand-drawn cross. */
  cross(x, y, size = 12, color = C.red) {
    return this.strokes(
      [
        sketchLine({ x: x - size, y: y - size }, { x: x + size, y: y + size }, this.rand, 0.6),
        sketchLine({ x: x + size, y: y - size }, { x: x - size, y: y + size }, this.rand, 0.6),
      ],
      { color, width: 2.8 },
    );
  }

  circle(cx, cy, r, { fill = C.card, color = C.ink, width = 1.5 } = {}) {
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${width}"/>`;
  }

  line(a, b, opts = {}) {
    return this.strokes([sketchLine(a, b, this.rand, opts.amount ?? 0.7)], opts);
  }

  curve(points, opts = {}) {
    return this.strokes([sketchCurve(points, this.rand, opts.amount ?? 0.5)], opts);
  }
}

export function group(id, body) {
  return `<g id="${id}">${body}</g>`;
}

/** Sample points along a polyline so the wobble reads as one continuous line. */
function densify(points, step = 26) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const parts = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= parts; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / parts, y: a.y + ((b.y - a.y) * k) / parts });
    }
  }
  return out;
}

function tailOf(points) {
  const tip = points[points.length - 1];
  const prev = points[points.length - 2];
  const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
  // Aim the head along the last 12 units of travel, not the whole last segment,
  // so a curve's head follows the curve.
  const k = Math.min(1, 12 / len);
  return { x: tip.x - (tip.x - prev.x) * k, y: tip.y - (tip.y - prev.y) * k };
}
