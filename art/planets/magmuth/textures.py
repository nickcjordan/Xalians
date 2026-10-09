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
shore = smooth(SEA - .03, SEA + .025, wblur(base, 1.5 * K))  # 0 in the sea, 1 on land, from a softened field: no staircase
land_h = np.clip((base - SEA) / (1 - SEA), 0, 1)

# ---- the land: basalt and obsidian under a thick ash, ridged crests and jagged glass spires on the high ground
X, Y, Z = S(5.0)
crest = (1 - np.abs(rnoise(X + warp * .3, Y, Z, 11))) ** 3
X, Y, Z = S(14.0)
spire = (1 - np.abs(rnoise(X, Y + warp * .2, Z, 12))) ** 6 * smooth(.35, .8, land_h)
vr = np.random.default_rng(77)
VOLC = []
while len(VOLC) < 18:
    v = vr.normal(size=3)
    v /= np.linalg.norm(v)
    lo_, la_ = math.atan2(v[1], v[0]) % (2 * math.pi), math.asin(v[2])
    u_, w_ = int(lo_ / (2 * math.pi) * W) % W, int((la_ / math.pi + .5) * H)
    if abs(la_) < 1.0 and land_h[min(H - 1, w_), u_] > .25 and all(np.dot(v, q) < .94 for q, _ in VOLC):
        VOLC.append((v, vr.uniform(.2, .28) if len(VOLC) < 5 else vr.uniform(.09, .14)))
cone = np.zeros_like(land_h)
caldera = np.zeros_like(land_h)
flows = np.zeros_like(land_h)
flow_t = np.zeros_like(land_h)  # how hot a flow is: hottest at the crater, cooling toward its tip
rough = 1 + .15 * fbm(*S(18), octaves=2)
for v, r_ in VOLC:
    dist = np.arccos(np.clip(CX * v[0] + CY * v[1] + CZ * v[2], -1, 1)) / r_
    # lava running down the flanks from the crater: a few radial channels, wavering, fading toward the foot
    e1 = np.cross(v, [0, 0, 1])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(v, e1)
    th = np.arctan2(CX * e2[0] + CY * e2[1] + CZ * e2[2], CX * e1[0] + CY * e1[1] + CZ * e1[2])
    nch = vr.integers(2, 4)
    ch = np.cos(nch * th + vr.uniform(0, 6) + fbm(*S(12), octaves=2) * 2.5 + dist * 1.5)
    ch2 = np.cos(2 * nch * th + vr.uniform(0, 6) + fbm(*S(14), octaves=2) * 2.0)
    taper = .985 - dist * .05  # narrower toward the tip
    f_ = np.maximum(smooth(taper - .02, taper + .01, ch) * smooth(.8, .14, dist), smooth(taper - .01, taper + .01, ch2) * smooth(.55, .3, dist) * smooth(.25, .35, dist) * .8)  # tongues and their branches
    f_ = f_ * smooth(.1, .17, dist)
    flows = np.maximum(flows, f_)
    flow_t = np.maximum(flow_t, f_ * np.clip(1 - dist / .8, 0, 1))
    cone = np.maximum(cone, np.clip(1 - dist * rough, 0, 1) ** 1.6 * (1 - smooth(.18, .0, dist) * .6))  # a cone with its top cut into a crater
    caldera = np.maximum(caldera, smooth(.17, .1, dist) * (.75 + .25 * smooth(.1, .0, dist)))  # the crater full of glowing lava
h = land_h * .5 + crest * .1 * land_h * (1 - cone) + spire * .2 * (1 - cone) + cone * .9  # the cones' smooth flanks are fresh rock, not crags
gy, gx = np.gradient(h)
shade = np.clip(1 + (gx * .55 + gy * .45) * 22 * K, .45, 1.5)
X, Y, Z = S(6)
ashn = fbm(X * 1.0, Y * 1.0, Z * 2.6, octaves=5) * .5 + .5  # stretched east-west: drifts lined up with the wind
ash = smooth(.34, .52, ashn) * smooth(.06, .0, np.sqrt(gx * gx + gy * gy) * 40 * K)  # ash settles on the flats
col = lerpc(hexc('#2a2321'), hexc('#3a302c'), land_h)  # basalt and obsidian
col = col + (lerpc(hexc('#9a8b80'), hexc('#bcab9c'), fbm(*S(22), octaves=2) * .5 + .5) - col) * (ash * .92)[..., None]  # pale ash drifts
cgy, cgx = np.gradient(wblur(cone, 1.2 * K))
cshade = np.clip(1 + (cgx * .55 + cgy * .45) * 140 * K, .3, 2.0)
col = col * (1 - (cone * .35)[..., None])  # fresh dark lava on the cones
col = col * (1 + (cshade - 1) * smooth(.02, .2, cone))[..., None]
col *= shade[..., None]
facing = np.clip((gx * .55 + gy * .45) * 50 * K, 0, 1)
glint = smooth(.25, .6, spire) * facing  # volcanic glass catching the sun
glint = glint * (fbm(*S(60), octaves=1) > .55)  # sharp glints on a few facets only
col = col + (np.array(hexc('#c8b8b0'), float) - col) * (glint * .4)[..., None]
col += (fbm(*S(40), octaves=2) * 4)[..., None]

def px_dist(n):
    a, b = np.gradient(n)
    return np.abs(n) / (np.sqrt(a * a + b * b) + 1e-6)


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


sea = 1 - shore
X, Y, Z = S(3.3)
hotf = fbm(X + warp * .4, Y, Z - warp * .3, octaves=5)
sea_vals = hotf[sea > .9]
P88, P62 = np.percentile(sea_vals, 89), np.percentile(sea_vals, 64)
pool = wblur(smooth(P88, P88 + .012, hotf), .9 * K) * sea  # open molten rock, a firm but smooth edge
thin = smooth(P88 - .06, P88, hotf) ** 2 * sea * (1 - pool)  # crust thin enough to glow through, close round the pools
edgeB, pidB = plates(260, 3, .02)  # big plates far from the open lava
edgeS, _ = plates(5200, 5, .015)  # small broken plates near it
nearhot = smooth(.0, .5, wblur(np.maximum(pool, thin * .6), 10 * K))
edge = np.where(nearhot > .5, edgeS * 1.4, edgeB)
# hero rifts: a few of the big plates' seams torn open, 5 to 9 px, jagged because they follow the plates
gateR = smooth(.68, .8, pct(fbm(*S(1.6), octaves=3), 0, 100))
rift = smooth(.05, .012, edgeB) * gateR * smooth(.5, .9, sea)
seam = wblur(smooth(.03, .0, edge), .6 * K) * sea
crust_c = lerpc(hexc('#0a0605'), hexc('#160a07'), fbm(*S(30), octaves=2) * .5 + .5)
thin_c = lerpc(hexc('#5a1408'), hexc('#8a2a10'), thin)
sea_col = crust_c + (thin_c - crust_c) * smooth(.0, .6, thin)[..., None]
sea_col = sea_col + (lerpc(hexc('#c02a08'), hexc('#ff7a1a'), seam) - sea_col) * (seam * .5)[..., None]  # seams half as bright as open lava
churn = fbm(*S(16), octaves=3) * .5 + .5  # convection cells in the open lava
core_t = smooth(P88 + .02, P88 + .12, hotf) * (.55 + .45 * churn)
pool_c = lerpc(hexc('#b8280a'), hexc('#ff7a1a'), smooth(.0, .6, pool))
pool_c = pool_c + (np.array(hexc('#ffc260'), float) - pool_c) * (core_t * .55)[..., None]
edgeL, _ = plates(16000, 11, .02)  # the skin on a lava lake, torn into small slabs
skin = smooth(.06, .0, edgeL) * .55 + smooth(.35, .7, churn) * .25  # darker veins where the skin folds, dimmer where the convection is slack
pool_c = pool_c * (1 - (skin * .45)[..., None])
pool_c = pool_c + (np.array(hexc('#ffd27a'), float) - pool_c) * (smooth(.35, .0, edgeL) * smooth(.4, .8, churn) * .35)[..., None]  # bright upwelling at the cells' hearts
pool_c = pool_c * (.85 + .15 * churn)[..., None]
sea_col = sea_col + (pool_c - sea_col) * pool[..., None]
rafts = smooth(.25, .4, edgeS) * smooth(P88 + .05, P88 + .01, hotf) * pool  # crust broken into rafts drifting at a pool's margin
sea_col = sea_col + (np.array(hexc('#1a0a06'), float) - sea_col) * (rafts * .85)[..., None]
sea_col = sea_col + (np.array(hexc('#ff9a3a'), float) - sea_col) * rift[..., None]
breakup = smooth(.0, .5, wblur(shore, 3 * K)) * sea  # the shore's own band of broken, glowing crust
sea_col = sea_col + (np.array(hexc('#ff8a30'), float) - sea_col) * (smooth(.35, .8, breakup) * .8)[..., None]
molten = np.clip(pool + rift + seam * .5 + thin * .35 + smooth(.35, .8, breakup) * .8, 0, 1)
surface = col * shore[..., None] + sea_col * (1 - shore[..., None])
surface = surface + (np.array(hexc('#ff7a20'), float) - surface) * np.maximum(caldera, flows * .8)[..., None]

# ---- fissures on the land: "the cracks in the earth glow an eerie red from the magma that seeps up". Zero lines of noise,
# width measured in map pixels, running out in places
X, Y, Z = S(4.2)
cw = fbm(*S(11), octaves=3) * .25
d1 = px_dist(rnoise(X + cw, Y - cw, Z, 21))
gate = smooth(.42, .56, pct(fbm(*S(2.5), octaves=3), 0, 100)) * smooth(.15, .4, land_h)
cwid = (.6 + 1.4 * smooth(.3, .7, fbm(*S(8), octaves=2) * .5 + .5)) * K  # 0.6 to 2 px along each crack
crack = np.exp(-(d1 / cwid) ** 2) * gate * smooth(1.35, 1.15, np.abs(LAT))  # the map's rows crowd together near the poles, where a distance-measured line smears into a band
import scipy.ndimage as ndi
lab, _n = ndi.label(crack > .3)
for i_, sl in enumerate(ndi.find_objects(lab)):
    if sl is not None and max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 80 * K:
        crack[sl][lab[sl] == i_ + 1] = 0
surface = surface * (1 - (crack * .6)[..., None]) + (np.array(hexc('#ff6a20'), float) * crack[..., None] * .6)
save('surface.png', surface, 'RGB')

# ---- the light the lava gives off: the molten seams and shores, the open lava, the fissures. Drawn with screen blending over
# the planet, day and night (lava is self-lit); its soft halo is shown at night only
POLE = smooth(1.22, 1.08, np.abs(LAT))  # the lens squeezes the map's polar rows into its last stair-steps: no glow there
glow_core = np.clip((molten - pool * .45 - rafts * .5 - pool * skin * .35) * (1 - shore) + crack * .4 + caldera * .8 + flows * (.2 + .4 * flow_t), 0, 1) * POLE
e = np.zeros((H, W, 4))
e[..., :3] = lerpc(hexc('#7a1a08'), hexc('#ffd070'), np.clip(glow_core * 1.2 - .1, 0, 1))  # cooler where dimmer
e[..., 3] = glow_core * 255
save('lava.png', e, 'RGBA')
small_core = np.clip(pool + rift + smooth(.35, .8, breakup) * .8 * (1 - shore) + caldera + flow_t, 0, 1) * POLE
es = e.copy()
es[..., 3] = small_core * 255
save('lava-small.png', es, 'RGBA')
halo = wblur(np.clip(pool * .6 + rift + caldera + flow_t, 0, 1) * POLE, 7 * K) * .6 + wblur(glow_core, 4 * K) * .3  # the open lava blooms most
hh = np.zeros((H, W, 4))
hh[..., :3] = hexc('#ff5418')
hh[..., 3] = np.clip(halo * 1.8, 0, 1) * 255
save('lavahalo.png', hh, 'RGBA')
# the fissures alone, for the travelling surges ("Rivers of fire flash across the wastes")
cr = np.zeros((H, W, 4))
cr[..., :3] = hexc('#ffc870')
cr[..., 3] = np.clip(wblur(crack, .8 * K) * 1.5, 0, 1) * POLE * 255
save('cracks.png', cr, 'RGBA')

# ---- smoke and ash: "The acrid air is thick with volcanic smoke ... violent ash storms". Three great ash storms, long streaky
# bands sheared by the wind, dark and nearly opaque, and thin wisps over about a third of the world
CYC = [(.5, .6, .62, 1.2, .2), (-.4, -.7, -.4, -1.3, .22), (.2, -.8, .5, 1.1, .18)]
X, Y, Z = swirl(CX, CY, CZ, CYC)
w1 = fbm(X * 2.0, Y * 2.0, Z * 2.0, octaves=4)
streak = fbm(X * 2.4 + w1 * 1.2, Y * 2.4 - w1, Z * 9.0 + w1 * 1.4, octaves=6) * .5 + .5  # stretched east-west into streaks
storms = np.zeros_like(streak)
sr = np.random.default_rng(31)
for i in range(3):
    lo0, la0 = sr.uniform(0, 2 * math.pi), sr.uniform(-.7, .7)
    dlo = np.angle(np.exp(1j * (LON - lo0)))  # longitude difference, wrapped
    band = np.exp(-(dlo / sr.uniform(1.0, 1.5)) ** 2 - ((LAT - la0 - dlo * sr.uniform(-.25, .25)) / sr.uniform(.15, .24)) ** 2)
    storms = np.maximum(storms, band)
storm_a = smooth(.2, .6, storms * smooth(.3, .75, streak) * 1.3) * .85
wisp_a = smooth(.58, .8, streak) * .45
s_alpha = np.clip(np.maximum(storm_a, wisp_a), 0, .88)
soft = wblur(streak, 1.4 * K)
csh = np.clip(relief(soft, 20), .75, 1.2)
c = np.zeros((H, W, 4))
c[..., :3] = lerpc(hexc('#2a201d'), hexc('#4a3c35'), streak) * csh[..., None]
c[..., 3] = s_alpha * 255
save('smoke.png', c, 'RGBA')
sh = np.zeros((H, W, 4))
sh[..., 3] = s_alpha * .75 * 255  # the lava under the smoke shows at about a third
save('smokeshade.png', sh, 'RGBA')
# by night, the storms' undersides lit red where they pass over open lava
sg = np.zeros((H, W, 4))
sg[..., :3] = hexc('#ff5020')
sg[..., 3] = np.clip(storm_a * wblur(np.clip(pool + rift + flow_t, 0, 1), 14 * K) * 3, 0, 1) * POLE * 255
save('smokeglow.png', sg, 'RGBA')
# the great volcanoes smoke all the time: a dark column of ash leaning downwind (east) from each crater, spreading and thinning;
# it is fixed to the ground, so it turns with the planet, not with the storms
vs = np.zeros_like(land_h)
for v, r_ in VOLC[:5]:
    lo0, la0 = math.atan2(v[1], v[0]) % (2 * math.pi), math.asin(v[2])
    dlo = np.angle(np.exp(1j * (LON - lo0))) * math.cos(la0)  # eastward distance, radians on the sphere
    dla = LAT - la0
    along = np.clip(dlo, 0, None)
    width = .015 + along * .3
    col_ = np.exp(-(dla - along * .12) ** 2 / (2 * width ** 2)) * smooth(-.004, .01, dlo) * np.exp(-along / .35)
    vs = np.maximum(vs, col_ * smooth(.15, .6, fbm(*S(20), octaves=4) * .5 + .5 + col_ * .3))  # broken into billows
vp = np.zeros((H, W, 4))
vsh = np.clip(relief(wblur(vs, 2 * K), 60), .7, 1.4)  # the column lit on its sun side, as a rounded billow
vp[..., :3] = lerpc(hexc('#5a4c45'), hexc('#8e7e72'), smooth(.3, .8, streak)) * vsh[..., None]  # pale ash, so it shows over the dark rock
vp[..., 3] = np.clip(vs * 1.3, 0, .85) * 255
save('ventsmoke.png', vp, 'RGBA')
lm = (shore * 255).astype(np.uint8)
from PIL import Image as _I
_I.fromarray(lm, 'L').resize((512, 256), _I.BILINEAR).save(os.path.join(P.OUT, 'landmask.png'))

with open(os.path.join(P.OUT, 'volcanoes.txt'), 'w') as fh:
    for v, r_ in VOLC:
        fh.write('%.5f %.5f %.5f\n' % (math.atan2(v[1], v[0]) % (2 * math.pi), math.asin(v[2]), r_))
lens()
# a red dwarf: a dimmer, warmer day, the terminator a little softer
sun(direction=(-.86, -.32, .36), soft=(.03, .26), night_color='#060303', night_alpha=.97)
print('ok')
