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


def run_blender(arguments, log):
    command = [str(blender_path()), '-b', *arguments]
    with open(log, 'w', encoding='utf-8', errors='replace') as handle:
        result = subprocess.run(command, stdout=handle, stderr=subprocess.STDOUT, cwd=ROOT)
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
        out[view] = {'reference': named(ref), 'model': named(model),
                     'ratio': {k: (round(named(model)[k]/named(ref)[k], 3) if named(ref)[k] and named(model)[k] else None)
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
    index['measurements.json'] = 'Silhouette widths as fractions of figure height, model against reference'
    (packet/'index.json').write_text(json.dumps({'assembly': args.name, 'files': index}, indent=1)+'\n')
    print(f'packet {packet}')


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
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
