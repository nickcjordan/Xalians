"""Hypnopet whole body from the reconstruction (experiment X30, whole-body test).

    python art/studio/blockout/hypnopet/body_recon.py --head <chosen head spec.json> --grid <grid-body.npz> --out <spec.json>

The blockout as "reconstruct, add the authored rigid pieces, clean up by region" instead of "build from blocks":
- the body, legs, tail and ears are the reconstruction's left half as one grid part (mirrored, so the body is
  symmetric), with the flat ground plate cut off at the floor (mesh_to_grid --floor), its own horn cut away, and
  its face cut away where the finer head grid takes over;
- the head is the chosen head option (Nick picked B-a5jr, 2026-10-14): its finer grid, crown dome, eye sockets,
  and the separate glossy eyes;
- the horn is v5's authored horn (a rigid piece).
Everything that was v5's torso, legs, tail, ears and neck is gone.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

BODY_CLIP = {'center': [0, 0, 0.33], 'radii': [0.31, 0.36, 0.42], 'blend': 0.0}
# the head grid's clip is center (0, -0.155, 0.41), radii (0.098, 0.135, 0.11); the body's face cut sits inside it
# so the two overlap and blend rather than leave a gap
# (round 2: the face cut stops below the crown so the body grid keeps the reconstruction's own crown, and the
# head's crown dome is dropped; the horn cut takes only the reconstruction's horn above the crown)
FACE_CUT = {'center': [0, -0.17, 0.4], 'radii': [0.085, 0.11, 0.085], 'blend': 0.015}
HORN_CUT = {'center': [0, -0.175, 0.62], 'radii': [0.055, 0.06, 0.1], 'blend': 0.015}


def build(head_spec, grid_path):
    from make_spec import V5, spec as v5_spec
    sha = hashlib.sha256(Path(grid_path).read_bytes()).hexdigest()
    body = {'part': 'body', 'kind': 'grid', 'mirror': 'x', 'blend': 0.03,
            'params': {'file': str(Path(grid_path).resolve()), 'sha256': sha, 'clip': BODY_CLIP,
                       'cuts': [FACE_CUT, HORN_CUT]}}
    head = [p for p in head_spec['parts'] if p['part'] in ('head', 'eyes')
            and not (p['kind'] == 'sweep' and p.get('op', 'add') == 'add')       # v5's neck sweep: the body has a neck
            and not (p['kind'] == 'mass' and p.get('op', 'add') == 'add' and not p.get('separate'))]  # crown dome
    horn = [p for p in v5_spec({**V5, 'version': 'body-recon'})['parts'] if p['part'] == 'horn']
    adds = [p for p in head if p.get('op', 'add') == 'add' and not p.get('separate')]
    rest = [p for p in head if p not in adds]
    s = {**head_spec, 'version': 'body-recon', 'parts': [body]+adds+horn+rest}
    s['note'] = ('Hypnopet whole body from the reconstruction (experiment X30), written by body_recon.py: the '
                 'reconstruction as one mirrored grid part (face and its own horn cut away), the chosen head, '
                 "v5's authored horn.")
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--head', type=Path, required=True)
    ap.add_argument('--grid', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(build(json.loads(a.head.read_text()), a.grid), indent=1), encoding='utf-8')
    print('wrote', a.out)
