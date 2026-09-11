# Frontend CSS ownership audit

Last audited: 2026-09-11 on the second boundary branch based on `origin/main` `6cdd7ea788b6633dcc26e4d078263f4a4368b5a0`

This inventory defines which route or layer owns every non-component stylesheet. Its purpose is to make page-wide leakage visible and to support deleting the legacy layer in measured slices. Source-local Tailwind and shadcn classes remain governed by `docs/DESIGN_SYSTEM.md` and are not duplicated here.

## Ownership map

| Stylesheet | Baseline source bytes | Current consumers | Loading boundary | Disposition |
|---|---:|---|---|---|
| `src/styles/tokens.css` | 4,392 | Every route | Application entry | Retain as the v4 token/Tailwind source of truth. |
| `src/styles/globals.css` | 11,487 | Every route | Application entry | Retain only resets, page ground, semantic mappings, and documented global utilities. Audit again after the legacy layer leaves. |
| `src/styles/legacy/tokens.css` | 3,189 | Immersive v3 terminals | Imported through lazy `immersive.css` only | Merge required values into the immersive token block, then delete the aliases. |
| `src/styles/legacy/system.css` | 108,853 | Duel match/reference, Reclamation, training games, Long Return | Imported through lazy `immersive.css` only | Split the v3 terminal foundation from dead v4 duplicates and route/component sections. This is the main shared-ownership audit. |
| `src/styles/legacy/style.css` | 84,843 | Training games plus older shared immersive selectors; contains substantial obsolete template surface | Imported through lazy `immersive.css` only | Prove selectors live/dead by route, delete dead template rules, and move remaining training/shared rules behind their narrow entries. |
| `src/styles/legacy/typeColors.css` | 2,616 | Element/type utility classes in immersive views | Imported through lazy `immersive.css` only | Replace with token-backed element scopes where semantics match. |
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

## Remaining audit sequence

1. Produce selector-use reports for `style.css` and the non-foundation sections of `system.css`; verify ambiguous selectors in the browser before deletion.
2. Split training-game rules from obsolete BootstrapMade/template rules in `style.css`; delete confirmed dead selectors and assets.
3. Replace `typeColors.css` with existing v4 element tokens/scopes where semantics match.
4. Tighten route CSS budgets after every deletion, then remove Tailwind's temporary `important` interop once no legacy specificity requires it.
