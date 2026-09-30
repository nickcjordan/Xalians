"""Smooth silhouette-matching warp for the Akinza neck, shoulders and upper chest.

Pure numpy, no Blender. Every vertex moves by a smooth, monotone map, so a
closed connected mesh stays closed and connected and no seam or ring is made:

    x' = x * sx(z)
    y' = cy(z) + (y - cy(z)) * (1 + (sy(z) - 1) * wx(x) * wy(y))

sx and sy are z-profiles given as control tables (world z, factor), linearly
interpolated on a fine grid and then Gaussian smoothed in z. Each table entry is
the ratio of a target half extent to the measured extent at that height, so the
warp is a direct edit of the section widths the loop's measurements report.
The map is triangular (x' depends on x,z; y' on all), so its Jacobian
determinant is sx*(y-scale) > 0 everywhere and it cannot fold the surface.

Akinza-specific construction, not a species-general sculpting backend.
"""
import numpy as np

GRID = .0005

# Body: half-width factor from the section widths of assembled-0156 and the
# preferred first sheet's front silhouette (fractions of figure height 1.8605).
BODY = {
    'sigma': .006,
    # world z -> x factor. Target half widths: .150 at .40, .170 at .39,
    # .192 at .38, .206 at .36, .222 at .345, .250 at .308, .2755 at .271.
    'x': [(.20, 1.0), (.24, .95), (.271, .90), (.308, .86), (.345, .80), (.36, .78), (.38, .79),
          (.39, .735), (.40, .70), (.41, 1.0), (.44, 1.0)],
    # world z -> depth factor about the section center cy. Target depths (fraction
    # of the measured depth): the neck base .63, upper back .71, chest .84.
    'y': [(.20, 1.0), (.24, 1.0), (.271, .96), (.308, .84), (.345, .75), (.383, .71),
          (.40, .65), (.41, .64), (.425, .63), (.44, .63)],
    'cy': [(.20, -.02), (.271, -.015), (.308, -.008), (.345, -.002), (.383, .007),
           (.42, .0125), (.44, .0)],
    # x window for the depth factor: full inside .22, gone by .32 (keeps the arms).
    'windowX': (.22, .32),
    # y window: torso only, never the tails behind the pelvis.
    'windowY': (.20, .30),
}

# Head neck stub, in world z above the assembly's head trim plane at .452.
HEAD = {
    'sigma': .004,
    'x': [(.38, .74), (.452, .74), (.470, .74), (.500, 1.0), (.55, 1.0)],
    'y': [(.38, .66), (.452, .66), (.463, .66), (.477, 1.0), (.55, 1.0)],
    'cy': [(.38, -.0095), (.55, -.0095)],
    'windowX': (10., 11.),
    'windowY': (10., 11.),
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
    smooth = np.convolve(padded, kernel, mode='valid')
    return grid, smooth


def _smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def warp_points(points, spec):
    """Return the warped copy of an (n, 3) array of world coordinates."""
    p = np.asarray(points, dtype=np.float64).copy()
    z = p[:, 2]
    gx, sx = _profile(spec['x'], spec['sigma'])
    gy, sy = _profile(spec['y'], spec['sigma'])
    gc, cy = _profile(spec['cy'], spec['sigma'])
    fx = np.interp(z, gx, sx, left=1.0, right=1.0)
    fy = np.interp(z, gy, sy, left=1.0, right=1.0)
    c = np.interp(z, gc, cy)
    ax = np.abs(p[:, 0])
    wx = 1-_smoothstep((ax-spec['windowX'][0])/(spec['windowX'][1]-spec['windowX'][0]))
    wy = 1-_smoothstep((np.abs(p[:, 1])-spec['windowY'][0])/(spec['windowY'][1]-spec['windowY'][0]))
    new_x = p[:, 0]*fx
    new_y = c+(p[:, 1]-c)*(1+(fy-1)*wx*wy)
    p[:, 0], p[:, 1] = new_x, new_y
    return p
