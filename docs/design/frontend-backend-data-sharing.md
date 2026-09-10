# Sharing data and rules between the frontend and the backend

Status: recommendation, 2026-09-10. Written for the lambda TypeScript refactor that is in flight, so that refactor lands on a layout the frontend can consume without copying.

## Context

Today the engine lives in `lambda/src/` as CommonJS and the site in `my-app/` as a Vite app. The site cannot import across the two trees, so three lambda folders (`json`, `gameplay`, `constants`) are copied into `my-app/src/` by a script that runs only when the dev server starts. The copies are committed. The production build does not run the copy, so what ships is the last committed copy, and nothing checks that it matches the source. The copied `gameplay` tree has already stopped being a mirror: the creature generator and the expedition rules were written into the frontend copy and have no lambda twin, while the duel rules exist in both and drift.

Three kinds of thing are being shared, and they want different treatment:

1. **Content.** Planet histories, glossary, encyclopedia, chronicle, tour, narration, the species records (templates with trait pools and appearance lists), the planet records, the ability catalog. Authored, versioned, public by nature: the Encyclopedia page displays all of it.
2. **Rules.** Pure functions with no IO: the creature generator, the duel rules, the expedition rules, the attack calculator, the derived-grade math. Both sides need them: the server to be the referee, the client for previews, validation before submit, and offline play.
3. **Secrets and authority.** Whatever must not be forgeable or predictable: the seed and the act of minting a creature, the token economy, persistence, signing, credentials.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The repo becomes a single npm workspace monorepo with `packages/content`, `packages/rules`, `apps/api`, `apps/web`; the lambda refactor targets `apps/api` | 85%: the refactor is already rewriting the lambda tree, so this is the cheapest moment to move it | `my-app/package.json` scripts `copy-json` and `copy-js`; `CLAUDE.md` "Game data JSON is duplicated by build step" |
| 2 | Content is imported at build time from `packages/content`, not fetched from S3 at runtime | 75%: CI already deploys site and API together on every merge, so a content change is a merge, and build-time import gives typed access and tree shaking; runtime fetch is a later option for the large catalog | `.github/workflows/ci.yml` deploys both on merge |
| 3 | The ability catalog (395 KB) and any similar bulk file are served as hashed static assets and fetched lazily by the page that needs them, still sourced from `packages/content` | 80%: bundling 400 KB into the main chunk hurts first paint for a file only the catalog view reads | `scripts/bundleAbilityCatalog.js` output size line |
| 4 | Species templates, trait percents, planet records and the catalog are public data; nothing in them needs hiding | 90%: the Encyclopedia already renders records and pools; balance data being readable is normal and datamined in every comparable game | `my-app/src/components/encyclopedia/SpeciesView.js` |
| 5 | Minting is server-only: the API draws the seed, runs the generator, persists the record, and returns it; the client never runs a mint it can keep | 95%: any client-side mint is forgeable; ownership across apps is the platform's core asset | `docs/design/xalians-platform-vision-and-economy.md` |
| 6 | The generator's code ships in `packages/rules` and is therefore readable on the client; secrecy lives in the seed and the persisted result, not in the code | 85%: the alternative (server-only generator code) removes client previews and the "what could this become" views for no security gain, since outcome forgery is blocked by persistence, not obscurity | `my-app/src/gameplay/generator/` |
| 7 | Duel and expedition rules move to `packages/rules` as pure TypeScript; the server becomes the authority when multiplayer lands, the client keeps the same functions for UI | 85%: the rules already re-derive legality from state and return `INVALID_MOVE`, which is exactly the shape a shared referee needs | `my-app/src/gameplay/duel/` "Rules are authoritative" in `CLAUDE.md` |
| 8 | `docs/species-templates/` and `docs/ability-catalog/` stay the authoring source; a build step in `packages/content` bundles them (today's `bundleLore.js` and `bundleAbilityCatalog.js`) and the bundle is committed with a checksum test that fails CI when the bundle is stale | 80%: keeps one source per data kind and makes the drift that happened this week impossible to merge | `scripts/bundleLore.js`; memory "one source per data kind" |
| 9 | Types are derived from the JSON with zod schemas in `packages/content`, and the same schemas validate the bundle in CI | 70%: zod gives runtime validation on the API boundary for free; alternatives (JSON Schema plus codegen) are heavier | none in repo yet |

## Recommendation

**Layout**

```
packages/content/      JSON bundles + zod schemas + a build that regenerates them from docs/
packages/rules/        pure TS: generator, duel, expedition, attack calculator, grade math
apps/api/              the lambda handlers (TypeScript), imports content and rules
apps/web/              the Vite site, imports content and rules
docs/species-templates, docs/ability-catalog   authoring source, unchanged
```

Both apps import `@xalians/content` and `@xalians/rules` as ordinary workspace dependencies. No copy scripts. The lambda bundle (esbuild) inlines both packages, so the deploy artifact does not change shape.

**What is public and what is not**

Public: every content file, every rule. The client can preview a duel move, compute a grade, render a template's pools, and show the catalog. None of this lets a player gain anything, because nothing the client computes is trusted.

Server-only: seeds and the mint endpoint; the persisted creature and its ownership; token issuance and balances; match results once multiplayer exists; credentials. The rule is "the client may know how the machine works; only the server may turn the crank."

**Why not S3-hosted JSON as the sharing mechanism**

S3 solves a different problem: updating content without redeploying. Here every content change is a commit, CI deploys site and API together, and typed build-time imports are strictly better for correctness. Keep S3/CloudFront for what it already does (hosting the built site) and for bulk assets (catalog, art) as hashed files. If content ever needs to change between deploys (live events, seasonal catalogs), add a versioned content endpoint then; the `packages/content` boundary makes that a swap, not a rewrite.

**Order of work**

1. In the lambda refactor: create the workspace, move the handlers to `apps/api`, and make `packages/rules` the home of whatever rules code the refactor touches first.
2. Create `packages/content`: move `lambda/src/json/*` there, point `bundleLore.js` and `bundleAbilityCatalog.js` at it, add the stale-bundle CI test.
3. Repoint the site's imports (about 56 files) at the two packages, delete `my-app/src/json`, `my-app/src/gameplay`, `my-app/src/constants` from git, delete the copy scripts.
4. Move the generator, duel and expedition rules from the site into `packages/rules`, converting to TypeScript as they move.

Steps 1 and 2 belong to the refactor agent. Step 3 is the fix for this week's drift and should follow step 2 immediately; it conflicts with any open branch that touches the copied trees, so it lands after those merge. Step 4 can be done module by module.

## What this changes for the creature system

Nothing in the records or rulings. `docs/species-templates/` remains the source; the bundle moves one folder. The validator's species.json path moves with it.
