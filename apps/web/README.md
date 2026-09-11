# Xalians frontend

A Vite + React 18 frontend for Xalians, hosted on S3 at `xalians.com`.

## Scripts

- `npm run dev` (alias `npm start`) - starts the Vite dev server on port 3000.
- `npm run build` - creates the production build in `build/` and enforces the checked-in bundle budgets.
- `npm run build:styleguide` - creates a developer build that includes `/styleguide`; normal production builds omit that route and its component graph.
- `npm run check:bundle` - checks an existing production build against `bundle-budgets.json`.
- `npm run preview` - serves the built `build/` folder with `vite preview`.
- `npm test` - runs Vitest in watch mode; `npm test -- --run` for a single run; `npm test -- -t "name"` filters by test name.
- `npm run build-deploy` - build + `aws s3 sync build s3://xalians.com`.
- `npm run deploy` - deploys the existing `build/` folder without rebuilding.

The budget checker reads Vite's `build/.vite/manifest.json`, follows each route's static import graph, and measures both raw and gzip bytes. Initial CSS also includes the legacy stylesheets linked directly from `index.html`. Keep the approximately five-percent headroom intentional: update a threshold only alongside measured build evidence, and tighten it when modernization removes assets.

## Shared game data

Species, elements, moves, lore, and the other game data JSON live in the `@xalians/content`
workspace package (`packages/content/json` at the repo root), imported directly
(`import species from '@xalians/content/species.json'`). It is not copied into `apps/web/src`
anymore; edit the files under `packages/content/json` and the change is live for both this
app and `apps/api`.

`src/constants` and `src/gameplay` still contain a small set of files copied from
`apps/api/src` by the (currently unused) `copy-js` script; that copy goes away in a
follow-up PR that moves the shared rules code into its own workspace package.

## More

See `../CLAUDE.md` for the full project overview and `../docs/DESIGN_SYSTEM.md` for the visual design system.
