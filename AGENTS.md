# Admin repository instructions

React 19, TypeScript, Vite, TanStack Router, Biome, and Playwright application. Main code is under `src/`; browser tests are under `tests/`; public assets are under `public/`.

Read the workspace `../AGENTS.md` first. Inspect Git with `git -C self-checkout-admin`; never edit directly on `main` or `master`, mix another repository into this commit, or commit `.env`, `node_modules`, `dist`, test reports, browser caches, or credentials.

Validation commands are `npm run build` (includes TypeScript checking), a non-mutating `npx biome check --no-errors-on-unmatched --files-ignore-unknown=true ./`, and `npm test` for Playwright. The configured `npm run lint` writes fixes, so use it only when formatting changes are intended. Do not hand-edit generated `src/client/**` or `src/routeTree.gen.ts`; regenerate them with their owning tools.

Docker and browser integration tests run only on remote dev. Synchronize with `../ops/dev-sync.sh --repo admin --dry-run`, then use `../ops/dev-test.sh --repo admin`. Do not claim completion unless required remote checks pass. Keep commits focused and use an imperative subject; generated API changes must be coordinated with the backend PR.

The temporary base branch is `dev` as recorded in `../repos.yaml`; the target base after the documented migration is `main`. Never implement directly on either branch. Use Conventional Commits with scopes such as `admin`, `ui`, `auth`, `products`, `checkout`, or `ml`.

Definition of Done: Biome check passes, TypeScript/Vite build passes, affected Playwright tests pass on remote dev, the integrated healthcheck passes, generated client changes are reproducible, user-facing behavior and translations are updated together, and the PR documents API/configuration impact and rollback.
