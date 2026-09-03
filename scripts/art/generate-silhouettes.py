"""Phase 1 silhouette generator: SDXL base, optional IP-Adapter style reference.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-silhouettes.py <species-key> [--n 8] [--seed 1000] [--steps 30]
      [--size 896] [--guidance 6] [--ref newtapede,thirstaserp] [--ip-scale 0.6] [--tag run1]

Reads docs/species-templates/<key>.json for anatomy, builds a compact spatial brief, and writes
N seeded candidates plus a contact sheet and a manifest (prompt, seeds, versions, memory) to
$XALIANS_ART_OUT/<key>/<tag>/ (default C:/dev/src/xalians-art/out). The manifest is written after
every image so a crash loses nothing. With --ref, IP-Adapter (SDXL, ViT-H image encoder) feeds the
named existing species silhouettes as style references.
"""
import argparse, hashlib, json, os, platform, subprocess, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = Path(os.environ.get('XALIANS_ART_OUT', 'C:/dev/src/xalians-art/out'))
ART_DIR = ROOT / 'docs' / 'species-templates' / 'art'

# Style brief written for CLIP: what the picture IS, not what it is not.
STYLE = (
    'hand-inked solid black silhouette of one creature on plain white, whole body visible with margin, '
    'side or three-quarter view, irregular organic contour, white negative-space incisions marking the eye, '
    'limb joints and body segments, flat ink, no other objects'
)
# Bolder variant after Nick's read of run 3 (correct black and white, not vector-like enough): mass over line.
STYLES = {
    'ink': STYLE,
    'bold': ('flat black vector silhouette of one creature on plain white, whole body visible with margin, side or '
             'three-quarter view, bold heavy simplified masses, thick smooth contour, a few thin white cut lines marking the eye '
             'and body segments, die-cut sticker, stencil, solid fill, no other objects'),
}
NEGATIVE = (
    'cropped, cut off, duplicate creature, several creatures, pattern, spiral, ornament, frame, border, '
    'textured background, ground, terrain, shadow, gradient, halftone, hatching, engraving, text, watermark, '
    'photo, 3d render, disconnected fragments'
)

# Compact spatial briefs per species: counts, placement, shape. Fallback is the anatomy list alone.
BODY = {
    'thirstaserp': 'a hooded cobra-like serpent, one coiled body of thick loops, flared frilled hood, open jaws with two long fangs, a rattle at the tail tip, no legs',
    'frackworm': 'a colossal worm whose head is a conical ringed drill point, one long thick body of many ring segments tapering to a blunt tail, no legs, no eyes, no face',
}


def body_phrase(key: str, record: dict) -> str:
    if key in BODY: return BODY[key]
    parts = ', '.join(record['physiology']['anatomy'])
    return f"a {record['physiology']['bodyPlan']} creature with {parts}"


def versions():
    import torch, diffusers, transformers
    try:
        drv = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version', '--format=csv,noheader'], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        drv = 'unknown'
    return {'torch': torch.__version__, 'diffusers': diffusers.__version__, 'transformers': transformers.__version__,
            'python': platform.python_version(), 'gpu': drv, 'alloc_conf': os.environ.get('PYTORCH_CUDA_ALLOC_CONF', '')}


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('key')
    ap.add_argument('--n', type=int, default=8)
    ap.add_argument('--seed', type=int, default=1000)
    ap.add_argument('--steps', type=int, default=30)
    ap.add_argument('--guidance', type=float, default=6.0)
    ap.add_argument('--size', type=int, default=896)
    ap.add_argument('--ref', default='', help='comma-separated species keys whose art PNGs are IP-Adapter style references')
    ap.add_argument('--ip-scale', type=float, default=0.6)
    ap.add_argument('--ip-blocks', choices=['all', 'style', 'style-layout'], default='all',
                    help='which attention blocks the adapter feeds: all, style only (up block 0), or style plus layout (down block 2)')
    ap.add_argument('--style', choices=sorted(STYLES), default='ink')
    ap.add_argument('--tag', default='run')
    args = ap.parse_args()
    if args.n < 1: raise SystemExit('--n must be at least 1')
    if args.size % 8: raise SystemExit('--size must be divisible by 8')

    rec_path = ROOT / 'docs' / 'species-templates' / f'{args.key}.json'
    rec = json.loads(rec_path.read_text(encoding='utf-8'))
    # SDXL has two text encoders, each capped at 77 CLIP tokens. Body brief goes to encoder 1 (prompt),
    # style brief to encoder 2 (prompt_2); both are checked so nothing is silently truncated (runs 3 and 4 were).
    prompt, prompt_2 = body_phrase(args.key, rec), STYLES[args.style]
    from transformers import CLIPTokenizer
    tok = CLIPTokenizer.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0', subfolder='tokenizer')
    for name, text in (('prompt', prompt), ('prompt_2', prompt_2), ('negative', NEGATIVE)):
        n = len(tok(text)['input_ids'])
        if n > 77: raise SystemExit(f'{name} is {n} CLIP tokens, limit 77: {text}')
        print(f'{name}: {n} tokens')
    out = OUT_ROOT / args.key / args.tag
    out.mkdir(parents=True, exist_ok=True)
    refs = [k for k in args.ref.split(',') if k]
    ref_paths = [ART_DIR / f'{k}.png' for k in refs]
    for p in ref_paths:
        if not p.exists(): raise SystemExit(f'reference art missing: {p}')

    import torch
    from diffusers import StableDiffusionXLPipeline, AutoencoderKL
    from PIL import Image
    vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16)
    pipe = StableDiffusionXLPipeline.from_pretrained(
        'stabilityai/stable-diffusion-xl-base-1.0', vae=vae, torch_dtype=torch.float16, variant='fp16', use_safetensors=True)
    ip_kwargs = {}
    if refs:
        from transformers import CLIPVisionModelWithProjection
        encoder = CLIPVisionModelWithProjection.from_pretrained('h94/IP-Adapter', subfolder='models/image_encoder', torch_dtype=torch.float16)
        pipe.image_encoder = encoder
        pipe.load_ip_adapter('h94/IP-Adapter', subfolder='sdxl_models', weight_name='ip-adapter_sdxl_vit-h.safetensors')
        if args.ip_blocks == 'style':
            scale = {'up': {'block_0': [0.0, args.ip_scale, 0.0]}}
        elif args.ip_blocks == 'style-layout':
            scale = {'down': {'block_2': [0.0, args.ip_scale]}, 'up': {'block_0': [0.0, args.ip_scale, 0.0]}}
        else:
            scale = args.ip_scale
        pipe.set_ip_adapter_scale(scale)
        # one adapter, several reference images: diffusers wants a list per adapter, so a list of one list
        ip_kwargs['ip_adapter_image'] = [[Image.open(p).convert('RGB') for p in ref_paths]]
    pipe.enable_model_cpu_offload()

    manifest = {'key': args.key, 'tag': args.tag, 'model': 'stabilityai/stable-diffusion-xl-base-1.0', 'vae': 'madebyollin/sdxl-vae-fp16-fix',
                'ip_adapter': 'h94/IP-Adapter sdxl_models/ip-adapter_sdxl_vit-h.safetensors' if refs else None, 'ip_scale': args.ip_scale if refs else None, 'ip_blocks': args.ip_blocks if refs else None, 'style': args.style,
                'refs': [str(p) for p in ref_paths], 'record': str(rec_path), 'record_sha': sha256(rec_path),
                'prompt': prompt, 'prompt_2': prompt_2, 'negative': NEGATIVE, 'steps': args.steps, 'guidance': args.guidance, 'size': args.size,
                'scheduler': type(pipe.scheduler).__name__, 'versions': versions(), 'candidates': []}
    mpath = out / 'manifest.json'
    t0 = time.time()
    for i in range(args.n):
        seed = args.seed + i
        g = torch.Generator('cpu').manual_seed(seed)      # CPU generator for cross-machine reproducibility
        t1 = time.time()
        img = pipe(prompt=prompt, prompt_2=prompt_2, negative_prompt=NEGATIVE, negative_prompt_2=NEGATIVE, num_inference_steps=args.steps, guidance_scale=args.guidance,
                   width=args.size, height=args.size, generator=g, **ip_kwargs).images[0]
        p = out / f'{args.key}-{seed}.png'
        img.save(p)
        mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
        manifest['candidates'].append({'seed': seed, 'file': str(p), 'sha': sha256(p), 'seconds': round(time.time() - t1, 1), **mem})
        mpath.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(f'[{i+1}/{args.n}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
    contact_sheet(out, args.key, args.tag, manifest['candidates'], ref_paths)
    print(f'done in {round(time.time()-t0)}s')


def contact_sheet(out: Path, key: str, tag: str, cands, ref_paths, cols=4, cell=384):
    from PIL import Image, ImageDraw
    tiles = [(f'ref {p.stem}', p) for p in ref_paths] + [(f'{key} {c["seed"]}', Path(c['file'])) for c in cands]
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (label, p) in enumerate(tiles):
        im = Image.open(p).convert('RGB')
        im.thumbnail((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * (cell + 24)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        d.text((x + 4, y + cell + 4), label, fill='black')
    p = out / f'{key}-{tag}-contact.png'
    sheet.save(p)
    print('contact sheet ->', p)


if __name__ == '__main__':
    main()
