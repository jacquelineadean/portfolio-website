import { between, rng, seedFrom } from '../art/rng';

/**
 * Grid search for the pathfinding lab on the home page.
 *
 * Three best-first searches that differ only in how they rank the frontier:
 *   Dijkstra  ranks by g, the cost paid so far.
 *   A*        ranks by g + h, where h is the Manhattan distance to the goal.
 *   Greedy    ranks by h alone.
 *
 * Every cell costs 1 to enter except slow ground, which costs SLOW_COST. With
 * 4-way moves and a minimum step cost of 1, Manhattan distance never
 * overestimates the remaining cost, so A* returns the same cost as Dijkstra.
 * Greedy has no such guarantee, and the lab shows by how much it misses.
 *
 * Pure functions of their inputs: the component animates the recorded order.
 */

export type Algorithm = 'dijkstra' | 'astar' | 'greedy';

export const WALL = 0;
export const OPEN_COST = 1;
export const SLOW_COST = 5;

export interface Grid {
  cols: number;
  rows: number;
  /** Cost to enter each cell, row-major. WALL marks a cell that cannot be entered. */
  cost: Uint8Array;
  start: number;
  goal: number;
}

export interface SearchResult {
  /** Cells in the order they were expanded (popped and closed). */
  order: number[];
  /** Position in `order` when each cell first joined the frontier; -1 if never. */
  pushedAt: Int32Array;
  /** Position of each cell in `order`; -1 if never expanded. */
  expandedAt: Int32Array;
  /** start to goal inclusive; empty when the goal cannot be reached. */
  path: number[];
  /** Sum of entry costs along `path`; Infinity when unreachable. */
  cost: number;
  /** Cheapest known cost from the start to each cell when the search stopped. */
  g: Float64Array;
}

export function manhattan(grid: Grid, a: number, b: number): number {
  const ax = a % grid.cols;
  const ay = (a / grid.cols) | 0;
  const bx = b % grid.cols;
  const by = (b / grid.cols) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function neighbours(grid: Grid, cell: number): number[] {
  const x = cell % grid.cols;
  const y = (cell / grid.cols) | 0;
  const out: number[] = [];
  if (x > 0) out.push(cell - 1);
  if (x < grid.cols - 1) out.push(cell + 1);
  if (y > 0) out.push(cell - grid.cols);
  if (y < grid.rows - 1) out.push(cell + grid.cols);
  return out;
}

export function search(grid: Grid, algorithm: Algorithm): SearchResult {
  const n = grid.cols * grid.rows;
  const g = new Float64Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const pushedAt = new Int32Array(n).fill(-1);
  const expandedAt = new Int32Array(n).fill(-1);
  const order: number[] = [];
  const heap = new MinHeap();

  // Ties: A* and greedy prefer the cell nearer the goal, which keeps A* from
  // fanning out across equal-cost cells. The sequence number breaks remaining
  // ties first in, first out, so Dijkstra's wavefront grows evenly.
  let seq = 0;
  const rank = (cell: number): [number, number] => {
    const h = manhattan(grid, cell, grid.goal);
    if (algorithm === 'dijkstra') return [g[cell], 0];
    if (algorithm === 'astar') return [g[cell] + h, h];
    return [h, 0];
  };

  g[grid.start] = 0;
  pushedAt[grid.start] = 0;
  heap.push(...rank(grid.start), seq++, grid.start);

  while (heap.size) {
    const cell = heap.pop();
    if (closed[cell]) continue;
    closed[cell] = 1;
    expandedAt[cell] = order.length;
    order.push(cell);
    if (cell === grid.goal) break;

    for (const next of neighbours(grid, cell)) {
      const step = grid.cost[next];
      if (step === WALL || closed[next]) continue;
      const candidate = g[cell] + step;
      if (candidate < g[next]) {
        g[next] = candidate;
        parent[next] = cell;
        if (pushedAt[next] < 0) pushedAt[next] = order.length;
        heap.push(...rank(next), seq++, next);
      }
    }
  }

  const path: number[] = [];
  if (closed[grid.goal]) {
    for (let c = grid.goal; c !== -1; c = parent[c]) path.push(c);
    path.reverse();
  }

  return {
    order,
    pushedAt,
    expandedAt,
    path,
    cost: path.length ? g[grid.goal] : Infinity,
    g,
  };
}

/**
 * A map with wall segments and patches of slow ground. Regenerates with a
 * derived seed until the goal is reachable, so a fresh map always has a path.
 */
export function makeGrid(cols: number, rows: number, seed: string): Grid {
  for (let attempt = 0; attempt < 20; attempt++) {
    const grid = draft(cols, rows, `${seed}:${attempt}`);
    if (reachable(grid, grid.start)[grid.goal]) return grid;
  }
  // Twenty walled-in drafts in a row would take a pathological size; an empty
  // field is still a valid map.
  const cost = new Uint8Array(cols * rows).fill(OPEN_COST);
  const mid = (rows / 2) | 0;
  return { cols, rows, cost, start: mid * cols + 1, goal: mid * cols + cols - 2 };
}

/** Flood fill from `from`: which cells a search starting there can ever reach. */
export function reachable(grid: Grid, from: number): Uint8Array {
  const seen = new Uint8Array(grid.cols * grid.rows);
  const stack = [from];
  seen[from] = 1;
  while (stack.length) {
    const cell = stack.pop()!;
    for (const next of neighbours(grid, cell)) {
      if (!seen[next] && grid.cost[next] !== WALL) {
        seen[next] = 1;
        stack.push(next);
      }
    }
  }
  return seen;
}

function draft(cols: number, rows: number, seed: string): Grid {
  const rand = rng(seedFrom(seed));
  const n = cols * rows;
  const cost = new Uint8Array(n).fill(OPEN_COST);
  const at = (x: number, y: number) => y * cols + x;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;

  // Slow ground: a few lumpy patches, so the cheapest path has a reason to bend.
  const patches = Math.max(2, Math.round(n / 210));
  for (let p = 0; p < patches; p++) {
    const cx = between(rand, cols * 0.15, cols * 0.85);
    const cy = between(rand, 0, rows);
    const radius = between(rand, 2, Math.max(3, Math.min(cols, rows) * 0.2));
    for (let y = Math.floor(cy - radius - 1); y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius - 1); x <= cx + radius + 1; x++) {
        if (!inBounds(x, y)) continue;
        const d = Math.hypot(x - cx, (y - cy) * 1.2);
        if (d < radius * between(rand, 0.75, 1.15)) cost[at(x, y)] = SLOW_COST;
      }
    }
  }

  // Walls: straight runs and L-bends, about a fifth of the cells.
  const target = n * 0.2;
  let walls = 0;
  while (walls < target) {
    let x = Math.floor(between(rand, 0, cols));
    let y = Math.floor(between(rand, 0, rows));
    let horizontal = rand() < 0.5;
    const legs = rand() < 0.35 ? 2 : 1;
    for (let leg = 0; leg < legs; leg++) {
      const length = Math.floor(between(rand, 3, 9));
      const dir = rand() < 0.5 ? -1 : 1;
      for (let i = 0; i < length; i++) {
        if (inBounds(x, y) && cost[at(x, y)] !== WALL) {
          cost[at(x, y)] = WALL;
          walls++;
        }
        if (horizontal) x += dir;
        else y += dir;
      }
      horizontal = !horizontal;
    }
  }

  const start = at(1 + Math.floor(rand() * 2), Math.floor(between(rand, rows * 0.25, rows * 0.75)));
  const goal = at(cols - 2 - Math.floor(rand() * 2), Math.floor(between(rand, 0, rows)));

  // Clear a little room around both ends so neither starts boxed in.
  for (const end of [start, goal]) {
    const ex = end % cols;
    const ey = (end / cols) | 0;
    for (let y = ey - 1; y <= ey + 1; y++) {
      for (let x = ex - 1; x <= ex + 1; x++) {
        if (inBounds(x, y)) cost[at(x, y)] = OPEN_COST;
      }
    }
  }

  return { cols, rows, cost, start, goal };
}

/** Binary min-heap ordered by (k1, k2, k3); carries a cell index as payload. */
class MinHeap {
  private keys: number[][] = [];

  get size(): number {
    return this.keys.length;
  }

  push(k1: number, k2: number, k3: number, cell: number): void {
    const item = [k1, k2, k3, cell];
    const a = this.keys;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  pop(): number {
    const a = this.keys;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && less(a[l], a[m])) m = l;
        if (r < a.length && less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top[3];
  }
}

function less(a: number[], b: number[]): boolean {
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}
