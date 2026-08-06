import { Project } from '../../../core/models/project.model';

export const PROJECTS: Project[] = [
  {
    slug: 'algorithm-visualizer',
    title: 'Algorithm Visualizer',
    subtitle:
      'Eight classic algorithms, traced step by step — and every step declares whether it follows the original paper or a teaching simplification.',
    tags: ['React', 'Vite', 'Vitest', 'Data visualization'],
    status: 'shipped',
    statusLabel: 'Live',
    links: [
      { label: 'Live site', href: 'https://jacquelineadean.github.io/AlgorithmVisualizer/' },
      { label: 'Source', href: 'https://github.com/jacquelineadean/AlgorithmVisualizer' },
    ],
    sections: [
      {
        title: 'Context',
        content: [
          'Algorithm visualizations are everywhere, and most of them have the same problem: they show you a version of the algorithm rather than the algorithm. Somewhere between the original paper and the animation, a simplification gets made — a step is skipped, a bound is relaxed, an edge case is quietly dropped — and nothing in the interface tells you it happened.',
          'This project takes the opposite position. A step has to point back at where it comes from, and the difference between the real algorithm and a teaching simplification has to be visible in the interface rather than buried in the implementation.',
        ],
      },
      {
        title: 'What it does',
        content: [
          'Eight visualizations, each driven by inputs the user supplies rather than a canned demo: RSA key generation, encryption and decryption; Diffie-Hellman key exchange; the Vigenère cipher, with the Kasiski and Friedman breaks explained in the trace; the Sieve of Eratosthenes; Bayes’ rule on a screening-test scenario; shortest paths; quicksort with Hoare partitioning; and merge sort.',
          'The shortest-paths view runs Dijkstra, A* and breadth-first search over the same hand-drawn maze so the three can be compared step for step on identical input, which is where the differences between them actually become legible.',
          'RSA has an optional 3D mod-n helix built on three.js, code-split behind a lazy import so the 3D dependency never lands in the main bundle for the seven visualizations that do not need it.',
        ],
      },
      {
        title: 'The evidence gate',
        content: [
          'The core design decision is a repo-wide test that walks the visualization registry and, for every step of every fixture trace, asserts that the step names at least one source and that each named source actually resolves in that visualization\u2019s sources file. Citation coverage is a test assertion rather than a convention, so it fails loudly instead of drifting.',
          'Provenance is typed rather than free-text: a citation is classified as a paper, a theorem, a modern standard, or a pedagogical simplification, and the UI renders that distinction. A step justified by a teaching shortcut is labeled as one instead of being presented as the real thing.',
          'Sources are primary where primary sources exist — Rivest, Shamir and Adleman (1978), Diffie and Hellman (1976), Dijkstra (1959), Hart, Nilsson and Raphael (1968), Bayes (1763), Hoare (1961–62) — alongside modern standards such as RFC 8017, RFC 3526 and NIST SP 800-56A where those are what an implementer would actually follow.',
        ],
      },
      {
        title: 'Architecture',
        content: [
          'Each algorithm is a self-contained directory — math model, sources, trace generator, visualizer component, tests — registered through a single defineVisualization call. Adding a ninth algorithm means adding a directory, not editing a switch statement. The contract that a new visualization has to satisfy is written down in docs/CONTRACTS.md rather than inferred from the existing ones.',
          'A shared trace player handles stepping, streaming, deep links and KaTeX-rendered math lines across every visualization, so the per-algorithm code is the algorithm and its citations, not playback plumbing.',
          'Routing is hash-based. That is a deliberate constraint of the deployment target: GitHub Pages has no server-side rewrite, and hash routes keep every individual visualization deep-linkable without one.',
        ],
      },
      {
        title: 'Stack',
        content: [
          'React 19 and Vite 8, in plain JavaScript and JSX.',
          'Vitest with React Testing Library and jsdom, including the evidence-gate test that enforces citation coverage.',
          'KaTeX for math typesetting; three.js via @react-three/fiber and @react-three/drei for the lazy-loaded 3D view; MDX for prose content.',
          'Deployed to GitHub Pages via gh-pages.',
        ],
      },
    ],
  },
  {
    slug: 'disaster-exposure-modeling',
    title: 'Disaster exposure modeling',
    subtitle:
      'Turning a hazard forecast into an estimate of which structures — and how many people — sit in its path, using open building-footprint data.',
    tags: ['Geospatial', 'Open data'],
    status: 'in-design',
    statusLabel: 'In design',
    links: [
      { label: 'Open Buildings', href: 'https://sites.research.google/gr/open-buildings/' },
      {
        label: 'Source article',
        href: 'https://blog.google/innovation-and-ai/technology/research/helping-communities-prepare-for-natural-disasters/',
      },
    ],
    sections: [
      {
        title: 'Status',
        content: [
          'This is scoping work, not shipped work. Nothing described below has been built yet. It is here because the problem is the one I want to spend my next block of personal engineering time on, and because being explicit about what is intent and what is done seems more useful than a portfolio page that blurs the two.',
        ],
      },
      {
        title: 'The problem',
        content: [
          'Hazard forecasting has improved enormously. Flood and wildfire forecasts now reach large parts of the world with real lead time. What is still hard is the step after the forecast: converting "this basin will flood on Thursday" into "these structures are in the inundation footprint, roughly this many people live in them, and these are the ones on the wrong side of the only road out."',
          'That gap is largely a data-joining problem rather than a modeling one, and it has historically been worst in the places with the least margin for error — regions where no usable building inventory existed at all until recently.',
        ],
      },
      {
        title: 'Why it is tractable now',
        content: [
          'Google Research publishes Open Buildings: 1.8 billion building detections across an inference area of 58 million square kilometers, covering Africa, South and South-East Asia, Latin America and the Caribbean, under CC BY-4.0 and ODbL v1.0. A companion 2.5D release adds annual per-pixel building presence, counts and heights for 2016\u20132023, derived from Sentinel-2 imagery.',
          'The open licensing is the part that makes an independent project possible at all. A building inventory at that coverage was not something an individual could assemble five years ago.',
        ],
      },
      {
        title: 'What I want to explore',
        content: [
          'Joining hazard geometry to building footprints and producing an exposure estimate with an honest uncertainty band, rather than a single number that hides how much of it is inference.',
          'Treating the confidence score that ships with each footprint as a first-class input rather than a threshold to filter on, so the output can say how much of an estimate rests on low-confidence detections.',
          'Making the result reproducible end to end — the same discipline as the Algorithm Visualizer, applied to data provenance instead of algorithmic provenance. If a number cannot be traced back to a dataset version and a transformation, it should not be in the output.',
        ],
      },
      {
        title: 'Open questions',
        content: [
          'A record carries a centroid, an area, a confidence score and a polygon \u2014 in the dataset\u2019s own words, \u201cno information about the type of building, its street address, or any details other than its geometry.\u201d Population exposure therefore has to come from a separate layer with its own error characteristics, and how those two uncertainties compose is the first thing to work out.',
          'Building footprints are a snapshot; hazard exposure is time-varying. It is not yet clear how much the 2.5D temporal data closes that gap in practice.',
          'The obvious failure mode is a plausible-looking number nobody should act on. Deciding up front what this tool refuses to output may matter more than what it does output.',
        ],
      },
      {
        title: 'Attribution',
        content: [
          'The framing of this problem is drawn from public writing on crisis resilience by Yossi Matias of Google Research, linked above, and from the Open Buildings dataset documentation. Those are two separate sources: the crisis-resilience post is about forecasting, detection and alerting, and does not concern building footprints. This is an independent project inspired by reading both \u2014 it is not affiliated with, endorsed by, or connected to Google.',
        ],
      },
    ],
  },
];
