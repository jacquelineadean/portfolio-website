/**
 * A system diagram as data: the parts, the links between them with the real
 * payload each one carries, the steps a tour plays, and a hand placed layout
 * for each screen shape. geometry.ts turns a layout into boxes and wires;
 * timeline.ts turns the steps into a clock.
 */

export type Variant = 'wide' | 'tall';

export type Kind =
  | 'user'
  | 'cdn'
  | 'job'
  | 'monitor'
  | 'client'
  | 'gateway'
  | 'db'
  | 'api'
  | 'function'
  | 'storage'
  | 'service'
  | 'external'
  | 'model';

export type Status = 'normal' | 'ok' | 'warn' | 'bad';

/** zone: a deployment; cluster: a folder; boundary: a trust line; external: not ours. */
export type GroupStyle = 'zone' | 'cluster' | 'boundary' | 'external';

export interface SystemSpec {
  title: string;
  /** Blob URL prefix that a part's `path` is appended to. */
  repo: string;
  groups: SystemGroup[];
  nodes: SystemNode[];
  edges: SystemEdge[];
  /** Named runs of steps a reader can loop. */
  paths: { id: string; label: string; first: number; last: number }[];
  steps: SystemStep[];
  layouts: Record<Variant, Layout>;
}

export interface SystemGroup {
  id: string;
  label: string;
  style: GroupStyle;
  parent?: string;
}

export interface SystemNode {
  id: string;
  label: string;
  kind: Kind;
  /** One short mono line under the name. */
  tech: string;
  group?: string;
  /** Repo path, linked from the inspector. */
  path?: string;
  /** The part's main export or signature, copied from the repo. */
  code?: string;
  about: string;
  /** Extra mono lines, drawn when the box is tall enough. */
  lines?: string[];
}

export interface SystemEdge {
  from: string;
  to: string;
  /** Short label drawn on the wire. */
  label: string;
  async?: boolean;
  /** What crosses this link, copied from code, config or data. */
  payload: string;
  detail: string;
  /** file:line the payload comes from. */
  at?: string;
}

export interface SystemStep {
  caption: string;
  /** Parts drawn at full strength besides the ends of this step's events. */
  focus: string[];
  events: StepEvent[];
}

/**
 * One line of the trace. With `edge` a packet runs the wire; with `node` the
 * part itself acts. `set` changes statuses once the event lands, and `stop`
 * halts a packet part way along a wire it never finishes.
 */
export interface StepEvent {
  edge?: string;
  node?: string;
  /** Defaults to the edge's payload. */
  log?: string;
  status?: Status;
  /** Start together with the event before. */
  with?: boolean;
  stop?: number;
  set?: Record<string, Status>;
}

export interface Layout {
  /** Default box size. */
  node: [w: number, h: number];
  /** Top left of each box, with an optional size. */
  at: Record<string, [number, number] | [number, number, number, number]>;
  /**
   * How each wire leaves and arrives, keyed `from>to`: `side[:offset] >
   * side[:offset] | turn turn ...`. A side is t, r, b or l and the offset
   * runs along it from the middle. Each turn is the x or y where the wire
   * turns, alternating with the direction it is travelling.
   */
  routes: Record<string, string>;
  /** The wire segment a label sits on, or null for no label. Default: the longest. */
  labels?: Record<string, number | null>;
  /** Group padding as [top, right, bottom, left]. */
  pad?: Record<string, [number, number, number, number]>;
  /** Shorter group names where the full one does not fit. */
  names?: Record<string, string>;
}
