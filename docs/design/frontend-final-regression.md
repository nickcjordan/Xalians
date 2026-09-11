# Frontend final regression audit

Status: complete and deployed on 2026-09-11.

This is the audit of record for workstream 8 of [`frontend-modernization-roadmap.md`](frontend-modernization-roadmap.md). The comparison baseline is deployed `main` at `f67283e`, after the React 19 / Router 8 runtime migration. Checks used the production Vite build plus Chromium at 1,440×900, 768×900 for the Duel board, and 390×844. Production smoke never submitted credentials or changed persistent account data.

## Route and state matrix

| Area | Routes and states exercised | Result |
|---|---|---|
| Shell | `/`, mobile menu, desktop navigation, sign-in dialog | Pass |
| Generator | `/generator`, initial loading, generated result, profile toggles, signed-out action | Pass |
| Account | `/account`, `/user/regression-audit`, signed-out and service-empty states | Pass |
| Encyclopedia | story, worlds index, powers, index, Xylum species record, canonical and retired deep links, record-not-found state | Pass |
| Training | `/train`, `/train/match`, `/train/physics`, match start curtain | Pass |
| Duel | `/duel` setup, help overlay, board, movement, invalid-range feedback, attack chooser, effectiveness/action overlays, bot turns, knockouts, loss completion, `/duel/reference` | Pass |
| Immersive games | `/reclamation` simple/advanced entry and `/long-return` landing/crew flow | Pass |
| Boundaries | unknown top-level route, unknown encyclopedia record, development error boundary | Pass |

Every route above was checked for document overflow, loading residue, missing images, accessible heading/name structure, and browser errors. The production baseline was clean; local development emitted only the Duel bot's existing diagnostic logging and the intentionally rejected rapid second move used to verify action throttling. Reloading `/train` after the list-key fix produced no React key warning.

## Accessibility and responsive evidence

- Keyboard traversal follows visual order in the shell and sign-in form. Focused links, buttons, inputs, toggles, and custom tab stops now paint the component-defined 2 px ring; the shared legacy reset can no longer erase its outline style.
- The sign-in dialog announces its title, focuses Username on open, closes with Escape, and returns focus to the exact Sign in opener. A deterministic interaction test protects the restoration path.
- Duel's setup switches are named `Randomize start positions` and `Debug mode`. Training game pages now expose a primary heading. The match-card list no longer emits a missing-key warning.
- Phone controls backed by Button, Toggle, and ToggleGroup measure at least 44 px, as do the Encyclopedia index's page-specific category tabs. The visually compact 32×18 Duel switches retain their shape but expose a 58×44 hit area through a pseudo-element. Reclamation's mode controls measure 73×44 and 94×44.
- The 390 px route matrix has zero document overflow. Duel reference previously exceeded the viewport by 146 px; its specimen bench now remains 390 px wide and gives its two intrinsically wide specimens local horizontal scrolling. The live board also has zero document overflow at the 768 px intermediate width.
- The universal reduced-motion rule collapses CSS animation and transitions. The logo avoids starting its GSAP timeline, encyclopedia scrolling becomes immediate, Long Return's timed transitions collapse to their terminal state, and Duel/Reclamation declare game-specific reduced-motion overrides. Pointer-launched physics and turn-result state changes remain direct gameplay feedback rather than ambient motion.
- `ink`, `ink2`, and `ink3` now clear 4.5:1 on every shared surface token. All six terminal accent/ink pairs also clear 4.5:1. These 21 combinations are enforced in `designTokens.test.js`; live sampling also caught and fixed Long Return role text, Duel's red down-state label, and Field/Relay primary-button ink.

## Findings closed in this slice

| ID | Severity | Finding | Resolution | Owner / follow-up |
|---|---:|---|---|---|
| FR-01 | P1 | Shared focus rings computed to `outline-style: none`. | Restored the outline style at the utilities layer while preserving component width, offset, and colour. | Frontend / none |
| FR-02 | P1 | Secondary text and several terminal/game combinations missed 4.5:1. | Raised secondary ink tokens, corrected semantic role text, lamp red, and Field/Relay accent ink; added contrast guards. | Design system / none |
| FR-03 | P2 | Closing a controlled auth dialog left focus on `body`. | Captured the opener and restored it through Radix close autofocus. | Frontend / none |
| FR-04 | P2 | Duel setup switches had no accessible names. | Added stable purpose-specific labels. | Duel / none |
| FR-05 | P2 | Duel reference overflowed a 390 px document by 146 px. | Constrained the bench and isolated unavoidable specimen width inside local scrollers. | Duel / none |
| FR-06 | P2 | Several phone controls exposed 18–39 px targets. | Applied the 44 px interaction contract to shared controls, Encyclopedia category tabs, and Reclamation segments; enlarged switch hit areas without visual inflation. | Frontend / none |
| FR-07 | P3 | Training subgames lacked primary headings, Match emitted a React key warning, and Physics asked GSAP to animate its conditional SVG before mount. | Added route headings, keyed the repeated fragment, and moved Physics animation setup behind the arena's committed render. | Training / none |

No open regression remains from this matrix.

## Performance and deterministic gates

The comparison uses the same manifest graph method introduced by PR #223, so the numbers are reproducible and independent of cache warmth.

| Metric | Program baseline | Final local build | Change |
|---|---:|---:|---:|
| Initial JavaScript, raw | 536.6 kB | 592.3 kB | +10.4% |
| Initial JavaScript, gzip | 170.1 kB | 185.3 kB | +8.9% |
| Initial CSS, raw | 623.1 kB | 208.2 kB | -66.6% |
| Initial CSS, gzip | 126.0 kB | 34.3 kB | -72.8% |
| Initial JS + CSS, gzip | 296.1 kB | 219.6 kB | -25.8% |

The JavaScript increase is the reviewed React 19 runtime cost recorded in workstream 6; Router 8 recovered 0.6 kB gzip relative to the React 19 / Router 7 comparison build. The CSS reduction is the cumulative result of the ownership and font workstreams. Current gzip route graphs remain within their checked-in budgets: home 42.5 kB, generator 303.8 kB, encyclopedia 175.8 kB, Duel setup 196.9 kB, live Duel 259.8 kB plus 16.0 kB CSS, Duel reference 341.2 kB plus 18.4 kB CSS, Reclamation 326.7 kB plus 26.5 kB CSS, Long Return 78.5 kB plus 39.7 kB CSS, and training 99.3 kB plus 12.4 kB CSS.

Local release gates are green: web typecheck; 58 web files / 1,110 tests; 12 API files / 65 tests; 12 content files / 37 tests; 12 rules files / 311 tests; zero production dependency vulnerabilities; production build; and every bundle budget.

## Release evidence

- PR [#241, Complete the frontend regression pass](https://github.com/nickcjordan/Xalians/pull/241) merged as `d2fba5d`. [CI run 34629620563](https://github.com/nickcjordan/Xalians/actions/runs/34629620563), [Terraform-plan run 34629620585](https://github.com/nickcjordan/Xalians/actions/runs/34629620585), and [deploy run 34629782908](https://github.com/nickcjordan/Xalians/actions/runs/34629782908) passed with empty annotation streams.
- The production recheck found two residual P2/P3 gaps and closed both rather than waiving them. PR [#242, Finish Encyclopedia touch targets](https://github.com/nickcjordan/Xalians/pull/242) merged as `89db63e`; [CI run 34630220729](https://github.com/nickcjordan/Xalians/actions/runs/34630220729), [Terraform-plan run 34630220725](https://github.com/nickcjordan/Xalians/actions/runs/34630220725), and [deploy run 34630334413](https://github.com/nickcjordan/Xalians/actions/runs/34630334413) passed with empty annotations. All nine category targets then measured 44 px in production.
- PR [#243, Guard Physics animation setup](https://github.com/nickcjordan/Xalians/pull/243) merged as `c79a30d`; [CI run 34630599053](https://github.com/nickcjordan/Xalians/actions/runs/34630599053), [Terraform-plan run 34630599060](https://github.com/nickcjordan/Xalians/actions/runs/34630599060), and [deploy run 34630712091](https://github.com/nickcjordan/Xalians/actions/runs/34630712091) passed with empty annotations. The final production Physics load rendered its arena, target, and two spinners with no console entry.
- Cache-busted production requests returned HTTP 200 for all 12 representative shell routes, including the intentional client-side not-found path. The shell response was 2,187 bytes and consistent-request TTFB ranged from 144 to 221 ms. Representative compressed asset transfers were 152,188 bytes for the entry chunk, 36,351 bytes for auth vendor, 35,182 bytes for initial CSS, 30,650 bytes for Encyclopedia, and 19,367 bytes for Physics.
- Final Chromium verification at 390×844 confirmed no document overflow or broken images on the changed routes, a painted keyboard ring, exact dialog focus restoration, named Duel switches, 44 px shared/category/Reclamation targets, locally contained Duel-reference scrollers, corrected terminal/game colours, and a clean Physics console. The 1,440 px and 768 px matrix remained visually unchanged from the release-candidate pass.

There are no open findings or deferred frontend-modernization actions.
