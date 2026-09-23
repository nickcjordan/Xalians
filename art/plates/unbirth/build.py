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
GX, GBASE = 280, 490  # the Genesis Prototype: center and the rock it stands on
T = 24.0  # the master cycle: every clock divides it
GSC = 1.18  # the Generator is drawn at this scale around its footing


def GS(x, y):
    return GX + (x - GX) * GSC, GBASE + (y - GBASE) * GSC


MT = 'translate(%s %s) scale(%s) translate(%s %s)' % (GX, GBASE, GSC, -GX, -GBASE)  # the machine's frame

CONCEPT = """The Age of Unbirth: sterile, the Vallerii built machines to make life for them. The first was
the Genesis Prototype, raised on Floria, a bare world of smooth rock and shallow seas that its
star boiled into a world-washing flood every year, chosen so any mistake would be washed away.
Uncalibrated, it ran at full capacity through the entire storm and made not only Xalians but the
vegetation, fungi and World Trees to support them (Floria, paragraphs 2 to 8); some Xalians there
are said to be born from its first seeds (paragraph 11). The plate is that first storm: a heavy
industrial machine on the rock at left lets its glowing seeds down a chute into the flood, and the
flood meant to wash its mistakes away carries them out over the world instead (Nick, 2026-09-23: a
Generator would not have a cannon). This machine makes life only by seeds: a hatch that creatures
walk out of belongs to the later Generators. Seeds that split on the water let out larvae; seeds
that catch on rock sprout. Once a cycle it surges into overdrive (paragraphs 5 and 8: never
calibrated, "at full capacity"), the gate bursts, and one heavy seed is flung from the chute onto its
own shelf, which splits and lets out a newborn larva that swims away. Read left to right: machine,
seeds spreading on the current, the first life taking hold, and far off the World Tree on its island
of young forest grown from earlier seeds. No grown creature is shown. Inference, not stated canon:
the seeds carry both plants and plant-like Xalians."""

PIECES = """Piece list (far to near). Key light: the Generator itself, a gold-green glow from its vat, seams
and chute, the only warm light in the scene. The sun is blacked out; lightning inside the cloud is
the only other light. Wind and flood run left to right: rain slants and seeds drift that way.
- storm ceiling: a heavy near-black cloud mass across the top, its base a row of hanging lobes,
  faintly lit gold-green from below over the Generator. Static.
- air under the cloud: dark, lightening a little toward the horizon. Static.
- lightning: flashes inside the cloud mass on their own clocks; one lights the World Tree from behind.
- rain curtains: soft slanted shafts of heavier rain hanging from the cloud to the horizon. Static.
- the World Tree: a colossal trunk far off at right, great boughs sweeping up into the storm; its
  canopy domes over it and spreads under the cloud base across the right half of the sky, its own
  seed pods glowing faintly among the leaves. Hazed by distance.
- its island: land rising from the flood around its foot, covered in the young forest earlier seeds
  have grown: tall trees (broadleaf crowns and conifer spires) crowding the trunk, still a fraction
  of its height, stepping down to shrubs, weeds and grass at the waterline; pods glowing among them.
  The scale of that forest is what makes the tree read as colossal.
- the far plain: floodwater sheeting over smooth rock to the horizon, dark whaleback domes of
  scoured rock breaking the surface, smaller and paler with distance. Static.
- the shelf: a broad smooth dome of black rock at left under the machine, wet, the Generator's light
  pooling on it, running out into the flood.
- the Genesis Prototype, a heavy industrial machine filling the left of the panel: a stepped
  foundation bolted into the rock with heavy struts; a tall armored housing of riveted plate columns
  and girder bands; a tall glass incubation cylinder with rounded ends, thin hoops and pipes feeding
  it, its fluid glowing, pale seeds ripening and bubbles rising in it; a feed pipe up into a roof
  housing with a banded header tank and a hopper; a boiler annex on the left with a gauge, lamps, louvres and a steam relief valve; a steel
  lattice gantry with a catwalk and a beacon over the sluice; cables looped down to
  clamps on the rock; and at its foot a sluice gate with a wheel, and a riveted chute running down
  from it on legs to the water behind the shelf, glowing fluid sliding down it. It is a first
  prototype: a patch plate in another metal, a seam gone half dark, a split plate leaking light.
  The vat breathes; steam puffs and drifts downwind; the gauge trembles; the lamps and beacon blink.
- the overdrive surge, once a cycle: the vat charges and then flares white, every seam blazes, the
  gate bursts open and a rush of seeds goes down the chute together, the cloud base and the rain
  around the machine light up, then it all settles back.
- the birth, in the surge: one heavy acorn seed comes down the chute first and jumps its wall, point
  first on a true arc; it rights itself as it lands on the shelf, glows, and splits along its seam; a
  newborn larva (tadpole-like, leafy, a glowing eye) rises out of it and looks about, wriggles down
  the shelf, slips into the flood and swims off downstream with a wake, then dives. The husk fades.
- seeds: acorn-like, smaller than the birth seed: a long pointed nut under a toothed olive cup,
  glowing softly. They slide down the chute one by one, drop into the lit water at its foot, and the
  flood takes them: each fans out on its own heading, eases into the current (left to right, slower
  with distance), wanders a little, parts around the slabs, lying on its side and turning slowly.
  Each meets its own end: some split and let a small larva out, which swims off and dives; some go
  under; some catch on a slab's edge and sprout; many are carried off downstream toward the island.
  Integrated per seed, not drawn curves, and every voyage is placed so it keeps clear of the others
  and of the swimming larvae.
- the mid plain: floodwater across the middle ground with flat slabs of scoured rock, the Generator's
  light reflected in it; rain rings the water. The flood runs left to right: pale current lines drift
  across it, foam catches on the upstream side of each slab and a wake trails off its downstream side.
- the first growth: downwind, moss catching along the edges of the rock slabs and low fronds in the
  cracks, sparse near the Generator and denser to the right; lodged pods glowing faintly among them.
- growth you can watch: a seed catches on a rock; a sprout rises from it and two leaves unfurl, it
  stands a while, then fades before its seed returns.
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

# the World Tree: the colossus far off at right, tied into the scene. Its canopy spreads under the
# storm ceiling across the right of the sky, prop roots hang from its boughs to the plain, and its
# great roots run out across the flood toward the viewer, breaking the water, carrying moss and
# lodged seeds, the nearest surfacing as the rise at bottom right.

def limb(x0, y0, cx, cy, x1, y1, w0, w1, n=13, wf=None):
    # a tapering, curving bough or root: a quadratic spine offset to either side
    ptsL, ptsR, spine = [], [], []
    for i in range(n):
        t = i / (n - 1)
        u = 1 - t
        px = u * u * x0 + 2 * u * t * cx + t * t * x1
        py = u * u * y0 + 2 * u * t * cy + t * t * y1
        dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx)
        dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy)
        nn = math.hypot(dx, dy) or 1
        w = (wf(t) if wf else lerp(w0, w1, t)) / 2
        ptsL.append((px - dy / nn * w, py + dx / nn * w))
        ptsR.append((px + dy / nn * w, py - dx / nn * w))
        spine.append((px, py, w))
    return ptsL + ptsR[::-1], spine


TX = 1290
tree_col = '#10181e'
g_trunk_rim = lin([(0, '#0e1414', 1), (.5, '#070b0b', 1), (1, '#0a0f0f', 1)], 0, 120, 0, HZ, units=True)
trunk = 'M%s %s C %s %s, %s %s, %s %s L %s %s L %s %s C %s %s, %s %s, %s %s L %s %s Z' % (
    f(TX - 110), f(HZ + 6), f(TX - 66), f(HZ - 16), f(TX - 54), f(HZ - 90), f(TX - 42), f(200),
    f(TX - 28), f(0), f(TX + 32), f(0),
    f(TX + 46), f(200), f(TX + 58), f(HZ - 90), f(TX + 72), f(HZ - 16), f(TX + 116), f(HZ + 6))
boughs = ''.join('<polygon points="%s" fill="url(#%s)"/>' % (pts(limb(*L)[0]), g_trunk_rim) for L in [
    (TX - 30, 290, TX - 130, 226, TX - 290, 150, 60, 16), (TX + 34, 276, TX + 120, 214, TX + 250, 140, 54, 16),
    (TX - 20, 250, TX - 70, 190, TX - 150, 120, 34, 12), (TX + 24, 244, TX + 80, 182, TX + 140, 116, 30, 11),
    (TX - 170, 200, TX - 280, 176, TX - 400, 150, 20, 6), (TX + 170, 184, TX + 240, 170, TX + 330, 150, 16, 6)])
TRUNK_RIM = ''  # a rim light down the trunk read as hanging vines, twice: its dark value against the cloud carries it
# the canopy: leaf masses spreading under the storm ceiling across the right of the sky
crnd_ = random.Random(71)
canopy = []
for i in range(80):
    x = crnd_.uniform(TX - 480, W + 60)
    dome = 70 * max(0, 1 - abs(x - TX) / 520)  # the crown domes up over the trunk
    y = 160 - dome + 26 * math.sin(x / 90) + crnd_.uniform(-30, 26) - max(0, (TX - 300 - x)) * .12
    canopy.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(x), f(y), f(crnd_.uniform(40, 90)), f(crnd_.uniform(18, 34)), mix('#132019', '#0c1411', crnd_.random())))
leaves_ = []
for i in range(230):
    x = crnd_.uniform(TX - 470, W + 40)
    dome = 50 * max(0, 1 - abs(x - TX) / 520)
    y = 180 - dome * crnd_.random() + 20 * math.sin(x / 90) + crnd_.uniform(-24, 24) - max(0, (TX - 300 - x)) * .12
    leaves_.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" transform="rotate(%s %s %s)"/>' % (
        f(x), f(y), f(crnd_.uniform(5, 11)), f(crnd_.uniform(2.2, 4)), mix('#1b2e22', '#2c4a2c', crnd_.random() * .5), f(crnd_.uniform(-40, 40)), f(x), f(y)))
lin([(0, '#fff', 0), (.15, '#fff', .12), (.3, '#fff', .35), (.45, '#fff', .6), (.6, '#fff', .82), (.75, '#fff', .95), (1, '#fff', 1)], 0, 60, 0, 250, units=True, id='treeFade')
defs.append('<mask id="treeMask" maskUnits="userSpaceOnUse" x="%s" y="-40" width="1300" height="%s"><rect x="%s" y="-40" width="1300" height="%s" fill="url(#treeFade)"/></mask>' % (f(TX - 700), f(HZ + 60), f(TX - 700), f(HZ + 60)))
far.append('<!-- the World Tree: a colossal trunk far off on the plain, great boughs sweeping up into the storm, its canopy spread under the cloud across the right of the sky, -->'
           '<g mask="url(#treeMask)"><g filter="url(#cloud)">%s</g><g filter="url(#soft1)"><path d="%s" fill="url(#%s)"/>%s</g>%s<g opacity=".85">%s</g></g>' % (
               ''.join(canopy), trunk, g_trunk_rim, boughs, TRUNK_RIM, ''.join(leaves_)))
far.append('<!-- the tree hazed by distance and rain --><rect x="%d" y="100" width="1100" height="%d" fill="#27313c" opacity=".1"/>' % (TX - 550, HZ - 90))
# its great roots: out across the far plain from the trunk foot, thickening as they come nearer
ROOTS = [((TX - 100, HZ + 2), (TX - 200, HZ + 8), (TX - 330, HZ + 20), 12, 3),
         ((TX - 60, HZ + 5), (TX - 110, HZ + 22), (TX - 190, HZ + 38), 14, 4),
         ((TX + 70, HZ + 5), (TX + 110, HZ + 22), (TX + 170, HZ + 40), 14, 4),
         ((TX + 110, HZ + 2), (TX + 210, HZ + 8), (TX + 330, HZ + 18), 12, 3)]
ROOT_SPINES = []
ROOT_FULL = []
root_svg = []
for (p0, c, p1, w0, w1) in ROOTS:
    poly, spine = limb(p0[0], p0[1], c[0], c[1], p1[0], p1[1], w0, w1, n=30)
    ROOT_FULL.append(spine)
    ROOT_SPINES.append(spine)
    root_svg.append('<polygon points="%s" fill="#111a20"/>' % pts(poly))
    top_ = [(x, y - w * .85) for x, y, w in spine[:-2]]
    root_svg.append('<polyline points="%s" fill="none" stroke="#3e4c56" stroke-width="1" opacity=".7"/>' % pts(top_))
    root_svg.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity=".7" stroke-linecap="round"/>' % (pts(top_[8:]), mix(GREEN, GREEN_LIT, .15), f(w1 * .35)))
    root_svg.append('<polyline points="%s" fill="none" stroke="#9fb2b8" stroke-width="1" opacity=".25" filter="url(#soft2)"/>' % pts([(x, y + w + .5) for x, y, w in spine[3:-1]]))
land_roots = '<!-- the World Tree\'s great roots running out across the flood toward the viewer, moss along their tops, foam at their feet --><g>%s</g>' % ''.join(root_svg)
lin([(0, '#0c1216', .75), (1, '#0c1216', 0)], 0, HZ, 0, HZ + 70, units=True, id='treeRefl')
far.append('<!-- the trunk reflected in the flood at its foot, broken by the rain --><polygon points="%s" fill="url(#treeRefl)"/>' % pts([(TX - 112, HZ + 1), (TX + 118, HZ + 1), (TX + 70, HZ + 60), (TX - 60, HZ + 60)]) +
           ''.join('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#4a5866" stroke-width=".8" opacity=".35"/>' % (f(TX - 100 + 13 * k % 190), f(HZ + 5 + k * 4.5), f(TX - 60 + 13 * k % 190), f(HZ + 5 + k * 4.5)) for k in range(12)))
far.append(land_roots.replace('great roots running out across the flood toward the viewer', 'great roots spreading from its foot across the far plain'))


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
# The World Tree's island: land rising from the flood around its foot, covered in the forest the
# Generator's seeds have already grown. Young trees crowd the colossus, the tallest nearest it and
# still only a fraction of its height; lower trees and shrubs step down toward the shore, and weeds and
# grass fringe the waterline. The scale of that forest is what makes the World Tree read as colossal.
irnd = random.Random(91)
ISL_FRONT = [(930, 407), (1010, 404), (1120, 402), (1240, 400), (1380, 398), (W + 30, 397)]
ISL_BACK = [(W + 30, HZ - 3), (TX + 200, HZ - 6), (TX, HZ - 7), (TX - 260, HZ - 4), (980, HZ - 2), (930, 405)]
lin([(0, '#1b2622', 1), (1, '#0c1210', 1)], 0, HZ - 10, 0, 450, units=True, id='islandG')
isle = ['<polygon points="%s" fill="url(#islandG)"/>' % pts(ISL_FRONT + ISL_BACK)]


def isl_front(x):
    for (ax, ay), (bx, by) in zip(ISL_FRONT, ISL_FRONT[1:]):
        if ax <= x <= bx:
            return lerp(ay, by, (x - ax) / (bx - ax))
    return HZ + 5


def isl_back(x):
    bk = sorted(ISL_BACK, key=lambda p: p[0])
    for (ax, ay), (bx, by) in zip(bk, bk[1:]):
        if ax <= x <= bx:
            return lerp(ay, by, (x - ax) / max(1, bx - ax))
    return HZ


def haze(c, y, x=1100):
    # farther back on the island is hazier
    return mix(c, '#2a3440', .25 + .35 * max(0, min(1, (isl_front(x) - y) / 12)))


plants = []
for i in range(800):
    x = irnd.uniform(934, W + 20)
    y0, y1 = isl_back(x), isl_front(x)
    if y1 - y0 < 2:
        continue
    y = irnd.uniform(y0, y1)
    d = min(1, abs(x - TX) / 560)  # 0 at the trunk
    shore = (y1 - y) / max(1, y1 - y0)  # 0 at the waterline, 1 at the back
    h = lerp(52, 5, d ** .8) * lerp(.35, 1, min(1, shore * 2.2)) * irnd.uniform(.55, 1.15) * (1.3 if irnd.random() < .07 else 1)  # the odd emergent stands above the rest
    if h > 14 and irnd.random() < .6:
        plants.append((y, 'tree', x, h))
    elif h > 6 and irnd.random() < .5:
        plants.append((y, 'shrub', x, h))
    elif irnd.random() < .25:
        plants.append((y, 'weed', x, h))
for x in range(934, W + 20, 5):
    plants.append((isl_front(x) - .5, 'grass', x + irnd.uniform(-1.5, 1.5), irnd.uniform(2, 4)))
plants.sort()
veg = []
for (y, kind, x, h) in plants:
    base = haze(mix('#15241b', '#264330', irnd.random()), y, x)
    lit = haze(mix('#2f4d33', '#46683e', irnd.random()), y, x)
    if kind == 'tree':
        if irnd.random() < .55:
            # a broadleaf: a thin trunk and a cauliflower crown, lit a little on its upper side
            cy_ = y - h * .68
            blobs = [(x + irnd.uniform(-.22, .22) * h, cy_ + irnd.uniform(-.14, .14) * h, h * irnd.uniform(.16, .26)) for _ in range(4)]
            veg.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/>' % (f(x), f(y), f(x), f(cy_), haze('#0f1512', y), f(max(.6, h * .045))) +
                       ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(bx), f(by), f(r), base) for bx, by, r in blobs) +
                       '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity=".55"/>' % (f(x - h * .05), f(cy_ - h * .1), f(h * .14), lit))
        else:
            # a conifer: stacked tiers narrowing to a spire
            tiers = ''.join('<polygon points="%s"/>' % pts([(x - h * w, y - h * lo), (x, y - h * hi), (x + h * w, y - h * lo)]) for w, lo, hi in ((.2, .18, .62), (.15, .42, .82), (.1, .64, 1.0)))
            veg.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/><g fill="%s">%s</g>' % (f(x), f(y), f(x), f(y - h * .3), haze('#0f1512', y), f(max(.6, h * .04)), base, tiers))
    elif kind == 'shrub':
        veg.append(''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(x + dx * h), f(y - h * .35), f(h * .38), f(h * .32), base) for dx in (-.25, .2)) +
                   '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".5"/>' % (f(x - h * .05), f(y - h * .5), f(h * .22), f(h * .16), lit))
    else:
        n_ = 3 if kind == 'weed' else 2
        veg.append('<g stroke="%s" stroke-width=".8" fill="none" stroke-linecap="round">%s</g>' % (base if kind == 'weed' else haze('#3a5a34', y), ''.join(
            '<path d="M%s %s q %s %s %s %s"/>' % (f(x), f(y), f(a * .3), f(-h * .6), f(a), f(-h)) for a in [irnd.uniform(-3, 3) for _ in range(n_)])))
isle.append('<g>%s</g>' % ''.join(veg))
# pods glowing here and there in the young forest
for i in range(26):
    x = irnd.uniform(940, W - 20)
    y = irnd.uniform(isl_back(x), isl_front(x)) - irnd.uniform(3, 16) * max(.2, 1 - abs(x - TX) / 560)
    isle.append('<circle cx="%s" cy="%s" r="2.4" fill="url(#glowPod)" opacity=".4"/><circle cx="%s" cy="%s" r=".9" fill="%s" opacity=".8"/>' % (f(x), f(y), f(x), f(y), GLOW_MID))
isle.append('<polyline points="%s" fill="none" stroke="#b8c8cc" stroke-width="1" opacity=".25" filter="url(#soft2)"/>' % pts([(x, y + 1.5) for x, y in ISL_FRONT]))
far.append('<!-- the World Tree\'s island: the young forest its seeds have grown, tall trees crowding its foot and stepping down to shrubs, weeds and grass at the waterline -->' + ''.join(isle))
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
SLABS = [(800, 604, 60, 7), (962, 600, 48, 6), (880, 506, 90, 9), (1010, 488, 70, 7), (1180, 520, 120, 11), (1300, 486, 60, 6), (1440, 502, 90, 8), (160, 492, 80, 7), (300, 470, 60, 5), (1060, 552, 80, 8), (760, 530, 60, 7)]
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

# the shelf: a broad smooth dome of wet black rock under the machine, running out into the flood
shelf = [(-20, 530), (40, 506), (110, 494), (180, 490), (GX, GBASE - 4), (400, 490), (470, 496), (540, 510), (600, 530), (650, 552), (690, 574), (720, 596), (720, 612), (-20, 612)]
lin([(0, '#1c2524', 1), (.35, ROCK, 1), (1, '#070a0a', 1)], 0, GBASE, 0, 620, units=True, id='shelfG')
land.append('<!-- the Generator reflected in the floodwater beyond the shelf --><ellipse cx="760" cy="598" rx="60" ry="26" fill="url(#glowWash)" opacity=".55" filter="url(#soft6)"/>')
land.append('<!-- the shelf: a smooth dome of scoured rock --><polygon points="%s" fill="url(#shelfG)"/>' % pts(shelf))
land.append('<polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".5"/>' % pts(shelf))
land.append('<polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.4" opacity=".5"/>' % pts(shelf[1:12]))
land.append('<!-- the Generator light catching the shelf rim --><polyline points="%s" fill="none" stroke="%s" stroke-width="2.4" opacity=".55" filter="url(#soft2)"/>' % (pts(shelf[4:10]), GLOW_MID))
land.append('<!-- the shelf sinking into the floodwater --><ellipse cx="560" cy="604" rx="220" ry="14" fill="#141e26" filter="url(#soft6)"/>')
land.append('<!-- the Generator light pooled on the wet rock --><ellipse cx="%d" cy="%d" rx="300" ry="36" fill="url(#glowWash)" opacity=".8"/>' % (GX + 90, GBASE + 10))
land.append('<!-- the halo of the Generator light in the rain around it --><ellipse cx="%d" cy="300" rx="260" ry="210" fill="url(#glowWash)" opacity=".3"/>' % GX)

# The Genesis Prototype: a heavy industrial machine, drawn in its own frame at GSC. A stepped
# foundation bolted into the rock; a tall armored housing of riveted plate columns with girder bands
# and a glass incubation cylinder; a boiler annex on its left with a gauge, lamps and a steam relief
# valve; a steel lattice gantry with a catwalk up its right side; a roof housing on top. The sluice
# and chute at its foot are drawn in the scene's own coordinates, below.
gen = ['<!-- the Genesis Prototype: foundation, housing, vat, annex, gantry, roof -->']
lin([(0, '#3c4a4e', 1), (.12, METAL_MID, 1), (.6, METAL_DARK, 1), (1, '#141a1c', 1)], 0, 0, 1, 0, id='plateG')
lin([(0, METAL_WET, 1), (.3, METAL_MID, 1), (1, METAL_DARK, 1)], id='metalV')
FOUND1 = [(GX - 190, 496), (GX - 176, 472), (GX + 170, 472), (GX + 186, 496)]
FOUND2 = [(GX - 178, 472), (GX - 170, 456), (GX + 160, 456), (GX + 168, 472)]
HOUSING = [(GX - 100, 456), (GX - 100, 262), (GX - 84, 246), (GX + 76, 246), (GX + 92, 262), (GX + 92, 456)]
ANNEX = [(GX - 168, 456), (GX - 168, 346), (GX - 156, 334), (GX - 100, 334), (GX - 100, 456)]
TURRET = [(GX - 78, 248), (GX - 66, 216), (GX + 56, 216), (GX + 70, 248)]
CORE = (GX - 6, 353)
# the foundation: two stepped blocks with bolt rows, anchored by heavy struts from the housing
for poly, c in ((FOUND1, '#151b1d'), (FOUND2, '#1c2427')):
    gen.append('<polygon points="%s" fill="%s"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.4" opacity=".7"/>' % (pts(poly), c, pts(poly[1:3]), METAL_WET))
gen.append(''.join('<circle cx="%s" cy="484" r="1.6" fill="#3c4a4e"/>' % f(x) for x in range(GX - 168, GX + 172, 24)))
gen.append(''.join('<circle cx="%s" cy="464" r="1.4" fill="#3c4a4e"/>' % f(x) for x in range(GX - 158, GX + 160, 22)))
for (x0, y0, x1, y1) in ((GX - 100, 380, GX - 184, 474), (GX + 92, 380, GX + 176, 474)):
    gen.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#0b0f10" stroke-width="9"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (f(x0), f(y0), f(x1), f(y1), f(x0), f(y0 - 3), f(x1), f(y1 - 3), METAL_WET))
# the steel gantry up the right side: two rails, cross bracing, a catwalk with its railing
GR0, GR1, GTOP = GX + 104, GX + 136, 188
gan = []
for y in range(GTOP, 460, 34):
    gan.append('<line x1="%d" y1="%d" x2="%d" y2="%d"/><line x1="%d" y1="%d" x2="%d" y2="%d"/><line x1="%d" y1="%d" x2="%d" y2="%d"/>' % (GR0, y, GR1, y + 34, GR1, y, GR0, y + 34, GR0, y, GR1, y))
gen.append('<!-- the gantry --><g stroke="#0e1315" stroke-width="2">%s</g>' % ''.join(gan))
for gx_ in (GR0, GR1):
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="474" stroke="#0b0f10" stroke-width="5"/><line x1="%s" y1="%d" x2="%s" y2="474" stroke="%s" stroke-width="1" opacity=".55"/>' % (gx_, GTOP - 6, gx_, f(gx_ - 1.5), GTOP - 6, f(gx_ - 1.5), METAL_WET))
gen.append('<rect x="%d" y="262" width="%d" height="5" fill="#141a1c"/><line x1="%d" y1="262" x2="%d" y2="262" stroke="%s" stroke-width="1" opacity=".6"/>' % (GX + 92, GR1 + 14 - GX - 92, GX + 92, GR1 + 14, METAL_WET))
gen.append('<polyline points="%s" fill="none" stroke="#141a1c" stroke-width="1.6"/>' % pts([(GX + 92, 246), (GR1 + 14, 246), (GR1 + 14, 262)]) + ''.join('<line x1="%d" y1="246" x2="%d" y2="262" stroke="#141a1c" stroke-width="1.4"/>' % (x, x) for x in range(GX + 104, GR1 + 15, 12)))
gen.append('<rect x="%d" y="%d" width="%d" height="6" fill="#141a1c"/>' % (GR0 - 4, GTOP - 8, GR1 - GR0 + 8))
# the boiler annex: louvres, a pressure gauge, instrument lamps, and the steam relief valve on top
gen.append('<polygon points="%s" fill="url(#plateG)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (pts(ANNEX), pts(ANNEX[:4]), METAL_WET))
gen.append('<g stroke="#0b0f10" stroke-width="2.2">%s</g>' % ''.join('<line x1="%d" y1="%d" x2="%d" y2="%d"/>' % (GX - 160, y, GX - 108, y) for y in range(386, 436, 7)))
gen.append('<circle cx="%d" cy="360" r="10" fill="#1f272a" stroke="%s" stroke-width="1.6"/><circle cx="%d" cy="360" r="7" fill="#c9d6c8" opacity=".25"/>' % (GX - 134, METAL_WET, GX - 134))
gen.append(''.join('<circle cx="%d" cy="446" r="2" fill="#0b0f10" stroke="#3a4649" stroke-width=".6"/>' % (GX - 156 + 10 * i) for i in range(3)))
gen.append('<!-- the relief valve --><rect x="%d" y="304" width="8" height="32" fill="#1c2427"/><rect x="%d" y="298" width="16" height="8" fill="#2a3437" stroke="%s" stroke-width=".6"/><circle cx="%d" cy="314" r="6" fill="none" stroke="#3a4649" stroke-width="2"/><line x1="%d" y1="314" x2="%d" y2="314" stroke="#3a4649" stroke-width="1.4"/>' % (
    GX - 154, GX - 158, METAL_WET, GX - 140, GX - 146, GX - 134))
# cables from the annex looping down to clamps on the rock
for (x0, y0, x1, y1, sag) in ((GX - 168, 372, GX - 212, 494, 60), (GX - 168, 400, GX - 236, 500, 44), (GX - 166, 424, GX - 200, 492, 30)):
    d = 'M%d %d C %d %d, %d %d, %d %d' % (x0, y0, x0 - 24, y0 + sag, x1 + 6, y1 - 26, x1, y1)
    gen.append('<path d="%s" stroke="#070a0b" stroke-width="3.4" fill="none"/><path d="%s" stroke="%s" stroke-width=".7" fill="none" opacity=".6" transform="translate(-.8 -.8)"/>' % (d, d, METAL_WET))
    gen.append('<rect x="%d" y="%d" width="9" height="4" fill="#1c2427" stroke="#3a4649" stroke-width=".6"/>' % (x1 - 4, y1 - 2))
# the housing: riveted plate columns, girder bands, the seams between plates leaking light
gen.append('<polygon points="%s" fill="url(#plateG)"/>' % pts(HOUSING))
for i, (x0, x1) in enumerate(((GX - 100, GX - 60), (GX - 60, GX - 20), (GX - 20, GX + 20), (GX + 20, GX + 60), (GX + 60, GX + 92))):
    gen.append('<rect x="%d" y="262" width="%d" height="194" fill="%s" opacity="%s"/>' % (x0, x1 - x0, ('#000', '#56666b')[i % 2], ('.18', '.06')[i % 2]))
SEAMS = [(276, 1.0), (422, .45), (442, 1.0)]  # y, how much of the seam still glows (the second has gone half dark)
for y, frac in SEAMS:
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#0a0e0f" stroke-width="3.4"/><line x1="%d" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.3" opacity=".85"/>' % (
        GX - 98, y, GX + 90, y, GX - 90, f(y + .6), f(GX - 90 + 172 * frac), f(y + .6), GLOW_MID))
for y in (300, 406):
    gen.append('<rect x="%d" y="%d" width="196" height="10" fill="#0e1315"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (GX - 102, y - 5, GX - 102, y - 5, GX + 94, y - 5, METAL_WET) +
               ''.join('<circle cx="%d" cy="%d" r="1.3" fill="#56666b"/>' % (x, y) for x in range(GX - 94, GX + 92, 14)))
for x in (GX - 60, GX - 20, GX + 20, GX + 60):
    gen.append('<line x1="%d" y1="258" x2="%d" y2="456" stroke="#0b0f10" stroke-width="4"/><line x1="%s" y1="258" x2="%s" y2="456" stroke="%s" stroke-width=".8" opacity=".5"/>' % (x, x, f(x - 1.8), f(x - 1.8), METAL_WET) +
               ''.join('<circle cx="%d" cy="%d" r="1.2" fill="#56666b"/>' % (x, y) for y in range(268, 452, 22) if not (y in (296, 312, 400, 412))))
gen.append('<polygon points="%s" fill="none" stroke="%s" stroke-width="1.6" opacity=".6"/>' % (pts(HOUSING), METAL_WET))
# a first prototype, not a finished product: a patch plate in another metal, a split plate leaking light
gen.append('<!-- a replaced plate in a different metal --><rect x="%d" y="426" width="34" height="14" fill="#2f3a3a"/><rect x="%d" y="426" width="34" height="14" fill="none" stroke="#56666b" stroke-width=".6" opacity=".7"/>' % (GX + 24, GX + 24) +
           ''.join('<circle cx="%d" cy="%d" r="1" fill="#6b7a7e"/>' % (x, y) for x in (GX + 27, GX + 55) for y in (429, 437)))
SPLIT = [(GX + 70, 318), (GX + 75, 344), (GX + 78, 344), (GX + 73, 318)]
CRACK = [(GX + 71.5, 319), (GX + 72.5, 325), (GX + 74, 331), (GX + 75, 337), (GX + 76.5, 343)]
gen.append('<!-- a split plate leaking light --><polygon points="%s" fill="#050708"/><polyline points="%s" fill="none" stroke="%s" stroke-width=".9" stroke-linejoin="round"/>' % (pts(SPLIT), pts(CRACK), GLOW_MID))
gen.append('<polygon points="%s" fill="%s"/><polyline points="%s" fill="none" stroke="%s" stroke-width=".7"/>' % (
    pts([(GX + 75, 318), (GX + 84, 315), (GX + 79, 326)]), METAL_MID, pts([(GX + 75, 318), (GX + 84, 315)]), METAL_WET))
# the core: a tall incubation vat seen through a barred window, its fluid glowing; pods ripen in it
cx0, cy0 = CORE
VAT = (cx0 - 30, 282, 60, 150)  # x, y, width, height of the glass
rad([(0, '#ffffff', .95), (.25, GLOW_CORE, .9), (.65, GLOW_MID, .75), (1, GLOW_EDGE, .5)], cx=.5, cy=.45, r=.7, id='vatG')
# pipes feeding the vat from both sides of the housing, with flanges
for (x0, x1, y) in ((GX - 100, VAT[0] - 8, VAT[1] + VAT[3] - 34), (VAT[0] + VAT[2] + 8, GX + 92, VAT[1] + 40)):
    gen.append('<rect x="%d" y="%d" width="%d" height="10" fill="#141a1c"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width=".8" opacity=".55"/>' % (x0, y - 5, x1 - x0, x0, y - 5, x1, y - 5, METAL_WET) +
               ''.join('<rect x="%d" y="%d" width="4" height="16" fill="#2a3437"/>' % (xf, y - 8) for xf in (x0 + 4, x1 - 8)))
gen.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#0a0e0f"/>' % (VAT[0] - 12, VAT[1] - 12, VAT[2] + 24, VAT[3] + 24, VAT[2] // 2 + 12))
gen.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="url(#vatG)"/>' % (VAT + (VAT[2] // 2,)))
gen.append('<rect x="%d" y="%d" width="6" height="%d" rx="3" fill="#ffffff" opacity=".2"/>' % (VAT[0] + 9, VAT[1] + 26, VAT[3] - 52))
gen.append('<!-- the fluid surface near the top, a dark air gap above it --><rect x="%d" y="%d" width="%d" height="20" rx="14" fill="#0d1a10" opacity=".7"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#ffffff" stroke-width="1.4" opacity=".7"/>' % (
    VAT[0], VAT[1], VAT[2], VAT[0] + 5, VAT[1] + 20, VAT[0] + VAT[2] - 5, VAT[1] + 20))
gen.append('<rect x="%d" y="%d" width="%d" height="%d" rx="34" fill="none" stroke="#2c3639" stroke-width="6"/><rect x="%d" y="%d" width="%d" height="%d" rx="38" fill="none" stroke="%s" stroke-width=".8" opacity=".5"/>' % (
    VAT[0] - 5, VAT[1] - 5, VAT[2] + 10, VAT[3] + 10, VAT[0] - 9, VAT[1] - 9, VAT[2] + 18, VAT[3] + 18, METAL_WET))
gen.append(''.join('<rect x="%d" y="%d" width="%d" height="9" fill="#1c2427" stroke="#3a4649" stroke-width=".8"/>' % (VAT[0] - 16, y, VAT[2] + 32) for y in (VAT[1] - 16, VAT[1] + VAT[3] + 7)))
VAT_BANDS = ''.join('<rect x="%d" y="%d" width="%d" height="3" fill="#1c2427" stroke="#3a4649" stroke-width=".6"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width=".7" opacity=".6"/>' % (
    VAT[0] - 8, y, VAT[2] + 16, VAT[0] - 8, y, VAT[0] + VAT[2] + 8, y, METAL_WET) for y in (VAT[1] + 58, VAT[1] + 108))
# the feed pipe from the vat's head up into the roof housing
gen.append('<rect x="%d" y="236" width="16" height="%d" fill="#141a1c"/><rect x="%d" y="236" width="16" height="%d" fill="none" stroke="%s" stroke-width=".8" opacity=".5"/>' % (cx0 - 8, VAT[1] - 16 - 236, cx0 - 8, VAT[1] - 16 - 236, METAL_WET) +
           ''.join('<rect x="%d" y="%d" width="22" height="4" fill="#2a3437"/>' % (cx0 - 11, y) for y in (240, 254)))
# the roof housing on top, a banded header tank lying on it and a hopper that feeds the vat
gen.append('<polygon points="%s" fill="url(#plateG)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (pts(TURRET), pts(TURRET[:3]), METAL_WET))
gen.append('<!-- the header tank --><rect x="%d" y="188" width="100" height="28" rx="14" fill="#1a2225"/><line x1="%d" y1="190" x2="%d" y2="190" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (GX - 64, GX - 52, GX + 24, METAL_WET) +
           ''.join('<rect x="%d" y="187" width="5" height="30" fill="#0e1315"/>' % x for x in (GX - 44, GX - 16, GX + 12)) +
           ''.join('<rect x="%d" y="214" width="8" height="4" fill="#2a3437"/>' % x for x in (GX - 50, GX + 22)))
gen.append('<!-- the hopper --><polygon points="%s" fill="#141a1c"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1" opacity=".6"/><rect x="%d" y="208" width="10" height="10" fill="#141a1c"/>' % (
    pts([(GX + 42, 180), (GX + 76, 180), (GX + 64, 208), (GX + 54, 208)]), pts([(GX + 42, 180), (GX + 76, 180)]), METAL_WET, GX + 54))
gen.append(''.join('<circle cx="%d" cy="232" r="1.3" fill="#56666b"/>' % x for x in range(GX - 60, GX + 60, 12)))
land.append('<g transform="%s">%s</g>' % (MT, ''.join(gen)))

MACHINE_SIL = ''.join('<polygon points="%s"/>' % pts(p) for p in (FOUND1, FOUND2, HOUSING, ANNEX, TURRET))

# the sluice at the machine's foot and the chute running down from it into the water behind the shelf
CHUTE0, CHUTE1 = (436, 436), (520, 474)  # the gate, and the chute's lip
OUTFALL = (540, 482)  # where the seeds drop into the flood, carried a little past the lip
_ca = math.atan2(CHUTE1[1] - CHUTE0[1], CHUTE1[0] - CHUTE0[0])
_nx, _ny = -math.sin(_ca), math.cos(_ca)
trough = [(CHUTE0[0] + _nx * 7, CHUTE0[1] + _ny * 7), (CHUTE1[0] + _nx * 7, CHUTE1[1] + _ny * 7), (CHUTE1[0] - _nx * 7, CHUTE1[1] - _ny * 7), (CHUTE0[0] - _nx * 7, CHUTE0[1] - _ny * 7)]
land.append('<!-- the chute\'s legs on the shelf --><line x1="470" y1="452" x2="468" y2="500" stroke="#0b0f10" stroke-width="4"/><line x1="505" y1="468" x2="504" y2="508" stroke="#0b0f10" stroke-width="4"/>'
            '<!-- the chute: a trough of riveted plate, its near wall catching the light --><polygon points="%s" fill="#141a1c"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1" opacity=".6"/>' % (
                pts(trough), f(trough[3][0]), f(trough[3][1]), f(trough[2][0]), f(trough[2][1]), METAL_WET) +
            ''.join('<circle cx="%s" cy="%s" r="1" fill="#56666b"/>' % (f(lerp(trough[3][0], trough[2][0], k / 6)), f(lerp(trough[3][1], trough[2][1], k / 6) - 1.5)) for k in range(1, 6)) +
            '<!-- the sluice gate, with its wheel --><rect x="%d" y="%d" width="24" height="30" fill="#1c2427" stroke="#3a4649" stroke-width="1"/><circle cx="%d" cy="%d" r="7" fill="none" stroke="#3a4649" stroke-width="2"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#3a4649" stroke-width="1.2"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#3a4649" stroke-width="1.2"/>' % (
                CHUTE0[0] - 14, CHUTE0[1] - 22, CHUTE0[0] - 2, CHUTE0[1] - 30, CHUTE0[0] - 9, CHUTE0[1] - 30, CHUTE0[0] + 5, CHUTE0[1] - 30, CHUTE0[0] - 2, CHUTE0[1] - 37, CHUTE0[0] - 2, CHUTE0[1] - 23))

# the first growth: moss and low fronds downwind, denser to the right
growth = []
GROW = []
for _ in range(90):
    x = lerp(620, 1536, rnd.random() ** .7)
    band = rnd.random()
    y = lerp(HZ + 8, 560, band ** 1.2)
    k = (y - HZ) / (560 - HZ)
    dens = (x - 620) / 916
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
    if x < 700 and y < 590:
        continue
    top_ = [(x - rx * .8, y - ry * .7), (x - rx * .2, y - ry), (x + rx * .5, y - ry * .8), (x + rx, y - ry * .1)]
    growth.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" opacity=".9"/>' % (
        pts(top_[:2 + max(0, int((x - 700) / 250))]), mix(GREEN, GREEN_LIT, .25), f(2.2 + ry / 4)))
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

# near rock: the dark wet ledge at bottom left and the rise at bottom right
ledge = [(-20, 600), (120, 596), (260, 612), (420, 606), (600, 622), (760, 616), (900, 636), (960, H + 10), (-20, H + 10)]
rise = [(1090, H + 10), (1110, 610), (1180, 574), (1250, 556), (1340, 548), (1440, 552), (1556, 566), (1556, H + 10)]
lin([(0, '#161e1d', 1), (.3, '#080b0b', 1), (1, '#030404', 1)], 0, 548, 0, H, units=True, id='nearRock')
land.append('<!-- near rock: a dark wet ledge along the bottom left --><polygon points="%s" fill="url(#nearRock)"/><polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.8" opacity=".6"/>' % (pts(ledge), pts(ledge[:8])))
land.append('<!-- near rock: a rise at bottom right carrying young fronds --><polygon points="%s" fill="url(#nearRock)"/><polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.8" opacity=".6"/>' % (pts(rise), pts(rise[1:7])))
land.append('<polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".45"/>' % pts(rise))
moss_near = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".9"/>' % (f(x), f(y), f(rnd.uniform(18, 40)), f(rnd.uniform(4, 7)), mix(GREEN, GREEN_LIT, rnd.uniform(0, .4))) for x, y in [(1200, 572), (1262, 558), (1318, 552), (1380, 551), (1440, 554), (1500, 560), (1290, 562), (1410, 560)])
land.append('<!-- moss on the rise --><g filter="url(#moss)">%s</g>' % moss_near)


# a seed pod: long, pointed, husked in two halves along a seam, with a three-pointed cap at its stem end
POD_L = 'M0 -26 C -2.5 -24, -5.5 -18, -5.5 -12 C -5.5 -5, -3 -.5, 0 .5 Z'
POD_R = 'M0 -26 C 2.5 -24, 5.5 -18, 5.5 -12 C 5.5 -5, 3 -.5, 0 .5 Z'
POD_CAP = ('M-7.4 -17.6 Q -8.2 -26.4 0 -28 Q 8.2 -26.4 7.4 -17.6 L 6.2 -16 L 4.9 -17.6 L 3.7 -16 L 2.4 -17.6 L 1.2 -16 L 0 -17.6 L -1.2 -16 L -2.4 -17.6 L -3.7 -16 L -4.9 -17.6 L -6.2 -16 Z'
           ' M-.5 -27.8 L .3 -31 L 1.3 -30.8 L .8 -27.8 Z')  # an acorn's cup: wider than the pod, its rim notched; the stem stub on top
POD_SCALES = 'M-5.4 -23.6 l 1.4 1.6 M-2.6 -24.8 l 1.4 1.6 M.3 -25.1 l 1.4 1.6 M3.1 -24.4 l 1.4 1.6 M-4.4 -20.4 l 1.4 1.6 M-1.5 -21.2 l 1.4 1.6 M1.4 -21.2 l 1.4 1.6 M4.2 -20.4 l 1.4 1.6'
POD_RIBS = 'M-2.3 -19 Q -3.3 -10 -1.7 -2 M2.8 -18.6 Q 3.6 -9.5 2 -2.4'  # faint ribs along the husk, off center

# ------------------------------------------------------------------ glow layer (animated): the Generator breathing, the chute running, light on rock and water, ripples
glow = []
mglow = []  # glows on the machine, drawn in its frame
CORE_T = 3.0
mglow.append('<!-- the core breathing: an uneven pulse -->'
            '<circle cx="%d" cy="%d" r="72" fill="url(#glowPod)" opacity=".5"><animate attributeName="opacity" values=".45;.8;.6;.95;.5;.45" keyTimes="0;.18;.36;.55;.8;1" dur="%ss" begin="-1.1s" repeatCount="indefinite" %s%s/></circle>' % (CORE[0], CORE[1], f(CORE_T), SPLINE, ease(5)))
glow.append('<!-- the light on the rock and the water breathing with the core -->'
            '<ellipse cx="%d" cy="%d" rx="260" ry="30" fill="url(#glowWash)" opacity=".3"><animate attributeName="opacity" values=".25;.5;.35;.6;.3;.25" keyTimes="0;.18;.36;.55;.8;1" dur="%ss" begin="-1.1s" repeatCount="indefinite" %s%s/></ellipse>' % (GX + 90, GBASE + 12, f(CORE_T), SPLINE, ease(5)))
# the overdrive surge, once a cycle: the core charges, then everything fires at once and settles
from seedsim import fly, aim_speed  # the birth seed's flight off the chute
REL = 1.5  # the release, after the charge
# the birth seed: one heavy husked seed that comes down the chute in the surge and is flung off its side onto the shelf
BIRTH_SPOT = (532, 497)  # its centre at rest, clear of the foundation; it sits on the lit rock at y 509
_bv, _be = (500, 465), 35  # it jumps the chute's wall two thirds of the way down
_pre = [(0.0, CHUTE0[0], CHUTE0[1] - 4, 0.0), (.4, 462, 444, 0.0), (.7, 489, 458, 0.0), (.95, 500, 465, 0.0)]  # it gathers speed, then slows against the wall
_ba = math.radians(_be)
_bs = aim_speed(_bv, _be, BIRTH_SPOT[0], BIRTH_SPOT[1], 30, .7, lo=2, hi=400, drag=.6)
BIRTH_PATH = _pre + [(t + _pre[-1][0], x, y, a) for t, x, y, a in fly('nut', _bv, (_bs * math.cos(_ba), -_bs * math.sin(_ba)), lambda x: BIRTH_SPOT[1], 30, .7, step=.1, drag=.6)]
BIRTH_D = BIRTH_PATH[-1][0]
# it thuds down, bounces once and settles upright
_lx, _ly = BIRTH_PATH[-1][1], BIRTH_PATH[-1][2]
BIRTH_PATH += [(BIRTH_D + .06, _lx + .8, _ly - 3.8, 0), (BIRTH_D + .12, _lx + 1.5, _ly - 5, 0), (BIRTH_D + .18, _lx + 2, _ly - 3.8, 0), (BIRTH_D + .25, _lx + 2.5, _ly, 0), (BIRTH_D + .3, _lx + 2.8, _ly - 1.2, 0), (BIRTH_D + .34, _lx + 3, _ly - 1.5, 0), (BIRTH_D + .39, _lx + 3, _ly - 1.1, 0), (BIRTH_D + .45, _lx + 3, _ly, 0)]
BIRTH_SPOT = (_lx + 3, _ly)
BIRTH_D += .45
B0 = REL + .05 + BIRTH_D  # its landing, in seconds after the surge's onset
S = (-(B0 + 3.9)) % T  # the surge's onset, chosen so t=0 finds the newborn beside its open husk
BIRTH_LAND = S + B0
SURGE_T = (1.0, 1.35, REL, 2.6, 4.0)
SURGE_V = (0, .22, .4, 1, .35, 0, 0)
FIRE_V = (0, 0, 0, 1, .3, 0, 0)  # the gate bursts open only on the release


def surge(vals, scale=1.0):
    return '<animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        ';'.join(f(v * scale) for v in vals), kt(T, *SURGE_T), f(T), onset_begin(T, S))


defs.append('<mask id="machineOut" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/><g fill="#222" transform="%s">%s</g></mask>' % (W, H, W, H, MT, MACHINE_SIL))
# pods ripening in the vat: dark husks rising slowly through the glowing fluid, with bubbles
defs.append('<clipPath id="vatClip" clipPathUnits="userSpaceOnUse"><rect x="%d" y="%d" width="%d" height="%d" rx="%d"/></clipPath>' % (VAT + (VAT[2] // 2,)))
vat_ = []
for i, (dx, y_, per, ph) in enumerate(((-15, 330, 6, 0), (10, 356, 8, 2.1), (-4, 392, 6, 4.2), (14, 408, 12, 1.3), (-14, 418, 8, 5.5))):
    vat_.append('<g transform="translate(%s %d)"><g><animateTransform attributeName="transform" type="translate" values="0 -3;0 3;0 -3" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/>'
                '<g transform="rotate(%d) scale(.42) translate(0 13)" opacity=".8"><path d="%s" fill="#7fae45"/><path d="%s" fill="#7fae45"/><path d="%s" fill="#b5d77a"/></g></g></g>' % (
                    f(cx0 + dx), y_, f(per), f(ph), SPLINE, ease(2), (-18, 12, -6, 20, -14)[i], POD_L, POD_R, POD_CAP))
for i, (dx, per, ph) in enumerate(((-2, 8.0, 0), (6, 8.0, 4.0))):
    vat_.append('<g opacity="0"><animateTransform attributeName="transform" type="translate" values="%s %d;%s %d" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="opacity" values="0;.85;.85;0" keyTimes="0;.15;.8;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<g transform="scale(.42) translate(0 13)"><path d="%s" fill="#7fae45"/><path d="%s" fill="#7fae45"/><path d="%s" fill="#b5d77a"/></g></g>' % (
                    f(cx0 + dx), VAT[1] + VAT[3] + 14, f(cx0 + dx), VAT[1] + 28, f(per), onset_begin(per, ph), f(per), onset_begin(per, ph), POD_L, POD_R, POD_CAP))
for i in range(7):
    per = [2.0, 3.0, 4.0][i % 3]
    x_ = cx0 - 22 + i * 7
    vat_.append('<circle cx="%d" cy="0" r="%s" fill="#ffffff" opacity=".5"><animateTransform attributeName="transform" type="translate" values="0 %d;0 %d" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>' % (
        x_, f(1 + (i % 3) * .5), VAT[1] + VAT[3] + 4, VAT[1] + 18, f(per), f(i * .37)))
vat_.append(VAT_BANDS)  # the clamp bands over the glass
mglow.append('<!-- pods ripening in the vat, and bubbles rising --><g clip-path="url(#vatClip)">%s</g>%s' % (''.join(vat_[:-1]), vat_[-1]))
glow.append('<!-- the surge: the cloud base over the machine lit from below --><ellipse cx="%d" cy="210" rx="520" ry="100" fill="url(#glowWash)" opacity="0" mask="url(#machineOut)">%s</ellipse>' % (GX + 80, surge(SURGE_V, .9)))
glow.append('<!-- the surge: the light flooding the shelf --><ellipse cx="%d" cy="%d" rx="340" ry="48" fill="url(#glowWash)" opacity="0">%s</ellipse>' % (GX + 90, GBASE + 10, surge(SURGE_V, .85)))
glow.append('<!-- the surge: the core flaring --><circle cx="%s" cy="%s" r="165" fill="url(#glowPod)" opacity="0" mask="url(#machineOut)">%s</circle>' % (f(GS(*CORE)[0]), f(GS(*CORE)[1]), surge(SURGE_V, .8)))
mglow.append('<rect x="%d" y="%d" width="%d" height="%d" rx="12" fill="#ffffff" opacity="0" filter="url(#soft2)">%s</rect>' % (VAT[0] + 4, VAT[1] + 6, VAT[2] - 8, VAT[3] - 12, surge(SURGE_V, .8)))
seams_ = ''.join('<line x1="%d" y1="%s" x2="%d" y2="%s"/>' % (GX - 90, f(y + .6), GX + 82, f(y + .6)) for y, _fr in SEAMS)
mglow.append('<!-- the surge: every seam blazing --><g stroke="%s" stroke-width="2" filter="url(#glow)" opacity="0">%s%s</g>' % (GLOW_CORE, surge(SURGE_V), seams_))
# glowing fluid running down the chute, the lit water where it spills into the flood, and the gate in the surge
glow.append('<!-- glowing fluid running down the chute, a brighter ripple sliding down it --><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="3.5" opacity=".45"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2" opacity=".7" stroke-dasharray="12 34" stroke-linecap="round"><animate attributeName="stroke-dashoffset" values="46;0" dur=".75s" repeatCount="indefinite"/></line>' % (
    f(CHUTE0[0]), f(CHUTE0[1] - 1), f(CHUTE1[0]), f(CHUTE1[1] - 1), GLOW_MID, f(CHUTE0[0]), f(CHUTE0[1] - 1), f(CHUTE1[0]), f(CHUTE1[1] - 1), GLOW_CORE))
glow.append('<!-- the lit water spreading from the outfall --><ellipse cx="%d" cy="%d" rx="72" ry="11" fill="url(#glowWash)" opacity=".7"><animate attributeName="opacity" values=".6;.9;.65;.6" keyTimes="0;.35;.7;1" dur="3s" repeatCount="indefinite" %s%s/></ellipse>' % (OUTFALL[0] + 30, OUTFALL[1] + 2, SPLINE, ease(3)))
glow.append('<!-- the surge: the gate bursting open --><ellipse cx="%d" cy="%d" rx="34" ry="26" fill="url(#glowPod)" opacity="0">%s</ellipse><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="5" opacity="0" filter="url(#glow)">%s</line>' % (
    CHUTE0[0], CHUTE0[1] - 8, surge(FIRE_V), f(CHUTE0[0]), f(CHUTE0[1] - 1), f(CHUTE1[0]), f(CHUTE1[1] - 1), GLOW_CORE, surge(FIRE_V, .3)))
# the split plate leaking light, flickering unevenly
mglow.append('<!-- the split plate leaking light, flickering -->'
            '<g opacity=".4"><animate attributeName="opacity" values=".35;.85;.4;.95;.3;.7;.35" keyTimes="0;.1;.18;.4;.55;.8;1" dur="4s" begin="-1.3s" repeatCount="indefinite"/>'
            '<ellipse cx="%s" cy="%s" rx="12" ry="7" fill="url(#glowPod)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.1" stroke-linejoin="round" filter="url(#glow)"/></g>' % (
                f(CRACK[-1][0]), f(CRACK[-1][1] + 5), pts(CRACK), GLOW_CORE))
mglow.append('<!-- the split blazing in the surge --><ellipse cx="%s" cy="%s" rx="26" ry="18" fill="url(#glowPod)" opacity="0">%s</ellipse>' % (f(CRACK[2][0]), f(CRACK[2][1]), surge(SURGE_V)))
# the instrument lamps blinking in turn, and the gauge needle trembling
for i in range(3):
    mglow.append('<circle cx="%d" cy="446" r="2.2" fill="%s" opacity=".15"><animate attributeName="opacity" values=".15;1;.15;.15" keyTimes="%s" dur="3s" begin="%s" repeatCount="indefinite"/></circle>' % (
        GX - 156 + 10 * i, GLOW_CORE, kt(3, .08, .45), onset_begin(3, .5 * i)))
mglow.append('<!-- the gauge needle trembling, pinned high in the surge --><line x1="%d" y1="360" x2="%d" y2="353" stroke="#e8f0d8" stroke-width="1.2" stroke-linecap="round">'
            '<animateTransform attributeName="transform" type="rotate" values="-8 %d 360;6 %d 360;-4 %d 360;10 %d 360;-8 %d 360" keyTimes="0;.2;.45;.7;1" dur="3s" begin="-.7s" repeatCount="indefinite" %s%s/></line>' % (
                GX - 134, GX - 138, GX - 134, GX - 134, GX - 134, GX - 134, GX - 134, SPLINE, ease(4)))
mglow.append('<!-- the gantry beacon --><circle cx="%d" cy="%d" r="2.4" fill="%s" opacity=".2"><animate attributeName="opacity" values=".2;1;.2;.2" keyTimes="%s" dur="2s" begin="-.3s" repeatCount="indefinite"/></circle>' % (
    (GR0 + GR1) // 2, GTOP - 12, GLOW_CORE, kt(2, .06, .3)))
mglow.append('<circle cx="%d" cy="%d" r="9" fill="url(#glowPod)" opacity=".2"><animate attributeName="opacity" values=".2;.8;.2;.2" keyTimes="%s" dur="2s" begin="-.3s" repeatCount="indefinite"/></circle>' % (
    (GR0 + GR1) // 2, GTOP - 12, kt(2, .06, .3)))
# steam from the relief valve: puffs rise, swell and drift downwind, fading; each fades before it repeats
for i in range(3):
    per, ph = 3.0, i * 1.0
    mglow.append('<!-- steam from the relief valve --><ellipse cx="%d" cy="296" rx="7" ry="5" fill="#8a989c" opacity="0" filter="url(#soft2)">'
                '<animateTransform attributeName="transform" type="translate" values="0 0;26 -34;64 -64" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="rx" values="6;14;26" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="ry" values="4;9;15" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="opacity" values="0;.42;.2;0" keyTimes="0;.12;.6;1" dur="%ss" begin="%s" repeatCount="indefinite"/></ellipse>' % (
                    GX - 150, f(per), onset_begin(per, ph), f(per), onset_begin(per, ph), f(per), onset_begin(per, ph), f(per), onset_begin(per, ph)))

# the reflection shimmers as rain breaks the water
glow.append('<!-- the reflection shimmering in the rain --><ellipse cx="%d" cy="598" rx="46" ry="30" fill="url(#glowWash)" opacity=".4" filter="url(#soft6)"><animate attributeName="opacity" values=".4;.75;.5;.7;.4" keyTimes="0;.25;.5;.75;1" dur="2s" begin="-.4s" repeatCount="indefinite" %s%s/><animate attributeName="rx" values="42;52;44;50;42" keyTimes="0;.3;.5;.8;1" dur="2s" begin="-.4s" repeatCount="indefinite" %s%s/></ellipse>' % (760, SPLINE, ease(4), SPLINE, ease(4)))
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


# rain rings on the floodwater, including the lit water in front of the shelf
rings = []
rrnd = random.Random(31)
n_ = 0
while n_ < 44:
    x, y = rrnd.uniform(20, W - 20), rrnd.uniform(404, 640)
    on_shelf = x < 720 and y > shelf_top(x) - 4
    on_ledge = x < 910 and y > 604
    on_rise = x > 1110 and y > 546
    on_root = any(abs(y - ry_) < rw_ + 3 and abs(x - rx_) < 8 for sp in ROOT_SPINES for rx_, ry_, rw_ in sp)
    if on_shelf or on_ledge or on_rise or on_root:
        continue
    n_ += 1
    k = (y - HZ) / (H - HZ)
    per = rrnd.choice([1.5, 2, 3])
    ph = rrnd.uniform(0, per)
    r1 = lerp(4, 16, k)
    lit = 700 < x < 860 and y > 574
    rings.append('<ellipse cx="%s" cy="%s" rx="1" ry=".3" fill="none" stroke="%s" stroke-width="%s" opacity="0">'
                 '<animate attributeName="rx" values="1;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="ry" values=".3;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="opacity" values="0;.7;0;0" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                     f(x), f(y), GLOW_MID if lit else '#9fb2b8', f(lerp(1.4, 2, k)), f(r1), f(r1), f(.8 / per), f(per), f(ph),
                     f(r1 * .3), f(r1 * .3), f(.8 / per), f(per), f(ph), f(.06 / per), f(.8 / per), f(per), f(ph)))
for i in range(400):
    if len(cur_pos) >= 16:
        break
    x, y = crnd.uniform(890, 1500), crnd.uniform(474, 566)
    ln = crnd.uniform(50, 110)
    per = crnd.choice([3, 4, 6])
    x2 = x + ln + 22 * per
    if (x > 1110 and y > 546) or any(abs(y - ry_) < rw_ + 4 and x - 6 < rx_ < x2 + 6 for sp in ROOT_SPINES for rx_, ry_, rw_ in sp):
        continue  # nor across the near rise or a root
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
# the World Tree's own seed pods glowing among its leaves: the Generator's green, carried to it
trnd_ = random.Random(83)
for i in range(12):
    x_ = trnd_.uniform(TX - 440, W - 20)
    y_ = 186 + 20 * math.sin(x_ / 90) + trnd_.uniform(-6, 12) - max(0, (TX - 300 - x_)) * .12
    per = [6, 8, 12][i % 3]
    glow.append('<circle cx="%s" cy="%s" r="6" fill="url(#glowPod)" opacity=".3"><animate attributeName="opacity" values=".15;.6;.25;.15" keyTimes="0;.4;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/></circle><circle cx="%s" cy="%s" r="1.4" fill="%s" opacity=".8"/>' % (
        f(x_), f(y_), per, f(trnd_.uniform(0, per)), SPLINE, ease(3), f(x_), f(y_ + 1), GLOW_MID))
glow.append('<!-- the same strike lighting the cloud base over the World Tree from within -->'
            '<ellipse cx="%s" cy="178" rx="440" ry="54" fill="url(#flashBack)" opacity="0"><animate attributeName="opacity" values="0;.5;.08;.4;0;0" keyTimes="%s" dur="24s" begin="%s" repeatCount="indefinite"/></ellipse>' % (
                f(TX), kt(24, .04, .1, .16, .45), onset_begin(24, 15.3)))

SWIM = 30.0  # a larva's swimming speed
# the newborn's way out, planned before the pods so none rides across it: out of the husk, down the
# shelf to the water's edge, then a swim downstream until it dives (times after the surge's onset)
hx, hy = BIRTH_SPOT[0], BIRTH_SPOT[1] + 12
NB_LAND = [(hx, hy - 2), (hx + 24, hy + 1), (575, 516), (625, 534), (662, 556), (688, 571)]
NB_SWIM = [(688, 571), (760, 573), (840, 575), (900, 576)]
APPEAR, EMERGE = B0 + 1.4, B0 + 2.4
CRAWL0 = B0 + 4.6  # it looks about beside the husk, then sets off
CRAWL_V = 40.0
NB_SWIM_V = 40.0


def _plen(p):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(p, p[1:]))


ENTRY = CRAWL0 + _plen(NB_LAND) / CRAWL_V
DIVE = ENTRY + _plen(NB_SWIM) / NB_SWIM_V
GONE = DIVE + .6
WATER_Y = 571.5  # the water line it swims along
NEWBORN_WATER = [(650, 940, 573, S + ENTRY - .6, S + GONE + .6)]
NB_TRACK = [(CRAWL0, NB_LAND[0])]
for a_, b_ in zip(NB_LAND + NB_SWIM[1:], (NB_LAND + NB_SWIM[1:])[1:]):
    NB_TRACK.append((NB_TRACK[-1][0] + math.hypot(b_[0] - a_[0], b_[1] - a_[1]) / (CRAWL_V if NB_TRACK[-1][0] < ENTRY - 1e-6 else NB_SWIM_V), b_))
NB_TRACK.append((GONE, (NB_SWIM[-1][0] + NB_SWIM_V * (GONE - DIVE), NB_SWIM[-1][1] + .3)))


HUSK_L = 'M0 -24 C -5 -24, -8.5 -19, -8.5 -12 C -8.5 -5, -7 .5, -3 .5 L 0 .5 Z'
HUSK_R = 'M0 -24 C 5 -24, 8.5 -19, 8.5 -12 C 8.5 -5, 7 .5, 3 .5 L 0 .5 Z'
HUSK_CAP = 'M-10 -19.6 Q -10.6 -26.6 0 -28.2 Q 10.6 -26.6 10 -19.6 L 8.4 -18.2 L 6.8 -19.6 L 5 -18.2 L 3.4 -19.6 L 1.6 -18.2 L 0 -19.6 L -1.6 -18.2 L -3.4 -19.6 L -5 -18.2 L -6.8 -19.6 L -8.4 -18.2 Z M-.7 -28 L .5 -31.8 L 1.7 -31.6 L 1.1 -28 Z'
HUSK = ('<circle cy="-12" r="22" fill="url(#glowPod)" opacity=".75"/><path d="%s" fill="#4d4526"/><path d="%s" fill="#4d4526" stroke="#4d4526" stroke-width=".6"/><path d="%s%s" fill="none" stroke="#8a7a44" stroke-width=".8"/>'
        '<path d="%s" fill="#5b7436" stroke="#8fb050" stroke-width=".7"/>' % (HUSK_L, HUSK_R, HUSK_L.replace(' Z', ''), HUSK_R.replace(' Z', ''), HUSK_CAP))
POD_ART = ('<circle cy="-12" r="20" fill="url(#glowPod)" opacity=".65"/><path d="%s" fill="#35501b"/><path d="%s" fill="#35501b" stroke="#35501b" stroke-width=".6"/><path d="%s%s" fill="none" stroke="#6e9636" stroke-width=".8"/>'
           '<path d="%s" fill="#5b7436" stroke="#8fb050" stroke-width=".6"/><path d="%s" stroke="#34481c" stroke-width=".7"/>' % (
               POD_L, POD_R, POD_L.replace(' Z', ''), POD_R.replace('M0 -26', ' M0 -26').replace(' Z', ''), POD_CAP, POD_SCALES))


def larva_art(wag, body_anim=''):
    # a tadpole-like larva facing right: a round head with a glowing eye and one long tapering tail
    # that sweeps side to side, green like everything the Generator makes
    return ('<circle r="12" fill="url(#glowPod)" opacity=".5"/>'
            '<g>%s<path d="M-5 -3.6 C -12 -3, -19 -1.4, -26 0 C -19 1.4, -12 3, -5 3.6 Z" fill="#4a7a32"/><path d="M-6 -.2 L -23 0" stroke="#8fbf52" stroke-width=".6" opacity=".7"/></g>' % wag +
            '<g>%s<ellipse cx="0" cy="0" rx="7.6" ry="6.4" fill="#3f6f2e"/><ellipse cx="1" cy="2.4" rx="4.4" ry="2.4" fill="#6f9a44" opacity=".6"/>' % body_anim +
            '<circle cx="4" cy="-1.6" r="2.1" fill="%s"/></g>' % GLOW_CORE)


HATCH_DRIFT = 22 * .3  # a hatchling drifts with its husk before it swims


def hatch_pos(hp, t):
    # where a hatchling is at t: drifting with its split husk, then swimming off, then diving
    x0, y0, th = hp
    u = (t - th) % T
    if u > 2.8:
        return None
    cur = current(y0)
    v = cur + 15  # it swims a little faster than the water
    x1 = x0 + cur * .3 + v * 2.2
    if u < .3:
        return x0 + cur * u, y0 - 2
    if u < 2.5:
        return lerp(x0 + cur * .3, x1, (u - .3) / 2.2), lerp(y0 - 2, y0 + 1, (u - .3) / 2.2)
    return x1 + v * (u - 2.5), y0 + 1


def nb_pos(t):
    # where the newborn larva is at t, from its rise out of the husk to its dive
    u = (t - S) % T
    if not (APPEAR <= u <= GONE):
        return None
    if u < CRAWL0:
        return hx, hy - 14
    for (t0, p0), (t1, p1) in zip(NB_TRACK, NB_TRACK[1:]):
        if t0 <= u <= t1:
            r = (u - t0) / max(1e-6, t1 - t0)
            return lerp(p0[0], p1[0], r), lerp(p0[1], p1[1], r) - 3
    return NB_TRACK[-1][1][0], NB_TRACK[-1][1][1] - 3


def depth_k(y):
    # 0 at the horizon, 1 at the bottom of the frame
    return min(1.0, max(0.0, (y - HZ) / (H - HZ)))


def seed_scale(y):
    return lerp(.3, 1.25, depth_k(y))


def current(y):
    # the flood's speed on screen: it runs left to right, slower the farther off it is
    return lerp(26, 62, depth_k(y))  # a flood in full spate


def on_slab(x, y, pad=0):
    for (sx, sy, rx, ry) in SLABS:
        if abs(x - sx) < rx + pad and sy - ry - pad < y < sy + ry * .4 + pad:
            return (sx, sy, rx, ry)
    return None


def drift(rr):
    """One seed's voyage from the outfall: it leaves the chute's foot fanning out on its own heading,
    eases into the current, wanders a little, parts around the slabs, and meets one of four ends.
    Returns the samples [(t, x, y)], its end ('hatch', 'sink', 'far', 'catch') and where."""
    x, y = OUTFALL[0] + rr.uniform(-6, 8), OUTFALL[1] + rr.uniform(-3, 3)
    heading = math.radians(rr.uniform(-38, 52))  # up is away from the viewer, down is toward
    sp = rr.uniform(40, 64)
    hvx, hvy = sp * math.cos(heading), .45 * sp * math.sin(heading)  # its own heading; the current turns it downstream quickly
    lip = 2 * math.hypot(CHUTE1[0] - CHUTE0[0], CHUTE1[1] - CHUTE0[1]) / SLIDE * .5  # it comes off the lip fast, and the water brakes it
    ca = math.atan2(CHUTE1[1] - CHUTE0[1], CHUTE1[0] - CHUTE0[0])
    vx, vy = lip * math.cos(ca), lip * math.sin(ca)
    per, ph = rr.uniform(3, 6), rr.uniform(0, 6.3)
    fate = rr.choices(('hatch', 'sink', 'far'), (.5, .15, .35))[0]
    life = {'hatch': rr.uniform(4, 11), 'sink': rr.uniform(3, 9), 'far': rr.uniform(10, 18)}[fate]
    if fate == 'far':
        vy = -rr.uniform(10, 18)  # carried off downstream and away toward the horizon
    t, out, dt = 0.0, [(0.0, x, y)], .05
    catch_ok = rr.random() < .6
    while t < life:
        u = current(y)
        if t < .6:
            vx += (hvx - vx) * dt / .1  # braked from the lip's speed to its own heading
            vy += (hvy - vy) * dt / .1
        vx += (u - vx) * .5 * dt
        vy += (-vy) * (.25 if fate == 'far' else .45) * dt
        wob = 3.2 * math.cos(2 * math.pi * t / per + ph) * (2 * math.pi / per) * seed_scale(y)  # a slow wander across the current
        x += vx * dt
        y += (vy + wob) * dt
        t += dt
        if x < 718 and y > shelf_top(x) - 9:
            y, vy = shelf_top(x) - 9, min(vy, 0)  # it cannot ride up onto the shelf
        if (x > 1110 and y > 540) or y > 600:
            fate = 'sink'  # it fetches up against the near rise and goes under
            break
        sl = on_slab(x, y, pad=6)
        if sl:
            if catch_ok and fate != 'far' and x < sl[0] - sl[2] * .55:
                fate = 'catch'  # caught on the slab's upstream end: it stops, and washes up onto the rock
                out.append((t, x, y))
                t += .3
                x, y = sl[0] - sl[2] + 8, sl[1] - sl[3] * .75
                out.append((t, x, y))
                break
            y += (4 if y > sl[1] - sl[3] * .3 else -4) * 1.0  # it parts around the rock
        if fate == 'far' and y < 418:
            break  # lost to sight toward the island
        if round(t / dt) % 5 == 0:
            out.append((t, x, y))
    if out[-1][0] < t - 1e-6:
        out.append((t, x, y))
    if fate == 'hatch' and y < 440:
        fate = 'far'  # too far off to see a larva: it simply goes on out of sight
    return out, fate


# ------------------------------------------------------------------ seeds layer (animated): seeds let down the chute into the flood and carried off on its current
# The machine lets its seeds out through a sluice at its foot, down a chute into the water behind the
# shelf, and the flood that was meant to wash its mistakes away takes them. From the outfall each fans
# out on its own heading, eases into the current (left to right, slower with distance), wanders a
# little, and parts around the slabs. Each meets its own end: most split and let a larva out; some
# sink; some catch on a slab and sprout; some are carried off toward the World Tree's island. The
# current is integrated for every seed and played back as computed, and every seed is placed so its
# whole voyage keeps clear of the others and of every larva.
pods = []
SEED = .5  # a seed on the water is the pod at half size, and smaller with distance
_er = random.Random(7)
EMIT = [.4 + .55 * i + _er.uniform(-.2, .2) for i in range(43)]  # one down the chute about every half second; a voyage that cannot keep clear is not made
FLUSH = [S + REL + .35 + .22 * i for i in range(10)]  # the surge: the gates burst open and a rush of seeds goes down together
EMIT = [o for o in EMIT if not (S + REL - .9 < o < FLUSH[-1] + 1.2)] + FLUSH
SLIDE = 1.2  # down the chute, gathering speed from rest (about 150 u/s at the lip)
DROP = .15  # off its lip into the water


def build_seeds(seed=41, quick=False):
    rr = random.Random(seed)
    out, sim, lodged, hatch, sprout_sim = [], [], [], [], []

    def track(o, samples, fate):
        # the whole path from the gate: down the chute, off the lip, then the voyage
        # it starts from rest at the gate and gathers speed down the chute
        slide = [(k / 10 * SLIDE, (k / 10) ** 2) for k in range(11)]  # uniform acceleration down the chute
        ts = [t for t, _q in slide] + [SLIDE + DROP] + [SLIDE + DROP + t for t, _x, _y in samples[1:]]
        xs = [lerp(CHUTE0[0], CHUTE1[0], q) for _t, q in slide] + [samples[0][1]] + [x for _t, x, _y in samples[1:]]
        ys = [lerp(CHUTE0[1], CHUTE1[1], q) - 4 for _t, q in slide] + [samples[0][2]] + [y for _t, _x, y in samples[1:]]
        return ts, xs, ys

    def at_(rec, t):
        o, ts, xs, ys, end, fate = rec
        u = (t - o) % T
        if not (0 <= u <= end):
            return None
        j = min(max(bisect.bisect_right(ts, u), 1), len(ts) - 1)
        r = (u - ts[j - 1]) / ((ts[j] - ts[j - 1]) or 1)
        y = ys[j - 1] + (ys[j] - ys[j - 1]) * r
        return xs[j - 1] + (xs[j] - xs[j - 1]) * r, y, u, SEED * seed_scale(y)

    def clear(rec):
        o, ts, xs, ys, end, fate = rec
        for n in range(int((SLIDE + DROP) / .05), int(end / .05) + 1):
            t = o + n * .05
            a = at_(rec, t)
            if not a:
                continue
            for other in sim:
                b_ = at_(other, t)
                if b_ and b_[2] > SLIDE + DROP and math.hypot(a[0] - b_[0], a[1] - b_[1]) < 1.15 * max(7, 18 * (a[3] + b_[3])):
                    return False
            for hp in hatch:
                q = hatch_pos(hp, t)
                if q and math.hypot(a[0] - q[0], a[1] - q[1]) < 12 + 20 * a[3]:
                    return False
            q = nb_pos(t)
            if q and math.hypot(a[0] - q[0], a[1] - q[1]) < 20 + 20 * a[3]:
                return False
            for (sx, sy, land, own) in sprout_sim:
                if .3 <= (t - land) % T <= 12.5:
                    sc_ = lerp(.84, 1.4, (sy - HZ) / (H - HZ))
                    if math.hypot(a[0] - sx, a[1] - (sy - 16 * sc_)) < 1.15 * (16 * sc_ + 6):
                        return False
        if fate == 'catch':
            sx, sy = xs[-1], ys[-1] + 1
            sc_ = lerp(.84, 1.4, (sy - HZ) / (H - HZ))
            for n in range(6, 251):
                t = o + ts[-1] + n * .05
                for other in sim:
                    b_ = at_(other, t)
                    if b_ and math.hypot(b_[0] - sx, b_[1] - (sy - 16 * sc_)) < 1.15 * (16 * sc_ + 6):
                        return False
                for hp in hatch:
                    q = hatch_pos(hp, t)
                    if q and math.hypot(q[0] - sx, q[1] - (sy - 16 * sc_)) < 16 * sc_ + 10:
                        return False
        if fate == 'hatch':
            hp = (xs[-1], ys[-1], o + ts[-1])
            for n in range(0, 57):
                t = hp[2] + n * .05
                q = hatch_pos(hp, t)
                for other in sim:
                    b_ = at_(other, t)
                    if q and b_ and math.hypot(b_[0] - q[0], b_[1] - q[1]) < 12 + 20 * b_[3]:
                        return False
        return True

    def emit(o, samples, fate):
        ts, xs, ys = track(o, samples, fate)
        D = ts[-1]  # when it meets its end
        end = D + {'hatch': 1.4, 'sink': .8, 'far': .6, 'catch': .7}[fate]
        # it floats lying on its side, turning slowly as the water turns it
        tilt = -rr.uniform(66, 80)  # it keeps the lean it had on the chute
        yaw_p = rr.uniform(4, 8)
        chute_ang = math.degrees(math.atan2(CHUTE1[1] - CHUTE0[1], CHUTE1[0] - CHUTE0[0])) - 90
        angs = [chute_ang] * 11 + [lerp(chute_ang, tilt, .5)] + [tilt + 12 * math.sin(2 * math.pi * t / yaw_p) * min(1, t / 1.5) for t in ts[12:]]
        scs = [seed_scale(y) for y in ys]
        # after its end: a hatching seed holds while it splits; a sinking one tips and goes under; a far one
        # fades as it goes; a caught one settles against the rock
        ts.append(end)
        xs.append(xs[-1] + current(ys[-1]) * (end - D) * {'hatch': 1, 'far': 1, 'sink': .7, 'catch': 0}[fate])
        ys.append(ys[-1] + (3 * scs[-1] if fate == 'sink' else 0))
        angs.append(angs[-1] + (20 if fate == 'sink' else 0))
        scs.append(scs[-1] * (.5 if fate == 'sink' else 1))
        rec = (o, ts, xs, ys, end, fate)
        return rec, angs, scs

    def draw(rec, angs, scs):
        o, ts, xs, ys, end, fate = rec
        D = ts[-2]
        b = onset_begin(T, o)
        kts = ';'.join(('%.5f' % (t / T)).rstrip('0').rstrip('.') for t in ts + [T])
        if fate == 'hatch':
            halves = ('<path d="M0 -26 L 0 .5" stroke="#35501b" stroke-width="1.4"><animate attributeName="opacity" values="1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/></path>' % (kt(T, D - .6, D - .5), f(T), b))
            for side, path_ in ((-1, POD_L), (1, POD_R)):
                halves += '<g><animateTransform attributeName="transform" type="rotate" values="0 0 0;0 0 0;%d 0 0;%d 0 0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/><path d="%s" fill="#35501b" stroke="#6e9636" stroke-width=".8" stroke-opacity="0"><animate attributeName="stroke-opacity" values="0;0;1;1" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/></path></g>' % (
                    side * 60, side * 60, kt(T, D, D + .4), f(T), b, path_, kt(T, D, D + .1), f(T), b)
            halves += '<path d="%s%s" fill="none" stroke="#6e9636" stroke-width=".8"><animate attributeName="opacity" values="1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/></path>' % (
                POD_L.replace(' Z', ''), POD_R.replace(' Z', ''), kt(T, D, D + .1), f(T), b)
            seam = '<path d="M0 -20 L 0 0" stroke="%s" stroke-width=".9" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/></path>' % (GLOW_CORE, kt(T, D - .5, D, D + .2), f(T), b)
            cap = '<path d="%s" fill="#5b7436" stroke="#8fb050" stroke-width=".6"><animate attributeName="opacity" values="1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/></path>' % (POD_CAP, kt(T, D, D + .25), f(T), b)
            body = '<circle cy="-12" r="20" fill="url(#glowPod)" opacity=".65"/>' + halves + seam + cap
        else:
            body = POD_ART
        fade = {'hatch': (.05, D + .9, end), 'sink': (.05, D + .1, end), 'far': (.05, D - 1.5, end), 'catch': (.05, D + .3, end)}[fate]
        label = {'hatch': 'splitting on the water to let a larva out', 'sink': 'going under', 'far': 'carried off toward the island', 'catch': 'caught on a slab, where it sprouts'}[fate]
        out.append('<!-- a seed down the chute and out on the flood, %s -->' % label +
                   '<g opacity="0"><animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                       ';'.join('%s,%s' % (f(x), f(y)) for x, y in zip(xs + [xs[-1]], ys + [ys[-1]])), kts, f(T), b) +
                   '<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, *fade), f(T), b) +
                   '<g><animateTransform attributeName="transform" type="scale" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(v) for v in scs + [scs[-1]]), kts, f(T), b) +
                   '<g><animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(a) for a in angs + [angs[-1]]), kts, f(T), b) +
                   '<g transform="scale(%s) translate(0 13)"><circle cy="-12" r="30" fill="url(#glowPod)" opacity=".5"/>%s</g></g></g></g>' % (f(SEED), body))
        # its splash as it drops off the lip, and a ring where it goes under
        out.append('<ellipse cx="%s" cy="%s" rx="1" ry=".4" fill="none" stroke="#b8c8cc" stroke-width="1.2" opacity="0">%s%s%s</ellipse>' % (
            f(OUTFALL[0]), f(OUTFALL[1] + 2), at_on((1, 1, 2, 11, 11), (SLIDE + DROP, SLIDE + DROP + .05, SLIDE + DROP + .8), o, 'rx'),
            at_on((.4, .4, .6, 2.6, 2.6), (SLIDE + DROP, SLIDE + DROP + .05, SLIDE + DROP + .8), o, 'ry'), at_on((0, 0, .6, 0, 0), (SLIDE + DROP, SLIDE + DROP + .05, SLIDE + DROP + .8), o)))
        if fate == 'sink':
            sc_ = scs[-2]
            out.append('<ellipse cx="%s" cy="%s" rx="1" ry=".4" fill="none" stroke="#b8c8cc" stroke-width="1.1" opacity="0">%s%s%s</ellipse>' % (
                f(xs[-1]), f(ys[-1] + 1), at_on((1, 1, 2, 12 * sc_, 12 * sc_), (D + .3, D + .35, D + 1.1), o, 'rx'),
                at_on((.4, .4, .6, 3 * sc_, 3 * sc_), (D + .3, D + .35, D + 1.1), o, 'ry'), at_on((0, 0, .5, 0, 0), (D + .3, D + .35, D + 1.1), o)))

    # the birth seed goes first, then every other seed, each drawn again until its voyage keeps clear
    o = S + REL + .05
    ts = [t for t, *_ in BIRTH_PATH] + [T]
    xs = [x for _, x, _y, _a in BIRTH_PATH] + [BIRTH_PATH[-1][1]]
    ys = [y for _, _x, y, _a in BIRTH_PATH] + [BIRTH_PATH[-1][2]]
    angs = []
    for k, (t, x, y, _a) in enumerate(BIRTH_PATH):
        (ta, xa, ya, _), (tb, xb, yb, _) = BIRTH_PATH[max(0, k - 3)], BIRTH_PATH[min(len(BIRTH_PATH) - 1, k + 3)]  # a wide difference, so it turns smoothly into its jump
        head = math.degrees(math.atan2(yb - ya, xb - xa)) - 90
        land_k = min(1, max(0, (t - (BIRTH_D - .45)) / .3))  # from its landing it rights itself through the bounce
        angs.append(head * (1 - land_k) if t < BIRTH_D - .45 else angs_land * (1 - land_k))
        if t < BIRTH_D - .45:
            angs_land = head
    angs.append(0)  # point first off the chute, upright after
    sim.append((o, ts[:-1], xs[:-1], ys[:-1], BIRTH_D, 'birth'))
    b = onset_begin(T, o)
    kts = ';'.join(('%.5f' % (t / T)).rstrip('0').rstrip('.') for t in ts)
    birth_svg = ('<!-- the birth seed: heavy and husked, flung from the chute in the surge onto the shelf -->'
                 '<g opacity="0"><animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                     ';'.join('%s,%s' % (f(x), f(y)) for x, y in zip(xs, ys)), kts, f(T), b) +
                 '<animate attributeName="opacity" values="0;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="discrete"/>' % (kt(T, .02, BIRTH_D + .08), f(T), b) +
                 '<g><animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(a) for a in angs), kts, f(T), b) +
                 '<g><animateTransform attributeName="transform" type="scale" values=".5;.5;1;1" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, .9, 1.4), f(T), b) +
                 '<g transform="translate(0 12)">%s</g></g></g></g>' % HUSK)
    for o in EMIT:
        for _try in range(90):
            samples, fate = drift(rr)
            rec, angs, scs = emit(o, samples, fate)
            if clear(rec):
                sim.append(rec)
                draw(rec, angs, scs)
                o_, ts_, xs_, ys_, end_, fate_ = rec
                if fate == 'hatch':
                    hatch.append((xs_[-2], ys_[-2], o + ts_[-2]))
                if fate == 'catch':
                    lodged.append((xs_[-1], ys_[-1] + 1, (o + ts_[-2]) % T))
                    sprout_sim.append((xs_[-1], ys_[-1] + 1, o + ts_[-2], len(sim) - 1))
                break
    out.append(birth_svg)

    # every pair of seeds on the water together keeps apart, and none drifts through a standing sprout
    close = {}
    for step in range(int(T / .05)):
        t = step * .05
        now = [(i, at_(rec, t)) for i, rec in enumerate(sim)]
        now = [(i, p) for i, p in now if p and p[2] > SLIDE + DROP]
        for x_ in range(len(now)):
            i, (ax, ay, au, asz) = now[x_]
            for y_ in range(x_ + 1, len(now)):
                j, (bx, by, bu, bsz) = now[y_]
                d = math.hypot(ax - bx, ay - by)
                if d < max(7, 18 * (asz + bsz)) and d < close.get((i, j), (99, 0))[0]:
                    close[(i, j)] = (d, t)
    clashes = ['%s and %s: %s apart at t %s' % (sim[i][5], sim[j][5], f(d), f(t)) for (i, j), (d, t) in close.items()]
    fates = {}
    for rec in sim[1:]:
        fates[rec[5]] = fates.get(rec[5], 0) + 1
    return out, lodged, hatch, clashes, fates


def at_on(vals, times, onset, attr='opacity'):
    # an animation on the master clock, its times in seconds after an onset
    return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        attr, ';'.join(f(v) for v in vals), kt(T, *times), f(T), onset_begin(T, onset))


seed_svg, LODGE, HATCH, clashes, FATES = build_seeds()
# the gate flashing open as each seed is let down the chute
_rel = sorted({round(o % T, 3) for o in EMIT})
_ft, _fv = [], []
for j_, o_ in enumerate(_rel):
    nx_ = _rel[j_ + 1] if j_ + 1 < len(_rel) else _rel[0] + T
    if o_ + min(.3, nx_ - o_ - .02) >= T - 1e-3:
        continue
    _ft += [o_, o_ + .05, o_ + min(.3, nx_ - o_ - .02)]
    _fv += [0, .8, 0]
glow.append('<!-- the gate flashing open as each seed is let down --><ellipse cx="%d" cy="%d" rx="16" ry="11" fill="url(#glowPod)" opacity="0"><animate attributeName="opacity" values="0;%s;0" keyTimes="%s" dur="%ss" repeatCount="indefinite"/></ellipse>' % (
    CHUTE0[0], CHUTE0[1] - 4, ';'.join(f(v) for v in _fv), kt(T, *_ft), f(T)))
print('seeds: %d on the flood %s, %d clashes' % (sum(FATES.values()), FATES, len(clashes)), *clashes[:6], sep=chr(10) + '  ')
pods.extend(seed_svg)
glow.append('<g transform="%s">%s</g>' % (MT, ''.join(mglow)))  # the machine's own glows, in its frame

# ------------------------------------------------------------------ life layer (animated): the birth seed and the newborn, hatchlings, and sprouts rising where pods lodge
life = []


def at(vals, times, attr='opacity', begin=None):
    # an animation on the master clock, its times in seconds after the surge's onset
    return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        attr, ';'.join(f(v) if not isinstance(v, str) else v for v in vals), kt(T, *times), f(T), begin or onset_begin(T, S))


def rot_at(vals, times, begin=None):
    return at(vals, times, 'transform', begin).replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')


# the birth seed at rest: it lands, glows, splits along its seam, and the newborn climbs out of it
SPLIT0, SPLIT1 = B0 + 1.2, B0 + 1.7
life.append('<!-- light splashing off the rock where the birth seed lands --><ellipse cx="%s" cy="%s" rx="30" ry="7" fill="url(#glowWash)" opacity="0">%s</ellipse>' % (f(hx), f(hy), at((0, 0, .9, 0, 0), (B0 - .45, B0 - .4, B0 + .4))))
life.append('<!-- the birth seed at rest on the shelf: it glows, splits along its seam, and is left empty -->'
            '<g transform="translate(%s %s)"><g opacity="0">%s' % (f(hx), f(hy), at((0, 0, 1, 1, 0, 0), (B0, B0 + .02, B0 + 7, B0 + 8.5))) +
            '<circle cy="-12" r="22" fill="url(#glowPod)" opacity="0">%s</circle>' % at((0, .7, .7, .9, .6, 1, .3, 0, 0), (B0, B0 + .4, B0 + .7, B0 + 1.0, SPLIT0, SPLIT1 + .6, B0 + 4.5)) +
            '<path d="M0 -24 L 0 .5" stroke="#4d4526" stroke-width="1.4">%s</path>' % at((1, 1, 0, 0), (SPLIT0 - .6, SPLIT0 - .5)) +
            '<g><path d="%s" fill="#4d4526" stroke="#8a7a44" stroke-width=".8" stroke-opacity="0">%s</path>%s</g>' % (HUSK_L, at((0, 0, 1, 1), (SPLIT0, SPLIT0 + .1), 'stroke-opacity'), rot_at(('0 0 0', '0 0 0', '-72 0 0', '-72 0 0'), (SPLIT0, SPLIT1))) +
            '<g><path d="%s" fill="#4d4526" stroke="#8a7a44" stroke-width=".8" stroke-opacity="0">%s</path>%s</g>' % (HUSK_R, at((0, 0, 1, 1), (SPLIT0, SPLIT0 + .1), 'stroke-opacity'), rot_at(('0 0 0', '0 0 0', '72 0 0', '72 0 0'), (SPLIT0, SPLIT1))) +
            '<path d="%s%s" stroke="#8a7a44" stroke-width=".8" fill="none">%s</path>' % (HUSK_L.replace(' Z', ''), HUSK_R.replace(' Z', ''), at((1, 1, 0, 0), (SPLIT0, SPLIT0 + .1))) +
            '<path d="M0 -19 L 0 0" stroke="%s" stroke-width="1" stroke-linecap="round" opacity="0">%s</path>' % (GLOW_CORE, at((0, 0, 1, 0, 0), (SPLIT0 - .6, SPLIT0, SPLIT1))) +
            '<path d="%s" fill="#5b7436" stroke="#8fb050" stroke-width=".7">%s%s</path></g></g>' % (HUSK_CAP, at((1, 1, 0, 0), (SPLIT0 + .1, SPLIT0 + .5)), rot_at(('0 0 -24', '0 0 -24', '-40 0 -24', '-40 0 -24'), (SPLIT0, SPLIT0 + .5))))

# the newborn: a tadpole-like larva, bigger than the hatchlings in the flood. It rises out of the
# split husk, looks about, wriggles down the shelf, slips into the water and swims off downstream,
# then dives
NBS = 1.5
path_ = NB_LAND + NB_SWIM[1:]
seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path_, path_[1:])]
kt_nb = [APPEAR, CRAWL0]
tt_ = CRAWL0
for i, d in enumerate(seg):
    tt_ += d / (CRAWL_V if i < len(NB_LAND) - 1 else NB_SWIM_V)
    kt_nb.append(tt_)
path_ = path_ + [(path_[-1][0] + NB_SWIM_V * (GONE - DIVE), path_[-1][1] + .3)]  # it dives on the move
kt_nb.append(GONE)
motion = '<animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
    ';'.join('%s,%s' % (f(x), f(y)) for x, y in [path_[0], path_[0], path_[0]] + path_[1:] + [path_[-1]]), kt(T, *kt_nb), f(T), onset_begin(T, S))
# it heads the way it goes: level on the water, nose down the slope on the shelf
heads = [math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) * .6 for a, b in zip(path_, path_[1:])]
turn = at(['%s 0 0' % f(v) for v in [0, 0, 0, -10, 12, 0] + heads + [heads[-1], 0]], [APPEAR, EMERGE, EMERGE + .8, EMERGE + 1.6, CRAWL0 - .2] + kt_nb[1:-1] + [kt_nb[-1]], 'transform').replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')
# it wags slowly as it looks about, fast as it wriggles and swims
wag_t, wag_v = [APPEAR], ['0 -4 0']
t_ = EMERGE
while t_ < GONE - .2:
    per = .6 if t_ < CRAWL0 else .3
    wag_t += [t_, t_ + per / 2]
    wag_v += ['-22 -4 0', '22 -4 0']
    t_ += per
wag = at(['0 -4 0'] + wag_v + ['0 -4 0', '0 -4 0'], wag_t + [GONE], 'transform').replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')
grow = '<animateTransform attributeName="transform" type="scale" values=".3;.3;1;1;1 .2;1 .2" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, APPEAR, EMERGE, DIVE, GONE), f(T), onset_begin(T, S))
rise = '<animateTransform attributeName="transform" type="translate" values="0 -8;0 -8;0 -18;0 -14;0 -14;0 -3;0 -3;0 -8" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, APPEAR, EMERGE, EMERGE + .5, CRAWL0 - .3, CRAWL0 + .4, GONE), f(T), onset_begin(T, S))
# in the water only its top shows, and a wake spreads behind it
defs.append('<clipPath id="swimClip" clipPathUnits="userSpaceOnUse"><polygon points="%s"/></clipPath>' % pts([(0, 0), (W, 0), (W, WATER_Y + 1.5), (NB_SWIM[0][0] - 8, WATER_Y + 1.5), (NB_SWIM[0][0] - 8, 700), (0, 700)]))
wake = '<g opacity="0">%s<path d="M-9 1 L -46 -3 M-9 1.6 L -46 6" stroke="#a9bcc2" stroke-width="1.1" fill="none" opacity=".6" stroke-linecap="round"/></g>' % at((0, 0, 1, 1, 0, 0), (ENTRY, ENTRY + .3, DIVE, DIVE + .3))
life.append('<!-- the newborn: a leafy larva rising out of the split seed, wriggling down the shelf and swimming off downstream until it dives -->'
            '<g clip-path="url(#swipClip)"><g opacity="0">%s%s' % (motion, at((0, 0, 1, 1, 0, 0), (APPEAR, APPEAR + .4, DIVE + .1, GONE))) +
            '<g>%s<g transform="scale(%s)"><g>%s<g>%s%s%s</g></g></g></g></g></g>' % (rise, f(NBS), grow, turn, wake, larva_art(wag)))
life[-1] = life[-1].replace('swipClip', 'swimClip')
# its splash as it slips in, and the ring where it dives
for (x_, y_, t0_) in ((NB_SWIM[0][0], WATER_Y, ENTRY), (NB_SWIM[-1][0], WATER_Y, DIVE + .15)):
    life.append('<ellipse cx="%s" cy="%s" rx="1" ry=".4" fill="none" stroke="#b8c8cc" stroke-width="1.4" opacity="0">%s%s%s</ellipse>' % (
        f(x_), f(y_), at((1, 1, 2, 18, 18), (t0_, t0_ + .05, t0_ + 1), attr='rx'), at((.4, .4, .6, 4.5, 4.5), (t0_, t0_ + .05, t0_ + 1), attr='ry'), at((0, 0, .7, 0, 0), (t0_, t0_ + .05, t0_ + 1))))

# hatchlings: a larva swims out of each pod that split on the flood, and dives
for n, (x0, y0, th) in enumerate(HATCH):
    b = onset_begin(T, th)
    cur = current(y0)
    v_ = cur + 15
    x1 = x0 + cur * .3 + v_ * 2.2
    cid = 'hatchClip%d' % n
    defs.append('<clipPath id="%s" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="%d" height="%s"/></clipPath>' % (cid, W, f(y0 + 1.2)))
    wagh = '<animateTransform attributeName="transform" type="rotate" values="-24 -4 0;24 -4 0;-24 -4 0" dur=".3s" repeatCount="indefinite"/>'
    k = (y0 - HZ) / (H - HZ)
    sc = lerp(.7, 1.0, k)
    life.append('<!-- a larva hatched from a pod on the flood, swimming off and diving -->'
                '<g clip-path="url(#%s)"><g opacity="0">' % cid +
                '<animateMotion values="%s,%s;%s,%s;%s,%s;%s,%s;%s,%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                    f(x0), f(y0 - 2), f(x0 + cur * .3), f(y0 - 2), f(x1), f(y0 + 1), f(x1 + v_ * .3), f(y0 + 1), f(x1 + v_ * .3), f(y0 + 1), kt(T, .3, 2.5, 2.8), f(T), b) +
                '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, .15, .45, 2.3, 2.8), f(T), b) +
                '<g transform="scale(%s)"><g><animateTransform attributeName="transform" type="scale" values=".4;.4;1;1;1 .2;1 .2" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (f(sc), kt(T, .2, .6, 2.3, 2.8), f(T), b) +
                '<path d="M-9 1 L -40 -3 M-9 1.6 L -40 6" stroke="#a9bcc2" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>' + larva_art(wagh) + '</g></g></g></g>')
    life.append('<ellipse cx="%s" cy="%s" rx="1" ry=".4" fill="none" stroke="#b8c8cc" stroke-width="1.2" opacity="0">%s%s%s</ellipse>' % (
        f(x1 + v_ * .3), f(y0 + 1), at_on((1, 1, 2, 14, 14), (2.5, 2.55, 3.4), th, 'rx'), at_on((.4, .4, .6, 3.5, 3.5), (2.5, 2.55, 3.4), th, 'ry'), at_on((0, 0, .6, 0, 0), (2.5, 2.55, 3.4), th)))

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
                  d, mix(mix(GREEN_DARK, GREEN, .6 + .4 * (i % 2)), '#0a1210', .3), rib, mix(GREEN_LIT, '#0a1210', .35)))
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
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">The Genesis Prototype on Floria</title>\n  <desc id="scene-desc">A heavy industrial machine on wet rock lets glowing seeds down a chute into a flood in a storm; the current spreads them across the plain, where some split and tadpole-like larvae swim out and others catch on rock and sprout; once a cycle a heavy seed is flung onto the rock beside the machine and a newborn larva wriggles out and swims away; far off a colossal tree rises from an island of young forest, its canopy spread under the clouds.</desc>\n'
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
