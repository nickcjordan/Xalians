"""Heel v3 (numpy only): heel v2's sole pads kept; the heel back reshaped into one round mass before its corner is filleted, the
side wall rolled into the sole in one rounded edge, and the heel's floor contact blended into the heel's underside (anatomy
review 2026-10-13, finding 7; Nick, 2026-10-14, on heel v2: "7: I am fine with how it is now", so the heel stays flat on the
floor).

Heel v2 left three things (coordinator, 2026-10-14): from the side the raised sole left a horizontal shelf along the bottom of
the foot's side and the toe pads stood proud below it like table feet; from behind a low dimple (its corner fillet was one
cylinder across a narrow, ridged heel back) and a lumpy bottom edge; from below the heel's contact patch read as a sixth pad.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive outside),
never of a vertex index. The spec is written for the +x foot; every mass is mirrored to both sides. In order:

  blurX      [blurX] across-the-foot blurs over the heel back, as heel v1 and v2
  heel       [heel] the heel back morphed toward one ellipsoid (a round mass the heel's own size): F + w (E - F), w a smooth
             ellipsoid mask over the heel back, so the leg column's ridge and the grooves beside it become one round surface
             whose horizontal radius is larger than the corner fillet's, so the fillet below can meet it tangentially
  closings   [closings] morphological closings (fill only, where the surface is concave with a radius under r) over the
             heel back: the alternative to [heel], it rounds the heel back without changing its size
  lift       [lift] the sole moved up by a vertical shift, as heel v2 (side walls stay put), with nothing lifted on the heel's
             contact and a wide fade round it, so the heel's underside rises gently into the sole instead of stepping
  openings   [openings] ball openings (heel_v2_field.opening), before the pads are joined: a small radius over the whole bottom
             of the foot rolls the side wall into the sole in one rounded edge (no shelf), and a larger one over the heel takes
             the back-bottom corner as one fillet tangent to the rounded heel back and to the floor
  closingsAfter [closingsAfter] closings run after the openings (fill only): the concavities the corner opening leaves
             where it cuts the sides of the heel's bottom more than its middle
  keep       [keepContact] the heel's contact core kept exactly on the floor plane (as heel v2)
  pads       [pads] heel v2's pads (flattened ellipsoid domes on the foot's own underside, clipped at the floor, joined by a
             small smooth minimum), joined last so the openings never touch them
  openingsAfterPads [openingsAfterPads] a small ball opening over the sole after the pads (as heel v2's rim opening),
             which trims the soft skirt round each pad so the pads read as crisp domes
  S1 = S + wbox (edits); F = pelvis_v1_field.compose(S1, ...) with [partBox], outside which F is S exactly.
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, grid_coords
import pelvis_v1_field as pf
import heel_v2_field as h2


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    rec = {}
    F0 = h2.blur_x(S.copy(), X, Y, Z, step, spec.get('blurX', []), log)
    H = spec.get('heel')
    if H:
        E = h2.ellipsoid_d(np.abs(X), Y, Z, H['target']['c'], H['target']['s'])
        m = H['mask']
        e = np.sqrt(((np.abs(X)-m['c'][0])/m['s'][0])**2+((Y-m['c'][1])/m['s'][1])**2+((Z-m['c'][2])/m['s'][2])**2)
        w = H.get('weight', 1.0)*smootherstep((m['fade'][1]-e)/(m['fade'][1]-m['fade'][0]))
        F0 = F0+w*(E-F0)
        log('heel back morphed toward one round mass')
    for cl in spec.get('closings', []):
        # a closing only adds material, where the surface is concave with a radius under r: the grooves beside the leg
        # column's ridge on the heel back fill, so the heel back becomes one round mass of its own size
        reg = pf.box_weight(X, Y, Z, cl['box'])
        D = -h2.opening(-F0, lo, step, cl['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
        log(f'closing r {cl["r"]}')
    L = spec.get('lift')
    if L:
        zf = L['floorZ']
        wz = smootherstep((zf+L['band'][1]-Z)/(L['band'][1]-L['band'][0]))
        hh = L['heel']
        e = np.sqrt(((np.abs(X)-hh['c'][0])/hh['s'][0])**2+((Y-hh['c'][1])/hh['s'][1])**2)
        wy = 1-smootherstep((hh['fade'][1]-e)/(hh['fade'][1]-hh['fade'][0]))
        wx = pf.box_weight(X, Y, Z, {'x': L['x']})
        F0 = h2.shift_z(F0, L['depth']*wz*wy*wx/step)
        log('sole lifted')
    Fpre = F0.copy()
    for op in spec.get('openings', []):
        reg = pf.box_weight(X, Y, Z, op['box'])
        D = h2.opening(F0, lo, step, op['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
    for cl in spec.get('closingsAfter', []):
        # closings after the openings: they also fill the small concavities the corner opening leaves where it cuts the
        # sides of the heel's bottom more than its middle
        reg = pf.box_weight(X, Y, Z, cl['box'])
        D = -h2.opening(-F0, lo, step, cl['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
        log(f'closing (after the openings) r {cl["r"]}')
    K = spec.get('keepContact')
    if K:
        e = np.sqrt(((np.abs(X)-K['c'][0])/K['s'][0])**2+((Y-K['c'][1])/K['s'][1])**2)
        wk = smootherstep((K['fade'][1]-e)/(K['fade'][1]-K['fade'][0]))
        if 'yMax' in K:
            # only in front of the corner fillet's tangent point, or the restored sharp floor meets the fillet in a crease
            wk = wk*smootherstep((K['yMax'][1]-Y)/(K['yMax'][1]-K['yMax'][0]))
        wk = wk*smootherstep((K['floorZ']+K['band'][1]-Z)/(K['band'][1]-K['band'][0]))
        F0 = F0+wk*(np.minimum(F0, Fpre)-F0)
        log('heel contact kept on the floor')
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
        # as heel v2 did after its pads: a small ball opening trims the soft skirt round each pad, so the pads read as crisp
        # domes with a clean groove (it only removes material, and only where the surface is convex with a radius under r)
        reg = pf.box_weight(X, Y, Z, op['box'])
        D = h2.opening(F0, lo, step, op['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(F0-S)
    F, w, rec2 = pf.compose(S1, lo, step, V, {'partBox': spec['partBox']}, log=log)
    rec2.update(rec)
    return F, w, rec2
