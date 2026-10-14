# Hypnopet head: reconstruction trial (experiment X29)

Nick approved the trial on 2026-10-13: "I'm willing to try your experiment. If it's free and all it takes is time, then go ahead... be diligent about documenting your effort and setting checkpoints to check in to make sure what you're doing is working. I want you to have a log of your work so that you can adjust as needed."

This file is the working log. Newest entries go at the bottom of the log section. Each checkpoint has a gate: if the gate fails, the trial stops there and the reason is written down.

## Why

Round 4 of the face pass (experiment X28) fitted eye placement to the sheet by number, but the face built from about eight smooth masses still read wrong: a heavy brow, a thin snout, a chin ball. The outlines matched while the shapes between them did not. The question for this trial: can a local image-to-3D model (Hunyuan3D-2, already installed under `C:\dev\art-data\tools`, free, on this PC) give a head volume closer to the sheet than hand-placed masses?

## What earlier work already showed (Akinza, 2026-09-28; read only, Akinza is not touched)

From `docs/design/species-construction/akinza/head-method-audit-0022-0024.md`:

- Hunyuan3D-2mini from a cropped reference gave "substantially better rounded facial, muzzle and cupped ear volume" than authored fields.
- Its raw output carried scan noise, fused eyes and pendant pads.
- Editing the reconstructed mesh directly (Boolean cuts, projecting vertices, volume replacement) failed again and again over more than 30 numbered attempts.
- The larger model did not fix semantic errors (invented parts).

Lesson taken: use the reconstruction as a volume inside the studio's own field (a signed distance part, smoothed, clipped to the head), carve the eye sockets and seat the separate eyes with the studio's existing tools. No mesh Booleans, no vertex editing. And a hard stop before the trial turns into a 30-attempt loop.

## Plan and gates

| Checkpoint | Work | Gate (stop if it fails) |
|---|---|---|
| CP0 | The environment runs; a reconstruction finishes under the GPU limit (peak below 6.5 GB, the ceiling set after the crashes in September) | It runs and stays under the limit |
| CP1 | Raw reconstructions from the bare sheet views: 2mini from the bare front, 2mini from a head crop, 2mv from bare front, side and back. Rendered with the studio's clay and face cameras beside the sheet | At least one raw head reads closer to the sheet's face than round 4 (front, three-quarter, side), judged on the renders and by the outline numbers |
| CP2 | A mesh part kind (signed distance from the reconstruction, smoothed and clipped to the head) joined to the v5 body at the neck; eye sockets carved and the separate glossy eyes seated; quick face renders and face_fit numbers | The joined head keeps the reconstruction's look and has no seams, holes or loose pieces; face_fit within tolerance on the eye measures |
| CP3 | Options around it (eye size and spacing, as in round 4), the reference beside them, judge checks; put on the studio page for Nick | The set is one Nick can judge on taste, with no known flaw left that I can name |

Budget: about 6 hours of wall time overnight. If CP1 fails, the trial ends and the blob method's fallback (cheek pads, a broad muzzle, an open jaw) is written up as the next step instead.

## Log

### 2026-10-13 21:00, setup

- Found Hunyuan3D-2 already installed from the Akinza work (checkout `f8db630`, mini and full weights, two Python environments). `hy3d-venv` fails to load the image encoder (its transformers 5.18 renamed the encoder's weights); `shape-env` (transformers 5.16.1, torch 2.11 cu128) works. I did not change either environment, since another session uses them.
- Downloaded the multi-view model (`tencent/Hunyuan3D-2mv`, `hunyuan3d-dit-v2-mv`) to `C:\dev\art-data\tools\hunyuan-mv-weights`. The download pulled both a `.ckpt` and a `.safetensors` copy (4.9 GB each); only the safetensors one is used. Free disk went from 86 GB to about 76 GB.
- New studio tools: `art/studio/recon/reconstruct.py` (one run per fresh folder, record with input hashes, parameters, peak GPU memory), `recon_scene.py` (the mesh into a studio scene the packet renderer opens), `contact.py` (sheet beside candidates, one row per view).

### CP0: the environment runs under the GPU limit. Passed, with a correction

- r02 (mini, bare front): finished in 131 s. Torch peaked at 4.5 GB, but the whole card reached 6.6 GB with the desktop's 1.4 GB, just over the 6.5 GB ceiling. My first cap only limited torch, so it would not have stopped the overrun.
- Fixed: the cap is now 6.5 GB minus what other programs hold at start minus 0.7 GB for the CUDA context. r03 (the multi-view model, all on the GPU) then stopped itself with out-of-memory at 7.1 GB total instead of going on; that told me the context needs the 0.7 GB.
- With `--cpu-offload`: r04 (multi-view) peaked at 4.9 GB on the whole card, 293 s; r05 (mini, head crop) 3.2 GB, 152 s. Every later run uses offload.

### CP1: raw reconstructions against round 4. Passed

Evidence: `docs/design/creature-studio-head-recon/cp1-raw-reconstructions.jpg` (sheet, round 4's fitted blob face, r02, r04; rows front, three-quarter, side).

- r02 (mini, bare front only): the round head, full cheeks, open smiling mouth and even the spiral horn read like the sheet from the front. The side is weak: a flat face with a short snout, since one front image says little about depth.
- r04 (multi-view, bare front, side and back): the best. The front matches as well as r02, and the profile now has the sheet's short rounded snout, open mouth and lower lip. The ears hang the right way.
- Both read far closer to the sheet than round 4 in all three views. Gate passed.
- Flaws to handle in CP2: the eyes are smooth closed mounds (the studio's own eyes go in), there is a small lump on the side of one ear (ears are not taken from the reconstruction anyway), and the surface carries faint scan relief.
- r05 (mini, head crop) is kept as a second head source to compare after alignment.

Decision for CP2: take the head from r04, not the whole body. The v5 body was approved; only the face was failing.

### CP2, first joins (22:00 to 22:30)

New pieces: `art/studio/recon/mesh_to_grid.py` (the reconstruction as a signed distance grid in the studio frame: nearest of 3 million surface samples, sign from the sample's face normal, light Gaussian blur against scan relief), part kind `grid` in `art/studio/parts/grid.py` (trilinear sampling in numpy only so it runs inside Blender, clipped by a smooth ellipsoid, the file pinned by sha256; three unit tests), and `art/studio/blockout/hypnopet/face_recon.py` plus `face_recon.sh` (v5 with its head part replaced by the clipped grid and v5's neck; eyes carved and seated with the same code as the authored faces).

Alignment: no fitting needed. The reconstruction scaled to v5's height already puts its eyes at x = +-0.052, z = 0.436 and its head 0.178 wide at the eyes (round 4's fitted face: +-0.052, 0.4465, 0.173). Both come from the same sheet, so the head lands where v5's head was.

- R1 (first join, `cp2-first-join.jpg`): round face, short snout, smile and eyes in sockets; reads far closer to the sheet than round 4. Faults: the clip flattened the crown and left the reconstruction's own horn base as a lump under v5's horn; the eyes sat about 1 cm proud of the face.
- Crown fix: clip top at 0.53 plus a dome mass under v5's horn. Eyes sunk (opening half-angle 62 degrees instead of 67) and set a little closer (x 0.047, gaze 4 degrees out).
- R2 and R3 (`cp2-snout-corrections.jpg`) added small masses to bring the nose and lower lip forward toward the side sheet. Rejected: the lip mass reads as a shelf with teeth, the same failure as the blob faces. No corrective masses on the reconstruction from here on; that path is closed.
- The fanged slot of a mouth in R1 to R3 was my clip cutting off the chin and lower lip (clip bottom at z 0.33, mouth bottom at 0.336). Clip moved down to 0.30; the measured chin went from 0.2 W behind the eye front to level with it.
- The numbers: face_fit still reports 11 of 15 misses, but several sheet measures disagree with each other (the bare side view's lower face sits lower relative to the eye than the bare front view's), and the reconstruction reconciled the views. From here I use the numbers for the eyes (size, spacing, height) and the renders for the rest.
- Building a sharper grid (1 mm, lighter blur) because the 1.5 mm grid softened the nose and lips.
