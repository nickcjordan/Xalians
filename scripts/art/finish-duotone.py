"""Finishing step: duotone remap of a generated tile, ink to paper, from the site's own design tokens.

Usage:
  python scripts/art/finish-duotone.py <png> --ink <hex> --paper <hex> [--gamma 1.0] [--out <png>]
  python scripts/art/finish-duotone.py --sheet <dir> --pattern <glob> --ink <hex> --paper <hex> [--gamma 1.0]

Single-file mode converts the source to luminance, applies gamma, and maps 0..1 onto a two-colour ramp
(ink for shadows, paper for highlights), writing <name>-duotone-<ink-no-hash>.png next to the source unless
--out is given. Sheet mode finishes every file in <dir> matching <pattern> and builds a before/after sheet
(<dir>/duotone-<tag>-sheet.png) with the original and the duotone side by side per tile.

No colour is invented here: run this against a hex pulled from my-app/src/constants/designTokens.js (or its
CSS twin, public/assets/css/system.css) and pass it as --ink / --paper; the caller records which token name
each hex came from in LOG.md.
"""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw


def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) != 6:
        raise SystemExit(f'--ink/--paper must be a 6-digit hex like #0d0b09, got {h!r}')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def duotone(img: Image.Image, ink_rgb, paper_rgb, gamma: float) -> Image.Image:
    g = np.asarray(img.convert('L'), dtype=np.float64) / 255.0
    if gamma != 1.0:
        g = np.power(g, gamma)
    ink = np.array(ink_rgb, dtype=np.float64)
    paper = np.array(paper_rgb, dtype=np.float64)
    # g=0 (shadow) -> ink, g=1 (highlight) -> paper
    out = ink[None, None, :] * (1 - g[:, :, None]) + paper[None, None, :] * g[:, :, None]
    return Image.fromarray(out.round().astype(np.uint8), mode='RGB')


def process_one(src: Path, ink_rgb, paper_rgb, gamma, out: Path = None) -> Path:
    img = Image.open(src).convert('RGB')
    result = duotone(img, ink_rgb, paper_rgb, gamma)
    if out is None:
        ink_tag = '%02x%02x%02x' % ink_rgb
        out = src.with_name(f'{src.stem}-duotone-{ink_tag}{src.suffix}')
    result.save(out)
    return out


def before_after_sheet(pairs, out_path: Path, cell=384):
    """pairs: list of (label, before_path, after_path)."""
    cols = 2
    rows = len(pairs)
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (label, before, after) in enumerate(pairs):
        for j, (tag, p) in enumerate((('before', before), ('after', after))):
            im = Image.open(p).convert('RGB')
            im.thumbnail((cell, cell))
            x, y = j * cell, i * (cell + 24)
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
            d.text((x + 4, y + cell + 4), f'{label} {tag}', fill='black')
    sheet.save(out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('png', nargs='?', help='single tile to finish (single-file mode)')
    ap.add_argument('--ink', required=True, help='hex colour for shadows, e.g. #0d0b09')
    ap.add_argument('--paper', required=True, help='hex colour for highlights, e.g. #ddd4bd')
    ap.add_argument('--gamma', type=float, default=1.0)
    ap.add_argument('--out', default='', help='single-file mode: explicit output path')
    ap.add_argument('--sheet', default='', help='sheet mode: directory of tiles to finish')
    ap.add_argument('--pattern', default='*.png', help='sheet mode: glob pattern within --sheet')
    ap.add_argument('--tag', default='duotone', help='sheet mode: label used in the sheet filename')
    args = ap.parse_args()

    ink_rgb, paper_rgb = hex_to_rgb(args.ink), hex_to_rgb(args.paper)

    if args.sheet:
        d = Path(args.sheet)
        srcs = sorted(p for p in d.glob(args.pattern) if 'duotone' not in p.stem and 'contact' not in p.stem)
        if not srcs:
            raise SystemExit(f'no files matched {args.pattern} in {d}')
        pairs = []
        for src in srcs:
            out = process_one(src, ink_rgb, paper_rgb, args.gamma)
            pairs.append((src.stem, src, out))
            print(f'{src.name} -> {out.name}')
        sheet_path = d / f'duotone-{args.tag}-sheet.png'
        before_after_sheet(pairs, sheet_path)
        print('sheet ->', sheet_path)
    else:
        if not args.png:
            raise SystemExit('give a png path, or use --sheet <dir> --pattern <glob>')
        out = Path(args.out) if args.out else None
        result = process_one(Path(args.png), ink_rgb, paper_rgb, args.gamma, out)
        print('->', result)


if __name__ == '__main__':
    main()
