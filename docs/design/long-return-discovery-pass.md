# Long Return discovery pass

Started September 24, 2026; experiments implemented September 25. This record separates confirmed design intent, implemented experiments, and interpretation of their results.

## Direction supplied by Nick

The central pleasure is participating in an exploratory story, choosing how creatures act, and experiencing the results. Deliberate choices matter, but numerical optimization should not dominate play. Internal numerical differences can shape outcomes without being exposed as comparative skill scores. The ambition is many meaningfully different adventures, including some variation when repeating choices. Different routes may reach the same destination and expedition objective while differing in events, discoveries, and consequences.

Preserve useful recent visual and intuitive improvements. No wholesale rollback. No platform integration or creature-contract changes are part of this pass.

## Scope and evidence limits

Compared Flooded Service Throat's gantry and intake routes through arrival in Blind Turbine Hall. Evidence is current checked-in content, resolution rules, narrative construction, and Simple-view components. No browser playthrough or player timing assessment was performed. The observations below establish implementation structure; their experiential interpretations need Nick's reaction.

## Worked comparison

| Aspect | Hanging gantry | Intake current |
| --- | --- | --- |
| Physical invitation | Stay above the water on a damaged suspended walkway. | Travel beneath the wreckage through the current. |
| Authored methods | Climb, leap, or cut a controlled path with a beam. | Swim, tow with a snare, or screen with a ward. |
| Local hazard | No listed route hazard. | Conductive brine, detectable through the configured sense threshold or electroreception. |
| Resolution | Crew crosses; method fit, condition, environment, and reaction shape costs and account. | Same resolution structure, with extra cost if the brine was not identified. |
| Authored reward | 1 salvage. | 2 salvage. |
| Persistent result | Quiet entry leaves the turbine bank dormant. | The crossing clears a coolant bypass that drains frozen fill from the underdeck. |
| Next arrival | Orientation acknowledges the quiet approach and still machinery. | Orientation acknowledges emergence from the flood and the draining side channel. |
| Next mechanical effect | Upper catwalk difficulty decreases by 5. | Maintenance underdeck difficulty decreases by 4. |
| Next available routes | Both upper catwalk and underdeck remain available. | Both upper catwalk and underdeck remain available. |

The underdeck contains a stranded Xylum encounter, but taking the intake does not uniquely unlock it. Either entrance can lead to that encounter. Both opening routes converge in the same next room, consistent with Nick's stated preference.

## Three review moments

### 1. An interesting physical choice becomes a cost comparison

The room orientation establishes a broken walkway and current through wreckage. The Simple route comparison then presents a proposed lead, known/unknown status, energy expenditure, stability loss, salvage, possible one-use tools, and next-room effects. Selecting a route opens another comparison of leads, with action descriptions and costs, before crossing. Alternate techniques and detailed crew roles are available in folds.

Interpretation to test: the game invites curiosity about a place, then asks the player to evaluate a resource plan. Hiding exact skill scores alone does not remove this shift. This is not a finding that all resource information should disappear.

The automatic plan selection also minimizes a weighted cost/risk score before other tie-breaks. Route recommendations deliberately abstain when consequences differ, so the opening is not simply recommending one route over the other. The stronger concern is how the options are organized and how the proposed creature methods are selected.

### 2. The intake produces a real, connected story consequence

The crossing account describes debris washing out of the bypass. Next-room orientation remembers that water movement, and the underdeck becomes easier. This is a concrete strength to preserve: action, environmental change, and later opportunity connect across a shared destination.

Interpretation to test: the consequence may still feel too much like a modifier because it does not create a different next event or option. That is a possible limitation, not proof that convergence is wrong or that every choice must unlock exclusive content.

### 3. Uncertainty currently means missing knowledge in this crossing

The brine is authored, and detection uses fixed creature senses. Crossing resolution uses score thresholds and fixed consequences. Given identical relevant state and choices, this crossing resolves identically. Clean or difficult execution changes effort and prose, but both routes still grant their assigned salvage and persistent consequence. Severe costs can force extraction afterward.

Interpretation to test: first-play discovery is present, but this slice does not implement Nick's desired possibility of a different experience on repeating the same choices. Adding random cost penalties alone would not establish richer adventure variety.

## Confirmed friction and working practice

Nick confirmed that the planning process interrupts the curiosity created by the scene. This confirms the experiential problem, not a particular replacement interface. On September 25, Nick explicitly instructed agents to continue authorized next steps without ending at a statement of intent or repeatedly validating direction. Continue discovery and concrete experiment preparation autonomously; do not treat proposals as approved redesigns.

## September 25: stranded Xylum comparison

Reviewed encounter option construction, response presentation, resolution, aftermath, and return to the crossing flow. This remains a source-based comparison, not a browser timing assessment.

| Moment | Implemented behavior | Interpretation |
| --- | --- | --- |
| Situation | An injured, defensive Xylum shelters around a cracked turbine bearing and blocks the underdeck. | A concrete situation creates a reason to care and act. |
| Creature contribution | A healing scout can treat it directly. Another scout with a suitable communication channel can call an available medic; otherwise it can return for one. | Creature differences change what the party physically does, beyond changing a score. Preserve this. |
| Alternatives | Scout can withdraw, leaving the encounter unresolved, or drive the native away. The full crew can aid it when a medic is available, force passage, or retreat toward the catwalk. | Different intentions produce different social and spatial results. |
| Response screen | Simple view uses columns for response, spend now, and what it offers. Aid is marked Recommended when available. Detailed response explanations are folded away. | The game again encourages evaluating a transaction. Aid can be both cheaper and companion-granting, so removing the badge alone would not create a balanced dilemma. No artificial penalty for kindness is proposed. |
| Resolution | A companion-granting option directly creates the ready companion; no recruitment roll is performed. The label nevertheless says Possible ally. | Apparent uncertainty is not implemented variation. |
| Aftermath | The account describes the response and companion. The aftermath panel prominently describes one automatic assist preventing the next 1 lead energy loss while crossing. | The narrative relationship is quickly summarized as a resource benefit. This may weaken the emotional payoff, although the story itself is retained. |
| Resuming play | Scout resolution returns to the report. A group encounter triggered while attempting the underdeck returns to assignment with lead selection active unless the party detours. Crossing is a separate commitment afterward. | A consequential interaction can feel like an interruption inside a preparation workflow. Clearing a native is correctly distinct from physically crossing, but that distinction need not require renewed preparation. |

This comparison suggests three separate causes to investigate: decisions organized around accounting, fragmented commitment and continuation, and limited outcome variety. The Xylum sample supports the first two structurally; Nick has confirmed the broader planning interruption, not every interpretation in this table.

Additional evidence: `EncounterChoices.js`, `EncounterAftermath.js`, `encounterPresentation.js`, `encounterSequence.js`, and `resolveEncounter`/`continueEncounter` in `longReturnGame.js`.

## First experiment brief: choose a creature action in the opening room

Status: implemented September 25 following Nick's explicit authorization to proceed with these and subsequent experiments in this discussion without repeated approval checks. Authorization to experiment does not establish player acceptance of the result.

Question: Does keeping place, creature, and intended action together preserve curiosity through commitment, while leaving players able to understand meaningful consequences?

Use the existing flooded entrance, roster, route rules, map, authored crossing accounts, and next-room memory. Change the organization of the decision only for the experiment. Keep scouting identical between baseline and variant so its effects do not confound this first comparison.

Baseline: read the situation, compare routes and projected resource costs, select a route, compare leads, then commit.

Variant: present the two physical approaches on the same scene with a creature action selected within each approach. For an eligible crew, a card could read "Have Hippochamp swim the intake" with "Lead everyone beneath the wreckage" and the known warning about charged water. Another could read "Have Chromocat climb the suspension frame" with "Keep the crew above the flood." These are illustrative combinations drawn from current methods; the prototype must use the actual selected crew and available methods, never promise an unsupported action.

Allow changing the creature or technique in place. Selecting a card previews its existing map path; a clearly named action button commits it. Automatic support may retain its existing behavior, with role details available. The player should not need to leave the scene for a second lead-comparison screen.

Keep meaningful known danger, exhaustion, forced extraction, one-use ability expenditure, and future effects visible beside the affected action. Keep exact calculations available on request. Do not disclose undetected hazards or guarantee safety. Preserve the persistent account, real crew positions, explicit story continuation, and the bypass/quiet-entry acknowledgement on arrival.

Review the baseline and variant with the same crew and knowledge state. Ask the player to state the intended action and expected tradeoff before committing, then describe what their creature did and what changed afterward. Observe whether they can choose from curiosity, whether they must reopen calculations to feel informed, and whether they can connect the next room to their action. Fewer clicks alone is not success.

Interpretation of results:

- If intention stays clear and consequences remain understandable, extend the presentation approach cautiously to the encounter sample.
- If players still experience excessive setup, examine scouting/report/encounter handoffs as the next independent experiment.
- If selection feels better but the outcome is still uninteresting, investigate authored outcome variety rather than continuing to compress the interface.

## Broader discovery sequence

1. Compare the baseline opening with the proposed action-centered variant.
2. Trace and review the Xylum encounter's commitment-to-crossing handoff, preserving the distinction between clearing an obstacle and crossing it.
3. Map full-mission variation by events, information, relationships, options, and resources. Do not equate a count of route combinations with a count of distinct adventures.
4. Specify a small repeat-play variation experiment only after identifying what kind of different event would be enjoyable. Random extra costs alone do not meet the stated ambition.
5. Build the implementation plan from observed improvements and remaining structural limitations.

## September 25 implementation and verification

Three bounded experiments are available in the local game:

1. The opening room's Simple view keeps the route, creature, and method in one scene. Selecting an approach previews it without moving the crew. Creature and technique changes expand in place, and an explicit action button commits. Known danger, demanding effort, spent abilities, exhaustion, and forced extraction remain visible; arithmetic is available in a disclosure. Command use remains available. The original flow is accessible through a comparison toggle. Guided and advanced views retain their existing flow.
2. After a resolved group encounter, the player can continue the crossing directly or change the plan. The chosen lead and method are retained when still viable; costs are recalculated against current condition. The continuation account resumes at the encounter location instead of replaying entry movement. Clearing a native does not imply that the underlying door or crossing is already complete.
3. An intermittent service signal can appear after the first crossing. Its presence is sampled once at departure, with a provisional equal chance of appearing or being absent, and saved with the run. Waiting costs one stability and reveals the next turbine's timing. Ignoring the signal leaves the ordinary route intact. Reading it affects both the next-room account and hazard knowledge, even when staying together rather than scouting. No permanent economy or creature records are involved. This is one proof of variable discovery, not a solution for the entire replayability ambition.

The original comparison toggle changes presentation and encounter handoff behavior; it does not reroll an expedition's already sampled signal. Existing regression scenarios explicitly exercise the original flow. New integration scenarios exercise the experimental opening, group continuation, and discovery across checkpoint resume. Separate discovery tests cover both sampled variants and the resulting hazard difference.

Verification: all 1,671 web tests passed, including 277 Long Return tests. Type checking and production build passed. Live desktop play covered intake selection, crossing, remembered turbine-hall arrival, the Xylum rescue, and direct continuation from the same location. A 390 by 844 phone pass covered in-place technique selection, command use, gantry commitment, and a naturally occurring signal discovery. The phone review found and corrected inherited clipping that made lower controls unreachable, a hidden room introduction, a truncated heading, and missing visible names in the map key. Tests establish behavior; they do not establish Nick's enjoyment.

## Full mission variation map

Source-based map of the current authored mission, including the bounded signal experiment. Each stage still leads to the next fixed stage unless the crew extracts. This is compatible with converging routes, but the distribution of distinct experiences is uneven.

| Stage | Different experiences currently supported | What persists beyond the stage |
| --- | --- | --- |
| Flooded entry | Above-water versus submerged work; creature methods; detected versus unexpected brine; intermittent service signal | Quiet or drained next approach, crew/resources, optional turbine knowledge |
| Turbine hall | Upper machinery versus underdeck; stranded Xylum; aid, confrontation, withdrawal, or detour | Door difficulty adjustment, maintenance information, possible companion, crew/resources |
| Archive vestibule | Unlocking controls versus forcing a seam; trapped Hypnopet on the controls route; rescue or bypass responses | Encounter outcome/possible companion and crew/resources; next main destination remains the gallery |
| Null gallery | Exposed vacuum versus sheltered conduit; territorial Ectoghoul interaction | Crew/resources and consumed tools; routes converge at the Index |
| Nemesis Index | Preserve plates versus recover the backup and abandon the chamber; extraction decision | Objective secured, haul, crew/resources, choice to leave or continue |
| Core reservoir | Work from the rim versus retrieve the submerged cell; extraction decision | Different recovery account and haul, crew/resources, choice to leave or continue |
| Generator spine | Stop machinery for the complete core versus take the exposed spindle | Different final recovery account and haul; common extraction destination |

Finding: the middle encounters create differences in relationships and action sequences. Much of the later variation is different work and resource exposure, with a common subsequent sequence. Multiplying seven binary choices into a route count would overstate experiential variety. The new signal tests whether an optional event that changes later knowledge is a useful additional kind of variation.

## What this pass establishes

- The opening can expose the same underlying creature methods without requiring a separate lead-selection page. Reducing navigation did not require removing the calculation system.
- An encounter can interrupt an attempted crossing and return directly to that work while preserving its spatial state.
- A saved per-run circumstance can introduce an optional event whose consequence is knowledge, rather than random additional damage.
- The first responsive layout attempt was not usable on a phone because legacy fixed-height rules clipped new content. Explicit scrolling is necessary for these experimental surfaces; shrinking labels to fit the old frame would undermine the intended experience.
- Human preference between the presentations and the desired density of optional discoveries remain unmeasured. No claim that the whole game is now coherent or offers hundreds of different adventures follows from passing these checks.

## Completed experiment assessment

Two further experiments complete this initial comparison set. Simple encounter responses now lead with intended actions and their story consequences, with exact effort available on selection and severe resource consequences still visible. The companion aftermath leads with Xylum joining the expedition and puts its exact automatic assistance in a disclosure. This changes presentation, not the underlying balance between helping and confronting a native.

The scout handoff now goes directly from an already delivered account to choosing an approach. A scout that cannot communicate remotely must still physically return before its findings become available. Resolving a scout encounter similarly avoids a duplicate report screen when the crew already has the report. Automated coverage distinguishes these two communication cases and verifies that a scout does not reveal a hazard it cannot detect.

Final verification: all 1,673 web tests passed, including 279 Long Return tests. Type checking, production build, and diff whitespace checks passed. The additional live phone pass completed the Graviclaw scout encounter, selected and committed Hippochamp's aid, received the companion outcome, and proceeded directly to route choice. The encounter controls remained reachable by scrolling. Legacy compact headers and route comparison surfaces outside the opening still need the broader presentation work described in the plan.

The completed assessment and ordered development work are recorded in [Long Return plan of attack](long-return-plan-of-attack.md). These five experiments establish working alternatives and concrete remaining problems. Their technical verification does not substitute for evidence of player enjoyment or claim that the full game redesign is finished.

## Implementation references

- `apps/web/src/components/games/longReturn/longReturnData.js`: opening routes, hazards, next-room adjustments, and Xylum encounter.
- `apps/web/src/components/games/longReturn/longReturnEngine.js`: `scanScene`, `applyMissionMemory`, and `resolveScene`.
- `apps/web/src/components/games/longReturn/longReturnGame.js`: suggested plans, recommendations, Simple flow, commitment, flags, and next-scene transition.
- `apps/web/src/components/games/longReturn/RouteComparison.js` and `LeadChoices.js`: visible comparison content.
- `apps/web/src/components/games/longReturn/crossingScene.js`, `crossingNarrative.js`, and `sceneOrientation.js`: action account and remembered arrival.
