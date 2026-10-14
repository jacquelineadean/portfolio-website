import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Pt } from '../../../art/sketch';
import { BoxId, ConnectorId, crossOut, pointOn, systemSketch } from '../../../art/system-sketch';

/**
 * Traffic mix per 100 requests, and the cache's hit rate. Every number in the
 * readout follows from these four.
 */
const READS = 70;
const WRITES = 20;
const JOBS = 10;
const HIT_RATE = 0.9;

/** One arrival every ARRIVAL_MS, in a fixed order that matches the mix. */
const ARRIVAL_MS = 280;
const MIX: Kind[] = [
  'read',
  'read',
  'write',
  'read',
  'job',
  'read',
  'read',
  'write',
  'read',
  'read',
];
/** The worker takes one job per WORKER_MS: faster than jobs arrive, so it can catch up. */
const WORKER_MS = 900;
/** Packet speed in diagram units per millisecond. */
const SPEED = 0.2;
/** Queue slots drawn; deeper queues add a count. */
const SLOTS = 8;

type Kind = 'read' | 'write' | 'job';
type RouteId = 'hit' | 'store' | 'enqueue' | 'drain';

const ROUTE_CONNECTORS: Record<RouteId, ConnectorId[]> = {
  hit: ['client-gateway', 'gateway-service', 'service-cache'],
  store: ['client-gateway', 'gateway-service', 'service-store'],
  enqueue: ['client-gateway', 'gateway-service', 'service-queue'],
  drain: ['queue-worker', 'worker-store'],
};

const COLOR: Record<Kind, string> = {
  read: 'var(--color-blue)',
  write: 'var(--color-green)',
  job: 'var(--color-yellow)',
};

/** A route sampled into points; `hidden` marks the stretches inside a box. */
interface Route {
  points: Pt[];
  hidden: boolean[];
  /** Cumulative length at each point. */
  at: number[];
  length: number;
}

interface Packet {
  id: number;
  kind: Kind;
  route: RouteId;
  /** Distance travelled along the route. */
  d: number;
}

interface PacketView {
  id: number;
  x: number;
  y: number;
  color: string;
  opacity: number;
}

/**
 * The home page's system diagram, with traffic on it.
 *
 * Reads go through the cache, writes go to the store, and jobs go through the
 * queue to the worker. Two switches take the cache and the worker down, and
 * the numbers show what each failure costs: the store absorbs every read, or
 * jobs pile up while requests keep returning.
 */
@Component({
  selector: 'app-request-flow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-row">
      <div class="lab-row-head">
        <p class="lab-kicker">
          <span class="sparkle sparkle--yellow" aria-hidden="true"></span>
          Request paths
        </p>
      </div>

      <div class="lab-row-fig">
        <svg
          class="rf-diagram"
          [attr.viewBox]="'0 0 ' + sketch.width + ' ' + sketch.height"
          [attr.aria-label]="sketch.description"
          [class.is-drawing]="drawing()"
          role="img"
          preserveAspectRatio="xMidYMid meet"
        >
          @for (stroke of sketch.strokes; track $index; let i = $index) {
            <path
              class="stroke"
              [class.dim]="isDim(i)"
              [attr.d]="stroke"
              pathLength="1"
              [style.animation-delay.ms]="i * step"
            />
          }

          <!-- Jobs waiting: a strip under the label, one square per job up to
               SLOTS, then a count below the box. -->
          @for (slot of slots(); track slot) {
            <rect
              class="job"
              [attr.x]="queue.x + 12 + slot * 11"
              [attr.y]="queue.y + queue.h - 13"
              width="8"
              height="8"
              rx="1.5"
            />
          }
          @if (depth() > 0) {
            <text
              class="aside count"
              [attr.x]="queue.x + queue.w / 2"
              [attr.y]="queue.y + queue.h + 22"
            >
              {{ depth() }} waiting
            </text>
          }

          @for (p of packets(); track p.id) {
            <circle
              class="packet"
              [attr.cx]="p.x"
              [attr.cy]="p.y"
              r="5.5"
              [style.fill]="p.color"
              [style.opacity]="p.opacity"
            />
          }

          @for (label of sketch.labels; track label.text; let i = $index) {
            <text
              [attr.x]="label.x"
              [attr.y]="label.y"
              [attr.text-anchor]="label.anchor ?? 'middle'"
              [class.aside]="label.aside"
              [class.dim]="isDimLabel(label.text)"
              [style.animation-delay.ms]="sketch.strokes.length * step + i * 70"
            >
              {{ label.text }}
            </text>
          }

          @if (!cacheUp()) {
            @for (d of cacheX; track $index) {
              <path class="cross" [attr.d]="d" pathLength="1" />
            }
          }
          @if (!workerUp()) {
            @for (d of workerX; track $index) {
              <path class="cross" [attr.d]="d" pathLength="1" />
            }
          }
        </svg>
      </div>

      <div class="lab-row-body">
        <div class="lab-legend lab-hint" aria-hidden="true">
          <span><i style="--swatch: var(--color-blue)"></i>read</span>
          <span><i style="--swatch: var(--color-green)"></i>write</span>
          <span><i style="--swatch: var(--color-yellow)"></i>background job</span>
        </div>

        <div class="lab-controls">
          <button
            type="button"
            role="switch"
            class="lab-switch"
            [attr.aria-checked]="cacheUp()"
            (click)="cacheUp.set(!cacheUp())"
          >
            <span class="lab-switch-track" aria-hidden="true"></span>
            Cache
            <span class="lab-switch-state">{{ cacheUp() ? 'up' : 'down' }}</span>
          </button>
          <button
            type="button"
            role="switch"
            class="lab-switch"
            [attr.aria-checked]="workerUp()"
            (click)="workerUp.set(!workerUp())"
          >
            <span class="lab-switch-track" aria-hidden="true"></span>
            Worker
            <span class="lab-switch-state">{{ workerUp() ? 'up' : 'down' }}</span>
          </button>
        </div>

        <div class="lab-stats">
          <div class="lab-stat">
            <span class="lab-stat-num">{{ storeOps() }}</span>
            <span class="lab-stat-label">store operations per 100 requests</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-blue)">
            <span class="lab-stat-num">{{ cacheUp() ? hitReads : 0 }}</span>
            <span class="lab-stat-label">of {{ reads }} reads answered by the cache</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-yellow)">
            <span class="lab-stat-num">{{ depth() }}</span>
            <span class="lab-stat-label">jobs waiting in the queue</span>
          </div>
        </div>

        <p class="lab-readout" aria-live="polite">
          @if (cacheUp()) {
            Of every 100 requests, {{ reads }} are reads. The cache answers {{ hitReads }} of them,
            so the store sees <b>{{ storeOps() }}</b> operations.
          } @else {
            With the cache down, all {{ reads }} reads reach the store:
            <b>{{ storeOps() }}</b> operations per 100 requests, <b>{{ loadFactor }}×</b> the load
            with the cache up.
          }
          @if (!workerUp()) {
            The worker is down. Requests that create jobs still return, because the service only
            writes to the queue; the jobs wait there.
          } @else if (depth() > 0) {
            The worker clears jobs <b>{{ drainFactor }}×</b> as fast as they arrive, so the backlog
            shrinks.
          } @else {
            The worker keeps up, so no jobs wait.
          }
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      color: var(--color-ink);
    }

    .lab-row-fig {
      padding: 0;
      align-self: center;
    }

    .lab-kicker {
      margin-bottom: 0;
    }

    .rf-diagram {
      display: block;
      width: 100%;
      max-width: 38rem;
      height: auto;
      margin-inline: auto;
      overflow: visible;
    }

    .stroke,
    .cross {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
      transition: opacity var(--duration-normal) ease;
    }

    .dim {
      opacity: 0.3;
    }

    .cross {
      stroke: var(--color-red);
      stroke-width: 3;
      stroke-dasharray: 1;
      animation: draw 420ms var(--ease-out-quart) both;
    }

    .cross + .cross {
      animation-delay: 180ms;
    }

    .job {
      fill: var(--color-yellow);
    }

    text {
      font-family: var(--font-mono);
      font-size: 15px;
      fill: currentColor;
      transition: opacity var(--duration-normal) ease;
    }

    .aside {
      font-size: 12px;
      fill: var(--color-ink-muted);
    }

    .count {
      text-anchor: middle;
      fill: var(--color-ink);
    }

    /* Below the two-column layout the diagram is as wide as the text column,
       so its type grows to stay readable at that scale. */
    @media (max-width: 700px) {
      text {
        font-size: 20px;
      }

      .aside {
        font-size: 16px;
      }
    }

    .is-drawing .stroke {
      stroke-dasharray: 1;
      animation: draw 620ms var(--ease-out-quart) backwards;
    }

    .is-drawing text {
      animation: appear 400ms var(--ease-out-quart) backwards;
    }

    @keyframes draw {
      from {
        stroke-dashoffset: 1;
      }
    }

    @keyframes appear {
      from {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .is-drawing .stroke,
      .is-drawing text,
      .cross {
        animation: none;
      }
    }
  `,
})
export class RequestFlow {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly sketch = systemSketch('strangler');
  protected readonly queue = this.box('queue');
  protected readonly cacheX = crossOut(this.box('cache'), 'cache-down');
  protected readonly workerX = crossOut(this.box('worker'), 'worker-down');
  /** Draw-in pace: about a second and a half for the whole diagram. */
  protected readonly step = Math.round(Math.min(55, 1500 / this.sketch.strokes.length));

  protected readonly reads = READS;
  protected readonly hitReads = Math.round(READS * HIT_RATE);
  protected readonly loadFactor = (
    (READS + WRITES + JOBS) /
    (READS * (1 - HIT_RATE) + WRITES + JOBS)
  ).toFixed(1);
  protected readonly drainFactor = (
    (ARRIVAL_MS * MIX.length) /
    MIX.filter((k) => k === 'job').length /
    WORKER_MS
  ).toFixed(1);

  protected readonly cacheUp = signal(true);
  protected readonly workerUp = signal(true);
  protected readonly drawing = signal(false);
  protected readonly depth = signal(0);
  protected readonly packets = signal<PacketView[]>([]);

  protected readonly storeOps = computed(() =>
    Math.round((this.cacheUp() ? READS * (1 - HIT_RATE) : READS) + WRITES + JOBS),
  );
  protected readonly slots = computed(() =>
    Array.from({ length: Math.min(SLOTS, this.depth()) }, (_, i) => i),
  );

  /**
   * Stroke indices drawn for each box and connector, in systemSketch's order:
   * the service's back outline (4), seven boxes (4 each), then seven arrows
   * (3 each: curve and two head strokes).
   */
  private readonly strokeOwner: string[] = (() => {
    const owners: string[] = ['service', 'service', 'service', 'service'];
    for (const b of this.sketch.boxes) owners.push(b.id, b.id, b.id, b.id);
    for (const id of Object.keys(this.sketch.connectors)) owners.push(id, id, id);
    return owners;
  })();

  private readonly routes = Object.fromEntries(
    (Object.keys(ROUTE_CONNECTORS) as RouteId[]).map((id) => [id, this.buildRoute(id)]),
  ) as Record<RouteId, Route>;

  private live: Packet[] = [];
  private nextId = 0;
  private arrivals = 0;
  private readsSeen = 0;
  private sinceArrival = 0;
  private sinceWork = 0;
  private last = 0;
  private raf = 0;
  private reduced = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.drawing.set(true);
            this.start();
          } else {
            this.stop();
          }
        },
        { rootMargin: '0px 0px -15% 0px' },
      );
      observer.observe(this.host.nativeElement as HTMLElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        this.stop();
      });
    });
  }

  protected isDim(index: number): boolean {
    const owner = this.strokeOwner[index];
    if (!this.cacheUp() && (owner === 'cache' || owner === 'service-cache')) return true;
    if (
      !this.workerUp() &&
      (owner === 'worker' || owner === 'queue-worker' || owner === 'worker-store')
    ) {
      return true;
    }
    return false;
  }

  protected isDimLabel(text: string): boolean {
    return (text === 'Cache' && !this.cacheUp()) || (text === 'Worker' && !this.workerUp());
  }

  private box(id: BoxId) {
    return this.sketch.boxes.find((b) => b.id === id)!;
  }

  private start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const frame = (now: number) => {
      // Clamped, so a frame after a long pause does not jump every packet.
      this.tick(Math.min(64, now - this.last));
      this.last = now;
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick(dt: number): void {
    this.sinceArrival += dt;
    while (this.sinceArrival >= ARRIVAL_MS) {
      this.sinceArrival -= ARRIVAL_MS;
      this.arrive(MIX[this.arrivals++ % MIX.length]);
    }

    const views: PacketView[] = [];
    const still: Packet[] = [];
    for (const packet of this.live) {
      packet.d += SPEED * dt;
      const route = this.routes[packet.route];
      if (packet.d >= route.length) {
        if (packet.route === 'enqueue') this.depth.update((d) => d + 1);
        continue;
      }
      still.push(packet);
      if (this.reduced) continue;
      const { point, hidden } = this.locate(route, packet.d);
      // Fade in and out at the ends, and vanish inside boxes: the box is
      // where the work happens.
      const edge = Math.min(packet.d, route.length - packet.d);
      views.push({
        id: packet.id,
        x: point.x,
        y: point.y,
        color: COLOR[packet.kind],
        opacity: hidden ? 0 : Math.min(1, edge / 12),
      });
    }
    this.live = still;
    this.packets.set(views);

    // After arrivals, so an idle worker takes a job in the same frame it lands
    // and the queue only shows jobs that are actually waiting.
    if (this.workerUp()) {
      this.sinceWork = Math.min(WORKER_MS, this.sinceWork + dt);
      if (this.sinceWork >= WORKER_MS && this.depth() > 0) {
        this.sinceWork = 0;
        this.depth.update((d) => d - 1);
        this.launch('job', 'drain');
      }
    } else {
      this.sinceWork = 0;
    }
  }

  private arrive(kind: Kind): void {
    if (kind === 'write') return this.launch(kind, 'store');
    if (kind === 'job') return this.launch(kind, 'enqueue');
    const hit = this.cacheUp() && this.readsSeen++ % 10 !== 9;
    this.launch(kind, hit ? 'hit' : 'store');
  }

  private launch(kind: Kind, route: RouteId): void {
    this.live.push({ id: this.nextId++, kind, route, d: 0 });
  }

  /** The point at distance `d` along a route, by linear search over its samples. */
  private locate(route: Route, d: number): { point: Pt; hidden: boolean } {
    let i = 1;
    while (i < route.at.length - 1 && route.at[i] < d) i++;
    const a = route.points[i - 1];
    const b = route.points[i];
    const span = route.at[i] - route.at[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (d - route.at[i - 1]) / span));
    return {
      point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      hidden: route.hidden[i],
    };
  }

  private buildRoute(id: RouteId): Route {
    const points: Pt[] = [];
    const hidden: boolean[] = [];
    ROUTE_CONNECTORS[id].forEach((cid, n) => {
      const c = this.sketch.connectors[cid];
      // Between two connectors the packet crosses a box, out of sight.
      for (let s = 0; s <= 16; s++) {
        points.push(pointOn(c, s / 16));
        hidden.push(n > 0 && s === 0);
      }
    });
    const at = [0];
    for (let i = 1; i < points.length; i++) {
      at.push(at[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    return { points, hidden, at, length: at[at.length - 1] };
  }
}
