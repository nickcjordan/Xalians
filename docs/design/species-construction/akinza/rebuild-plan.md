# Akinza rebuild plan: assembled-0205

Written 2026-09-30. Nothing was rebuilt to write this plan. The only thing run was a scratch regeneration of the four Hunyuan input crops, to check their hashes. The machine-readable plan is [rebuild-plan.json](rebuild-plan.json). Each of its 38 steps (37 historical stages plus the acceptance step X01) has the exact command, the script commit or recovered script hash, the inputs, the expected hashes and measurements, a certainty label and the evidence.

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

head-0204 + body-0195 -> assembled-0205 [A01] -> acceptance against rebuild/acceptance/ [X01]
```

Several look-alikes are not in the chain. `body-0155`, the body of assembled-0156, is not used: body-0172 rebuilds from body-0100/attempt-02. Round 12's `head-0193` and round 15's `head-0199` are not used either: head-0203 is built on head-0187, and head-0204 re-runs the round-15 face spec. Round 7 was reverted, but `body-0177` is still the input of round 8.

## Certainty

| Certainty | Steps |
|---|---|
| exact | 35 (including the new acceptance step X01) |
| reconstructed | 3 (S05, S07, S08) |
| unknown | 0 |

Kinds: 4 input images, 4 Hunyuan runs, 28 Blender scripts, 1 assembly and 1 Python acceptance step.

"Exact" means two things here. The command is verbatim from a transcript. The script bytes at run time either equal a git blob, or were recovered by replay and confirmed by a recorded hash.

The eighteen Codex-era script stages (B02 to B08, S02 to S12) ran before their scripts were first committed, and ten of them ran on versions that were never committed at all. I recovered the bytes by replaying every file edit in the four Codex rollouts onto commit 414f48af. The replay matches ba7cd0e3 file for file at that commit's time. It ends equal to 46dbc305. It reproduces all 52 run-time script hashes recorded for that window. Seven recomputed `stage-start.json` hashes also match their records. The loop and main-session stages ran on committed content; a simulation of each builder transcript confirms it.

## Gaps and proposed fixes

1. **Replay-only script versions (S05, S07, S08).** Three versions have no run-time hash to check them against: `refine_reconstructed_head.py` at head-0095, `refine_reconstructed_coat.py` at head-0109, and the untracked `recover_0109_flakes.py`. **Fix:** use the replayed bytes, then confirm downstream. head-0095/head.blend should hash `c63e52fe` and head-0109/recovered-02/head.blend should hash `df37df1f`. Fall back to the glb hashes and vertex counts of head-0100 and head-0110/attempt-02.
2. **The face crop hash was never recorded (S03).** Today's run of the code gives `5277c2a4`. **Fix:** run S04. If the Hunyuan output hashes `0b7e354e`, the crop is confirmed.
3. **Hunyuan3D reproducibility (B02, B04, S02, S04).** The install was deleted, and GPU inference may not be bit-exact. **Fix:** rebuild the environment from `toolchain.hunyuan3d` and check the four weight hashes. Accept an output only if its hash matches, or at least its vertex and face counts. Otherwise treat that branch as a new start.
4. **Recovered sources (now committed).** Ten entry-script versions and two `blender_blockout.py` versions existed only as rollout edits. They are now in [rebuild/recovered-scripts/](rebuild/recovered-scripts/README.md), one folder per step, each with its sha256 and origin. They were produced by `art/species-construction/rebuild/replay_codex_edits.py`. Each affected step in the JSON names its files under `recoveredScript`.
5. **Many loop stages have no glb hash, and .blend bytes are unlikely to reproduce.** **Fix:** verify with the recorded mesh statistics in each step. For the final model, use `loop_tools.py check` and `measure` against the round-16 values.
6. **Two Blender builds.** S05 to S12 ran under the WSL Linux Blender and everything else under the Windows build. **Fix:** keep that split. Both builds are still installed.
7. **Provenance hashes embed absolute paths and line endings.** **Fix:** treat `stage-start.json` hashes as optional. Geometry is the real check.


## Execution

The runner is `art/species-construction/rebuild/run_rebuild.py`. Every step in the JSON now has a `run` block next to its verbatim `command`. The block holds `tree`, `interpreter`, `argv` (or `commands`), `cwd`, `env`, `expectExit`, `outputs`, `hashes` and `checks`.

**Tree strategy.** Each step gets its own source tree in `C:/dev/art-data/rebuild/trees/<step>`, built in four stages:

1. `git archive` of the step's commit (`art/species-construction` and `docs/design/species-construction`).
2. The step's recovered scripts and helpers, copied in and hash-checked.
3. Generated files: the four inline input-crop snippets, saved verbatim as `rebuild/<step>_input.py`.
4. Explicit find-and-replace edits.

The original in-command edits (the sed calls in S14, S18 and B13, and the Python edits before S05, S07 and B07) are already contained in the commit or the recovered file. The runner verifies this and logs `already applied`. The one real edit is in S08: `recover_0109_flakes.py` hardcoded the deleted worktree root, and the edit replaces it with the tree. Two junctions finish the tree: `untracked/species-construction/akinza` to `C:/dev/art-data/species-construction/akinza`, and `untracked/tools` to `C:/dev/art-data/tools`. A tree is reused only if its manifest matches; otherwise the runner stops. The full dry run built all 38 trees, about 1.4 GB.

**Path mapping.**

| Placeholder | Resolves to |
|---|---|
| `{TREE}` | the step tree |
| `{DATA}` | `C:/dev/art-data/species-construction/akinza` |
| `{WSL_TREE}`, `{WSL_DATA}` | the same paths under `/mnt/c/...` |
| `{TOOLS}` | `C:/dev/art-data/tools` |
| `{SHAPE_PY}` | the shape-env Python |
| `{SYSTEM_PY}` | the Python running the runner |
| `{LOG}` | `C:/dev/art-data/rebuild/log` |

WSL follows the NTFS junctions, as checked on 2026-09-30, but WSL argv uses `{WSL_DATA}` directly. The Hunyuan steps keep repository-relative paths, because `reconstruction.json` records the `--input` argument verbatim. `loop_tools.py` resolves its root from its own location, so the tree copy works unchanged; its names and logs land in `{DATA}` through the junction. The files the originals copied from `C:/tmp` (the torso regions in B11 and the chest ease in B12) have the same bytes as the committed files the trees use.

**Lanes.** `--lane head` runs the S steps and `--lane body` runs the B steps; run them in two terminals. A01 and X01 run with `--lane all --from A01` once both lanes are verified. Every Blender step, including the loop_tools steps whose older loop_tools has no lock of its own, takes a slot from the loop branch's `loop_tools.acquire_slot`. That is two slots, shared with any loop run. Hunyuan steps also take a separate one-slot GPU lock, so the lanes never run inference together on the 8 GB GPU.

**Stop rules.** Each step writes `C:/dev/art-data/rebuild/log/<step>.json` with:

- the commands, exit code and elapsed time;
- the output hashes;
- the statistics read from the stage's own record (vertex counts, components, non-manifold edges, watertight and status);
- the comparison with the plan.

The verdict is `match`, `drift` or `fail`:

- `drift` means a hash differs but the statistics are within tolerance.
- Counts are exact when every upstream Hunyuan root reproduced its `shape.glb` bit for bit; otherwise they may differ by up to 2 percent. Flags are always exact.
- `fail` means an unexpected exit code, a missing output or log pattern, or a statistic outside tolerance. The runner stops on it.
- S07 is expected to exit non-zero with "expected one closed solid" and leave `geometry-failure.blend`.

The runner refuses to run a step whose outputs already exist without a verified log. It skips steps whose log says `match` or `drift`. X01 compares the rebuilt assembly with `rebuild/acceptance/assembled-0205.json`:

- check values;
- measurement ratios within .01;
- fit IoU per view and band within .01;
- figure height within .002.

It also reports, without gating, a six-view comparison against the saved JPEG. That comparison uses the review page's crop and encoding.

**Time estimate.** Recorded times:

| Work | Recorded time |
|---|---|
| Hunyuan runs | 139 s (B02), 300 s (B04), 244 s (S02) and 285 s (S04); about 16 minutes in all, run one at a time |
| Input crops | about 1 s each (measured on 2026-09-30) |
| Recorded Blender steps | 2 min 9 s (B09), 2 min 9 s (S18) and 20 s (S16) |
| Assembly with its renders | about 8 minutes (7.7 min in round 1) |

Assuming 30 seconds to 3 minutes for each of the 30 unrecorded Blender steps, each lane takes about 35 to 70 minutes. With the lanes in parallel, the whole rebuild takes about one to one and a half hours, including A01 and X01.

**Resume.** Rerun the same command. Verified steps are skipped, and the first unverified step runs next. If a step failed, look at its `.json` and `.out` in the log folder. Move its output folder aside, since the runner never deletes, fix the cause, and rerun. `--reverify --step <id>` recomputes a comparison from the saved output without rerunning.

**Preflight on 2026-09-30.** `--preflight` found no problems:

- It moved the downloaded weights into `hunyuan-mini-weights` and `hunyuan-full-weights`, and all four hashes match.
- The Hunyuan3D-2 checkout is at f8db630.
- It built `shape-env` from uv CPython 3.12.13 with the `.pth` to the xalians-art venv, using the pip versions the Codex rollout reported, now pinned in `toolchain.hunyuan3d.pipInstalls`.
- Imports succeed: torch 2.11.0+cu128 with CUDA, diffusers 0.40.0, transformers 5.16.1, huggingface_hub 1.29.0, torchvision 0.26.0+cu128 and hy3dgen.
- Both Blender builds report 5.2.2 LTS hash d13f752e3b9c: Windows built 01:37:04, Linux 01:34:58. Both install archives hash as recorded.

The four input-image steps have been run: S01, B01 and B03 reproduce their recorded hashes; S03 has no recorded hash and produced `5277c2a4...`.

**Open risks before a real run.**

- **GPU nondeterminism (B02, B04, S02, S04).** If a Hunyuan mesh differs, every count downstream is compared within 2 percent, and every hash will show as drift.
- **S07 must fail.** S07 has to reproduce its guard failure. If slightly different geometry passes the guard, the runner stops at S07, because S08 needs `geometry-failure.blend`. The owner then decides whether to feed `head-0109/head.blend` to S09 instead.
- **Some steps have no recorded statistics.** S05, S06, S13 and S18 have hash and file checks but no recorded statistics, so drift there cannot be told apart from a real difference until the next recorded statistic downstream.
