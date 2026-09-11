# Frontend final regression audit

Status: local validation complete on 2026-09-11; PR, CI, deployment, and post-deploy production evidence pending.

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
| FR-07 | P3 | Training subgames lacked primary headings and Match emitted a React key warning. | Added route headings and keyed the repeated fragment. | Training / none |

No open regression remains from this matrix.

## Performance and deterministic gates

The comparison uses the same manifest graph method introduced by PR #223, so the numbers are reproducible and independent of cache warmth.

| Metric | Program baseline | Final local build | Change |
|---|---:|---:|---:|
| Initial JavaScript, raw | 536.6 kB | 592.3 kB | +10.4% |
| Initial JavaScript, gzip | 170.1 kB | 185.3 kB | +8.9% |
| Initial CSS, raw | 623.1 kB | 208.1 kB | -66.6% |
| Initial CSS, gzip | 126.0 kB | 34.3 kB | -72.8% |

The JavaScript increase is the reviewed React 19 runtime cost recorded in workstream 6; Router 8 recovered 0.6 kB gzip relative to the React 19 / Router 7 comparison build. The CSS reduction is the cumulative result of the ownership and font workstreams. Current gzip route graphs remain within their checked-in budgets: home 42.5 kB, generator 303.8 kB, encyclopedia 175.8 kB, Duel setup 196.9 kB, live Duel 259.8 kB plus 16.0 kB CSS, Duel reference 341.2 kB plus 18.4 kB CSS, Reclamation 326.7 kB plus 26.5 kB CSS, Long Return 78.5 kB plus 39.7 kB CSS, and training 99.3 kB plus 12.4 kB CSS.

Local release gates are green: web typecheck; 58 web files / 1,110 tests; 12 API files / 65 tests; 12 content files / 37 tests; 12 rules files / 311 tests; zero production dependency vulnerabilities; production build; and every bundle budget.

## Release evidence

PR, CI, deployment, production route responses, asset transfer, console/network checks, and final desktop/phone smoke will be appended after this slice reaches production.
