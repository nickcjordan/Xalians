# Akinza head reconstruction method audit

Updated 2026-09-28. Internal work, not an approval request. Layers 3 and 4 remain open; layer 5 is an experiment. The failed whole-creature criteria in `completion-audit.json` remain open.

## Target and invariants

The preferred identity is run-0001. Head study-0021 supplies rounded facial volume and overlapping coat masses, excluding its inward gaze and excessive small locks. Accepted face study-0010 controls gaze. This test must produce actual geometry with seated eyes, a soft cheek/muzzle transition, continuous ear cups and roots, and credible coat depth in front, profile and rear views. A good front image alone cannot pass.

## Actual tests

| Test | Representation | Observed result | Disposition |
|---|---|---|---|
| head-0022 | Sampled skull fields, annular lid strips, independent curved eye patches, curved coat wedges | Eyes remain surface plates. Ear fringe is radial and spiky. Crown resembles a picket fence. The rear exposes a bare extrusion wall. | Failed. Retain source snapshot and renders. |
| head-0023 | Flatter facial superellipse, less eye projection, additional laid coat rows and rear coverage | Eye whites intersect the intact skin. Coat becomes a tiled pattern. Profile exposes the same hard ear band and poor root integration. The remeshed body still has 46 components despite zero nonmanifold edges. | Failed. Stop this parameter loop. |
| head-0024 | Local geometry reconstruction of a cropped retained reference using Hunyuan3D-2mini | Substantially better rounded facial, muzzle and cupped ear volume. Independent review agrees the base is useful. Scan noise, fused eyes, pendant muzzle pads, cheek residue and generic rear locks remain. | Useful starting mesh, not ready for approval. |
| head-0025 | Local cleanup, actual eye apertures and closed ocular volumes | Noise and loose fragment removed. Muzzle over-smoothed; eye boundaries uneven. | Failed facial refinement. |
| head-0026 | Projected muzzle field and boundary-matched ocular surfaces | Projection folded the old overhang into a recessed ring. Ocular reflections copied boundary noise. | Failed. Replace old volume rather than project overhanging vertices. |
| head-0027 | Volume replacement and fitted ocular surfaces | Two Boolean attempts removed the head; a self-intersection solve exhausted memory. A lower-density attempt produced a valid mesh but broad orbital bowls and a muzzle shelf. | Failed facial quality. Retain all attempt snapshots and diagnose operations before rendering. |
| body-reconstruction-0028 | Local geometry reconstruction of body study-0003, with later corrections explicitly excluded | Useful general limb volumes, but an invented extra tail stalk, paired chest bulges, human hands, ground-shadow plates and surface noise. | Raw output rejected. Extract only useful torso/limb base. |
| head-0029 | Bounded central facial surface replacing muzzle, chin and orbit region | Eye integration improved, but the authored face field is too broad/deep and forms a visible perimeter. | Failed. Fit cheek width and chin depth to the retained surrounding mesh. |
| body-0030 | Symmetric retained half, new animal paws and three centered tail sweeps | Original wrong tail and hands removed. Wrist center is too far rearward; added pelvis volume makes a large protrusion. Chest bulges remain. | Failed. Measured wrist cross-sections drive correction; remove added pelvis mass and flatten chest contour. |
| head-0031 / 0033 | Revised analytic central face | Persistent perimeter, projecting chin shelf and concave mouth transition. | Failed. Independent review directs return to native 0024 facial volumes. |
| body-0032 / 0034 | Revised wrists, chest, pelvis and subdivided tail sweeps | Full tails and improved wrist placement, but paired chest bulges, wrist ledges, flat crotch and scan residue remain. | Internal base requiring correction. |
| identity-reconstruction-0035 | Mini reconstruction from the preferred first front image | Less muscular torso, but hands fuse into hips in the akimbo pose, feet are thin and inherited tail defects remain. | Comparison only; not a replacement baseline. |
| head-0036 / 0037 | Retained native central face, local tip cleanup and fitted ocular surfaces | Rounded likeness returns. Dark nose fixed in 0037. Eye aperture edge still has jagged intersections in profile; muzzle tips and rear coat remain unfinished. | Useful direction, not ready for approval. |
| full-body-reconstruction-0038 | Larger local shape model with CPU offload | Attempt 01 failed because upstream omitted the component registry. Attempt 02 completed locally with a wrapper compatibility fix. Renders retain an invented rear stalk, human hands and scan relief; the larger model does not solve the semantic errors. | Evaluate rendered geometry before any promotion. |
| assembled-0039 | Head 0037 and body 0034 joined into one skin mesh | Neck cutoff lip, paired chest masses, wrist ledges and body surface residue visible. Nose material lost during assembly. | Failed whole-creature review. Fix these defects and continue. |
| head-0040 / 0043 | Fitted eyes and local aperture-wall cleanup | Some edge spikes removed, but lower socket folds remain. | Replace only the annulus with explicit closed socket topology. |
| paw-reconstruction-0041 | Larger local model from accepted hindpaw crop | Useful paw roof and posterior articulation, but six invented toes, long hooked claws, floor-shadow plate and scan-fur ridges. | Retain the ankle substrate; rebuild the entire distal cluster as the four shown toes. |
| body-0042 | Front/back torso field projected onto existing surface | Banded planes and hard field boundaries. | Failed. Do not promote. |
| body-0044 / assembled-0045 | Torso volume replacement, smaller head and new neck bridge | Neck seam corrected and scale closer; torso replacement breaks hip and shoulder joins. | Preserve the neck/proportion change, reject the body replacement. |
| head-0046 | Closed annular socket patches replace folded aperture walls | Edge spikes removed; recessed bowls and heavy muzzle pads remain. | Retained partial head baseline. |
| body-0048 / body-0047 | Native torso retained and relaxed at coarser mesh scale; reference-derived ankle with rebuilt four-toe paws | Torso continuity improved; paw alignment and support volume remain wrong. | Retain torso direction, correct paws. |
| assembled-0049 / 0052 | Measured paw alignment and narrower neck trim | Better head balance and torso, but shoulders, knees, ankle cuffs, thin paws and expression remain deficient. | Failed whole-creature comparison. |
| head-0050 / 0053 | Moved or compressed native pad tips | Exposed a hollow beneath the muzzle. | Rejected. |
| head-0054 / 0057 | Replaced folded underside with a bounded grid | Raw endpoint noise propagated vertically; patch boundary remained visible. | Rejected; removed from current builder. |
| body-0055 / assembled-0056 | Fuller paws, enlarged ankle bridge and shoulder spheres | Bridge created bands; shoulder spheres read as separate balls. | Rejected. |
| head-full-0058 / head-0061 | Full-model native head, then fitted eyes | Better native coupled face, but orbital rings, lower facial residue and pad-heavy expression remain. | Comparison only. |
| body-0059 / assembled-0060 | Buried bridge ends, thigh cleanup, grouped foredigits | Improved thighs and foredigits; shoulder shelf, ankle irregularity and thin paw roof remain. | Internal partial result. |
| body-0062 / assembled-0063 | Coarser local fairing with smooth spatial masks | Shoulder shelf and ankle cuff visibly reduced. Six projections have zero height and ground spread. | Preserve joint correction; paw mass, tail fan and face still fail. |
| head-0064 | Wider sockets, native muzzle smoothing and measured nose material region | Bright orbital boundary and hollow mouth remain. | Rejected as an upgrade. |
| body-0065 | Added paw support and lowered tail fan | Code inspection caught only one support selected for union. | Rejected before promotion; corrected in 0066. |
| body-0066 / assembled-0068 | Both paw supports joined; modest fan correction around fixed root | Rendering and audit in progress. | Not an approval candidate. |
| head-0067 | Fill native central valley and match socket patch tangents to the adjacent surface | Rendering and audit in progress. | Not promoted. |

The independent reviewer identified structural causes in 0023: the eye opening is never cut from the skin; separate patches cannot form a real socket. The ear back adds constant depth and closes with a vertical wall. Regular coat loops encode the tiled appearance even when individual lengths vary. These are representation failures, not insufficient smoothness or missing texture. Subsequent independent reviews of 0024 and 0027 directed preservation of the improved reconstructed base, then replacement of the complete central facial transition rather than additional sphere unions. Those findings were tested in 0029 and 0031, but the resulting central face lost likeness. Later review correctly reversed that direction: preserve the native coupled cheek, muzzle and chin instead of expanding an unsuccessful replacement.

If reconstruction does not provide a useful base, the next manual method is a facial cage with actual socket openings bridged to lids and closed eyeballs, plus thin cupped ear tissue with a rounded shared rim. Inspect that bare construction before adding a small set of individually shaped, overlapping coat groups with buried roots. Repeating regular coat rows is not the fallback.

## Provenance and technical limitations

Working directories are `untracked/species-construction/akinza/head-0022`, `head-0023`, and `head-0024`. Each geometric study retains its source snapshot. The first Blender test used a relative render path and wrote images beneath `C:/untracked/species-construction/akinza/head-0022`; those exact PNGs were copied into the study directory. Its original geometry record predates that recovery, so a separate recovery manifest records the copied image hashes. The driver now resolves the output directory before invoking Blender rendering.

The reconstruction experiment uses the public [Hunyuan3D-2 source](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) and [2mini weights](https://huggingface.co/tencent/Hunyuan3D-2mini), locally and with network inference disabled. It generates geometry only. No API key, paid service, image synthesis, or texture synthesis is used. The existing reference is cropped and its edge-connected white background is masked without repainting. The input record saves its source hash, crop rectangle, mask rule and output hash. The run record saves upstream revision, model hashes, parameters, runtime and mesh hash. Hidden geometry remains an unapproved inference that must be checked against the other retained views.

The isolated test environment reuses the existing art environment's CUDA runtime read-only. Additional packages are confined to `untracked/tools/shape-env`. Third-party source, weights and this environment are not repository dependencies or committed assets.
