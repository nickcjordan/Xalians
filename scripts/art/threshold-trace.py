"""Finishing step: threshold a generated tile to pure black and white, drop specks, trace to SVG with true holes.

Usage: python scripts/art/threshold-trace.py <run-dir> [--thr auto|0-255] [--speck 60]
Writes <run-dir>/trace/<name>-bw.png and <name>.svg for every candidate PNG, plus a before/after sheet
<run-dir>/trace/<key>-<tag>-trace-sheet.png (top row: raw tiles, bottom row: thresholded).
"""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import potrace


def otsu(a):
    hist = np.bincount(a.ravel(), minlength=256).astype(float)
    total = a.size; sum_all = np.dot(np.arange(256), hist)
    w_b = sum_b = 0.0; best = 0.0; thr = 128
    for t in range(256):
        w_b += hist[t]
        if w_b == 0: continue
        w_f = total - w_b
        if w_f == 0: break
        sum_b += t * hist[t]
        m_b = sum_b / w_b; m_f = (sum_all - sum_b) / w_f
        v = w_b * w_f * (m_b - m_f) ** 2
        if v > best: best, thr = v, t
    return thr


def trace_svg(bw, speck):
    bmp = potrace.Bitmap(bw)
    path = bmp.trace(turdsize=speck, alphamax=1.0, opttolerance=0.2)
    h, w = bw.shape; d = []
    for curve in path:
        s = curve.start_point; d.append(f'M{s.x:.1f} {s.y:.1f}')
        for seg in curve:
            if seg.is_corner: d.append(f'L{seg.c.x:.1f} {seg.c.y:.1f} L{seg.end_point.x:.1f} {seg.end_point.y:.1f}')
            else: d.append(f'C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}')
        d.append('Z')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><path fill="#000" fill-rule="evenodd" d="{" ".join(d)}"/></svg>', len(list(path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('run_dir')
    ap.add_argument('--thr', default='auto')
    ap.add_argument('--speck', type=int, default=60, help='drop black or white islands smaller than this many pixels')
    args = ap.parse_args()
    run = Path(args.run_dir); out = run / 'trace'; out.mkdir(exist_ok=True)
    man = json.loads((run / 'manifest.json').read_text(encoding='utf-8'))
    tiles = [Path(c['file']) for c in man['candidates']]
    raws, bws, report = [], [], []
    for p in tiles:
        a = np.array(Image.open(p).convert('L'))
        t = otsu(a) if args.thr == 'auto' else int(args.thr)
        bw = a < t
        svg, n = trace_svg(bw, args.speck)
        (out / f'{p.stem}.svg').write_text(svg, encoding='utf-8')
        bw_img = Image.fromarray((~bw * 255).astype('uint8'))
        bw_img.save(out / f'{p.stem}-bw.png')
        raws.append(Image.open(p).convert('RGB')); bws.append(bw_img.convert('RGB'))
        report.append({'file': p.name, 'threshold': int(t), 'black_fraction': round(float(bw.mean()), 3), 'curves': n, 'svg_bytes': len(svg)})
    cell = 384
    sheet = Image.new('RGB', (len(tiles) * cell, 2 * (cell + 24)), 'white'); dr = ImageDraw.Draw(sheet)
    for i, (r, b) in enumerate(zip(raws, bws)):
        for row, im in enumerate((r, b)):
            im = im.copy(); im.thumbnail((cell, cell))
            sheet.paste(im, (i * cell + (cell - im.width) // 2, row * (cell + 24)))
        dr.text((i * cell + 4, cell + 4), f'{tiles[i].stem} raw', fill='black')
        dr.text((i * cell + 4, 2 * cell + 28), f'{tiles[i].stem} traced ({report[i]["curves"]} curves)', fill='black')
    sp = out / f'{man["key"]}-{man["tag"]}-trace-sheet.png'; sheet.save(sp)
    (out / 'trace-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(sp); print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
