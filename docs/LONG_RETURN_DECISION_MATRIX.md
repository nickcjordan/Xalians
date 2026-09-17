# Long Return — creature/action and decision audit

## Scope and interpretation

The current demo uses authored creature snapshots in `longReturnData.js`, interpreted by `longReturnEngine.js`; it is not a live registry client. Registry contract inspected: capabilities at zero cannot supply that movement; ability grammar supplies instrument/action/medium/intensity; unknown keys must have a safe baseline; records are not mutated. No new creature abilities or anatomy were invented in this pass. Guidance remains separate from numerical difficulty.

`methodProvenance.js` labels the actual source of an admitted method. Natural strength/practiced/stretching are game-local source-value bands (80/50), not a success probability. Route score, readiness, support and exposure still determine costs. One-use abilities now have a visible opportunity cost before commitment and a persistent spent receipt afterward.

## Seven-scene matrix

| Scene | Decision and creature factors | Exchange / lasting effect | Visible terrain and learning role |
| --- | --- | --- | --- |
| Flooded Service Throat | Climb/leap/beam on gantry; swim/snare/ward in intake. Liquid tolerance and typed exposure are separate from swimming. | Gantry: mapped footing, 1 salvage, quiet entry helps next catwalk. Intake: 2 salvage, unresolved brine unless scouted, drains next underdeck. | Suspension span versus current. Teach known versus unknown costs and movement versus one-use ability; do not reveal the brine on an unscouted card. |
| Blind Turbine Hall | Sprint/leap/ambush above; burrow/phasing/intelligence below. Scout relay and medic access matter at the injured native. | Catwalk: 2 salvage and security pulse; underdeck: 1 salvage and maintenance codes. Scene-one choice eases its corresponding route. Possible limited companion, not ownership. | Moving rotor versus enclosed service tunnel. Combine scouting, aid versus force/withdrawal, and the first observable carried-forward consequence. |
| Archive Vestibule | Intelligence/optical beam/snare versus crush/rake/phasing. | Decode saves structural stability and offers 3 salvage but can hide a countermeasure/native; breach avoids that lock risk at 2 base stability and 1 salvage. Prior codes/security alter difficulty. | Authentication console versus fractured door. Test information and preserving a useful ability across scenes. |
| Null Gallery | Flight/phasing/ward outside versus manipulation/snare/climb inside. Body tolerance, temperature and exposure can outweigh raw method strength. | 3 salvage outside versus 1 sheltered; outer hazard versus territorial native inside. | Exposed span versus tunnel. Test body/environment fit, communication and depleted tools. |
| Nemesis Index | Ward/mend/intelligence to stabilize; snare/crush/manipulation to extract blackbox. | Stabilize: harder, 1 base stability, 5 salvage. Blackbox: lower target, 3 base stability, 3 salvage. Both secure the Index; neither promises a safe return automatically. | Powered cradle/console versus removed blackbox. Combine learned costs, then make banking the objective an explicit choice. |
| Core Reservoir | Ward/manipulation/resistance at rim; swim/snare/spray for cell. | 6 salvage at rim versus 9 below, with greater target and stability cost below. Charged exposure still applies even to aquatic creatures. | Collector console versus water. Optional resource gamble, not mandatory mission progress. |
| Generator Spine | Snare/manipulation/anchoring to align; sprint/leap/ambush in interval. | Alignment: higher target, 2 stability, 10 salvage. Interval: lower target, 3 stability, 8 salvage. Both finish at extraction; remaining energy/tool availability changes feasibility. | Turning machinery. Final test of preserved capabilities and reserves. |

## Rules audit

`routeChoiceAudit.test.js` compares 20 three-creature combinations at 0, 2 and 4 load: 60 mapped states per scene. It compares energy, stability, salvage and one-use consumption without inventing a single utility score. Number of states with a non-dominated plan on each route:

| Scene | First route | Second route |
| --- | ---: | ---: |
| Entry | 3 | 60 |
| Turbine | 60 | 33 |
| Vestibule | 60 | 24 |
| Gallery | 60 | 60 |
| Index | 60 | 46 |
| Reservoir | 48 | 60 |
| Spine | 60 | 39 |

These are not win rates or recommendations. They omit scouting cost, native interaction, command use, prior flags, actor-specific future usefulness and repairs. In particular, the fully mapped intake is usually preferable; the gantry's uncertainty advantage exists before that information is acquired. The first routes are not intended to be equally attractive in every state. Every route has at least one resource/ability reason to exist without granting hidden knowledge. No numerical rebalance was justified by this audit.

## Implementation and rollout

- Selected plan: compact source → method, with actual ability instrument/medium and one-use status. Alternative techniques are optional, reversible and update the same forecast used by commitment.
- Crossing: route-specific foreground props over existing artwork; swimming, flight, climbing, burrowing, bursts and phasing have different performer trajectories. Tool methods use a planted action with their existing distinct effect. All trajectories settle at one endpoint to avoid beat-boundary snapping.
- Hazard/support/companion beats remain conditioned on real resolved events. Ability expenditure joins the ordered sequence and remains in the result receipt. Reduced-motion users go directly to a persistent outcome; skipping still requires a second explicit continuation.
- No checkpoint schema or numerical rule changed. Existing saved expedition resources and spent abilities retain their meaning. Technique selection is a reversible draft, consistent with the existing Simple lead draft.
- Correctness fix from branch testing: a `detour` result no longer removes the native. Returning to its route reopens contact, while a genuinely cleared/befriended encounter stays cleared. Old checkpoints with a detour now honor the intended meaning of that result; no schema migration is required.

## Coverage ledger

Record browser evidence and any open findings here before closing the active checklist. Tests cannot establish human enjoyment or perceptual clarity; motion smoothness on low-end hardware and audio fit remain human/device questions.

- First two scenes: all four route sequences, both with and without scouting (eight isolated browser runs). Extra response runs exercised withdrawal and force; the discovered detour-as-clear bug was fixed and rechecked by returning to the native.
- Technique choice: two normal-motion runs selected reusable movement versus a one-use beam, asserted unchanged resources on selection, sampled different computed performer transforms, and verified the one-use receipt only appears after actual consumption. Screenshots inspected; source cue typography and overly dominant terrain overlays corrected afterward.
- All fourteen authored routes have foreground terrain mappings. Every available creature/method combination is checked for an actual source, nonzero admitted capabilities, safe fallback behavior and correct one-use status.
- Browser viewport audit at 390/768/1280 covers setup, scout, route, lead alternatives, custom editor, result, repairs, ending, encounter, companion and report. Desktop comparison/commit bounding-box assertions remain passing. Keyboard rules/calculation dialogs, reversible choices, custom crossing and checkpoint recovery pass.
- Full normal-motion runs: voluntary extraction after five crossings with Index and five salvage; deeper run reached scene six and correctly forced extraction after crew exhaustion, retaining Index and four salvage. These are sampled trajectories, not all possible missions.
- Final energy-preserving normal-motion run reached all seven crossings, then lost the annex at zero stability and correctly banked half the haul (9) with the Index retained. A second run with command use enabled reproduced that endpoint; its chosen plans offered no sufficient override benefit to change the outcome. This is a verified failure endpoint, not a claimed deep-retrieval win.
- Final checks: 121 tests across 24 files passed, production build passed (existing shared bundle-size warning), diff check passed with line-ending notices only. Browser page-error assertions passed. Optional pickers now collapse on selection and restore keyboard focus; viewport assertions verify this behavior.
- Coverage limits: browser runs sample the default crew and alternative leads/techniques; they do not exhaust every combination of six creatures, spent tools, all later native responses and every historical flag. Rule tests cover all authored methods and route/resource samples. No human enjoyment, audio quality or low-end rendering performance is claimed from these results.
