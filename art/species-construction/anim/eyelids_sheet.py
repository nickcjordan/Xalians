"""Akinza eyelids: the eye-state sheet, the faint closed-eye stills and the open-lid difference images (PIL, no Blender).

  python art/species-construction/anim/eyelids_sheet.py states <frames dir> <out png>
      <frames dir>/{clay,fur}/rest/{crop_eyeside,crop_eyetq,sprite}/000k.png, k = 0 open, 1 half, 2 squint, 3 closed
  python art/species-construction/anim/eyelids_sheet.py faint <frames dir> <out png>
      <frames dir>/faint-fur/faint35/{crop_eyeside,crop_eyetq,sprite}/0035.png (as baked, lids open) and 0036.png (closed)
  python art/species-construction/anim/eyelids_sheet.py states2 <frames dir> <out png>
      fix pass 2: <frames dir>/{clay,fur}/rest/{crop_eyeside,crop_eyetq,sprite}/000k.png, k = 0 open, 1 half, 2 squint,
      3 wince, 4 closed; the sprite at 4x and at 1x
  python art/species-construction/anim/eyelids_sheet.py faint2 <frames dir> <out png>
      fix pass 2: <frames dir>/faint-fur/faint35/{crop_eyeside,crop_eyetq,sprite}/0035.png and 0036.png; sprite 4x and 1x
  python art/species-construction/anim/eyelids_sheet.py closed3 <spec json> <out png>
      fix pass 3: rows of fur side and three-quarter crops with the under-eye area's crop and mean Y (see closed3)
  python art/species-construction/anim/eyelids_sheet.py diff <approved png> <test png> <out prefix> [--label text]
      writes <out prefix>-diff.png (approved | test | |difference| x16 | any difference in amber) and prints and returns
      the numbers (max, mean, pixels over 0, 2, 8 levels) as JSON in <out prefix>-diff.json

Sprites are shown at 4x nearest neighbour. Labels are text; nothing is told by hue alone.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

STATES = ['open', 'half', 'squint', 'closed']
BG = (24, 24, 24)
INK = (235, 235, 235)


def font(size):
    for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def nn4(path):
    im = Image.open(path).convert('RGB')
    return im.resize((im.width*4, im.height*4), Image.NEAREST)


def states(frames, out):
    F = font(30)
    cols = [('clay', 'crop_eyeside', 'clay, side camera, 720 head crop'),
            ('clay', 'crop_eyetq', 'clay, three-quarter front, 720 head crop'),
            ('clay', 'sprite', 'clay, 192 sprite at 4x'),
            ('fur', 'crop_eyeside', 'fur, side camera, 720 head crop'),
            ('fur', 'crop_eyetq', 'fur, three-quarter front, 720 head crop'),
            ('fur', 'sprite', 'fur, 192 sprite at 4x')]
    cells = [[None]*len(cols) for _ in STATES]
    for r in range(len(STATES)):
        for c, (look, view, _) in enumerate(cols):
            p = frames/look/'rest'/view/f'{r:04d}.png'
            cells[r][c] = nn4(p) if view == 'sprite' else Image.open(p).convert('RGB')
    widths = [max(cells[r][c].width for r in range(len(STATES))) for c in range(len(cols))]
    heights = [max(im.height for im in row) for row in cells]
    lw, th, gap = 200, 60, 12
    W = lw+sum(widths)+gap*(len(cols)+1)
    H = th+sum(heights)+gap*(len(STATES)+1)
    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    x = lw+gap
    for c, (_, _, title) in enumerate(cols):
        d.text((x, 14), title, fill=INK, font=F)
        x += widths[c]+gap
    y = th+gap
    for r, name in enumerate(STATES):
        d.text((20, y+heights[r]//2-20), name, fill=INK, font=font(44))
        x = lw+gap
        for c in range(len(cols)):
            sheet.paste(cells[r][c], (x, y))
            x += widths[c]+gap
        y += heights[r]+gap
    sheet.save(out)
    print('sheet', out, sheet.size)


def faint(frames, out):
    F = font(30)
    rows = [('0035', 'faint frame 35 as baked (eyes open)'), ('0036', 'faint frame 35, near eye closed (both closed)')]
    cols = [('crop_eyeside', 'fur, side camera, 720 head crop'), ('crop_eyetq', 'fur, three-quarter front, 720 head crop'),
            ('sprite', 'fur, 192 sprite at 4x (the faint cell, 8 px wider)')]
    cells = [[(nn4 if v == 'sprite' else (lambda p: Image.open(p).convert('RGB')))(frames/'faint-fur'/'faint35'/v/f'{k}.png')
              for v, _ in cols] for k, _ in rows]
    widths = [max(cells[r][c].width for r in range(len(rows))) for c in range(len(cols))]
    heights = [max(im.height for im in row) for row in cells]
    gap, th, lh = 12, 60, 50
    W = sum(widths)+gap*(len(cols)+1)
    H = th+sum(heights)+(gap+lh)*len(rows)+gap
    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    x = gap
    for c, (_, title) in enumerate(cols):
        d.text((x, 14), title, fill=INK, font=F)
        x += widths[c]+gap
    y = th
    for r, (_, title) in enumerate(rows):
        d.text((gap, y+8), title, fill=INK, font=F)
        y += lh
        x = gap
        for c in range(len(cols)):
            sheet.paste(cells[r][c], (x, y))
            x += widths[c]+gap
        y += heights[r]+gap
    sheet.save(out)
    print('faint sheet', out, sheet.size)


STATES2 = ['open', 'half', 'squint', 'wince', 'closed']


def grid_sheet(cells, col_titles, row_titles, out, label_w=200):
    """cells[r][c]: PIL images (None leaves the cell empty); column titles over, row titles left; text labels only."""
    F = font(28)
    widths = [max((cells[r][c].width for r in range(len(cells)) if cells[r][c] is not None), default=10) for c in range(len(col_titles))]
    heights = [max((im.height for im in row if im is not None), default=10) for row in cells]
    th, gap = 90, 12
    W = label_w+sum(widths)+gap*(len(col_titles)+1)
    H = th+sum(heights)+gap*(len(cells)+1)
    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    x = label_w+gap
    for c, title in enumerate(col_titles):
        for k, ln in enumerate(title.split('\n')):
            d.text((x, 10+k*32), ln, fill=INK, font=F)
        x += widths[c]+gap
    y = th+gap
    for r, name in enumerate(row_titles):
        for k, ln in enumerate(name.split('\n')):
            d.text((16, y+heights[r]//2-24+k*40), ln, fill=INK, font=font(38 if k == 0 else 24))
        x = label_w+gap
        for c in range(len(col_titles)):
            if cells[r][c] is not None:
                sheet.paste(cells[r][c], (x, y))
            x += widths[c]+gap
        y += heights[r]+gap
    sheet.save(out)
    print('sheet', out, sheet.size)


def states2(frames, out):
    cols = []
    for look in ('clay', 'fur'):
        cols += [(look, 'crop_eyeside', 'big', f'{look}, side camera\n720 head crop'),
                 (look, 'crop_eyetq', 'big', f'{look}, three-quarter front\n720 head crop'),
                 (look, 'sprite', '4x', f'{look}, 192 sprite\nat 4x nearest neighbour'),
                 (look, 'sprite', '1x', f'{look}, 192\nat 1x')]
    cells = []
    for r in range(len(STATES2)):
        row = []
        for look, view, how, _ in cols:
            p = frames/look/'rest'/view/f'{r:04d}.png'
            row.append(nn4(p) if how == '4x' else Image.open(p).convert('RGB'))
        cells.append(row)
    grid_sheet(cells, [c[3] for c in cols], STATES2, out)


def faint2(frames, out):
    cols = [('crop_eyeside', 'big', 'fur, side camera\n720 head crop'), ('crop_eyetq', 'big', 'fur, three-quarter front\n720 head crop'),
            ('sprite', '4x', 'fur, 192 sprite at 4x (the faint\ncell, 16 px wider as the faint fur clip)'), ('sprite', '1x', '192 at 1x')]
    rows = [('0035', 'open\nas baked'), ('0036', 'closed\nboth eyes')]
    cells = [[(nn4 if how == '4x' else (lambda p: Image.open(p).convert('RGB')))(frames/'faint-fur'/'faint35'/v/f'{k}.png')
              for v, how, _ in cols] for k, _ in rows]
    grid_sheet(cells, [c[2] for c in cols], [r[1] for r in rows], out, label_w=230)


def under_eye(open_png, open_npz, test_png, eye='eye1', lids_dir=None, scale=2):
    """A large crop of the under-eye area (eyelids_measure.crescent_area, from the open frame) of a test frame, the area
    dotted, and the area's mean Y in the test frame and in the open one."""
    import eyelids_measure as em
    from scipy.ndimage import binary_dilation
    Yo, sd, base, area, thm, thl = em.crescent_area(open_png, open_npz, eye, lids_dir)
    rgb, Yt = em.lum(test_png)
    yy, xx = np.nonzero(area)
    m = 40
    y0, y1, x0, x1 = max(yy.min()-m, 0), min(yy.max()+m, Yt.shape[0]), max(xx.min()-m, 0), min(xx.max()+m, Yt.shape[1])
    ov = rgb.astype(np.uint8).copy()
    e = binary_dilation(area, iterations=1) & ~area
    ey, ex = np.nonzero(e)
    dots = ((ey+ex) // 3) % 2 == 0
    ov[ey[dots], ex[dots]] = (20, 20, 20)
    im = Image.fromarray(ov[y0:y1, x0:x1]).resize(((x1-x0)*scale, (y1-y0)*scale), Image.LANCZOS)
    return im, float(Yt[area].mean()), float(Yo[area].mean())


def closed3(spec, out):
    """Fix pass 3 sheet from a JSON spec: {"sections": [{"title", "rows": [{"title", "side", "tq", "open_tq", "open_tq_masks",
    "lids"?, "ue_tq"?, "compare"?: {"title", "tq"}}]}]}: per row the fur side and three-quarter 720 crops and the under-eye
    crop of the three-quarter view (2x) with its mean Y against the open frame's; an optional fourth cell is another frame's
    under-eye crop (pass 2, the same state) with its number."""
    S = json.loads(Path(spec).read_text())
    F = font(26)
    blocks = []
    for sec in S['sections']:
        cells, titles = [], []
        for r in sec['rows']:
            side = Image.open(r['side']).convert('RGB')
            tq = Image.open(r['tq']).convert('RGB')
            ue, y, y0 = under_eye(Path(r['open_tq']), Path(r['open_tq_masks']), Path(r['tq']), lids_dir=r.get('lids'))
            def labelled(im, text):
                c = Image.new('RGB', (im.width, im.height+44), BG)
                c.paste(im, (0, 44))
                ImageDraw.Draw(c).text((4, 6), text, fill=INK, font=F)
                return c
            row = [side, tq, labelled(ue, f'under-eye mean Y {y:.1f} ({y-y0:+.1f} against open {y0:.1f})')]
            if r.get('compare'):
                cp_, cy, cy0 = under_eye(Path(r['open_tq']), Path(r['open_tq_masks']), Path(r['compare']['tq']), lids_dir=r.get('lids'))
                row.append(labelled(cp_, f'{r["compare"]["title"]}: {cy:.1f} ({cy-cy0:+.1f})'))
            cells.append(row)
            titles.append(r['title'])
        n = max(len(c) for c in cells)
        cells = [c+[None]*(n-len(c)) for c in cells]
        cols = ['fur, side camera\n720 head crop', 'fur, three-quarter front\n720 head crop',
                'under the eye (three-quarter, 2x),\nthe area dotted: sd -18 to -2 mm', 'pass 2, the same state\n(under the eye, 2x)'][:n]
        tmp = Path(out).with_suffix('.part%d.png' % len(blocks))
        grid_sheet(cells, cols, titles, tmp, label_w=250)
        blocks.append((sec['title'], Image.open(tmp).convert('RGB')))
        tmp.unlink()
    W = max(b.width for _, b in blocks)
    H = sum(b.height+70 for _, b in blocks)
    sheet = Image.new('RGB', (W, H), BG)
    y = 0
    for t, b in blocks:
        ImageDraw.Draw(sheet).text((16, y+16), t, fill=INK, font=font(36))
        sheet.paste(b, (0, y+70))
        y += b.height+70
    sheet.save(out)
    print('sheet', out, sheet.size)


def diff(approved, test, prefix, label=''):
    a = np.asarray(Image.open(approved).convert('RGB')).astype(np.int16)
    b = np.asarray(Image.open(test).convert('RGB')).astype(np.int16)
    assert a.shape == b.shape, (a.shape, b.shape)
    d = np.abs(a-b).max(2)
    nums = dict(approved=str(approved), test=str(test), size=list(a.shape[:2]), max=int(d.max()), mean=float(d.mean()),
                pixels_over_0=int((d > 0).sum()), pixels_over_2=int((d > 2).sum()), pixels_over_8=int((d > 8).sum()),
                identical=bool(d.max() == 0))
    amp = np.clip(d*16, 0, 255).astype(np.uint8)
    mask = np.zeros(a.shape, np.uint8)
    mask[d > 0] = (255, 176, 0)
    F = font(22)
    h, w = d.shape
    sheet = Image.new('RGB', (w*4+50, h+70), BG)
    for i, (im, t) in enumerate([(Image.fromarray(a.astype(np.uint8)), 'approved'), (Image.fromarray(b.astype(np.uint8)), 'lids open'),
                                 (Image.fromarray(amp).convert('RGB'), '|difference| x16'),
                                 (Image.fromarray(mask), f'pixels that differ at all: {nums["pixels_over_0"]}')]):
        sheet.paste(im, (10+i*(w+10), 60))
        ImageDraw.Draw(sheet).text((10+i*(w+10), 30), t, fill=INK, font=F)
    ImageDraw.Draw(sheet).text((10, 4), f'{label}  max {nums["max"]} levels, mean {nums["mean"]:.4f}', fill=INK, font=F)
    sheet.save(f'{prefix}-diff.png')
    Path(f'{prefix}-diff.json').write_text(json.dumps(nums, indent=1))
    print(json.dumps(nums))
    return nums


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'states':
        states(Path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == 'faint':
        faint(Path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == 'states2':
        states2(Path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == 'faint2':
        faint2(Path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == 'closed3':
        closed3(Path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == 'diff':
        lab = sys.argv[sys.argv.index('--label')+1] if '--label' in sys.argv else ''
        diff(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], lab)
