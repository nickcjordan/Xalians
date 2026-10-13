"""Generate a standard cameras file (like cameras/akinza.json) from a blockout's bounds.

    python art/studio/cameras_auto.py --build <blockout dir> --out <cameras.json> [--close tail --close head ...]

Whole figure: front, threequarter-left, threequarter-right, side-left, side-right, back, top, below, all
orthographic, all at one scale so the figure never rescales between builds of the same creature (pass
--freeze-from <cameras.json> to reuse the frame of an earlier file when the creature has grown). For every
--close <part key> it adds close views (front, threequarter-left, side-left, top, back) framed on that part's
vertices, using part_id from blockout.npz. The convention is the one of cameras/akinza.json: the creature
faces -y, its left is +x, up is +z; 'left' and 'right' in an id mean the creature's own side.

The render settings and the light rig are the Akinza ones, scaled with the figure so a new creature is lit
the same way as every other.
"""
import argparse
import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REFERENCE = HERE/'cameras/akinza.json'
REFERENCE_SIZE = 1.86          # the Akinza figure height the reference light rig was set for
WHOLE = [('front', [0, -6, 0]), ('threequarter-left', [4.2, -4.2, 1.2]), ('threequarter-right', [-4.2, -4.2, 1.2]),
         ('side-left', [6, 0, 0]), ('side-right', [-6, 0, 0]), ('back', [0, 6, 0]),
         ('top', [0, -0.001, 6]), ('below', [0, -0.001, -6])]
CLOSE = [('front', [0, -6, 0]), ('threequarter-left', [4.2, -4.2, 1.2]), ('side-left', [6, 0, 0]),
         ('top', [0, -0.001, 6]), ('back', [0, 6, 0])]


def view_extent(points, direction):
    """Width and height of `points` seen orthographically from `direction` with world +z up."""
    f = np.asarray(direction, float)
    f /= np.linalg.norm(f)
    r = np.cross([0, 0, 1.0], f)
    if np.linalg.norm(r) < 1e-6:
        r = np.array([1.0, 0, 0])
    r /= np.linalg.norm(r)
    up = np.cross(f, r)
    a, b = points@r, points@up
    return (a.min()+a.max())/2, (b.min()+b.max())/2, a.max()-a.min(), b.max()-b.min(), r, up


def build(blockout, close=(), resolution=800, freeze_from=None):
    ref = json.loads(REFERENCE.read_text(encoding='utf-8'))
    data = np.load(Path(blockout)/'blockout.npz')
    verts, pid, keys = data['vertices'].astype(float), data['part_id'], [str(k) for k in data['partKeys']]
    lo, hi = verts.min(axis=0), verts.max(axis=0)
    center = (lo+hi)/2
    size = hi-lo
    diag = float(np.linalg.norm(size))
    scale = round(float(max(size))*1.18, 4)
    top_scale = round(float(max(size[0], size[1]))*1.18, 4)
    if freeze_from:
        old = json.loads(Path(freeze_from).read_text(encoding='utf-8'))
        fig = [c for c in old['cameras'] if c['group'] == 'figure']
        center = np.asarray(fig[0]['target'], float)
        scale = fig[0]['orthoScale']
        top_scale = next(c['orthoScale'] for c in fig if c['id'] == 'top')
    cameras = []
    for cid, off in WHOLE:
        off = np.asarray(off, float)/np.linalg.norm(off)*diag*3
        cameras.append({'id': cid, 'group': 'figure', 'target': [round(float(x), 4) for x in center],
                        'offset': [round(float(x), 4) for x in off],
                        'orthoScale': top_scale if cid in ('top', 'below') else scale})
    for part in close:
        if part not in keys:
            raise SystemExit(f'--close {part}: no such part (parts: {", ".join(keys)})')
        pts = verts[pid == keys.index(part)]
        for cid, off in CLOSE:
            direction = np.asarray(off, float)
            ca, cb, w, h, r, up = view_extent(pts, direction)
            mid = (pts.min(axis=0)+pts.max(axis=0))/2
            # target: the part's center of extent, so the view is framed on it
            target = mid
            ortho = round(float(max(w, h)*1.35+0.05*diag), 4)
            cameras.append({'id': f'{part}-{cid}', 'group': f'close:{part}', 'target': [round(float(x), 4) for x in target],
                            'offset': [round(float(x), 4) for x in direction/np.linalg.norm(direction)*diag*3], 'orthoScale': ortho})
    k = float(max(size))/REFERENCE_SIZE
    rig = json.loads(json.dumps(ref['lightRig']))
    rig['aim'] = [round(float(x), 4) for x in center]
    rig['note'] = 'Reference Akinza rig scaled with the figure: offsets and size by k, power by k squared, k = tallest extent / 1.86.'
    for lamp in rig['lamps']:
        lamp['offset'] = [round(v*k, 3) for v in lamp['offset']]
        lamp['size'] = round(lamp['size']*k, 3)
        lamp['power'] = round(lamp['power']*k*k, 1)
    record = {}
    rp = Path(blockout)/'record.json'
    if rp.is_file():
        record = json.loads(rp.read_text(encoding='utf-8'))
    return {
        'species': record.get('creature') or 'blockout',
        'convention': ref['convention'],
        'resolution': resolution,
        'figureFrame': f'Generated from the blockout bounds {lo.round(4).tolist()} to {hi.round(4).tolist()}: one scale ({scale}) for every whole-figure view.',
        'render': ref['render'],
        'lightRig': rig,
        'cameras': cameras,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--build', required=True, help='a blockout output directory (needs blockout.npz)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--close', action='append', default=[])
    ap.add_argument('--resolution', type=int, default=800)
    ap.add_argument('--freeze-from')
    args = ap.parse_args()
    spec = build(args.build, args.close, args.resolution, args.freeze_from)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(spec, indent=2), encoding='utf-8')
    print(f"wrote {args.out}: {len(spec['cameras'])} cameras")


if __name__ == '__main__':
    main()
