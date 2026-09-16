# Codex Task — PCB Work Catalog Website

## 0. Task Overview

Build a group-internal/public PCB catalog website inspired by:

https://qtwork.tudelft.nl/~demo/boards.html?category=adapter-boards

The website is intended to become the central archive for PCB works designed by our group.

Each PCB work must have its own detail page and should be able to display at minimum:

1. Schematic
2. PCB layout
3. 3D model / 3D rendering
4. Physical-board photos

The site should be easy to maintain over a long period of time. Adding a new PCB should normally require only:

- adding PCB metadata;
- adding images/PDF/3D-model files;
- optionally adding downloadable source/manufacturing files;

and should **not** require modifying page components.

---

# 1. Primary Goal

Create a clean, searchable, maintainable PCB knowledge/catalog website with the following hierarchy:

```text
Home
├── Browse by Category
├── Browse by Year
├── Search
└── All PCB Works
     └── PCB Detail Page
          ├── Overview
          ├── Schematic
          ├── PCB Layout
          ├── 3D Model
          ├── Physical Photos
          └── Downloads / Metadata
```

The visual language may reference the TU Delft QT Designed Electronics PCB catalog, but do not clone branding, logos, copyrighted text, or exact styling.

The finished site should feel like a technical engineering archive rather than a marketing landing page.

---

# 2. Default Technical Decisions

Unless the existing repository already uses another suitable stack, use:

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Static generation wherever practical
- Local JSON / YAML / Markdown based PCB metadata
- Assets stored under `public/`
- `model-viewer` or an equivalent lightweight web component for interactive `.glb/.gltf` models

The site should be deployable to one or more of:

- GitHub Pages
- Vercel
- a normal static web server / laboratory server

Avoid introducing a database or backend unless required by the existing repository.

The first implementation should prioritize:

1. reliability;
2. maintainability;
3. simple deployment;
4. easy PCB data entry;
5. responsive browsing.

---

# 3. Design Principles

Follow these principles throughout implementation:

## 3.1 Data-driven

PCB information must be separated from UI code.

Do NOT hard-code PCB cards or PCB detail pages manually.

The UI should be generated from structured PCB records.

## 3.2 Engineering-first

Prioritize:

- clear identifiers;
- readable technical metadata;
- large technical images;
- easy comparison;
- simple navigation;
- downloadable source files.

Avoid unnecessary animation and decorative UI.

## 3.3 Long-term maintainability

A new group member should be able to add a PCB without understanding React internals.

## 3.4 Graceful missing data

A PCB may not have all four asset types initially.

The page must handle missing assets gracefully.

For example:

```text
Schematic
Not available yet.
```

Do not break the page if an asset is absent.

---

# 4. Information Architecture

## 4.1 Global navigation

Create a top navigation bar containing:

- Home
- Boards
- Categories
- Years
- About

Optional future item:

- Submit / Add PCB

The navigation must remain usable on desktop and mobile.

---

# 5. Home Page

Create a home page that introduces the PCB archive.

The page should include:

## Hero / title

Example:

```text
<Group Name> PCB Library
PCB design archive for our research group
```

## Browse by Category

Show category cards.

Initial categories may use:

```text
Adapter Boards
Filter Boards
Sample / Device Boards
Interface Boards
RF Boards
Cryogenic Boards
Power Boards
Test Boards
Miscellaneous
```

Important:

The category list must come from configuration/data and must be easy to change later.

Do not assume these exact categories are final.

## Browse by Year

Automatically derive available years from PCB data.

Example:

```text
2024
2025
2026
```

Newest year first.

## Recently Added / Latest Boards

Show the newest PCB works.

Each card should show:

- PCB ID
- title
- category
- year
- designer
- thumbnail
- short description

---

# 6. Boards Catalog Page

Create:

```text
/boards
```

This page is the main catalog.

It must support:

- search;
- category filtering;
- year filtering;
- optional designer filtering;
- sorting;
- responsive PCB cards.

## 6.1 Search

Search should match at least:

- PCB ID;
- PCB title;
- designer;
- category;
- tags;
- description.

Search should work client-side for the initial implementation.

## 6.2 Filters

Support:

```text
Category
Year
Designer
```

Allow filters to be combined.

Example:

```text
Category = Adapter Boards
Year = 2026
Designer = Xu
```

## 6.3 Sorting

Provide at least:

- newest first;
- oldest first;
- PCB ID;
- title.

## 6.4 URL query state

Prefer reflecting filters in the URL.

Example:

```text
/boards?category=adapter&year=2026
```

This makes filtered views shareable.

---

# 7. PCB Card

Each PCB card should contain:

```text
Thumbnail
PCB ID
PCB title
Category
Year
Designer
Short description
```

Example:

```text
26-003
MicroD25 Resistor Adapter

Adapter Board
2026
Designer: XXX

MicroD25 adapter board for resistor-pair routing.
```

Clicking a card must open:

```text
/boards/<slug>
```

---

# 8. PCB Detail Page

This is the most important page of the project.

Example route:

```text
/boards/26-003-microd25-resistor-adapter
```

The page should contain the following sections.

---

## 8.1 Header / Overview

Display:

- PCB ID
- PCB name
- short description
- category
- year
- designer(s)
- revision
- status
- tags

Possible status values:

```text
design
fabrication
assembled
tested
deprecated
```

Example:

```text
26-003 — MicroD25 Resistor Adapter

Category: Adapter Board
Designer: XXX
Year: 2026
Revision: Rev A
Status: Tested
```

---

## 8.2 Technical Metadata

Support fields such as:

- board dimensions;
- PCB thickness;
- number of layers;
- material;
- copper thickness;
- surface finish;
- minimum trace/space;
- connector types;
- impedance requirements;
- operating temperature;
- special manufacturing notes.

Only render fields that exist.

---

# 9. Schematic Section

Create a dedicated section:

```text
Schematic
```

Support:

- PNG
- JPG
- WebP
- PDF

Requirements:

- show image preview when an image exists;
- click image to open fullscreen/lightbox;
- provide PDF open/download button when PDF exists;
- support multiple schematic pages.

Example data:

```json
"schematic": {
  "images": [
    "/pcb/26-003/schematic/page-1.webp",
    "/pcb/26-003/schematic/page-2.webp"
  ],
  "pdf": "/pcb/26-003/schematic/26-003-schematic.pdf"
}
```

Do not rasterize PDF at runtime in the browser unless necessary.

---

# 10. PCB Layout Section

Create:

```text
PCB Layout
```

Support multiple images, for example:

- top layer;
- bottom layer;
- inner layer 1;
- inner layer 2;
- full board view;
- routing detail.

The UI should allow image captions.

Example:

```json
"layout": [
  {
    "src": "/pcb/26-003/layout/top.webp",
    "caption": "Top Layer"
  },
  {
    "src": "/pcb/26-003/layout/bottom.webp",
    "caption": "Bottom Layer"
  }
]
```

Use a gallery or tabbed layout if multiple layers exist.

Images must be viewable at high resolution.

---

# 11. 3D Model Section

Create:

```text
3D Model
```

Preferred behavior:

If a `.glb` or `.gltf` model exists, display an interactive model viewer.

Required interactions:

- rotate;
- zoom;
- reset camera;
- fullscreen if practical.

Fallback:

If no interactive model exists, show one or more 3D-render screenshots.

Data example:

```json
"model3d": {
  "model": "/pcb/26-003/3d/board.glb",
  "preview": "/pcb/26-003/3d/preview.webp",
  "renders": [
    "/pcb/26-003/3d/top.webp",
    "/pcb/26-003/3d/bottom.webp",
    "/pcb/26-003/3d/perspective.webp"
  ]
}
```

The page must still work when only `preview` or `renders` are provided.

Use lazy loading so 3D rendering does not slow down initial page load.

---

# 12. Physical Board Photos

Create:

```text
Physical Board
```

Support multiple photographs.

Examples:

- bare PCB;
- assembled PCB;
- top;
- bottom;
- installed in setup;
- connector close-up.

Each photo may optionally contain:

```text
caption
photographer
date
```

Use a responsive image gallery with lightbox/fullscreen preview.

---

# 13. Downloads Section

Create a section for engineering files.

Support optional downloads such as:

- schematic PDF;
- Gerber ZIP;
- drill files;
- fabrication package;
- BOM;
- Pick & Place;
- PCB source project;
- STEP model;
- GLB model;
- documentation;
- test report.

Example:

```json
"downloads": [
  {
    "label": "Gerber Package",
    "file": "/pcb/26-003/files/gerber.zip"
  },
  {
    "label": "BOM",
    "file": "/pcb/26-003/files/bom.xlsx"
  }
]
```

Never display a broken download link.

Only render files that actually exist or are explicitly declared.

---

# 14. PCB Data Schema

Create a clearly defined schema.

Preferred location:

```text
src/data/boards/
```

One PCB per file.

Example:

```text
src/data/boards/
├── 26-001.json
├── 26-002.json
└── 26-003.json
```

Suggested schema:

```json
{
  "id": "26-003",
  "slug": "26-003-microd25-resistor-adapter",
  "title": "MicroD25 Resistor Adapter",
  "year": 2026,
  "category": "adapter-board",
  "designer": ["Name A"],
  "revision": "Rev A",
  "status": "tested",
  "description": "Short description of the PCB.",
  "tags": [
    "MicroD",
    "adapter",
    "resistor"
  ],

  "thumbnail": "/pcb/26-003/thumbnail.webp",

  "specifications": {
    "dimensions": "80 × 40 mm",
    "thickness": "1.6 mm",
    "layers": 4,
    "material": "FR-4",
    "surfaceFinish": "ENIG"
  },

  "schematic": {
    "images": [
      "/pcb/26-003/schematic/page-1.webp"
    ],
    "pdf": "/pcb/26-003/schematic/26-003-schematic.pdf"
  },

  "layout": [
    {
      "src": "/pcb/26-003/layout/top.webp",
      "caption": "Top Layer"
    },
    {
      "src": "/pcb/26-003/layout/bottom.webp",
      "caption": "Bottom Layer"
    }
  ],

  "model3d": {
    "model": "/pcb/26-003/3d/board.glb",
    "preview": "/pcb/26-003/3d/preview.webp",
    "renders": []
  },

  "photos": [
    {
      "src": "/pcb/26-003/photos/assembled-top.webp",
      "caption": "Assembled board — top"
    }
  ],

  "downloads": [
    {
      "label": "Gerber",
      "file": "/pcb/26-003/files/gerber.zip"
    }
  ],

  "notes": "",
  "createdAt": "2026-09-11",
  "updatedAt": "2026-09-11"
}
```

Create TypeScript types/interfaces corresponding to this schema.

Validate required fields.

Minimum required fields:

```text
id
slug
title
year
category
description
```

---

# 15. Recommended Asset Directory

Use a predictable structure:

```text
public/
└── pcb/
    └── 26-003/
        ├── thumbnail.webp
        │
        ├── schematic/
        │   ├── page-1.webp
        │   └── 26-003-schematic.pdf
        │
        ├── layout/
        │   ├── top.webp
        │   ├── bottom.webp
        │   └── inner-1.webp
        │
        ├── 3d/
        │   ├── board.glb
        │   ├── preview.webp
        │   ├── top.webp
        │   └── bottom.webp
        │
        ├── photos/
        │   ├── assembled-top.webp
        │   └── assembled-bottom.webp
        │
        └── files/
            ├── gerber.zip
            ├── bom.xlsx
            └── step-model.step
```

Do not store all PCB assets in one flat directory.

---

# 16. Categories

Create category configuration instead of embedding category names throughout components.

Example:

```ts
export const boardCategories = [
  {
    id: "adapter-board",
    label: "Adapter Boards",
    description: "Interface and adapter PCB designs"
  },
  {
    id: "filter-board",
    label: "Filter Boards",
    description: "Analog, RF and cryogenic filter boards"
  }
]
```

The implementation should make it trivial to rename or add categories later.

---

# 17. Year Pages

Support:

```text
/boards?year=2026
```

Optional dedicated route:

```text
/years/2026
```

Years should be derived automatically from board records.

Do not manually maintain a separate year list unless needed for presentation.

---

# 18. Category Pages

Support:

```text
/boards?category=adapter-board
```

Optional dedicated route:

```text
/categories/adapter-board
```

A category page should display:

- category name;
- short description;
- matching PCB works;
- result count.

---

# 19. Image Viewer

Implement a reusable image gallery/lightbox component.

Required behavior:

- thumbnail grid;
- click to enlarge;
- next/previous;
- close;
- keyboard navigation on desktop;
- responsive mobile layout.

Use the same component for:

- schematic images;
- layout images;
- 3D renders;
- physical photos.

Do not implement four separate gallery systems.

---

# 20. Responsive Design

The site must support:

- desktop;
- tablet;
- mobile.

For technical detail pages:

Desktop:

```text
section navigation + main technical content (see Section 30.17)
```

Mobile:

```text
single column
```

Technical images should not overflow the viewport.

---

# 21. Accessibility

Implement basic accessibility:

- semantic headings;
- alt text;
- keyboard-accessible interactive controls;
- sufficient contrast;
- visible focus state;
- buttons must have labels;
- image lightbox must be closable via keyboard.

---

# 22. Performance

Optimize for a potentially large archive.

Requirements:

- lazy-load large images;
- lazy-load 3D viewer;
- use optimized thumbnails;
- avoid loading full-resolution PCB images on the catalog page;
- static-generate PCB detail pages where possible.

Do not preload all GLB models.

---

# 23. SEO / Metadata

Each PCB detail page should generate metadata based on PCB data.

Example browser title:

```text
26-003 MicroD25 Resistor Adapter | <Group Name> PCB Library
```

Description should come from PCB description.

Add OpenGraph image when a thumbnail exists.

---

# 24. Error Handling

Implement:

- custom 404 page;
- invalid PCB slug handling;
- invalid category handling;
- missing asset handling;
- empty search state.

Example empty search state:

```text
No PCB works match the current filters.
```

---

# 25. About Page

Create:

```text
/about
```

Include placeholders for:

- group name;
- institution;
- purpose of the PCB archive;
- contact information;
- contribution instructions.

Use clearly marked TODO placeholders where group-specific information has not yet been provided.

Do not invent institution names or contact information.

---

# 26. Add-New-PCB Workflow

Create documentation:

```text
docs/ADDING_A_BOARD.md
```

Explain step by step:

1. choose PCB ID;
2. create board data file;
3. create asset folder;
4. add schematic;
5. add layout images;
6. add 3D model/render;
7. add physical photographs;
8. add downloads;
9. run validation;
10. preview site;
11. commit.

Include a complete example PCB entry.

---

# 27. Data Validation

Add a validation script.

Suggested command:

```bash
npm run validate:boards
```

Validation should check:

- duplicate PCB IDs;
- duplicate slugs;
- invalid years;
- unknown categories;
- missing required metadata;
- malformed asset paths;
- duplicate records.

If practical, also warn about referenced local assets that do not exist.

A validation failure should return a non-zero exit code.

---

# 28. Demo Content

Create at least 3 dummy/demo PCBs covering different data combinations:

## Demo A

Has:

- schematic;
- layout;
- 3D model;
- photos;
- downloads.

## Demo B

Has:

- schematic;
- layout;
- photos;
- no interactive 3D model.

## Demo C

Has only partial data.

This is required to verify graceful handling of missing assets.

Mark all demo entries clearly as examples so they can later be deleted.

---

# 29. UI Style

Target style:

- clean;
- academic;
- engineering-oriented;
- light background by default;
- restrained color palette;
- strong typography hierarchy;
- minimal decoration.

PCB images should visually dominate PCB detail pages.

Avoid:

- excessive gradients;
- large decorative animations;
- carousel-only navigation;
- marketing-style hero sections;
- hidden technical information.

---

# 30. Suggested Page Structure

Recommended project structure:

```text
src/
├── app/
│   ├── page.tsx
│   ├── boards/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── categories/
│   │   └── [category]/
│   │       └── page.tsx
│   ├── years/
│   │   └── [year]/
│   │       └── page.tsx
│   └── about/
│       └── page.tsx
│
├── components/
│   ├── BoardCard.tsx
│   ├── BoardGrid.tsx
│   ├── BoardFilters.tsx
│   ├── SearchBar.tsx
│   ├── ImageGallery.tsx
│   ├── ModelViewer.tsx
│   ├── DownloadList.tsx
│   ├── TechnicalSpecs.tsx
│   └── Navbar.tsx
│
├── data/
│   ├── boards/
│   └── categories.ts
│
├── lib/
│   ├── boards.ts
│   ├── filters.ts
│   └── validation.ts
│
└── types/
    └── board.ts
```

Adapt this structure if the repository already has a well-defined architecture.

Do not reorganize an existing project unnecessarily.

---


# 30. Visual Design Specification

This section documents the approved visual system currently implemented in the application and is the source of truth for future UI work. New pages and components must reuse the existing design tokens, typography system, spacing, and component styling defined here. Do not introduce a new visual language without explicitly updating this specification.

The values below are synchronized with [src/app/globals.css](src/app/globals.css), the shared components in [src/components](src/components), and their usage in [src/app](src/app). The approved implementation is the basis for this specification; these are implemented values, not alternative design proposals.

## 30.1 Primary Visual Style

**Modern Minimal Engineering Documentation**

The visual character is clean, modern, technical, precise, spacious, and restrained. White and pale sage-gray surfaces, forest-green accents, near-black headings, thin structural lines, and Manrope typography support an engineering archive. Technical content remains the focus; the site is not a marketing landing page.

---

## 30.2 Visual Hierarchy

PCB schematic, layout, 3D rendering, and physical photographs remain the primary visual content on detail pages. The text hierarchy is:

```text
Page / PCB title
↓
Major technical section heading
↓
PCB card title
↓
Description
↓
Metadata and secondary controls
```

PCB IDs use a clear technical monospace treatment, secondary in scale to the PCB title. Navigation and metadata remain compact.

---

## 30.3 Color Palette

The semantic palette is defined in `:root` in `src/app/globals.css`.

| Role | CSS variable | Implemented value |
| --- | --- | --- |
| Background | `--background` | `#ffffff` |
| Secondary background | `--background-secondary` | `#f4f6f3` |
| Surface | `--surface` | `#ffffff` |
| Elevated surface | `--surface-elevated` | `#fafcf9` |
| Primary text | `--text-primary` | `#141e18` |
| Secondary text | `--text-secondary` | `#4e5e54` |
| Muted text | `--text-muted` | `#606f64` |
| Border | `--border` | `#dde4dc` |
| Strong border | `--border-strong` | `#aab9ad` |
| Primary accent | `--accent` | `#355e43` |
| Accent hover | `--accent-hover` | `#234831` |
| Accent soft | `--accent-soft` | `#edf3e8` |
| Text on accent | `--text-on-accent` | `#ffffff` |
| Lightbox backdrop | `--overlay` | `rgb(14 24 18 / .82)` |

There is no separate success, warning, error, or PCB-status color palette. Status badges and tags use `--background-secondary`, `--text-muted`, and `--border`; status text is capitalized. Demo badges use `--surface` with muted text. Notices, including invalid-filter notices, use `--surface-elevated`, muted text, and a strong left border rather than a status-specific color.

---

## 30.4 Color Usage Rules

- Page, card, navigation, input, and gallery surfaces are white.
- Secondary background is used for filters, the footer, image placeholders, thumbnail containers, and 3D viewer containers.
- Primary text provides heading contrast; descriptions use secondary text, and metadata uses muted text.
- Forest green is used for links, PCB IDs, eyebrow labels, primary buttons, focus outlines, and active navigation.
- Soft accent backgrounds provide restrained hover feedback on secondary buttons, category cards, year links, tags, and download rows.
- Selected filter controls retain the normal white input surface; they do not have a separate accent-filled selection style.

Do not introduce gradients, neon effects, saturated page backgrounds, or decorative overlays. Image and model asset colors are content, not additional UI palette tokens.

---

## 30.5 Typography and Type Scale

The primary family is `--font-primary: "Manrope", Arial, sans-serif`. Manrope is loaded through a local `@font-face` in `globals.css` from `src/app/fonts/manrope-latin-variable.woff2`, with normal style, weight range `400 700`, and `font-display: swap`. Its license is included in `src/app/fonts/OFL.txt`. The root layout imports `globals.css`; no `next/font` configuration or secondary sans-serif family is used.

PCB IDs and download file extensions use `--font-technical: ui-monospace, SFMono-Regular, Consolas, monospace`. Inline `code` retains Tailwind's default monospace stack; it is not explicitly assigned `--font-technical`.

| Typography token | Implemented value | Usage |
| --- | --- | --- |
| `--weight-body` | `400` | Body and catalog input/select text |
| `--weight-medium` | `500` | PCB IDs, buttons, navigation, labels, metadata values |
| `--weight-heading` | `600` | Headings, brand, eyebrow labels |
| `--line-body` | `1.65` | Body and lead text; inherited by most controls and metadata |
| `--line-heading` | `1.16` | `h1`, `h2`, `h3` |
| `--tracking-heading` | `-.04em` | Default heading letter spacing |

Card titles override heading line-height to `1.35`. Homepage title letter spacing is `-.045em`; brand text is `-.02em`; PCB IDs use `.03em`; uppercase eyebrow labels use `.07em`; the PCB brand mark uses `.02em`. Technical specification values use `font-variant-numeric: tabular-nums` while retaining the primary sans-serif family. Ordinary `strong` text keeps the default bold treatment unless a component overrides it, as notices do with weight `500`.

The following expressions are the actual tokens; retain their responsive formulas rather than substituting approximate pixel ranges.

| Text role | Token | Implemented value / responsive override |
| --- | --- | --- |
| Homepage primary title | `--type-home` | `clamp(3rem, 4vw, 3.5rem)`; at `max-width: 1000px`: `clamp(2.25rem, 4.4vw, 2.75rem)`; at `max-width: 640px`: `clamp(1.875rem, 8vw, 2.25rem)` |
| Page title, including catalog and category/year index page titles | `--type-page` | `clamp(2rem, 3.5vw, 3rem)` |
| PCB detail title | `--type-detail` | `clamp(2rem, 3.6vw, 2.75rem)` |
| Major section heading; category/year section and index-entry headings | `--type-section` | `clamp(1.5rem, calc(1rem + 1.25vw), 2rem)` |
| PCB card title; default `h3`; brand; homepage year links | `--type-card` | `clamp(1.125rem, 1.5vw, 1.375rem)` |
| PCB ID | `--type-id` | `clamp(.875rem, 1.1vw, 1rem)` |
| Body, card description, search input, download label, technical specification table | `--type-body` | `1rem`; technical table rows use `--type-small` on mobile |
| Supporting lead; homepage category-card title | `--type-lead` | `clamp(1rem, 1.3vw, 1.0625rem)`; `.lead` text uses `--type-body` on mobile |
| Card metadata, overview values, buttons, desktop/tablet navigation, filter selects | `--type-meta` | `.875rem`; mobile navigation uses `--type-small`, mobile filter selects use `--type-body` |
| Labels, overview terms, captions, breadcrumbs, detail navigation, results, footer, dates, file extensions | `--type-small` | `.8125rem` |
| Eyebrows, badges, tags, PCB brand mark | `--type-label` | `.75rem` |

Additional existing compact treatments: section-heading links and mobile lightbox buttons use `--type-small`; archive statistics use `--type-small` normally and `--type-label` on mobile; category/year index descriptions and counts use `--type-meta` normally and `--type-small` on mobile. Empty-state `h2` headings use `--type-card`.

---

## 30.6 Layout and Spacing

Spacing creates hierarchy around titles, related content, and technical sections. The shared scale is based on 4px increments; it is not a blanket increase to every margin.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--space-1` | `4px` | `--space-2` | `8px` |
| `--space-3` | `12px` | `--space-4` | `16px` |
| `--space-5` | `20px` | `--space-6` | `24px` |
| `--space-7` | `28px` | `--space-8` | `32px` |
| `--space-10` | `40px` | `--space-12` | `48px` |
| `--space-14` | `56px` | `--space-16` | `64px` |
| `--space-20` | `80px` | | |

`--content-width: 1280px` defines the inner content limit. `.container` has `width: 100%`, centered margins, horizontal padding `var(--page-gutter)`, and `max-width: calc(var(--content-width) + 2 * var(--page-gutter))`. The desktop outer limit is therefore 1360px including gutters.

`--page-gutter` is `var(--space-10)` by default, `var(--space-6)` at `max-width: 1000px`, and `var(--space-5)` at `max-width: 640px`. The prose page has an additional `800px` maximum width; supporting lead text is limited to `740px`.

| Area | Implemented spacing |
| --- | --- |
| Page heading | `48px` top / `32px` bottom; mobile `32px` / `24px` |
| Homepage introduction | `48px` top / `28px` bottom; mobile top `32px` |
| Homepage section | `48px` top margin; mobile `32px` |
| Section heading group | `24px` bottom margin, `20px` internal gap; mobile gap `12px` |
| PCB card body | `24px` padding |
| Board and image grids | `24px` gap |
| Filter panel | `24px` padding; mobile `16px` |
| Filter row | `16px` top margin and gap; mobile gap `12px` |
| Detail header | `32px` vertical padding |
| Detail columns | `40px` gap and top margin; tablet gap `24px`; mobile top margin `24px` |
| Technical section | `48px` bottom padding, `40px` bottom margin, bottom divider; heading bottom margin `24px` |
| Overview metadata | Wrapping rows, `20px` row / `40px` column gap; mobile column gap `24px` |
| Technical table row | `16px` vertical padding; `24px` column gap, mobile `16px` |
| Download row | `20px` vertical / `12px` horizontal padding, `16px` internal gap |
| Main content bottom | `80px`; mobile `48px` |
| Footer | `32px` vertical padding, `24px` gap |

The main content minimum height is `calc(100vh - 230px)`. In-page navigation uses `scroll-padding-top: 96px` on `html` and `scroll-margin-top: 24px` on technical sections.

---

## 30.7 Border Radius

Geometry is near-square with small corner radii.

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-small` | `4px` | Brand mark, badges, tags, notices, missing-content blocks, enlarge labels, download rows |
| `--radius-control` | `6px` | Buttons, inputs, selects, year links, gallery triggers, model containers |
| `--radius-panel` | `8px` | PCB cards, category grid container, filter panel, empty state, lightbox |

There are no pill-shaped controls or larger shared radius values.

---

## 30.8 Borders and Shadows

Default borders are `1px solid var(--border)` on cards, controls, panels, gallery/model containers, and section dividers. Category-grid internal divisions use a `1px` gap over the border-colored grid background. Empty states use a `1px dashed var(--border)` border. Notices have a `2px solid var(--border-strong)` left border. Navigation reserves a `2px` bottom border for the active state.

The application defines no box-shadow or text-shadow styling, including hover and lightbox states. Separation comes from borders, spacing, and surface colors. There are no shared shadow tokens and no card lift on hover.

---

## 30.9 PCB Cards

The entire card is a link. Its existing content order is thumbnail, PCB ID, PCB title, category/year, designer, description, and the bottom-aligned “View board” link treatment.

The thumbnail container uses `aspect-ratio: 16 / 10`, secondary background, and a bottom border. Images use `object-fit: contain`; technical content is not cropped to fill the container. The body has `24px` padding. Card title margins are `8px` above and `12px` below; description margin is `12px` above; the bottom link has `24px` top padding. Title and metadata sizes follow Section 30.5.

Cards use a white surface, `1px` border, and `8px` radius. Hover changes only the border to `--accent` through the shared transition, without underline, shadow, or movement.

---

## 30.10 PCB Detail Page

The existing presentation is breadcrumb, ID/status row, PCB title, description, overview metadata, tags, optional demo notice, then section navigation alongside the technical content. Schematic, PCB layout, 3D model, physical board, technical specifications, and downloads use the shared section heading scale and thin horizontal dividers. Technical sections are not individually wrapped in heavy cards.

Overview metadata wraps naturally; terms use muted small text and values use medium-weight metadata text. Technical specification rows use `minmax(160px, 1fr) 2fr` columns, muted terms, and primary-text values with tabular numerals. Values retain line breaks and wrap long content with `overflow-wrap: anywhere`. The mobile table stays in two columns as specified in Section 30.17.

Download rows use accent-colored labels, small muted monospace extensions, subtle bottom borders, and an accent-soft hover background. Missing-content blocks remain neutral and use the existing explicit missing-data messages.

---

## 30.11 Navigation

The white header has a `1px` bottom border. `.nav-inner` has `min-height: 64px`, with brand and links in a horizontal row above the mobile breakpoint. The brand uses the card type scale, weight `600`, and `12px` spacing around the mark. The fallback PCB mark is `28px` high with near-black background, white text, and `4px` radius; a configured logo is rendered at `28px × 28px`.

Main link gaps are `28px` by default and `20px` at `max-width: 1000px`. Links use muted text, weight `500`, and the metadata scale; hover/focus changes text to the accent. `[aria-current="page"]` applies accent text and an accent-colored `2px` bottom border. There is no custom pressed-state treatment.

On mobile, brand and navigation become two rows, links remain visible, and the header grows with its content rather than enforcing a fixed height. Link sizing and spacing are specified in Section 30.17. The header itself is not sticky.

---

## 30.12 Homepage

The existing homepage retains its eyebrow, configured site title, supporting description, search, archive statistics, optional demo notice, category grid, year links, and latest boards. The title uses `--type-home`, with whitespace defined in Section 30.6 and no full-screen hero.

The horizontal search form has a `640px` maximum width, `8px` gap, and `28px` top margin (`24px` on mobile). Its input is `46px` high. The form remains a row on mobile.

The category grid has three columns until the mobile breakpoint. Category cells use `20px 24px` padding, a white surface, and a soft accent hover background; mobile padding is `16px 20px`. The year section uses top/bottom dividers and `28px` vertical padding; year links wrap with `12px` gaps.

---

## 30.13 Search, Filters, and Shared Controls

The catalog places a full-width search input above four native select controls in a `1.3fr 1fr 1fr 1fr` grid. The filter panel uses the secondary background and a thin border. Search text is `--type-body`; select text is `--type-meta` until the mobile breakpoint.

Selected values remain visible in the native selects, using the same surface and border treatment as unselected controls. The results toolbar and conditional “Clear filters” text button indicate the current filtered view. There are no selected-filter chips or custom-colored option menus; native option rendering is browser-dependent.

Shared inputs/selects have `min-height: 44px`, `10px 12px` padding, `6px` radius, white background, and muted placeholder text. Labels use weight `500`, `--type-small`, and a `6px` gap. Focus changes the control border to `--accent`.

Shared `.button` controls use `min-height: 40px`, `8px 16px` padding, `12px` gap, `6px` radius, weight `500`, and `--type-meta`. Secondary button hover uses `--accent-soft`; primary buttons use accent background and white text, darkening to `--accent-hover` on hover. Text buttons underline on hover. Disabled buttons use `opacity: .45` and the default cursor.

---

## 30.14 Image Presentation and Lightbox

Schematic images, layout images, 3D renders, and physical photographs use the shared gallery. Galleries have two equal columns with `24px` gaps; a single-image gallery always uses one column, and all galleries become one column on mobile. Gallery triggers use white backgrounds, thin borders, and `6px` radii. Images use `width: 100%`, `height: auto`, and `object-fit: contain`. Captions use `--type-small`, with `8px` top padding. Hover strengthens the trigger border to `--border-strong`.

The lightbox uses `width: min(1400px, 96vw)`, `max-width: 96vw`, `max-height: 94vh`, `16px` padding (`10px` on mobile), `8px` radius, white surface, and the `--overlay` backdrop. Its image uses automatic width/height with `max-width: 100%` and `max-height: 68vh`. Existing original-image access and gallery controls are preserved. No custom fade or shadow is defined.

---

## 30.15 3D Model Viewer

Model poster and interactive containers use `--background-secondary: #f4f6f3`, `1px` borders, and `6px` radii. Poster images are contained in a `260px`-high area. The interactive `model-viewer` element has inline `width: "100%"` and `height: "420px"` in `src/components/InteractiveModel.tsx`; this height is not a global design token and has no mobile override.

Model sections use `24px` gaps. The controls wrap, are centered, and use `12px` gaps and `16px` padding. In fullscreen, the container becomes a vertically centered flex column with scrolling available and the viewer set to `flex: 1`. No decorative 3D environment is configured by the application. Existing load-on-request behavior and camera controls are unchanged.

---

## 30.16 Interactive States and Motion

The shared transition is `--transition-ui: 160ms ease`. It applies to background and/or border colors on controls, category cards, PCB cards, gallery triggers, and download rows; navigation transitions text and border colors. No custom entrance, lightbox fade, card movement, animated background, or continuous animation is implemented.

Default links underline on hover with `text-underline-offset: 4px`; component links override that where their border/background already provides feedback. Tags hover to accent-soft background with strong borders. Category/year index rows and detail section-navigation links hover to the secondary background; section-navigation text also changes to the accent. The section navigation does not implement a scroll-tracking active state.

Global `:focus-visible` uses `outline: 2px solid var(--accent)` and `outline-offset: 4px`. The skip link becomes visible on focus. Main navigation's active state is defined in Section 30.11; filter selection presentation is defined in Section 30.13. No shared custom `:active` pressed style is defined.

Under `prefers-reduced-motion: reduce`, all elements and pseudo-elements use `transition: none !important` and `scroll-behavior: auto !important`.

---

## 30.17 Responsive Behavior

The actual CSS breakpoints are `@media (max-width: 1000px)` and `@media (max-width: 640px)`. Mobile rules follow and override tablet rules. Responsive `clamp()` expressions are preserved in Section 30.5.

| Area | Desktop: above 1000px | Tablet: above 640px through 1000px | Mobile: 640px and below |
| --- | --- | --- | --- |
| Horizontal gutter | `40px` | `24px` | `20px` |
| Board grid | 3 columns | 2 columns | 1 column |
| Homepage category grid | 3 columns | 3 columns | 1 column |
| Gallery | 2 columns; single image uses 1 | Same | 1 column |
| Detail layout | `176px minmax(0, 1fr)`, `40px` gap | 1 column, `24px` gap | 1 column, `24px` gap and top margin |
| Detail section navigation | Sticky at `top: 28px`, vertical links, left border | Static, wrapping horizontal links, bottom border; eyebrow/back link hidden | Same as tablet |
| Main navbar | Brand and links on one row, `28px` link gaps | Same row, `20px` link gaps | Brand above full-width links; `12px` top padding, `12px` link gaps, `space-between`; link padding `12px 0 10px`, text `--type-small` |
| Catalog filter row | `1.3fr 1fr 1fr 1fr`, `16px` gap | Same | 1 column, `12px` gap; select text `--type-body`, padding `10px 8px` |
| Overview metadata | Wrapping, `20px 40px` gaps | Same | Wrapping, `20px 24px` gaps |
| Specification table | `minmax(160px, 1fr) 2fr`, `24px` gap | Same | `1fr 1.2fr`, `16px` gap, text `--type-small` |
| Section heading group | Horizontal with `20px` gap | Same | Wraps, baseline-aligned, `12px` gap |
| Year section / footer | Horizontal flex layout | Same | Vertical, left-aligned |

Mobile also reduces page/home spacing as documented above, sets lead text to `--type-body`, and reduces lightbox toolbar gaps to `8px`; lightbox buttons use `--type-small` and `8px` padding. Images continue to preserve their aspect ratios. The table and homepage search form intentionally remain multi-column/row structures within the otherwise single-column mobile page.

---

## 30.18 Dark Mode

The approved implementation is light mode only. There is no dark-mode palette, theme toggle, or color-scheme media override. Future dark-mode work requires an explicit specification update.

---

## 30.19 Design Tokens and Implementation Locations

`src/app/globals.css` owns the color, font, type, spacing, radius, content-width, and transition tokens, shared component selectors, and responsive overrides. `src/app/layout.tsx` imports it and applies the shared container, header, main, and footer structure. Component/page markup reuses these classes.

Tailwind CSS is imported with `@import "tailwindcss"` and configured through the `@tailwindcss/postcss` plugin in `postcss.config.mjs`. There is no separate `tailwind.config.*` file or additional application CSS stylesheet. Existing `@theme inline` aliases are:

| Tailwind theme alias | Semantic source |
| --- | --- |
| `--color-background` | `var(--background)` |
| `--color-surface` | `var(--background-secondary)` |
| `--color-ink` | `var(--text-primary)` |
| `--color-muted` | `var(--text-muted)` |
| `--color-border` | `var(--border)` |
| `--color-accent` | `var(--accent)` |
| `--font-sans` | `var(--font-primary)` |

The Tailwind `surface` alias intentionally maps to the secondary background, whereas the raw `--surface` token is white. Reuse the applicable existing token/class rather than introducing a parallel palette or arbitrary per-page type/spacing values. The inline model dimensions documented in Section 30.15 are an existing component-specific exception.

---

## 30.20 Design References

The approved visual atmosphere adapts the color relationships, sans-serif typography, whitespace, and structural clarity of `design-reference/huaban-tech-reference1.png` through `design-reference/huaban-tech-reference4.png`. These references are inspiration, not application assets or pixel-for-pixel layout targets. The unnumbered `huaban-tech-reference.png` file is not present in the repository.

The TU Delft reference remains an information-architecture reference. Do not copy reference branding, imagery, copyrighted text, or exact layouts. Future work follows the approved tokens above rather than importing another documentation site's visual system.

---

## 30.21 Explicitly Avoid

Preserve the engineering archive character. Do not introduce oversized marketing heroes, gradient buttons, glassmorphism, heavy shadows, large rounded cards, card tilt/lift, animated backgrounds, decorative illustrations, stock photography, or unnecessary icons. Do not hide technical information or replace large readable images with decorative content.

---

## 30.22 Final Visual Goal

The website should communicate a carefully maintained engineering PCB archive through clear headings, deliberate whitespace, restrained forest-green accents, and readable technical media. Technical readability takes priority over decoration. All future visual work must remain consistent with this documented implementation.

---

# 31. Implementation Phases

Codex should execute the work in this order.

## Phase 1 — Repository inspection

Before editing:

1. inspect repository structure;
2. detect framework and package manager;
3. inspect existing README;
4. inspect existing coding conventions;
5. identify existing reusable components;
6. identify existing deployment configuration.

If the repository already has an appropriate web stack, extend it instead of replacing it.

Produce a short implementation note before major changes.

---

## Phase 2 — Data model

Implement:

- PCB TypeScript types;
- category configuration;
- board loader;
- board sorting;
- board filtering;
- validation.

---

## Phase 3 — Base UI

Implement:

- layout;
- navbar;
- footer;
- home page;
- board card;
- catalog grid.

---

## Phase 4 — Search and filters

Implement:

- search;
- category filter;
- year filter;
- designer filter;
- sort;
- URL query parameters.

---

## Phase 5 — PCB detail page

Implement all required technical sections:

- Overview;
- Technical Metadata;
- Schematic;
- Layout;
- 3D Model;
- Physical Photos;
- Downloads.

---

## Phase 6 — Image and 3D viewers

Implement reusable:

- image gallery/lightbox;
- lazy-loaded interactive 3D viewer.

---

## Phase 7 — Demo data

Create the demo PCB records and assets/placeholders needed to exercise all layouts.

Do not use copyrighted reference-site images.

Generate simple local placeholders if real group assets are not yet present.

---

## Phase 8 — Documentation

Create/update:

```text
README.md
docs/ADDING_A_BOARD.md
```

Document:

- development;
- build;
- validation;
- deployment;
- adding PCB records;
- directory conventions.

---

## Phase 9 — Quality checks

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run validate:boards
npm run build
```

Use the equivalent package-manager commands if the repository uses pnpm/yarn/bun.

Fix errors before completion.

---

# 32. Acceptance Criteria

The task is complete only if all of the following are true.

## Catalog

- [ ] PCB catalog page exists.
- [ ] PCB cards are generated from data.
- [ ] Search works.
- [ ] Category filter works.
- [ ] Year filter works.
- [ ] Combined filters work.
- [ ] Sorting works.

## PCB page

- [ ] Every PCB has a unique URL.
- [ ] Schematic section works.
- [ ] PCB layout section works.
- [ ] 3D model/render section works.
- [ ] Physical photo section works.
- [ ] Downloads section works.
- [ ] Missing assets do not break the page.

## UX

- [ ] Desktop responsive.
- [ ] Mobile responsive.
- [ ] Technical images can be enlarged.
- [ ] Navigation is clear.
- [ ] Empty states exist.
- [ ] 404 works.

## Engineering

- [ ] TypeScript has no unresolved errors.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] PCB validation passes.
- [ ] No board content is hard-coded in UI components.
- [ ] New boards can be added without changing React page code.

## Documentation

- [ ] README explains local development.
- [ ] `ADDING_A_BOARD.md` exists.
- [ ] PCB schema is documented.
- [ ] Asset directory structure is documented.

---

# 33. Deliverables

Codex must deliver:

1. working website source code;
2. reusable PCB data schema;
3. responsive catalog page;
4. PCB detail-page template;
5. schematic viewer;
6. layout gallery;
7. interactive/fallback 3D viewer;
8. physical-board photo gallery;
9. search and filtering;
10. PCB validation script;
11. demo PCB entries;
12. README;
13. `docs/ADDING_A_BOARD.md`;
14. deployment instructions.

---

# 34. Out of Scope for V1

Do NOT spend time implementing these unless the existing project already requires them:

- user authentication;
- database;
- online PCB editor;
- comments;
- approval workflow;
- complex CMS;
- automatic KiCad/Altium parsing;
- automatic Gerber rendering;
- cloud asset upload;
- role-based permissions.

Design the architecture so these could be added later, but keep V1 static and maintainable.

---

# 35. Future Expansion Hooks

Keep the schema extensible for future support of:

- KiCad source links;
- Altium source links;
- Git repository URL;
- fabrication vendor;
- fabrication order number;
- assembly status;
- test status;
- cryogenic qualification;
- measured S-parameters;
- measurement plots;
- revision history;
- replacement/superseded board links;
- related PCBs;
- BOM viewer;
- Gerber viewer;
- STEP viewer;
- QR code linking physical boards to their web pages.

Do not implement all of these in V1.

---

# 36. Decisions That Must Remain Configurable

Do not hard-code assumptions about:

- group name;
- institution;
- logo;
- contact email;
- exact PCB categories;
- PCB ID convention;
- hosting domain;
- color palette;
- source EDA tool.

Place such values in configuration files or clear constants.

Where values are unknown, use explicit TODO placeholders rather than inventing them.

---

# 37. Codex Execution Rules

While carrying out this task:

1. Inspect before editing.
2. Reuse existing project conventions.
3. Do not rewrite unrelated code.
4. Keep components small and reusable.
5. Prefer simple solutions over unnecessary abstractions.
6. Avoid adding a backend for V1.
7. Do not copy assets or branding from the reference website.
8. Never fabricate PCB technical data.
9. Use TODO/demo values for unknown group-specific information.
10. After each major phase, verify the site still builds.
11. Before finishing, run all available lint/type/build/test checks.
12. Summarize every created/modified file in the final response.
13. Explicitly report any requirement that could not be completed.

---

# 38. Final Codex Report Format

At completion, return a concise report in this format:

```text
## Completed
- ...

## Main Architecture
- ...

## Pages Added
- ...

## PCB Data Structure
- ...

## Validation
- lint:
- typecheck:
- board validation:
- build:

## Files Added / Modified
- ...

## How to Add a New PCB
1. ...
2. ...
3. ...

## Remaining TODOs Requiring Group Information
- Group name
- Logo
- Contact information
- Final category taxonomy
- Production domain
```

---

# 39. Definition of Success

A group member should be able to clone the repository, add a folder such as:

```text
public/pcb/26-004/
```

create one metadata file such as:

```text
src/data/boards/26-004.json
```

add the PCB schematic/layout/3D/photo assets, run the validation/build command, and automatically obtain:

```text
/boards/26-004-...
```

plus automatic appearance in:

- All Boards;
- its category;
- its year;
- search results.

No PCB-specific React page should need to be written.
