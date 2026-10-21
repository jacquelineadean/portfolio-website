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
import {
  Corruption,
  Fault,
  LEAVES,
  ROWS,
  ROWS_PER_LEAF,
  buildTree,
  corrupt,
  diff,
  legacyRows,
  migratedRows,
  rangeOf,
} from '../../../labs/merkle';

const STEP_MS = 280;
const PHASE_MS = 450;
const MAX_BAD = 8;

const W = 640;
const LEFT = 24;
const SPAN = W - 2 * LEFT;
const LEVEL_Y = [30, 88, 146, 204, 256];
const STRIP_Y = 284;
const STRIP_H = 26;

const FAULT_NOTE: Record<Fault, string> = {
  encoding: 'UTF-8 bytes decoded as Latin-1',
  rounding: 'a decimal read through a float and truncated',
  timezone: 'local time at UTC-5 written as UTC',
};

const COLUMN_NAME: Record<string, string> = {
  name: 'name',
  amount: 'amount',
  updatedAt: 'updated_at',
};

interface NodeView {
  id: number;
  x: number;
  y: number;
  r: number;
  parentX: number;
  parentY: number;
}

type Phase = 'descend' | 'scan' | 'found';

/**
 * The About page's second lab: checking a backfill with a Merkle tree.
 *
 * The hashes are real: both copies of a 1,024-row table are serialised and
 * hashed in the browser, and the descent compares the actual digests. The
 * faults are three real migration bugs, so the row the check turns up shows
 * what that bug does to a value.
 */
@Component({
  selector: 'app-merkle-diff',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-row">
      <div class="lab-row-head">
        <p class="lab-kicker">
          <span class="sparkle sparkle--green" aria-hidden="true"></span>
          Merkle tree
        </p>
        <h2 class="lab-title">Checking a backfill without reading every row</h2>
      </div>

      <div class="lab-plate lab-row-fig">
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          role="img"
          [attr.aria-label]="label()"
          preserveAspectRatio="xMidYMid meet"
        >
          @for (n of nodes; track n.id) {
            @if (n.id > 1) {
              <line
                class="edge"
                [class.hot]="state(n.id) === 'differ'"
                [class.faded]="state(n.id) === 'skipped'"
                [attr.x1]="n.parentX"
                [attr.y1]="n.parentY"
                [attr.x2]="n.x"
                [attr.y2]="n.y"
              />
            }
          }
          @for (n of nodes; track n.id) {
            <circle
              class="node"
              [attr.data-state]="state(n.id)"
              [attr.cx]="n.x"
              [attr.cy]="n.y"
              [attr.r]="n.r"
              (mouseenter)="hovered.set(n.id)"
              (mouseleave)="hovered.set(null)"
            />
          }

          <!-- The table: 1,024 rows left to right, one block per leaf range. -->
          @for (leaf of leafIndexes; track leaf) {
            <rect
              class="block"
              [class.scanned]="scanned(leaf)"
              [attr.x]="leafX(leaf) - leafW / 2 + 1"
              [attr.y]="stripY"
              [attr.width]="leafW - 2"
              [attr.height]="stripH"
              rx="3"
            />
          }
          @for (c of corruptions(); track c.row) {
            <line
              class="bad"
              [class.found]="found(c.row)"
              [attr.x1]="rowX(c.row)"
              [attr.x2]="rowX(c.row)"
              [attr.y1]="stripY + 3"
              [attr.y2]="stripY + stripH - 3"
            />
          }
          <rect
            class="strip-hit"
            [attr.x]="left"
            [attr.y]="stripY - 6"
            [attr.width]="span"
            [attr.height]="stripH + 12"
            (click)="onStrip($event)"
          />
          <text class="axis" [attr.x]="left" [attr.y]="stripY + stripH + 20">row 0</text>
          <text class="axis end" [attr.x]="left + span" [attr.y]="stripY + stripH + 20">
            row 1,023
          </text>
        </svg>
      </div>

      <div class="lab-row-body">
        <div class="lab-controls">
          <button
            type="button"
            class="lab-btn"
            (click)="corruptRandom()"
            [disabled]="corruptions().length >= maxBad"
          >
            Corrupt a row
          </button>
          <button type="button" class="lab-btn" (click)="reset()">Clean copy</button>
        </div>
        <p class="lab-hint">Tap the row strip to corrupt a row.</p>

        <div class="lab-stats">
          <div class="lab-stat" style="--stat-color: var(--color-green)">
            <span class="lab-stat-num">{{ shownSteps() }}</span>
            <span class="lab-stat-label">hash comparisons</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-yellow)">
            <span class="lab-stat-num">{{ phase() === 'descend' ? '·' : scannedRows() }}</span>
            <span class="lab-stat-label">rows compared one by one, of {{ rows }}</span>
          </div>
          <div class="lab-stat" style="--stat-color: var(--color-red)">
            <span class="lab-stat-num">{{ phase() === 'found' ? result().rows.length : '·' }}</span>
            <span class="lab-stat-label">bad rows found</span>
          </div>
        </div>

        <div class="detail" aria-live="polite">
          @if (detail(); as d) {
            <p class="detail-head">
              Rows {{ d.first }} to {{ d.last }}
              <span [class]="'tag tag--' + d.verdict">{{ d.verdict }}</span>
            </p>
            <p class="detail-hash">
              legacy <b>{{ d.legacy }}</b> · migrated <b>{{ d.migrated }}</b>
            </p>
          }
          @if (phase() === 'found') {
            @for (c of foundCorruptions(); track c.row) {
              <p class="detail-row">
                <span class="detail-row-id">row {{ c.row }} · {{ columnName(c) }}</span>
                <span class="detail-diff"
                  ><s>{{ c.legacy }}</s> → <b>{{ c.migrated }}</b></span
                >
                <span class="detail-note">{{ faultNote(c) }}</span>
              </p>
            }
          }
        </div>

        <p class="lab-readout">
          @if (!result().rows.length) {
            The roots match: <b>one comparison</b> covers all {{ rows }} rows.
          } @else {
            <b>{{ result().steps.length }}</b> comparisons and <b>{{ scanShare() }}%</b> of a full
            scan found {{ result().rows.length }} bad
            {{ result().rows.length === 1 ? 'row' : 'rows' }}.
          }
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .edge {
      stroke: var(--color-ink);
      stroke-width: 1.3;
      opacity: 0.35;
      transition:
        stroke var(--duration-normal) ease,
        opacity var(--duration-normal) ease;
    }

    .edge.hot {
      stroke: var(--color-red);
      stroke-width: 2.6;
      opacity: 1;
    }

    .edge.faded {
      opacity: 0.12;
    }

    .node {
      fill: var(--color-card);
      stroke: var(--color-ink);
      stroke-width: 1.5;
      transition:
        fill var(--duration-normal) ease,
        stroke var(--duration-normal) ease,
        opacity var(--duration-normal) ease;
    }

    .node[data-state='match'] {
      fill: var(--tint-green);
      stroke: var(--color-green);
      stroke-width: 2.5;
    }

    .node[data-state='differ'] {
      fill: var(--color-red);
      stroke: var(--color-red);
    }

    .node[data-state='skipped'] {
      opacity: 0.22;
    }

    .block {
      fill: var(--color-paper-warm);
      transition: fill var(--duration-normal) ease;
    }

    .block.scanned {
      fill: var(--tint-yellow);
      stroke: var(--color-yellow);
      stroke-width: 1.5;
    }

    .bad {
      stroke: var(--color-red);
      stroke-width: 2;
      opacity: 0.35;
    }

    .bad.found {
      stroke-width: 3;
      opacity: 1;
    }

    .strip-hit {
      fill: transparent;
      cursor: crosshair;
    }

    .axis {
      font-family: var(--font-mono);
      font-size: 12px;
      fill: var(--color-ink-muted);
    }

    .axis.end {
      text-anchor: end;
    }

    @media (max-width: 700px) {
      .axis {
        font-size: 18px;
      }
    }

    .detail {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      min-height: 3.2rem;
      font-family: var(--font-mono);
      font-size: var(--text-2xs);
      letter-spacing: 0.02em;
      color: var(--color-ink-soft);

      b {
        color: var(--color-ink);
        font-weight: 500;
      }
    }

    .detail-head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: inherit;
      color: var(--color-ink);
    }

    .detail-hash,
    .detail-row {
      font-size: inherit;
      line-height: 1.5;
    }

    .tag {
      padding: 0.1rem 0.5rem;
      border-radius: var(--radius-pill);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .tag--match {
      background: var(--tint-green);
    }

    .tag--differ {
      background: var(--tint-red);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      padding-left: 0.7rem;
      border-left: 2px solid var(--color-red);
    }

    .detail-row-id {
      color: var(--color-ink);
    }

    .detail-diff s {
      color: var(--color-ink-muted);
    }

    .detail-note {
      font-family: var(--font-body);
      font-size: var(--text-xs);
      letter-spacing: 0;
      color: var(--color-ink-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .edge,
      .node,
      .block {
        transition: none;
      }
    }
  `,
})
export class MerkleDiff {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly width = W;
  protected readonly height = STRIP_Y + STRIP_H + 26;
  protected readonly left = LEFT;
  protected readonly span = SPAN;
  protected readonly stripY = STRIP_Y;
  protected readonly stripH = STRIP_H;
  protected readonly leafW = SPAN / LEAVES;
  protected readonly rows = ROWS.toLocaleString('en-US');
  protected readonly perLeaf = ROWS_PER_LEAF;
  protected readonly maxBad = MAX_BAD;
  protected readonly leafIndexes = Array.from({ length: LEAVES }, (_, i) => i);
  protected readonly nodes = this.layoutNodes();

  private readonly legacy = legacyRows();
  private readonly legacyTree = buildTree(this.legacy);

  /** One bad row to start with, so the first view shows a descent. */
  protected readonly corruptions = signal<Corruption[]>([corrupt(this.legacy[517])]);
  protected readonly result = computed(() => {
    const migrated = migratedRows(this.legacy, this.corruptions());
    return diff(this.legacyTree, buildTree(migrated), this.legacy, migrated);
  });
  private readonly migratedTree = computed(() =>
    buildTree(migratedRows(this.legacy, this.corruptions())),
  );
  /** Position of each node in the descent's comparison order; -1 if never compared. */
  private readonly stepOf = computed(() => {
    const at = new Array(2 * LEAVES).fill(-1);
    this.result().steps.forEach((s, i) => (at[s.node] = i));
    return at;
  });

  protected readonly shownSteps = signal(0);
  protected readonly phase = signal<Phase>('descend');
  protected readonly hovered = signal<number | null>(null);

  protected readonly scannedRows = computed(() => this.result().leaves.length * ROWS_PER_LEAF);
  protected readonly scanShare = computed(() =>
    ((this.scannedRows() / ROWS) * 100).toFixed(this.scannedRows() < ROWS / 10 ? 2 : 1),
  );
  protected readonly foundCorruptions = computed(() =>
    this.corruptions()
      .filter((c) => this.result().rows.includes(c.row))
      .sort((a, b) => a.row - b.row)
      .slice(0, 3),
  );

  /**
   * The node under the pointer; else, once the descent is over, the last range
   * that differed; else the latest comparison.
   */
  protected readonly detail = computed(() => {
    const steps = this.result().steps;
    const leaves = this.result().leaves;
    const node =
      this.hovered() ??
      (this.phase() !== 'descend' && leaves.length
        ? leaves[leaves.length - 1]
        : steps[Math.max(0, this.shownSteps() - 1)]?.node);
    if (!node || (this.hovered() === null && this.shownSteps() === 0)) return null;
    const [first, last] = rangeOf(node);
    const legacy = this.legacyTree[node];
    const migrated = this.migratedTree()[node];
    return {
      first: first.toLocaleString('en-US'),
      last: last.toLocaleString('en-US'),
      legacy,
      migrated,
      verdict: legacy === migrated ? 'match' : 'differ',
    };
  });

  protected readonly label = computed(() => {
    const r = this.result();
    return r.rows.length
      ? `A binary tree of hashes over 1,024 rows in 16 ranges. The descent made ${r.steps.length} comparisons, followed the mismatched branches to ${r.leaves.length} ranges, and found ${r.rows.length} bad rows.`
      : 'A binary tree of hashes over 1,024 rows in 16 ranges. The roots match, so the copies are equal.';
  });

  private timer: ReturnType<typeof setTimeout> | undefined;
  private visible = false;
  private reduced = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || this.visible) return;
          this.visible = true;
          observer.disconnect();
          this.play();
        },
        { rootMargin: '0px 0px -20% 0px' },
      );
      observer.observe(this.host.nativeElement as HTMLElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        clearTimeout(this.timer);
      });
    });
  }

  protected state(node: number): 'unknown' | 'match' | 'differ' | 'skipped' {
    const at = this.stepOf()[node];
    if (at >= 0 && at < this.shownSteps())
      return this.result().steps[at].match ? 'match' : 'differ';
    // Below a node that matched: never compared, because it never needed to be.
    for (let p = node >> 1; p >= 1; p >>= 1) {
      const pa = this.stepOf()[p];
      if (pa >= 0 && pa < this.shownSteps() && this.result().steps[pa].match) return 'skipped';
    }
    return 'unknown';
  }

  protected scanned(leaf: number): boolean {
    return this.phase() !== 'descend' && this.result().leaves.includes(LEAVES + leaf);
  }

  protected found(row: number): boolean {
    return this.phase() === 'found' && this.result().rows.includes(row);
  }

  protected leafX(leaf: number): number {
    return LEFT + (leaf + 0.5) * (SPAN / LEAVES);
  }

  protected rowX(row: number): number {
    return LEFT + ((row + 0.5) / ROWS) * SPAN;
  }

  protected columnName(c: Corruption): string {
    return COLUMN_NAME[c.column];
  }

  protected faultNote(c: Corruption): string {
    return FAULT_NOTE[c.fault];
  }

  protected corruptRandom(): void {
    const taken = new Set(this.corruptions().map((c) => c.row));
    let row: number;
    do row = Math.floor(Math.random() * ROWS);
    while (taken.has(row));
    this.addCorruption(row);
  }

  protected reset(): void {
    this.corruptions.set([]);
    this.play();
  }

  protected onStrip(event: MouseEvent): void {
    const svg = (event.target as SVGElement).ownerSVGElement;
    if (!svg) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      svg.getScreenCTM()?.inverse(),
    );
    const row = Math.floor(((point.x - LEFT) / SPAN) * ROWS);
    if (row < 0 || row >= ROWS) return;
    const existing = this.corruptions().some((c) => c.row === row);
    if (existing) {
      this.corruptions.update((list) => list.filter((c) => c.row !== row));
      this.play();
    } else if (this.corruptions().length < MAX_BAD) {
      this.addCorruption(row);
    }
  }

  private addCorruption(row: number): void {
    this.corruptions.update((list) => [...list, corrupt(this.legacy[row])]);
    this.play();
  }

  /** Reveal the comparisons one at a time, then the scanned ranges, then the rows. */
  private play(): void {
    clearTimeout(this.timer);
    const total = this.result().steps.length;
    if (this.reduced || !this.visible) {
      this.shownSteps.set(total);
      this.phase.set('found');
      return;
    }
    this.shownSteps.set(0);
    this.phase.set('descend');
    const next = () => {
      if (this.shownSteps() < total) {
        this.shownSteps.update((n) => n + 1);
        this.timer = setTimeout(next, STEP_MS);
      } else if (this.phase() === 'descend') {
        this.phase.set('scan');
        this.timer = setTimeout(next, PHASE_MS);
      } else {
        this.phase.set('found');
      }
    };
    this.timer = setTimeout(next, STEP_MS);
  }

  private layoutNodes(): NodeView[] {
    const views: NodeView[] = [];
    const xOf: number[] = [];
    for (let node = 2 * LEAVES - 1; node >= 1; node--) {
      const level = Math.floor(Math.log2(node));
      xOf[node] =
        node >= LEAVES
          ? LEFT + (node - LEAVES + 0.5) * (SPAN / LEAVES)
          : (xOf[2 * node] + xOf[2 * node + 1]) / 2;
      views.push({
        id: node,
        x: xOf[node],
        y: LEVEL_Y[level],
        r: [15, 13, 11, 10, 8.5][level],
        parentX: 0,
        parentY: 0,
      });
    }
    for (const v of views) {
      if (v.id > 1) {
        v.parentX = xOf[v.id >> 1];
        v.parentY = LEVEL_Y[Math.floor(Math.log2(v.id >> 1))];
      }
    }
    return views.sort((a, b) => a.id - b.id);
  }
}
