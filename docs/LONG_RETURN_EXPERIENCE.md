# The Long Return: experience and field-work pass

The shared vocabulary, current quality bar, review rubric, and living decision registry are maintained in [`GAME_EXPERIENCE_QUALITY_GUIDE.md`](./GAME_EXPERIENCE_QUALITY_GUIDE.md). This file remains the implementation history for The Long Return.

## Design intent

Make the expedition about understandable, accumulating choices: which creature to expose, which route to take, what to preserve, and when to leave. Add depth through competition for existing resources rather than another combat subsystem or another status currency. Simple mode should explain the decision; advanced views remain available for its calculation.

## Research informing this pass

- [Matthew Davis, Into the Breach postmortem, GDC 2019](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf): readable constraints, small numbers, telegraphed consequences, and limited resources can support planning without a large interface. Applied here as explicit field-work costs, preview before spending, and a single action between crossings. This is an adaptation, not evidence that our particular balance is already fun.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show the essential information first and let users request supporting detail. Applied to crossing explanations, salvage rules, and the expedition journal. Current outcomes and next steps remain visible.
- [Red Hook: Darkest Dungeon](https://www.darkestdungeon.com/darkest-dungeon/): expedition attrition makes crew management part of the adventure. Our adaptation uses recoverable energy and an external stability reserve, not death, stress disorders, or a separate battle system.

## Implemented gameplay

Salvage now has competing uses: carry it out as mission loot, or spend it to extend the expedition. These are prototype mission resources; no account ownership or permanent economy is created.

| Field action | Cost | Benefit | Constraint |
| --- | --- | --- | --- |
| Resupply a creature | 2 salvage | Up to 2 energy | Only active creatures below full energy |
| Brace the annex | 3 salvage and 1 worker energy | Up to 2 stability | Worker has manipulation 60+, armored, or anchored; must have at least 2 energy |
| Build a command relay | 2 salvage and 1 engineer energy | Restore 1 used command override | Best available engineer must have at least 2 energy; commands cap at 2 |

One field action is allowed after each non-final crossing. Choosing an option previews it; only the separate spend button applies the action. Partial recovery still costs the full price. Neither option revives a Spent creature or reverses a terminal failure. At zero stability or fewer than two active crew members, the mission must end. Those restrictions keep spending from becoming unlimited recovery.

The UI recalculates affordability and eligibility at commitment. Both Simple and advanced result views expose the same field-work rules. Resource feedback supports gains as well as losses, with reduced-motion handling. A durable on-screen receipt replaces the available choices after use.

## UX and information changes

- Crossing results lead with the event and changed resources; detailed causes are collapsed.
- Result screens state the remaining distance to the Index, the optional push-deeper trade-off, or the final extraction instruction as appropriate.
- Salvage is labeled carried until extraction, rather than prematurely banked.
- An expandable journal records chosen crossings and field work without revealing unchosen branches. It lasts for the current run, not across browser reloads.
- Scouting labels say awareness, not chance: capability is not a probability. Matching a hazard's required sense still matters. The explanation is optional, not another text block in each card.
- Scout timeline labels are larger and adapt to narrow layouts. Unsupported icons were replaced with symbols present in the bundled library.
- Result meters keep equal-sized units: a broad card-header selector had also been overriding meter grids. Result labels and salvage symbols are larger. Phone-sized scout cards use a compact portrait header instead of a full-height image strip.

## Validation and balance hypotheses

Pure tests cover recovery, bracing, capability gating, resource clamps, insufficient salvage, once-per-crossing limits, and terminal-state restrictions. UI tests cover preview versus commitment, updated feedback, receipts, journal entries, and all seven crossings with field work. Existing tests continue to cover early abort, objective extraction, forced extraction, native encounters, route selection, and manual crew assignment.

A scripted default-crew run reinvesting in recovery and bracing reaches deep retrieval with 16 salvage, 5 stability, and crew energy 3/1/1. The same route policy without field work ends in forced extraction. This demonstrates a consequential decision, not final balance across all crews.

Validation for this pass: 461 automated tests passed, production build passed, and a separate browser run completed all seven scenes with the same deep-retrieval outcome. Desktop and 390px layouts were visually inspected; result energy and stability segments were checked for equal widths. Existing unrelated build warnings remain (duplicate style keys and large chunks).

Next human playtest questions: does spending loot feel worthwhile but optional? Does a player notice a recovery opportunity before a creature becomes Spent? Do they understand why their chosen worker can brace? Can they explain their decision to extract without opening the raw calculations? More mission content should follow answers to those questions, not substitute for them.

## Follow-up polish: continuity and creature contribution

- A local, versioned checkpoint is written at annex entry, crossing results, and field-work completion. Resume restores the full boundary state together: crew resources, salvage, spent abilities, mission flags, companion, journal, and the already-used field action. In-progress crossings restart at the previous checkpoint; this is explicitly stated, not advertised as exact mid-action saving. Completion and abort clear only this game's checkpoint key.
- Saves have basic structural validation and an integrity checksum. Incompatible or damaged saves are ignored. Storage access failures do not block play; an in-game notice advises keeping the tab open. The checksum detects corruption, not cheating or malicious edits. Browser/device/origin storage is not cloud synchronization.
- Simple mode retains route selection then explicit commitment, but no longer asks players to approve the same crew plan twice. Command overrides are available directly on the proposed plan.
- The eight later routes now have distinct accounts for clean, costly, and forced crossings. Narration describes the taken route only. A short creature-contribution line replaces the generic reaction on Simple results, crediting support only when it crossed a real performance threshold, or identifying energy preserved by temperament/companions.
- This follows the [visibility-of-system-status principle](https://www.nngroup.com/articles/visibility-system-status/): a player should be able to recognize what their action changed. It does not add another always-open analysis panel.

Automated follow-up validation covers save round trips, corrupt/incompatible saves, unavailable storage, reload after field work, restart of an unfinished crossing, and narration for every route/outcome. The seven-crossing and manual-assignment regressions remain covered.

Follow-up verification: 470 tests passed. A browser run resumed at entry, after field work, and after crossing six, then completed deep retrieval with the same 16 salvage and 5 stability. Reload after extraction did not offer the finished checkpoint. The resume screen was inspected at desktop and 390px widths. Hazard/exposure explanations take priority over celebrating a clean technique so that narration does not obscure other costs.

## Route comparison: unknown is not free

Simple route cards use a compact game HUD instead of stacked cost cards. Current energy and stability remain visible as their familiar pips; the exact pips consumed by a mapped route dim and pulse in the same resource color. Unresolved danger lays moving sensor interference across the whole meter, with one floating question signal that occupies no resource segment. This communicates unknown magnitude instead of implying that zero, one, or two specific pips are at risk. Confirmed zero-cost metrics collapse entirely, while salvage remains a small row of positive loot tokens. The selected crew plan uses the same visual language. Uncertain routes never receive an unqualified "Easier on the crew" label.

The uncertainty display does not inspect hidden hazard damage or names. Automated tests confirm that different hidden damage amounts produce identical previews. Existing route selection followed by explicit commitment is preserved; resolution and balance rules are unchanged.

The committed action now resolves through ordered, player-visible beats rather than an auto-disappearing notification: movement, hazard, support, each energy loss, stability damage, salvage collection, and arrival. The persistent final frame requires an explicit continue; skipping reveals that frame instead of bypassing it. This keeps the resolution math intact while exposing cause and effect in time.

Scouting uses the same enacted-action rule. Choosing a scout now opens an in-world sequence for departure, observation, communication success or failure, and the scout's energy loss before the route screen can be used. A native interception becomes the final beat when present. Scouts without a compatible relay require a second physical-return sequence in which the additional energy and annex-stability losses drain in order. The former Simple-mode “Just changed” alert has been removed; durable reports and field-work receipts remain after their respective sequences.

Validation for the enacted-action pass: 477 automated tests and the Vite production build pass. A browser play-through covered scouting, both mapped and unresolved route previews, explicit route selection and crew review, the timed crossing beats, the persistent final frame, and the 390px action layout. The visual check caught and corrected an energy-HUD/dialogue overlap. The only browser console message was the existing anonymous-user auth notice.

## World-reactivity pass

Route comparison now takes place over the current generated environment plate. Hovering, focusing, or selecting a route traces its physical lane through the room, labels its in-world action, and places unresolved danger on that route without exposing its hidden value. The cards remain the accessible controls; the map is evidence and preview rather than another input model.

The first route consequences now persist visually as well as mechanically. Dormant machinery, drained underdeck, awakened security, and recovered maintenance protocol appear as concise state signals on the relevant scene plate and route map. The detailed transition panel still explains the affected route, so the artwork never carries the only copy of important information.

Crossing methods use a small behavioral vocabulary—swim, flight, climb, burst, beam, ward, tow, brace, cut, mend, and phase—rendered as motion and effect layers around the canonical creature SVG. Scout performances similarly distinguish quiet, defensive, and contact postures. These are not new creature forms or generated pose claims; they make registry-derived verbs visible while preserving the source silhouette.

Sound is now a restrained procedural layer rather than an asset library: mechanical selection ticks, commitment weight, movement sweeps, scan and relay pings, encounter dissonance, descending resource-loss cues, salvage chimes, and resolution tones. A persistent header control mutes the complete layer. Missing Web Audio support degrades silently and does not affect play.

Validation for this pass: 490 automated tests across 35 files and the Vite production build pass. A live browser-agent play-through deliberately chose a scout without a compatible relay and then an unresolved route. It confirmed the two-stage scout cost, route-map hover/selection, selection versus commitment wording, unknown-risk reveal, ordered crossing transition, result causality, and the drained-underdeck consequence in the next room. Browser logs contained only the existing anonymous-user authentication notice. See `LONG_RETURN_QUALITY_AUDIT_2026-09-10.md` for the current rubric score and remaining evidence gaps.

## Simple wizard density pass

The six-stage wizard is now the sole progress model in Simple mode. The former nested Route → Crew plan → Cross stepper, route-confirmation banner, and plan-stage question have been removed because they repeated state already visible in the persistent header and fixed action bar. A missing recommendation is now represented by silence rather than a full-width “No clear best route” notice. Recommendation rationale, scoring detail, native field-sign prose, and other explanatory material remain available through compact disclosures or the Rules panel.

The plan stage combines the chosen route with the recommended lead and method in one heading, keeps the lead/support/outcome diagram visible, and moves the numerical explanation under “Why this crew?”. Previous-route effects use one narrative continuity card in Simple mode instead of repeating the same effect in a second data block. The route screen therefore opens directly with the decision, environment map, and two comparable choices.

## Staged Simple workspace

Simple guidance now behaves as a six-stage mission console: Scout, Report, Route, Plan, Act, and Result. A persistent scene plate carries the immediate objective, stability, salvage, crew energy, rules, sound, and progress while the active decision replaces the previous decision in the workspace below it. Forward progress enters from the right; returning from crew review to route selection enters from the left. Guided, Standard, and Expert retain the full scrolling dossier.

Preparation is deliberately reversible, while enacted events are not. A route card selects a route, “Next: review crew” advances to planning, “Back to routes” revisits that choice, and “Cross now” is the first crossing commitment. Scouting follows the same grammar: a creature card selects and expands, then a fixed “Send [creature]” control deploys it. “Stay together” remains a peer action in the same bar. Result and plan actions stay anchored near the bottom of the viewport so the player does not need to rediscover the next step after reading the stage.

## Motion smoothing pass

The wizard and enacted-action layers now use continuous, causal motion instead of broad stepped animation. Phase changes align the workspace immediately and then fade the next panel into place, avoiding the previous combination of smooth page scrolling and layout-position animation. Creature travel, scout departure and return, resource drain, world impact, captions, route traces, and security signals use continuous easing; resource loss remains sequenced but no longer blinks through discrete frames.

Large surfaces no longer animate `left`, filters, or box shadows. Scene-sized panels use opacity, while performers and small effects use compositor-friendly transforms. Only one dominant motion occurs during each story beat, so a stability impact does not simultaneously move the environment in competing directions. Reduced-motion behavior remains an instant presentation of the same final state.

## Encounter decision language

Simple-mode encounter responses are now horizontal causal paths rather than miniature reports. Each option leads with a strategic identity—assist, communicate, report, avoid, or confront—then shows its immediate resource cost and the state it will leave behind. Supporting prose remains available as hover/title context and remains visible in detailed guidance modes. The Scene 2 comparison therefore reads as “spend stability for a possible ally,” “preserve resources but leave danger,” or “spend crew and annex reserves to open the passage.”

Selecting an encounter response is now reversible and does not resolve contact. A persistent confirmation bar names the selected response; only “Take this action” commits it. Focused tests verify preview versus commitment, and a live browser pass covered the recommended assist response through the resulting stability loss and temporary companion.

Encounter commitment now continues through an authored full-screen response sequence: the chosen posture is enacted first, only affected resource reserves are shown changing, and the final field state—ally, unresolved warning, detour, or cleared passage—must be acknowledged before play resumes. A companion and the resolved native state persist on scene art and route maps instead of disappearing with the encounter card.

Simple mode now exposes an optional visual expedition log from its console header. It summarizes crossings, current salvage, stability, Index status, each route's actual costs and haul, field work, lasting route effects, and a companion's remaining intervention. The log is deliberately absent from the decision canvas until requested.

Securing the Nemesis Index creates a distinct mission fork instead of two unexplained footer buttons. Safe extraction shows the exact banked haul and secured objective; entering the optional depths shows the next named sector, maximum remaining salvage opportunity, sector count, and the current crew/stability reserve. Both controls are action verbs and perform immediately because there is no additional plan configuration at that boundary.

Support contribution and field-companion intervention are separate action beats. Support only receives a featured beat when its score changes the crossing tier—making passage possible or removing the base energy cost. A ready companion appears in known-cost forecasts as the cause of one preserved energy, then performs its own beat and becomes visibly spent after use.

The four mission endings now have separate emotional contracts. Voluntary withdrawal preserves the crew but explicitly loses the Index and haul; voluntary extraction banks a secured objective and leaves the optional depths unopened; forced extraction distinguishes whether the Index survived and halves carried salvage when it did; deep retrieval celebrates exhausting the annex's final opportunity. Titles, seals, tone, and prose change together rather than sharing a generic success/failure paragraph.

Keyboard focus follows the wizard's context changes and never moves behind an enacted-action curtain. Scout, encounter, and crossing curtains keep their sole progress control focused; rules, calculation, and mission-memory dialogs cycle focus internally; closing mission memory returns focus to its console trigger. The Simple console's smallest persistent labels were enlarged without returning explanatory copy to the main decision surface.
