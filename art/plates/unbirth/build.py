"""Build the Unbirth plate: python art/plates/unbirth/build.py writes source.html beside it.

The plate is generated because most of it is procedural (cloud lobes, rain, seed flights, ripples,
moss). Edit this script, run it, then export with scripts/plates/export-plate.py unbirth. Every
drawn piece traces to a line of PIECES below.
"""
import bisect
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
vegetation, fungi and World Trees to support them (Floria, paragraphs 2 to 8); some Xalians there
are said to be born from its first seeds (paragraph 11). The plate is that first storm: the
machine throws seeds into the wind, and the flood meant to wash its mistakes away carries them
across the world. This machine makes life only by seeds (Nick, 2026-09-23): a hatch that creatures
walk out of belongs to the later Generators. Once a cycle it surges into overdrive (paragraphs 5 and
8: never calibrated, "at full capacity") and throws one heavy seed short onto the shelf, which splits
and lets out a newborn Xalian. Read left to right: machine, seeds, the first growth taking hold where
they land, the World Tree. Inference, not stated canon: the seeds carry both plants and plant-like
Xalians."""

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
  the rock, a plinth with a row of instrument lamps, a tall vessel with a round
  glowing core port and glowing seams, a dome cap and three vent stacks with glowing mouths. It is a
  first prototype, not a finished product: exposed structural ribs bolted over the vessel, cables
  looped from its flank into the rock, a vent run bolted up its right side into the third stack, and
  one panel cracked, leaking light.
  The core breathes; each vent flares when it throws seeds; the crack flickers; the lamps blink.
- the overdrive surge, once a cycle: the core charges and then flares white, every seam blazes, all
  three vents fire at once and throw a volley of seeds, the cloud base and the rain around the
  machine light up, then it all settles back.
- the birth, in the surge: the middle vent throws one heavy husked seed short, tumbling on a true
  arc; it lands upright on the shelf in front of the machine, glows, and splits along its seam; a
  newborn Xalian (the same kind as the one in the water, half its size) climbs out of it, pauses,
  then walks down the shelf and wades out to stand beside the grown one, where it fades; so does
  the empty husk.
- seeds: gliding seeds, like a Javan cucumber's: a dark almond seed with a lit seam, set in one broad
  translucent wing with a lit rim and fanned veins (not a dandelion tuft). The vent's jet throws it
  up folded; the wing spreads at the top of the climb; then it glides down in slow swoops at its own
  sink rate while the one gusting wind carries it, the wing's breadth swelling and thinning with its
  pitch. Physics, not drawn curves (seedsim.py): a broader wing sinks slower and goes farther, and
  every throw is placed so its whole flight keeps clear of the others. The near ones touch down on
  the flood, fold, and ride its current; some land on rock and sprout; the far ones dwindle toward
  the horizon.
- the mid plain: floodwater across the middle ground with flat slabs of scoured rock, the Generator's
  light reflected in it; rain rings the water. The flood runs left to right: pale current lines drift
  across it, foam catches on the upstream side of each slab and a wake trails off its downstream side.
- the first growth: downwind, moss catching along the edges of the rock slabs and low fronds in the
  cracks, sparse near the Generator and denser to the right; lodged pods glowing faintly among them.
- growth you can watch: now and then a pod comes to rest on a rock top instead of the water; a
  sprout rises from it and two leaves unfurl, it stands a while, then fades before its seed returns.
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
    # the seam at 392 has gone dark on its right half
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#0a0e0f" stroke-width="3"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.2" opacity=".85"/>' % (
        GX - 53, ry_, GX + 53, ry_, GX - 44, ry_ + 2.5, GX + (4 if ry_ == 392 else 44), ry_ + 2.5, GLOW_MID))
gen.append('<path d="%s" fill="none" stroke="%s" stroke-width="1.4" opacity=".55"/>' % (vessel, METAL_WET))
# a first prototype: structural ribs bolted over the vessel, not yet skinned
gen.append('<!-- a replaced panel in a different metal --><rect x="%d" y="394" width="30" height="19" fill="#2c3639" opacity=".85"/><rect x="%d" y="394" width="30" height="19" fill="none" stroke="#56666b" stroke-width=".6" opacity=".6"/>' % (GX - 46, GX - 46))
for rx_, y_end in ((-40, 430), (40, 356)):
    gen.append('<line x1="%d" y1="306" x2="%d" y2="%d" stroke="#0b0f10" stroke-width="5"/><line x1="%d" y1="306" x2="%d" y2="%d" stroke="%s" stroke-width="1" opacity=".6"/>' % (
        GX + rx_, GX + rx_, y_end, GX + rx_ - 1.5, GX + rx_ - 1.5, y_end, METAL_WET))
    gen.append(''.join('<circle cx="%d" cy="%d" r="1.3" fill="#56666b"/>' % (GX + rx_, by_) for by_ in (312, 330, 352, 392, 414, 426) if by_ < y_end))
gen.append('<!-- an unskinned opening where the rib stops: pipework inside -->'
           '<rect x="%d" y="358" width="16" height="30" fill="#050708"/>' % (GX + 32) +
           ''.join('<line x1="%d" y1="358" x2="%d" y2="388" stroke="%s" stroke-width="%s"/>' % (GX + 35 + 4 * i, GX + 35 + 4 * i, c, w) for i, (c, w) in enumerate((('#1f272a', 2), ('#2a3437', 1.6), ('#1f272a', 2)))) +
           '<rect x="%d" y="376" width="6" height="3" fill="%s" opacity=".6"/>' % (GX + 38, GLOW_MID))
# the cracked panel, leaking light
CRACK = [(GX - 34, 333), (GX - 30, 338), (GX - 33, 342), (GX - 27, 346), (GX - 29, 350)]
# a split running down from a seam, lit from inside by a thin core line
SPLIT = [(GX - 31, 331), (GX - 33.5, 336), (GX - 30.5, 340), (GX - 32.5, 345), (GX - 29.5, 351), (GX - 27, 351), (GX - 30, 345), (GX - 28, 340), (GX - 31, 336), (GX - 28.5, 331)]
CRACK = [(GX - 30, 332), (GX - 32, 336), (GX - 29.3, 340), (GX - 31.3, 345), (GX - 28.3, 350)]
gen.append('<polygon points="%s" fill="#050708"/><polyline points="%s" fill="none" stroke="%s" stroke-width=".9" stroke-linejoin="round"/>' % (pts(SPLIT), pts(CRACK), GLOW_MID))
gen.append('<!-- the panel corner bent out beside it, in the panel metal, lit along one edge --><polygon points="%s" fill="%s"/><polyline points="%s" fill="none" stroke="%s" stroke-width=".7"/>' % (
    pts([(GX - 28.5, 331), (GX - 21, 329), (GX - 26, 338)]), METAL_MID, pts([(GX - 28.5, 331), (GX - 21, 329)]), METAL_WET))
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
# the vent run bolted up the right side into the third stack, with its brackets
run = 'M%d 452 L %d 316 Q %d 300 %d 298 L %d 294' % (GX + 62, GX + 62, GX + 62, GX + 46, GX + 24)
gen.append('<path d="%s" stroke="#0b0f10" stroke-width="8" fill="none" stroke-linejoin="round"/><path d="%s" stroke="%s" stroke-width="5" fill="none" stroke-linejoin="round"/><path d="%s" stroke="%s" stroke-width="1" fill="none" opacity=".7" transform="translate(-1.5 0)"/>' % (run, run, METAL_MID, run, METAL_WET))
for by_ in (340, 400):
    gen.append('<rect x="%d" y="%d" width="12" height="5" fill="#2a3437"/><circle cx="%d" cy="%s" r="1.2" fill="#56666b"/>' % (GX + 52, by_ - 2, GX + 55, f(by_ + .5)))
gen.append('<rect x="%d" y="364" width="10" height="4" fill="#3a4649"/>' % (GX + 57))  # a flange joint
# cables looped from the flank into the rock
for (x0, y0, x1, y1, sag) in ((GX - 51, 342, GX - 66, 482, 70), (GX - 50, 404, GX - 92, 488, 50), (GX - 48, 420, GX - 80, 485, 44)):
    # each cable sags in a loop off the flank and runs down to a clamp on the rock
    d = 'M%d %d C %d %d, %d %d, %d %d' % (x0, y0, x0 - 20, y0 + sag, x1 + 4, y1 - 22, x1, y1)
    gen.append('<path d="%s" stroke="#070a0b" stroke-width="3" fill="none"/><path d="%s" stroke="%s" stroke-width=".7" fill="none" opacity=".6" transform="translate(-.8 -.8)"/>' % (d, d, METAL_WET))
    gen.append('<rect x="%d" y="%d" width="8" height="4" fill="#1c2427" stroke="#3a4649" stroke-width=".6"/>' % (x1 - 4, y1 - 2))
# the instrument lamps
gen.append(''.join('<circle cx="%d" cy="440" r="1.8" fill="#0b0f10" stroke="#3a4649" stroke-width=".6"/>' % (GX - 50 + 8 * i) for i in range(3)))
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
C = '#2f5a31'
HIPS = [(-10, -14, -15, 0), (-6, -14, -3, 0), (10, -14, 7, 0), (14, -14, 18, 0)]  # hip x, hip y, foot x, foot y


def xalian(legs_anim=None, eye_anim=''):
    # the creature in local units, its feet at the origin, facing left; legs_anim(i) gives each leg's animation
    legs = ''.join('<g>%s<path d="M%s %s L %s %s"/></g>' % ((legs_anim(i) if legs_anim else ''), f(hx), f(hy), f(fx), f(fy)) for i, (hx, hy, fx, fy) in enumerate(HIPS))
    body = ('<g fill="%s" stroke="%s" stroke-linecap="round">' % (C, C) +
            '<g stroke-width="3.4" fill="none">%s</g>' % legs +
            '<ellipse cx="2" cy="-18" rx="16" ry="7.5" stroke="none"/>' +
            # neck rising forward to the left, and the head
            '<path d="M-10 -20 C -16 -26, -18 -32, -22 -36" stroke-width="7" fill="none"/>' +
            '<ellipse cx="-24" cy="-37" rx="7.5" ry="5" stroke="none"/><path d="M-30 -39 L -38 -34 L -28 -33 Z" stroke="none"/>' +
            # a leafy tail
            '<path d="M17 -20 Q 26 -22 30 -30" stroke-width="3" fill="none"/>' +
            '</g>')
    crest = ''.join('<path d="M%s %s Q %s %s %s %s Q %s %s %s %s Z" fill="%s"/>' % (
        f(x0), f(y0), f(x0 - 6), f(y0 - h * .6), f(x0 - 2 + lean), f(y0 - h), f(x0 + 5), f(y0 - h * .5), f(x0 + 4), f(y0), c)
        for x0, y0, h, lean, c in [(-18, -32, 10, -3, GREEN_LIT), (-12, -25, 11, -2, GREEN_LIT), (-4, -24, 12, 0, '#a6d45a'), (5, -24, 10, 2, GREEN_LIT), (13, -23, 8, 3, GREEN_LIT), (29, -30, 9, 5, '#a6d45a')])
    eye = '<g>%s<circle cx="-27" cy="-38.5" r="3.2" fill="url(#glowPod)"/><circle cx="-27" cy="-38.5" r="1.5" fill="%s"/></g>' % (eye_anim, GLOW_CORE)
    return body + crest, eye


xbody, xeye = xalian()
xal = ['<!-- the small Xalian: a plant-like quadruped with a leafy crest, standing in the water -->',
       '<ellipse cx="-4" cy="-3" rx="44" ry="6" fill="#5a6c78" opacity=".55" filter="url(#soft2)"/>',
       '<ellipse cx="0" cy="2" rx="26" ry="3" fill="#06090a" opacity=".6"/>',
       '<g opacity=".35" transform="translate(0 2) scale(1 -.5)">%s</g>' % xbody,
       xbody + xeye]
land.append('<g transform="translate(%s %s) scale(%s)">%s</g>' % (f(XX), f(XY), f(XSC), ''.join(xal)))

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
# the overdrive surge, once a cycle: the core charges, then everything fires at once and settles
from seedsim import fly, aim, aim_k, aim_sink
REL = 1.5  # the release, after the charge
# the birth seed: one heavy husked seed thrown short in the surge, landing on the shelf before the machine
BIRTH_SPOT = (690, 482)  # its centre at rest, clear of the machine; it sits on the lit rock at y 494
_bv = GS(*VENTS[1][:2])
_bvx = aim('nut', _bv, (0, -165), BIRTH_SPOT[0], BIRTH_SPOT[1], .7, lo=-100, hi=300, wind=30)
BIRTH_PATH = [(0.0, _bv[0], _bv[1], 0.0)] + fly('nut', _bv, (_bvx, -165), lambda x: BIRTH_SPOT[1], 30, .7, step=.1)
BIRTH_D = BIRTH_PATH[-1][0]
# it thuds down, bounces once and settles upright
_lx, _ly = BIRTH_PATH[-1][1], BIRTH_PATH[-1][2]
BIRTH_PATH += [(BIRTH_D + .06, _lx + .8, _ly - 3.8, 0), (BIRTH_D + .12, _lx + 1.5, _ly - 5, 0), (BIRTH_D + .18, _lx + 2, _ly - 3.8, 0), (BIRTH_D + .25, _lx + 2.5, _ly, 0), (BIRTH_D + .3, _lx + 2.8, _ly - 1.2, 0), (BIRTH_D + .34, _lx + 3, _ly - 1.5, 0), (BIRTH_D + .39, _lx + 3, _ly - 1.1, 0), (BIRTH_D + .45, _lx + 3, _ly, 0)]
BIRTH_SPOT = (_lx + 3, _ly)
BIRTH_D += .45
B0 = REL + .05 + BIRTH_D  # its landing, in seconds after the surge's onset
S = (-(B0 + 3.9)) % T  # the surge's onset, chosen so t=0 finds the newborn paused beside its open husk
BIRTH_LAND = S + B0
SURGE_BURST = int(round((S + REL - LAUNCH0) / 2)) % 12  # the regular burst the volley replaces
SURGE_T = (1.0, 1.35, REL, 2.6, 4.0)
SURGE_V = (0, .22, .4, 1, .35, 0, 0)
FIRE_V = (0, 0, 0, 1, .3, 0, 0)  # the vents fire only on the release


def surge(vals, scale=1.0):
    return '<animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        ';'.join(f(v * scale) for v in vals), kt(T, *SURGE_T), f(T), onset_begin(T, S))


cx_, cy_ = GS(GX, 372)
plinth_ = pts([(GX - 72, 454), (GX - 60, 426), (GX + 60, 426), (GX + 72, 454)])
defs.append('<mask id="machineOut" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/><g transform="translate(%s %s) scale(%s) translate(-%s -%s)" fill="#222"><path d="%s"/><polygon points="%s"/>%s</g></mask>' % (
    W, H, W, H, f(GX), f(GBASE), f(GSC), f(GX), f(GBASE), vessel, plinth_,
    ''.join('<polygon points="%s"/>' % pts([(GX + (vx - GX) * .6 - 9, 294), (vx - 7, vy + 4), (vx + 7, vy + 4), (GX + (vx - GX) * .6 + 9, 294)]) for vx, vy, _l in VENTS)))
glow.append('<!-- the surge: the cloud base over the machine lit from below --><ellipse cx="%d" cy="222" rx="470" ry="92" fill="url(#glowWash)" opacity="0" mask="url(#machineOut)">%s</ellipse>' % (GX + 40, surge(SURGE_V, .9)))
glow.append('<!-- the surge: the light flooding the shelf --><ellipse cx="%d" cy="%d" rx="290" ry="48" fill="url(#glowWash)" opacity="0">%s</ellipse>' % (GX + 20, GBASE + 12, surge(SURGE_V, .85)))
glow.append('<!-- the surge: the core flaring --><circle cx="%s" cy="%s" r="116" fill="url(#glowPod)" opacity="0" mask="url(#machineOut)">%s</circle><circle cx="%s" cy="%s" r="26" fill="#ffffff" opacity="0" filter="url(#soft2)">%s</circle>' % (
    f(cx_), f(cy_), surge(SURGE_V, .8), f(cx_), f(cy_), surge(SURGE_V, .85)))
seams_ = ''.join('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(GS(GX - 44, ry_ + 2.5)[0]), f(GS(GX - 44, ry_ + 2.5)[1]), f(GS(GX + 44, ry_ + 2.5)[0]), f(GS(GX + 44, ry_ + 2.5)[1])) for ry_ in (330, 352, 392, 414))
glow.append('<!-- the surge: every seam blazing --><g stroke="%s" stroke-width="2" filter="url(#glow)" opacity="0">%s%s</g>' % (GLOW_CORE, surge(SURGE_V), seams_))
for i, (vx, vy, lean) in enumerate(VENTS):
    vx, vy = GS(vx, vy)
    glow.append('<!-- the surge: vent %d firing with the others --><ellipse cx="%s" cy="%s" rx="50" ry="36" fill="url(#glowPod)" opacity="0">%s</ellipse>' % (i + 1, f(vx), f(vy - 6), surge(FIRE_V)))
# the crack leaking light, flickering unevenly
cc = [GS(x, y) for x, y in CRACK]
glow.append('<!-- the cracked panel leaking light, flickering -->'
            '<g opacity=".4"><animate attributeName="opacity" values=".35;.85;.4;.95;.3;.7;.35" keyTimes="0;.1;.18;.4;.55;.8;1" dur="4s" begin="-1.3s" repeatCount="indefinite"/>'
            '<ellipse cx="%s" cy="%s" rx="11" ry="6" fill="url(#glowPod)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.1" stroke-linejoin="round" filter="url(#glow)"/></g>' % (
                f(cc[-1][0]), f(cc[-1][1] + 5), pts(cc), GLOW_CORE))
glow.append('<!-- the crack blazing in the surge --><ellipse cx="%s" cy="%s" rx="24" ry="17" fill="url(#glowPod)" opacity="0">%s</ellipse>' % (f(cc[2][0]), f(cc[2][1]), surge(SURGE_V)))
# the instrument lamps blinking in turn
for i in range(3):
    lx_, ly_ = GS(GX - 50 + 8 * i, 440)
    glow.append('<circle cx="%s" cy="%s" r="2" fill="%s" opacity=".15"><animate attributeName="opacity" values=".15;1;.15;.15" keyTimes="%s" dur="3s" begin="%s" repeatCount="indefinite"/></circle>' % (
        f(lx_), f(ly_), GLOW_CORE, kt(3, .08, .45), onset_begin(3, .5 * i)))

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

# ------------------------------------------------------------------ pods layer (animated): seeds thrown from the vents and carried off on the wind
# Every seed flies on real physics (seedsim.py): the vent's jet throws it up, it slows under gravity
# and drag, its wing opens at the top of the climb, and from then on it glides down in slow swoops at
# its own sink rate while the one wind (stronger aloft, gusting) carries it. A broader wing sinks
# slower and travels farther, so each seed's wing size is what brings it down on its spot. The flight
# is sampled into animateMotion values, so the plate plays the physics back as computed.
from seedsim import fly, aim_k, aim_sink

pods = []
WIND = 55.0
STEP = .15
ADULT_DISCS = [(1016, 488, 12), (1064, 518, 28), (1108, 494, 10)]  # the grown one's head, body and tail
SPROUT_SPOTS = [(1480, 470), (1360, 452), (1290, 470), (1418, 494), (1205, 568)]  # rock tops clear of the water the seeds ride


def near_spot(r, ride, taken, t0, t1):
    tries = 0
    while True:
        tries += 1
        if tries > 8000:
            return None  # the water is taken (the newborn is wading, sprouts stand): this one settles far off
        gap = 50 if tries < 3000 else 30
        lx = r.choice([r.uniform(830, 900), r.uniform(1135, 1230)])  # the wind carries no seed nearer than 830
        ly = r.uniform(474, 540) if lx < 900 else r.uniform(474, 505)
        if lx + ride > 1230 and ly > 445:
            continue  # the ride stops short of the near fronds
        if 900 < lx < 1135 and ly > 470:
            continue  # clear of the small Xalian, and of the current that would carry a seed into it
        if lx > 1150 and ly > 530:
            continue
        if 1236 < lx < 1470 and ly > 490:
            continue  # behind the near fronds
        if any(sx_ - rx_ - 6 < lx + ride and lx - 6 < sx_ + rx_ and sy_ - ry_ - 2 < ly < sy_ + ry_ * .35 + 10 for sx_, sy_, rx_, ry_ in SLABS):
            continue  # a seed never rides across a rock slab
        if tries < 3000 and any(math.hypot(lx - ax0, ly - ay) < 35 for ax0, ax1, ay, a0, a1 in taken):
            continue  # each landing spot is used once in the cycle
        if any(a0 < t1 and t0 < a1 and abs(ly - ay) < gap and lx - gap < ax1 and ax0 < lx + ride + gap for ax0, ax1, ay, a0, a1 in taken):
            continue
        return lx, ly


HANG = 0  # the seed sits in the middle of its wing
# the birth seed's husk, its origin at the bottom where it rests: two halves along a glowing seam
# taller than wide, like an acorn, big enough to hold the newborn folded up
HUSK_L = 'M0 -24 C -5 -24, -8.5 -19, -8.5 -12 C -8.5 -5, -5.5 .5, 0 .5 Z'
HUSK_R = 'M0 -24 C 5 -24, 8.5 -19, 8.5 -12 C 8.5 -5, 5.5 .5, 0 .5 Z'
HUSK = ('<circle cy="-12" r="22" fill="url(#glowPod)" opacity=".75"/><path d="%s" fill="#35501b" stroke="#6e9636" stroke-width=".8"/><path d="%s" fill="#2c4417" stroke="#6e9636" stroke-width=".8"/>'
        '<path d="M0 -23 L 0 0" stroke="%s" stroke-width="1.6" stroke-linecap="round"/><path d="M-4 -24.5 Q 0 -27 4 -24.5" stroke="#6e9636" stroke-width="1.4" fill="none"/>' % (HUSK_L, HUSK_R, GLOW_CORE))


def seed_art(cs, b, bloom, land, gone, riding, depth=None):
    # a gliding seed, like a Javan cucumber seed: a dark almond seed with a lit seam, the heart of the
    # thing, set into one broad translucent wing, its trailing edge drawn in a little, with a lit rim and veins fanning out along it. The
    # wing is seen a little from above, so its breadth shows, and that breadth swells and thins with
    # the pitch of each swoop (`depth`). Folded in the jet, it spreads at the top of the climb and folds
    # again when it comes down.
    fold = '<animateTransform attributeName="transform" type="scale" values=".22 .8;.22 .8;%s %s;%s %s;%s .35;%s .35" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        f(cs), f(cs), f(cs), f(cs), f(cs * .5), f(cs * .5), kt(T, bloom, bloom + .5, land, min(land + .35, gone - .05)), f(T), b)
    veins = ''.join('<path d="M%s -.5 Q %s %s %s %s"/>' % (f(sgn * 5), f(sgn * (8 + k * 2.6)), f(-4.6 + k * 2.2), f(sgn * (12 + k * 1.6)), f(-3.4 + k * 2.6)) for sgn in (-1, 1) for k in range(3))
    return ('<circle r="11" fill="url(#glowPod)" opacity=".7"/>'
            '<g>%s<g>%s<path d="M-17 .6 C -12 -5.2, -4 -6.6, 0 -5.6 C 4 -6.6, 12 -5.2, 17 .6 C 11 1.4, 6 1.1, 0 2.2 C -6 1.1, -11 1.4, -17 .6 Z" fill="#d6ebb0" fill-opacity=".3" stroke="#dcf09a" stroke-width=".7" stroke-opacity=".9"/>' % (fold, depth or '') +
            '<g stroke="#eef8d6" stroke-width=".45" fill="none" opacity=".7">%s</g></g></g>' % veins +
            '<g transform="translate(0 -2)"><circle r="6.5" fill="url(#glowPod)" opacity=".55"/><path d="M-6.5 0 Q 0 -4.6 6.5 0 Q 0 4.6 -6.5 0 Z" fill="#3f5d1a" stroke="%s" stroke-width=".9"/><path d="M-4.4 0 L 4.4 0" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/></g>' % GLOW_CORE)


def build_pods(lseed, pseed=23, quick=False):
    """Every seed of the cycle: the regular bursts, the seeds that lodge and sprout, and the surge
    volley. Returns their SVG, the lodged seeds (x, y, landing time) and every clash."""
    global taken
    taken = []
    out, sim, lodged, sprout_sim = [], [], [], []
    prnd = random.Random(pseed)
    lrnd = random.Random(lseed)
    # the newborn walks the shelf and wades off after it climbs out: no seed rides across it
    # (only where and when it is there: the shelf first, then the water's edge, then the wade)
    p1_, w1_, g1_ = BIRTH_LAND + 4.7, BIRTH_LAND + 10.1, BIRTH_LAND + 17.2
    for (x0, x1, y, a0, a1) in ((600, 830, 505, BIRTH_LAND, p1_ + 4.2), (790, 900, 548, p1_ + 3, w1_ + 1.2), (870, 1040, 568, w1_, g1_)):
        for w in (0, T, -T):
            taken.append((x0, x1, y, a0 + w, a1 + w))

    def plan(vent, kind, lx, ly, rr, ride=0):
        # throw from the vent's mouth, harder for a farther spot, and find the wing that lands it there
        vx, vy, lean = VENTS[vent]
        vx, vy = GS(vx, vy)
        v0 = (lean * 3 + rr.uniform(-25, 45), (-200 - .18 * (lx - 600)) * rr.uniform(.86, 1.12))  # no two thrown quite alike
        phase = rr.uniform(0, 6.3)
        period = rr.uniform(1.6, 3.0)  # each seed swoops on its own phugoid
        roll = rr.uniform(-6, 6)  # and carries its own slight roll, so no two share an attitude
        sink = aim_sink((vx, vy), v0, lx, ly, WIND, phase, period)
        path = fly('glider', (vx, vy), v0, lambda x: ly, WIND, phase, step=STEP, sink=sink, period=period)
        path = [(0.0, vx, vy, .7 * math.degrees(math.atan2(v0[1], v0[0])))] + path
        path = [(t, x, y, a + roll) for t, x, y, a in path]
        return dict(kind=kind, vent=vent, path=path, sink=sink, ride=ride, D=path[-1][0], spot=(lx, ly))

    def lodge(on, vent, spot):
        # a seed bound for the rock, redrawn until its flight (and the sprout it grows) keeps clear
        p = throw(on, lambda: plan(vent, 'lodge', spot[0], spot[1], lrnd))
        assert p, 'no clear throw to the rock at %s' % (spot,)
        land = on + p['D']
        for w in (0, T, -T):
            for h in (0, 15, 30, 45):
                taken.append((spot[0] - 24, spot[0] + 24, spot[1] - h, land - .6 + w, land + 12.5 + w))

    def emit(o, p, test=False):
        path, kind, D, ride = p['path'], p['kind'], p['D'], p['ride']
        lx, ly = path[-1][1], path[-1][2]
        # the samples, then a ride on the flood or a rest where it came down, then the hold to the cycle's end
        ts = [t for t, *_ in path]
        xs = [x for _, x, _y, _a in path]
        ys = [y - HANG for _, _x, y, _a in path]
        angs = [a for *_r, a in path]
        R = ride / 22 if ride else 0  # riding at the current's speed
        end = D + R + (.6 if kind == 'lodge' else .8)
        if kind != 'lodge':
            # it rides on through its fade (22 u/s on the flood); a far one drifts on as it goes. Its
            # speed decays from its glide to that over a few tenths of a second, never all at once.
            v = 22 if ride else 9
            (t_a, x_a, y_a, _aa), (t_b, x_b, y_b, _ab) = path[-2], path[-1]
            v0x = (x_b - x_a) / max(1e-3, t_b - t_a)
            x_, tt = lx, D
            while tt < end - 1e-6:
                dt = .05 if tt - D < .35 else .25
                tt2 = min(tt + dt, end)
                x_ += (v + (v0x - v) * math.exp(-(tt - D) / .12)) * (tt2 - tt)
                ts.append(tt2)
                xs.append(x_)
                ys.append(ly - HANG)
                angs.append(angs[-1] * (.6 if dt < .1 else .5))  # folding, settling level
                tt = tt2
        fade = (.25, end - .6, end)
        ts.append(T)
        xs.append(xs[-1])
        ys.append(ys[-1])
        angs.append(angs[-1])
        cs = max(.7, min(1.3, math.sqrt(45 / p['sink'])))  # a broader wing sinks slower and glides farther
        bloom = next((t for (t, x, y, a), (t2, x2, y2, a2) in zip(path, path[1:]) if y2 >= y), .8)
        rec = (o, ts, xs, [y + HANG for y in ys], .125, end, D, '%s from vent %d at %s' % (kind, p['vent'] + 1, f(o % T)), p['vent'], cs, kind == 'far', bloom)
        if test:
            return clear(rec)  # only asking whether this throw keeps clear
        if kind == 'lodge':
            lodged.append((lx, ly, (o + D) % T))
            sprout_sim.append((lx, ly, o + D, len(sim)))
        sim.append(rec)
        b = onset_begin(T, o)
        bloom = next((t for (t, x, y, a), (t2, x2, y2, a2) in zip(path, path[1:]) if y2 >= y), .8)
        shrink = '.4' if kind == 'far' else '1'  # the far ones dwindle as the wind takes them away
        label = {'lodge': 'coming to rest on the rock where it will sprout', 'near': 'riding the flood', 'far': 'settling far off'}[kind]
        kts = ';'.join(('%.5f' % (t / T)).rstrip('0').rstrip('.') for t in ts)
        # the wing shows more of its breadth as it tips into each swoop, less as it levels out
        depth = '<animateTransform attributeName="transform" type="scale" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
            ';'.join('1 %s' % f(max(.45, min(1.15, .45 + abs(a) / 35))) for a in angs), kts, f(T), b)
        out.append('<!-- a seed from vent %d, %s -->' % (p['vent'] + 1, label) +
                   '<g opacity="0"><animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                       ';'.join('%s,%s' % (f(x), f(y)) for x, y in zip(xs, ys)), kts, f(T), b) +
                   '<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, *fade), f(T), b) +
                   '<g><animateTransform attributeName="transform" type="scale" values="1;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (shrink, shrink, f(D / T), f(T), b) +
                   '<g><animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                       ';'.join(f(a) for a in angs), kts, f(T), b) +
                   seed_art(cs, b, bloom, D, end, bool(ride), depth) + '</g></g></g>')

    def at_(rec, t):
        o, ts, xs, ys, v0, v1, D, _l, _v, cs_, far_, bloom_ = rec
        u = (t - o) % T
        if not (v0 <= u <= v1):
            return None
        j = min(max(bisect.bisect_right(ts, u), 1), len(ts) - 1)
        r = (u - ts[j - 1]) / ((ts[j] - ts[j - 1]) or 1)
        size = cs_ * ((1 - .6 * min(1, u / D)) if far_ else 1) * (.22 if u < bloom_ else 1)  # the wing's span now
        return xs[j - 1] + (xs[j] - xs[j - 1]) * r, ys[j - 1] + (ys[j] - ys[j - 1]) * r, u < D, u, size

    def clear(rec):
        # would this throw keep clear, its whole flight, of every seed already in the sky with it (by the
        # same rule as the check below, with a margin) and of every standing sprout?
        o, ts, xs, ys, v0, v1, D, _l, vent_, *_r = rec
        for n in range(int(v0 / .05), int(v1 / .05) + 1):
            t = o + n * .05
            a = at_(rec, t)
            if not a:
                continue
            for other in sim:
                b_ = at_(other, t)
                if b_ and not ((a[3] < .15 or b_[3] < .15) and vent_ == other[8]):
                    if math.hypot(a[0] - b_[0], a[1] - b_[1]) < 1.15 * max(12, 14 * (a[4] + b_[4])):
                        return False
            for (sx, sy, land, own) in sprout_sim:
                if .3 <= (t - land) % T <= 12.5:
                    sc_ = lerp(.84, 1.4, (sy - HZ) / (H - HZ))
                    if math.hypot(a[0] - sx, a[1] - (sy - 16 * sc_)) < 1.15 * (16 * sc_ + 6):
                        return False
            for (cx_, cy_, r_) in ADULT_DISCS:
                if math.hypot(a[0] - cx_, a[1] - cy_) < r_ + 8 * a[4]:
                    return False
        if _l.startswith('lodge'):
            # and the sprout it will grow stands clear of every seed already thrown
            sx, sy = xs[-1], ys[-1]
            sc_ = lerp(.84, 1.4, (sy - HZ) / (H - HZ))
            for n in range(6, 251):
                t = o + D + n * .05
                for other in sim:
                    b_ = at_(other, t)
                    if b_ and math.hypot(b_[0] - sx, b_[1] - (sy - 16 * sc_)) < 1.15 * (16 * sc_ + 6):
                        return False
        return True

    # The birth seed goes into the sky first, then the seeds bound for the rock (their places are fixed),
    # then every other seed, each thrown only where its whole flight keeps clear of all already thrown.
    # the birth seed: heavy, thrown short, tumbling on its arc; it comes to rest upright on the shelf
    o = S + REL + .05
    ts = [t for t, *_ in BIRTH_PATH] + [T]
    xs = [x for _, x, _y, _a in BIRTH_PATH] + [BIRTH_PATH[-1][1]]
    ys = [y for _, _x, y, _a in BIRTH_PATH] + [BIRTH_PATH[-1][2]]
    angs = [min(0, t - BIRTH_D + .45) * 240 for t in ts[:-1]] + [0]  # tumbling until it lands, upright after
    sim.append((o, ts, xs, ys, .1, BIRTH_D, BIRTH_D, 'the birth seed', 1, .55, False, 0))
    b = onset_begin(T, o)
    kts = ';'.join(('%.5f' % (t / T)).rstrip('0').rstrip('.') for t in ts)
    birth_svg = ('<!-- the birth seed: heavy and husked, thrown short in the surge onto the shelf -->'
               '<g opacity="0"><animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                   ';'.join('%s,%s' % (f(x), f(y)) for x, y in zip(xs, ys)), kts, f(T), b) +
               '<animate attributeName="opacity" values="0;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="discrete"/>' % (kt(T, .02, BIRTH_D + .08), f(T), b) +
               '<g><animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(a) for a in angs), kts, f(T), b) +
               '<g transform="translate(0 12)">%s</g></g></g>' % HUSK)

    def throw(on, draw):
        # the first of up to 60 draws whose flight keeps clear; None if none does
        for _try in range(60):
            cand = draw()
            if cand is None:
                return None
            if cand['sink'] <= 75 and emit(on, cand, test=True):  # a glide, never a dive
                emit(on, cand)
                return cand
        return None

    LODGE_BURSTS = {1: SPROUT_SPOTS[0], 5: SPROUT_SPOTS[3], 11: SPROUT_SPOTS[2]}  # the nearer rock first, so no later seed flies through its sprout
    for k, spot in LODGE_BURSTS.items():
        lodge(LAUNCH0 + 2 * k, k % 3, spot)
    VOLLEY = (.9, .7, 0)  # each vent's first throw in the surge, after the release; the birth seed leaves the middle vent first
    for vent, spot in ((1, SPROUT_SPOTS[4]), (2, SPROUT_SPOTS[1])):
        lodge(S + REL + .05 + VOLLEY[vent], vent, spot)

    # the surge's far seeds: two from the first vent, one after each rock-bound seed from the others
    for j_, vent in enumerate((0, 1, 2, 0)):
        band = (900 + 150 * vent + (60 if j_ == 3 else 0), 1030 + 150 * vent + (60 if j_ == 3 else 0))
        throw(S + REL + .05 + .4 * (1 if j_ else 0) + VOLLEY[vent], lambda vent=vent, band=band: plan(vent, 'far', lrnd.uniform(*band), lrnd.uniform(404, 436), lrnd))

    for k in range(12):
        if k == SURGE_BURST:
            continue  # the burst that falls on the surge release: the volley takes its place
        on = LAUNCH0 + 2 * k
        j_ = 1 if k in LODGE_BURSTS else 0
        for kind in (['far', 'near'] if k % 2 else ['near', 'far']):
            got = None
            if kind == 'near':
                ride = prnd.uniform(40, 80)

                def rider(k=k, ride=ride, o_=on + j_ * .45):
                    # a free-looking spot on the water, and a flight there whose ride finds the water free
                    for _try in range(40):
                        spot = near_spot(prnd, ride, taken, o_ + 3, o_ + 3.01)
                        if spot is None:
                            return None
                        cand = plan(k % 3, 'near', spot[0], spot[1], prnd, ride)
                        t0, t1 = o_ + cand['D'] - .6, o_ + cand['D'] + ride / 22 + 1.7
                        if not any(a0 < t1 and t0 < a1 and abs(spot[1] - ay) < 22 and spot[0] - 22 < ax1 and ax0 < spot[0] + ride + 22 for ax0, ax1, ay, a0, a1 in taken):
                            cand['water'] = (t0, t1)
                            return cand
                    return None
                got = throw(on + j_ * .45, rider)
                if got:
                    spot, (t0, t1) = got['spot'], got['water']
                    for w in (0, T):  # the cycle wraps, so a seed late in it shares the water with one early in the next
                        for s_ in (w, -w):
                            taken.append((spot[0], spot[0] + ride, spot[1], t0 + s_, t1 + s_))
            if got is None:
                got = throw(on + j_ * .45, lambda k=k: plan(k % 3, 'far', prnd.uniform(900, 1440), prnd.uniform(404, 436), prnd))
            if got:
                j_ += 1
    out.append(birth_svg)  # drawn last, over the rest

    # every pair of seeds on screen together must stay apart: 16 units in flight, 10 once down, once
    # clear of the vent; and no seed may pass through a standing sprout except the one it grew from
    close = {}
    table = []
    for step in range(int(T / .05)):
        t = step * .05
        now = [(i, at_(rec, t)) for i, rec in enumerate(sim)]
        now = [(i, p) for i, p in now if p]
        table.append(now)
        for x_ in range(len(now)):
            i, (ax, ay, af, au, asz) = now[x_]
            for y_ in range(x_ + 1, len(now)):
                j, (bx, by, bf, bu, bsz) = now[y_]
                if (au < .15 or bu < .15) and sim[i][8] == sim[j][8]:
                    continue  # two seeds leaving the same vent mouth a beat apart
                d = math.hypot(ax - bx, ay - by)
                # wings never overlap: apart by most of their half-spans (17 a side at full size; the tips may pass), at least 12
                if d < max(12, 14 * (asz + bsz)) and d < close.get((i, j), (99, 0))[0]:
                    close[(i, j)] = (d, t)
                    if quick:
                        return out, lodged, ['a clash']
    for (sx, sy, land, own) in sprout_sim:
        sc_ = lerp(.84, 1.4, (sy - HZ) / (H - HZ))
        cx_, cy_, r_ = sx, sy - 16 * sc_, 16 * sc_ + 6
        for step, now in enumerate(table):
            t = step * .05
            if not (.3 <= (t - land) % T <= 12.5):
                continue
            for i, p in now:
                if i != own and math.hypot(p[0] - cx_, p[1] - cy_) < r_:
                    close[(i, -1 - own)] = (math.hypot(p[0] - cx_, p[1] - cy_), t)
                    if quick:
                        return out, lodged, ['a clash']
    riders = sum(1 for rec in sim if rec[7].startswith('near'))
    if riders < 6:
        close[(-9, -9)] = (riders, 0)
    clashes = ['only %d seeds ride the flood' % d if i == -9 else '%s and %s: %s apart at t %s' % (sim[i][7], sim[j][7] if j >= 0 else 'the sprout from ' + sim[-1 - j][7], f(d), f(t)) for (i, j), (d, t) in close.items()]
    return out, lodged, clashes


# every throw is placed clear as it is made, so the first draw passes; PODS_SEARCH=1 still searches others
best = None
SEARCH = os.environ.get('PODS_SEARCH')
SEEDS = [(23, 29)] if not SEARCH else [(p, l) for p in range(23, 123) for l in range(29, 39)]
for pseed, lseed in SEEDS:
    got = build_pods(lseed, pseed, quick=bool(SEARCH))
    if SEARCH and not got[2]:
        got = build_pods(lseed, pseed)
    if best is None or len(got[2]) < len(best[1][2]):
        best = ((pseed, lseed), got)
    if not got[2]:
        break
lseed, (pod_svg, LODGE, clashes) = best
print('seeds: draws %s, %d clashes' % (lseed, len(clashes)), *clashes[:6], sep=chr(10) + '  ')
pods.extend(pod_svg)

# ------------------------------------------------------------------ life layer (animated): the birth seed and the newborn, and sprouts rising where seeds lodge
life = []


def at(vals, times, attr='opacity', begin=None):
    # an animation on the master clock, its times in seconds after the surge's onset
    return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        attr, ';'.join(f(v) if not isinstance(v, str) else v for v in vals), kt(T, *times), f(T), begin or onset_begin(T, S))


# the birth seed at rest: it lands, glows, splits along its seam, and the newborn climbs out of it
SPLIT0, SPLIT1 = B0 + 1.2, B0 + 1.7
hx, hy = BIRTH_SPOT[0], BIRTH_SPOT[1] + 12
life.append('<!-- light splashing off the rock where the birth seed lands --><ellipse cx="%s" cy="%s" rx="30" ry="7" fill="url(#glowWash)" opacity="0">%s</ellipse>' % (f(hx), f(hy), at((0, 0, .9, 0, 0), (B0 - .45, B0 - .4, B0 + .4))))
open_l = at(('0 0 0', '0 0 0', '-72 0 0', '-72 0 0'), (SPLIT0, SPLIT1), attr='transform').replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')
open_r = at(('0 0 0', '0 0 0', '72 0 0', '72 0 0'), (SPLIT0, SPLIT1), attr='transform').replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')
life.append('<!-- the birth seed at rest on the shelf: it glows, splits along its seam, and is left empty -->'
            '<g transform="translate(%s %s)"><g opacity="0">%s' % (f(hx), f(hy), at((0, 0, 1, 1, 0, 0), (B0, B0 + .02, B0 + 6, B0 + 7.5))) +
            '<circle cy="-12" r="22" fill="url(#glowPod)" opacity="0">%s</circle>' % at((0, .7, .7, .9, .6, 1, .3, 0, 0), (B0, B0 + .4, B0 + .7, B0 + 1.0, SPLIT0, SPLIT1 + .6, B0 + 4.5)) +
            '<g><path d="%s" fill="#35501b" stroke="#6e9636" stroke-width=".8"/>%s</g>' % (HUSK_L, open_l.replace('</animateTransform>', '')) +
            '<g><path d="%s" fill="#2c4417" stroke="#6e9636" stroke-width=".8"/>%s</g>' % (HUSK_R, open_r.replace('</animateTransform>', '')) +
            '<path d="M0 -23 L 0 0" stroke="%s" stroke-width="1.6" stroke-linecap="round" opacity="1">%s</path></g></g>' % (GLOW_CORE, at((1, 1, 0, 0), (SPLIT0, SPLIT1))))

# the newborn: the same kind as the one in the water, half its size, facing downstream
NB = .72
WALK = [(hx, hy), (hx + 22, hy + 3), (760, 513), (815, 540), (858, 562), (902, 570), (946, 576), (986, 572), (1008, 570)]
APPEAR, EMERGE = B0 + 1.4, B0 + 2.4
STEP0, STEP1 = B0 + 2.5, B0 + 3.3  # it steps clear of the husk, then stops to look
PAUSE1 = B0 + 4.7
WALK1 = PAUSE1 + 5.4
seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(WALK, WALK[1:])]
cum = [0]
for d in seg:
    cum.append(cum[-1] + d)
tot = cum[-1]
ARRIVE = WALK1 + (cum[-1] - cum[4]) * (WALK1 - PAUSE1) / (cum[4] - cum[1])  # one pace, walk and wade alike
GONE = ARRIVE + 1.4  # it stands beside the grown one, then fades into the rain
key_t, key_p = [0, STEP0, STEP1, PAUSE1], [0, 0, cum[1] / tot, cum[1] / tot]
for i in range(2, 5):
    key_t.append(PAUSE1 + (WALK1 - PAUSE1) * (cum[i] - cum[1]) / (cum[4] - cum[1]))
    key_p.append(cum[i] / tot)
for i in range(5, len(WALK)):
    key_t.append(WALK1 + (ARRIVE - WALK1) * (cum[i] - cum[4]) / (cum[-1] - cum[4]))
    key_p.append(cum[i] / tot)


def time_at_x(x):
    # when the newborn passes x on its way out, for the rings at its legs
    for (t0, p0), (t1, p1) in zip(zip(key_t, key_p), list(zip(key_t, key_p))[1:]):
        x0 = next(WALK[i][0] + (WALK[i + 1][0] - WALK[i][0]) * (p0 * tot - cum[i]) / seg[i] for i in range(len(seg)) if cum[i] <= p0 * tot <= cum[i + 1] + 1e-6)
        x1 = next(WALK[i][0] + (WALK[i + 1][0] - WALK[i][0]) * (p1 * tot - cum[i]) / seg[i] for i in range(len(seg)) if cum[i] <= p1 * tot <= cum[i + 1] + 1e-6)
        if x0 <= x <= x1 and x1 > x0:
            return t0 + (t1 - t0) * (x - x0) / (x1 - x0)
    return GONE


motion = '<animateMotion values="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear" keyTimes="%s"/>' % (
    ';'.join('%s,%s' % (f(x), f(y)) for x, y in [WALK[0], WALK[0], WALK[1], WALK[1]] + WALK[2:] + [WALK[-1]]), f(T), onset_begin(T, S), kt(T, *key_t[1:]))
# a diagonal gait: the near fore leg with the far hind leg, then the other pair
STRIDE = .24  # with a 24 degree swing at .6 scale (less for a longer leg), the feet keep pace with the ground


def strides(t0, t1):
    out, t_ = [], t0 + STRIDE / 2
    while t_ < t1 - .1:
        out.append(t_)
        t_ += STRIDE
    return out


step_peaks = strides(STEP0, STEP1)
peaks = strides(PAUSE1, ARRIVE)  # one unbroken gait from the shelf into the water


def leg_anim(i):
    # strides from the end of its pause until it is gone; the swing is centred on the vertical
    sign = 1 if i in (0, 3) else -1
    hx_, hy_, fx, fy = HIPS[i]
    th0 = math.degrees(math.atan2(fx - hx_, fy - hy_))
    times, vals = [], []
    for seg0, seg1, pk, amp in ((STEP0, STEP1, step_peaks, 22 * .6 / NB), (PAUSE1, ARRIVE, peaks, 24 * .6 / NB)):
        times += [seg0] + pk + [seg1]
        vals += [0] + [th0 + sign * amp * (1 if j % 2 == 0 else -1) for j in range(len(pk))] + [0]
    vals = [0] + vals + [0]
    return '<animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        ';'.join('%s %s %s' % (f(v), f(hx_), f(hy_)) for v in vals), kt(T, *times), f(T), onset_begin(T, S))


blink = at((1, 1, .1, 1, 1), (B0 + 4.1, B0 + 4.18, B0 + 4.32), attr='opacity')
nbody, neye = xalian(leg_anim, blink)
bob_t = [PAUSE1] + [p + d for p in peaks for d in (0, STRIDE / 2)][:-1] + [ARRIVE]
bob_v = ['0 0'] + ['0 0' if j % 2 == 0 else '0 -1.2' for j in range(len(bob_t) - 2)] + ['0 0']
bob = '<animateTransform attributeName="transform" type="translate" values="0 0;%s;0 0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
    ';'.join(bob_v), kt(T, *bob_t), f(T), onset_begin(T, S))
# wading: below the waterline its legs are under the flood (none on the shelf)
WATERLINE = [(812, 700), (815, 541), (858, 559), (902, 566), (946, 571), (986, 567), (1536, 567), (1536, 700)]
defs.append('<clipPath id="wadeClip" clipPathUnits="userSpaceOnUse"><polygon points="%s"/></clipPath>' % pts([(0, 0), (W, 0)] + WATERLINE[::-1] + [(0, 700)]))
# it climbs up out of the split husk, small and folded, and unfolds to its size
grow = '<animateTransform attributeName="transform" type="scale" values=".3;.3;1;1" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, APPEAR, EMERGE), f(T), onset_begin(T, S))
rise = '<animateTransform attributeName="transform" type="translate" values="0 5;0 5;0 0;0 0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, APPEAR, EMERGE), f(T), onset_begin(T, S))
life.append('<!-- the newborn Xalian: climbs out of the split seed, pauses on the shelf, walks down it and wades off toward the grown one -->'
            '<g clip-path="url(#wadeClip)"><g opacity="0">%s%s' % (motion, at((0, 0, 1, 1, 0, 0), (APPEAR, APPEAR + .4, ARRIVE + .1, GONE))) +
            '<g>%s<g transform="scale(%s %s)"><g>%s<g>%s<ellipse cx="-6" cy="-40" rx="22" ry="12" fill="url(#glowPod)" opacity=".6"/>%s%s</g></g></g></g></g></g>' % (rise, f(-NB), f(NB), grow, bob, nbody, neye))
# rings spreading from its legs as it wades
for (rx0, ry0, tt) in [(x_, y_, time_at_x(x_)) for x_, y_ in ((842, 553), (906, 570), (940, 574), (970, 573), (996, 572))]:
    life.append('<ellipse cx="%s" cy="%s" rx="1" ry=".4" fill="none" stroke="#9fb2b8" stroke-width="1.4" opacity="0">%s%s%s</ellipse>' % (
        f(rx0), f(ry0), at((1, 1, 2, 14, 14), (tt, tt + .05, tt + .9), attr='rx'), at((.4, .4, .6, 3.5, 3.5), (tt, tt + .05, tt + .9), attr='ry'), at((0, 0, .7, 0, 0), (tt, tt + .05, tt + .9))))

# sprouts rising where pods lodged: a stem climbs, two leaves unfurl, it stands a while, then fades
for (x, y, L) in LODGE:
    k = (y - HZ) / (H - HZ)
    sc = lerp(.84, 1.4, k)
    b = onset_begin(T, L)

    def sa(vals, times, attr='opacity', typ=None):
        if typ:
            return '<animateTransform attributeName="transform" type="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (typ, ';'.join(vals), kt(T, *times), f(T), b)
        return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (attr, ';'.join(f(v) for v in vals), kt(T, *times), f(T), b)

    leaf = '<path d="M0 0 Q 5 -6 13 -4 Q 6 1 0 0 Z" fill="%s"/><path d="M0 0 Q 6 -3 11 -3.6" stroke="%s" stroke-width=".5" fill="none" opacity=".7"/>'
    leaves = ''.join('<g transform="scale(%d 1)"><g>%s%s</g></g>' % (side, sa(('-78', '-78', '-12', '-12'), (1.0, 2.8), typ='rotate'),
                     '<g>%s%s</g>' % (sa(('.4', '.4', '1', '1'), (1.0, 2.8), typ='scale'), leaf % ('#a6d45a' if side > 0 else GREEN_LIT, GREEN_DARK))) for side in (1, -1))
    life.append('<!-- a sprout rising from a lodged pod at %d,%d -->' % (x, y) +
                '<g transform="translate(%s %s) scale(%s)"><g opacity="0">%s' % (f(x), f(y - 1), f(sc), sa((0, 0, 1, 1, 0, 0), (.3, .6, 11, 12.5))) +
                '<circle r="7" fill="url(#glowPod)" opacity=".8">%s</circle>' % sa((.9, .9, .25, .25), (.6, 3.0)) +
                '<g>%s<path d="M0 0 C 1 -8, -2 -14, 1 -22" stroke="%s" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>' % (sa(('1 .02', '1 .02', '1 1', '1 1'), (.3, 1.9), typ='scale'), GREEN_LIT) +
                '<g>%s%s</g>' % (sa(('0 0', '0 0', '1 -22', '1 -22'), (.3, 1.9), typ='translate'), leaves) +
                '</g></g>')

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
for pid, tw, th, dur in (('rainFar', 84, 180, .6), ('rainNear', 163, 350, .5), ('rainLit', 163, 350, .5)):
    i = [k for k, d in enumerate(defs) if 'id="%s"' % pid in d][0]
    defs[i] = defs[i].replace('patternUnits="userSpaceOnUse">', 'patternUnits="userSpaceOnUse"><animateTransform attributeName="patternTransform" type="translate" values="0 0;%s %s" dur="%ss" repeatCount="indefinite" begin="-%ss"/>' % (f(tw), f(th), f(dur), f(dur * .37)), 1)
lin([(0, '#fff', 0), (.35, '#fff', .6), (1, '#fff', .9)], 0, 0, 0, H, units=True, id='rainFade')
defs.append('<mask id="rainFarMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="url(#rainFade)"/></mask>' % (W, H, W, H))
rad([(0, '#fff', 1), (.5, '#fff', .45), (1, '#fff', 0)], id='litSpot')
defs.append('<mask id="rainLitMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%d" cy="330" rx="200" ry="170" fill="url(#litSpot)"/></mask>' % (W, H, GX))
rain.append('<!-- rain, far: fine faint streaks --><rect x="0" y="180" width="%d" height="%d" fill="url(#rainFar)" mask="url(#rainFarMask)" opacity=".38"/>' % (W, H - 180))
rain.append('<!-- rain, near: heavier streaks --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainNear)" opacity=".22"/>' % (W, H))
rain.append('<!-- rain near the Generator catching its light --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainLitMask)" opacity=".55"/>' % (W, H))
defs.append('<mask id="rainSurgeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%d" cy="320" rx="330" ry="250" fill="url(#litSpot)"/></mask>' % (W, H, GX))
rain.append('<!-- the surge: the rain around the machine lit up --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainSurgeMask)" opacity="0">%s</rect>' % (W, H, surge(SURGE_V, .9)))

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
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">The Genesis Prototype on Floria</title>\n  <desc id="scene-desc">A lone machine on bare wet rock throws glowing winged seeds into a storm; one heavy husked seed splits open on the rock and a newborn plant-like creature climbs out and wades off to a grown one of its kind; the wind carries the seeds over a flooded plain where the first moss and sprouts are taking hold, and a colossal tree climbs into the clouds far off.</desc>\n'
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
          + layer('life', '<!-- ===================== THE HATCH, THE NEWBORN, SPROUTS ===================== -->\n' + '\n'.join(life))
          + layer('pods', '<!-- ===================== SEED PODS ===================== -->\n' + '\n'.join(pods))
          + layer('fronds', '<!-- ===================== NEAR FRONDS ===================== -->\n' + '\n'.join(fr))
          + layer('rain', '<!-- ===================== RAIN ===================== -->\n' + '\n'.join(rain))
          + layer('top', '<!-- ===================== FINISH ===================== -->\n' + '\n'.join(top)))

page = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
page = page.replace('<!--LAYERS-->', layers)
io.open(os.path.join(HERE, 'source.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('ok', len(page) // 1024, 'KB')
