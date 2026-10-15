# Creature production pipeline: design of record

Status: draft 2, 2026-10-14, revised after the audit's cold challenge and submitted to Nick for explicit approval. Nothing here is ratified until he says so. Owner: the pipeline session on branch `creature-pipeline`. Audit behind it: [creature-pipeline-audit.md](creature-pipeline-audit.md). This design is independent of the Creature Studio experiment ([creature-studio.md](creature-studio.md)); it borrows ideas from it by reading, never by code or branch dependency.

## Context

Xalians has 33 ratified species across nine body plans and the roster will grow. Each needs to go from its species record, lore and Nick's silhouette to a finished, animated, game-ready asset. Nick is the art director and the only approver of creative results; agents do the work. Two earlier efforts shaped the lessons: the Akinza construction loop (scores, toolsmiths, 420M tokens for five keeps) and the Creature Studio experiment (records, defects, holds, a vision board and model sheet that each closed in a day, and a 3D face that stalled until a reconstruction tool was tried).

Nick ratified the delivery target on 2026-10-14: a live 3D asset that runs well in mobile browsers, with sprite sheets rendered from it as a derived option, and the door open for promotional 3D clips. This design builds every creature to that target.

Terms are defined in the audit's vocabulary paragraph and on first use below. The analogy Nick can hold the whole design in: each stage is a service with an input contract, an output contract, a validator suite (like a CI check) and a code reviewer who did not write the code; the roster layer is the shared library every creature links against; the tech spec is the interface definition written before implementation; Nick is the product owner who accepts or rejects a release.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The shipped asset is glTF 2.0 with a deformation skeleton, skinned mesh, clips with named events, KTX2-compressed textures and meshopt or Draco mesh compression; sprite atlases are rendered from it | 95%: Nick's ruling 2026-10-14 | this doc's Context; audit section 1 |
| 2 | (Amended 2026-10-14 by measurement; see section 9.) Budgets are set per scene and derived per creature, as levers. Scene: twelve creatures on screen (Duel and Reclamation rosters), under 60 draw calls and 150,000 triangles for creatures, under 12 MB downloaded for a full roster. Per creature: 6,000 to 12,000 triangles, one 1024 texture set (base color, normal, packed occlusion-roughness-metallic, optional emissive) in KTX2, one material plus one for eyes or emissive parts, at most 60 deformation joints, 4 influences per vertex, at most 8 blend shapes, clips sampled at 30 fps with keyframe optimization and meshopt compression, under 400 KB per creature compressed. No LODs for now (fixed close cameras) | 65%: standard mobile practice, untested on this roster; the first creature measures real frame time on Nick's phone and the numbers move | audit G1, G3, G17 |
| 3 | Authoring in Blender 5.2 under WSL, scripted through `bpy`, metric units, creature height from the species size band at the 50th percentile, origin on the floor, facing Blender's front view; the glTF exporter converts Z-up to Y-up | 90%: Blender is installed and proven; units were arbitrary before | audit G13; `art/creature-motion-comparison/README.md` |
| 4 | Rigs are not six fixed skeletons but parametric modules assembled per species: spine, neck and head, limb chain with a leg-count parameter (2, 4, 6, 8, 16), arm, wing, tail or tentacle chain, ear chain, jaw, horn or crest attachment; plus locomotion archetypes (biped gait, quadruped gait, wave gait for many legs, undulation, hover, flap). Body plan still orders the work: biped 11 species, quadruped 8, multiped 6, serpentine 2 plus the piscine Fathomaw, floating 2, avian, amorphous and swarm 1 each. Wings cross four plans. Vespersyn is a lead figure plus instanced minors with its own route | 75%: counted from the v5 records; the cold challenge showed body plan is the wrong grouping key | `docs/species-templates/v5/*.json`; audit G4, G21 |
| 5 | Rigs are assembled from shared modules (spine, neck and head, 2-link and 3-link legs, arm, tail chain, wing, ear chain, jaw, horn or crest attachment) with per-creature joint placement; the control rig stays in Blender, only the deformation skeleton ships | 85%: industry practice, matches the reuse plan's "procedures not parts" ruling | audit G4, G10; `creature-studio-reuse.md` |
| 6 | A common move vocabulary of five clips every creature has (idle, hurt, faint, light act, heavy act) plus one or two signature clips mapped from the creature's derived acts onto animation archetypes (lunge, strike, spit or beam, slam, charge, bloom, burrow); a game reads the clip names, never the species | 80%: the derived-acts tables already give every act a mechanism; archetype mapping is new | `docs/design/creature-derived-acts.md`; audit G4, G14 |
| 7 | Deformation is checked right after the blockout with a proxy rig (class skeleton, automatic weights, three extreme poses) before any look work; failing it reopens the blockout | 90%: the one practice every source agrees on; nothing here has ever been skinned | audit G2 |
| 8 | The sculpt (dense look mesh) and the game mesh are different artifacts. The sculpt source for soft look-driven parts is image-to-3D reconstruction from the approved model sheet; parts that move or need exact control (eyes, ears, horns, limbs, claws) are authored. The game mesh comes from a base mesh per rig module, authored once with edge loops, UVs and weights, wrapped onto the creature's sculpt and checked by numeric deformation tests; QuadriFlow is the fallback for parts no base mesh fits; part identity rides through as a vertex attribute to seed weights | 70%: reconstruction scored 5 of 10 but beat hand masses (experiment X29); base-mesh wrapping is standard practice but unproven here and is what the slice tests first | audit G3, G9; `creature-studio-head-recon-trial.md` on branch `creature-studio-work` |
| 9 | Tool licensing is not a gate. Nick, 2026-10-14: "you don't need to be too concerned about that. It's fine to go with non-MIT stuff." Hunyuan3D-2 (already installed, proven under the GPU ceiling with offload) is the reconstruction tool; its license terms are recorded in every run record so the position is known if it ever matters. TripoSG stays an option only if it proves better | 95%: Nick's ruling | audit G12 |
| 10 | The look is a runtime shader, not a Blender render setting, because Blender's toon shading and Freestyle lines do not export. Default: stylized lit (hand-painted-feel base color under light PBR, no outline). Alternatives costed in the browser viewer on the first creature: inverted-hull outline (doubles vertices and draw calls) and a post-pass outline (fill rate). Nick decides on the moving A/B at game size. Sprite sheets are rendered from the same runtime so 2D and 3D match | 65%: Nick leaned toon on 2026-09-21 and has not seen the alternatives at game size on a phone | audit G5, G18 |
| 19 | Clips are parametric: each locomotion or act archetype is code (eased key tracks with lag, solved feet, spring tails, hover bob) with per-species parameters, baked to glTF and reviewed as a moving result; agents never keyframe by eye | 80%: the rig library already proved code-driven performances; agents keyframe no better than they sculpt | audit G19 |
| 20 | The asset declares runtime parameters for individuals: uniform scale from the size band percentile, the four finishes as material parameters, and the list of properties that may vary without breaking animation | 85%: the generator rolls these per individual today | audit G20; `packages/rules/src/generator/creature.ts` |
| 21 | The web runtime (three.js or model-viewer) and its bundle cost are chosen in the slice by measurement; nothing in `apps/web` changes until Nick approves a game's cutover | 80% | audit G17 |
| 11 | Fur on the game asset is texture fur: baked normal and color with a short silhouette fringe where the sheet demands one; strand fur is a render-only option | 80%: alpha overdraw is the known mobile killer | audit G15 |
| 12 | Checks are three kinds: engine-breaking validators block a handoff; budget checks report the number beside the budget; taste is never automated. Nothing else may block | 90%: Nick's ruling 2026-10-12 on literal rules, kept | audit G6 |
| 13 | Each stage has a builder and a separate reviewer; the reviewer runs the stage's checklist cold and the stage cannot be presented to Nick with a nameable flaw open | 90%: Nick 2026-10-09 "if you can name what is wrong, fix it" | memory `dont-hand-off-known-flaws` |
| 14 | Records are JSON in git under `art/roster/<key>/`, one folder per stage, with approvals bound to evidence hashes and holds carrying a source; binaries in the existing content-addressed blob store with the S3 keep set extended, not a second store | 85%: the experiment's record ideas are its best part; the blob store and bucket exist and are paid for | `creature-studio.md` decisions 1, 4, 6 |
| 15 | Review happens on Artifact pages with numbered checks and one large crop each, plus a browser viewer page for moving and 3D results; no new site route until an Artifact proves too slow | 70%: Artifact pages need no site code and Nick reviews at his desk; the experiment's dev route may still win on speed | memory `review-checks-big-and-specific`; `creature-studio.md` decision 5 |
| 16 | No new tool is built mid-stage. A tool is proposed at a stage close with a 20-minute smoke test and a named defect it addresses, or not at all | 90%: 58 percent of a 420M-token run went to speculative tools | `LOOP-audit-2026-10-07.md` on `akinza/construction-loop` |
| 17 | The first vertical slice is a quadruped with fur, chosen by Nick from Luceras, Imprit and Chromocat, because the quadruped class serves eight species, a quadruped rig is the classic non-humanoid cost test, and the experiment's Hypnopet (also a quadruped) gives a cost comparison | 65%: Nick may prefer another creature; a biped would serve twelve species but Akinza is off limits | species records; audit section 5 |
| 18 | Cost is recorded at every stage close as wall time, agent tokens by message id and Codex image tokens, written into the stage record; a creature retro updates this design and the roster layer | 85%: Nick asks for time and cost at every check-in | memory `report-time-and-cost-at-checkins` |

## 1. The roster layer (built once, maintained at every retro)

The shared library every creature links against. It lives under `art/pipeline/roster/` and changes only at a stage close or a retro.

| Item | What it is | Industry practice | Verdict |
|---|---|---|---|
| Tech spec template | The per-creature card: delivery target, size in meters, skeleton class, budgets from decision 2, root motion policy (in place, with the game moving the creature; a lever), clip list, finish treatment, export settings | The character brief | Adopt |
| Rig modules and base meshes | Parametric modules (decision 4) as `bpy` builders with named joints (`spine_01`, `leg_l_01`, `tail_03`), a documented joint naming rule and canonical rest pose per archetype, one base mesh per module with loops, UVs and weights, and a proxy-rig recipe (bind, auto weights, three poses) | Shared skeletons, base meshes and retargeting | Adapt: modules not fixed skeletons, because leg counts and tail lengths vary |
| Move vocabulary and archetypes | Five common clips, archetype table mapping derived-act mechanisms to motion archetypes, each archetype as parametric code (decision 19), event names (`hit`, `emit`, `foot_down`, `recover`), length budgets per clip as levers (idle loop 2 to 4 s, hurt under 0.6 s, acts 0.8 to 1.6 s with the event before the halfway point) | Shared clip libraries, animation events, state-machine templates | Adapt: shared vocabulary as code, per-archetype parameters, species-specific signature |
| Look-dev scene | One `.blend` with neutral three-point lighting, turntable, the standard cameras, a 192 px sprite-size camera, and a 1 m scale figure | Fixed look-dev scene | Adopt |
| Style bible | One page: value structure, shape language per element, detail level at game size, texel density (a lever, start 512 px per meter at the game mesh), material vocabulary (fur, scales, chitin, hide, plating, mist, bare, feathers, with one recipe each), outline rule, silhouette test | Style bible | Adopt, one page |
| Validators | Python scripts run inside Blender and on the exported glTF: manifold, scale, axes and forward direction, naming, influence count, unweighted vertices, UV overlap and texel density, triangle count, joint count, morph target count, material count, texture sizes and compression, animation data size, download size, clip events present, glTF validator pass; plus a frame-time smoke test in the viewer on a phone-class profile | Import validators and a device smoke test | Adapt: three kinds per decision 12 |
| Viewer | A static web page (the chosen runtime, local only) that loads a glTF, plays clips, applies the runtime look and the individual parameters, shows triangle, draw-call and frame-time counts, runs at phone width, and renders the derived sprite sheets | Engine test scene | Adopt |

Build order across the roster is by class, largest first, so shared work lands early: quadruped (first creature), then biped, multiped, serpentine, winged, soft, swarm. Inside a class, species whose records share coverings go together so material recipes are reused.

## 2. Stages and gates (per creature)

Every stage has: input artifacts, output artifacts, validators, a reviewer, and a gate. A gate is either Nick's explicit approval bound to evidence hashes, or a technical pass that Nick only sees. A change at a later stage reopens exactly the parts that depend on it; earlier approvals show as stale, never deleted.

| # | Stage | Input | Output | Validators and reviewer | Gate |
|---|---|---|---|---|---|
| 1 | Intake and tech spec | Species record, lore, silhouette, roster layer | A reading of the creature (must have from the description, carried over from the silhouette, open for design, questions) and the filled tech spec card | Reviewer checks every described feature is in must-have and the spec is complete | Nick approves the reading; the spec is shown and is the orchestrator's unless he objects |
| 2 | Vision board | Reading | Option sets per signature element through Codex images, each with a plain-words summary; picks stored as references with a job and a "not for" | Reviewer checks every option differs visibly and matches its summary | Nick picks and approves |
| 3 | Model sheet | Vision picks, silhouette | Turnaround in the class rig pose (limbs apart, neutral face), signature close-ups, a shaved bare-body version drawn as clay (flesh under fur, with fur depth per region noted) | Cross-view proportion check and contradiction list before Nick sees it; two failed regenerations on one problem means a different approach | Nick approves, scoped per aspect |
| 4 | Blockout and proxy rig | Sheet | A whole-form mesh at sheet proportions in meters, bound to the class skeleton with automatic weights, rendered in rest plus three extreme poses from the move vocabulary | Validators: scale, axes, manifold; deformation sanity (no volume collapse beyond a threshold); reviewer checks proportions against the bare sheet | Nick approves proportions from the standard cameras; the pose sheet is shown so he sees it bends |
| 5 | Sculpt | Blockout, sheet, reconstruction (decision 8, 9) | Per part in dependency order: previews, builds, defects, an approved build; the whole form checked for joins | One defect per build; stall rule: two failed builds on one defect force a cause audit that must lift a hold, change the method, rescope the part or ask Nick; reviewer runs the part checklist cold | Nick approves each part, then the whole form |
| 6 | Game mesh | Sculpt, base meshes | The module base meshes wrapped onto the sculpt, joined into one mesh in budget with UVs; QuadriFlow for parts no base mesh fits | Validators: triangle count, manifold, UV overlap, texel density; deformation tests in the proxy poses; reviewer compares sculpt and game mesh at game size | Technical gate; Nick sees sculpt beside game mesh at game size and only judges visible loss |
| 7 | Surface | Game mesh, sculpt, vision palette | Baked normal and occlusion from the sculpt, base color with pattern in UV space, material from the vocabulary, texture fur, finish treatment plan for the four finishes | Validators: texture sizes, material count, missing maps; reviewer checks the look-dev renders against the vision picks | Nick approves the look in the look-dev scene at game size and close |
| 8 | Rig | Game mesh, class modules | Deformation skeleton, skinning, corrective blend shapes where a joint cannot, control rig in Blender | Validators: joint count, influences, unweighted vertices, naming; reviewer runs the pose sheet | Nick approves a deformation sheet (rest and the extreme poses) |
| 9 | Animate | Rig, archetype code, derived acts | The five common clips plus one or two signature clips, generated from archetype parameters and baked, with events; sprite-size playback | Validators: clip lengths against budget, events present, loop seams, animation data size; reviewer watches at 1x on the viewer page | Nick approves on a moving page, never stills |
| 10 | Export and validate | Everything | glTF with compressed textures and mesh, the runtime parameters, a manifest with provenance and the tech spec, a sprite atlas in `xalians-frame-atlas-v1` rendered from the runtime viewer, the viewer page at phone width with frame timing | glTF validator, all three check kinds, the viewer's measured frame cost on a phone-class profile and on Nick's phone | Nick approves the shipped asset in the browser |
| 11 | Retro | Stage records | Cost per stage, defects per part, what to promote to the roster layer, design changes | | Written, then this design is amended |

Stages 2 and 3 are kept from the experiment because they worked. Stage 4 is the new early gate. Stages 6, 8, 9 and 10 did not exist anywhere before. LODs are deliberately absent until a game has real camera distance.

What "approved" protects: a look, never an implementation. A builder may change anything a goal needs inside a part and must declare changes outside it.

## 3. Agent roles and contracts

| Role | Model | Contract |
|---|---|---|
| Orchestrator (this session) | Opus-class | Writes briefs from records, runs stage closes, records costs and holds, decides budgets, talks to Nick. Never builds, never reviews its own brief's result |
| Stage builder | Codex (gpt-6-astra) for every stage except stage 7 (Nick 2026-10-15, after the three-part comparison: Codex matched Claude on procedural geometry, measurement and holds at about a third of the tokens and off the Claude quota, and fell short on judging its own renders) | Receives: goal in Nick's words, part or stage scope, holds with sources, allowed changes, required outputs, pinned conventions (render engine, cameras, composites, tooling location), deadline. Returns: outputs with hashes, per-iteration self-review notes, the defect's result with evidence, Blocked by, new defects seen, cost. Never adds a tool outside its brief |
| Stage reviewer | The orchestrator (critic role), with an Opus reviewer for a cold read when a part stalls | Reads every builder pass against the shape authority and returns a concrete defect list with the measurement that proves each defect, one defect per follow-up build. A stage is not presented while the list is non-empty. The comparison found the gap between builders sits here, so this role is never delegated to the builder |
| Nick | | Approves readings, picks, looks, proportions, parts, deformation, motion and the shipped asset. Decides levers when a case reopens one |

Holds: every constraint in a brief carries a source (Nick quote with date, or "inferred" with reason). Inferred holds are listed on the review page and are the first lifted when a defect stalls. Two failed attempts on one defect trigger a hold audit before a third.

## 4. Records and tooling

- Records: `art/roster/<key>/creature.json` (key, spec card, stage states with evidence hashes), `stages/<nn>-<name>/` with `builds/`, `defects/`, `holds/`, `decisions/` and `cost.json`, all JSON, written by a small CLI under `art/pipeline/` (Python, standard library, Blender-free). Git is the history.
- Binaries: the existing blob store (`C:\dev\art-data\studio\blobs`) and the `xalians-art-archive` bucket, keep set extended by approved outputs only. No new cloud resource.
- Tools: `art/pipeline/blender/` (`bpy` scripts: proxy rig, retopology run, bakes, export), `art/pipeline/validate/` (validators), `art/pipeline/viewer/` (static page), `art/pipeline/roster/` (classes, vocabulary, scene, bible). Blender is run from the pinned WSL install with `--python-exit-code 1`.
- Reconstruction: a wrapper that records inputs, parameters, peak GPU memory (hard cap 6.5 GB) and the model's license in every run record.

## 5. The review loop with Nick

- One Artifact page per creature, one section per stage, newest first. Each review is numbered checks with one large crop each (before left, after right, reference beside), a sprite-size view, and the holds in force. A moving result is a video or a viewer page, never a still.
- Approvals are recorded by the orchestrator from Nick's exact words with date, bound to the evidence hashes shown. Taste questions are asked one at a time in prose with the pictures on the page.
- Every check-in states elapsed time, tokens by role, and what is running.
- Nothing reaches Nick with a flaw the reviewer or the orchestrator can name.

## 6. Cost controls

- Stage budgets as levers (hours and tokens), opened by the orchestrator when the next step is worth it, recorded as a decision, reported at close.
- One defect per build; previews at reduced quality and only the part's cameras; full packets for the chosen build only.
- No mid-stage tools (decision 16). No sweeps or planner rankings; the orchestrator picks the next defect by what reads most wrong at game size.
- Reconstruction runs are capped per part (three) before the method changes.
- Image generation stays on Codex; no paid image or 3D APIs without Nick's explicit go.

## 7. What this design does not build, and why

- A review route in the site: Artifact pages cost nothing to ship and keep site code untouched; revisit if review turnaround proves slow.
- Strand fur, cloth or physics on the game asset: mobile budget.
- LODs: fixed close cameras in every current game; added when a 3D scene has distance.
- Hand keyframing by agents: archetype code instead.
- A general part library or shared meshes: proportions leak between creatures; procedures and rig modules are shared instead.
- Motion capture, retargeting from humanoid libraries: non-humanoid roster.
- Per-species unique move sets: the vocabulary plus one or two signatures is the cost ceiling; more clips come only when a game asks.
- A scoring loop, toolsmith stage or planner ranking: measured waste.
- Clearing or reorganizing `C:\dev\art-data`: not this pipeline's data.

## 8. The vertical slice

One creature through all eleven stages, measured per stage. Success is a glTF loaded in the viewer on a phone-class profile under budget, with the five common clips and one signature clip, that Nick approved at every gate, plus a derived sprite atlas. The slice also settles two measurements the design cannot: the real frame time of twelve creatures on Nick's phone, and the cost of each outline technique. Cost per approved stage is compared with Hypnopet's image stages (vision 30 images, about 704K Codex tokens; sheet 23 images, about 645K) and the Akinza loop's numbers where a stage overlaps.

Nick accepted Luceras as the first creature and ruled licensing out as a concern on 2026-10-14. Pending his approval of this design and the design program order, work starts with the roster layer's quadruped modules, the base meshes and the tech spec template, which the slice needs first.

## 9. Part 2: measured budgets (in progress, 2026-10-14)

Process decisions, the pipeline owner's:

- **Runtime: three.js**, loaded as a pinned module in whichever game adopts 3D, with the glTF, KTX2, meshopt and material-variants loaders. model-viewer was rejected because it is a single-model web component with no scene, no multi-creature control and no event hooks a game needs. Bundle cost is counted when a game cuts over, not here.
- **Method:** the budgets in decision 2 are replaced by measurement. `art/pipeline/budget/budget-scene.html` (published as an Artifact page) animates twelve to twenty-four skinned stand-in creatures at 6K, 10K and 15K triangles, lit and toon, with and without an inverted-hull outline, at 1024 and 2048 textures, and reports median frame time per preset on the device that runs it. Nick's phone is the floor device. The per-creature budget is the largest preset that holds 60 fps with twelve creatures on that phone, with a margin of a third for effects, interface and the game's own scene.
- **What the stand-in does not measure:** texture memory under compression, a post-pass outline, skinning with four influences (the stand-in uses two), and morph targets. Those are measured on the real Luceras asset in the viewer at stage 10.
- **Laptop result** (headless Chrome, Intel integrated graphics): every preset held the frame cap, so the laptop cannot set the budget.
- **Phone result (Nick's iPhone, iOS 18.7, Apple GPU, pixel ratio 2, 390 by 460 inside the Claude app, 2026-10-14):** every preset held 59 fps at a 17.0 ms frame, including 24 creatures at 10K (260,690 triangles, 145 draw calls) and 12 toon creatures with an inverted-hull outline (258,866 triangles, 85 draw calls). The ceiling is above the tested range.
- **Budgets set from it (decision 2 amended):** full tier 10,000 triangles (hard cap 12,000), low tier 3,000; one 1024 texture set; two materials; up to 60 joints; the inverted-hull outline is affordable on the floor device (two draw calls and double triangles per creature) and stays a live option for part 6. Scene budget: twelve creatures at full tier plus effects fits with at least a factor of two to spare on the floor device. These are levers; the real Luceras asset in the viewer is the second measurement.

## 10. Concurrency policy (Nick, 2026-10-14: "i dont want to overload my machine but at the same time I do want to have good efficiency")

| Work | Loads | Concurrency | Guard |
|---|---|---|---|
| Codex image runs | network only | up to 8 at once | retry with backoff on a rate-limit refusal; alias generation locked in the records tool |
| Blender builds and renders | CPU, memory | 1; 2 only with more than 9 GB free and low load | a slot lock under `art/pipeline/` shared by every runner and agent |
| Reconstruction (Hunyuan3D-2) | GPU under the 6.5 GB cap | exactly 1, never beside a Blender render | the same slot lock, GPU class |
| Builder agents | tokens | 2 to 3 | each heavy launch goes through the slot lock, so parallel agents cannot stack heavy work |
| Any heavy launch | | | the runner checks load and free memory first and waits instead of piling on |
