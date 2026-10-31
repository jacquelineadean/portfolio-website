import { GroupStyle, Layout, SystemSpec, Variant } from './system.model';

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Label extends Box {
  text: string;
  /** Text anchor point. */
  cx: number;
  cy: number;
}

export interface Wire {
  id: string;
  from: string;
  to: string;
  async: boolean;
  points: Pt[];
  /** Path with rounded turns. */
  d: string;
  /** Distance along the wire at each point. */
  cum: number[];
  length: number;
  arrow: string;
  label: Label | null;
}

export interface GroupRect extends Box {
  id: string;
  label: string;
  style: GroupStyle;
  /** Where the name is drawn, inside the top left corner. */
  name: Box;
}

export interface Geometry {
  view: Box;
  boxes: Record<string, Box>;
  wires: Wire[];
  groups: GroupRect[];
}

/** Advance of one DM Mono character at the label size, in layout units. */
export const LABEL_CHAR = 5.75;
/** Advance of one spaced capital in a zone name. */
const GROUP_CHAR = 6.2;
const LABEL_PAD = 4;
const LABEL_H = 13;
const CORNER = 6;
const MARGIN = 10;

const DEFAULT_PAD: Record<GroupStyle, [number, number, number, number]> = {
  zone: [30, 14, 14, 14],
  boundary: [30, 14, 14, 14],
  external: [30, 14, 14, 14],
  cluster: [24, 10, 10, 10],
};

export function layout(spec: SystemSpec, variant: Variant): Geometry {
  const plan = spec.layouts[variant];
  const boxes: Record<string, Box> = {};
  for (const node of spec.nodes) {
    const at = plan.at[node.id];
    if (!at) throw new Error(`${variant}: no place for ${node.id}`);
    const [x, y, w = plan.node[0], h = plan.node[1]] = at;
    boxes[node.id] = { x, y, w, h };
  }

  const wires = spec.edges.map((e) => {
    const id = `${e.from}>${e.to}`;
    const route = plan.routes[id];
    if (!route) throw new Error(`${variant}: no route for ${id}`);
    const points = trace(route, boxes[e.from], boxes[e.to], id);
    const cum = [0];
    for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
    const wire: Wire = {
      id,
      from: e.from,
      to: e.to,
      async: !!e.async,
      points,
      d: rounded(points),
      cum,
      length: cum[cum.length - 1],
      arrow: arrow(points),
      label: null,
    };
    wire.label = place(wire, e.label, plan);
    return wire;
  });

  const groups = groupRects(spec, plan, boxes);
  return { view: bounds(boxes, wires, groups), boxes, wires, groups };
}

/** The point a fraction of the way along a wire. */
export function pointAt(wire: Wire, f: number): Pt {
  const s = Math.max(0, Math.min(1, f)) * wire.length;
  let i = 1;
  while (i < wire.cum.length - 1 && wire.cum[i] < s) i++;
  const a = wire.points[i - 1];
  const b = wire.points[i];
  const seg = wire.cum[i] - wire.cum[i - 1] || 1;
  const k = (s - wire.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

// ---------------------------------------------------------------- routing

type Side = 't' | 'r' | 'b' | 'l';

function port(box: Box, side: Side, offset: number): Pt {
  const cx = box.x + box.w / 2 + offset;
  const cy = box.y + box.h / 2 + offset;
  switch (side) {
    case 't':
      return { x: cx, y: box.y };
    case 'b':
      return { x: cx, y: box.y + box.h };
    case 'l':
      return { x: box.x, y: cy };
    case 'r':
      return { x: box.x + box.w, y: cy };
  }
}

function parseEnd(text: string, id: string): [Side, number] {
  const [side, offset = '0'] = text.trim().split(':');
  if (!'trbl'.includes(side) || side.length !== 1) throw new Error(`${id}: bad side "${text}"`);
  return [side as Side, Number(offset)];
}

/**
 * The corner points of an orthogonal wire. It leaves along its side's normal,
 * turns at each given coordinate, then finishes with at most two more turns
 * so that it arrives along the target side's normal.
 */
function trace(route: string, from: Box, to: Box, id: string): Pt[] {
  const [ends, turns = ''] = route.split('|');
  const [a, b] = ends.split('>');
  const [sa, oa] = parseEnd(a, id);
  const [sb, ob] = parseEnd(b, id);
  const start = port(from, sa, oa);
  const end = port(to, sb, ob);

  const pts: Pt[] = [start];
  let cur = start;
  let horizontal = sa === 'l' || sa === 'r';
  for (const t of turns.trim().split(/\s+/).filter(Boolean).map(Number)) {
    cur = horizontal ? { x: t, y: cur.y } : { x: cur.x, y: t };
    pts.push(cur);
    horizontal = !horizontal;
  }
  const arriveHorizontal = sb === 'l' || sb === 'r';
  if (horizontal === arriveHorizontal) {
    if (horizontal && cur.y !== end.y) {
      const mid = (cur.x + end.x) / 2;
      pts.push({ x: mid, y: cur.y }, { x: mid, y: end.y });
    } else if (!horizontal && cur.x !== end.x) {
      const mid = (cur.y + end.y) / 2;
      pts.push({ x: cur.x, y: mid }, { x: end.x, y: mid });
    }
  } else {
    pts.push(horizontal ? { x: end.x, y: cur.y } : { x: cur.x, y: end.y });
  }
  pts.push(end);
  return simplify(pts);
}

/** Drop repeated points and points in the middle of a straight run. */
function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && near(last.x, p.x) && near(last.y, p.y)) continue;
    const prev = out[out.length - 2];
    if (
      prev &&
      last &&
      ((near(prev.x, last.x) && near(last.x, p.x)) || (near(prev.y, last.y) && near(last.y, p.y)))
    ) {
      out[out.length - 1] = p;
      continue;
    }
    out.push(p);
  }
  return out;
}

function rounded(pts: Pt[]): string {
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]];
    const r = Math.min(CORNER, dist(a, p) / 2, dist(p, b) / 2);
    const p1 = toward(p, a, r);
    const p2 = toward(p, b, r);
    d += ` L${f(p1.x)} ${f(p1.y)} Q${f(p.x)} ${f(p.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${f(last.x)} ${f(last.y)}`;
}

/** A small filled arrowhead on the last point, pointing along the last run. */
function arrow(pts: Pt[]): string {
  const b = pts[pts.length - 1];
  const a = pts[pts.length - 2];
  const len = dist(a, b) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const back = { x: b.x - ux * 6.5, y: b.y - uy * 6.5 };
  const l = { x: back.x - uy * 3.4, y: back.y + ux * 3.4 };
  const r = { x: back.x + uy * 3.4, y: back.y - ux * 3.4 };
  return `M${f(b.x)} ${f(b.y)} L${f(l.x)} ${f(l.y)} L${f(r.x)} ${f(r.y)}Z`;
}

function place(wire: Wire, text: string, plan: Layout): Label | null {
  const choice = plan.labels?.[wire.id];
  if (choice === null || !text) return null;
  let seg = choice ?? -1;
  if (seg < 0) {
    let best = 0;
    for (let i = 1; i < wire.points.length; i++) {
      const len = wire.cum[i] - wire.cum[i - 1];
      if (len > best) [best, seg] = [len, i - 1];
    }
  }
  const a = wire.points[seg];
  const b = wire.points[seg + 1];
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const w = text.length * LABEL_CHAR + 2 * LABEL_PAD;
  return { text, cx, cy, x: cx - w / 2, y: cy - LABEL_H / 2, w, h: LABEL_H };
}

// ---------------------------------------------------------------- groups

function groupRects(spec: SystemSpec, plan: Layout, boxes: Record<string, Box>): GroupRect[] {
  const within = (nodeGroup: string | undefined, id: string): boolean => {
    let g = nodeGroup;
    while (g) {
      if (g === id) return true;
      g = spec.groups.find((x) => x.id === g)?.parent;
    }
    return false;
  };
  const rects: GroupRect[] = [];
  for (const g of spec.groups) {
    const members = spec.nodes.filter((n) => within(n.group, g.id)).map((n) => boxes[n.id]);
    if (!members.length) continue;
    const [t, r, b, l] = plan.pad?.[g.id] ?? DEFAULT_PAD[g.style];
    const x0 = Math.min(...members.map((m) => m.x)) - l;
    const y0 = Math.min(...members.map((m) => m.y)) - t;
    const x1 = Math.max(...members.map((m) => m.x + m.w)) + r;
    const y1 = Math.max(...members.map((m) => m.y + m.h)) + b;
    const label = plan.names?.[g.id] ?? g.label;
    // Zones are set in spaced capitals, clusters as a plain path.
    const advance = g.style === 'cluster' ? LABEL_CHAR : GROUP_CHAR;
    const name = { x: x0 + 10, y: y0 + 8, w: label.length * advance, h: 11 };
    rects.push({ id: g.id, label, style: g.style, x: x0, y: y0, w: x1 - x0, h: y1 - y0, name });
  }
  // Outer groups first, so a nested cluster draws over its zone.
  return rects.sort((a, b) => b.w * b.h - a.w * a.h);
}

function bounds(boxes: Record<string, Box>, wires: Wire[], groups: GroupRect[]): Box {
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (b: Box) => {
    xs.push(b.x, b.x + b.w);
    ys.push(b.y, b.y + b.h);
  };
  Object.values(boxes).forEach(add);
  groups.forEach(add);
  for (const w of wires) {
    w.points.forEach((p) => (xs.push(p.x), ys.push(p.y)));
    if (w.label) add(w.label);
  }
  const x = Math.min(...xs) - MARGIN;
  const y = Math.min(...ys) - MARGIN;
  return { x, y, w: Math.max(...xs) + MARGIN - x, h: Math.max(...ys) + MARGIN - y };
}

// ---------------------------------------------------------------- checks

/**
 * What would make a layout read badly: a wire through a box it does not
 * belong to, two wires crossing, or a label over a box or another label.
 * The specs assert this list is empty for every layout.
 */
export function problems(spec: SystemSpec, geo: Geometry): string[] {
  const out: string[] = [];
  const segs = geo.wires.flatMap((w) =>
    w.points.slice(1).map((p, i) => ({ wire: w, a: w.points[i], b: p })),
  );
  for (const { wire, a, b } of segs) {
    for (const [id, box] of Object.entries(geo.boxes)) {
      if (id === wire.from || id === wire.to) continue;
      if (segmentHitsBox(a, b, inflate(box, 2))) out.push(`${wire.id} runs through ${id}`);
    }
  }
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      if (s.wire === t.wire) continue;
      if (crosses(s.a, s.b, t.a, t.b)) out.push(`${s.wire.id} crosses ${t.wire.id}`);
    }
  }
  const labels = geo.wires.filter((w) => w.label).map((w) => ({ id: w.id, box: w.label! }));
  for (const { id, box } of labels) {
    for (const [nid, nbox] of Object.entries(geo.boxes)) {
      if (overlap(box, nbox)) out.push(`label of ${id} covers ${nid}`);
    }
  }
  for (const { id, box } of labels) {
    for (const { wire, a, b } of segs) {
      if (
        wire.id !== id &&
        !onRun(a, b, geo.wires.find((w) => w.id === id)!) &&
        segmentHitsBox(a, b, box)
      )
        out.push(`label of ${id} covers ${wire.id}`);
    }
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (overlap(inflate(labels[i].box, 1), labels[j].box))
        out.push(`labels of ${labels[i].id} and ${labels[j].id} overlap`);
    }
  }
  for (const g of geo.groups) {
    for (const { wire, a, b } of segs) {
      if (segmentHitsBox(a, b, g.name)) out.push(`${wire.id} runs through the ${g.id} name`);
    }
    for (const { id, box } of labels) {
      if (overlap(box, g.name)) out.push(`label of ${id} covers the ${g.id} name`);
    }
  }
  for (const node of spec.nodes) {
    const box = geo.boxes[node.id];
    for (const [id, other] of Object.entries(geo.boxes)) {
      if (id > node.id && overlap(box, other)) out.push(`${node.id} overlaps ${id}`);
    }
  }
  return [...new Set(out)];
}

function segmentHitsBox(a: Pt, b: Pt, box: Box): boolean {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x1 > box.x && x0 < box.x + box.w && y1 > box.y && y0 < box.y + box.h;
}

/** A horizontal run crossing a vertical one strictly inside both. */
function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const h1 = near(a.y, b.y);
  const h2 = near(c.y, d.y);
  if (h1 === h2) return false;
  const [h, v] = h1
    ? [
        [a, b],
        [c, d],
      ]
    : [
        [c, d],
        [a, b],
      ];
  const y = h[0].y;
  const x = v[0].x;
  const inside = (p: number, q: number, s: number) =>
    s > Math.min(p, q) + 0.5 && s < Math.max(p, q) - 0.5;
  return inside(h[0].x, h[1].x, x) && inside(v[0].y, v[1].y, y);
}

/** True when a segment lies along one of the wire's own runs, as a shared trunk does. */
function onRun(a: Pt, b: Pt, wire: Wire): boolean {
  return wire.points.slice(1).some((q, i) => {
    const p = wire.points[i];
    if (near(a.x, b.x) && near(p.x, q.x) && near(a.x, p.x)) return true;
    return near(a.y, b.y) && near(p.y, q.y) && near(a.y, p.y);
  });
}

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inflate(b: Box, n: number): Box {
  return { x: b.x - n, y: b.y - n, w: b.w + 2 * n, h: b.h + 2 * n };
}

// ---------------------------------------------------------------- helpers

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function toward(p: Pt, q: Pt, r: number): Pt {
  const len = dist(p, q) || 1;
  return { x: p.x + ((q.x - p.x) / len) * r, y: p.y + ((q.y - p.y) / len) * r };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function f(n: number): string {
  return String(Math.round(n * 10) / 10);
}
