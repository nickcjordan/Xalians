"""Akinza eyelids fix pass 3: where the closed lid's fur parts (numpy and scipy, no Blender).

  python art/species-construction/anim/eyelids_partings.py <lids dir> <probe dir> [--state closed] [--json out]

For each lid (upper, lower) of eye1 in the given state: every shown lid strand's heading (root to its middle point, in the
eye's angle frame, theta toward the outer corner and phi up), and per strand the largest heading difference to the lid
strands and face strands rooted within 3 surface mm (a parting is two neighbours pointing apart). Printed: the share of
lid strands whose neighbourhood turns more than 60 and 90 degrees, the 95th percentile, and where the worst ones sit (theta,
phi, by 15-degree cells), split into the lid's interior and its edge band (within 3 mm of the face fur). The closed line is
left out (strands of the other lid across it are not neighbours).
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import eyelids_core as ec  # noqa: E402


def headings(E, X):
    t0, p0, _ = E.angles(X[:, 0])
    t1, p1, _ = E.angles(X[:, 4])
    return t0, p0, np.arctan2(p1-p0, (t1-t0)*np.cos(np.radians(p0)))


def main(lids_dir, probe_dir, state='closed'):
    Ls = ec.Lids(lids_dir)
    E = Ls.eyes['eye1']
    s = ec.STATES[state]
    X, rad = E.lid_fur(s['close'], s['squint'], s['wince'])
    lid = E.fur['lid']
    P = np.load(Path(probe_dir)/'eye-region.npz')
    cnt = P['fur__counts']
    st = np.r_[0, np.cumsum(cnt)[:-1]]
    FP = P['fur__points']
    fr = P['furattr__radius']
    nine = (cnt == 9) & (fr[st] > 0)
    FX = np.stack([FP[s_:s_+9] for s_ in st[nine]])
    ft, fp, fh = headings(E, FX)
    fsd = E.grid(E.sdz, ft, fp)
    face = fsd < -E.L['fur_out_mm']
    out = {}
    for name, l in (('upper', 1), ('lower', -1)):
        m = (lid == l) & (rad[:, 0] > 0)
        t, p, h = headings(E, X[m])
        R = X[m, 0]
        sd = E.grid(E.sdz, t, p)
        cl = np.interp(t, E.cth, E.close)
        side_face = face & ((fp > np.interp(ft, E.cth, E.close)) if l == 1 else (fp < np.interp(ft, E.cth, E.close)))
        allX = np.r_[R, FX[side_face, 0]]
        allh = np.r_[h, fh[side_face]]
        tree = cKDTree(allX)
        nb = tree.query_ball_point(R, 0.003)
        worst = np.array([np.degrees(np.abs(np.angle(np.exp(1j*(allh[j]-hh))))).max() if len(j) > 1 else 0.
                          for j, hh in zip(nb, h)])
        edge = sd < 3.-E.L['fur_out_mm']
        far = np.abs(p-cl) > 3
        rec = {}
        for zone, zm in (('interior', ~edge & far), ('edge band', edge & far)):
            w = worst[zm]
            rec[zone] = dict(strands=int(zm.sum()), over_60=round(float((w > 60).mean()), 3), over_90=round(float((w > 90).mean()), 3),
                             p95_deg=round(float(np.percentile(w, 95)), 1) if len(w) else None)
        cells = {}
        bad = (worst > 90) & far
        for tt, pp in zip(t[bad], p[bad]):
            k = f'theta {int(np.floor(tt/15)*15)}, phi {int(np.floor(pp/15)*15)}'
            cells[k] = cells.get(k, 0)+1
        rec['over_90_by_cell'] = dict(sorted(cells.items(), key=lambda kv: -kv[1])[:6])
        out[name] = rec
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    st_ = a[a.index('--state')+1] if '--state' in a else 'closed'
    res = main(a[0], a[1], st_)
    res = dict(lids=a[0], state=st_, eye='eye1', lids_result=res)
    print(json.dumps(res, indent=1))
    if '--json' in a:
        Path(a[a.index('--json')+1]).write_text(json.dumps(res, indent=1))
