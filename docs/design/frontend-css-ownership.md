# Frontend CSS ownership audit

Last audited: 2026-09-11 on the type-colour utility deletion branch based on deployed `origin/main` `82f6b9d5718cd6f88f7882738a36a8297ba5ce60`

This inventory defines which route or layer owns every non-component stylesheet. Its purpose is to make page-wide leakage visible and to support deleting the legacy layer in measured slices. Source-local Tailwind and shadcn classes remain governed by `docs/DESIGN_SYSTEM.md` and are not duplicated here.

## Ownership map

| Stylesheet | Baseline source bytes | Current consumers | Loading boundary | Disposition |
|---|---:|---|---|---|
| `src/styles/tokens.css` | 4,392 | Every route | Application entry | Retain as the v4 token/Tailwind source of truth. |
| `src/styles/globals.css` | 11,487 | Every route | Application entry | Retain only resets, page ground, semantic mappings, and documented global utilities. Audit again after the legacy layer leaves. |
| `src/styles/legacy/tokens.css` | 3,189 | Immersive v3 terminals | Imported through lazy `immersive.css` only | Merge required values into the immersive token block, then delete the aliases. |
| `src/styles/legacy/system.css` | 108,853 | Duel match/reference, Reclamation, training games, Long Return | Imported through lazy `immersive.css` only | Split the v3 terminal foundation from dead v4 duplicates and route/component sections. This is the main shared-ownership audit. |
| `src/styles/legacy/style.css` | 84,843 at baseline; 49,830 after the first two selector cuts | Older shared immersive selectors; retired template and training-only sections are deleted or extracted | Imported through lazy `immersive.css` only | Continue proving residual selectors live/dead and move any remaining route rules behind their narrow entries. |
| `src/styles/legacy/training.css` | 2,325 | Xalian Match and Physics board geometry/controls | Imported after `immersive.css` by the two training game entries | Route-family owned; replace only with a deliberate training-game redesign. |
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

## Remaining audit sequence

1. Continue the selector-use report for residual `style.css` and the non-foundation sections of `system.css`; verify ambiguous selectors and library-generated state classes in the browser before deletion.
2. Audit the remaining shared rules in `style.css`; delete further confirmed dead selectors and move any surviving route-only rules to the narrowest owner.
3. Tighten route CSS budgets after every deletion, then remove Tailwind's temporary `important` interop once no legacy specificity requires it.
