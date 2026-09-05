"""Support-art style-treatment matrix: six hand-drawn/abstract style clauses across two eras (deep-past, end-wars),
on both Z-Image-Turbo and FLUX.2 klein, to find a more forgiving direction than run 101's realistic full-colour
frontispieces (Nick's verdict 2026-09-05: the Z-Image originals looked better than the duotone finish, but a
realistic painting has to be perfect to work; a hand-drawn or abstract look would be more forgiving).

Thin wrapper alongside generate-support.py: it reuses generate-support.py's era body text (support.json) but
swaps run 101's "painterly concept art, high contrast, single light source, muted palette." lead-in for one of
six short style clauses (--style), and can route to either Z-Image (generate-support.py's own path) or FLUX.2
klein (generate-flux2klein.py's loader pattern: Flux2Transformer2DModel + Qwen3ForCausalLM both nf4-quantized,
Flux2KleinPipeline, enable_model_cpu_offload(), 4 steps, guidance 1.0, image=None since no references are used).

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/generate-support-styles.py --model zimage --tag run102-support-styles-zimage
  python scripts/art/generate-support-styles.py --model klein --tag run103-support-styles-klein

Runs the full matrix: 6 styles x 2 eras (deep-past, end-wars) x 2 seeds for the given --model. Size defaults to
1536x768 (run 101's size); falls back to 1280x640 on a CUDA memory fault (except klein, which falls back to
1024x512 on a hard shape/API failure, logged separately). Same manifest, contact-sheet and versions() conventions
as generate-support.py / generate-silhouettes.py: sil.sha256, sil.versions(), sil.contact_sheet, incremental
manifest writes after every image, per-style and one overall sheet.
"""
import argparse, importlib.util, json, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
sil = load('generate-silhouettes')
sup = load('generate-support')

ZIMAGE_MODEL = 'unsloth/Z-Image-Turbo-unsloth-bnb-4bit'
KLEIN_MODEL = 'black-forest-labs/FLUX.2-klein-4B'
FALLBACK_SIZE = (1280, 640)
KLEIN_FALLBACK_SIZE = (1024, 512)

# Era body text, unchanged from support.json, with run 101's "painterly concept art, high contrast, single light
# source, muted palette." lead-in clause dropped (replaced per-style below).
ERAS = {
    'deep-past': ("A wide cinematic view of a shattered planetary system: the remains of a family of worlds torn "
                  "apart by an ancient supernova, drifting as a broken ring of dark rock fragments and dust against "
                  "deep space, one single surviving world hanging intact and small at the center of the frame, lit "
                  "by a distant dying star. Ancient, cold, immense scale, utter emptiness, ruin long since gone quiet."),
    'end-wars': ("A wide cinematic view of a dark world under a raging orbital battle: jagged black spires rising "
                 "from a barren plain into a starless sky, streaks of weapon fire and the flares of distant "
                 "explosions lighting the clouds above, one massive fleet silhouette burning as it falls toward the "
                 "horizon. Cold, hostile, apocalyptic scale, the last stand of a dying war lit only by destruction."),
}

# Style clauses lead the prompt (nouns are taken literally, per the log's standing finding), short as specified.
STYLES = {
    'inkwash': 'sumi ink wash on paper, loose brush, large washes, white paper showing, no fine detail',
    'linocut': 'linocut print, bold black shapes, carved white lines, two-colour, flat',
    'gouache': 'flat gouache poster, four colours, hard-edged shapes, no gradients, mid-century travel poster',
    'charcoal': 'charcoal and chalk sketch on toned paper, smudged, gestural, unfinished edges',
    'screenprint': 'silkscreen print, three ink layers slightly misregistered, halftone shading, paper texture',
    'storyboard': 'loose watercolour storyboard frame, pencil underdrawing visible, wide framing, sparse',
}

STYLE_ORDER = ['inkwash', 'linocut', 'gouache', 'charcoal', 'screenprint', 'storyboard']
ERA_ORDER = ['deep-past', 'end-wars']

# Fixed seed scheme: 300000 + style_index*1000 + era_index*100 + seed_index. Deterministic, no randomness,
# and distinct from every other range used in the pipeline (run 101 used 201000-207003).
def seed_for(style: str, era: str, seed_idx: int) -> int:
    style_i = STYLE_ORDER.index(style)
    era_i = ERA_ORDER.index(era)
    return 300000 + style_i * 1000 + era_i * 100 + seed_idx


def build_prompt(style: str, era: str) -> str:
    return f'{STYLES[style]}. {ERAS[era]}'


def contact_sheet_style(out: Path, tag: str, style: str, tiles):
    """tiles: list of (label, Path) for this style's up-to-8 tiles (2 eras x 2 models... here 1 model x 2 eras x 2 seeds)."""
    from PIL import Image, ImageDraw
    cols, cell = 4, 384
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (label, p) in enumerate(tiles):
        im = Image.open(p).convert('RGB')
        im.thumbnail((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * (cell + 24)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        d.text((x + 4, y + cell + 4), label, fill='black')
    p = out / f'{style}-{tag}-contact.png'
    sheet.save(p)
    print('style contact sheet ->', p)
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, choices=['zimage', 'klein'])
    ap.add_argument('--styles', default='all', help='comma-separated style keys, or "all"')
    ap.add_argument('--eras', default='all', help='comma-separated era keys, or "all"')
    ap.add_argument('--seeds-per', type=int, default=2)
    ap.add_argument('--width', type=int, default=1536)
    ap.add_argument('--height', type=int, default=768)
    ap.add_argument('--steps', type=int, default=8, help='Z-Image steps (ignored for klein, which always uses 4)')
    ap.add_argument('--tag', required=True)
    args = ap.parse_args()

    styles = STYLE_ORDER if args.styles == 'all' else [s for s in STYLE_ORDER if s in set(args.styles.split(','))]
    eras = ERA_ORDER if args.eras == 'all' else [e for e in ERA_ORDER if e in set(args.eras.split(','))]
    if not styles or not eras:
        raise SystemExit('no styles/eras matched')

    out_root = Path('C:/dev/src/xalians-art/out/support') / args.tag
    out_root.mkdir(parents=True, exist_ok=True)

    import torch
    if args.model == 'zimage':
        from diffusers import ZImagePipeline
        pipe = ZImagePipeline.from_pretrained(ZIMAGE_MODEL, torch_dtype=torch.bfloat16)
        pipe.enable_model_cpu_offload()
        model_id, quant = ZIMAGE_MODEL, 'bitsandbytes 4-bit (pre-quantized)'
    else:
        from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel, BitsAndBytesConfig as DBnb
        from transformers import Qwen3ForCausalLM, BitsAndBytesConfig as TBnb
        transformer = Flux2Transformer2DModel.from_pretrained(
            KLEIN_MODEL, subfolder='transformer', torch_dtype=torch.bfloat16,
            quantization_config=DBnb(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16))
        text_encoder = Qwen3ForCausalLM.from_pretrained(
            KLEIN_MODEL, subfolder='text_encoder', torch_dtype=torch.bfloat16,
            quantization_config=TBnb(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.bfloat16))
        pipe = Flux2KleinPipeline.from_pretrained(KLEIN_MODEL, transformer=transformer, text_encoder=text_encoder, torch_dtype=torch.bfloat16)
        pipe.enable_model_cpu_offload()
        model_id, quant = KLEIN_MODEL, 'bitsandbytes nf4 on load (transformer and text encoder)'

    manifest = {
        'model_key': args.model, 'tag': args.tag, 'model': model_id, 'quant': quant,
        'requested_size': [args.width, args.height], 'seed_scheme': '300000 + style_index*1000 + era_index*100 + seed_index; '
        f'style_index order {STYLE_ORDER}; era_index order {ERA_ORDER}',
        'steps': (args.steps if args.model == 'zimage' else 4), 'guidance': (0.0 if args.model == 'zimage' else 1.0),
        'scheduler': type(pipe.scheduler).__name__, 'versions': sil.versions(), 'styles': [],
    }
    mpath = out_root / 'manifest.json'
    all_rows = []
    t0 = time.time()
    for style in styles:
        style_tiles = []
        style_entry = {'style': style, 'style_clause': STYLES[style], 'eras': []}
        for era in eras:
            prompt = build_prompt(style, era)
            era_entry = {'era': era, 'prompt': prompt, 'requested_size': [args.width, args.height],
                        'used_size': None, 'fallback_used': False, 'fallback_kind': None, 'candidates': []}
            for seed_idx in range(args.seeds_per):
                seed = seed_for(style, era, seed_idx)
                g = torch.Generator('cpu').manual_seed(seed)
                t1 = time.time()
                use_w, use_h = args.width, args.height
                fallback_kind = None
                try:
                    if args.model == 'zimage':
                        img = pipe(prompt=prompt, num_inference_steps=args.steps, guidance_scale=0.0,
                                  width=use_w, height=use_h, generator=g).images[0]
                    else:
                        img = pipe(image=None, prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
                                  width=use_w, height=use_h, generator=g).images[0]
                except torch.cuda.OutOfMemoryError:
                    torch.cuda.empty_cache()
                    use_w, use_h = FALLBACK_SIZE
                    fallback_kind = 'oom-1280x640'
                    print(f'  {style}/{era} seed {seed}: OOM at {args.width}x{args.height}, falling back to {FALLBACK_SIZE}', flush=True)
                    g = torch.Generator('cpu').manual_seed(seed)
                    if args.model == 'zimage':
                        img = pipe(prompt=prompt, num_inference_steps=args.steps, guidance_scale=0.0,
                                  width=use_w, height=use_h, generator=g).images[0]
                    else:
                        img = pipe(image=None, prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
                                  width=use_w, height=use_h, generator=g).images[0]
                except Exception as e:
                    if args.model != 'klein':
                        raise
                    # klein-specific hard shape/API failure (not OOM): fall back to 1024x512, distinct from the
                    # general 1280x640 fallback above, per the task's explicit instruction to call this out separately.
                    torch.cuda.empty_cache()
                    use_w, use_h = KLEIN_FALLBACK_SIZE
                    fallback_kind = 'klein-hard-failure-1024x512'
                    print(f'  {style}/{era} seed {seed}: klein hard failure ({e!r}) at {args.width}x{args.height}, '
                          f'falling back to {KLEIN_FALLBACK_SIZE}', flush=True)
                    g = torch.Generator('cpu').manual_seed(seed)
                    img = pipe(image=None, prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
                              width=use_w, height=use_h, generator=g).images[0]
                era_entry['used_size'] = [use_w, use_h]
                if fallback_kind:
                    era_entry['fallback_used'] = True
                    era_entry['fallback_kind'] = fallback_kind
                p = out_root / f'{style}-{era}-{seed}.png'
                img.save(p)
                mem = {'max_allocated_mb': round(torch.cuda.max_memory_allocated() / 2**20), 'max_reserved_mb': round(torch.cuda.max_memory_reserved() / 2**20)}
                cand = {'seed': seed, 'seed_idx': seed_idx, 'file': str(p), 'sha': sil.sha256(p), 'seconds': round(time.time() - t1, 1), **mem}
                era_entry['candidates'].append(cand)
                label = f'{style}/{era} {args.model} s{seed_idx}'
                style_tiles.append((label, p))
                all_rows.append((label, p))
                mpath.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
                print(f'[{style}/{era}] seed {seed} {round(time.time()-t1)}s peak {mem["max_allocated_mb"]} MB -> {p.name}', flush=True)
            style_entry['eras'].append(era_entry)
            manifest['styles'] = [s for s in manifest['styles'] if s['style'] != style] + [style_entry]
            mpath.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        contact_sheet_style(out_root, args.tag, style, style_tiles)

    sup.contact_sheet_multi(out_root, args.tag, all_rows, cols=4)
    print(f'done in {round(time.time()-t0)}s')


if __name__ == '__main__':
    main()
