# PCB catalog implementation plan

Task.md is the primary product, architecture, and visual specification. The approved approach is a static Next.js App Router application with TypeScript, Tailwind, npm, local JSON records, and public assets. No backend or other V1 exclusions are included.

## Foundation and data

- Initialize tooling and static export with an optional hosting base path.
- Define Board types, configurable categories, and one JSON file per board.
- Implement build-time loading, schema/path/category/duplicate validation, and client-safe sorting/filtering. Test invalid records and combined search/filter behavior.
- Keep missing optional media absent; reject explicitly referenced missing files before publishing.

## Pages and visual system

- Centralize the specified neutral palette, blue accent, type scale, spacing, and restrained borders.
- Build compact navigation, Home, Boards, Categories, Years, About, and 404.
- Generate detail routes and metadata from validated records. Keep full board assets out of the catalog payload.
- Implement URL-backed search/category/year/designer/sort with empty and invalid-filter states.

## Media and examples

- Reuse one keyboard-accessible dialog gallery for schematics, layouts, renders, and photos.
- Load model-viewer and model files only after user activation; include camera reset, zoom/rotation, fullscreen, and static fallbacks.
- Create three explicitly labeled demo records: complete media, static 3D fallback, and partial data. All artwork is labeled schematic/photograph placeholder and has no engineering validity.

## Documentation and verification

- Document every metadata field, adding a record, asset conventions, validation, local preview, static deployment, and remaining group TODOs.
- Run lint, typecheck, board validation, unit tests, and production build. Build after major integration phases.
- Exercise browser navigation, URL restoration, combined filters, lightbox keyboard/focus behavior, model loading, missing media, 404, and desktop/mobile layouts.
- Record final checks and all created/modified files. Preserve the user's specification rename; do not commit or publish as part of this implementation.
