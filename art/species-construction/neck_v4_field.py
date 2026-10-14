"""Neck v4 (numpy only): neck v3 with the underside of the jaw carved up into a clean line and a soft hollow, so the chin
reads with one edge and nothing bulges below it.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index.

Why (Nick, 2026-10-13, on neck v3's side view: "it still has a bit of a double chin ... It looks like it's adding a second
chin where it should go the other way to provide the first chin a little bit more definition"). Measured on assembled-3199:
the underside of the jaw at the midline falls steadily from the chin (z .526 at y -.19) to z .483 at y -.11 before the throat
turns down, so from the side it reads as a round second lobe sagging below the jaw line. It is the old head skin (the jaw
underside the earlier neck steps never shaped), exposed once neck v3 moved the throat back.

  zu(y, x)        the target jaw underside: a natural spline through `jaw.profile` (z at y on the midline, rising slightly
                  from the chin toward the jaw angle) plus `jaw.lateral` x^2, so it stays rounded across
  carve           Sc = smax(S, zu - z, k) under a mask (|x| band, y band from behind the chin to the front of the neck,
                  z band under the jaw): all material below the target line is removed there
  then            neck_v3_field.compose(Sc, ...): v3's column, cut to its throat line, is joined to the carved skin by smooth
                  minimum, which leaves a soft concave hollow where the new jaw line meets the throat; the back of the neck
                  is outside the carve mask, so it is v3's
"""
import numpy as np

from neck_v1_field import natural_spline, smootherstep, grid_coords
import neck_v3_field as n3
import pelvis_v1_field as pf


def smax(a, b, k):
    h = np.clip(0.5+0.5*(a-b)/k, 0.0, 1.0)
    return a*h+b*(1-h)+k*h*(1-h)


def carve(S, lo, step, J):
    X, Y, Z = grid_coords(lo, step, S.shape)
    ys, zs = np.array(J['profile'], float).T
    o = np.argsort(ys)
    zu = natural_spline(ys[o], zs[o])(Y)+J.get('lateral', 0.0)*X**2
    w = pf.box_weight(X, Y, Z, J['mask'])
    Sc = smax(S, zu-Z, J['k'])
    return S+w*(Sc-S), w


def compose(S, lo, step, V, spec, log=print):
    Sc, wc = carve(S, lo, step, spec['jaw'])
    log('jaw underside carved')
    rest = {k: v for k, v in spec.items() if k != 'jaw'}
    F, w, rec = n3.compose(Sc, lo, step, V, rest, log=log)
    return F, np.maximum(w, wc), rec
