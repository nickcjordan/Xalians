# Xalian species art pipeline (draft, 2026-09-02)

## Context

All 29 species silhouettes in `my-app/src/svg/species/` were drawn by hand by Nick: flat black silhouettes on white with thin white cut-out lines for eyes, plates, and internal detail, one creature per file, mostly full-body profile or three-quarter views. New species (Frackworm first, then whatever the platform needs) require art in the same register, and hand-drawing each one is the bottleneck. The species records in `docs/species-templates/<key>.json` already state, per species, the body plan, the anatomy keys, the covering, the size band and the signature instrument, and the migration process already includes an art check (does the image show the parts the record claims). The pipeline turns that record into candidate art that Nick picks from and finishes, and it must run locally at no per-image cost (Nick's standing rule: nothing that increases costs without a stop-and-warn).

Machine: RTX 5070 laptop GPU (8 GB VRAM), driver 595, Windows 11. Python 3.12 venv at `C:\dev\src\xalians-art\.venv` with PyTorch 2.11 (CUDA 12.8) and diffusers.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Phase 1 validates whether a local diffusion model can hit Nick's silhouette standard before any adapter, vectorizer or QA automation is built | 95%: Nick asked for exactly this gate | Nick's message 2026-09-02: "validate that the art built from step 1 meets my standards" |
| 2 | SDXL base 1.0 (fp16, CPU offload) is the phase 1 model; FLUX.1 schnell is the upgrade path if SDXL falls short | 70%: SDXL fits 8 GB with offload and needs no quantization; FLUX at 12B needs fp8 or GGUF on this card | `scripts/art/generate-silhouettes.py`; VRAM 8151 MiB from nvidia-smi |
| 3 | Prompt-only style control is enough to judge phase 1; IP-Adapter style reference from the existing 29 SVGs is phase 2 | 60%: silhouette-on-white is a strong prompt cue, but line weight and cut-out style may not match without a reference | existing art in `docs/species-templates/art/*.png` |
| 4 | Output must end as SVG in the existing file shape (black fill, white cut-outs as true holes), so vectorization after a hard threshold is a required phase 2 step; potrace is the first candidate because vtracer's stacking strategy avoids holes and would paint the white cuts as overlaid white shapes (Codex audit, 2026-09-03) | 90% | `my-app/src/svg/species/*.svg` are the consumed asset |
| 5 | The record is the prompt source: body phrase plus anatomy keys; the art check reads back the same record | 85% | `docs/species-templates/<key>.json`, migrate-species skill section 9 art check |
| 6 | Nick keeps the last word and edits vectors by hand; the pipeline delivers candidates, not finals | 95% | Nick: "I made all the original art by hand" and wants sustainability, not replacement |

## Phase 1 result and audit (2026-09-03)

The first prompt-only SDXL run (eight seeds, Frackworm) failed the gate: engraving textures, several objects per frame, spirals, no drill head. Two mechanical faults were fixed on the way (the stock SDXL VAE overflows in fp16 and decodes to flat grey, replaced by the fp16-fix VAE; 1024 px hit a CUDA memory fault, now 896). Codex audited the plan and script; its report is `xalian-art-pipeline-codex-audit.md` beside this file. Adopted from it: the gate now runs on more than one species with fixed seeds and a rubric (anatomy accuracy, silhouette readability, style distance, cleanup time, crop and margins, success rate), including a known species so the output can be judged against its hand-drawn original; the prompt is a compact spatial brief in positive terms with a negative prompt aimed at artifacts; IP-Adapter uses the ViT-H SDXL checkpoint with the anatomically closest references; the manifest records model revisions, scheduler, package and driver versions, allocator settings, record hash and output hashes, and is written after every image; the generator uses a CPU RNG; vectorization is tested against explicit requirements (compound holes, path count, black-only fills) before it is adopted; a download and license manifest is kept (SDXL base OpenRAIL++ with its use restrictions, IP-Adapter Apache 2.0, FLUX schnell Apache 2.0 but gated behind a Hugging Face token, SDXL Turbo excluded on its community license and its 512 px, no-negative-prompt design). The art check is performed by the orchestrator's own image reading, not a paid API. Not adopted: a silhouette LoRA slider (weakly documented; kept as a later A/B), FLUX schnell as the phase 1 fallback (24 GB checkpoint, fragile on 8 GB under Windows).

## Phases

### Phase 1: can a local model draw a Xalian silhouette Nick would accept

- `scripts/art/generate-silhouettes.py <key> --n 8 --seed 1000 --steps 30`: reads the record, builds `body phrase + anatomy keys + STYLE`, negative prompt against color, shading, backgrounds, text and multiple creatures; SDXL 1.0 fp16 with `enable_model_cpu_offload`; 1024 square; eight seeded candidates; PNGs, a contact sheet and `prompts.json` (every prompt and seed) in `C:\dev\src\xalians-art\out\<key>\`.
- Gate: Nick views the contact sheet. Pass means at least one candidate he would accept as a starting point for his own hand. Fail means either prompt work (phase 1b) or the FLUX upgrade before anything else is built.

### Phase 2: make the good candidate a usable asset (only after the gate)

- Style adapter: IP-Adapter (SDXL) with two or three existing silhouettes as reference so line weight and cut-out treatment match the set.
- Threshold to pure black and white (Otsu or fixed), remove islands below a pixel-area floor, then vectorize with vtracer (preferred, keeps holes as compound paths) into an SVG with the same viewBox conventions as the existing files.
- Art check: an agent reads the candidate PNG against the record's anatomy, body plan and signature instrument and rejects candidates that miss; survivors go on the contact sheet with the seed.
- Nick picks and edits in his vector tool; the chosen SVG lands in `my-app/src/svg/species/` and `docs/species-templates/art/` is regenerated.

### Phase 3: batch and repeat

- One command per species; the same seeds reproduce the same candidates; prompts and seeds are committed with the record so any image can be regenerated.

## Risks and open questions

- Silhouette models bias toward Earth animals; a worm with a drill head may come out as a sandworm or a generic dragon. Prompt vocabulary and the style reference are the levers.
- SDXL tends to add ground lines, shadows and gradients; the threshold step hides some of that but composition errors (two creatures, cropped bodies) need the art check.
- 8 GB VRAM rules out FLUX dev at full precision; if FLUX is needed, it is schnell in fp8, and generation slows.
- Licensing: SDXL 1.0 is under the CreativeML Open RAIL++-M license, which permits commercial use of outputs; FLUX.1 schnell is Apache 2.0; FLUX.1 dev is non-commercial and is excluded.
- No cloud API is used; if one is ever proposed it needs Nick's explicit go because it bills per image.
