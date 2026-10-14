"""Hands v1 (numpy only): the forepaw's lumps cleaned into four digits with shallow separations, one palm pad and four digit
pads, a nail-bed rise at each digit tip for its claw, and the crease band on the back of the hand smoothed.

World units, +y toward the back, z up. The arms hang with the paw pointing down: the palm faces the body (-x on the +x
side), the back of the hand faces out (+x), and the four digits stand in a row along y with their tips at the bottom of
the paw (z about -.20). Every edit is a function of position on the skin's signed distance S (positive outside), never of
a vertex index; every mass is mirrored to the -x paw (the step runs one grid per paw).

Why (anatomy review 2026-10-13, finding 8; Nick, 2026-10-13: "Yes, fix all ten of them."): the paw read as a mitten,
digits as small lumps at the very end with no separation, the palm lumpy with irregular crevices instead of clean pads,
and a crease band across the back of the hand above the knuckles.

  F0 = S + wb (blur(S) - S)             [blurs] the old lumps, palm ridges and crevices and the crease band on the back of
                                        the hand averaged out first, so nothing of them survives under the new forms
  F0 = F0 + erode                       [erode] the paw end pulled in a little, so the digits below define it
  F1 = smin3(F0, digits, k)             [digits] one elliptic tapered capsule per digit (knuckle to tip, narrower across
                                        the row than front to back: ySquash), joined with a smooth minimum: where two
                                        neighbours meet a shallow valley is left between them (the digit separations)
  F2 = F1 + grooves                     [grooves] optional light Gaussian grooves along the separations
  F3 = F2 - domes                       [pads] domed mounds (height h (1 - e^2)^2 inside the ellipsoid) on the palm side:
                                        one palm pad and one pad under each digit tip; [nailBeds] small domes on the back
                                        of each digit tip where its claw leaves the skin
  F  = S + w (F3 - S)                   w is the part box (the paw below the wrist): outside it the field is S exactly
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, grid_coords, gaussian_blur3
import pelvis_v1_field as pf


def ell(X, Y, Z, c, s):
    return np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)


def domes(X, Y, Z, items, side):
    out = np.zeros_like(X)
    for m in items:
        c = np.array(m['c'], float)*np.array([side, 1, 1])
        e = ell(X, Y, Z, c, m['s'])
        q = np.clip(1-e*e, 0, None)
        out += m['h']*q*q
    return out


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    side = 1 if lo[0]+hi_x(S, lo, step) > 0 else -1
    rec = {'side': side}
    F = S
    for bl in spec.get('blurs', []):
        c = np.array(bl['c'], float)*np.array([side, 1, 1])
        wb = smootherstep((bl['fade'][1]-ell(X, Y, Z, c, bl['s']))/(bl['fade'][1]-bl['fade'][0]))
        F = F+wb*(gaussian_blur3(F, bl['sigma']/step)-F)
    log('lumps blurred')
    for er in spec.get('erode', []):
        c = np.array(er['c'], float)*np.array([side, 1, 1])
        F = F+er['depth']*smootherstep((er['fade'][1]-ell(X, Y, Z, c, er['s']))/(er['fade'][1]-er['fade'][0]))
    D = None
    for m in spec.get('digits', []):
        d = pf.capsule_field(X, Y, Z, m, side)
        D = d if D is None else np.minimum(D, d)
    if D is not None:
        F = smin3(F, D, spec['digitK'])
    log('digits joined')
    for g in spec.get('grooves', []):
        pts = np.array(g['points'], float)*np.array([side, 1, 1])
        P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
        d, fr = pf.polyline_distance(P, pts)
        amp = np.interp(fr, *zip(*g['depthAlong']))
        F = F+(g['depth']*amp*np.exp(-(d/g['sigma'])**2)).reshape(X.shape)
    bump = domes(X, Y, Z, spec.get('pads', []), side)+domes(X, Y, Z, spec.get('nailBeds', []), side)
    F = F-bump
    w = pf.box_weight(X, Y, Z, spec['partBox'])
    F = S+w*(F-S)
    rec['padMax'] = float(bump.max())
    log('pads and nail beds added')
    return F, w, rec


def hi_x(S, lo, step):
    return step*(S.shape[0]-1)
