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
main content + optional metadata sidebar
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

## 30.1 Primary Visual Style

Use the following visual direction:

**Modern Minimal Engineering Documentation**

Secondary characteristics:

- Academic
- Technical
- Precise
- Calm
- Information-dense but uncluttered

The site should visually resemble a modern technical documentation portal or engineering design archive, not a portfolio, SaaS landing page, or marketing website.

The TU Delft PCB website should primarily be treated as an information architecture reference, not something to visually clone.

---

## 30.2 Visual Hierarchy

The hierarchy should prioritize:

```text
PCB Images
↓
PCB Name / PCB ID
↓
Technical Information
↓
Metadata
↓
Secondary Controls
```

PCB schematic, layout, 3D rendering, and physical photographs should visually dominate PCB detail pages.

Navigation, decorative elements, and metadata should remain visually secondary.

---

## 30.3 Color Palette

Use a restrained neutral palette.

Recommended base palette:

```text
Background:
#FFFFFF

Secondary Background:
#F7F7F8

Card / Panel Background:
#FFFFFF

Primary Text:
#18181B

Secondary Text:
#71717A

Border:
#E4E4E7

Hover Background:
#F4F4F5
```

Use only one primary accent color.

Recommended accent:

```text
Primary Accent:
#2563EB
```

Use the accent color mainly for:

- links;
- active navigation;
- selected filters;
- important buttons;
- interactive highlights.

Status labels may use subtle semantic colors where appropriate.

---

## 30.4 Color Usage Rules

Do not use:

- large gradients;
- neon colors;
- high-saturation backgrounds;
- rainbow color schemes;
- large colored page sections;
- glassmorphism;
- excessive transparency effects.

Most of the site should remain white, light gray, and dark gray with a small amount of accent color.

---

## 30.5 Typography

Use a clean modern sans-serif typeface.

Preferred fallback order:

```text
Inter
Geist
system-ui
Arial
sans-serif
```

Do not introduce decorative fonts.

Suggested typography scale:

```text
Page Title:
32–40 px

PCB Detail Title:
28–36 px

Section Heading:
20–24 px

Card Title:
16–18 px

Body:
14–16 px

Metadata:
13–14 px
```

Avoid extremely large hero text.

The site is an engineering archive, not a marketing landing page.

---

## 30.6 Layout

Use generous but controlled whitespace.

Recommended maximum content width:

```text
1200–1400 px
```

Desktop horizontal page padding:

```text
24–40 px
```

Mobile horizontal padding:

```text
16–20 px
```

Use consistent vertical spacing.

Suggested spacing system:

```text
4
8
12
16
24
32
48
64 px
```

Prefer an 8 px spacing rhythm where practical.

---

## 30.7 Border Radius

Keep corner radius subtle.

Recommended:

```text
Small UI elements:
4–6 px

Cards:
6–8 px

Large panels:
8 px maximum
```

Avoid highly rounded cards unless there is a specific UX reason.

The UI should feel precise and technical.

---

## 30.8 Borders and Shadows

Prefer thin borders over heavy shadows.

Default card treatment:

```text
1 px solid light-gray border
white background
minimal or no shadow
```

Allowed:

- very subtle hover shadow;
- subtle shadow for lightboxes/dialogs.

Avoid:

- large drop shadows;
- floating glass cards;
- multiple shadow layers.

---

## 30.9 PCB Cards

PCB cards should be visually simple.

Preferred structure:

```text
┌──────────────────────────────┐
│                              │
│        PCB Thumbnail         │
│                              │
├──────────────────────────────┤
│ 26-003                       │
│ MicroD25 Resistor Adapter    │
│                              │
│ Adapter Board · 2026         │
│ Designer: XXX                │
└──────────────────────────────┘
```

Requirements:

- large thumbnail area;
- PCB image is the strongest visual element;
- no decorative background illustration;
- PCB ID is clear;
- PCB title is prominent;
- metadata uses smaller secondary text;
- entire card may be clickable.

Hover behavior should remain subtle.

Example:

```text
slightly darker border
or
1–2 px upward movement
```

Do not use dramatic animations.

---

## 30.10 PCB Detail Page

The PCB detail page should feel like technical documentation.

Recommended structure:

```text
Breadcrumb

PCB ID + PCB Name
Short Description

Metadata / Status

────────────────────────

Schematic

[ Large Technical Images ]

────────────────────────

PCB Layout

[ Large Technical Images ]

────────────────────────

3D Model

[ Model Viewer ]

────────────────────────

Physical Board

[ Photo Gallery ]

────────────────────────

Technical Specifications

────────────────────────

Downloads
```

Use whitespace or subtle horizontal dividers to separate major sections.

Do not wrap every section inside a visually heavy card.

Large engineering images should have room to breathe.

---

## 30.11 Navigation

Use a compact documentation-style navigation bar.

Example:

```text
<Group PCB Library>

Boards
Categories
Years
About
```

Recommended navbar height:

```text
56–64 px
```

Use a subtle bottom border.

Avoid:

- oversized logos;
- mega menus;
- animated navigation;
- unusually tall navigation bars.

---

## 30.12 Homepage

Keep the homepage simple.

Do not create a large marketing hero.

Preferred structure:

```text
<Group Name> PCB Library

PCB design archive for our research group.

[ Search PCB... ]
```

Then:

```text
Browse by Category

Browse by Year

Latest Boards
```

Keep the hero height modest so PCB content appears early in the page.

---

## 30.13 Search and Filters

Search and filter controls should resemble modern technical software/documentation controls.

Use:

- simple bordered inputs;
- compact dropdowns;
- small filter chips.

Avoid:

- oversized pill buttons;
- large animated controls;
- bright saturated filter backgrounds.

Selected filters may use the accent color.

---

## 30.14 Image Presentation

Technical images are a primary part of the site.

For schematic and layout images:

- use white or neutral background;
- preserve original aspect ratio;
- do not crop technical images unnecessarily;
- allow fullscreen/lightbox viewing;
- allow high-resolution viewing.

Do not use strong shadows around schematic/layout screenshots.

For physical PCB photographs:

- use consistent thumbnail ratios where practical;
- preserve access to the original full image in the lightbox.

---

## 30.15 3D Model Viewer

Use a neutral 3D viewer background.

Recommended:

```text
#F7F7F8
```

Controls should remain subtle.

Do not add decorative 3D environments unless they help explain the PCB.

---

## 30.16 Animation

Keep animation minimal.

Allowed:

```text
150–200 ms hover transition
lightbox fade
dropdown transition
minor button feedback
```

Avoid:

- scroll animations;
- parallax;
- large entrance animations;
- animated gradients;
- 3D card tilt;
- continuous motion.

Animation must never distract from engineering data.

---

## 30.17 Responsive Behavior

Desktop:

```text
clean multi-column layout where useful
```

Tablet:

```text
reduced number of columns
```

Mobile:

```text
single-column layout
```

PCB images must remain readable.

Do not shrink schematic/layout images into tiny multi-column grids on small screens.

---

## 30.18 Dark Mode

Do not implement dark mode in V1 unless it already exists in the repository.

The default design target is light mode.

The architecture may remain compatible with future dark mode support.

---

## 30.19 Design Tokens

Create shared design tokens or consistent reusable styling for:

- colors;
- spacing;
- font sizes;
- border radius;
- content width;
- border color;
- interactive states.

Do not repeat arbitrary visual values throughout components.

If Tailwind is used, reuse consistent utility patterns.

---

## 30.20 Design References

Use the following design concepts as inspiration:

- modern technical documentation;
- GitHub documentation;
- Vercel documentation;
- engineering equipment catalogs;
- academic laboratory websites.

Do not copy exact branding, CSS, images, layouts, or copyrighted content from any reference.

---

## 30.21 Explicitly Avoid

Do not create a site that looks like:

- a SaaS landing page;
- a startup homepage;
- a portfolio website;
- an e-commerce store;
- a social-media dashboard.

Avoid:

- huge hero typography;
- gradient buttons;
- glassmorphism;
- excessive cards;
- very large rounded corners;
- floating decorative blobs;
- decorative illustrations;
- stock photography;
- excessive icon usage.

The PCB itself should provide most of the visual interest.

---

## 30.22 Final Visual Goal

The final website should communicate:

```text
"This is a carefully maintained engineering PCB archive."
```

rather than:

```text
"This is a promotional website."
```

When visual decoration conflicts with technical readability:

**always prioritize technical readability.**

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
