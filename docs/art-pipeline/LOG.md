# Art pipeline log

Running record of every action on the species art pipeline: what was tried, the exact settings, what came out, and the verdict. Kept so the work survives context resets. Newest entries at the bottom of each section. Append, never rewrite history; correct a wrong entry with a dated note under it.

## Where things are

- Plan: `docs/design/xalian-art-pipeline.md` (phases, gate, assumptions). Codex audit of it: `docs/design/xalian-art-pipeline-codex-audit.md`.
- Generator: `scripts/art/generate-silhouettes.py` (SDXL base 1.0 fp16, fp16-fix VAE, model CPU offload, optional IP-Adapter ViT-H with reference images, per-image manifest with seeds, versions, memory and hashes, contact sheet).
- Environment: `C:\dev\src\xalians-art\.venv` (Python 3.12.13, torch 2.11.0+cu128, diffusers, transformers, accelerate, safetensors, pillow). GPU: RTX 5070 laptop, 8 GB, driver 595. Models cached by Hugging Face under the user profile; no token needed for anything used so far.
- Outputs: `C:\dev\src\xalians-art\out\<species>\<tag>\` with `manifest.json`, one PNG per seed, `<species>-<tag>-contact.png`. Logs of each run in `C:\dev\src\xalians-art\<tag>.log`.
- Tag naming (fixed 2026-09-03 after Nick flagged inconsistent version names): `runNN-<technique>-<refs>`, for example `run04-styleblocks-xylum-thirstaserp`. NN is the global run number from the table below, never reused, across all species. Runs 2 and 3 were renamed on disk to `run02-prompt-only` and `run03-ipadapter-newtapede-thirstaserp`.
- Reference art: `docs/species-templates/art/<key>.png` (renders of Nick's SVGs), species records in `docs/species-templates/<key>.json`.
- Branch: `data/ability-catalog` in the worktree `C:\dev\src\xalians-catalog`. Frackworm (species 00030, no art yet) lives only on this branch; PR #73 merges everything else to main.

## How to run

From the worktree root:

```
PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True C:/dev/src/xalians-art/.venv/Scripts/python.exe scripts/art/generate-silhouettes.py <key> --n 8 --seed <s> --size 896 --guidance 6 [--ref key1,key2 --ip-scale 0.6 --ip-blocks all|style|style-layout] [--style ink|bold] --tag <tag>
```

About 135 to 145 s for eight images at 896 px. Several runs in one go: copy `C:\dev\src\xalians-art\run-batch-0903a.sh` (serial queue, one log per tag) and run it in the background. Run one job at a time on the GPU. Do not run at 1024 (memory fault, see run 1). Send the contact sheet to Nick with SendUserFile and record the verdict here.

## Standing rules for this work

- Local only, no paid image APIs (Nick's billing rule: stop and warn before anything that bills).
- Nick judges every sheet; the pipeline delivers candidates, he finishes by hand. The gate: at least one candidate he would accept as a starting point, on more than one species, judged with a rubric (anatomy accuracy, silhouette readability, style distance, cleanup time, crop and margins, success rate).
- Every run gets a tag, fixed seeds, and an entry below. A run with no entry did not happen.
- Commit script changes on `data/ability-catalog` without a co-author trailer (guard-commit hook).

## Run history

| # | Date | Species | Tag | Settings | Result | Verdict |
|---|---|---|---|---|---|---|
| 1 | 2026-09-02 | frackworm | (pre-tag) | SDXL base, stock VAE, prompt only, 1024 px, seed 1000 | One flat grey image, then CUBLAS_STATUS_INTERNAL_ERROR | Fail, mechanical: stock SDXL VAE overflows in fp16 (grey output); 1024 px exceeds 8 GB with model offload |
| 2 | 2026-09-02 | frackworm | (pre-tag) | SDXL base, fp16-fix VAE, prompt only, 896 px, seeds 1000 to 1007, guidance 7, old "clean vector logo" prompt | Eight images, sheet at `out/frackworm/frackworm-contact.png` | Fail on style: engraving textures, several objects per frame, spirals, no drill head. Nick shown; my verdict none usable |
| 3 | 2026-09-03 | frackworm | run03-ipadapter-newtapede-thirstaserp (was `ip-adapter`) | SDXL base, fp16-fix VAE, IP-Adapter sdxl_vit-h, refs newtapede + thirstaserp, ip-scale 0.6, 896 px, seeds 2000 to 2007, guidance 6, rewritten spatial prompt | Eight images, sheet at `out/frackworm/ip-adapter/frackworm-ip-adapter-contact.png`, manifest complete | Style much closer (single creature, solid black, white incisions); content leakage from the references (legs, antennae, snake head), no drill head. Nick's read 2026-09-03: correct black-and-white style, closer to vectorized, not there yet. Fail on the style gate |
| 4 | 2026-09-03 | frackworm | run04-styleblocks-xylum-thirstaserp | IP-Adapter on style blocks only (up block 0) at 0.8, refs xylum + thirstaserp (both limbless), `--style bold` prompt (heavy masses, thick contour, die-cut sticker, stencil), drill head first in the body phrase, body brief in encoder 1 only, seeds 4000 to 4007 | Eight images, 757 s (shared the GPU with a stray run 5 for ten minutes) | Style: bolder masses, the most vector-like so far (4002, 4003, 4007). Content: wrong in every tile (legs, scorpion, dragons, one human figure); no worm, no drill; grey backdrops in five tiles. Fail |
| 5 | 2026-09-03 | frackworm | run05-fullscale04-xylum-thirstaserp | IP-Adapter on all blocks at 0.4, same refs, bold prompt, body in encoder 1 only, seeds 5000 to 5007 | Eight images, 140 s | Content: most serpentine of the three (5001, 5002, 5005, 5007 are limbless bodies) but faces, tendrils, no drill; grey backdrops, glows, one frame. Style: brushier than run 4. Fail, but the closest body so far |
| 6 | 2026-09-03 | thirstaserp (known-species control) | run06-control-styleblocks-newtapede-xylum | Style blocks at 0.8, refs newtapede + xylum, bold prompt, seeds 6000 to 6007, body in encoder 1 only; judged against `art/thirstaserp.png` | Eight images, 132 s | Anatomy failed outright: six quadrupeds (dog, lizard, rodent), two coiled shapes without hood or fangs, grey backdrops. Diagnosis: with the body brief only in encoder 1 and the adapter on the style blocks at 0.8, the model does not hold the species. Fail on the control, which is the useful result: it pins the fault on the prompt split, not on the species |
| 7 | 2026-09-03 | frackworm | run07-bothenc-full05-xylum-thirstaserp | Body brief in both encoders with the compact style (one 66-token prompt), per-species negatives (legs, arms, paws, claws, fur, face, human), negatives for grey background, glow, vignette; full adapter at 0.5, refs xylum + thirstaserp, seeds 7000 to 7007 | Eight images, 135 s | Content fixed by the encoder change: every tile is limbless and serpentine, 7000 is a segmented worm, 7003 a ringed cobra (thirstaserp leakage). Still no drill head in any tile. Style: 7000 and 7003 bold and vector-like; 7004 to 7007 tangles of tendrils (xylum leakage); one grey backdrop (7001). Fail on anatomy (drill), closest yet on style |
| 8 | 2026-09-03 | thirstaserp (control) | run08-control-bothenc-full05-newtapede-xylum | Same settings as run 7, refs newtapede + xylum, seeds 8000 to 8007 | Eight images, 141 s | Control passes on species: 8006 and 8007 are hooded serpents with fangs and ringed bellies, 8004 and 8005 fanged serpents; no quadrupeds. Against Nick's original: bodies are tangled with extra tendrils (xylum leakage), 8000 and 8001 grey backdrops, none has the flower. Style of 8006 and 8007 is in the right register, cleanup would be heavy |
| 9 | 2026-09-03 | frackworm | run09-full05-thirstaserp-drilltail | Refs thirstaserp + drilltail (xylum dropped for its tendrils; drilltail carries a drawn drill), brief reworded to 'pointed screw auger drill bit with spiral threads', otherwise run 7 settings, seeds 9000 to 9007 | Eight images, 141 s | Best anatomy so far: ring-segmented single bodies in 9000, 9003, 9005, 9006. The drill now appears, but as a separate object (9005, a drill bit floating beside the worm) or fused to a machine base (9002, 9006), never as the head. Heads are snake or centipede heads with eyes. Backgrounds white except 9001. Style: 9003 and 9005 are clean and bold; 9004 and 9007 cluttered. Fail on the drill head, otherwise the closest sheet |

## Fixes and findings

- 2026-09-02: `enable_vae_slicing` no longer exists on the pipeline in this diffusers; use `pipe.vae.enable_slicing()` (later removed as useless for one image per the audit).
- 2026-09-02: flat grey output = fp16 VAE overflow; `madebyollin/sdxl-vae-fp16-fix` fixes it.
- 2026-09-02: CUBLAS internal error at 1024 px = memory pressure (Codex diagnosis); 896 px with model offload runs at about 17 s per image.
- 2026-09-03: diffusers wants `ip_adapter_image=[[img1, img2]]` for several references on one adapter, not a flat list.
- 2026-09-03: the session restart killed background jobs; long runs must write their manifest incrementally (done) and the log must be updated before a clear.
- 2026-09-03: Nick's read of run 3 says the gap is vector-likeness, not black and white: his art is heavy solid masses with a few thin white cuts, run 3 was scratchy thin ink drawing. Levers tried in runs 4 to 6: a bold mass-first prompt (`--style bold`), style-only attention blocks so the adapter scale can go up without copying reference anatomy (`--ip-blocks style`), limbless references.
- 2026-09-03: **CLIP truncation.** The run 3 prompt was 100 CLIP tokens against a 77 limit, so everything after 'side or' in the style brief (contour, white incisions, flat ink, no other objects) never reached the model; run 3's style came almost entirely from the IP-Adapter. Fix: the body brief goes to SDXL's first text encoder (`prompt`), the style brief to the second (`prompt_2`), anatomy keys dropped from the brief when a hand-written body phrase exists, and the script refuses to run if any part exceeds 77 tokens. Run 4 was started with the truncated prompt, aborted, and rerun (folder `aborted-run04-truncated-prompt`).
- 2026-09-03: **Stopping a batch.** TaskStop on a background batch does not kill the batch shell or its python child on Windows; the old shell carried on to the next run while a new batch started, putting two generators on the GPU at once. To stop a batch: kill python (`taskkill //F //IM python.exe`), then the shell by command line (PowerShell `Get-CimInstance Win32_Process` filtered on `run-batch`), then confirm `nvidia-smi` shows about 220 MiB used before starting anything.
- 2026-09-03: **Prompt split lost the anatomy.** Runs 4 to 6 sent the body brief to encoder 1 only and the style to encoder 2 (OpenCLIP bigG, the stronger of SDXL's two). The control species came out as quadrupeds. From run 7 the body brief goes to both encoders (a compact style keeps the whole prompt under 77 tokens), and per-species negatives name what the model keeps adding.
- 2026-09-03: 'die-cut sticker' and 'stencil' in the style brief produced grey backdrops and glows in runs 4 to 6; dropped, with 'grey background, glow, vignette' added to the negative prompt.
- 2026-09-03: potracer (pure Python potrace) installed in the venv; a threshold plus trace trial on run 5 tile 5002 lives in `out/frackworm/trace-trial/` (threshold PNG and SVG with evenodd fill so white cuts are true holes).
- 2026-09-03: **Reference leakage is per reference.** Xylum's tentacles appeared as tendrils in most tiles of runs 7 and 8; thirstaserp's hood appeared once. Pick references for the anatomy you want copied, not for style alone, since the adapter copies both.
- 2026-09-03: Codex audit adopted: positive spatial prompt, artifact-only negative prompt, CPU RNG, manifest per image, gate on several species with a rubric, potrace over vtracer for holes, license manifest, art check is my own image reading.

## Next experiments (in order)

0. Next Frackworm run: the drill must be described as the front of the body, not a part it has ('the worm's front end tapers into a spiral screw point, no head, no mouth, no eyes'), and 'head' should leave the brief since SDXL always draws a face for it. Consider a two-reference set of drilltail plus a worm-bodied species only, and guidance 7.
0a. Findings so far to carry: body brief in both encoders (kept); xylum leaks tendrils (dropped as a reference); adapter at 0.5 on all blocks holds style without copying anatomy; style-only blocks lose the species; the drill head has not appeared in any of 40 Frackworm tiles, so it is a reference or wording problem, not a seed problem.
1. Content leakage (partly covered by runs 4 and 5): rerun Frackworm with ip-scale 0.4, and separately with diffusers style-only attention targeting (`set_ip_adapter_scale` with a per-block dict that leaves content blocks at 0), references chosen without limbs (candidates: `xylum` for texture, `thirstaserp` alone), and "conical ringed drill point head" first in the prompt.
2. Known-species control: run `thirstaserp` with references `newtapede,xylum` (not itself) and compare against `docs/species-templates/art/thirstaserp.png` with the rubric, so the pipeline is scored against a ground truth.
3. If style holds and content follows the prompt: threshold plus potrace trial on the best tile, checked for compound holes, path count, black-only fills, against an existing SVG's structure.
4. If content still leaks: try the SDXL silhouette LoRA slider as an A/B, then consider FLUX schnell (gated, 24 GB) only with Nick's go.

## Open decisions for Nick

- Run 3 line quality: answered 2026-09-03, not acceptable yet (right style, not vector-like enough).
- Whether to invest in the known-species control before more Frackworm iterations (my recommendation: yes, one run).
