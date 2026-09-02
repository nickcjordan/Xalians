# Xalians frontend

A Vite + React 17 frontend for Xalians, hosted on S3 at `xalians.com`.

## Scripts

- `yarn dev` (alias `yarn start`) - copies JS and JSON from `../lambda/src`, then starts the Vite dev server on port 3000.
- `yarn build` - `vite build`, emits to `build/`.
- `yarn preview` - serves the built `build/` folder with `vite preview`.
- `yarn test` - runs Vitest in watch mode; `yarn test --run` for a single run; `yarn test -t "name"` filters by test name.
- `yarn copy-json` - re-syncs game data JSON from `../lambda/src/json` without starting the dev server.
- `yarn copy-js` - re-syncs the build-time JS copies from `../lambda/src`.
- `yarn build-deploy` - copy-json + build + `aws s3 sync build s3://xalians.com`.
- `yarn deploy` - deploys the existing `build/` folder without rebuilding.

## Build-time copies

`src/json`, `src/constants`, and `src/gameplay` are copies of files under `../lambda/src`, not imports across packages. Edit the source files in `../lambda/src`, then run `yarn copy-json` and/or `yarn copy-js` to re-sync. Edits made directly under these `src/` folders get overwritten on the next copy.

## More

See `../CLAUDE.md` for the full project overview and `../docs/DESIGN_SYSTEM.md` for the visual design system.
