/**
 * Writes one index.html per route into the build output, each carrying that
 * page's title, description and Open Graph tags, plus sitemap.xml and
 * robots.txt.
 *
 * The site is a client-rendered app on GitHub Pages. Link-preview crawlers
 * (LinkedIn, Slack, iMessage) do not run JavaScript, so without this every
 * shared link shows the home page's text, and a deep link is answered by
 * 404.html with a 404 status. A static file at each route path fixes both.
 *
 * Runs as npm's postbuild hook. SITE_URL overrides the public origin, for
 * when the site moves to its own domain.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'dist', 'portfolio-website', 'browser');
const SITE_URL = (process.env.SITE_URL || 'https://jacquelineadean.github.io/portfolio-website').replace(/\/$/, '');
const NAME = 'Jacqueline Dean';
const IMAGE = { path: 'og-image.png', width: 1200, height: 630, alt: `${NAME}, Full Stack Software Engineer` };

/** Loads a data module written in TypeScript. Its imports must be types only. */
async function loadTs(relPath) {
  const source = readFileSync(join(ROOT, relPath), 'utf-8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { PROJECTS } = await loadTs('src/app/features/work/data/projects.data.ts');
const { BLOG_POSTS } = await loadTs('src/app/features/notes/data/blog-posts.generated.ts');

// Titles match the ones the app sets in app.routes.ts and the detail pages,
// so the tab text does not change when the app boots.
const pages = [
  {
    path: '',
    title: NAME,
    description:
      'Jacqueline Dean, full stack software engineer. Interactive projects and illustrated writing on system design and AI inference.',
    type: 'website',
  },
  {
    path: 'about',
    title: `About — ${NAME}`,
    description: 'The projects and posts of Jacqueline Dean, shown running.',
  },
  {
    path: 'work',
    title: `Projects — ${NAME}`,
    description:
      'Projects by Jacqueline Dean: an algorithm visualizer that cites its sources, and a disaster-risk forecaster scored before anyone plans on it.',
  },
  {
    path: 'notes',
    title: `Notes — ${NAME}`,
    description:
      'Writing by Jacqueline Dean on system design and AI inference, with a reading list and podcasts.',
  },
  ...PROJECTS.map((p) => ({
    path: `work/${p.slug}`,
    title: `${p.title} — ${NAME}`,
    description: p.subtitle,
  })),
  ...BLOG_POSTS.filter((p) => p.published !== false).map((p) => ({
    path: `notes/${p.slug}`,
    title: `${p.title} — ${NAME}`,
    description: p.excerpt,
    type: 'article',
    published: p.date,
  })),
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headFor(page) {
  const url = `${SITE_URL}/${page.path ? page.path + '/' : ''}`;
  const image = `${SITE_URL}/${IMAGE.path}`;
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${IMAGE.width}" />`,
    `<meta property="og:image:height" content="${IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (page.published) tags.push(`<meta property="article:published_time" content="${page.published}" />`);
  return tags.map((t) => `    ${t}`).join('\n');
}

const shell = readFileSync(join(OUT, 'index.html'), 'utf-8');
// The tags headFor writes replace the generic ones in src/index.html.
const stripped = shell
  .replace(/\s*<title>[^<]*<\/title>/, '')
  .replace(/\s*<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '');

for (const page of pages) {
  const dir = join(OUT, page.path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), stripped.replace(/(<meta charset=[^>]*>)/, `$1\n${headFor(page)}`));
}

const today = new Date().toISOString().split('T')[0];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map(
    (p) =>
      `  <url><loc>${SITE_URL}/${p.path ? p.path + '/' : ''}</loc><lastmod>${p.published ?? today}</lastmod></url>`,
  ),
  '</urlset>',
  '',
].join('\n');
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Wrote page metadata for ${pages.length} routes, sitemap.xml and robots.txt.`);
