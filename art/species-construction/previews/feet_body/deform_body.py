"""Temporary slimmer-and-softer body preview deformation for Akinza (never written to the recipe).

python deform_body.py <probe.npz> <claws.npz> <out.npz> <variant A|B|C> [numbers.json]

Changes only the trunk, shoulders, arms and legs. The head and neck (fade z .34 to .42), the forepaws (below the
wrist, z -.09 to -.145), the hind paws (below z -.74 to -.80) and the tails (behind the back line) stay fixed.

Three parts, each slimmed toward its own axis with spatially smooth weights, so the field has no seams:
  trunk  scaled toward its vertical centre line, width (x) and depth (y) separately, by height;
  arms   scaled toward the arm's own axis, and translated inward by the trunk's shoulder narrowing, so the cap
         stays over the arm (the forepaw and its claws ride along rigidly, unchanged in shape);
  legs   scaled toward each leg's own axis (stance and feet unchanged).
Then a masked Taubin smoothing (lambda .5, mu -.505) softens the muscle forms without shrinking the volume.
"""
import json
import sys

import numpy as np
from scipy import sparse

VARIANTS = {
    # tx, ty: trunk width and depth reduction at the heights ZT (shoulder cap, chest, waist, belly, hips); a negative
    # value fills out. arm, leg: reduction toward the limb axis (the arm's grows to 1.4 times this at the cap).
    # drop: how far the outer top of each shoulder is lowered (sloping, less square). smooth: Taubin passes.
    # cap: plain Laplacian passes on the shoulder cap only, which rounds the deltoid knob and fills the notch above it.
    'A': dict(tx=(.08, .06, .03, .04, .05), ty=(.03, .04, -.02, .02, .02), arm=.07, leg=.05, drop=.008, smooth=150, cap=80),
    'B': dict(tx=(.12, .10, .05, .07, .08), ty=(.05, .06, -.04, .03, .03), arm=.11, leg=.08, drop=.014, smooth=350, cap=180),
    'C': dict(tx=(.17, .14, .07, .10, .11), ty=(.06, .08, -.06, .04, .04), arm=.15, leg=.11, drop=.018, smooth=900, cap=320),
}
ZT = (.30, .18, .06, -.10, -.28)
MU = {'A': -0.505, 'B': -0.504, 'C': -0.503}   # Taubin mu per variant (lambda .5): pass band k about .02, .016, .012


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def profile(z, vals, sigma=0.06):
    """Reduction by height: the control values joined linearly, then Gaussian-smoothed so no height has a kink."""
    zs = np.arange(-0.80, 0.60, 0.005)
    f = np.interp(zs, ZT[::-1], vals[::-1])
    k = np.exp(-0.5*(np.arange(-40, 41)*0.005/sigma)**2); k /= k.sum()
    f = np.convolve(np.pad(f, 40, mode='edge'), k, 'valid')
    return np.interp(z, zs, f)


def main():
    probe, claws, out, name = sys.argv[1:5]
    numbers = sys.argv[5] if len(sys.argv) > 5 else None
    V = VARIANTS[name]
    P = np.load(probe)
    v0 = P['v'].astype(np.float64)
    tri = P['t']
    C = np.load(claws)
    x, y, z = v0[:, 0], v0[:, 1], v0[:, 2]
    ax = np.abs(x)
    side = np.where(x >= 0, 1.0, -1.0)

    # --- masks -------------------------------------------------------------------------------------------------
    head = 1-smooth((z-0.34)/0.08)                                  # 1 below .34, 0 above .42
    # tails: behind the back line; the threshold is lower in the hip band and higher along the legs
    band = smooth((z+0.43)/0.06)                                    # 1 above -.37, 0 below -.43
    ycut = 0.12*(1-band) + 0.06*band
    tails = 1-smooth((y-ycut)/0.05)                                 # 1 in front of the cut, 0 behind
    tails = np.where((z > 0.16) | (z < -0.78), 1.0, tails)          # no tails above the waist line or below the shins
    # arms: outside the armpit gap below the shoulder
    bz = np.interp(z, [-0.25, -0.18, -0.10, 0.10, 0.22, 0.30], [0.30, 0.2845, 0.2585, 0.204, 0.209, 0.209])
    # where arm and trunk are one surface (the shoulder, above z .16) the hand-over is spread wider, so no crease forms
    tw = 0.024 + 0.10*smooth((z-0.16)/0.14)
    arm_w = smooth((ax-bz+tw/2)/tw)*(1-smooth((z-0.20)/0.10))     # full below .20, gone by .30
    arm_w *= (z > -0.30)
    leg_w = smooth((-0.27-z)/0.13)                                  # 0 above -.27, 1 below -.40
    trunk_w = np.clip(1-arm_w-leg_w, 0, 1)
    forepaw = smooth((z+0.145)/0.055)                               # 1 above the wrist, 0 in the paw
    hindpaw = smooth((z+0.80)/0.06)                                 # 1 above the ankle, 0 in the foot
    keep = head*tails                                               # where anything may move at all

    # --- axes ----------------------------------------------------------------------------------------------------
    def sec_centres(sel, zs, tol=0.004):
        cx, cy = [], []
        for zz in zs:
            b = v0[sel & (np.abs(z-zz) < tol)]
            if len(b) < 20:
                cx.append(np.nan); cy.append(np.nan); continue
            cx.append(0.5*(b[:, 0].min()+b[:, 0].max())); cy.append(0.5*(b[:, 1].min()+b[:, 1].max()))
        cx, cy = np.array(cx), np.array(cy)
        ok = ~np.isnan(cx)
        cx = np.interp(zs, zs[ok], cx[ok]); cy = np.interp(zs, zs[ok], cy[ok])
        k = np.ones(7)/7
        return (np.convolve(np.pad(cx, 3, mode='edge'), k, 'valid'), np.convolve(np.pad(cy, 3, mode='edge'), k, 'valid'))

    zt = np.arange(-0.36, 0.44, 0.01)
    tyc = sec_centres((ax < 0.08) & (y < 0.10), zt)[1]
    za = np.arange(-0.20, 0.23, 0.01)
    zl = np.arange(-0.86, -0.39, 0.01)
    arm_axis, leg_axis = {}, {}
    for s in (-1, 1):
        bza = np.interp(za, [-0.25, -0.18, -0.10, 0.10, 0.22], [0.30, 0.2845, 0.2585, 0.204, 0.209])
        sel = (side == s) & (y < 0.12)
        ax_x, ax_y = [], []
        for zz, bb in zip(za, bza):
            b = v0[sel & (np.abs(z-zz) < 0.004) & (ax > bb)]
            ax_x.append(0.5*(b[:, 0].min()+b[:, 0].max())); ax_y.append(0.5*(b[:, 1].min()+b[:, 1].max()))
        arm_axis[s] = (np.array(ax_x), np.array(ax_y))
        leg_axis[s] = sec_centres(sel & (ax > 0.03) & (y < 0.12), zl)

    # --- displacement ------------------------------------------------------------------------------------------
    rx = profile(z, V['tx'])
    ry = profile(z, V['ty'])
    yc = np.interp(z, zt, tyc)
    d_trunk = np.zeros_like(v0)
    d_trunk[:, 0] = -rx*x
    d_trunk[:, 1] = -ry*(y-yc)

    d_arm = np.zeros_like(v0)
    t_arm = {}
    for s in (-1, 1):
        sel = side == s
        axx = np.interp(z[sel], za, arm_axis[s][0]); axy = np.interp(z[sel], za, arm_axis[s][1])
        # inward shift: the trunk's narrowing at the shoulder joint (x of the arm axis at its top, cap height)
        joint_x = arm_axis[s][0][-1]
        shift = -float(profile(np.array([0.26]), V['tx'])[0])*joint_x
        t_arm[s] = shift
        sc = V['arm']*(1+0.4*smooth(z[sel]/0.2))*forepaw[sel]
        d_arm[sel, 0] = shift - sc*(x[sel]-axx)
        d_arm[sel, 1] = -sc*(y[sel]-axy)

    d_leg = np.zeros_like(v0)
    for s in (-1, 1):
        sel = side == s
        lx = np.interp(z[sel], zl, leg_axis[s][0]); ly = np.interp(z[sel], zl, leg_axis[s][1])
        sc = V['leg']*hindpaw[sel]
        d_leg[sel, 0] = -sc*(x[sel]-lx)
        d_leg[sel, 1] = -sc*(y[sel]-ly)

    # sloping shoulders: lower the outer top of each cap, fading toward the neck and down the arm
    g = np.exp(-((ax-0.27)/0.07)**2)*smooth((z-0.20)/0.10)
    d_trunk[:, 2] -= V['drop']*g
    d_arm[:, 2] -= V['drop']*g
    D = (trunk_w[:, None]*d_trunk + arm_w[:, None]*d_arm + leg_w[:, None]*d_leg)*keep[:, None]
    v = v0 + D

    # --- softening: masked Taubin smoothing ---------------------------------------------------------------------
    soft = keep*np.where(arm_w > 0.5, forepaw, 1.0)*hindpaw
    soft = soft*(1-smooth((z-0.30)/0.08))                          # no smoothing into the neck
    n = len(v)
    e = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]])
    A = sparse.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    A = ((A+A.T) > 0).astype(np.float64)
    deg = np.asarray(A.sum(1)).ravel(); deg[deg == 0] = 1
    M = sparse.diags(1/deg) @ A
    w = soft[:, None]
    for _ in range(V['smooth']):
        v = v + 0.5*w*(M @ v - v)
        v = v + MU[name]*w*(M @ v - v)

    # shoulder cap: plain (shrinking) Laplacian passes under a soft Gaussian mask, so the knob melts into the shoulder
    capw = 0.5*keep*np.exp(-((ax-0.25)/0.075)**2)*np.exp(-((z-0.24)/0.075)**2)
    cw = capw[:, None]
    for _ in range(V['cap']):
        v = v + cw*(M @ v - v)

    res = {'skin': v.astype(np.float32)}
    for k in C.files:
        if k.endswith('_v') and 'fore claw' in k:
            c = C[k]
            s = 1 if c[:, 0].mean() > 0 else -1
            cc = c.copy(); cc[:, 0] += t_arm[s]
            res['claw::'+k[:-2].replace('fore claw m1', 'fore claw -1')] = cc.astype(np.float32)
    np.savez_compressed(out, **res)

    # --- numbers ---------------------------------------------------------------------------------------------
    disp = np.linalg.norm(v-v0, axis=1)
    rep = {'variant': name, 'settings': V, 'arm inward shift': round(float(t_arm[1]), 4),
           'max displacement': round(float(disp.max()), 4),
           'displacement in held parts (head z>.44, hind paws z<-.82, forepaws z<-.17 at the arms, tails y>.16)': {
               'head': round(float(disp[z > 0.44].max()), 5),
               'hind paws': round(float(disp[z < -0.82].max()), 5),
               'tails': round(float(disp[(y > 0.16) & (z > -0.78) & (z < 0.16)].max()), 5),
           }}
    fp = (arm_w > 0.5) & (z < -0.17) & (y < 0.1)
    rel = (v-v0)[fp]*side[fp][:, None]
    rep['displacement in held parts (head z>.44, hind paws z<-.82, forepaws z<-.17 at the arms, tails y>.16)'][
        'forepaws (shape change after removing the rigid shift)'] = round(float(np.abs(rel[:, 0]-np.median(rel[:, 0])).max()), 5)
    if numbers:
        json.dump(rep, open(numbers, 'w'), indent=1)
    print(json.dumps(rep, indent=1))


main()
