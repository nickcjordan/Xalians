"""Silhouette generator on Z-Image-Turbo (6B, Apache 2.0, 2025), pre-quantized to 4-bit so it fits 8 GB VRAM.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-zimage.py <species-key> [--n 8] [--seed 1000] [--steps 8] [--size 1024] [--tag run10-zimage]

Same record-driven brief, manifest and contact sheet as generate-silhouettes.py, but the prompt is plain prose
(Qwen3 text encoder, 512-token window, no CLIP truncation). Turbo models take no negative prompt and guidance 0.
"""
import argparse, importlib.util, json, os, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('sil', HERE / 'generate-silhouettes.py')
sil = importlib.util.module_from_spec(spec); spec.loader.exec_module(sil)

MODEL = 'unsloth/Z-Image-Turbo-unsloth-bnb-4bit'

STYLE = ('Rendered as a flat solid black vector silhouette on a pure white background, like a hand-cut stencil: '
         'one creature only, whole body inside the frame with margin, side or three-quarter view, bold simplified masses, '
         'a smooth thick contour, and a few thin white cut lines inside the black shape to mark the eye and the body '
         'segments. No grey, no shading, no gradients, no texture, no ground line, no background objects, no text.')

# Prose briefs; the model reads sentences, so say what the body is and is not.
BODY = {
    'frackworm': ('A colossal burrowing worm. Its whole front end is a pointed drill: a cone of stacked spiral rings that '
                  'screws into rock, with no face, no eyes and no mouth. Behind the drill the body is one long thick tube of '
                  'many ring segments, tapering to a blunt tail. It has no legs, no arms and no fins.'),
    'thirstaserp': ('A hooded cobra-like serpent. A wide frilled hood flares behind its head, its jaws are open showing two '
                    'long fangs, its thick body lies in coils, and the tail ends in a rattle. It has no legs.'),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('key')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--seed', type=int, default=1000)
    ap.add_argument('--steps', type=int, default=8)
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--tag', default='zimage')
    args = ap.parse_args()

    rec_path = sil.ROOT / 'docs' / 'species-templates' / f'{args.key}.json'
    rec = json.loads(rec_path.read_text(encoding='utf-8'))
    body = BODY.get(args.key) or sil.body_phrase(args.key, rec)
    prompt = f'{body} {STYLE}'
    out = sil.OUT_ROOT / args.key / args.tag
    out.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import ZImagePipeline
    pipe = ZImagePipeline.from_pretrained(MODEL, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()

    manifest = {'key': args.key, 'tag': args.tag, 'model': MODEL, 'quant': 'bitsandbytes 4-bit (pre-quantized)',
                'record': str(rec_path), 'record_sha': sil.sha256(rec_path), 'prompt': prompt, 'steps': args.steps,
                'guidance': 0.0, 'size': args.size, 'scheduler': type(pipe.scheduler).__name__, 'versions': sil.versions(),
                'candidates': []}
    mpath = out / 'manifest.json'
    t0 = time.time()
    for i in range(args.n):
        seed = args.seed + i
        g = torch.Generator('cpu').manual_seed(seed)
        t1 = time.time()
        img = pipe(prompt=prompt, num_inference_steps=args.steps, guidance_scale=0.0, width=args.size, height=args.size,
                   generator=g).images[0]
        p = out / f'{args.key}-{seed}.png'
        img.save(p)
        mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
        manifest['candidates'].append({'seed': seed, 'file': str(p), 'sha': sil.sha256(p), 'seconds': round(time.time() - t1, 1), **mem})
        mpath.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(f'[{i+1}/{args.n}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
    sil.contact_sheet(out, args.key, args.tag, manifest['candidates'], [sil.ART_DIR / f'{args.key}.png'] if (sil.ART_DIR / f'{args.key}.png').exists() else [])
    print(f'done in {round(time.time()-t0)}s')


if __name__ == '__main__':
    main()
