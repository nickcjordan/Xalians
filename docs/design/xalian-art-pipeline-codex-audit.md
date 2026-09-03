# Audit findings, ranked by importance

## 1. The crash is probably memory pressure, but the evidence is not sufficient to call it a pure OOM

`CUBLAS_STATUS_INTERNAL_ERROR` is a low-level symptom, not a diagnosis. Because one 1024×1024 image completed, basic Blackwell/CUDA compatibility works. Failure during the next fp16 GEMM most plausibly means:

- cuBLAS could not obtain workspace because VRAM was nearly exhausted or fragmented.
- Component offloading/caching left a worse allocation layout for iteration two.
- Less likely: a PyTorch 2.11/cuBLAS/Blackwell kernel or driver regression.

SDXL base **can nominally run at 1024, batch 1, on 8 GB with model offload, but it does not fit robustly** on an 8 GB Windows display GPU. `enable_model_cpu_offload()` still places an entire active component—especially the roughly 5 GB fp16 UNet—on the GPU together with activations and library workspaces. Diffusers explicitly says module offload still requires the largest model plus peak intermediates. [Diffusers offloading documentation](https://huggingface.co/docs/diffusers/api/pipelines/overview)

896 reduces spatial activations by about 23%, so that is a sensible mitigation. `expandable_segments` may reduce fragmentation, but it cannot reduce true peak demand and is principally intended for changing allocation sizes. [PyTorch allocator documentation](https://docs.pytorch.org/docs/main/notes/cuda.html)

Recommended diagnosis:

- Record `max_memory_allocated`, `max_memory_reserved`, and `memory_summary()` after every candidate.
- Reproduce in a fresh process at 768, 896, and 1024. If only 1024 fails, it is capacity/fragmentation.
- If 768 fails too, test bf16 and a known-good pinned torch/cu128/driver combination.
- For guaranteed 1024 operation, use sequential CPU offload or one candidate per process, accepting substantial slowdown.

The rerun’s attention slicing is questionable: PyTorch 2.x already uses SDPA, and Diffusers warns that adding attention slicing can cause serious slowdowns. VAE slicing provides essentially no saving when decoding one image. [Diffusers pipeline guidance](https://huggingface.co/docs/diffusers/main/api/diffusion_pipeline)

## 2. None of the proposed “upgrades” is a clear memory-and-quality win

- **SDXL Lightning:** best A/B candidate for throughput. It produces 1024 images in 2–8 steps, but uses an SDXL-sized UNet, so peak VRAM is broadly unchanged. Fewer steps reduce runtime, not required workspace. [SDXL-Lightning model card](https://huggingface.co/ByteDance/SDXL-Lightning)
- **SDXL Turbo:** poor fit. It is optimized for 512, disables CFG and negative prompts, and therefore removes two controls this script relies upon. Its license is also the Stability Community License, not SDXL base’s OpenRAIL license. [SDXL-Turbo model card](https://huggingface.co/stabilityai/sdxl-turbo/blob/main/README.md)
- **Quantized FLUX.1-schnell:** technically runnable with aggressive 4-bit quantization and offloading, but it is a 23.8 GB checkpoint plus large text encoders. On this laptop it will be slow and operationally fragile, especially under Windows. It is not the sensible phase-1 fallback. [FLUX repository](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
- **Silhouette LoRA:** an MIT-labelled SDXL silhouette slider exists in safetensors format and deserves a cheap A/B test, but it is weakly documented and still inherits SDXL’s runtime and base-license constraints. [Silhouette slider](https://huggingface.co/ntc-ai/SDXL-LoRA-slider.silhouette)
- **Native vector models:** StarVector and similar systems are experimental and better tested as raster-to-SVG alternatives after candidate selection, not as anatomy-faithful creature generators. [StarVector](https://huggingface.co/starvector)

## 3. The prompt describes generic logo art, not the inspected Xalian style

The inspected files are irregular, dense drawings: `drilltail.svg` has 32 black paths, `avilily.svg` six, and `graviclaw.svg` three, with numerous internal subpaths. “Clean vector logo style” and “a few thin lines” will bias toward polished emblems rather than those hand-built organic masses.

Problems in [the prompt](/C:/dev/src/xalians-catalog/scripts/art/generate-silhouettes.py:16):

- Positive phrases such as “no shading” still activate the unwanted concept.
- Negative `"background"` conflicts with the requested white background; use “textured/detailed background.”
- `"sketch, pencil"` suppresses the hand-drawn irregularity you actually want.
- JSON terms such as `jaws, vents, hide, body` contain no count, location, shape, or visibility requirements.
- The lore-sentence fallback can consume the CLIP token budget with history and proper nouns, truncating the style instructions.

Use a compact spatial brief: whole body visible, side/three-quarter pose, margins, feature counts and placement, irregular hand-inked contour, solid black mass, and white negative-space incisions. Negative prompts should cover artifacts—cropping, duplicates, terrain, gradients, disconnected fragments—not generic concepts. Negative prompting remains soft control; it cannot guarantee binary pixels or valid anatomy.

## 4. The phase gate is directionally right but too weak

Prompt-only before expensive adapter work is sensible. However, “one acceptable image among eight for Frackworm” measures luck, not pipeline viability.

Phase 1 should test three or four materially different body plans with fixed seeds and a rubric covering anatomy accuracy, silhouette readability, style distance, cleanup time, crop/margins, and success rate. Include a minimal threshold-and-trace experiment before passing the gate: thin white cuts may disappear or merge during binarization.

Then test IP-Adapter using the smaller ViT-H SDXL checkpoint and the closest anatomical reference, not arbitrary sets of two or three. IP-Adapter may transfer creature content as strongly as style.

## 5. The vectorization assertion is wrong

The plan says VTracer “keeps holes as compound paths.” VTracer’s own description says its stacking strategy avoids shapes with holes. It may represent white cuts as overlaid white shapes rather than true negative space, unlike the existing default-black SVG structure. [VTracer repository](https://github.com/visioncortex/vtracer)

Test Potrace and VTracer against explicit requirements: transparent background behavior, compound holes, path count, winding rule, black-only fills, and editability. Potrace is GPL, which matters if its binary is ever redistributed, though generated SVG output is not thereby GPL. [Potrace repository](https://github.com/skyrpex/potrace)

## 6. Script reliability and wasted work

In [the script](/C:/dev/src/xalians-catalog/scripts/art/generate-silhouettes.py:14):

- The hard-coded external output path is non-portable.
- `prompts.json` is written only after all images; the observed crash loses the completed candidate’s manifest.
- Reruns silently overwrite matching seeds and cannot resume.
- Model revision, scheduler, package versions, GPU/driver, allocator settings, record hash, and output hashes are absent.
- CUDA RNG is less portable; Diffusers recommends a CPU generator for closer cross-platform reproducibility. [Diffusers reproducibility guide](https://huggingface.co/docs/diffusers/main/using-diffusers/reproducibility)
- No validation enforces positive `n`, dimensions divisible by eight, or readable record fields.
- `os` and `sys` are unused; cumulative timing is misleading.

## 7. Licensing and downloads need an explicit manifest

SDXL base is publicly downloadable and OpenRAIL++, but “permits commercial use” omits its use restrictions. FLUX schnell is Apache-2.0 **but gated**: access requires a Hugging Face account, terms acceptance, and token—not payment. SDXL Turbo has revenue-dependent Community License terms. IP-Adapter is Apache-2.0, while every adapter still inherits its base model’s obligations. Prefer pinned safetensors and avoid undocumented repacks or pickle checkpoints.

Finally, the planned “agent reads the image” conflicts with “no paid APIs” unless it explicitly means human review or a named local VLM.

No files were edited.