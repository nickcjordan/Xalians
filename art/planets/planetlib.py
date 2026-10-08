"""Shared parts of the living planets (art/planets/<world>/): seamless noise on the sphere, wrapped blurs, relief shading, the
orthographic lens and the sun's night overlay. Extracted from Zolton, the approved first planet; a world's textures.py imports
everything from here, calls use(its folder), draws its own maps, then calls lens() and sun().
"""
import math
import os

import numpy as np
from PIL import Image, ImageFilter

OUT = None  # set by use(): the world's out/ folder


def use(folder):
    global OUT
    OUT = os.path.join(folder, 'out')
    os.makedirs(OUT, exist_ok=True)
    return OUT
W, H = 2048, 1024  # the maps: longitude across, latitude down (2048 so the large planet stays crisp)
K = W / 1024  # per-pixel slopes shrink as the map grows
rng = np.random.default_rng(606)
PERM = rng.permutation(4096)


def _hash(ix, iy, iz):
    return (PERM[(PERM[(PERM[ix & 4095] + iy) & 4095] + iz) & 4095] / 4095.0)


def vnoise(x, y, z):
    """Smooth value noise in 3D, -1..1."""
    ix, iy, iz = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    fx, fy, fz = x - ix, y - iy, z - iz
    sx, sy, sz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (sx if dx else 1 - sx) * (sy if dy else 1 - sy) * (sz if dz else 1 - sz)
                out = out + w * _hash(ix + dx, iy + dy, iz + dz)
    return out * 2 - 1


def _rot(seed):
    q = np.random.default_rng(seed).normal(size=4)
    q /= np.linalg.norm(q)
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]], np.float32)


ROTS = [_rot(100 + i) for i in range(16)]


def rnoise(x, y, z, o=0):
    """Value noise with its lattice turned at random, so its creases never line up with the map's rows (as horizontal lines)."""
    m = ROTS[o % 16]
    return vnoise(m[0, 0] * x + m[0, 1] * y + m[0, 2] * z, m[1, 0] * x + m[1, 1] * y + m[1, 2] * z, m[2, 0] * x + m[2, 1] * y + m[2, 2] * z)


def fbm(x, y, z, octaves=6, lac=2.03, gain=.5):
    a, f, s, n = 1.0, 1.0, 0.0, 0.0
    for o in range(octaves):
        s += a * rnoise(x * f + 17.1 * o, y * f + 3.7 * o, z * f + 9.3 * o, o)
        n += a
        a *= gain
        f *= lac
    return s / n


def ridged(x, y, z, octaves=5):
    a, f, s, n = 1.0, 1.0, 0.0, 0.0
    for o in range(octaves):
        r = 1 - np.abs(vnoise(x * f + 5.3 * o, y * f + 11.9 * o, z * f + 2.1 * o))
        s += a * r * r
        n += a
        a *= .5
        f *= 2.1
    return s / n


# the cylinder: longitude around, latitude up; equal-area-ish in latitude is not needed at this scale
lon = (np.arange(W) + .5) / W * 2 * math.pi
lat = ((np.arange(H) + .5) / H - .5) * math.pi
LON, LAT = np.meshgrid(lon, lat)
CX, CY, CZ = (np.cos(LON) * np.cos(LAT)).astype(np.float32), (np.sin(LON) * np.cos(LAT)).astype(np.float32), np.sin(LAT).astype(np.float32)  # points on the unit sphere: no seam, no pinch


def S(k):
    return CX * k, CY * k, CZ * k


def save(name, arr, mode):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode).save(os.path.join(OUT, name))


def lerpc(a, b, t):
    a, b = np.array(a, float), np.array(b, float)
    return a + (b - a) * t[..., None]


def hexc(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def pct(a, lo, hi):
    """Rescale so the lo and hi percentiles land on 0 and 1."""
    l, h = np.percentile(a, lo), np.percentile(a, hi)
    return np.clip((a - l) / (h - l), 0, 1)


def swirl(x, y, z, centers):
    """Twist the sphere's points around a few storm centers (cyclones), strongest at each eye."""
    for (cx_, cy_, cz_, strength, size) in centers:
        k = np.array([cx_, cy_, cz_], float)
        k /= np.linalg.norm(k)
        d = np.arccos(np.clip(x * k[0] + y * k[1] + z * k[2], -1, 1))
        th = strength * np.exp(-(d / size) ** 2)
        c, s = np.cos(th), np.sin(th)
        kx = k[1] * z - k[2] * y
        ky = k[2] * x - k[0] * z
        kz = k[0] * y - k[1] * x
        kd = k[0] * x + k[1] * y + k[2] * z
        x, y, z = (x * c + kx * s + k[0] * kd * (1 - c), y * c + ky * s + k[1] * kd * (1 - c), z * c + kz * s + k[2] * kd * (1 - c))
    return x, y, z


def wblur(a, r):
    """Gaussian blur that wraps east to west, so a blurred map meets itself without a seam."""
    pad = int(r * 4) + 2
    ext = np.concatenate([a[:, -pad:], a, a[:, :pad]], axis=1)
    out = np.array(Image.fromarray((np.clip(ext, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), float) / 255
    return out[:, pad:-pad]


def smooth(e0, e1, x):
    u = np.clip((x - e0) / (e1 - e0), 0, 1)
    return u * u * (3 - 2 * u)


def relief(h, k, light=(.55, .45)):
    """Shade a height field from a fixed northwest light."""
    gy, gx = np.gradient(h)
    return 1 + (gx * light[0] + gy * light[1]) * k * K




def lens():
    # ---- the lens: an orthographic sphere as a displacement map. For each pixel of the disc, how far to reach into the flat
    # map (laid out at one map pixel per radian of radius) for the point of the sphere seen there.
    global N, xn, yn, r2, inside
    N = 512
    yy, xx = np.mgrid[0:N, 0:N]
    xn = (xx + .5) / N * 2 - 1
    yn = (yy + .5) / N * 2 - 1
    r2 = xn * xn + yn * yn
    inside = r2 < 1.0
    yc = np.clip(yn, -.999999, .999999)
    la = np.arcsin(yc)
    cosla = np.sqrt(1 - yc * yc)
    lo = np.arcsin(np.clip(xn / cosla, -1, 1))
    dx = np.where(inside, lo - xn, 0)  # in units of the radius
    dy = np.where(inside, la - yn, 0)
    MAXD = math.pi / 2 - 1
    d = np.zeros((N, N, 3))
    d[..., 0] = (dx / (2 * MAXD) + .5) * 255
    d[..., 1] = (dy / (2 * MAXD) + .5) * 255
    d[..., 2] = 128
    # dithered before rounding: the 8-bit steps become a fine grain instead of stair-steps and sheared rows, and the browser's
    # smoothing of the map averages the grain back toward the true value
    dith = np.random.default_rng(7).uniform(-.5, .5, (N, N, 1))
    q = np.clip(np.round(d + np.where(inside[..., None], dith, 0)), 0, 255)
    q[..., 2] = 128
    save('lens.png', q, 'RGB')

    with open(os.path.join(OUT, 'lens.txt'), 'w') as fh:
        fh.write('%.6f' % (2 * MAXD))  # the displacement scale, in radii



def sun(direction=(-.86, -.32, .36), soft=(.05, .45), night_color='#03040e', night_alpha=.96):
    """The sun on the disc: Lambert light from `direction`, a terminator softened over `soft`, a night overlay of
    `night_color` and its complement as a mask for the night side's own light."""
    # ---- the sun on the disc: Lambert light from the upper left, a soft terminator, and its complement for the night layer
    sun = np.array(direction, float)
    sun /= np.linalg.norm(sun)
    zn = np.sqrt(np.clip(1 - r2, 0, 1))
    lam = xn * sun[0] + yn * sun[1] + zn * sun[2]
    day = np.clip((lam + soft[0]) / soft[1], 0, 1) ** 1.2
    dark = np.zeros((N, N, 4))
    dark[..., :3] = hexc(night_color)
    dark[..., 3] = np.where(inside, (1 - day) * night_alpha * 255, 0)
    save('night.png', dark, 'RGBA')
    nm = np.zeros((N, N, 4))
    nm[..., :3] = 255
    nm[..., 3] = np.where(inside, np.clip(1 - day * 1.3, 0, 1) * 255, 0)
    save('nightmask.png', nm, 'RGBA')
