# PortfolioWebsite

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Specimens

The site draws each piece of work as a natural form made of characters, on a canvas, in `src/app/shared/glyphs/`. `glyphs.ts` is the component: it scrambles a specimen in on first sight, lets the pointer stir the characters near it, and runs only while the specimen is on screen. Each specimen in `specimens/` draws its shape on a small mask (`mask.ts`), one pixel per character cell, and picks a character, a tone and an opacity for every cell. Colours come from the theme's CSS variables, so a specimen inside a `.paper` block switches to the beige palette.

Every character a specimen shows comes from the work itself:

- The fern on the home page unfurls, and its stem dissolves into binary.
- The moss runs the site's own search code (`src/app/shared/labs/pathfinding.ts`) and spells each path with its source.
- The butterfly's wings are written in the `tornado-ok` ledger card (exp-0002) from the Readiness Loop.
- The flower's four petals are sized by the minutes each model owns in Four Mental Models, and written in the post's words.
- The sunflower's seeds are tokens arriving at The AI Inference Stack's 209 a second.
- The About page draws the Algorithm Visualizer recording and the posts' opening plates through the same character ramp (`footage.ts`).

## Figures

The animations on the project pages are built with the chronicle plugin for Claude Code. Each figure is defined in `scripts/figures/figures.mjs` and drawn twice, a wide layout for desktop and a tall one for phones. To rebuild them after a change, with the plugin installed, run:

```bash
node scripts/figures/build.mjs
```

The output goes to `public/projects/<project>/<figure>-wide.svg` and `-tall.svg`, which are committed, so the site build does not need the plugin. `FORMATS=svg` skips the PNG storyboards, which need NumPy and OpenCV.

Every label and number in a figure comes from the project's own repository: file names, the catalog count in `src/catalog/index.js`, and the reliability bins on the `tornado-ok` ledger card. Check a figure against its repository before changing it.

The About page shows two recordings in `public/recordings/` (a folder named `about` would collide with the `/about` route on GitHub Pages). `algorithm-visualizer-pathfinding` (WebM and MP4) is a capture of a local build of the Algorithm Visualizer's pathfinding page. `readiness-loop-run` is the Readiness Loop's `docs/media/loop.gif`, re-encoded.
