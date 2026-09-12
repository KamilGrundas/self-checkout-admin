# Admin repository instructions

React, TypeScript, Vite, TanStack Router, Biome, and Playwright code lives in
`src/` and `tests/`. Read applicable parent instructions before editing, but
keep this repository portable: no host paths, domains, runtime choice, or VLM
provider brand belongs here.

Preserve existing changes and work on `main`. The normal workflow has no task
branches or pull requests. Commit, push, or deployment requires direct approval.
Do not hand-edit generated `src/client/**` or `src/routeTree.gen.ts`; use
their owner tools.

Run `npm run build`, non-mutating `npx biome check
--no-errors-on-unmatched --files-ignore-unknown=true ./`, and affected
Playwright tests. Browser URLs are supplied through `VITE_API_URL` and
`VITE_ML_API_URL`; examples use localhost or neutral placeholders, never
Compose-only service names for a browser build.

The UI refers to an OpenAI-compatible vision inference provider. Coordinate
API-client regeneration with backend contract changes.
