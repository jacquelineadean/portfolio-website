/**
 * Builds the project figures with the chronicle plugin's animation command.
 *
 *   node scripts/figures/build.mjs [figure-name ...]
 *
 * Each figure in figures.mjs is written out as two chronicle diagram runs
 * (wide and tall) under chronicle-runs/, built to a self-contained SVG, and
 * copied to public/projects/<project>/<name>-<variant>.svg, where the project
 * page loads it. The SVGs are committed, so the site build never needs the
 * plugin; rerun this after changing a figure.
 *
 * CHRONICLE can point at the plugin's `scripts/chronicle` launcher; otherwise
 * the newest copy under ~/.claude/plugins is used. FORMATS=svg skips the PNG
 * storyboards, which need NumPy and OpenCV.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES } from './figures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runs = join(root, 'chronicle-runs');
const out = join(root, 'public', 'projects');

/** The site's own look (src/styles/_variables.scss), as a chronicle theme. */
const THEME = {
  concept:
    "The portfolio's own lab notebook, taken from the site itself: warm card paper, near-black ink, " +
    'hand-sketched boxes, blue for what moves and red for what fails.',
  palette: {
    paper: '#fffdf9',
    ink: '#1f1e1a',
    accent: '#4285f4',
    legacy: '#ea4335',
    series: ['#4285f4', '#ea4335', '#34a853', '#a142f4', '#47463f'],
    colors: { green: '#34a853', yellow: '#f9ab00', purple: '#a142f4' },
  },
  fonts: {
    display: 'Instrument Serif',
    body: 'DM Sans',
    ui: 'DM Sans',
    mono: 'DM Mono',
    hand: 'Caveat',
  },
};

const WIDTH = { wide: 1280, tall: 1080 };

/**
 * The frame height that fits the drawing at the frame's full width.
 *
 * Mirrors chronicle's stage layout with the title hidden: margins of 36u, the
 * caption band and step strip below, where u = sqrt(w * h) / 960 grows with
 * the frame, and a drawing never scales past 1.6u.
 */
function frameFor(variant, dw, dh) {
  const width = WIDTH[variant];
  let height = Math.round((width * dh) / dw);
  for (let i = 0; i < 40; i++) {
    const u = Math.max(0.6, Math.sqrt(width * height) / 960);
    const scale = Math.min((width - 72 * u) / dw, 1.6 * u);
    height = Math.ceil(173.6 * u + dh * scale + 4);
  }
  return { width, height };
}

function chronicleBin() {
  if (process.env.CHRONICLE) return process.env.CHRONICLE;
  const base = join(homedir(), '.claude', 'plugins');
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 5 || !existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!statSync(path).isDirectory()) continue;
      const bin = join(path, 'scripts', 'chronicle');
      if (name === 'chronicle' && existsSync(bin)) found.push(bin);
      else walk(path, depth + 1);
    }
  };
  walk(base, 0);
  if (!found.length)
    throw new Error('chronicle plugin not found; set CHRONICLE to its scripts/chronicle');
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function run(bin, args, cwd) {
  return new Promise((ok, fail) => {
    const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', (b) => (log += b));
    child.stderr.on('data', (b) => (log += b));
    child.on('close', (code) =>
      code === 0 ? ok(log) : fail(new Error(`${args.join(' ')}\n${log}`)),
    );
  });
}

async function build(bin, figure, variant) {
  const svg = figure.draw(variant);
  const [, dw, dh] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const dir = join(runs, `${figure.project}-${figure.name}-${variant}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'drawing.svg'), svg);
  writeFileSync(join(dir, 'facts.json'), JSON.stringify(figure.facts, null, 2));
  const animation = {
    schema_version: 1,
    kind: 'diagram',
    facts_file: 'facts.json',
    meta: { title: figure.title, description: figure.description, sources: figure.sources },
    theme: THEME,
    frame: { ...frameFor(variant, dw, dh), title: false, background: 'none', theme: 'light' },
    timing: { pace: 1.1, hold: 3 },
    diagram: { svg: 'drawing.svg' },
    steps: figure.steps,
  };
  writeFileSync(join(dir, 'animation.json'), JSON.stringify(animation, null, 2));
  const formats = process.env.FORMATS ?? 'svg,png';
  const log = await run(bin, ['animate', 'build', 'animation.json', '--formats', formats], dir);
  const warnings = log.split('\n').filter((l) => /warn/i.test(l));
  // The page already loads DM Sans, DM Mono and Instrument Serif. Left in, the
  // SVG's own @import would request a second, differently-cut set of the same
  // families every time a figure is inserted.
  const built = readFileSync(join(dir, 'build', 'animation.svg'), 'utf8').replace(
    /@import url\([^)]*\);\s*/,
    '',
  );
  mkdirSync(join(out, figure.project), { recursive: true });
  writeFileSync(join(out, figure.project, `${figure.name}-${variant}.svg`), built);
  return `${figure.project}/${figure.name}-${variant}: ${animation.frame.width}x${animation.frame.height}, ${Math.round(built.length / 1024)} KB${warnings.length ? `\n  ${warnings.join('\n  ')}` : ''}`;
}

const only = process.argv.slice(2);
const bin = chronicleBin();
const jobs = FIGURES.filter((f) => !only.length || only.includes(f.name)).flatMap((f) =>
  ['wide', 'tall'].map((v) => () => build(bin, f, v)),
);
const queue = [...jobs];
const workers = Array.from({ length: 4 }, async () => {
  while (queue.length) console.log(await queue.shift()());
});
await Promise.all(workers);
