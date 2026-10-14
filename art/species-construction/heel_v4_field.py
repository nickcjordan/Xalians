"""Heel v4 (numpy only): the main (metatarsal) pad moved back under the ankle as the rear weight-bearing pad, and the heel back
rebuilt as one authored round shape (anatomy review 2026-10-13, finding 7). Nick, 2026-10-14, on heel v3's sole: "it looks like
pads under each finger are relatively close to where they should be. But the pad that's supposed to be at the palm needs to be
lower at the base, closer to being under the ankle", "and maybe adjust the resulting shape of the paw accordingly". The heel stays
flat on the floor (Nick's call).

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive outside),
never of a vertex index. The spec is written for the +x foot; every mass is mirrored to both sides. In order:

  heelShape  [heelShape] the heel back replaced by an authored shape, blended in by a smooth mask behind the heel: at each
             height z the section is an ellipse (or, with uSection, a U: its back half and straight sides ahead) (half widths a across and b front to back, about the heel center x) whose back
             point lies on an authored side profile yb(z) (a natural spline through the spec's points: it follows the heel back
             as it is where the approved ankle ends, then curves down and forward into the floor, so the back-bottom corner is
             part of the one curve). Heel v3's filters (closings and openings) could not remove the dent where the leg column's
             lower end met the corner fillet; an authored shape has no such seam, and the Achilles fades into it
  lift       [lift] the sole moved up by a vertical shift (side walls stay put), as heel v2 and v3, over the sole, except an ellipse
             over the heel behind and round the main pad's rear (heel): the heel's underside comes down onto the floor there and
             the main pad merges into it as the heel's weight-bearing pad, so they are one shape, not a pad and a contact patch
  openings   [openings] a small ball opening over the bottom of the foot rolls the side wall into the sole (as heel v3)
  pads       [pads] the four toe pads as heel v2 and v3, and the main pad moved back under the ankle (a body and three lobes
             pointing back toward the heel); flattened ellipsoid domes on the foot's own underside, clipped at the floor, joined by
             a small smooth minimum
  openingsAfterPads [openingsAfterPads] a small ball opening trims the soft skirt round each pad (as heel v3)
  S1 = S + wbox (edits); F = pelvis_v1_field.compose(S1, ...) with [partBox], outside which F is S exactly.
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, grid_coords, natural_spline
import pelvis_v1_field as pf
import heel_v2_field as h2


def heel_shape(X, Y, Z, H):
    """Approximate signed distance of the authored heel: per height, an ellipse of half widths a (across) and b (front to back)
    about x = xc, with its back point at y = yb(z)."""
    zs, ys = zip(*sorted(H['profile']))
    if H.get('interp') == 'linear':
        # a densely sampled profile (an exact arc into the floor): linear between samples, no spline overshoot
        yb = np.interp(Z, zs, ys)
    else:
        yb = natural_spline(zs, ys)(Z)
    a, b = H['a'], H['b']
    if 'aProfile' in H:
        # the half width across, per height (a natural spline), fitted to the heel's measured sides
        za, va = zip(*sorted(H['aProfile']))
        a = natural_spline(za, va)(Z)
    yc = yb-b
    dx = np.abs(X)-H['xc']
    e = np.sqrt((dx/a)**2+((Y-yc)/b)**2)
    D = (e-1)*np.minimum(a, b)
    if H.get('uSection'):
        # a U section: the elliptic back, then straight sides of half width a ahead of its widest point, so the shape never
        # narrows again in front (an ellipse would cut into the heel's sides where the blend mask hands over)
        D = np.where(Y < yc, np.abs(dx)-a, D)
    if 'floorZ' in H:
        # the profile spline runs on below the floor; the heel shape stops at the floor plane
        D = np.maximum(D, H['floorZ']-Z)
    return D


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    rec = {}
    F0 = h2.blur_x(S.copy(), X, Y, Z, step, spec.get('blurX', []), log)
    H = spec.get('heelShape')
    if H:
        D = heel_shape(X, Y, Z, H)
        w = pf.box_weight(X, Y, Z, H['mask'])
        F0 = F0+w*(D-F0)
        log('heel back replaced by the authored heel')
    L = spec.get('lift')
    if L:
        zf = L['floorZ']
        wz = smootherstep((zf+L['band'][1]-Z)/(L['band'][1]-L['band'][0]))
        wx = pf.box_weight(X, Y, Z, {'x': L['x']})
        if 'heel' in L:
            # nothing lifted on the heel behind and round the main pad's rear: the heel's underside comes down onto the floor
            # and the main pad merges into it as its weight-bearing pad (a lifted heel stood on the pad like a plinth)
            hh = L['heel']
            e = np.sqrt(((np.abs(X)-hh['c'][0])/hh['s'][0])**2+((Y-hh['c'][1])/hh['s'][1])**2)
            wx = wx*(1-smootherstep((hh['fade'][1]-e)/(hh['fade'][1]-hh['fade'][0])))
        F0 = h2.shift_z(F0, L['depth']*wz*wx/step)
        log('sole lifted')
    for op in spec.get('openings', []):
        reg = pf.box_weight(X, Y, Z, op['box'])
        D = h2.opening(F0, lo, step, op['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
    P = spec.get('pads')
    if P:
        zf = P['floorZ']
        rec['pads'] = []
        for pad in P['pads']:
            for side in (1, -1):
                cx = side*pad['at'][0]
                if not (lo[0] <= cx <= lo[0]+step*(S.shape[0]-1)):
                    continue
                zu = h2.underside_z(S, lo, step, cx, pad['at'][1])
                if zu is None:
                    continue
                if side > 0:
                    rec['pads'].append({'name': pad['name'], 'underside': round(float(zu), 4)})
                D = None
                for lb in pad['lobes']:
                    sz = lb['s'][2]
                    c = (side*lb['c'][0], lb['c'][1], zu-pad.get('sink', P['sink'])+sz)
                    d = h2.ellipsoid_d(X, Y, Z, c, lb['s'])
                    D = d if D is None else smin3(D, d, P['lobeK'])
                D = np.maximum(D, zf-Z)
                F0 = smin3(F0, D, P['padK'])
        log('pads joined')
    for op in spec.get('openingsAfterPads', []):
        reg = pf.box_weight(X, Y, Z, op['box'])
        D = h2.opening(F0, lo, step, op['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(F0-S)
    F, w, rec2 = pf.compose(S1, lo, step, V, {'partBox': spec['partBox']}, log=log)
    rec2.update(rec)
    return F, w, rec2
