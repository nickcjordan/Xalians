# Creature production pipeline: design of record

Status: draft 1, 2026-10-14, submitted to Nick for explicit approval. Nothing here is ratified until he says so. Owner: the pipeline session on branch `creature-pipeline`. Audit behind it: [creature-pipeline-audit.md](creature-pipeline-audit.md). This design is independent of the Creature Studio experiment ([creature-studio.md](creature-studio.md)); it borrows ideas from it by reading, never by code or branch dependency.

## Context

Xalians has 33 ratified species across nine body plans and the roster will grow. Each needs to go from its species record, lore and Nick's silhouette to a finished, animated, game-ready asset. Nick is the art director and the only approver of creative results; agents do the work. Two earlier efforts shaped the lessons: the Akinza construction loop (scores, toolsmiths, 420M tokens for five keeps) and the Creature Studio experiment (records, defects, holds, a vision board and model sheet that each closed in a day, and a 3D face that stalled until a reconstruction tool was tried).

Nick ratified the delivery target on 2026-10-14: a live 3D asset that runs well in mobile browsers, with sprite sheets rendered from it as a derived option, and the door open for promotional 3D clips. This design builds every creature to that target.

Terms are defined in the audit's vocabulary paragraph and on first use below. The analogy Nick can hold the whole design in: each stage is a service with an input contract, an output contract, a validator suite (like a CI check) and a code reviewer who did not write the code; the roster layer is the shared library every creature links against; the tech spec is the interface definition written before implementation; Nick is the product owner who accepts or rejects a release.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The shipped asset is glTF 2.0 with a deformation skeleton, skinned mesh, clips with named events, KTX2-compressed textures and meshopt or Draco mesh compression; sprite atlases are rendered from it | 95%: Nick's ruling 2026-10-14 | this doc's Context; audit section 1 |
| 2 | Budgets at the low end of mobile WebGL, as levers: game mesh 6,000 to 14,000 triangles, two lower LODs by decimation, one 2048 texture set (base color, normal, packed occlusion-roughness-metallic, optional emissive), one or two materials, at most 60 deformation joints, at most 4 influences per vertex, at most 8 blend shapes, clips sampled at 30 fps | 70%: standard mobile practice, untested on this roster; the first creature measures real frame cost on Nick's phone and the numbers move | industry course notes; the audit G1, G3 |
| 3 | Authoring in Blender 5.2 under WSL, scripted through `bpy`, metric units, creature height from the species size band at the 50th percentile, origin on the floor, facing Blender's front view; the glTF exporter converts Z-up to Y-up | 90%: Blender is installed and proven; units were arbitrary before | audit G13; `art/creature-motion-comparison/README.md` |
| 4 | Six skeleton classes cover the nine body plans: biped (12 species), quadruped (8), multiped (6), serpentine (3, including the piscine Fathomaw), winged-biped (Avilily, plus a wing module for Terragoyle and Dromeus), soft (Bioflim, Ectoghoul, Neph: spline and blend-shape bodies). Vespersyn (swarm) is a soft lead figure plus instanced minors | 75%: counted from the v5 records; the singletons are judgment calls that the roster layer revisits when each is built | `docs/species-templates/v5/*.json` `physiology.bodyPlan` |
| 5 | Rigs are assembled from shared modules (spine, neck and head, 2-link and 3-link legs, arm, tail chain, wing, ear chain, jaw, horn or crest attachment) with per-creature joint placement; the control rig stays in Blender, only the deformation skeleton ships | 85%: industry practice, matches the reuse plan's "procedures not parts" ruling | audit G4, G10; `creature-studio-reuse.md` |
| 6 | A common move vocabulary of five clips every creature has (idle, hurt, faint, light act, heavy act) plus one or two signature clips mapped from the creature's derived acts onto animation archetypes (lunge, strike, spit or beam, slam, charge, bloom, burrow); a game reads the clip names, never the species | 80%: the derived-acts tables already give every act a mechanism; archetype mapping is new | `docs/design/creature-derived-acts.md`; audit G4, G14 |
| 7 | Deformation is checked right after the blockout with a proxy rig (class skeleton, automatic weights, three extreme poses) before any look work; failing it reopens the blockout | 90%: the one practice every source agrees on; nothing here has ever been skinned | audit G2 |
| 8 | The sculpt (dense look mesh) and the game mesh are different artifacts. The sculpt source for soft look-driven parts is image-to-3D reconstruction from the approved model sheet; parts that move or need exact control (eyes, ears, horns, limbs, claws) are authored. The game mesh is made by automatic quad retopology plus authored edge loops at eyes, mouth and joints, then UVs, then bakes | 75%: reconstruction read right where hand masses stalled (experiment X29); retopology by agents is unproven and is what the slice tests first | audit G3, G9; `creature-studio-head-recon-trial.md` on branch `creature-studio-work` |
| 9 | Reconstruction geometry that ships must come from an MIT-licensed model (TripoSG first, under the 6.5 GB GPU ceiling with offload); Hunyuan3D-2 may be used as a visual reference only, because its license bars use and distribution of its outputs in the EU, UK and South Korea | 70%: license read; TripoSG's main-repo license and VRAM fit are not yet verified on this machine | audit G12; `C:\dev\art-data\tools\Hunyuan3D-2\LICENSE` section 5c |
| 10 | Lighting model: stylized lit (hand-painted-feel base color under light PBR, no outline pass) as the default; toon with outline stays a render style for sprites and promo clips. Decided by Nick on a rendered A/B on the first creature, not by text | 60%: outlines on mobile cost either doubled geometry (inverted hull) or a post pass; Nick leaned toon on 2026-09-21 and has not seen the alternative at game size | audit G5 |
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
| Skeleton classes and rig modules | Six classes (decision 4), modules (decision 5) as `bpy` builders with named joints (`spine_01`, `leg_l_01`, `tail_03`), a documented joint naming rule, and a proxy-rig recipe (bind, auto weights, three poses) | Shared skeletons and retargeting | Adapt: modules not fixed skeletons, because leg counts and tail lengths vary |
| Move vocabulary and archetypes | Five common clips, archetype table mapping derived-act mechanisms to motion archetypes, event names (`hit`, `emit`, `foot_down`, `recover`), length budgets per clip as levers (idle loop 2 to 4 s, hurt under 0.6 s, acts 0.8 to 1.6 s with the event before the halfway point) | Shared clip libraries, animation events, state-machine templates | Adapt: shared vocabulary, per-class reference clips, species-specific signature |
| Look-dev scene | One `.blend` with neutral three-point lighting, turntable, the standard cameras, a 192 px sprite-size camera, and a 1 m scale figure | Fixed look-dev scene | Adopt |
| Style bible | One page: value structure, shape language per element, detail level at game size, texel density (a lever, start 512 px per meter at the game mesh), material vocabulary (fur, scales, chitin, hide, plating, mist, bare, feathers, with one recipe each), outline rule, silhouette test | Style bible | Adopt, one page |
| Validators | Python scripts run inside Blender and on the exported glTF: manifold, scale and axes, naming, influence count, unweighted vertices, UV overlap and texel density, triangle count, joint count, material count, texture sizes, clip events present, glTF validator pass | Import validators | Adapt: three kinds per decision 12 |
| Viewer | A static web page (three.js from a pinned CDN, local only) that loads a glTF, plays clips, shows the triangle and draw-call count, and runs at phone width | Engine test scene | Adopt |

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
| 6 | Game mesh | Sculpt | Retopologized mesh in budget, authored loops at eyes, mouth and joints, UVs, LOD1 and LOD2 | Validators: triangle count, manifold, UV overlap, texel density, LOD ratios; reviewer compares sculpt and game mesh at game size | Technical gate; Nick sees sculpt beside game mesh at game size and only judges visible loss |
| 7 | Surface | Game mesh, sculpt, vision palette | Baked normal and occlusion from the sculpt, base color with pattern in UV space, material from the vocabulary, texture fur, finish treatment plan for the four finishes | Validators: texture sizes, material count, missing maps; reviewer checks the look-dev renders against the vision picks | Nick approves the look in the look-dev scene at game size and close |
| 8 | Rig | Game mesh, class modules | Deformation skeleton, skinning, corrective blend shapes where a joint cannot, control rig in Blender | Validators: joint count, influences, unweighted vertices, naming; reviewer runs the pose sheet | Nick approves a deformation sheet (rest and the extreme poses) |
| 9 | Animate | Rig, move vocabulary, derived acts | The five common clips plus one or two signature clips with events; sprite-size playback | Validators: clip lengths against budget, events present, loop seams; reviewer watches at 1x on the viewer page | Nick approves on a moving page, never stills |
| 10 | Export and validate | Everything | glTF with compressed textures and mesh, a manifest with provenance and the tech spec, a derived sprite atlas in `xalians-frame-atlas-v1`, the viewer page at phone width with frame timing | glTF validator, all three check kinds, the viewer's measured frame cost on a phone-class profile | Nick approves the shipped asset in the browser |
| 11 | Retro | Stage records | Cost per stage, defects per part, what to promote to the roster layer, design changes | | Written, then this design is amended |

Stages 2 and 3 are kept from the experiment because they worked. Stage 4 is the new early gate. Stages 6, 8, 9 and 10 did not exist anywhere before.

What "approved" protects: a look, never an implementation. A builder may change anything a goal needs inside a part and must declare changes outside it.

## 3. Agent roles and contracts

| Role | Model | Contract |
|---|---|---|
| Orchestrator (this session) | Opus-class | Writes briefs from records, runs stage closes, records costs and holds, decides budgets, talks to Nick. Never builds, never reviews its own brief's result |
| Stage builder | Sonnet for mechanical stages (model sheet prompts, retopology runs, UVs, bakes, export, validators), Opus for any new geometry or rig method | Receives: goal in Nick's words, part or stage scope, holds with sources, allowed changes, required outputs, deadline. Returns: outputs with hashes, the defect's result with evidence, Blocked by, new defects seen, cost. Never grades its own work, never adds a tool |
| Stage reviewer | Opus | Receives the stage checklist and the outputs only, never the builder's narrative. Returns pass or a named-defect list with image regions. A stage is not presented while the list is non-empty |
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
- A general part library or shared meshes: proportions leak between creatures; procedures and rig modules are shared instead.
- Motion capture, retargeting from humanoid libraries: non-humanoid roster.
- Per-species unique move sets: the vocabulary plus one or two signatures is the cost ceiling; more clips come only when a game asks.
- A scoring loop, toolsmith stage or planner ranking: measured waste.
- Clearing or reorganizing `C:\dev\art-data`: not this pipeline's data.

## 8. The vertical slice

One creature through all eleven stages, measured per stage. Success is a glTF loaded in the viewer on a phone-class profile under budget, with the five common clips and one signature clip, that Nick approved at every gate, plus a derived sprite atlas. Cost per approved stage is compared with Hypnopet's image stages (vision 30 images, about 704K Codex tokens; sheet 23 images, about 645K) and the Akinza loop's numbers where a stage overlaps.

Pending Nick's approval of this design, and his answers on the first creature, the lighting model A/B, and the reconstruction license policy, work starts with the roster layer's quadruped class and the tech spec template, which the slice needs first.
