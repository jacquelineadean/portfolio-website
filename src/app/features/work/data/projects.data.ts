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
          'Twenty-eight visualizations across eight domains, each driven by inputs the user supplies rather than a canned demo: cryptography (RSA, Diffie–Hellman, Vigenère, and a complete SHA-256 checked against the FIPS 180-4 test vectors); graphs and pathfinding (Dijkstra, A* and BFS over a maze you draw, PageRank on an editable link graph); sorting (quicksort and merge sort); numbers and primes (the sieve of Eratosthenes, Euclid’s algorithm drawn as the square tiling Euclid described); statistics and probability (Bayes’ rule, the central limit theorem, Monte Carlo π, Markov chains, least squares as a projection); AI and machine learning; distributed systems (Raft, consistent hashing, MapReduce, the CAP theorem); and methodologies (Huffman coding, Fourier epicycles).',
          'The AI domain goes past the classics — k-means, the perceptron, backpropagation on a nine-parameter network with gradients checked against finite differences, attention internals — to three drill-down architecture maps: the transformer stack, the LLM inference pipeline and the training loop, where every node you zoom into is cited like a trace step.',
          'Raft includes a network partition you can watch it refuse to commit through. RSA has an optional 3D mod-n helix built on three.js, code-split behind a lazy import so the 3D dependency never lands in the main bundle for the pages that do not need it.',
        ],
      },
      {
        title: 'The evidence gate',
        content: [
          'The core design decision is a repo-wide test that walks the visualization registry and, for every step of every fixture trace and every node of every architecture map, asserts that it names at least one source and that each named source actually resolves in that visualization’s sources file. Citation coverage is a test assertion rather than a convention, so it fails loudly instead of drifting.',
          'Provenance is typed rather than free-text: a citation is classified as a paper, a theorem, a modern standard, or a pedagogical simplification, and the UI renders that distinction. A step justified by a teaching shortcut is labeled as one instead of being presented as the real thing.',
          'Where a page states a number — a parameter count, a KV-cache size, a mistake bound, a compression ratio — that number is computed by a pure module and pinned by a test against the published value, not typed into prose. A companion suite renders every live catalog card through the router, because a correct model and a page that crashes on mount are different failures.',
        ],
      },
      {
        title: 'Architecture',
        content: [
          'Each algorithm is a self-contained directory — math model, sources, trace or map, visualizer component, tests — registered through a single defineVisualization call and one catalog card. Adding a visualization means adding a directory, not editing a switch statement. The contracts a new visualization has to satisfy — steps, streams, drill-down maps, 3D rules — are written down in docs/CONTRACTS.md rather than inferred from the existing ones.',
          'Every page is the same instrument: a graphic that stays put, and a shared transport beneath it to step through each phase or play end to end. A trace player handles stepping, streaming, deep links and KaTeX-rendered math lines; a drill-down instrument handles breadcrumb zoom over cited node trees; shared plot, graph and matrix stages carry the drawing. The per-algorithm code is the algorithm and its citations, not playback plumbing.',
          'Routing is hash-based. That is a deliberate constraint of the deployment target: GitHub Pages has no server-side rewrite, and hash routes keep every domain page and every visualization deep-linkable without one.',
        ],
      },
      {
        title: 'Stack',
        content: [
          'React 19 and Vite 8, in plain JavaScript and JSX.',
          'Vitest with React Testing Library and jsdom, including the evidence gate and the render gate.',
          'KaTeX for math typesetting; three.js via @react-three/fiber and @react-three/drei for the lazy-loaded 3D view; MDX for the blog.',
          'Deployed to GitHub Pages by a GitHub Actions workflow that runs the test suite first, so a failing test stops the deploy.',
        ],
      },
    ],
  },
  {
    slug: 'readiness-loop',
    title: 'The Readiness Loop',
    subtitle: 'Forecasting disaster risk from public data — and proving the probabilities before anyone plans on them.',
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
    sections: [
      {
        title: 'Context',
        content: [
          'Hazard forecasting has improved enormously, but a probability is only useful to an emergency planner if it means what it says: when the forecast says 10%, it should happen about one time in ten. Most risk scores never show you that. They hand over a number with no record of how it was tested, against what, or how many tries it took to get there.',
          'The Readiness Loop is an open-source, agentic system that forecasts natural-disaster risk per county from public data, validates its own probabilities against history, iterates until they can be trusted — and only then turns them into something a planner reads.',
        ],
      },
      {
        title: 'Harness before model',
        content: [
          'The first phase built the scorer and no forecaster at all. "Iterate until the accuracy is acceptable" is only science if the thing measuring accuracy never moves, so the exit criterion was that the climatology baselines reproduce bit-for-bit from a clean clone and that the harness rejects a deliberately leaked model — a canary that reads the outcomes it is scored on.',
          'Every experiment runs under a pre-registered contract: the hazard, the geography, the forecast period, what counts as a damaging event, the locked train, validate and test years, and the pass thresholds (skill above climatology, reliability within five points per populated bin, a discrimination floor). The contract is hashed onto every experiment card, so changing a criterion after the fact visibly breaks comparability instead of quietly moving the goalposts.',
          'The agent proposes; the harness disposes. Nothing in the evaluation plane calls a language model, no model ever receives a holdout label, and the one test touch per contract is a budget persisted to disk and spent by a single atomic command that writes its card in the same step.',
        ],
      },
      {
        title: 'What is built',
        content: [
          'Phase 0 is complete and its exit criteria are met on real NOAA Storm Events data across three example contracts — Louisiana inland flood, Oklahoma tornado, and Gulf Coast tropical cyclone — chosen to differ in every dimension a contract controls. Their ledgers are committed as a hash chain, and the leaky oracle is rejected on all three.',
          'Phases 1 through 4 are built: a feature channel with a temporal firewall and four candidate models (calibrated logistic regression and gradient boosting); a fleet of six national contracts, county building exposure from FEMA / ORNL USA Structures, and a county brief in which every sentence must cite a card, a dataset row or a named guidance document or it is not written; facility gap reports that stress-test an emergency plan against a 96-hour scenario and render a blinded copy for independent review; and non-US pilots that run the same loop on globally available data.',
          'Those later phases are built, not yet proven. Their exits need the pinned real-data run, which the repository’s own CI performs, and for facility reports the blinded ratings of practising emergency managers. No test touch has been spent, and the site says so rather than implying otherwise.',
        ],
      },
      {
        title: 'The website',
        content: [
          'The project site is a quiet research microsite: the system design, a walkthrough with captured transcripts, every committed ledger with its reliability diagrams and a hash chain your browser re-verifies, and tile maps drawn from the contracts’ own labelled panels, one tile per county.',
          'Its sandbox loads the actual readiness package into Python in the browser via Pyodide, with the registered contracts, ledgers, blessed fingerprints and pinned extracts. Every button runs the same functions the command line runs — the loop, verification, a calibration playground scored by the real harness, and ledger tampering caught by the real chain check. Nothing to install.',
        ],
      },
      {
        title: 'Stack',
        content: [
          'Python 3.10+ with no runtime dependencies; the models, calibrators and scoring are written against the standard library so the whole loop is auditable in one repository.',
          'Public data pinned by sha256: NOAA Storm Events, ERA5 via Open-Meteo, the FEMA National Risk Index, USA Structures, geoBoundaries and EM-DAT, with a per-layer license manifest.',
          'A static site generated from the same modules the CLI uses and published to GitHub Pages by GitHub Actions, alongside CI workflows for the test suite and the real-data run.',
        ],
      },
      {
        title: 'Attribution',
        content: [
          'The initial framing was drawn from public writing on crisis resilience by Google Research and from the Open Buildings dataset documentation. This is an independent project — it is not affiliated with, endorsed by, or connected to Google.',
        ],
      },
    ],
  },
];
