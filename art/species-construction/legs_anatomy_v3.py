"""Akinza legs anatomy v3: the hind legs given visible structure for the deep crouch (rig pass 7; Nick: "The legs
still look like weird, boneless noodles"; the pass 6 critic: at the deepest crouch the thigh is one smooth balloon,
the shin an even tube into a slipper paw with no ankle, the Achilles a second tube along the shin).

Mechanism (references anim/ref/pass6: Gray 430, 434, 438, 439, Anatomy of the Cat fig. 90, a climber's bent knee,
kettlebell squat sides): in a deep flexion the thigh shows its quadriceps as a front mass with the vastus lateralis
swelling round the outer front, parted from the hamstrings behind by the groove of the iliotibial band; the
hamstrings end in two cords framing the knee pit. The front of the shin is the tibia, straight from the tuberosity
to the inner ankle with a low crest a little inside the front line. The calf is the two heads of the gastrocnemius
(the inner one larger and lower) tapering into the Achilles, which runs down the back as the back edge of the leg
with a hollow either side of it, in front of the tendon and behind the ankle bones. The ankle bones stand out
either side (inner higher and forward, outer lower and further back), and the heel bone behind the ankle carries the
tendon's end, so the paw reads as a foot hinged at an ankle.

This step displaces the skin along its smoothed normals with those forms, larger than v2 (which were too faint to
read in the crouch), each a smooth function of position along and round its bone (no feature narrower than about
1.5 cm, then the field is smoothed along the skin, so no ripples). Same topology and vertex order: only positions
change, so skin weights and fur bindings carry over. Displacement is zero outside the legs (the skin the thigh,
shin and foot bones own, away from the tails and arms) and below `soleKeepZ` on the paw (the approved sole).

  python art/species-construction/legs_anatomy_v3.py --skin <skin.npz with src, tri, edges> --rig <rig dir>
      --spec art/species-construction/specs/legs-anatomy-v3.json --out <out.npz> [--record <json>]
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
        # v3: angle round each segment from the front (0 front, + toward the outer side, +-pi the back)
        phi1 = np.arctan2(co1, cf1)
        phi2 = np.arctan2(co2, cf2)
        dang = lambda ph, c0: np.angle(np.exp(1j*(ph-c0)))          # wrapped angle difference
        G = lambda ph, c0, sg: np.exp(-(dang(ph, c0)/sg)**2)
        # ---- shin. Gastrocnemius: two heads behind the upper shin, the inner one larger and lower, merging into
        # one tendon; the whole back of the lower leg tapers into the Achilles (one form, not a cord beside it)
        hm = np.sin(np.pi*np.clip((a2+.08)/.82, 0, 1))**1.6*np.exp(-((a2-.34)/.26)**2)
        hl = np.sin(np.pi*np.clip((a2+.08)/.74, 0, 1))**1.6*np.exp(-((a2-.30)/.24)**2)
        calf = hm*G(phi2, -2.75, .75)+.8*hl*G(phi2, 2.75, .75)
        # below the calf: hollows either side of the Achilles (between the tendon and the ankle bones), the tendon
        # itself left as the back edge
        achilles_sides = band(a2, .55, .70, .90, .99)*(G(phi2, 2.15, .38)+G(phi2, -2.15, .38))
        narrow = band(a2, .50, .65, .88, .98)*rc.smoothstep(-cf2, -.3, .3)
        # ankle bones: inner higher and forward, outer lower and further back
        az_ = (P-Ak)@(-u2)
        malleoli = (G(phi2, -1.55, .38)*np.exp(-((az_-spec['malleolusInner'])/.013)**2)
                    + .9*G(phi2, 1.75, .38)*np.exp(-((az_-spec['malleolusOuter'])/.013)**2))*rc.smoothstep(a2, .78, .88)
        # heel: the calcaneus behind the ankle where the Achilles ends, above the sole (the approved sole is kept)
        heel = G(phi2, np.pi, .55)*np.exp(-((az_-spec['heelAbove'])/.016)**2)*rc.smoothstep(P[:, 2], spec['soleKeepZ'], spec['soleKeepZ']+.02)
        # the front of the shin straight (toward a line parallel to the bone), with a low tibial crest a little
        # inside the front midline
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
        tibia = gap*G(phi2, 0, 1.0)*band(a2, spec['tibiaAnchor']-.06, spec['tibiaAnchor']+.04, .84, .95)
        crest = G(phi2, -.30, .30)*band(a2, .10, .22, .70, .86)
        # ---- knee: a low kneecap the quadriceps run straight into; the tibial tuberosity below it
        kz = (P-K)@(-unit(u1+u2))
        side_off = (P-K)@o1
        frontk = rc.smoothstep((P-K)@f1, .0, .03)*rc.smoothstep(cf1*(1-below)+cf2*below, .45, .85)
        patella = gauss(kz, spec['patellaAbove'], .028)*gauss(side_off, 0, .026)*frontk
        tuberosity = gauss(-kz, .07, .02)*gauss(side_off, .004, .016)*frontk
        # ---- thigh. Quadriceps: the front mass, fullest in the lower half, vastus lateralis swelling round the outer
        # front; a groove along the outer thigh (the iliotibial band) parts it from the hamstrings behind; the
        # hamstrings a mass at the back ending in two cords that frame the knee pit; a small vastus medialis
        # above the inner knee (kept small: a large one knocks the knees together from the front)
        quads = np.sin(np.pi*np.clip((a1-.08)/(1.0-.08), 0, 1))**1.3*np.exp(-((a1-.62)/.32)**2)*G(phi1, .25, .95)
        vlat = np.exp(-((a1-.50)/.22)**2)*rc.smoothstep(a1, .1, .3)*G(phi1, 1.05, .45)
        groove = band(a1, .18, .36, .78, .93)*G(phi1, 1.90, .36)
        hams = np.sin(np.pi*np.clip((a1-.15)/(.95-.15), 0, 1))**1.4*np.exp(-((a1-.55)/.28)**2)*G(phi1, np.pi, .85)
        cords = band(a1, .62, .78, .95, 1.05)*(G(phi1, np.pi-.70, .28)+G(phi1, -np.pi+.70, .28))
        pit = band(a1, .82, .90, .97, 1.03)*G(phi1, np.pi, .40)
        vmo = gauss(a1, .82, .08)*G(phi1, -.85, .40)
        terms = dict(
            calf=A_['calf']*calf*on_shin, achillesSides=A_['achillesSides']*achilles_sides*on_shin,
            lowerShin=A_['lowerShin']*narrow*on_shin, malleoli=A_['malleoli']*malleoli*on_shin, heel=A_['heel']*heel*legm,
            tibia=tibia*on_shin, tibialCrest=A_['tibialCrest']*crest*on_shin,
            patella=A_['patella']*patella*legm, tuberosity=A_['tuberosity']*tuberosity*on_shin,
            quadriceps=A_['quadriceps']*quads*on_thigh, vastusLateralis=A_['vastusLateralis']*vlat*on_thigh,
            outerThighGroove=A_['outerThighGroove']*groove*on_thigh, hamstrings=A_['hamstrings']*hams*on_thigh,
            hamstringCords=A_['hamstringCords']*cords*on_thigh, kneePit=A_['kneePit']*pit*on_thigh,
            vastusMedialis=A_['vastusMedialis']*vmo*on_thigh)
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
    rec = dict(step='legs anatomy v3', script='art/species-construction/legs_anatomy_v3.py', spec=spec,
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
