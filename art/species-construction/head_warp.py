"""Round the Akinza head silhouette by a smooth monotone vertex warp.

Pure numpy, no Blender. Applied to world coordinates of the head (the head is
modeled at scale .50 with offset (0, -.02, .635); see warp_head_field.py).
Two maps, composed, each strictly monotone in the coordinate it changes, so a
closed connected mesh stays closed and connected and no seam or ring is made:

  1. Rear depth. y' = y + d(z) * S((y - ya) / (yb - ya)), S a smoothstep. The
     face and the front rim of the fan (y below ya) stay put; the rear of the
     skull and fan moves back by up to d(z), so the profile becomes a round
     dome behind the eyes instead of a thin crest.
  2. Jaw taper. x' = sign(x) * g(|x|), g(a) = a - (1 - k(z)) * s(a - x0), with
     s(u) a ramp whose slope goes from 0 to 1 over c. The central face (|x| up
     to about x0, the mouth and nose) keeps its width; the cheek tufts and the
     lower fan tips pull in toward a small chin and a narrower back of the skull.

Akinza-specific construction, not a species-general sculpting backend.
"""
import numpy as np

GRID = .0005

# Profile of the rear extension, world z -> distance (world units).
DEPTH = {
    'sigma': .012,
    'd': [(.44, 0.0), (.47, 0.0), (.494, -.04), (.531, -.03), (.55, -.012), (.569, .012), (.606, .03),
          (.643, .03), (.68, .035), (.717, .03), (.755, .05), (.792, .065), (.829, .07), (.866, .033),
          (.90, .02), (.93, .02)],
    'ya': -.10,
    'yb': .06,
}

# Jaw taper: world z -> k, the slope of x' against x outside the central face.
TAPER = {
    'sigma': .008,
    'k': [(.44, 1.0), (.47, 1.0), (.494, .55), (.531, .32), (.55, .48), (.569, .68),
          (.585, .82), (.60, .92), (.62, .98), (.66, 1.0), (.95, 1.0)],
    'x0': .04,
    'c': .10,
}


def _profile(table, sigma):
    z = np.array([p[0] for p in table])
    v = np.array([p[1] for p in table])
    grid = np.arange(z[0]-.05, z[-1]+.05, GRID)
    fine = np.interp(grid, z, v)
    radius = int(np.ceil(4*sigma/GRID))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)*GRID/sigma)**2)
    kernel /= kernel.sum()
    padded = np.pad(fine, radius, mode='edge')
    return grid, np.convolve(padded, kernel, mode='valid')


def _smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def _ramp(u, c):
    """Integral of a slope that rises from 0 to 1 over c, then stays 1."""
    u = np.maximum(u, 0.0)
    return np.where(u < c, u*u/(2*c), u-c/2)


def warp_points(points, depth=DEPTH, taper=TAPER):
    """Return the warped copy of an (n, 3) array of world coordinates."""
    p = np.asarray(points, dtype=np.float64).copy()
    z = p[:, 2]
    gd, dd = _profile(depth['d'], depth['sigma'])
    extension = np.interp(z, gd, dd, left=0.0, right=dd[-1])
    p[:, 1] = p[:, 1]+extension*_smoothstep((p[:, 1]-depth['ya'])/(depth['yb']-depth['ya']))
    gk, kk = _profile(taper['k'], taper['sigma'])
    k = np.interp(z, gk, kk, left=1.0, right=1.0)
    ax = np.abs(p[:, 0])
    g = ax-(1-k)*_ramp(ax-taper['x0'], taper['c'])
    p[:, 0] = np.sign(p[:, 0])*g
    return p
