import { between, rng, seedFrom } from './rng';
import { Pt, blob, inside, sketchLine, smoothPath, wobble } from './sketch';

/**
 * The generated artwork.
 *
 * Each project gets a drawing of the thing it is actually about rather than a
 * decorative texture: a sieve for the algorithm tracer, building footprints
 * under a hazard contour for the exposure model. The two registers are
 * deliberately different — the footprints and the sieve are drawn crisply,
 * because they stand for real data, and the connective marks around them are
 * drawn by hand, because they stand for someone's thinking. Mixing the two is
 * the whole idea.
 */

export type Tone = 'ink' | 'faint' | 'accent';

export interface ArtShape {
  d: string;
  tone: Tone;
  /** Filled rather than stroked. */
  fill?: boolean;
}

export interface Artwork {
  width: number;
  height: number;
  shapes: ArtShape[];
}

export type ArtVariant = 'sieve' | 'footprints' | 'graph';

/**
 * Generating a footprint field is a few hundred rectangles and a point-in-
 * polygon test each; the same drawing appears on a card, in a carousel slot and
 * on the detail page, so the result is kept rather than recomputed per instance.
 * The key is every input, and the inputs are all a drawing has.
 */
const cache = new Map<string, Artwork>();

export function artwork(variant: ArtVariant, seed: string, width: number, height: number): Artwork {
  const cacheKey = `${variant}:${seed}:${width}x${height}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const made = build(variant, `${variant}:${seed}`, width, height);
  cache.set(cacheKey, made);
  return made;
}

/**
 * The random stream is keyed on the project alone, not on the canvas. A card and
 * a banner ask for different sizes, and seeding on the size too would make them
 * unrelated pictures; this way the same draws land in the same relative places
 * and the banner reads as more of the drawing the card showed a corner of.
 */
function build(variant: ArtVariant, stream: string, width: number, height: number): Artwork {
  const rand = rng(seedFrom(stream));
  switch (variant) {
    case 'footprints':
      return { width, height, shapes: footprints(rand, width, height) };
    case 'graph':
      return { width, height, shapes: graph(rand, width, height) };
    default:
      return { width, height, shapes: sieve(rand, width, height) };
  }
}

/* ---------------------------------------------------------------------------
 * Sieve of Eratosthenes
 *
 * Every integer from 2 up is a cell. Composites are struck out by hand and the
 * primes are left standing as solid dots, so the picture is the algorithm's
 * output rather than an illustration of it. Over the top, two of the sieve's
 * passes are drawn as arcs hopping from one multiple to the next — the part
 * that is a procedure rather than a result, and the only part in colour.
 * ------------------------------------------------------------------------- */
function sieve(rand: () => number, width: number, height: number): ArtShape[] {
  const cell = 26;
  const cols = Math.max(4, Math.floor(width / cell));
  const rows = Math.max(3, Math.floor(height / cell));
  const count = cols * rows;
  const offsetX = (width - cols * cell) / 2 + cell / 2;
  const offsetY = (height - rows * cell) / 2 + cell / 2;
  const at = (n: number): Pt => ({
    x: offsetX + ((n - 2) % cols) * cell,
    y: offsetY + Math.floor((n - 2) / cols) * cell,
  });

  const composite = new Uint8Array(count + 2);
  for (let p = 2; p * p < count + 2; p++) {
    if (composite[p]) continue;
    for (let m = p * p; m < count + 2; m += p) composite[m] = 1;
  }

  const shapes: ArtShape[] = [];
  for (let n = 2; n < count + 2; n++) {
    const { x, y } = at(n);
    if (composite[n]) {
      // The lattice stays visible under the strikes: a struck cell is still a
      // number, and without the dot the grid dissolves into hatching.
      shapes.push({ d: circlePath(x, y, 1.1), tone: 'faint', fill: true });
      const angle = between(rand, -0.5, 0.5) + Math.PI / 4;
      const len = between(rand, 5.5, 8);
      shapes.push({
        d: sketchLine(
          { x: x - Math.cos(angle) * len, y: y - Math.sin(angle) * len },
          { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len },
          rand,
          0.5,
        ),
        tone: 'faint',
      });
    } else {
      shapes.push({ d: circlePath(x, y, 3.4), tone: 'ink', fill: true });
    }
  }

  // One pass, counted out by hand and then abandoned — the marks someone makes
  // while working, not a second layer of texture over the whole field. Drawing
  // every hop of every pass buries the result the sieve produced under a weave
  // of arcs, which is the opposite of what the picture is for. A hop that would
  // run off the end of a row is dropped rather than drawn across the wrap,
  // because on paper the counting restarts at the margin.
  const stride = 3;
  // Started a couple of rows in rather than at the first multiple: the arcs bow
  // upward, and a pass along the top row is drawn half outside the tile, which
  // is the one place the crop is guaranteed to cut it.
  const firstOnRow = 2 + Math.min(2, rows - 1) * cols;
  const start = Math.max(stride * stride, Math.ceil(firstOnRow / stride) * stride);
  const row = at(start).y;
  for (let m = start; m + stride < count + 2; m += stride) {
    const from = at(m);
    const to = at(m + stride);
    // One row only. Letting the count run on picks up again part-way along the
    // next line, and two chains starting at different offsets read as two
    // unrelated marks rather than as one pass.
    if (from.y !== row || to.y !== row) break;
    shapes.push({ d: hop(from, to, rand), tone: 'accent' });
  }

  return shapes;
}

/** A shallow arc from one cell to the next multiple, bowed over the top. */
function hop(from: Pt, to: Pt, rand: () => number): string {
  const mid = { x: (from.x + to.x) / 2, y: from.y - Math.abs(to.x - from.x) * 0.42 };
  const points: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const inv = 1 - t;
    points.push({
      x: inv * inv * from.x + 2 * inv * t * mid.x + t * t * to.x,
      y: inv * inv * from.y + 2 * inv * t * mid.y + t * t * to.y,
    });
  }
  const wobbled = wobble(points, rand, 0.5);
  wobbled[0] = points[0];
  wobbled[8] = points[8];
  return smoothPath(wobbled);
}

/* ---------------------------------------------------------------------------
 * Building footprints under a hazard contour
 *
 * Blocks of footprints on a rotated street grid, with a drawn contour over the
 * top; the footprints whose centroid falls inside it are the exposed ones. That
 * join — hazard geometry against a building inventory — is the whole problem
 * the project is about, so it is what the drawing shows.
 * ------------------------------------------------------------------------- */
function footprints(rand: () => number, width: number, height: number): ArtShape[] {
  const shapes: ArtShape[] = [];
  const angle = between(rand, -0.42, -0.24);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = width / 2;
  const cy = height / 2;
  const toCanvas = (u: number, v: number): Pt => ({
    x: cx + u * cos - v * sin,
    y: cy + u * sin + v * cos,
  });

  // Kept near the middle on purpose. The drawing is cropped to whatever box it
  // is placed in, and the exposed cluster is the one thing in the picture that
  // has to survive the crop — an off-centre contour reads as an empty map with
  // a stray red line at the edge.
  const hazard = blob(
    cx + between(rand, -width * 0.05, width * 0.05),
    cy + between(rand, -height * 0.04, height * 0.04),
    Math.min(width, height) * between(rand, 0.42, 0.52),
    rand,
  );

  // Over-cover the canvas: the grid is rotated, so a lattice sized to the
  // viewBox would leave bare wedges in two corners.
  const reach = Math.hypot(width, height) / 2 + 24;
  const blockW = 74;
  const blockH = 46;
  // Wide enough to read as a street. Below about 20 the blocks run together and
  // the field loses the thing that makes it a city rather than a texture.
  const street = 22;

  for (let u = -reach; u < reach; u += blockW + street) {
    for (let v = -reach; v < reach; v += blockH + street) {
      let rowY = v;
      while (rowY < v + blockH) {
        const depth = between(rand, 5, 10);
        let colX = u;
        while (colX < u + blockW) {
          const w = between(rand, 6, 15);
          if (rand() > 0.18) {
            const centre = toCanvas(colX + w / 2, rowY + depth / 2);
            if (centre.x > -8 && centre.x < width + 8 && centre.y > -8 && centre.y < height + 8) {
              const exposed = inside(centre, hazard.polygon);
              shapes.push({
                d: quadPath([
                  toCanvas(colX, rowY),
                  toCanvas(colX + w, rowY),
                  toCanvas(colX + w, rowY + depth),
                  toCanvas(colX, rowY + depth),
                ]),
                tone: exposed ? 'accent' : 'ink',
                fill: exposed,
              });
            }
          }
          colX += w + between(rand, 2, 4.5);
        }
        rowY += depth + between(rand, 2.5, 5);
      }
    }
  }

  shapes.push({ d: hazard.path, tone: 'accent' });
  return shapes;
}

/* ---------------------------------------------------------------------------
 * Shortest path over a weighted mesh
 *
 * The generic drawing, used by any project that has not asked for its own. The
 * highlighted route is a real Dijkstra run over the generated weights, not a
 * line picked because it looked good.
 * ------------------------------------------------------------------------- */
function graph(rand: () => number, width: number, height: number): ArtShape[] {
  const cols = Math.max(4, Math.round(width / 62));
  const rows = Math.max(3, Math.round(height / 52));
  const stepX = width / (cols - 1);
  const stepY = height / (rows - 1);

  const nodes: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        x: c * stepX + between(rand, -stepX * 0.22, stepX * 0.22),
        y: r * stepY + between(rand, -stepY * 0.22, stepY * 0.22),
      });
    }
  }

  const at = (r: number, c: number) => r * cols + c;
  const edges: [number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push([at(r, c), at(r, c + 1), between(rand, 1, 9)]);
      if (r + 1 < rows) edges.push([at(r, c), at(r + 1, c), between(rand, 1, 9)]);
    }
  }

  const path = new Set<string>();
  for (const node of dijkstra(nodes.length, edges, at(0, 0), at(rows - 1, cols - 1))) {
    path.add(node);
  }

  const shapes: ArtShape[] = [];
  for (const [a, b] of edges) {
    const onRoute = path.has(key(a, b));
    shapes.push({
      d: sketchLine(nodes[a], nodes[b], rand, onRoute ? 0.6 : 1.1),
      tone: onRoute ? 'accent' : 'faint',
    });
  }
  for (const node of nodes) {
    shapes.push({ d: circlePath(node.x, node.y, 2.4), tone: 'ink', fill: true });
  }
  return shapes;
}

/** Returns the edge keys on the shortest route, or an empty list if none. */
function dijkstra(
  size: number,
  edges: [number, number, number][],
  from: number,
  to: number,
): string[] {
  const adjacency: [number, number][][] = Array.from({ length: size }, () => []);
  for (const [a, b, w] of edges) {
    adjacency[a].push([b, w]);
    adjacency[b].push([a, w]);
  }

  const dist = new Array<number>(size).fill(Infinity);
  const prev = new Array<number>(size).fill(-1);
  const done = new Array<boolean>(size).fill(false);
  dist[from] = 0;

  // A linear scan for the minimum rather than a heap: the mesh is a few hundred
  // nodes at most, and this runs once per drawing.
  for (;;) {
    let best = -1;
    for (let i = 0; i < size; i++) {
      if (!done[i] && dist[i] < Infinity && (best === -1 || dist[i] < dist[best])) best = i;
    }
    if (best === -1 || best === to) break;
    done[best] = true;
    for (const [next, weight] of adjacency[best]) {
      if (dist[best] + weight < dist[next]) {
        dist[next] = dist[best] + weight;
        prev[next] = best;
      }
    }
  }

  const route: string[] = [];
  for (let node = to; prev[node] !== -1; node = prev[node]) {
    route.push(key(node, prev[node]));
  }
  return route;
}

/** Undirected, so both orderings have to hash the same. */
function key(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function quadPath(points: Pt[]): string {
  return `${points.map((p, i) => `${i ? 'L' : 'M'}${r2(p.x)} ${r2(p.y)}`).join('')}Z`;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${r2(cx - r)} ${r2(cy)}a${r} ${r} 0 1 0 ${r2(r * 2)} 0a${r} ${r} 0 1 0 ${r2(-r * 2)} 0Z`;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
