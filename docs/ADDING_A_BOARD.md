# Adding a PCB to the library

The live archive is managed through `/admin`. Sign in, choose **Manual Upload** or **Import Altium Project**, create a draft, upload the available files, review the preview, and explicitly **Publish**. Metadata and assets persist without rebuilding. Visitors continue to browse anonymously.

Use **Save Draft** for edits that must remain private. **Archive** hides a board and its assets; Admin can restore it to Draft. Permanent deletion is a separate Admin-only action with typed PCB-ID confirmation. See [README.md](../README.md) for setup, supported uploads, limits, and the separate Altium-worker integration task.

## Legacy JSON import reference

The instructions below describe preparation of legacy seed records. They remain supported through `npm run db:migrate`; changing these files does not update an already migrated runtime board. Use Admin for subsequent edits. No React page, component import, or year list needs changing.

## 1. Choose identifiers

Choose a unique PCB `id` using your group convention; there is no enforced numerical pattern. Choose a permanent `slug` made from lowercase letters, digits, and single hyphens, such as `example-board`. A slug determines the public URL `/boards/example-board/`; changing it changes that URL.

Choose an asset folder using letters, digits, dots, hyphens, and underscores, such as `example-board`. Filenames and folder names must start with a letter or digit. Keep paths case-exact so they work on Linux/static hosts. Avoid spaces, backslashes, query strings, URL fragments, and percent-encoded characters in file paths.

## 2. Create a metadata file

Create `src/data/boards/<id>.json`. The file contains one JSON object. Use an existing category ID from `src/data/categories.ts`; edit that configuration to add or rename categories. Changing a category ID also requires updating records that reference it.

This minimal example is a placeholder record, not a technical claim:

```json
{
  "id": "EXAMPLE-ONLY",
  "slug": "example-only",
  "title": "Example record — replace with the real board title",
  "year": 2026,
  "category": "adapter-board",
  "description": "Demo placeholder. Replace with a verified description before publishing real board content.",
  "demo": true
}
```

Only `id`, `slug`, `title`, `year`, `category`, and `description` are required. Omit optional fields until known; do not assign invented dimensions, materials, components, revision, or test status.

## 3. Create the asset folder

```text
public/pcb/example-only/
  thumbnail.webp
  schematic/page-1.webp
  schematic/page-2.webp
  schematic/schematic.pdf
  layout/top.webp
  layout/bottom.webp
  3d/board.glb
  3d/preview.webp
  3d/perspective.webp
  photos/assembled-top.webp
  files/source.zip
  files/bom.csv
```

Add only files you actually have. JSON URLs start at `/pcb/`, omitting `public/`; do not put a deployment prefix in the record. A referenced missing file is a validation error. Omitted optional files show an unavailable state.

## 4. Add schematics

Use `schematic.images` for one or more preview pages. PNG, JPG/JPEG, WebP, SVG, AVIF, and GIF are supported. Use `schematic.pdf` for a PDF open/download link. PDF pages are not rasterized at runtime; export preview images from your EDA/PDF tooling if desired. PDF-only schematics still provide a PDF link.

## 5. Add layouts

Add one object per image to `layout`. Each has `src` and an optional `caption` and `alt`. Use captions to identify top, bottom, inner layers, or routing detail. Images preserve their aspect ratio and can be opened at original resolution through the lightbox.

## 6. Add a model or renders

`model3d.model` accepts GLB or glTF; a self-contained GLB is recommended. Keep any glTF relative buffer/texture dependencies beside the model with their original relative paths. Validation checks the declared model file, not dependencies embedded inside glTF/GLB; test it in the viewer before committing.

Use `model3d.preview` for a static preview and `model3d.renders` for more viewpoints. Without a model, these images still render. With a model, users explicitly load the interactive viewer, then rotate, zoom, reset the camera, or request fullscreen. STEP files belong in `downloads`; V1 does not render STEP.

## 7. Add physical photographs

Add photographs to `photos`, with optional `caption`, `alt`, `photographer`, and `date`. Dates use `YYYY-MM-DD`. Add images you have permission to share. Do not label generated illustrations as real board photographs; the built-in demo deliberately marks its photo slots as placeholders.

## 8. Add downloads and optional metadata

`downloads` contains `{ "label": "...", "file": "/pcb/..." }` entries. There is no EDA-specific extension restriction for downloads: include source projects, Gerbers, drills, fabrication packages, BOMs, pick-and-place files, STEP/GLB, documentation, or test reports. Declared files must exist. A schematic PDF and interactive model are automatically included in the downloads section without duplicate links to those files.

The full optional-field structure below is an **example only**. It passes validation only after every referenced file exists. Replace placeholder text and dates with verified information, or omit unknown fields. The example status is a demo schema value, not a claim about an actual PCB.

```json
{
  "id": "EXAMPLE-ONLY",
  "slug": "example-only",
  "title": "Example board — demo only",
  "year": 2026,
  "category": "adapter-board",
  "description": "A demonstration of the complete metadata structure; not a real design.",
  "demo": true,
  "designer": ["TODO: Designer name"],
  "revision": "TODO: Verified revision",
  "status": "design",
  "tags": ["demo"],
  "thumbnail": "/pcb/example-only/thumbnail.webp",
  "specifications": {
    "dimensions": "TODO: Verified dimensions",
    "thickness": "TODO: Verified thickness",
    "layers": "TODO: Verified layer count",
    "material": "TODO: Verified material",
    "copperThickness": "TODO: Verified copper thickness",
    "surfaceFinish": "TODO: Verified surface finish",
    "minimumTraceSpace": "TODO: Verified trace / space",
    "connectors": "TODO: Verified connector types",
    "impedance": "TODO: Verified requirements",
    "operatingTemperature": "TODO: Verified range",
    "manufacturingNotes": "TODO: Verified manufacturing notes"
  },
  "schematic": {
    "images": ["/pcb/example-only/schematic/page-1.webp", "/pcb/example-only/schematic/page-2.webp"],
    "pdf": "/pcb/example-only/schematic/schematic.pdf"
  },
  "layout": [
    { "src": "/pcb/example-only/layout/top.webp", "caption": "Top layer", "alt": "Top-layer layout" },
    { "src": "/pcb/example-only/layout/bottom.webp", "caption": "Bottom layer" }
  ],
  "model3d": {
    "model": "/pcb/example-only/3d/board.glb",
    "preview": "/pcb/example-only/3d/preview.webp",
    "renders": ["/pcb/example-only/3d/perspective.webp"]
  },
  "photos": [{
    "src": "/pcb/example-only/photos/assembled-top.webp",
    "caption": "TODO: Verified photo caption",
    "alt": "TODO: Describe the actual photograph",
    "photographer": "TODO: Photographer credit",
    "date": "2026-09-11"
  }],
  "downloads": [
    { "label": "Source project", "file": "/pcb/example-only/files/source.zip" },
    { "label": "BOM", "file": "/pcb/example-only/files/bom.csv" }
  ],
  "notes": "Demo structure only. Replace all placeholders before treating this as a real record.",
  "createdAt": "2026-09-11",
  "updatedAt": "2026-09-11"
}
```

### Schema reference

| Field | Rule |
| --- | --- |
| `id` | Required, nonempty, unique; any group identifier convention |
| `slug` | Required, unique, lowercase kebab-case |
| `title`, `description` | Required nonempty text |
| `year` | Required integer from 1900 to 9999; board/design year, not necessarily date added |
| `category` | Required configured category ID |
| `designer`, `tags` | Optional arrays of nonempty strings |
| `revision` | Optional nonempty text |
| `status` | Optional: `design`, `fabrication`, `assembled`, `tested`, `deprecated` |
| `demo` | Optional boolean; true adds visible demo notices |
| `thumbnail` | Optional local image URL; use a small optimized thumbnail |
| `specifications` | Optional map of text/numeric values; only existing entries render |
| `schematic` | Optional object with `images` and/or `pdf` |
| `layout`, `photos` | Optional arrays of image objects; `src` required per object |
| `model3d` | Optional object with `model`, `preview`, and/or `renders` |
| `downloads` | Optional array; each entry needs nonempty `label` and local `file` |
| `notes` | Optional plain text; line breaks are preserved, HTML is not interpreted |
| `createdAt`, `updatedAt`, photo `date` | Optional valid calendar dates in `YYYY-MM-DD` format |

The schema is defined in `src/lib/validation.ts`; TypeScript types are inferred in `src/types/board.ts`. Unknown extension fields are accepted but not rendered; add deliberate schema/UI support when introducing a new field. Avoid misspelling known keys. The main catalog sorts newest by board year, then date added, then identifier; the home page’s latest entries sort by date added, falling back to January 1 of the board year.

## 9. Validate

```bash
npm run validate:boards
```

Validation checks required and optional field shapes, calendar dates, years, categories, duplicate IDs/slugs, safe local paths, format compatibility for media, and existence of every declared file. Failures return a nonzero exit code and identify the record and field. It does not validate circuit correctness, PDF contents, or manufacturing readiness.

## 10. Preview and verify

```bash
npm run dev
```

Open the board’s detail page. Check every image/caption, PDF/download, and model. Try the catalog filters. Check mobile width and keyboard navigation. Then run:

```bash
npm run lint
npm run typecheck
npm run validate:boards
npm test
npm run build
```

The production export goes to `out/`. Use `npm start` to preview it. Adding/removing a record or asset requires rebuilding and redeploying the static site.

## 11. Commit

Review the changes, then commit the intended record and assets (plus category configuration if changed). Do not commit `node_modules/`, `.next/`, `out/`, private environment values, or files you are not allowed to share. Git publishing/deployment follows your group’s workflow.
