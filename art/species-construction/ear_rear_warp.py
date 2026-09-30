"""Thin the rear of the Akinza ear-fan lobes by a smooth monotone vertex warp.

Pure numpy, no Blender. Works in the head's own frame (the frame the head scene is saved
in; the model places it at scale .50 with offset (0, -.02, .635), see warp_ear_rear.py).

  y' = y - D(|x|, z) * S((y - ya) / (yb - ya))

S is a smoothstep. The front of the fan and the cup (y below ya) stay put; the rear of the
wall moves forward by up to D and the material between ya and yb is squeezed, so each lobe
becomes a thin shell in front of the skull instead of a thick slab flush with the back of the
head. D grows from zero at the skull's side (|x| about .26) to DMAX over WIDTH, so the skull
and crown keep their full depth and read as a rounded dome with the two lobes rooted on
either side of it. D fades to zero below the fan's lower edge (z below Z_FADE_LOW). For fixed
x and z the map is strictly increasing in y (D * max S' / (yb - ya) < 1), so a closed
connected mesh stays closed and connected and no seam is made.

Akinza-specific construction, not a species-general sculpting backend.
"""
import numpy as np

X0 = .26        # |x| where the thinning starts (the skull's side)
WIDTH = .14     # |x| span of the ramp from 0 to DMAX
DMAX = .11      # forward shift of the rear wall, head-local units
YA, YB = .09, .31
Z_FADE_LOW = (-.20, -.06)   # D is 0 at the first z and full at the second
TOP_SHRINK = 0.0            # how far the ramp start moves toward the midline at the crown (0: a straight crease)
TOP_RANGE = (0.0, .45)      # z span over which the ramp start moves; the skull edge curves in like a dome


def _smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def shift(points, x0=X0, width=WIDTH, dmax=DMAX, ya=YA, yb=YB, z_fade=Z_FADE_LOW,
          top_shrink=TOP_SHRINK, top_range=TOP_RANGE):
    """Forward shift (positive) of each head-local point."""
    p = np.asarray(points, dtype=np.float64)
    edge = x0-top_shrink*_smoothstep((p[:, 2]-top_range[0])/(top_range[1]-top_range[0]))
    d = dmax*_smoothstep((np.abs(p[:, 0])-edge)/width)*_smoothstep((p[:, 2]-z_fade[0])/(z_fade[1]-z_fade[0]))
    return d*_smoothstep((p[:, 1]-ya)/(yb-ya))


def warp_points(points, **kw):
    """Return the warped copy of an (n, 3) array of head-local coordinates."""
    p = np.asarray(points, dtype=np.float64).copy()
    p[:, 1] -= shift(p, **kw)
    return p
