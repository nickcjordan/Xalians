"""Heel v6, the sole (numpy only): sole v5 refined toward the lion's sole (coordinator ruling, 2026-10-14: the toe pads may move
back about .01; the toes, the foot's outline, width and length stay held): the toe pads moved back and every pad enlarged so they
fill most of the sole, the main pad's front coming to a soft point between the two middle toe pads, clefts about .01 deep only
between the pads (an extra lift that fades to zero before the rim, so the side wall prints no shelf), and fatter cushions (a
fuller profile that rises steeply at the edge, so the edge reads rounded and slightly undercut at the clefts).
Sole v5's history follows, for the shared parts. Heel v5, the sole: heel v4's authored heel back kept; the pads rebuilt after a lion's sole (Nick, 2026-10-14,
with a reference photo of a lion's foot: "i think the sole still needs work. It is minor in the overall model but looks bad. Can
you make it look closer to this example of the sole of a lion foot?"): four large oval toe pads in a tight arc and one large
main pad, a rounded triangle with a three-lobed rear, nesting behind the toe arc and reaching back under the ankle, each a
cushion with a clean rounded edge and only narrow clefts between them. Heel v4's history, kept for the shared parts: Nick, 2026-10-14, on heel v3's sole: "it looks like
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
             With inside, the lift is limited to an ellipse inside the sole's outline (faded out before the side walls).
  openings   [openings] a small ball opening over the bottom of the foot rolls the side wall into the sole (as heel v3)
  pads       [pads] the four toe pads as heel v2 and v3, and the main pad moved back under the ankle (a body and three lobes
             pointing back toward the heel); flattened ellipsoid domes on the foot's own underside, clipped at the floor, joined by
             a small smooth minimum
             A pad with outline is a cushion instead: its plan a smooth union of ellipses, its underside on the floor inside
             and rising by rise toward the outline over an edge band, so a many-lobed pad is still one shape with a clean edge.
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
        if 'inside' in L:
            # only inside the sole's outline (an ellipse in x, y, faded out before the side walls), so the walls come down to the
            # floor and the lifted skin between the pads never prints a shelf on the foot's side
            so = L['inside']
            e = np.sqrt(((np.abs(X)-so['c'][0])/so['s'][0])**2+((Y-so['c'][1])/so['s'][1])**2)
            wx = wx*smootherstep((so['fade'][1]-e)/(so['fade'][1]-so['fade'][0]))
        if 'heel' in L:
            # nothing lifted on the heel behind and round the main pad's rear: the heel's underside comes down onto the floor
            # and the main pad merges into it as its weight-bearing pad (a lifted heel stood on the pad like a plinth)
            hh = L['heel']
            e = np.sqrt(((np.abs(X)-hh['c'][0])/hh['s'][0])**2+((Y-hh['c'][1])/hh['s'][1])**2)
            wx = wx*(1-smootherstep((hh['fade'][1]-e)/(hh['fade'][1]-hh['fade'][0])))
        d = L['depth']*wz*wx
        if 'extra' in L:
            # deeper clefts only between the pads: an extra lift inside an ellipse well inside the sole's outline, faded to zero
            # before the rim, so the rim and the side wall keep the ordinary lift (no shelf)
            ex = L['extra']
            e = np.sqrt(((np.abs(X)-ex['c'][0])/ex['s'][0])**2+((Y-ex['c'][1])/ex['s'][1])**2)
            d = d+ex['depth']*wz*smootherstep((ex['fade'][1]-e)/(ex['fade'][1]-ex['fade'][0]))
        F0 = h2.shift_z(F0, d/step)
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
                if pad.get('outline'):
                    # a cushion: the pad's plan is a smooth union of ellipses (in x, y; k outlineK), and its underside is lowest
                    # (on the floor) inside and rises by `rise` toward the outline over a band `edge` wide, so the pad is one
                    # cushion with a clean rounded edge however many lobes its plan has
                    d2 = None
                    for lb in pad['lobes']:
                        cx2, cy2 = side*lb['c'][0], lb['c'][1]
                        e2 = np.sqrt(((X-cx2)/lb['s'][0])**2+((Y-cy2)/lb['s'][1])**2)
                        di = (e2-1)*min(lb['s'][0], lb['s'][1])
                        d2 = di if d2 is None else smin3(d2, di, pad.get('outlineK', .008))
                    if pad.get('blur2d'):
                        # the smooth union of ellipse distances is only approximate: where lobes join, its contours bunch and
                        # the cushion's edge band prints a crease across the pad; a Gaussian blur in plan (x, y) evens them
                        sig = pad['blur2d']/step
                        rad = int(np.ceil(3*sig))
                        kk = np.exp(-0.5*(np.arange(-rad, rad+1)/sig)**2)
                        kk /= kk.sum()
                        for ax in (0, 1):
                            pad_w = [(0, 0)]*3
                            pad_w[ax] = (rad, rad)
                            q = np.pad(d2, pad_w, mode='edge')
                            acc = np.zeros_like(d2)
                            for j, kv in enumerate(kk):
                                sl = [slice(None)]*3
                                sl[ax] = slice(j, j+d2.shape[ax])
                                acc += kv*q[tuple(sl)]
                            d2 = acc
                    t_in = np.clip(-d2/pad['edge'], 0, 1)
                    # the cushion's base is the foot's own underside at the pad center (the floor, or a toe's underside where
                    # the toe curves up), so a toe pad follows its toe instead of flattening it to the floor
                    if pad.get('profile') == 'fat':
                        # a fat cushion: the underside rises steeply at the edge ((1 - t)^p) and is nearly flat over the
                        # pad's face, so the pad stays proud of the skin to its edge and the edge reads rounded and undercut
                        prof = (1-t_in)**pad.get('power', 2.0)
                    else:
                        prof = 1-t_in*t_in*(3-2*t_in)
                    bottom = zu-pad.get('sink', P['sink'])+pad['rise']*prof
                    D = np.maximum(d2, bottom-Z)
                    D = np.maximum(D, zf-Z)
                    # capped a little above the floor, inside the foot (an uncapped column would reach out of the foot above)
                    D = np.maximum(D, Z-(zu+pad.get('cap', .016)))
                    F0 = smin3(F0, D, P['padK'])
                    continue
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
