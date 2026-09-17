# Long Return quality passes — 2026-09-11

Work in order; preserve game rules unless playthrough evidence supports a change.

- [x] 1. Visual consistency: repeatable 390/768/1280px checks cover scout, route, custom crew, result, expanded repairs, ending, encounter, companion, and report. Fixed custom-crew minimum widths, tablet navigation overflow, cramped map labels, and narrow action bars.
- [x] 2. Cause and effect: persistent receipts attribute costs to effort, exposure, encountered hazards, temperament, support, and companions. Contributions are reconciled against every route/crew/method combination in tests.
- [x] 3. Pacing: resource beats shortened to 600ms minimum; discoveries get 1500ms minimum; long text can extend a beat. Fixed consecutive same-kind events stalling. Final outcome still requires explicit continuation; reduced motion remains supported.
- [x] 4. Meaningful choices: added known next-sector effects to the shared comparison; ran 80 controlled crossing baselines across all 20 crews, two policies, and mapped/blind intelligence. Existing full-game tests cover companions, repair, extraction, and failure. No speculative balance changes.

## Verification log

101 tests pass. Production build passes with the existing large-chunk warning. The viewport script runs against an isolated headless browser with fresh storage, leaving the user's saved game untouched.

Crossing-only baseline: conserving resources versus prioritizing haul differed in 39/40 paired cases; each policy crossed 5–7 scenes, with average collected salvage 24.35 versus 24.5. These figures exclude scouting expense, encounters, repairs, and banking rules, so they are not player win rates. They show that the nominal larger haul is not a universally better expedition strategy once crossing costs accumulate.

Human validation remains necessary for fun and perceived pacing; simulated viewports are not physical-device touch testing. This completes the four implementation passes, not a claim that the game needs no more iteration.

## Iteration loops — full-speed missions

- [x] Baseline: uninterrupted UI run with normal motion, recommended scouting and conservative route choices. Reached the Index, pushed deeper, then emergency-extracted after six crossings. No skipped animation beats or JavaScript errors. Exposed that the ending blamed the building when crew energy was the actual failure condition.
- [x] Change: optional in-place lead comparison. Each lead shows its technique, support and comparable known energy/stability cost; selecting it changes the real crossing plan without spending resources. Companion savings use the same calculation as the route board. Known depletion is flagged beside the lead. Hidden hazard amounts remain hidden.
- [x] Retest: alternate leads throughout a fresh normal-motion mission. Four crossings before energy exhaustion; ending correctly explains the cause. This deliberately suboptimal policy is a flow test, not a balancing recommendation.
- [x] Successful exit: fresh normal-motion mission, recommended leads, extracted at the Index after five crossings with five salvage. Voluntary extraction preserves the full haul and objective.
- [x] Visual correction loop: reviewed desktop/mobile captures; combined crew-role and technique analysis into one disclosure, fixed journal heading alignment, consolidated Simple-plan layout rules, then repeated 390/768/1280px checks including expanded lead choices.

Final automated checks: 107 game tests; production build; three-width browser audit. Build retains the existing shared-bundle size warning. Full mission evidence is written by `apps/web/scripts/long-return-mission.mjs`; use `LR_ALTERNATE=1` for alternative leads or `LR_EXTRACT=1` to leave at the Index. Browser runs use isolated storage and do not touch the human tester's saved run.

The final visual review found a further receipt inconsistency: voluntary abort before the Index displayed carried salvage as banked while its story said none was banked. Corrected the amount to match the existing abort rule, added a UI regression test, and repeated the three-width browser run with an explicit banked-salvage assertion.

Still worth human scrutiny: whether lead trade-offs feel compelling, whether optional details stay out of the way, and whether normal-speed transitions feel appropriately paced. Browser automation verifies progression and timing, not enjoyment. Broader legacy stylesheet consolidation remains future maintenance; this pass only consolidates the Simple-plan rules it touches.
