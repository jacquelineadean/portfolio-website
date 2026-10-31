import { C, Drawing, group } from './draw.mjs';

/**
 * The project figures: what each one shows and the steps it plays.
 *
 * Every figure is drawn twice from the same parts, `wide` for desktop and
 * `tall` for phones, because one 16:9 frame shrunk to a phone's width sets its
 * labels at about 5px. The two layouts share every id, so one list of steps
 * plays either.
 */

const AV_SOURCES = [
  {
    label: 'Algorithm Visualizer README',
    url: 'https://github.com/jacquelineadean/AlgorithmVisualizer',
  },
];
const RL_SOURCES = [
  {
    label: 'The Readiness Loop README',
    url: 'https://github.com/jacquelineadean/disaster-risk-forecasting-readiness-loop',
  },
  {
    label: 'tornado-ok ledger, card exp-0002',
    url: 'https://github.com/jacquelineadean/disaster-risk-forecasting-readiness-loop/blob/main/experiments/tornado-ok/ledger.jsonl',
  },
];

const AV_FACTS = {
  av: {
    visualizations: {
      value: 31,
      unit: 'visualizations',
      source: 'src/catalog/index.js',
      note: "entries with status 'live'",
    },
    domains: { value: 8, unit: 'domains', source: 'src/catalog/index.js', note: 'DOMAINS' },
  },
};

const LEDGER = 'experiments/tornado-ok/ledger.jsonl, exp-0002';
const RL_FACTS = {
  rl: {
    tolerance: {
      value: 5,
      unit: 'points',
      source: 'contracts/tornado-ok.json',
      note: 'reliability_tolerance_pp',
    },
    miss: { value: 7.7, unit: 'points', source: LEDGER, note: 'worst populated bin, [0.2, 0.3)' },
    bin_forecast: {
      value: 24.5,
      unit: '%',
      source: LEDGER,
      note: 'mean forecast in bin [0.2, 0.3)',
    },
    bin_observed: {
      value: 32.2,
      unit: '%',
      source: LEDGER,
      note: 'observed frequency in bin [0.2, 0.3)',
    },
    bss: { value: 0.12, unit: '', source: LEDGER, note: 'Brier skill score, +0.1201' },
    auc: { value: 0.82, unit: '', source: LEDGER, note: 'AUC 0.8175, floor 0.70' },
  },
};

// ---------------------------------------------------------------- catalog

const DOMAINS = [
  { name: 'Cryptography', eg: 'RSA · SHA-256', glyph: 'lock', tint: 'blue' },
  { name: 'Graphs', eg: 'Dijkstra · A* · PageRank', glyph: 'graph', tint: 'red' },
  { name: 'Sorting', eg: 'Quicksort · merge sort', glyph: 'bars', tint: 'yellow' },
  { name: 'Numbers', eg: 'Sieve · Euclid', glyph: 'squares', tint: 'green' },
  { name: 'Statistics', eg: 'Bayes · Monte Carlo π', glyph: 'bell', tint: 'purple' },
  { name: 'AI and ML', eg: 'Backprop · attention', glyph: 'net', tint: 'blue' },
  { name: 'Distributed', eg: 'Raft · consistent hashing', glyph: 'raft', tint: 'red' },
  { name: 'Methods', eg: 'Huffman · Fourier', glyph: 'wave', tint: 'yellow' },
];

/** A small drawing of each domain, centred on (cx, cy), about 70 x 50. */
function glyph(d, kind, cx, cy, k = 1) {
  const p = (x, y) => ({ x: cx + x * k, y: cy + y * k });
  switch (kind) {
    case 'lock':
      return (
        d.curve(
          [p(-13, -2), p(-13, -16), p(-7, -25), p(0, -27), p(7, -25), p(13, -16), p(13, -2)],
          { width: 2 },
        ) +
        d.rect(cx - 20 * k, cy - 4 * k, 40 * k, 30 * k, { tint: C.blue, rx: 4, amount: 0.5 }) +
        d.circle(cx, cy + 9 * k, 4 * k, { fill: C.card, width: 1.4 })
      );
    case 'graph': {
      const nodes = [p(-30, -12), p(-4, -24), p(26, -10), p(-14, 18), p(22, 20)];
      const edges = [
        [0, 1],
        [1, 2],
        [0, 3],
        [1, 3],
        [2, 4],
        [3, 4],
      ];
      return (
        edges.map(([a, b]) => d.line(nodes[a], nodes[b], { width: 1.3, color: C.soft })).join('') +
        d.line(nodes[0], nodes[3], { color: C.red, width: 3 }) +
        d.line(nodes[3], nodes[4], { color: C.red, width: 3 }) +
        nodes
          .map((q, i) => d.circle(q.x, q.y, 5 * k, { fill: i === 0 || i === 4 ? C.red : C.card }))
          .join('')
      );
    }
    case 'bars': {
      const heights = [18, 30, 40, 12, 34, 24];
      return heights
        .map((h, i) =>
          d.rect(cx - 33 * k + i * 12 * k, cy + 24 * k - h * k, 8 * k, h * k, {
            tint: i === 3 ? C.yellow : C.card,
            rx: 1,
            amount: 0.3,
            width: 1.3,
          }),
        )
        .join('');
    }
    case 'squares': {
      // Euclid's algorithm as a tiling: squares cut from a rectangle, largest first.
      const x0 = cx - 31 * k;
      const y0 = cy - 19 * k;
      return (
        d.rect(x0, y0, 38 * k, 38 * k, { tint: C.green, rx: 1, amount: 0.4, width: 1.3 }) +
        d.rect(x0 + 38 * k, y0, 24 * k, 24 * k, { rx: 1, amount: 0.4, width: 1.3 }) +
        d.rect(x0 + 38 * k, y0 + 24 * k, 14 * k, 14 * k, { rx: 1, amount: 0.3, width: 1.3 }) +
        d.rect(x0 + 52 * k, y0 + 24 * k, 10 * k, 10 * k, { rx: 1, amount: 0.3, width: 1.3 })
      );
    }
    case 'bell': {
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const x = -34 + (68 * i) / 16;
        pts.push(p(x, 20 - 42 * Math.exp(-((x / 13) ** 2) / 2)));
      }
      return (
        d.line(p(-36, 21), p(36, 21), { width: 1.3, color: C.soft }) +
        d.curve(pts, { width: 2.2, color: C.purple, amount: 0.3 })
      );
    }
    case 'net': {
      const a = [p(-28, -18), p(-28, 0), p(-28, 18)];
      const b = [p(0, -10), p(0, 10)];
      const c = [p(28, 0)];
      const lines = [];
      a.forEach((u) => b.forEach((v) => lines.push(d.line(u, v, { width: 1.1, color: C.soft }))));
      b.forEach((u) => c.forEach((v) => lines.push(d.line(u, v, { width: 1.1, color: C.soft }))));
      return (
        lines.join('') +
        [...a, ...b].map((q) => d.circle(q.x, q.y, 5 * k)).join('') +
        d.circle(c[0].x, c[0].y, 6 * k, { fill: C.blue })
      );
    }
    case 'raft': {
      const nodes = [p(0, -20), p(-24, 16), p(24, 16)];
      return (
        d.line(nodes[0], nodes[1], { width: 1.3, color: C.soft }) +
        d.line(nodes[0], nodes[2], { width: 1.3, color: C.soft }) +
        d.line(nodes[1], nodes[2], { width: 1.3, color: C.soft, dash: '4 4' }) +
        d.circle(nodes[0].x, nodes[0].y, 8 * k, { fill: C.red }) +
        d.circle(nodes[1].x, nodes[1].y, 8 * k) +
        d.circle(nodes[2].x, nodes[2].y, 8 * k)
      );
    }
    case 'wave': {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const x = -14 + (50 * i) / 20;
        pts.push(p(x, -14 * Math.sin((i / 20) * Math.PI * 3)));
      }
      return (
        d.circle(cx - 26 * k, cy, 13 * k, { fill: 'none', color: C.soft, width: 1.3 }) +
        d.line(p(-26, 0), p(-16, -9), { width: 1.6 }) +
        d.curve(pts, { width: 2.2, color: C.yellow, amount: 0.2 })
      );
    }
  }
  return '';
}

const catalog = {
  project: 'algorithm-visualizer',
  name: 'catalog',
  title: 'Thirty-one algorithms, eight domains',
  description:
    'Eight domain tiles draw on in turn, from cryptography to Fourier methods, and each gets a citation mark.',
  sources: AV_SOURCES,
  facts: AV_FACTS,
  steps: [
    { caption: '{{av.visualizations}} across {{av.domains}}.', draw: ['t0', 't1', 't2', 't3'] },
    { caption: 'Each one runs on inputs you supply.', draw: ['t4', 't5', 't6', 't7'] },
    {
      caption: 'Every step of every trace names its source.',
      show: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const cols = wide ? 4 : 2;
    const tw = wide ? 232 : 200;
    const th = wide ? 176 : 156;
    const gap = wide ? 18 : 14;
    const m = 10;
    const width = m * 2 + cols * tw + (cols - 1) * gap;
    const rows = DOMAINS.length / cols;
    const height = m * 2 + rows * th + (rows - 1) * gap + 6;
    const d = new Drawing('catalog', width, height);
    let body = '';
    DOMAINS.forEach((dom, i) => {
      const x = m + (i % cols) * (tw + gap);
      const y = m + 6 + Math.floor(i / cols) * (th + gap);
      const gy = y + (wide ? 58 : 52);
      const tile =
        d.rect(x, y, tw, th, { tint: C.tint[dom.tint], rx: 4 }) +
        glyph(d, dom.glyph, x + tw / 2, gy, wide ? 1 : 0.9) +
        d.text(x + tw / 2, y + th - (wide ? 52 : 44), dom.name, { s: wide ? 1.2 : 1.1, w: 600 }) +
        d.text(x + tw / 2, y + th - (wide ? 24 : 20), dom.eg, {
          s: wide ? 0.92 : 0.84,
          cls: 'f-muted',
        });
      body += group(`t${i}`, tile);
      // The citation mark: a tag clipped to the tile's corner.
      body += group(
        `c${i}`,
        d.pill(x + tw - 74, y - 8, 70, 26, 'cited', {
          tint: C.card,
          s: 0.82,
          w: 600,
          cls: 'f-good',
          color: C.green,
        }),
      );
    });
    return d.svg(body);
  },
};

// ---------------------------------------------------------------- calibration

/**
 * The seasonal model's populated reliability bins on the Oklahoma tornado
 * contract (tornado-ok exp-0002, validation years), from the committed ledger:
 * mean forecast percent, observed percent, units in the bin. The fourth bin
 * holds 15 units, under the contract's 30-unit floor, so it is not scored.
 */
const TORNADO_BINS = [
  [2.41, 4.02, 1245],
  [15.15, 21.05, 190],
  [24.53, 32.22, 90],
];

const calibration = {
  project: 'readiness-loop',
  name: 'calibration',
  title: 'A forecast that means what it says',
  description: 'Real bins from the Oklahoma tornado ledger: the worst misses the band.',
  sources: RL_SOURCES,
  facts: RL_FACTS,
  steps: [
    {
      caption: 'On the diagonal, a forecast comes true as often as it says.',
      draw: ['axes'],
    },
    {
      caption: 'The seasonal tornado model, scored on Oklahoma counties.',
      show: ['pts'],
    },
    {
      caption: 'The contract allows {{rl.tolerance}} either side of the line.',
      show: ['band'],
    },
    {
      caption: 'Its worst bin misses by {{rl.miss}}.',
      show: ['miss'],
      pulse: ['p2'],
    },
    {
      caption: 'Skill and discrimination pass, and calibration fails the card.',
      draw: ['panel'],
      show: ['marks'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('calibration', wide ? 1000 : 430, wide ? 380 : 680);
    const size = wide ? 290 : 300;
    const x0 = wide ? 92 : 84;
    const y0 = wide ? 330 : 336;
    const top = 40;
    const at = (f, o) => ({ x: x0 + (f / top) * size, y: y0 - (o / top) * size });
    let b = '';
    const band = 5;
    b += `<polygon id="band" points="${[
      at(0, band),
      at(top - band, top),
      at(top, top),
      at(top, top - band),
      at(band, 0),
      at(0, 0),
    ]
      .map((p) => `${p.x},${p.y}`)
      .join(' ')}" fill="${C.tint.blue}"/>`;
    b += group(
      'axes',
      d.line(at(0, 0), at(top, 0), { width: 1.6 }) +
        d.line(at(0, 0), at(0, top), { width: 1.6 }) +
        d.line(at(0, 0), at(top, top), { width: 1.4, color: C.muted }) +
        d.text(x0 + size / 2, y0 + 40, 'forecast probability', { s: 0.92, cls: 'f-muted' }) +
        `<text transform="translate(${x0 - 34} ${y0 - size / 2}) rotate(-90) scale(0.92)" x="0" y="0" text-anchor="middle" class="f-muted">how often it happened</text>` +
        d.text(x0, y0 + 20, '0', { s: 0.8, cls: 'f-muted' }) +
        d.text(x0 + size, y0 + 20, '40%', { s: 0.8, cls: 'f-muted' }) +
        d.text(x0 - 10, y0 - size + 5, '40%', { s: 0.8, cls: 'f-muted', a: 'end' }),
    );
    b += group(
      'pts',
      TORNADO_BINS.map(([f, o, n], i) => {
        const p = at(f, o);
        const r = 5 + Math.sqrt(n) / 4;
        return group(`p${i}`, d.circle(p.x, p.y, r, { fill: C.blue, color: C.ink, width: 1.2 }));
      }).join(''),
    );
    const bad = at(TORNADO_BINS[2][0], TORNADO_BINS[2][1]);
    const lx = bad.x - 18;
    b += group(
      'miss',
      d.line(bad, at(TORNADO_BINS[2][0], TORNADO_BINS[2][0]), {
        width: 2,
        color: C.red,
        dash: '4 4',
      }) +
        d.text(lx, bad.y - 6, 'forecast {{rl.bin_forecast}}', { s: 0.86, a: 'end' }) +
        d.text(lx, bad.y + 14, 'happened {{rl.bin_observed}}', {
          s: 0.86,
          w: 600,
          cls: 'f-legacy',
          a: 'end',
        }),
    );
    const rows = [
      ['Skill above climatology', 'BSS {{rl.bss}}', true],
      ['Discrimination', 'AUC {{rl.auc}}', true],
      ['Reliability within {{rl.tolerance}}', 'worst bin off by {{rl.miss}}', false],
    ];
    const px = wide ? 480 : 10;
    const py = wide ? 60 : 428;
    const pw = wide ? 510 : 410;
    const ph = wide ? 250 : 244;
    const rowGap = wide ? 58 : 54;
    let panel =
      d.rect(px, py, pw, ph) +
      d.text(px + 24, py + 38, 'Oklahoma tornado contract', { s: 1.1, w: 600, a: 'start' });
    let marks = '';
    rows.forEach(([label, value, ok], i) => {
      const ry = py + (wide ? 96 : 80) + i * rowGap;
      panel +=
        d.rect(px + 24, ry - 15, 22, 22, { rx: 3, amount: 0.4, width: 1.4 }) +
        d.text(px + 60, ry + 2, label, { s: wide ? 1 : 0.9, a: 'start' }) +
        (wide
          ? d.text(px + pw - 24, ry + 2, value, { s: 0.92, cls: 'f-muted', a: 'end' })
          : d.text(px + 60, ry + 22, value, { s: 0.84, cls: 'f-muted', a: 'start' }));
      marks += ok ? d.tick(px + 36, ry - 5, 11) : d.cross(px + 35, ry - 4, 8);
    });
    b += group('panel', panel);
    b += group('marks', marks);
    return d.svg(b);
  },
};

export const FIGURES = [catalog, calibration];
