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
import { rng, seedFrom } from '../../../art/rng';
import { Pt, sketchArrowHead, sketchLine, sketchRect } from '../../../art/sketch';

/**
 * 0 legacy: the monolith answers.
 * 1 shadow: the router also copies each request to the new service and compares.
 * 2 cut over: the new service answers; the monolith stays deployed on standby.
 * 3 retired: the legacy module is deleted.
 */
type Stage = 0 | 1 | 2 | 3;

const STAGE_NAMES = ['legacy', 'shadow', 'cut over', 'retired'];

interface RouteDef {
  path: string;
  module: string;
  service: string;
}

const ROUTES: RouteDef[] = [
  { path: '/search', module: 'search.jsp', service: 'search-svc' },
  { path: '/orders', module: 'OrderBean', service: 'order-svc' },
  { path: '/invoices', module: 'InvoiceDAO', service: 'invoice-svc' },
  { path: '/reports', module: 'ReportJob', service: 'report-svc' },
  { path: '/accounts', module: 'AccountEJB', service: 'account-svc' },
];

/** A mid-migration start, so the first view shows every stage at once. */
const START: Stage[] = [3, 2, 1, 0, 0];

const W = 640;
const TOP = 44;
const ROW_H = 56;
const ROW0 = TOP + 40;
const H = ROW0 + ROUTES.length * ROW_H - 4;
const MONO = { x: 16, w: 176 };
const ROUTER = { x: 250, w: 140 };
const NEW = { x: 450, w: 174 };
const BLOCK_H = 36;
const PERIOD_MS = 1400;
const TRAVEL_MS = 650;

interface RowArt {
  y: number;
  module: string[];
  service: string[];
  left: string[];
  right: string[];
  cross: string[];
}

interface Dot {
  key: string;
  x: number;
  y: number;
  hollow: boolean;
}

/**
 * The About page's first lab: the strangler fig pattern.
 *
 * A router sits in front of the monolith and owns one rule per route. Each
 * route moves through four stages, and the asymmetry is the point: up to cut
 * over, rolling back is a routing change; once the legacy module is deleted,
 * rolling back is a redeploy.
 */
@Component({
  selector: 'app-strangler',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-row">
      <div class="lab-row-head">
        <p class="lab-kicker">
          <span class="sparkle sparkle--blue" aria-hidden="true"></span>
          Strangler fig
        </p>
        <h2 class="lab-title">Moving a monolith one route at a time</h2>
        <p class="lab-desc">
          A router in front of the monolith decides, route by route, which code answers. Each route
          runs in shadow first, then cuts over, and its legacy code is deleted last. Tap a route to
          move it forward.
        </p>
      </div>

      <div class="lab-plate lab-row-fig">
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          role="group"
          aria-label="Routes through the router, from the monolith to new services"
          [class.is-drawing]="drawing()"
        >
          <text class="title" [attr.x]="mono.x + mono.w / 2" y="24">Monolith</text>
          <text class="title" [attr.x]="router.x + router.w / 2" y="24">Router</text>
          <text class="title" [attr.x]="fresh.x + fresh.w / 2" y="24">New services</text>

          @for (d of frame; track $index) {
            <path class="stroke" [attr.d]="d" pathLength="1" />
          }

          @for (row of art; track $index; let i = $index) {
            <!-- Monolith module: present until retired, then struck out. -->
            @for (d of row.module; track $index) {
              <path class="stroke" [class.gone]="stages()[i] === 3" [attr.d]="d" pathLength="1" />
            }
            <text
              class="label"
              [class.gone]="stages()[i] === 3"
              [attr.x]="mono.x + mono.w / 2"
              [attr.y]="row.y + 5"
            >
              {{ routes[i].module }}
            </text>

            <!-- New service: dashed while in shadow, solid once it answers. -->
            @if (stages()[i] > 0) {
              <rect
                class="service-fill"
                [class.live]="stages()[i] >= 2"
                [attr.x]="fresh.x"
                [attr.y]="row.y - blockH / 2"
                [attr.width]="fresh.w"
                [attr.height]="blockH"
                rx="3"
              />
              @for (d of row.service; track $index) {
                <path class="stroke" [class.dashed]="stages()[i] === 1" [attr.d]="d" />
              }
              <text class="label" [attr.x]="fresh.x + fresh.w / 2" [attr.y]="row.y + 5">
                {{ routes[i].service }}
              </text>
            }

            <!-- Router to monolith: live until cut over, standby after, gone when retired. -->
            @if (stages()[i] < 3) {
              @for (d of row.left; track $index) {
                <path class="stroke arrow" [class.dashed]="stages()[i] === 2" [attr.d]="d" />
              }
            }
            <!-- Router to new service: a shadow copy, then the live path. -->
            @if (stages()[i] > 0) {
              @for (d of row.right; track $index) {
                <path class="stroke arrow" [class.dashed]="stages()[i] === 1" [attr.d]="d" />
              }
            }
            @if (stages()[i] === 3) {
              @for (d of row.cross; track $index) {
                <path class="cross" [attr.d]="d" pathLength="1" />
              }
            }

            <g
              class="route"
              role="button"
              tabindex="0"
              [attr.aria-label]="routeLabel(i)"
              [attr.aria-disabled]="stages()[i] === 3"
              (click)="advance(i)"
              (keydown.enter)="advance(i)"
              (keydown.space)="$event.preventDefault(); advance(i)"
            >
              <rect
                class="route-hit"
                [attr.x]="router.x + 6"
                [attr.y]="row.y - rowH / 2 + 6"
                [attr.width]="router.w - 12"
                [attr.height]="rowH - 12"
                rx="8"
              />
              <text
                class="label route-text"
                [attr.x]="router.x + router.w / 2"
                [attr.y]="row.y + 5"
              >
                {{ routes[i].path }}
              </text>
            </g>
          }

          @for (dot of dots(); track dot.key) {
            <circle
              class="dot"
              [class.hollow]="dot.hollow"
              [attr.cx]="dot.x"
              [attr.cy]="dot.y"
              r="4.5"
            />
          }
        </svg>
      </div>

      <div class="lab-row-body">
        <div class="lab-controls">
          <button type="button" class="lab-btn" (click)="next()" [disabled]="allRetired()">
            Next step
          </button>
          <button type="button" class="lab-btn" (click)="rollBack()" [disabled]="!canRollBack()">
            Roll back
          </button>
          <button type="button" class="lab-btn" (click)="reset()">Start over</button>
        </div>

        <div class="lab-stats">
          <div class="lab-stat" style="--stat-color: var(--color-green)">
            <span class="lab-stat-num"
              >{{ count(2) }}<small>/{{ routes.length }}</small></span
            >
            <span class="lab-stat-label">routes answered by new code</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-yellow)">
            <span class="lab-stat-num">{{ count(1, 1) }}</span>
            <span class="lab-stat-label">routes in shadow</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-red)">
            <span class="lab-stat-num">{{ count(3) }}</span>
            <span class="lab-stat-label">legacy modules deleted</span>
          </div>
        </div>

        <p class="lab-readout" aria-live="polite">
          @switch (last().kind) {
            @case ('start') {
              Five routes at four stages: <b>/search</b> is retired, <b>/orders</b> is cut over,
              <b>/invoices</b> runs in shadow, and two routes still run only on the monolith.
            }
            @case ('reset') {
              All five routes run on the monolith. The router in front of it changes nothing yet;
              every later step is a change to its rules.
            }
            @case ('shadow') {
              <b>{{ last().path }}</b> is in shadow. The router copies each request to
              {{ last().service }} and compares the two responses; clients still get the monolith's.
            }
            @case ('cutover') {
              <b>{{ last().path }}</b> is cut over: clients now get {{ last().service }}'s
              responses. The monolith's code is still deployed, so rolling back is one routing rule.
            }
            @case ('rollback') {
              <b>{{ last().path }}</b> is back in shadow, by one routing rule. The monolith never
              stopped running it.
            }
            @case ('retired') {
              <b>{{ last().path }}</b> is retired and {{ last().module }} is deleted. Rolling back
              now means restoring and redeploying code, which is why this step comes last.
            }
            @case ('done') {
              Every route runs on new services and the monolith has no modules left. It can be
              switched off.
            }
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

    svg {
      display: block;
      width: 100%;
      height: auto;
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

    .dashed {
      stroke-dasharray: 5 6;
    }

    .gone {
      opacity: 0.28;
    }

    .cross {
      stroke: var(--color-red);
      stroke-width: 3;
      stroke-dasharray: 1;
      animation: draw 420ms var(--ease-out-quart) both;
    }

    .service-fill {
      fill: var(--tint-yellow);
      transition: fill var(--duration-normal) ease;
    }

    .service-fill.live {
      fill: var(--tint-green);
    }

    text {
      font-family: var(--font-mono);
      font-size: 15px;
      fill: currentColor;
      text-anchor: middle;
      transition: opacity var(--duration-normal) ease;
    }

    .title {
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      fill: var(--color-ink-muted);
    }

    .route {
      cursor: pointer;
      outline: none;
    }

    .route-hit {
      fill: transparent;
      stroke: transparent;
      stroke-width: 2;
      transition: fill var(--duration-fast) ease;
    }

    .route:hover .route-hit {
      fill: var(--tint-blue);
    }

    .route:focus-visible .route-hit {
      stroke: var(--color-blue);
    }

    .route[aria-disabled='true'] {
      cursor: default;
    }

    .route[aria-disabled='true']:hover .route-hit {
      fill: transparent;
    }

    .dot {
      fill: var(--color-ink);
    }

    .dot.hollow {
      fill: var(--color-card);
      stroke: var(--color-ink);
      stroke-width: 1.5;
    }

    @media (max-width: 700px) {
      text {
        font-size: 19px;
      }

      .title {
        font-size: 15px;
      }
    }

    .is-drawing .stroke[pathLength] {
      stroke-dasharray: 1;
      animation: draw 600ms var(--ease-out-quart) backwards;
    }

    @keyframes draw {
      from {
        stroke-dashoffset: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .is-drawing .stroke[pathLength],
      .cross {
        animation: none;
      }
    }
  `,
})
export class Strangler {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly routes = ROUTES;
  protected readonly width = W;
  protected readonly height = H;
  protected readonly mono = MONO;
  protected readonly router = ROUTER;
  protected readonly fresh = NEW;
  protected readonly blockH = BLOCK_H;
  protected readonly rowH = ROW_H;

  protected readonly frame = this.drawFrame();
  protected readonly art = ROUTES.map((_, i) => this.drawRow(i));

  protected readonly stages = signal<Stage[]>([...START]);
  protected readonly last = signal<{
    kind: 'start' | 'reset' | 'shadow' | 'cutover' | 'rollback' | 'retired' | 'done';
    path?: string;
    service?: string;
    module?: string;
  }>({ kind: 'start' });
  /** Routes in cut over, most recent last: roll back undoes the latest. */
  private readonly cutOrder = signal<number[]>([1]);

  protected readonly drawing = signal(false);
  private readonly clock = signal(0);

  protected readonly allRetired = computed(() => this.stages().every((s) => s === 3));
  protected readonly canRollBack = computed(() => this.cutOrder().length > 0);

  /** Requests in flight: one per route per period, staggered, on the live arrow; plus a hollow copy in shadow. */
  protected readonly dots = computed<Dot[]>(() => {
    const now = this.clock();
    const out: Dot[] = [];
    this.stages().forEach((stage, i) => {
      const t = ((now + i * 260) % PERIOD_MS) / TRAVEL_MS;
      if (t > 1) return;
      const y = this.art[i].y;
      const leftFrom = ROUTER.x - 4;
      const leftTo = MONO.x + MONO.w + 10;
      const rightFrom = ROUTER.x + ROUTER.w + 4;
      const rightTo = NEW.x - 10;
      const live = stage < 2 ? [leftFrom, leftTo] : [rightFrom, rightTo];
      out.push({ key: `${i}`, x: live[0] + (live[1] - live[0]) * t, y, hollow: false });
      if (stage === 1) {
        out.push({ key: `${i}s`, x: rightFrom + (rightTo - rightFrom) * t, y, hollow: true });
      }
    });
    return out;
  });

  private raf = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.drawing.set(true);
            if (!reduced) this.run();
          } else {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
          }
        },
        { rootMargin: '0px 0px -15% 0px' },
      );
      observer.observe(this.host.nativeElement as HTMLElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(this.raf);
      });
    });
  }

  protected count(min: Stage, max: Stage = 3): number {
    return this.stages().filter((s) => s >= min && s <= max).length;
  }

  protected routeLabel(i: number): string {
    const stage = this.stages()[i];
    const route = ROUTES[i].path;
    return stage === 3
      ? `${route}: retired`
      : `${route}: ${STAGE_NAMES[stage]}. Move to ${STAGE_NAMES[stage + 1]}.`;
  }

  protected advance(i: number): void {
    const stage = this.stages()[i];
    if (stage === 3) return;
    const nextStage = (stage + 1) as Stage;
    this.stages.update((all) => all.map((s, j) => (j === i ? nextStage : s)) as Stage[]);
    if (nextStage === 2) this.cutOrder.update((order) => [...order, i]);
    if (nextStage === 3) this.cutOrder.update((order) => order.filter((j) => j !== i));
    const route = ROUTES[i];
    const kind = this.allRetired()
      ? 'done'
      : (['shadow', 'cutover', 'retired'] as const)[nextStage - 1];
    this.last.set({ kind, path: route.path, service: route.service, module: route.module });
  }

  /** Moves forward the first route that has not been retired. */
  protected next(): void {
    const i = this.stages().findIndex((s) => s < 3);
    if (i >= 0) this.advance(i);
  }

  protected rollBack(): void {
    const order = this.cutOrder();
    const i = order[order.length - 1];
    if (i === undefined) return;
    this.cutOrder.set(order.slice(0, -1));
    this.stages.update((all) => all.map((s, j) => (j === i ? 1 : s)) as Stage[]);
    const route = ROUTES[i];
    this.last.set({ kind: 'rollback', path: route.path, service: route.service });
  }

  protected reset(): void {
    this.stages.set(ROUTES.map(() => 0 as Stage));
    this.cutOrder.set([]);
    this.last.set({ kind: 'reset' });
  }

  private run(): void {
    if (this.raf) return;
    const frame = (now: number) => {
      this.clock.set(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private drawFrame(): string[] {
    const rand = rng(seedFrom('strangler-frame'));
    const bottom = H - 8;
    return [
      ...sketchRect(MONO.x, TOP, MONO.w, bottom - TOP, rand, 1.2),
      ...sketchRect(ROUTER.x, TOP, ROUTER.w, bottom - TOP, rand, 1.2),
    ];
  }

  private drawRow(i: number): RowArt {
    const rand = rng(seedFrom(`strangler-row-${i}`));
    const y = ROW0 + i * ROW_H;
    const mx = MONO.x + 14;
    const mw = MONO.w - 28;
    const leftFrom: Pt = { x: ROUTER.x - 4, y };
    const leftTo: Pt = { x: MONO.x + MONO.w + 4, y };
    const rightFrom: Pt = { x: ROUTER.x + ROUTER.w + 4, y };
    const rightTo: Pt = { x: NEW.x - 4, y };
    const pad = 4;
    return {
      y,
      module: sketchRect(mx, y - BLOCK_H / 2, mw, BLOCK_H, rand, 0.8),
      service: sketchRect(NEW.x, y - BLOCK_H / 2, NEW.w, BLOCK_H, rand, 0.8),
      left: [
        sketchLine(leftFrom, leftTo, rand, 0.5),
        ...sketchArrowHead(leftTo, { x: leftTo.x + 10, y }, rand, 9, 0.5),
      ],
      right: [
        sketchLine(rightFrom, rightTo, rand, 0.5),
        ...sketchArrowHead(rightTo, { x: rightTo.x - 10, y }, rand, 9, 0.5),
      ],
      cross: [
        sketchLine(
          { x: mx - pad, y: y - BLOCK_H / 2 - pad },
          { x: mx + mw + pad, y: y + BLOCK_H / 2 + pad },
          rand,
          1.2,
        ),
        sketchLine(
          { x: mx + mw + pad, y: y - BLOCK_H / 2 - pad },
          { x: mx - pad, y: y + BLOCK_H / 2 + pad },
          rand,
          1.2,
        ),
      ],
    };
  }
}
