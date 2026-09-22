# Avilily motion comparison brief

Status: initial experiment built 2026-09-18 and a second art pass built 2026-09-20 at [the local motion comparison](../../art/creature-motion-comparison/README.md). Animated stage performance is an approved art-library role. The visual style and production method remain open. The comparison now includes the existing Godot cutout, a drawn replacement bloom, code-authored pixel cels editable as PNGs, a Godot 3D blockout, a first Blender character kept as the before, a second Blender pass built from what the first five showed, and a Bioflim metaball study as the structurally different species. It does not yet test native Pixelorama authoring, a production armature, a toon or outlined render, or a swarm body. All tools and assets are free and open source. Nick reviewed the second pass and the spec-built Akinza on 2026-09-20, said he leans toward the 3D look, and closed the proof of concept without choosing a style.

## Question

Which combination of visual style and animation method makes a Xalian's characteristic movement clear, expressive, and practical to produce across the species library? Compare moving work at normal game speed before choosing a house style. The existing [portrait](../../apps/web/src/svg/species/avilily.svg) is the reference image; the ratified [species template](../species-templates/avilily.json) and lore govern anatomy and behavior.

## One action, held constant

Animate Avilily's **Blossoming Ambuscade** in a fixed three-quarter view on a simple Floria canopy stage at an apparent size appropriate to a 390 px wide phone view. Show a quiet closed-beak pose, attention or preparation, bloom opening, a visible secretion cue, and recovery. The beak petals, eye, wing attachments, talons, crest, streamers, and source of secretion must remain traceable. Avilily is a small flitting avian; avoid a generic ground-bird run or a generic impact flash. The cue conveys an action, while the consuming game decides whether anything was contacted or affected.

Use approximately one to two seconds for the action trial, allowing each method to choose its own frame timing. Match camera, stage, displayed creature size, action meaning, and background across trials. Do not force identical keyframe positions or smoothing, since timing and pose design are part of what is being compared.

## Motion trials

| Trial | Source and authoring | What to learn |
| --- | --- | --- |
| Refined illustrated cutout | Improve the existing SVG parts and Godot key poses | Can better anticipation, overlap, joints, and recovery give the current look convincing weight? |
| Hybrid illustrated animation | Godot base rig with Krita replacement cels for the beak, face, wing extremes, or smear frames | Do selective redraws solve the mechanical moments without multiplying every frame's labor? |
| Deliberate pixel animation | Draw and time native pixel frames in Pixelorama | Can intentional pixel clusters express the floral beak and species acting at the actual stage scale? |
| Stylized 3D rendered to 2D | Model, rig, and render Avilily in Blender from the same camera | Does volume improve the bloom and wing movement enough to justify modeling and rendering work? |

The existing silhouette language can be explored within the cutout trial as a graphic treatment. A full hand-drawn cel version is an optional fifth trial if the hybrid exposes a motion that replacement cels cannot solve. These trials compare motion and appearance together; a pleasing still frame alone does not qualify a candidate.

## Deliverables for each trial

1. Editable source, including rig, drawings, model, and any effects.
2. A loopable quiet motion and the complete characteristic action as transparent frames with timing, origin, and emitter metadata.
3. A synchronized side-by-side playback in the same stage at 1× speed, with pause, scrub, and an effects toggle. Provide a no-effects playback first so acting and anatomy can be judged directly.
4. A short production log: setup time, motion edit time, changed frames or parts, export time, output size, and any source limitation found during revision.

## Review at normal speed

Ask viewers to identify what Avilily is about to do before the peak, locate the opening beak and secretion source at the peak, and describe its recovery without pausing. Then inspect frame by frame for exposed joins, clipping, volume collapse, foot or branch drift, and effects hiding the creature. Compare character identity, pose clarity, timing, weight, surface quality, revision effort, and export cost. Test on a phone-size stage with a light and a dark background. A reduced-motion still or low-motion pose should remain understandable.

Run the same test on one structurally different species after a promising method emerges. Bioflim's amorphous body or Vespersyn's swarm will reveal whether the approach extends beyond conventional limbs. Keep animation cues and art revisions separate from gameplay outcomes and immutable creature genesis.

## Second pass results (2026-09-20, observation only)

The second Blender pass answered the four questions the first comparison left open, on the same camera, stage scale, clip length, and atlas contract. Details and measured cost are in the [comparison README](../../art/creature-motion-comparison/README.md); the before-and-after plays on `pass2.html` at 390 px.

| Question from the first test | What pass 2 did | Observed result |
| --- | --- | --- |
| Can viewers predict the action before the peak? | A head snap and crest lift at 0.08 to 0.13 s, then a crouch to 0.38 s with legs folding and wings drawn back | Two preparation beats read at 1×; the crouch is the clearer of the two |
| Can they locate the beak and emission source at the peak? | Wings hinge at the shoulder and sweep back and up; five petals open radially around a throat and bead; the emitter is projected from the bead | The chest and beak stay clear; the flower reads, but the throat looks like a berry and the petals are foreshortened at phone size |
| Is Avilily recognizable at phone size? | Egg body, neck, tail fan, flank feathers, streamers trailing down and back | Closer to the portrait's silhouette than pass 1; surfaces are still plain plastic and the head is large |
| Does the recovery read without pausing? | Legs solved against the perch: feet leave on the hop, retake the branch, and the body squashes at landing before the settle | The landing reads; the closing petals look like a claw for two or three frames |

**Armature or deformation.** Shape keys plus solved pivots were enough for a rigid-feathered avian at this size; the shape keys were almost invisible. That does not generalize to soft bodies, so the structurally different species was Bioflim.

**Bioflim.** A keyed metaball mass with riding rock plates reached, sagged, and merged without a rig and in less authoring time than the avian revision. Its open risk is attaching rigid features to a deforming surface; the plates ride pivots and can float. Vespersyn's swarm remains untested.

**Recommendation, not a decision:** the next pass should test a toon or outlined render of the pass 2 scene beside the plain Cycles render, because the remaining distance to the portrait is line and surface language rather than motion. Fix the bloom at phone size in the same pass.

## Toward a deterministic pipeline (2026-09-20, agreed direction)

Nick agreed to iterate toward a process that is as deterministic as possible without losing quality. The first step is in place: the second-pass Avilily, Bioflim, and a new Dromeus biped are each a JSON spec run through a shared rig library (`art/creature-motion-comparison/blender/xalians_rig/`) with body-plan templates chosen by the ratified record's `bodyPlan`. Renders are byte-identical across runs, manifests carry provenance, and the library reproduced the earlier hand-scripted renders pixel for pixel. What remains hand-authored is template code per body plan, the numbers in a spec, and the judgment of whether a pose reads. The second biped, Akinza, was built on 2026-09-20: it needed twelve default-preserving template switches (Dromeus is horizontal, Akinza upright) and then only a spec; Dromeus rendered identically afterward. Nick closed the proof of concept at that point, leaning toward the 3D look without deciding. The third biped from a spec alone is the first task when the work resumes.

## Render styles (2026-09-21, observation only)

The recommended toon or outlined render was built as a library lever rather than a new model: `render.style` in a spec, or `--style=<name>` beside it. Avilily pass 2 now plays in `plain`, `toon` and `flat` on `styles.html?species=avilily`. The toon and flat rows keep every motion result of pass 2 (same spec hash, same projected emitter and cue) and change only the surface: the plain plastic is gone, the feather groups read as drawn shapes, and the bloom's petals hold their color at phone size. The throat still reads dark and the closing petals still pass through the claw-like frames, because those are spec and template problems, not surface ones. Nick had not reviewed the board when this was written.

