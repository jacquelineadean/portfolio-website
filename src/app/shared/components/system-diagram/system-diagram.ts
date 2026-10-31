import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { Box, Wire, layout, pointAt } from './geometry';
import { ICONS, KIND_LABEL } from './icons';
import { Status, SystemEdge, SystemNode, SystemSpec, Variant } from './system.model';
import { TRAVEL, TimedEvent, statusAt, stepAt, timeline } from './timeline';

/** Below this width the tall layout is used; its labels stay readable at phone width. */
const PHONE = '(max-width: 700px)';

/** Seconds the tour or a picked path rests on its last frame before it plays again. */
const REST = 1.4;

/** Seconds a part glows after a packet lands on it. */
const GLOW = 0.6;

type Pick = { kind: 'node' | 'edge'; id: string } | null;

interface Packet {
  id: string;
  x: number;
  y: number;
  status: Status;
  stopped: boolean;
}

interface Link {
  edge: SystemEdge;
  id: string;
  other: SystemNode;
  outgoing: boolean;
}

let uid = 0;

/**
 * An architecture diagram that runs its steps as a trace.
 *
 * The parts, wires and groups are drawn from a hand placed layout (one for
 * wide screens, one for phones; geometry.ts routes the wires). One clock
 * drives everything: each step's events send a packet along a wire or make a
 * part act, and every event prints a line in the trace with the payload the
 * repo actually sends. A reader can play or pause, step, scrub the rail, loop
 * one path, hover a wire for its payload, or open any part or wire to see its
 * code, its file and what it talks to. It pauses off screen, and with reduced
 * motion it waits on the first step's finished picture. Its styles live in
 * src/styles/_system-diagram.scss.
 */
@Component({
  selector: 'app-system-diagram',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-diagram.html',
})
export class SystemDiagram {
  readonly spec = input.required<SystemSpec>();

  protected readonly uid = `sd${++uid}`;
  protected readonly variant = signal<Variant>('wide');
  protected readonly phone = computed(() => this.variant() === 'tall');
  protected readonly geo = computed(() => layout(this.spec(), this.variant()));
  protected readonly tl = computed(() => timeline(this.spec()));

  /** Seconds into the tour. */
  protected readonly t = signal(0);
  /** What the reader asked for; the clock also stops off screen and while inspecting. */
  protected readonly playing = signal(true);
  protected readonly pathId = signal<string | null>(null);
  protected readonly picked = signal<Pick>(null);
  protected readonly hover = signal<Pick>(null);
  protected readonly calm = signal(false);

  protected readonly step = computed(() => stepAt(this.tl(), this.t()));
  protected readonly path = computed(
    () => this.spec().paths.find((p) => p.id === this.pathId()) ?? null,
  );
  protected readonly nodes = computed(() => new Map(this.spec().nodes.map((n) => [n.id, n])));
  protected readonly edges = computed(
    () => new Map(this.spec().edges.map((e) => [`${e.from}>${e.to}`, e])),
  );
  protected readonly wires = computed(() => new Map(this.geo().wires.map((w) => [w.id, w])));

  protected readonly viewBox = computed(() => {
    const v = this.geo().view;
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });
  protected readonly ratio = computed(() => `${this.geo().view.w} / ${this.geo().view.h}`);

  /** Everything the clock moves, worked out once per frame. */
  protected readonly frame = computed(() => {
    const t = this.t();
    const tl = this.tl();
    const s = tl.steps[this.step()];
    const lit = new Map<string, number>();
    const packets: Packet[] = [];
    const busy = new Set<string>();
    const glow = new Set<string>();
    const touched = new Set(this.spec().steps[this.step()].focus);
    for (const ev of s.events) {
      if (ev.node) {
        touched.add(ev.node);
        if (t >= ev.start && t < ev.end + GLOW) glow.add(ev.node);
        continue;
      }
      const wire = this.wires().get(ev.edge!)!;
      touched.add(wire.from).add(wire.to);
      if (t < ev.start) continue;
      const stop = ev.stop ?? 1;
      const f = Math.min(1, (t - ev.start) / TRAVEL);
      const reach = Math.min(f, stop);
      lit.set(wire.id, Math.max(lit.get(wire.id) ?? 0, reach));
      if (f < stop) {
        busy.add(wire.from);
        const p = pointAt(wire, ease(reach));
        packets.push({ id: `${ev.i}`, ...p, status: ev.status ?? 'normal', stopped: false });
      } else if (ev.stop) {
        const p = pointAt(wire, ease(stop));
        packets.push({ id: `${ev.i}`, ...p, status: ev.status ?? 'bad', stopped: true });
      } else if (t < ev.end + GLOW) {
        glow.add(wire.to);
      }
    }
    return { lit, packets, busy, glow, touched, status: statusAt(tl, t) };
  });

  /** The parts and wires a hover or an open inspector picks out. */
  private readonly lit = computed(() => {
    const p = this.picked() ?? this.hover();
    if (!p) return null;
    const nodes = new Set<string>();
    const wires = new Set<string>();
    if (p.kind === 'edge') {
      const w = this.wires().get(p.id);
      if (w) nodes.add(w.from).add(w.to);
      wires.add(p.id);
    } else {
      nodes.add(p.id);
      for (const w of this.geo().wires) {
        if (w.from !== p.id && w.to !== p.id) continue;
        wires.add(w.id);
        nodes.add(w.from).add(w.to);
      }
    }
    return { nodes, wires };
  });

  /** The trace so far, from the start of the tour or of the picked path. */
  protected readonly log = computed(() => {
    const t = this.t();
    const first = this.path()?.first ?? 0;
    return this.tl().events.filter((ev) => ev.step >= first && ev.start <= t);
  });

  protected readonly pickedNode = computed(() => {
    const p = this.picked();
    return p?.kind === 'node' ? (this.nodes().get(p.id) ?? null) : null;
  });
  protected readonly pickedEdge = computed(() => {
    const p = this.picked();
    return p?.kind === 'edge' ? (this.edges().get(p.id) ?? null) : null;
  });
  protected readonly links = computed<Link[]>(() => {
    const node = this.pickedNode();
    if (!node) return [];
    return this.spec()
      .edges.filter((e) => e.from === node.id || e.to === node.id)
      .map((e) => ({
        edge: e,
        id: `${e.from}>${e.to}`,
        other: this.nodes().get(e.from === node.id ? e.to : e.from)!,
        outgoing: e.from === node.id,
      }));
  });
  /** The steps the picked part or wire takes part in. */
  protected readonly pickedSteps = computed(() => {
    const p = this.picked();
    if (!p) return [];
    return this.spec()
      .steps.map((s, i) => ({ s, i }))
      .filter(({ s }) =>
        p.kind === 'node'
          ? s.focus.includes(p.id) ||
            s.events.some((ev) => ev.node === p.id || ev.edge?.split('>').includes(p.id))
          : s.events.some((ev) => ev.edge === p.id),
      )
      .map(({ i }) => i);
  });

  /** A payload or file shown over the stage while a wire or part is hovered. */
  protected readonly tip = computed(() => {
    const h = this.hover();
    if (!h || this.picked()) return null;
    const v = this.geo().view;
    const at = (x: number, y: number) => ({
      left: ((x - v.x) / v.w) * 100,
      top: ((y - v.y) / v.h) * 100,
    });
    if (h.kind === 'edge') {
      const w = this.wires().get(h.id)!;
      const p = w.label ? { x: w.label.cx, y: w.label.cy } : pointAt(w, 0.5);
      return { ...at(p.x, p.y), text: this.edges().get(h.id)!.payload };
    }
    const b = this.geo().boxes[h.id];
    const n = this.nodes().get(h.id)!;
    return { ...at(b.x + b.w / 2, b.y), text: n.path ?? n.tech };
  });

  protected readonly icons = ICONS;
  protected readonly kindLabel = KIND_LABEL;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');
  private readonly trace = viewChild<ElementRef<HTMLElement>>('trace');
  private readonly visible = signal(false);
  private readonly scrubbing = signal(false);
  private frameId = 0;
  private last = 0;
  /** Seconds spent holding the last frame. */
  private rested = 0;
  private scrub: { x: number; moved: boolean } | null = null;

  /** The clock runs only while it is wanted, on screen, and nothing holds it. */
  private readonly running = computed(
    () => this.playing() && this.visible() && !this.picked() && !this.scrubbing(),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const phone = matchMedia(PHONE);
      const calm = matchMedia('(prefers-reduced-motion: reduce)');
      this.variant.set(phone.matches ? 'tall' : 'wide');
      const onPhone = (e: MediaQueryListEvent) => this.variant.set(e.matches ? 'tall' : 'wide');
      phone.addEventListener('change', onPhone);
      if (calm.matches) {
        this.calm.set(true);
        this.playing.set(false);
        this.t.set(this.tl().steps[0].end - 0.01);
      }

      const seen = new IntersectionObserver(([e]) => this.visible.set(e.isIntersecting), {
        threshold: 0.2,
      });
      seen.observe(this.host.nativeElement);

      destroyRef.onDestroy(() => {
        phone.removeEventListener('change', onPhone);
        seen.disconnect();
        cancelAnimationFrame(this.frameId);
      });
    });

    // Another project's diagram in the same component: start it over.
    effect(() => {
      this.spec();
      untracked(() => {
        this.pathId.set(null);
        this.picked.set(null);
        this.t.set(this.calm() ? this.tl().steps[0].end - 0.01 : 0);
      });
    });

    effect(() => {
      const run = this.running();
      untracked(() => {
        cancelAnimationFrame(this.frameId);
        if (!run) return;
        this.last = performance.now();
        this.frameId = requestAnimationFrame((now) => this.tick(now));
      });
    });

    // Keep the newest trace line in view, inside the trace's own scroll box.
    effect(() => {
      const count = this.log().length;
      const el = this.trace()?.nativeElement;
      if (el && count) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    });
  }

  // ------------------------------------------------------------- controls

  protected toggle(): void {
    this.picked.set(null);
    this.playing.set(!this.playing());
  }

  protected next(): void {
    this.goTo((this.step() + 1) % this.spec().steps.length);
  }

  protected prev(): void {
    const n = this.spec().steps.length;
    this.goTo((this.step() - 1 + n) % n);
  }

  /** Jump to a step: its start while playing, its finished picture while paused. */
  protected goTo(i: number): void {
    const path = this.path();
    if (path && (i < path.first || i > path.last)) this.pathId.set(null);
    this.picked.set(null);
    const s = this.tl().steps[i];
    this.t.set(this.playing() ? s.start : s.end - 0.01);
  }

  /** Loop one path from its first step; null plays the whole tour. */
  protected pickPath(id: string | null): void {
    this.pathId.set(id);
    this.playing.set(true);
    this.goTo(id ? this.spec().paths.find((p) => p.id === id)!.first : 0);
  }

  /** Jump to the moment a trace line was written. */
  protected seek(ev: TimedEvent): void {
    const path = this.path();
    if (path && (ev.step < path.first || ev.step > path.last)) this.pathId.set(null);
    this.picked.set(null);
    this.t.set(this.playing() ? ev.start : ev.end + 0.05);
  }

  protected inspect(kind: 'node' | 'edge', id: string | null): void {
    const p = this.picked();
    this.picked.set(!id || (p?.kind === kind && p.id === id) ? null : { kind, id });
  }

  protected onHover(kind: 'node' | 'edge', id: string | null, e?: PointerEvent): void {
    if (e?.pointerType === 'touch') return;
    this.hover.set(id ? { kind, id } : null);
  }

  /** Arrow keys step, space plays or pauses, Escape closes the inspector. */
  protected onKey(e: KeyboardEvent): void {
    const target = e.target as Element;
    if (e.key === 'Escape' && this.picked()) {
      this.picked.set(null);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (target.closest('input, textarea')) return;
      e.key === 'ArrowRight' ? this.next() : this.prev();
      e.preventDefault();
    } else if ((e.key === 'Enter' || e.key === ' ') && target.matches('[data-node], [data-edge]')) {
      const node = target.getAttribute('data-node');
      this.inspect(node ? 'node' : 'edge', node ?? target.getAttribute('data-edge'));
      e.preventDefault();
    } else if (e.key === ' ' && !target.closest('button, a')) {
      this.toggle();
      e.preventDefault();
    }
  }

  // ------------------------------------------------------------- the rail

  protected onRailDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.scrub = { x: e.clientX, moved: false };
    this.scrubbing.set(true);
    this.scrubTo(e);
  }

  protected onRailMove(e: PointerEvent): void {
    if (!this.scrub) return;
    if (Math.abs(e.clientX - this.scrub.x) > 3) this.scrub.moved = true;
    if (this.scrub.moved) this.scrubTo(e);
  }

  /** A drag leaves the clock where it was let go; a tap starts that step. */
  protected onRailUp(): void {
    if (!this.scrub) return;
    const moved = this.scrub.moved;
    this.scrub = null;
    this.scrubbing.set(false);
    if (!moved) this.goTo(this.step());
  }

  /** Keyboard activation of a step; pointer taps are handled by the rail. */
  protected onSegment(e: MouseEvent, i: number): void {
    if (e.detail === 0) this.goTo(i);
  }

  private scrubTo(e: PointerEvent): void {
    const rail = this.rail()?.nativeElement.getBoundingClientRect();
    if (!rail?.width) return;
    const f = Math.min(0.9999, Math.max(0, (e.clientX - rail.left) / rail.width));
    const t = f * this.tl().duration;
    const path = this.path();
    const i = stepAt(this.tl(), t);
    if (path && (i < path.first || i > path.last)) this.pathId.set(null);
    this.picked.set(null);
    this.t.set(t);
  }

  // ------------------------------------------------------------- view helpers

  protected stepState(i: number): 'done' | 'current' | 'next' {
    const step = this.step();
    return i < step ? 'done' : i === step ? 'current' : 'next';
  }

  protected inPath(i: number): boolean {
    const path = this.path();
    return !path || (i >= path.first && i <= path.last);
  }

  /** How far the current step has played, for its segment of the rail. */
  protected fill(i: number): number {
    const s = this.tl().steps[i];
    return Math.min(1, Math.max(0, (this.t() - s.start) / (s.end - s.start)));
  }

  protected nodeClass(id: string): string {
    const f = this.frame();
    const lit = this.lit();
    const status = f.status[id] ?? 'normal';
    const dim = lit ? !lit.nodes.has(id) : !f.touched.has(id);
    const picked = this.picked();
    return [
      'n',
      `is-${status}`,
      dim ? 'is-dim' : '',
      f.busy.has(id) ? 'is-busy' : '',
      f.glow.has(id) && !this.calm() ? 'is-glow' : '',
      picked?.kind === 'node' && picked.id === id ? 'is-picked' : '',
    ].join(' ');
  }

  protected wireClass(w: Wire): string {
    const f = this.frame();
    const lit = this.lit();
    const status = f.status[w.id] ?? 'normal';
    const dim = lit ? !lit.wires.has(w.id) : !f.lit.has(w.id);
    const picked = this.picked();
    return [
      'w',
      w.async ? 'is-async' : '',
      `is-${status}`,
      dim ? 'is-dim' : '',
      lit?.wires.has(w.id) ? 'is-lit' : '',
      picked?.kind === 'edge' && picked.id === w.id ? 'is-picked' : '',
    ].join(' ');
  }

  /** How much of a wire the current step has lit, from 0 to 1. */
  protected reach(w: Wire): number {
    return ease(this.frame().lit.get(w.id) ?? 0);
  }

  protected box(id: string): Box {
    return this.geo().boxes[id];
  }

  protected status(id: string): Status {
    return this.frame().status[id] ?? 'normal';
  }

  protected wireLabel(id: string): string {
    const e = this.edges().get(id)!;
    return `${this.nodes().get(e.from)!.label} to ${this.nodes().get(e.to)!.label}: ${e.label}`;
  }

  protected route(ev: TimedEvent): string {
    if (ev.node) return ev.node;
    const [from, to] = ev.edge!.split('>');
    return `${from} → ${to}`;
  }

  protected href(path: string | undefined): string | null {
    if (!path) return null;
    const [file, line] = path.split(':');
    return `${this.spec().repo}${file}${line ? `#L${line}` : ''}`;
  }

  protected stamp(t: number): string {
    const m = Math.floor(t / 60);
    return `${String(m).padStart(2, '0')}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
  }

  protected pad(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  // ------------------------------------------------------------- the clock

  /** Advance the clock; at the end of the tour or path, hold, then start it again. */
  private tick(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const tl = this.tl();
    const path = this.path();
    const start = path ? tl.steps[path.first].start : 0;
    const end = path ? tl.steps[path.last].end : tl.duration;
    let t = Math.max(start, this.t() + dt);
    if (t >= end) {
      this.rested += dt;
      t = end - 0.01;
      if (this.rested >= REST) {
        this.rested = 0;
        t = start;
      }
    }
    this.t.set(t);
    this.frameId = requestAnimationFrame((n) => this.tick(n));
  }
}

/** Packets ease in and out along a wire. */
function ease(f: number): number {
  return f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
}
