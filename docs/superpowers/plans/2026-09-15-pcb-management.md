# PCB Management Implementation Plan

**Goal:** Add authenticated board management without changing anonymous public browsing or the approved public design.

**Architecture:** Server-rendered Next.js reads published snapshots from SQLite. An isolated storage adapter holds private files; all media requests enforce publication or administrator access. A single provisioned Admin uses encrypted cookie sessions. Processing state is persistent and the Altium processor is a separate interface with an honest unavailable implementation.

**Execution:** Use the subagent-development workflow for the independent authentication module and final review; implement shared persistence and UI in this workspace. Preserve the existing Task.md edits. Do not commit or deploy.

1. Add regression tests for draft isolation, uniqueness, optimistic concurrency, archive/restore/delete, and unsafe uploads; confirm failures before implementation.
2. Implement `src/lib/admin/storage.ts`, `repository.ts`, and `uploads.ts`: SQLite records and assets, private storage, migration, content/ZIP/path validation. Add processing interfaces and persistent reports.
3. Implement auth/session/permissions, login/logout routes, password provisioning, origin checks and login throttling. Test invalid credentials and role boundaries.
4. Switch public loaders to published snapshots, remove export-only routing, and protect `/pcb/` media while preserving URLs and public markup.
5. Add admin login/list/new/edit/archive pages, metadata editor, role-based operations, asset upload/replace controls, import preview and explicit publishing. Delete only archived records with a typed ID.
6. Update dependencies, environment example, migration/setup scripts, local/server documentation and browser-test server configuration.
7. Run lint, typecheck, board validation, unit tests, production build and browser checks; review security and public UI regression, fix findings, and document the unavailable proprietary Altium worker.

Success: anonymous visitors see only published snapshots and their selected assets; unauthorized/CSRF writes fail; manual edits persist across restart; all lifecycle operations work; invalid uploads fail safely; source-only imports never claim generated outputs.
