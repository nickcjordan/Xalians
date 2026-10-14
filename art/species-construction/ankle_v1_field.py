"""Ankle v1 (numpy only): the lower shin and ankle thickened along the shin's own center line, then filleted and smoothed.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index. The spec is written for the +x leg; every mass is mirrored to both sides.

  sweep      [sweep] a chain of elliptic tapered capsules through points on the shin's measured center line (each point
             z, x, y and half widths rx across and ry front to back), unioned with a hard minimum so the joints between
             segments add nothing (a smooth union of overlapping capsules prints a bulge at each joint)
  wedge      [wedges] a fillet fill for an inside corner seen in the side view: the region behind a slope line through two
             (y, z) points (the shin front above, the instep below), cut by a bounding ellipsoid round the corner, joined by
             a smooth minimum; it turns the shin-to-instep step into one slope without touching the toes in front of it
  S1 = S + wbox (smin(S, sweep, joinK) - S)
             the sweep only adds where it stands proud of the old skin (the thin ankle); where the old leg is already
             wider (the shin below the knee, the foot) the skin is kept
  F = pelvis_v1_field.compose(S1, ...) with the remaining keys: [blurZ] a z-only blur over the ankle that evens the radius
             profile, [blurs] masked isotropic blurs (the shin-to-instep corner, the Achilles and heel back, the front of the
             shin), [partBox] the part box, outside which F is S exactly.
"""
import numpy as np

from neck_v1_field import smin3, grid_coords
import pelvis_v1_field as pf


def sweep_field(X, Y, Z, pts, side):
    out = None
    for p, q in zip(pts[:-1], pts[1:]):
        rx = (p['rx'], q['rx'])
        ry = (p['ry'], q['ry'])
        a = np.array([side*p['x'], p['y'], p['z']], float)
        b = np.array([side*q['x'], q['y'], q['z']], float)
        ab = b-a
        L2 = max(ab@ab, 1e-12)
        t = np.clip(((X-a[0])*ab[0]+(Y-a[1])*ab[1]+(Z-a[2])*ab[2])/L2, 0, 1)
        cx, cy, cz = a[0]+t*ab[0], a[1]+t*ab[1], a[2]+t*ab[2]
        ax = rx[0]+t*(rx[1]-rx[0])
        ay = ry[0]+t*(ry[1]-ry[0])
        # elliptic section in x and y round the axis point; the distance along the axis direction is left in so the ends
        # are round (an approximate signed distance, scaled by the smaller half width)
        e = np.sqrt(((X-cx)/ax)**2+((Y-cy)/ay)**2+((Z-cz)/np.minimum(ax, ay))**2)
        d = (e-1)*np.minimum(ax, ay)
        out = d if out is None else np.minimum(out, d)
    return out


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    sw = None
    for side in (1, -1):
        f = sweep_field(X, Y, Z, spec['sweep'], side)
        sw = f if sw is None else np.minimum(sw, f)
    joined = smin3(S, sw, spec['joinK'])
    for wd in spec.get('wedges', []):
        (y0, z0), (y1, z1) = wd['p0'], wd['p1']
        n = np.array([z1-z0, -(y1-y0)], float)          # normal of the line in (y, z)
        n /= np.linalg.norm(n)
        if n[0] > 0:                                     # outward = toward the front (-y)
            n = -n
        dpl = (Y-y0)*n[0]+(Z-z0)*n[1]
        for side in (1, -1):
            c = np.array(wd['c'], float)*np.array([side, 1, 1])
            s = np.array(wd['s'], float)
            e = np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)
            fill = np.maximum(dpl, (e-1)*s.min())
            joined = smin3(joined, fill, wd['k'])
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(joined-S)
    log('ankle sweep joined')
    rest = {k: v for k, v in spec.items() if k not in ('sweep', 'joinK', 'wedges')}
    F, w, rec = pf.compose(S1, lo, step, V, rest, log=log)
    return F, w, rec
