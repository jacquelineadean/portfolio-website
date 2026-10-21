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
];

const AV_FACTS = {
  av: {
    visualizations: {
      value: 28,
      unit: 'visualizations',
      source: 'readme',
      note: 'catalog entries',
    },
    domains: { value: 8, unit: 'domains', source: 'readme', note: 'catalog sections' },
  },
};

const RL_FACTS = {
  rl: {
    thresholds: { value: 3, unit: 'pass thresholds', source: 'readme', note: 'per contract' },
    example: {
      value: 10,
      unit: '%',
      source: 'readme',
      note: 'an illustrative forecast, not a result',
    },
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
  title: 'Twenty-eight algorithms, eight domains',
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

// ---------------------------------------------------------------- evidence gate

const gate = {
  project: 'algorithm-visualizer',
  name: 'evidence-gate',
  title: 'The evidence gate',
  description:
    'A test walks every registered visualization, and a trace step with no source that resolves fails the suite.',
  sources: AV_SOURCES,
  facts: AV_FACTS,
  steps: [
    {
      caption: 'A test walks every registered visualization.',
      draw: ['registry', 'g-rt', 'test'],
      flow: ['rt'],
    },
    { caption: 'Each trace step must name a source.', draw: ['steps'], flow: ['t1', 't2', 't3'] },
    {
      caption: 'Each source must resolve in the sources file.',
      draw: ['sources', 'g-s1', 'g-s2'],
      flow: ['s1', 's2'],
      show: ['ok'],
    },
    {
      caption: 'A step with no source fails the build.',
      show: ['miss', 'fail'],
      pulse: ['fail'],
      focus: ['test', 'steps', 'miss', 'fail'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('evidence-gate', wide ? 1000 : 430, wide ? 360 : 560);
    const entries = [
      ['Paper', C.blue],
      ['Standard', C.purple],
      ['Theorem', C.green],
      ['Simplification', C.yellow],
    ];
    const names = ['rsa/', 'dijkstra/', 'raft/', '…'];
    let b = '';
    if (wide) {
      b += group(
        'registry',
        d.rect(10, 60, 180, 240) +
          d.text(100, 96, 'Registry', { s: 1.15, w: 600 }) +
          names
            .map((s, i) => d.pill(30, 116 + i * 42, 140, 30, s, { tint: C.tint.blue, s: 0.9 }))
            .join(''),
      );
      b += d.arrow('rt', [
        { x: 192, y: 180 },
        { x: 262, y: 180 },
      ]);
      b += group(
        'test',
        d.box(264, 115, 200, 130, 'Evidence test', ['every step,', 'every map node']),
      );
      b += group(
        'steps',
        ['step 1', 'step 2', 'step 3']
          .map((s, i) => d.pill(560, 66 + i * 90, 140, 46, s, { s: 0.95 }))
          .join('') +
          d.arrow('t1', [
            { x: 466, y: 165 },
            { x: 510, y: 120 },
            { x: 556, y: 90 },
          ]) +
          d.arrow('t2', [
            { x: 466, y: 180 },
            { x: 556, y: 180 },
          ]) +
          d.arrow('t3', [
            { x: 466, y: 195 },
            { x: 510, y: 240 },
            { x: 556, y: 268 },
          ]),
      );
      b += group(
        'sources',
        d.rect(790, 40, 200, 280) +
          d.text(890, 78, 'Sources file', { s: 1.15, w: 600 }) +
          entries
            .map(([s, dot], i) => d.pill(806, 100 + i * 52, 168, 38, s, { dot, s: 0.9 }))
            .join(''),
      );
      b += d.arrow('s1', [
        { x: 702, y: 89 },
        { x: 750, y: 100 },
        { x: 802, y: 119 },
      ]);
      b += d.arrow('s2', [
        { x: 702, y: 179 },
        { x: 750, y: 175 },
        { x: 802, y: 171 },
      ]);
      b += group('ok', d.tick(680, 89) + d.tick(680, 179));
      b += group(
        'miss',
        d.cross(680, 269, 9) +
          d.text(714, 274, 'no source', { s: 0.95, w: 600, cls: 'f-legacy', a: 'start' }),
      );
      b += group(
        'fail',
        d.pill(294, 270, 140, 40, 'suite fails', {
          tint: C.tint.red,
          color: C.red,
          w: 600,
          cls: 'f-legacy',
        }),
      );
    } else {
      b += group(
        'registry',
        d.rect(10, 10, 410, 124) +
          d.text(30, 42, 'Registry', { s: 1.15, w: 600, a: 'start' }) +
          names
            .map((s, i) =>
              d.pill(30 + (i % 2) * 195, 58 + Math.floor(i / 2) * 36, 175, 28, s, {
                tint: C.tint.blue,
                s: 0.9,
              }),
            )
            .join(''),
      );
      b += d.arrow('rt', [
        { x: 135, y: 136 },
        { x: 135, y: 176 },
      ]);
      b += group(
        'test',
        d.box(10, 178, 250, 92, 'Evidence test', ['every step, every node'], { gap: 20 }),
      );
      b += group(
        'fail',
        d.pill(282, 206, 136, 38, 'suite fails', {
          tint: C.tint.red,
          color: C.red,
          w: 600,
          cls: 'f-legacy',
        }),
      );
      b += group(
        'steps',
        ['step 1', 'step 2', 'step 3']
          .map((s, i) => d.pill(10 + i * 142, 318, 126, 44, s, { s: 0.95 }))
          .join('') +
          d.arrow('t1', [
            { x: 120, y: 272 },
            { x: 90, y: 296 },
            { x: 73, y: 314 },
          ]) +
          d.arrow('t2', [
            { x: 135, y: 272 },
            { x: 180, y: 296 },
            { x: 215, y: 314 },
          ]) +
          d.arrow('t3', [
            { x: 150, y: 272 },
            { x: 290, y: 292 },
            { x: 357, y: 314 },
          ]),
      );
      b += group('ok', d.tick(73, 384) + d.tick(215, 384));
      b += group(
        'miss',
        d.cross(357, 384, 9) + d.text(357, 414, 'no source', { s: 0.92, w: 600, cls: 'f-legacy' }),
      );
      b += group(
        'sources',
        d.rect(10, 432, 410, 120) +
          d.text(400, 462, 'Sources file', { s: 1.15, w: 600, a: 'end' }) +
          entries
            .map(([s, dot], i) =>
              d.pill(30 + (i % 2) * 195, 476 + Math.floor(i / 2) * 38, 175, 30, s, {
                dot,
                s: 0.86,
              }),
            )
            .join(''),
      );
      b += d.arrow('s1', [
        { x: 52, y: 366 },
        { x: 40, y: 420 },
        { x: 70, y: 474 },
      ]);
      b += d.arrow('s2', [
        { x: 236, y: 366 },
        { x: 250, y: 420 },
        { x: 270, y: 474 },
      ]);
    }
    return d.svg(b);
  },
};

// ---------------------------------------------------------------- architecture

const architecture = {
  project: 'algorithm-visualizer',
  name: 'architecture',
  title: 'One directory per algorithm',
  description:
    'One defineVisualization call registers an algorithm directory, adding a catalog card and a hash route.',
  sources: AV_SOURCES,
  facts: AV_FACTS,
  steps: [
    { caption: 'Each algorithm is one self-contained directory.', draw: ['folder'] },
    {
      caption: 'One defineVisualization call registers it.',
      draw: ['g-fd', 'define', 'g-dr', 'registry'],
      flow: ['fd', 'dr'],
    },
    {
      caption: 'The registry adds a catalog card and a hash route.',
      draw: ['g-rc', 'card', 'g-rr', 'route'],
      flow: ['rc', 'rr'],
    },
    {
      caption: 'Shared instruments do the playback and drawing.',
      show: ['instruments', 'g-iv'],
      flow: ['iv'],
      pulse: ['viz'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('architecture', wide ? 1000 : 440, wide ? 380 : 700);
    const files = ['model', 'sources', 'trace', 'visualizer', 'tests'];
    let b = '';
    const folder = (x, y, w, h) =>
      d.strokes(
        [`M${x + 2} ${y + 2} L${x + 2} ${y - 14} L${x + 84} ${y - 14} L${x + 96} ${y + 2}`],
        { width: 1.5 },
      ) + d.rect(x, y, w, h, { tint: C.tint.yellow, rx: 8 });
    if (wide) {
      let f =
        folder(10, 34, 230, 330) + d.text(30, 70, 'dijkstra/', { s: 1.2, w: 600, a: 'start' });
      files.forEach((s, i) => {
        const pill = d.pill(30, 88 + i * 52, 190, 38, s, { s: 0.95 });
        f += s === 'visualizer' ? group('viz', pill) : pill;
      });
      b += group('folder', f);
      b += d.arrow('fd', [
        { x: 242, y: 190 },
        { x: 304, y: 190 },
      ]);
      b += group(
        'define',
        d.pill(306, 166, 250, 48, 'defineVisualization()', { tint: C.tint.blue, w: 600, s: 1 }),
      );
      b += d.arrow('dr', [
        { x: 558, y: 190 },
        { x: 616, y: 190 },
      ]);
      b += group('registry', d.box(618, 150, 150, 80, 'Registry'));
      b += d.arrow('rc', [
        { x: 770, y: 172 },
        { x: 800, y: 120 },
        { x: 828, y: 100 },
      ]);
      b += d.arrow('rr', [
        { x: 770, y: 208 },
        { x: 800, y: 262 },
        { x: 828, y: 282 },
      ]);
      b += group(
        'card',
        d.box(830, 56, 160, 90, 'Catalog card', ['one per algorithm'], { tint: C.tint.green }),
      );
      b += group(
        'route',
        d.box(830, 238, 160, 90, 'Hash route', ['#/dijkstra'], { tint: C.tint.purple }),
      );
      b += group(
        'instruments',
        d.text(306, 288, 'shared instruments', { s: 0.88, cls: 'f-muted', a: 'start' }) +
          d.pill(306, 302, 132, 40, 'Trace player', { s: 0.92 }) +
          d.pill(448, 302, 116, 40, 'Drill-down', { s: 0.92 }) +
          d.pill(574, 302, 194, 40, 'Plot · graph · matrix', { s: 0.92 }),
      );
      b += d.arrow(
        'iv',
        [
          { x: 304, y: 322 },
          { x: 262, y: 300 },
          { x: 224, y: 263 },
        ],
        { dash: '5 5' },
      );
    } else {
      let f =
        folder(10, 26, 410, 196) + d.text(30, 60, 'dijkstra/', { s: 1.2, w: 600, a: 'start' });
      const spots = [
        [30, 76],
        [225, 76],
        [30, 120],
        [225, 120],
        [30, 164],
      ];
      files.forEach((s, i) => {
        const pill = d.pill(spots[i][0], spots[i][1], 175, 34, s, { s: 0.92 });
        f += s === 'visualizer' ? group('viz', pill) : pill;
      });
      b += group('folder', f);
      b += d.arrow('fd', [
        { x: 215, y: 224 },
        { x: 215, y: 260 },
      ]);
      b += group(
        'define',
        d.pill(70, 262, 290, 46, 'defineVisualization()', { tint: C.tint.blue, w: 600, s: 1 }),
      );
      b += d.arrow('dr', [
        { x: 215, y: 310 },
        { x: 215, y: 342 },
      ]);
      b += group('registry', d.box(140, 344, 150, 62, 'Registry'));
      b += d.arrow('rc', [
        { x: 170, y: 408 },
        { x: 130, y: 430 },
        { x: 105, y: 452 },
      ]);
      b += d.arrow('rr', [
        { x: 260, y: 408 },
        { x: 300, y: 430 },
        { x: 325, y: 452 },
      ]);
      b += group(
        'card',
        d.box(10, 454, 190, 86, 'Catalog card', ['one per algorithm'], { tint: C.tint.green }),
      );
      b += group(
        'route',
        d.box(230, 454, 190, 86, 'Hash route', ['#/dijkstra'], { tint: C.tint.purple }),
      );
      b += group(
        'instruments',
        d.text(10, 580, 'shared instruments', { s: 0.88, cls: 'f-muted', a: 'start' }) +
          d.pill(10, 592, 195, 38, 'Trace player', { s: 0.92 }) +
          d.pill(215, 592, 195, 38, 'Drill-down', { s: 0.92 }) +
          d.pill(10, 640, 400, 38, 'Plot · graph · matrix', { s: 0.92 }),
      );
      b += d.arrow(
        'iv',
        [
          { x: 412, y: 612 },
          { x: 432, y: 560 },
          { x: 432, y: 200 },
          { x: 424, y: 146 },
          { x: 403, y: 137 },
        ],
        { dash: '5 5' },
      );
    }
    return d.svg(b);
  },
};

// ---------------------------------------------------------------- the loop

const loop = {
  project: 'readiness-loop',
  name: 'loop',
  title: 'The readiness loop',
  description:
    'An agent proposes, a fixed harness scores, a ledger records; only a passing model reaches a county brief.',
  sources: RL_SOURCES,
  facts: RL_FACTS,
  steps: [
    {
      caption: 'Public data comes in pinned by its hash.',
      draw: ['data', 'g-df', 'features'],
      flow: ['df'],
    },
    {
      caption: 'An agent proposes a model and the harness scores it.',
      draw: ['g-fa', 'agent', 'g-ah', 'harness'],
      flow: ['fa', 'ah'],
    },
    {
      caption: 'Every score becomes a card in a hash-chained ledger.',
      draw: ['g-hl', 'ledger', 'g-lf'],
      flow: ['hl', 'lf'],
    },
    {
      caption: 'The loop repeats until the probabilities hold.',
      flow: ['fa', 'ah', 'hl', 'lf'],
      pulse: ['harness'],
    },
    {
      caption: 'Only then does a planner get a county brief.',
      draw: ['g-hb', 'brief'],
      flow: ['hb'],
      focus: ['harness', 'g-hb', 'brief'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('loop', wide ? 1000 : 430, wide ? 380 : 676);
    let b = '';
    if (wide) {
      b += group(
        'data',
        d.box(10, 120, 180, 140, 'Public data', ['NOAA · ERA5 · FEMA', 'pinned by hash'], {
          tint: C.tint.blue,
        }),
      );
      b += d.arrow('df', [
        { x: 192, y: 190 },
        { x: 256, y: 190 },
      ]);
      b += group('features', d.box(258, 150, 154, 80, 'Features', ['temporal firewall']));
      b += group(
        'agent',
        d.box(423, 16, 154, 80, 'Agent', ['proposes a model'], { tint: C.tint.purple }),
      );
      b += group(
        'harness',
        d.box(588, 150, 154, 80, 'Harness', ['fixed scorer'], { tint: C.tint.yellow }),
      );
      b += group('ledger', d.box(423, 284, 154, 80, 'Ledger', ['hash-chained cards']));
      b += d.arrow('fa', [
        { x: 335, y: 148 },
        { x: 352, y: 88 },
        { x: 420, y: 58 },
      ]);
      b += d.arrow('ah', [
        { x: 580, y: 58 },
        { x: 648, y: 88 },
        { x: 665, y: 148 },
      ]);
      b += d.arrow('hl', [
        { x: 665, y: 232 },
        { x: 648, y: 292 },
        { x: 580, y: 322 },
      ]);
      b += d.arrow('lf', [
        { x: 420, y: 322 },
        { x: 352, y: 292 },
        { x: 335, y: 232 },
      ]);
      b += d.arrow(
        'hb',
        [
          { x: 744, y: 190 },
          { x: 806, y: 190 },
        ],
        { color: C.green, width: 2.2 },
      );
      b += group(
        'brief',
        d.box(808, 130, 182, 120, 'County brief', ['every sentence', 'cites a card'], {
          tint: C.tint.green,
        }),
      );
    } else {
      b += group(
        'data',
        d.box(105, 10, 220, 112, 'Public data', ['NOAA · ERA5 · FEMA', 'pinned by hash'], {
          tint: C.tint.blue,
        }),
      );
      b += d.arrow('df', [
        { x: 215, y: 124 },
        { x: 215, y: 160 },
      ]);
      b += group('features', d.box(135, 162, 160, 76, 'Features', ['temporal firewall']));
      b += group(
        'agent',
        d.box(262, 292, 158, 80, 'Agent', ['proposes a model'], { tint: C.tint.purple }),
      );
      b += group(
        'harness',
        d.box(135, 426, 160, 76, 'Harness', ['fixed scorer'], { tint: C.tint.yellow }),
      );
      b += group('ledger', d.box(10, 292, 158, 80, 'Ledger', ['hash-chained'], { tint: C.card }));
      b += d.arrow('fa', [
        { x: 297, y: 200 },
        { x: 336, y: 222 },
        { x: 341, y: 288 },
      ]);
      b += d.arrow('ah', [
        { x: 341, y: 376 },
        { x: 336, y: 444 },
        { x: 299, y: 464 },
      ]);
      b += d.arrow('hl', [
        { x: 133, y: 464 },
        { x: 94, y: 444 },
        { x: 89, y: 376 },
      ]);
      b += d.arrow('lf', [
        { x: 89, y: 288 },
        { x: 94, y: 222 },
        { x: 133, y: 200 },
      ]);
      b += d.arrow(
        'hb',
        [
          { x: 215, y: 504 },
          { x: 215, y: 548 },
        ],
        { color: C.green, width: 2.2 },
      );
      b += group(
        'brief',
        d.box(95, 550, 240, 112, 'County brief', ['every sentence', 'cites a card'], {
          tint: C.tint.green,
        }),
      );
    }
    return d.svg(b);
  },
};

// ---------------------------------------------------------------- calibration

/** Schematic reliability points: forecast percent, observed percent. */
const OVERCONFIDENT = [
  [10, 23],
  [30, 39],
  [50, 50],
  [70, 59],
  [90, 72],
];
const CALIBRATED = [
  [10, 11],
  [30, 28],
  [50, 52],
  [70, 68],
  [90, 88],
];

const calibration = {
  project: 'readiness-loop',
  name: 'calibration',
  title: 'A forecast that means what it says',
  description:
    "A schematic reliability diagram: calibrated forecasts land inside the contract's five-point band.",
  sources: RL_SOURCES,
  facts: RL_FACTS,
  steps: [
    {
      caption: 'A {{rl.example}} forecast should come true about one time in ten.',
      draw: ['axes'],
      show: ['m10'],
    },
    { caption: 'Overconfident forecasts fall off the diagonal.', show: ['over'] },
    {
      caption: 'Each contract fixes {{rl.thresholds}} in advance.',
      draw: ['panel'],
      show: ['band'],
      pulse: ['r1'],
    },
    {
      caption: 'A model passes only when it clears all of them.',
      hide: ['over', 'm10'],
      show: ['good', 'ticks'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('calibration', wide ? 1000 : 430, wide ? 380 : 650);
    const size = wide ? 290 : 300;
    const x0 = wide ? 92 : 84;
    const y0 = wide ? 330 : 336;
    const at = (f, o) => ({ x: x0 + (f / 100) * size, y: y0 - (o / 100) * size });
    let b = '';
    const band = 5;
    b += `<polygon id="band" points="${[
      at(0, band),
      at(100 - band, 100),
      at(100, 100),
      at(100, 100 - band),
      at(band, 0),
      at(0, 0),
    ]
      .map((p) => `${p.x},${p.y}`)
      .join(' ')}" fill="${C.tint.blue}"/>`;
    b += group(
      'axes',
      d.line(at(0, 0), at(100, 0), { width: 1.6 }) +
        d.line(at(0, 0), at(0, 100), { width: 1.6 }) +
        d.line(at(0, 0), at(100, 100), { width: 1.4, color: C.muted }) +
        d.text(x0 + size / 2, y0 + 40, 'forecast probability', { s: 0.92, cls: 'f-muted' }) +
        `<text transform="translate(${x0 - 34} ${y0 - size / 2}) rotate(-90) scale(0.92)" x="0" y="0" text-anchor="middle" class="f-muted">how often it happened</text>` +
        d.text(x0, y0 + 20, '0', { s: 0.8, cls: 'f-muted' }) +
        d.text(x0 + size, y0 + 20, '100%', { s: 0.8, cls: 'f-muted' }) +
        d.text(x0 - 10, y0 - size + 5, '100%', { s: 0.8, cls: 'f-muted', a: 'end' }) +
        d.text(x0 + 8, y0 - size - 12, 'schematic', { s: 0.78, cls: 'f-muted', a: 'start' }),
    );
    const m = at(10, 10);
    b += group(
      'm10',
      d.circle(m.x, m.y, 7, { fill: C.blue, color: C.ink }) +
        d.line(
          { x: m.x + 10, y: m.y - 8 },
          { x: m.x + 40, y: m.y - 34 },
          { width: 1.2, color: C.soft },
        ) +
        d.text(m.x + 44, m.y - 38, 'says 10%, happens 1 in 10', { s: 0.9, w: 600, a: 'start' }),
    );
    b += group(
      'over',
      OVERCONFIDENT.map(([f, o]) => {
        const p = at(f, o);
        return d.circle(p.x, p.y, 7, { fill: C.red, color: C.ink, width: 1.2 });
      }).join(''),
    );
    b += group(
      'good',
      CALIBRATED.map(([f, o]) => {
        const p = at(f, o);
        return d.circle(p.x, p.y, 7, { fill: C.blue, color: C.ink, width: 1.2 });
      }).join(''),
    );
    const rows = [
      'Reliability within five points per bin',
      'Skill above climatology',
      'Discrimination above a floor',
    ];
    const px = wide ? 480 : 10;
    const py = wide ? 60 : 428;
    const pw = wide ? 510 : 410;
    const ph = wide ? 250 : 212;
    const rowGap = wide ? 58 : 50;
    let panel =
      d.rect(px, py, pw, ph) +
      d.text(px + 24, py + 38, 'Pass thresholds', { s: 1.15, w: 600, a: 'start' });
    let ticks = '';
    rows.forEach((r, i) => {
      const ry = py + (wide ? 96 : 84) + i * rowGap;
      const row =
        d.rect(px + 24, ry - 15, 22, 22, { rx: 3, amount: 0.4, width: 1.4 }) +
        d.text(px + 60, ry + 2, r, { s: wide ? 1 : 0.9, a: 'start' });
      panel += group(`r${i}`, row);
      ticks += d.tick(px + 36, ry - 5, 11);
    });
    b += group('panel', panel);
    b += group('ticks', ticks);
    return d.svg(b);
  },
};

// ---------------------------------------------------------------- harness

const harness = {
  project: 'readiness-loop',
  name: 'harness',
  title: 'Harness before model',
  description:
    'A hashed contract governs every card, a model that reads its outcomes is rejected, and the test set opens once.',
  sources: RL_SOURCES,
  facts: RL_FACTS,
  steps: [
    { caption: 'Every experiment runs under a pre-registered contract.', draw: ['contract'] },
    {
      caption: 'The contract hash is stamped on every card.',
      draw: ['harness', 'g-ch', 'cards'],
      show: ['g-hc1', 'g-hc2', 'g-hc3'],
      flow: ['ch', 'hc1', 'hc2', 'hc3'],
    },
    {
      caption: 'A model that reads its own outcomes is rejected.',
      draw: ['oracle', 'g-oh'],
      flow: ['oh'],
      show: ['rej'],
      pulse: ['rej'],
    },
    {
      caption: 'The held-out test set opens once per contract.',
      draw: ['test', 'g-ht'],
      pulse: ['test'],
    },
  ],
  draw(variant) {
    const wide = variant === 'wide';
    const d = new Drawing('harness', wide ? 1000 : 430, wide ? 380 : 560);
    const rows = [
      'Hazard',
      'Geography',
      'Forecast period',
      'Damaging event',
      'Train · validate · test years',
      'Pass thresholds',
    ];
    const card = (x, y, w, h) =>
      d.rect(x, y, w, h, { tint: C.card }) +
      d.text(x + 18, y + 28, 'experiment card', { s: 0.92, a: 'start' }) +
      d.pill(x + 18, y + 40, w - 36, 26, '# contract hash', {
        tint: C.tint.purple,
        s: 0.8,
        color: C.purple,
      });
    let b = '';
    if (wide) {
      let c =
        d.rect(10, 16, 270, 348, { tint: C.tint.yellow }) +
        d.text(34, 52, 'Contract', { s: 1.2, w: 600, a: 'start' });
      rows.forEach((r, i) => {
        c += d.text(34, 90 + i * 34, r, { s: 0.92, a: 'start' });
        c += d.line(
          { x: 34, y: 100 + i * 34 },
          { x: 256, y: 100 + i * 34 },
          { width: 0.8, color: '#d9d5cb', amount: 0.3 },
        );
      });
      c += d.pill(34, 306, 222, 38, '# contract hash', {
        tint: C.tint.purple,
        color: C.purple,
        s: 0.92,
        w: 600,
      });
      b += group('contract', c);
      b += group('harness', d.box(400, 150, 190, 84, 'Harness', ['fixed scorer']));
      b += d.arrow('ch', [
        { x: 258, y: 325 },
        { x: 340, y: 300 },
        { x: 398, y: 222 },
      ]);
      b += group(
        'cards',
        card(720, 70, 270, 80) + card(720, 160, 270, 80) + card(720, 250, 270, 80),
      );
      b += d.arrow('hc1', [
        { x: 592, y: 180 },
        { x: 650, y: 130 },
        { x: 716, y: 110 },
      ]);
      b += d.arrow('hc2', [
        { x: 592, y: 192 },
        { x: 716, y: 200 },
      ]);
      b += d.arrow('hc3', [
        { x: 592, y: 206 },
        { x: 650, y: 270 },
        { x: 716, y: 290 },
      ]);
      b += group(
        'oracle',
        d.box(400, 10, 190, 76, 'Leaky model', ['reads its outcomes'], {
          tint: C.tint.red,
          color: C.red,
        }),
      );
      b += d.arrow(
        'oh',
        [
          { x: 495, y: 88 },
          { x: 495, y: 146 },
        ],
        { color: C.red },
      );
      b += group(
        'rej',
        d.cross(495, 117, 9) +
          d.text(478, 122, 'rejected', { s: 0.95, w: 600, cls: 'f-legacy', a: 'end' }),
      );
      b += group(
        'test',
        d.box(400, 290, 190, 76, 'Test set', ['one touch per contract'], { tint: C.tint.green }),
      );
      b += d.arrow(
        'ht',
        [
          { x: 495, y: 236 },
          { x: 495, y: 286 },
        ],
        { dash: '5 5' },
      );
    } else {
      let c =
        d.rect(10, 10, 410, 250, { tint: C.tint.yellow }) +
        d.text(30, 44, 'Contract', { s: 1.2, w: 600, a: 'start' });
      rows.forEach((r, i) => {
        c += d.text(30, 76 + i * 25, r, { s: 0.88, a: 'start' });
      });
      c += d.pill(30, 214, 230, 32, '# contract hash', {
        tint: C.tint.purple,
        color: C.purple,
        s: 0.88,
        w: 600,
      });
      b += group('contract', c);
      b += group(
        'oracle',
        d.box(10, 306, 170, 80, 'Leaky model', ['reads its outcomes'], {
          tint: C.tint.red,
          color: C.red,
          gap: 20,
        }),
      );
      b += group('harness', d.box(250, 306, 170, 80, 'Harness', ['fixed scorer'], { gap: 20 }));
      b += d.arrow('ch', [
        { x: 262, y: 230 },
        { x: 320, y: 250 },
        { x: 335, y: 302 },
      ]);
      b += d.arrow(
        'oh',
        [
          { x: 182, y: 346 },
          { x: 246, y: 346 },
        ],
        { color: C.red },
      );
      b += group(
        'rej',
        d.cross(214, 346, 8) + d.text(214, 322, 'rejected', { s: 0.86, w: 600, cls: 'f-legacy' }),
      );
      b += group(
        'cards',
        card(250, 450, 170, 76) + card(242, 442, 170, 76) + card(234, 434, 170, 76),
      );
      const deck = [
        { x: 335, y: 388 },
        { x: 330, y: 410 },
        { x: 320, y: 430 },
      ];
      b += d.arrow('hc1', deck, { wobble: 0 });
      b += d.arrow('hc2', deck, { wobble: 0 });
      b += d.arrow('hc3', deck, { wobble: 0 });
      b += group(
        'test',
        d.box(10, 434, 190, 84, 'Test set', ['one touch per contract'], {
          tint: C.tint.green,
          gap: 20,
        }),
      );
      b += d.arrow(
        'ht',
        [
          { x: 260, y: 388 },
          { x: 230, y: 410 },
          { x: 160, y: 430 },
        ],
        { dash: '5 5' },
      );
    }
    return d.svg(b);
  },
};

export const FIGURES = [catalog, gate, architecture, loop, calibration, harness];
