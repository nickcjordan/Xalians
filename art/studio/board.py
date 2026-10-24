"""View board: one build (and optionally the build before it) from every board camera at once, beside the sheet.

    python art/studio/board.py --build <build dir> [--before <build dir>] --cameras <cameras.json> --refs <refs.json>
        --out <dir> [--views side-left,front,threequarter-left,top,rear-low-threequarter-left]
        [--looks clay,grazing,curvature] [--samples 32] [--label after] [--before-label before]

Alignment with the creature pipeline (stage contracts section 1 and 2, lessons 40, 43): a part or a whole form is
judged on every board camera together, never one view at a time, and in three looks: clay (the standard light),
grazing (one hard light raking across the surface, for lumps, ripples and steps) and curvature (concave blue,
convex amber, for creases, grafts and pinches). The sheet's view for each camera sits in the last column.

refs.json maps a camera id to a reference image: {"side-left": {"file": "...png", "crop": [x0, y0, x1, y1],
"label": "Model sheet, bare side"}, ...}. A camera without a reference gets an empty cell.

Renders are cached per blend sha256, look, camera, samples and renderer hash under
C:/dev/art-data/studio/board-cache, so the "before" column costs nothing after its first board.
Writes <out>/board-<look>.jpg and the single cells <out>/<look>/<column>/<camera>.png.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CACHE = Path('C:/dev/art-data/studio/board-cache')
CELL = 760
BG = (238, 238, 236)
DEFAULT_VIEWS = 'side-left,front,threequarter-left,top,rear-low-threequarter-left'


def font(size):
    for name in ('arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def blend_of(build):
    build = Path(build)
    for cand in (build/'blockout.blend', build/'build'/'blockout.blend'):
        if cand.is_file():
            return cand
    found = sorted(build.glob('*.blend'))
    if not found:
        sys.exit(f'no .blend in {build}')
    return found[0]


def render(blend, cameras, views, look, samples):
    """Cached raw RGBA renders of `views` for one blend and look; returns {camera: path}."""
    key = hashlib.sha256()
    for part in (sha(blend), look, str(samples), sha(cameras), sha(HERE/'packet_render.py')):
        key.update(part.encode())
    folder = CACHE/key.hexdigest()[:20]
    missing = [v for v in views if not (folder/f'{v}.png').is_file()]
    if missing:
        folder.mkdir(parents=True, exist_ok=True)
        cmd = [sys.executable, str(HERE/'runner.py'), 'blender', '--log', f'board-{look}-{Path(blend).parent.name}',
               str(HERE/'packet_render.py'), '--', '--scene', str(blend), '--cameras', str(cameras), '--out', str(folder),
               '--only', ','.join(missing), '--samples', str(samples), '--look', look]
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode:
            sys.exit(f'board render failed ({look}):\n{r.stdout[-1500:]}{r.stderr[-1500:]}')
    return {v: folder/f'{v}.png' for v in views}


def cell_from_render(path):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, BG+(255,))
    return Image.alpha_composite(bg, im).convert('RGB').resize((CELL, CELL), Image.LANCZOS)


def cell_from_ref(ref):
    im = Image.open(ref['file']).convert('RGB')
    if ref.get('crop'):
        im = im.crop(tuple(ref['crop']))
    if ref.get('rotate'):
        im = im.rotate(ref['rotate'], expand=True, fillcolor=(255, 255, 255))
    im.thumbnail((CELL, CELL), Image.LANCZOS)
    cell = Image.new('RGB', (CELL, CELL), (255, 255, 255))
    cell.paste(im, ((CELL-im.width)//2, (CELL-im.height)//2))
    return cell


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--build', required=True)
    ap.add_argument('--before')
    ap.add_argument('--cameras', type=Path, required=True)
    ap.add_argument('--refs', type=Path)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--views', default=DEFAULT_VIEWS)
    ap.add_argument('--looks', default='clay,grazing,curvature')
    ap.add_argument('--samples', type=int, default=32)
    ap.add_argument('--label', default='after')
    ap.add_argument('--before-label', default='before')
    ap.add_argument('--title', default='')
    a = ap.parse_args()
    views = [v for v in a.views.split(',') if v]
    ids = {c['id'] for c in json.loads(a.cameras.read_text())['cameras']}
    unknown = [v for v in views if v not in ids]
    if unknown:
        sys.exit(f'cameras not in {a.cameras}: {unknown}')
    refs = json.loads(a.refs.read_text()) if a.refs else {}
    cols = ([(a.before_label, blend_of(a.before))] if a.before else [])+[(a.label, blend_of(a.build))]
    a.out.mkdir(parents=True, exist_ok=True)
    record = {'build': str(blend_of(a.build)), 'before': str(blend_of(a.before)) if a.before else None,
              'views': views, 'looks': a.looks.split(','), 'samples': a.samples, 'boards': {}}
    for look in a.looks.split(','):
        rendered = [(label, render(blend, a.cameras, views, look, a.samples)) for label, blend in cols]
        ncol = len(cols)+1
        head = 70 if a.title else 0
        W, H = CELL*ncol, head+44+len(views)*(CELL+36)
        board = Image.new('RGB', (W, H), (255, 255, 255))
        d = ImageDraw.Draw(board)
        if a.title:
            d.text((14, 18), f'{a.title}  ({look})', fill=(20, 20, 20), font=font(30))
        for c, (label, _) in enumerate(cols):
            d.text((c*CELL+14, head+10), label, fill=(20, 20, 20), font=font(24))
        d.text((len(cols)*CELL+14, head+10), 'sheet', fill=(20, 20, 20), font=font(24))
        for r, v in enumerate(views):
            y = head+44+r*(CELL+36)
            d.text((14, y+4), v, fill=(70, 70, 70), font=font(22))
            for c, (label, paths) in enumerate(rendered):
                cell = cell_from_render(paths[v])
                (a.out/look/label).mkdir(parents=True, exist_ok=True)
                cell.save(a.out/look/label/f'{v}.png')
                board.paste(cell, (c*CELL, y+36))
            if v in refs:
                board.paste(cell_from_ref(refs[v]), (len(cols)*CELL, y+36))
                d.text((len(cols)*CELL+14, y+4), refs[v].get('label', ''), fill=(70, 70, 70), font=font(20))
        for c in range(1, ncol):
            d.line([(c*CELL, head), (c*CELL, H)], fill=(180, 180, 180), width=2)
        path = a.out/f'board-{look}.jpg'
        board.save(path, quality=88)
        record['boards'][look] = str(path)
        print('wrote', path)
    (a.out/'board.json').write_text(json.dumps(record, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
