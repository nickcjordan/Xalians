"""Silhouette generator on FLUX.1 schnell (12B, Apache 2.0, 2024), 4-bit, for the side-by-side against Z-Image-Turbo.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-flux.py <species-key> [--n 8] [--seed 1000] [--steps 4] [--size 1024] [--tag run12-flux-schnell]

Uses the ungated pre-quantized diffusers layout `magespace/FLUX.1-schnell-bnb-nf4` (transformer and T5 both 4-bit,
12.5 GB). Same prose brief and style text as generate-zimage.py, same manifest and contact sheet.
"""
import argparse, importlib.util, json, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
sil, zi = load('generate-silhouettes'), load('generate-zimage')

MODEL = 'magespace/FLUX.1-schnell-bnb-nf4'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('key')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--seed', type=int, default=1000)
    ap.add_argument('--steps', type=int, default=4)
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--vary-pose', action='store_true', help='cycle the shared pose list per seed')
    ap.add_argument('--tag', default='flux')
    args = ap.parse_args()

    rec_path = sil.ROOT / 'docs' / 'species-templates' / f'{args.key}.json'
    rec = json.loads(rec_path.read_text(encoding='utf-8'))
    body = zi.BODY.get(args.key) or sil.body_phrase(args.key, rec)
    prompt = f'{body} {zi.STYLE}'
    prompts = [f'{body} {pose} {zi.STYLE}' for pose in zi.POSES] if args.vary_pose else [prompt]
    out = sil.OUT_ROOT / args.key / args.tag
    out.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import FluxPipeline
    pipe = FluxPipeline.from_pretrained(MODEL, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()

    manifest = {'key': args.key, 'tag': args.tag, 'model': MODEL, 'quant': 'bitsandbytes nf4 (pre-quantized)',
                'record': str(rec_path), 'record_sha': sil.sha256(rec_path), 'prompt': prompt, 'steps': args.steps,
                'guidance': 0.0, 'size': args.size, 'scheduler': type(pipe.scheduler).__name__, 'versions': sil.versions(),
                'candidates': []}
    mpath = out / 'manifest.json'
    t0 = time.time()
    for i in range(args.n):
        seed = args.seed + i
        g = torch.Generator('cpu').manual_seed(seed)
        t1 = time.time()
        prompt_i = prompts[i % len(prompts)]
        img = pipe(prompt=prompt_i, num_inference_steps=args.steps, guidance_scale=0.0, width=args.size, height=args.size,
                   max_sequence_length=256, generator=g).images[0]
        p = out / f'{args.key}-{seed}.png'
        img.save(p)
        mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
        manifest['candidates'].append({'seed': seed, 'prompt': prompt_i, 'file': str(p), 'sha': sil.sha256(p), 'seconds': round(time.time() - t1, 1), **mem})
        mpath.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(f'[{i+1}/{args.n}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
    ref = sil.ART_DIR / f'{args.key}.png'
    sil.contact_sheet(out, args.key, args.tag, manifest['candidates'], [ref] if ref.exists() else [])
    print(f'done in {round(time.time()-t0)}s')


if __name__ == '__main__':
    main()
