"""Combine two generate-support-styles.py runs (one per model) into cross-model comparison sheets.

Usage (from the worktree root, inside the xalians-art venv):
  python scripts/art/combine-support-styles.py --zimage run102-support-styles-zimage --klein run103-support-styles-klein --out styles-run102-run103

Writes, under C:/dev/src/xalians-art/out/support/<out>/, one sheet per style (8 tiles: deep-past zimage s0, s1,
klein s0, s1, then end-wars in the same order, one era per row) and one overall sheet (all styles, one row of
eight per style), each tile labelled era / model / seed. Reads the two manifests, never regenerates.
"""
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw

SUPPORT_OUT = Path('C:/dev/src/xalians-art/out/support')


def tiles_for(manifest: dict, model_label: str):
    """{style: {era: [(label, path), ...]}} from a generate-support-styles manifest."""
    d = {}
    for s in manifest['styles']:
        for e in s['eras']:
            d.setdefault(s['style'], {})[e['era']] = [
                (f"{e['era']} {model_label} {c['seed']}", Path(c['file'])) for c in e['candidates']]
    return d


def grid(rows, cols, cell_w=384, cell_h=192, label_h=20, path=None):
    """rows: list of lists of (label, path); one row per list."""
    sheet = Image.new('RGB', (cols * cell_w, len(rows) * (cell_h + label_h)), 'white')
    d = ImageDraw.Draw(sheet)
    for r, row in enumerate(rows):
        for c, (label, p) in enumerate(row):
            im = Image.open(p).convert('RGB'); im.thumbnail((cell_w, cell_h))
            x, y = c * cell_w, r * (cell_h + label_h)
            sheet.paste(im, (x + (cell_w - im.width) // 2, y + (cell_h - im.height) // 2))
            d.text((x + 4, y + cell_h + 3), label, fill='black')
    sheet.save(path); print('sheet ->', path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zimage', required=True); ap.add_argument('--klein', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    z = tiles_for(json.loads((SUPPORT_OUT / a.zimage / 'manifest.json').read_text(encoding='utf-8')), 'zimage')
    k = tiles_for(json.loads((SUPPORT_OUT / a.klein / 'manifest.json').read_text(encoding='utf-8')), 'klein')
    out = SUPPORT_OUT / a.out; out.mkdir(parents=True, exist_ok=True)
    styles = [s for s in ['inkwash', 'linocut', 'gouache', 'charcoal', 'screenprint', 'storyboard'] if s in z or s in k]
    all_rows = []
    for style in styles:
        rows = []
        for era in ['deep-past', 'end-wars']:
            row = z.get(style, {}).get(era, []) + k.get(style, {}).get(era, [])
            rows.append(row)
        grid(rows, 4, path=out / f'{style}-{a.out}-contact.png')
        all_rows.append([(f'{style} {lbl}', p) for row in rows for (lbl, p) in row])
    grid(all_rows, 8, cell_w=300, cell_h=150, path=out / f'support-{a.out}-contact.png')


if __name__ == '__main__':
    main()
