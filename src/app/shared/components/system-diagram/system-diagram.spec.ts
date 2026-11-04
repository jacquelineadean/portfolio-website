import { SYSTEMS } from '../../../features/work/data/systems';
import { layout, pointAt, problems } from './geometry';
import { Variant } from './system.model';
import { statusAt, stepAt, timeline } from './timeline';

const VARIANTS: Variant[] = ['wide', 'tall'];

describe('system diagrams', () => {
  for (const [slug, spec] of Object.entries(SYSTEMS)) {
    describe(slug, () => {
      for (const variant of VARIANTS) {
        it(`${variant}: no wire crosses a box, a wire or a label`, () => {
          expect(problems(spec, layout(spec, variant))).toEqual([]);
        });
      }

      it('names only parts and links that exist', () => {
        const nodes = new Set(spec.nodes.map((n) => n.id));
        const edges = new Set(spec.edges.map((e) => `${e.from}>${e.to}`));
        for (const e of spec.edges) {
          expect(nodes.has(e.from) && nodes.has(e.to), `${e.from}>${e.to}`).toBe(true);
        }
        for (const step of spec.steps) {
          step.focus.forEach((id) => expect(nodes.has(id), id).toBe(true));
          for (const ev of step.events) {
            if (ev.edge) expect(edges.has(ev.edge), ev.edge).toBe(true);
            if (ev.node) expect(nodes.has(ev.node), ev.node).toBe(true);
            for (const key of Object.keys(ev.set ?? {})) {
              expect(nodes.has(key) || edges.has(key), key).toBe(true);
            }
          }
        }
        for (const p of spec.paths) {
          expect(p.first).toBeLessThanOrEqual(p.last);
          expect(p.last).toBeLessThan(spec.steps.length);
        }
      });

      it('plays every step in order on one clock', () => {
        const tl = timeline(spec);
        expect(tl.steps.length).toBe(spec.steps.length);
        tl.steps.forEach((s, i) => {
          expect(s.end).toBeGreaterThan(s.start);
          if (i) expect(s.start).toBe(tl.steps[i - 1].end);
          for (const ev of s.events) {
            expect(ev.start).toBeGreaterThanOrEqual(s.start);
            expect(ev.end).toBeLessThanOrEqual(s.end);
          }
          expect(stepAt(tl, (s.start + s.end) / 2)).toBe(i);
        });
        expect(statusAt(tl, 0)).toEqual({});
      });
    });
  }

  it('walks a wire from its first point to its last', () => {
    const wire = layout(SYSTEMS['algorithm-visualizer'], 'wide').wires[0];
    expect(pointAt(wire, 0)).toEqual(wire.points[0]);
    expect(pointAt(wire, 1)).toEqual(wire.points[wire.points.length - 1]);
  });
});
