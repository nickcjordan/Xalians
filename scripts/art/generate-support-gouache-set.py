"""Support-art gouache-set generator: all seven era frontispieces from support.json, re-rendered in the single
style Nick picked from run 102 (the Z-Image gouache tile 302101, `end-wars`), on Z-Image-Turbo only.

Nick's direction (2026-09-05, after run 102/103): the gouache-set look is 'flat gouache, hard-edged shapes,
visible brush texture, a palette of near-black, slate grey and bone with one hot orange accent, no text, no
frame' -- the klein look (dark blue, photographic, printed titles) is rejected. This script applies one new
style clause, `gouache-set`, first in the prompt (style-first ordering per the log's standing finding that
trailing clauses get truncated/ignored and that nouns like 'poster' get taken literally as an object -- so
'poster' and 'mid-century' are dropped from the wording used in run 102's gouache clause), to all seven eras
using run 101's unchanged era bodies from support.json, at 1536x768, 4 fixed seeds per era, Z-Image only.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-support-gouache-set.py --tag run104-support-gouache-set-zimage

Fixed seed scheme: 4-part family "4xx000" plus a seed index, i.e. 400000 + era_index*1000 + seed_index, so every
seed is fixed and recorded up front (era order = support.json's slots order: deep-past, ascendancy, unbirth,
generation, accords, end-wars, present -- indices 0-6). Writes one PNG per (era, seed), a per-era contact sheet
of 4 tiles, an overall contact sheet, and a manifest.json, following generate-support.py / generate-silhouettes.py
conventions (sil.sha256, sil.versions(), incremental manifest writes, CUDA-OOM fallback to 1280x640).
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
SEEDS_PER_ERA = 4

# The new style clause, placed first in every prompt. Palette locked to near-black / slate grey / bone plus one
# hot orange accent, matching the picked tile (302101). No "poster" or "mid-century" wording (run 102's gouache
# clause used "flat gouache poster ... mid-century travel poster", which the model read as a literal framed
# print object on 302001 and as garbled header text on klein's 302100/302101 -- dropped here).
GOUACHE_SET_STYLE = ('flat gouache painting, hard-edged shapes, visible brush texture, palette of near-black, '
                     'slate grey and bone with a single hot orange accent, no text, no lettering, no frame, no border')

ERA_ORDER = [s['key'] for s in SUPPORT['slots'] if s['kind'] == 'era']


def seed_for(era: str, seed_idx: int) -> int:
    era_i = ERA_ORDER.index(era)
    return 400000 + era_i * 1000 + seed_idx


def build_prompt(era_prompt: str) -> str:
    # era_prompt from support.json starts with run 101's "painterly concept art, high contrast, single light
    # source, muted palette." lead-in; drop that clause and prepend the gouache-set style instead.
    lead = 'painterly concept art, high contrast, single light source, muted palette. '
    body = era_prompt[len(lead):] if era_prompt.startswith(lead) else era_prompt
    return f'{GOUACHE_SET_STYLE}. {body}'


def contact_sheet_multi(out: Path, tag: str, rows, cols=4, cell=384):
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
    ap.add_argument('--eras', default='all', help='comma-separated era keys, or "all"')
    ap.add_argument('--steps', type=int, default=8)
    ap.add_argument('--tag', required=True)
    args = ap.parse_args()

    slots = [s for s in SUPPORT['slots'] if s['kind'] == 'era']
    if args.eras != 'all':
        wanted = set(args.eras.split(','))
        slots = [s for s in slots if s['key'] in wanted]
    if not slots:
        raise SystemExit(f'no era slots match --eras {args.eras}')

    out_root = Path('C:/dev/src/xalians-art/out/support') / args.tag
    out_root.mkdir(parents=True, exist_ok=True)

    import torch
    from diffusers import ZImagePipeline
    pipe = ZImagePipeline.from_pretrained(MODEL, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()

    overall_manifest = {
        'kind': 'era', 'style': 'gouache-set', 'style_clause': GOUACHE_SET_STYLE, 'tag': args.tag, 'model': MODEL,
        'quant': 'bitsandbytes 4-bit (pre-quantized)', 'steps': args.steps, 'guidance': 0.0,
        'scheduler': type(pipe.scheduler).__name__,
        'seed_scheme': '400000 + era_index*1000 + seed_index; era_index order ' + str(ERA_ORDER),
        'versions': sil.versions(), 'slots': [],
    }
    all_rows = []
    t0 = time.time()
    for slot in slots:
        key = slot['key']
        width, height = slot['width'], slot['height']
        prompt = build_prompt(slot['prompt'])
        seeds = [seed_for(key, i) for i in range(SEEDS_PER_ERA)]
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
            p = out_root / f'{key}-{seed}.png'
            img.save(p)
            mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
            cand = {'seed': seed, 'file': str(p), 'sha': sil.sha256(p), 'seconds': round(time.time() - t1, 1), **mem}
            slot_entry['candidates'].append(cand)
            all_rows.append((f'{key} {seed}', p))
            (out_root / 'manifest.json').write_text(json.dumps(overall_manifest, indent=2), encoding='utf-8')
            print(f'[{key}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
        overall_manifest['slots'].append(slot_entry)
        (out_root / 'manifest.json').write_text(json.dumps(overall_manifest, indent=2), encoding='utf-8')
        # per-era contact sheet (this era's 4 tiles only)
        sil.contact_sheet(out_root, key, args.tag, slot_entry['candidates'], [])

    contact_sheet_multi(out_root, args.tag, all_rows)
    print(f'done in {round(time.time()-t0)}s')


if __name__ == '__main__':
    main()
