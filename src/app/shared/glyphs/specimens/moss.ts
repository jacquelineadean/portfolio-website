import {
  Algorithm,
  Grid,
  SLOW_COST,
  SearchResult,
  WALL,
  makeGrid,
  search,
} from '../../labs/pathfinding';
import { GlyphGrid, Pointer, Specimen, Tone, bit, bits, clear, hash } from '../grid';

/**
 * Milliseconds a search would take to expand every cell of the map. The rate
 * is fixed per map, so the time a search takes on screen is its work: A*
 * finishes sooner than Dijkstra because it expands fewer cells.
 */
const SWEEP_MS = 4500;
const PATH_MS = 1100;
const GAP_MS = 2600;
const ORDER: Algorithm[] = ['dijkstra', 'astar', 'greedy'];
const NAMES: Record<Algorithm, string> = {
  dijkstra: 'Dijkstra',
  astar: 'A*',
  greedy: 'Greedy best-first',
};
/**
 * What each path is written in: the bits of the source key the Algorithm
 * Visualizer's pathfinding traces cite (pathfinding/sources.js) for
 * Dijkstra's paper and Hart, Nilsson and Raphael's A* paper. Greedy
 * best-first is spelled plainly.
 */
const SPELL: Record<Algorithm, string> = {
  dijkstra: bits('DIJKSTRA59 '),
  astar: bits('HNR68 '),
  greedy: bits('BEST-FIRST '),
};

/**
 * The Algorithm Visualizer's specimen: the site's own grid search, run live
 * and drawn in bits. Each map cell is two bits wide, so the map's cells are
 * near square. Expanded cells spread from the start like moss, each showing
 * its distance from the start in binary, so rings of equal cost show as
 * bands; the path, once found, is written in the bits of the source its
 * trace cites. Dijkstra, A* and greedy take turns on one map, then the
 * map changes. A tap moves the goal.
 */
export class Moss implements Specimen {
  readonly font = { family: "'DM Mono', monospace", size: 11, cellWidth: 6.8, lineHeight: 13 };

  private cols = 0;
  private rows = 0;
  private map: Grid | null = null;
  private result: SearchResult | null = null;
  private optimal = 0;
  private algo: Algorithm = 'dijkstra';
  private mapNo = 0;
  private rate = 0.1;
  private runStart = 0;
  private touring = true;
  private now = 0;
  private shown = 0;

  setup(cols: number, rows: number): void {
    this.cols = Math.max(4, Math.floor(cols / 2));
    this.rows = rows;
    this.newMap();
  }

  frame(grid: GlyphGrid, t: number, _pointer: Pointer | null): boolean {
    const map = this.map;
    const r = this.result;
    clear(grid);
    if (!map || !r) return false;
    this.now = t;
    const elapsed = t === Infinity ? Infinity : t - this.runStart;
    const total = r.order.length;
    const shown = Math.min(total, Math.floor(elapsed * this.rate));
    this.shown = shown;
    const done = shown >= total;
    const pathT = done ? Math.min(1, (elapsed - total / this.rate) / PATH_MS) : 0;

    // Advance the tour: the next search after a pause, a new map after three.
    if (
      t !== Infinity &&
      this.touring &&
      pathT >= 1 &&
      elapsed - total / this.rate - PATH_MS > GAP_MS
    ) {
      const next = ORDER[(ORDER.indexOf(this.algo) + 1) % ORDER.length];
      if (next === 'dijkstra') this.newMap();
      this.algo = next;
      this.solve(t);
      return this.frame(grid, t, _pointer);
    }

    const put = (cell: number, text: string, alpha: number, tone: number) => {
      const col = (cell % this.cols) * 2;
      const row = (cell / this.cols) | 0;
      for (let k = 0; k < 2 && k < text.length; k++) {
        const i = row * grid.cols + col + k;
        if (col + k >= grid.cols || text[k] === ' ') continue;
        grid.char[i] = text[k];
        grid.alpha[i] = alpha;
        grid.tone[i] = tone;
      }
    };

    // The ground: walls as faint bits, slow ground as scattered gold ones,
    // open ground left dark, so the search shows as it spreads across it.
    for (let c = 0; c < map.cost.length; c++) {
      if (map.cost[c] === WALL) put(c, bit(c, 0) + bit(c, 1), 0.13, Tone.Muted);
      else if (map.cost[c] === SLOW_COST) put(c, hash(c) > 0.6 ? '1 ' : ' 0', 0.28, Tone.Gold);
    }

    // The search, ring by ring; the newest cells brightest. Each cell shows
    // two bits of its distance from the start, in steps of three.
    for (let k = 0; k < shown; k++) {
      const c = r.order[k];
      const age = elapsed - k / this.rate;
      const fresh = Math.max(0, 1 - age / 1200);
      const ring = (Math.floor(r.g[c] / 3) & 3).toString(2).padStart(2, '0');
      put(c, ring, 0.32 + 0.6 * fresh, map.cost[c] === SLOW_COST ? Tone.Gold : Tone.Lichen);
    }
    if (!done) {
      for (let c = 0; c < map.cost.length; c++) {
        const pushed = r.pushedAt[c];
        const expanded = r.expandedAt[c];
        if (pushed >= 0 && pushed <= shown && (expanded < 0 || expanded >= shown))
          put(c, '11', 0.85, Tone.Ink);
      }
    }

    // The path, in the bits of the source its trace cites, from the start.
    if (pathT > 0) {
      const spell = SPELL[this.algo];
      const upto = Math.ceil(r.path.length * pathT);
      for (let k = 0; k < upto; k++) {
        const a = spell[(k * 2) % spell.length];
        const b = spell[(k * 2 + 1) % spell.length];
        put(r.path[k], a + b, 1, Tone.Gold);
      }
    }
    put(map.start, '11', 1, Tone.Mist);
    put(map.goal, '11', 1, Tone.Rust);
    return !done || pathT < 1 || this.touring;
  }

  readout(): string {
    const r = this.result;
    if (!r) return '';
    const head = `${NAMES[this.algo]} · ${this.shown.toLocaleString('en-US')} cells expanded`;
    if (this.shown < r.order.length) return head;
    if (!r.path.length) return `${head} · the goal is walled in`;
    const over = Math.round(((r.cost - this.optimal) / this.optimal) * 100);
    return `${head} · path cost ${r.cost}${over > 0 ? `, ${over}% over the cheapest` : ''}`;
  }

  tap(col: number, row: number): boolean {
    const map = this.map;
    if (!map) return false;
    const cell = row * this.cols + Math.floor(col / 2);
    if (map.cost[cell] === WALL || cell === map.start) return false;
    this.touring = false;
    this.map = { ...map, goal: cell };
    this.solve(this.now);
    return true;
  }

  key(dx: number, dy: number): boolean {
    const map = this.map;
    if (!map) return false;
    let x = map.goal % this.cols;
    let y = (map.goal / this.cols) | 0;
    for (;;) {
      x += dx;
      y += dy;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return false;
      if (map.cost[y * this.cols + x] !== WALL) return this.tap(x * 2, y);
    }
  }

  private newMap(): void {
    this.map = makeGrid(this.cols, this.rows, `moss-${this.mapNo++}`);
    this.rate = this.map.cost.length / SWEEP_MS;
    this.solve(this.now);
  }

  private solve(t: number): void {
    if (!this.map) return;
    this.result = search(this.map, this.algo);
    this.optimal = search(this.map, 'dijkstra').cost;
    this.runStart = t === Infinity ? 0 : t;
  }
}
