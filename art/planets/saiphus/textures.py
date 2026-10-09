"""Saiphus's maps for the living planet: a banded gas giant (deep belts and bright zones with sheared, curling edges and storm
ovals), the faster sulfuric haze above them, the life band with its floating islands under fog, and the night side's
bioluminescent algae; then the lens and the sun (planetlib), with a dawn band along the terminator.

Run from the repo root: python art/planets/saiphus/textures.py  (writes art/planets/saiphus/out/)
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from planetlib import *  # noqa: E402,F401,F403
import planetlib as P  # noqa: E402

use(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(1630)

# ---- the storms: great ovals set on the boundaries between bands, turning the flow around them ("violent and relentless
# storms", and the "immense superstorms" stirring below the Benthane squalls)
STORMS = []  # (longitude, latitude, radius, spin)
for lo, la, r, s in [(1.0, -.38, .16, 3.2), (3.6, .52, .1, -2.8), (5.2, -.1, .08, 2.6), (2.3, .2, .06, -2.4), (4.4, -.62, .07, 2.2), (.2, .74, .06, -2.0)]:
    STORMS.append((lo, la, r, s))
axes = [(math.cos(lo) * math.cos(la), math.sin(lo) * math.cos(la), math.sin(la), s, r * 1.4) for lo, la, r, s in STORMS]
X, Y, Z = swirl(CX, CY, CZ, axes)
LATW = np.arcsin(np.clip(Z, -1, 1))  # latitude after the storms have wound the flow

# ---- the bands: zones (bright) and belts (dark) by latitude, their edges sheared into waves and curls by the flow
turb = fbm(X * 3.0, Y * 3.0, Z * 9.0, octaves=4)  # stretched along latitude: the flow is east-west
turb2 = fbm(X * 7.0 + 3, Y * 7.0, Z * 20.0, octaves=4)
lat_w = LATW + turb * .06 + wblur(turb2 * .5 + .5, 1.5 * K) * .012  # wavy band edges, not frayed
# the band profile: a sum of a few sines of latitude, unequal widths
prof = (np.sin(lat_w * 7.2 + .4) * .55 + np.sin(lat_w * 12.6 + 1.3) * .3 + np.sin(lat_w * 19.0 + 2.1) * .15)
zone = smooth(-.25, .35, prof)  # 1 in a bright zone, 0 in a dark belt
fine = fbm(X * 4.0, Y * 4.0, Z * 20.0, octaves=4) * .5 + .5  # fine streaks within each band (no hairline octave: it frayed the band edges)
# palette: pale cream and sand zones, ochre and dusty rose belts, a deeper russet in the darkest belts
belt_c = lerpc(hexc('#9a6a74'), hexc('#c4949a'), smooth(.2, .8, fine))  # dusty rose
deep = smooth(-.55, -.85, prof)
belt_c = belt_c + (np.array(hexc('#5e3c56'), float) - belt_c) * (deep * .7)[..., None]  # plum in the deepest belts
zone_c = lerpc(hexc('#e6d2c0'), hexc('#f8ece0'), smooth(.25, .85, fine))  # pale peach and cream
col = belt_c + (zone_c - belt_c) * zone[..., None]
# the polar regions: duller and bluer, with fewer bands
polar = smooth(.95, 1.3, np.abs(LAT))
col = col + (lerpc(hexc('#7a7088'), hexc('#a49ab0'), fine) - col) * (polar * .7)[..., None]  # lavender-grey poles
# the storm ovals: pale cores ringed by darker collars, the big one rose-red
for i, (lo, la, r, s) in enumerate(STORMS):
    ax = (math.cos(lo) * math.cos(la), math.sin(lo) * math.cos(la), math.sin(la))
    d = np.arccos(np.clip(CX * ax[0] + CY * ax[1] + CZ * ax[2], -1, 1)) / r
    dlo = np.angle(np.exp(1j * (LON - lo))) * math.cos(la)
    oval = np.sqrt((dlo / (r * 1.6)) ** 2 + ((LAT - la) / r) ** 2)  # wider than tall
    core = smooth(1.0, .55, oval) * (.8 + .2 * fine)
    collar = smooth(1.25, 1.0, oval) * smooth(.75, 1.0, oval)
    core_c = np.array(hexc('#3c3450') if i == 0 else hexc('#fbf3e8'), float)  # the superstorm dark, the others pale
    col = col + (core_c - col) * (core * (.85 if i == 0 else .7))[..., None]
    col = col * (1 - (collar * .25)[..., None])
# shading: the cloud tops have a little relief from the fine streaks
soft = wblur(fine * .5 + zone * .5, 1.2 * K)
col *= np.clip(relief(soft, 10), .9, 1.1)[..., None]
save('bands.png', col, 'RGB')

# ---- the upper haze: thin sulfuric streaks ("Sulfuric acid clouds sweep haphazardly across the sky") blowing faster than the
# bands, yellowish and translucent, with the life band's fog
X2, Y2, Z2 = CX * 2.2, CY * 2.2, (CZ + CX * .12) * 18.0  # long streaks, tilted a little across the bands
hz = pct(fbm(X2 + 11, Y2, Z2, octaves=6), 0, 100)
hz_a = wblur(smooth(.6, .85, hz), 2 * K) * .75  # about a fifth of the sky, soft-edged
h = np.zeros((H, W, 4))
h[..., :3] = lerpc(hexc('#d0a830'), hexc('#e8d060'), smooth(.55, 1, hz))  # sulfur yellow, saturated enough to show on the pale zones
h[..., 3] = hz_a * 255
save('haze.png', h, 'RGBA')

# ---- the life band: "islands of floating landmass ... separated by a sea of clouds and dense fog", "from little more than
# flying boulders to landmasses that are hundreds of miles across". In one band of latitude a scatter of small flecks of land,
# green plains with brown edges, some in clusters, under drifting fog; they ride their own layer, drifting slower than the haze
LIFE_LA, LIFE_W = .3, .1
ir = np.random.default_rng(31)
isl = np.zeros_like(fine)
for i in range(70):
    lo, la = ir.uniform(0, 2 * math.pi), LIFE_LA + ir.normal(0, LIFE_W * .5)
    r = ir.choice([.004, .006, .008, .012, .02], p=[.35, .3, .2, .1, .05])
    for j in range(ir.integers(1, 5)):  # some in clusters
        lo2, la2 = lo + ir.normal(0, r * 3), la + ir.normal(0, r * 2)
        rr = r * ir.uniform(.6, 1.2)
        dlo = np.angle(np.exp(1j * (LON - lo2))) * math.cos(la2)
        dd = np.sqrt(dlo ** 2 + (LAT - la2) ** 2) / rr
        if dd.min() > 1:
            continue
        isl = np.maximum(isl, smooth(1.0, .7, dd * (1 + .25 * turb2)))
it = np.zeros((H, W, 4))
plain = fbm(CX * 60, CY * 60, CZ * 60, octaves=2) * .5 + .5
it[..., :3] = lerpc(hexc('#6e8a48'), hexc('#8aa45a'), plain)  # sunlit plains
edge_ = smooth(.2, .7, isl) * smooth(1.0, .75, isl)
it[..., :3] = it[..., :3] + (np.array(hexc('#b8a878'), float) - it[..., :3]) * (edge_ * .7)[..., None]  # pale cliff edges
it[..., 3] = smooth(.15, .45, isl) * 255
save('islands.png', it, 'RGBA')
# the islands' shadows on the cloud below, offset away from the sun (east and south)
sh = np.zeros((H, W, 4))
sh[..., 3] = np.roll(np.roll(smooth(.15, .45, isl), int(3 * K), axis=1), int(2 * K), axis=0) * 60
save('islandshade.png', sh, 'RGBA')
# fog drifting over the life band, partly hiding the islands
fogn = fbm(CX * 5 + 3, CY * 5, CZ * 18, octaves=5) * .5 + .5
fog = smooth(.45, .75, fogn) * np.exp(-((LAT - LIFE_LA) / (LIFE_W * 1.6)) ** 2) * .45  # wisps; about a third of the islands sit partly under them
fg = np.zeros((H, W, 4))
fg[..., :3] = hexc('#f4ece0')
fg[..., 3] = fog * 255
save('fog.png', fg, 'RGBA')

# ---- the night side's own light: "floating colonies of bright, colorful airborne algae and bioluminescent zooplankton" drift in
# the life band, a faint teal and violet glow where it is dark
bio = np.zeros_like(fine)
for i in range(46):
    lo, la = ir.uniform(0, 2 * math.pi), LIFE_LA + ir.normal(0, LIFE_W * .8)
    r = ir.uniform(.01, .03)
    dlo = np.angle(np.exp(1j * (LON - lo))) * math.cos(la)
    bio = np.maximum(bio, np.exp(-(dlo ** 2 / (r * 2.2) ** 2 + (LAT - la) ** 2 / r ** 2)))
bio = bio * smooth(.3, .7, fbm(CX * 20, CY * 20, CZ * 30, octaves=3) * .5 + .5)
b = np.zeros((H, W, 4))
hue = fbm(CX * 3, CY * 3, CZ * 3, octaves=2) * .5 + .5
b[..., :3] = lerpc(hexc('#40e0c0'), hexc('#a070ff'), smooth(.35, .65, hue))
b[..., 3] = np.clip(bio * 1.4, 0, 1) * 255
save('bio.png', b, 'RGBA')

# ---- where the storms are thick, for lightning and the Benthane squalls
sm = np.zeros_like(fine)
for lo, la, r, s in STORMS:
    dlo = np.angle(np.exp(1j * (LON - lo))) * math.cos(la)
    sm = np.maximum(sm, smooth(1.3, .6, np.sqrt((dlo / (r * 1.6)) ** 2 + ((LAT - la) / r) ** 2)))
m = np.zeros((H, W, 4))
m[..., :3] = 255
m[..., 3] = sm * 255
from PIL import Image as _I
_I.fromarray(m.astype(np.uint8), 'RGBA').resize((512, 256), _I.BILINEAR).save(os.path.join(P.OUT, 'stormmask.png'))
with open(os.path.join(P.OUT, 'storms.txt'), 'w') as fh:
    for lo, la, r, s in STORMS:
        fh.write('%.5f %.5f %.5f\n' % (lo, la, r))

lens()
# a gas giant's deep, scattering atmosphere: a wide soft terminator
sun(direction=(-.86, -.32, .36), soft=(.16, .8), night_color='#0a0610', night_alpha=.86, eased=True)
# dawn: "sunrises that light the entire world and all its clouds beautiful shades of orange and pink" - a warm band along the
# terminator, on the disc
N = 512
yy, xx = np.mgrid[0:N, 0:N]
xn, yn = (xx + .5) / N * 2 - 1, (yy + .5) / N * 2 - 1
r2 = xn * xn + yn * yn
sun_ = np.array([-.86, -.32, .36])
sun_ /= np.linalg.norm(sun_)
lam = xn * sun_[0] + yn * sun_[1] + np.sqrt(np.clip(1 - r2, 0, 1)) * sun_[2]
dawn = np.exp(-((lam - .06) / .2) ** 2) * (r2 < 1)
dw = np.zeros((N, N, 4))
dw[..., :3] = lerpc(hexc('#ff8a5a'), hexc('#ff9ab0'), np.clip((yn + 1) / 2, 0, 1))
dw[..., 3] = dawn * .28 * 255
save('dawn.png', dw, 'RGBA')
# drawn as a warm tint multiplied into the clouds on the day side of the terminator (a bright band added on top of the night read
# as a false second terminator)
warm = np.exp(-((lam - .14) / .14) ** 2) * (r2 < 1) * (lam > -.02)
dm = np.ones((N, N, 3)) * 255
dm = dm + (lerpc(hexc('#ffc4a0'), hexc('#ffbcd0'), np.clip((yn + 1) / 2, 0, 1)) - dm) * (warm * .45)[..., None]
save('dawnmul.png', dm, 'RGB')
dn = np.zeros((N, N, 4))
dn[..., :3] = 255
dn[..., 3] = np.clip((-.08 - lam) / .2, 0, 1) * (r2 < 1) * 255  # deep night only: the glowing algae never show in daylight
save('deepnight.png', dn, 'RGBA')
print('ok')
