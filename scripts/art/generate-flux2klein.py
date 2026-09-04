"""Silhouette generator on FLUX.2 klein 4B (Black Forest Labs, 2026, Apache 2.0), quantized to 4-bit on load.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-flux2klein.py <species-key> [--n 8] [--seed 1000] [--steps 4] [--size 1024] [--tag run32-klein]

Same prose brief, manifest and contact sheet as generate-zimage.py. The distilled klein takes 4 steps at guidance 1.0.
Transformer (7.2 GB bf16) and the Qwen3 text encoder (7.5 GB bf16) are loaded with bitsandbytes 4-bit so they fit 8 GB.
"""
import argparse, importlib.util, json, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
sil, zi, br = load('generate-silhouettes'), load('generate-zimage'), load('brief')

MODEL = 'black-forest-labs/FLUX.2-klein-4B'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('key')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--seed', type=int, default=1000)
    ap.add_argument('--steps', type=int, default=4)
    ap.add_argument('--guidance', type=float, default=1.0)
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--vary-pose', action='store_true', help='cycle the shared pose list per seed')
    ap.add_argument('--brief', default='body', choices=['body', 'showcase'], help='showcase = one fixed prompt from showcase.json via brief.py')
    ap.add_argument('--pose', default='', help='named pose variant from showcase.json poses')
    ap.add_argument('--ref-note', default='', help='replaces the generic reference preamble, e.g. to name what each reference contributes')
    ap.add_argument('--refs', default='', help='comma-separated species keys whose hand-drawn art is passed as reference images (klein multi-reference)')
    ap.add_argument('--ref-size', type=int, default=768)
    ap.add_argument('--tag', default='klein')
    args = ap.parse_args()

    rec_path = sil.ROOT / 'docs' / 'species-templates' / f'{args.key}.json'
    rec = json.loads(rec_path.read_text(encoding='utf-8'))
    body = zi.BODY.get(args.key) or sil.body_phrase(args.key, rec)
    if args.brief == 'showcase': body, _ = br.build(args.key, args.pose or None)
    prompt = f'{body} {zi.STYLE}'
    prompts = [f'{body} {pose} {zi.STYLE}' for pose in zi.POSES] if args.vary_pose else [prompt]
    refs = []
    if args.refs:
        from PIL import Image
        for k in args.refs.split(','):
            src = Path(k) if k.endswith('.png') else sil.ART_DIR / f'{k}.png'
            im = Image.open(src).convert('RGB')
            im.thumbnail((args.ref_size, args.ref_size)); refs.append(im)
        n = len(refs)
        note = args.ref_note or (f'The {n} reference images are finished silhouettes from one artist and one set of creatures. Draw a new creature '
                                 f'in exactly that drawing style and line treatment, not one of the referenced creatures.')
        prompt = f'{note} {prompt}'
        prompts = [prompt]
    out = sil.OUT_ROOT / args.key / args.tag
    out.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel, BitsAndBytesConfig as DBnb
    from transformers import Qwen3ForCausalLM, BitsAndBytesConfig as TBnb
    transformer = Flux2Transformer2DModel.from_pretrained(
        MODEL, subfolder='transformer', torch_dtype=torch.bfloat16,
        quantization_config=DBnb(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16))
    text_encoder = Qwen3ForCausalLM.from_pretrained(
        MODEL, subfolder='text_encoder', torch_dtype=torch.bfloat16,
        quantization_config=TBnb(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16))
    pipe = Flux2KleinPipeline.from_pretrained(MODEL, transformer=transformer, text_encoder=text_encoder, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()

    manifest = {'key': args.key, 'tag': args.tag, 'model': MODEL, 'quant': 'bitsandbytes nf4 on load (transformer and text encoder)',
                'record': str(rec_path), 'record_sha': sil.sha256(rec_path), 'brief': args.brief, 'prompt': prompt, 'steps': args.steps,
                'guidance': args.guidance, 'size': args.size, 'scheduler': type(pipe.scheduler).__name__, 'versions': sil.versions(),
                'refs': args.refs, 'ref_note': args.ref_note, 'pose': args.pose, 'candidates': []}
    mpath = out / 'manifest.json'
    t0 = time.time()
    for i in range(args.n):
        seed = args.seed + i
        g = torch.Generator('cpu').manual_seed(seed)
        t1 = time.time()
        prompt_i = prompts[i % len(prompts)]
        img = pipe(image=refs or None, prompt=prompt_i, num_inference_steps=args.steps, guidance_scale=args.guidance, width=args.size, height=args.size,
                   generator=g).images[0]
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
