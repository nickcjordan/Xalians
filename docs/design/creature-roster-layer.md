# Creature roster layer (part 3 of the pipeline design)

Status: draft 1, 2026-10-14. Part 3 of the six-part program in [creature-pipeline-design.md](creature-pipeline-design.md). The roster layer is the shared library every creature links against: rig modules, joint naming, rest poses, motion archetypes, base meshes, the look-dev scene, the style bible's frame, validators, and the build order across the 33 species. Every decision here is a process decision and is the pipeline owner's; nothing on this page needs Nick's opinion until there is a rendered creature to look at (part 6). The first technical proof of this layer is the walking skeleton under `art/pipeline/` (a stand-in quadruped through rig, clips, export, validation and the browser viewer).

Vocabulary: a **module** is a reusable rig builder (a spine, a leg chain) with parameters; a **class** is a named assembly of modules with a rest pose (quadruped); an **archetype** is a motion family implemented as code with parameters (lunge); a **base mesh** is a clean, pre-unwrapped, pre-weighted mesh for one module that gets wrapped onto a creature's sculpt; the **look-dev scene** is one Blender file with fixed lights and cameras every creature is reviewed in.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Joint naming is `<module>_<side>_<nn>` (`spine_01`, `leg_fl_02`, `tail_03`, `ear_l_01`), `root` at the origin, with socket bones carrying a `xalians_socket` custom property that exports as glTF node extras. Games read sockets by that tag, never by joint name | 90%: the contract requires tag-based sockets; the naming rule is the standard studio pattern | asset contract decision 4 |
| 2 | Seven modules cover the roster: spine, neck_head, limb chain (2 or 3 joints, with a leg-count parameter per class), wing, tail or tentacle chain, ear chain, jaw; plus attachment sockets for horns, crests, blades. Each module exposes count, length, placement and rest angles | 80%: counted against every species' appearance list; the swarm and the rooted Xylum are the two that strain it | `docs/species-templates/v5/*.json` |
| 3 | Six classes assemble those modules with a rest pose each: quadruped (8 species), biped (11), multiped (6, leg count 6 to 16), serpentine (3, including Fathomaw with fins), winged (Avilily; the wing module also attaches to Dromeus and Terragoyle in their own classes), soft (Bioflim, Ectoghoul, Neph: a spline spine with blend shapes). Vespersyn gets its own route (a lead figure from the biped class plus instanced minors) | 75%: body plan still groups well enough for rest poses and locomotion; wings cross classes as a module | audit G4, G21 |
| 4 | The deformation skeleton is capped at 60 joints per creature and 4 influences per vertex; a control rig (IK handles, foot targets) exists only inside Blender and is never exported | 90%: measured headroom on the floor device; studio standard | design section 9 |
| 5 | Archetypes are code: each is a function of (class, parameters, duration) producing keyframes at 30 fps and its event times. The nine archetypes from the contract (lunge, strike, slam, sweep, spit, spray, burst, aura, brace) plus locomotion gaits (biped walk, quadruped bound and trot, wave gait for many legs, undulation, hover) and the receiving-side clips (hurt, evade, guard, displaced, held, faint). A signature clip is an archetype with hand-set parameters and extra keys, never a from-scratch keyframe job | 80%: the older rig library proved eased key tracks with lag read as performance; agents keyframe by eye poorly | audit G19 |
| 6 | Base meshes exist per module, not per creature: a quad-topology tube with edge loops at every joint for limbs, tails, necks and spines; a head base with loops around eye sockets and mouth; an ear leaf; a wing membrane. Each ships with UVs and default weights. A creature's game mesh is these bases wrapped (shrinkwrap plus smoothing) onto its sculpt, joined, with QuadriFlow for anything no base fits | 70%: standard practice; unproven here, and the slice is the test | audit G3 |
| 7 | The look-dev scene is one `.blend`: neutral three-point lighting, a gray ground, the standard cameras (front, three-quarter left and right, side left and right, back, top, below), a 192 px sprite-size camera, a turntable, and a 1 m scale figure. Every review image of every creature comes from it | 90% | audit G5, G11 |
| 8 | The style bible is one page with two halves: the technical half (texel density 512 px per meter at full tier, one material plus eyes or emissive, outline policy, silhouette test at 48 px) is decided here; the look half (value structure, shape language per element, detail level, material recipes) is drafted here and decided by Nick on rendered options in part 6 | 85% | audit G5 |
| 9 | Build order across the roster is by class, largest first, and inside a class by shared covering: quadruped (Luceras first, then Imprit, Venemist, Chromocat with fur; Hippochamp, Kosanos, Terragoyle with hide), biped, multiped, serpentine, winged, soft, swarm | 80%: maximizes reuse of modules and material recipes; Akinza stays out | design decision 17 |
| 10 | Validators run in three places: inside Blender before export (joint count, influences, unweighted vertices, manifold, scale, forward axis, naming), on the glTF after export (the contract validator), and in the viewer (frame time, draw calls on a phone-class profile). Only engine-breaking checks block | 90% | design decision 12 |
| 12 | Faces and other soft look-driven forms come from reconstruction of the approved clay views, never from hand-placed masses: both agents stalled on the Luceras head with masses (two builds each) and the Hypnopet trial found the same; reconstruction is the rule for those parts, with authored rigid parts (horns, eyes, ears, claws) seated on it | 90%: three independent stalls, one method that read right each time | log entries 20, X28, X29 |
| 11 | Texture compression (KTX2) and the low tier are added to the chain after the stand-in proves the rest; both are mechanical and need only tool installs (toktx, a decimator with weight transfer) | 85% | asset contract decisions 3, 13 |

## 1. Modules

| Module | Joints | Parameters | Used by |
|---|---|---|---|
| spine | 3 to 6 | count, length, curve (horizontal, upright, arched), root height | every class |
| neck_head | neck 1 to 3, head 1 | neck count, length, pitch; head size; jaw attachment | every class but soft and swarm minors |
| limb | 2 or 3 per leg | per leg: joint count, lengths, stance width, splay, digitigrade or plantigrade; count per class (2, 4, 6, 8, 16) | biped, quadruped, multiped |
| wing | 3 per wing | span, fold angle, membrane or feathered | Avilily, Dromeus, Terragoyle |
| tail | 2 to 8 | count, length, droop, taper; tentacle variant for Xylum and Neph | most species |
| ear | 1 to 3 per ear | count, length, droop, spread | furred species with ears |
| jaw | 1 | hinge position, open angle | species with jaws or beaks |
| sockets | 0 | horn, crest, blade, vent, status, carry, emitter | attachment only, no deformation |

Every module builder writes bones with the naming rule, sets roll consistently (X axis along the bone's bend plane), and returns the socket bones it created. The class spec is JSON; a creature spec is the class spec plus overrides measured from its blockout.

## 2. Classes and rest poses

| Class | Rest pose | Locomotion archetypes | Notes |
|---|---|---|---|
| quadruped | standing square, legs slightly apart, head level, tail at rest droop | bound, trot, hop | Luceras, Imprit, Venemist, Chromocat, Hypnopet, Hippochamp, Kosanos, Terragoyle |
| biped | upright or horizontal torso per species, arms relaxed away from the body, legs apart | walk, run, dash | 11 species; Dromeus horizontal, Akinza upright |
| multiped | low body, legs splayed evenly, pincers or forelimbs raised clear | wave gait, scuttle | leg count 6 to 16; Graviclaw has an upright torso module on top |
| serpentine | straight body along +Z with a gentle S, head raised | undulation, coil | Frackworm, Thirstaserp, Fathomaw (fins as wing-module variants) |
| winged | perched, wings folded, feet apart | hop, flap, glide | Avilily |
| soft | spline spine, no limbs, rest height declared | hover, drift, surge | Bioflim, Ectoghoul, Neph |
| swarm | biped lead at rest, minors on a hover orbit | orbit, converge | Vespersyn, own route |

The rest pose is what the model sheet draws (stage 3) and what the base meshes are weighted in. A game never sees it; the idle clip starts from it.

## 3. Archetypes as code

Each archetype is `make_<archetype>(rig, params, duration_ms) -> keys, events`. Shared primitives: eased key tracks with lag per joint down a chain (a tail follows the spine late), a two-link foot solver against the ground, a breathing cycle, anticipation and overshoot curves. Parameters are per species and live in its creature spec (crouch depth, launch height, strike reach, recoil). The event times are outputs, written into the manifest, never typed by hand. A signature clip is an archetype call plus a small list of extra keys, which keeps every signature reviewable as a diff against its archetype.

Required events per archetype are in the contract (section 6). Receiving-side clips are archetypes too: hurt (recoil along the hit direction, ears and tail react), evade (a sidestep or hop, `clear`), guard (a brace, `set`), displaced (a slide with `impact` and `settle`), held (a strain loop), faint (a collapse with `down`).

## 4. Base meshes and the game mesh

A base mesh per module, authored once by hand in Blender and reviewed by the pipeline owner for loop flow at the joints (the one place a human eye is spent on topology, and only once per module): limb tube (8 or 12 around, loops at each joint plus one between), spine tube (12 or 16 around), head base (loops around the eye sockets and mouth, a neck ring), ear leaf, wing membrane, tail tube. Each has UVs laid out in a fixed island layout so texel density is consistent, and default weights for its own joints.

Game mesh procedure (stage 6): place each base over the creature's sculpt by its module's joints, shrinkwrap to the sculpt with a smoothing pass, join at the module seams with a bridge, run the deformation test (proxy poses, measure volume change per joint region), fall back to QuadriFlow for a region that fails. Part identity rides as a vertex attribute so weights can be seeded by region.

## 5. Look-dev scene and style bible

The scene (`art/pipeline/roster/lookdev.blend`, generated by script so it is reproducible): neutral key, fill and rim lights, a mid-gray ground, the standard cameras, the sprite-size camera, a turntable action, a 1 m figure. Every review image Nick sees comes from this scene or from the browser viewer, never from an ad hoc camera.

Style bible frame (`docs/design/creature-style-bible.md`, written in part 6): technical half decided here (texel density 512 px per meter at full tier, 256 at low; one material plus eyes or emissive; outline policy per the part 6 decision; a silhouette test at 48 px must identify the species; texture fur rules from memory: short on face and neck, longer only where the sheet says). Look half drafted for Nick's rendered decision: value structure, shape language per element, detail level at game size, material recipes for fur, scales, chitin, hide, plating, mist, bare, feathers.

## 6. Validators

Inside Blender (before export): joint count at most 60; every vertex weighted; at most 4 influences; one closed manifold per tier; scale in meters within the species band; forward along -Y; naming rule; socket tags present; root bone at the origin.
On the glTF (contract validator): schema, hashes, Khronos validator, names present, root never translates, measured matches.
In the viewer: frame time with twelve copies, draw calls, texture bytes.
Only the first two sets can block; the viewer reports.

## 7. Build order and what the first creature leaves behind

Luceras (quadruped, fur) proves: the quadruped class, the limb, spine, neck_head, tail, ear, jaw modules and the horn socket, the bound gait, the lunge archetype, the receiving-side clips, the fur material recipe, the base meshes for tube, head and ear. After its retro the next quadrupeds should cost their creature spec, their sculpt, their surface and their signature. The biped class is next and inherits every module but the rest pose.

## 8. Proof: the walking skeleton

`art/pipeline/` holds the first end-to-end chain on a stand-in quadruped: class spec, rig modules, a generated body with automatic weights limited to four influences, parametric idle and lunge clips plus placeholder required clips, glTF export with meshopt, the contract manifest, the validator, and the browser viewer. Its measured numbers and what it does not yet do are in `art/pipeline/README.md`. It is not a creature and never reaches Nick as one; it is the pipeline's first green build.
