"""Harness for the Akinza build and critique loop.

Every candidate goes through the same commands, so the critic always sees the
same views, crops and measurements:

  python art/species-construction/loop/loop_tools.py assemble <head-dir> <body-dir> <out-name>
  python art/species-construction/loop/loop_tools.py render <assembly-name>
  python art/species-construction/loop/loop_tools.py check <assembly-name>
  python art/species-construction/loop/loop_tools.py packet <assembly-name> <packet-dir>
  python art/species-construction/loop/loop_tools.py measure <assembly-name>
  python art/species-construction/loop/loop_tools.py blender <script.py> [script args...]
  python art/species-construction/loop/loop_tools.py next-number
  python art/species-construction/loop/loop_tools.py quick <head-dir> <body-dir> <preview-dir> [--baseline fit.json]
  python art/species-construction/loop/loop_tools.py fit <assembly-name|preview-dir> [--out DIR] [--baseline fit.json]
  python art/species-construction/loop/loop_tools.py diff <baseline-packet> <candidate-packet>
  python art/species-construction/loop/loop_tools.py measured <packet>

Names are directories under untracked/species-construction/akinza. Blender is
found from XALIANS_BLENDER or the local art tools install. See
docs/design/species-construction/LOOP.md.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT/'untracked/species-construction/akinza'
CONSTRUCTION = ROOT/'art/species-construction'
DOCS = ROOT/'docs/design/species-construction/akinza'
CAMERAS = DOCS/'loop/cameras'
EVIDENCE = DOCS/'evidence'
DEFAULT_BLENDER = Path(r'C:\Users\njord\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local'
                       r'\XaliansArtTools\blender-5.2.2-windows-x64\blender.exe')
PLACEMENT = ['--head-scale', '.50', '--jaw-anchor-z', '.500', '--head-depth-offset', '-.020']
VIEWS = ['front', 'front-left', 'left', 'back', 'right', 'front-right']
CAMERA_SETS = ['face', 'head', 'neck', 'regions', 'tail', 'paws']
# Column ranges of the front and left figures in the preferred first sheet.
REFERENCE_PANELS = {'front': (0, 375), 'left': (759, 1024)}


def blender_path():
    path = Path(os.environ.get('XALIANS_BLENDER', DEFAULT_BLENDER))
    if not path.is_file():
        sys.exit(f'Blender not found at {path}; set XALIANS_BLENDER')
    return path


BLENDER_SLOTS = 2
MIN_FREE_GB = 9


def free_memory_gb():
    import ctypes

    class Status(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong), ('total', ctypes.c_ulonglong),
                    ('available', ctypes.c_ulonglong), ('pageTotal', ctypes.c_ulonglong),
                    ('pageAvailable', ctypes.c_ulonglong), ('virtualTotal', ctypes.c_ulonglong),
                    ('virtualAvailable', ctypes.c_ulonglong), ('extended', ctypes.c_ulonglong)]
    status = Status()
    status.length = ctypes.sizeof(Status)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    return status.available/1e9


def pid_alive(pid):
    import ctypes
    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
    if not handle:
        return False
    code = ctypes.c_ulong()
    ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
    ctypes.windll.kernel32.CloseHandle(handle)
    return code.value == 259


def acquire_slot():
    """Head and body builders run in parallel. At most two Blender processes run
    at once, and a second starts only while enough memory is free."""
    import time
    slots = WORK/'.blender-slots'
    slots.mkdir(parents=True, exist_ok=True)
    while True:
        held = []
        for k in range(BLENDER_SLOTS):
            lock = slots/f'slot-{k}.lock'
            if lock.exists():
                try:
                    pid = int(lock.read_text().strip() or 0)
                except (OSError, ValueError):
                    pid = 0
                if pid and not pid_alive(pid):
                    lock.unlink(missing_ok=True)
                else:
                    held.append(k)
        if not held or free_memory_gb() >= MIN_FREE_GB:
            for k in range(BLENDER_SLOTS):
                if k in held:
                    continue
                try:
                    fd = os.open(slots/f'slot-{k}.lock', os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                except FileExistsError:
                    continue
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                return slots/f'slot-{k}.lock'
        time.sleep(3)


def run_blender(arguments, log):
    command = [str(blender_path()), '-b', *arguments]
    slot = acquire_slot()
    try:
        with open(log, 'w', encoding='utf-8', errors='replace') as handle:
            result = subprocess.run(command, stdout=handle, stderr=subprocess.STDOUT, cwd=ROOT)
    finally:
        slot.unlink(missing_ok=True)
    text = Path(log).read_text(encoding='utf-8', errors='replace')
    if result.returncode or 'Traceback' in text:
        tail = '\n'.join(text.splitlines()[-25:])
        sys.exit(f'Blender step failed; see {log}\n{tail}')


def work(name):
    return WORK/name


def cmd_blender(args):
    script = Path(args.script)
    if not script.is_absolute():
        script = ROOT/script
    log = WORK/f'{args.log or script.stem}.log'
    run_blender(['--factory-startup', '--python', str(script), '--', *args.rest], log)
    print(f'ok; log {log}')


def cmd_render(args):
    out = work(args.name)
    glb = out/'akinza.glb'
    if not glb.is_file():
        sys.exit(f'No akinza.glb in {out}')
    if not (out/'render').exists():
        run_blender(['--factory-startup', '--python', str(CONSTRUCTION/'render_shape_study.py'), '--',
                     '--mesh', str(glb), '--out', str(out/'render'), '--preserve-materials', '--studio-fill',
                     '--turntable'], WORK/f'{args.name}-render.log')
    if not (out/'render/torso.json').exists():
        run_blender(['--factory-startup', '--python', str(CONSTRUCTION/'torso_sections.py'), '--',
                     '--mesh', str(glb), '--out', str(out/'render/torso.json')], WORK/f'{args.name}-torso.log')
    for name in CAMERA_SETS:
        target = out/f'details-{name}'
        if target.exists():
            continue
        run_blender([str(out/'render/study.blend'), '--python', str(CONSTRUCTION/'render_details.py'), '--',
                     '--spec', str(CAMERAS/f'{name}.json'), '--out', str(target)],
                    WORK/f'{args.name}-details-{name}.log')
    print(f'rendered {out}')


def cmd_assemble(args):
    head, body = work(args.head), work(args.body)
    for path in [head/'shape.glb', body/'shape.glb', body/'fairing.json']:
        if not path.is_file():
            sys.exit(f'Missing {path}')
    out = work(args.out)
    if out.exists():
        sys.exit(f'{out} exists; use a new name')
    run_blender(['--factory-startup', '--python', str(CONSTRUCTION/'assemble_reconstructed_creature.py'), '--',
                 '--body', str(body/'shape.glb'), '--head', str(head/'shape.glb'),
                 '--tail-record', str(body/'fairing.json'), '--out', str(out), *PLACEMENT,
                 '--fragment-voxels', str(args.fragment_voxels)], WORK/f'{args.out}.log')
    cmd_render(argparse.Namespace(name=args.out))


def cmd_check(args):
    out = work(args.name)
    record = json.loads((out/'assembly.json').read_text())
    skin = next(v for k, v in record['objects'].items() if 'continuous' in k)
    subprocess.run([sys.executable, str(CONSTRUCTION/'review_shape_study.py'), str(out/'render'),
                    '--label', f'Akinza {args.name}', '--reference', str(EVIDENCE/'identity-run-0001.png')],
                   check=True, capture_output=True, cwd=ROOT)
    review = json.loads((out/'render/review.json').read_text())
    result = {'assembly': args.name, 'components': skin['components'],
              'nonManifoldEdges': skin['nonManifoldEdges'], 'vertices': skin['vertices'],
              'removedFragments': len(record.get('removedTinyHeadFragments', [])),
              'heightSpread': review.get('heightSpreadFraction'), 'groundSpread': review.get('groundSpreadFraction')}
    result['pass'] = (result['components'] == 1 and result['nonManifoldEdges'] == 0
                      and not result['heightSpread'] and not result['groundSpread'])
    print(json.dumps(result))
    return result


def flat(path):
    image = Image.open(path).convert('RGBA')
    ground = Image.new('RGBA', image.size, (255, 255, 255, 255))
    ground.alpha_composite(image)
    return ground.convert('RGB')


def labelled_grid(items, cols, size=420):
    rows = (len(items)+cols-1)//cols
    sheet = Image.new('RGB', (cols*size, rows*(size+22)), 'white')
    draw = ImageDraw.Draw(sheet)
    for k, (label, image) in enumerate(items):
        image = image.copy()
        image.thumbnail((size, size))
        x, y = (k % cols)*size, (k//cols)*(size+22)
        sheet.paste(image, (x+(size-image.width)//2, y+22))
        draw.text((x+6, y+4), label, fill=(20, 20, 20))
    return sheet


def six_views(render):
    boxes = [Image.open(render/f'{n}.png').getchannel('A').getbbox() for n in VIEWS]
    top, bottom = min(b[1] for b in boxes)-10, max(b[3] for b in boxes)+10
    half = max(b[2]-b[0] for b in boxes)//2+10
    cells = [flat(render/f'{n}.png').crop(((b[0]+b[2])//2-half, top, (b[0]+b[2])//2+half, bottom))
             for n, b in zip(VIEWS, boxes)]
    row = Image.new('RGB', (sum(c.width for c in cells), cells[0].height), 'white')
    x = 0
    for c in cells:
        row.paste(c, (x, 0))
        x += c.width
    return row


def width_profile(mask, span=None):
    """Widths per 2% row. span=(top, bottom) fixes the rows in pixels instead of the mask's bounding box."""
    rows = np.where(mask.any(axis=1))[0]
    top, bottom = span if span else (rows.min(), rows.max())
    height = bottom-top
    # Body centerline: midpoint of the widest row in the top fifth (the ear fan,
    # centered on the head). The topmost row is often one off-center tuft.
    band = range(max(top, rows.min()), int(top+.2*height))
    widest = max(band, key=lambda r: np.ptp(np.where(mask[r])[0]) if mask[r].any() else -1)
    cols = np.where(mask[widest])[0]
    cx = (cols.min()+cols.max())/2
    table = []
    for fraction in np.round(np.arange(0, 1.0001, .02), 2):
        row = mask[min(mask.shape[0]-1, int(top+fraction*height))]
        cols = np.where(row)[0]
        if not len(cols):
            table.append({'at': float(fraction), 'full': 0.0, 'central': 0.0})
            continue
        splits = np.where(np.diff(cols) > 2)[0]
        starts, ends = np.r_[cols[0], cols[splits+1]], np.r_[cols[splits], cols[-1]]
        central = next(((e-s) for s, e in zip(starts, ends) if s <= cx <= e), 0)
        table.append({'at': float(fraction), 'full': round(float(cols.max()-cols.min())/height, 4),
                      'central': round(float(central)/height, 4)})
    return table


def named(table):
    def window(low, high, key, pick):
        values = [r[key] for r in table if low <= r['at'] <= high and r[key] > 0]
        return round(pick(values), 4) if values else None
    return {'earSpan': window(0, .2, 'full', max), 'neck': window(.18, .30, 'central', min),
            'shoulders': window(.26, .34, 'central', max), 'waist': window(.36, .48, 'central', min),
            'hips': window(.46, .56, 'central', max)}


# Model rows are fixed in world space: the floor, and the loop-start figure's
# height (assembled-0156, floor -.957 to crown .9035). Normalizing by each
# render's own bounding box let a raised ear tip rescale every body reading.
FLOOR_Z = -.957
FIXED_HEIGHT = 1.8605


def model_span(render, view):
    geometry = json.loads((render/'geometry.json').read_text(encoding='utf-8'))
    camera = next(c for c in geometry['cameras'] if c['name'] == view)
    width, height = camera['resolution']
    per_unit = max(width, height)/camera['orthoScale']
    center_z = camera['matrixWorld'][2][3]
    row = lambda z: height/2-(z-center_z)*per_unit
    return round(row(FLOOR_Z+FIXED_HEIGHT)), round(row(FLOOR_Z))


def measurements(name):
    render = work(name)/'render'
    reference = np.array(Image.open(EVIDENCE/'identity-run-0001.png').convert('L')) < 200
    out = {'note': 'Widths are fractions of figure height; for the model that is a fixed world height (the loop-start figure, 1.8605 from the floor), so raising an ear tip does not rescale the body. The reference poses hands on hips, so its '
                   'central torso run can include arms at waist and hip rows.'}
    for view, (a, b) in REFERENCE_PANELS.items():
        ref = width_profile(reference[:, a:b])
        model = width_profile(np.array(Image.open(render/f'{view}.png').getchannel('A')) > 20, model_span(render, view))
        model_named = named(model)
        torso = render/'torso.json'
        if torso.exists():
            # Torso rows from mesh sections: an arm or tail showing through a gap
            # cannot merge into the torso reading (see torso_sections.py).
            key = 'width' if view == 'front' else 'depth'
            rows = [{'at': r['at'], 'central': r[key] or 0} for r in json.loads(torso.read_text())['rows']]
            sectioned = named([{**r, 'full': 0} for r in rows])
            for k in ('neck', 'shoulders', 'waist', 'hips'):
                model_named[k] = sectioned[k]
            model_named['source'] = 'earSpan from the silhouette; neck, shoulders, waist and hips from mesh sections'
        out[view] = {'reference': named(ref), 'model': model_named,
                     'ratio': {k: (round(model_named[k]/named(ref)[k], 3) if named(ref)[k] and model_named[k] else None)
                               for k in named(ref)},
                     'profile': [{'at': r['at'], 'referenceFull': r['full'], 'modelFull': m['full'],
                                  'referenceCentral': r['central'], 'modelCentral': m['central']}
                                 for r, m in zip(ref, model)]}
    return out


def cmd_measure(args):
    result = measurements(args.name)
    print(json.dumps({v: result[v]['ratio'] for v in REFERENCE_PANELS}, indent=1))


def cmd_packet(args):
    out = work(args.name)
    packet = Path(args.packet)
    packet.mkdir(parents=True, exist_ok=True)
    detail = lambda s, n: flat(out/f'details-{s}/{n}.png')
    sheets = {
        'm01.png': ('Reference: preferred first sheet, views front, front-left, left, back, right, front-right',
                    Image.open(EVIDENCE/'identity-run-0001.png').convert('RGB')),
        'm02.png': ('Model: six views in the same order, one shared scale', six_views(out/'render')),
        'm03.png': ('Model: eight elevated turntable views', labelled_grid(
            [(p.stem, flat(p)) for p in sorted((out/'render').glob('turn-*.png'))], 4, 360)),
        'm04.png': ('Model head: front, back, top, side', labelled_grid(
            [(n, detail('head', n)) for n in ['head-front', 'head-back', 'head-top', 'head-side']], 4)),
        'm05.png': ('Model face closeups', labelled_grid(
            [(n, detail('face', n)) for n in ['nose-front', 'nose-profile', 'nose-below', 'eyes-front',
                                              'head-three-quarter', 'head-rear-oblique']], 3)),
        'm06.png': ('Model neck, shoulders and trunk', labelled_grid(
            [(n, detail('neck', n)) for n in ['neck-front', 'neck-profile', 'neck-rear', 'shoulders-front']]
            + [('trunk-front', detail('regions', 'trunk-front'))], 3)),
        'm07.png': ('Model arms and forepaws', labelled_grid(
            [(n, detail('paws', n)) for n in ['forearm-front', 'forearm-profile', 'forepaw-front', 'forepaw-profile']], 4)),
        'm08.png': ('Model hind legs', labelled_grid(
            [(n, detail('paws', n)) for n in ['hindleg-front', 'hindleg-profile']]
            + [('shin-profile', detail('tail', 'shin-profile'))], 3)),
        'm09.png': ('Model hind paws', labelled_grid(
            [(n, detail('paws', n)) for n in ['hindpaw-front', 'hindpaw-profile', 'hindpaw-oblique', 'hindpaw-underside']], 4)),
        'm10.png': ('Model tails: root back, root oblique, root opposite, whole fan from behind', labelled_grid(
            [(n, detail('tail', n)) for n in ['tail-root-back', 'tail-root-oblique', 'tail-root-opposite', 'tail-fan-back']], 4)),
        'r01.png': ('Accepted reference: eyes and expression', Image.open(EVIDENCE/'face-study-0010.png').convert('RGB')),
        'r02.png': ('Accepted reference: animal paws', Image.open(EVIDENCE/'paws-study-0020.png').convert('RGB')),
        'r03.png': ('Accepted reference: tail shape, junction and positioning', Image.open(EVIDENCE/'back-study-0018.png').convert('RGB')),
        'r04.png': ('Supporting reference: rounded head and coat masses (its inward gaze is excluded)',
                    Image.open(EVIDENCE/'head-clay-study-0021.png').convert('RGB')),
    }
    index = {}
    for file, (description, image) in sheets.items():
        image = image.copy()
        image.thumbnail((2000, 2000))
        image.save(packet/file)
        index[file] = description
    (packet/'measurements.json').write_text(json.dumps(measurements(args.name), indent=1)+'\n')
    cmd_fit(argparse.Namespace(source=args.name, out=str(packet), baseline=None))
    (packet/'fit.png').replace(packet/'m11.png')
    index['m11.png'] = ('Silhouette fit: model against the reference figure in front, left and back, one frame; '
                        'grey is both, blue is model only, orange is reference only. The reference arms are on the hips.')
    index['fit.json'] = 'Silhouette overlap (IoU) per view and band (head, trunk, legs), with extra and missing area'
    evaluate_measured(packet, args.name)
    index['measured.json'] = 'Measured rubric criteria and invariant I09, computed from fit.json and measurements.json; copy, do not re-judge'
    index['measurements.json'] = 'Silhouette widths as fractions of figure height, model against reference'
    (packet/'index.json').write_text(json.dumps({'assembly': args.name, 'files': index}, indent=1)+'\n')
    print(f'packet {packet}')


def cmd_quick(args):
    head, body = work(args.head), work(args.body)
    out = Path(args.out) if Path(args.out).is_absolute() else WORK/args.out
    run_blender(['--factory-startup', '--python', str(CONSTRUCTION/'quick_silhouette.py'), '--',
                 '--head', str(head/'shape.glb'), '--body', str(body/'shape.glb'), '--out', str(out),
                 '--views', args.views], WORK/f'quick-{out.name}.log')
    return cmd_fit(argparse.Namespace(source=str(out), out=None, baseline=args.baseline))


# Silhouette fit: model masks against the reference figures, both mapped into
# one frame (floor at the bottom, figure height 1, centred on the ear fan).
# back-r03 compares the back view with the accepted back study, which governs the tails.
FIT_VIEWS = ['front', 'left', 'back', 'back-r03']
FIT_BANDS = {'head': (0, .24), 'trunk': (.24, .56), 'legs': (.56, 1.0)}
FIT_GRID = 500


def reference_figure(view):
    """Mask of one figure in the first sheet. Neighbouring figures touch, so the
    split column changes with height: ear fans are wide, tails reach sideways."""
    if view == 'back-r03':
        study = np.array(Image.open(EVIDENCE/'back-study-0018.png').convert('L')) < 200
        study[1400:] = False
        return study
    sheet = np.array(Image.open(EVIDENCE/'identity-run-0001.png').convert('L')) < 200
    mask = np.zeros_like(sheet)
    splits = {'front': [(0, 250, 0, 375), (250, None, 0, 418)],
              'left': [(0, None, 759, 1024)],
              'back': [(0, 250, 1040, 1520), (250, None, 1040, 1420)]}[view]
    for r0, r1, c0, c1 in splits:
        mask[r0:r1, c0:c1] = sheet[r0:r1, c0:c1]
    return mask


def fill_small_holes(mask, limit=.004):
    """Fill enclosed holes smaller than limit x figure area: the reference's pale
    eye whites and inner ears. Larger enclosed gaps (arm on hip) stay open."""
    from scipy import ndimage
    holes, count = ndimage.label(~mask)
    sizes = ndimage.sum(np.ones_like(mask), holes, range(1, count+1))
    border = set(np.unique(np.r_[holes[0], holes[-1], holes[:, 0], holes[:, -1]]))
    small = [k+1 for k, size in enumerate(sizes) if k+1 not in border and size < limit*mask.sum()]
    return mask | np.isin(holes, small)


def canonical(mask, span=None):
    mask = fill_small_holes(mask)
    rows = np.where(mask.any(axis=1))[0]
    top, bottom = span if span else (rows.min(), rows.max())
    height = bottom-top
    band = range(max(top, rows.min()), int(top+.2*height))
    widest = max(band, key=lambda r: np.ptp(np.where(mask[r])[0]) if mask[r].any() else -1)
    cols = np.where(mask[widest])[0]
    cx = (cols.min()+cols.max())/2
    v = top+np.arange(FIT_GRID)[:, None]/FIT_GRID*height+np.zeros((1, FIT_GRID))
    u = cx+(np.arange(FIT_GRID)[None, :]-FIT_GRID/2)/FIT_GRID*height+np.zeros((FIT_GRID, 1))
    inside = (v >= 0) & (v < mask.shape[0]) & (u >= 0) & (u < mask.shape[1])
    vi = np.clip(v.round().astype(int), 0, mask.shape[0]-1)
    ui = np.clip(u.round().astype(int), 0, mask.shape[1]-1)
    return mask[vi, ui] & inside


def fit_scores(model, ref):
    out = {}
    for band, (a, b) in {'all': (0, 1), **FIT_BANDS}.items():
        r0, r1 = int(a*FIT_GRID), int(b*FIT_GRID)
        m, r = model[r0:r1], ref[r0:r1]
        union, inter = (m | r).sum(), (m & r).sum()
        out[band] = {'iou': round(float(inter/union), 4) if union else None,
                     'extra': round(float((m & ~r).sum()/max(1, r.sum())), 4),
                     'missing': round(float((r & ~m).sum()/max(1, r.sum())), 4)}
    return out


def overlay(model, ref, label):
    image = np.full((FIT_GRID, FIT_GRID, 3), 255, np.uint8)
    image[model & ref] = (150, 150, 150)
    image[model & ~ref] = (60, 110, 230)
    image[ref & ~model] = (235, 120, 60)
    edge = ref & ~(np.roll(ref, 1, 0) & np.roll(ref, -1, 0) & np.roll(ref, 1, 1) & np.roll(ref, -1, 1))
    image[edge] = (170, 30, 30)
    for a, _ in FIT_BANDS.values():
        if a:
            image[int(a*FIT_GRID), ::6] = (0, 0, 0)
    picture = Image.fromarray(image)
    ImageDraw.Draw(picture).text((6, 4), label, fill=(0, 0, 0))
    return picture


def cmd_fit(args):
    source = Path(args.source)
    render = source if source.is_absolute() else work(args.source)
    if (render/'render/geometry.json').exists():
        render = render/'render'
    result, pictures = {'source': str(render), 'views': {}}, []
    for view in FIT_VIEWS:
        path = render/f"{view.split('-r03')[0]}.png"
        if not path.exists():
            continue
        model = canonical(np.array(Image.open(path).getchannel('A')) > 20, model_span(render, path.stem))
        ref = canonical(reference_figure(view))
        result['views'][view] = fit_scores(model, ref)
        pictures.append(overlay(model, ref, view))
    bands = ['all', *FIT_BANDS]
    result['mean'] = {b: round(float(np.mean([v[b]['iou'] for v in result['views'].values()])), 4) for b in bands}
    if getattr(args, 'baseline', None):
        base = Path(args.baseline)
        base = json.loads((base if base.suffix == '.json' else base/'fit.json').read_text())
        result['changeFromBaseline'] = {b: round(result['mean'][b]-base['mean'][b], 4) for b in bands}
    out = Path(args.out) if args.out else (render.parent if render.name == 'render' else render)
    out.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (FIT_GRID*len(pictures), FIT_GRID), 'white')
    for k, picture in enumerate(pictures):
        sheet.paste(picture, (k*FIT_GRID, 0))
    sheet.save(out/'fit.png')
    (out/'fit.json').write_text(json.dumps(result, indent=1)+'\n')
    print(json.dumps({'mean': result['mean'], **({'changeFromBaseline': result['changeFromBaseline']}
                                                 if 'changeFromBaseline' in result else {}),
                      'overlay': str(out/'fit.png')}))
    return result


# Which packet images show which regions. A region whose images all match the
# baseline packet keeps its score without being judged again.
REGION_IMAGES = {'R01': ['m04'], 'R02': ['m05'], 'R03': ['m04'], 'R04': ['m04', 'm05'], 'R05': ['m06'],
                 'R06': ['m06'], 'R07': ['m07'], 'R08': ['m08'], 'R09': ['m09'], 'R10': ['m10'], 'R11': ['m10'],
                 'R12': ['m02', 'm03']}


def image_change(a, b):
    x = np.asarray(Image.open(a).convert('L'), np.int16)
    y = np.asarray(Image.open(b).convert('L'), np.int16)
    if x.shape != y.shape:
        return 1.0
    return float((np.abs(x-y) > 12).mean())


def cmd_diff(args):
    base, cand = Path(args.baseline), Path(args.candidate)
    images = {f'm{k:02d}': round(image_change(base/f'm{k:02d}.png', cand/f'm{k:02d}.png'), 5) for k in range(2, 11)}
    changed = {m for m, v in images.items() if v > .0005}
    regions = {r: any(m in changed for m in ms) for r, ms in REGION_IMAGES.items()}
    result = {'baseline': str(base), 'candidate': str(cand), 'changedPixelFraction': images,
              'changedRegions': sorted(r for r, c in regions.items() if c),
              'unchangedRegions': sorted(r for r, c in regions.items() if not c)}
    (cand/'diff.json').write_text(json.dumps(result, indent=1)+'\n')
    print(json.dumps(result))
    return result


RUBRIC = DOCS/'loop/rubric.json'


def evaluate_measured(packet, assembly):
    """Measured rubric criteria, computed from the packet's fit.json and
    measurements.json. The critic copies these results; it never re-judges them."""
    rubric = json.loads(RUBRIC.read_text(encoding='utf-8'))
    fit = json.loads((packet/'fit.json').read_text())
    measure = json.loads((packet/'measurements.json').read_text())
    results = {}
    for region, criteria in rubric['regions'].items():
        for c in criteria:
            if c['kind'] != 'measured':
                continue
            if c['source'] == 'fit':
                value = fit['views'][c['view']][c['band']][c['metric']]
            else:
                value = measure[c['view']]['ratio'][c['key']]
            ok = value is not None and c.get('min', -1e9) <= value <= c.get('max', 1e9)
            results[c['id']] = {'region': region, 'value': value, 'min': c.get('min'), 'max': c.get('max'),
                                'result': 'pass' if ok else 'fail'}
    bounds = json.loads((work(assembly)/'render/geometry.json').read_text())['bounds']
    height = bounds[1][2]-bounds[0][2]
    results['I09'] = {'region': 'R01', 'value': round(height, 4), 'expected': FIXED_HEIGHT,
                      'result': 'pass' if abs(height/FIXED_HEIGHT-1) <= .01 else 'fail'}
    (packet/'measured.json').write_text(json.dumps(results, indent=1)+'\n')
    return results


def cmd_measured(args):
    packet = Path(args.packet)
    assembly = json.loads((packet/'index.json').read_text())['assembly']
    print(json.dumps(evaluate_measured(packet, assembly)))


def cmd_next_number(args):
    numbers = [int(m.group(1)) for p in WORK.iterdir() if (m := re.match(r'^[a-z-]+-(\d{4})', p.name))]
    print(f'{max(numbers)+1:04d}')


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('assemble'); p.add_argument('head'); p.add_argument('body'); p.add_argument('out')
    p.add_argument('--fragment-voxels', type=float, default=5); p.set_defaults(func=cmd_assemble)
    p = sub.add_parser('render'); p.add_argument('name'); p.set_defaults(func=cmd_render)
    p = sub.add_parser('check'); p.add_argument('name'); p.set_defaults(func=cmd_check)
    p = sub.add_parser('packet'); p.add_argument('name'); p.add_argument('packet'); p.set_defaults(func=cmd_packet)
    p = sub.add_parser('measure'); p.add_argument('name'); p.set_defaults(func=cmd_measure)
    p = sub.add_parser('blender'); p.add_argument('script'); p.add_argument('--log')
    p.add_argument('rest', nargs=argparse.REMAINDER); p.set_defaults(func=cmd_blender)
    p = sub.add_parser('next-number'); p.set_defaults(func=cmd_next_number)
    p = sub.add_parser('quick'); p.add_argument('head'); p.add_argument('body'); p.add_argument('out')
    p.add_argument('--views', default='front,left,back'); p.add_argument('--baseline')
    p.set_defaults(func=cmd_quick)
    p = sub.add_parser('fit'); p.add_argument('source'); p.add_argument('--out'); p.add_argument('--baseline')
    p.set_defaults(func=cmd_fit)
    p = sub.add_parser('diff'); p.add_argument('baseline'); p.add_argument('candidate'); p.set_defaults(func=cmd_diff)
    p = sub.add_parser('measured'); p.add_argument('packet'); p.set_defaults(func=cmd_measured)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
