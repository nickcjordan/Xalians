# Long Return — active experience backlog

Owner: the agent maintaining the Long Return worktree. Update this file during implementation, not just at handoff.

## Active goal — full-mission UX (2026-09-11)

### September 18: low stability connects directly to field repair

- The optional-depth fork now shows a thin stability reserve, but a player with salvage still had to infer that the separate repair disclosure above could improve it before choosing. When a brace is affordable and unused, the low-reserve cue now offers a small “Repair before choosing” action inside the deeper option. It opens the existing field workshop as a reversible view, without choosing a route, consuming salvage, or promising that a repair guarantees success. If the crew cannot brace, the salvage is insufficient, or field work is already used, the action is absent. The existing once-per-crossing repair and ending rules are unchanged.
- The new browser path opens that workspace from the depth fork and asserts resources are untouched, choices are in view, and play can still complete. A 390-pixel full-mission replay showed the repair choices in the current viewport after the tap; the 1280-pixel replay did likewise. The lazy game route grew 419 bytes over its 337 kB raw allowance, so that one route-only raw limit rises 1 kB; gzip and initial-route allowances remain unchanged. All 1,334 web tests, typecheck, local production build and bundle gates passed. Human interpretation remains open.

### September 18: the optional-depth fork keeps the actual reserve in view

- A full-mission replay with deliberate energy conservation reached the seventh crossing with healthy crew energy but exhausted the annex's last stability. The final lead screen correctly warned of forced extraction, yet the earlier optional-depth fork emphasized a possible salvage ceiling without locating the thin structural reserve beside the decision to go deeper. The fork now shows a small, cause-aligned stability or ready-crew cue only when that reserve is thin relative to the crossings remaining. It promises no unknown cost or safe outcome. The redundant generic “next stakes” strip is removed when the leave/deeper choice is already present, while the pre-Index and terminal states retain their guidance.
- Published-path audits reached two distinct forced endings: no-scout play lost stability after five crossings; scouting with energy-conserving field work reached the lift after seven crossings but lost the last stability. A fresh local seven-room replay passed, and the 390-pixel depth choices after scenes five and six were paint-reviewed with three and one stability remaining. All 1,332 web tests, typecheck, production build and unchanged bundle budgets passed. This clarifies the risk at the decision; it does not establish human acceptance or claim those two particular policies complete a full deep retrieval.

### September 18: route costs name the creature they assume

- The shared route comparison projected each approach using a specific suggested lead, support and technique, but named none of them until the player clicked through to lead selection. The fixed-cost caption also implied the amount belonged to the route regardless of who led. Each Simple route header now shows the projected lead with the same numbered crew marker used on the site map; the button says Pick lead and its accessible name states the preview assumption. Generic “fixed cost” captions are removed while physical cost causes, uncertainty, ally savings and on-demand analysis remain. Changing a lead, returning to routes and choosing again updates the named projection without spending resources. Detailed modes are unchanged.
- Rendered 320×568 and 390×667 full-phone missions and a 1280×900 two-scene replay. The first energy comparison remains in the initial 320-pixel route viewport. The 390 and desktop screenshots show the projected lead beside each route and the corresponding numbered creature on the map. Route/lead/back tests at 390, 768 and 1280 verify the named projection follows the player's changed lead; a full-mission check verifies the route opens with the creature whose costs were previewed. One legacy QA script needed its resource comparison normalized across the parent map and compact inset; the state itself was unchanged. Player judgment of whether this makes the forecast's assumption sufficiently obvious remains open.

### September 18: a route shows when its known cost ends the expedition

- The depleted-crew route comparison showed that a lead would run out of energy, but did not connect that loss to the mission's failure rule. The Simple shared comparison now attaches a compact forced-extraction cue to the energy or stability cell that *causes* a known ending; it adds no new banner or row. A route without a known forced ending stays unmarked, and concealed costs are not assigned a fabricated amount. The player can still change the lead and see a different plan before committing. Advanced presentation and resolution rules are unchanged.
- The existing forecast wrongly subtracted companion help whenever an ally was ready, even on an unresolved route where the comparison cannot promise that help. Its first correction was too pessimistic: an ally might still save the last energy. The final warning uses capped known costs but asks whether the ending remains forced even with the best help a ready ally could provide; otherwise it leaves the outcome unknown. A two-ready/one-spent checkpoint was rendered at 320, 390 and 1280 pixels: the predictable route alone displayed “Forced extraction afterward” in its energy cell, and the unknown-cost alternative did not claim safety. Component tests cover the cause-aligned cue and both sides of the companion edge case. The lazy Long Return route grew just beyond the previous 336 kB local raw ceiling; its route-only raw allowance rises 1 kB, while gzip and initial-route ceilings remain unchanged. Player judgment of whether this consequence reads naturally remains open.

### September 18: the scout rejoins the crew before the next action

- A remote-reporting scout remained visibly ahead on the route map, but the next crossing record placed all three crew members at the approach without an account of their reunion. The crossing story now locates the waiting scout at a room-specific landmark and has the crew catch up before the lead acts. Route preview remains planning, so merely picking a route does not move anyone; scouts who returned physically do not perform a second reunion. This does not add a resource cost or change scouting/encounter rules. An energetic creature's scene-intro reaction now turns its attention to the next threshold instead of claiming it physically went there while the map shows the crew together.
- The follow-up map replay uncovered a separate state loss: the completed action record showed the trapped Hypnopet marker but omitted “Still trapped” from its key after the crew pinned the rig and passed. The record key now retains that outcome, matching the ordinary room map and the unresolved native state. Route-wide story and map component tests cover the reunion and trapped-state distinction. The 390- and 1280-pixel location replay passed remote relay, physical returns, a withdrawn encounter, and bypassing the trapped native; the remote-scout record was visually checked. Local production build and bundle budgets passed. Player interpretation remains open.

### September 18: the crossing result locates the whole crew

- The phone wizard focuses directly on the result after a crossing, leaving the room map above the viewport. The account and receipt said what happened but did not immediately show where the crew ended up. The Simple result now includes a small, stationary arrival trace between its headline and story: the chosen route, the actual room entrance and exit, all three crew markers together at the far threshold, and a separate diamond when a temporary ally is present. It uses the same place names as the room schematic and does not simulate creature movement. Advanced view and crossing rules are unchanged.
- A route-wide component test covers all fourteen entrances and exits, the three crew markers, and the companion distinction. The browser replay checks the trace against each room map at every result. Reduced-motion phone runs at 320×568 and 390×667, a seven-scene deep-retrieval run, a no-scout forced-extraction run, and a 1280×900 desktop run passed locally. The local lazy-route build grew just beyond its 335 kB raw ceiling, so its raw and gzip allowances rise by 1 kB; initial-route budgets remain unchanged. Player judgment of whether the trace closes the location gap remains open.

### September 18: the room diagram stays with the route choice

- On a phone, the wizard previously scrolled straight to the cost table after the player chose to compare routes. The actual site schematic was above the viewport, leaving only two generic miniature path cues in the column headings. Those cues could not show the sealed door and other shared obstacles accurately. The Simple phone comparison now carries a compact instance of the same room schematic directly above its two columns; A/B station marks join each visible route on the diagram to its column. The earlier full context map is hidden only in this phone decision, so the choice does not stack two maps. Desktop retains the full map beside the workspace; advanced presentation is unchanged.
- The inset uses the existing station, route, known-hazard, lasting-effect, scout, native and ally geometry. Previewing a column highlights the corresponding path or intervention without relocating the crew; shared obstacles still use one passage. Unreported hazards remain hidden. Removed the obsolete generic route-cue drawings. The tight 320-pixel heading now keeps the first resource comparison in the initial viewport with the diagram, using brief Known/Unknown state labels and a one-line Pick lead action; full uncertainty remains in the shared rows and on-demand analysis.
- Verification: local production build and bundle budgets passed. Browser replays at 390×667 covered all seven scenes and a complete deep retrieval; a 390-pixel map-review pass inspected both approaches and their stationary crew positions across the first three rooms; a three-room no-scout path retained unknown costs. A 320×568 run checked the first cost row remains in view and that only one room map is visible. A 1280×900 three-room run passed without changing the desktop context. Player judgment of whether the map meaningfully eases the choice remains open.

### September 18: archive preservation is a real choice, and the field diagram advances by stations

- The published phone comparison made the archive's careful-preservation route apparently superior on every immediate resource axis: zero known energy, less structural loss, and more salvage. The backup route's different one-use tool was not a clear reason to choose it. Preserving every readable plate now requires two units of sustained lead work, even when the crossing technique is otherwise effortless. Pulling the sealed backup remains quick but damages the chamber. The route comparison places the physical cause beside its energy number, and the crossing receipt itemizes it. The result still follows the original hazard and companion rules.
- The field record's crossing diagram now begins with the crew at the approach station, moves its markers to the obstacle when the technique begins, and puts all three at the destination only on arrival. These are discrete instrument states, not simulated character locomotion; the prose remains the account of what they actually did. An action test checks the stations at successive beats.
- Verification: the rebuilt 390-by-667 archive comparison showed preservation at 2 known energy / 1 stability / 5 salvage versus backup at 0 / 3 / 3 for the tested crew. Two otherwise-matched seven-room phone runs both completed deep retrieval; preservation banked 15 salvage, backup banked 12. Unit and route-receipt tests cover the added work. All 1,324 local web tests, typecheck, production build and local bundle budgets passed. Linux CI found the lazy game route 89 bytes above its 334 kB raw ceiling despite the local build passing, so the route-only raw allowance rises 1 kB; gzip and initial-route ceilings remain unchanged. Player judgment of whether the diagram and exchange now read naturally remains open.

### September 18: the reservoir choice has a visible reason to stay at the rim

- The published seven-scene phone comparison offered the same unknown hazard and known stability cost on both reservoir routes, while diving cost less known energy and paid three more salvage. For that crew, the rim route was visibly dominated even though its lower source difficulty counted as a strategic advantage in a data-only audit. Working the valves from the rim now causes no base structural disturbance; diving retains its two-point disturbance. The hidden charge-bloom hazard and all other costs remain unchanged.
- The rebuilt 390-pixel comparison shows a concrete exchange: the rim plan spends 2 known energy, loses 1 known stability and offers 6 salvage; the dive spends 1, loses 2 and offers 9. Both still show the unresolved extra risk without inventing a range. A paired seven-room replay kept the same earlier routes and final-ring choice, changing only rim versus dive: the dive ended in forced extraction with half its haul left behind; the rim finished a deep retrieval with 14 banked salvage. A rule test locks the structural-safety-versus-haul distinction. All 1,322 web tests, typecheck, production build and bundle budgets passed; player judgment of whether the exchange reads immediately remains open.

### September 18: scouting belongs to the room the crew is actually in

- The seven-room published replay showed the same generic “search for a way through” departure in the flooded access, archive chamber, reservoir retrieval and extraction rings. Each room now has a short physical scouting opening grounded in its own terrain. The no-clue beat stops calling every objective a “crossing”; it gives no false assurance that the path is safe. The energy annotation still sits on the scouting action, and sensed-but-unreported clues and native contact remain subject to the original information rules.
- A first seven-room replay caught “beyond the rig’s moving arms” at the archive door, which implied the scout had passed the locked obstacle before finding its trapped native. The opening now keeps the scout at the edge of the rig’s reach. The seven authored openings add roughly 0.7 kB to the lazy Long Return route, so its raw route budget rises 1 kB (333→334 kB) while initial and gzip budgets remain unchanged. All 1,321 web tests, typecheck, production build and bundle budgets passed. A rebuilt 390-by-667 seven-room replay covered every opening and temporary ally; a normal-speed 1280-pixel three-room replay covered the door contact and manual story handoff. The revised door record was checked beside its map. Player judgment of whether these openings make the rooms easier to picture remains open.

### September 18: field map symbols identify the actual party

- A phone render after the contact-map fix showed numbered crew dots and an unexplained green diamond beside the trapped Hypnopet. The field record now pairs each number with its creature’s name, marks a separated scout as ahead, and distinguishes a native contact (outline diamond) from a temporary ally (solid diamond). The key stays on the map, so the written account is not interrupted by another explanatory panel.
- A reduced-motion three-room no-scout replay reached the Xylum and Hypnopet records; the final Hypnopet phone render was inspected with both native symbols visible. CI caught an old geography test requiring the room description in the map's accessible name. Restored that description and trimmed only redundant labeling to stay within the page bundle budget. All 1,320 web tests, typecheck, production build and bundle budgets passed after the correction. Component tests cover crew, scout, contact and ally keys. Human judgment of whether the symbols read naturally remains open.

### September 18: field contact uses the schematic, not implied creature motion

- A whole-crew, no-scout replay found the field record claiming every native “emerges ahead.” That contradicted the actual scenes: Xylum shelters by a broken bearing, Hypnopet is trapped in the lock, and Ectoghoul guards a conduit. Each now has a brief, situation-specific crew-contact beat. The player still chooses the response; no attack or outcome is pre-decided.
- The contact map now stops the crew before the obstacle, rather than placing their markers inside the door before the encounter. The trapped Hypnopet marker sits within the lock itself. Field records use a larger, stationary schematic on phones, with a concise crew/scout/native key and a dotted scout trace; they do not animate creature bodies or turn the scene art into a faux film. The causal written account remains adjacent and persistent.
- Verification: all 1,319 web tests, typecheck, build and bundle budgets; a reduced-motion 390-by-667 no-scout replay through Xylum and Hypnopet; and a normal-motion four-room replay through all three whole-crew native contacts. The Hypnopet contact record was visually checked on a phone. Human assessment of map legibility and story rhythm remains open.

### September 18: the arrival shows when the annex can no longer hold

- A seven-room phone render reached one stability after the reservoir, then zero at the extraction lift. Both arrival receipts originally used the same calm cyan loss numbers, and the forced-evacuation explanation sat below the receipt. The existing result composition now carries the urgency: at one or two stability, the stability row is amber and says near collapse; at zero it turns red and names forced extraction. The result's existing status line changes to “Annex failing · evacuate now” or “Crew spent · evacuate now” when the mission cannot continue. No extra banner, rule change or delayed confirmation was added.
- The first paint review caught that the legacy hazard token resolves to green, so the low-stability cue now uses the actual amber lamp token; the second 390-pixel render shows amber at one stability and red at zero. A seven-room phone replay reaches forced extraction and checks the terminal headline and receipt, while the existing early-extraction path remains available. CI then caught an older test helper assuming every result says “Crossing complete”; it now accepts the evacuation status and explicitly checks it at the terminal result. The targeted file and all 1,316 web tests, typecheck, production build and bundle budgets passed after that correction. Player judgment of whether the warning feels timely remains open.

### September 18: a native encounter begins as a situation, not an attack

- The seven-room scout record repeated “intercepts the scout” for Xylum, Hypnopet and Ectoghoul, despite their different situations. The field record now gives each a short first-contact scene: Xylum is hurt beside the cracked bearing, Hypnopet is caught in the lock, and Ectoghoul holds its shelter. These beats establish why the scout must respond without claiming any creature attacked or predetermining the response. The fuller encounter description remains at the actual choice.
- All 1,316 web tests, typecheck, production build and bundle budgets passed. A seven-room phone replay reached extraction and rendered all three distinct opening beats; tests require every authored encounter to use its own first-contact text. Player response to the tone and pacing remains open.

### September 18: the scout finds a real clue before sending it

- A three-room replay showed a remote-reporting scout's field record opening with “Danger spotted” and “hidden danger,” postponing the actual physical clue until the next communication beat. The same clue now appears at the moment the scout sees it; the following beat shows how the signal carries it to the crew and which choice it affects. The schematic still marks the hazard only once the signal is sent. A scout unable to relay still cannot reveal a specific hazard until physically returning, preserving the information rule.
- All 1,315 web tests, typecheck, production build and bundle budgets passed. Tests distinguish the observation and communication beats, plus the unreported/physical-return boundary. An isolated three-scene phone replay showed the turbine's forty-second rotation in the discovery beat; vibration, telepathy, display and no-relay browser paths passed with their map positions and delivery states. Player reception of this pacing is open.

### September 18: reservoir retrieval keeps the lead in the right place

- A seven-room replay exposed a new location mismatch in the sixth crossing: the electric-vulnerability sentence said Hippochamp moved “toward the far side,” but the objective was to free a storage cell and bring it back to the rim. That same route also offers a remote snare method, so even “through the water” would be false for some leads. Electric exposure now follows the chosen room's actual geometry: flooded wreckage at the intake, the submerged cell at the reservoir, or collector machinery from the rim. No method, cost or hazard rule changed.
- The next replay caught a related temperature template saying “the passage advances” while the crew was retrieving that cell from a stationary housing. Cold and heat now describe what they do to a creature's movements without inventing a corridor. Route-wide susceptibility and temperature tests plus a targeted rim-side snare test cover the wording. All 1,315 web tests, typecheck, production build and bundle budgets passed. The rebuilt phone preview completed seven crossings through emergency extraction, and its reservoir account was checked against the unchanged energy and stability receipt. Player comprehension remains open.

### September 18: environmental weakness reads as part of the place

- The live intake report still said “electric exposure bears particularly hard,” a diagnosis rather than something a player can picture. The account now translates susceptibility to electric, psychic, chemical, metal, ice, dark and light surroundings into short physical details tied to the relevant passage. A second read caught a repeated “pull” and “charge” in the intake paragraph; those were tightened while preserving the distinction between the lead's energy cost and the unseen hazard's structural damage.
- A route-wide test covers all fourteen approaches with an environmental vulnerability and checks that no generic exposure announcement returns. All 1,313 web tests, typecheck, production build and bundle budgets passed. A rebuilt isolated phone preview replayed the intake and three-scene sequence; the final intake report was read alongside its unchanged energy/stability receipt. Player response to the prose remains open.

### September 18: effort is shown by the passage, not a repeated announcement

- The seven-room account audit found the same “By the time the work is done, the effort has taken its toll” sentence after almost every costly crossing. The route-specific exertion already describes what the lead is physically doing, and the adjacent energy receipt shows the cost. Removed the generic repetition without changing resource accounting, exposure, hazard or arrival events. A local three-scene phone replay of the rebuilt preview confirmed that each account now moves directly from the lead's action to its actual environmental and structural consequences; the running 4173 preview was an older build, so verification used an isolated 4180 preview.
- All 1,312 web tests, typecheck, production build and bundle budgets passed. A route-wide test guards against restoring the generic announcement. PR #390 merged and its frontend deployment succeeded; the published intake report was checked after rollout. Whether this reads naturally to a player remains open.

### September 18: the crossing account names the source of structural damage

- A no-scout intake crossing spent two annex stability solely because the crew met conductive brine, but the account blamed the flood wake. That made the physical story contradict the receipt. The crossing account now distinguishes the route's ordinary wear from extra damage caused by each unseen hazard. The brine jumps into submerged cabling and shakes the intake wall; the other six hazards have their own physical consequences. When both route and hazard contribute, the account names both in sequence. Scouting and resolution rules, resource amounts, and hidden information are unchanged.
- Replayed three no-scout crossings through brine, a turbine servo and the lock countermeasure at 390 by 667. Their field records now match their damage sources and unchanged numeric receipts. Tests cover route-only, hazard-only, combined wear and all seven stability hazards. All 1,311 web tests, typecheck and production build passed. PR #389 merged and its frontend deployment succeeded; the published site passed a brine-only crossing replay with the corrected account. Human acceptance of the account's clarity and rhythm remains open.

### September 18: the scout's signal and warning form one readable cause

- A seven-room alternate-response replay exposed a joined sentence in the field account: a visual signal ended with “from the entrance” and immediately ran into “One turbine...” without punctuation. The warning also said it “concerns race the upper catwalk,” treating a button label as a noun. The delivery now ends as a sentence and links the discovered condition to the choice it actually affects: “That warning matters if the crew chooses to race the upper catwalk.” The same phrasing works when a danger affects both approaches.
- The account now makes the communication benefit explicit: the crew can use the relayed findings without waiting for a return to deliver them. An unrelayed finding still stays unknown until the scout returns; no hazard identity, game cost or encounter rule changed. Tests cover visual relay, two affected routes, no specific warning, and silence. A three-scene alternate-response replay and a seven-crossing resource-conserving replay passed; their rendered field-record text was inspected across the reached hazards. All 1,309 web tests, typecheck, production build and bundle budgets passed. Human assessment of the story's naturalness remains open.

### September 18: opening schematic points to the first choice

- The first room deliberately opens at the site and objective rather than auto-skipping that introduction, but at 320 by 568 the scout options begin below the first viewport. The map's existing caption now offers a compact, touch-sized Scout choices jump on phones. It moves only the viewport and keyboard focus; it does not select a creature, spend energy or add a confirmation gate. The seven-sector schematic remains in place, and desktop retains its plain Site schematic caption.
- The first render wrapped the longer cue onto another line, pushing more of the map out of view. The shorter label fits beside Crew at Outer seal at 320 pixels and was paint-reviewed before and after the jump. The browser replay checks cue visibility, touch size, destination visibility and focus. A component test checks that jumping does not start scouting. All 1,308 web tests, typecheck, production build and bundle budgets passed. Player comfort with the opening rhythm remains unverified.

### September 18: route comparison is the next phone decision

- A 320-by-568 replay measured the first route action 809–861 pixels below the viewport after the player chose to compare routes. The map and full orientation had been read already, but the transition repeated them before exposing the actual choices. Simple mode now scrolls and keyboard-focuses the comparison table when route selection begins or is reopened. It does not commit a route or move the crew.
- Scroll review showed that focusing the table alone detached it from the room. A compact table caption now keeps the scene name and immediate objective directly over both approaches on phones; the full map and story remain immediately above for inspection. On the first scene, the route action now begins about 65 pixels from the viewport top. The browser replay checks the context, route action and keyboard focus in every reached room. The 320-pixel comparison and scene-two variation were paint-reviewed. A 390-pixel six-crossing extraction and 1280-pixel three-scene run passed, alongside all 1,307 web tests, typecheck, production build and bundle budgets. Whether the comparison itself feels intuitive remains a player judgment.

### September 18: entering a known room reaches the next choice

- At 320 by 568, the first scouting choice in each room sat below the full scene header and schematic. That context is valuable in the opening room, but the arrival beat already supplies it for later rooms. Entering scenes two through seven in Simple mode now scrolls and focuses the scouting decision on narrow phones; the stationary schematic remains immediately above for review. The opening scene still begins at its location and objective rather than skipping the first introduction.
- Render review caught the heading slipping behind the fixed app navigation after the first scroll adjustment. Giving the decision the same top clearance as the existing report and encounter regions keeps the question and first creature card together in view. In the 320-pixel replay the first choice moved from below the 568-pixel viewport to 128 pixels from its top in later rooms. The replay checks both heading clearance and first-choice visibility, plus keyboard focus. A 320-pixel three-room path, 390-pixel six-crossing extraction and 1280-pixel three-room path passed, as did all 1,307 web tests, typecheck, production build and bundle budgets. The opening-room choice remains below the first viewport; whether that introductory pacing is comfortable remains a separate player question.

### September 18: the next chapter begins where the player is looking

- Phone playthroughs exposed a transition gap after the field record: an encounter resolution or scout report appeared below the scene map, but the wizard returned to its top chrome. The player could miss the immediate consequence of the action they had just taken. Simple mode now scrolls to and keyboard-focuses the labeled outcome or report region on phones, matching the existing crossing-result handoff. The map stays immediately above for deliberate review; desktop and advanced modes keep their prior behavior.
- The replay now checks the actual phone viewport and focus at the resolved encounter and scout report, not merely the existence of those panels. A 390-by-667 three-scene scout run, 320-by-568 three-scene scout run and 390-by-667 three-scene no-scout run passed. The encounter-outcome and scout-report viewport captures were paint-reviewed. All 1,307 web tests, typecheck, production build and bundle budgets passed. Human preference for this handoff remains open.

### September 18: put the encounter response in the first phone viewport

- The 320-pixel scout encounter still began below a full scene objective and full campaign map. The first response was more than a screen below the top, so the player reached contact without seeing an action. During Simple encounter decisions, the map now keeps the local stations, crew/native/ally positions, known hazard, reserves and the room endpoints, while omitting the already-labeled seven-sector strip and route captions. The encounter itself supplies the temporary objective; the original scene objective and full map return at route planning. Guided, Standard and Expert presentation is unchanged.
- When an encounter becomes actionable on a narrow phone, the wizard scrolls and focuses its labeled response region. Its first choice is visible in the viewport with the native and encounter situation; the map remains directly above for review. Resolving the encounter returns to the normal result position. This is a local phase change, not another modal or cinematic animation.
- Verification: 1,307 web tests, typecheck, production build and bundle budgets passed. A 320-by-568 scout encounter and a 390-by-667 unscouted whole-crew encounter each reached three crossings. The browser replay asserts first-response visibility and keyboard focus at the active encounter, and checks scout versus whole-crew ally positions after resolution. The 320-pixel actual viewport capture was paint-reviewed. Whether a player prefers this focus handoff remains a human judgment.

### September 18: encounter choices inherit the scout's point of view

- A phone replay reached the Xylum response with a detached posture block. It used a registry word ("display") and asked the player to relate "likely to notice it first" to separate cost/outcome rows. Simple mode now places two short situation facts directly before the response choices: who spotted whom, and whether the crew can receive a signal. Surprise explicitly names its extra energy cost. The fuller original posture account remains in Guided, Standard and Expert modes.
- An unresolved response now says the route is still occupied, rather than the vague "danger remains." At 320 pixels, a known-hazard exclamation appended to a route caption wrapped onto a line by itself; the physical marker and map legend already carry that information, so the duplicate caption symbol was removed. The simple encounter's inherited vertical alert border was also removed after rendered review.
- Verification: 1,306 web tests, typecheck, production build and bundle budgets passed. Reviewed 390- and 320-pixel scout encounter captures and a 390-pixel unscouted whole-crew encounter. Both three-scene replay paths reached the next room. The replay now asserts a player-language encounter situation; its ally-position check was corrected to distinguish scout and whole-crew encounters. Whether a new player finds the trade-off immediate remains open.

### September 18: reported danger belongs in the field account and on the route

- A scout's field record still called a sensed hazard only "a hidden danger," forcing the player to wait for a later report to learn what the scout actually discovered. The account now identifies the physical clue and affected approach when communication reaches the crew. A scout without a relay does not reveal that information until returning in person. This preserves the information rule while keeping discovery in the causal story rather than adding a separate notification.
- The stationary site schematic now marks reported hazards on the actual affected route with a small warning symbol. The same mark persists through route planning, crossing and encounter records. Undiscovered hazards never appear. A phone replay exposed a related map-state error: after Xylum joined, the location still said there was contact ahead. Resolved encounters now release that state; the ally and helper remain visibly ahead with the scout until the group regathers.
- Verification: 1,303 web tests, typecheck, production build and bundle budgets passed. A 390-by-667 reduced-motion replay covered three crossings, a remote warning, scout encounter, ally recruitment and route selection; its field record and resolved-encounter screenshots were paint-reviewed. A contrasting no-scout phone run reached a six-crossing forced extraction. The browser replay now checks that a new ally is no longer labeled as an active contact. Player comprehension remains unvalidated.

### September 18: route-specific arrival headlines

- The Simple result opened with a generic severity headline even when the field record had just told a specific arrival. The result now promotes the first sentence of the selected route's authored arrival into its headline, followed by the remaining arrival prose without repeating that sentence. The severity label and resource receipt remain distinct, and Read the crossing again still contains the full account.
- A route-wide check exposed an isolated "The arms pause" headline. The door, catwalk, conduit, iris, Index plate and blackbox arrivals were tightened where necessary so their opening sentences stand alone and name the physical outcome. This edits narrative content only, not costs, hazards, route choices or map positions.
- The browser replay asserts that each reached result uses a specific headline and does not repeat it in the paragraph. A seven-scene phone mission and an alternate three-scene decode route passed; the first, third and final result screens were paint-reviewed. The component tests cover every route and supported method, including the full-account disclosure. Human judgment of the scene handoffs remains open.

### September 18: one clear action per route

- The route title and a second button below the shared cost table both advanced to lead selection. That made the title a hidden action and the lower button a duplicate. Each route now has one visible Choose lead affordance attached to its title; the footer is analysis only. The click still opens the reversible lead step and never crosses or spends resources. Hover and keyboard focus still preview the corresponding physical path on the schematic.
- The requested Why these costs control remains separate and noncommittal. A component test checks that reading analysis never selects a route and that each route has exactly one direct action. Five-width route/keyboard preview, 390/768/1280 lead flow, four reduced/normal-motion phone-control runs, and a seven-scene 390-pixel mission passed. All 1,300 web tests, typecheck, production build and bundle budgets passed. The 390-pixel comparison was paint-reviewed. Whether the next step now feels obvious to a new player remains a human question.

### September 18: read the completed field record as a chapter

- A hosted short-phone capture of the completed scouting record opened at its last beat, cutting off the beginning of What happened. The rewind control made recovery possible but treated the story's opening as an exception. The completed account now returns to its first beat; a small Continue reading cue appears only while more of the account is below.
- A 320-by-568 render exposed the deeper issue: the schematic and action footer left a tiny nested prose viewport. On phones the field record now uses one natural scroll, from room schematic through the full causal account to the continuation action. Desktop retains its two-column map/account layout and internal story scroll. During playback the account can still follow the current beat; after completion it is ready to read from the start.
- The browser replay now checks that phone records have no inner scroll pane, that the continuation action follows the final beat, and that a short-phone scout account starts at the beginning with a working reading cue. Reviewed top and bottom screenshots at 320 and 390 pixels and a desktop record at 1280 pixels. Reduced-motion phone runs reached six- and seven-crossing endings; a normal-speed 390-pixel seven-scene run completed without browser errors. All 1,300 web tests, typecheck, production build and bundle budgets passed. Whether the rhythm feels like a story to a player remains open.

### September 17: the phone lead choice is a decision, not a hidden default

- A 390-by-667 replay showed only one full lead and part of the next while the crossing action occupied the bottom of the phone. The player could commit without seeing the third alternative. The choice cards now show the creature's approach and known energy/stability side by side, with a compact portrait and selected state. An action shared by all leads is not repeated in each phone card; creature-specific skill, ally contribution, limited tool use, and exhaustion warnings remain. The detailed lead/support energy split lives in See crew roles, not in every card.
- The action now follows all three lead choices in document order. Optional technique, command and crew-role details follow the action, so they no longer separate a decision from its verb. On narrow phones the action scrolls naturally rather than covering a choice. The route back action remains local and selections remain reversible until Cross now.
- Browser review caught two defects during iteration: an accidentally removed cost variable crashed render, and a temporary ally made the third card extend under the old fixed action. Both were corrected. Four 390/320-pixel, reduced/normal-motion interaction replays checked all three leads, back/reselect, the detailed cost split and a completed crossing. Seven-scene 390-pixel and six-scene 320-pixel missions checked every reached lead/action ordering and extraction. Desktop/tablet/phone lead replays, 1,300 web tests, typecheck, production build and bundle budgets passed. Screenshots were reviewed; whether a new player finds the choice intuitive still requires human evidence.

### September 17: physical route headings retain their map shape

- A phone route comparison could show the shared cost rows while its room schematic had already scrolled away. The route headings now carry a thin trace of the same upper or lower physical branch. This stays with the sticky headings during cost comparison and does not repeat the full map, crew key, or story. Rooms where both choices work on one obstacle show no split-path trace; inventing a second corridor there would be false geography.
- The first implementation was browser-reviewed at 390 pixels and found to be worse: the shared Button's SVG sizing reduced each trace to an icon and its automatic icon padding made route titles wrap. Corrected both, then reviewed 320- and 390-pixel rendered comparisons. The traces are legible, headings still fit the 390-pixel comparison-height budget, and the cost rows stay aligned. Unit and browser checks require distinct physical traces and no invented split for shared obstacles.
- Verification: 1,300 web tests, production build and bundle budgets, five-width route/keyboard replay, and a six-crossing 390-by-667 map-review mission passed. Human assessment of whether the small cue actually helps spatial comprehension remains open.

### September 17: one intentional visual language for field actions

- The current field record already uses discrete schematic positions and a persistent causal account, but the source still included two unused movie-like layers that animated creature silhouettes and route effects. Removed those dead components, their styles, and their unused presentation metadata. The art-direction guide now describes the actual plate, portrait, map, and written-account responsibilities and explicitly avoids performed creature motion without a real animation production pipeline.
- Added a transition regression that requires the live field record to contain the expedition schematic and crew tokens, not the retired performer stage. This cleanup does not alter game rules, action pacing, or the currently rendered map. The mobile route comparison remains a separate observed composition issue: the room map is above the cost table, so its preview leaves the viewport when the player reaches lower rows. A full pinned map has already failed phone review; this needs a compact, tested decision composition, not another overlay.
- A short-phone replay also revealed that the complete action account opened at its latest beat with its beginning offscreen. Added an in-context "Read from start" control only when earlier beats are above the scroll position. It pauses playback if needed, returns to the first beat, and keeps keyboard focus in the account. The causal stack and final Continue action remain in place.
- Verification: 1,299 web tests, typecheck, production build and bundle budgets passed. Reduced-motion phone mission replays at 320-by-568 and 390-by-667 reached a six-crossing exhaustion ending without browser errors; the 390-pixel replay exercised the new control and confirmed its scroll position and keyboard focus. Paint review found the first beat readable on return and a wrapped header at 320 pixels; the narrow label was shortened and reviewed again. Normal-speed crossing, scout and encounter records passed at 390-by-667, 390-by-900, 768-by-900 and 1280-by-900. Five-width route preview and keyboard checks passed. Human judgment of the schematic and narrative remains open.
- PR #375 merged and deployed; the hosted 390-by-667 mission replay exercised the reading control and reached the same six-crossing ending without browser errors.

### September 17: retired performer animation code stays retired

- The live field record uses a stationary schematic and cumulative account. Import tracing showed the old creature-performance terrain component and four movie-style animation stylesheets were no longer loaded anywhere; one test was their only remaining consumer. Removed those obsolete files and the unused curtain layout rules from the still-loaded story stylesheet. The route provenance test now checks actual schematic place and route labels instead of the retired terrain map.
- This removes source code, not a runtime feature or asset. A seven-crossing phone replay still reaches the same ending. Normal-speed crossing, scouting and encounter records passed pause, stepping, persistence and reading-space checks at 390-by-667, 390-by-900, 768-by-900 and 1280-by-900; the phone record was paint-reviewed. All 1,300 web tests, typecheck, production build and bundle budgets, and diff check pass. The user still needs to judge whether the schematic makes the action understandable.

### September 17: forced extraction is a retreat, not a teleport

- A hosted no-scout run took an alternate route through the exposed hull and blackbox. It reached zero stability at the Index, then the ending abruptly claimed unnamed emergency systems pulled the crew out. That did not follow the game's physical-journey presentation.
- The forced outcome now follows the previously opened passages toward the surface, with the Index retained or left behind according to the existing rule and the same salvage loss. If the final crossing has already reached the extraction lift, the crew uses that lift instead. The stability rule describes supports beginning to fail at zero, making immediate evacuation coherent without claiming the entire structure has already collapsed.
- Outcome tests cover crew exhaustion, pre-Index collapse and final-lift collapse. A no-scout alternate-route phone run forced retreat at the Index after five crossings; a contrasting seven-crossing run failed at the lift. Both rendered correct Index retention and half-haul settlement, and the final-lift ending was paint-reviewed. All 1,300 web tests, typecheck, production build and bundle budgets, and diff check pass. The pre-Index branch is covered by outcome tests, not a separate browser trajectory. Human acceptance of the retreat story remains open.

### September 17: the companion's goodbye is its own moment

- Rendered ending review found the resolved mission and Xylum's departure run together as one long paragraph. The end card now gives the farewell a separate prose paragraph in the same story region, with no new banner, modal or stat panel. The companion still leaves after the mission and does not become owned.
- The full-mission browser replay now checks that an ending with a companion has two story paragraphs and an ending without one has one. Five-crossing phone runs covered both states; the companion ending was paint-reviewed. All 1,300 web tests, typecheck, production build and bundle budgets, and diff check pass. Emotional impact still needs player evidence.

### September 17: voluntary extraction remembers where the crew turned back

- Ending audit found that leaving after the reservoir still said the depths were unopened, although the crew had completed one optional crossing. The voluntary-extraction account now follows the marked return route from the actual exit point: the Index fork or the junction beyond the reservoir. It names the lower area left unexplored without erasing the area already visited. The secured Index and banked salvage are unchanged.
- Local phone runs reached voluntary extraction after five and six crossings. Both ending accounts named the correct return point and banked their actual haul; the six-crossing ending was paint-reviewed. All 1,300 web tests, typecheck, production build and bundle budgets, and diff check pass. Player judgment of whether the ending feels earned remains open.

### September 17: arrival prose describes the map's current threshold

- Hosted phone replay after PR #369 revealed a mismatch at the optional depth: the map still placed the crew at the extraction fork while the arrival paragraph said they had already descended to the reservoir. The next optional room similarly put the map at the spine approach while the prose described travel into the chamber as complete.
- The arrival paragraphs now name the crew's visible threshold and describe the stair or final chamber as ahead. The preceding result still narrates how the crew reaches each threshold. No route geometry, resource rule or choice changes.
- Local and hosted phone paint review confirms both optional arrival paragraphs now match the named map entry. A hosted seven-crossing replay, 1,299 web tests, typecheck, production build and diff check pass. PR #370 merged and deployed. Human comprehension of the full handoff remains open.

### September 17: the later rooms have physical handoffs

- The scene-four arrival now brings the crew through the archive-side airlock, so the following scene's lit Index chamber does not appear abruptly after the exposed hull. The sheltered route also ends at that visible threshold.
- Both Index recoveries now end at the extraction fork after the optional salvage is secured. The marked route climbs home; the service stair leads into the optional depth. Choosing depth opens with the crew taking that stair, and both reservoir recoveries lead back to a dry junction before the Generator Spine. The final room begins with the crew following that passage. This changes narration and map description, not route costs or player decisions.
- Full seven-crossing phone replay and alternate Index-route replay passed; 1,299 web tests, typecheck, production build and diff checks passed. The blackbox result render was inspected. The schematic remains an instrument diagram, with stationary crew markers and no performed swimming or fighting. Whether a player can now picture every handoff is still a human-validation question.

### September 17: the field record remains a schematic, and the ending remembers the route

- Removed interpolated crew-token travel in the field record. The dots now change between named stations as still frames while the cumulative account supplies the action; a report connection appears only when communication occurs. This keeps the presentation in the approved diagram-and-prose language, not an improvised creature performance.
- Paint review at 390 by 667 exposed oversized route labels crowding the phone action schematic. Restored the intended small diagram type, kept route names in the phone decision comparison, and moved entry and destination names into a readable compact caption. A 320-pixel replay then exposed an inherited icon rule collapsing the actual room drawing to 16 pixels tall; the schematic now owns its height and the browser replay asserts the drawing's geometry. Earned path effects use a stationary code-art mark with a readable phone route caption instead of relying on tiny nested icons. Desktop maps keep the path labels; crew positions do not change.
- The extraction report now shows the seven-sector route actually traveled and the resolved arrival from the last chosen lead and route. The full journal remains available. This addresses the previous gap where only generic totals were visible at the finish; human judgment of whether the ending feels earned remains open.
- Verification: 320-pixel voluntary Index exit (5 of 7 crossings), desktop deeper forced exit (6 of 7), and normal-motion scout, crossing and encounter reading controls at 390, 768 and 1280 pixels passed. Actual phone/desktop map, record and ending PNGs reviewed. The final web suite passed 1,297 tests; typecheck, production build/bundle budgets, and diff check passed. The mission replay now checks map geometry, earned mark visibility, and the ending's visited-sector count. No gameplay math, hidden-information rule, or platform reward changed. Player comprehension remains unvalidated.

### September 17: the Index exit is a choice about the remaining journey

- Rendered review found the optional-depth offer presented +19 salvage beside the next room's name without saying it covered both remaining crossings. It looked comparable to already-carried salvage, although one was guaranteed on departure and the other was a journey-wide ceiling. The offer now says Up to, names the remaining optional crossing count, and separates returning to the surface from continuing into the next room.
- Extract now and Go deeper are explicit buttons below readable offers. Reading the heading or potential reward does not commit the choice; no extra approval gate was added. The Index remains secured either way, the current haul is named once, and forced-out retention/loss uses the existing settlement calculation. Zero loss is not drawn as a warning. The full rule, rounding, repairs and the option to leave after another crossing are in a deliberate disclosure.
- Used the UI guide's Button, token type and spacing. Removed the superseded extraction-card rules instead of layering new legacy overrides. Mechanics, route payouts, future hazard secrecy and advanced mode are unchanged.
- Verification: 1,290 web tests, typecheck, production build and unchanged bundle budgets. Actual phone/desktop choice and setup PNGs reviewed. Browser checks at 320, 390, 768 and 1280 pixels exercise both exit points, keyboard disclosure, no commitment from reading, and no resource change. Voluntary exits after five and six crossings bank exactly the offered 3 and 9 salvage. A deeper run reaches all seven rooms with 14 banked; a contrasting run loses stability and retains 9 of 18 through emergency extraction. These are sampled trajectories, not exhaustive balance or player-comprehension evidence.
- Follow-up: continue reviewing how expedition history and the ending communicate the chosen path, rather than assuming aggregate totals alone establish a satisfying conclusion. Human acceptance remains open.

### September 17: condition information belongs to the decision

- Replaced the map key's repeated scouting restriction with the universal Last energy condition, retained Can't act for spent creatures, and removed the nonurgent Weakened label from that persistent key. Conditions stay beside their creature on phones. Actual reserves and detailed readiness descriptions remain available.
- Scouting now names unavailable crew and its two-energy threshold at the choice itself. If nobody qualifies, No scout available replaces the invitation to select one, the impossible disabled selection button disappears, and Stay together is the sole primary action. This does not spend resources or change scouting rules.
- Lead choices explain an actual low-energy performance penalty beside the proposed action. A support-only penalty does not mislabel the lead. Existing method, ability, cost and last-energy consequences remain intact.
- Verification: 1,287 web tests, typecheck, build and unchanged budgets; seven-scene phone and desktop runs with all fourteen previews reached deep extraction with 14 salvage, 2 stability and the ally. Guided, Standard and Expert flows passed. A separate, explicitly synthetic checkpoint replay tests all-three-at-one-energy at 320, 390 and 1280 pixels, checks the sole viable action, inline conditions, unchanged reserves and lead penalties. Reviewed actual phone/desktop screenshots; corrected concatenated primary-button text found during that review. Checkpoint fixtures do not claim naturally played trajectory coverage.
- Player understanding remains unvalidated. Continue reviewing spatial/story continuity and meaningful choices; this is not acceptance of the whole experience.

### September 17: different approaches are not always different corridors

- The later-room audit found a spatial contradiction: the door, Index and rings used the same two-corridor drawing as the flooded crossing, implying the crew could walk around obstacles that both choices actually address. Those rooms now show one passage and a stationary target outline for the selected intervention. The door distinguishes unlocking from forcing its seam; the archive distinguishes preserving the chamber from taking its container; the rings distinguish alignment from timing the opening. The other four rooms retain their genuine alternative routes.
- Crew and contact markers share the obstacle's location in these rooms. Changing preview highlights the intervention but does not move anyone, spend reserves, reveal a native or resolve the action. Named thresholds, prior-choice effects and the persistent record remain connected. No creature performance or new gameplay rule was added.
- Encounter screenshot review found another causal mismatch: pinning the rig said the crew had already passed the obstacle while the door crossing was still pending. Its account now describes access to a still-closed door, with Hypnopet's distress continuing inside the rig. The story remains distinct from rescue and from the later crossing.
- Verification: 1,284 web tests, typecheck and production build/budgets. Seven-room phone and desktop runs previewed all fourteen approaches and reached deep extraction with 14 salvage, 2 stability and the ally. Eight contact/recruitment/return/bypass cases and four-size normal-motion story checks passed. Actual phone/desktop map, encounter and setup PNGs reviewed. Added assertions for shared passages, selected intervention, stationary crew during preview, unchanged reserves and the unfinished door crossing. Lazy route JavaScript remains within the existing limit at about 99.8 kB compressed; no budget raised.
- Next observed issue: low-energy crew keys repeat role-specific warnings such as Cannot scout after the scouting decision has finished. Review whether the current decision needs that restriction, while preserving visible exhaustion and the consequences relevant to the action being chosen. Player understanding and enjoyment remain unvalidated; this pass records implementation evidence only.

### September 17: earned consequences attach to their paths

- The comparison's technical event names still required the player to infer why they mattered. Its Next room row now names the exchange directly: easier upper walkway versus easier lower passage, and a door harder to force versus easier to unlock. The original event and its explanation remain in deliberate route analysis.
- On entering the affected room, the schematic changes that path's label to the earned physical state and places a small stationary marker on it. Dormant machinery, drained passage, recovered access code and tightened door seam are associated with the route they actually modify. This replaces the duplicate lasting-change footer for applied effects; newly created effects can still appear at their source. Narrative, mechanics and costs are unchanged.
- Regressions require both the earned run flag and the engine's applied route effect. Raw content cannot expose an unearned state. Browser replays traverse both route families through scene three at 390-by-667 and 1280-by-900, checking all four effects on their correct paths, no duplicate summaries, visible icon geometry and no browser exceptions. Reviewed actual phone and desktop PNGs. The phone pass exposed an inherited SVG-size rule; map markers now retain their intended viewport. Test geometry distinguishes the icon viewport from the smaller intrinsic ink bounds.
- Verification: 1,283 web tests, typecheck, production build and budgets; five-width route preview/keyboard checks; seven-scene short-phone extraction with a companion, 14 salvage and 2 stability. No human comprehension or enjoyment outcome is marked accepted.
- Bundle accounting: measured lazy route JavaScript grows about 0.9 kB raw / 0.3 kB compressed to 316.2 kB raw / 99.5 kB compressed. Restored this route's documented approximately five percent allowance rather than repeatedly raising the ceiling by a few bytes. Initial JavaScript and other routes' limits are unchanged.
- Next review: later-room schematic branches still share the same upper/lower topology even when the choice describes approaching a center or edge. Check whether stationary geometry and route labels communicate the actual alternatives without inventing a literal floor plan or performing creature animation.

Follow-through: PR #363 merged and deployed. Normal-motion screenshot review then identified the report caption touching the quiet-path marker. Separated those cues and added a rendered bounding-box regression to the four-size story replay. This is a layout correction, not a change to reporting or crew movement. The main schematic is now selected explicitly in the replay so decorative nested SVG icons do not make its size assertion ambiguous.

### September 17: compact story, map and route comparison

- Consolidated route orientation into the scene header beside the schematic. The illustrative scene paragraph remains intact; the duplicate objective and repeated route geography no longer precede the comparison. Each route's physical approach remains in its cost analysis. Other decision views and advanced modes keep their current context.
- Replaced the comparison's div grid with the shared semantic Table and Button components. Metric labels remain beside both routes on phones rather than becoming a separate full-width row each time. Costs, unknown totals, one-use sacrifices and lasting consequences remain comparable. Route headings stay visible on tall phone/tablet screens; short landscape screens scroll normally. The opening comparison fits within 640 pixels at 390 pixels wide, versus the previous roughly 880-pixel board.
- Tested and rejected keeping the full map pinned: it occupied too much of a short phone and obscured the comparison. Keeping the route headings instead leaves the diagram as the spatial introduction without turning it into an obstructive overlay. Browser testing also caught a sticky-heading overlap caused by the Table's scroll wrapper; corrected the wrapper and added a geometry assertion so the first cost row cannot be covered.
- Verification: 1,279 web tests, typecheck, build/budgets, five-width preview/keyboard/Back checks including 320 pixels and landscape; seven-scene 390-by-667 replay to deep extraction with 14 salvage, 2 stability and an ally. Responsive decision/results, Guided, Standard and Expert replays, and normal-motion story controls at four viewport sizes passed. Desktop and phone game/setup images reviewed. Human comprehension remains unproven.
- Removed obsolete comparison layout rules instead of layering new CSS overrides. Shared components and full-width requested analysis add about 1.0 kB compressed route JavaScript; generated utility CSS adds about 2.5 kB raw globally, while removed legacy rules save 5.3 kB raw and 0.95 kB compressed route CSS. Budget changes record these measurements; no initial JavaScript or other game allowance changed.
- Follow-through: deliberate route analysis was still squeezed into a narrow phone column. Each route now opens its explanation across the full comparison width, with one account open at a time. The disclosure preserves route selection and does not cross or spend. Its controls remain in their respective columns; no modal or extra approval step was added.

### September 17: route preview follows attention, not commitment

- The map updated only when a route heading was hovered or focused. Cost cells, the lower action and analysis controls did not preview their route. After returning from lead selection, the previous selected route also overrode the route being examined. This broke the connection between the shared comparison and the spatial diagram.
- The comparison now previews the column under deliberate pointer movement or keyboard focus. Leaving it restores the focused or selected route. The schematic names the preview and points toward the destination; it retains the actual crew positions and does not change selection, reserves, or hidden information.
- Browser replay caught scrolling a focused control into view triggering a stale pointer preview. Using deliberate pointer movement rather than incidental pointer entry prevents that conflict. Tests cover every comparison row, keyboard analysis, Back, selection preservation and unchanged marker coordinates at phone, tablet and desktop sizes. All fourteen routes have a named preview and direction cue.
- Removed the unused former RouteTradeoff component and its six obsolete rendering tests, plus unused icon aliases. The live RouteComparison and its known/unknown cost, companion and depletion tests remain; advanced views are unchanged. Existing styles still used by the advanced crossing flow remain. No bundle allowance increased.
- Verification: 1,278 web tests, typecheck and production build/budgets; seven-scene short-phone extraction with 14 salvage, 2 stability and the ally; the eight encounter continuity cases and three-width preview replay. Responsive decision/results and Guided, Standard and Expert modes passed. Desktop and phone setup/route PNGs reviewed. Implementation evidence does not establish player acceptance.
- Remaining observed presentation issue: on a phone, the map sits well above the lower comparison rows. This pass fixes correctness of the connection, not the amount of scrolling required to see both. Review that composition without adding a floating corner map or duplicating the comparison.

### September 17: encounter map continuity

- The next replay exposed a real report-handoff bug: a newly recruited companion moved back to the waiting crew when temporary encounter state cleared. Persisted the encounter context through report review and preparation. Scout, called helper and companion now stay at the contact site until the physical return or crossing, not merely until the player reads another panel.
- Passing the trapped Hypnopet was incorrectly drawn as removing it. The same diamond now remains as a neutral, labeled trapped native in the response, preparation, crossing record and arrival. Departed natives disappear; unresolved contacts remain; undiscovered natives stay hidden. Removed the redundant inline Contact label that crowded the destination, keeping identity in the existing map key.
- Whole-crew encounter resolution no longer sends the player around route selection again. It returns to the chosen route's crew plan. The crew stays at the encounter site while reviewing or changing the preview, rather than jumping back to the entrance.
- Added real-UI replays for remote reporting, direct healing and fetching a helper, across three scouts at 390 by 667 and 1280 by 900. They verify recruitment, report handoff, physical reunion, hidden contact boundaries, bypass and crossing. An additional unresolved-contact replay confirms that the native stays in its territory during report return and the other crossing. Seven-scene phone replay reached deep extraction with 14 salvage, 2 stability and the ally. Desktop and phone encounter record screenshots reviewed. All 1,282 web tests, typecheck and production build checks pass; normal-speed reading controls passed at four viewport sizes, and all advanced guidance modes and responsive decision/result checks passed. These checks do not establish player acceptance.
- Bundle accounting: this continuity work adds about 0.1 kB beyond the prior 98 kB compressed route ceiling after removing unused icon aliases and consolidating position construction. Allowed 250 additional bytes for this lazy game route only. No initial-page, stylesheet or other route ceiling changed.
- Next independent review: whether the visible encounter and arrival prose matches these persistent positions across the remaining retreat and unresolved-contact branches, without reintroducing performed creature animation.

Follow-through: PR #357 merged and deployed in run 35288327366. The additional whole-crew replay found an ally marker touching the lower route label. It now sits on the inward side of either route, with a browser geometry assertion against both route labels. The general mission runner also assumed that every encounter returned to route selection; it now accepts the direct crew-plan handoff. A no-scout seven-scene run exercised injured, trapped and territorial whole-crew encounters through forced extraction with the Index retained. Full 1,282-test rerun, typecheck, production budgets and the eight continuity cases pass; desktop and phone paint reviewed. The next audit should examine whether spatial previews communicate the crew's approach as clearly as their current position, not add more explanatory banners.

### September 17: compact scouting choices

Published in PR #355, deployment 35285363948. Hosted three-scene phone replay passed after deployment.

- Phone review found the scouting options still spent too much vertical space on separate identity, role and Select sections. Replaced them with compact, stable-height rows, fixed-size token portraits and an explicit selection mark. Awareness, reporting and trip cost remain visible together; encounter outlook appears only where relevant. Role detail stays in the cost disclosure. Selection remains reversible and never spends resources; Send remains the distinct action.
- Removed the retired row styles rather than layering another responsive override. Used the repository UI skill's existing Button, token typography and semantic color classes. Paint review caught the Button icon selector shrinking creature art; the shared image now uses the equivalent `size-full` utility so it is correctly distinguished from an icon. Removed three unused icon mappings to stay within the existing bundle budget.
- Verified stable selection height, loaded artwork size, keyboard selection and unchanged reserves at 390, 768 and 1280 pixels. Replayed physical scout return, four communication paths, checkpoint continuity, roster swaps and a complete seven-scene phone expedition: deep extraction, 14 salvage, 2 stability and the temporary ally. These are implementation checks, not player acceptance of the compact presentation.
- Next review: the persistent field record on a small phone, especially whether its map and latest story beat stay spatially related without excessive scrolling. Keep the schematic language and preserve rereading.

### September 17: reading space beside the schematic

- The next rendered audit found only 80 pixels of story-reading space on a 390 by 667 phone. The fixed field record reserved unused top padding and repeated the sector overview, while three playback controls wrapped into a tall footer. This was a real comprehension obstacle despite the previous 900-pixel-height checks passing.
- Reclaimed the unused overlay padding. During phone playback, show the local room, positions and crew key without repeating the global sector overview, next-room footer or lasting-change strip. Those remain in normal decision/result maps; the causal story and arrival still explain lasting effects. Desktop keeps the overview. Kept full-size prose, persistent rereading and visible continuation.
- Playback controls now share one stable row, with the single final continuation spanning the footer. Added small-phone minimum reading-space assertions for both playback and the persistent account, alongside pause, stepping, map and no-auto-dismissal tests. Seven-scene 390 by 667 replay reached deep extraction with the ally, 14 salvage and 2 stability. Full web suite: 1,280 tests. Typecheck, production build and unchanged bundle budgets pass.
- Further review: map contact and ally labels in later rooms, and whether the account remains clearly connected to each decision without depending on the field-record headline. These technical checks do not establish player acceptance.

Bring The Long Return to a human-validated, coherent full-mission UX. Preserve decision-based exploration and advanced detail mode. Player acceptance remains unproven, but independent implementation and auditing continue; this file records evidence, not a substitute stopping condition. The task is not blocked merely because human validation is pending.

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

### September 17: resources become part of the map key

- Removed the separate Simple header resource strip. The schematic's numbered crew key now also shows each creature's actual energy, with site stability alongside it. This replaces the duplicate crew-name list rather than adding another panel. Critical, spent and weakened restrictions remain visible in words; names never split mid-word.
- Removed the redundant next-room footer on the combined map, since the destination is already labeled in the diagram. The first objective now names that same turbine hall in everyday language. Existing story paragraphs, scout details and advanced guidance remain available.
- Header actions now have at least 44-pixel touch targets. Retired resource-strip CSS was deleted instead of layering mobile overrides. The new key uses design tokens and keeps the numbered relationship to the map accessible.
- Verification: 201 game tests / 1,278 web tests, typecheck and production build/budgets; desktop/tablet/phone screenshots and overflow checks; seven-scene phone extraction with temporary ally and depleted crew. Keyboard selection, checkpoint resume, repairs, roster swaps, physical returns and all detailed guidance modes passed. New viewport checks require intact creature names, one resource key inside the map, no duplicate header strip and touch-sized tools.
- Expanded replay uncovered obsolete QA assumptions: checkpoint result focus still expected the old header, and the technique script still required the removed creature-performance animation. The scripts now check the intended arrival focus and whole-crew schematic crossing/arrival instead. Those test corrections do not change gameplay.
- The default phone scout view is shorter and no longer breaks names, but still involves substantial scrolling through choices. This is a concrete remaining layout finding, not a claim that the phone experience is complete or player-accepted.

### September 17: a finding is not yet a delivered report

- The scout record counted only delivered hazards, so a scout that detected danger without a working signal was incorrectly described as finding nothing. It now distinguishes noticing something from reporting it. The waiting crew does not learn the hazard name or details until a real return or relay.
- Replaced raw communication labels in the Simple report and field account with registry-grounded behavior: vibrations through the structure, visible gestures, calls, or shared images and impressions. Telepathy is not spoken language. No communication capability, rule or cost changed.
- Removed an obsolete, CSS-hidden trip diagram and its unused gauge/styles from each Simple scout card. The visible compact choice remains unchanged, optional cost detail stays available, and tests now assert the visible summary rather than invisible duplicate markup.
- Verification: 1,276 web tests, typecheck and production build/budgets; seven-scene extraction with 14 salvage, 2 stability and a temporary ally; desktop/tablet/phone selection and result checks; normal-motion story controls at all three widths; physical return, checkpoint continuity and Guided/Standard/Expert flows. New browser coverage checks vibration, visual and telepathic delivery plus sensed-but-unreported danger, including map separation, lack of a false report line, and hazard disclosure only after return.
- Screenshot review confirmed the field record remains a schematic and persistent story, not a creature-performance animation. Remaining concrete presentation finding: the phone header wraps Hippochamp's name across a single trailing letter, and places substantial status content before the next choice. Revisit that compact header without shrinking map labels or hiding decision context.

### September 17: the map names places, not just progress

- The spatial audit found all seven rooms shared generic Entrance and Far side labels. The schematic now names each threshold, with every arrival matching the following scene's entrance, from the outer seal through the archive and optional depths to the surface lift.
- Added restrained stationary geometry for floodwater, turbine housings, a sealed door, broken hull, archive plates, a reservoir and concentric rings. These are terrain diagrams, not creature performances or a scaled floor plan. The existing route, contact and crew markers retain their state and hidden-information boundaries.
- A rendered later-room check found the ally silently following a solo scout. Established allies now stay with the waiting crew; a native just recruited by the scout stays beside it until physical reunion or the crossing. Added explicit position regressions and full-mission assertions for existing allies. Fixed empty SVG marker titles uncovered by the new render test.
- Verification: 196 game tests and 1,273 web tests, typecheck, production build, seven-scene desktop/phone missions, three-width decision/result replay and physical-return/contact/checkpoint checks passed. Full-mission replay now checks threshold continuity and SVG label bounds in every room. Normal-motion pause/stepping/persistence passed at all three widths. Final route gzip is 97.8 kB versus the 96.8 kB merged baseline; consolidated geometry and documented a targeted 1 kB route allowance. No initial bundle allowance changed. This is implementation evidence, not player acceptance of the diagram.
- The previous arrival handoff is published in PR #351, deployment 35279037759. Hosted three-scene replay, actual arrival focus/continuation bounds, and a full normal-speed seven-scene local mission passed after that merge.

Follow-up observation from the phone replay: the scout report still prints a raw communication label such as "display" below the creature name. Audit whether the report and its preceding field record convey the actual reporting behavior consistently without adding another explanatory block.

### September 17: from field record to arrival

- The full four-paragraph crossing story repeated immediately after its persistent field record. Arrival now leads with the physical destination and settled receipt; the complete account remains in a keyboard-accessible "Read the crossing again" disclosure. Old checkpoints without stored paragraphs retain their narrative fallback.
- Rendered review caught another handoff problem: continuation landed on the already-seen header and map. It now focuses the arrival region, with the map still available above. Removed the repeated artwork strip rather than reducing text size. Desktop continuation fits the actual 900px viewport; phone reading remains natural flow.
- Result receipts, resource-change cues, detailed readouts and new journal entries now report actual reserve loss, including depletion caps. Underlying effort calculations remain available separately. A clean result no longer claims that nothing was spent when a one-use ability was consumed.
- Verification: 193 game tests and 1,270 web tests on the final full rerun, typecheck, production build and bundle budgets. A shared lazy-portrait test exceeded its one-second wait during the concurrent first run; the unchanged full rerun passed. Responsive result, rereading, keyboard focus and unchanged-resource checks passed at 390, 768 and 1280 pixels. Seven-scene phone replay reached deep extraction with 14 salvage, 2 stability and the temporary ally. All detailed guidance flows and normal-motion story controls passed. This verifies the handoff and accounting, not player acceptance of narrative pacing.

Next review: spatial orientation and narrative comprehension across later rooms, including whether the compact room diagram communicates the approach without relying on route terminology. No expansion into performed creature animation.

### September 17: decision fit after the schematic

- The broader viewport audit caught a desktop regression: the taller spatial header pushed Cross now below the viewport even though all lead choices fit. This was a layout failure, not a need for smaller type or hidden alternatives.
- On desktop the commitment control now shares the decision-heading row above the full-width lead comparison. Back remains at the start, and advanced controls remain secondary. Phone layout keeps its existing reachable commitment order.
- The viewport replay now passes at 390, 768 and 1280 pixels across scouting, lead selection, customization, results, repairs, endings, encounters, companions and report review. All 1,266 web tests, typecheck, production build and bundle budgets pass. This corrects the observed clipping; it does not establish first-time comprehension.

### September 17: schematic field records and causal follow-through

- Shipped the approved schematic direction in PRs #343 and #345: labeled crew markers, connected route branches, a seven-sector overview, report signals, native contact and limited ally positions. Removed character-performance stages from scouting, crossing and encounter playback. Helper and scout remain distinct from the waiting crew. Hosted three-scene replay passed after deployment 35274707916.
- The next audit found crossing and encounter playback still presented isolated accounting events even though their resolved results already had authored stories. The field record now uses those same resolved paragraphs, with energy, structural loss, spent tools and salvage attached to the appropriate part of the account. Scouting retains the same causal pattern. No rules, rewards or hidden-information boundaries changed.
- Corrected an accounting mismatch: record annotations now show the actual capped resource difference, not a nominal cost larger than the available reserve. Crew support and companion contributions remain attributed; one-use tools remain explicitly unavailable afterward.
- Verification: 1,266 web tests on the refreshed main baseline, typecheck, production build and bundle budgets. Browser replay passed persistent story, pause, manual stepping and continuation at 390, 768 and 1280 pixels. Seven-scene phone and normal-speed desktop runs reached deep extraction with 14 salvage, 2 stability and a temporary ally. The normal-speed run retained all 17 records for explicit continuation, with reveal times of approximately 5 to 27 seconds. A separate six-crossing run reached forced extraction with the Index, exercising depletion rather than only success. Physical scout return, checkpoint continuity, non-relay contact and all three detailed guidance modes passed.
- Visual review found unsupported icon names and detached cost icons; corrected those before final replay. A further reserve audit found a nonacting creature displayed as fully rested because only lead/support changes were supplied. It now retains its actual current energy, with regression coverage before and after the record. These findings are implementation evidence, not player acceptance of the new spatial model or narrative pace.

Remaining review priorities: whether map positions make upcoming choices self-evident to a new player; whether long story beats remain comfortable on small screens; whether result review repeats more than it needs after a complete field record. Keep advanced detail available without rebuilding the notification stack.

### September 17 — full normal-speed replay and resuming the story

- Completed seven scenes without skipping action sequences at normal motion: 17 sequences spanning roughly 2–12 seconds each; Index secured, 14 salvage, 2 stability, temporary ally. No detected flow or asset errors. This verifies completion and control behavior, not subjective pacing acceptance.
- Follow-up review found Resume could leave the reader at an old scroll position while playback restarted. Resume and Next now rejoin the latest beat, covered by the read-back regression and documented in the quality guide.
- PR #324 deployed successfully in run 35229615314 at main 03f47d4. Published two-scene replay passed with story orientation visible. The additional resume-position correction remains a separate incremental change.
- 178 game tests and production build passed. Player interpretation of the revised narrative remains pending.

### September 17 — narrative reading time and read-back control

- Normal-speed audit found the inherited 2.4-second ceiling and 65ms-per-word estimate still applied to expanded story sentences. Longer beats now receive a bounded reading allowance; very short resource ticks remain brisk. Persistent text, skip and manual stepping remain available.
- Scrolling back through earlier beats now pauses playback rather than only stopping automatic scrolling. Reaching the bottom does not silently resume; the existing Resume control does that.
- Verified normal-speed two-scene replay (five sequences, approximately 3–12 seconds each), timing/read-back regressions, and production build. Reading pace is an adjustable starting point, not a claim about every player's reading speed or final immersion acceptance.

### September 17 — the record becomes something to bring home

- Continued narrative audit through the objective and ending. Scene five now identifies the Index as the surviving plague-research record, with visible plates and a sealed backup, not just unexplained equipment.
- Both retrieval stories turn reaching the archive into carrying its record home. Deep retrieval ends with the extraction lift and recovered record rather than an unsupported claim that every opportunity was exhausted. No reward or failure rule changed.
- Verification: 177 game tests, production build/budgets, and a complete seven-scene reduced-motion replay with temporary ally, 14 banked salvage and 2 stability. Inspected the ending render. Normal-speed narrative pacing and player immersion remain unaccepted.

### September 17 — follow-through: machinery hall to archive door

- The next continuity audit found the scene-two consequence still presented as an abstract signal/code. Its crossing now physically reaches the same door introduced in scene three: a sensor tightens its locking ring, or copied wall symbols match its controls.
- Scene-three arrival and decision orientation recall only the route actually taken. Simple arrival no longer repeats this as a separate memory notification; advanced consequence detail remains available.
- Replaced several control-system terms in selected-method narration with visible acts, keeping actor/method and existing mechanics intact. Simplified the door objective to its actual destination.
- Verification: 176 tests, production build/budgets; three-scene underdeck replay and seven-scene reduced-motion run (14 salvage, 2 stability, temporary ally). Inspected the scene-three arrival render. These prove functional continuity, not that the prose is human-accepted or that normal-speed pacing is satisfying.

### September 17 — player feedback: places must connect, not just costs

- The player could compare scene-two costs but could not picture either passage or understand why the crew needed to cross. The route view had hidden both scene orientation and physical descriptions behind earlier steps/disclosures.
- Arrival and route selection now share a short physical orientation for all seven scenes. Scene two recalls only the actual entrance consequence: quiet walkway crossing or the cleared drainage channel. Its goal names the far archive door.
- All fourteen route headers describe the physical approach in everyday language, without adding hidden danger spoilers or changing costs. The comparison remains shared; the story precedes it rather than becoming another notification.
- Verified 174 tests and production build; first-two-scene replays across both entrance routes and a 390px phone. A rendered review caught and fixed grid ordering that initially put context below the table; browser regression now enforces story-before-choice placement. Human narrative acceptance remains open.

### September 15 — player feedback: scouting needs a causal story

- Reopened from the player's published screenshot: five isolated statements separated energy from departure, duplicated report delivery, and retained dead playback controls after completion.
- Replaced scout narration with titled departure/search/communication beats, adding contact only when encountered. Actual energy and stability costs sit beside the trip that caused them. Physical return retains its separate delivery boundary.
- Scout continuation now sits with story controls; completed stories remove pause/step controls instead of disabling them. Earlier beats remain readable, and continuation remains explicit.
- Verification: 172 game tests, production build/budgets, physical-return/contact/checkpoint replay passed. Responsive persistent-story replay covers crossing, scouting and encounter controls. Player acceptance remains open.

### September 15 — published release review and acceptance boundary

Deployment `34987496761` completed successfully for main commit `46d4705bb0e3a5dcda940247605288c7d1a3270a` (PR #289). The published `https://xalians.com/long-return` passed both the physical-return/contact-report replay and a seven-scene run with 14 salvage and 2 stability. Static asset HTTP failures are now checked alongside JavaScript errors. Replays accept `LR_BASE_URL` so deployment validation does not silently test localhost.

| Required outcome | Inspected evidence | Still unproven |
| --- | --- | --- |
| Interaction clarity | Local keyboard/back/commit/checkpoint tests; published full run and delayed-report branch | Whether players predict each click without hesitation |
| Immediate trade-offs | Shared route comparison; depletion/uncertainty tests; rendered later-scene plans | Whether the full set of choices reads at a glance |
| Creature-driven choices | Lead/method provenance, support/temperament attribution, companion and helper tests | Whether choosing different creatures feels meaningful |
| Persistent causal results | Persistent sequence controls; crossing/report/encounter/recovery and ending replays | Whether the narrative explains causes naturally and is satisfying |
| Consistency across the mission | Seven-scene published completion, local alternate-response extraction, responsive and guidance-mode replays | Not every combinatorial playthrough has been manually inspected; overall player experience is not accepted |
| Preserved advanced detail | Guided/Standard/Expert manual assignment and recovery replays | Player preference for information depth |

This is a player-validation checkpoint, not completion or a reason to manufacture more changes. No new product defect was found in this published replay. The next necessary acceptance evidence is a current player run identifying any first hesitation or unexplained consequence. Independent concrete findings may still be addressed; no claim of exhaustive bug-freedom or human acceptance is made.

Previous continuation: progress (contact/report chronology, PR #289 merged). Current continuation: progress (published runtime/asset verification and explicit acceptance audit).

### September 15 — breaking contact is not report delivery

- [x] Retreat/mark options distinguish breaking contact from delivering intelligence. Non-relay descriptions no longer promise the crew has already heard a warning before the separate return action.
- [x] Encounter aftermath names the native's continued presence, not a return that has not occurred. Narrative branches on actual report delivery; relay-capable scouts retain immediate communication.
- [x] Browser replay uses Hippochamp's non-relay channel in the turbine hall to verify retreat, pending report, paid return and persistent trip receipt. Chromocat's display channel in that room correctly takes the immediate-report branch.
- [x] A full alternate-response mission reached forced extraction after six crossings with the Index and 4 salvage retained; no flow errors. 171 tests and production bundle checks pass.
- [ ] Player interpretation and full-mission acceptance remain unproven.

Previous continuation: progress (depleted preview correction, PR #288 merged). Current continuation: progress (encounter/report chronology correction and branch replay).

### September 15 — full phone mission and depleted previews

- [x] Parameterized mission replay viewport and captured every selected plan, not just route/result pages. Seven-scene 390×667 run reached deep retrieval with 14 salvage and 2 stability.
- [x] Final-scene inspection exposed impossible “spend 9 energy” previews for nearly spent creatures. Route, lead and alternate-technique previews now cap actual loss by each assigned creature's reserves, retain demand in analysis and expose exhaustion.
- [x] Selected plans now retain available-energy data, so their exhaustion warning is not lost when substituting the chosen technique.
- [x] Ally assistance still follows the existing rule, but no longer claims to preserve actual energy when the lead is exhausted either way.
- [x] Repeated full phone mission and short-phone normal/reduced controls pass; 170 tests and production build/bundle gates pass. No numerical gameplay changes.
- [ ] Full player-experience acceptance remains unproven.

Previous continuation: progress (mobile crossing control, PR #287 merged). Current continuation: progress (full-mission evidence and depletion-preview correction discovered in the final scene).

### September 15 — phone crossing controls and entry position

- [x] Phone lead selection keeps the crossing commitment visible with the selected creature named. Advanced customization stays outside the persistent area; critical crossing warnings remain attached to commitment.
- [x] Visual replay revealed that the scene header consumed most of a short phone viewport on entry. The lead substep now scrolls/focuses its local route/back section, preserving one transition without a second animated scroll.
- [x] Dedicated 390×667 browser replay covers normal/reduced motion, entry focus, visible back control, all lead changes, no-cost reselection, route back, and crossing. Full 390/768/1280 replay and desktop keyboard flow pass.
- [ ] Human judgment of the revised phone flow remains pending; technical reachability does not establish comfort.

Previous continuation: progress (essential label sizes, PR #286 merged). Current continuation: progress (persistent mobile commitment and replay-driven entry-position refinement).

### September 15 — measured essential-label legibility

- [x] Rendered audit found 8–9px resource identities, outcome labels and command instructions across several screens. Essential labels now have a 12px floor; action instructions use 14px.
- [x] Replayed and visually inspected the change. Fixed mobile name clipping exposed by larger text with compact body type and responsive cell spacing, not a smaller font.
- [x] Added rendered-font and resource-name clipping regressions to responsive replay. Optional `LR_AUDIT_TYPE=1` records remaining microtype for future review.
- [x] 390/768/1280 replay, Guided/Standard/Expert manual flows, 169 tests and production bundle checks pass. Desktop crossing remains reachable without scrolling.
- [ ] Human comfort and full-mission acceptance remain unproven; a font threshold is not acceptance.

Previous continuation: progress (delayed report receipt, PR #285 merged). Current continuation: progress (measured legibility correction and replay-driven mobile refinement).

### September 15 — delayed scout report continuity

- [x] Reports retain stability spent waiting as well as scouting energy, attached to the scout source rather than a new notification panel. Trip costs are explicitly separate from encounter costs.
- [x] Scan state records actual capped energy/stability changes; report generation retains compatibility with earlier checkpoints. A spent scout is not credited with spending energy it did not have.
- [x] Return choreography reflects depleted reserves rather than claiming a nonexistent decrement.
- [x] Dedicated browser replay covers non-relay scouting, physical return, persistent receipt, crossing and checkpoint resource continuity. 169 tests pass.
- [ ] Player understanding of delayed reports and complete-mission rhythm remains unproven.

Previous continuation: progress (companion farewell, settlement and mobile ending layout). Current continuation: progress (persistent scout-trip costs and actual-change narration).

### September 15 — returning from the expedition

- [x] Temporary companions now receive a farewell in the existing ending narrative, without implying ownership or inventing an intervention when they never helped.
- [x] When salvage is lost, the banked amount shows carried minus left-behind loot in the same settlement cell; no extra alert panel.
- [x] Phone replay exposed a generic 200px portrait minimum inflating every end-crew card. Scoped compact sizing removes the empty space and lets condition text wrap rather than truncate.
- [x] Extended 390/768/1280 replays through companion recruitment to withdrawal and settlement. Added a mobile card-height regression assertion and inspected the resulting phone image.
- [x] 168 tests pass. Full experience acceptance remains unproven.

Previous continuation: progress (companion/support cost attribution, PR #283 merged). Current continuation: progress (ending continuity, visible settlement and a replay-discovered mobile layout fix).

### September 15 — assistance belongs beside the decision

- [x] Route and lead energy previews now identify confirmed companion savings and the expenditure of its one intervention. Unknown, free and already-assisted cases do not promise a discount.
- [x] Visual replay found weak-skill/low-cost combinations still unexplained. Lead descriptions now identify the supporter when it raises the outcome tier, and the specific temperament response when it reduces energy use. Raw skill descriptions remain truthful; no balance changes.
- [x] Extended the 390/768/1280 browser replay through companion recruitment, report and lead selection; verified the saving remains attributable. Inspected the rendered desktop layout; crossing action remains visible.
- [x] 167 tests pass. Player acceptance remains unproven.

Previous continuation: progress (keyboard flow correction, PR #282 merged). Current continuation: progress (companion cost attribution and support/temperament causality found through visual replay).

### September 15 — keyboard and guidance replay

- [x] Replayed Guided, Standard and Expert with manual route, lead, support and method selection through crossing and field recovery. All passed.
- [x] Fixed the focused wizard header announcing the same decision for both route and lead views. It now names route selection, lead selection or custom planning accurately without adding visible clutter.
- [x] Updated the keyboard replay for the split flow: Enter to select/back/reselect, command retention, focus staying on a selected lead, explicit commitment, modal focus restoration and checkpoint resume all pass.
- [x] 165 engine/component tests and production build/bundle budgets pass.
- [x] Browser mission replays reached both exhausted-crew emergency extraction (6 scenes, Index retained) and deep retrieval (7 scenes, 14 salvage, 2 stability). These verify terminal flow continuity, not human enjoyment.
- [ ] Complete player experience acceptance remains pending; keyboard automation verifies behavior, not perceived clarity or enjoyment.

Previous turn: verified server availability and opened the playtest. This continuation: progress through guidance evidence, keyboard-flow regression coverage and an accessibility correction.

### September 15 — healing versus crossing techniques

- [x] Audited the current medic roster: every mending creature also has innate healing. Treatment remains available independently of crossing techniques; no numerical rule change justified.
- [x] Encounter detail now calls direct treatment innate healing, not a one-use ability. Regression test flags future mending-only creatures for an explicit rule decision.
- [x] Rescue narration distinguishes surprise before treatment from the scout's extra trip fetching a medic; the healer is not incorrectly charged in prose.
- [x] 165 tests and responsive encounter/companion flow plus build/bundle checks pass.
- [ ] Broader human validation of the route/lead flow and complete mission remains unproven. Continue independent UX auditing, not acceptance-by-test-count.

Previous continuation: progress (explicit helper identity, PR #280 merged). Current continuation: progress (rule audit and causal narration correction, with no speculative balance change).

### September 15 — explicit helper identity

- [x] Bind group aid, direct scout treatment, remote medic call and physical return to an explicit helper ID, never a substring in the button label.
- [x] Exclude spent medics from aid options using the engine's readiness rule; previews no longer offer unavailable helpers.
- [x] 164 tests, responsive encounter/companion flow and production bundle checks pass. Renamed-label identity, exhausted medic group and direct scout treatment covered.
- [ ] Audit whether spent one-use mending techniques should affect encounter treatment availability independently of innate healing; inspect existing rule contract before changing gameplay.

Previous turn: progress (available defender selection and layout fix, PR #279 merged). Current continuation: progress (helper identity and availability correction). Full player acceptance remains unproven; goal stays active.

### September 15 — encounter readiness attribution

- [x] Group encounter preview, animation and resolution share one actor selection that excludes spent creatures. Solo encounters retain their actual scout.
- [x] Cover every scene's strongest-defender replacement and exhausted-group boundary in dedicated actor tests.
- [x] Responsive replay caught a prior shared-energy row pushing Cross now below 900px desktop height. Integrate attribution into the existing cost column; replay now passes at 390/768/1280px.
- [x] 163 tests and production bundle gates pass. Encounter/companion/recovery/ending browser flow replayed; player acceptance still open.
- [ ] Continue audit of helper identity and encounter narration where treatment and surprise costs involve different creatures.

Previous goal turn: progress (focused recovery implementation, PR #277 now merged). Current turn: progress (readiness bug fixed plus discovered layout regression corrected). No external blocker asserted.

### September 15 — focused recovery outcome

- [x] Give resupply, bracing and relay construction a short persistent scene naming performer and sacrifice; retain exact exchange and optional breakdown.
- [x] Keep completed repair as the focused view rather than restoring the entire crossing above it. Review crossing is reversible and spends nothing.
- [x] 161 tests and build/bundle gates pass. Recovery replay at 390/768/1280px verifies focus, cancel/confirm, review toggle, matching receipt, checkpoint and no duplicate cost; desktop screenshot inspected.
- [ ] Continue audit of encounter-specific costs and narration, especially scout/helper attribution; no human acceptance claimed.

Previous continuation: progress (later crossing narrative fixes and full replay). This continuation: progress (persistent focused recovery result and verification). PR #276 merged; this recovery follow-up is separate.

### September 15 — later-scene causal results

- [x] Correct phasing breach stability prose: the release strains; no displaced door segments are invented.
- [x] Explain confirmed environmental effort through the surroundings (airless exposure, immersion, cold/heat), only when energy was actually spent.
- [x] Credit support when its score crosses a passage threshold; narrate extra supporter work when it spends energy.
- [x] 160 tests and bundle gates pass; seven-scene replay reaches deep extraction with 14 salvage and 2 stability. Reviewed final-scene result screenshot and replaced abstract medium terminology with physical description.
- [ ] Continue reviewing whether later encounters and recovery scenes communicate their causes as clearly as crossings; player acceptance remains open.

### September 15 follow-up — method interpretation audit

- [x] Audit every available method across all fourteen routes: traits and fallback moves must not both be described as a generic workable fit.
- [x] Describe source strength as a skill, not a guaranteed route outcome; final cost also depends on support, environment and reaction.
- [x] Attribute shared energy to lead and supporter when support spends energy, using the same companion-adjusted forecast.
- [x] 159 game tests, production bundle gates, and 390/768/1280px route/lead/reselect/ability/crossing checks pass.
- [ ] Next audit: test causal storytelling for support effort and environment changes in later-scene results, not only first-scene route choices.

Previous goal turn: progress (implemented and deployed two-step lead choice). This continuation: progress (corrected misleading method interpretation and attribution). Human acceptance remains unproven; no player-input blocker is asserted.

### September 15 — approachable lead selection

- [x] Separate route comparison from a visible three-lead choice; short directional transition and explicit Change route preserve the selected approach without spending resources.
- [x] Present approach, capability fit, and sacrifice in consistent rows. Hide anatomy/element provenance in optional technique details, not the primary choice.
- [x] Prefer reusable methods at equal ranked known cost before rewarding surplus crossing score. Intake current now suggests Hippochamp rather than needlessly spending Graviclaw's ability.
- [x] Selected ability overrides are reflected in the lead card. Companion savings and spent warnings use the same forecast as the route comparison.
- [x] Check phone/tablet/desktop flow, advanced detour, persistent transitions, and a seven-scene deep extraction (14 salvage, 2 stability). Automated evidence: `long-return-leads.mjs`, `long-return-viewport.mjs`, `long-return-mission.mjs`, and game tests.
- [ ] Player acceptance of approach clarity remains open; no claim that the overall experience is complete.

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
