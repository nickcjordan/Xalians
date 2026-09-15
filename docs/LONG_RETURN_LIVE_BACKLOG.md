# Long Return — active experience backlog

Owner: the agent maintaining the Long Return worktree. Update this file during implementation, not just at handoff.

## Active goal — full-mission UX (2026-09-11)

Bring The Long Return to a human-validated, coherent full-mission UX. Preserve decision-based exploration and advanced detail mode. After implementing the September 13 narrative feedback, the persistent task goal is blocked on renewed player validation, not complete; this file records evidence, not a substitute stopping condition.

### Outcome register

| Outcome | Current evidence status | Acceptance question |
| --- | --- | --- |
| Confident interaction | Technical checks exist; player validation pending | Can a player distinguish inspect, select, back and commit before clicking? |
| Understandable decisions | Route comparison improved per player feedback; other decisions under review | Can a player see the exchange without reconstructing separate explanations? |
| Meaningful creatures | Implementation and rules checks; player validation pending | Does the creature visibly explain the action and the reason to choose it? |
| Clear consequences | Crossing choreography/receipt implemented; recovery under review | Does each action leave a persistent, causal account of its effects? |
| Complete mission experience | Automated complete runs; player validation pending | Do encounters, companions, repairs, extraction and failure form a coherent arc? |
| Comfortable presentation | Sampled viewport and keyboard checks; player validation pending | Does the entire flow remain legible, stable and comfortably navigable? |

Statuses progress independently: identified → implementing → technically verified → UX reviewed → player validated. A historical checked implementation item does not mean the corresponding player outcome is accepted. No goal completion from tests alone, a fixed loop count, or an exhausted task batch.

### Live findings

### September 14 — persistent action storytelling

- [x] Replace the expiring caption slot in crossing, scouting/return and encounter-response animations with a cumulative account beside the artwork.
- [x] Keep earlier events readable; provide pause, manual next-event, skip-to-full-account and explicit continue. Skipping reveals rather than dismisses.
- [x] Remove the duplicate crossing recap banner. Keep resource animation alongside the same account.
- [x] Verify normal-motion pause/persistence/stepping at 390, 768 and 1280px; reduced-motion flow across scout, route, result, repairs and companion; 157 unit tests; production build and bundle limits.
- [ ] Player acceptance of pacing and cohesion remains open. This is not a blocker to independently testable work.

Evidence: `apps/web/scripts/long-return-story.mjs`, `long-return-techniques.mjs`, `long-return-viewport.mjs`, and `ActionTransition.test.js`. Browser review caught and corrected navigation overlap and mobile composition; accumulated text remains visible until an explicit continuation.

2026-09-13 player feedback reopens clear consequences and presentation: the receipt is understandable, but results read as logs rather than an adventure. Conductive brine and the coolant bypass appear without enough physical context. Narrative coherence is not accepted merely because the numerical changes are understood.

| ID | Player problem / evidence | Next action | Status |
| --- | --- | --- | --- |
| UX-01 | Field repairs used signed numbers and a prose receipt; recovery could not be visually traced from preview to result. | Shared preview/receipt exchange implemented. Capped recovery, brace/relay effort, cancellation, keyboard focus and saved receipts tested. | Technically verified; visual review performed; player validation pending |
| UX-02 | Crossing receipts show post-crossing reserves after a repair changes current reserves. | Crossing receipt identifies “before repair”; restored capacity remains in the repair receipt. Salvage uses pre-repair “carried on arrival” instead of mixing a historical heading with current haul. | Implemented and reviewed; player validation pending |
| UX-03 | Most evidence covers successful automated actions, not first-time understanding. | Audit every decision type with recorded visible evidence; keep human questions open and prepare one focused full-mission validation candidate. | Open across outcome register |
| UX-04 | First browser review: expanding repairs appended a tall chooser to the entire result; unavailable choices dominated it. | Repair workspace replaces the story while open. Explicit back/keep-haul controls restore it. Unaffordable work is disclosed on request. | Technically verified; visual review performed; player validation pending |
| UX-05 | Companion acquisition emphasized “no energy spent” while the one-use benefit was prose; route savings were explained only under analysis. | Encounter aftermath shows changed reserves and one automatic assist. Confirmed route energy values name the ally's saving directly. Follow-up wording specifies lead energy, not support energy. | Technically verified and browser reviewed; player validation pending |
| UX-06 | Optional depth showed potential gains but not the half-haul penalty for emergency extraction. | Shared settlement function powers the ending and current haul-at-risk preview. Equal-weight extract/enter actions; Index explicitly retained either way. | Technically verified and three-width review performed; player validation pending |
| UX-07 | Critical creatures disappeared from scout choices while the simple header showed only an ordinary blue number. Worn tooltip incorrectly claimed permanent impairment. | Header labels weakened/cannot scout/cannot act, and imminent collapse; recovery clears warnings. Corrected tooltip. Later-state mobile Index screenshot reviewed with one critical and two weakened members. | Technically verified and visually reviewed; player validation pending |
| UX-08 | Mobile Index result runs over two screens: resource cause breakdowns compete with the story and next decision. Screenshot `lr-goal-depth-layout/depth-5-390.png`. | Arithmetic moved to the existing why disclosure, all actual resource losses and tool use retained. Mobile receipt is a compact two-column ledger. Removed false ten-slot salvage capacity gauge. | Improved and visually reviewed; mobile still scrolls; player validation pending |
| UX-09 | Repair bank wording promised salvage at extraction even before the Index; early Abort did not expose forfeiture at the click. | Repair keep-haul action now says salvage stays carried and returns to result. Abort displays the actual salvage left behind, with an accessible description. | Tests, browser and build pass; player validation pending |
| UX-10 | Full default roster made all alternative creatures disabled/dim; changing crew required removing someone before considering a replacement. | Alternatives open an explicit replacement view with incoming portrait, current crew choices and cancel. No roster mutation until replacement; focus returns to the incoming card. Launch/settings/briefing hidden during replacement. Technical provenance moved into the briefing disclosure. | Tests, three-width browser and alternate-crew mission pass; player validation pending |
| UX-11 | Player understands the receipt but cannot picture how the brine or bypass enters the story. | Authored four-paragraph crossing scenes for all 14 routes; selected method, discovered/undetected danger, actual effort, structural disturbance and arrival form one account. Repeated turning-point/consequence explanations move into the existing disclosure. Existing result checkpoints can render the new prose without replaying the action. | Implemented; regression and three-width review performed; player validation pending |

Loop: rank findings by player impact → implement → test → inspect in browser → replay surrounding flow → record new findings and continue. Finish independent work before requesting a genuinely necessary player decision. Human-test-ready and human-accepted are different milestones.

### Evidence log — 2026-09-11

Scout-report follow-up, 2026-09-13: brief report prose now describes departure/contact/physical return rather than raw communication lists. Revealed observations are included in the account, so names such as “Live servo cycle” are not the only description of the discovery. Unrelayed and blind reports do not disclose hidden observations. Replaced technical report headings with direct language. Full 157-test suite passed; build passed before the final copy refinement, and engine tests plus three-width scout/encounter/report flows passed after it. Reviewed final report screenshot at `lr-scout-story-review/1280-report.png`. No player acceptance inferred.

Encounter context audit, 2026-09-13: compared narrative branches directly with encounter option contracts. Fixed `pin-rig` falsely claiming the trapped native escaped and a security intrusion occurred; it now describes passing without freeing the creature. Solo aid, remote medic calls and physical return-for-medic journeys now name who arrives and how. Verified 157 tests, three-width browser flows and production build. Reviewed the medic-call companion render at `C:/Users/njord/AppData/Local/Temp/lr-rescue-story-review/1280-companion.png`. Mechanics unchanged; narrative acceptance remains pending.

Narrative fidelity follow-up, 2026-09-13: older one-use ability results now reconstruct historical methods without restoring them to the selectable pool; new results snapshot the method. Fixed non-destructive passage wording and a reservoir arrival that could wrongly imply pushing deeper remained available. Native encounter outcomes now tell rescue, retreat, boundary-setting, distraction and confrontation as short scenes; a direct challenge no longer claims a decoy. Rescue delay/effort prose is conditional on resolved costs. 155 tests, the three-width browser suite, ability-animation checks and all three detailed-mode sample flows passed; production build passed with the existing chunk warning. Reviewed desktop/mobile companion renders at `lr-encounter-story-review/`. Player validation of these stories remains open.

2026-09-13 narrative follow-up: 150 tests pass, including all 14 routes/method coverage, known versus unknown brine, conditional costs, remote retrieval, and old checkpoint presentation without duplicated resource spending. Three-width browser suite passes (390/768/1280); desktop and mobile result screenshots reviewed at `C:/Users/njord/AppData/Local/Temp/lr-story-review/`. Intake reproduction at `lr-story-intake/` tells the bypass's physical origin. Seven-scene reduced-motion browser replay reaches deep retrieval with 17 salvage and 2 stability (`lr-story-full/run.json`). Production build and diff check pass; existing bundle-size warning remains. Reading on mobile still requires scrolling. This validates behavior and presentation samples, not literary acceptance by the player.

- Goal activated. No player outcome accepted or completed by the agent.
- Recovery browser checks at 1280/768/390: open/back/keep haul, reversible selection/cancellation, preview-to-receipt identity, focus, reduced motion, reload and no second spend. Screenshots: `C:/Users/njord/AppData/Local/Temp/lr-recovery-review/`.
- Visual review rejected the first repair layout (approximately 1,800px page). Follow-up replaced the appended chooser with the repair workspace; desktop preview now fits its principal controls together. Mobile retains natural scrolling.
- Normal-speed five-scene mission with recovery reached voluntary Index extraction, five salvage banked. Evidence: `C:/Users/njord/AppData/Local/Temp/lr-goal-full-run/run.json`. This proves that sampled flow completes, not that it is enjoyable or self-explanatory.
- Subsequent viewport suite passed scout, routes, custom crew, result, repair workspace, ending, native encounter, companion and report at three widths. Reviewed companion screenshots at 1280 and 390.
- 144 tests passed after the reserve-state indicators and extraction preview were added. Production build passed with the current components (before the final companion wording refinement). All changes remain in the Long Return worktree; no main checkout edits.
- Normal-speed seven-scene conservation run ended in forced extraction at zero stability with Index retained and nine salvage banked (`lr-goal-depth-review/run.json`). The depth penalty is unchanged; it is now exposed before the choice.
- Updated voluntary extraction passed again. Three-width depth inspection found no horizontal overflow, but identified UX-08; passing layout assertions does not close that finding.
- Normal-speed recommended/lowest-risk route run completed all seven scenes successfully with 17 salvage and 2 stability remaining (`C:/Users/njord/AppData/Local/Temp/lr-goal-success-depth/run.json`). This contrasts the forced-extraction run without changing numerical balance.
- Continued goal loop: result arithmetic is preserved in a deliberate disclosure, core deltas remain visible, and the salvage display no longer implies a false capacity. Compared first-scene desktop/mobile and Index mobile captures (`lr-compact-depth/depth-5-390.png`) with the prior layout. Index extraction replay passed with five salvage unchanged. The view is shorter, but mobile scrolling remains a player-validation question rather than an automatically closed outcome.
- Roster replacement checks at 390/768/1280 cover keyboard entry, focused prompt, cancellation without mutation, exact replacement, focus return and launch with the chosen crew. Screenshots in `C:/Users/njord/AppData/Local/Temp/lr-roster-review/`. Reviewed desktop and mobile. 145 tests and production build passed before final mobile swap alignment; that alignment is being rechecked.
- Final mobile swap alignment passed all three widths. A normal-speed mission swapping Ectoghoul for Graviclaw reached Index extraction with five salvage (`C:/Users/njord/AppData/Local/Temp/lr-alternate-crew-review/run.json`).
- Guided, Standard and Expert browser checks each performed manual route/lead/support/method selection, crossing, detailed result and field recovery (`apps/web/scripts/long-return-guidance.mjs`). This is sampled preservation evidence, not every advanced-mode state.
- Follow-up regression check passed for reusable versus one-use techniques: selection spends nothing, the performer moves during resolution, and ability consumption persists in the result. Server remains available on port 4173. No new defect was exposed by this check.

### Human validation gate — requested, not accepted

September 13 renewed gate, observation 3: no new player feedback. Revalidated the prior observations and confirmed the game endpoint returns HTTP 200. Marked the goal blocked on the requested narrative/decision-clarity playtest. Resume from that evidence when supplied; no outcome is accepted and no speculative redesign is queued merely to avoid the gate.

September 13 renewed gate, observation 2: the requested narrative playtest remains unanswered. Revalidated the outcome register and the live game endpoint (HTTP 200). No further independent defect is established by the current evidence; the next action remains incorporating player feedback, not claiming acceptance from tests. Goal remains active.

September 13 renewed gate, observation 1: the narrative candidate has now passed its final production build after the scout-copy refinement. The server is listening on 4173. Crossing, encounter and scouting changes are implemented and sampled; the outstanding evidence is the player's response to the current story presentation and continuing decision clarity. Ask whether the revised intake crossing is now easy to picture and whether the next action remains easy to find. No player outcome is accepted; do not use the earlier pre-feedback blocked observations toward this new gate.

The current candidate has implementation, automated and sampled visual evidence for the findings above. No player outcome in the register is accepted. An asynchronous human-test request was sent during this continuation: on a fresh run, report the first click/outcome that differs from expectation, or reach extraction and explain whether the leave/deeper decision made sense. Do not issue repeated surveys while this request is unanswered.

Next action when feedback arrives: record the observed problem and expected behavior, reopen the applicable outcome, implement and replay. If the first blocker prevents a full mission, later outcomes remain unvalidated. Do not infer acceptance from silence or treat inability to self-validate comprehension as a code defect to solve by inventing additional features.

Follow-up gate review: the requested playtest remains unanswered. The outstanding technique regression check is now complete; the remaining acceptance questions require player evidence, not another speculative UI redesign. Goal remains active and no outcome is marked accepted.

Third consecutive gate observation: no player feedback has arrived. Independent verification is complete for the current candidate; the server is still listening on port 4173. Goal marked blocked pending the requested playtest, with every player-acceptance outcome still open. Resume from the reported expectation mismatch, not by restarting the implementation checklist.

## Historical implementation contract (superseded by active goal)

This work is complete when the known issues below are implemented and rechecked, the ordinary mission flow is compact and coherent, and a fresh audit finds no unresolved high-impact interaction or correctness defect. A number of loops, passing tests, or a completed component is not a stopping criterion. Do not invent additional features merely to keep working. Stop for a genuinely necessary user decision or inaccessible dependency; document it explicitly.

Preserve the decision-exploration game and advanced detail mode. Do not change numerical balance to conceal poor communication. Keep progress reports in the ongoing turn.

## Historical implementation queue — creature identity and mission experience

### Follow-through audit: opportunity costs

- [x] Include one-use ability expenditure in the shared route comparison when applicable; retain a quiet default when neither route consumes a tool.
- [x] Do not recommend away different one-use tools or lasting consequences; do not treat unresolved costs as provably superior.
- [x] Recheck browser layouts, reversible technique selection and a full mission after the recommendation change; record results below.

Follow-through evidence: 123 tests passed; production build and diff checks passed. Desktop/tablet/mobile, keyboard/checkpoint, and reusable/one-use technique browser checks passed. A fresh normal-speed run crossed five scenes and extracted the Index with five salvage. The local Vite server was restarted after the browser audit found it stopped. Preview wording uses “Uses” / “Unavailable afterward” to distinguish a forecast from an already-spent ability.

The completion status below refers to the previous implementation queue, not this follow-through audit.

Status: completed against this queue's implementation and verification checks. Evidence and coverage limits are in `LONG_RETURN_DECISION_MATRIX.md`. Existing scouting/memory/depth systems were retained where they passed the audit; this pass did not rewrite working rules just to claim new features. Completion does not claim exhaustive state-space testing or human validation of enjoyment.

Implemented: capability-to-method cues, optional reusable/one-use technique choice, visible ability expenditure, route props and differentiated performer trajectories across all seven scenes. Fixed detour falsely clearing a native, missing costly-support action beats, a misleading climb icon, and picker-density/focus regressions found during review. Route viability audit justified keeping numerical balance unchanged.

### 1. Establish the design and coverage baseline

- [x] Inspect the current creature adapter, registry interpretation, scene rules, forecasts, outcomes and animation pipeline before changing them.
- [x] Record a seven-scene decision matrix: player decision, creature traits that matter, known cost/reward exchange, hidden information, lasting consequence and current choreography. Identify dominated or interchangeable options using the actual rules, not just their descriptions.
- [x] Define intended learning beats for scenes one and two, and which later scenes test or combine those lessons. Preserve exploration as the focus, not a battle-game pivot.

### 2. Make creature identity visible through the first two scenes

- [x] Present the selected creature's relevant capability through the proposed action and a concise visual cue. Keep raw attributes and explanations in deliberate disclosures; do not introduce another stats panel.
- [x] Make alternative leads offer recognizably different approaches where the creature data supports them. Do not manufacture capabilities absent from the registry or reveal an untaken hazard.
- [x] Connect scouting perception, communication and return behavior to what the creature actually does and spends.
- [x] Carry actor and method consistently through preview, action sequence and persistent result. Support and companion contributions must be distinguishable from the lead's action.

### 3. Make the alternatives meaningful

- [x] Audit both routes and available crew plans in each of the first two scenes. Identify the reason a player could rationally choose each under a reachable mission state.
- [x] Fix unintentional dominated/interchangeable options through a real, understandable exchange of energy, stability, intelligence, salvage or future opportunity. Document any numerical/rule changes separately from presentation changes and test them.
- [x] Ensure a recommendation does not imply a universally best option when a material trade-off exists. Unknown costs must neither read as free nor disclose hidden outcomes.
- [x] Exercise contrasting crew/resource states and both route choices. Verify previews, settled costs and downstream consequences agree.

### 4. Make action choreography specific

- [x] Show the first two scenes' selected crossing method through recognizable movement and interaction with the terrain, rather than a generic transition with different text.
- [x] Stage hazard interruption, resource expenditure, support intervention and companion help in causal order when those events actually occur. Do not animate events that the rules did not produce.
- [x] Keep results persistent and player-controlled; preserve reduced-motion alternatives, skip behavior where available, input protection against double commitment, and stable layout.
- [x] Reuse canonical creature artwork and existing assets when suitable. Add art only where it improves comprehension; avoid making asset production a substitute for implementing the interaction.

### 5. Validate the first-two-scene experience before rollout

- [x] Play both routes, scouting and no-scout paths, alternate leads, encounter responses and companion help in isolated browser runs. Record covered and uncovered branches explicitly.
- [x] Inspect desktop, tablet and mobile; keyboard and reduced-motion use; Simple and detailed guidance. Check that the improved story has not reintroduced scrolling dossiers or banner stacks.
- [x] Review without relying on implementation knowledge: can the visible choice communicate the approach, exchange and next action, and can its result explain what happened? Record concrete findings rather than claiming automated play proves intuitiveness.
- [x] Fix findings and rerun affected paths. Do not move on merely because one happy path or one test suite passes.

### 6. Apply the pattern across the whole mission

- [x] Extend the validated capability/action language, meaningful exchanges and method-specific choreography to scenes three through seven; track each scene individually in the decision matrix.
- [x] Build a coherent arc: early scenes teach, middle scenes combine lessons and earlier consequences, and the Index/depth decision tests preservation versus further opportunity.
- [x] Validate salvage recovery, crew degradation, command use, limited companions, voluntary extraction and forced extraction as part of that arc. No required mechanic should first become understandable only after its penalty occurs.
- [x] Reconcile story, forecasts, animations, mission log and endings for every changed consequence. Preserve checkpoint compatibility or explicitly implement and test migration.

### 7. Close against evidence, not a loop count

- [x] Add regression tests for changed rules and discovered bugs; run game tests, production build and diff checks.
- [x] Run full normal-speed missions covering successful Index extraction, deeper progression and failure, with contrasting choices. Inspect the resulting scenes and receipts, not just exit codes.
- [x] Perform a fresh whole-experience audit after rollout. Reopen and fix any high-impact issue, then repeat the affected checks; there is no preset number of loops.
- [x] Update the quality guide, decision matrix and this checklist with implementation references, verification evidence and honest coverage limits. Separate future human-validation questions from unfinished implementation.

Execution rule: work in order, and continue to the next open item after verifying the previous one. The first-two-scene milestone is a rollout gate, not the end of the task. Stop implementation only when this entire queue satisfies its acceptance checks or a specific necessary user decision/dependency blocks further meaningful work. Record that blocker and continue any independent in-scope work first. Do not silently drop items or declare subjective enjoyment proven.

## Completed queue — UX foundations

- [x] **Workspace composition.** Remove duplicate page chrome and reduce default route/plan scrolling through layout, not tiny text. At 1280×900, compare both routes and reach the crossing action without a long document scroll. Mobile retains accessible natural scrolling with no overlays covering controls.
- [x] **Selection ownership.** Scout, route, lead and encounter selections must look selected; disclosure controls only disclose; committing is one explicit verb. Check changing selection, returning from custom plans and reloading checkpoints.
- [x] **Whole-view hierarchy.** Audit setup, scout, report, crossing, encounter, result, workshop and ending. Remove duplicated summaries and competing banners; detailed explanations remain deliberately accessible.
- [x] **Consequences and stakes.** Forecasts and outcomes agree on actor, resource, known/unknown costs, companion help and command overrides. Exhaustion/extraction warnings appear before known irreversible loss; no hidden outcome is spoiled.
- [x] **Interaction and motion.** Keyboard focus, dialogs, reduced motion, consecutive beats, final-result persistence and no layout jumps. Verify standard and advanced flows still work.
- [x] **Maintainability.** Give the changed workspace/plan components a clear owner; remove superseded rules in the affected area instead of accumulating contradictory overrides. Add regressions for discovered defects.
- [x] **Final independent audit.** Revisit every default view at desktop/tablet/mobile; run successful extraction and failure trajectories, test/build/diff checks. Reopen any failed item above and fix it before closing this queue.

## Evidence / discoveries

- Final audit, 2026-09-11: 110 tests across 21 files passed; current production build passed (existing shared-bundle size warning); `git diff --check` passed with line-ending notices only. Browser runs used isolated storage, not the human tester's checkpoint.
- Three viewport passes (390, 768, 1280 wide): setup, scout, route, alternate leads, custom crew, result, expanded repairs, withdrawal ending, encounter, companion and report. No horizontal overflow or browser exceptions. Desktop route buttons and Cross now are additionally checked against the actual 900px viewport, not just full-page screenshots.
- Final interaction pass: visible briefing/settings disclosures; Standard/Simple switch; Rules keyboard trap and restored focus; reversible scout/route/lead choices; same-route command retention; checkpoint resume; custom lead/support/method crossing; calculation-dialog Escape/focus restoration. Automated game tests retain Expert and full seven-scene coverage.
- Final normal-motion runs: 49 choice clicks / 13 action sequences to successful Index extraction with five salvage; 44 choice clicks / 11 sequences to crew-energy failure after four crossings. Final screens persist until player acknowledgement; no timed auto-navigation. Runs cover sampled policies, not every mathematical combination.

## Implementation ownership

- `RouteComparison.js` owns the shared route comparison; `LeadChoices.js` owns the optional lead alternative. Their local styles own their contents; `crossingWorkspace.css` owns their placement in the scene.
- `EncounterChoices.js` owns Simple response comparison. The detailed editor remains available without forcing its information into Simple mode.
- `crossingCosts.js` owns receipt attribution; `planStakes.js` owns known forced-extraction warnings. Never use hidden outcome magnitudes to make the forecast look more precise.
- `expeditionSetup.css`, `arrivalResult.css` and `fieldWorkshop.css` own their respective views. Superseded fixed plan/result/scout footers and stale SVG-icon selectors were removed in the touched area. The older global stylesheet remains; this was not a wholesale rewrite of unrelated game styles.
- `beatTiming.js` owns causal-beat pacing. Tests cover repeated beat kinds and persistent final acknowledgement.

## Human validation — not an unimplemented feature queue

Both implementation queues are closed against their documented checks. Do not call the whole game finished or infer that automated play proves it is fun. Reopen a concrete item when testing provides a reproducible problem.

- Can a fresh player predict what selection versus Cross now will do without coaching?
- Does the shared cost/reward comparison make the uncertainty trade-off worth considering?
- After a crossing, can the player connect the receipt to the creature's action and the route taken?
- Does normal-speed pacing feel deliberate rather than repetitive over a whole mission? Audio feel and low-end hardware smoothness still require human/device validation.

Future updates should record the observed problem, expected behavior, implementation, and verification evidence. Do not close an item merely because tests pass or a chosen number of review loops elapsed.

- Workspace: default desktop route board and Cross now fit in the 1280×900 viewport; enforced by bounding-box assertions, not full-page screenshots alone. Terrain is optional. Mobile uses normal non-overlapping flow.
- Selection: isolated browser test verifies scouting/route/lead selection does not spend resources, selecting the same route preserves command choice, Rules retains/restores keyboard focus, and a completed crossing resumes with identical resource values.
- Further audit: repaired workshop icon-grid overlap after the SVG migration; compacted the persistent result receipt; corrected gantry/catwalk narration to agree with their next-sector effects. Numerical balance unchanged.
- Fresh full-speed runs: five crossings and voluntary extraction with Index plus five salvage; alternate-lead run exhausted the crew after four crossings with correctly explained failure. Both used the revised workspace and encounter controls.

- Initial audit: a 1280px route screenshot is over 2000px tall with duplicate page and scene headings, a full-width map above comparison and plan, and a fixed commit bar over content. The page is still composed as a vertical report despite the wizard direction. Prior 107 passing tests do not cover this experience criterion.

See LONG_RETURN_NEXT_QUALITY_PASSES.md for historical loops; its completed batches are not completion of this queue.
