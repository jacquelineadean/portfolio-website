import { Status, StepEvent, SystemSpec } from './system.model';

export interface TimedEvent extends StepEvent {
  /** Position in the whole tour. */
  i: number;
  step: number;
  start: number;
  end: number;
  /** The trace line. */
  text: string;
  /** Statuses once this event has landed, counted from the start of the tour. */
  after: Record<string, Status>;
}

export interface TimedStep {
  start: number;
  end: number;
  events: TimedEvent[];
}

export interface Timeline {
  steps: TimedStep[];
  events: TimedEvent[];
  duration: number;
}

/** Seconds from a step's start to its first event. */
const LEAD = 0.5;
/** Seconds a packet takes to cross any wire, so every hop reads at one pace. */
export const TRAVEL = 1.1;
/** Seconds a part takes to act on its own. */
const ACT = 0.7;
const GAP = 0.35;
/** Seconds the finished step holds before the next one. */
const HOLD = 1.8;
const WORDS_PER_SECOND = 3.4;

/**
 * Lays every event of every step on one clock. Events run one after another
 * unless marked `with`, and a step lasts until its events have landed and
 * held, or until its caption has had time to be read, whichever is longer.
 */
export function timeline(spec: SystemSpec): Timeline {
  const payload = new Map(spec.edges.map((e) => [`${e.from}>${e.to}`, e.payload]));
  const steps: TimedStep[] = [];
  const events: TimedEvent[] = [];
  let statuses: Record<string, Status> = {};
  let t = 0;

  spec.steps.forEach((step, s) => {
    const start = t;
    let cursor = start + LEAD;
    let begun = cursor;
    let landed = cursor;
    const own: TimedEvent[] = [];
    for (const ev of step.events) {
      if (ev.edge && !payload.has(ev.edge)) throw new Error(`step ${s + 1}: no edge ${ev.edge}`);
      const begin = ev.with ? begun : cursor;
      const end = begin + (ev.edge ? TRAVEL * (ev.stop ?? 1) : ACT);
      statuses = ev.set ? { ...statuses, ...ev.set } : statuses;
      const timed: TimedEvent = {
        ...ev,
        i: events.length,
        step: s,
        start: begin,
        end,
        text: ev.log ?? payload.get(ev.edge!) ?? '',
        after: statuses,
      };
      events.push(timed);
      own.push(timed);
      begun = begin;
      landed = Math.max(landed, end);
      cursor = Math.max(cursor, end + GAP);
    }
    const words = step.caption.split(/\s+/).length;
    const read = LEAD + words / WORDS_PER_SECOND + 1;
    t = start + Math.max(read, landed - start + HOLD);
    steps.push({ start, end: t, events: own });
  });

  return { steps, events, duration: t };
}

/** Statuses at a moment: those of the last event that has landed. */
export function statusAt(tl: Timeline, t: number): Record<string, Status> {
  let found: Record<string, Status> = {};
  for (const ev of tl.events) if (ev.end <= t) found = ev.after;
  return found;
}

/** The step a moment falls in. */
export function stepAt(tl: Timeline, t: number): number {
  let i = 0;
  while (i + 1 < tl.steps.length && tl.steps[i + 1].start <= t) i++;
  return i;
}
