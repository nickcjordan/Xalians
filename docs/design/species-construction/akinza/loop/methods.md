# Akinza construction methods, loop v3

Written 2026-10-01 by the method planner from the baseline `assembled-0458` (head-0455, body-0448), `gap-audit-0458.md`, `status.json` with the round records 1 to 16, `recipe.json`, `lineage-0458.md` and the region specs. `methods.json` holds the same entries in machine form. R10 and R11 are on hold by Nick's direction and get no method.

## Context

The v2 loop fitted the outlines: the fan, neck, shoulders, ankles and head base now sit on the sheet's silhouette, and the outline criteria pass across the board. What remains is inside those outlines (the fan's construction, the trunk's side section, the eye in profile, the paws) and none of it moves under the tools that fitted the outlines. Four regions now change method: the fan front and rear (R03, R04) move from plate-and-lens lock systems to a volume of coat clumps, the trunk (R06) moves from a mesh-edge resample to an authored section loft, and the neck (R05) moves from body-only cuts to the assembly join it now owns. The others keep their tools and change targets or add one parameter block.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The fan's remaining gap is the construction, not the parameters: flat lens locks lying on a plate read as leaves or scales whatever their sizes, so R03 and R04 share one new clump-volume generator instead of more lock-table tuning. | 80%: four R03 rounds moved one criterion and four R04 rounds parked; the audit calls the part built the wrong way | `gap-audit-0458.md` ranks 1, 2, 6; `rounds/round-12.json` to `round-16.json`; `specs/R03.md` section 3 lock section |
| 2 | The new fan steps strip and regrow the fan on top of head-0455 (after H33) instead of replacing H27 to H33 in place, so the face graft (H29, H30) and R01's skull stay upstream and untouched. | 75%: replacing in place would need H30 rebased on H26 in the same order; stripping costs one field pass | `recipe.json` steps H27 to H33; `lineage-0458.md` head DAG |
| 3 | The rear fan step runs before the front step, so the front clumps union last and own the visible rim. | 65%: either order works with caching; front on top matches the R03 overlap order | `specs/R03.md` overlap order |
| 4 | The neck collar ring is the head stub lip at world z .465 to .477 and can be removed by moving the join's head cut above it (`head-trim-offset` about .02 instead of .048). | 70%: the lip heights are measured in the R05 spec; the cut height has not been tried | `specs/R05.md` section 4 (a); `assemble_reconstructed_creature.py:34` |
| 5 | The trunk loft is inserted after B-20 and before B-21, so the arm rebuild B-23 fillets onto the new trunk rather than being morphed by it. | 75%: B-23 removes the native arm by opening and unions a new one, so an upstream trunk change rebuilds cleanly | `recipe.json` B-20 to B-23; `lineage-0458.md` section 6 |
| 6 | R07, R08 and R09 keep their generators: their structure is authored from parameters already, and their gaps come from spec targets (paw size, dorsum line) or remaining sculpt. | 75%: the audit marks R07 and R09 structural, but the structure is a parameter of the existing generators | `lineage-0458.md` section 6; `specs/R07.md` section 4; `specs/R09.md` mass 7 |
| 7 | R12 stays parked: it was parked on a dependency, not a stalled method, and its coat masses need the fan clump primitive first. | 80%: park reason "Coherence follows the part fixes" | `status.json` regions.R12 |
| 8 | R02's profile slit is the socket's lateral wall (the cheek plate), not the eye size, so the face tool gains an orbit opening rather than a bigger eye. | 70%: the audit names the cheek plate wrapping the globe; the front eye ratio already passes at 1.352 | `gap-audit-0458.md` rank 3; `rounds/round-10.json` R02 verdict |

## New shared tool: `author_fan_clumps_field.py`

Written by the first R03 or R04 order. Interface:

```
loop_tools.py blender art/species-construction/author_fan_clumps_field.py -- \
    --scene <head.blend> --spec <fan-clumps-<part>.json> --part front|rear --out <dir>
```

- **Spec.** `envelope`: the sheet fan outline per view from `sheet.json` (front, back, left) and a depth plan of the fan's front and rear surfaces on a (u, y) grid in fit units. `strip`: the zone of the old fan to clear (in front of or behind the fan mid-surface, outside a protected skull mask from the R01 skull ellipsoids plus .006, outside the face window of `graft_face_field.py`), replaced by an inner core inset .010 to .015 from the envelope. `roots`: root band polylines (ear-root crease, cup rim, crown line, rear root band). `clumps`: per clump `id`, `root`, `path` (3 to 5 control points, or direction, length, curl and droop), `section` (`widthRoot`, `widthMid`, `thickMid`, `roundness` 1.0 to 1.8), `twistDeg`, `taperExp`, `tipRadius`, `layer`, `material`. `cup`: polygon, floor depth table, opening normal (yaw out from forward, pitch), rim radius. `tuft`: pale clumps inside the cup. `blend`: union radii per layer and a light per-clump blur.
- **Process.** Strip in field space, sweep each clump as a level set, smooth-union by layer, carve the cup, union the tuft, mesh once, assign the pale material by clump id.
- **Outputs.** `head.blend`, `shape.glb`, `fan-clumps.json` (per clump stats, envelope missing and extra area per view, cup and tuft coverage, `skinTopZ`, `skinAfter`), `source-snapshot/`.
- **Invariants.** One closed component; `skinTopZ` no higher than the baseline's; nothing moves outside the fan zone (`recipe.py contain`).
- **Recipe.** Two steps after H33, the R04 rear step then the R03 front step. When both pass, H27, H28, H31, H32 and H33 build geometry that is stripped again; dropping them (and rebasing H30 on H26) is a later cleanup.

## Methods by region

| Region | Method | Steps | Changed | Respec |
|---|---|---|---|---|
| R01 Head silhouette | Skull and jaw ellipsoids in `shape_head_silhouette_field.py` | H25 | no | no |
| R02 Face | Face rebuild plus graft, with a new orbit opening block | H29, H30 | no | yes |
| R03 Ear fan front | Layered lock sweeps at mesh precision, `author_fan_lock_sweeps.py` (review, round 21) | new, replaces H36 | yes (unparks) | yes |
| R04 Ear fan rear | Coat clump volume, `author_fan_clumps_field.py --part rear` | new | yes (unparks) | yes |
| R05 Neck and shoulders | Authored neck column at the join (`--neck-sections`), plus the fill-only yoke round B-19r (review, round 19) | J, B-19r | yes (unparks) | yes |
| R06 Torso and pelvis | Authored superellipse section loft, `author_trunk_sections_field.py` | new | yes (unparks) | yes |
| R07 Arms and forepaws | Arm and paw rebuild with new paw targets and an authored deltoid | B-23 | no | yes |
| R08 Legs | Station-table resample for the remaining sculpt | B-22 | no | no |
| R09 Hind paws | Hind-paw rebuild with a profile-curve instep | B-21 | no | yes |
| R10 Tails | hold | | | |
| R11 Tail root and pelvis | hold | | | |
| R12 Whole-form coherence | Body coat masses from the fan clump primitive | new | no (stays parked) | no |

### R01 Head silhouette

- **Method.** Skull and jaw authored as smooth-union ellipsoids (`skulls[]` plus the chin and cut tables) in `shape_head_silhouette_field.py` at H25, raising the crown dome between the ear roots from its own ellipsoid rather than the `crown_lift` surface warp.
- **Why.** Gap rank 8 (flat forehead band, square jaw; R01.3, R01.5 partial) is structure, which an ellipsoid sets from parameters; round 2's crown lift only warped the roof by a hair. The back dome sunk behind seams (rank 1, R01.4) is left to the fan rebuild.
- **Failure looks.** Crown nubs or a bald bulb above the fan top (figure height grows); a window-edge crease around the dome; a chin knob or pinched stem; the fan top pulled down beside the crown.
- **If it stalls.** A head-base generator lofting the skull and head base from the R01 tables and `sheet.json` head stations, morphed in below the fan root band.
- **Note.** H25 sits upstream of every head step, so an R01 change rebuilds H26 to H33 and the fan steps; that is expected and cached.

### R02 Face

- **Method.** `rebuild_face_features_field.py` at H29 and `graft_face_field.py` at H30, extended with an `orbit` block (lateral opening axis, opening angle, depth, rim radius) that removes the cheek and brow mass lateral to the globe and brings the globe forward, plus iris size and gaze offset keys. Each new key defaults to a no-op.
- **Why.** Gap rank 3 (profile slit, visible eye about .15 of head height against .33), with ranks 9 (front stare) and 14 (cheek crust and plate). The tool authors the eye from parameters already; it does not control the socket's lateral wall.
- **Failure looks.** A bulging bug eye proud of the rim; a dark hole or old socket ring behind the opened wall; brow and nose no longer leading (R02.6); a scowl from a heavy lid; the graft window as a vertical crease.
- **If it stalls.** A separate eye-and-orbit generator morphed in inside an orbit mask after the graft.
- **Respec.** The spec sets the eye back at least .010 behind the brow-to-nose line with no profile visibility target, which produced the slit, and its iris (.52 of the eye width, centered) is smaller and straighter than the audit's .6 and quarter-width glance.

### R03 Ear fan front

- **Method.** Coat clump volume by `author_fan_clumps_field.py --part front`: guide curves from the ear-root crease and cup rim into the sheet's envelope, each a thick tapering clump of rounded section, unioned as level sets over a small core; the cup carved to open forward and outward and filled with pale tuft clumps.
- **Why.** Gap ranks 2 and 6 and the failing R03.3, R03.4, R03.5, R03.7. Rounds 12, 13, 15 and 16 retuned the plate-plus-lens lock system and moved one criterion; flat lenses on a plate read as leaves or scales at any setting.
- **Failure looks.** Sea urchin or porcupine; spaghetti or sausages; core showing through gaps; crinkled root seams; a blurred blob; outline shrinking or tips leaving the envelope; a cup that faces only forward.
- **If it stalls.** Envelope plus lock relief: one closed envelope from the outline and depth plan, displaced by flow-field clump relief.
- **Respec.** The spec's plate and lens table (back faces flat on the plate, width over thickness 2.4 to 2.6) is the construction being replaced; the clump method needs roots, paths, round sections and layers, the cup's opening direction and the envelope from `sheet.json`.

- **Method review, round 21 (parked: 3 rounds without a net gain of 1).** The clump tool ran as specified and did not change the read: assembled-2412 and the refine candidates 2462 to 2464 all scored "same" on R03 and R04, and in m04 the front is a smooth shell with a crumpled, spiky rim, a square-walled cup window and a tuft of stacked horizontal slabs (a venetian blind from the side). The cause is the field, not the levers: the core ran at `core_inset` 0, so it fills the envelope, and the clumps add only .004 to .008 of relief on a .0025 voxel grid with a 2-voxel blur and .004 to .005 unions, so every groove is one to three voxels deep and melts while the tip floors (.002, tuft .0012) fall below one voxel and break into thorns. The nine ideas and the width sweep moved levers inside that regime (v01 and v02 measured identically), and the planned stall method, envelope plus relief, is the same regime by construction: a displaced envelope has no undercut, and the undercut is what makes a lock read.
- **New method.** Layered lock sweeps at mesh precision by a new `author_fan_lock_sweeps.py`, replacing H36 after H35. Each front lock and tuft clump is its own closed swept solid: a Bezier guide from the clump table, a rounded superellipse section with a raised spine, width and thickness tapering to a true point, a twist about its axis. Locks stack in explicit layers so every tip stands .006 to .012 clear of the lock beneath it with an undercut, over a backing at least .015 behind the deepest layer in place of an envelope core. They join the head only in a root band, by a wing-local fine level-set union (voxel .0008 or finer) or an exact mesh boolean. The cup is a lofted bowl surface (rim curve, floor table, opening yawed 35 to 45 degrees outward) subtracted with a filleted rim before the pale tuft sweeps go in.
- **Interface.** `blender art/species-construction/author_fan_lock_sweeps.py -- --scene <H35 head.blend> --table specs/r03_clumps.json --spec <r03-sweeps.json> --envelope specs/r03_envelope.npz --out <dir>`. Spec keys: `strip` (as now), `backing.depthBehindDeepest`, `layers` (ids, standoff, undercut), `section` (p, spine, default twist), `tips.minHalfWidth` (at least twice the output voxel), `union` (root band, voxel, blend), `cup` (rim, floor, yaw, pitch, fillet), `tuft` (ids, standoff, pale). Outputs `head.blend`, `shape.glb`, `fan-sweeps.json` (tip standoff and radius per lock, envelope missing and extra per view, cup opening normal, pale area front and side, `skinTopZ`, components, non-manifold edges), `source-snapshot/`. Invariants: one closed component, `skinTopZ` not above the baseline, no change outside the fan zone.
- **Why.** Separate solids with standoff give each lock a shadowed undercut and a real point at mesh resolution, the cup becomes a shaped bowl rather than a square carve, and the tuft becomes pointed clumps rather than slabs (R03.3, R03.4, R03.5, R03.7; gap-audit-2278 ranks 1 and 2). The table, envelope and passing outline carry over.
- **Failure looks.** Pine cone or shingled scales (standoff too small or sections too flat, as in rounds 12 to 16); sausages (even tubes, no spine, blunt ends); dark holes where the backing shows; a seam or step where the fine union meets the coarse head; whisker or ball-ended tips; tips leaving the envelope; a cup still square or facing only forward; extra components from a boolean.
- **If it stalls.** Groomed hair curves to clumps: Blender hair curves from the root bands, clumped into 8 to 10 primaries per side, converted with curve-to-mesh on a thick tapered profile and joined the same way.
- **Respec.** The strip-and-core section (core inset, .004 to .008 grooves, per-layer union radii) and the cup carve describe the field construction that flattened the front. The spec needs per-lock layer, tip standoff and undercut, section spine and twist, backing depth, the root-band union, and the cup as a bowl surface. The clump table rows and the envelope stay.

### R04 Ear fan rear and profile

- **Method.** `author_fan_clumps_field.py --part rear`: strip the old rear shell, plate and lock rows; grow clumps from the crown line and rear root band flowing outward and down into two tapering wings, each overlapping several neighbors; a few pointed crown tuft clumps; the head dome kept as a soft center.
- **Why.** Gap rank 1 (shard bowl from behind with a continuous pale rim and flat end planes) and R04.3, R04.4, R04.5, R04.7. The rear lock table over a cut plate (rounds 6, 8, 9, 11) parked because the locks are decals on a shell that keeps its rim and cut ends; a clump volume has neither.
- **Failure looks.** The R03 list plus a nest or basket weave, a hairline lower rim, the dome swallowed (R01.4 and R01.8, as in round 8), nape spikes, a picket of clump ends down the profile.
- **If it stalls.** Envelope plus flow-field relief for the rear wings.
- **Respec.** The 114-row lock table with plate and dome cuts would rebuild the decal construction.

### R05 Neck and shoulders

- **Method.** Join parameters at J: `head-trim-offset` from .048 to about .02 so the head cut sits above the stub lip (world z .465 to .477) and the loft replaces it; `bridge-rings`, `tangent-limit` and `min-neck-length` for a straight column; fusion smoothing windowed below z .44. Then a body order at B-19: `shape_neck_shoulders_field.py` with `cutEnable` false and the convex `round` block, no new cut.
- **Why.** Gap rank 10 (collar ring, ledge, corner knobs; R05.4 to R05.6). The ring is the head stub lip, unreachable by body orders (round 13 left it pixel-identical); the outline already matches, so the yoke needs fill-only rounding.
- **Failure looks.** A taller or shorter neck that lifts the head; a trumpet flare or thin stem; a new seam at the loft top; bottle shoulders; ledges and nubs on the upper arms (round 13).
- **If it stalls.** A neck-and-yoke generator on the joined skin after assembly, morphed in over the seam window.
- **Respec.** The spec routes the neck fix through `warp_neck_field.py` on the head stub and a body-only shift, which a join order cannot touch, and still asks for a cap cut.

- **Method review, round 19 (parked: 3 rounds without a net gain of 1).** The J half did what the join can do: cut at offset .038 and the fusion window to z .497 melted the collar ring and kept R05.1 1.070 and R05.2 1.083, but no visual result moved, because R05.4 is held by the column's position and shape (back .007 fit behind the sheet in both stubs, the nape kink, tight hourglass fillets), which the spec itself puts beyond any join parameter, and R05.5 and R05.6 are held by the yoke plate edge and scapular ledge, whose B-19r round was specified and never ordered. The join parameters are exhausted; the stub geometry is the gap.
- **New method.** Authored neck column at J: `assemble_reconstructed_creature.py` gains `--neck-sections <json>` (through `loop_tools.py assemble --join` as `neck-sections`). The loft rings become superellipses from a sheet-derived table (world front, back, half width, exponent per z from .424 to .497), and stub vertices inside the window move along their horizontal ray from the column axis onto the authored section, weighted by a smooth z and angle falloff and capped by `maxShift`, with jaw and base fillet radii set in the table; then the existing remesh and fusion smoothing run. No flag, no change in behavior. The record gains `neckSections` (target and achieved per row). The same order adds B-19r exactly as the spec's section 4 block.
- **Why.** It sets the neck's position, nape line and fillet radii from parameters in the one step that sees both components, so the setback and kink become targets instead of friction, and B-19r closes the yoke half.
- **Failure looks.** Chin or fan root dragged by the morph (check chin front at z .48 to .50 against 0458); a lathe cylinder with no throat corner; a band at the window edges z .424 or .497; a nape bump from a back target behind the head's own nape; R05.1 above 1.08 or R05.2 above 1.12; bottle shoulders or round 13's upper-arm nubs from B-19r.
- **If it stalls.** Author the neck stub from the same table in a head step after H33 and the body neck top in a body step after B-23, so both arrive on the column and the join only bridges.
- **Respec.** Section 0 item 5 and friction 2 call the setback out of reach; the spec must add the section table, morph window, caps, fillet radii and the chin and fan-root check. The J table and the B-19r block stay.

### R06 Torso and pelvis

- **Method.** New `author_trunk_sections_field.py`: superellipse sections lofted from a station table read from `sheet.json` (side front and back edges, front half widths, every .02 from y .26 to .62), weighted-morphed into the native trunk inside a mask that excludes the arms, the neck above .26, the thighs below the hip freeze and the held tail root.
- **Interface.** `--body <shape.glb> --fairing <fairing.json> --spec <trunk-sections.json> --out <dir>`; spec `stations` [{y, front, back, halfWidth, expFront, expBack}], `mask` (arm radius from the fairing's arm joints, neck top, hip freeze, tail-root zone from `species.json`), `fade` at least ten times the relief change. Outputs `body.blend`, `shape.glb`, `fairing.json` with a `trunkSections` record of target and achieved values per station. Inserted after B-20, before B-21.
- **Why.** Gap rank 5 (side chest .131 against .168, waist 1.30x, chest over waist 1.07 against 1.54; R06.6, R06.7, R06.9) and rank 15 (rump). `reshape_torso_field.py` parked because it maps the previous mesh's edges, carrying belts and ledges into new bands or thinning the waist (rounds 3, 9, 15).
- **Failure looks.** A lathe-turned vase; belt lines at the mask edges; a crater or shelf at the armpit, deltoid or thigh root; a tail-root dent; a pigeon breast; hips off the posed front band.
- **If it stalls.** Generate the trunk on the tail-free root with `rebuild_body_field.py` driven by a trunk spline and section radii, then rerun the downstream body steps.
- **Respec.** The spec recommends the stalled resample, and its side depth table (peak .129) disagrees with the audit's sheet reading (.168 at .36); re-read the stations from `sheet.json` in the loft's format.

### R07 Arms and forepaws

- **Method.** `rebuild_arms_field.py` at B-23: paw about 1.5 wrist widths with four separately grooved digit lobes and claws leaving each tip at about a third of the digit length; the deltoid cap authored from the ARM dict instead of the native shoulder.
- **Why.** Gap rank 7 (fist at about .6x the sheet's width; R07.3, R07.5, R07.6) and rank 13 (box cap, lit strip; R07.1). The generator builds the paw from parameters; the gaps are the spec's size cap and the kept native shoulder.
- **Failure looks.** A human hand; a mitten past the hip outline in the posed front; pits between lobes; a ledge at the new deltoid; claws on the front face.
- **If it stalls.** A digit-chain forepaw generator swapped in at the wrist by a weighted morph.
- **Respec.** The spec caps the dorsum at .046 and the claws at .011 and asks for joined lobes, against the audit's .055 paw and separate lobes.

### R08 Legs

- **Method.** `reshape_legs_field.py` at B-22 (yMask and zBlur kept): one calf swell into a slim Achilles line, a soft kneecap plane, the ankle-top crease removed, outer thigh and lateral shin moved out to the posed bands.
- **Why.** Gap rank 12 (double calf swell, knee knob; R08.10 .830, R08.11 .643) is outline and surface on correct structure. Rank 16 (rest stance) stays a refinement the posed fit corrects.
- **Failure looks.** Ripple bands or creases at the morph edges; a tail dent; the calf back line thinning off the shin band (round 14); a bowed shin.
- **If it stalls.** A lower-leg loft along the knee-to-ankle axis from the R08 section table.

### R09 Hind paws

- **Method.** `rebuild_hind_paws_field.py` at B-21 with a new PAW key for the side top-line curve: a convex instep dome from the claw roots to the ankle and a heel rounded into the sole, graded toe lobes, claws rooted inside the toe tips.
- **Why.** Gap rank 11 (slipper, heel cliff, beads, claws on the toe faces; R09.9 .647, R09.3, R09.8). The straight dorsum capsule is what builds the ramp.
- **Failure looks.** A clog or club foot; a heel bulb or ankle step; pits between toes; pearl-headed claws; the sole lifting off the floor.
- **If it stalls.** A paw loft along its axis from a side profile curve and a front arch curve, with separate toe lobes on top.
- **Respec.** The spec's mass 7 is one straight dorsum slope; the target is a convex arc cresting about a third of the paw length back.

### R10 Tails and R11 Tail root and pelvis

Hold, by Nick's direction. No method, no change. Every other region's mask must leave them in place.

### R12 Whole-form coherence

- **Method.** New body step `author_coat_masses_field.py` after B-23 reusing the clump sweep module of `author_fan_clumps_field.py`: broad, low, soft coat masses at the sternum, forearms and calves, with one shared idiom file of section and taper settings for the fan, the face tufts and the body.
- **Why.** Gap rank 4 (a hard fan on a bare vinyl body; R12.1, R12.2). It depends on the fan clumps, so the region stays parked until R03 and R04 land on the clump method and the parts reach 5.
- **Failure looks.** Ruffs or collars; locks on the legs; lumps that break measured outlines; a body idiom different from the fan's.
- **If it stalls.** Unify the idiom on the fan and face tufts only and leave body coat to the later surface pass.

## Friction for the orchestrator

1. **R06 depth numbers disagree.** The spec's side depth table peaks at .129 at .34 to .36; the gap audit reads the sheet at .168 at .36. That is about 30 percent, and the respec must re-measure from `sheet.json` before any builder uses either number.
2. **R07 paw size depends on the view.** The spec's oversized-paw cap (.046) comes from the arms-down view, the audit's .055 from the paw on the hip in the posed front. The respec should say which view each number belongs to and which one the criterion reads.
3. **R12 against the R05 and R08 surface rules.** The audit wants chest, forearm and calf coat masses; the R05 spec forbids any ruff and the R08 spec forbids fur locks or tufts on the leg. The planned masses are broad low relief, not locks, but the specs need one shared rule before R12 unparks.
