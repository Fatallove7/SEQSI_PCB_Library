# Adding or editing a PCB

1. Use **Sign In** in the normal Library navigation. Visitors can browse without an account.
2. Choose **Upload PCB**, then enter the real PCB ID, permanent URL slug, title, year, category and description. Leave unknown technical metadata blank.
3. Select files in the three sections:
   - **Schematic**: one PDF only.
   - **3D Render**: PNG, JPG/JPEG, WebP or PDF; multiple files supported.
   - **Physical Board**: the same image/PDF formats; multiple files and optional captions.
4. **Save Draft** stores private metadata/files. A failed upload can be retried without uploading successful groups again.
5. Optionally select **Primary cover** beside a saved 3D asset. The homepage/catalog uses only 3D assets; no 3D asset produces a neutral placeholder.
6. **Publish** makes this version public. Inspect schematic, render and physical-board PDFs inline or enlarge them; use **Open PDF** if rendering fails.

Use **Remove from draft** to remove an individual asset, or **Replace existing?** when selecting replacement files. Changes remain private until Publish. Files removed from the published selection are then cleaned up only when no draft/published reference remains. Retry Publish if the editor reports pending cleanup. Existing legacy source/model/layout files are retained unless explicitly removed or their whole board is permanently deleted.

Admins can use **Manage categories** to create a category (name, unique slug, optional description). Options refresh when returning to the editor. Used categories cannot be deleted: reassign all affected drafts and published versions first, including archived boards. Default categories follow the same rules as custom categories.

**Archive** hides a board while retaining files. An Admin can restore it as a private Draft. **Delete**, available on management rows and edit pages, permanently deletes the board and its assets after typed PCB-ID confirmation; it is separate from Archive.

## Legacy JSON imports

`src/data/boards/*.json` and `public/pcb/` remain migration fixtures. `npm run db:migrate` safely imports records not previously migrated and applies category initialization. Editing a seed JSON file does not overwrite its runtime record. Use existing persistent category IDs; the static nine-category list is an initial seed, not a live category management mechanism.

Old `thumbnail`, `schematic.images`, `layout`, `layoutPdfs`, `model3d.model`, downloads and source metadata remain readable for compatibility. The new public presentation uses `schematic.pdf`, `model3d.preview`/`model3d.renders` (image or PDF), optional `model3d.primary`, and `photos[].src` (image or PDF) with optional captions. The primary cover must reference a selected 3D asset. Existing downloads remain available; there are no new source/model upload controls.

Run `npm run validate:boards` for seed JSON/files and `npm run validate:runtime` for persisted boards, categories, asset ownership and checksums. See [README.md](../README.md) for environment, migration, startup and backup commands.
