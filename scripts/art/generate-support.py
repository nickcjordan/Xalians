"""Support-art generator: wide era/scene frontispieces from scripts/art/support.json, on Z-Image-Turbo (4-bit).

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-support.py --kind era --keys all --tag runNN-support-eras
  python scripts/art/generate-support.py --kind era --keys deep-past,unbirth --tag runNN-support-eras

Same model-loading path as generate-zimage.py (pre-quantized 4-bit ZImagePipeline, model CPU offload, prose
prompt read in full with no CLIP truncation). Each slot in support.json carries its own fixed seeds so a run
is reproducible without a --seed flag. Writes one PNG per (slot, seed) plus a manifest.json (model, settings,
seeds, prompt, hashes) and a contact sheet, following generate-silhouettes.py's conventions. Falls back from
the slot's width/height to 1280x640 on a CUDA memory fault and records the fallback in the manifest.
"""
import argparse, importlib.util, json, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
sil = load('generate-silhouettes')

MODEL = 'unsloth/Z-Image-Turbo-unsloth-bnb-4bit'
SUPPORT = json.loads((HERE / 'support.json').read_text(encoding='utf-8'))
FALLBACK_SIZE = (1280, 640)


def contact_sheet_multi(out: Path, tag: str, rows, cols=4, cell=384):
    """rows: list of (label, Path). Same layout convention as generate-silhouettes.contact_sheet."""
    from PIL import Image, ImageDraw
    n = len(rows)
    grid_rows = (n + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, grid_rows * (cell + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (label, p) in enumerate(rows):
        im = Image.open(p).convert('RGB')
        im.thumbnail((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * (cell + 24)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        d.text((x + 4, y + cell + 4), label, fill='black')
    p = out / f'support-{tag}-contact.png'
    sheet.save(p)
    print('overall contact sheet ->', p)
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kind', default='era', choices=['era'])
    ap.add_argument('--keys', default='all', help='comma-separated slot keys, or "all"')
    ap.add_argument('--steps', type=int, default=8)
    ap.add_argument('--tag', required=True)
    args = ap.parse_args()

    slots = [s for s in SUPPORT['slots'] if s['kind'] == args.kind]
    if args.keys != 'all':
        wanted = set(args.keys.split(','))
        slots = [s for s in slots if s['key'] in wanted]
    if not slots:
        raise SystemExit(f'no slots match --kind {args.kind} --keys {args.keys}')

    out_root = Path('C:/dev/src/xalians-art/out/support') / args.tag
    out_root.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import ZImagePipeline
    pipe = ZImagePipeline.from_pretrained(MODEL, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()

    overall_manifest = {'kind': args.kind, 'tag': args.tag, 'model': MODEL, 'quant': 'bitsandbytes 4-bit (pre-quantized)',
                         'steps': args.steps, 'guidance': 0.0, 'scheduler': type(pipe.scheduler).__name__,
                         'versions': sil.versions(), 'slots': []}
    all_rows = []
    t0 = time.time()
    for slot in slots:
        key, prompt = slot['key'], slot['prompt']
        width, height = slot['width'], slot['height']
        seeds = slot['seeds']
        slot_out = out_root
        slot_entry = {'key': key, 'prompt': prompt, 'requested_size': [width, height], 'used_size': None,
                      'fallback_used': False, 'candidates': []}
        for seed in seeds:
            g = torch.Generator('cpu').manual_seed(seed)
            t1 = time.time()
            use_w, use_h = width, height
            try:
                img = pipe(prompt=prompt, num_inference_steps=args.steps, guidance_scale=0.0,
                          width=use_w, height=use_h, generator=g).images[0]
            except torch.cuda.OutOfMemoryError:
                print(f'  {key} seed {seed}: OOM at {width}x{height}, falling back to {FALLBACK_SIZE}', flush=True)
                torch.cuda.empty_cache()
                use_w, use_h = FALLBACK_SIZE
                g = torch.Generator('cpu').manual_seed(seed)
                img = pipe(prompt=prompt, num_inference_steps=args.steps, guidance_scale=0.0,
                          width=use_w, height=use_h, generator=g).images[0]
                slot_entry['fallback_used'] = True
            slot_entry['used_size'] = [use_w, use_h]
            p = slot_out / f'{key}-{seed}.png'
            img.save(p)
            mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
            cand = {'seed': seed, 'file': str(p), 'sha': sil.sha256(p), 'seconds': round(time.time() - t1, 1), **mem}
            slot_entry['candidates'].append(cand)
            all_rows.append((f'{key} {seed}', p))
            (out_root / 'manifest.json').write_text(json.dumps(overall_manifest, indent=2), encoding='utf-8')
            print(f'[{key}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
        overall_manifest['slots'].append(slot_entry)
        (out_root / 'manifest.json').write_text(json.dumps(overall_manifest, indent=2), encoding='utf-8')
        # per-era contact sheet (this slot's tiles only)
        sil.contact_sheet(slot_out, key, args.tag, slot_entry['candidates'], [])

    contact_sheet_multi(out_root, args.tag, all_rows)
    print(f'done in {round(time.time()-t0)}s')


if __name__ == '__main__':
    main()
