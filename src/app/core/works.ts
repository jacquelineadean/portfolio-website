import { BLOG_POSTS } from '../features/notes/data/blog-posts.generated';
import { PROJECTS } from '../features/work/data/projects.data';
import { Specimen } from '../shared/glyphs/grid';
import { Butterfly } from '../shared/glyphs/specimens/butterfly';
import { Flower } from '../shared/glyphs/specimens/flower';
import { Moss } from '../shared/glyphs/specimens/moss';
import { Sunflower } from '../shared/glyphs/specimens/sunflower';

/**
 * The published work, in the order the home page shows it: two projects and
 * two posts. Each is drawn as a specimen, a natural form made of characters
 * from its own data, and keeps the colour it has across the site.
 */
export interface Work {
  slug: string;
  kind: 'project' | 'post';
  title: string;
  /** One sentence. */
  caption: string;
  link: string[];
  linkLabel: string;
  external: { label: string; href: string }[];
  /** Builds a fresh specimen: each canvas needs its own. */
  specimen: () => Specimen;
  /** What the specimen shows, for screen readers. */
  label: string;
  /** Taps and arrow keys reach the specimen. */
  interactive: boolean;
  /** What the reader can do with it, beyond stirring the characters. */
  hint?: string;
  /** Width over height of the specimen's canvas. */
  ratio: number;
  /** Width over height on a phone, where a wide map would be a thin strip. */
  narrowRatio?: number;
}

const project = (slug: string) => PROJECTS.find((p) => p.slug === slug);
const post = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);

export const WORKS: Work[] = [
  {
    slug: 'algorithm-visualizer',
    kind: 'project',
    title: project('algorithm-visualizer')?.title ?? 'Algorithm Visualizer',
    caption: 'Famous algorithms, traced step by step. Every step cites its source.',
    link: ['/work', 'algorithm-visualizer'],
    linkLabel: 'See the project',
    external: project('algorithm-visualizer')?.links ?? [],
    specimen: () => new Moss(),
    label:
      'Dijkstra, A* and greedy best-first search on a walled map, drawn in characters; each path is spelled in the source its trace cites',
    interactive: true,
    hint: 'Tap the map to move the goal.',
    ratio: 2.2,
    narrowRatio: 1.3,
  },
  {
    slug: 'readiness-loop',
    kind: 'project',
    title: project('readiness-loop')?.title ?? 'The Readiness Loop',
    caption:
      'Disaster-risk forecasts from public data, scored against a fixed contract before anyone plans on them.',
    link: ['/work', 'readiness-loop'],
    linkLabel: 'See the project',
    external: project('readiness-loop')?.links ?? [],
    specimen: () => new Butterfly(),
    label:
      'A swallowtail butterfly drawn in characters; its wings spell out the ledger card of a real forecasting run',
    interactive: false,
    ratio: 1.15,
  },
  {
    slug: 'four-mental-models-illustrated',
    kind: 'post',
    title: post('four-mental-models-illustrated')?.title ?? 'Four Mental Models, Illustrated',
    caption: 'An interactive guide to the 45-minute system design interview, phase by phase.',
    link: ['/notes', 'four-mental-models-illustrated'],
    linkLabel: 'Read the post',
    external: [],
    specimen: () => new Flower(),
    label:
      'A flower written in words: four petals, one per mental model, each sized by its minutes in a 45-minute round',
    interactive: false,
    hint: 'Point at a petal to name it.',
    ratio: 0.85,
  },
  {
    slug: 'ai-inference-stack',
    kind: 'post',
    title: post('ai-inference-stack')?.title ?? 'The AI Inference Stack',
    caption: 'A field guide to the seven layers between an API call and a GPU, with labs to run.',
    link: ['/notes', 'ai-inference-stack'],
    linkLabel: 'Read the post',
    external: [],
    specimen: () => new Sunflower(),
    label:
      'A sunflower whose seeds are tokens arriving at 209 a second, banded in the seven layers’ colours',
    interactive: true,
    hint: 'Tap to send another request.',
    ratio: 1,
  },
];

export function workFor(slug: string): Work | undefined {
  return WORKS.find((w) => w.slug === slug);
}
