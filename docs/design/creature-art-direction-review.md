# Creature art direction and reusable motion pipeline: review

Status: research and proposal, updated 2026-09-18. Nick approved animated stage performance as an additional species presentation and is open to more forms. The portrait remains a reference baseline. This review concentrates on motion style, animation method, and reusable production. No permanent visual style or clip catalog has been approved. This review changes no creature genesis, lore, platform, or game rule. Tools considered here are free and open source.

## The decision to make

The pilot proved that edited parts can be animated in Godot, exported as frames, and used by a separate canvas scene. It did not establish the permanent look of Xalians. The choice ahead has three independent layers:

1. **Visual language:** shape, proportions, line, palette, texture, lighting, and how strange or approachable a creature feels.
2. **Motion authoring:** cutout rig, redrawn frames, 3D model and armature, or a mixture of these.
3. **Game delivery:** packed 2D frames, a live rig, or a live 3D scene. The delivery format need not reveal the authoring tool.

Pixel art is a visual language with a pixel grid and scaling discipline, not a synonym for sprite sheets. A sprite can be a rendered painting, a pixel drawing, or a frame from a 3D model. The current colored look is only one treatment of the cutout method. Godot explicitly supports combining cutout animation with redrawn cels for complex parts. [Godot cutout animation](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html).

## Current Xalians boundaries

The [species art system](species-art-system.md) records the approved stage role and portrait reference. The historical [creature system](xalian-creature-system-redesign.md) named silhouette art and renderer-applied finishes as its earlier launch presentation strategy. Nick's 2026-09-18 direction allows additional forms without fixing the final stage style. All stage art must remain faithful to the ratified species template, including anatomy, functional emitters, size, and the point of contact that makes a creature relatable. The current [generation design](xalian-generation-system.md) keeps creature genesis immutable and game outcomes separate from art.

The current individual appearance record has `finish`, with `standard`, `gleam`, `prismatic`, and `eclipse`. `variant`, `pattern`, and `palette` are reserved and absent until separately designed. A rendering pipeline can show the stored finish and physical size without introducing new generated identity fields. Finishes do not grant unrelated power; an appearance-centered game may read appearance as appearance. Art revisions need their own version/provenance so a visual improvement does not rewrite a creature record or a frozen generation release.

The finish vocabulary stays, but its visual recipe needs a new pass if the stage look becomes painted, pixel-based, or 3D-derived. In particular, the earlier `eclipse` description relies on an inverted silhouette and element-colored rim. A richer surface needs to preserve its identity and readability without assuming that exact silhouette treatment works on every form. Test all four finishes on the same species and at the same display sizes before writing a cross-style rendering rule. This is concrete friction with the older silhouette-first art ruling, not a proposed change to a generated appearance field.

## Style and production candidates

These are production candidates, not mutually exclusive tool categories. Relative cost and fit are our judgment for this repository and its multi-species library, not a published benchmark.

| Candidate | What players would see | Strength here | Main cost or risk | Free authoring route |
| --- | --- | --- | --- | --- |
| **S. Expanded silhouette language** | Graphic figures with shaped negative space and selective internal accents | Strong continuity with the current visual language and straightforward finish overlays | Limited material and facial acting; stage motion needs newly separated parts and clear internal gaps | Inkscape SVG, Godot cutout, separate effect layers |
| **A. Refined illustrated cutout** | Clean shapes, controlled line and shading, expressive silhouettes | Most direct continuation of the pilot, editable anatomy, fast pose revisions | Flatness, visible seams, stiff rotations if the rig is asked to do everything | Inkscape SVG, Godot rig, optional Krita paintovers |
| **B. Textured illustrated hybrid** | Hand-inked or painted surfaces over strong graphic shapes, selective redrawn peak poses | Distinctive species materials and facial contact without giving up reusable rigs | More art direction and color consistency work per species | Inkscape or Krita layers, Godot cutout, Krita redraws |
| **C. Deliberate pixel art** | Clustered pixels, limited palettes, stepped edges, controlled frame timing | Strong visual identity at a fixed logical size, compact source drawings | Requires a full redraw and a pixel-first stage and effects language; noninteger scaling harms pixels | Pixelorama or LibreSprite; Pixelorama has frame tags, onion skins, sheet export, and CLI export |
| **D. Fully drawn 2D cels** | Each key pose can change shape freely, giving expressive squash, smear, and acting | Best for faces, morphs, recoil, effects, and actions that expose cutout joints | Most new drawings for each clip, facing, and revision | Krita frame animation; OpenToonz or Blender Grease Pencil are alternatives |
| **E. Stylized 3D rendered into sprites** | Shaded volume and consistent turns captured from one camera into transparent frames | One model can supply angles and lighting consistency, while games still consume the 2D atlas | Modeling, topology, skinning, materials, render time, and a possible generic 3D look | Blender model and armature, fixed camera, transparent PNG sequence |
| **F. Live stylized 3D** | Models lit and posed in the game at runtime, with camera movement | Most useful if future games genuinely need viewpoint changes or depth | Every consuming game needs a 3D runtime, lighting, camera, performance work, and compatible art direction | Blender source, glTF export, Godot 3D or Three.js |

Pixelorama's documentation covers [onion skinning and clip tags](https://pixelorama.org/user_manual/user_interface/timeline/), [sprite sheet export](https://pixelorama.org/user_manual/save_and_export/), and [command-line export](https://pixelorama.org/user_manual/cli/). Godot recommends integer scale for pixel art because fractional display scaling makes pixel widths uneven; that affects responsive phone layouts. [Godot resolution guide](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html). Krita supports frame-by-frame raster animation, onion skinning, storyboard planning, and image-sequence export, with memory cost as frame counts rise. [Krita animation guide](https://docs.krita.org/en/user_manual/animation.html), [Krita export guide](https://docs.krita.org/en/reference_manual/render_animation.html). Blender provides 3D armatures, Grease Pencil 2D drawing, transparent rendering, and numbered animation frame output. Its software is free and open source, and the artwork remains the creator's property. [Blender armatures](https://docs.blender.org/manual/en/latest/animation/armatures/bones/structure.html), [Grease Pencil](https://www.blender.org/features/grease-pencil/), [transparent film](https://docs.blender.org/manual/en/latest/render/eevee/render_settings/film.html), [animation output](https://docs.blender.org/manual/en/5.2/render/output/properties/output.html), [license](https://www.blender.org/about/license/). Live 3D is technically possible in web games with [Three.js glTF loading](https://threejs.org/docs/pages/GLTFLoader.html), but it moves more presentation responsibility into each game.

### Fit judgment

**S remains a useful visual comparison.** A stage character asks more from the current silhouette style, especially eyes, anatomy, and motion. It should be animated in the comparison rather than assumed to work unchanged.

**A remains a valid baseline.** Its weakest point is polish, especially part overlaps, facial acting, lighting, and action extremes. Those can be improved without discarding the rig and export flow.

**B is the strongest next motion direction to test.** It keeps the portable sheets and anatomy-aware motion, adds surface character, and permits a small number of hand-drawn replacement frames at the moments a rig looks mechanical. This is a recommendation for comparison, not approval of a new canonical style.

**C deserves a real comparison image, not an automated pixelation of A.** Pixel art needs intentional clusters, palettes, animation timing, effects, backgrounds, and integer scaling. A filter over current sheets would be a misleading test. Pixelorama can support a reproducible export workflow, but 32 species would need new art.

**E is the most useful 3D counterproposal.** A Blender source can still export the same atlas contract, so a 3D test need not force games into 3D. This path may pay off if many angles or turns matter. Its modeling and rigging cost should be measured on an actual unusual Xalian rather than assumed.

**D should be available as a technique within A or B.** Drawing every frame for every species is expensive, but drawn beak changes, hands, faces, transformations, and impact frames can solve specific cutout failures. Godot's cutout guide explicitly describes this combination.

**F is deferred as a default delivery path.** It can be revisited when a particular game needs a movable camera or genuine depth. A creature library intended for multiple current 2D games benefits from a simpler shared export.

## What the pilot actually says

The [pilot](../../art/creature-motion-pilot/README.md) exercises biped, avian, and segmented bodies with three clips each and a stand-alone battle scene. The art cue starts a mock reaction, but it is not a statement that a hit occurred. The current scene establishes readability and timing in one context; it is not a canonical encounter or a production performance budget.

The action storyboard shows a useful baseline and clear weaknesses. Akinza's ears, eyes, and tail identify it quickly, but the early action poses read as small limb changes before a larger leap. Avilily's bloom and wing spread make the peak legible, while its legs and body still feel like separate flat pieces. Frackworm's drill head and segment chain read well, but the point of contact is small at play size and its hovering stage pose obscures its burrowing identity. Across all three, clean outlines and broad colors provide clarity; material character, weight, joint transitions, and stronger anticipation would add much of the missing polish. These are judgments from the exported storyboard and demo design, not a completed user playtest.

- Each species has about 66 to 70 exported frames across its three clips. The full set occupies about **45 MiB of raw RGBA sheet area per species**, compared with **11.25 MiB** for Compact. These are calculated as sheet width × height × four bytes, not measured browser or GPU allocation. Three simultaneously resident full sets would occupy about 135 MiB by that calculation before backgrounds and effects. PNG transfer sizes are much smaller, roughly 2.6 to 3.2 MiB per full species.
- The full sheets are **3072 px wide**. Phaser's texture documentation says maximum size depends on the device and offers 2048 px as a conservative mobile size. The full profile therefore needs smaller pages or another packing strategy before broad mobile use. [Phaser texture guide](https://docs.phaser.io/phaser/concepts/textures).
- The visible frame bounding rectangles cover only **38 to 44 percent** of the fixed cell area across these exports. That calculation does not predict exact packing savings, but it makes trimmed atlases with per-frame offsets a high-value experiment. Phaser's atlas format records trim and original source dimensions; our engine-neutral manifest could do the same. [Phaser frame and trim data](https://docs.phaser.io/api-documentation/class/textures-frame).
- The demo normalizes stage size for comparison. Akinza's size band is 1.3 to 1.65 m, Avilily's is 0.4 to 0.56 m, and Frackworm's is 9 to 15 m. Frackworm's ratified habitat says it does not come to the surface. A future stage depiction should use camera, crop, environment, or an explicit schematic treatment so visual staging does not imply that all species share a body scale or habitat.
- The current three actions have no true turnarounds, locomotion family, or individual finish treatment. The workbench's mirror option is a review convenience. Part joins and the painted character surfaces still need refinement.
## Provisional animation contract

Because any species may appear in a future game, the reusable library needs common **presentation capabilities**. These are proposals for the next study, not an approved fixed list of clip files:

| Capability | What it must communicate | Body-plan freedom |
| --- | --- | --- |
| Quiet presence | A recognizable living creature at rest, with a clean loop or held pose | Breathing, wing settling, segment pressure, swarm coherence, or another species-specific behavior |
| Characteristic performance | One lore-grounded action with anticipation, a readable peak, follow-through, and recovery | Flight, bloom, burrow, amorphous reshaping, and other actions need different rigs and frame treatment |
| Response | A visible acknowledgement when the game requests a reaction | The game chooses the meaning and result; the art supplies visual responses such as recoil, evade, or composure where needed |
| Placement continuity | Stable floor or stage anchor, clear entrance/exit or pose transitions, and known facing | Camera, crop, and habitat conventions may differ by species and game |

For each performance, record its intended viewing size, camera/view, timing, loop behavior, origin, effect emitters, and optional visual cue times. A cue marks a visible moment such as Avilily's bloom opening; it does not mean that another creature was hit. Do not make one species perform another's generic attack motion. Add movement, defense, celebration, or alternate facings when a real game or review case establishes the need. The Avilily trial should test whether these capabilities can be authored and revised efficiently before the contract becomes mandatory.

## Proposed concept constraints for review

The first five bullets preserve existing authority; the remaining bullets are proposed art direction controls and need review before they become a house style.

| Layer | Authority and room to work |
| --- | --- |
| Creature canon | Ratified template, lore, functional anatomy, body plan, size band, and appearance fields are the source. A proposed change to one of these goes through a separate creature design decision. |
| Species visual identity | An approved model sheet chooses proportions, fixed markings, material treatment, eyes or other contact point, and the silhouette shared across presentation sizes. These choices have creative room within canon. |
| Shared art direction | Once selected, a style guide sets line and shadow behavior, value range, finish treatment, camera conventions, and small-scale readability. It should leave each planet and body plan recognizable. |
| Game presentation | Each game places art in its scene, chooses camera and effects, and decides results. A dramatic crop or scale treatment needs to read as staging rather than a new biological fact. |

**Existing source constraints**

1. Trace required body parts, attachment points, coverings, eyes or other point of contact, and functional output sources from the ratified template. Do not use a render accident to change anatomy or lore.
2. Preserve recognizable species identity from the portrait reference through the chosen stage performance.
3. Vary individuals only through appearance dimensions that are actually in their records. Render the four current finishes consistently and do not infer unrelated powers from them. Do not silently instantiate reserved `variant`, `pattern`, or `palette` fields.
4. Treat visual timing markers as presentation cues. A game decides the action result and when to request `hit`, `miss`, `block`, or other reactions.
5. Keep local games free to iterate; a shared art adapter does not imply platform receipts, rewards, or engine extraction.

**Proposed visual controls**

6. Define one model sheet per species: front or three-quarter rest view, side or turn reference where needed, silhouette, scale reference, eye/contact point, anatomy trace, and the source of any emitted material.
7. Set a shape and line hierarchy at game size before texture detail. Important parts should read in monochrome at the smallest intended stage size, and effects must not hide the point of contact or emitter.
8. Use a constrained camera and light direction within a given game scene. The creature library can provide view variants, while each game stages them for its own perspective.
9. Keep creature form, effect, shadow, and interface in separate layers. Finish effects must remain legible over both dark and light stage backgrounds, and reduced-motion presentation needs a calm alternative.
10. Give each species an authored motion brief. `idle` and `react` can be broad shared semantics; locomotion and signature performances should be species-specific. Build in anticipation, a readable peak, and recovery at actual play size.
11. Record art source, revision, camera/view, clip, export profile, dimensions, origin, optional attachment points, cue times, and sheet locations in a versioned asset manifest. Keep this versioning separate from immutable creature genesis.

For a production species, begin with the [existing concept refinement protocol](species-art-system.md): identify the approved record and image baseline, mark invariants and regions open to change, trace every functional limb and emitted substance, and check silhouettes at actual stage size. Add a motion board before rigging: rest, anticipation, peak, recovery, and the cue's visual meaning. An art edit that seems to improve the canonical anatomy is a proposal for a separate decision, not an automatic record update. Keep the source file and the review outcome with the approved asset.

## Recommended next pass

The [first Avilily comparison](../../art/creature-motion-comparison/README.md) now plays five actual motion trials side by side. The current cutout, a cutout with a replacement flower cel, a deliberate pixel-grid redraw, a Godot 3D blockout, and a Blender character render all use the same frame manifest. Visual inspection found that the replacement bloom improves the peak shape but still looks layered onto the face; pixel frames clearly change the flower shape but imply a whole-scene style commitment; and the Godot 3D blockout holds volume but loses floral feather character. The Blender trial restores layered feathers, lighting, and a distinct opening flower, while retaining some toy-like proportions and wing overlap. These are prototype observations, not a permanent style decision or a viewer study. Blender 5.2.2 runs locally under WSL because the Windows package did not launch on this machine.

**Second pass (2026-09-20).** A second Blender Avilily was built beside the first, and Bioflim was run through the same method as the amorphous stress test; both play locally at 390 px with the first pass kept as the before. Observed: the wing no longer crosses the chest or flower, two preparation beats precede a real hop with a solved landing, and the beak is one radial mechanism; the throat and petal foreshortening still weaken the peak at phone size, the surfaces are plain shaded plastic, and the closing petals briefly read as a claw. Shape keys plus solved pivots were sufficient for a rigid-part avian; an armature was not needed at this size. Metaballs handled Bioflim's reach and sag with no rig, and exposed that rigid features attached to a deforming surface need a real attachment mechanism. The remaining distance to the portrait is line and surface language rather than motion, so the recommended next experiment is a toon or outlined render of the same scene beside the plain render. These are prototype observations and a recommendation, not a style decision. Measured cost is in the comparison README.

1. **Review moving evidence.** Watch the [Avilily motion brief's comparison](avilily-motion-comparison-brief.md) at 1× in the shared stage, with effects hidden first. Record which version makes the preparation, bloom, and recovery clear, and where anatomy or acting breaks.
2. **Revise the strongest methods.** Redraw the hybrid's closed-to-open face transition and improve the promising alternative after seeing the motion. Compare anticipation, action clarity, physical weight, joins, facial acting, and recovery. Test `standard` and one nonstandard finish as presentation treatments without changing genesis.
3. **Stress a difficult anatomy.** After choosing a visual language, test Bioflim's amorphous body or Vespersyn's swarm against the authoring method. The three current pilot rigs do not prove the full species range is covered.
4. **Fix format economics.** Add trimmed atlas offsets, cap page dimensions, and load only the required creatures and clips. Measure transfer, decoded sheet area, runtime memory, and frame pacing on a real target phone before setting budgets. Preserve the current fixed-cell exporter as a comparison baseline.
5. **Publish an art bible and adapter contract.** Record the selected look, example species sheet, allowed views, finish handling, naming, source-file rules, cue meanings, review checklist, and versioned export schema. Keep each game responsible for its own stage composition and outcomes. Integrate a specific game only at its requested cutover.

Success for this next pass is a character performance that viewers understand at normal speed and actual stage size, with faithful anatomy and habitat staging, repeatable editable source, and a measured mobile footprint. Record time spent per species and revised clip so the full-library cost becomes visible.

## Decision status

**Agreed 2026-09-18:** animated stage performance is an approved additional role. The portrait remains a reference baseline, and the library may add further forms for demonstrated uses. This supersedes a fixed two-form or three-form art policy. It does not choose a final visual style or change the immutable appearance schema.

**Open:** The final motion and visual style, camera/view policy, and clip requirements. Moving comparisons and production effort now exist for Avilily (two Blender passes beside four other methods) and for one challenging body plan (Bioflim in metaballs). Nick reviewed the second pass and the spec-built Akinza on 2026-09-20 and said he leans toward the 3D look, but he has not decided, and the proof of concept closed there. The next evidence should be a toon or outlined render of the 3D source against the plain render, a bloom fix checked at phone size, and the swarm body (Vespersyn).
