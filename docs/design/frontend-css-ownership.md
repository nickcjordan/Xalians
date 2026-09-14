# Frontend CSS ownership audit

Last audited: 2026-09-11 on the residual shared-selector audit branch based on deployed `origin/main` `9e3924bca65d4f687f83afe1d1c8a9a14de772c5`

This inventory defines which route or layer owns every non-component stylesheet. Its purpose is to make page-wide leakage visible and to support deleting the legacy layer in measured slices. Source-local Tailwind and shadcn classes remain governed by `docs/DESIGN_SYSTEM.md` and are not duplicated here.

## Ownership map

| Stylesheet | Baseline source bytes | Current consumers | Loading boundary | Disposition |
|---|---:|---|---|---|
| `src/styles/tokens.css` | 4,392 | Every route | Application entry | Retain as the v4 token/Tailwind source of truth. |
| `src/styles/globals.css` | 11,487 | Every route | Application entry | Retain only resets, page ground, semantic mappings, and documented global utilities. Audit again after the legacy layer leaves. |
| `src/styles/legacy/tokens.css` | 3,189 | Immersive v3 terminals | Imported through lazy `immersive.css` only | Merge required values into the immersive token block, then delete the aliases. |
| `src/styles/legacy/system.css` | 108,853 at baseline; 105,759 after selector cleanup, one live rule transfer, and the final element-default fold | Duel match/reference, Reclamation, training games, Long Return | Imported through lazy `immersive.css` only | Split the v3 terminal foundation from dead v4 duplicates and route/component sections. This is the main shared-ownership audit. |
| `src/styles/legacy/style.css` | 84,843 at baseline; deleted after six selector cuts and an exact final cascade fold | None | None | Retired. Its last 885 bytes contained only element defaults now kept at the end of `system.css`. |
| `src/styles/legacy/training.css` | 2,897 after the Match helper transfer | Xalian Match and Physics board geometry/controls | Imported after `immersive.css` by the two training game entries | Route-family owned; replace only with a deliberate training-game redesign. |
| `src/styles/legacy/typeColors.css` | 2,616 | None; deleted in the third selector-audit slice | None | Retired. Its 42 utility selectors had no effective executable consumer. |
| `src/styles/legacy/duel.css` | 46,022 | Live Duel match and Duel affordance reference | Imported by `duelPage.js` and `duelPlaygroundPage.js` | Route-owned; remove only with a Duel immersive redesign. |
| `src/styles/legacy/duel-playground.css` | 28,733 | Duel affordance reference | Imported after `duel.css` by `duelPlaygroundPage.js` | Developer-route owned. |
| `src/styles/legacy/reclamation.css` | 142,092 | Reclamation | Imported by `reclamationPage.js` | Route-owned; remove only with a Reclamation immersive redesign. |
| `components/games/longReturn/*.css` (7 files) | 164,218 built/minified baseline | Long Return | Imported from Long Return components and emitted as route CSS | Already route-owned; consolidate only when it improves maintainability without erasing scene-specific transitions. |

## First boundary slice

Before this slice, `index.html` linked seven legacy files totaling 416,348 source bytes on every route. The three unambiguously route-owned files—Duel, Duel reference, and Reclamation—accounted for 216,847 bytes, or 52.1% of that global source CSS. They were moved under `src/styles/legacy` and imported from their lazy route entries. The remaining globally linked compatibility layer is four files totaling 199,501 source bytes.

The route entry is the ownership boundary rather than an individual leaf component because each immersive experience has a deliberately coordinated visual language across many components, and its approved redesign has not happened. CSS import order remains base compatibility layer, then route base, then reference-only overrides.

## Second boundary slice

The remaining 199,501 source bytes no longer load from `index.html`. `immersive.css` preserves their cascade order and is shared only by Duel match/reference, Reclamation, Long Return, Xalian Match, and Physics. Vite compiles that source to 108.8 kB raw / 21.2 kB gzip. The initial stylesheet graph therefore falls from the first slice's deployed 398.7 kB / 79.7 kB gzip to 206.9 kB / 34.0 kB; chrome routes receive no compatibility CSS.

The Duel setup is chrome while the board is immersive, so the board module is now a nested lazy boundary. Setup route JavaScript falls from 1,505.7 kB / 451.6 kB gzip to 756.2 kB / 196.7 kB and carries zero legacy CSS. Starting a match loads an additional 751.7 kB / 256.2 kB JavaScript and 130.6 kB / 25.3 kB CSS under its own enforced budget.

## Guardrails

- `cssBoundaries.test.js` prevents the three route files from returning to `index.html` or gaining undocumented importers.
- The same guard prevents any compatibility link from returning to `index.html`, locks `immersive.css` to the six documented game entry modules, and enforces its cascade order.
- `designSystem.test.js` continues to enforce the raw-hex ceilings after the files move.
- `bundle-budgets.json` measures initial CSS and each route's emitted CSS graph. A new route stylesheet therefore needs an explicit, reviewed budget change.
- Do not call a stylesheet globally shared merely because it currently contains mixed selectors. Prove each selector's consumers, delete dead blocks, and then choose the narrowest stable owner.

## First selector-audit slice

A source-string inventory found 335 distinct class/id names in the 84,843-byte `style.css`; 291 had no exact literal reference in executable application source. That figure is evidence for investigation rather than an automatic deletion list: libraries may emit classes and application code may construct names. The first cut therefore removes only contiguous, named sections whose selectors and assets have no executable consumer: the custom-theme font/buttons, preloader and AOS shim, retired splash animation, and the old planet, token, team, story, contact, breadcrumb, and footer templates.

The cut removes 1,451 lines / 31,171 source bytes from `style.css`, both 10,144-byte copies of the unused Procrastinating Pixie font, and the uniquely referenced 299,629-byte vault background. The shared built `immersive.css` asset falls from 108.8 kB raw / 21.2 kB gzip to 91.2 kB / 17.9 kB. Route CSS budgets are tightened to that output with approximately five-percent headroom. The boundary test locks the retired section markers and asset paths out of the tree.

Local desktop/mobile smoke covers Training, Xalian Match, Physics, Duel setup/reference and a started 64-cell board, Reclamation, and Long Return without page/console errors or new document overflow. Direct before/after paint comparison of Xalian Match, Physics, Duel reference, and Long Return is unchanged; Duel reference retains the already-recorded phone overflow.

PR [#230, Remove retired frontend template styles](https://github.com/nickcjordan/Xalians/pull/230) merged as `9394d49`. CI run `34614031727`, Terraform-plan run `34614031618`, and production deploy `34614190720` passed with empty annotation streams. The deployed asset and live route/game measurements matched the local evidence.

## Second selector-audit slice

The live Match board, shared training game container, and Physics controls move into the 2,325-byte `training.css`, imported only by the Match and Physics entries. Comment-only overlay helpers and obsolete Training Grounds selectors are deleted instead of carried forward. Unused component/data imports are also removed from Physics and Duel, severing their dead source coupling to training helpers.

The shared immersive asset falls from 91.19 kB raw / 17.93 kB gzip to 88.98 kB / 17.56 kB. Training loads a separate 1.74 kB / 0.62 kB asset and its complete CSS graph is 90.7 kB / 18.1 kB, slightly smaller than before the split. Physics route JavaScript falls from 237.2 kB / 94.3 kB gzip to 224.2 kB / 90.7 kB; the nested Duel graph falls from 751.7 kB / 256.2 kB to 749.3 kB / 255.0 kB. Exact before/after screenshots match for Physics, Reclamation, and Long Return; the animated Match paint and Duel reference are visually unchanged.

PR [#231, Isolate training game styles](https://github.com/nickcjordan/Xalians/pull/231) merged as `82f6b9d`. CI run `34615063084`, Terraform-plan run `34615063210`, and production deploy `34615206142` passed with empty annotation streams. The deployed asset measurements and live route/game checks matched the local evidence.

## Third selector-audit slice

All 42 background, text, and border utility selectors in `typeColors.css` have no literal application consumer. The only constructed legacy name was the Duel type-symbol badge's `<element>-color` class, where the component's inline `background` shorthand always won over the class's `background-color`; no descendant selector or custom-property scope depended on it. The badge now keeps its existing token-mirrored inline gradient without emitting that inert class. The unused stylesheet, two dead badge imports, and an orphaned `system.css` override are deleted. Existing global `el-*` and immersive `g-el-*` token scopes remain the supported semantic contracts.

Deleting the 2,616-byte stylesheet reduces the shared built immersive asset from 88.98 kB raw / 17.56 kB gzip to 86.84 kB / 17.28 kB. Training's complete CSS graph becomes 88.58 kB / 17.90 kB. The Duel-reference, Reclamation, Long Return, training, and nested-Duel raw CSS budgets tighten to the measured output with approximately five-percent headroom.

Local typecheck, 52 files / 1,029 tests, dependency audit, production build, and bundle budgets pass. Desktop/mobile smoke covers all seven immersive entries without page/console errors or new overflow. A started Duel renders 64 cells and eight correctly painted type badges at both widths, with no retired class in their DOM; Duel reference retains only its already-recorded phone overflow.

PR [#232, Remove retired element color utilities](https://github.com/nickcjordan/Xalians/pull/232) merged as `b3d73d0`. CI run `34616121035`, Terraform-plan run `34616121096`, and production deploy `34616290498` passed with empty annotation streams. The deployed asset measurements and live route/game checks matched the local evidence.

## Fourth selector-audit slice

The current `navbar.tsx` uses semantic navigation plus Tailwind/shadcn and emits none of the old BootstrapMade or React-Bootstrap navbar classes. The contiguous desktop/mobile navigation block in `style.css` and both `.xalian-navbar` sections in `system.css` therefore have no executable or library-generated consumer. Deleting them removes 449 lines / 10,468 source bytes and tightens the `style.css` raw-hex ceiling from 102 to its new count of 40.

The shared immersive asset falls from 86.84 kB raw / 17.28 kB gzip to 80.70 kB / 16.27 kB. Training's complete CSS graph becomes 82.44 kB / 16.89 kB. All affected route budgets tighten around the measured output, and the ownership guard prevents the retired class contract or a `react-bootstrap` Navbar dependency from returning.

Local typecheck, 52 files / 1,030 tests, dependency audit, production build, and tightened bundle budgets pass. Desktop/mobile smoke covers eleven chrome and immersive entries without page/console errors or new overflow. The desktop bar and opened phone sheet each expose all seven primary links; deterministic Duel setup, Physics, Long Return, and Reclamation-phone screenshots are byte-identical before/after, and a started Duel renders all 64 cells cleanly at both widths.

PR [#233, Remove retired navbar styles](https://github.com/nickcjordan/Xalians/pull/233) merged as `9e3924b`. CI run `34617250374`, Terraform-plan run `34617250378`, and production deploy `34617395292` passed with empty annotation streams. The deployed asset measurements and live route/navigation checks matched the local evidence.

## Fifth selector-audit slice

Generator, catalogue, Duel setup, account, and record-strip rules remained inside `style.css` even though those chrome routes receive zero immersive CSS. Their section markers and selectors have no executable immersive consumer, so the unreachable block is deleted. One genuinely shared rule, `.g-panel > p:last-child`, moves beside the `.g-panel` primitive in `system.css` before the cut.

The deletion removes 464 lines / 11,563 source bytes from `style.css`, reducing it from 43,246 to 31,683 bytes. The shared immersive asset falls from 80.70 kB raw / 16.27 kB gzip to 74.57 kB / 15.21 kB, and Training's complete CSS graph becomes 76.31 kB / 15.83 kB. All affected route budgets tighten around the measured output; the ownership guard locks representative chrome-only sections out of the immersive graph and retains the transferred panel rule.

Focused ownership/bundle tests, typecheck, 52 files / 1,031 tests, dependency audit, production build, and all tightened budgets pass. The desktop/mobile browser matrix covers eleven chrome and immersive routes with no page/console errors or new overflow. Eleven deterministic screenshots are byte-identical before/after; animated or randomized paints remain visually unchanged. A started Duel renders 64 cells and eight type badges without overflow at either width.

PR [#234, Remove unreachable chrome styles](https://github.com/nickcjordan/Xalians/pull/234) merged as `1129875`. CI run `34618321770`, Terraform-plan run `34618321760`, and production deploy `34618491028` passed with empty annotation streams. Linux reproduced the local tests, dependency audits, bundle output, and tightened budgets. The live eleven-route desktop/mobile matrix, phone navigation, and active Duel board matched the local evidence.

## Sixth selector-audit slice

The residual source inventory found 151 class/id selectors in `style.css`, 136 without any literal executable reference. The apparent references in the remaining 15 resolve to generic `dark`, `light`, and `row` names, descendants whose owning page/modal class is unreachable, a chart state used only by the developer styleguide that never receives immersive CSS, one live badge alignment helper, and five live Match-card helpers.

The badge alignment moves into the shared component's existing style object, while the Match helpers move into route-family-owned `training.css`. Every dead class/id selector is removed; `style.css` retains only its element-level immersive defaults. This reduces it from 31,683 to 885 source bytes and from 151 class/id selectors to zero. Shared immersive CSS falls from 74.57/15.21 kB to 57.63/11.79 kB raw/gzip, while Training's complete graph becomes 59.68/12.52 kB. Tightened route budgets lock in the reduction.

Focused ownership/design-system tests, typecheck, 52 files / 1,032 tests, dependency audit, production build, and every tightened budget pass. The eleven-route desktop/mobile matrix has no page/console errors or new overflow. Desktop Duel setup and Physics are byte-identical to deployed production; the other animated or randomized paints remain visually unchanged. A started Match renders 16 two-sided cards, and a started Duel renders 64 cells plus eight aligned, painted badges at both widths.

PR [#235, Retire residual shared CSS selectors](https://github.com/nickcjordan/Xalians/pull/235) merged as `1b1f7f6`. CI run `34619819891`, Terraform-plan run `34619819877`, and production deploy `34620056308` passed with empty annotation streams. Linux reproduced the local test, audit, asset, and budget evidence; the live eleven-route matrix plus active Match and Duel checks matched local behavior.

## Final shared-file consolidation

The remaining 885-byte `style.css` contains only element defaults and no class/id selectors. Appending it unchanged to the end of `system.css` preserves its exact cascade position; removing its import and file leaves `immersive.css` with the two explicit layers it actually owns: aliases, then terminal foundation/defaults. The emitted `immersive-B5YtPtE8.css` asset is byte-identical before and after at 57.63/11.79 kB, which is stronger visual evidence than a screenshot comparison for this source-only consolidation.

Focused ownership/design-system tests, typecheck, 52 files / 1,031 tests, dependency audit, production build, and every existing budget pass.

PR [#236, Fold final immersive defaults into system CSS](https://github.com/nickcjordan/Xalians/pull/236) merged as `ccd2af6`. CI run `34620786800`, Terraform-plan run `34620786888`, and production deploy `34620942570` passed with empty annotation streams. The deployed stylesheet was byte-identical to the already verified #235 artifact, so the source consolidation had no browser-visible production delta.

## Completion boundary

The ownership audit is complete: chrome receives no immersive compatibility CSS, every route stylesheet has an explicit importer set and budget, and the shared immersive graph contains only tokens plus cross-game terminal foundations. Further removal from `system.css` now belongs to an individual experience's visual migration, where selectors can be retired with that route's markup rather than guessed globally. Tailwind's temporary `important` interop remains a separate runtime-stack concern after the immersive routes leave the compatibility layer.
