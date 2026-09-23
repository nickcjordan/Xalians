"""Build the Unbirth plate: python art/plates/unbirth/build.py writes source.html beside it.

The plate is generated because most of it is procedural (cloud lobes, rain, seed pods, ripples,
moss). Edit this script, run it, then export with scripts/plates/export-plate.py unbirth. Every
drawn piece traces to a line of PIECES below.
"""
import io
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1536, 658
HZ = 392  # the horizon: the far edge of the flooded plain
GX, GBASE = 570, 468  # the Genesis Prototype: center and the rock it stands on
T = 24.0  # the master cycle: every clock divides it
GSC = 1.25  # the Generator is drawn at this scale around its footing


def GS(x, y):
    return GX + (x - GX) * GSC, GBASE + (y - GBASE) * GSC

CONCEPT = """The Age of Unbirth: sterile, the Vallerii built machines to make life for them. The first was
the Genesis Prototype, raised on Floria, a bare world of smooth rock and shallow seas that its
star boiled into a world-washing flood every year, chosen so any mistake would be washed away.
Uncalibrated, it ran at full capacity through the entire storm and made not only Xalians but the
vegetation, fungi and World Trees to support them (Floria, paragraphs 1 to 7); some Xalians there
are said to be born from its first seeds (paragraph 10). The plate is that first storm: the
machine throws seed pods into the wind, and the flood meant to wash its mistakes away carries
them across the world. Read left to right: machine, seeds, the first growth, the future.
Inference, not stated canon: the pods carry both plants and plant-like Xalians."""

PIECES = """Piece list (far to near). Key light: the Generator itself, a gold-green glow from its core and
vents, the only warm light in the scene. The sun is blacked out; lightning inside the cloud is the
only other light. Wind blows left to right: rain slants and pods drift that way.
- storm ceiling: a heavy near-black cloud mass across the top, its base a row of hanging lobes,
  faintly lit gold-green from below over the Generator. Static.
- air under the cloud: dark, lightening a little toward the horizon. Static.
- lightning: flashes inside the cloud mass on their own clocks; one lights the World Tree from behind.
- rain curtains: soft slanted shafts of heavier rain hanging from the cloud to the horizon. Static.
- the young World Tree: a colossal trunk far off at right, rising from the plain into the cloud
  base, two boughs and a spread of canopy lost in the cloud, hazed by distance. Green catches at
  its roots. Static.
- the far plain: floodwater sheeting over smooth rock to the horizon, dark whaleback domes of
  scoured rock breaking the surface, smaller and paler with distance. Static.
- the shelf: a broad smooth dome of black rock left of center, wet, the Generator's light pooling on it.
- the Genesis Prototype: a machine standing alone on the shelf: four splayed anchor legs bolted into
  the rock, a plinth, a tall ribbed vessel with a round glowing core port and glowing seams, a dome
  cap and three vent stacks with glowing mouths.
  The core breathes; each vent flares when it throws pods.
- seed pods: glowing gold-green pods with short trailing tails, thrown from the vents in bursts of
  two, arcing high on the wind downwind to the right; the near ones touch down on the flood and ride
  its current before they fade, the far ones shrink toward the horizon and settle.
- the mid plain: floodwater across the middle ground with flat slabs of scoured rock, the Generator's
  light reflected in it; rain rings the water. The flood runs left to right: pale current lines drift
  across it, foam catches on the upstream side of each slab and a wake trails off its downstream side.
- the first growth: downwind, moss catching along the edges of the rock slabs and low fronds in the
  cracks, sparse near the Generator and denser to the right; lodged pods glowing faintly among them.
- the small Xalian: a plant-like quadruped with a leafy crest standing in the shallow water at right
  of center, its reflection under it; it blinks now and then.
- near rock: a dark wet ledge along the bottom left, and a rock rise at bottom right where a clump of
  young fronds and three lodged pods grow, bending in the gusts.
- rain: slanted streaks over the whole scene, finer and fainter far, heavier near; the rain near the
  Generator catches its light.
- finish: vignette, paper and brush-stroke sheets."""

rnd = random.Random(11)


def f(v):
    return (('%.3f' if abs(v) < 25 else '%.1f') % v).rstrip('0').rstrip('.')


def pts(p):
    return ' '.join('%s,%s' % (f(x), f(y)) for x, y in p)


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(int(round(lerp(a[i], b[i], t))) for i in range(3))


defs = []
gid = [0]


def lin(stops, x1=0, y1=0, x2=0, y2=1, units=None, id=None):
    gid[0] += 1
    i = id or 'g%d' % gid[0]
    u = ' gradientUnits="userSpaceOnUse"' if units else ''
    s = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (f(o), c, (' stop-opacity="%s"' % f(a)) if a is not None and a < 1 else '') for o, c, a in stops)
    defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s"%s>%s</linearGradient>' % (i, f(x1), f(y1), f(x2), f(y2), u, s))
    return i


def rad(stops, cx=.5, cy=.5, r=.5, id=None, units=None):
    gid[0] += 1
    i = id or 'g%d' % gid[0]
    u = ' gradientUnits="userSpaceOnUse"' if units else ''
    s = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (f(o), c, (' stop-opacity="%s"' % f(a)) if a is not None and a < 1 else '') for o, c, a in stops)
    defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s"%s>%s</radialGradient>' % (i, f(cx), f(cy), f(r), u, s))
    return i


SPLINE = 'calcMode="spline"'


def ease(n):
    return ' keySplines="%s"' % ';'.join(['.42 0 .58 1'] * n)


def kt(period, *ts):
    # keyTimes written in seconds and rescaled to the clock, so an event lasts the same on any clock
    return ';'.join(['0'] + [f(t / period) for t in ts] + ['1'])


def onset_begin(period, onset):
    # an animation whose cycle starts at t = onset: begin is negative, so the t=0 frame is mid-cycle
    return '-%ss' % f((period - onset % period) % period)


# ------------------------------------------------------------------ palette
GLOW_CORE, GLOW_MID, GLOW_EDGE = '#f2ffb0', '#bfe34e', '#4f7f22'
GREEN, GREEN_DARK, GREEN_LIT = '#3f6f2e', '#1b301d', '#86b848'
METAL_DARK, METAL_MID, METAL_WET = '#101517', '#1f272a', '#56666b'
ROCK, ROCK_WET = '#0c1111', '#343f4a'
WATER_FAR, WATER_NEAR = '#343f4a', '#0d1419'

defs.append('''<filter id="soft1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="curtain" x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation="16 6"/></filter>
<filter id="cloud" x="-5%" y="-30%" width="110%" height="170%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>
<filter id="rockGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .09" numOctaves="3" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 .5  0 0 0 0 .6  0 0 0 0 .58  0 0 0 .5 -.2" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="moss" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".09 .3" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>''')
rad([(0, GLOW_CORE, 1), (.3, GLOW_MID, .75), (1, GLOW_EDGE, 0)], id='glowPod')
rad([(0, '#d9f27a', .55), (.45, '#8fb33e', .22), (1, '#2c4a1c', 0)], id='glowWash')
rad([(0, '#ffffff', .95), (.3, GLOW_CORE, .9), (.7, GLOW_MID, .6), (1, GLOW_EDGE, .15)], id='corePort')
rad([(0, '#e6f0ff', .8), (.35, '#9fb4d8', .35), (1, '#2a3446', 0)], id='flash')
rad([(0, '#e4ecff', .9), (.45, '#8ea4cc', .5), (1, '#26324a', 0)], id='flashBack')
rad([(0, '#ffffff', 1), (.4, '#e8f0ff', .8), (1, '#9fb4d8', 0)], id='flashCore')

# ------------------------------------------------------------------ sky layer (static): the storm ceiling and the air under it
sky = []
lin([(0, '#04070a', 1), (.35, '#0a1016', 1), (.6, '#111a22', 1), (1, '#27313c', 1)], 0, 0, 0, HZ, units=True, id='air')
sky.append('<!-- air under the cloud: dark, lightening a little toward the horizon --><rect width="%d" height="%d" fill="url(#air)"/>' % (W, HZ + 10))
lin([(0, '#030507', 1), (.7, '#0a1012', 1), (1, '#131c24', 1)], 0, 0, 0, 240, units=True, id='mass')
lin([(0, '#080d0f', 1), (.55, '#131b22', 1), (.85, '#242e38', 1), (1, '#33404c', 1)], id='lobe')
lobes = []
x = -80
while x < W + 80:
    cy = 176 + 22 * math.sin(x / 140) + 10 * math.sin(x / 47) + rnd.uniform(-8, 8)
    lobes.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#lobe)"/>' % (f(x), f(cy), f(rnd.uniform(62, 110)), f(rnd.uniform(34, 58))))
    x += rnd.uniform(52, 84)
scud = []
for _ in range(14):
    sx_ = rnd.uniform(0, W)
    scud.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#19232b" opacity="%s"/>' % (f(sx_), f(rnd.uniform(218, 250)), f(rnd.uniform(40, 90)), f(rnd.uniform(6, 12)), f(rnd.uniform(.5, .85))))
sky.append('<!-- storm ceiling: the cloud mass and its hanging lobes --><g filter="url(#cloud)"><rect x="-40" y="-40" width="%d" height="220" fill="url(#mass)"/>%s%s</g>' % (W + 80, ''.join(lobes), ''.join(scud)))
sky.append('<!-- the cloud base lit gold-green from below over the Generator --><ellipse cx="%d" cy="220" rx="420" ry="80" fill="url(#glowWash)" opacity=".8"/>' % (GX + 40))
sky.append('<ellipse cx="%d" cy="300" rx="300" ry="110" fill="url(#glowWash)" opacity=".25"/>' % GX)

# ------------------------------------------------------------------ flash layer (animated): lightning inside the cloud
flash = []


def cloud_flash(cx, cy, rx, ry, grad, period, onset, peak, name):
    # the strike lights a knot of cloud lobes, not an oval: the main glow plus lit lobe undersides
    fr_ = random.Random(int(cx * 3 + cy))
    lobes_ = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)" opacity="%s"/>' % (
        f(cx + fr_.uniform(-rx * .8, rx * .8)), f(min(205, cy + ry * .5) + fr_.uniform(-10, 14)), f(fr_.uniform(40, 80)), f(fr_.uniform(18, 30)), grad, f(fr_.uniform(.6, 1))) for _ in range(3))
    return ('<!-- lightning: %s -->' % name) + '<g opacity="0"><animate attributeName="opacity" values="0;%s;.12;%s;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)"/>%s<ellipse cx="%s" cy="%s" rx="26" ry="18" fill="url(#flashCore)"/></g>' % (
        f(peak), f(peak * .75), kt(period, .04, .1, .16, .45), f(period), onset_begin(period, onset), f(cx), f(cy), f(rx), f(ry), grad, lobes_, f(cx + fr_.uniform(-rx * .3, rx * .3)), f(cy + fr_.uniform(-10, 20)))


flash.append(cloud_flash(300, 150, 260, 80, 'flash', 12, 3.1, .65, 'inside the cloud, left'))
flash.append(cloud_flash(960, 140, 360, 100, 'flash', 24, 9.7, .9, 'inside the cloud, center'))
flash.append(cloud_flash(1330, 270, 320, 130, 'flashBack', 24, 15.3, .95, 'behind the World Tree, lighting its silhouette'))
flash.append(cloud_flash(640, 120, 260, 80, 'flash', 12, 8.3, .55, 'high in the cloud over the Generator'))

# ------------------------------------------------------------------ far layer (static): curtains, the World Tree, the far plain
far = []
lin([(0, '#3a4550', 0), (.25, '#3a4550', .45), (.8, '#343f4a', .35), (1, '#343f4a', .1)], id='curtainG')
cur = []
for (cx, w) in [(120, 190), (330, 150), (860, 170), (1040, 120)]:
    cur.append('<rect x="%s" y="200" width="%s" height="%s" fill="url(#curtainG)"/>' % (f(cx - w / 2), f(w), f(HZ - 196)))
far.append('<!-- rain curtains hanging from the cloud to the horizon --><g filter="url(#curtain)" transform="skewX(9) translate(-40 0)">%s</g>' % ''.join(cur))

# the young World Tree

def limb(x0, y0, cx, cy, x1, y1, w0, w1):
    # a tapering, curving bough: a quadratic spine offset to either side, thick at the trunk
    ptsL, ptsR = [], []
    for i in range(13):
        t = i / 12
        u = 1 - t
        px = u * u * x0 + 2 * u * t * cx + t * t * x1
        py = u * u * y0 + 2 * u * t * cy + t * t * y1
        dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx)
        dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy)
        n = math.hypot(dx, dy) or 1
        w = lerp(w0, w1, t) / 2
        ptsL.append((px - dy / n * w, py + dx / n * w))
        ptsR.append((px + dy / n * w, py - dx / n * w))
    return ptsL + ptsR[::-1]

TX = 1330
tree_col = '#10181e'
g_trunk_rim = lin([(0, '#1a2228', 1), (.2, '#0e1419', 1), (.55, '#080d11', 1), (.85, '#0c1217', 1), (1, '#12191f', 1)], 0, 120, 0, HZ, units=True)
trunk = 'M%s %s C %s %s, %s %s, %s %s L %s %s L %s %s C %s %s, %s %s, %s %s L %s %s Z' % (
    f(TX - 100), f(HZ + 6), f(TX - 62), f(HZ - 16), f(TX - 52), f(HZ - 90), f(TX - 40), f(200),
    f(TX - 26), f(0), f(TX + 30), f(0),
    f(TX + 44), f(200), f(TX + 56), f(HZ - 90), f(TX + 68), f(HZ - 16), f(TX + 106), f(HZ + 6))
roots = ''.join('<polygon points="%s" fill="url(#%s)"/>' % (pts(limb(TX + sx0, HZ - 24, TX + sx0 + dx * .45, HZ - 6, TX + sx0 + dx, HZ + 5, w, 3)), g_trunk_rim) for sx0, dx, w in [
    (-44, -110, 20), (48, 116, 20), (-30, -70, 14), (34, 76, 14)])
boughs = ''.join('<polygon points="%s" fill="url(#%s)"/>' % (pts(limb(*L)), g_trunk_rim) for L in [
    (TX - 30, 290, TX - 110, 230, TX - 210, 120, 56, 18), (TX + 34, 276, TX + 110, 214, TX + 220, 110, 52, 16),
    (TX - 20, 250, TX - 60, 190, TX - 110, 110, 32, 12), (TX + 24, 244, TX + 70, 182, TX + 120, 110, 30, 11),
    (TX - 150, 190, TX - 220, 170, TX - 300, 120, 18, 6), (TX + 160, 176, TX + 240, 160, TX + 320, 116, 16, 6)])
underside = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (
    f(TX + dx), f(150 + abs(dx) * .12 + rnd.uniform(-8, 8)), f(rnd.uniform(40, 70)), f(rnd.uniform(14, 22)), mix('#16241f', '#0f1916', rnd.random())) for dx in range(-320, 340, 50))
lin([(0, '#fff', 0), (.35, '#fff', .35), (.7, '#fff', 1), (1, '#fff', 1)], 0, 80, 0, 260, units=True, id='treeFade')
defs.append('<mask id="treeMask" maskUnits="userSpaceOnUse" x="%s" y="-40" width="1000" height="%s"><rect x="%s" y="-40" width="1000" height="%s" fill="url(#treeFade)"/></mask>' % (f(TX - 500), f(HZ + 60), f(TX - 500), f(HZ + 60)))
lin([(0, '#000', 0), (.5, '#000', 1), (1, '#000', 1)], 0, 0, 1, 0, id='rootFadeL')
far.append('<!-- the young World Tree: a colossal trunk far off on the plain, narrowing as it climbs, great boughs sweeping up into the storm, its top fading into the cloud -->'
           '<g mask="url(#treeMask)"><g filter="url(#cloud)">%s</g><g filter="url(#soft1)"><path d="%s" fill="url(#%s)"/>%s%s</g></g>' % (underside, trunk, g_trunk_rim, roots, boughs))
far.append('<!-- the tree hazed by distance and rain --><rect x="%d" y="100" width="900" height="%d" fill="#27313c" opacity=".1"/>' % (TX - 450, HZ - 90))
far.append('<!-- the roots fading into the horizon haze --><rect x="%d" y="%d" width="600" height="18" fill="#27313c" opacity=".35" filter="url(#soft6)"/>' % (TX - 300, HZ - 10))

# the far plain: floodwater over rock to the horizon
lin([(0, '#3c4852', 1), (.35, '#252f39', 1), (1, '#121a20', 1)], 0, HZ, 0, 480, units=True, id='farWater')
far.append('<!-- the far plain: floodwater sheeting over smooth rock --><rect x="0" y="%d" width="%d" height="%d" fill="url(#farWater)"/>' % (HZ - 2, W, 480 - HZ + 2))
sheen = []
for _ in range(60):
    y = HZ + (rnd.random() ** 1.6) * 80
    x0 = rnd.uniform(-40, W)
    ln = rnd.uniform(30, 160) * (1 + (y - HZ) / 60)
    sheen.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#5c6a78" stroke-width="%s" opacity="%s"/>' % (f(x0), f(y), f(x0 + ln), f(y), f(.6 + (y - HZ) / 60), f(rnd.uniform(.12, .35))))
far.append('<!-- sheen on the far water --><g>%s</g>' % ''.join(sheen))
whales = []
for _ in range(26):
    y = HZ + 4 + (rnd.random() ** 1.3) * 78
    k = (y - HZ) / 80
    x = rnd.uniform(-20, W + 20)
    if abs(x - GX) < 260 and y > 440:
        continue
    rx = lerp(14, 110, k) * rnd.uniform(.7, 1.3)
    ry = lerp(2.5, 12, k) * rnd.uniform(.8, 1.2)
    c = mix('#29333d', ROCK, k)
    whales.append('<path d="M%s %s Q %s %s %s %s Z" fill="%s"/><path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none" opacity=".5"/>' % (
        f(x - rx), f(y), f(x), f(y - ry * 2), f(x + rx), f(y), c, f(x - rx * .7), f(y - ry * .6), f(x - rx * .1), f(y - ry * 1.6), f(x + rx * .4), f(y - ry * 1.1), mix('#4a5866', ROCK_WET, k), f(lerp(.6, 1.4, k))))
far.append('<!-- whaleback domes of scoured rock breaking the water, smaller and paler with distance --><g>%s</g>' % ''.join(whales))
far.append('<!-- a far whaleback on the left of the plain --><path d="M60 %d C 120 %d, 230 %d, 300 %d Z" fill="#232d35"/>' % (HZ + 4, HZ - 20, HZ - 22, HZ + 4))
far.append('<!-- a great whaleback of scoured rock left of the machine, its crown faintly lit by the Generator -->'
           '<path d="M40 470 C 90 420, 250 404, 400 432 C 440 440, 470 456, 480 470 Z" fill="#1a2228"/>'
           '<path d="M90 438 C 180 414, 300 412, 400 432" stroke="#4a5866" stroke-width="1.6" fill="none" opacity=".7"/>'
           '<path d="M300 420 C 350 424, 390 432, 420 440" stroke="%s" stroke-width="2" fill="none" opacity=".35" filter="url(#soft2)"/>' % GLOW_MID)
far.append('<!-- horizon haze --><rect x="0" y="%d" width="%d" height="26" fill="#343f4a" opacity=".45" filter="url(#soft6)"/>' % (HZ - 14, W))

# ------------------------------------------------------------------ land layer (static): mid plain, shelf, the Generator, growth, near rock
land = []
lin([(0, '#18222a', 1), (1, WATER_NEAR, 1)], 0, 470, 0, 640, units=True, id='midWater')
land.append('<!-- the mid plain: floodwater across the middle ground --><rect x="0" y="470" width="%d" height="%d" fill="url(#midWater)"/>' % (W, H - 470))
msheen = []
for _ in range(50):
    y = rnd.uniform(478, 640)
    x0 = rnd.uniform(-40, W)
    msheen.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#4a5866" stroke-width="%s" opacity="%s"/>' % (f(x0), f(y), f(x0 + rnd.uniform(40, 200)), f(y), f(1 + (y - 470) / 90), f(rnd.uniform(.08, .22))))
land.append('<g>%s</g>' % ''.join(msheen))
# slabs of scoured rock in the mid plain
SLABS = [(880, 506, 90, 9), (1010, 488, 70, 7), (1180, 520, 120, 11), (1300, 486, 60, 6), (1440, 502, 90, 8), (160, 492, 80, 7), (300, 470, 60, 5), (1060, 552, 80, 8), (760, 530, 60, 7)]
sl = []
for (x, y, rx, ry) in SLABS:
    p = [(x - rx, y), (x - rx * .8, y - ry * .7), (x - rx * .2, y - ry), (x + rx * .5, y - ry * .8), (x + rx, y - ry * .1), (x + rx * .9, y + ry * .3), (x - rx * .7, y + ry * .35)]
    sl.append('<polygon points="%s" fill="%s"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (pts(p), ROCK, pts(p[:5]), ROCK_WET))
    # the current: foam piles on the upstream (left) end, a wake trails off the downstream end
    sl.append('<path d="M%s %s Q %s %s %s %s" stroke="#9fb2b8" stroke-width="%s" fill="none" opacity=".33" stroke-linecap="round" filter="url(#soft2)"/>' % (
        f(x - rx * .6), f(y - ry * 1.1), f(x - rx - 16), f(y), f(x - rx * .5), f(y + ry * .7), f(3 + ry / 3)))
    sl.append('<path d="M%s %s L %s %s M%s %s L %s %s" stroke="#8ea2aa" stroke-width="%s" fill="none" opacity=".5" stroke-linecap="round"/>' % (
        f(x + rx), f(y), f(x + rx * 1.9), f(y - ry * .6), f(x + rx * .9), f(y + ry * .3), f(x + rx * 2), f(y + ry * 1.2), f(.9 + ry / 10)))
land.append('<!-- flat slabs of scoured rock in the floodwater --><g>%s</g>' % ''.join(sl))

# the Generator's light reflected in the water in front of the shelf
land.append('<!-- the Generator reflected in the floodwater --><ellipse cx="%d" cy="592" rx="40" ry="44" fill="url(#glowWash)" opacity=".7" filter="url(#soft6)"/>' % GX)

# the shelf: a broad smooth dome of wet black rock
shelf = [(300, 566), (360, 530), (420, 504), (480, 486), (530, 474), (GX, GBASE - 3), (620, 470), (680, 478), (740, 494), (800, 518), (850, 546), (880, 566), (880, 600), (300, 600)]
lin([(0, '#1c2524', 1), (.35, ROCK, 1), (1, '#070a0a', 1)], 0, GBASE, 0, 620, units=True, id='shelfG')
land.append('<!-- the shelf: a smooth dome of scoured rock --><polygon points="%s" fill="url(#shelfG)"/>' % pts(shelf))
land.append('<polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".5"/>' % pts(shelf))
land.append('<polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.4" opacity=".5"/>' % pts(shelf[2:10]))
land.append('<!-- the Generator light catching the shelf rim --><polyline points="%s" fill="none" stroke="%s" stroke-width="2.4" opacity=".55" filter="url(#soft2)"/>' % (pts(shelf[3:9]), GLOW_MID))
land.append('<!-- the shelf sinking into the floodwater --><ellipse cx="590" cy="572" rx="320" ry="20" fill="#141e26" filter="url(#soft6)"/>')
land.append('<!-- the Generator light pooled on the wet rock --><ellipse cx="%d" cy="%d" rx="230" ry="40" fill="url(#glowWash)" opacity=".85"/>' % (GX + 20, GBASE + 12))

land.append('<!-- the halo of the Generator light in the rain around it --><ellipse cx="%d" cy="330" rx="200" ry="170" fill="url(#glowWash)" opacity=".35"/>' % GX)
# the Genesis Prototype
gen = ['<!-- the Genesis Prototype -->']
lin([(0, METAL_WET, 1), (.18, METAL_MID, 1), (.55, METAL_DARK, 1), (.85, METAL_MID, 1), (1, '#3c4a4e', 1)], 0, 0, 1, 0, id='vessel')
lin([(0, '#2c3639', 1), (1, METAL_DARK, 1)], id='metalV')
# intake pipes into the rock and the water
for sx_, sx2 in ((-70, -46), (-38, -26), (38, 26), (70, 46)):
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="450" stroke="#1c2427" stroke-width="10" stroke-linecap="round"/><line x1="%d" y1="%d" x2="%d" y2="450" stroke="%s" stroke-width="1.4" opacity=".6"/>' % (GX + sx_, GBASE + 2, GX + sx2, GX + sx_ - 4, GBASE, GX + sx2 - 4, GLOW_MID))
    gen.append('<rect x="%d" y="%d" width="14" height="5" fill="#0b0f10"/>' % (GX + sx_ - 7, GBASE - 1))
gen.append('<polygon points="%s" fill="%s"/>' % (pts([(GX - 72, 454), (GX - 60, 426), (GX + 60, 426), (GX + 72, 454)]), METAL_MID))
gen.append('<line x1="%d" y1="427" x2="%d" y2="427" stroke="%s" stroke-width="2"/>' % (GX - 60, GX + 60, METAL_WET))
gen.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="1.6" opacity=".55"/>' % (pts([(GX - 72, 454), (GX - 60, 426), (GX + 60, 426), (GX + 72, 454)]), GLOW_MID))
# the vessel
vessel = 'M%d 432 L %d 318 C %d 296, %d 290, %d 288 C %d 290, %d 296, %d 318 L %d 432 Z' % (GX - 50, GX - 54, GX - 54, GX - 30, GX, GX + 30, GX + 54, GX + 54, GX + 50)
gen.append('<path d="%s" fill="url(#vessel)"/>' % vessel)
for ry_ in (330, 352, 392, 414):
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#0a0e0f" stroke-width="3"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.2" opacity=".85"/>' % (
        GX - 53, ry_, GX + 53, ry_, GX - 44, ry_ + 2.5, GX + 44, ry_ + 2.5, GLOW_MID))
gen.append('<path d="%s" fill="none" stroke="%s" stroke-width="1.4" opacity=".55"/>' % (vessel, METAL_WET))
# the core port
gen.append('<circle cx="%d" cy="372" r="30" fill="#0a0e0f"/><circle cx="%d" cy="372" r="24" fill="url(#corePort)"/>' % (GX, GX))
gen.append('<circle cx="%d" cy="372" r="27" fill="none" stroke="#3a4649" stroke-width="3"/>' % GX)
gen.append(''.join('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#3a4649" stroke-width="2"/>' % (
    f(GX + 24 * math.cos(a)), f(372 + 24 * math.sin(a)), f(GX + 31 * math.cos(a)), f(372 + 31 * math.sin(a))) for a in [i * math.pi / 4 for i in range(8)]))
# cap and vent stacks
VENTS = [(GX - 24, 252, -8), (GX + 2, 238, 2), (GX + 28, 256, 12)]  # mouth x, mouth y, lean
gen.append('<ellipse cx="%d" cy="292" rx="34" ry="8" fill="#2a3437"/>' % GX)
for (vx, vy, lean) in VENTS:
    bx = GX + (vx - GX) * .6
    stack = [(bx - 9, 294), (vx - 7, vy + 4), (vx + 7, vy + 4), (bx + 9, 294)]
    gen.append('<polygon points="%s" fill="url(#metalV)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1" opacity=".5"/>' % (pts(stack), pts(stack[:2]), METAL_WET))
    gen.append('<ellipse cx="%s" cy="%s" rx="9" ry="3.2" fill="#0a0e0f" stroke="#3a4649" stroke-width="1.4"/><ellipse cx="%s" cy="%s" rx="6" ry="2" fill="%s"/>' % (f(vx), f(vy + 3), f(vx), f(vy + 3), GLOW_MID))
land.append('<g transform="translate(%s %s) scale(%s) translate(-%s -%s)">%s</g>' % (f(GX), f(GBASE), f(GSC), f(GX), f(GBASE), ''.join(gen)))

# the first growth: moss and low fronds downwind, denser to the right
growth = []
GROW = []
for _ in range(90):
    x = lerp(700, 1536, rnd.random() ** .7)
    band = rnd.random()
    y = lerp(HZ + 8, 560, band ** 1.2)
    k = (y - HZ) / (560 - HZ)
    dens = (x - 700) / 836
    if rnd.random() > dens + .15:
        continue
    GROW.append((x, y, k))
    if y > 472:
        continue  # in the mid plain the moss grows along the slab edges instead
    growth.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(lerp(5, 26, k) * rnd.uniform(.6, 1.4)), f(lerp(1.2, 5, k)), mix(mix(GREEN, '#2c3a36', 1 - k), GREEN_LIT, rnd.uniform(0, .35) * k), f(lerp(.5, .95, k))))
# green at the World Tree's roots
for _ in range(16):
    x = TX + rnd.uniform(-110, 110)
    growth.append('<ellipse cx="%s" cy="%s" rx="%s" ry="1.6" fill="%s" opacity=".6"/>' % (f(x), f(HZ + rnd.uniform(2, 10)), f(rnd.uniform(8, 20)), mix(GREEN, '#2c3a36', .5)))
for (x, y, rx, ry) in SLABS:
    if x < 700:
        continue
    top_ = [(x - rx * .8, y - ry * .7), (x - rx * .2, y - ry), (x + rx * .5, y - ry * .8), (x + rx, y - ry * .1)]
    growth.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" opacity=".9"/>' % (
        pts(top_[:2 + int((x - 700) / 250)]), mix(GREEN, GREEN_LIT, .25), f(2.2 + ry / 4)))
    growth.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity=".7"/>' % (pts([(x - rx * .7, y + ry * .3), (x - rx * .2, y + ry * .35)]), GREEN, f(1.4 + ry / 6)))
land.append('<!-- the first growth: moss catching along the rock edges downwind --><g filter="url(#moss)">%s</g>' % ''.join(growth))
fronds = []
for (x, y, k) in GROW:
    if k < .35 or rnd.random() < .55:
        continue
    h = lerp(6, 22, k) * rnd.uniform(.7, 1.3)
    for j in range(4):
        a = -60 + j * 38 + rnd.uniform(-8, 8)
        ex = x + math.sin(math.radians(a)) * h * .8 + 3
        ey = y - math.cos(math.radians(a)) * h
        fronds.append('<path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round"/>' % (
            f(x), f(y), f(x + (ex - x) * .3), f(ey + h * .2), f(ex), f(ey), mix(GREEN, GREEN_LIT, rnd.uniform(0, .5)), f(lerp(.8, 1.8, k))))
land.append('<!-- low fronds among the moss --><g>%s</g>' % ''.join(fronds))
LODGED = [(812, 520), (905, 500), (960, 500), (1150, 512), (1240, 470), (1370, 498), (1188, 452), (1460, 490)]
land.append('<!-- lodged pods among the growth --><g>%s</g>' % ''.join(
    '<ellipse cx="%s" cy="%s" rx="2.6" ry="3.4" fill="%s"/>' % (f(x), f(y - 3), GLOW_MID) for x, y in LODGED))

# the small Xalian: a plant-like quadruped with a leafy crest, standing in the shallow water
XX, XY = 1060, 548
XSC = 1.7
xal = ['<!-- the small Xalian: a plant-like quadruped with a leafy crest, standing in the water -->',
       '<ellipse cx="%d" cy="%d" rx="44" ry="6" fill="#5a6c78" opacity=".55" filter="url(#soft2)"/>' % (XX - 4, XY - 3)]
xal.append('<ellipse cx="%d" cy="%d" rx="26" ry="3" fill="#06090a" opacity=".6"/>' % (XX, XY + 2))
xal.append('<g opacity=".35" transform="translate(0 %d) scale(1 -.5) translate(0 -%d)">' % (XY * 1.5 + 2, XY) + '__BODY__</g>')
C = '#2f5a31'
body = ('<g fill="%s" stroke="%s" stroke-linecap="round">' % (C, C) +
        # legs: a stride, the near pair slightly lighter-edged
        '<path d="M%s %s L %s %s M%s %s L %s %s M%s %s L %s %s M%s %s L %s %s" stroke-width="3.4" fill="none"/>' % (
            f(XX - 10), f(XY - 14), f(XX - 15), f(XY), f(XX - 6), f(XY - 14), f(XX - 3), f(XY), f(XX + 10), f(XY - 14), f(XX + 7), f(XY), f(XX + 14), f(XY - 14), f(XX + 18), f(XY)) +
        '<ellipse cx="%s" cy="%s" rx="16" ry="7.5" stroke="none"/>' % (f(XX + 2), f(XY - 18)) +
        # neck rising forward to the left, and the head
        '<path d="M%s %s C %s %s, %s %s, %s %s" stroke-width="7" fill="none"/>' % (f(XX - 10), f(XY - 20), f(XX - 16), f(XY - 26), f(XX - 18), f(XY - 32), f(XX - 22), f(XY - 36)) +
        '<ellipse cx="%s" cy="%s" rx="7.5" ry="5" stroke="none"/><path d="M%s %s L %s %s L %s %s Z" stroke="none"/>' % (
            f(XX - 24), f(XY - 37), f(XX - 30), f(XY - 39), f(XX - 38), f(XY - 34), f(XX - 28), f(XY - 33)) +
        # a leafy tail
        '<path d="M%s %s Q %s %s %s %s" stroke-width="3" fill="none"/>' % (f(XX + 17), f(XY - 20), f(XX + 26), f(XY - 22), f(XX + 30), f(XY - 30)) +
        '</g>')
crest = ''.join('<path d="M%s %s Q %s %s %s %s Q %s %s %s %s Z" fill="%s"/>' % (
    f(x0), f(y0), f(x0 - 6), f(y0 - h * .6), f(x0 - 2 + lean), f(y0 - h), f(x0 + 5), f(y0 - h * .5), f(x0 + 4), f(y0), c)
    for x0, y0, h, lean, c in [(XX - 18, XY - 32, 10, -3, GREEN_LIT), (XX - 12, XY - 25, 11, -2, GREEN_LIT), (XX - 4, XY - 24, 12, 0, '#a6d45a'), (XX + 5, XY - 24, 10, 2, GREEN_LIT), (XX + 13, XY - 23, 8, 3, GREEN_LIT), (XX + 29, XY - 30, 9, 5, '#a6d45a')])
crest_rim = (''
    + '<circle cx="%s" cy="%s" r="3.2" fill="url(#glowPod)"/><circle cx="%s" cy="%s" r="1.5" fill="%s"/>' % (f(XX - 27), f(XY - 38.5), f(XX - 27), f(XY - 38.5), GLOW_CORE))
full = body + crest + crest_rim
xal[2] = xal[2].replace('__BODY__', body + crest)
xal.append(full)
land.append('<g transform="translate(%s %s) scale(%s) translate(-%s -%s)">%s</g>' % (f(XX), f(XY), f(XSC), f(XX), f(XY), ''.join(xal)))

# near rock: the dark wet ledge at bottom left and the rise at bottom right
ledge = [(-20, 600), (120, 596), (260, 612), (420, 606), (600, 622), (760, 616), (900, 636), (960, H + 10), (-20, H + 10)]
rise = [(1090, H + 10), (1110, 610), (1180, 574), (1250, 556), (1340, 548), (1440, 552), (1556, 566), (1556, H + 10)]
lin([(0, '#161e1d', 1), (.3, '#080b0b', 1), (1, '#030404', 1)], 0, 548, 0, H, units=True, id='nearRock')
land.append('<!-- near rock: a dark wet ledge along the bottom left --><polygon points="%s" fill="url(#nearRock)"/><polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.8" opacity=".6"/>' % (pts(ledge), pts(ledge[:8])))
land.append('<!-- near rock: a rise at bottom right carrying young fronds --><polygon points="%s" fill="url(#nearRock)"/><polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.8" opacity=".6"/>' % (pts(rise), pts(rise[1:7])))
land.append('<polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".45"/>' % pts(rise))
moss_near = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".9"/>' % (f(x), f(y), f(rnd.uniform(18, 40)), f(rnd.uniform(4, 7)), mix(GREEN, GREEN_LIT, rnd.uniform(0, .4))) for x, y in [(1200, 572), (1262, 558), (1318, 552), (1380, 551), (1440, 554), (1500, 560), (1290, 562), (1410, 560)])
land.append('<!-- moss on the rise --><g filter="url(#moss)">%s</g>' % moss_near)

# ------------------------------------------------------------------ glow layer (animated): the Generator breathing, vents, light on rock and water, ripples
glow = []
CORE_T = 3.0
glow.append('<!-- the core breathing: an uneven pulse -->'
            '<circle cx="%d" cy="%s" r="58" fill="url(#glowPod)" opacity=".5"><animate attributeName="opacity" values=".45;.8;.6;.95;.5;.45" keyTimes="0;.18;.36;.55;.8;1" dur="%ss" begin="-1.1s" repeatCount="indefinite" %s%s/></circle>' % (GX, f(GS(GX, 372)[1]), f(CORE_T), SPLINE, ease(5)))
glow.append('<!-- the light on the rock and the water breathing with the core -->'
            '<ellipse cx="%d" cy="%d" rx="200" ry="30" fill="url(#glowWash)" opacity=".3"><animate attributeName="opacity" values=".25;.5;.35;.6;.3;.25" keyTimes="0;.18;.36;.55;.8;1" dur="%ss" begin="-1.1s" repeatCount="indefinite" %s%s/></ellipse>' % (GX + 20, GBASE + 14, f(CORE_T), SPLINE, ease(5)))
# vent flares: each vent throws a burst every 6 s; the three are staggered 2 s apart
LAUNCH0 = .4
for i, (vx, vy, lean) in enumerate(VENTS):
    vx, vy = GS(vx, vy)
    on = LAUNCH0 + 2 * i
    glow.append('<!-- vent %d flaring as it throws pods -->' % (i + 1) +
                '<ellipse cx="%s" cy="%s" rx="34" ry="24" fill="url(#glowPod)" opacity="0"><animate attributeName="opacity" values="0;1;.6;0;0" keyTimes="%s" dur="6s" begin="%s" repeatCount="indefinite" %s keySplines="0 0 1 1;.3 0 .7 1;.3 0 .7 1;0 0 1 1"/></ellipse>' % (
                    f(vx), f(vy - 4), kt(6, .08, .4, 1.2), onset_begin(6, on), SPLINE))
# the reflection shimmers as rain breaks the water
glow.append('<!-- the reflection shimmering in the rain --><ellipse cx="%d" cy="596" rx="46" ry="30" fill="url(#glowWash)" opacity=".4" filter="url(#soft6)"><animate attributeName="opacity" values=".4;.75;.5;.7;.4" keyTimes="0;.25;.5;.75;1" dur="2s" begin="-.4s" repeatCount="indefinite" %s%s/><animate attributeName="rx" values="42;52;44;50;42" keyTimes="0;.3;.5;.8;1" dur="2s" begin="-.4s" repeatCount="indefinite" %s%s/></ellipse>' % (GX, SPLINE, ease(4), SPLINE, ease(4)))
# rain rings on the floodwater, including the lit water in front of the shelf
rings = []
rrnd = random.Random(31)
n_ = 0
while n_ < 44:
    x, y = rrnd.uniform(20, W - 20), rrnd.uniform(404, 640)
    on_shelf = 300 < x < 880 and y < 574
    on_ledge = x < 910 and y > 604
    on_rise = x > 1110 and y > 546
    on_xal = 1000 < x < 1110 and 470 < y < 552
    if on_shelf or on_ledge or on_rise or on_xal:
        continue
    n_ += 1
    k = (y - HZ) / (H - HZ)
    per = rrnd.choice([1.5, 2, 3])
    ph = rrnd.uniform(0, per)
    r1 = lerp(4, 16, k)
    lit = abs(x - GX) < 160 and y > 574
    rings.append('<ellipse cx="%s" cy="%s" rx="1" ry=".3" fill="none" stroke="%s" stroke-width="%s" opacity="0">'
                 '<animate attributeName="rx" values="1;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="ry" values=".3;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="opacity" values="0;.7;0;0" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                     f(x), f(y), GLOW_MID if lit else '#9fb2b8', f(lerp(1.4, 2, k)), f(r1), f(r1), f(.8 / per), f(per), f(ph),
                     f(r1 * .3), f(r1 * .3), f(.8 / per), f(per), f(ph), f(.06 / per), f(.8 / per), f(per), f(ph)))
# V2: the current: pale lines drifting left to right across the mid plain
cur_ = []
cur_pos = []
crnd = random.Random(37)


def shelf_top(x):
    # the shelf outline's height at x, for anything that must stay on the water in front of it
    for (ax, ay), (bx, by) in zip(shelf, shelf[1:12]):
        if ax <= x <= bx:
            return lerp(ay, by, (x - ax) / (bx - ax))
    return 0


for i in range(400):
    if len(cur_pos) >= 16:
        break
    x, y = crnd.uniform(890, 1500), crnd.uniform(474, 566)
    ln = crnd.uniform(50, 110)
    per = crnd.choice([3, 4, 6])
    x2 = x + ln + 22 * per
    if (x > 1110 and y > 546) or (x2 > 985 and x < 1120 and 470 < y < 552):
        continue
    if any(sx_ - rx_ - 6 < x2 and x - 6 < sx_ + rx_ and sy_ - ry_ - 4 < y < sy_ + ry_ * .35 + 6 for sx_, sy_, rx_, ry_ in SLABS):
        continue  # the current flows around the slabs, never over them
    if any(abs(y - yy) < 7 and abs(x - xx) < 80 for xx, yy in cur_pos):
        continue  # staggered: no two lines stacked one above the other
    cur_pos.append((x, y))
    ph = crnd.uniform(0, per)
    cur_.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#a9bcc2" stroke-width="%s" stroke-linecap="round" opacity="0">'
                '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                '<animate attributeName="opacity" values="0;.85;.85;0" keyTimes="0;.25;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></line>' % (
                    f(x), f(y), f(x + ln), f(y), f(1.4 + (y - 470) / 60), f(22 * per), f(per), f(ph), f(per), f(ph)))
glow.append('<!-- the flood current: pale lines drifting downstream --><g>%s</g>' % ''.join(cur_))
glow.append('<!-- rain rings on the floodwater --><g>%s</g>' % ''.join(rings))
# lodged pods glowing faintly
for i, (x, y) in enumerate(LODGED):
    glow.append('<circle cx="%s" cy="%s" r="9" fill="url(#glowPod)" opacity=".3"><animate attributeName="opacity" values=".2;.5;.25;.2" keyTimes="0;.4;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/></circle>' % (
        f(x), f(y - 3), f([6, 8, 12][i % 3]), f(rnd.uniform(0, 6)), SPLINE, ease(3)))
# the Xalian blinks: its crest tips dim for a moment
glow.append('<!-- the small Xalian crest glow, dimming now and then -->'
            '<ellipse cx="%d" cy="%d" rx="24" ry="14" fill="url(#glowPod)" opacity=".45"><animate attributeName="opacity" values=".45;.45;.08;.45;.45" keyTimes="0;.5;.52;.56;1" dur="8s" begin="-2s" repeatCount="indefinite"/></ellipse>' % (XX - 6, XY - 48))

glow.append('<!-- the same strike lighting the cloud base over the World Tree from within -->'
            '<ellipse cx="%s" cy="178" rx="440" ry="54" fill="url(#flashBack)" opacity="0"><animate attributeName="opacity" values="0;.5;.08;.4;0;0" keyTimes="%s" dur="24s" begin="%s" repeatCount="indefinite"/></ellipse>' % (
                f(TX), kt(24, .04, .1, .16, .45), onset_begin(24, 15.3)))

# ------------------------------------------------------------------ pods layer (animated): seed pods thrown from the vents, riding the wind
pods = []
prnd = random.Random(23)
lin([(0, GLOW_MID, 0), (.6, GLOW_MID, .6), (1, GLOW_CORE, 1)], id='podTail')


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])


def blen(p0, p1, p2, p3):
    q = [bez(p0, p1, p2, p3, i / 40) for i in range(41)]
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(q, q[1:]))


def near_spot(r, ride, taken, t0, t1):
    tries = 0
    while True:
        tries += 1
        gap = 50 if tries < 3000 else 30
        lx = r.choice([r.uniform(740, 900), r.uniform(1135, 1230)])
        ly = r.uniform(474, 540) if lx < 900 else r.uniform(474, 505)
        if lx + ride > 1230 and ly > 445:
            continue  # the ride stops short of the near fronds
        if 900 < lx < 1135 and ly > 470:
            continue  # clear of the small Xalian, and of the current that would carry a pod into it
        if lx > 1150 and ly > 530:
            continue
        if 1236 < lx < 1470 and ly > 490:
            continue  # behind the near fronds
        if any(sx_ - rx_ - 6 < lx + ride and lx - 6 < sx_ + rx_ and sy_ - ry_ - 2 < ly < sy_ + ry_ * .35 + 10 for sx_, sy_, rx_, ry_ in SLABS):
            continue  # a pod never rides across a rock slab
        # clear of every pod already on the water while this one is: its landing point and its ride
        if tries < 3000 and any(math.hypot(lx - ax0, ly - ay) < 35 for ax0, ax1, ay, a0, a1 in taken):
            continue  # each landing spot is used once in the cycle
        if any(a0 < t1 and t0 < a1 and abs(ly - ay) < gap and lx - gap < ax1 and ax0 < lx + ride + gap for ax0, ax1, ay, a0, a1 in taken):
            continue
        return lx, ly


taken = []
for k in range(12):
    on = LAUNCH0 + 2 * k
    vx, vy, lean = VENTS[k % 3]
    vx, vy = GS(vx, vy)
    burst = []
    for j, kind in enumerate(['far', 'near'] if k % 2 else ['near', 'far']):
        if kind == 'far':
            lx, ly = prnd.uniform(900, 1440), prnd.uniform(404, 436)
            D, s_end, ride = prnd.uniform(7.5, 9), .35, 0
        else:
            ride = prnd.uniform(40, 80)
            D, s_end = prnd.uniform(5.5, 7.2), .8
            t0, t1 = on + D - .6, on + D + ride / 22 + .8
            lx, ly = near_spot(prnd, ride, taken, t0, t1)
            for w in (0, T):  # the cycle wraps, so a pod late in it shares the water with one early in the next
                taken.append((lx, lx + ride, ly, t0 + w, t1 + w))
                taken.append((lx, lx + ride, ly, t0 - w, t1 - w))
        p0 = (vx, vy)
        c1 = (vx + lean * 3 + prnd.uniform(40, 110), prnd.uniform(70, 130))
        # the pods near the machine fall with the wind at the rain's slant, not straight down
        c2 = (lerp(vx, lx, .4 if lx < 950 else prnd.uniform(.55, .75)), min(ly - 180, prnd.uniform(110, 170)))
        p3 = (lx, ly - 4)
        L = blen(p0, c1, c2, p3)
        burst.append((L / D, kind, p0, c1, c2, p3, L, D, s_end, ride))
    burst.sort(key=lambda b: -b[0])  # the fastest leaves first, so no pod overtakes another from its burst
    for j, (spd, kind, p0, c1, c2, p3, L, D, s_end, ride) in enumerate(burst):
        o = on + j * .18
        path = 'M%s %s C %s %s, %s %s, %s %s' % (f(p0[0]), f(p0[1]), f(c1[0]), f(c1[1]), f(c2[0]), f(c2[1]), f(p3[0]), f(p3[1]))
        if ride:
            path += ' L %s %s' % (f(p3[0] + ride), f(p3[1]))
            a = L / (L + ride)
            R = ride / 22  # riding at the current's speed
        else:
            a, R = 1, 0
        end = D + R + (0 if ride else .8)
        # the pod slows into its touchdown: the last 15% of the flight takes the last 25% of its time
        kp = '0;%s;%s;1;1' % (f(a * .85), f(a)) if ride else '0;.85;1;1'
        # spline: cruise, then settle smoothly from flight speed to riding speed, then ride, then hold
        settle_avg = .15 * L / (.25 * D)
        y2 = max(.3, min(.97, 1 - .4 * 22 / settle_avg))
        ksp = ('0 0 1 1;.25 .47 .6 %s;0 0 1 1;0 0 1 1' % f(y2)) if ride else '0 0 1 1;.25 .47 .6 1;0 0 1 1'
        ktm = ('0;%s;%s;%s;1' % (f(D * .75 / T), f(D / T), f((D + R) / T))) if ride else ('0;%s;%s;1' % (f(D * .75 / T), f(D / T)))
        pods.append('<!-- a seed pod from vent %d, %s -->' % (k % 3 + 1, 'riding the flood' if ride else 'settling far off') +
                    '<g opacity="0"><animateMotion path="%s" dur="%ss" begin="%s" repeatCount="indefinite" rotate="auto" keyPoints="%s" keyTimes="%s" calcMode="spline" keySplines="%s"/>'
                    '<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;%s;%s;%s;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                    '<g><animateTransform attributeName="transform" type="scale" values="1.15;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                    '<g opacity="0"><animate attributeName="opacity" values="0;.9;.9;0;0" keyTimes="0;%s;%s;%s;1" dur="%ss" begin="%s" repeatCount="indefinite"/><polygon points="-6,-2.4 -22,0 -6,2.4" fill="url(#podTail)"/></g>'
                    '<circle r="14" fill="url(#glowPod)" opacity=".75"/><path d="M-9 0 Q -2 -6 9 0 Q -2 6 -9 0 Z" fill="#4a6a1e" stroke="%s" stroke-width="1"/><path d="M-6 0 L 7 0" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/></g></g>' % (
                        path, f(T), onset_begin(T, o), kp, ktm, ksp,
                        f(.25 / T), f((end - .7) / T), f(end / T), f(T), onset_begin(T, o),
                        f(s_end), f(s_end), f(D / T), f(T), onset_begin(T, o),
                        f(.2 / T), f((D - .6) / T), f(D / T), f(T), onset_begin(T, o),
                        GLOW_CORE))

# ------------------------------------------------------------------ fronds layer (animated): the young fronds on the near rise, bending in the gusts
fr = []
FROND_BASES = [(1236, 560, 70, -30), (1262, 556, 96, -12), (1290, 552, 118, 2), (1316, 551, 88, 14), (1348, 550, 64, 28), (1402, 551, 84, -8), (1430, 552, 110, 6), (1460, 554, 72, 22)]
for i, (x, y, h, a) in enumerate(FROND_BASES):
    tip = (x + math.sin(math.radians(a)) * h + h * .18, y - math.cos(math.radians(a)) * h)
    wdt = h * .09
    d = 'M%s %s Q %s %s %s %s Q %s %s %s %s Z' % (
        f(x - wdt), f(y), f(x - wdt + (tip[0] - x) * .2), f(y - h * .7), f(tip[0]), f(tip[1]),
        f(x + wdt + (tip[0] - x) * .5), f(y - h * .6), f(x + wdt), f(y))
    rib = 'M%s %s Q %s %s %s %s' % (f(x), f(y), f(x + (tip[0] - x) * .35), f(y - h * .65), f(tip[0]), f(tip[1]))
    per = [2, 3, 4][i % 3]
    amp = 8 + (i % 2) * 2
    fr.append('<!-- a young frond on the near rise --><g><animateTransform attributeName="transform" type="rotate" values="%s %s %s;%s %s %s;%s %s %s" keyTimes="0;.3;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .3 1;.4 0 .6 1"/>'
              '<path d="%s" fill="%s"/><path d="%s" stroke="%s" stroke-width="1" fill="none" opacity=".7"/></g>' % (
                  f(-2), f(x), f(y), f(amp), f(x), f(y), f(-2), f(x), f(y), f(per), f(i * .37),
                  d, mix(GREEN_DARK, GREEN, .6 + .4 * (i % 2)), rib, GREEN_LIT))
fr.append('<!-- three lodged pods at the frond feet -->' + ''.join(
    '<circle cx="%d" cy="%d" r="14" fill="url(#glowPod)" opacity=".55"/><ellipse cx="%d" cy="%d" rx="4" ry="5.4" fill="%s"/>' % (x, y, x, y, GLOW_CORE) for x, y in [(1276, 552), (1334, 548), (1418, 549)]))

# ------------------------------------------------------------------ rain layer (animated): slanted streaks, far and near, and the rain lit by the Generator
rain = []


def rain_pattern(pid, tw, th, n, lmin, lmax, sw, col, op, seed):
    r = random.Random(seed)
    lines = []
    for _ in range(n):
        x0, y0 = r.uniform(0, tw), r.uniform(0, th)
        L = r.uniform(lmin, lmax)
        dx = L * tw / th  # the streak runs along the lattice vector (tw, th), the direction it falls
        for ox in (-tw, 0, tw):
            for oy in (-th, 0, th):
                lines.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(x0 + ox), f(y0 + oy), f(x0 + ox + dx), f(y0 + oy + L)))
    defs.append('<pattern id="%s" width="%s" height="%s" patternUnits="userSpaceOnUse"><g stroke="%s" stroke-width="%s" opacity="%s" stroke-linecap="round">%s</g></pattern>' % (
        pid, f(tw), f(th), col, f(sw), f(op), ''.join(lines)))


rain_pattern('rainFar', 84, 180, 37, 10, 22, .8, '#9fb2b0', .5, 4)
rain_pattern('rainNear', 163, 350, 28, 26, 52, 1.3, '#aabdbb', .55, 5)
rain_pattern('rainLit', 163, 350, 33, 26, 52, 1.4, GLOW_CORE, .8, 6)
defs[-3] = defs[-3].replace('<pattern id="rainFar"', '<pattern id="rainFar"')
for pid, tw, th, dur in (('rainFar', 84, 180, .55), ('rainNear', 163, 350, .5), ('rainLit', 163, 350, .5)):
    i = [k for k, d in enumerate(defs) if 'id="%s"' % pid in d][0]
    defs[i] = defs[i].replace('patternUnits="userSpaceOnUse">', 'patternUnits="userSpaceOnUse"><animateTransform attributeName="patternTransform" type="translate" values="0 0;%s %s" dur="%ss" repeatCount="indefinite" begin="-%ss"/>' % (f(tw), f(th), f(dur), f(dur * .37)), 1)
lin([(0, '#fff', 0), (.35, '#fff', .6), (1, '#fff', .9)], 0, 0, 0, H, units=True, id='rainFade')
defs.append('<mask id="rainFarMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="url(#rainFade)"/></mask>' % (W, H, W, H))
rad([(0, '#fff', 1), (.5, '#fff', .45), (1, '#fff', 0)], id='litSpot')
defs.append('<mask id="rainLitMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%d" cy="330" rx="200" ry="170" fill="url(#litSpot)"/></mask>' % (W, H, GX))
rain.append('<!-- rain, far: fine faint streaks --><rect x="0" y="180" width="%d" height="%d" fill="url(#rainFar)" mask="url(#rainFarMask)" opacity=".38"/>' % (W, H - 180))
rain.append('<!-- rain, near: heavier streaks --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainNear)" opacity=".22"/>' % (W, H))
rain.append('<!-- rain near the Generator catching its light --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainLitMask)" opacity=".55"/>' % (W, H))

# ------------------------------------------------------------------ top layer: finish
lin([(0, '#020303', .55), (.3, '#020303', 0), (.8, '#020303', 0), (1, '#020303', .55)], id='vignette')
lin([(0, '#020303', .55), (.12, '#020303', 0), (.88, '#020303', 0), (1, '#020303', .55)], 0, 0, 1, 0, id='sideVignette')
top = ['<rect width="%d" height="%d" fill="url(#vignette)"/>' % (W, H), '<rect width="%d" height="%d" fill="url(#sideVignette)"/>' % (W, H)]


# ------------------------------------------------------------------ assemble
# The panel's well sits inside a 6px mat, so it is wider than 21:9 (2.37 on desktop, 2.45 on a phone).
# 'meet' letterboxed the plate and showed the poster at both sides; 'slice' fills the well and trims at
# most 5% top and bottom, where nothing important sits.
def layer(id_, body, role=False):
    head = '<svg class="layer" id="layer-%s" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"' % (id_, W, H)
    if role:
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">The Genesis Prototype on Floria</title>\n  <desc id="scene-desc">A lone machine on bare wet rock throws glowing seed pods into a storm; the wind carries them over a flooded plain where the first moss and fronds are taking hold, a small plant-like creature stands in the water, and a giant tree rises into the clouds on the horizon.</desc>\n'
    else:
        head += ' aria-hidden="true">\n'
    return head + body + '\n</svg>\n'


svg_defs = '<svg class="defs" id="layer-defs" width="0" height="0" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n<defs>\n%s\n</defs>\n</svg>\n' % (W, H, '\n'.join(defs))
piece_comment = '<!--\n' + CONCEPT + '\n\n' + PIECES.replace('--', '-') + '\n-->\n'
layers = (piece_comment + svg_defs
          + layer('sky', '<!-- ===================== STORM CEILING ===================== -->\n' + '\n'.join(sky), role=True)
          + layer('flash', '<!-- ===================== LIGHTNING IN THE CLOUD ===================== -->\n' + '\n'.join(flash))
          + layer('far', '<!-- ===================== CURTAINS, WORLD TREE, FAR PLAIN ===================== -->\n' + '\n'.join(far))
          + layer('land', '<!-- ===================== MID PLAIN, SHELF, GENERATOR, GROWTH, NEAR ROCK ===================== -->\n' + '\n'.join(land))
          + layer('glow', '<!-- ===================== THE GENERATOR BREATHING, VENTS, RIPPLES ===================== -->\n' + '\n'.join(glow))
          + layer('pods', '<!-- ===================== SEED PODS ===================== -->\n' + '\n'.join(pods))
          + layer('fronds', '<!-- ===================== NEAR FRONDS ===================== -->\n' + '\n'.join(fr))
          + layer('rain', '<!-- ===================== RAIN ===================== -->\n' + '\n'.join(rain))
          + layer('top', '<!-- ===================== FINISH ===================== -->\n' + '\n'.join(top)))

page = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
page = page.replace('<!--LAYERS-->', layers)
io.open(os.path.join(HERE, 'source.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('ok', len(page) // 1024, 'KB')
