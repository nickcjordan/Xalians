# Long Return active work

Status: ACTIVE. The implementation checklist was a milestone, not completion of the broader request. Updated September 25, 2026.

## Intended outcome and authorization

Make Long Return a coherent creature-led adventure: understandable physical choices, satisfying visible consequences, continuity through encounters, and differing experiences that can converge on the expedition objective. Preserve the recent visual storytelling improvements and internal numerical resolution.

Nick explicitly authorized continuing experiments without repeated approval, then clarified that their findings must lead into game fixes. The work now includes implementing and verifying the plan of attack. Completing discovery alone did not complete this request. No review meeting or additional design answer currently blocks progress.

## Completion contract

Continue through the five priorities in `long-return-plan-of-attack.md`. For this implementation pass, completion requires the continuous interaction across all seven scenes; creature differences explained without a universal best-choice ranking; a worked consequence chain across the opening three rooms; persistent variable circumstances with a visible later effect; and a full-mission pacing check with resulting fixes. Preserve optional extraction, meaningful warnings, existing creature facts, and local-only gameplay.

Verify the changed behavior with appropriate tests and browser play. Report subjective uncertainty honestly, but do not use the absence of player feedback to block reversible implementation. Hundreds of authored adventures are an aspiration, not a claim to make after this representative pass.

Do not close the task because one item is complete. If work is interrupted, record the exact next action here. A final response must account for every unfinished item and may not relabel the current phase as the whole task.

## Evidence and remaining actions

### Current checklist, reconciled with the original plan

Nick requested returning to the complete checklist after implementation drifted toward isolated content additions. The five priorities remain the organizing structure. Implemented examples and passing tests do not close the broader experiential questions.

| Original priority | Implemented evidence | Remaining assessment and fixes |
| --- | --- | --- |
| 1. Continuous adventure flow | In-place creature actions across seven scenes; direct scout and encounter handoffs; consistent map positions; responsive fixes | Review the entire ordinary loop for repeated introductions, acknowledgements, reading, and recovery interruptions. Establish whether the combined flow feels continuous, not merely whether each handoff works. |
| 2. Understandable creature differences | Physical action labels, creature portraits, senses and communication explanations, optional arithmetic, visible discovery techniques | Examine automatic method selection, which still favors numerical cost/risk; compare what different creatures actually let the player experience. Check whether techniques are meaningful alternatives or interchangeable score choices. |
| 3. Outcomes that change the adventure | Linked maintenance rescue, coolant consequences, surviving archive controls, reservoir discoveries, native reunion, remembered endings | Review every route and method for non-resource differences. Execution quality still primarily changes costs and prose. Address choices with an obvious mechanical winner, without arbitrary penalties for helping. Strengthen gaps before adding unrelated events. |
| 4. Varied, fair repeat play | Saved signal variants, coolant situation, beacon situation; checkpoint persistence | Compare repeated choices across circumstances and contrasting crews. Assess how often variation is encountered, whether it changes decisions, and whether surprises are understandable. The content catalog remains small. |
| 5. Expedition pacing | Several complete live runs; deep and early extraction coverage; repair use; consequence-aware endings | Compare curious, cautious, and familiar play explicitly. Measure meaningful decisions against scouting, reading, and upkeep. Technical survivability does not establish that exploration feels rewarding or that resource management has the right prominence. |

Cross-cutting preservation requirement: retain coherent spatial visuals, supported creature capabilities, hidden discoveries, meaningful warnings, optional extraction, and internal numerical resolution. Visual storytelling is only partly addressed; more prose or an ending memory alone does not satisfy it.

The next assessment should compare complete runs against these rows and produce a ranked issue list, rather than choose another isolated encounter to embellish. Use concrete moments, the interrupted player intention, and a proposed test for each finding. Continue authorized implementation from those findings without a new approval gate.

- Completed: five local experiments and source-based assessment. Previous verification: 1,673 web tests, type checking, production build, desktop and phone play checks.
- Implemented: creature-and-action selection across all seven scenes. The archive asks how to open the door, the Index asks how to recover the objective, and optional recovery retains its extraction decision. Encounter helpers, natives, and companions remain on the shared map. Changing a resolved encounter plan no longer returns to a separate lead-selection step.
- Implemented: scout choices stay in crew order and describe ordinary senses, special senses, available communication, and applicable traits. No recommended winner or generic awareness grade in the experimental flow. Undiscovered hazards and natives stay undisclosed.
- Implemented: the opening signal can contain an authentication release instruction. Combined with the underdeck maintenance code, it unlocks a controlled rescue at the archive rig. Neither clue alone unlocks it. The original turbine-timing discovery remains another possible circumstance.
- Verified: the selected circumstance persists across reload. A three-room integration test reads the signal, crosses the underdeck, resumes from the checkpoint, and uses the newly available rescue. Its account stays in the journal.
- Assessed: an unscouted, repaired run reaches all seven rooms but is forced out at the final crossing with the Index. Existing scouted/repaired coverage reaches successful deep extraction. The 80-run conserve/haul baseline spans five to seven crossings. These results do not justify removing resource pressure or promising every curious expedition a complete recovery. Preserved rules and visible severe warnings; fixed loss of encounter accounts from the final journal.
- Verified live: later-room scout explanations; phone selection and direct commitment at the turbine catwalk; accurate crew arrival; the locking-ring consequence in the archive; the same-door intervention choices. Earlier phone checks covered encounter and discovery scrolling. Browser returned to normal size.
- Verification: 1,677 web tests passed, including 283 Long Return tests; type checking and production build passed. The final targeted checks passed after the encounter navigation correction. Nick requested updating from main: fast-forwarded 10 commits to `14e53aff`, preserving all local work without conflicts, then repeated the full web suite, type checking, and production build successfully. Generation archive and species integrity checks passed as part of the build.

The previous checklist did not capture all identified work. Continue implementation and play assessment without waiting for another user prompt. Changes are local and uncommitted.

## Further implementation and full expedition assessment

- Creature portraits now select the actor in place. The technique selector contains only that creature's techniques, and committing the action uses the selected actor. Secondary ordinary senses appear when relevant, including Hippochamp's smell, rather than disappearing behind its strongest sense.
- Preserving the Index chamber keeps a physical control circuit alive. In the reservoir, it unlocks operating a dry console to collect charge. Blackbox recovery tears that circuit apart. Arrival, the map's lasting changes, available actions, crossing account, and ending acknowledge the difference.
- Optional-depth invitations describe the place below and the condition of the surviving controls. Extraction stakes and severe resource warnings remain available.
- A separate departure sample can put the gallery's Ectoghoul beside a repeating inspection beacon. Redirecting the light, stopping the mechanism, and withdrawing replace the territorial encounter's responses. The circumstance persists through resume, uses the same creature facts, and does not change crossing costs merely to manufacture variety.
- The ending recalls the companion, archive recovery or actual console use, and a distinctive encounter. New journal entries store outcome identifiers so copy edits do not change these memories. Existing local checkpoints retain a prose fallback.
- Full browser play: crossed all seven scenes, helped Xylum, freed the archive native, passed the territorial gallery peacefully, preserved the Index, repaired and braced during recovery, operated the reservoir console, and completed deep extraction. Final state: Index secured, 18 salvage, 4 stability, crew energy 3/2/1. Resource pressure required recovery choices but did not prevent the explored sequence.
- The full playthrough exposed a generic ending and mobile clipping. Both were fixed. The ending now recalls that run's Xylum, surviving circuit, and peaceful gallery. Phone verification reached the full mission report and its seven recorded crossings. The browser playthrough encountered the territorial gallery; automated integration separately covers the beacon circumstance and checkpoint resume.
- Verification after the beacon addition: all 1,684 web tests passed. After journal-identifier hardening, all 291 Long Return tests passed; type checking and production build passed, including generation archive and species integrity checks.
- A second live expedition replaced Graviclaw with Xylum and took the flooded intake, upper catwalk, pressure seam, beacon encounter, blackbox, and reservoir valves. Xylum remotely identified the opening's brine but had to physically return from the gallery. The beacon arose naturally in this new run and was visually inspected. Its response, return, crossing, and ending remained consistent.
- That run braced the annex before the Index, then deliberately accepted the displayed forced-extraction warning at the reservoir. It secured the Index and banked 6 of 12 salvage after six crossings, with stability zero and crew energy 0/0/1. The reservoir invitation, severed-cable arrival, missing console technique, and ending all reflected blackbox recovery. The ending correctly recalled the beacon and omitted the first run's companion and preserved circuit.
- The alternate crew exposed a misleading fallback action at the archive door: "Careful advance." It now says "Work at the old fracture," matching the existing physical account without granting a new creature specialty or changing its numerical resolution.
- Final full web verification after that correction: 1,685 tests passed, zero failed. All changes remain local and uncommitted; no deployment or platform cutover occurred.

## Continued implementation: situations and linked recoveries

The authorized work continued directly into content and presentation, without an approval gate:

- The underdeck now has a separately sampled coolant-sleeve situation. The same native can need mechanical relief instead of medical care. An available anchored creature can brace it; a creature with an unspent ward can shield the repair. Both let Xylum accompany the expedition. Isolating the upstream line instead lets Xylum retreat and unlocks a depressurized service-release method at the archive door. These are local machinery interactions using existing creature facts.
- Creature-specific encounter actions charge the selected actor, name that actor in effort details and exhaustion warnings, and consume a ward when used. Tests cover unavailable or spent helpers, scout-only access, companion persistence, ability persistence, and resuming into the newly opened door intervention.
- Draining the reservoir exposes a diagram of the final rings. That knowledge reveals their asymmetric closure even when the crew stays together. Recovering the submerged cell instead opens an action that powers the final ring controls, without automatically revealing the timing hazard. Arrival, crossing accounts, route diagrams, optional continuation, and the ending acknowledge the actual recovery and use.
- Beacon and coolant diagrams now show physical changes after a response. Redirecting the beacon changes the beam; stopping it removes the beam. The coolant jet disappears when the sleeve is secured or its line is isolated. No undiscovered native is exposed by these environmental drawings. Captions remain readable outside the scaled SVG on phones.
- Browser verification used isolated previews of the actual diagram and extraction components at desktop and 390-pixel phone sizes. This exposed small scaled labels, which were moved into normal-size captions and rechecked. Temporary preview source and its browser tab were removed after verification. The earlier complete live expeditions remain recorded above; the new content chains have integration coverage, not a claim of another complete manual expedition.
- Verification: all 1,696 web tests passed before the final actor-warning correction; all 303 Long Return tests passed after that correction, and type checking plus production build passed. Generation archive and species integrity checks passed. Existing 80-run route baseline still spans five to seven crossings. Test fixtures now fix their default circumstance sample; production expedition sampling remains variable.

The new circumstance weights are provisional local prototype choices. The work introduces neither permanent rewards nor platform integration. The added branches are described by their distinct events and consequences, without claiming that their permutations equal hundreds of authored adventures.

## Breadth and assessment limits

The concrete implementation and full-playthrough items above are delivered. The broader game is not declared finished. It still has seven authored scenes and a small circumstance catalog, not the breadth of distinct adventures Nick ultimately wants. The representative consequence chains establish a pattern worth extending, but multiplying flags alone would not establish that breadth.

The two live expeditions establish contrasting readable accounts, not replay breadth across the entire roster. The larger remaining design need is more authored situations and consequences across those crews. Existing resource pressure still makes some unfamiliar or costly runs shorter; the second run confirmed its warnings accurately predicted that limit. Do not present test counts, possible permutations, or these two expeditions as proof that the game is finished or that Nick will enjoy it. Continue from observed friction when extending the catalog; no approval check-in is required for the already authorized experiments and local fixes.

## Limits of this result

This is a representative implementation across the five priorities, not hundreds of authored adventures or proof of Nick's enjoyment. The controlled rescue is local prototype content using existing machinery and creature actions, not a new platform rule or a change to creature facts. Sampling weights remain provisional. Expanding the content catalog should preserve these causal differences instead of counting permutations as distinct adventures.

## Third full expedition and discovery presentation

- Played another complete live expedition with Graviclaw, Chromocat, and Hippochamp. The crew helped the injured Xylum, freed the archive native, stopped the gallery beacon, preserved the Index, pulled the submerged cell from the rim, and used that cell to power the final rings. Deep extraction finished with the Index, 23 salvage, 3 stability, and crew energy 3/1/0. The run used recovery operations and displayed the final actor's exhaustion warning correctly.
- The playthrough exposed premature reservoir payoff text, a misleading dive-only route title, duplicate decision maps, a discovered method hidden in a dropdown, and a missing stopped-beacon ending memory. Fixed all five. Choice previews now describe observable clues; the outcome still reveals what was actually learned or recovered. The route and setting now accommodate reaching the cell from shore.
- When a prior discovery unlocks a technique, its choice appears directly beside the ordinary technique, with a discovery caption. It replaces the dropdown rather than duplicating it. An isolated preview of the actual component verified switching both ways and readable wrapping at desktop and 390-pixel phone widths. Temporary preview files and the tab were removed.
- The ending now remembers stopping the beacon, and a prior maintenance-release rescue no longer suppresses a later gallery memory. The beacon circumstance also replaces inherited territorial arrival and disposition text.
- Verified the ordinary decision screen in the live game has one map and readable settled rendering. An initially dim screenshot was the entry transition, not persistent opacity.
- Full web verification before the final technique-layout and independent-memory adjustments: 1,700 tests passed; type checking and production build passed, including generation archive and species integrity. Subsequent checks are recorded below.
- Final changed-behavior verification: all 307 Long Return tests passed, including resumed coolant-release selection through the new visible technique controls. Changes remain local and uncommitted.

## Archive relationship continuation

- Fixed a content dead end: freeing the trapped Hypnopet now has a later reunion at the Index. Careful release, group rescue, and the learned maintenance release produce a psychic warning about the contaminant layer. Forcing the arms produces a wary sighting of the escaped native finding shelter instead. Pinning the rig, marking it, or bypassing it does not invent a rescue or reunion. Existing creature facts and the current companion remain unchanged.
- The rescue flag persists with the local checkpoint. Its information applies only at the Index, remains available when the crew stays together, and is remembered at extraction only after the journal reaches that room. The reunion adds no acknowledgement button.
- Live verification: resumed the ordinary annex-entry checkpoint, crossed the gantry, encountered the coolant variant naturally, isolated its line, observed the new door option, chose the authentication rig and freed Hypnopet, passed the gallery guardian peacefully, and met Hypnopet again at the Index. Stayed together, confirmed the known contaminant warning on both choices, stabilized the archive, and voluntarily extracted with 8 salvage, 4 stability, and crew energy 2/2/3. The ending recalled the reunion.
- Phone verification at 390 pixels exposed a clipped scene heading. Header controls now wrap below the full title across Simple mode. Verified the reunion, full heading, route warnings, and extraction report, then restored the browser viewport.
- The existing unscouted seven-room test now earns the native's warning and completes deep extraction at pressure 7 instead of being forced out at 10. This supersedes that earlier exact baseline, not the rule that costly runs can force extraction. No numerical tuning was used to produce the difference. The scouted recovery test now responds to both energy and structural needs instead of always choosing a brace; it still reaches deep extraction. Separate forced-extraction coverage remains in the passing suite.
- Verification: all 1,705 web tests passed, along with type checking, production build, and generation/species integrity checks. The unchanged 80-run route baseline still spans five to seven crossings. Local changes remain uncommitted and undeployed.

## Decision-loop assessment against priorities 1, 2, and 5

- Found and fixed player intent being overwritten by comparison: the game previously retained only one route's creature/method choice. Customizing the other route discarded it and reintroduced the cost-minimizing default. Each route now retains its own choice within the current scene. The experimental flow also retains the command setting per route without spending it on a different route. Integration and live browser checks verified switching both ways and committing the intended actor.
- Found and fixed a route disappearing after an encounter exhausted its chosen lead. The route remains available when other crew can act. The aftermath explains why the chosen action is unavailable and asks for a replacement action; it cannot silently commit a substitute. A controlled integration scenario exhausts Graviclaw during the coolant repair, retains both routes, chooses Hippochamp, and completes the original underdeck crossing with Xylum still accompanying the crew.
- Removed redundant scouting in experimental Simple mode when an earlier discovery already supplies every authored hazard warning and the room has no encounter. Entering that room leads directly to actions with the earned warnings intact and no scouting charge. Rooms with unresolved hazards or encounters retain scouting. Verified through the resumed native-warning expedition and full Long Return coverage.
- The repair view now keeps current crew energy and annex stability visible. Its existing compact CSS initially hid creature names; corrected that and visually verified the actual repair screen at 390 pixels. Restored the normal viewport afterward.

Controlled recovery comparison, using the same default crew, no scouts, route sequence gantry / underdeck / decode / conduit / stabilize / harvest / closure, and the same encounter responses:

| Policy | Crossings | Index | Repairs | End | Salvage carried before extraction settlement | Stability |
| --- | --- | --- | --- | --- | --- | --- |
| Keep the haul | 6 | Secured | 0 | Forced extraction in optional depth | 17 | 0 |
| Brace when available | 7 | Secured | 3 | Full depth, voluntary extraction available | 16 | 3 |
| Balance energy and structure | 7 | Secured | 4 | Full depth, voluntary extraction available | 14 | 3 |

This comparison isolates repair policy, not curious versus cautious personality, scouting policy, every crew, or player enjoyment. It shows the objective is reachable without repair in this sequence, while deeper recovery depends on reserves. The fourth repair did not improve this run's final crew condition. No blanket resource retuning follows from that result. The original cost/risk-based default proposal remains; this pass prevents it from overwriting explicit player choices, not a claim that default proposal design is resolved. Method-dependent narrative outcomes and broader repeated-run variety remain open in priorities 3 and 4.

Verification: all 1,710 web tests passed; type checking, production build, generation/species integrity, and diff whitespace checks passed. Local, uncommitted, and undeployed.

## Technique consequences and continuous room entry

- Priority 3: climbing the gantry frame can recover a loose service cable; leaping and cutting do not. Rough or critical climbing breaks it. The cable is separate from the structural suspension, and the visible clue appears with the climbing technique before commitment.
- The cable persists in the checkpoint and journal, then opens a crew response in either underdeck circumstance. It can hold the coolant sleeve while Xylum secures the collar, allowing the native to accompany the crew, or lift the bearing so an injured Xylum can retreat to shelter. The second response does not heal the native. Both leave the cable behind, spend no creature ability, and record the actual use for the ending.
- Priority 2: ordinary techniques now appear together as selectable actions, as earned techniques already did. The alternative physical clue is visible before selecting climbing. The initial proposal still uses the existing cost/risk default; this has not been mislabeled as resolved.
- Priority 1: experimental Simple mode now moves from Continue directly to the next decision. Room context accompanies scouting, and already-informed rooms lead directly to route choice with the native reunion visible. Removed one redundant Enter acknowledgement per subsequent room. Warnings no longer invent a scout when another discovery supplied the information.
- Live checks: climbed with Chromocat, carried the cable through reload, and used it to release the injured Xylum. Corrected the shortened result so it retains the native's actual fate. Corrected the discovery icon's width, medium-window receipt overflow, blocked panel scrolling, and fixed-height phone scout cards that overlapped their longer descriptions. Verified the new technique choices, intact discovery, merged room entry, and readable scout cards at 390 pixels.
- Verification: 1,716 web tests passed, including both cable encounter variants, failed recovery, save/resume, consumed-tool persistence, and the seven-room expedition. Type checking, production build, generation/species integrity, and whitespace checks passed. The controlled recovery comparison is unchanged. All changes remain local and uncommitted.

Remaining ranked assessment: compare the same route intentions across saved circumstances and different crews (priority 4); compare scouting-heavy and familiar play against the existing recovery baseline (priority 5); then address the initial cost/risk proposal and any further action pairs whose outcomes remain interchangeable (priorities 2 and 3). The new cable is a worked example, not a claim that the whole action catalog or replay variety is complete.

## Repeated-run comparison and resulting fixes

Nine controlled integration expeditions now compare the same route intentions across three circumstance samples, two contrasting crews, and three additional scouting policies. Each resumes after the second room and checks that established circumstances persist. Balanced recovery is allowed; this is not an optimal-play or every-crew guarantee.

| Crew / policy | Circumstance sample | Crossings | Repairs | Scouts / physical returns | Final stability |
| --- | --- | --- | --- | --- | --- |
| Graviclaw, Chromocat, Hippochamp / no scouts | .1 | 7 | 4 | 0 / 0 | 1 |
| Ectoghoul, Xylum, Hypnopet / no scouts | .1 | 7 | 4 | 0 / 0 | 0, forced extraction |
| Original crew / no scouts | .35 | 7 | 4 | 0 / 0 | 4 |
| Alternative crew / no scouts | .35 | 7 | 4 | 0 / 0 | 2 |
| Original crew / no scouts | .9 | 7 | 4 | 0 / 0 | 4 |
| Alternative crew / no scouts | .9 | 7 | 4 | 0 / 0 | 2 |
| Original crew / scout each available room | .35 | 7 | 4 | 5 / 0 | 3 |
| Original crew / remote scouts only | .35 | 7 | 4 | 5 / 0 | 3 |
| Original crew / Chromocat first | .35 | 7 | 4 | 5 / 1 | 3 |

All secured the Index. Sample .1 produced the coolant problem and beacon; .35 produced the paired maintenance instruction and ordinary encounters; .9 omitted the opening signal. These values select test circumstances, not player-facing probabilities. The two remote policies coincide for this roster because a remote option was available in each investigated room. Scouting changed available encounter responses, companions, and later actors. Different crews still often followed the same event structure, so this does not establish broad authored variety.

Findings led directly to these fixes:

- Default techniques: experimentally removing numerical tie-breaking changed crew assignments and endurance. The implemented rule is narrower: keep the safest crew pair and its energy, stability, ability use, and hidden-hazard quality constraints, then prefer authored method order among equivalent choices. A tiny score advantage no longer always preselects leap over climbing. Explicit player selections still win. This supersedes the earlier note that the proposal is entirely unchanged; it does not eliminate numerical safeguards or solve every technique distinction.
- Known information: scout transitions now distinguish following an earlier warning from newly discovering it. The reservoir diagram and native warning cannot masquerade as new scouting discoveries.
- Physical continuity: the opening diagram shows the loose or broken service cable; the underdeck shows the recovered cable holding the bearing clear after that response.
- Payoff: ending illustrations distinguish readable Index plates from the sealed blackbox, and the complete core from its memory spindle. Forced extraction only guarantees the Index, so it does not invent retention of the optional object. Current journals store route identifiers; older saves retain a route-title fallback.
- Powered controls: live play exposed that the recovered cell previously renamed manual alignment while retaining its difficulty and closing-ring hazard. Powered alignment now uses a provisional local target of 50 and prevents ring closure, while preserving chamber exposure and ordinary structural pressure. Forecasts, resolution, story, and selected-technique warnings agree. It does not grant knowledge of the hazard or protect other techniques. This is prototype content tuning, not a platform rule.
- Objective payoff: the phone layout hid the Index arrival story beneath the optional-depth decision. The recovered object now appears with that decision, before asking whether to leave.

The controlled three-policy recovery baseline explicitly retains its original gantry leap and injury-treatment choices, so it remains comparable despite the new initial technique ordering.

Live seven-room expedition: climbed with Chromocat, used the cable to release the injured Xylum, freed Hypnopet at the archive, passed the gallery peacefully, received Hypnopet's warning, preserved the Index, recovered the submerged cell, and used powered controls. The cell fix was applied before this run's final crossing; this was not a controlled two-run before/after comparison. Extracted with 20 salvage, stability 1, and crew energy 0/2/4. The ending recalled the actual chain and displayed plates plus the complete core. Phone inspection caught nested hidden scrolling in the ending card; replacing that nested scroll container with clipping restored access to the report and replay controls.

Verification milestone: all 1,733 web tests passed after the powered-control and warning fixes. A first full run exposed an outdated action-label assertion and an unrelated portrait-loading timeout; the assertion was corrected, the portrait test passed in isolation, and the repeated full suite passed. Type checking, production build, and generation/species integrity passed before the final objective-payoff markup. Its existing objective-extraction integration check now also asserts the visible recovered object and passes. Final responsive verification of that addition is in progress.

### Objective and short-phone follow-through

Completed the contrasting live route gantry / catwalk / pressure seam / exposed hull / preserved Index, with no scouts and no native encounters. Two braces kept the annex usable. Recovered the Index and voluntarily extracted with 6 salvage after five crossings. The ending did not invent the bypassed rescues or gallery meeting.

At 390 by 600 pixels, inspection found three additional problems and fixed them: the discovery receipt split into narrow columns; the new objective illustration exposed fixed-height clipping below the optional-depth decision; and compact styles hid low reserves while shrinking the invitation to 11 pixels. Discoveries now stack vertically, the objective decision grows within a scrollable panel, and its invitation and choices retain readable text with the low-crew warning visible. Child-position CSS selectors were replaced with named heading/options classes so adding the payoff cannot turn the heading into a choice grid. Verified both extraction and continuation controls, then extracted and restored the viewport.

### Route-pair review against priority 3

| Scene | Difference beyond price | Where it is experienced |
| --- | --- | --- |
| Flooded entry | Quiet machinery versus a washed-out lower passage; climbing can additionally recover or break the service cable | Next-room arrival and route conditions; underdeck response and diagram |
| Turbine hall | Upper route sends an alarm; lower route exposes the native and service markings | Tightened archive lock versus learned protocol and possible controlled rescue |
| Archive door | Rig work intersects a trapped native; pressure-seam work bypasses the trap | Distinct interaction and possible later native reunion, while either opens the same door |
| Null gallery | Exposed hull crossing versus working through an inhabited conduit | Space crossing and airlock arrival versus territorial or beacon interaction; no invented later penalty for bypassing it |
| Index | Readable plates and surviving controls versus essential blackbox and collapsed circuit | Illustrated recovery, reservoir access methods, arrival and ending |
| Reservoir | Timing knowledge versus a power source | Known closing interval versus powered alignment that physically prevents closure |
| Spine | Entire core versus its exposed spindle | Distinct crossing and illustrated retained object at successful extraction |

Within these routes, some techniques intentionally accomplish the same physical intention using different supported creature actions and different internal effort. A separate flag or reward for every method is not required to make those alternate ways meaningful. The identified empty promises were the cell's powered control and the objective's hidden payoff; both are fixed above. Climbing provides the representative execution-dependent discovery, including breakage, rather than making every successful crossing grant the same bonus. The route-pair review does not claim that the limited catalog now supplies dozens of distinct adventures.

### Checklist reconciliation

1. Continuous flow: complete seven-room and contrasting five-room browser runs, direct room entry, preserved actor selections, encounter continuation, and the new short-phone fixes cover the original implementation criterion. The original comparison flow remains available.
2. Creature differences: visible physical techniques, ordinary and special senses, communication limits, and optional arithmetic are implemented. Equivalent default techniques no longer depend solely on the tiny score difference. The two-crew comparison exposes the remaining breadth limit rather than treating different actor names as different events.
3. Changed outcomes: the first-three-room signal/code rescue and cable chain, subsequent reunion, archive circuit, and reservoir branches have observable later effects. All seven route pairs are accounted for above. The recovered-cell mechanical gap was corrected.
4. Fair variation: nine saved/resumed comparisons establish differing authored circumstances with unchanged resumed circumstances. They do not establish a large content catalog or cover every possible crew.
5. Pacing: fixed-intention repair comparisons, scouting policies, successful deep extraction, forced extraction, and a deliberate objective-only departure are exercised. Repairs remain consequential; no blanket resource retune was justified. The latest local cell adjustment corrects a specific discovery promise, not the expedition's overall economy.

The recorded implementation criteria have evidence across all five priorities. Subjective enjoyment, balance across every roster, and the aspirational scale of authored adventures remain unproven. Keep those limits distinct from the concrete fixes and checks above; do not call the game perfect or silently convert this record into a claim of that larger outcome.

Final verification for the changes recorded here: all 1,733 web tests across 131 files, type checking, production build, generation/species integrity, and diff whitespace checks passed. The short-phone objective and ending controls were verified in the live game. Changes are local, uncommitted, and undeployed. Temporary test-output files were removed after their results were recorded here.
