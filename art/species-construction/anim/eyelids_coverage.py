"""Akinza eyelids fix pass 4: how much fur lies on the skin round a closed eye, by distance from the lid's edge (numpy only).

  python art/species-construction/anim/eyelids_coverage.py <lids dir> <probe dir> [--state closed] [--eye eye1] [--json out]

For each side of the closed line (upper, lower) and each 1 mm band of the bare zone's signed distance sd (surface mm,
positive inside the zone and the opening: the area a closed lid covers; negative out on the face), between the corners and
12 degrees past them:
- fibre per mm2: the summed length of the visible strand segments whose points fall in the band, over the band's skin area
  (mm of strand per mm2 of skin), for the face fur (the probe's strands on the skin round the eye, less the points under the
  lid surface and the strands the lid state hides) and for the lid fur of that state; their total;
- roots per mm2, the same two;
- the median strand length of the strands rooted in a few wider bands, face and lid.
Where the total over the lid and over the band outside its edge stands above the face fur's own (farther out), there are two
layers of fur; where the lid's strands are longer than the face strands next to them, the lid reads as a different coat.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import eyelids_core as ec  # noqa: E402


def coverage(lids_dir, probe_dir, state='closed', eye='eye1'):
    Ls = ec.Lids(lids_dir)
    P = np.load(Path(probe_dir)/'eye-region.npz')
    cnt = P['fur__counts']
    st = np.r_[0, np.cumsum(cnt)[:-1]]
    FP = P['fur__points']
    rad = P['furattr__radius'].copy()
    gofs = P['fur__offsets']
    E = Ls.eyes[eye]
    s = ec.parse_state(state)[eye]
    g = Ls.state_geometry(eye, s['close'], s['squint'], s['wince'], s.get('flags', ()))
    T, Pp, Rr = E.angles(FP)
    near = (np.abs(T) < 100) & (Rr < E.grid(E.rvis, T, Pp)+0.012)        # on the skin round the eye, not the muzzle beyond
    seg = np.zeros(len(FP))
    for s_, n_ in zip(st, cnt):
        seg[s_:s_+n_] = np.r_[np.linalg.norm(np.diff(FP[s_:s_+n_], axis=0), axis=1), 0]
    hidden = Rr < E.surface_radius(T, Pp, s['close'], s['squint'], s['wince'])
    if g.get('face') is not None:
        glob = np.repeat(gofs, cnt)+(np.arange(len(FP))-np.repeat(st, cnt))
        order = np.argsort(glob)
        fi, fr = g['face']
        pos = np.searchsorted(glob[order], fi)
        ok = (pos < len(glob)) & (glob[order][np.minimum(pos, len(glob)-1)] == fi) & (fr == 0)
        z = order[pos[ok]]
        hidden[z] = True
        rad[z] = 0
    sdF = E.grid(E.sdz, T, Pp)
    Xl = g['fur'].reshape(-1, 3)
    rl = g['fur_radius']
    lidid = np.repeat(E.fur['lid'], 9)
    Tl, Pl, _ = E.angles(Xl)
    segl = np.r_[np.linalg.norm(np.diff(Xl, axis=0), axis=1), 0]
    segl[8::9] = 0
    sdl = E.grid(E.sdz, Tl, Pl)
    th, ph = E.grid.th, E.grid.ph
    TH, PH = np.meshgrid(th, ph)
    cellA = (E.rvis*1000)**2*np.cos(np.radians(PH))*np.radians(th[1]-th[0])**2
    selG = (TH > E.thm-12) & (TH < E.thl+12)
    rootsF = np.zeros(len(FP), bool)
    rootsF[st] = True
    rootsL = np.zeros(len(Xl), bool)
    rootsL[::9] = True
    lens = np.array([np.linalg.norm(np.diff(FP[s_:s_+n_], axis=0), axis=1).sum() for s_, n_ in zip(st, cnt)])*1000
    Ll = np.linalg.norm(np.diff(Xl.reshape(-1, 9, 3), axis=1), axis=2).sum(1)*1000
    out = dict(lids=str(lids_dir), state=state, eye=eye, bands={}, lengths={})
    for half, sgn in (('upper', 1), ('lower', -1)):
        side = lambda t, p: sgn*(p-np.interp(t, E.cth, E.close)) > 0
        selF = near & (T > E.thm-12) & (T < E.thl+12) & side(T, Pp) & (rad > 0)
        selL = (Tl > E.thm-12) & (Tl < E.thl+12) & side(Tl, Pl) & (rl > 0) & (np.abs(lidid) == 1)
        condG = selG & side(TH, PH)
        rows = []
        for a in range(-14, 12):
            b = a+1
            A = cellA[condG & (sdG(E) >= a) & (sdG(E) < b)].sum()
            if A < 5:
                continue
            fF = seg[selF & ~hidden & (sdF >= a) & (sdF < b)].sum()*1000/A
            fL = segl[selL & (sdl >= a) & (sdl < b)].sum()*1000/A
            rows.append(dict(sd=[a, b], area_mm2=round(float(A)), face_fibre=round(float(fF), 2), lid_fibre=round(float(fL), 2),
                             total_fibre=round(float(fF+fL), 2),
                             face_roots=round(float((selF & rootsF & ~hidden & (sdF >= a) & (sdF < b)).sum()/A), 2),
                             lid_roots=round(float((selL & rootsL & (sdl >= a) & (sdl < b)).sum()/A), 2)))
        out['bands'][half] = rows
        Tr, Pr, Rr_ = T[st], Pp[st], Rr[st]
        sdr = sdF[st]
        lidv = E.fur['lid']
        vis = rl.reshape(-1, 9)[:, 0] > 0
        sdroot = sdl[::9]
        ln = []
        for a, b in ((-12, -8), (-8, -5), (-5, -3), (-3, -1.5), (-1.5, 0), (0, 2), (2, 5), (5, 10)):
            mf = (near[st] & side(Tr, Pr) & (sdr >= a) & (sdr < b) & (Tr > E.thm) & (Tr < E.thl) & (rad[st] > 0))
            ml = (lidv == sgn) & vis & (sdroot >= a) & (sdroot < b) & (E.fur['theta'] > E.thm) & (E.fur['theta'] < E.thl)
            ln.append(dict(sd=[a, b], face_n=int(mf.sum()), face_median_mm=round(float(np.median(lens[mf])), 2) if mf.any() else None,
                           lid_n=int(ml.sum()), lid_median_mm=round(float(np.median(Ll[ml])), 2) if ml.any() else None))
        out['lengths'][half] = ln
    return out


def sdG(E):
    return E.sdz


def show(out):
    for half in ('upper', 'lower'):
        print(f'{half}: sd band, skin mm2, fibre per mm2 face + lid = total, roots per mm2 face / lid')
        for r in out['bands'][half]:
            print(f"  {r['sd'][0]:+4d}..{r['sd'][1]:+3d} {r['area_mm2']:5d}  {r['face_fibre']:5.2f} + {r['lid_fibre']:5.2f} = {r['total_fibre']:5.2f}"
                  f"   {r['face_roots']:.2f} / {r['lid_roots']:.2f}")
        print(f'{half}: median strand length (mm) by root band, face (n) and lid (n)')
        for r in out['lengths'][half]:
            print(f"  {r['sd'][0]:+5.1f}..{r['sd'][1]:+5.1f}  face {r['face_median_mm']} ({r['face_n']})  lid {r['lid_median_mm']} ({r['lid_n']})")


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('lids', type=Path)
    p.add_argument('probe', type=Path)
    p.add_argument('--state', default='closed')
    p.add_argument('--eye', default='eye1')
    p.add_argument('--json', type=Path, default=None)
    a = p.parse_args()
    o = coverage(a.lids, a.probe, a.state, a.eye)
    show(o)
    if a.json:
        a.json.write_text(json.dumps(o, indent=1))
