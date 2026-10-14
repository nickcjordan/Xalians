"""Search the face numbers against the sheet (face_fit.score) before any render: experiment X27, fit before options.

    python art/studio/blockout/hypnopet/face_search.py --start D --out <dir> [--sweeps 12] [--workers 20]

Greedy coordinate search over the head's masses (skull, brow, cheeks, snout, nose, lips, jaw) and the eye
placement. Each sweep tries every parameter one step up and one step down in parallel, keeps the best move,
then tries the best few moves together; steps halve when no move helps. Writes <dir>/best.json (the direction
numbers), <dir>/best-spec.json and <dir>/log.jsonl (every evaluation). The eye size is held: options vary it
afterwards around the fitted face.
"""
import argparse
import copy
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
for _v in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ.setdefault(_v, '1')            # one thread per worker: the workers are the parallelism
sys.path.insert(0, str(HERE))

# (key, index or None, step in meters or degrees); extra_adds[0] is the brow mass ((center, radii, blend))
PARAMS = [('cranium_c', 1, .003), ('cranium_c', 2, .003), ('cranium_r', 0, .003), ('cranium_r', 1, .003),
          ('cranium_r', 2, .003),
          ('brow_c', 1, .003), ('brow_c', 2, .003), ('brow_r', 0, .003), ('brow_r', 1, .003), ('brow_r', 2, .003),
          ('cheek_c', 0, .003), ('cheek_c', 1, .003), ('cheek_c', 2, .003), ('cheek_r', 0, .003),
          ('cheek_r', 1, .003), ('cheek_r', 2, .003),
          ('muzzle_c', 1, .003), ('muzzle_c', 2, .003), ('muzzle_r', 0, .003), ('muzzle_r', 1, .003),
          ('muzzle_r', 2, .003),
          ('nose_c', 1, .003), ('nose_c', 2, .003),
          ('lip_c', 0, .002), ('lip_c', 1, .003), ('lip_c', 2, .003), ('lip_r', 0, .002), ('lip_r', 2, .002),
          ('jaw_c', 1, .003), ('jaw_c', 2, .003), ('jaw_r', 0, .003), ('jaw_r', 1, .003), ('jaw_r', 2, .003),
          ('eye_c', 0, .002), ('eye_c', 2, .003), ('eye_yaw', None, 3.0)]


def get(d, key, i):
    if key in ('brow_c', 'brow_r'):
        return d['extra_adds'][0][0 if key == 'brow_c' else 1][i]
    return d[key] if i is None else d[key][i]


def put(d, key, i, v):
    d = copy.deepcopy(d)
    if key in ('brow_c', 'brow_r'):
        c, r, b = d['extra_adds'][0]
        c, r = list(c), list(r)
        (c if key == 'brow_c' else r)[i] = round(v, 4)
        d['extra_adds'] = [(c, r, b)]+list(d['extra_adds'][1:])
    elif i is None:
        d[key] = round(v, 4)
    else:
        d[key] = list(d[key])
        d[key][i] = round(v, 4)
    return d


def evaluate(d):
    import face_fit as ff
    import face_previews as fp
    ff.SHEET_CURVES = ff.SHEET_CURVES or ff.sheet_curves()
    ff.STEP = 0.0015                          # coarser grid for the search; the final report runs at 1 mm
    fp.DIRECTIONS['S'] = d
    try:
        spec = fp.build('S', verbose=False)
        m = ff.measure(spec)
    except SystemExit as e:
        return float('inf'), {'error': str(e)}
    if any(r <= 0 for k in ('cranium_r', 'cheek_r', 'muzzle_r', 'lip_r', 'jaw_r') for r in d[k]):
        return float('inf'), {'error': 'nonpositive radius'}
    return float(ff.score(m, ff.SHEET_CURVES)), m


def main():
    import face_previews as fp
    ap = argparse.ArgumentParser()
    ap.add_argument('--start', default='D')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--sweeps', type=int, default=12)
    ap.add_argument('--workers', type=int, default=20)
    ap.add_argument('--resume', action='store_true', help='start from <out>/best.json')
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    log = (args.out/'log.jsonl').open('a', encoding='utf-8', buffering=1)
    if args.resume:
        best = json.loads((args.out/'best.json').read_text(encoding='utf-8'))['direction']
        best['extra_adds'] = [tuple(a) for a in best['extra_adds']]
    else:
        best = copy.deepcopy(fp.DIRECTIONS[args.start])
        best['note'] = f'searched from {args.start} against the sheet by face_search.py'
    scale = 1.0
    with ProcessPoolExecutor(args.workers) as pool:
        best_score, best_m = pool.submit(evaluate, best).result()
        print(f'start {best_score:.3f}', flush=True)
        for sweep in range(args.sweeps):
            moves = []
            for key, i, step in PARAMS:
                for sgn in (1, -1):
                    moves.append(((key, i, sgn*step*scale), put(best, key, i, get(best, key, i)+sgn*step*scale)))
            results = list(pool.map(evaluate, [d for _, d in moves]))
            ranked = sorted(((s, n) for n, (s, _) in enumerate(results)), key=lambda t: t[0])
            for (mv, _), (s, m) in zip(moves, results):
                log.write(json.dumps({'sweep': sweep, 'move': mv, 'score': s}) + '\n')
            good = [n for s, n in ranked if s < best_score]
            if not good:
                scale /= 2
                print(f'sweep {sweep}: no move helps; step x{scale}', flush=True)
                if scale < 0.2:
                    break
                continue
            # the best few moves together (one per parameter)
            combo, seen = best, set()
            for n in good[:6]:
                key, i, delta = moves[n][0]
                if (key, i) not in seen:
                    seen.add((key, i))
                    combo = put(combo, key, i, get(combo, key, i)+delta)
            cs, cm = evaluate(combo)
            s0, n0 = ranked[0]
            if cs < s0:
                best, best_score, best_m = combo, cs, cm
                print(f'sweep {sweep}: {len(seen)} moves together -> {cs:.3f}', flush=True)
            else:
                best, best_score, best_m = moves[n0][1], s0, results[n0][1]
                print(f'sweep {sweep}: {moves[n0][0]} -> {s0:.3f}', flush=True)
            (args.out/'best.json').write_text(json.dumps({'score': best_score, 'direction': best,
                                                           'measures': best_m}, indent=1), encoding='utf-8')
    fp.DIRECTIONS['S'] = best
    (args.out/'best-spec.json').write_text(json.dumps(fp.build('S', verbose=False), indent=1), encoding='utf-8')
    print('best', best_score)


if __name__ == '__main__':
    main()
