"""Hypnopet head from a reconstruction (experiment X29): v5 with the head part replaced by a reconstructed volume.

    python art/studio/blockout/hypnopet/face_recon.py <variant> --grid <grid.npz> [--out <spec.json>]

The head part is the reconstruction's signed distance grid (art/studio/recon/mesh_to_grid.py, part kind "grid")
clipped by an ellipsoid around the skull and face (the reconstruction's own ears, horn and body are cut away;
v5's ears, horn and body stay), plus v5's neck sweep to join it to the body. Its eyes were smooth closed mounds,
so each eye is carved and seated with the same tools as the authored faces (face_previews.py): a socket carved
concentric with the ball, the ball slid along its gaze until a set share of it shows, and a lid ring laid where
the ball leaves the skin. The eyeballs are separate glossy eye objects. Variants change only the eyes.

Landmarks come from the reconstruction aligned to the bare front sheet (log CP2): eye mounds at x = +-0.052,
z = 0.436, head width about 0.178 at eye height. The balls sit a little inward of the mounds (x 0.038 to 0.040)
so the visible openings land on the sheet's spacing; they face straight ahead and are sunk (52 to 56 degrees
showing) so they do not bulge past the head's side in the three-quarter view.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]))
import parts  # noqa: E402
from face_previews import eye_axis, eye_shading, lid_ring, mass, near_face, seat_eye, surface_y  # noqa: E402
from make_spec import V5, spec as v5_spec  # noqa: E402

CLIP = {'center': [0, -0.155, 0.41], 'radii': [0.098, 0.135, 0.11], 'blend': 0.02}
# The reconstruction's own horn is fused into its crown; the clip stops below it (top 0.53) and this dome
# rounds the crown back under v5's horn, so no flat cut or horn stub shows.
CROWN = {'center': [0, -0.15, 0.452], 'radii': [0.07, 0.08, 0.06], 'blend': 0.045}

VARIANTS = {
    # eye_x, eye_z: the eye center in the front view; eye_r: ball radius; open: the share of the ball that shows
    # (mean opening half-angle, degrees); yaw: gaze outward from straight ahead. Optional nose and lip
    # corrective masses ([center, radii, blend]) exist but were rejected in CP2 (they read as shelves); unused.
    'R1': {'note': 'R1: reconstructed head, eyes at its eye mounds, the bare sheet eye size.',
           'eye_x': 0.040, 'eye_z': 0.436, 'eye_r': 0.040, 'open': 56, 'yaw': 0, 'pitch': 2},
    'R2': {'note': 'R2: reconstructed head, eyes between the bare and the painted sheet.',
           'eye_x': 0.039, 'eye_z': 0.436, 'eye_r': 0.044, 'open': 54, 'yaw': 0, 'pitch': 2},
    'R3': {'note': 'R3: reconstructed head, the painted sheet larger, closer eyes.',
           'eye_x': 0.038, 'eye_z': 0.436, 'eye_r': 0.048, 'open': 52, 'yaw': 0, 'pitch': 2},
}


def build(name, grid_path, verbose=True, overrides=None):
    d = {**VARIANTS[name], **(overrides or {})}
    base = v5_spec({**V5, 'version': 'face-recon-'+name})
    keep = [p for p in base['parts'] if p['part'] not in ('head', 'muzzle', 'eyes')]
    sha = hashlib.sha256(Path(grid_path).read_bytes()).hexdigest()
    head = [{'part': 'head', 'kind': 'grid', 'blend': 0.02,
             'params': {'file': str(Path(grid_path).resolve()), 'sha256': sha, 'clip': CLIP}},
            {'part': 'head', 'kind': 'sweep', 'blend': 0.04, 'params': {'points': V5['neck']}},
            mass(CROWN['center'], CROWN['radii'], CROWN['blend'])]
    # optional small corrections on the reconstruction, as a sculptor adds clay: a nose pad and a lower lip
    for key in ('nose', 'lip'):
        if d.get(key):
            c_, r_, b_ = d[key]
            head.append(mass(c_, r_, b_, mirror='x' if c_[0] else None))
    field_adds = near_face(parts.instances({'parts': [p for p in keep if p.get('op', 'add') == 'add']+head}))
    re = d['eye_r']
    axis = eye_axis(d['yaw'], d['pitch'])
    y_front = surface_y(field_adds, d['eye_x'], d['eye_z'])
    c0 = np.array([d['eye_x'], y_front, d['eye_z']])-axis*re*0.5
    c, opened = seat_eye(field_adds, c0, re, axis, d['open'])
    ring = lid_ring(field_adds, c, re, axis, 0.0045, 0.003, drop_top=np.radians(3))
    carves = [mass(c, [re+0.0008]*3, 0.0025, op='carve', mirror='x')]
    lid = {'part': 'head', 'kind': 'sweep', 'op': 'add-after', 'mirror': 'x', 'blend': 0.009,
           'params': {'closed': True, 'samples': 8, 'points': ring}}
    ball = mass(c, [re]*3, 0.003, mirror='x')
    ball.update(part='eyes', separate=True, material='eye', name='eye-left', mirrorName='eye-right',
                gaze=[round(float(x), 5) for x in axis], shading=eye_shading(opened))
    if verbose:
        print(f'{name}: skin front at the eye {y_front:.4f}, eye center {np.round(c, 4).tolist()}, radius {re}, '
              f'opening half-angle {opened:.1f} deg')
    i = next(n for n, p in enumerate(keep) if p['part'] == 'horn')
    s = {**base, 'parts': keep[:i]+head+keep[i:]+carves+[lid, ball]}
    if d.get('voxel'):
        s['voxel'] = d['voxel']
    s['note'] = ('Hypnopet reconstructed head (experiment X29), written by face_recon.py: v5 with the head part '
                 'replaced by the clipped reconstruction grid and v5\'s neck, eyes carved and seated. '+d['note'])
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('variant', choices=sorted(VARIANTS))
    ap.add_argument('--grid', type=Path, required=True)
    ap.add_argument('--out', type=Path)
    args = ap.parse_args()
    out = args.out or HERE/f'face-recon-{args.variant}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(build(args.variant, args.grid), indent=1), encoding='utf-8')
    print('wrote', out)
