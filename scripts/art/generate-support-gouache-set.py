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

2026-09-06 addition: run 104 found the gouache-set palette clause loses to strong competing colour words inside
three of the seven era bodies (ascendancy, generation, present) and left a fourth (accords) with an off-palette
storm; Nick approved a rerun of just those four with their bodies rewritten in support.json to state the locked
palette directly. Use `--eras ascendancy,generation,accords,present` to target them, and `--seed-base 500000`
(a new "5xx000" family, distinct from run 104's "4xx000") so no seed collides with a prior run:
  python scripts/art/generate-support-gouache-set.py --eras ascendancy,generation,accords,present \
      --seed-base 500000 --tag run105-support-gouache-fix-zimage
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

# 2026-09-07, runs 111/112: Nick does not want a nominated accent colour, and the art must not borrow from the
# site's design system at all (that system is being overhauled separately; the plates are lore artwork, not UI).
# `gouache-open` keeps only the medium and handling and names no palette; each scene carries its own colour.
STYLES = {
    'gouache-set': GOUACHE_SET_STYLE,
    'gouache-open': ('flat gouache painting, hard-edged shapes, visible brush texture, restrained muted colour, '
                     'no text, no lettering, no frame, no border'),
}

ERA_ORDER = [s['key'] for s in SUPPORT['slots'] if s['kind'] == 'era']


def seed_for(era: str, seed_idx: int, seed_base: int = 400000) -> int:
    era_i = ERA_ORDER.index(era)
    return seed_base + era_i * 1000 + seed_idx


def build_prompt(era_prompt: str, style: str = GOUACHE_SET_STYLE) -> str:
    # era_prompt from support.json starts with run 101's "painterly concept art, high contrast, single light
    # source, muted palette." lead-in; drop that clause and prepend the gouache-set style instead.
    lead = 'painterly concept art, high contrast, single light source, muted palette. '
    body = era_prompt[len(lead):] if era_prompt.startswith(lead) else era_prompt
    return f'{style}. {body}'


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
    ap.add_argument('--seeds', type=int, default=SEEDS_PER_ERA, help='seeds per era')
    ap.add_argument('--style', default='gouache-set', choices=sorted(STYLES))
    ap.add_argument('--seed-base', type=int, default=400000,
                     help='seed family base; run 104 used 400000, a rerun of a subset should use a fresh '
                          'family (e.g. 500000) so seeds never collide with a prior run')
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
        'kind': 'era', 'style': args.style, 'style_clause': STYLES[args.style], 'tag': args.tag, 'model': MODEL,
        'quant': 'bitsandbytes 4-bit (pre-quantized)', 'steps': args.steps, 'guidance': 0.0,
        'scheduler': type(pipe.scheduler).__name__,
        'seed_scheme': f'{args.seed_base} + era_index*1000 + seed_index; era_index order ' + str(ERA_ORDER),
        'versions': sil.versions(), 'slots': [],
    }
    all_rows = []
    t0 = time.time()
    for slot in slots:
        key = slot['key']
        width, height = slot['width'], slot['height']
        prompt = build_prompt(slot['prompt'], STYLES[args.style])
        seeds = [seed_for(key, i, args.seed_base) for i in range(args.seeds)]
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
