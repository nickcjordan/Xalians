# Art pipeline log

Running record of every action on the species art pipeline: what was tried, the exact settings, what came out, and the verdict. Kept so the work survives context resets. Newest entries at the bottom of each section. Append, never rewrite history; correct a wrong entry with a dated note under it.

## Where things are

- Plan: `docs/design/xalian-art-pipeline.md` (phases, gate, assumptions). Codex audit of it: `docs/design/xalian-art-pipeline-codex-audit.md`.
- Generator: `scripts/art/generate-silhouettes.py` (SDXL base 1.0 fp16, fp16-fix VAE, model CPU offload, optional IP-Adapter ViT-H with reference images, per-image manifest with seeds, versions, memory and hashes, contact sheet).
- Environment: `C:\dev\src\xalians-art\.venv` (Python 3.12.13, torch 2.11.0+cu128, diffusers, transformers, accelerate, safetensors, pillow). GPU: RTX 5070 laptop, 8 GB, driver 595. Models cached by Hugging Face under the user profile; no token needed for anything used so far.
- Outputs: `C:\dev\src\xalians-art\out\<species>\<tag>\` with `manifest.json`, one PNG per seed, `<species>-<tag>-contact.png`. Logs of each run in `C:\dev\src\xalians-art\*.log`.
- Reference art: `docs/species-templates/art/<key>.png` (renders of Nick's SVGs), species records in `docs/species-templates/<key>.json`.
- Branch: `data/ability-catalog` in the worktree `C:\dev\src\xalians-catalog`. Frackworm (species 00030, no art yet) lives only on this branch; PR #73 merges everything else to main.

## How to run

From the worktree root:

```
PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True C:/dev/src/xalians-art/.venv/Scripts/python.exe scripts/art/generate-silhouettes.py <key> --n 8 --seed <s> --size 896 --guidance 6 [--ref key1,key2 --ip-scale 0.6] --tag <tag>
```

About 135 to 145 s for eight images at 896 px. Run one job at a time on the GPU. Do not run at 1024 (memory fault, see run 1). Send the contact sheet to Nick with SendUserFile and record the verdict here.

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
| 3 | 2026-09-03 | frackworm | ip-adapter | SDXL base, fp16-fix VAE, IP-Adapter sdxl_vit-h, refs newtapede + thirstaserp, ip-scale 0.6, 896 px, seeds 2000 to 2007, guidance 6, rewritten spatial prompt | Eight images, sheet at `out/frackworm/ip-adapter/frackworm-ip-adapter-contact.png`, manifest complete | Style much closer (single creature, solid black, white incisions); content leakage from the references (legs, antennae, snake head), no drill head. Sent to Nick; awaiting his read |

## Fixes and findings

- 2026-09-02: `enable_vae_slicing` no longer exists on the pipeline in this diffusers; use `pipe.vae.enable_slicing()` (later removed as useless for one image per the audit).
- 2026-09-02: flat grey output = fp16 VAE overflow; `madebyollin/sdxl-vae-fp16-fix` fixes it.
- 2026-09-02: CUBLAS internal error at 1024 px = memory pressure (Codex diagnosis); 896 px with model offload runs at about 17 s per image.
- 2026-09-03: diffusers wants `ip_adapter_image=[[img1, img2]]` for several references on one adapter, not a flat list.
- 2026-09-03: the session restart killed background jobs; long runs must write their manifest incrementally (done) and the log must be updated before a clear.
- 2026-09-03: Codex audit adopted: positive spatial prompt, artifact-only negative prompt, CPU RNG, manifest per image, gate on several species with a rubric, potrace over vtracer for holes, license manifest, art check is my own image reading.

## Next experiments (in order)

1. Content leakage: rerun Frackworm with ip-scale 0.4, and separately with diffusers style-only attention targeting (`set_ip_adapter_scale` with a per-block dict that leaves content blocks at 0), references chosen without limbs (candidates: `xylum` for texture, `thirstaserp` alone), and "conical ringed drill point head" first in the prompt.
2. Known-species control: run `thirstaserp` with references `newtapede,xylum` (not itself) and compare against `docs/species-templates/art/thirstaserp.png` with the rubric, so the pipeline is scored against a ground truth.
3. If style holds and content follows the prompt: threshold plus potrace trial on the best tile, checked for compound holes, path count, black-only fills, against an existing SVG's structure.
4. If content still leaks: try the SDXL silhouette LoRA slider as an A/B, then consider FLUX schnell (gated, 24 GB) only with Nick's go.

## Open decisions for Nick

- Whether run 3's line quality is an acceptable starting point (the style half of the gate).
- Whether to invest in the known-species control before more Frackworm iterations (my recommendation: yes, one run).
