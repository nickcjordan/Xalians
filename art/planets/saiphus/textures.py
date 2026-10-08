"""Saiphus's textures for the living planet: a gas giant's banded atmosphere (zones and belts that slide at their own speeds, with
eddies where they shear), the floating islands of the life band, the sulfuric cloud with one storm in a shear zone, plus the
orthographic lens (a displacement map) and the sun's light on the disc. A gas giant has no ground, so there is no surface map.

Every map wraps in longitude (noise sampled on a cylinder), so a strip of it can slide behind the lens forever.
Run from the repo root: python art/planets/saiphus/textures.py  (writes art/planets/saiphus/out/)
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)
W, H = 2048, 1024  # the maps: longitude across, latitude down (2048 so the large planet stays crisp)
K = W / 1024  # per-pixel slopes shrink as the map grows
PLATE_R = 240.0  # the planet's radius in the 600 by 600 plate (build.py)
WT = 2 * math.pi * PLATE_R  # one map width, in plate units
UNIT = WT / W  # plate units per map pixel
rng = np.random.default_rng(1331)
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


# the cylinder: longitude around, latitude up. Points on the unit sphere: no seam, no pinch.
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
    """Twist the sphere's points around a few centers (eddies and cyclones), strongest at each eye."""
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
    """Shade a height field from a fixed northwest light: a slope is lit where height rises to the right and down."""
    gy, gx = np.gradient(h)
    return 1 + (gx * light[0] + gy * light[1]) * k * K


def axis(lo, la):
    """A point on the sphere from its longitude and latitude (radians)."""
    return (math.cos(lo) * math.cos(la), math.sin(lo) * math.cos(la), math.sin(la))


STORM = (2.1, .40, .30)  # the storm: center longitude, latitude and radius, radians (its shear zone is at its latitude)
SX, SY, SZ = axis(STORM[0], STORM[1])
LIFE = (-.30, .085)  # the life band: center latitude and half-width, radians (the islands drift in it)
BAND_N = 7.0  # bands per radian of latitude: seven bands across the disc


# ---- the banded atmosphere: zones (pale) and belts (ochre-brown) alternate in latitude. Three eddies twist the band edges
# so the boundaries curl where they shear (one of them under the storm). The belts are the whole sphere; the zones sit over
# them with their own alpha, and the two are laid on their own clocks, so the seam between them shears.
SWIRL_BANDS = [axis(STORM[0], STORM[1]) + (1.5, .34), axis(STORM[0] + 2.4, -.62) + (-1.3, .24), axis(STORM[0] - 2.2, .9) + (1.1, .2)]
# small festoon eddies strung along the band edges, alternating in turn so the edges curl like festoons
SWIRL_BANDS += [axis(lo, la) + (s_, .11) for lo, la, s_ in [(0.4, .42, 1.4), (1.2, -.62, -1.2), (2.9, .42, -1.1), (3.9, -.62, 1.2), (4.9, .9, -.9), (5.6, -.62, 1.0), (0.9, -.1, 1.0), (3.4, .05, -1.0)]]
X, Y, Z = swirl(CX, CY, CZ, SWIRL_BANDS)
LATS = np.arcsin(np.clip(Z, -1, 1))  # the latitude once the eddies have turned the sphere
warp = fbm(X * 1.7, Y * 1.7, Z * 1.7, octaves=4)
wide = fbm(X * .6, Y * .6, Z * .6, octaves=3)  # a slow field that varies the band widths: some wide, some narrow
phase = LATS * BAND_N + 1.6 * warp + 1.1 * wide  # wavier, sheared edges with varied widths
zone = smooth(-.3, .3, np.sin(phase))  # 1 in a zone, 0 in a belt
edge = np.exp(-(np.sin(phase) / .12) ** 2)  # a sulfur-pale line where a band turns
mottle = fbm(X * 3.0, Y * 3.0, Z * 3.0, octaves=5)
streak = fbm(X * 1.5, Y * 1.5, Z * 7.0, octaves=4)  # stretched along latitude: fine streaks, not spots
streak2 = fbm(X * 2.2 + 5.0, Y * 2.2, Z * 9.0, octaves=4)
tb = pct(streak * .75 + mottle * .35, 2, 98)
belt = lerpc(hexc('#6a4430'), hexc('#c9996c'), tb)  # dusty dark to pale ochre
rose = smooth(.5, .85, pct(mottle, 20, 99)) * .4  # dusty rose through some of the belts
belt = belt + (lerpc(hexc('#6a4430'), hexc('#c48a7e'), tb) - belt) * rose[..., None]
tz = pct(streak2 * .75 + mottle * .25, 2, 98)
zcol = lerpc(hexc('#b89a72'), hexc('#efe0c0'), tz)  # sand to cream
zcol = zcol + (np.array(hexc('#f0dc7a'), float) - zcol) * (edge * .3)[..., None]  # sulfur along the turns
save('belts.png', belt, 'RGB')
zrgba = np.zeros((H, W, 4))
zrgba[..., :3] = zcol
zrgba[..., 3] = zone * 255
save('zones.png', zrgba, 'RGBA')


# ---- the floating islands: small flecks of green and brown land in the life band, scattered in clusters, drifting with cloud
# between them. Drawn at two sizes: the large planet's map at true size, and the map-size planets' map with the flecks enlarged
# so they survive the shrink (a fleck is about the same size on the screen either way).
def sphere_grid(width):
    lo = (np.arange(width) + .5) / width * 2 * math.pi
    la = ((np.arange(H) + .5) / H - .5) * math.pi
    LO, LA = np.meshgrid(lo, la)
    return (np.cos(LO) * np.cos(LA)).astype(np.float32), (np.sin(LO) * np.cos(LA)).astype(np.float32), np.sin(LA).astype(np.float32)


def islands(width, mul, count=24, seed=2024):
    rs = random.Random(seed)
    unit = WT / width  # plate units per map pixel at this width
    g = Image.new('L', (width, H), 0)
    b = Image.new('L', (width, H), 0)
    dg, db = ImageDraw.Draw(g), ImageDraw.Draw(b)
    for _ in range(count):
        la = LIFE[0] + rs.uniform(-LIFE[1], LIFE[1])
        cx = rs.uniform(0, 1) * width
        cy = (la / math.pi + .5) * H
        cos_l = max(math.cos(la), .3)
        spread = rs.uniform(12, 24) / unit
        green = rs.random() < .6
        for _ in range(rs.randint(6, 14)):
            fx = cx + rs.gauss(0, spread) / cos_l
            fy = cy + rs.gauss(0, spread * .6)
            rp = rs.uniform(2.2, 4.2) * mul / unit  # a fleck's radius, in map pixels
            pts = []
            for k in range(9):
                a_ = 2 * math.pi * k / 9
                rr = rp * rs.uniform(.6, 1.25)
                pts.append((math.cos(a_) * rr / cos_l, math.sin(a_) * rr))
            for off in (-width, 0, width):  # drawn three times so the flecks wrap east to west
                poly = [(fx + px + off, fy + py) for px, py in pts]
                (dg if green else db).polygon(poly, fill=255)
    ga = wblur(np.array(g, float) / 255, .6)
    ba = wblur(np.array(b, float) / 255, .6)
    a = np.clip(ga + ba, 0, 1)
    frac = ba / (ga + ba + 1e-6)
    LX, LY, LZ = sphere_grid(width)
    tex = fbm(LX * 9.0, LY * 9.0, LZ * 9.0, octaves=3)
    gcol = lerpc(hexc('#3d5a2c'), hexc('#5e7a40'), pct(tex, 5, 95))  # dark green plains
    bcol = lerpc(hexc('#5a3e24'), hexc('#7e5a34'), pct(tex, 5, 95))  # brown
    col = gcol * (1 - frac)[..., None] + bcol * frac[..., None]
    # a pale rim on the sun side (the sun is upper left: the flecks' upper-left edges), and a faint shadow thrown lower right
    d_ = max(1, round(3 * width / W))
    shifted = np.roll(a, (d_, d_), axis=(0, 1))
    rim = np.clip(a - shifted, 0, 1)
    col = col + (np.array(hexc('#e6e6b0'), float) - col) * (rim * .7)[..., None]
    sh = wblur(np.clip(shifted - a, 0, 1), .8) * .4
    shcol = np.array(hexc('#120c06'), float)
    total = np.clip(a + sh, 0, 1)
    rgb = (col * a[..., None] + shcol * sh[..., None]) / (total[..., None] + 1e-6)
    out = np.zeros((H, width, 4))
    out[..., :3] = rgb
    out[..., 3] = total * 255
    return out


isl_big = islands(W, 1.0)
Image.fromarray(np.clip(isl_big, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'islands.png'))
isl_small = islands(1024, 1.7)
Image.fromarray(np.clip(isl_small, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'islands-s.png'))


# ---- the sulfuric cloud: banded and torn, wound into the storm in its shear zone, crisp tops shaded as towers and soft wisps
# between. The storm and the rest of the cloud are two pictures of one field, so each can be shown alone.
CLOUD_SWIRL = [axis(STORM[0], STORM[1]) + (2.6, .3), axis(-1.1, .12) + (-1.0, .2), axis(1.0, -.5) + (1.4, .16)]
X, Y, Z = swirl(CX, CY, CZ, CLOUD_SWIRL)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
w2 = fbm(X * 2.0 + 7.7, Y * 2.0 - 3.1, Z * 2.0, octaves=4)
cl0 = fbm(X * 3.0 + w1 * 1.1, Y * 3.0 + w2 * 1.1, Z * 3.6 + w1 * .5, octaves=6)
# streaks: fast across latitude, slow along longitude, so the cloud runs out as sheared sweeps along the band flow
cl = fbm(X * 1.1 + w1 * .8, Y * 1.1 + w2 * .8, Z * 6.5, octaves=5) * .75 + cl0 * .25
life = np.exp(-((LAT - LIFE[0]) / .2) ** 2) * .3  # thicker cloud over the life band, so the islands sit under cloud
shear = np.exp(-((LAT - STORM[1]) / .22) ** 2) * .18
cl = pct(cl + np.sin(LAT * 9 + w1 * 2.2) * .08 + life + shear, 8, 99.7)
dist = np.arccos(np.clip(CX * SX + CY * SY + CZ * SZ, -1, 1))
u = dist / STORM[2]
env = np.exp(-u ** 3)
core = smooth(.7, .35, u)
cl = np.clip(cl + env * .3, 0, 1.15)
cl = cl * (1 - core) + (.55 + cl * .45) * core  # the storm's dense overcast core keeps its towers
storm_w = smooth(1.15, .7, u)  # the storm's share of the cloud, for its own switch
eyes = 1 - .35 * smooth(.3, .08, u)  # a slightly darker eye at its middle
dense = smooth(.44, .62, cl)  # thinner than before: the bands show through between the cloud
wisp = smooth(.26, .46, cl) * .35
alpha = np.clip(dense + wisp * (1 - dense), 0, 1) * .8  # partly translucent: the bands show through
tops = smooth(.45, .95, cl)
soft = wblur(cl / 1.15, 1.4 * K) * 1.15
csh = np.clip(relief(soft, 10), .8, 1.2)  # gentle towers: a strong relief reads as crinkled paper  # the towers' sunward sides and shadowed flanks (from a softened field: no fine streaks)
body = lerpc(hexc('#8a6a20'), hexc('#f6e58a'), tops ** .9) * csh[..., None]  # sulfur yellow
bright = lerpc(hexc('#8e7438'), hexc('#fffbd8'), tops) * csh[..., None]
body = body + (bright - body) * (storm_w * .3)[..., None]  # the storm's tops a little brighter
c = np.zeros((H, W, 4))
c[..., :3] = body * eyes[..., None]
c[..., 3] = alpha * 235
save('clouds.png', c, 'RGBA')  # the whole cloud: placement only, never drawn as one picture
cs = c.copy()
cs[..., 3] = c[..., 3] * storm_w
save('clouds-storm.png', cs, 'RGBA')
cp = c.copy()
cp[..., 3] = c[..., 3] * (1 - storm_w)
save('clouds-plain.png', cp, 'RGBA')
cm = np.zeros((H, W, 4))
cm[..., :3] = 255
cm[..., 3] = np.clip(alpha * (.6 + .4 * tops) * 1.2, 0, 1) * 255  # where a flash lights the cloud: thick cloud most
Image.fromarray(cm.astype(np.uint8), 'RGBA').resize((W // 4, H // 4), Image.LANCZOS).save(os.path.join(OUT, 'cloudmask.png'))
with open(os.path.join(OUT, 'storm.txt'), 'w') as fh:
    fh.write('%.6f %.6f %.6f' % STORM)
with open(os.path.join(OUT, 'life.txt'), 'w') as fh:
    fh.write('%.6f %.6f' % LIFE)


# ---- the lens: an orthographic sphere as a displacement map. For each pixel of the disc, how far to reach into the flat map
# (laid out at one map pixel per radian of radius) for the point of the sphere seen there.
N = 512
yy, xx = np.mgrid[0:N, 0:N]
xn = (xx + .5) / N * 2 - 1
yn = (yy + .5) / N * 2 - 1
r2 = xn * xn + yn * yn
inside = r2 < 1.0
yc = np.clip(yn, -.999999, .999999)
la_ = np.arcsin(yc)
cosla = np.sqrt(1 - yc * yc)
lo_ = np.arcsin(np.clip(xn / cosla, -1, 1))
dx = np.where(inside, lo_ - xn, 0)  # in units of the radius
dy = np.where(inside, la_ - yn, 0)
MAXD = math.pi / 2 - 1
d = np.zeros((N, N, 3))
d[..., 0] = (dx / (2 * MAXD) + .5) * 255
d[..., 1] = (dy / (2 * MAXD) + .5) * 255
d[..., 2] = 128
# dithered before rounding: the 8-bit steps become a fine grain instead of stair-steps and sheared rows
dith = np.random.default_rng(7).uniform(-.5, .5, (N, N, 1))
q = np.clip(np.round(d + np.where(inside[..., None], dith, 0)), 0, 255)
q[..., 2] = 128
save('lens.png', q, 'RGB')
with open(os.path.join(OUT, 'lens.txt'), 'w') as fh:
    fh.write('%.6f' % (2 * MAXD))  # the displacement scale, in radii

# ---- the sun on the disc: Lambert light from the upper left, a soft terminator, and its complement for the night layer
sun = np.array([-.62, -.52, .6])  # upper left, so the terminator bends across the disc
sun /= np.linalg.norm(sun)
zn = np.sqrt(np.clip(1 - r2, 0, 1))
lam = xn * sun[0] + yn * sun[1] + zn * sun[2]
day = np.clip((lam + .12) / .62, 0, 1) ** 1.3  # a wide soft terminator: a thick atmosphere scatters light past it
dark = np.zeros((N, N, 4))
dark[..., :3] = hexc('#0b0710')
dark[..., 3] = np.where(inside, (1 - day) * .9 * 255, 0)  # the bands stay faintly visible on the night side
save('night.png', dark, 'RGBA')
nm = np.zeros((N, N, 4))
nm[..., :3] = 255
nm[..., 3] = np.where(inside, np.clip(1 - day * 1.3, 0, 1) * 255, 0)
save('nightmask.png', nm, 'RGBA')
print('ok')
