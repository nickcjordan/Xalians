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

### 2. Legacy CSS ownership and route boundaries — In progress

**Scope**

Inventory every selector and consumer in the legacy CSS layer, split genuinely shared immersive foundations from route-owned rules, and stop loading Duel, Reclamation, Duel reference, and other page CSS on unrelated routes. Replace obsolete page-wide/template leakage with component or route ownership. Do not flatten the site's distinct terminal treatments into a generic theme.

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

- Ownership inventory: [`docs/design/frontend-css-ownership.md`](frontend-css-ownership.md) records every stylesheet, consumers, boundary, disposition, and remaining audit order.
- First boundary measurement: moving Duel, Duel reference, and Reclamation CSS out of `index.html` reduced initial stylesheet transfer from 623.1 kB raw / 126.0 kB gzip to 406.3 kB / 80.1 kB. Their 216,847 source bytes now emit only in the relevant route graphs: Duel 21.9 kB / 4.3 kB gzip, Duel reference 33.1 kB / 6.7 kB, and Reclamation 97.2 kB / 14.8 kB.
- First boundary verification: ownership/design-system tests pass; production build and tightened initial/route CSS budgets pass; local desktop/mobile smoke covers home, Duel setup, a 64-cell live Duel board, Duel reference, and Reclamation without console errors. Duel-reference document overflow at 390 px was reproduced on the deployed pre-change baseline and remains a known responsive-pass issue, not a regression from the boundary move.
- First boundary PR: [#226, Move immersive CSS behind route boundaries](https://github.com/nickcjordan/Xalians/pull/226), merged as `6cdd7ea` on 2026-09-11.
- First boundary CI: [CI run 34610550137](https://github.com/nickcjordan/Xalians/actions/runs/34610550137) and [Terraform-plan run 34610550194](https://github.com/nickcjordan/Xalians/actions/runs/34610550194) passed; all job-annotation responses were empty. The Linux bundle gate measured initial stylesheets at 398.7 kB raw / 79.7 kB gzip and the route CSS budgets passed.
- First boundary deploy: [frontend run 34610725724](https://github.com/nickcjordan/Xalians/actions/runs/34610725724) passed the production bundle gate, S3 sync, and CloudFront invalidation with an empty job-annotation response.
- First boundary production verification: `https://xalians.com/`, `/duel`, `/duel/reference`, and `/reclamation` loaded at 1,440×900 and 390×844 with no page/console errors. Home, Duel setup, a started 64-cell Duel board, and Reclamation had no document-level overflow and matched the reviewed local paint. Duel reference retained its pre-existing 526 px document width at the 390 px viewport; it is reserved for the responsive regression pass rather than attributed to this CSS boundary.
- Second boundary local measurement: the final four globally linked compatibility files moved into one Vite-managed `immersive.css` graph used only by the remaining game entries. Initial CSS fell from the first slice's deployed 398.7 kB raw / 79.7 kB gzip to 206.9 kB / 34.0 kB (48.1% raw and 57.3% gzip reduction). Vite minifies the 199,501 source-byte compatibility layer to a shared 108.8 kB / 21.2 kB route asset. Duel setup additionally lazy-loads the live board, cutting its route JavaScript from 1,505.7 kB / 451.6 kB gzip to 756.2 kB / 196.7 kB and leaving setup with no legacy CSS.
- Second boundary local verification: focused ownership, design-system, token, and bundle tests pass; production build and tightened initial, game-route, and nested Duel-board budgets pass. Desktop/mobile browser smoke covers home, generator, signed-out account, encyclopedia, training lobby and both direct games, Duel setup/reference and a started 64-cell board, Reclamation, Long Return, and production-mode styleguide not-found with no page/console errors. Only the already recorded Duel-reference phone overflow remains.
- Second boundary PR: [#229, Load compatibility CSS only for immersive games](https://github.com/nickcjordan/Xalians/pull/229), merged as `ef513f9` on 2026-09-11.
- Second boundary CI: [CI run 34612585182](https://github.com/nickcjordan/Xalians/actions/runs/34612585182) and [Terraform-plan run 34612584660](https://github.com/nickcjordan/Xalians/actions/runs/34612584660) passed; 52 frontend files / 1,027 tests and 12 content files / 37 tests passed, all production bundle budgets passed, and all three job-annotation responses were empty.
- Second boundary deploy: [frontend run 34612789013](https://github.com/nickcjordan/Xalians/actions/runs/34612789013) passed its production build, S3 sync, and CloudFront invalidation with an empty job-annotation response. The Linux production gate measured initial CSS at 207.1 kB raw / 34.1 kB gzip, Duel setup CSS at zero, and the nested board CSS at 130.6 kB / 25.3 kB gzip.
- Second boundary production verification: `https://xalians.com/`, `/generator`, `/account`, `/train`, `/duel`, `/duel/reference`, `/reclamation`, and `/long-return` loaded at 1,440×900 and 390×844 without page/console errors. A started Duel rendered all 64 board cells without document-level overflow at either width. Representative home, Reclamation, and Duel-overlay paints matched the reviewed local build. The pre-existing 526 px Duel-reference phone width remains the sole known overflow and is reserved for the responsive pass.
- First selector-audit local measurement: a source-string inventory found 335 distinct class/id names in legacy `style.css`, 291 without an exact literal application-source reference. The conservative first cut deletes only retired, contiguous template sections with no executable consumer, reducing `style.css` from 84,843 to 53,699 source bytes. It also removes two unused 10,144-byte font copies and their dead `@font-face`, plus the uniquely referenced 299,629-byte vault image. Shared built immersive CSS falls from 108.8 kB / 21.2 kB gzip to 91.2 kB / 17.9 kB, and all affected route budgets are tightened.
- First selector-audit local verification: typecheck, 52 files / 1,028 tests, zero production vulnerabilities, production build, and all tightened budgets pass. Desktop/mobile smoke covers Training, Match, Physics, Duel setup/reference, a started 64-cell Duel board, Reclamation, and Long Return without page/console errors or new overflow; representative before/after paints are unchanged.
- First selector-audit PR: [#230, Remove retired frontend template styles](https://github.com/nickcjordan/Xalians/pull/230), merged as `9394d49` on 2026-09-11.
- First selector-audit CI: [CI run 34614031727](https://github.com/nickcjordan/Xalians/actions/runs/34614031727) and [Terraform-plan run 34614031618](https://github.com/nickcjordan/Xalians/actions/runs/34614031618) passed; all three job-annotation responses were empty and the Linux bundle measurements matched the local evidence.
- First selector-audit deploy: [frontend run 34614190720](https://github.com/nickcjordan/Xalians/actions/runs/34614190720) passed its build, S3 sync, and CloudFront invalidation with an empty job-annotation response. The deployed build emitted the shared immersive asset at 91.19 kB raw / 17.93 kB gzip and passed every tightened route budget.
- First selector-audit production verification: `https://xalians.com/train`, `/train/match`, `/train/physics`, `/duel`, `/duel/reference`, `/reclamation`, and `/long-return` loaded at 1,440×900 and 390×844 without page/console errors. A started Duel rendered all 64 board cells without overflow at both widths. Paints remained correct; the previously tracked Duel-reference phone overflow is unchanged.
- Second selector-audit local measurement: the live Match, training-container, and Physics rules move into a 2,325-byte training-owned stylesheet; dead adjacent helpers are deleted. Shared immersive CSS falls from 91.19/17.93 kB to 88.98/17.56 kB raw/gzip, while the complete training CSS graph remains slightly smaller at 90.7/18.1 kB. Removing unused imports also cuts Physics route JavaScript from 237.2/94.3 kB to 224.2/90.7 kB and the nested Duel graph from 751.7/256.2 kB to 749.3/255.0 kB. Affected CSS and Physics JavaScript budgets are tightened.
- Second selector-audit local verification: focused ownership/bundle tests, typecheck, production build, and all tightened budgets pass. Desktop/mobile smoke covers Training, Match, Physics, Duel setup/reference, a started 64-cell Duel, Reclamation, and Long Return without page/console errors or new overflow. Physics, Reclamation, and Long Return screenshots are byte-identical before/after; animated Match and Duel reference paints are visually unchanged.
- Second selector-audit PR: [#231, Isolate training game styles](https://github.com/nickcjordan/Xalians/pull/231), merged as `82f6b9d` on 2026-09-11.
- Second selector-audit CI: [CI run 34615063084](https://github.com/nickcjordan/Xalians/actions/runs/34615063084) and [Terraform-plan run 34615063210](https://github.com/nickcjordan/Xalians/actions/runs/34615063210) passed; all three job-annotation responses were empty and the Linux bundle measurements matched the local evidence.
- Second selector-audit deploy: [frontend run 34615206142](https://github.com/nickcjordan/Xalians/actions/runs/34615206142) passed its production build, S3 sync, and CloudFront invalidation with an empty job-annotation response. The deployed build emitted the shared immersive asset at 88.98 kB raw / 17.56 kB gzip and the training asset at 1.74 kB / 0.62 kB.
- Second selector-audit production verification: `https://xalians.com/train`, `/train/match`, `/train/physics`, `/duel`, `/duel/reference`, `/reclamation`, and `/long-return` loaded at 1,440×900 and 390×844 without page/console errors. A started Duel rendered all 64 board cells without overflow at both widths. Paints remained correct; the previously tracked Duel-reference phone overflow is unchanged.
- Third selector-audit local measurement: all 42 selectors in the 2,616-byte `typeColors.css` are unused. The only constructed `<element>-color` class was inert because the Duel badge's inline `background` shorthand always supplied its paint. Removing that class, the stylesheet, two unused badge imports, and an orphaned compatibility override reduces the shared immersive asset from 88.98/17.56 kB to 86.84/17.28 kB raw/gzip; the complete training CSS graph becomes 88.58/17.90 kB. Affected raw CSS budgets are tightened around the measured output.
- Third selector-audit local verification: focused ownership/token tests, typecheck, 52 files / 1,029 tests, zero production vulnerabilities, production build, and all tightened budgets pass. Desktop/mobile smoke covers Training, Match, Physics, Duel setup/reference, Reclamation, and Long Return without page/console errors or new overflow. A started Duel renders 64 cells and eight painted type badges at both widths; each badge keeps its radial element gradient without the retired class. The previously tracked Duel-reference phone overflow is unchanged.
- Third selector-audit PR: [#232, Remove retired element color utilities](https://github.com/nickcjordan/Xalians/pull/232), merged as `b3d73d0` on 2026-09-11.
- Third selector-audit CI: [CI run 34616121035](https://github.com/nickcjordan/Xalians/actions/runs/34616121035) and [Terraform-plan run 34616121096](https://github.com/nickcjordan/Xalians/actions/runs/34616121096) passed; 52 frontend files / 1,029 tests and 12 content files / 37 tests passed, both dependency audits found zero vulnerabilities, every production budget passed, and all three job-annotation responses were empty.
- Third selector-audit deploy: [frontend run 34616290498](https://github.com/nickcjordan/Xalians/actions/runs/34616290498) passed its production build, S3 sync, and CloudFront invalidation with an empty job-annotation response. The deployed shared immersive asset measured 86.84 kB raw / 17.28 kB gzip and the training asset remained 1.74 kB / 0.62 kB.
- Third selector-audit production verification: `https://xalians.com/train`, `/train/match`, `/train/physics`, `/duel`, `/duel/reference`, `/reclamation`, and `/long-return` loaded at 1,440×900 and 390×844 without page/console errors. A started Duel rendered 64 cells and eight gradient-painted type badges without the retired class or document overflow at either width. The previously tracked Duel-reference phone overflow is unchanged.
- Fourth selector-audit local measurement: the current semantic/Tailwind/shadcn navbar emits none of the retired BootstrapMade or React-Bootstrap navbar classes. Deleting their contiguous blocks from `style.css` and `system.css` removes 449 lines / 10,468 source bytes, reduces `style.css` from 49,830 to 43,246 bytes, and lowers its raw-hex ceiling from 102 to 40. Shared immersive CSS falls from 86.84/17.28 kB to 80.70/16.27 kB raw/gzip; the complete training CSS graph becomes 82.44/16.89 kB. Affected route budgets are tightened around the measured output.
- Fourth selector-audit local verification: focused ownership/design-system tests, typecheck, 52 files / 1,030 tests, zero production vulnerabilities, production build, and all tightened budgets pass. Desktop/mobile smoke covers home, generator, signed-out account, encyclopedia, Training, Match, Physics, Duel setup/reference, Reclamation, and Long Return without page/console errors or new overflow. The desktop navbar and opened phone menu each expose all seven primary links. Deterministic Duel setup, Physics, Long Return, and Reclamation-phone screenshots are byte-identical before/after; the remaining animated paints are visually unchanged. A started Duel renders all 64 cells without overflow at either width.
- Fourth selector-audit PR: [#233, Remove retired navbar styles](https://github.com/nickcjordan/Xalians/pull/233), merged as `9e3924b` on 2026-09-11.
- Fourth selector-audit CI: [CI run 34617250374](https://github.com/nickcjordan/Xalians/actions/runs/34617250374) and [Terraform-plan run 34617250378](https://github.com/nickcjordan/Xalians/actions/runs/34617250378) passed; 52 frontend files / 1,030 tests and 12 content files / 37 tests passed, both dependency audits found zero vulnerabilities, every production budget passed, and all three job-annotation responses were empty.
- Fourth selector-audit deploy: [frontend run 34617395292](https://github.com/nickcjordan/Xalians/actions/runs/34617395292) passed its production build, S3 sync, and CloudFront invalidation with an empty job-annotation response. It replaced the previous immersive asset with the measured 80.70 kB raw / 16.27 kB gzip output.
- Fourth selector-audit production verification: all eleven routes in the local matrix loaded at 1,440×900 and 390×844 without page/console errors or new overflow. The desktop navbar and opened phone menu each exposed seven primary links. A started Duel rendered all 64 cells and eight type badges without overflow at either width. The previously tracked Duel-reference phone overflow is unchanged.
- Fifth selector-audit local measurement: generator, catalogue, Duel setup, account, and record-strip rules are unreachable because their chrome routes receive zero immersive CSS and no immersive consumer emits their section-specific selectors. Moving the one live `.g-panel > p:last-child` rule beside its `system.css` primitive and deleting the remainder removes 464 lines / 11,563 bytes from `style.css`, reducing it from 43,246 to 31,683 bytes. Shared immersive CSS falls from 80.70/16.27 kB to 74.57/15.21 kB raw/gzip; the complete training CSS graph becomes 76.31/15.83 kB. Affected route budgets are tightened around the measured output.
- Fifth selector-audit local verification: focused ownership/bundle tests, typecheck, 52 files / 1,031 tests, zero production vulnerabilities, production build, and all tightened budgets pass. Desktop/mobile smoke covers all eleven chrome and immersive entries without page/console errors or new overflow. Eleven deterministic route screenshots are byte-identical before/after; the remaining animated or randomized paints are visually unchanged. A started Duel renders all 64 cells and eight type badges without overflow at either width. The previously tracked Duel-reference phone overflow is unchanged.
- Fifth selector-audit PR: [#234, Remove unreachable chrome styles](https://github.com/nickcjordan/Xalians/pull/234), merged as `1129875` on 2026-09-11.
- Fifth selector-audit CI: [CI run 34618321770](https://github.com/nickcjordan/Xalians/actions/runs/34618321770) and [Terraform-plan run 34618321760](https://github.com/nickcjordan/Xalians/actions/runs/34618321760) passed; Linux reproduced 52 frontend files / 1,031 tests, 12 content files / 37 tests, zero dependency vulnerabilities, the measured CSS output, and every tightened budget. All three job-annotation responses were empty.
- Fifth selector-audit deploy: [frontend run 34618491028](https://github.com/nickcjordan/Xalians/actions/runs/34618491028) passed its production build, S3 sync, and CloudFront invalidation with an empty job-annotation response.
- Fifth selector-audit production verification: all eleven routes loaded at 1,440×900 and 390×844 without console errors or new overflow. The phone menu exposed seven primary links. A started Duel rendered 64 cells and eight gradient-painted type badges without overflow at either width. The previously tracked Duel-reference phone overflow is unchanged.
- Sixth selector-audit local measurement: the residual source inventory found 151 class/id selectors in `style.css`, 136 without a literal executable reference. The other 15 reduce to generic-name false positives, unreachable page/modal descendants, one live cross-game badge helper, and five live Match-card helpers. Replacing the badge helper with equivalent component-local layout, moving the Match helpers to `training.css`, and deleting every dead selector reduces `style.css` from 31,683 to 885 source bytes and from 151 class/id selectors to zero. Shared immersive CSS falls from 74.57/15.21 kB to 57.63/11.79 kB raw/gzip; Training's complete CSS graph becomes 59.68/12.52 kB. Affected route budgets are tightened around the measured output.
- Sixth selector-audit local verification: focused ownership/design-system tests, typecheck, 52 files / 1,032 tests, zero production vulnerabilities, production build, and every tightened budget pass. Desktop/mobile smoke covers all eleven routes without page/console errors or new overflow. Deployed/local desktop Duel setup and Physics paints are byte-identical; the remaining animated or randomized paints are visually unchanged. A started Match renders 16 two-sided cards, and a started Duel renders 64 cells plus eight aligned, gradient-painted type badges at both widths. The previously tracked Duel-reference phone overflow is unchanged.

### 3. Font loading — Planned

**Scope**

Map actual face/weight/style use after CSS ownership is clear; consolidate requests, remove unreferenced families and weights, add appropriate connection/loading hints, and retain the authored v3 terminal voices plus the v4 Saira/Atkinson/Martian/Iceland system where still used.

**Measured baseline**

At the program baseline, `index.html` issued four Google Fonts stylesheet requests representing 18 families and approximately 35 requested face/style variants. It includes a standalone Abel request, broad legacy terminal families, and the v4 family request. Only `fonts.gstatic.com` is preconnected; `fonts.googleapis.com` is not. The first selector-audit slice removes both unused 10,144-byte copies of `ProcrastinatingPixie-WyVOO.ttf` and its dead `@font-face`; the broader live-face audit remains here.

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

### 7. Developer-only styleguide and enforceable bundle budgets — Complete

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

- Production implementation measurement: the styleguide chunk is absent from the manifest and emitted assets. The production entry plus auth graph is 536.6 kB raw / 170.1 kB gzip; initial CSS including direct-linked legacy files is 623.1 kB / 126.0 kB. The styleguide build mode still emits `styleGuidePage` at 517.22 kB / 147.58 kB gzip.
- Enforcement: `bundle-budgets.json` gives the initial graph, initial CSS, auth vendor, and all route graphs approximately five-percent headroom; `npm run build` now fails when the manifest-based checker exceeds any raw or gzip limit or emits the forbidden production styleguide entry.
- Local verification: typecheck; 51 test files / 1,019 tests; zero production vulnerabilities; production build and all budgets; developer styleguide build; production-mode browser smoke for home, generator, Duel setup, and the intentional `/styleguide` not-found page at 1,440×900 and 390×844, with no page/console errors or document-level overflow.
- PR: [#223, Keep developer styleguide out of production bundles](https://github.com/nickcjordan/Xalians/pull/223), merged as `75435c3` on 2026-09-11.
- CI: [CI run 34609532123](https://github.com/nickcjordan/Xalians/actions/runs/34609532123) and [Terraform-plan run 34609532068](https://github.com/nickcjordan/Xalians/actions/runs/34609532068) passed. The Linux production build printed both `PASS production excludes styleGuidePage` and `All production bundle budgets passed`; all job annotations were empty.
- Deploy: [frontend run 34609681141](https://github.com/nickcjordan/Xalians/actions/runs/34609681141) passed its bundle gate, S3 sync, and CloudFront invalidation; its job-annotation response was empty.
- Production verification: `https://xalians.com/`, `/generator`, `/duel`, and `/styleguide` loaded at 1,440×900 and 390×844 without page/console errors or document-level horizontal overflow. The first three retained their expected paint; `/styleguide` rendered the intentional not-found page.

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
| 2026-09-11 | Started the production styleguide exclusion and bundle-budget slice from deployed `main` at `90ee054`. | Production and developer builds plus local browser evidence recorded in workstream 7; PR pending. |
| 2026-09-11 | Completed the production styleguide exclusion and bundle-budget slice. | [PR #223](https://github.com/nickcjordan/Xalians/pull/223); CI, deploy, budget, and live route evidence recorded in workstream 7. |
| 2026-09-11 | Completed the first legacy CSS route-boundary slice and began the remaining shared-layer audit. | [PR #226](https://github.com/nickcjordan/Xalians/pull/226); CI, deploy, bundle reduction, and live route evidence recorded in workstream 2. |
| 2026-09-11 | Completed the shared immersive CSS boundary and began the selector-use audit from deployed `main` at `ef513f9`. | [PR #229](https://github.com/nickcjordan/Xalians/pull/229); clean CI/deploy annotations, production bundle measurements, and live route/game evidence recorded in workstream 2. |
| 2026-09-11 | Began the first conservative selector-audit deletion from deployed `main` at `ef513f9`. | Retired template blocks, orphaned assets, tightened budgets, and local cross-game evidence recorded in workstream 2; PR pending. |
| 2026-09-11 | Completed the first selector-audit deletion and began the training-style ownership split from deployed `main` at `9394d49`. | [PR #230](https://github.com/nickcjordan/Xalians/pull/230); clean CI/deploy annotations, shipped bundle reduction, and live cross-game evidence recorded in workstream 2. |
| 2026-09-11 | Completed the training-style ownership split and began removing the retired type-colour utility contract from deployed `main` at `82f6b9d`. | [PR #231](https://github.com/nickcjordan/Xalians/pull/231); clean CI/deploy annotations, shipped bundle and route-JavaScript reductions, and live cross-game evidence recorded in workstream 2. |
| 2026-09-11 | Completed the type-colour utility deletion and resumed the residual shared-selector audit from deployed `main` at `b3d73d0`. | [PR #232](https://github.com/nickcjordan/Xalians/pull/232); clean CI/deploy annotations, shipped CSS reduction, and live type-badge evidence recorded in workstream 2. |
| 2026-09-11 | Completed the retired-navbar CSS deletion and continued the residual selector audit from deployed `main` at `9e3924b`. | [PR #233](https://github.com/nickcjordan/Xalians/pull/233); clean CI/deploy annotations, shipped CSS reduction, and live desktop/mobile navigation evidence recorded in workstream 2. |
| 2026-09-11 | Completed the unreachable chrome-page CSS deletion and continued the residual selector audit from deployed `main` at `1129875`. | [PR #234](https://github.com/nickcjordan/Xalians/pull/234); clean CI/deploy annotations, shipped CSS reduction, and live cross-route evidence recorded in workstream 2. |
