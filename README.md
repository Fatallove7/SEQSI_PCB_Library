# SEQSI PCB Library

A data-driven PCB archive built from the product and visual specification in [Task.md](Task.md). Next.js App Router, React, TypeScript, Tailwind CSS, and local JSON records produce a fully static site. No database or backend is required.

## Quick start

Install Node.js 22 or newer (Node.js 24 LTS recommended), which includes npm. Then:

```bash
npm ci
npm run dev
```

Open http://localhost:3000. The repository starts with **three clearly labeled demo records**. Their illustrations, 3D cuboid, and download are placeholders, not actual PCB designs, photographs, technical specifications, or manufacturing files.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint, with zero warnings allowed |
| `npm run typecheck` | Generate Next.js route types and run TypeScript |
| `npm run validate:boards` | Validate every board and referenced local file |
| `npm test` | Data validation, loading, search, filter, and sorting tests |
| `npm run build` | Validate boards and export the production site to `out/` |
| `npm start` | Serve the production export locally |
| `npm run test:e2e` | Desktop and mobile browser checks against `out/` |

Browser tests require a production build and a Playwright browser:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Alternatively, set `PLAYWRIGHT_CHANNEL=chrome` to use an already installed Google Chrome. In PowerShell use `$env:PLAYWRIGHT_CHANNEL = 'chrome'`. Browser tests use a mobile Chromium viewport; they do not certify Safari or every physical device. Screenshots and failure traces go to ignored `test-results/`.

## Architecture

```text
src/app/                 Static routes and metadata; boards/[slug] is generated
src/components/          Shared cards, filters, gallery, and model viewer
src/config/site.ts       Group identity and site metadata
src/data/boards/*.json   One record per board
src/data/categories.ts  Editable category taxonomy
src/lib/boards.ts        Build-time discovery, validation, and summary projection
src/lib/validation.ts    Runtime schema and local asset validation
src/lib/filters.ts       Client-safe search, combined filters, and sorting
src/lib/assets.ts        Deployment base-path handling for assets
src/types/board.ts       Types inferred from the validation schema
public/pcb/<folder>/     Images, models, and downloads for each board
scripts/                Board validation and demo-asset regeneration
tests/                  Data and browser checks
docs/                   Contribution, implementation, and verification notes
```

Pages: `/`, `/boards/`, `/boards/<slug>/`, `/categories/`, `/years/`, `/about/`, and a custom 404. Category/year index links open the filtered catalog, for example `/boards/?category=adapter-board&year=2026`. Dedicated category/year detail routes are optional in Task.md and are not needed in V1.

All records are validated at build time. The catalog receives summaries only, not full schematic/photo/model data. Search and filters run in the browser, and their state is shareable through URL parameters. Technical media uses a single accessible lightbox. Interactive 3D code and model files are fetched only after clicking **Load interactive 3D model**; renders remain available independently.

The visual system is light, neutral, and documentation-oriented. Shared tokens are defined in `src/app/globals.css`; technical images preserve their aspect ratios. No dark mode or V1-excluded features are included.

## Add a board

Follow [docs/ADDING_A_BOARD.md](docs/ADDING_A_BOARD.md). Add one JSON record and its assets, validate, and rebuild. No board-specific React component or manual import is needed.

Optional missing assets should be omitted from metadata. An explicitly referenced missing file fails validation and the production build, preventing broken download links. Images also have a runtime unavailable fallback. The interactive viewer reports model-load errors and keeps static renders accessible.

To start a real archive, delete the three `demo-*.json` files and remove only their `public/pcb/demo-a/` and `public/pcb/demo-b/` folders. An empty archive is supported. `node scripts/generate-demo-assets.mjs` regenerates the demo artwork and GLB, overwriting files only in those demo asset folders; it does not regenerate records or touch real boards.

## Static deployment

`npm run build` writes deployable HTML, CSS, JavaScript, and assets into `out/`. Deploy the **contents of `out/`**, including `_next/`, `pcb/`, and `404.html`. There is no Node.js server in production and no runtime image-optimization service. Create appropriately sized thumbnails/previews before committing; original images remain accessible from the gallery.

### Laboratory/static server

Build with `NEXT_PUBLIC_BASE_PATH` empty for a root-domain site. Copy `out/` to the document root. Serve directory indexes and return `404.html` with HTTP 404 for unknown URLs. Do not configure an SPA rewrite to `index.html`.

For an nginx server, a minimal location is:

```nginx
location / {
    try_files $uri $uri/ =404;
}
error_page 404 /404.html;
```

### GitHub Pages

For repository Pages at `https://<owner>.github.io/SEQSI_PCB_Library/`, set `NEXT_PUBLIC_BASE_PATH=/SEQSI_PCB_Library` **before building**. Set `NEXT_PUBLIC_SITE_URL=https://<owner>.github.io` to enable absolute OpenGraph image URLs. Replace these examples with the real host and repository path. A custom domain normally uses an empty base path.

```powershell
$env:NEXT_PUBLIC_BASE_PATH = '/SEQSI_PCB_Library'
$env:NEXT_PUBLIC_SITE_URL = 'https://YOUR-OWNER.github.io'
npm run build
```

Upload `out/` as a Pages artifact through your chosen GitHub Pages deployment workflow, or publish its contents to your configured Pages branch. `public/.nojekyll` is included in the export. Deployment is not automatically enabled or published by this implementation.

### Vercel

Import the repository using the Next.js preset. Use `npm run build`; this project has `output: 'export'`, and the static output is `out/`. Set `NEXT_PUBLIC_SITE_URL` to the production origin and leave `NEXT_PUBLIC_BASE_PATH` empty for a root-domain deployment. Do not add server-only features without reviewing static-export compatibility.

Environment examples are in `.env.example`. Copy it to `.env.local` for local values. Public environment values are baked into the build; rebuild whenever the origin/base path changes. Next.js handles page-link prefixes; `assetUrl()` prefixes asset links and the home search form. Record asset paths always remain `/pcb/...`.

Framework reference: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports).

## Group information still needed

Edit `src/config/site.ts` for the group name, institution, contact, logo, and title. Confirm category IDs/labels in `src/data/categories.ts`, the production origin/path, asset-sharing policy, licensing, and real board records. Until supplied, group-specific information stays explicitly marked TODO. PCB identifiers and source EDA tools are not fixed to a particular convention.

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the phase plan and [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md) for verification and the file inventory.
