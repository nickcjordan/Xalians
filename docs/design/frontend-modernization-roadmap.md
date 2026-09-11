# Frontend modernization roadmap

Last updated: 2026-09-11

This is the durable execution record for the frontend modernization program. It records what is actually present on `main`, what each slice must prove, and the evidence needed before a slice can be called complete. A code change being merged is not sufficient when it affects the deployed frontend: the production deployment and focused production check must also pass.

## Status vocabulary

- **Planned**: validated as remaining work, but implementation has not started.
- **In progress**: a baseline exists and implementation or verification is underway.
- **Merged, awaiting production verification**: the PR is merged but deployment evidence is incomplete.
- **Complete**: acceptance criteria, CI, deployment where applicable, and production verification are recorded here.
- **Deferred by decision**: deliberately excluded, with the decision and revisit condition recorded below.

## Program rules

Every implementation slice follows this gate:

1. Rebase or branch from freshly fetched `origin/main` and record the starting SHA.
2. Measure the relevant baseline before editing.
3. Keep the slice reviewable and preserve unrelated work.
4. Add or update automated tests and enforcement appropriate to the change.
5. Run frontend typecheck, tests, `npm audit`, and the production build; run other workspace checks when the change crosses package boundaries.
6. Perform focused browser checks at desktop and narrow/mobile widths, including affected error, loading, empty, and authenticated/signed-out states.
7. Open a PR, monitor required CI, fix failures, and merge only after the checks pass.
8. Monitor the production workflow and verify the deployed behavior.
9. Add the PR, workflow, production, measurements, and any follow-up decision to this file before marking the slice complete.

## Current baseline

- Audit point: `origin/main` at `984921bfc91e5ac2c6b7ed229314c315f1b2922f` (freshly fetched 2026-09-11).
- Existing modernization foundations:
  - [PR #216, Reduce the initial frontend bundle](https://github.com/nickcjordan/Xalians/pull/216), merged as `92aa1be`; [production deployment](https://github.com/nickcjordan/Xalians/actions/runs/34602913431) succeeded.
  - [PR #219, Modernize frontend data and runtime boundaries](https://github.com/nickcjordan/Xalians/pull/219), merged as `fe81e0c`; [frontend production deployment](https://github.com/nickcjordan/Xalians/actions/runs/34606433921) and [backend deployment](https://github.com/nickcjordan/Xalians/actions/runs/34606434133) succeeded.
- Verification on the audit point:
  - `npm ci`: pass; 884 packages installed, 0 vulnerabilities reported by install audit.
  - `npm audit --omit=dev`: 0 total vulnerabilities.
  - `npm run typecheck -w apps/web`: pass.
  - `npm test -w apps/web -- --run --passWithNoTests`: 50 files and 1,016 tests passed.
  - `npm run build -w apps/web`: pass; 3,764 modules transformed in 8.18 seconds.
  - Initial application JavaScript: 425.92 kB raw / 106.43 kB gzip. Auth vendor: 125.13 kB / 35.96 kB gzip.
  - Largest route chunks: styleguide 517.22 kB / 147.58 kB gzip; Reclamation 220.04 kB / 68.80 kB; Long Return 216.14 kB / 61.06 kB; Duel 214.09 kB / 68.17 kB.
  - Global built CSS: 206.72 kB / 34.19 kB gzip. Long Return route CSS: 164.22 kB / 28.32 kB gzip.
  - Seven legacy stylesheets totaling 416,348 source bytes are linked globally from `index.html`, including route-specific Duel, Reclamation, and Duel-reference CSS.

## Workstreams

### 1. GitHub Actions Node runtime warnings — Complete

**Scope**

Upgrade JavaScript actions whose current majors target Node 20. Keep the application build on its intentionally selected Node version; the warning concerns action runtimes, not `node-version`.

**Measured baseline**

PR #219's three check jobs each emitted a GitHub warning annotation. Affected actions were `actions/checkout@v4`, `actions/setup-node@v4`, `aws-actions/configure-aws-credentials@v4`, and `hashicorp/setup-terraform@v3`. The frontend deploy log also emitted the same warnings for checkout, setup-node, AWS credential setup, and post steps.

**Acceptance criteria**

- All first-party and vendor JavaScript actions use supported Node 24 majors.
- Workflow behavior, OIDC permissions, npm caching, Terraform plan/apply, S3 sync, and CloudFront invalidation remain unchanged.
- CI and both deploy workflows contain no Node 20 action-runtime warning annotation after the change reaches `main`.

**Dependencies**

None. This is first because every later PR benefits from clean workflow output.

**Evidence / links**

- Official current action releases checked 2026-09-11: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0), [configure-aws-credentials v6.2.4](https://github.com/aws-actions/configure-aws-credentials/releases/tag/v6.2.4), [setup-terraform v4.0.1](https://github.com/hashicorp/setup-terraform/releases/tag/v4.0.1).
- PR: [#221, Start frontend roadmap and update action runtimes](https://github.com/nickcjordan/Xalians/pull/221), merged as `90ee054` on 2026-09-11.
- CI: [CI run 34608607248](https://github.com/nickcjordan/Xalians/actions/runs/34608607248) and [Terraform-plan run 34608607178](https://github.com/nickcjordan/Xalians/actions/runs/34608607178) passed. All three job-annotation responses were empty, replacing the warning present on PR #219.
- Deploy: [frontend run 34608744209](https://github.com/nickcjordan/Xalians/actions/runs/34608744209) and [backend run 34608744217](https://github.com/nickcjordan/Xalians/actions/runs/34608744217) passed with checkout v7, setup-node v7, AWS credentials v6, and Terraform setup v4. Both production job-annotation responses were empty.
- Production verification: `https://xalians.com/` and `/duel` loaded at 1,440×900 and 390×844 with no page/console errors or document-level horizontal overflow. Home and Duel setup paints matched the pre-change smoke check.

### 2. Legacy CSS ownership and route boundaries — Planned

**Scope**

Inventory every selector and consumer in `public/assets/css/legacy`, split genuinely shared immersive foundations from route-owned rules, and stop loading Duel, Reclamation, Duel reference, and other page CSS on unrelated routes. Replace obsolete page-wide/template leakage with component or route ownership. Do not flatten the site's distinct terminal treatments into a generic theme.

**Measured baseline**

`index.html` links all seven legacy files on every route: `tokens.css` (3,189 B), `system.css` (108,853 B), `style.css` (84,843 B), `duel.css` (46,022 B), `reclamation.css` (142,092 B), `duel-playground.css` (28,733 B), and `typeColors.css` (2,616 B). Total: 416,348 source bytes before minification. Long Return already owns seven colocated CSS modules but still receives the global legacy layer.

**Acceptance criteria**

- A checked-in ownership inventory maps each remaining stylesheet to routes/components and a removal plan.
- Route-only styles load only with their route; no unrelated page receives Duel, Reclamation, Long Return, or developer-reference rules.
- Global CSS is limited to documented resets, tokens, and truly cross-route primitives.
- Automated guards prevent new global route leakage and preserve token/design-system constraints.
- Desktop and mobile visual checks cover home, generator, account, encyclopedia, training, Duel setup/board, Reclamation, Long Return, and developer routes affected by the slice.

**Dependencies**

Do before the font pass so font consumers can be attributed to their final CSS owners. May require multiple route-sized PRs.

**Evidence / links**

Pending.

### 3. Font loading — Planned

**Scope**

Map actual face/weight/style use after CSS ownership is clear; consolidate requests, remove unreferenced families and weights, add appropriate connection/loading hints, and retain the authored v3 terminal voices plus the v4 Saira/Atkinson/Martian/Iceland system where still used.

**Measured baseline**

`index.html` issues four Google Fonts stylesheet requests representing 18 families and approximately 35 requested face/style variants. It includes a standalone Abel request, broad legacy terminal families, and the v4 family request. Only `fonts.gstatic.com` is preconnected; `fonts.googleapis.com` is not. `ProcrastinatingPixie-WyVOO.ttf` exists twice in the built public tree (10,144 B each), while the `@font-face` in legacy `style.css` resolves only the copy under `assets/css/fonts`.

**Acceptance criteria**

- A checked-in audit maps every retained family and requested weight/style to a live selector and route.
- Unused families, weights, duplicate files, and redundant requests are removed.
- Loading avoids render-blocking duplication and uses an explicit fallback/display strategy without unacceptable layout shift.
- The visual identity of each retained terminal and the v4 chrome tier is preserved at desktop and mobile widths.

**Dependencies**

Legacy CSS ownership audit.

**Evidence / links**

Pending.

### 4. Cognito authentication integration coverage — Planned

**Scope**

Test the UI-to-Amplify/API boundary, not Cognito itself. Cover sign-in success, invalid credentials and service errors, signed-out account behavior, token propagation for protected calls, modal transitions, and anonymous generation/showroom behavior.

**Measured baseline**

There are unit tests for `authUtil`, `dbApi`, and `AuthButtonGroup`, all with mocked Amplify functions. There is no route-level integration harness that exercises authentication state through the navbar/account/generator surfaces together, and no browser-level Cognito contract test.

**Acceptance criteria**

- Deterministic integration tests exercise signed-out, signed-in, unverified, expired/absent-session, invalid-credential, and generic service-error states.
- Anonymous generation is proven not to send an authorization header where the API contract is anonymous.
- Signed-out account navigation produces an intentional recoverable UI, not a blank or unhandled error.
- Production smoke verification uses non-destructive paths; no real account credentials are stored in the repository or CI logs.

**Dependencies**

Prefer after route modernization if test helpers would otherwise be rewritten twice; utility-level gaps may land earlier.

**Evidence / links**

Pending.

### 5. React Router modernization — Planned

**Scope**

Move from React Router DOM 5 to the current supported router API, replacing `Switch`, `Redirect`, `useHistory`, render/component route props, and the untyped local module shim. Preserve legacy redirects, URL/hash behavior, nested encyclopedia paths, direct deep links, and the catch-all page.

**Measured baseline**

Installed `react-router-dom` is 5.3.4; current upstream is 7.18.3. Routing is centralized in `App.js` with nested v5 routing in `encyclopediaPage.js`; several encyclopedia components call `useHistory`. `src/types/react-router-dom.d.ts` declares the whole package as untyped.

**Acceptance criteria**

- No v5-only APIs or blanket module declaration remain.
- Route definitions are declarative, typed where touched, and preserve every current canonical and legacy URL.
- Navigation tests cover redirects, deep links, nested encyclopedia routes, unknown routes, query strings, and hashes.
- Browser back/forward and direct-load checks pass on desktop and mobile.

**Dependencies**

Coordinate with CSS route loading so both changes agree on route boundaries. Keep separate from React 19/Redux changes for reviewability.

**Evidence / links**

Pending.

### 6. Redux Toolkit and React runtime — Planned

**Scope**

Audit whether the small store still warrants Redux, then either simplify it or upgrade deliberately. Evaluate React 19 separately against boardgame.io, GSAP, Radix, Testing Library, and the app's class components. Do not upgrade merely to make `npm outdated` empty.

**Measured baseline**

Runtime versions are React/React DOM 18.3.1, Redux Toolkit 1.9.7, React Redux 8.1.3. Current upstream majors are React 19.3.0, Redux Toolkit 2.12.0, and React Redux 9.3.0. The store currently contains counter and Duel animation queue concerns. Production dependency audit is clean.

**Acceptance criteria**

- A written compatibility decision explains retain/remove/upgrade choices and known breaking changes.
- Strict-mode behavior, store setup, selectors, middleware, Duel animation flow, error boundaries, and hydration/root setup are covered.
- No deprecated React or Redux API remains in code touched by the chosen upgrade.
- Production behavior and performance do not regress across the primary routes and Duel.

**Dependencies**

Router modernization and authentication integration coverage, which provide stronger regression protection.

**Evidence / links**

Pending.

### 7. Developer-only styleguide and enforceable bundle budgets — Planned

**Scope**

Keep developer references out of player-facing production graphs where practical and introduce reproducible JavaScript/CSS budgets checked in CI. Treat large game routes individually rather than hiding them behind one aggregate threshold.

**Measured baseline**

PR #216 made `StyleGuidePage` lazy, so it is absent from the initial execution path, but the production build still emits a 517.22 kB raw / 147.58 kB gzip styleguide chunk and exposes `/styleguide`. There is no checked-in bundle-budget command or CI budget gate. The largest player route chunks are 214–220 kB raw; globally built CSS is 206.72 kB raw and Long Return CSS is 164.22 kB raw.

**Acceptance criteria**

- Production builds do not emit the styleguide implementation unless an explicit developer-build flag enables it; the production URL has an intentional outcome.
- A deterministic manifest-based check enforces initial JS/CSS, auth vendor, and per-route budgets with documented rationale and limited tolerance.
- CI runs the budget check after a production build and prints actionable failures.
- Budgets start from measured main-branch output and are tightened when later slices reduce assets.

**Dependencies**

Can land early, but budget values must be revised after CSS/font/router/runtime slices. Developer-route handling should align with the router slice.

**Evidence / links**

Pending.

### 8. Final cross-route regression pass — Planned

**Scope**

Run the final accessibility, responsive, performance, and production regression matrix after all implementation slices. Duel is explicitly in scope, including setup, board, overlays, turn actions, completion, and narrow viewports.

**Acceptance criteria**

- Route matrix covers home, generator, account/user, encyclopedia sections and records, training routes, Duel setup/board/reference, Reclamation, Long Return, not-found, and relevant error/loading states.
- Keyboard order, focus visibility/restoration, names/labels, dialog semantics, reduced motion, color contrast, overflow, and touch targets are checked.
- Responsive checks cover at least 390 px and 1,440 px plus a Duel-specific intermediate width.
- Production performance evidence records route asset transfer, console/network errors, and meaningful before/after metrics under consistent conditions.
- All regressions found are fixed or explicitly recorded with severity, owner, and follow-up.

**Dependencies**

All preceding workstreams.

**Evidence / links**

Pending.

## Decisions

| Date | Decision | Reason / revisit condition |
|---|---|---|
| 2026-09-11 | Treat PRs #216 and #219 as completed foundations, not work to recreate. | Both are merged, deployed, and present on the audited `main` SHA. |
| 2026-09-11 | Keep application builds on Node 22 while upgrading action runtime majors. | GitHub's warning concerns the Node runtime bundled by each action. Changing the app runtime in the same slice would add unrelated risk. |
| 2026-09-11 | Preserve distinct terminal typography until actual selectors and routes are audited. | Visual character is a product constraint; request-count reduction alone does not justify flattening it. |
| 2026-09-11 | Separate router modernization from React/Redux modernization. | Each has independent breaking APIs and deserves isolated regression evidence. |
| 2026-09-11 | Frackworm is ratified and live. The earlier species-art replacement concern applies to Tetrahive, not Avili/Avilily. | Prevent stale art assumptions from entering frontend regression work. |

## Change log

| Date | Change | Evidence |
|---|---|---|
| 2026-09-11 | Reanalyzed current `origin/main`, established the program baseline, and selected the workflow runtime warning cleanup as the first slice. | Commands and measurements recorded above; implementation pending. |
| 2026-09-11 | Completed the action-runtime slice. | [PR #221](https://github.com/nickcjordan/Xalians/pull/221); clean CI/deploy annotations and live desktop/mobile smoke evidence recorded in workstream 1. |
