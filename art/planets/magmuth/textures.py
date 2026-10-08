"""Magmuth's maps for the living planet: ash-covered basalt and obsidian islands with glass spires, seas of lava under a broken
crust, glowing fissures on the land, and drifting smoke and ash; then the lens and the red dwarf's light (planetlib).

Run from the repo root: python art/planets/magmuth/textures.py  (writes art/planets/magmuth/out/)
"""
import math
import os
import sys

import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from planetlib import *  # noqa: E402,F401,F403
import planetlib as P  # noqa: E402

use(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(1601)

# ---- the shape of the world: a low, ragged land of islands in seas of lava ("boiling oceans of lava and molten rock pocked
# with obsidian islands and jagged spires of volcanic glass")
warp = fbm(*S(1.3), octaves=3)
X, Y, Z = S(2.2)
base = pct(fbm(X + warp * .5, Y - warp * .4, Z, octaves=6), .5, 99.5)
SEA = np.percentile(base, 42)  # about 42 percent of the world is molten sea
shore = smooth(SEA - .02, SEA + .015, base)  # 0 in the sea, 1 on land
land_h = np.clip((base - SEA) / (1 - SEA), 0, 1)

# ---- the land: basalt and obsidian under a thick ash, ridged crests and jagged glass spires on the high ground
X, Y, Z = S(5.0)
crest = (1 - np.abs(rnoise(X + warp * .3, Y, Z, 11))) ** 3
X, Y, Z = S(14.0)
spire = (1 - np.abs(rnoise(X, Y + warp * .2, Z, 12))) ** 6 * smooth(.35, .8, land_h)
h = land_h * .6 + crest * .3 * land_h + spire * .35
gy, gx = np.gradient(h)
shade = np.clip(1 + (gx * .55 + gy * .45) * 34 * K, .4, 1.6)
ash = smooth(.0, .5, fbm(*S(7), octaves=4) * .5 + .5) * smooth(.06, .0, np.sqrt(gx * gx + gy * gy) * 40 * K)  # ash settles on the flats
col = lerpc(hexc('#2a2222'), hexc('#3e3432'), land_h)  # basalt
col = col + (lerpc(hexc('#5a4e48'), hexc('#83746a'), fbm(*S(22), octaves=2) * .5 + .5) - col) * (ash * .8)[..., None]  # ash
col *= shade[..., None]
facing = np.clip((gx * .55 + gy * .45) * 50 * K, 0, 1)
glint = smooth(.25, .6, spire) * facing  # volcanic glass catching the sun
col = col + (np.array(hexc('#c9b2a6'), float) - col) * (glint * .7)[..., None]
col += (fbm(*S(40), octaves=2) * 4)[..., None]

# ---- the seas: molten rock under a crust broken into plates, the plates parting in bright seams, the crust breaking up into
# open lava along the shores
def plates(n, seed, wob):
    """Voronoi plates on the sphere: distance to a seam (0 on it) and each pixel's plate index."""
    r = np.random.default_rng(seed)
    pts = r.normal(size=(n, 3))
    pts /= np.linalg.norm(pts, axis=1, keepdims=True)
    j = fbm(*S(9 + seed % 5), octaves=3) * wob
    dd, ii = cKDTree(pts).query(np.stack([CX + j, CY - j, CZ + j * .5], -1).reshape(-1, 3), k=2)
    f1, f2 = dd[:, 0].reshape(H, W), dd[:, 1].reshape(H, W)
    return (f2 - f1) / (f2 + f1), ii[:, 0].reshape(H, W)


edge, pid = plates(2200, 3, .02)  # the big plates
edge2, _ = plates(14000, 5, .01)  # each plate crazed with finer cracks
heat = np.random.default_rng(9).uniform(0, 1, pid.max() + 1)[pid]  # some plates thin and hot, most cooled dark
seam = np.maximum(smooth(.035, .0, edge), smooth(.02, .0, edge2) * .35)
open_lava = smooth(SEA, SEA - .05, base)  # 1 offshore, 0 at the shore: the crust is whole offshore
breakup = 1 - open_lava  # near shore the crust breaks up into open lava
flow = smooth(.3, .75, fbm(*S(6), octaves=3) * .5 + .5)  # where the crust is moving the seams run hot; elsewhere they skin over
molten = np.clip(seam * (.25 + .75 * flow) * (.5 + .5 * breakup + .5 * heat) + breakup * .9 + smooth(.1, .0, edge) * breakup * .4 + heat ** 6 * .25, 0, 1)
crust = lerpc(hexc('#140a09'), hexc('#2a120c'), np.clip(fbm(*S(30), octaves=2) * .5 + .5 + heat * .3, 0, 1))
lava = lerpc(hexc('#b0280a'), hexc('#ffc050'), np.clip(molten * 1.25 - .15, 0, 1))
sea_col = crust + (lava - crust) * molten[..., None]
surface = col * shore[..., None] + sea_col * (1 - shore[..., None])

# ---- fissures on the land: "the cracks in the earth glow an eerie red from the magma that seeps up". Zero lines of noise,
# width measured in map pixels, running out in places
def px_dist(n):
    a, b = np.gradient(n)
    return np.abs(n) / (np.sqrt(a * a + b * b) + 1e-6)


X, Y, Z = S(4.2)
cw = fbm(*S(11), octaves=3) * .25
d1 = px_dist(rnoise(X + cw, Y - cw, Z, 21))
gate = smooth(.42, .56, pct(fbm(*S(2.5), octaves=3), 0, 100)) * smooth(.15, .4, land_h)
crack = np.exp(-(d1 / (1.1 * K)) ** 2) * gate * smooth(1.35, 1.15, np.abs(LAT))  # the map's rows crowd together near the poles, where a distance-measured line smears into a band
surface = surface * (1 - (crack * .6)[..., None]) + (np.array(hexc('#ff6a20'), float) * crack[..., None] * .6)
save('surface.png', surface, 'RGB')

# ---- the light the lava gives off: the molten seams and shores, the open lava, the fissures. Drawn with screen blending over
# the planet, day and night (lava is self-lit); its soft halo is shown at night only
glow_core = np.clip(molten * (1 - shore) + crack * .9, 0, 1)
e = np.zeros((H, W, 4))
e[..., :3] = lerpc(hexc('#d0360a'), hexc('#ffd070'), np.clip(glow_core * 1.3 - .2, 0, 1))
e[..., 3] = glow_core * 255
save('lava.png', e, 'RGBA')
halo = wblur(glow_core, 6 * K)
hh = np.zeros((H, W, 4))
hh[..., :3] = hexc('#ff5418')
hh[..., 3] = np.clip(halo * 1.8, 0, 1) * 255
save('lavahalo.png', hh, 'RGBA')
# the fissures alone, for the travelling surges ("Rivers of fire flash across the wastes")
cr = np.zeros((H, W, 4))
cr[..., :3] = hexc('#ffc060')
cr[..., 3] = np.clip(crack * 1.2, 0, 1) * 255
save('cracks.png', cr, 'RGBA')

# ---- smoke and ash: "The acrid air is thick with volcanic smoke ... violent ash storms". Dark brown-grey, streaky, sheared by
# the wind, a few storms wound into whorls; dull red light on its tops
CYC = [(.5, .6, .62, 2.2, .18), (-.4, -.7, -.4, -2.4, .2), (.2, -.8, .5, 2.0, .16)]
X, Y, Z = swirl(CX, CY, CZ, CYC)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
sm = fbm(X * 3.2 + w1 * 1.2, Y * 3.2 - w1, Z * 7.0 + w1 * .6, octaves=6)  # stretched along latitude: streaks
sm = pct(sm + np.sin(LAT * 7 + w1 * 2) * .08, 10, 99.6)
s_alpha = smooth(.32, .72, sm) * .9
soft = wblur(sm, 1.4 * K)
csh = np.clip(relief(soft, 26), .6, 1.35)
c = np.zeros((H, W, 4))
c[..., :3] = lerpc(hexc('#231c1a'), hexc('#6e5b52'), smooth(.55, 1, sm)) * csh[..., None]
c[..., 3] = s_alpha * 235
save('smoke.png', c, 'RGBA')
sh = np.zeros((H, W, 4))
sh[..., 3] = s_alpha * 200
save('smokeshade.png', sh, 'RGBA')
lm = (shore * 255).astype(np.uint8)
from PIL import Image as _I
_I.fromarray(lm, 'L').resize((512, 256), _I.BILINEAR).save(os.path.join(P.OUT, 'landmask.png'))

lens()
# a red dwarf: a dimmer, warmer day, the terminator a little softer
sun(direction=(-.86, -.32, .36), soft=(.08, .5), night_color='#070304', night_alpha=.95)
print('ok')
