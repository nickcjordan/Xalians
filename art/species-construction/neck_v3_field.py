"""Neck v3 (numpy only): the neck column of neck v2 with its front cut back to a forward-leaning throat line.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index.

Why (Nick, 2026-10-13, on neck v2's side view: "It looks like it has a neck brace on"): neck v2's column (elliptic capsule
z .38 to .52) plus its throat mass made the front of the neck a vertical wall from the jaw straight down to the chest, at
y about -.13 from z .49 to .38, meeting the underside of the jaw in a crease right under the chin. A shaved fox or cat neck
leaves the underside of the jaw well back, near the jaw angle, and leans forward out of the chest.

  front(z)        the throat line in the side view, through `front` points (y at each z), linear between them
  limiter         a cylinder of radius R round an axis parallel to the throat line, R behind it, so the front of the neck
                  is rounded across (radius R) and leans forward with the line
  column'         smooth max of the column capsules and the limiter (k `cutK`): the column keeps v2's back and sides and
                  loses everything in front of the throat line
  S1 = S + wbox (smin(S, column', k) - S)
  F = pelvis_v1_field.compose(S1, ...) with the remaining keys (nape lobe, masked blurs, part box)
The head is not cut: the limiter only trims the added column, so the jaw, the chin and their underside stay the old skin,
and the smooth minimum gives the soft concave join between the jaw underside and the throat.
"""
import numpy as np

from neck_v1_field import smin3, grid_coords
import pelvis_v1_field as pf


def front_limiter(X, Y, Z, F):
    zs, ys = np.array(F['points'], float).T[[1, 0]]
    order = np.argsort(zs)
    zs, ys = zs[order], ys[order]
    R = F['R']
    # direction of the line in the yz plane (fit), normal pointing back (+y)
    sl = np.polyfit(zs, ys, 1)[0]                     # dy/dz
    t = np.array([sl, 1.0])
    t /= np.linalg.norm(t)
    n = np.array([t[1], -t[0]])                       # normal in (y, z)
    if n[0] < 0:
        n = -n
    yl = np.interp(Z, zs, ys, left=None, right=None)
    # distance of (y, z) from the line measured along the normal, positive behind it
    db = (Y-yl)*n[0]
    # cylinder axis R behind the line: distance to axis in the plane normal to t is sqrt(x^2 + (db - R)^2)
    return np.sqrt(X**2+(db-R)**2)-R


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    col = None
    for m in spec['columns']:
        c = pf.capsule_field(X, Y, Z, m, 1)
        col = c if col is None else smin3(col, c, m.get('unionK', .01))
    lim = front_limiter(X, Y, Z, spec['front'])
    cut = -smin3(-col, -lim, spec['front']['cutK'])
    joined = smin3(S, cut, spec['joinK'])
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(joined-S)
    log('column cut to the throat line and joined')
    rest = {k: v for k, v in spec.items() if k not in ('columns', 'front', 'joinK')}
    F, w, rec = pf.compose(S1, lo, step, V, rest, log=log)
    return F, w, rec
