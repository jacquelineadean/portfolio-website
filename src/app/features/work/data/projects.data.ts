import { Project } from '../../../core/models/project.model';

export const PROJECTS: Project[] = [
  {
    slug: 'algorithm-visualizer',
    title: 'Algorithm Visualizer',
    subtitle: 'Famous algorithms, traced step by step — each step citing its source.',
    tags: ['React', 'Education'],
    status: 'shipped',
    statusLabel: 'Live',
    links: [
      { label: 'Live site', href: 'https://jacquelineadean.github.io/AlgorithmVisualizer/' },
      { label: 'Source', href: 'https://github.com/jacquelineadean/AlgorithmVisualizer' },
    ],
    art: 'sieve',
    hero: 'catalog',
    sections: [
      {
        title: 'The evidence gate',
        caption: 'Citation coverage is a test, so a step without a source fails the build.',
        visual: { kind: 'figure', name: 'evidence-gate' },
      },
      {
        title: 'Architecture',
        caption: 'Adding a visualization means adding a directory.',
        visual: { kind: 'figure', name: 'architecture' },
      },
      {
        title: 'Stack',
        caption: 'The test suite runs before every deploy.',
        visual: {
          kind: 'chips',
          items: [
            'React 19',
            'Vite 8',
            'Vitest',
            'React Testing Library',
            'KaTeX',
            'three.js',
            'MDX',
            'GitHub Actions',
            'GitHub Pages',
          ],
        },
      },
    ],
  },
  {
    slug: 'readiness-loop',
    title: 'The Readiness Loop',
    subtitle:
      'Forecasting disaster risk from public data — and proving the probabilities before anyone plans on them.',
    tags: ['Python', 'Forecasting', 'Open data'],
    status: 'shipped',
    statusLabel: 'Live',
    links: [
      {
        label: 'Live site',
        href: 'https://jacquelineadean.github.io/disaster-risk-forecasting-readiness-loop/',
      },
      {
        label: 'Source',
        href: 'https://github.com/jacquelineadean/disaster-risk-forecasting-readiness-loop',
      },
    ],
    art: 'footprints',
    hero: 'loop',
    sections: [
      {
        title: 'Calibration',
        caption:
          'From the committed ledger: the seasonal tornado model passes on skill and fails on calibration.',
        visual: { kind: 'figure', name: 'calibration' },
      },
      {
        title: 'Harness before model',
        caption: 'The scorer came first, and nothing the agent does can move it.',
        visual: { kind: 'figure', name: 'harness' },
      },
      {
        title: 'What is built',
        caption: 'Phase 0 is proven on real NOAA data; phases 1 to 4 are built, not yet proven.',
        visual: {
          kind: 'phases',
          phases: [
            {
              label: 'Phase 0',
              name: 'Scorer and baselines',
              state: 'proven',
              detail: 'Louisiana flood · Oklahoma tornado · Gulf Coast cyclone',
            },
            { label: 'Phase 1', name: 'Features and models', state: 'built' },
            { label: 'Phase 2', name: 'National fleet and county briefs', state: 'built' },
            { label: 'Phase 3', name: 'Facility gap reports', state: 'built' },
            { label: 'Phase 4', name: 'Non-US pilots', state: 'built' },
          ],
        },
      },
      {
        title: 'The website',
        caption: 'Its sandbox runs the real package in your browser through Pyodide.',
      },
      {
        title: 'Stack',
        caption: 'No runtime dependencies, and every dataset is pinned by sha256.',
        visual: {
          kind: 'chips',
          items: [
            'Python 3.10+',
            'Standard library only',
            'NOAA Storm Events',
            'ERA5 via Open-Meteo',
            'FEMA National Risk Index',
            'USA Structures',
            'Pyodide',
            'GitHub Actions',
          ],
        },
      },
      {
        title: 'Attribution',
        caption:
          'Independent; not affiliated with or endorsed by Google. Framing drawn from Google Research writing on crisis resilience and the Open Buildings docs.',
      },
    ],
  },
];
