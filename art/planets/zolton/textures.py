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


def smooth(e0, e1, x):
    u = np.clip((x - e0) / (e1 - e0), 0, 1)
    return u * u * (3 - 2 * u)


def relief(h, k, light=(.55, .45)):
    """Shade a height field from a fixed northwest light."""
    gy, gx = np.gradient(h)
    return 1 + (gx * light[0] + gy * light[1]) * k * K


# ---- the surface: craggy metal highlands cut by a network of frozen canyons. A canyon is the zero line of a noise field; its
# width is measured in map pixels from that line (so gorges are straight-sided and never swell into lakes), and it forks into
# narrower side canyons near the main ones.
def px_dist(n):
    """Distance in map pixels from the zero line of a smooth field: its value over the size of its slope."""
    gy, gx = np.gradient(n)
    return np.abs(n) / (np.sqrt(gx * gx + gy * gy) + 1e-6)


warp = fbm(*S(1.4), octaves=3)
X, Y, Z = S(2.4)
height = pct(fbm(X + warp * .3, Y - warp * .25, Z, octaves=6), .5, 99.5)
X, Y, Z = S(4.6)
crest = 1 - np.abs(rnoise(X + warp * .2, Y, Z, 11))
crest = crest * crest  # ridged: sharp crests between the crags
height = np.clip(height * .62 + crest * .52 * height + .05, 0, 1)
height = height * (1.15 - .3 * height)  # roll the highest crags off rather than clip them flat
cw = fbm(*S(5.0), octaves=4) * .3 + fbm(*S(17.0), octaves=2) * .04  # jagged at two scales, so the walls are broken, not smooth
X, Y, Z = S(3.1)
n1 = rnoise(X + cw, Y - cw, Z + cw, 7)
X, Y, Z = S(8.3)
n2 = rnoise(X + cw * 2, Y + cw * 2, Z - cw * 2, 9)
d1, d2 = px_dist(n1), px_dist(n2)
widthv = pct(fbm(*S(3.7), octaves=3), 5, 95)  # wide gorges in places, hairline cracks in others
w1 = (.7 + 3.4 * widthv ** 2) * K  # a main canyon's half-width, in map pixels
w2 = (.45 + .9 * widthv) * K
near = np.exp(-d1 / (22 * K))  # side canyons only within reach of a main one
gate = smooth(.38, .52, pct(fbm(*S(2.7), octaves=3), 0, 100))  # canyons run out in places, so they end instead of closing into rings
can_main = smooth(w1 + 1.4 * K, w1 - .2, d1) * gate
# drop the small closed rings: a canyon piece whose whole extent is under about 60 map pixels reads as a pond or a moat
import scipy.ndimage as ndi
lab, nlab = ndi.label(can_main > .4)
for sl_i, sl in enumerate(ndi.find_objects(lab)):
    if sl is not None and max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 60 * K:
        can_main[sl][lab[sl] == sl_i + 1] = 0
can_trib = smooth(w2 + 1.0 * K, w2 - .2, d2) * smooth(.25, .6, near) * gate
canyon = np.maximum(can_main, can_trib * .8)
height = np.clip(height - canyon * .3, 0, 1)
gy, gx = np.gradient(height)
shade = np.clip(1 + (gx * .55 + gy * .45) * 26 * K, .45, 1.45)
peaks = smooth(.6, .9, height)
col = lerpc(hexc('#272b37'), hexc('#5b6273'), height)
col = col + (lerpc(hexc('#5b6273'), hexc('#b4bdca'), peaks) - col) * peaks[..., None] * .75
col *= shade[..., None]
# the canyon floors: pale frost, the walls already lit on the sun's side and shadowed on the other by the relief
frostn = pct(fbm(*S(14), octaves=3), 20, 100)
floor = smooth(.55, 1, canyon)
col = col + (lerpc(hexc('#8296ac'), hexc('#a8bccf'), frostn) - col) * floor[..., None] * .6  # cold blue-white frost on the floors
# bare metal glinting on the high spires that face the sun
facing = np.clip((gx * .55 + gy * .45) * 40 * K, 0, 1)
spec = smooth(np.percentile(height, 94), np.percentile(height, 99.4), height) * facing
col = col + (np.array(hexc('#eef4fa'), float) - col) * spec[..., None] * .85
col += (fbm(*S(30), octaves=2) * 5)[..., None]
save('surface.png', col, 'RGB')

# ---- the rivers of electricity: a thin hot core down each canyon's center line, the same width whatever the canyon's, with a
# narrow blue halo; some canyons run hot, some dim
heat = np.clip(pct(fbm(*S(5), octaves=3), 25, 90) * 1.3, 0, 1)
core0 = np.maximum(np.exp(-(d1 / (1.0 * K)) ** 2) * (can_main > .5), np.exp(-(d2 / (.8 * K)) ** 2) * (can_trib > .5) * .7) * heat
core = np.array(Image.fromarray((core0 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6 * K)), float) / 255
halo = np.array(Image.fromarray((core0 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4 * K)), float) / 255 * .7
e = np.zeros((H, W, 4))
e[..., :3] = lerpc(hexc('#4aa8ff'), hexc('#eef8ff'), np.clip(core * 1.5, 0, 1))
e[..., 3] = np.clip(halo * 2.0 + core * .75, 0, 1) * 255
save('electric.png', e, 'RGBA')

# ---- the storm clouds: banded and torn fronts wound into cyclones, with crisp tops shaded as towers and soft wisps between.
# The bloodstorms are two of the cyclones, built in the same field the same way (so they are the same stuff, at the same
# resolution), made thick and wound tight, then stained: maroon only in the shadowed undersides of their bands, a soft dark eye.
PX = W / (2 * math.pi)  # map pixels per radian
BLOODS = [(2.2, -.24, .4), (2.2 + math.pi - .4, .3, .26)]  # center longitude, latitude, radius (radians)
B_AXES = [(math.cos(lo) * math.cos(la), math.sin(lo) * math.cos(la), math.sin(la), r) for lo, la, r in BLOODS]
CYC = [(.6, .5, .62, 2.0, .14), (-.2, -.8, -.4, -2.4, .17), (.1, -.9, .2, 2.2, .15), (-.3, -.4, .86, -2.0, .14), (.8, -.3, -.5, 2.4, .17)]
CYC += [(ax, ay, az, 2.8, r * .75) for ax, ay, az, r in B_AXES]  # about one turn inside the storm
X, Y, Z = swirl(CX, CY, CZ, CYC)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
w2 = fbm(X * 2.0 + 7.7, Y * 2.0 - 3.1, Z * 2.0, octaves=4)
cl = fbm(X * 3.0 + w1 * 1.1, Y * 3.0 + w2 * 1.1, Z * 3.6 + w1 * .5, octaves=6)
belts = np.exp(-((np.abs(LAT) - .35) / .13) ** 2) + np.exp(-((np.abs(LAT) - .79) / .13) ** 2)  # storm belts near 20 and 45 degrees
cl = pct(cl + np.sin(LAT * 9 + w1 * 2.2) * .08 + belts * .16, 8, 99.7)
stain = np.zeros_like(cl)
eyes = np.ones_like(cl)
for ax, ay, az, r in B_AXES:
    dist = np.arccos(np.clip(CX * ax + CY * ay + CZ * az, -1, 1))
    env = np.exp(-(dist / r) ** 3)
    core_ = smooth(.65, .35, dist / r)
    cl = np.clip(cl + env * .3, 0, 1.15)
    cl = cl * (1 - core_) + (.55 + cl * .45) * core_  # a dense overcast core that keeps its towers, ragged feeder bands outside it
    stain = np.maximum(stain, smooth(1.0, .7, dist / r))
    eyes = np.minimum(eyes, smooth(.05, .15, dist / r) * .8 + .2)  # a soft dark eye, darkest at its middle, no rim
dense = smooth(.3, .5, cl)  # the storm's body, crisp-edged
wisp = smooth(.16, .34, cl) * .45  # thin cloud and spray around it
alpha = np.clip(dense + wisp * (1 - dense), 0, 1)
alpha = np.maximum(alpha, stain) * (1 - (1 - eyes) * .7)
tops = smooth(.45, .95, cl)
soft = np.array(Image.fromarray((np.clip(cl / 1.15, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.4 * K)), float) / 255 * 1.15
csh = np.clip(relief(soft, 30), .55, 1.35)  # the towers' sunward sides and their shadowed flanks (shaded from a softened field: no fine streaks)
c = np.zeros((H, W, 4))
c[..., :3] = lerpc(hexc('#44425a'), hexc('#f4f5fb'), tops ** .9) * csh[..., None]
under = np.clip((1.05 - csh) * 2.6, 0, 1) + smooth(.75, .45, tops) * .5  # shadowed undersides and the gaps between bands
# the bloodstorms: a heavier storm, its brightest tops a grey-maroon at about 0.7 of the white storms', red only glowing low in
# the gaps between its bands
bloodc = lerpc(hexc('#221c22'), hexc('#7a6c74'), tops ** 1.2) * csh[..., None]  # storm-grey with a faint wine cast
c[..., :3] = c[..., :3] + (bloodc - c[..., :3]) * stain[..., None]
gaps = smooth(.5, .3, np.clip(cl, 0, 1)) * stain
c[..., :3] = c[..., :3] + (np.array(hexc('#6a1626'), float) - c[..., :3]) * (np.clip(gaps * 1.6, 0, 1) * .45)[..., None]
c[..., :3] *= eyes[..., None]
c[..., 3] = alpha * 250
save('clouds.png', c, 'RGBA')
sh = np.zeros((H, W, 4))
sh[..., 3] = alpha * 215
Image.fromarray(np.clip(sh, 0, 255).astype(np.uint8), 'RGBA').resize((W // 4, H // 4), Image.LANCZOS).save(os.path.join(OUT, 'cloudshade.png'))
cm = np.zeros((H, W, 4))
cm[..., :3] = 255
cm[..., 3] = np.clip(alpha * (.6 + .4 * tops) * 1.2, 0, 1) * 255  # where a flash inside the storm lights it: thick cloud most
Image.fromarray(cm.astype(np.uint8), 'RGBA').resize((W // 4, H // 4), Image.LANCZOS).save(os.path.join(OUT, 'cloudmask.png'))
bm = np.zeros((H, W, 4))
bm[..., :3] = 255
bm[..., 3] = np.clip(alpha * stain, 0, 1) * 255  # where the bloodstorms' red lightning lights them
Image.fromarray(bm.astype(np.uint8), 'RGBA').resize((W // 4, H // 4), Image.LANCZOS).save(os.path.join(OUT, 'bloodmask.png'))
with open(os.path.join(OUT, 'blood.txt'), 'w') as fh:
    fh.write('\n'.join('%.6f %.6f %.6f' % b_ for b_ in BLOODS))

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
# dithered before rounding: the 8-bit steps become a fine grain instead of stair-steps and sheared rows, and the browser's
# smoothing of the map averages the grain back toward the true value
dith = np.random.default_rng(7).uniform(-.5, .5, (N, N, 1))
q = np.clip(np.round(d + np.where(inside[..., None], dith, 0)), 0, 255)
q[..., 2] = 128
save('lens.png', q, 'RGB')

with open(os.path.join(OUT, 'lens.txt'), 'w') as fh:
    fh.write('%.6f' % (2 * MAXD))  # the displacement scale, in radii

# ---- the sun on the disc: Lambert light from the upper left, a soft terminator, and its complement for the night layer
sun = np.array([-.86, -.32, .36])
sun /= np.linalg.norm(sun)
zn = np.sqrt(np.clip(1 - r2, 0, 1))
lam = xn * sun[0] + yn * sun[1] + zn * sun[2]
day = np.clip((lam + .05) / .45, 0, 1) ** 1.2
dark = np.zeros((N, N, 4))
dark[..., :3] = hexc('#03040e')
dark[..., 3] = np.where(inside, (1 - day) * .96 * 255, 0)
save('night.png', dark, 'RGBA')
nm = np.zeros((N, N, 4))
nm[..., :3] = 255
nm[..., 3] = np.where(inside, np.clip(1 - day * 1.3, 0, 1) * 255, 0)
save('nightmask.png', nm, 'RGBA')
print('ok')
