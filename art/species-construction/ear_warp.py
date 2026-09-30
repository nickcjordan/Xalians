"""Lift the lower outer edge of the Akinza ear-fan lobes by a monotone height compression.

Pure numpy, no Blender. Applied to world coordinates of the head (the head is modeled
at scale .50 with offset (0, -.02, .635); see shape_ear_front_field.py). Heights are
compressed toward a pivot just above the fan's top edge by a factor s that depends only
on the distance from the midline, z' = zp + (z - zp) * s(|x|). The face (|x| below .20)
keeps s = 1, so eyes, nose and mouth do not move. Beyond that s falls smoothly, so the
lobes keep their top edge and their span, while the lower edge climbs toward the outer
tip. The map is strictly monotone in z and continuous in x, so a closed connected mesh
stays closed and connected. Fitted by comparing the model's per-column lobe heights with
the first sheet's front view (lobe height as a fraction of figure height, at |x| .14 to .26
of figure height: reference .153, .152, .145, .121, .101, .078; model before .169, .166,
.156, .140, .124, .091).

Akinza-specific construction, not a species-general sculpting backend.
"""
import numpy as np

GRID = .0005
PIVOT_Z = .905
SIGMA = .015
# world |x| -> height scale
SCALE = [(0.0, 1.0), (.20, 1.0), (.26, .92), (.30, .90), (.34, .88), (.38, .85), (.42, .84), (1.0, .84)]


def _profile():
    x = np.array([p[0] for p in SCALE])
    v = np.array([p[1] for p in SCALE])
    grid = np.arange(-.05, 1.05, GRID)
    fine = np.interp(grid, x, v)
    radius = int(np.ceil(4*SIGMA/GRID))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)*GRID/SIGMA)**2)
    kernel /= kernel.sum()
    padded = np.pad(fine, radius, mode='edge')
    return grid, np.convolve(padded, kernel, mode='valid')


def warp_points(points):
    """Return the warped copy of an (n, 3) array of world coordinates."""
    p = np.asarray(points, dtype=np.float64).copy()
    grid, values = _profile()
    s = np.interp(np.abs(p[:, 0]), grid, values)
    p[:, 2] = PIVOT_Z+(p[:, 2]-PIVOT_Z)*s
    return p
