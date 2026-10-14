# Creature stage contracts (part 4 of the pipeline design)

Status: draft 1, 2026-10-14. Part 4 of the six-part program in [creature-pipeline-design.md](creature-pipeline-design.md). Each of the eleven stages is specified like a service: its input artifacts, output artifacts, the validators that must pass, the reviewer's cold checklist, the builder's brief template, and the gate. Process decisions here are the pipeline owner's. The one product-facing element is what Nick sees at each gate (the "Nick sees" column), which follows his rulings: numbered checks, one large picture each, a moving result for motion, defaults with a question, production and slice answers side by side.

Terms: a **builder** is the agent that produces a stage's outputs; a **reviewer** is a different agent that runs the stage checklist cold, seeing outputs only, never the builder's narrative; a **validator** is a script; a **gate** is what closes the stage (Nick's approval bound to evidence hashes, or a technical pass Nick only sees).

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Every stage has the same five-part contract (inputs, outputs, validators, reviewer checklist, gate) and the same brief shape, so an agent can run any stage from its record alone | 90%: the experiment's stall came from unstated inputs and holds | `creature-studio.md` decisions 9, 10 |
| 2 | A builder never reviews, a reviewer never builds, and the orchestrator never does either; a reviewer sees outputs and the checklist, not the builder's report | 90%: self-grading inflated every earlier loop | memory `adversarial-critic-loop` |
| 3 | Holds carry a source (Nick quote with date, or inferred with reason); inferred holds are listed on the review page and lifted first on a stall. Two failed builds on one defect force a hold audit before a third | 90%: Nick's ruling after the eye-socket episode | memory `declare-every-hold` |
| 4 | One defect per build; previews at reduced quality on the part's own cameras; the full packet only for the build presented | 85% | experiment X26 |
| 5 | A stage's record folder is complete when its `cost.json` is written: wall time, agent tokens by role (deduplicated by message id), Codex image tokens, Blender minutes | 90% | memory `report-time-and-cost-at-checkins` |
| 6 | Nick sees at most five numbered checks per gate, each one big crop, before left and after right, the reference beside; motion as a moving page; every item carrying my recommended answer | 95%: his rulings 2026-10-13 and 2026-10-14 | memories `review-checks-big-and-specific`, `nick-decides-product-i-decide-process` |
| 7 | A stage reopens only the parts that depend on the change; prior approvals show stale, never deleted | 85% | `creature-studio.md` section 1 |
| 8 | No new tool is written inside a stage; a tool proposal is a stage-close item with a 20-minute smoke test | 90% | `LOOP-audit-2026-10-07.md` |

## 1. The contract per stage

| # | Stage | Inputs | Outputs | Validators (block) and measures (report) | Reviewer checklist (cold) | Gate and what Nick sees |
|---|---|---|---|---|---|---|
| 1 | Intake and tech spec | species record, lore, silhouette, roster class spec | `reading.json` (must have from the description, carried over from the silhouette, open for design, questions), `techspec.json` (class, size at the 50th percentile, budgets, clip list, slice scope) | block: every description feature appears in must-have; spec fields complete and inside roster budgets | each must-have traceable to a description line; nothing in carry-over contradicts the description; questions are real unknowns | Nick approves the reading (one page: the creature in his own words, with the open-for-design list); the spec is shown folded |
| 2 | Vision board | reading | option sets per signature element (palette fit to the home world, coat and texture, pattern, anatomy studies, eyes and expression), each option with a plain summary; picks stored as references with a job and a not-for | block: every option carries its summary; the described features are present in every option; measure: regenerations per element | options differ visibly; each matches its summary; no option violates a must-have | Nick picks on the selection screen (records and tooling, section 4): picks, undo, none-of-these and mix orders are store writes filed as decisions bound to image hashes; a composed preview of all picks precedes Confirm; approval is the Confirm decision |
| 3 | Model sheet | vision picks, silhouette, class rest pose | turnaround (front, three-quarter, side, back, top) in the class rest pose with limbs apart, signature close-ups, a shaved clay bare-body version with fur depth per region noted, a contradiction list | block: all views present; measure: cross-view proportion deltas, contradictions found, regenerations | proportions agree across views within tolerance; bare body is flesh, not furred silhouette in clay; every must-have visible in at least one view | Nick approves per aspect on the selection screen (one set per aspect where options exist, otherwise one approve control per aspect), checks numbered |
| 4 | Blockout and proxy rig | sheet, class spec | blockout mesh in meters at sheet proportions; creature rig spec (joint placements); proxy-bound mesh; pose sheet (rest plus three extreme poses from the move vocabulary) | block: scale, forward axis, manifold, joint count, influences; deformation sanity (no region loses more than 30 percent volume in any pose); measure: proportion deltas to the bare sheet | proportions match the bare sheet from every standard camera; the pose sheet shows no collapse, pinching or hinge gaps; joint placements sit where the sheet implies joints | Nick approves proportions (standard cameras, bare sheet beside); the pose sheet is shown so he sees it bends, with no question on it |
| 5 | Sculpt | blockout, sheet, reconstruction runs | per part in dependency order: previews, builds, defects, an approved build; whole-form join check | block: one closed manifold after assembly; outputs hashed; declared outside-the-part changes; measure: displacement outside the part, fit to the sheet | the targeted defect is fixed in the images; no new defect visible at game size; the part reads as the sheet's part; nothing outside the part moved undeclared | Nick approves each part (one defect per check, before and after, sheet beside, sprite-size view), then the whole form |
| 6 | Game mesh | sculpt, base meshes | wrapped and joined game mesh at full tier, UVs, low tier when the generator exists | block: triangles within budget, manifold, UV overlap, texel density range, deformation test in proxy poses; measure: distance to sculpt per region | sculpt and game mesh at game size show no visible loss; loops sit at joints; UV islands follow the roster layout | technical gate; Nick sees sculpt beside game mesh at game size, one check: any visible loss? |
| 7 | Surface | game mesh, sculpt, vision palette, style bible | baked normal and occlusion, base color with pattern in UV space, material from the vocabulary, texture fur, finish variants | block: texture sizes, material count, missing maps, variants present; measure: value range against the bible | look-dev renders match the vision picks; pattern follows the body; fur length follows the sheet's regions; finishes read distinctly at game size | Nick approves the look (look-dev scene, game size and close, the four finishes side by side) |
| 8 | Rig | game mesh, class modules, creature rig spec | deformation skeleton, skinning, corrective blend shapes where needed, control rig in Blender | block: joint count, influences, unweighted vertices, naming, socket tags, root at origin; measure: volume change per joint region in the pose sheet | the pose sheet shows clean bends at every joint; sockets sit where the contract says; no vertex belongs to a wrong module | Nick approves the deformation sheet (rest plus extreme poses, numbered joints) |
| 9 | Animate | rig, archetype code, derived acts, tech spec clip list | required clips plus signature from archetype parameters, baked; event times; sprite-size playback | block: clip lengths within budget, events present, loop seams, root never translates, animation bytes; measure: none | at 1x on the viewer each clip reads (anticipation, peak, recovery); the signature reads as the lore's act; nothing clips through the body | Nick approves on the moving viewer page, never stills |
| 10 | Export and validate | everything | glTF, manifest, token, preview, sprites per profile, viewer page with measurements | block: the contract validator; measure: frame time on Nick's phone | the asset in the browser matches the look-dev render; every clip plays by name; sockets resolve | Nick approves the shipped asset in the browser on his phone |
| 11 | Retro | all stage records | cost per stage, defects per part, promotions to the roster layer, design amendments | none | an independent reader checks the retro's claims against the records | none; the orchestrator writes it and amends the design |

## 2. The brief template (every builder gets exactly this)

```
Stage <n> <name>, creature <key>, build <alias>
Goal, in Nick's words: "<quote, date>" (or: orchestrator's goal, stated)
Scope: <part or stage>; includes <list>; depends on <parts>
Defect targeted (if any): <alias>, <plain description>, <camera>, <region image>
Holds:
  | Hold | Source (Nick quote + date, or inferred: reason) | Strength |
May change: anything the goal needs that the holds do not name; declare and explain any change outside the scope
Inputs: <artifact paths with hashes>
Required outputs: <list, with the validator that will run on each>
Lessons that apply (at most five): <statement, evidence>
Budget: <builds left, wall minutes, deadline>
Report: outputs with hashes; the defect's result (fixed, partly, not) with evidence images; Blocked by: <hold alias or nothing> and what lifting it would allow; new defects seen; cost
Rules: no new tools; no self-grading; previews before any new method; stop and report at the deadline
```

## 3. The reviewer template

```
Stage <n> <name>, creature <key>, build <alias>
You see: the outputs (images, meshes, viewer page) and this checklist. You do not see the builder's report.
Checklist: <the stage's rows from section 1, as numbered yes-or-no items>
Return: pass, or a list of named defects, each with a camera, a 2D region and one sentence; no scores
```

## 4. Records per stage

`art/roster/<key>/stages/<nn>-<name>/`: `builds/<id>.json` (brief hash, inputs, outputs with hashes, validator results, report, cost), `defects/<id>.json`, `holds/<id>.json`, `decisions/<id>.json` (Nick's words with date and the evidence hashes, or the orchestrator's decision with reason), `review.json` (the reviewer's result per build), `cost.json` (written at close). `creature.json` holds the stage states. Binaries go to the blob store by hash.

## 5. Stall rule

A defect surviving two builds is stalled. The next build needs an audit record naming the physical cause and checking every hold against it, ending in exactly one of: lift an inferred hold, change the method, rescope the part, or ask Nick one question with pictures. An audit that changes nothing unlocks nothing.

## 6. What this part leaves to later parts

Part 5 specifies the record CLI, the blob store use and the review page generator. Part 6 decides the look. The stage checklists above are first versions; every fault Nick finds that a reviewer missed becomes a checklist line.
