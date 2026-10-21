import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rng, seedFrom } from '../../../art/rng';
import { Pt, smoothPath, wobble } from '../../../art/sketch';
import {
  Algorithm,
  Grid,
  SLOW_COST,
  SearchResult,
  WALL,
  makeGrid,
  reachable,
  search,
} from '../../../labs/pathfinding';

interface AlgorithmInfo {
  id: Algorithm;
  label: string;
  name: string;
  /** CSS custom property the expanded cells are drawn in. */
  color: string;
}

const ALGORITHMS: AlgorithmInfo[] = [
  { id: 'dijkstra', label: 'Dijkstra', name: 'Dijkstra', color: '--color-blue' },
  { id: 'astar', label: 'A*', name: 'A*', color: '--color-green' },
  { id: 'greedy', label: 'Greedy', name: 'Greedy best-first', color: '--color-purple' },
];

/** Expansions drawn per millisecond. A constant rate makes work visible as time. */
const RATE = 0.3;
const PATH_MS = 750;
/** Width of one contour band, in path cost. */
const BAND = 8;
/** Pause between autoplay runs, after a run finishes. */
const AUTOPLAY_GAP_MS = 2400;

interface Layout {
  cell: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
  ox: number;
  oy: number;
}

/**
 * The home page's lab: three best-first searches on one map.
 *
 * Expansions are drawn at a fixed rate, so the time a search takes on screen is
 * proportional to the cells it expands. Until someone touches it, the lab runs
 * Dijkstra, A* and greedy in turn on the same goal, then moves the goal.
 * Drawn on a canvas: about a thousand cells change every frame.
 */
@Component({
  selector: 'app-pathfinder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-plate pf-plate" #plate>
      <canvas
        #canvas
        tabindex="0"
        role="img"
        [attr.aria-label]="label()"
        (click)="onClick($event)"
        (keydown)="onKey($event)"
      ></canvas>
    </div>

    <!-- Four parts placed by grid area: on a phone the numbers come straight
         after the controls; on a wide screen they take the right column. -->
    <div class="pf-below">
      <div class="pf-controls">
        <div class="lab-controls">
          <div class="lab-seg" role="group" aria-label="Search algorithm">
            @for (a of algorithms; track a.id) {
              <button type="button" [attr.aria-pressed]="algo() === a.id" (click)="choose(a.id)">
                {{ a.label }}
              </button>
            }
          </div>
          <button type="button" class="lab-btn" (click)="newMap()">New map</button>
        </div>
        <p class="lab-hint pf-hint">Tap the grid to move the goal. Yellow ground is slow.</p>
      </div>

      <div class="lab-stats pf-stats">
        <div class="lab-stat" [style.--stat-color]="'var(' + info().color + ')'">
          <span class="lab-stat-num">{{ counted() }}</span>
          <span class="lab-stat-label">cells expanded</span>
        </div>
        <div class="lab-stat" style="--stat-color: var(--color-red)">
          <span class="lab-stat-num">{{ done() ? (summary()?.cost ?? '·') : '·' }}</span>
          <span class="lab-stat-label">path cost</span>
        </div>
        <div class="lab-stat">
          <span class="lab-stat-num">
            @if (done() && summary()?.reachable) {
              +{{ summary()?.over }}<small>%</small>
            } @else {
              ·
            }
          </span>
          <span class="lab-stat-label">over the cheapest path</span>
        </div>
      </div>

      <div class="pf-readout">
        @if (summary(); as s) {
          <p class="lab-readout">
            @if (!s.reachable) {
              The goal is walled in, so no path exists.
            } @else if (s.id === 'dijkstra') {
              Dijkstra expands in cost order, so its path is the cheapest.
            } @else if (s.id === 'astar') {
              A* expanded <b>{{ s.shareOfDijkstra }}%</b> of Dijkstra's cells for the same cost.
            } @else if (s.over > 0) {
              Greedy ignores the cost paid and lands <b>{{ s.over }}%</b> over the cheapest path.
            } @else {
              Greedy found a cheapest path this time, by luck.
            }
          </p>
        }
      </div>

      <div class="pf-slot"><ng-content /></div>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
  `,
  styles: `
    :host {
      display: block;
    }

    .pf-plate {
      background: var(--color-card);
    }

    canvas {
      display: block;
      width: 100%;
      cursor: crosshair;
      touch-action: manipulation;
    }

    canvas:focus-visible {
      outline-offset: -4px;
      border-radius: var(--radius-xl);
    }

    .pf-below {
      display: grid;
      gap: var(--space-md) var(--space-xl);
      margin-top: var(--space-md);
      grid-template-areas: 'controls' 'stats' 'readout' 'slot';

      @media (min-width: 960px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
        grid-template-areas: 'controls stats' 'readout stats' 'slot stats';
        align-items: start;
      }
    }

    .pf-controls {
      grid-area: controls;
    }

    .pf-readout {
      grid-area: readout;
    }

    .pf-slot {
      grid-area: slot;
    }

    .pf-hint {
      margin-top: var(--space-sm);
    }

    .pf-stats {
      grid-area: stats;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  `,
})
export class Pathfinder {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly plateRef = viewChild.required<ElementRef<HTMLElement>>('plate');

  protected readonly algorithms = ALGORITHMS;
  protected readonly algo = signal<Algorithm>('dijkstra');
  protected readonly info = computed(() => ALGORITHMS.find((a) => a.id === this.algo())!);

  private readonly grid = signal<Grid | null>(null);
  private readonly results = computed(() => {
    const grid = this.grid();
    if (!grid) return null;
    return {
      dijkstra: search(grid, 'dijkstra'),
      astar: search(grid, 'astar'),
      greedy: search(grid, 'greedy'),
    } satisfies Record<Algorithm, SearchResult>;
  });
  private readonly current = computed(() => this.results()?.[this.algo()] ?? null);

  /** Expansions drawn so far in the current run: the counter climbs with the drawing. */
  protected readonly counted = signal(0);
  protected readonly done = signal(false);
  protected readonly announcement = signal('');

  protected readonly summary = computed(() => {
    const all = this.results();
    const result = this.current();
    if (!all || !result) return null;
    const optimal = all.dijkstra.cost;
    return {
      id: this.algo(),
      name: this.info().name,
      reachable: result.path.length > 0,
      expanded: result.order.length,
      cost: result.cost,
      optimal,
      over: Math.round(((result.cost - optimal) / optimal) * 100),
      dijkstraExpanded: all.dijkstra.order.length,
      shareOfDijkstra: Math.round((result.order.length / all.dijkstra.order.length) * 100),
    };
  });

  protected readonly label = computed(() => {
    const s = this.summary();
    const grid = this.grid();
    if (!s || !grid) return 'Pathfinding grid';
    const outcome = s.reachable
      ? `${s.expanded} cells expanded, path cost ${s.cost}`
      : `no path, ${s.expanded} cells expanded`;
    return `${grid.cols} by ${grid.rows} grid with walls and slow ground. ${s.name} search from the blue start to the red goal: ${outcome}. Arrow keys move the goal.`;
  });

  private layout: Layout | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private colors: Record<string, string> = {};
  private mapNumber = 0;
  private runStart = 0;
  private raf = 0;
  private autoplayTimer: ReturnType<typeof setTimeout> | undefined;
  private visible = false;
  private interacted = false;
  private reduced = false;
  /** The drawn route, rebuilt only when the path changes. */
  private route: { key: string; path: Path2D; length: number } | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.readColors();

      // Width only: the canvas sets the plate's height, so reacting to height
      // would resize in a loop. The frame delay keeps the change out of the
      // observer's own delivery.
      let lastWidth = 0;
      const resize = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        if (width === lastWidth) return;
        lastWidth = width;
        requestAnimationFrame(() => this.resize(width));
      });
      resize.observe(this.plateRef().nativeElement);

      const view = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.restart();
        else this.pause();
      });
      view.observe(canvas);

      destroyRef.onDestroy(() => {
        resize.disconnect();
        view.disconnect();
        this.pause();
      });
    });
  }

  protected choose(id: Algorithm): void {
    this.interacted = true;
    this.algo.set(id);
    this.restart();
    this.announce();
  }

  protected newMap(): void {
    this.interacted = true;
    this.mapNumber++;
    this.buildGrid();
    this.restart();
    this.announce();
  }

  protected onClick(event: MouseEvent): void {
    const layout = this.layout;
    const grid = this.grid();
    if (!layout || !grid) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - layout.ox) / layout.cell);
    const y = Math.floor((event.clientY - rect.top - layout.oy) / layout.cell);
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
    this.moveGoal(y * grid.cols + x);
  }

  protected onKey(event: KeyboardEvent): void {
    const grid = this.grid();
    if (!grid) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = step[event.key];
    if (!move) return;
    event.preventDefault();
    // Step over walls in the pressed direction, so a key press always moves.
    let x = grid.goal % grid.cols;
    let y = (grid.goal / grid.cols) | 0;
    for (;;) {
      x += move[0];
      y += move[1];
      if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
      const cell = y * grid.cols + x;
      if (grid.cost[cell] !== WALL) {
        this.moveGoal(cell);
        return;
      }
    }
  }

  private moveGoal(cell: number): void {
    const grid = this.grid();
    if (!grid || grid.cost[cell] === WALL || cell === grid.start || cell === grid.goal) return;
    this.interacted = true;
    this.grid.set({ ...grid, goal: cell });
    this.restart();
    this.announce();
  }

  private announce(): void {
    const s = this.summary();
    if (!s) return;
    this.announcement.set(
      s.reachable
        ? `${s.name}: ${s.expanded} cells expanded, path cost ${s.cost}.`
        : `${s.name}: the goal is walled in, ${s.expanded} cells expanded.`,
    );
  }

  private resize(width: number): void {
    if (!width) return;
    const cell = width < 560 ? 16 : width < 960 ? 20 : 24;
    const cols = Math.max(12, Math.floor((width - cell) / cell));
    const rows = width < 560 ? Math.max(14, Math.floor(width / cell) - 1) : width < 960 ? 18 : 17;
    const height = rows * cell + cell;
    const changed = !this.layout || this.layout.cols !== cols || this.layout.rows !== rows;
    this.layout = { cell, cols, rows, width, height, ox: (width - cols * cell) / 2, oy: cell / 2 };

    const canvas = this.canvasRef().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.route = null;

    if (changed) {
      this.buildGrid();
      if (this.visible) this.restart();
    } else {
      this.draw(this.reduced ? Infinity : performance.now());
    }
  }

  private buildGrid(): void {
    if (!this.layout) return;
    this.grid.set(makeGrid(this.layout.cols, this.layout.rows, `home-${this.mapNumber}`));
    this.route = null;
  }

  private restart(): void {
    this.pause();
    this.runStart = performance.now();
    this.counted.set(0);
    this.done.set(false);
    this.route = null;
    if (this.reduced) {
      this.draw(Infinity);
      return;
    }
    if (!this.visible) return;
    const frame = (now: number) => {
      const finished = this.draw(now);
      this.raf = finished ? 0 : requestAnimationFrame(frame);
      if (finished) this.scheduleAutoplay();
    };
    this.raf = requestAnimationFrame(frame);
  }

  private pause(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.autoplayTimer);
  }

  /**
   * Dijkstra, A*, greedy on one goal, then a new goal. Stops for good on the
   * first interaction: from then on the lab only moves when asked.
   */
  private scheduleAutoplay(): void {
    if (this.interacted || this.reduced || !this.visible) return;
    this.autoplayTimer = setTimeout(() => {
      const order: Algorithm[] = ['dijkstra', 'astar', 'greedy'];
      const next = order[(order.indexOf(this.algo()) + 1) % order.length];
      if (next === 'dijkstra') this.pickGoal();
      this.algo.set(next);
      this.restart();
    }, AUTOPLAY_GAP_MS);
  }

  /** A reachable cell in the far third of the map, so each demo run crosses it. */
  private pickGoal(): void {
    const grid = this.grid();
    if (!grid) return;
    const open = reachable(grid, grid.start);
    const candidates: number[] = [];
    for (let cell = 0; cell < open.length; cell++) {
      if (open[cell] && cell % grid.cols > grid.cols * 0.66 && cell !== grid.goal) {
        candidates.push(cell);
      }
    }
    if (candidates.length) {
      const goal = candidates[Math.floor(Math.random() * candidates.length)];
      this.grid.set({ ...grid, goal });
    }
  }

  private readColors(): void {
    const style = getComputedStyle(document.documentElement);
    for (const name of [
      '--color-blue',
      '--color-green',
      '--color-purple',
      '--color-red',
      '--color-ink',
      '--color-card',
      '--tint-yellow',
    ]) {
      this.colors[name] = style.getPropertyValue(name).trim() || '#000';
    }
  }

  /** Draws the run at `now`; returns true once the search and its path are fully drawn. */
  private draw(now: number): boolean {
    const ctx = this.ctx;
    const layout = this.layout;
    const grid = this.grid();
    const result = this.current();
    if (!ctx || !layout || !grid || !result) return true;

    const { cell, ox, oy } = layout;
    const t = now - this.runStart;
    const total = result.order.length;
    const shown = Math.min(total, Math.floor(t * RATE));
    const searchDone = shown >= total;
    const pathProgress = searchDone ? Math.min(1, (t - total / RATE) / PATH_MS) : 0;
    const cx = (c: number) => ox + (c % grid.cols) * cell + cell / 2;
    const cy = (c: number) => oy + ((c / grid.cols) | 0) * cell + cell / 2;
    const accent = this.colors[this.info().color];

    ctx.clearRect(0, 0, layout.width, layout.height);

    // Slow ground, then the dot grid on every open cell.
    ctx.fillStyle = this.colors['--tint-yellow'];
    for (let c = 0; c < grid.cost.length; c++) {
      if (grid.cost[c] === SLOW_COST) {
        ctx.fillRect(ox + (c % grid.cols) * cell, oy + ((c / grid.cols) | 0) * cell, cell, cell);
      }
    }
    ctx.fillStyle = alpha(this.colors['--color-ink'], 0.16);
    for (let c = 0; c < grid.cost.length; c++) {
      if (grid.cost[c] === WALL || (result.expandedAt[c] >= 0 && result.expandedAt[c] < shown)) {
        continue;
      }
      dot(ctx, cx(c), cy(c), Math.max(1, cell * 0.06));
    }

    // Expanded cells: each lands saturated and settles to a wash, so the
    // newest expansions read as the moving edge of the search. The wash
    // alternates every BAND units of cost from the start, which draws contour
    // lines: the shape of the search, still visible once it has stopped.
    for (let i = 0; i < shown; i++) {
      const c = result.order[i];
      const age = t - i / RATE;
      const grow = easeOut(Math.min(1, age / 220));
      const fresh = Math.max(0, 1 - age / 700);
      const settled = Math.floor(result.g[c] / BAND) % 2 ? 0.42 : 0.18;
      ctx.fillStyle = alpha(accent, settled + (0.9 - settled) * fresh);
      dot(ctx, cx(c), cy(c), cell * 0.36 * grow);
    }

    // The frontier: discovered, not yet expanded.
    ctx.strokeStyle = alpha(accent, searchDone ? 0.35 : 0.85);
    ctx.lineWidth = 1.4;
    for (let c = 0; c < grid.cost.length; c++) {
      const pushed = result.pushedAt[c];
      const expanded = result.expandedAt[c];
      if (pushed >= 0 && pushed <= shown && (expanded < 0 || expanded >= shown)) {
        ctx.beginPath();
        ctx.arc(cx(c), cy(c), cell * 0.27, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Walls: a square per cell, bridged to wall neighbours right and below, so
    // runs of wall read as thick marker strokes.
    ctx.fillStyle = this.colors['--color-ink'];
    const w = cell * 0.62;
    for (let c = 0; c < grid.cost.length; c++) {
      if (grid.cost[c] !== WALL) continue;
      const x = cx(c);
      const y = cy(c);
      roundRect(ctx, x - w / 2, y - w / 2, w, w, w * 0.3);
      if (c % grid.cols < grid.cols - 1 && grid.cost[c + 1] === WALL) {
        ctx.fillRect(x, y - w / 2, cell, w);
      }
      const below = c + grid.cols < grid.cost.length && grid.cost[c + grid.cols] === WALL;
      if (below) ctx.fillRect(x - w / 2, y, w, cell);
      // A 2 x 2 block of wall leaves a gap between the four bridges; fill it.
      if (
        below &&
        c % grid.cols < grid.cols - 1 &&
        grid.cost[c + 1] === WALL &&
        grid.cost[c + grid.cols + 1] === WALL
      ) {
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // The path, drawn in after the search finishes: a marker line through the
    // cell centres, wobbled a little so it reads as drawn.
    if (pathProgress > 0 && result.path.length > 1) {
      const route = this.routeFor(result.path, grid, cx, cy, cell);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([route.length * pathProgress, route.length * 2]);
      ctx.strokeStyle = this.colors['--color-card'];
      ctx.lineWidth = cell * 0.3 + 4;
      ctx.stroke(route.path);
      ctx.strokeStyle = this.colors['--color-red'];
      ctx.lineWidth = cell * 0.3;
      ctx.stroke(route.path);
      ctx.setLineDash([]);
    }

    // Start: a blue disc. Goal: the site's red sparkle. Different shapes, so
    // the two ends do not depend on colour to tell apart.
    ctx.fillStyle = this.colors['--color-card'];
    dot(ctx, cx(grid.start), cy(grid.start), cell * 0.5);
    ctx.fillStyle = this.colors['--color-blue'];
    dot(ctx, cx(grid.start), cy(grid.start), cell * 0.4);
    sparkle(ctx, cx(grid.goal), cy(grid.goal), cell * 1.5, this.colors['--color-card']);
    sparkle(ctx, cx(grid.goal), cy(grid.goal), cell * 1.2, this.colors['--color-red']);

    if (this.counted() !== shown) this.counted.set(shown);
    const finished = searchDone && (pathProgress >= 1 || result.path.length < 2);
    if (finished && !this.done()) this.done.set(true);
    return finished;
  }

  private routeFor(
    path: number[],
    grid: Grid,
    cx: (c: number) => number,
    cy: (c: number) => number,
    cell: number,
  ): { path: Path2D; length: number } {
    const key = `${grid.cols}:${path.join(',')}`;
    if (this.route?.key === key) return this.route;
    const rand = rng(seedFrom(key));
    const points: Pt[] = path.map((c) => ({ x: cx(c), y: cy(c) }));
    const drawn = wobble(points, rand, cell * 0.06);
    drawn[0] = points[0];
    drawn[drawn.length - 1] = points[points.length - 1];
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    this.route = { key, path: new Path2D(smoothPath(drawn)), length: length * 1.05 };
    return this.route;
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** The site's four-point sparkle, the same polygon as the .sparkle clip-path. */
function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const pts = [
    [50, 0],
    [62, 38],
    [100, 50],
    [62, 62],
    [50, 100],
    [38, 62],
    [0, 50],
    [38, 38],
  ];
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const X = x + ((px - 50) / 100) * size;
    const Y = y + ((py - 50) / 100) * size;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** `#rrggbb` plus an alpha, as rgba(). */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
