"""Hypnopet hind legs fitted in 3D to the reconstruction (experiment X30, the reference role).

    python art/studio/blockout/hypnopet/hind_fit.py refs --glb <shape.glb> --out <ref.npz>      (shape-env python)
    python art/studio/blockout/hypnopet/hind_fit.py search --ref <ref.npz> --out <dir> [--sweeps 10]
    python art/studio/blockout/hypnopet/hind_fit.py spec --params <dir>/best.json --out <spec.json>

The hind legs stay authored (they bend, so a rig needs their structure), but their shape is fitted to the 3D
reference instead of to 2D drawings. The new structure follows the sheet's leg (bare side view): a haunch, one
sweep from the hip down and back to the hock and on to the heel, a long foot pad on the ground, and three toes
at its front (v5 had a flat foot with no heel or toe, defect D-fm64). Everything but the hind legs is v5.
The search is greedy coordinate descent on the two-way 3D distance (fit3d.py) inside the left hind leg's box.
"""
import argparse
import copy
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]))
sys.path.insert(0, str(HERE.parents[1]/'recon'))
for _v in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ.setdefault(_v, '1')

BOX = [0.02, 0.02, 0.006, 0.2, 0.3, 0.3]

START = {
    'haunch_c': [0.075, 0.15, 0.18], 'haunch_r': [0.055, 0.08, 0.09],
    'leg': [[0.08, 0.16, 0.16, 0.045], [0.092, 0.212, 0.095, 0.03], [0.098, 0.196, 0.035, 0.026]],
    'foot_c': [0.1, 0.12, 0.025], 'foot_r': [0.032, 0.08, 0.024], 'foot_pitch': 0.0,
    'toe_y': 0.045, 'toe_z': 0.018, 'toe_x': [0.082, 0.1, 0.118], 'toe_r': 0.017,
}

# (key, index path, step)
PARAMS = ([('haunch_c', (i,), .004) for i in range(3)]+[('haunch_r', (i,), .004) for i in range(3)]
          + [('leg', (j, i), .004) for j in range(3) for i in range(4)]
          + [('foot_c', (i,), .004) for i in range(3)]+[('foot_r', (i,), .004) for i in range(3)]
          + [('foot_pitch', (), 3.0), ('toe_y', (), .004), ('toe_z', (), .003), ('toe_r', (), .002)]
          + [('toe_x', (i,), .003) for i in range(3)])


def get(d, key, path):
    v = d[key]
    for i in path:
        v = v[i]
    return v


def put(d, key, path, value):
    d = copy.deepcopy(d)
    if not path:
        d[key] = round(value, 4)
        return d
    ref = d[key]
    for i in path[:-1]:
        ref = ref[i]
    ref[path[-1]] = round(value, 4)
    return d


def hind_parts(h):
    m = lambda c, r, b, rot=(0, 0, 0): {'part': 'hindlegs', 'kind': 'mass', 'mirror': 'x', 'blend': b,  # noqa: E731
                                         'params': {'center': c, 'radii': r, 'exponent': 2.0, 'rotation': list(rot)}}
    out = [m(h['haunch_c'], h['haunch_r'], 0.04),
           {'part': 'hindlegs', 'kind': 'sweep', 'mirror': 'x', 'blend': 0.03,
            'params': {'up': [0, 0, 1], 'points': [{'p': p[:3], 'r': p[3]} for p in h['leg']]}},
           m(h['foot_c'], h['foot_r'], 0.025, (h['foot_pitch'], 0, 0))]
    for x in h['toe_x']:
        out.append(m([x, h['toe_y'], h['toe_z']], [h['toe_r']]*3, 0.008))
    return out


def build(h):
    from make_spec import V5, spec as v5_spec
    base = v5_spec({**V5, 'version': 'hind-fit'})
    keep = [p for p in base['parts'] if p['part'] != 'hindlegs']
    i = next(n for n, p in enumerate(keep) if p['part'] == 'forelegs')
    s = {**base, 'parts': keep[:i]+hind_parts(h)+keep[i:]}
    s['note'] = ('Hypnopet v5 with the hind legs rebuilt (haunch, hip-hock-heel sweep, foot pad, three toes) and fitted '
                 'in 3D to the reconstruction (experiment X30), written by hind_fit.py.')
    return s


_REF = None


def evaluate(h, ref_path):
    global _REF
    import numpy as np
    from scipy.spatial import cKDTree
    import fit3d
    if _REF is None:
        pts = np.load(ref_path)['points']
        _REF = (pts, cKDTree(pts))
    if any(r <= 0.004 for r in [*h['haunch_r'], *h['foot_r'], h['toe_r'], *[p[3] for p in h['leg']]]):
        return float('inf'), {}
    try:
        m = fit3d.fit(build(h), _REF[0], BOX, ref_tree=_REF[1])
    except Exception as e:                       # noqa: BLE001
        return float('inf'), {'error': str(e)}
    return m['score'], m


def search(args):
    args.out.mkdir(parents=True, exist_ok=True)
    log = (args.out/'log.jsonl').open('a', encoding='utf-8', buffering=1)
    best = json.loads((args.out/'best.json').read_text())['params'] if args.resume else copy.deepcopy(START)
    scale = 1.0
    with ProcessPoolExecutor(args.workers) as pool:
        best_score, best_m = pool.submit(evaluate, best, str(args.ref)).result()
        print(f'start {best_score:.5f} {json.dumps(best_m)}', flush=True)
        for sweep in range(args.sweeps):
            moves = []
            for key, path, step in PARAMS:
                for sgn in (1, -1):
                    moves.append(((key, path, sgn*step*scale), put(best, key, path, get(best, key, path)+sgn*step*scale)))
            results = list(pool.map(evaluate, [d for _, d in moves], [str(args.ref)]*len(moves)))
            for (mv, _), (s, _) in zip(moves, results):
                log.write(json.dumps({'sweep': sweep, 'move': [mv[0], list(mv[1]), mv[2]], 'score': s})+'\n')
            ranked = sorted(((s, n) for n, (s, _) in enumerate(results)))
            good = [n for s, n in ranked if s < best_score]
            if not good:
                scale /= 2
                print(f'sweep {sweep}: no move helps; step x{scale}', flush=True)
                if scale < 0.2:
                    break
                continue
            combo, seen = best, set()
            for n in good[:8]:
                key, path, delta = moves[n][0]
                if (key, path) not in seen:
                    seen.add((key, path))
                    combo = put(combo, key, path, get(combo, key, path)+delta)
            cs, cm = evaluate(combo, str(args.ref))
            s0, n0 = ranked[0]
            if cs < s0:
                best, best_score, best_m = combo, cs, cm
            else:
                best, best_score, best_m = moves[n0][1], s0, results[n0][1]
            print(f'sweep {sweep}: {best_score:.5f} {json.dumps(best_m)}', flush=True)
            (args.out/'best.json').write_text(json.dumps({'score': best_score, 'params': best, 'fit': best_m}, indent=1))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    r = sub.add_parser('refs')
    r.add_argument('--glb', type=Path, required=True)
    r.add_argument('--out', type=Path, required=True)
    s = sub.add_parser('search')
    s.add_argument('--ref', type=Path, required=True)
    s.add_argument('--out', type=Path, required=True)
    s.add_argument('--sweeps', type=int, default=10)
    s.add_argument('--workers', type=int, default=20)
    s.add_argument('--resume', action='store_true')
    p = sub.add_parser('spec')
    p.add_argument('--params', type=Path)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--start', action='store_true', help='write the starting structure, not a searched one')
    a = ap.parse_args()
    if a.cmd == 'refs':
        import numpy as np
        import fit3d
        pts = fit3d.reference_points(a.glb, BOX)
        np.savez_compressed(a.out, points=pts, box=np.array(BOX))
        print(len(pts), 'reference points')
    elif a.cmd == 'search':
        search(a)
    else:
        h = START if a.start else json.loads(a.params.read_text())['params']
        a.out.parent.mkdir(parents=True, exist_ok=True)
        a.out.write_text(json.dumps(build(h), indent=1), encoding='utf-8')
        print('wrote', a.out)


if __name__ == '__main__':
    main()
