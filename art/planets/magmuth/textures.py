"""Magmuth's textures for the living planet: an equirectangular surface (black glass spires, basalt and ash, tar pits), the fissure
network's rivers of fire, the lava seas (cracked crust over molten rock), the smoke and ash, plus the orthographic lens (a
displacement map) and the red dwarf's light on the disc.

Every map wraps in longitude (noise sampled on a cylinder), so a strip of it can slide behind the lens forever.
Run from the repo root: python art/planets/magmuth/textures.py  (writes art/planets/magmuth/out/)
"""
import math
import os

import numpy as np
import scipy.ndimage as ndi
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)
W, H = 2048, 1024  # the maps: longitude across, latitude down (2048 so the large planet stays crisp)
K = W / 1024  # per-pixel slopes shrink as the map grows
rng = np.random.default_rng(1601)
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


ROTS = [_rot(1700 + i) for i in range(16)]


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


# the cylinder: longitude around, latitude up; points on the unit sphere, so no seam and no pinch at the poles
lon = (np.arange(W) + .5) / W * 2 * math.pi
lat = ((np.arange(H) + .5) / H - .5) * math.pi
LON, LAT = np.meshgrid(lon, lat)
CX, CY, CZ = (np.cos(LON) * np.cos(LAT)).astype(np.float32), (np.sin(LON) * np.cos(LAT)).astype(np.float32), np.sin(LAT).astype(np.float32)


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
    """Twist the sphere's points around a few ash-storm centers (cyclones), strongest at each eye."""
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
    """Shade a height field from a fixed upper-left light: a slope is lit where height rises to the right and down."""
    gy, gx = np.gradient(h)
    return 1 + (gx * light[0] + gy * light[1]) * k * K


def px_dist(n):
    """Distance in map pixels from the zero line of a smooth field: its value over the size of its slope."""
    gy, gx = np.gradient(n)
    return np.abs(n) / (np.sqrt(gx * gx + gy * gy) + 1e-6)


def cell_noise(qx, qy, qz):
    """Cellular noise on the sphere: the distances to the nearest and second-nearest jittered points (F1, F2), and the nearest
    cell's random value (ID). Where F2 - F1 is near zero lie the borders between plates: the seams."""
    ix, iy, iz = np.floor(qx).astype(np.int64), np.floor(qy).astype(np.int64), np.floor(qz).astype(np.int64)
    F1 = np.full(qx.shape, 9.0)
    F2 = np.full(qx.shape, 9.0)
    ID = np.zeros(qx.shape)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx, cy, cz = ix + dx, iy + dy, iz + dz
                px = cx + _hash(cx, cy, cz)
                py = cy + _hash(cx + 101, cy + 7, cz + 3)
                pz = cz + _hash(cx + 13, cy + 57, cz + 211)
                d = np.sqrt((px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2)
                closer = d < F1
                F2 = np.where(closer, F1, np.minimum(F2, d))
                ID = np.where(closer, _hash(cx, cy, cz + 5), ID)
                F1 = np.where(closer, d, F1)
    return F1, F2, ID


F1c, F2c, IDc = cell_noise(*S(6.5))  # plates about fifty map pixels across

# ---- the surface: black volcanic glass spires and basalt, grey ash settled in the lows, tar pits, lava seas under a cracked
# crust, and the fissure network cut into it (the fissures themselves glow, in the rivers layer)
warp = fbm(*S(1.4), octaves=3)
X, Y, Z = S(2.4)
height = pct(fbm(X + warp * .3, Y - warp * .25, Z, octaves=6), .5, 99.5)
X, Y, Z = S(4.6)
crest = 1 - np.abs(rnoise(X + warp * .2, Y, Z, 11))
crest = crest ** 3  # sharp: the glass spires are narrow
spire = smooth(.45, .8, crest) * smooth(.4, .75, height)  # jagged spires of volcanic glass on the higher ground
height = np.clip(height * .6 + crest * .5 * height + .04, 0, 1)
height = height * (1.12 - .25 * height)
# lava seas: the low basins melted into molten seas, with land left as islands (about two fifths of the planet)
X, Y, Z = S(1.9)
lowf = pct(fbm(X + warp * .4, Y, Z, octaves=4), 0, 100)
t_sea = np.percentile(lowf, 40)
ragged = fbm(*S(11.0), octaves=3)  # the shores are broken, not smooth
sea = smooth(t_sea + .02, t_sea - .02, lowf + .08 * ragged)
height = np.clip(height - sea * .22, 0, 1)
# the fissure network: the same canyon construction as before, measured from its centre line in map pixels, so the fissures
# are narrow, straight-sided cuts that fork into side fissures near the main ones and run out in places
X, Y, Z = S(3.1)
cw = fbm(*S(5.0), octaves=4) * .3 + fbm(*S(17.0), octaves=2) * .04
n1 = rnoise(X + cw, Y - cw, Z + cw, 7)
X, Y, Z = S(8.3)
n2 = rnoise(X + cw * 2, Y + cw * 2, Z - cw * 2, 9)
d1, d2 = px_dist(n1), px_dist(n2)
widthv = pct(fbm(*S(3.7), octaves=3), 5, 95)
w1 = (.5 + 2.6 * widthv ** 2) * K  # a main fissure's half-width, in map pixels
w2 = (.35 + .8 * widthv) * K
near = np.exp(-d1 / (20 * K))
gate = smooth(.36, .5, pct(fbm(*S(2.7), octaves=3), 0, 100))
can_main = smooth(w1 + 1.4 * K, w1 - .2, d1) * gate
lab, nlab = ndi.label(can_main > .4)
for sl_i, sl in enumerate(ndi.find_objects(lab)):
    if sl is not None and max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 60 * K:
        can_main[sl][lab[sl] == sl_i + 1] = 0  # no small closed rings
can_trib = smooth(w2 + 1.0 * K, w2 - .2, d2) * smooth(.25, .6, near) * gate
canyon = np.maximum(can_main, can_trib * .8)
height = np.clip(height - canyon * .3, 0, 1)
gy, gx = np.gradient(height)
shade = np.clip(1 + (gx * .55 + gy * .45) * 26 * K, .45, 1.45)
basalt = lerpc(hexc('#2a2224'), hexc('#3a3234'), height)
ashf = smooth(.5, .8, pct(fbm(*S(3.3), octaves=4), 5, 95)) * (1 - spire) * (1 - .5 * height)
col = lerpc(basalt, hexc('#6b5e58'), ashf * .85)
tar = smooth(.8, .9, pct(fbm(*S(9.0), octaves=3), 0, 100)) * (1 - spire) * (1 - sea) * (1 - height * .5)
col = col + (np.array(hexc('#0a0909'), float) - col) * tar[..., None] * .8
col = col + (np.array(hexc('#17141c'), float) - col) * spire[..., None] * .85  # volcanic glass
facing = np.clip((gx * .55 + gy * .45) * 40 * K, 0, 1)
glass_sheen = spire * facing * smooth(.4, .9, height)
col = col + (np.array(hexc('#a797c4'), float) - col) * glass_sheen[..., None] * .55  # cold violet sheen on the glass that faces the sun
plate = np.array(hexc('#28100a'), float)[None, None, :] * (.8 + .4 * IDc)[..., None]  # each plate of crust: dark, its own shade
col = col + (plate - col) * sea[..., None]
col = col + (np.array(hexc('#170907'), float) - col) * smooth(.55, 1, canyon)[..., None] * .9  # fissure floors: charred
col = col * shade[..., None]
col += (fbm(*S(30), octaves=2) * 5)[..., None]
save('surface.png', col, 'RGB')

# ---- the rivers of fire: a thin hot core down each fissure's centre line, the same width whatever the fissure, with a red
# halo; some run hot, some dim
heat = np.clip(pct(fbm(*S(5), octaves=3), 25, 90) * 1.3, 0, 1)
core0 = np.maximum(np.exp(-(d1 / (1.0 * K)) ** 2) * (can_main > .5), np.exp(-(d2 / (.8 * K)) ** 2) * (can_trib > .5) * .7) * heat
core = wblur(core0, .6 * K)
halo = wblur(core0, 4 * K) * .7
rv = np.zeros((H, W, 4))
rv[..., :3] = lerpc(hexc('#e8301a'), hexc('#ffe2a8'), np.clip(core * 1.5, 0, 1))
rv[..., 3] = np.clip(halo * 2.0 + core * .75, 0, 1) * 255
save('rivers.png', rv, 'RGBA')

# ---- the lava seas: a crust of dark plates (the surface) with thin bright seams between them. The seams are the plates' borders
# (cellular noise); near the shore the crust breaks up and the molten rock shows orange.
edge = F2c - F1c
seam = 1 - smooth(.015, .05, edge)  # thin bright seams, one to two map pixels wide
inner = wblur(sea, 14 * K)  # deep inside the sea this is about 1, and at the shore about a half
shore = sea * (1 - smooth(.35, .85, inner))  # where the crust breaks up
seamk = np.clip(seam * (.6 + .6 * shore) + shore * .35, 0, 1) * sea
se = np.zeros((H, W, 4))
se[..., :3] = lerpc(hexc('#e8501a'), hexc('#ffd070'), np.clip(seam * (.8 + .2 * shore), 0, 1))
se[..., 3] = np.clip(seamk * .95, 0, 1) * 255
save('seas.png', se, 'RGBA')
# the churn: soft lobes of brighter molten rock that the page slides east over the seas, so the sea seems to turn over
ch = smooth(.25, .85, pct(fbm(*S(2.6), octaves=4), 15, 98))
chv = np.zeros((H, W, 4))
chv[..., :3] = 255
chv[..., 3] = ch * 255
Image.fromarray(chv.astype(np.uint8), 'RGBA').resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, 'churn.png'))

# ---- the smoke and ash: banded and torn fronts wound into a few slow ash-storm cyclones, with dark cores and thin drifting
# plumes around them; tops lit by the red sun and their undersides in the dark
PX = W / (2 * math.pi)
CYC = [(.6, .5, .62, 2.0, .14), (-.2, -.8, -.4, -2.4, .17), (.1, -.9, .2, 2.2, .15), (-.3, -.4, .86, -2.0, .14)]
X, Y, Z = swirl(CX, CY, CZ, CYC)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
w2 = fbm(X * 2.0 + 7.7, Y * 2.0 - 3.1, Z * 2.0, octaves=4)
cl = fbm(X * 3.0 + w1 * 1.1, Y * 3.0 + w2 * 1.1, Z * 3.6 + w1 * .5, octaves=6)
belts = np.exp(-((np.abs(LAT) - .3) / .14) ** 2) + np.exp(-((np.abs(LAT) - .75) / .14) ** 2)  # smoke belts, where the air is stirred
cl = pct(cl + np.sin(LAT * 9 + w1 * 2.2) * .08 + np.sin(LAT * 22 + w2 * 3.0) * .08 + belts * .14, 8, 99.7)  # latitude streaks: east-west drift
dense = smooth(.4, .6, cl)
wisp = smooth(.22, .4, cl) * .4
alpha = np.clip(dense + wisp * (1 - dense), 0, 1)
tops = smooth(.45, .95, cl)
soft = wblur(cl / 1.15, 1.4 * K) * 1.15
csh = np.clip(relief(soft, 30), .55, 1.35)
c = np.zeros((H, W, 4))
c[..., :3] = lerpc(hexc('#3a302c'), hexc('#7a6a60'), tops ** .9) * csh[..., None]
c[..., 3] = alpha * 170
save('clouds.png', c, 'RGBA')
sh = np.zeros((H, W, 4))
sh[..., 3] = alpha * 215
Image.fromarray(np.clip(sh, 0, 255).astype(np.uint8), 'RGBA').resize((W // 4, H // 4), Image.LANCZOS).save(os.path.join(OUT, 'cloudshade.png'))

# ---- the lens: an orthographic sphere as a displacement map. For each pixel of the disc, how far to reach into the flat map
# (laid out at one map pixel per radian of radius) for the point of the sphere seen there.
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
dx = np.where(inside, lo - xn, 0)
dy = np.where(inside, la - yn, 0)
MAXD = math.pi / 2 - 1
d = np.zeros((N, N, 3))
d[..., 0] = (dx / (2 * MAXD) + .5) * 255
d[..., 1] = (dy / (2 * MAXD) + .5) * 255
d[..., 2] = 128
# dithered before rounding: the 8-bit steps become a fine grain the browser's smoothing averages away
dith = np.random.default_rng(7).uniform(-.5, .5, (N, N, 1))
q = np.clip(np.round(d + np.where(inside[..., None], dith, 0)), 0, 255)
q[..., 2] = 128
save('lens.png', q, 'RGB')
with open(os.path.join(OUT, 'lens.txt'), 'w') as fh:
    fh.write('%.6f' % (2 * MAXD))

# ---- the red dwarf's light on the disc: Lambert light from the upper left, a soft terminator, the night's complement, and a
# warm wash over the day side (the day is red-orange, not white)
sun = np.array([-.86, -.32, .36])
sun /= np.linalg.norm(sun)
zn = np.sqrt(np.clip(1 - r2, 0, 1))
lam = xn * sun[0] + yn * sun[1] + zn * sun[2]
day = np.clip((lam + .05) / .45, 0, 1) ** 1.2
dark = np.zeros((N, N, 4))
dark[..., :3] = hexc('#0a0304')
dark[..., 3] = np.where(inside, (1 - day) * .96 * 255, 0)
save('night.png', dark, 'RGBA')
nm = np.zeros((N, N, 4))
nm[..., :3] = 255
nm[..., 3] = np.where(inside, np.clip(1 - day * 1.3, 0, 1) * 255, 0)
save('nightmask.png', nm, 'RGBA')
tint = np.zeros((N, N, 4))
tint[..., :3] = hexc('#ff5020')
tint[..., 3] = np.where(inside, day * .2 * 255, 0)
save('daytint.png', tint, 'RGBA')
# the rivers and seas are brighter at night, but still show by day
gm = np.zeros((N, N, 4))
gm[..., :3] = 255
gm[..., 3] = np.where(inside, (.5 + .5 * (1 - day)) * 255, 0)
save('glowmask.png', gm, 'RGBA')

# ---- the volcanoes: three vents, each set on the brightest fissure near a chosen place, away from the lava seas. Saved as
# longitude and latitude in radians (planet builds turn them into map units).
VENT_T = [(.55, .1), (2.75, -.25), (4.75, .3)]
vents = []
dlon_all = (LON - 0) % (2 * math.pi)
for lo_t, la_t in VENT_T:
    dlon = (LON - lo_t + math.pi) % (2 * math.pi) - math.pi
    near_ = (dlon ** 2 + (LAT - la_t) ** 2) < .3 ** 2
    score = np.where(near_ & (sea < .05), core0 + 1e-3 * np.random.default_rng(int(lo_t * 100)).uniform(size=core0.shape), -1)
    iy, ix = np.unravel_index(np.argmax(score), score.shape)
    vents.append((LON[iy, ix], LAT[iy, ix]))
with open(os.path.join(OUT, 'vents.txt'), 'w') as fh:
    fh.write('\n'.join('%.6f %.6f' % v for v in vents))
print('ok')
