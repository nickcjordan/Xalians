"""Akinza legs anatomy v1: the hind legs given the structure a bending leg shows (rig pass 6, stage D; diagnosis
2026-10-21 section 5, Nick: "The legs still look like weird, boneless noodles").

The sculpt's legs were two smooth tubes: the back of the lower leg one straight line from heel to knee, the front
leaning back the whole way (the lower leg narrowed on its front), no kneecap, no hamstring cords, the thigh a
smooth cone. This step adds, as a displacement of the skin along its smoothed normals, the forms the references
show (anim/ref/pass6: Gray 430, 434, 438, 439; Anatomy of the Cat fig. 90; hairless cat and kangaroo hind legs):

- calf: the gastrocnemius mass behind the upper third of the shin, the medial head a little fuller and lower;
- Achilles: below the calf the back of the leg narrows into a cord, with a shallow hollow either side, down to
  the heel;
- tibia front: the front of the shin straightened toward a line parallel to the shin bone (it receded 4 cm);
- kneecap: a rounded patella over the front of the knee, the patellar tendon running flat below it between two
  shallow hollows to a low tibial tuberosity;
- hamstrings: two cords at the back of the lower thigh (semitendinosus inside, biceps femoris outside) with the
  knee pit hollow between them;
- quadriceps: the front thigh mass, fullest in its lower middle, and the vastus medialis teardrop above the inner
  knee;
- groin crease: a shallow groove where the thigh meets the trunk at the front.

Same topology and vertex order: only positions change, so skin weights and fur bindings carry over. Displacement
is zero outside the legs (the skin the thigh, shin and foot bones own, away from the tails and arms). All
measures are rig metres (the rig's re-origin and scale); the output is source units like the input.

  python art/species-construction/legs_anatomy_v1.py --skin <skin.npz with src, tri, edges> --rig <rig dir>
      --spec art/species-construction/specs/legs-anatomy-v1.json --out <out.npz> [--record <json>]

Writes the new source-unit positions (src, tri, edges, and the per-vertex displacement in metres) and a record.
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import scipy.sparse as sp

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402


def unit(v):
    v = np.asarray(v, float)
    return v/np.linalg.norm(v, axis=-1, keepdims=True)


def perp(v, axis):
    v = np.asarray(v, float)
    return unit(v-axis*(v@axis))


def band(x, a, b, c, d):
    """0 below a, rising to 1 at b, 1 to c, falling to 0 at d."""
    return rc.smoothstep(x, a, b)*(1-rc.smoothstep(x, c, d))


def gauss(x, mu, sig):
    return np.exp(-((x-mu)/sig)**2)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--skin', type=Path, required=True)
    p.add_argument('--rig', type=Path, required=True)
    p.add_argument('--spec', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--record', type=Path)
    a = p.parse_args()
    t0 = time.time()
    spec = json.loads(a.spec.read_text(encoding='utf-8'))
    A_ = spec['amplitudes']
    d = np.load(a.skin)
    src = d['src'].astype(np.float64)
    tri, edges = d['tri'], d['edges']
    rig = json.loads((a.rig/'rig.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    J = json.loads((a.rig/'joints.json').read_text())
    P = s*(src-off)
    n = len(P)
    wt = np.load(a.rig/'weights.npz')
    dense = np.zeros((n, len(rc.ANIM_NAMES)), np.float32)
    np.put_along_axis(dense, wt['idx'].astype(int), wt['w'], 1)
    NI = {b: i for i, b in enumerate(rc.ANIM_NAMES)}
    share = lambda bs: dense[:, [NI[b] for b in bs]].sum(1)
    tails = share([b for b in rc.ANIM_NAMES if b.startswith('tail_')])
    arms = share([f'{b}.{sd}' for b in ('clavicle', 'upperarm', 'forearm', 'hand') for sd in 'LR'])
    # smoothed vertex normals (about 2 cm), so the push follows the leg's form rather than each facet
    A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
    A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
    fn = np.cross(P[tri[:, 1]]-P[tri[:, 0]], P[tri[:, 2]]-P[tri[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, tri[:, k], fn)
    N = unit(N+1e-30)
    for _ in range(spec.get('normalRounds', 40)):
        N = unit(.5*N+.5*(A@N))
    disp = np.zeros(n)
    parts = {}
    for sd, sx in (('L', 1.), ('R', -1.)):
        side = (sx*P[:, 0] > 0)
        H, K, Ak = (np.array(J[f'{j}.{sd}'], float) for j in ('hip', 'knee', 'ankle'))
        L1, L2 = np.linalg.norm(K-H), np.linalg.norm(Ak-K)
        u1, u2 = (K-H)/L1, (Ak-K)/L2
        fwd = rc.leg_forward(J, sd)
        out_dir = np.array([sx, 0., 0.])
        thigh = share([f'thigh.{sd}', f'glute.{sd}'])
        lower = share([f'shin.{sd}', f'foot.{sd}'])
        legm = side*rc.smoothstep(thigh+lower, .5, .9)*(1-rc.smoothstep(tails, .0, .03))*(1-rc.smoothstep(arms, .0, .03))
        # ---- coordinates: along each bone (0 at its head, 1 at its tail) and round it (front, outer)
        q1 = P-H
        a1 = q1@u1/L1
        r1 = q1-np.outer(q1@u1, u1)
        rr1 = np.linalg.norm(r1, axis=1)+1e-12
        f1, o1 = perp(fwd, u1), perp(out_dir, u1)
        cf1, co1 = (r1@f1)/rr1, (r1@o1)/rr1           # cos round the thigh: to the front, to the outer side
        q2 = P-K
        a2 = q2@u2/L2
        r2 = q2-np.outer(q2@u2, u2)
        rr2 = np.linalg.norm(r2, axis=1)+1e-12
        f2, o2 = perp(fwd, u2), perp(out_dir, u2)
        cf2, co2 = (r2@f2)/rr2, (r2@o2)/rr2
        ang2 = np.arctan2(co2, -cf2)                   # round the shin from the back: + toward the outer side
        ang1 = np.arctan2(co1, -cf1)
        # shin side of the knee: a smooth split 3 cm either side of the knee plane (the 2.5 cm weight blend made
        # each muscle start at a step)
        kz0 = (P-K)@(-unit(u1+u2))
        below = 1-rc.smoothstep(kz0, -.03, .03)
        on_shin, on_thigh = legm*below, legm*(1-below)
        back2 = rc.smoothstep(-cf2, .05, .6)
        front2 = rc.smoothstep(cf2, .25, .75)
        # calf: the gastrocnemius behind the upper third of the shin, two heads either side of the back midline
        # (the medial one fuller and lower, the lateral one higher), each tapering long into the Achilles
        med = gauss(ang2, -.5, .6)*band(a2, .05, .27, .30, .70)
        lat = .8*gauss(ang2, .5, .55)*band(a2, .04, .21, .25, .60)
        calf = np.maximum(med, lat)*rc.smoothstep(-cf2, -.3, .3)
        # Achilles: the back narrows into a cord, a shallow hollow either side of it, to the heel
        ach = band(a2, .55, .70, .84, .96)
        ach_core = gauss(ang2, 0, .45)
        ach_side = gauss(np.abs(ang2), 1.05, .4)
        achilles = ach*(A_['achillesCore']*ach_core+A_['achillesHollow']*ach_side)
        # tibia front: toward a straight line parallel to the shin bone through the front at a2 = tibiaAnchor. The
        # gap is measured on the front midline per height along the shin and applied round the front by angle, so
        # the push is one smooth form and not a ridge where the sides lie behind the line
        fo = r2@f2
        mid = (on_shin > .5) & (np.abs(co2) < .25) & (cf2 > .8)
        bins = np.arange(.1, 1.0, .02)
        prof = np.array([np.percentile(fo[mid & (np.abs(a2-b) < .012)], 90) if (mid & (np.abs(a2-b) < .012)).sum() > 5
                         else np.nan for b in bins])
        ok = np.isfinite(prof)
        prof = np.interp(bins, bins[ok], prof[ok])
        f_star = float(np.interp(spec['tibiaAnchor'], bins, prof))
        gap_a = np.clip(f_star-prof, 0, A_['tibiaMax'])
        gap = np.interp(a2, bins, gap_a)
        tibia = gap*rc.smoothstep(cf2, .0, .7)*band(a2, spec['tibiaAnchor']-.05, spec['tibiaAnchor']+.05, .86, .97)
        # kneecap and patellar tendon (front of the knee), tibial tuberosity
        kz = (P-K)@(-unit(u1+u2))                       # height above the knee plane
        side_off = (P-K)@o1
        frontk = rc.smoothstep((P-K)@f1, .0, .03)*rc.smoothstep(cf1*(1-below)+cf2*below, .45, .85)
        patella = gauss(kz, spec['patellaAbove'], .022)*gauss(side_off, 0, .021)*frontk
        tendon_hollows = gauss(np.abs(side_off), .022, .007)*band(-kz, -.005, .015, .07, .10)*frontk
        tuberosity = gauss(-kz, .085, .015)*gauss(side_off, 0, .014)*frontk
        # hamstring cords at the back of the lower thigh into the knee pit, the hollow between them
        back1 = rc.smoothstep(-cf1, .1, .6)
        cords = gauss(np.abs(ang1), .85, .22)*band(a1, .62, .78, .98, 1.06)*back1
        pit = gauss(ang1, 0, .45)*band(a1, .80, .90, .96, 1.02)*back1
        # quadriceps (front thigh, fullest in its lower middle) and vastus medialis teardrop above the inner knee
        front1 = rc.smoothstep(cf1, .0, .6)
        quads = band(a1, .18, .5, .72, .9)*front1
        vmo = gauss(a1, .84, .06)*rc.smoothstep(-co1, .1, .6)*rc.smoothstep(cf1, -.2, .4)
        # groin crease: a shallow groove at the front where the thigh meets the trunk (rc.leg_shares' crease line)
        crotch = J['_meta']['legs']['crotchZ']
        tx = rc.smoothstep(sx*P[:, 0], .035, abs(H[0])+.045)
        zf = crotch+(H[2]+.005-crotch)*tx
        groin = gauss(P[:, 2]-(zf-.012), 0, .006)*rc.smoothstep(-(P[:, 1]-H[1]), .0, .04)*side*(1-rc.smoothstep(tails, 0, .03))\
            * (1-rc.smoothstep(arms, 0, .03))*rc.smoothstep(sx*P[:, 0], .03, .06)
        terms = dict(
            calf=A_['calf']*calf*on_shin, achilles=achilles*on_shin, tibia=tibia*on_shin,
            patella=A_['patella']*patella*legm, tendonHollows=A_['tendonHollows']*tendon_hollows*legm,
            tuberosity=A_['tuberosity']*tuberosity*on_shin, hamstrings=A_['hamstrings']*cords*on_thigh,
            kneePit=A_['kneePit']*pit*on_thigh*(1-below), quadriceps=A_['quadriceps']*quads*on_thigh,
            vastusMedialis=A_['vastusMedialis']*vmo*on_thigh, groinCrease=A_['groinCrease']*groin)
        for k, v in terms.items():
            parts[k] = parts.get(k, np.zeros(n))+v
            disp += v
        parts.setdefault('_meta', {})[sd] = dict(tibiaFrontLine=f_star, thigh=L1, shin=L2)
    meta = parts.pop('_meta')
    for _ in range(spec.get('smoothRounds', 20)):
        disp = .5*disp+.5*(A@disp)
    legs_any = np.zeros(n, bool)
    for sd in 'LR':
        legs_any |= share([f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}', f'glute.{sd}']) > .02
    disp[~legs_any & (np.abs(disp) < 1e-4)] = 0
    newP = P+N*disp[:, None]
    new_src = newP/s+off
    np.savez_compressed(a.out, src=new_src.astype(np.float32), m=newP.astype(np.float32), tri=tri, edges=edges,
                        disp=disp.astype(np.float32))
    moved = np.abs(disp) > 1e-5
    rec = dict(step='legs anatomy v1', script='art/species-construction/legs_anatomy_v1.py', spec=spec,
               skinSha256=hashlib.sha256(src.astype(np.float32).tobytes()).hexdigest(), vertices=n,
               movedVertices=int(moved.sum()), maxOutM=float(disp.max()), maxInM=float(-disp.min()),
               movedOutsideLegs=int((moved & ~legs_any).sum()),
               perTermMaxM={k: [float(v.min()), float(v.max())] for k, v in parts.items()}, legs=meta,
               seconds=round(time.time()-t0, 1))
    if a.record:
        a.record.write_text(json.dumps(rec, indent=1))
    print(json.dumps({k: v for k, v in rec.items() if k not in ('spec',)}, indent=1))


if __name__ == '__main__':
    main()
