# Akinza rebuild plan: assembled-0205

Written 2026-09-30. Nothing was rebuilt to write this plan. The only thing run was a scratch regeneration of the four Hunyuan input crops, to check their hashes. The machine-readable plan is [rebuild-plan.json](rebuild-plan.json). Each of its 37 steps has the exact command, the script commit or recovered script hash, the inputs, the expected hashes and measurements, a certainty label and the evidence.

## Target

`assembled-0205` = `head-0204` + `body-0195`, assembled by `loop_tools.py assemble` with `--head-scale .50 --jaw-anchor-z .500 --head-depth-offset -.020 --fragment-voxels 5`. The check at the time gave 1 component, 727,170 vertices, 0 removed fragments and 0 height and ground spread. The critic's weighted mean was 6.05.

## Dependency tree

Roots are committed reference images under `evidence/`. Arrows point from input to output. The step id is in brackets.

```
head-clay-study-0021.png -> head-0024/input.png [S01] -> head-full-0058 (Hunyuan full) [S02]
face-study-0010.png -> face-source-0095/input.png [S03] -> face-source-0095/reconstruction (Hunyuan full) [S04]
head-full-0058 -> head-0095 [S05]
head-0095 + face-source-0095 -> head-0100 (muzzle transplant) [S06]
  -> head-0109 (coat; fails the guard by design, leaves geometry-failure.blend) [S07]
  -> head-0109/recovered-02 (recover_0109_flakes.py) [S08]
  -> head-0110/attempt-02 (cheek) [S09] -> posterior-pass [S10] -> cranial-volume [S11] -> lower-ear-taper [S12]
  -> head-0131 (eyes) [S13] -> head-0146 (nose) [S14] -> head-0152 (rear coat) [S15]
  -> head-0158 (r1 neck warp) [S16] -> head-0160 (r2) [S17] -> head-0162 (r3) [S18] -> head-0170 (r5) [S19]
  -> head-0182 (r8) [S20] -> head-0187 (r10) [S21] -> head-0203 (r16 rear) [S22] -> head-0204 (r16 face) [S23]

body-study-0003.png -> body-reconstruction-0028/input.png [B01] -> attempt-01 (Hunyuan mini) [B02]
paws-study-0020.png -> paw-reconstruction-0041/input.png [B03] -> attempt-01 (Hunyuan full) [B04]
body-reconstruction-0028 -> body-0072/attempt-02 (--omit-tails) [B05] -> body-0073 [B06]
body-0073 + paw-reconstruction-0041 -> body-0086/attempt-03 [B07] -> body-0100/attempt-02 (--tail-free-input) [B08]
body-0100/attempt-02 + body-0086/attempt-03 -> body-0172 (r6 blade tails) [B09] -> body-0173 (r6 neck warp) [B10]
  -> body-0177 (r7 smoothing, reverted round but kept as input) [B11] -> body-0183 (r8 chest ease) [B12] -> body-0195 (r13 waist) [B13]

head-0204 + body-0195 -> assembled-0205 [A01]
```

Several look-alikes are not in the chain. `body-0155`, the body of assembled-0156, is not used: body-0172 rebuilds from body-0100/attempt-02. Round 12's `head-0193` and round 15's `head-0199` are not used either: head-0203 is built on head-0187, and head-0204 re-runs the round-15 face spec. Round 7 was reverted, but `body-0177` is still the input of round 8.

## Certainty

| Certainty | Steps |
|---|---|
| exact | 34 |
| reconstructed | 3 (S05, S07, S08) |
| unknown | 0 |

Kinds: 4 input images, 4 Hunyuan runs, 28 Blender scripts and 1 assembly.

"Exact" means two things here. The command is verbatim from a transcript. The script bytes at run time either equal a git blob, or were recovered by replay and confirmed by a recorded hash.

The eighteen Codex-era script stages (B02 to B08, S02 to S12) ran before their scripts were first committed, and ten of them ran on versions that were never committed at all. I recovered the bytes by replaying every file edit in the four Codex rollouts onto commit 414f48af. The replay matches ba7cd0e3 file for file at that commit's time. It ends equal to 46dbc305. It reproduces all 52 run-time script hashes recorded for that window. Seven recomputed `stage-start.json` hashes also match their records. The loop and main-session stages ran on committed content; a simulation of each builder transcript confirms it.

## Gaps and proposed fixes

1. **Replay-only script versions (S05, S07, S08).** Three versions have no run-time hash to check them against: `refine_reconstructed_head.py` at head-0095, `refine_reconstructed_coat.py` at head-0109, and the untracked `recover_0109_flakes.py`. **Fix:** use the replayed bytes, then confirm downstream. head-0095/head.blend should hash `c63e52fe` and head-0109/recovered-02/head.blend should hash `df37df1f`. Fall back to the glb hashes and vertex counts of head-0100 and head-0110/attempt-02.
2. **The face crop hash was never recorded (S03).** Today's run of the code gives `5277c2a4`. **Fix:** run S04. If the Hunyuan output hashes `0b7e354e`, the crop is confirmed.
3. **Hunyuan3D reproducibility (B02, B04, S02, S04).** The install was deleted, and GPU inference may not be bit-exact. **Fix:** rebuild the environment from `toolchain.hunyuan3d` and check the four weight hashes. Accept an output only if its hash matches, or at least its vertex and face counts. Otherwise treat that branch as a new start.
4. **Recovered sources live only in the rollouts.** Ten entry-script versions and two `blender_blockout.py` versions exist nowhere else. **Fix:** commit the replay tool and the recovered files, for example under `recovered-sources/<name>@<sha12>.py`, before the rollouts are lost too.
5. **Many loop stages have no glb hash, and .blend bytes are unlikely to reproduce.** **Fix:** verify with the recorded mesh statistics in each step. For the final model, use `loop_tools.py check` and `measure` against the round-16 values.
6. **Two Blender builds.** S05 to S12 ran under the WSL Linux Blender and everything else under the Windows build. **Fix:** keep that split. Both builds are still installed.
7. **Provenance hashes embed absolute paths and line endings.** **Fix:** treat `stage-start.json` hashes as optional. Geometry is the real check.
