"""Zolton's textures for the living planet: an equirectangular surface (metal peaks, frozen canyons), the canyons' rivers of
electricity, storm clouds and their shadow, plus the orthographic lens (a displacement map) and the sun's light on the disc.

Every map wraps in longitude (noise sampled on a cylinder), so a strip of it can slide behind the lens forever.
Run from the repo root: python art/planets/zolton/textures.py  (writes art/planets/zolton/out/)
"""
import math
import os

import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)
W, H = 1024, 512  # the surface maps: longitude across, latitude down
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


def fbm(x, y, z, octaves=6, lac=2.03, gain=.5):
    a, f, s, n = 1.0, 1.0, 0.0, 0.0
    for o in range(octaves):
        s += a * vnoise(x * f + 17.1 * o, y * f + 3.7 * o, z * f + 9.3 * o)
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
CX, CY, CZ = np.cos(LON) * np.cos(LAT), np.sin(LON) * np.cos(LAT), np.sin(LAT)  # points on the unit sphere: no seam, no pinch


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


# ---- the surface: craggy metal highlands cut by a network of deep frozen canyons
warp = fbm(*S(1.4), octaves=3)
X, Y, Z = S(2.4)
height = pct(fbm(X + warp * .8, Y - warp * .6, Z, octaves=6), 2, 98)
cw = fbm(*S(5.0), octaves=4) * .35  # a jagged warp so the canyons kink and fork instead of meandering like worms
X, Y, Z = S(3.1)
n1 = vnoise(X + cw, Y - cw, Z + cw)
X, Y, Z = S(8.3)
n2 = vnoise(X + cw * 2, Y + cw * 2, Z - cw * 2)
main = pct(1 - np.abs(n1), 50, 100)
trib = pct(1 - np.abs(n2), 50, 100)
can = np.maximum(main, trib * .93 * np.clip(main * 1.6 - .2, 0, 1))  # tributaries only near a main canyon
canyon = np.clip((can - .84) / .14, 0, 1) * np.clip(pct(fbm(*S(2.2), octaves=3), 5, 95) * 1.4, .35, 1)  # deep in places, shallow in others
height = np.clip(height - canyon * .45, 0, 1)
gy, gx = np.gradient(height)
shade = np.clip(1 + (-gx * .55 - gy * .45) * 22, .55, 1.35)
peaks = np.clip((height - .62) / .3, 0, 1)
col = lerpc(hexc('#262a36'), hexc('#5a6172'), height)
col = col + (lerpc(hexc('#5a6172'), hexc('#aeb8c6'), peaks) - col) * peaks[..., None] * .75
frostn = pct(fbm(*S(14), octaves=3), 20, 100)
col = col + (lerpc(hexc('#151b30'), hexc('#7d98bb'), frostn ** 2) - col) * (canyon ** .7)[..., None] * .85
col *= shade[..., None]
col += (fbm(*S(36), octaves=2) * 7)[..., None]
save('surface.png', col, 'RGB')

# ---- the rivers of electricity: current surging along the canyon floors (an emissive layer, shown on the night side)
core = np.clip((can - .93) / .06, 0, 1) ** 1.5
core = core * np.clip(pct(fbm(*S(5), octaves=3), 25, 90) * 1.3, 0, 1)  # some canyons run hot, some dim
glow = np.array(Image.fromarray((core * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), float) / 255
e = np.zeros((H, W, 4))
e[..., :3] = lerpc(hexc('#3aa8ff'), hexc('#f0fdff'), np.clip(core * 1.4, 0, 1))
e[..., 3] = np.clip(glow * 2.2 + core, 0, 1) * 255
save('electric.png', e, 'RGBA')

# ---- the storm clouds: banded and torn, wound into cyclones, bright anvil tops; a separate shadow for the night layer
CYC = [(.6, .5, .62, 3.2, .32), (-.7, .3, -.4, -2.8, .26), (.1, -.9, .2, 2.4, .22), (-.3, -.4, .86, -2.2, .2), (.8, -.3, -.5, 2.6, .24)]
X, Y, Z = swirl(CX, CY, CZ, CYC)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
w2 = fbm(X * 2.0 + 7.7, Y * 2.0 - 3.1, Z * 2.0, octaves=4)
cl = fbm(X * 2.6 + w1 * 1.2, Y * 2.6 + w2 * 1.2, Z * 5.0 + w1 * .6, octaves=7)  # stretched along latitude: banded
cl = pct(cl + np.sin(LAT * 11 + w1 * 2.5) * .12, 12, 99.5)
tops = np.clip((cl - .38) / .5, 0, 1)
c = np.zeros((H, W, 4))
c[..., :3] = lerpc(hexc('#4a4862'), hexc('#f2f3fa'), tops ** 1.1)
c[..., 3] = np.clip(cl * 1.3, 0, 1) ** 1.3 * 245
save('clouds.png', c, 'RGBA')
sh = np.zeros((H, W, 4))
sh[..., 3] = np.clip(cl * 1.3, 0, 1) * 215
Image.fromarray(sh.astype(np.uint8), 'RGBA').resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, 'cloudshade.png'))

# ---- the lens: an orthographic sphere as a displacement map. For each pixel of the disc, how far to reach into the flat
# map (laid out at one map pixel per radian of radius) for the point of the sphere seen there.
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
save('lens.png', np.round(d), 'RGB')
with open(os.path.join(OUT, 'lens.txt'), 'w') as fh:
    fh.write('%.6f' % (2 * MAXD))  # the displacement scale, in radii

# ---- the sun on the disc: Lambert light from the upper left, a soft terminator, and its complement for the night layer
sun = np.array([-.86, -.32, .36])
sun /= np.linalg.norm(sun)
zn = np.sqrt(np.clip(1 - r2, 0, 1))
lam = xn * sun[0] + yn * sun[1] + zn * sun[2]
day = np.clip((lam + .16) / .55, 0, 1) ** 1.1
dark = np.zeros((N, N, 4))
dark[..., :3] = hexc('#03040e')
dark[..., 3] = np.where(inside, (1 - day) * .96 * 255, 0)
save('night.png', dark, 'RGBA')
nm = np.zeros((N, N, 4))
nm[..., :3] = 255
nm[..., 3] = np.where(inside, np.clip(1 - day * 1.3, 0, 1) * 255, 0)
save('nightmask.png', nm, 'RGBA')
print('ok')
