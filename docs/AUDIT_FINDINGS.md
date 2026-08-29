# Site Audit Findings (2026-08-29)

A full polish audit of the frontend, duel game, and lambda backend. Items marked **FIXED (PR #1)** were addressed on the `polish/bug-fixes` branch (https://github.com/nickcjordan/Xalians/pull/1). Everything else is **OPEN** and captured here to work through later.

---

## 1. Fixed in PR #1

### Navbar (the originally reported bug)
- Planet story modal dispatched `hide-navbar` on open; no `show-navbar` dispatch existed anywhere, so the navbar vanished permanently after reading any story. **FIXED** — `planetTable.js` restores it on every close path.
- The scroll hide/show listener was registered inside a `DOMContentLoaded` handler that had already fired before React mounted, so it never attached. **FIXED** — attached directly in `componentDidMount`, always visible near page top, cleaned up on unmount.

### API/async root cause
- `dbApi.js`, `xalianApi.js`, and `authUtil.js` wrapped calls in `new Promise((resolve) => ...)` with no `reject` — any failure hung forever; every caller `.catch` was dead code. Symptoms: permanent black preloader on `/account` and `/user/:id`, delete button spinning forever, generator button going dead. **FIXED** — real promise chains that reject.
- Debug `alert("BOOOOO...")` popups shown to users on API errors. **FIXED** — removed.
- `callGetBatch` ignored its `ids` argument entirely; unused. **FIXED** — removed.
- `signRequest`'s query-param path hard-coded the param name `ids` and passed a raw string as axios params (signature mismatch if ever used). **FIXED** — removed the inert path.

### Auth flow dead-ends
- Wrong verification code → infinite spinner, no way forward. **FIXED** — error message shown.
- "Send another verification code" closed the modal and attempted sign-in, losing the code form. **FIXED** — stays on form, confirms send.
- Wrong password on sign-in → blank modal. **FIXED** — error message shown.
- Sign-up failures other than `UsernameExistsException` showed nothing. **FIXED** — password/general errors shown.
- Sign-out failure left the app believing you're logged in with no feedback. **FIXED** (rejects properly now).

### Pages
- `/account`: permanent black `#preloader` when logged out or on API error; delete spliced state in place inside `forEach` and never updated `state.xalians`. **FIXED**.
- `/train`: switch button needed two clicks first time, then was stuck on game 1 forever (`change()` hard-coded index 1). **FIXED** — cycles.
- `/species/:id`: unknown or non-zero-padded ids rendered a fully blank page with no navbar. **FIXED** — pads short ids, shows a not-found page.
- `/generator`: no `.catch` on generate (dead button + stuck smoke overlay on failure); save was a write-ordering race (`callCreateXalian` fire-and-forget in parallel with the user PATCH — user record could reference a xalian that was never created); fade animations targeted `#generated-xalian-div` which doesn't exist (element is `#generated-xalian-fragment`). **ALL FIXED**.
- `/user/:id`: `username || userId + "'s Xalian Faction"` — precedence bug dropped the suffix when username existed; raw JSON error message. **FIXED**.
- `/planets`: sorted into `sortedPlanets` but iterated the unsorted `planets` (worked only because sort mutates in place). **FIXED**.
- Delete-xalian modal title: `{this.getXalianName}` missing `()` — rendered nothing plus a React error. **FIXED**.
- Smoke effect (`smokeEffectBackground.js`): hotlinked a dead 2012 blog image over plain `http://` (mixed-content blocked → no particles ever drew); `setInterval` never cleared (accumulated across mounts); canvas had no width/height while the draw code assumed 400×400. **ALL FIXED** — uses local `/assets/img/elements/smoke_particle.png`.
- Stat chart (`xalianStatChart.js`): read `stat.maxPoints` / `stat.initialPointAllocationPercentage`, fields that don't exist on stored xalians → "NaN potential points". **FIXED** — uses `STAT_POINT_MAX` and `stat.percentage`.
- `public/index.html` loaded `constants/constants.js`, a file that doesn't exist under `public/` — a 404 on every page load, path varying by route. **FIXED** — removed.
- `style.css`: `#tsparticles { background-image: url("") }` made the browser refetch the page HTML as an image on every load; `.planet-xalia-section` referenced a missing `eclipse_background.jpg`. **FIXED** — removed both.
- `splashGalaxyBackground.js` used a relative stars-background URL (would 404 on nested routes). **FIXED** — absolute path.
- `authButtonGroup.js` render contained a dead loop calling `this.buildMoveRow`, a method that doesn't exist (latent navbar crash if a `stats` prop were ever passed). **FIXED** — removed.

### Duel game
- Bot attack/combo candidate lists sorted **ascending** then truncated to 10 — the bot kept its ten worst options. **FIXED** — descending.
- Flag-carrier row bonus had an inverted sign — rewarded carrying the flag *away* from the goal. **FIXED**.
- `activeXalianIds.includes[...]` (property access, always undefined) instead of `.includes(...)` in the guarded-flag checks. **FIXED**.
- Progress-toward-flag guard read `action.endIndex` (undefined; correct is `action.path.endIndex`) — flag-grab moves were double-counted. **FIXED**.
- Board cell 0 treated as falsy in `duelUtil.xalianHasValidActionAvailable` (turn-end misfires) and `duelBoardCell` hover-attack indicators. **FIXED** in both.
- `doAttack` decremented attacker stamina before the attacker/defender null guard (crash path + whiffed attacks costing stamina). **FIXED** — moved inside guard.
- `boardStateManager.getAllMoveActionsFromLog` filtered before its null check (crash on undefined log before first sync). **FIXED**.
- Hot-seat winner text was always from player 0's perspective — player 1's client said "You Lose!" on a win. **FIXED** — uses own `playerID`.
- `duelPage.render()` shuffled and popped the **shared imported `xalianSamples.json` array** — with StrictMode double-render, a 6v6 game consumed 24 of 25 samples; later games/renders built near-empty teams and could instantly end. **FIXED** — copies the array.

### Lambda backend
- **Generator purity**: `selectSpecies` returned a reference into the shared `species.json` module array and `populateStats`/`xalianBuilder` wrote onto it — on a warm lambda, the 2nd+ generation of a species inherited the 1st one's rolled stat ratings. **FIXED** — deep-copies; verified 50 generations leave the module untouched.
- Rating budget: `getHighestPossibleRatingValue` returned an uncapped leftover (6–12) for the last stat in a category, which `pickStatisticalRandomRating` didn't recognize → deterministically Very Low. **FIXED** — capped at VERY_HIGH.
- CRUD handlers (`xalianTableCRUDLambdas.js`, `userTableCRUDLambdas.js`): `err` vs `error` typos threw `ReferenceError` inside every error path (invocation hung → 502/504 instead of a 500 body); error responses passed as the callback's *first* argument (also 502); missing `return` after BAD_REQUEST responses; `event.queryStringParameters` and `JSON.parse(event.body)` dereferenced unguarded. **ALL FIXED**.
- `updateXalianUser` didn't lowercase `userId` while records are stored lowercased → `USER_NOT_FOUND` on valid users (e.g. mixed-case usernames). **FIXED**.
- `userDbDelegate.updateUserAttributes`: `attributes` is a DynamoDB **reserved word** — `ADD_TOKENS`/`REMOVE_TOKENS` always failed with `ValidationException`. **FIXED** — expression attribute name. Also guarded rows without an `attributes` map.
- `GET /db/xalians` was wired in `main.tf` to `retrieveXalianBatch`, a handler that didn't exist (guaranteed 502). **FIXED** — exported (same comma-separated-id behavior as `retrieveXalian`).
- `uuid` required by `xalianBuilder.js` but undeclared in any package.json. **FIXED** — declared at root.

---

## 2. Open items — MIGRATED TO GITHUB ISSUES (2026-08-29)

Every open item formerly listed here now lives in the repo's GitHub Issues backlog (see `docs/BACKLOG.md` for the ticketing standards). This section is no longer maintained. Notable closures since the audit, for the record:

- Backend CI/CD, remote terraform state, nodejs20.x runtimes, real lambda packaging, committed aws-exports.js — **fixed** (PR #2/#3).
- Unauthenticated `POST /db/xalian/unauth` route — **deleted** from the live API (approved 2026-08-29).
- `debug.xalians.com` domain and the three orphaned `chronic-labs-*` buckets — **deleted** (2026-08-29 tidy-up); the extra `prod`/`test` mappings on api.xalians.com remain **intentionally** (the frontend uses `/prod` URLs).
- Duel squads from mock JSON — **fixed** (PR #5: real Xalian squads + squad picker; also fixed the broken ADD_XALIAN_ID lambda path).
- Dual-type effectiveness, STAB, per-move combat — **implemented** (PR #7).

## 3. Hidden / unexposed features (built, not reachable — do NOT treat as dead code)

| Feature | Entry point | Notes |
|---|---|---|
| Duel game | `/duel` route → `duelStartPage.js` | Playable vs bot; no nav link |
| Training Grounds hub | `/train` → `trainingGroundsPage.js` | Hosts the two mini-games; no nav link |
| Xalian Match card game | `/train/match` → `matchCardGamePage.js` | Also embedded in Training Grounds |
| Physics game | `/train/physics` → `physicsGamePage.js` | Also embedded in Training Grounds |
| Public user faction page | `/user/:id` → `userDetailsPage.js` | Nothing links to it |
| Token economy endpoints | `ADD_TOKENS`/`REMOVE_TOKENS` in `userTableCRUDLambdas.js` | Includes insufficient-funds path; no client calls them (now functional after the reserved-word fix) |
| STAB damage bonus | `duelCalculator.calculateSameTypeAttackBonus` | Implemented (1.5×, moves-in-combat milestone) |
| Redux animation queue | `store/duelAnimationQueueSlice.js`, `AnimationHub.js` | Fully built; duel uses gsap timeline instead |
| Move-then-attack combo move | `duel.js` `movePieceThenAttack` | Commented out; bot executes combos as bare moves |
| `selectPiece` move + selection state | `duel.js` | Defined but registered in no phase |
| Duel animation Hub channel | `duelBoard.setupAnimationHub` | Listener never wired; dispatch side commented out in `duelBotInstance` |
| Cached-response dev mode | `dbApi.js` `REACT_APP_USE_CACHE === 'true'` | Env-flag only |
| Generation batch statistics | `ai.giveSummary` + `start.js` `runSet`/`runSummary`/`printXalian` | Complete; `start.js` currently hardwired to `simulateAttacks()` |
| Spaceship computer-screen narrative UI | `components/animations/computerScreenContent.js` + dormant handlers in `home.js` | Broken imports (deleted SVGs) — restore assets before reviving |
| Species designer suggestion components | `designerSuggestionRow.js`, `speciesDesignerSizeSelector.js` | Broken imports (deleted `json/designer` corpora) — restore data before reviving |
| Themed scene container / fade helpers / game-finished modal / generated-stat chart variant | `components/…` | Built, unimported |

---

## 4. Corrections to earlier assumptions (verified, do not "fix")

- The frontend's `https://api.xalians.com/prod/db/...` URLs are **correct** — the live API serves both root and `/prod` mappings (verified by curl: unknown paths return "Not Found", these return auth errors). Do not strip the `/prod` prefix.
- `my-app/src/{json,constants,gameplay/attackCalculator.js}` are build-time copies from `lambda/src` (`copy-json`/`copy-js` npm scripts) — edit the `lambda/` versions. `my-app/src/gameplay/duel/` is **not** copied and is edited in place.
