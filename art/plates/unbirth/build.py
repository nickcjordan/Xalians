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
calibrated, "at full capacity"), the gate bursts, and a rush of seeds goes down the chute together. Read left to right: machine,
seeds spreading on the current, the first life taking hold, and far off the World Tree on its island
of young forest grown from earlier seeds. No grown creature is shown. Inference, not stated canon:
the seeds carry both plants and plant-like Xalians."""

PIECES = """Piece list (far to near). Key light: the Generator itself, a gold-green glow from its vat, seams
and chute, the only warm light in the scene. The sun is blacked out; lightning inside the cloud is
the only other light. Wind and flood run left to right: rain slants and seeds drift that way.
- storm ceiling: a heavy near-black cloud mass across the top, its base a row of hanging lobes,
  darker than the air under them. It hangs miles off over the sea, so the Generator's light never
  reaches it: only the rain-filled air right around the machine glows. Static.
- air under the cloud: dark, lightening a little toward the horizon. Static.
- lightning: flashes inside the cloud mass on their own clocks; one lights the World Tree from behind.
- rain curtains: soft slanted shafts of heavier rain hanging from the cloud to the horizon. Static.
- the World Tree: a colossal trunk far off at right, tall and nearly straight on low broad roots, dividing
  only where it meets its crown into great limbs that are into the leaves almost at once; the crown one
  broad umbrella of foliage under the storm, built of large overlapping domes in rows, each a little lit
  on top and shaded under, its edge lumped large and leafy fine, nothing that reads as a near tuft.
  Wood and leaves are hazed alike by the miles of rain (one softening, one mix toward the air), so no part
  of it reads nearer than another. It stands in the open air under a raised cloud base, a little paler
  behind it, behind the island's young forest; the cloud's own lobes hang in front of the crown's top.
  Its seed pods are a dim shimmer of countless points in its lower crown. A strike behind the crown
  silhouettes the whole tree.
- its island: land rising from the flood around its foot, covered in the young forest earlier seeds
  have grown: a low understory crowding the trunk, and standing clear of it young trees of three
  kinds, tree ferns with arching fronds, narrow spires, and broadleaves forking into limbs with sky
  between their clumps, still a fraction of the colossus's height, dark against the pale air at its
  foot; stepping down to shrubs, weeds and grass at the waterline, mist settled between the rows; a
  faint shimmer of pods among them.
  The scale of that forest is what makes the tree read as colossal.
- the storm sea out in the distance, left of the island: dark swell faces with their crests breaking
  white, whitecaps that break, throw spray downwind and fall back, and spindrift driven along the
  horizon; the water near the machine and the tree stays calm enough to read.
- the far plain: floodwater sheeting over smooth rock to the horizon, its surface broken by wind and
  rain into fine streaks of reflected sky, densest and brightest toward the horizon; dark whaleback
  domes of scoured rock breaking the surface, smaller and paler with distance, each with a dark
  reflection and a pale line where the water laps it. The island and the trunk's foot are mirrored in
  it, darker than the water and broken by the ripples. Strikes in the cloud flash in it. Static.
- the shelf: a broad smooth dome of black rock at left under the machine, wet, the Generator's light
  falling over it from the machine's foot and gone by its edges, wet glints where the light is
  strongest, the lit window smeared down it as a reflection, a dark contact shadow where the machine
  presses on it; running out into the flood.
- the Genesis Prototype, a heavy industrial machine filling the left of the panel: a stepped
  foundation bolted into the rock with heavy struts; a tall armored housing of riveted plate columns
  and girder bands; a tall glass incubation cylinder with rounded ends, thin hoops and pipes feeding
  it, its fluid glowing, seeds ripening dark against the glow and bubbles rising in it; a feed pipe up into a roof
  housing with a header tank on saddles and a breather stack ending in a gooseneck; a boiler annex on the left with a gauge, lamps, louvres and a steam relief valve; a steel
  lattice gantry with a catwalk and a beacon over the sluice; cables looped down to
  clamps on the rock; and at its foot a sluice gate with a wheel, and a chute running down from it on
  legs to the water behind the shelf: a trough, dark inside, with a riveted near wall, one sheet of
  glowing fluid sliding down it with light moving on it. It is a first
  prototype: a patch plate in another metal, a seam gone half dark.
  Weathered by storm after storm: grime in vertical runoff streaks, rust toward the foot and in runs
  from the rivets, plates wet in streaks, no two rivets alike; water drips off its ledges. Every
  plate, band, pipe, flange and rivet stands in relief, its upper edges catching wet sky light. The vat's
  light spills onto the plates around the window; strikes in the cloud catch its top edges.
  The vat breathes; a small plume of steam rises from the relief valve and thins away; the gauge
  trembles; the lamps and beacon blink.
- the overdrive surge, once a cycle: the vat charges and then flares white, every seam blazes, the
  gate bursts open and a rush of seeds goes down the chute together, the rain-filled air around the
  machine lights up, then it all settles back.
- seeds: acorn-like: a long pointed nut under a toothed olive cup,
  glowing softly. They slide down the chute one by one, drop into the lit water at its foot, and the
  flood takes them: each fans out on its own heading, eases into the current (left to right, slower
  with distance), wanders a little, parts around the slabs, lying on its side and turning slowly.
  Each meets its own end: some split and let a small larva out (a long half-clear body with its yolk
  glowing inside, feathered gills, small dark eyes, light spots down its flank and a long tail with a
  clear ribbed fin), which swims off and dives; some go
  under; some catch on a slab's edge and sprout; many are carried off downstream toward the island.
  While it floats each glints in the water under it and rings the water as it bobs.
  Integrated per seed, not drawn curves, and every voyage is placed so it keeps clear of the others
  and of the swimming larvae.
- the mid plain: floodwater across the middle ground with flat slabs of scoured rock, the Generator's
  light reflected in it; rain rings the water. The flood runs left to right: pale current lines drift
  across it, foam catches on the upstream side of each slab and a wake trails off its downstream side.
- the first growth: downwind, moss catching along the edges of the rock slabs and low fronds in the
  cracks, denser to the right; out on the small rocks and far whalebacks at left too, moss, blades of
  the frond plant, a sapling here and there, pods glowing; lodged pods glowing faintly among them.
- the growth at the source: the machine's own seeds have taken hold around it. Moss creeps along the
  foundation's foot, ferns and the frond plant stand in clumps at its corners and by the chute's legs,
  seedlings rise from glowing pods in front of it, and a young tree fern stands at the shelf's left end,
  all lit on the side that faces the vat.
- in front of the lens: the viewer stands at the edge of that growth. Broad leaves, ferns and grass lean
  into the frame from the bottom and the left, near-black and out of focus, their edges catching the
  vat's green where the machine is near and the cool sky elsewhere, beaded with rain; the fronds of a
  tree fern standing off the frame arch in at the top left. Static.
- growth you can watch: a seed catches on a rock; a sprout rises from it and two leaves unfurl, it
  stands a while, then fades before its seed returns.
- near rock: a dark wet ledge along the bottom left, and a rock rise at bottom right where a few
  young fronds and three lodged pods grow (the same plant takes hold, smaller, on the slabs where the
  first growth is), dark and wet, a little out of focus this close, bending in
  the gusts.
- rain: slanted streaks over the whole scene, finer and fainter far, heavier near; the rain near the
  Generator catches its light, blazing right in front of the window; it splashes in small crowns on
  the rock and the near water and rings the flood.
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

defs.append('''<filter id="nearDof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.9"/></filter>
<filter id="soft1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="curtain" x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation="16 6"/></filter>
<filter id="cloud" x="-5%" y="-30%" width="110%" height="170%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.4"/></filter>
<filter id="rockGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .09" numOctaves="3" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 .5  0 0 0 0 .6  0 0 0 0 .58  0 0 0 .5 -.2" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="moss" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".09 .3" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>''')


def noise_tex(id_, fx, fy, seed, rgb, gain, bias, octaves=3):
    # a static texture: fractal noise thresholded into a color's alpha, cut to the painted shape's own alpha
    r, g, b = (int(rgb[i:i + 2], 16) / 255 for i in (1, 3, 5))
    defs.append('<filter id="%s" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s %s" numOctaves="%d" seed="%d" result="n"/>'
                '<feColorMatrix in="n" values="0 0 0 0 %s  0 0 0 0 %s  0 0 0 0 %s  %s 0 0 0 %s" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>' % (
                    id_, f(fx), f(fy), octaves, seed, f(r), f(g), f(b), f(gain), f(bias)))


# the flood's surface, broken by wind and rain: streaks of reflected sky, finer and denser toward the horizon
def spec_tex(id_, fx, fy, seed, rgb, ss, exp_, const, light, octaves=4, blur=0):
    # a lit surface: fractal noise as a height field, lit by a specular light; only the highlights are painted,
    # cut to the painted shape's alpha, so it lies over the base color like light on the real thing
    defs.append('<filter id="%s" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s %s" numOctaves="%d" seed="%d" result="n"/>'
                '<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="h"/>%s'
                '<feSpecularLighting in="%s" surfaceScale="%s" specularConstant="%s" specularExponent="%s" lighting-color="%s" result="s">%s</feSpecularLighting>'
                '<feComposite in="s" in2="SourceGraphic" operator="in"/></filter>' % (
                    id_, f(fx), f(fy), octaves, seed, ('<feGaussianBlur in="h" stdDeviation="%s" result="hb"/>' % f(blur)) if blur else '', 'hb' if blur else 'h', f(ss), f(const), f(exp_), rgb, light))


SKY_LIGHT = '<feDistantLight azimuth="270" elevation="%s"/>'


def rock_tex(id_, fx, fy, seed, ss, sky_col, spec_col, spec_light, k_diff, k_spec, exp_=24):
    # wet rock in relief: the noise height field shaded by the dim sky from above (multiplied into the rock's
    # own color) and glinting where a light catches its wet facets
    defs.append('<filter id="%s" x="0" y="0" width="100%%" height="100%%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="%s %s" numOctaves="5" seed="%d" result="n"/>'
                '<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="h"/>'
                '<feDiffuseLighting in="h" surfaceScale="%s" diffuseConstant="1" lighting-color="%s" result="d"><feDistantLight azimuth="265" elevation="40"/></feDiffuseLighting>'
                '<feSpecularLighting in="h" surfaceScale="%s" specularConstant="1.1" specularExponent="%s" lighting-color="%s" result="s">%s</feSpecularLighting>'
                '<feComposite in="d" in2="SourceGraphic" operator="arithmetic" k1="%s" k2="0" k3="0" k4="0" result="dm"/>'
                '<feComposite in="s" in2="dm" operator="arithmetic" k1="0" k2="%s" k3="1" k4="0" result="o"/><feComposite in="o" in2="SourceGraphic" operator="in"/></filter>' % (
                    id_, f(fx), f(fy), seed, f(ss), sky_col, f(ss), f(exp_), spec_col, spec_light, f(k_diff), f(k_spec)))
spec_tex('rippleFar', .012, .45, 21, '#9aaab6', 2.2, 22, 1.1, SKY_LIGHT % 14)
spec_tex('rippleMid', .006, .18, 22, '#8d9daa', 2.6, 20, 1.1, SKY_LIGHT % 18)
spec_tex('rippleNear', .0028, .07, 23, '#8292a0', 3, 18, 1.05, SKY_LIGHT % 22)
noise_tex('troughNear', .0035, .06, 24, '#05080a', 4, -1.9)
# the same broken surface lit by the Generator
noise_tex('rippleLit', .018, .38, 25, '#cfe86a', 6.5, -3.85)
# wet rock: specular flecks
noise_tex('wetFleck', .03, .22, 26, '#d9f27a', 9, -6.2, 3)
noise_tex('wetFleckCool', .03, .2, 27, '#9fb2bc', 9, -6.1, 3)
# the machine weathered: rain runoff grime in vertical streaks, rust blooming toward the foot, drying salt
noise_tex('grimeStreak', .09, .008, 28, '#050403', 3, -1.45, 3)
noise_tex('rustBlot', .022, .03, 29, '#3e2c20', 3.4, -1.95, 4)
noise_tex('wetStreak', .3, .008, 30, '#8a9aa0', 4, -2.7, 2)
# far foliage: clumps of leaf mass catching the little light there is
noise_tex('leafMass', .04, .055, 31, '#324a38', 3.4, -1.75, 3)
defs.append('<filter id="leafEdge" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".16" numOctaves="2" seed="32" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>')
defs.append('<filter id="canopyEdge" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="33" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>')
# a reflection: smeared down, broken sideways by the ripples
defs.append('<filter id="reflect" x="-5%" y="-10%" width="110%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".004 .35" numOctaves="2" seed="34" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="A" result="d"/><feGaussianBlur in="d" stdDeviation=".5 2"/></filter>')
defs.append('<filter id="reflectWet" x="-10%" y="-10%" width="120%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".06 .012" numOctaves="2" seed="35" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="A" result="d"/><feGaussianBlur in="d" stdDeviation="2 5"/></filter>')
defs.append('<filter id="foam" x="-20%" y="-60%" width="140%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".12 .3" numOctaves="2" seed="36" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".7"/></filter>')
# the lit water at the outfall: a glitter of short broken flecks, its field drifting downstream with the
# current. Two fields crossfade with equal-power weights and a mean correction, so the density holds
# through the fade; each field's drift resets while its weight is zero; the region reaches upstream past
# the full drift so no empty strip opens at the outfall.
GLIT_T, GLIT_DX = 12, 300
defs.append('<filter id="glitterLit" x="-130%%" y="-40%%" width="240%%" height="180%%">'
            '<feTurbulence type="fractalNoise" baseFrequency=".022 .42" numOctaves="3" seed="41" result="na"/><feOffset in="na" result="oa"><animate attributeName="dx" values="0;%d" dur="%ds" begin="-%ss" repeatCount="indefinite"/></feOffset>'
            '<feTurbulence type="fractalNoise" baseFrequency=".022 .42" numOctaves="3" seed="47" result="nb"/><feOffset in="nb" result="ob"><animate attributeName="dx" values="0;%d" dur="%ds" repeatCount="indefinite"/></feOffset>'
            '<feComposite in="oa" in2="ob" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" result="t2">'
            '<animate attributeName="k2" values="1;.71;0;.71;1" keyTimes="0;.25;.5;.75;1" dur="%ds" repeatCount="indefinite"/>'
            '<animate attributeName="k3" values="0;.71;1;.71;0" keyTimes="0;.25;.5;.75;1" dur="%ds" repeatCount="indefinite"/>'
            '<animate attributeName="k4" values="0;-.21;0;-.21;0" keyTimes="0;.25;.5;.75;1" dur="%ds" repeatCount="indefinite"/></feComposite>'
            '<feColorMatrix in="t2" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 12 -6.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>' % (
                GLIT_DX, GLIT_T, f(GLIT_T / 2), GLIT_DX, GLIT_T, GLIT_T, GLIT_T, GLIT_T))
rad([(0, GLOW_CORE, 1), (.3, GLOW_MID, .75), (1, GLOW_EDGE, 0)], id='glowPod')
rad([(0, GLOW_MID, .95), (.5, GLOW_MID, .55), (1, GLOW_EDGE, 0)], id='glitterFall')
rad([(0, GLOW_CORE, 1), (.6, GLOW_CORE, .6), (1, GLOW_MID, 0)], id='glitterCore')
rad([(0, '#d9f27a', .55), (.45, '#8fb33e', .22), (1, '#2c4a1c', 0)], id='glowWash')
rad([(0, '#ffffff', .95), (.3, GLOW_CORE, .9), (.7, GLOW_MID, .6), (1, GLOW_EDGE, .15)], id='corePort')
rad([(0, '#e6f0ff', .8), (.35, '#9fb4d8', .35), (1, '#2a3446', 0)], id='flash')
rad([(0, '#e4ecff', .9), (.45, '#8ea4cc', .5), (1, '#26324a', 0)], id='flashBack')
rad([(0, '#ffffff', 1), (.4, '#e8f0ff', .8), (1, '#9fb4d8', 0)], id='flashCore')

# ------------------------------------------------------------------ leaves: the plants that grow from the machine's seeds
def leaf_shape(x0, y0, ang, L, w, droop, n=18):
    # a lance-shaped leaf from its base: a curved midrib that droops toward the side it leans to, widest about a
    # third of the way up and pointed at the tip. Returns the outline, the midrib, and the two edges.
    a = math.radians(ang)
    dx, dy = math.sin(a), -math.cos(a)
    px, py = math.cos(a), math.sin(a)
    sd = 1 if ang >= 0 else -1
    c = (x0 + dx * L * .55, y0 + dy * L * .55)
    tip = (x0 + dx * L + px * droop * sd, y0 + dy * L + py * droop * sd)
    spine, left, right = [], [], []
    for i in range(n):
        t = i / (n - 1)
        u = 1 - t
        sx_, sy_ = u * u * x0 + 2 * u * t * c[0] + t * t * tip[0], u * u * y0 + 2 * u * t * c[1] + t * t * tip[1]
        tx_, ty_ = 2 * u * (c[0] - x0) + 2 * t * (tip[0] - c[0]), 2 * u * (c[1] - y0) + 2 * t * (tip[1] - c[1])
        nn = math.hypot(tx_, ty_) or 1
        hw = w / 2 * (math.sin(math.pi * min(1, t ** .8 * 1.02)) ** .8 if t < 1 else 0) * (.35 + .65 * min(1, t * 6))
        spine.append((sx_, sy_, tx_ / nn, ty_ / nn))
        left.append((sx_ - ty_ / nn * hw, sy_ + tx_ / nn * hw))
        right.append((sx_ + ty_ / nn * hw, sy_ - tx_ / nn * hw))
    return left + right[::-1], spine, left, right


LEAF_N = [0]


def draw_leaf(x0, y0, ang, L, w, droop, light, rr, near=True, base='#070d09', mid='#15281b', tipc='#28422c'):
    # one leaf: shaded from its dark base to a paler tip, a midrib, the edge that faces the light catching it
    # (green where the machine is near, the cool sky elsewhere), and a few beads of rain
    poly, spine, left, right = leaf_shape(x0, y0, ang, L, w, droop)
    LEAF_N[0] += 1
    gid = 'leafG%d' % LEAF_N[0]
    lin([(0, base, 1), (.5, mid, 1), (1, tipc, 1)], x0, y0, spine[-1][0], spine[-1][1], units=True, id=gid)
    m = spine[len(spine) // 2]
    dist = math.hypot(m[0] - LIGHT_AT[0], m[1] - LIGHT_AT[1])
    to = (LIGHT_AT[0] - m[0], LIGHT_AT[1] - m[1]) if dist < 560 else (0, -1)
    lit_left = (-m[3]) * to[0] + m[2] * to[1] > 0
    edge = (left if lit_left else right)[2:-1]
    rim_c, rim_o = (GLOW_MID, lerp(.85, .3, min(1, dist / 560))) if dist < 560 else ('#a9bcc2', .32)
    out = '<path d="M%s Z" fill="url(#%s)"/>' % (' L '.join('%s %s' % (f(x), f(y)) for x, y in poly), gid)
    if dist < 560:  # the vat's light coming through the leaf
        out += '<path d="M%s Z" fill="%s" opacity="%s"/>' % (' L '.join('%s %s' % (f(x), f(y)) for x, y in poly), GLOW_EDGE, f(lerp(.3, .04, dist / 560)))
    out += '<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity=".5"/>' % (pts([(x, y) for x, y, _, _ in spine[1:-2]]), mix(tipc, '#2c4432', .4), f(max(.5, w * .045)))
    out += '<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity="%s" stroke-linecap="round"/>' % (pts(edge), rim_c, f(min(3, max(.9, w * .07))), f(rim_o))
    for _ in range(rr.randint(0, 3) if near else 0):
        x, y, _, _ = spine[rr.randint(4, len(spine) - 4)]
        out += '<circle cx="%s" cy="%s" r="%s" fill="#d6e2e4" opacity="%s"/>' % (f(x + rr.uniform(-w * .2, w * .2)), f(y + rr.uniform(-w * .15, w * .15)), f(rr.uniform(.7, 1.5)), f(rr.uniform(.3, .55)))
    return out


def draw_fern(x0, y0, ang, L, lw, droop, light, rr, col='#122419', tipc='#2c4a30', broad=.18):
    # a fern frond: a curved stem carrying paired leaflets that shorten toward the tip, the lit side catching light
    poly, spine, left, right = leaf_shape(x0, y0, ang, L, 1, droop, n=26)
    m = spine[len(spine) // 2]
    dist = math.hypot(m[0] - LIGHT_AT[0], m[1] - LIGHT_AT[1])
    rim_c, rim_o = (GLOW_MID, lerp(.8, .3, min(1, dist / 560))) if dist < 560 else ('#a9bcc2', .3)
    out = '<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (pts([(x, y) for x, y, _, _ in spine]), col, f(max(.8, lw * .16)))
    lf = ''
    lit = ''
    for i, (x, y, tx_, ty_) in enumerate(spine[2:-1]):
        t = (i + 2) / len(spine)
        pl = lw * (1 - t) ** .6 * (.55 + .45 * math.sin(math.pi * min(1, t * 1.6)))
        for side in (1, -1):
            nx_, ny_ = -ty_ * side, tx_ * side
            dx_, dy_ = nx_ * .8 + tx_ * .6, ny_ * .8 + ty_ * .6
            dd = math.hypot(dx_, dy_)
            dx_, dy_ = dx_ / dd, dy_ / dd
            ex, ey = x + dx_ * pl, y + dy_ * pl + pl * .25  # the leaflet hangs a little
            lf += '<path d="M%s %s Q %s %s %s %s Q %s %s %s %s Z"/>' % (f(x), f(y), f(x + dx_ * pl * .5 - tx_ * pl * broad), f(y + dy_ * pl * .5 - ty_ * pl * broad), f(ex), f(ey), f(x + dx_ * pl * .5 + tx_ * pl * broad), f(y + dy_ * pl * .5 + ty_ * pl * broad), f(x), f(y))
            if dy_ < 0 and i % 2 == 0:
                lit += '<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(x + dx_ * pl * .2), f(y + dy_ * pl * .2), f(ex), f(ey))
    lin([(0, col, 1), (1, tipc, 1)], x0, y0, spine[-1][0], spine[-1][1], units=True, id='fernG%d' % (LEAF_N[0] + 1))
    LEAF_N[0] += 1
    out += '<g fill="url(#fernG%d)">%s</g><g stroke="%s" stroke-width="%s" opacity="%s" stroke-linecap="round">%s</g>' % (LEAF_N[0], lf, rim_c, f(max(.6, lw * .08)), f(rim_o), lit)
    return out


# ------------------------------------------------------------------ sky layer (static): the storm ceiling and the air under it
sky = []
lin([(0, '#04070a', 1), (.35, '#0a1016', 1), (.6, '#111a22', 1), (1, '#27313c', 1)], 0, 0, 0, HZ, units=True, id='air')
sky.append('<!-- air under the cloud: dark, lightening a little toward the horizon --><rect width="%d" height="%d" fill="url(#air)"/>' % (W, HZ + 10))
sky.append('<!-- far off at right the last light under the storm: the open air the World Tree stands in, paler than its crown and trunk so they stand against it -->'
           '<ellipse cx="1240" cy="266" rx="580" ry="112" fill="#303c49" opacity=".75" filter="url(#soft)"/>')
lin([(0, '#030507', 1), (.7, '#0a1012', 1), (1, '#131c24', 1)], 0, 0, 0, 240, units=True, id='mass')
lin([(0, '#070b0d', 1), (.6, '#0d141a', 1), (1, '#10181e', 1)], id='lobe')  # darker than the air under it: a lit lobe bottom read as a snowy ridge
lobes = []
x = -80
while x < W + 80:
    cy = 176 + 22 * math.sin(x / 140) + 10 * math.sin(x / 47) + rnd.uniform(-8, 8)
    cy -= 46 * min(1, max(0, (x - 800) / 180))  # over the World Tree the cloud base rides higher, so its crown stands against open air
    lobes.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#lobe)"/>' % (f(x), f(cy), f(rnd.uniform(62, 110)), f(rnd.uniform(34, 58))))
    x += rnd.uniform(52, 84)
scud = []
for _ in range(14):
    sx_ = rnd.uniform(0, W)
    scud.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#0f171d" opacity="%s"/>' % (f(sx_), f(rnd.uniform(218, 250) - (46 if sx_ > 860 else 0)), f(rnd.uniform(40, 90)), f(rnd.uniform(6, 12)), f(rnd.uniform(.5, .85))))
# the cloud's underside in relief: billows shaded by the little light that comes up from the horizon
defs.append('<filter id="cloudRelief" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
            '<feTurbulence type="fractalNoise" baseFrequency=".0025 .006" numOctaves="5" seed="5" result="n"/>'
            '<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.2 0 0 0 -.1" result="h"/><feGaussianBlur in="h" stdDeviation="3" result="hb"/>'
            '<feDiffuseLighting in="hb" surfaceScale="30" diffuseConstant="1" lighting-color="#b4c0ca" result="lit"><feDistantLight azimuth="90" elevation="20"/></feDiffuseLighting>'
            '<feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1.5" k2=".15" k3="0" k4="0" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>')
sky.append('<!-- storm ceiling: the cloud mass and its hanging lobes, their undersides in relief --><g filter="url(#cloudRelief)"><g filter="url(#cloud)"><rect x="-40" y="-40" width="%d" height="220" fill="url(#mass)"/>%s%s</g></g>' % (W + 80, ''.join(lobes), ''.join(scud)))
# (the cloud base is not lit green: it hangs miles off over the sea, far beyond the reach of the vat. Nick 2026-09-23)
sky.append('<!-- the rain-filled air right around the Generator lit by it, gone well below the cloud --><ellipse cx="%d" cy="352" rx="230" ry="100" fill="url(#glowWash)" opacity=".22"/>' % GX)

# ------------------------------------------------------------------ flash layer (animated): lightning inside the cloud
flash = []


def cloud_flash(cx, cy, rx, ry, grad, period, onset, peak, name, vapor=0):
    # the strike lights a knot of cloud lobes, not an oval: the main glow plus lit lobe undersides; with
    # vapor, many small lobes of uneven brightness, so the light blooms through cloud instead of filling a shape
    fr_ = random.Random(int(cx * 3 + cy))
    lobes_ = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)" opacity="%s"/>' % (
        f(cx + fr_.uniform(-rx * .7, rx * .7)), f(cy + fr_.uniform(-ry * .9, ry * .25)), f(fr_.uniform(18, 60)), f(fr_.uniform(10, 26)), grad, f(fr_.uniform(.25, .9))) for _ in range(vapor))
    lobes_ += ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)" opacity="%s"/>' % (
        f(cx + fr_.uniform(-rx * .8, rx * .8)), f(min(205, cy + ry * .5) + fr_.uniform(-10, 14)), f(fr_.uniform(40, 80)), f(fr_.uniform(18, 30)), grad, f(fr_.uniform(.6, 1))) for _ in range(3))
    return ('<!-- lightning: %s -->' % name) + '<g opacity="0"><animate attributeName="opacity" values="0;%s;.12;%s;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)"/>%s<ellipse cx="%s" cy="%s" rx="26" ry="18" fill="url(#flashCore)"/></g>' % (
        f(peak), f(peak * .75), kt(period, .04, .1, .16, .45), f(period), onset_begin(period, onset), f(cx), f(cy), f(rx), f(ry), grad, lobes_, f(cx + fr_.uniform(-rx * .3, rx * .3)), f(cy + fr_.uniform(-10, 20)))


flash.append(cloud_flash(300, 150, 260, 80, 'flash', 12, 3.1, .65, 'inside the cloud, left'))
flash.append(cloud_flash(960, 140, 360, 100, 'flash', 24, 9.7, .9, 'inside the cloud, center'))
flash.append(cloud_flash(1330, 150, 320, 92, 'flashBack', 24, 15.3, .5, 'behind the World Tree, lighting its silhouette', vapor=26))  # high in the crown, dimming toward the island
flash.append(cloud_flash(640, 120, 260, 80, 'flash', 12, 8.3, .55, 'high in the cloud over the Generator'))

# ------------------------------------------------------------------ far layer (static): curtains, the World Tree, the far plain
far = []
lin([(0, '#3a4550', 0), (.25, '#3a4550', .45), (.8, '#343f4a', .35), (1, '#343f4a', .1)], id='curtainG')
cur = []
for (cx, w) in [(120, 190), (330, 150), (560, 220), (740, 140), (860, 170), (1040, 120)]:
    cur.append('<rect x="%s" y="200" width="%s" height="%s" fill="url(#curtainG)"/>' % (f(cx - w / 2), f(w), f(HZ - 180)))
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
# The World Tree, third drawing (Nick, 2026-09-24: the leaves read as tufts near the viewer while the tree read far
# behind them, and the low limbs looked wrong). One colossus at one depth: a tall, nearly straight trunk on buttress
# roots that divides only where it meets the crown; a crown that is one broad umbrella of foliage with large soft
# lumps, no small lit tufts; and the whole tree, wood and leaves alike, hazed by the same miles of rain.


def ty(y):
    # the pods' heights (glow layer) follow the crown's underside
    return y - 26


CROWN_X0, CROWN_X1 = 868, W + 90


def crown_top(x):
    return 60 + 64 * (abs(x - TX) / 560) ** 1.5 + 6 * math.sin(x / 41)


def crown_bot(x):
    return 166 - 16 * min(1, abs(x - TX) / 600) + 6 * math.sin(x / 33) + 3 * math.sin(x / 13)


def trunk_hw(y):
    # the trunk's half width: flared into its roots at the foot, then nearly straight, tapering a little as it climbs
    if y > HZ - 60:
        return lerp(42, 74, ((y - (HZ - 60)) / 66) ** 1.8)
    return lerp(25, 42, max(0, (y - 206) / (HZ - 60 - 206)) ** .9)


tl_, tr_ = [], []
for y in list(range(206, HZ + 7, 6)) + [HZ + 6]:
    w_ = trunk_hw(y)
    tl_.append((TX - w_ + 2 * math.sin(y / 17), y))
    tr_.append((TX + 4 + w_ + 2 * math.sin(y / 19 + 1), y))
trunk = pts(tl_ + tr_[::-1])
lin([(0, '#161f27', 1), (.7, '#121a21', 1), (.92, '#141c23', 1), (1, '#1d2731', 1)], 0, 180, 0, HZ, units=True, id='trunkG')
lin([(0, '#1b252e', 1), (.5, '#141c23', 1), (1, '#10171d', 1)], 0, 0, 1, 0, id='trunkSide')  # rounded: a little light on its left flank
bk_ = random.Random(143)
bark = ''
for k_ in range(8):
    fr_ = -.72 + k_ * .2 + bk_.uniform(-.05, .05)
    y0_, y1_ = int(bk_.uniform(196, 260)), int(bk_.uniform(HZ - 60, HZ))
    line_ = [(TX + 2 + fr_ * trunk_hw(y) + bk_.uniform(-1, 1) + 2.5 * math.sin(y / 23 + k_), y) for y in range(y0_, y1_, 9)]
    lg_ = lin([(0, '#0b1014', 0), (.2, '#0b1014', .55), (.8, '#0b1014', .55), (1, '#0b1014', 0)], 0, y0_, 0, y1_, units=True)
    bark += '<polyline points="%s" fill="none" stroke="url(#%s)" stroke-width="%s" stroke-linejoin="round"/>' % (pts(line_), lg_, f(bk_.uniform(.8, 1.8)))
roots = ''.join('<polygon points="%s"/>' % pts(limb(x0, y0, cx, cy, x1, y1, w0, w1, n=16)[0]) for x0, y0, cx, cy, x1, y1, w0, w1 in (
    (TX - 44, HZ - 34, TX - 74, HZ - 6, TX - 132, HZ + 6, 24, 9), (TX - 22, HZ - 20, TX - 34, HZ - 2, TX - 64, HZ + 7, 18, 8),
    (TX + 30, HZ - 20, TX + 42, HZ - 2, TX + 72, HZ + 7, 18, 8), (TX + 52, HZ - 34, TX + 82, HZ - 6, TX + 140, HZ + 6, 24, 9)))  # low and broad, sinking into the island
# where it meets the crown the trunk divides into four great limbs that are into the leaves almost at once
limbs_ = ''.join('<polygon points="%s"/>' % pts(limb(*L, n=20)[0]) for L in (
    (TX - 20, 222, TX - 90, 196, TX - 250, 150, 28, 9), (TX - 8, 214, TX - 30, 180, TX - 90, 138, 22, 8),
    (TX + 14, 214, TX + 36, 180, TX + 100, 138, 22, 8), (TX + 28, 222, TX + 100, 196, TX + 270, 150, 28, 9),
    (TX - 110, 190, TX - 150, 176, TX - 190, 150, 9, 4), (TX + 118, 188, TX + 160, 176, TX + 206, 150, 9, 4)))
# the crown: one broad umbrella of foliage, its outline lumped at a large scale and ragged where the leaves are,
# lit a little on top, darker underneath, a slow texture of leaf masses inside it, and nothing finer
crnd_ = random.Random(71)
cm = []
lin([(0, '#34463a', 1), (.35, '#26352c', 1), (.72, '#1a2520', 1), (.86, '#121915', 1), (1, '#151d19', 1)], id='domeG')  # a darker band under each dome
rows = ((0, .34, 64, 88, 58, 86), (1, .62, 52, 74, 40, 60), (2, .9, 38, 56, 24, 38))  # (row, depth in the crown, spacing lo/hi, rx lo/hi)
for r_, dep, s0, s1, r0, r1 in rows:
    x = CROWN_X0 + crnd_.uniform(0, 30) - 20 * r_
    while x < CROWN_X1:
        t_, b_ = crown_top(x), crown_bot(x)
        rx_ = crnd_.uniform(r0, r1)
        cy_ = lerp(t_, b_, dep) + crnd_.uniform(-6, 6)
        ry_ = rx_ * crnd_.uniform(.5, .62)
        if cy_ + ry_ > b_ + 12:
            cy_ = b_ + 12 - ry_
        cm.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#domeG)"/>' % (f(x), f(cy_), f(rx_), f(ry_)))
        x += crnd_.uniform(s0, s1)
lin([(0, '#2a392f', 1), (.45, '#212e27', 1), (.8, '#18221e', 1), (1, '#131b18', 1)], 0, 60, 0, 196, units=True, id='crownG')
defs.append('<filter id="crownEdge" x="-5%" y="-25%" width="110%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="3" seed="151" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d"/>'
            '<feTurbulence type="fractalNoise" baseFrequency=".22" numOctaves="2" seed="159" result="n2"/><feDisplacementMap in="d" in2="n2" scale="4" xChannelSelector="R" yChannelSelector="G" result="d2"/><feGaussianBlur in="d2" stdDeviation=".8"/></filter>')  # large lumps, then a fine leafy edge
defs.append('<g id="crownShape"><g filter="url(#crownEdge)">%s</g></g>' % ''.join(cm))
noise_tex('crownLeaves', .03, .05, 153, '#3a5040', 2.6, -1.35, 3)  # leaf masses: soft, low, large
noise_tex('crownShade', .02, .04, 157, '#0c1210', 2.4, -1.1, 3)
# one depth for the whole tree: it is softened a little and every part of it, wood and leaf, mixed the same way toward
# the air it stands in, so no part reads nearer than another
defs.append('<filter id="treeAir" x="-5%" y="-10%" width="110%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation=".7" result="b"/>'
            '<feFlood flood-color="#2a3541" result="air"/><feComposite in="air" in2="b" operator="in" result="airIn"/>'
            '<feComposite in="b" in2="airIn" operator="arithmetic" k1="0" k2=".74" k3=".26" k4="0"/></filter>')
far.append('<!-- the World Tree: a tall trunk on buttress roots dividing only into its crown, one broad umbrella of foliage under the storm, all of it hazed alike by the miles of rain -->'
           '<g filter="url(#treeAir)">'
           '<g fill="url(#trunkG)"><polygon points="%s"/>%s%s</g><polygon points="%s" fill="url(#trunkSide)" opacity=".6"/><g filter="url(#soft1)">%s</g>'
           '<use href="#crownShape"/><g opacity=".55"><use href="#crownShape" filter="url(#crownLeaves)"/></g><g opacity=".5"><use href="#crownShape" filter="url(#crownShade)"/></g>'
           '</g>' % (trunk, roots, limbs_, trunk, bark))
# the crown pushes up into the storm: the cloud's own lobes hang in front of its top and rags of scud cross it
vr_ = random.Random(113)
veil = []
x = TX - 560
while x < W + 90:
    d_ = min(1, abs(x - TX) / 560)
    cy = lerp(52, 92, d_) + 14 * math.sin(x / 70) + vr_.uniform(-8, 8)
    veil.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#lobe)"/>' % (f(x), f(cy), f(vr_.uniform(50, 96)), f(vr_.uniform(28, 42))))
    x += vr_.uniform(40, 70)
veil.append('<rect x="%s" y="-40" width="%s" height="%s" fill="url(#mass)"/>' % (f(TX - 620), f(W - TX + 720), f(100)))
scud_ = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#0f171d" opacity="%s"/>' % (f(vr_.uniform(TX - 460, W)), f(vr_.uniform(96, 130)), f(vr_.uniform(40, 80)), f(vr_.uniform(3, 6)), f(vr_.uniform(.35, .6))) for _ in range(5))
far.append('<!-- the cloud hanging in front of the top of the crown, and rags of scud across it -->'
           '<g filter="url(#cloudRelief)"><g filter="url(#cloud)">%s%s</g></g>' % (''.join(veil), scud_))
far.append('<!-- the tree hazed by distance and rain --><rect x="%d" y="100" width="1100" height="%d" fill="#27313c" opacity=".12"/>' % (TX - 550, HZ - 90))
# mist lying across the trunk at several heights, and rain curtains between it and the viewer: the air
# between here and there is miles deep
mist_ = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#2c3642" opacity="%s"/>' % (f(TX + dx), f(y), f(rx), f(ry), f(op)) for dx, y, rx, ry, op in (
    (-60, 352, 380, 30, .2), (80, 250, 300, 40, .11)))
far.append('<!-- mist lying across the World Tree --><g filter="url(#soft)">%s</g>' % mist_)
# (the two rain curtains beside the trunk lined up with its edges and made it read as a column of weather, not wood)
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
for _ in range(60):  # the old sheen lines' draws, kept so every later random draw lands where it did
    rnd.random(), rnd.uniform(-40, W), rnd.uniform(30, 160), rnd.uniform(.12, .35)
lin([(0, '#fff', 1), (.55, '#fff', .8), (1, '#fff', 0)], 0, HZ, 0, 482, units=True, id='farRipA')
lin([(0, '#fff', 0), (.4, '#fff', .6), (1, '#fff', 1)], 0, 410, 0, 482, units=True, id='farRipB')
far.append('<!-- the far flood broken by wind and rain: fine streaks of reflected sky, densest toward the horizon -->'
           '<rect x="0" y="%d" width="%d" height="%d" fill="url(#farRipA)" filter="url(#rippleFar)" opacity=".8"/>' % (HZ - 1, W, 482 - HZ + 1) +
           '<rect x="0" y="410" width="%d" height="72" fill="url(#farRipB)" filter="url(#rippleMid)" opacity=".7"/>' % W)
far.append('<!-- the brightest water right at the horizon, the sky at a grazing angle --><rect x="0" y="%d" width="%d" height="5" fill="#56646f" opacity=".22" filter="url(#soft2)"/>' % (HZ - 1, W))
whales = []
WHALES = []
for _ in range(26):
    y = HZ + 4 + (rnd.random() ** 1.3) * 78
    k = (y - HZ) / 80
    x = rnd.uniform(-20, W + 20)
    if abs(x - GX) < 260 and y > 440:
        continue
    rx = lerp(14, 110, k) * rnd.uniform(.7, 1.3)
    ry = lerp(2.5, 12, k) * rnd.uniform(.8, 1.2)
    c = mix('#29333d', ROCK, k)
    WHALES.append((x, y, rx, ry, k))
    whales.append('<path d="M%s %s Q %s %s %s %s Z" fill="%s" opacity="%s" filter="url(#reflect)"/>' % (f(x - rx), f(y), f(x), f(y + ry * 1.4), f(x + rx), f(y), mix('#1c252d', '#05080a', k), f(lerp(.35, .6, k))) +
                  '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#8a9aa4" opacity="%s" filter="url(#foam)"/>' % (f(x), f(y + .3), f(rx * .9), f(lerp(.3, .7, k)), f(lerp(.2, .35, k))))
    whales.append('<path d="M%s %s Q %s %s %s %s Z" fill="%s"/><path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none" opacity=".5"/>' % (
        f(x - rx), f(y), f(x), f(y - ry * 2), f(x + rx), f(y), c, f(x - rx * .7), f(y - ry * .6), f(x - rx * .1), f(y - ry * 1.6), f(x + rx * .4), f(y - ry * 1.1), mix('#4a5866', ROCK_WET, k), f(lerp(.6, 1.4, k))))
far.append('<!-- whaleback domes of scoured rock breaking the water, smaller and paler with distance --><g>%s</g>' % ''.join(whales))


def rock_growth(x, y, rx, ry, k, rr, crest=True):
    # seeds that caught on a far rock and took: moss along its crest, a few blades of the frond plant, now and
    # then a sapling or a glowing pod; grayed by distance like the rock itself
    far_ = (1 - k) * .55
    col = lambda c: mix(c, '#2a3440', far_)
    top = [(x - rx + 2 * rx * t, y - (4 * ry * t * (1 - t) if crest else ry)) for t in (.18, .3, .42, .54, .66, .78)]
    g = '<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" opacity=".85" filter="url(#moss)"/>' % (pts(top), col(mix(GREEN_DARK, GREEN, .55)), f(lerp(.9, 2.2, k)))
    for _ in range(rr.randint(3, 6)):
        bx, by = top[rr.randint(1, 4)]
        bx += rr.uniform(-2, 2)
        h = lerp(3, 12, k) * rr.uniform(.6, 1.3)
        a = rr.uniform(-.5, .5)
        g += '<path d="M%s %s q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round"/>' % (
            f(bx), f(by), f(a * h * .2), f(-h * .6), f(a * h + h * .15), f(-h), col(mix(GREEN_DARK, GREEN, rr.uniform(.4, .8))), f(lerp(.6, 1.3, k)))
    if rr.random() < .4:
        bx, by = top[rr.randint(1, 4)]
        h = lerp(6, 20, k) * rr.uniform(.8, 1.2)
        g += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/>' % (f(bx), f(by), f(bx + h * .05), f(by - h * .7), col('#0e1511'), f(lerp(.5, 1, k)))
        g += ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(bx + h * dx), f(by - h * dy), f(h * r_), col(mix('#1a2e1f', '#2c4a30', rr.random()))) for dx, dy, r_ in ((-.1, .78, .16), (.12, .82, .15), (0, .96, .17)))
    if rr.random() < .45:
        bx, by = top[rr.randint(1, 4)]
        g += '<circle cx="%s" cy="%s" r="%s" fill="url(#glowPod)" opacity=".4"/>' % (f(bx), f(by - .6), f(lerp(.9, 2.2, k)))
    return g


grnd_ = random.Random(117)
far.append('<!-- the first growth out on the far rocks at left too: moss, blades and saplings where seeds caught -->%s' % ''.join(
    rock_growth(x, y, rx, ry, k, grnd_) for x, y, rx, ry, k in WHALES if (452 < x < 960 or x < 24) and rx > 16))
far.append('<!-- a far whaleback on the left of the plain --><path d="M60 %d C 120 %d, 230 %d, 300 %d Z" fill="#232d35"/>' % (HZ + 4, HZ - 20, HZ - 22, HZ + 4))
# The World Tree's island: land rising from the flood around its foot, covered in the forest the
# Generator's seeds have already grown. Young trees crowd the colossus, the tallest nearest it and
# still only a fraction of its height; lower trees and shrubs step down toward the shore, and weeds and
# grass fringe the waterline. The scale of that forest is what makes the World Tree read as colossal.
irnd = random.Random(91)
far.append('<!-- pale air lying at the World Tree\'s foot behind its island, so the young forest stands against it in silhouette --><g filter="url(#soft6)">%s</g>' % ''.join(
    '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#3d4a58" opacity="%s"/>' % (f(x), f(y), f(rx), f(ry), f(op)) for x, y, rx, ry, op in (
        (1010, 372, 120, 16, .5), (1150, 366, 130, 20, .55), (1290, 362, 150, 22, .45), (1430, 366, 140, 20, .55), (1530, 372, 80, 16, .45))))
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
    h = .45 * lerp(52, 5, d ** .8) * lerp(.35, 1, min(1, shore * 2.2)) * irnd.uniform(.55, 1.15) * (1.3 if irnd.random() < .07 else 1)  # the understory: low, so the young trees stand clear of it
    if h > 14 and irnd.random() < .6:
        plants.append((y, 'tree', x, h))
    elif h > 6 and irnd.random() < .5:
        plants.append((y, 'shrub', x, h))
    elif irnd.random() < .25:
        plants.append((y, 'weed', x, h))
for x in range(934, W + 20, 5):
    plants.append((isl_front(x) - .5, 'grass', x + irnd.uniform(-1.5, 1.5), irnd.uniform(2, 4)))
yrnd = random.Random(105)
for j, xx in enumerate((950, 962, 1016, 1068, 1078, 1092, 1150, 1180, 1204, 1004, 1370, 1384, 1420, 1470, 1486, 1532, 1110, 1446)):
    x = xx + yrnd.uniform(-5, 5)  # in loose groups with gaps between, some standing back in the haze and some forward
    y = lerp(isl_back(x), isl_front(x), yrnd.uniform(.1, .85))
    d = min(1, abs(x - TX) / 560)
    plants.append((y, 'young', x, lerp(46, 30, d) * yrnd.uniform(.7, 1.1)))
plants.sort()
veg = []
MIST_ROWS = [HZ - 4, HZ - 1, HZ + 2]  # mist settles between the rows of the forest, so the back rows stand behind a veil
mist_i = 0
for (y, kind, x, h) in plants:
    while mist_i < len(MIST_ROWS) and y > MIST_ROWS[mist_i]:
        veg.append('<!-- mist between the rows --><rect x="930" y="%s" width="%d" height="%s" fill="#2c3844" opacity=".36" filter="url(#soft6)"/>' % (f(MIST_ROWS[mist_i] - 16), W - 900, f(18)))
        mist_i += 1
    base = haze(mix('#162219', '#223829', irnd.random()), y, x)
    lit = haze(mix('#28402d', '#355036', irnd.random()), y, x)
    if kind == 'young':
        # a young tree standing clear of the understory, dark against the pale air behind: a tree fern, a spire,
        # or a broadleaf whose trunk forks into limbs carrying separate clumps with sky between them
        tk = haze('#0a0f0c', y, x)
        crown = haze(mix('#122017', '#1c3122', yrnd.random()), y, x)
        top = haze(mix('#2a4430', '#365539', yrnd.random()), y, x)
        form = ('fern', 'spire', 'broad')[int(yrnd.random() * 3)]
        lean = yrnd.uniform(-.05, .05) * h
        if form == 'fern':
            tx_, ty_ = x + lean, y - h
            v_ = '<path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none"/>' % (f(x), f(y), f(x - lean * .3), f(y - h * .5), f(tx_), f(ty_), tk, f(max(.9, h * .035)))
            for a_ in (-160, -138, -116, -96, -80, -60, -40, -18):
                a = math.radians(a_ + yrnd.uniform(-6, 6))
                L = h * yrnd.uniform(.3, .42)
                ex, ey = tx_ + math.cos(a) * L, ty_ + math.sin(a) * L * .35 + L * .5  # out, up, and drooping at the tip
                cx_, cy_ = tx_ + math.cos(a) * L * .5, ty_ + math.sin(a) * L * .7 - L * .08
                v_ += '<path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round"/>' % (f(tx_), f(ty_), f(cx_), f(cy_), f(ex), f(ey), crown, f(max(.8, h * .038)))
            veg.append(v_)
        elif form == 'spire':
            tiers = ''.join('<polygon points="%s"/>' % pts([(x + lean * lo - h * w, y - h * lo), (x + lean * hi, y - h * hi), (x + lean * lo + h * w, y - h * lo)])
                            for w, lo, hi in ((.15, .26, .52), (.13, .38, .64), (.1, .5, .76), (.075, .62, .88), (.05, .74, 1.02)))
            veg.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/><g fill="%s">%s</g>' % (f(x), f(y), f(x + lean * .3), f(y - h * .4), tk, f(max(.8, h * .04)), crown, tiers))
        else:
            fork = (x + lean * .45, y - h * .4)
            limbs = [(fork[0] + h * dx, y - h * dy) for dx, dy in ((-.15, .66), (.02, .8), (.16, .64))]
            v_ = '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/>' % (f(x), f(y), f(fork[0]), f(fork[1]), tk, f(max(.9, h * .045)))
            v_ += ''.join('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (f(fork[0]), f(fork[1]), f(lx), f(ly + h * .05), tk, f(max(.6, h * .025))) for lx, ly in limbs)
            for lx, ly in limbs:
                cl = [(lx + yrnd.uniform(-.1, .1) * h, ly + yrnd.uniform(-.09, .06) * h, h * yrnd.uniform(.06, .1)) for _ in range(9)]
                v_ += ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(bx), f(by), f(r), crown) for bx, by, r in cl)
                v_ += ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity=".55"/>' % (f(bx - r * .2), f(by - r * .35), f(r * .55), top) for bx, by, r in cl[:2])
            veg.append(v_)
        continue
    if kind == 'tree':
        if irnd.random() < .5:
            # a broadleaf: a thin trunk and a ragged crown of small clumps, taller than wide, lit a little on its upper side
            cy_ = y - h * .68
            blobs = [(x + irnd.uniform(-.2, .2) * h, cy_ + irnd.uniform(-.28, .2) * h, h * irnd.uniform(.08, .15)) for _ in range(4)]
            blobs += [(x + irnd.uniform(-.2, .2) * h, cy_ + irnd.uniform(-.28, .2) * h, h * irnd.uniform(.08, .15)) for _ in range(3)]
            veg.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/>' % (f(x), f(y), f(x), f(cy_), haze('#0f1512', y), f(max(.6, h * .045))) +
                       ''.join('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(bx), f(by), f(r), base) for bx, by, r in blobs) +
                       '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity=".4"/>' % (f(x - h * .05), f(cy_ - h * .16), f(h * .09), lit))
        else:
            # a conifer: stacked ragged tiers narrowing to a spire
            tiers = ''.join('<polygon points="%s"/>' % pts([(x - h * w, y - h * lo), (x, y - h * hi), (x + h * w, y - h * lo)]) for w, lo, hi in ((.15, .16, .58), (.11, .38, .8), (.07, .6, 1.04)))
            veg.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s"/><g fill="%s">%s</g>' % (f(x), f(y), f(x), f(y - h * .3), haze('#0f1512', y), f(max(.6, h * .04)), base, tiers))
    elif kind == 'shrub':
        veg.append(''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(x + dx * h), f(y - h * .35), f(h * .38), f(h * .32), base) for dx in (-.25, .2)) +
                   '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".5"/>' % (f(x - h * .05), f(y - h * .5), f(h * .22), f(h * .16), lit))
    else:
        n_ = 3 if kind == 'weed' else 2
        veg.append('<g stroke="%s" stroke-width=".8" fill="none" stroke-linecap="round">%s</g>' % (base if kind == 'weed' else haze('#3a5a34', y), ''.join(
            '<path d="M%s %s q %s %s %s %s"/>' % (f(x), f(y), f(a * .3), f(-h * .6), f(a), f(-h)) for a in [irnd.uniform(-3, 3) for _ in range(n_)])))
defs.append('<g id="isleVeg" filter="url(#leafEdge)">%s</g>' % ''.join(veg))
isle.append('<use href="#isleVeg"/>')
# pods glowing here and there in the young forest
for i in range(26):
    x = irnd.uniform(940, W - 20)
    y = irnd.uniform(isl_back(x), isl_front(x)) - irnd.uniform(3, 16) * max(.2, 1 - abs(x - TX) / 560)
    isle.append('<circle cx="%s" cy="%s" r="1.3" fill="url(#glowPod)" opacity=".35"/><circle cx="%s" cy="%s" r=".45" fill="%s" opacity=".75"/>' % (f(x), f(y), f(x), f(y), GLOW_MID))
isle.append('<polyline points="%s" fill="none" stroke="#b8c8cc" stroke-width="1" opacity=".25" filter="url(#soft2)"/>' % pts([(x, y + 1.5) for x, y in ISL_FRONT]))
far.append('<!-- the World Tree\'s island: the young forest its seeds have grown, tall trees crowding its foot and stepping down to shrubs, weeds and grass at the waterline -->' + ''.join(isle))
# the island and the foot of the trunk mirrored in the flood below the shore, darker than the water and broken by the ripples
ISL_MIRROR = 401
defs.append('<clipPath id="isleReflClip" clipPathUnits="userSpaceOnUse"><polygon points="%s"/></clipPath>' % pts(ISL_FRONT + [(W + 30, 452), (930, 452)]))
lin([(0, '#fff', 1), (.25, '#fff', .85), (1, '#fff', .15)], id='isleReflFade')
defs.append('<mask id="isleReflMask" x="0" y="0" width="1" height="1" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#isleReflFade)"/></mask>')  # a user-space mask here blanked the whole reflection in Chrome
far.append('<!-- the island mirrored in the flood --><g mask="url(#isleReflMask)"><g clip-path="url(#isleReflClip)"><g filter="url(#reflect)" opacity=".8"><g transform="translate(0 %d) scale(1 -1)"><polygon points="%s" fill="#0a100e"/><use href="#isleVeg"/></g></g></g></g>' % (
    2 * ISL_MIRROR, pts(ISL_FRONT + ISL_BACK)))
far.append('<!-- mist lying on the far water, in drifts --><g filter="url(#soft)">%s</g>' % ''.join(
    '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#3a4652" opacity="%s"/>' % (x, y, rx, ry, f(op)) for x, y, rx, ry, op in (
        (180, 386, 260, 9, .35), (520, 389, 300, 8, .3), (840, 384, 220, 10, .28), (1100, 391, 260, 7, .22), (1420, 388, 200, 8, .2))))
wrnd2 = random.Random(101)
swell = []
for yb in (HZ + 4, HZ + 8, HZ + 13, HZ + 19, HZ + 26):  # the farther half only: the water near the machine stays calm
    k = (yb - HZ) / 50
    x = wrnd2.uniform(-40, 40)
    while x < 900:
        L = wrnd2.uniform(40, 150) * (.5 + k)
        fade = min(1, max(0, (930 - x) / 150))  # the rough water feathers out toward the island rather than stopping
        if not (60 < x < 520 and yb > 420) and wrnd2.random() < fade:
            y_ = yb + wrnd2.uniform(-1.5, 1.5)
            # the dark face of the swell under its crest, and the crest breaking white along it
            swell.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#070c10" opacity="%s"/>' % (f(x + L / 2), f(y_ + 1.4 + 2 * k), f(L / 2), f(1.2 + 3 * k), f((.4 + .2 * k) * fade)))
            swell.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#b8c6ce" opacity="%s"/>' % (f(x + L * wrnd2.uniform(.35, .6)), f(y_), f(L * wrnd2.uniform(.18, .4)), f(.5 + 1.2 * k), f(wrnd2.uniform(.3, .55) * fade)))
        x += L + wrnd2.uniform(10, 60)
far.append('<!-- a storm sea out in the distance: dark swell faces with their crests breaking white -->'
           '<g filter="url(#foam)">%s</g>' % ''.join(swell))
far.append('<!-- horizon haze: the last of the water dissolving into the rain --><rect x="0" y="%d" width="%d" height="30" fill="#2e3945" opacity=".6" filter="url(#soft6)"/>' % (HZ - 14, W))

# ------------------------------------------------------------------ land layer (static): mid plain, shelf, the Generator, growth, near rock
land = []
lin([(0, '#18222a', 1), (1, WATER_NEAR, 1)], 0, 470, 0, 640, units=True, id='midWater')
land.append('<!-- the mid plain: floodwater across the middle ground --><rect x="0" y="470" width="%d" height="%d" fill="url(#midWater)"/>' % (W, H - 470))
for _ in range(50):  # the old sheen lines' draws, kept so every later random draw lands where it did
    rnd.uniform(478, 640), rnd.uniform(-40, W), rnd.uniform(40, 200), rnd.uniform(.08, .22)
lin([(0, '#fff', 0), (.2, '#fff', .9), (1, '#fff', 1)], 0, 470, 0, H, units=True, id='midRip')
land.append('<!-- the near flood broken by wind and rain: long troughs and crests, coarser toward the viewer -->'
            '<rect x="0" y="470" width="%d" height="%d" fill="url(#midRip)" filter="url(#rippleMid)" opacity=".55"/>' % (W, 60) +
            '<rect x="0" y="500" width="%d" height="%d" fill="url(#midRip)" filter="url(#rippleNear)" opacity=".75"/>' % (W, H - 500) +
            '<rect x="0" y="480" width="%d" height="%d" fill="url(#midRip)" filter="url(#troughNear)" opacity=".7"/>' % (W, H - 480))
# the Generator's light on the broken water beyond the shelf: the ripple faces that look toward it catch it
rad([(0, '#fff', 1), (.35, '#fff', .55), (1, '#fff', 0)], id='litFall')
defs.append('<mask id="litWaterMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="560" cy="530" rx="380" ry="110" fill="url(#litFall)"/></mask>' % (W, H))
land.append('<!-- the ripples beyond the shelf catching the Generator light, fading with distance from it -->'
            '<g mask="url(#litWaterMask)"><rect x="0" y="466" width="1000" height="%d" fill="#fff" filter="url(#rippleLit)" opacity=".55"/></g>' % (H - 466))
# slabs of scoured rock in the mid plain
SLABS = [(800, 604, 60, 7), (962, 600, 48, 6), (880, 506, 90, 9), (1010, 488, 70, 7), (1180, 520, 120, 11), (1300, 486, 60, 6), (1440, 502, 90, 8), (160, 492, 80, 7), (300, 470, 60, 5), (1060, 552, 80, 8), (760, 530, 60, 7)]
ISLETS = [(566, 448, 30, 3.4), (664, 438, 22, 2.8), (752, 456, 36, 4), (846, 444, 26, 3.2)]  # small rocks out in the water at left, each with growth on it
SLABS += ISLETS
sl = []
for (x, y, rx, ry) in SLABS:
    p = [(x - rx, y), (x - rx * .8, y - ry * .7), (x - rx * .2, y - ry), (x + rx * .5, y - ry * .8), (x + rx, y - ry * .1), (x + rx * .9, y + ry * .3), (x - rx * .7, y + ry * .35)]
    k_ = depth_k(y) if 'depth_k' in globals() else (y - HZ) / (H - HZ)
    # its dark reflection under it, smeared down by the ripples
    sl.append('<polygon points="%s" fill="#06090b" opacity=".55" filter="url(#reflect)"/>' % pts([(px, 2 * (y + ry * .35) - py) for px, py in p]))
    sl.append('<polygon points="%s" fill="%s"/><polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".5"/>' % (pts(p), ROCK, pts(p)))
    # wet on top: the upper face catches the sky only in patches
    sl.append('<polyline points="%s" fill="none" stroke="#56646e" stroke-width="%s" opacity=".6" stroke-linejoin="round"/>' % (pts(p[1:4]), f(lerp(.7, 1.4, k_))))
    if 700 < x < 1120:  # the seeds' own light on the nearer slabs, where the first growth takes hold
        sl.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#glowWash)" opacity=".35"/>' % (f(x - rx * .3), f(y - ry * .6), f(rx * .8), f(ry * 1.4)))
    # the flood lapping at its foot: a broken pale line where the water meets the rock
    sl.append('<polyline points="%s" fill="none" stroke="#9fb2b8" stroke-width="%s" opacity=".4" filter="url(#foam)"/>' % (pts([p[0], p[6], p[5], p[4]]), f(lerp(.8, 1.6, k_))))
    # the current: foam piles on the upstream (left) end, a wake trails off the downstream end
    sl.append('<path d="M%s %s Q %s %s %s %s" stroke="#9fb2b8" stroke-width="%s" fill="none" opacity=".3" stroke-linecap="round" filter="url(#foam)"/>' % (
        f(x - rx * .6), f(y - ry * 1.1), f(x - rx - 16), f(y), f(x - rx * .5), f(y + ry * .7), f(2.2 + ry / 4)))
    sl.append('<path d="M%s %s L %s %s M%s %s L %s %s" stroke="#8ea2aa" stroke-width="%s" fill="none" opacity=".35" stroke-linecap="round" filter="url(#foam)"/>' % (
        f(x + rx), f(y), f(x + rx * 1.9), f(y - ry * .6), f(x + rx * .9), f(y + ry * .3), f(x + rx * 2), f(y + ry * 1.2), f(.9 + ry / 10)))
land.append('<!-- flat slabs of scoured rock in the floodwater --><g>%s</g>' % ''.join(sl))
irnd_ = random.Random(119)
land.append('<!-- the small rocks out in the water at left, each with seeds caught and sprouting on it -->%s' % ''.join(
    rock_growth(x, y, rx * .75, ry, depth_k(y) if 'depth_k' in globals() else (y - HZ) / (H - HZ), irnd_, crest=False) for x, y, rx, ry in ISLETS))

VAT_X0, VAT_X1 = GX - 6 - 30, GX - 6 + 30  # the vat's glass, in the machine's frame
# the shelf: a broad smooth dome of wet black rock under the machine, running out into the flood
shelf = [(-20, 530), (40, 506), (110, 494), (180, 490), (GX, GBASE - 4), (400, 490), (470, 496), (540, 510), (600, 530), (650, 552), (690, 574), (720, 596), (720, 612), (-20, 612)]
lin([(0, '#1c2524', 1), (.35, ROCK, 1), (1, '#070a0a', 1)], 0, GBASE, 0, 620, units=True, id='shelfG')
land.append('<!-- the Generator light on the floodwater beyond the shelf --><ellipse cx="760" cy="598" rx="70" ry="18" fill="url(#glowWash)" opacity=".4" filter="url(#soft6)"/>')
rock_tex('shelfRock', .018, .04, 81, 4, '#9aa6ac', '#cfe86a', '<fePointLight x="%s" y="%s" z="90"/>' % (f(GS(GX - 6, 353)[0]), f(GS(GX - 6, 353)[1] + 60)), 1.6, .55)
land.append('<!-- the shelf: a smooth dome of scoured rock, pitted and wet, glinting where the vat light catches it --><polygon points="%s" fill="url(#shelfG)" filter="url(#shelfRock)"/>' % pts(shelf))
land.append('<polyline points="%s" fill="none" stroke="#3c4a47" stroke-width="1.4" opacity=".5"/>' % pts(shelf[1:12]))
land.append('<!-- the Generator light catching the shelf rim --><polyline points="%s" fill="none" stroke="%s" stroke-width="3" opacity=".22" filter="url(#soft2)"/>' % (pts(shelf[4:10]), GLOW_MID))
land.append('<!-- the shelf sinking into the floodwater --><ellipse cx="560" cy="604" rx="220" ry="14" fill="#141e26" filter="url(#soft6)"/>')
# the Generator light on the wet rock: strongest at the machine's foot, falling off over the dome and stopping at its edge
defs.append('<clipPath id="shelfClip" clipPathUnits="userSpaceOnUse"><polygon points="%s"/></clipPath>' % pts(shelf))
rad([(0, GLOW_MID, .16), (.25, GLOW_MID, .06), (.6, GLOW_EDGE, .015), (1, GLOW_EDGE, 0)], cx=GX + 60, cy=GBASE + 2, r=380, units=True, id='shelfLight')
land.append('<!-- the Generator light falling over the wet rock of the shelf --><g clip-path="url(#shelfClip)"><ellipse cx="%d" cy="%d" rx="380" ry="120" fill="url(#shelfLight)"/></g>' % (GX + 60, GBASE + 2))
defs.append('<mask id="shelfLitMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%d" cy="%d" rx="330" ry="80" fill="url(#litFall)"/></mask>' % (W, H, GX + 70, GBASE + 20))
land.append('<!-- wet rock glinting where the light falls on it --><g mask="url(#shelfLitMask)"><polygon points="%s" fill="#fff" filter="url(#wetFleck)" opacity=".2"/></g>' % pts(shelf))
# the lit window mirrored in the wet rock below the machine, smeared down the dome
lin([(0, GLOW_MID, 0), (.45, GLOW_MID, .28), (.8, GLOW_CORE, .2), (1, GLOW_MID, .08)], 0, 506, 0, 612, units=True, id='wetRefl')
lin([(0, '#fff', 0), (.4, '#fff', .9), (.55, '#fff', 1), (1, '#fff', 0)], 0, 0, 1, 0, id='sideFade')
defs.append('<mask id="wetReflMask" x="0" y="0" width="1" height="1" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#sideFade)"/></mask>')
land.append('<!-- the lit window mirrored in the wet rock under the machine --><g clip-path="url(#shelfClip)"><g mask="url(#wetReflMask)"><rect x="%s" y="506" width="%s" height="106" fill="url(#wetRefl)" filter="url(#reflectWet)"/></g></g>' % (
    f(GS(VAT_X0, 0)[0] - 40), f((VAT_X1 - VAT_X0) * GSC + 80)))
land.append('<!-- a faint tail of that light running on down the dome toward the shelf edge --><g clip-path="url(#shelfClip)"><ellipse cx="420" cy="560" rx="170" ry="26" fill="url(#glowWash)" opacity=".35" transform="rotate(14 420 560)" filter="url(#soft)"/></g>')
rad([(0, '#000', 0), (.55, '#000', .15), (1, '#000', .7)], cx=GX + 40, cy=GBASE, r=420, units=True, id='shelfEdgeDark')
land.append('<!-- the dome darker toward its edges, turning away from the light --><polygon points="%s" fill="url(#shelfEdgeDark)"/>' % pts(shelf))
land.append('<!-- the foot of the machine pressing on the rock: a dark contact shadow --><ellipse cx="%d" cy="%d" rx="232" ry="6" fill="#000" opacity=".75" filter="url(#soft2)"/>' % (GX, GBASE + 8))
land.append('<!-- the halo of the Generator light in the rain around it, local: it dies out well below the cloud --><ellipse cx="%d" cy="352" rx="215" ry="120" fill="url(#glowWash)" opacity=".3"/>' % GX)

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
LIGHT_AT = GS(*CORE)  # where the leaves near the machine take their light from
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
rock_tex('plateMetal', .012, .02, 91, .8, '#a4b0b6', '#b8c8d0', SKY_LIGHT % 50, 2.1, .18, 60)  # sheet steel: dented, pitted, wet
gen.append('<polygon points="%s" fill="url(#plateG)" filter="url(#plateMetal)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (pts(ANNEX), pts(ANNEX[:4]), METAL_WET))
gen.append('<g stroke="#0b0f10" stroke-width="2.2">%s</g>' % ''.join('<line x1="%d" y1="%d" x2="%d" y2="%d"/>' % (GX - 160, y, GX - 108, y) for y in range(386, 436, 7)))
gen.append('<circle cx="%d" cy="360" r="10" fill="#1f272a" stroke="%s" stroke-width="1.6"/><circle cx="%d" cy="360" r="7" fill="#c9d6c8" opacity=".25"/>' % (GX - 134, METAL_WET, GX - 134))
gen.append(''.join('<circle cx="%d" cy="446" r="2" fill="#0b0f10" stroke="#3a4649" stroke-width=".6"/>' % (GX - 156 + 10 * i) for i in range(3)))
gen.append('<!-- the relief valve --><rect x="%d" y="304" width="8" height="32" fill="#1c2427"/><rect x="%d" y="298" width="16" height="8" fill="#2a3437" stroke="%s" stroke-width=".6"/><line x1="%d" y1="314" x2="%d" y2="314" stroke="#1c2427" stroke-width="3"/><circle cx="%d" cy="314" r="6" fill="#141a1c" stroke="#3a4649" stroke-width="1.6"/><path d="M%d 309 V 319 M%d 314 H %d" stroke="#3a4649" stroke-width="1"/><circle cx="%d" cy="314" r="1.4" fill="#56666b"/>' % (
    GX - 154, GX - 158, METAL_WET, GX - 146, GX - 140, GX - 140, GX - 140, GX - 145, GX - 135, GX - 140))
# cables from the annex looping down to clamps on the rock
for (x0, y0, x1, y1, sag) in ((GX - 168, 372, GX - 212, 494, 60), (GX - 168, 400, GX - 236, 500, 44), (GX - 166, 424, GX - 200, 492, 30)):
    d = 'M%d %d C %d %d, %d %d, %d %d' % (x0, y0, x0 - 24, y0 + sag, x1 + 6, y1 - 26, x1, y1)
    gen.append('<path d="%s" stroke="#070a0b" stroke-width="3.4" fill="none"/><path d="%s" stroke="%s" stroke-width=".7" fill="none" opacity=".6" transform="translate(-.8 -.8)"/>' % (d, d, METAL_WET))
    gen.append('<rect x="%d" y="%d" width="9" height="4" fill="#1c2427" stroke="#3a4649" stroke-width=".6"/>' % (x1 - 4, y1 - 2))
# the housing: riveted plate columns, girder bands, the seams between plates leaking light
gen.append('<polygon points="%s" fill="url(#plateG)" filter="url(#plateMetal)"/>' % pts(HOUSING))
for i, (x0, x1) in enumerate(((GX - 100, GX - 60), (GX - 60, GX - 20), (GX - 20, GX + 20), (GX + 20, GX + 60), (GX + 60, GX + 92))):
    gen.append('<rect x="%d" y="262" width="%d" height="194" fill="%s" opacity="%s"/>' % (x0, x1 - x0, ('#000', '#56666b')[i % 2], ('.18', '.06')[i % 2]))
SEAMS = [(276, 1.0), (422, .45), (442, 1.0)]  # y, how much of the seam still glows (the second has gone half dark)
# a seam's light is brightest where the plates have parted most and thins toward its ends, with a soft bloom
lin([(0, GLOW_MID, 0), (.15, GLOW_MID, .5), (.5, GLOW_MID, 1), (.85, GLOW_MID, .55), (1, GLOW_MID, 0)], GX - 90, 0, GX + 82, 0, units=True, id='seamG')
for y, frac in SEAMS:
    gen.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#0a0e0f" stroke-width="3.4"/><line x1="%d" y1="%s" x2="%s" y2="%s" stroke="url(#seamG)" stroke-width="3" opacity=".22" filter="url(#soft2)"/><line x1="%d" y1="%s" x2="%s" y2="%s" stroke="url(#seamG)" stroke-width=".9" opacity=".8"/>' % (
        GX - 98, y, GX + 90, y, GX - 90, f(y + .6), f(GX - 90 + 172 * frac), f(y + .6), GX - 90, f(y + .6), f(GX - 90 + 172 * frac), f(y + .6)))
for y in (300, 406):
    gen.append('<rect x="%d" y="%d" width="196" height="10" fill="#0e1315"/><line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (GX - 102, y - 5, GX - 102, y - 5, GX + 94, y - 5, METAL_WET) +
               ''.join('<circle cx="%d" cy="%d" r="1.3" fill="#56666b"/>' % (x, y) for x in range(GX - 94, GX + 92, 14)))
for x in (GX - 60, GX - 20, GX + 20, GX + 60):
    gen.append('<line x1="%d" y1="258" x2="%d" y2="456" stroke="#0b0f10" stroke-width="4"/><line x1="%s" y1="258" x2="%s" y2="456" stroke="%s" stroke-width=".8" opacity=".5"/>' % (x, x, f(x - 1.8), f(x - 1.8), METAL_WET) +
               ''.join('<circle cx="%d" cy="%d" r="1.2" fill="#56666b"/>' % (x, y) for y in range(268, 452, 22) if not (y in (296, 312, 400, 412))))
gen.append('<polygon points="%s" fill="none" stroke="%s" stroke-width="1.6" opacity=".6"/>' % (pts(HOUSING), METAL_WET))
# a first prototype, not a finished product: a patch plate in another metal
gen.append('<!-- a replaced plate in a different metal --><rect x="%d" y="426" width="34" height="14" fill="#2f3a3a"/><rect x="%d" y="426" width="34" height="14" fill="none" stroke="#56666b" stroke-width=".6" opacity=".7"/>' % (GX + 24, GX + 24) +
           ''.join('<circle cx="%d" cy="%d" r="1" fill="#6b7a7e"/>' % (x, y) for x in (GX + 27, GX + 55) for y in (429, 437)))
SPLIT = [(GX + 70, 318), (GX + 75, 344), (GX + 78, 344), (GX + 73, 318)]
CRACK = [(GX + 71.5, 319), (GX + 72.5, 325), (GX + 74, 331), (GX + 75, 337), (GX + 76.5, 343)]
# (a split plate leaking light read as a glitch in the render, a green streak on the housing, and was cut: Nick 2026-09-23)
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
# the roof housing on top, a header tank lying on it with its breather
gen.append('<polygon points="%s" fill="url(#plateG)" filter="url(#plateMetal)"/><polyline points="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".6"/>' % (pts(TURRET), pts(TURRET[:3]), METAL_WET))
# the header tank: a pressure cylinder with dished ends, lying on two saddles on the roof, holding the medium the vat
# is fed from; its breather rises from the far end as a stack that turns down in a gooseneck against the rain
TK0, TK1 = GX - 62, GX + 34  # the tank's ends
gen.append('<!-- the saddles under the tank --><polygon points="%s" fill="#141a1c"/><polygon points="%s" fill="#141a1c"/>' % (
    pts([(TK0 + 10, 216), (TK0 + 16, 204), (TK0 + 30, 204), (TK0 + 36, 216)]), pts([(TK1 - 36, 216), (TK1 - 30, 204), (TK1 - 16, 204), (TK1 - 10, 216)])))
lin([(0, '#3a474b', 1), (.3, '#222b2e', 1), (.75, '#141a1c', 1), (1, '#0c1011', 1)], 0, 186, 0, 214, units=True, id='tankG')
gen.append('<!-- the header tank --><rect x="%d" y="186" width="%d" height="28" fill="url(#tankG)"/>' % (TK0, TK1 - TK0) +
           '<ellipse cx="%d" cy="200" rx="6" ry="14" fill="#1a2225"/><ellipse cx="%d" cy="200" rx="6" ry="14" fill="#1f282b"/>' % (TK0, TK1) +
           ''.join('<rect x="%d" y="185" width="4" height="30" fill="#10161a"/>' % x for x in (TK0 + 16, (TK0 + TK1) // 2 - 2, TK1 - 20)) +
           '<line x1="%d" y1="188.5" x2="%d" y2="188.5" stroke="%s" stroke-width="1.1" opacity=".55"/>' % (TK0 + 2, TK1 - 2, METAL_WET) +
           '<!-- a manway on its crown --><rect x="%d" y="181" width="14" height="6" fill="#1c2427"/><rect x="%d" y="179" width="18" height="3" fill="#2a3437"/>' % (TK0 + 34, TK0 + 32))
SX = GX + 60  # the breather stack
gen.append('<!-- the breather: a pipe from the tank end into a stack that turns down in a gooseneck --><rect x="%d" y="196" width="%d" height="8" fill="#141a1c"/><rect x="%d" y="194" width="4" height="12" fill="#2a3437"/>' % (TK1 + 4, SX - TK1 - 4, SX - 8) +
           '<path d="M%d 216 V 172 A 9 9 0 0 1 %d 172 V 182" fill="none" stroke="#141a1c" stroke-width="9"/><path d="M%d 214 V 172 A 11.5 11.5 0 0 1 %d 170" fill="none" stroke="%s" stroke-width="1" opacity=".55"/>' % (SX, SX + 18, SX - 3.5, SX + 11, METAL_WET) +
           '<rect x="%d" y="180" width="13" height="4" fill="#2a3437"/><rect x="%d" y="209" width="15" height="4" fill="#2a3437"/>' % (SX + 12, SX - 7))
gen.append(''.join('<circle cx="%d" cy="232" r="1.3" fill="#56666b"/>' % x for x in range(GX - 60, GX + 60, 12)))
# Weathering: a prototype run through storm after storm. Rain runoff has left grime in vertical streaks,
# rust blooms toward the foot and bleeds in runs from the rivets, and the plates shine wet in streaks.
MACHINE_POLYS = (FOUND1, FOUND2, HOUSING, ANNEX, TURRET)
defs.append('<clipPath id="machineClip" clipPathUnits="userSpaceOnUse">%s<rect x="%d" y="188" width="100" height="28" rx="14"/></clipPath>' % (''.join('<polygon points="%s"/>' % pts(p) for p in MACHINE_POLYS), GX - 64))
lin([(0, '#fff', .35), (.6, '#fff', .7), (1, '#fff', 1)], 0, 180, 0, 496, units=True, id='rustRise')
wrnd = random.Random(53)
runs = []
rivets_ = [(x, y) for x in (GX - 60, GX - 20, GX + 20, GX + 60) for y in range(268, 452, 22)] + [(x, y) for y in (300, 406) for x in range(GX - 94, GX + 92, 14)] + [(x, 464) for x in range(GX - 158, GX + 160, 22)]
for (x, y) in rivets_:
    if wrnd.random() < .45 and not (VAT_X0 - 14 < x < VAT_X1 + 14 and 268 < y < 446):
        ln = wrnd.uniform(5, 26)
        runs.append('<rect x="%s" y="%s" width="%s" height="%s" fill="url(#rustRun)" opacity="%s"/>' % (f(x - .6), f(y + 1), f(wrnd.uniform(.9, 1.6)), f(ln), f(wrnd.uniform(.25, .55))))
lin([(0, '#553a26', 1), (.5, '#40302a', .5), (1, '#3a2c24', 0)], id='rustRun')
gen.append('<!-- weathering: grime streaks, rust toward the foot and in runs from the rivets, wet sheen in streaks -->'
           '<g clip-path="url(#machineClip)"><rect x="%d" y="180" width="380" height="318" fill="#fff" filter="url(#grimeStreak)" opacity=".28"/>'
           '<rect x="%d" y="180" width="380" height="318" fill="url(#rustRise)" filter="url(#rustBlot)" opacity=".4"/>'
           '<rect x="%d" y="180" width="380" height="318" fill="#fff" filter="url(#wetStreak)" opacity=".22"/>'
           '<rect x="%d" y="180" width="380" height="318" fill="#fff" filter="url(#plateDark)" opacity=".6"/><rect x="%d" y="180" width="380" height="318" fill="#fff" filter="url(#plateLight)" opacity=".5"/>'
           '<rect x="%d" y="420" width="380" height="78" fill="url(#footShade)"/><rect x="%d" y="440" width="380" height="58" fill="#fff" filter="url(#rustBlot)" opacity=".55"/>%s</g>' % (
               GX - 192, GX - 192, GX - 192, GX - 192, GX - 192, GX - 192, GX - 192, ''.join(runs)))
# each plate a little different in tone: broad low-frequency variation, darker and lighter
noise_tex('plateDark', .012, .02, 62, '#000000', 2.6, -1.25, 3)
noise_tex('plateLight', .014, .022, 63, '#5a6a70', 2.6, -1.3, 3)
lin([(0, '#000', 0), (1, '#000', .45)], 0, 420, 0, 498, units=True, id='footShade')
# wet highlights along the upper edges that face the sky: the girder bands, the roof, the tank
gen.append('<!-- wet highlights on the upper edges --><g stroke="#a9bcc4" fill="none" stroke-linecap="round">'
           '<line x1="%d" y1="295.4" x2="%d" y2="295.4" stroke-width=".7" opacity=".35"/><line x1="%d" y1="401.4" x2="%d" y2="401.4" stroke-width=".7" opacity=".3"/>'
           '<polyline points="%s" stroke-width=".9" opacity=".4"/><path d="M%d 187.2 H %d" stroke-width="1" opacity=".45"/><polyline points="%s" stroke-width=".8" opacity=".35"/></g>' % (
               GX - 96, GX + 88, GX - 96, GX + 88, pts([(TURRET[1][0] + 2, TURRET[1][1] + .6), (TURRET[2][0] - 2, TURRET[2][1] + .6)]), GX - 52, GX + 24, pts([(ANNEX[2][0] + 2, ANNEX[2][1] + .6), (ANNEX[3][0], ANNEX[3][1] + .6)])))
# the vat's light spilling onto the metal around it: strongest on the plates beside the window, gone by the corners
rad([(0, GLOW_MID, .22), (.3, GLOW_MID, .1), (.65, GLOW_EDGE, .03), (1, GLOW_EDGE, 0)], id='vatSpill')
gen.append('<!-- the vat light spilling onto the metal around the window --><g clip-path="url(#machineClip)" style="mix-blend-mode:screen"><ellipse cx="%d" cy="%d" rx="175" ry="215" fill="url(#vatSpill)"/></g>' % CORE)
gen.append('<!-- the window frame lit from inside --><rect x="%d" y="%d" width="%d" height="%d" rx="36" fill="none" stroke="%s" stroke-width="1.6" opacity=".45"/>' % (VAT[0] - 7, VAT[1] - 7, VAT[2] + 14, VAT[3] + 14, GLOW_MID))
# no two rivets alike: a little drift in place and tone, and here and there one missing
_rv = random.Random(59)
import re as _re


def _rivet(m):
    if _rv.random() < .06:
        return ''
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(float(m.group(1)) + _rv.uniform(-.4, .4)), f(float(m.group(2)) + _rv.uniform(-.4, .4)), m.group(3), _rv.choice(('#3c484b', '#343f42', '#2c3638', '#46545a', '#3d3530', '#252e30')))


gen = [_re.sub(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="(1\.[23])" fill="#56666b"/>', _rivet, g_) for g_ in gen]
# the machine's forms in relief: its own tones read as height, so every plate, band, pipe and flange takes a
# bevel of wet light from the sky on its upper edges and a shadow under
defs.append('<filter id="machineRelief" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">'
            '<feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/><feGaussianBlur in="lum" stdDeviation="1.1" result="hb"/>'
            '<feSpecularLighting in="hb" surfaceScale="9" specularConstant=".9" specularExponent="22" lighting-color="#a9bcc6" result="s"><feDistantLight azimuth="250" elevation="38"/></feSpecularLighting>'
            '<feComposite in="s" in2="SourceAlpha" operator="in" result="si"/><feComposite in="si" in2="SourceGraphic" operator="arithmetic" k1="0" k2=".42" k3="1" k4="0"/></filter>')
land.append('<g transform="%s" filter="url(#machineRelief)">%s</g>' % (MT, ''.join(gen)))

MACHINE_SIL = ''.join('<polygon points="%s"/>' % pts(p) for p in (FOUND1, FOUND2, HOUSING, ANNEX, TURRET))
# the machine's whole outline in the scene's coordinates, cables, valve, tank, stack, gantry, gate and chute
# included: the water animated in the glow layer (whitecaps, spindrift, rain rings) lies behind the machine,
# so it is cut away wherever the machine stands
MACHINE_OUTLINE = [GS(x, y) for x, y in (
    (GX - 238, 502), (GX - 180, 380), (GX - 170, 346), (GX - 160, 334), (GX - 160, 294), (GX - 136, 294), (GX - 136, 334), (GX - 100, 334),
    (GX - 100, 262), (GX - 84, 246), (GX - 78, 248), (GX - 70, 216), (GX - 70, 184), (GX - 32, 177), (GX - 10, 177), (GX + 40, 186),
    (GX + 40, 195), (GX + 54, 195), (GX + 54, 158), (GX + 86, 158), (GX + 86, 188), (GX + 66, 188), (GX + 66, 220), (GX + 72, 246),
    (GX + 92, 262), (GX + 92, 418))] + [(422, 398), (448, 398), (448, 428), (524, 464), (533, 480), (533, 530), (-4, 530)]
# the gantry is open lattice: water shows through it, so only its steel hides what passes behind
GANTRY_STEEL = '<g stroke="#000" stroke-width="2">%s</g>' % ''.join(gan) + ''.join('<line x1="%d" y1="%d" x2="%d" y2="474" stroke="#000" stroke-width="5"/>' % (gx_, GTOP - 6, gx_) for gx_ in (GR0, GR1)) + (
    '<rect x="%d" y="246" width="%d" height="21" fill="#000"/><rect x="%d" y="%d" width="%d" height="6" fill="#000"/><circle cx="%d" cy="%d" r="5" fill="#000"/>' % (GX + 92, GR1 + 14 - GX - 92, GR0 - 4, GTOP - 8, GR1 - GR0 + 8, (GR0 + GR1) // 2, GTOP - 12))
defs.append('<mask id="behindMachine" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/><polygon points="%s" fill="#000"/><g transform="%s">%s</g></mask>' % (
    W, H, W, H, pts(MACHINE_OUTLINE), MT, GANTRY_STEEL))

# the sluice at the machine's foot and the chute running down from it into the water behind the shelf
CHUTE0, CHUTE1 = (436, 436), (520, 474)  # the gate, and the chute's lip
OUTFALL = (540, 482)  # where the seeds drop into the flood, carried a little past the lip
_ca = math.atan2(CHUTE1[1] - CHUTE0[1], CHUTE1[0] - CHUTE0[0])
_nx, _ny = -math.sin(_ca), math.cos(_ca)
trough = [(CHUTE0[0] + _nx * 9, CHUTE0[1] + _ny * 9), (CHUTE1[0] + _nx * 9, CHUTE1[1] + _ny * 9), (CHUTE1[0] - _nx * 9, CHUTE1[1] - _ny * 9), (CHUTE0[0] - _nx * 9, CHUTE0[1] - _ny * 9)]
land.append('<!-- the chute\'s legs on the shelf --><line x1="470" y1="452" x2="468" y2="500" stroke="#0b0f10" stroke-width="4"/><line x1="505" y1="468" x2="504" y2="508" stroke="#0b0f10" stroke-width="4"/>'
            '<!-- the chute: a trough of riveted plate, dark inside, its far lip and its near wall catching the light --><polygon points="%s" fill="#0a0e0f"/><polygon points="%s" fill="#232d31"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#56666b" stroke-width="1.2"/>'
            '<polygon points="%s" fill="#1a2124"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#8a9aa0" stroke-width="1.2" opacity=".85"/>' % (
                pts(trough), pts([trough[3], trough[2], (trough[2][0] + _nx * 5, trough[2][1] + _ny * 5), (trough[3][0] + _nx * 5, trough[3][1] + _ny * 5)]), f(trough[3][0]), f(trough[3][1]), f(trough[2][0]), f(trough[2][1]),
                pts([trough[0], trough[1], (trough[1][0], trough[1][1] + 6), (trough[0][0], trough[0][1] + 6)]), f(trough[0][0]), f(trough[0][1]), f(trough[1][0]), f(trough[1][1])) +
            ''.join('<circle cx="%s" cy="%s" r="1" fill="#3c484b"/>' % (f(lerp(trough[0][0], trough[1][0], k / 6)), f(lerp(trough[0][1], trough[1][1], k / 6) + 3)) for k in range(1, 6)) +
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
    run_ = top_[:2 + max(0, int((x - 700) / 250))]
    for (ax, ay), (bx, by) in zip(run_, run_[1:]):
        n = max(2, int(math.hypot(bx - ax, by - ay) / 4))
        for k_ in range(n):
            if rnd.random() < .25:
                continue  # bare rock between the clumps
            t = k_ / n
            growth.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (
                f(lerp(ax, bx, t) + rnd.uniform(-1.5, 1.5)), f(lerp(ay, by, t) + rnd.uniform(-.6, .8)), f(rnd.uniform(1.6, 3.6) * (1 + ry / 20)), f(rnd.uniform(1, 2.2) * (1 + ry / 20)),
                mix(mix(mix(GREEN_DARK, GREEN, rnd.uniform(.35, .75)), '#0a1210', rnd.uniform(.05, .25)), '#1c2628', .55 * min(1, max(0, (x - 1100) / 250)) * (1 - (y - HZ) / (H - HZ)))))
    growth.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity=".6"/>' % (pts([(x - rx * .7, y + ry * .3), (x - rx * .2, y + ry * .35)]), mix(GREEN_DARK, GREEN, .5), f(1.2 + ry / 7)))
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
            f(x), f(y), f(x + (ex - x) * .3), f(ey + h * .2), f(ex), f(ey), mix(mix(mix(GREEN_DARK, GREEN, .6), GREEN_LIT, rnd.uniform(0, .18)), '#1c2628', .6 * min(1, max(0, (x - 1100) / 250)) * (1 - k)), f(lerp(.8, 1.6, k))))
land.append('<!-- low fronds among the moss --><g>%s</g>' % ''.join(fronds))
LODGED = [(812, 520), (905, 500), (960, 500), (1150, 512), (1240, 470), (1370, 498), (1188, 452), (1460, 490)]
LODGED_POD = ('<path d="M0 -26 C -2.5 -24, -5.5 -18, -5.5 -12 C -5.5 -5, -3 -.5, 0 .5 C 3 -.5, 5.5 -5, 5.5 -12 C 5.5 -18, 2.5 -24, 0 -26 Z" fill="#3f5a22"/>'
              '<path d="M-7.4 -17.6 Q -8.2 -26.4 0 -28 Q 8.2 -26.4 7.4 -17.6 Z" fill="#4d5f33"/>')
land.append('<!-- lodged pods among the growth: small acorns tipped on their sides in the moss --><g>%s</g>' % ''.join(
    '<g transform="translate(%s %s) rotate(%d) scale(.22) translate(0 13)">%s</g>' % (f(x), f(y - 2), (-72, 64, -80, 70, -66, 76, -74, 68)[i], LODGED_POD) for i, (x, y) in enumerate(LODGED)))

# The growth at the source: the machine's own seeds have taken hold all around it. Moss creeps along the
# foundation's foot, ferns and the frond plant stand in clumps at its corners and by the chute's legs, seedlings
# rise from glowing pods in front of it, and a young tree fern already stands at the shelf's left end. All of it
# lit from the vat, on the side that faces it.
src = []
srnd = random.Random(127)
for _ in range(60):
    cx_, sp_ = srnd.choice(((68, 34), (68, 34), (190, 26), (430, 40), (430, 40), (505, 18)))  # in patches, bare rock between
    x = cx_ + srnd.gauss(0, sp_)
    y = 497 + abs(srnd.gauss(0, 4)) + max(0, abs(x - GX) - 170) * .05
    lit_ = max(0, 1 - abs(x - GX) / 260)
    src.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(srnd.uniform(4, 13)), f(srnd.uniform(1.4, 3.2)), mix(mix(GREEN_DARK, GREEN, srnd.uniform(.3, .7)), GREEN_LIT, lit_ * srnd.uniform(.1, .4)), f(srnd.uniform(.6, .9))))
land_src = ['<!-- moss creeping along the foundation\'s foot --><g filter="url(#moss)">%s</g>' % ''.join(src)]
tf_x, tf_y, tf_h = 16, 503, 96  # the young tree fern at the shelf's left end
land_src.append('<!-- a young tree fern at the shelf\'s left end --><path d="M%s %s Q %s %s %s %s" stroke="#0a100c" stroke-width="3.2" fill="none" stroke-linecap="round"/>' % (
    f(tf_x), f(tf_y), f(tf_x - 4), f(tf_y - tf_h * .5), f(tf_x + 3), f(tf_y - tf_h)) +
    ''.join(draw_fern(tf_x + 3, tf_y - tf_h, a_, tf_h * .55, 7, 16, LIGHT_AT, srnd, col='#0b170e', tipc='#1c3321') for a_ in (-70, -40, -12, 16, 44, 72)))
for (x, y, n, hmax) in ((50, 500, 5, 26), (30, 507, 4, 20), (512, 507, 5, 24), (538, 516, 3, 16), (152, 503, 3, 12), (404, 503, 3, 13)):
    for j in range(n):
        a_ = lerp(-55, 55, j / max(1, n - 1)) + srnd.uniform(-10, 10)
        if srnd.random() < .5:
            land_src.append(draw_fern(x + srnd.uniform(-3, 3), y, a_, hmax * srnd.uniform(.7, 1.1), 4.2, 6, LIGHT_AT, srnd, col='#0d1a10', tipc='#2a4a2c'))
        else:
            land_src.append(draw_leaf(x + srnd.uniform(-3, 3), y, a_ * .6, hmax * srnd.uniform(.8, 1.2), hmax * .16, 5, LIGHT_AT, srnd, near=False, base='#0a130c', mid='#1a3020', tipc='#2e4c30'))
for (x, y, sc_) in ((112, 509, 1.3), (126, 514, .7), (180, 506, 1), (402, 512, 1.5), (446, 507, .8), (458, 519, 1.1)):  # seedlings rising from glowing pods, in two loose clusters
    land_src.append('<g transform="translate(%s %s) scale(%s) translate(%s %s)">' % (f(x), f(y), f(sc_), f(-x), f(-y)) + '<circle cx="%s" cy="%s" r="5" fill="url(#glowPod)" opacity=".45"/><g transform="translate(%s %s) rotate(%d) scale(.2) translate(0 13)">%s</g>' % (f(x), f(y - 1), f(x), f(y), srnd.choice((-74, 70)), LODGED_POD) +
                    '<path d="M%s %s q 1 -5 -.5 -10" stroke="#4f7a2e" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M%s %s q 3 -4 7 -2.5 q -4 2 -7 2.5 Z M%s %s q -3 -4 -7 -2.5 q 4 2 7 2.5 Z" fill="#5f8a3a"/>' % (
                        f(x + 2), f(y - 1), f(x + 1.5), f(y - 11), f(x + 1.5), f(y - 11)) + '</g>')
land.append('<!-- the growth at the source, around the machine\'s foot -->' + ''.join(land_src))

# near rock: the dark wet ledge at bottom left and the rise at bottom right
ledge = [(-20, 600), (120, 596), (260, 612), (420, 606), (600, 622), (760, 616), (900, 636), (960, H + 10), (-20, H + 10)]
rise = [(1090, H + 10), (1110, 610), (1180, 574), (1250, 556), (1340, 548), (1440, 552), (1556, 566), (1556, H + 10)]
jr = random.Random(67)


def rough(line, step=9, amp=1.6):
    # a rock edge broken into small irregular steps and knuckles
    out_ = [line[0]]
    for (ax, ay), (bx, by) in zip(line, line[1:]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for k in range(1, n + 1):
            t = k / n
            out_.append((lerp(ax, bx, t) + jr.uniform(-1, 1), lerp(ay, by, t) + (jr.uniform(-amp, amp) if k < n else 0)))
    return out_


ledge_top, rise_top = rough(ledge[:8]), rough(rise[1:7])
ledge = ledge_top + ledge[8:]
rise = [rise[0]] + rise_top + rise[7:]
lin([(0, '#18201f', 1), (.3, '#0b0f0f', 1), (1, '#070a0a', 1)], 0, 548, 0, H, units=True, id='nearRock')
rock_tex('nearRockTex', .012, .03, 82, 5, '#8e9aa0', '#9fb2bc', SKY_LIGHT % 30, 1.7, .35, 30)
land.append('<!-- near rock: a dark wet ledge along the bottom left --><polygon points="%s" fill="url(#nearRock)" filter="url(#nearRockTex)"/>' % pts(ledge))
land.append('<!-- near rock: a rise at bottom right carrying young fronds --><polygon points="%s" fill="url(#nearRock)" filter="url(#nearRockTex)"/>' % pts(rise))
land.append('<polygon points="%s" fill="#000" filter="url(#rockGrain)" opacity=".45"/>' % pts(rise))
# their upper edges wet, catching the sky, and the ledge's catching the Generator where it is near
lin([(0, GLOW_MID, .9), (.2, GLOW_MID, .6), (.3, '#8fa2a8', .5), (1, '#8fa2a8', .4)], 0, 0, 960, 0, units=True, id='ledgeSheen')
# a sheen, not a stroke: continuous, bright in a few stretches and gone in others, soft at its edges
defs.append('<filter id="sheenBreak" x="-2%" y="-60%" width="104%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".011 .05" numOctaves="2" seed="71" result="n"/>'
            '<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5 0 0 0 -2.3" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feGaussianBlur in="c" stdDeviation="1.5"/></filter>')
land.append('<!-- the wet edges of the near rock --><polyline points="%s" fill="none" stroke="url(#ledgeSheen)" stroke-width="2.2" stroke-linejoin="round" filter="url(#sheenBreak)"/><polyline points="%s" fill="none" stroke="#8fa2a8" stroke-width="2" opacity=".5" stroke-linejoin="round" filter="url(#sheenBreak)"/>' % (
    pts([(x, y + .8) for x, y in ledge_top]), pts([(x, y + .8) for x, y in rise_top])))
land.append('<!-- wet glints and small puddles across the tops of the near rock --><polygon points="%s" fill="#fff" filter="url(#wetFleckCool)" opacity=".35"/><polygon points="%s" fill="#fff" filter="url(#wetFleckCool)" opacity=".35"/>' % (
    pts(ledge_top + [(900, 646), (-20, 614)]), pts(rise_top + [(1556, 580), (1110, 624)])))
moss_near = ''.join('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".8"/>' % (f(x), f(y), f(rnd.uniform(18, 40)), f(rnd.uniform(4, 7)), mix(mix(GREEN_DARK, GREEN, .5), '#0a1210', rnd.uniform(.1, .4))) for x, y in [(1200, 572), (1262, 558), (1318, 552), (1380, 551), (1440, 554), (1500, 560), (1290, 562), (1410, 560)])
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
glow.append('<!-- the light on the rock breathing with the core -->'
            '<ellipse cx="%d" cy="%d" rx="260" ry="30" fill="url(#glowWash)" opacity=".12" clip-path="url(#shelfClip)"><animate attributeName="opacity" values=".1;.2;.14;.24;.12;.1" keyTimes="0;.18;.36;.55;.8;1" dur="%ss" begin="-1.1s" repeatCount="indefinite" %s%s/></ellipse>' % (GX + 90, GBASE + 12, f(CORE_T), SPLINE, ease(5)))
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
                '<g transform="rotate(%d) scale(.42) translate(0 13)" opacity=".85"><path d="%s" fill="#4f7a2a"/><path d="%s" fill="#4f7a2a"/><path d="%s" fill="#6f8f45"/></g></g></g>' % (
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
_sl = random.Random(79)
glow.append('<!-- the surge: the rain-filled air around the machine lit up, in drifts; the cloud far overhead stays dark --><g opacity="0" mask="url(#machineOut)">%s%s</g>' % (surge(SURGE_V, .9), ''.join(
    '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#glowWash)" opacity="%s"/>' % (f(GX + _sl.uniform(-200, 240)), f(_sl.uniform(262, 440)), f(_sl.uniform(50, 110)), f(_sl.uniform(30, 60)), f(_sl.uniform(.45, 1))) for _ in range(12))))
glow.append('<!-- the surge: the light flooding the shelf --><ellipse cx="%d" cy="%d" rx="340" ry="48" fill="url(#glowWash)" opacity="0">%s</ellipse>' % (GX + 90, GBASE + 10, surge(SURGE_V, .85)))
glow.append('<!-- the surge: the core flaring --><circle cx="%s" cy="%s" r="165" fill="url(#glowPod)" opacity="0" mask="url(#machineOut)">%s</circle>' % (f(GS(*CORE)[0]), f(GS(*CORE)[1]), surge(SURGE_V, .8)))
mglow.insert(len(mglow) - 1, '<!-- the vat flaring white behind its seeds, which stay dark against it --><rect x="%d" y="%d" width="%d" height="%d" rx="12" fill="#ffffff" opacity="0" filter="url(#soft2)">%s</rect>' % (VAT[0] + 4, VAT[1] + 6, VAT[2] - 8, VAT[3] - 12, surge(SURGE_V, .7)))
sr_ = random.Random(73)
seams_ = ''
for y, fr_s in SEAMS:
    x_ = GX - 90
    while x_ < GX - 90 + 172 * fr_s - 4:  # the seam blazes where the plates have parted, in pieces of uneven brightness
        l_ = sr_.uniform(5, 18)
        seams_ += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke-width="%s" opacity="%s"/>' % (f(x_), f(y + .6), f(min(x_ + l_, GX + 82)), f(y + .6), f(sr_.uniform(.5, 1.3)), f(sr_.uniform(.3, .85)))
        x_ += l_ + sr_.uniform(2, 14)
mglow.append('<!-- the surge: the seams blazing in pieces where the plates have parted --><g stroke="%s" filter="url(#glow)" opacity="0" stroke-linecap="round">%s%s</g>' % (GLOW_CORE, surge(SURGE_V), seams_))
# glowing fluid running down the chute, the lit water where it spills into the flood, and the gate in the surge
glow.append('<!-- one sheet of glowing fluid running down the chute, soft light sliding down it --><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="6" opacity=".55"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.4" opacity=".3"/>' % (
    f(CHUTE0[0] + _nx * 3), f(CHUTE0[1] + _ny * 3), f(CHUTE1[0] + _nx * 3), f(CHUTE1[1] + _ny * 3), GLOW_EDGE, f(CHUTE0[0] + _nx * 3), f(CHUTE0[1] + _ny * 3), f(CHUTE1[0] + _nx * 3), f(CHUTE1[1] + _ny * 3), GLOW_MID) +
    '<!-- the fluid spilling off the lip in a broken fall --><path d="M%s %s Q %s %s %s %s" stroke="%s" stroke-width="2.4" fill="none" opacity=".4" stroke-dasharray="3 2 5 2 2 3" filter="url(#soft1)"/>' % (
        f(CHUTE1[0]), f(CHUTE1[1] - 1), f(CHUTE1[0] + 8), f(CHUTE1[1] + 1), f(OUTFALL[0] - 4), f(OUTFALL[1]), GLOW_MID) + ''.join(
    '<ellipse rx="10" ry="1.8" fill="%s" opacity="0" filter="url(#soft2)" transform="rotate(%s)"><animateMotion path="M%s %s L %s %s" dur=".75s" begin="-%ss" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;.8;0" keyTimes="0;.2;.8;1" dur=".75s" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
        GLOW_CORE, f(math.degrees(_ca)), f(CHUTE0[0]), f(CHUTE0[1] - 1), f(CHUTE1[0]), f(CHUTE1[1] - 1), f(ph), f(ph)) for ph in (0, .375)))
glow.append('<!-- the lit water spreading from the outfall: a low glow, and over it the broken glitter of the fluid on the ripples, drifting downstream --><ellipse cx="%d" cy="%d" rx="72" ry="11" fill="url(#glowWash)" opacity=".45"><animate attributeName="opacity" values=".4;.6;.45;.4" keyTimes="0;.35;.7;1" dur="3s" repeatCount="indefinite" %s%s/></ellipse>' % (OUTFALL[0] + 30, OUTFALL[1] + 2, SPLINE, ease(3)) +
            '<g filter="url(#glitterLit)"><ellipse cx="%d" cy="%d" rx="130" ry="18" fill="url(#glitterFall)"/><ellipse cx="%d" cy="%d" rx="60" ry="9" fill="url(#glitterCore)"/></g>' % (OUTFALL[0] + 70, OUTFALL[1] + 6, OUTFALL[0] + 30, OUTFALL[1] + 3))
glow.append('<!-- the surge: the gate bursting open --><ellipse cx="%d" cy="%d" rx="22" ry="12" fill="url(#glowWash)" opacity="0">%s</ellipse><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="5" opacity="0" filter="url(#glow)">%s</line>' % (
    CHUTE0[0], CHUTE0[1] - 8, surge(FIRE_V), f(CHUTE0[0]), f(CHUTE0[1] - 1), f(CHUTE1[0]), f(CHUTE1[1] - 1), GLOW_CORE, surge(FIRE_V, .3)))
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
                '<animateTransform attributeName="transform" type="translate" values="0 0;6 -24;16 -46" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="rx" values="4;8;13" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="ry" values="3;6;9" keyTimes="0;.45;1" dur="%ss" begin="%s" repeatCount="indefinite"/>'
                '<animate attributeName="opacity" values="0;.34;.12;0" keyTimes="0;.12;.55;1" dur="%ss" begin="%s" repeatCount="indefinite"/></ellipse>' % (
                    GX - 150, f(per), onset_begin(per, ph), f(per), onset_begin(per, ph), f(per), onset_begin(per, ph), f(per), onset_begin(per, ph)))

# the reflection shimmers as rain breaks the water
glow.append('<!-- the Generator light glittering on the water off the end of the shelf --><g filter="url(#glitterLit)" opacity=".7"><ellipse cx="770" cy="596" rx="90" ry="18" fill="url(#glitterFall)"/></g>')
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
while n_ < 100:
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
    r1 = lerp(2, 12, k ** 1.2) * rrnd.uniform(.55, 1.25)
    lit = 700 < x < 860 and y > 574
    sw_ = lerp(.6, 1.6, k) * rrnd.uniform(.6, 1.2)
    if rrnd.random() < .34:
        # a half-ring: only the far side of the ring catches the sky
        arc = lambda r_: 'M%s 0 A %s %s 0 0 1 %s 0' % (f(-r_), f(r_), f(r_ * .3), f(r_))
        rings.append('<g transform="translate(%s %s)"><path d="%s" fill="none" stroke="%s" stroke-width="%s" opacity="0">'
                     '<animate attributeName="d" values="%s;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                     '<animate attributeName="opacity" values="0;.7;0;0" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></path></g>' % (
                         f(x), f(y), arc(1), GLOW_MID if lit else '#9fb2b8', f(sw_), arc(1), arc(r1), arc(r1), f(.8 / per), f(per), f(ph), f(.06 / per), f(.8 / per), f(per), f(ph)))
        continue
    rings.append('<ellipse cx="%s" cy="%s" rx="1" ry=".3" fill="none" stroke="%s" stroke-width="%s" opacity="0">'
                 '<animate attributeName="rx" values="1;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="ry" values=".3;%s;%s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                 '<animate attributeName="opacity" values="0;.7;0;0" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                     f(x), f(y), GLOW_MID if lit else '#9fb2b8', f(sw_), f(r1), f(r1), f(.8 / per), f(per), f(ph),
                     f(r1 * .3), f(r1 * .3), f(.8 / per), f(per), f(ph), f(.06 / per), f(.8 / per), f(per), f(ph)))
for i in range(400):
    if len(cur_pos) >= 16:
        break
    x, y = crnd.uniform(890, 1500), crnd.uniform(474, 566)
    ln = crnd.uniform(50, 110)
    per = crnd.choice([3, 4, 6])
    run_ = lerp(26, 62, min(1.0, max(0.0, (y - HZ) / (H - HZ)))) * per  # the current's own speed at this depth (see current())
    x2 = x + ln + run_
    if (x > 1110 and y > 546) or any(abs(y - ry_) < rw_ + 4 and x - 6 < rx_ < x2 + 6 for sp in ROOT_SPINES for rx_, ry_, rw_ in sp):
        continue  # nor across the near rise or a root
    if any(sx_ - rx_ - 6 < x2 and x - 6 < sx_ + rx_ and sy_ - ry_ - 4 < y < sy_ + ry_ * .35 + 6 for sx_, sy_, rx_, ry_ in SLABS):
        continue  # the current flows around the slabs, never over them
    if any(abs(y - yy) < 7 and abs(x - xx) < 80 for xx, yy in cur_pos):
        continue  # staggered: no two lines stacked one above the other
    cur_pos.append((x, y))
    ph = crnd.uniform(0, per)
    wd_ = .8 + (y - 470) / 90
    spindles, x_ = '', x
    while x_ < x + ln - 6:  # broken into tapered pieces, each thickest a third of the way along
        l_ = crnd.uniform(8, 26)
        spindles += '<polygon points="%s"/>' % pts([(x_, y), (x_ + l_ * .35, y - wd_ / 2), (x_ + l_, y), (x_ + l_ * .35, y + wd_ / 2)])
        x_ += l_ + crnd.uniform(3, 12)
    cur_.append('<g fill="#9fb2ba" opacity="0">'
                '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                '<animate attributeName="opacity" values="0;.3;.3;0" keyTimes="0;.25;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>%s</g>' % (
                    f(run_), f(per), f(ph), f(per), f(ph), spindles))
glow.append('<!-- the flood current: pale lines drifting downstream --><g>%s</g>' % ''.join(cur_))
glow.append('<!-- rain rings on the floodwater, none over the machine --><g mask="url(#behindMachine)">%s</g>' % ''.join(rings))
# whitecaps breaking out in the distance: a crest turns white, throws a puff of spray downwind, and falls back
rad([(0, '#e6eef2', .8), (.5, '#c9d6dc', .35), (1, '#c9d6dc', 0)], id='sprayG')
wc, wrnd3 = [], random.Random(103)
while len(wc) < 64:
    x, y = wrnd3.uniform(-20, 920), HZ + 2 + wrnd3.random() ** 1.4 * 30
    if (60 < x < 600 and y > 412) or wrnd3.random() > min(1, (930 - x) / 150):
        continue  # none right behind the machine's foot, and fewer toward the island
    k = (y - HZ) / 50
    L = lerp(8, 36, k) * wrnd3.uniform(.7, 1.4)
    per = wrnd3.choice((3, 4, 6, 8))
    ph = wrnd3.uniform(0, per)
    drift = lerp(26, 62, (y - HZ) / (H - HZ)) * 1.8  # its foam rides the water at the current's speed (see current())
    wc.append('<g opacity="0"><animate attributeName="opacity" values="0;.85;.7;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
              '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0;%s 0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
              '<polygon points="%s" fill="#eef4f6"/>'
              '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#sprayG)" opacity=".7"><animate attributeName="cy" values="%s;%s;%s" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse></g>' % (
                  kt(per, .15, .6, 1.8), f(per), f(ph), f(drift), f(drift), kt(per, 1.8), f(per), f(ph),
                  pts([(x, y), (x + L * .3, y - .8 - 1.4 * k), (x + L, y), (x + L * .4, y + .6 + .8 * k)]),
                  f(x + L * .7), f(y - 1), f(L * .8), f(2 + 4 * k), f(y - 1), f(y - 3 - 5 * k), f(y - 3 - 5 * k), kt(per, 1.2), f(per), f(ph)))
glow.append('<!-- whitecaps breaking out in the distance, spray blowing off them downwind, passing behind the machine --><g mask="url(#behindMachine)">%s</g>' % ''.join(wc))
# spindrift: sheets of spray torn off the far water and driven along the horizon by the wind
sd = []
for i in range(9):
    x, y = wrnd3.uniform(-100, 640), HZ + wrnd3.uniform(-2, 12)
    per = (3, 4, 6)[i % 3]
    ph = wrnd3.uniform(0, per)
    L = wrnd3.uniform(60, 150)
    sd.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#sprayG)" opacity="0"><animate attributeName="opacity" values="0;.5;0" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
              '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                  f(x), f(y), f(L / 2), f(wrnd3.uniform(1.5, 3)), f(per), f(ph), f(40 * per), f(per), f(ph)))
glow.append('<!-- spindrift driven along the horizon, passing behind the machine --><g mask="url(#behindMachine)">%s</g>' % ''.join(sd))
# lodged pods glowing faintly
for i, (x, y) in enumerate(LODGED):
    glow.append('<circle cx="%s" cy="%s" r="7" fill="url(#glowPod)" opacity=".2"><animate attributeName="opacity" values=".12;.3;.15;.12" keyTimes="0;.4;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/></circle>' % (
        f(x), f(y - 3), f([6, 8, 12][i % 3]), f(rnd.uniform(0, 6)), SPLINE, ease(3)))
# the World Tree's own seed pods glowing among its leaves: the Generator's green, carried to it
trnd_ = random.Random(83)
_pc = [(TX - 330, ty(176)), (TX - 120, ty(196)), (TX + 90, ty(186)), (TX + 250, ty(176))]  # the pods hang in bunches, as fruit does
for i, (cx_, cy_) in enumerate(_pc):
    per = [6, 8, 12, 8][i]
    # miles off, no single pod shows: thousands of them hang in the lower crown, a dim shimmer of points too
    # small to count, brightest where they are thickest
    dust = ''
    for j in range(46):
        u_, v_ = trnd_.gauss(0, .45), trnd_.gauss(0, .45)
        dust += '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (f(cx_ + u_ * 34), f(cy_ + 4 + v_ * 10 + abs(u_) * 5), f(trnd_.uniform(.28, .55)), GLOW_MID, f(trnd_.uniform(.25, .7)))
    glow.append('<!-- the World Tree seed pods: a dim shimmer of countless small lights in its lower crown --><ellipse cx="%s" cy="%s" rx="44" ry="14" fill="url(#glowPod)" opacity=".1"><animate attributeName="opacity" values=".06;.14;.09;.06" keyTimes="0;.4;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/></ellipse><g>%s</g>' % (
        f(cx_), f(cy_ + 6), per, f(trnd_.uniform(0, per)), SPLINE, ease(3), dust))
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
POD_ART = ('<circle cy="-12" r="16" fill="url(#glowPod)" opacity=".45"/><path d="%s" fill="#35501b"/><path d="%s" fill="#35501b" stroke="#35501b" stroke-width=".6"/><path d="%s%s" fill="none" stroke="#6e9636" stroke-width=".8"/>'
           '<path d="%s" fill="#5b7436" stroke="#8fb050" stroke-width=".6"/><path d="%s" stroke="#34481c" stroke-width=".7"/>' % (
               POD_L, POD_R, POD_L.replace(' Z', ''), POD_R.replace('M0 -26', ' M0 -26').replace(' Z', ''), POD_CAP, POD_SCALES))


def larva_art(wag, body_anim=''):
    # a larva facing right, a newborn of the flood rather than a cartoon tadpole: a long, half-clear body, dark
    # along the back and pale beneath, its yolk glowing faintly inside it; feathered gills fanning behind the head;
    # small dark eyes; a line of light spots down its flank; and a long tail edged with a clear ribbed fin that
    # sweeps side to side
    return ('<ellipse cx="-4" cy="0" rx="16" ry="7" fill="url(#glowPod)" opacity=".14"/>'
            '<g>%s' % wag +
            '<path d="M-5 -1.9 C -12 -6.6, -24 -5.6, -34 -.4 C -24 4.6, -12 6.2, -5 2.1 Z" fill="#a9c2ae" opacity=".22"/>'
            '<path d="M-10 -3.5 L -11.6 -.5 M-15 -4.3 L -16.2 -.5 M-20 -4.1 L -21 -.4 M-25 -3 L -25.6 -.3 M-10 3.6 L -11.6 .6 M-15 4.2 L -16.2 .6 M-20 3.9 L -21 .5" stroke="#cfe0cf" stroke-width=".35" opacity=".4"/>'
            '<path d="M-5 -2.1 C -13 -1.8, -21 -.8, -31 -.1 C -21 .8, -13 1.8, -5 2.1 Z" fill="#23402a"/></g>'
            '<g>%s' % body_anim +
            '<g stroke="#9cbc8a" stroke-width=".6" fill="none" stroke-linecap="round" opacity=".9">'
            '<path d="M1.5 -3.4 q -1 -3 -4.2 -4.6"/><path d="M.5 -3.2 q -2.6 -1.6 -5.8 -1.9"/><path d="M-.5 -2.8 q -3.2 -.4 -6 .4"/>'
            '<path d="M1.5 3.4 q -1 3 -4.2 4.6"/><path d="M.5 3.2 q -2.6 1.6 -5.8 1.9"/></g>'
            '<g fill="#b8d4a0" opacity=".7"><circle cx="-1.8" cy="-6.6" r=".45"/><circle cx="-4.2" cy="-5.2" r=".4"/><circle cx="-4.6" cy="-2.2" r=".4"/><circle cx="-1.8" cy="6.6" r=".45"/><circle cx="-4.4" cy="4.9" r=".4"/></g>'
            '<path d="M9 0 C 9 -3.2, 5 -4.2, 0 -3.7 C -4.5 -3.2, -7.5 -2.2, -8.5 0 C -7.5 2.4, -4.5 3.6, 0 3.9 C 5 4.2, 9 3, 9 0 Z" fill="#294530" opacity=".78"/>'
            '<path d="M8.4 1 C 5 3.6, -2.5 3.9, -8 1 C -3 1.8, 4 1.8, 8.4 1 Z" fill="#8fae88" opacity=".55"/>'
            '<path d="M8.2 -1.3 C 4 -3.4, -3 -3.4, -8.2 -.9" stroke="#0c160e" stroke-width="1.3" fill="none" opacity=".7"/>'
            '<ellipse cx="-.5" cy="1" rx="3.4" ry="1.7" fill="%s" opacity=".85" filter="url(#soft1)"/>' % GLOW_MID +
            '<g fill="%s">%s</g>' % (GLOW_CORE, ''.join('<circle cx="%s" cy=".2" r="%s" opacity="%s"/>' % (f(-7 + 2.6 * k), f(.42 - .05 * k), f(.75 - .1 * k)) for k in range(4))) +
            '<circle cx="5.6" cy="-1.3" r=".95" fill="#050806"/><circle cx="5.9" cy="-1.6" r=".32" fill="#e6efd8"/></g>')


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
                x, y = max(sl[0] - sl[2] + 8, x + 4), sl[1] - sl[3] * .75  # it only ever washes forward onto the rock
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
            body = '<circle cy="-12" r="16" fill="url(#glowPod)" opacity=".45"/>' + halves + seam + cap
        else:
            body = POD_ART
        fade = {'hatch': (.05, D + .9, end), 'sink': (.05, D + .1, end), 'far': (.05, D - 1.5, end), 'catch': (.05, D + .3, end)}[fate]
        float_end = {'hatch': D + .5, 'sink': D + .2, 'far': D - 1.2, 'catch': D - .1}[fate]  # it floats until it splits, goes under, fades or grounds
        br_ = random.Random(int(o * 1000))  # its own draw, so the voyages stay as placed
        bob, bob_ph = br_.choice((1.5, 2.0, 2.4)), br_.uniform(0, 2)
        label = {'hatch': 'splitting on the water to let a larva out', 'sink': 'going under', 'far': 'carried off toward the island', 'catch': 'caught on a slab, where it sprouts'}[fate]
        out.append('<!-- a seed down the chute and out on the flood, %s -->' % label +
                   '<g opacity="0"><animateMotion values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                       ';'.join('%s,%s' % (f(x), f(y)) for x, y in zip(xs + [xs[-1]], ys + [ys[-1]])), kts, f(T), b) +
                   '<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, *fade), f(T), b) +
                   '<g><animateTransform attributeName="transform" type="scale" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(v) for v in scs + [scs[-1]]), kts, f(T), b) +
                   '<g opacity="0">%s<ellipse cx="0" cy="6" rx="4" ry="4.5" fill="url(#glowPod)" opacity=".28"/>'
                   '<ellipse cx="0" cy="3" rx="3" ry="1" fill="none" stroke="#b8c8cc" stroke-width=".7"><animate attributeName="rx" values="3;13" dur="%ss" begin="-%ss" repeatCount="indefinite"/><animate attributeName="ry" values="1;3.4" dur="%ss" begin="-%ss" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.55;0" keyTimes="0;.1;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse></g>' % (
                       at_on((0, 0, 1, 1, 0, 0), (SLIDE + DROP, SLIDE + DROP + .3, float_end - .25, float_end), o), f(bob), f(bob_ph), f(bob), f(bob_ph), f(bob), f(bob_ph)) +
                   '<g><animateTransform attributeName="transform" type="rotate" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (';'.join(f(a) for a in angs + [angs[-1]]), kts, f(T), b) +
                   '<g transform="scale(%s) translate(0 13)"><circle cy="-12" r="19" fill="url(#glowPod)" opacity=".4"/>%s</g></g></g></g>' % (f(SEED), body))
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
    for rec in sim:
        fates[rec[5]] = fates.get(rec[5], 0) + 1
    return out, lodged, hatch, clashes, fates


def at_on(vals, times, onset, attr='opacity'):
    # an animation on the master clock, its times in seconds after an onset
    return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        attr, ';'.join(f(v) for v in vals), kt(T, *times), f(T), onset_begin(T, onset))


seed_svg, LODGE, HATCH, clashes, FATES = build_seeds()


def flash_anim(period, onset, peak):
    # the same flicker as cloud_flash, so a strike and what it lights move together
    return '<animate attributeName="opacity" values="0;%s;%s;%s;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        f(peak), f(peak * .18), f(peak * .75), kt(period, .04, .1, .16, .45), f(period), onset_begin(period, onset))


RIM_EDGES = [TURRET[1:3], HOUSING[1:5], ANNEX[1:4], [(GX + 104, 188 - 8), (GX + 136, 188 - 8)], [(TK0 + 4, 186), (TK1 - 4, 186)], [(GX + 52, 172), (GX + 60, 164), (GX + 72, 164)]]
def _taper(e, w):
    # a lit edge as a thin sliver, widest in its middle and gone at its ends
    L = [(a, b) for a, b in zip(e, e[1:])]
    out_ = ''
    for (ax, ay), (bx, by) in L:
        out_ += '<polygon points="%s"/>' % pts([(ax, ay), (lerp(ax, bx, .5), lerp(ay, by, .5) - w / 2), (bx, by), (lerp(ax, bx, .5), lerp(ay, by, .5) + w / 2)])
    return out_


rim_ = ''.join(_taper(e, 1.6) for e in RIM_EDGES)
glow.append('<!-- a strike in the cloud catching the top edges of the machine --><g opacity="0" transform="%s">%s<g fill="#c4d2ea">%s</g></g>' % (MT, flash_anim(12, 3.1, .85), rim_))
glow.append('<g opacity="0" transform="%s">%s<g fill="#c4d2ea">%s</g></g>' % (MT, flash_anim(12, 8.3, .55), rim_))
defs.append('<mask id="farWaterMask" maskUnits="userSpaceOnUse" x="0" y="%d" width="%d" height="100"><rect x="0" y="%d" width="%d" height="%d" fill="#fff"/><polygon points="%s" fill="#000"/></mask>' % (
    HZ - 4, W, HZ - 1, W, 470 - HZ, pts(ISL_FRONT + ISL_BACK)))
glow.append('<!-- the strikes mirrored in the far water --><g mask="url(#farWaterMask)">'
            '<g opacity="0">%s<ellipse cx="960" cy="%d" rx="420" ry="44" fill="url(#flash)"/></g>'
            '<g opacity="0">%s<ellipse cx="1330" cy="%d" rx="360" ry="40" fill="url(#flashBack)"/></g>'
            '<g opacity="0">%s<ellipse cx="640" cy="%d" rx="300" ry="36" fill="url(#flash)"/></g></g>' % (
                flash_anim(24, 9.7, .45), HZ + 22, flash_anim(24, 15.3, .5), HZ + 22, flash_anim(12, 8.3, .3), HZ + 22))
# rain striking the rock and the near water: small crowns of spray, each gone in a blink
spl = []
srnd = random.Random(61)
while len(spl) < 70:
    x, y = srnd.uniform(0, W), srnd.uniform(500, 652)
    if 1110 < x and y < 546 or (y < 590 and x > 720 and x < 1110 and srnd.random() < .5):
        continue
    k = (y - HZ) / (H - HZ)
    per = srnd.choice([1.2, 1.5, 2.0, 2.4])
    sc = lerp(.5, 1.3, k)
    near_gen = abs(x - GX - 60) < 300 and y < 600
    ph_ = srnd.uniform(0, per)
    spl.append('<g transform="translate(%s %s) scale(%s)" opacity="0"><animate attributeName="opacity" values="0;.65;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
               '<ellipse rx="1" ry=".35" fill="none" stroke="%s" stroke-width=".6"><animate attributeName="rx" values="1;4.5;4.5" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/><animate attributeName="ry" values=".35;1.4;1.4" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>'
               '<circle cx="-1.6" cy="-1.8" r=".45" fill="%s"/><circle cx="1.3" cy="-2.3" r=".4" fill="%s"/></g>' % (
                   f(x), f(y), f(sc), kt(per, .02, .2), f(per), f(ph_), GLOW_CORE if near_gen else '#b8c8cc', kt(per, .2), f(per), f(ph_), kt(per, .2), f(per), f(ph_),
                   GLOW_CORE if near_gen else '#b8c8cc', GLOW_CORE if near_gen else '#b8c8cc'))
glow.append('<!-- rain splashing on the rock and the near water --><g>%s</g>' % ''.join(spl))
# water gathering on the machine's ledges and dripping off them
drips = []
for i, (x, y, fall, per) in enumerate(((GX - 88, 305, 44, 2), (GX + 48, 305, 40, 2.4), (GX - 30, 411, 36, 3), (GX + 70, 411, 40, 4), (GX - 162, 334, 58, 3), (GX + 150, 472, 20, 1.5), (GX - 120, 472, 20, 6))):
    hold = 1 - math.sqrt(2 * fall * GSC / 128) / per  # it hangs, then falls under the same gravity as the seeds
    drips.append('<ellipse cx="%d" cy="%d" rx=".8" ry="1.4" fill="#aebdc2" opacity="0">'
                 '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 %d" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;.4 0 1 1"/>'
                 '<animate attributeName="opacity" values="0;.8;.8;0" keyTimes="0;%s;.97;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (x, y + 2, fall, f(hold), f(per), f(i * .41), f(hold * .5), f(per), f(i * .41)))
mglow.append('<!-- water dripping off the ledges -->' + ''.join(drips))
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

# ------------------------------------------------------------------ life layer (animated): hatchlings, and sprouts rising where pods lodge
life = []


def at(vals, times, attr='opacity', begin=None):
    # an animation on the master clock, its times in seconds after the surge's onset
    return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (
        attr, ';'.join(f(v) if not isinstance(v, str) else v for v in vals), kt(T, *times), f(T), begin or onset_begin(T, S))


def rot_at(vals, times, begin=None):
    return at(vals, times, 'transform', begin).replace('<animate attributeName="transform"', '<animateTransform attributeName="transform" type="rotate"')


# (the birth on the shelf, a heavy seed flung from the chute that split and let out a newborn, was cut: Nick 2026-09-23)
WAKE = '<path d="M-9 0 Q -22 -1.2 -44 -6 M-9 2 Q -22 3.5 -44 10" stroke="#a9bcc2" stroke-width="1" fill="none" opacity=".5" stroke-linecap="round" stroke-dasharray="5 2 8 3 4 4 6 5"/><path d="M-7 1 Q -12 .6 -16 -.4" stroke="#c4d2d6" stroke-width="1.2" fill="none" opacity=".5" stroke-linecap="round"/>'

# hatchlings: a larva swims out of each pod that split on the flood, and dives
for n, (x0, y0, th) in enumerate(HATCH):
    b = onset_begin(T, th)
    cur = current(y0)
    v_ = cur + 15
    x1 = x0 + cur * .3 + v_ * 2.2
    cid = 'hatchClip%d' % n
    defs.append('<clipPath id="%s" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="%d" height="%s"/></clipPath>' % (cid, W, f(y0 + 1.2)))
    wagh = '<animateTransform attributeName="transform" type="rotate" values="-24 -4 0;24 -4 0;-24 -4 0" dur=".3s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>'
    k = (y0 - HZ) / (H - HZ)
    sc = lerp(.7, 1.0, k)
    life.append('<!-- a larva hatched from a pod on the flood, swimming off and diving -->'
                '<g clip-path="url(#%s)"><g opacity="0">' % cid +
                '<animateMotion values="%s,%s;%s,%s;%s,%s;%s,%s;%s,%s" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite" calcMode="linear"/>' % (
                    f(x0), f(y0 - 2), f(x0 + cur * .3), f(y0 - 2), f(x1), f(y0 + 1), f(x1 + v_ * .3), f(y0 + 1), f(x1 + v_ * .3), f(y0 + 1), kt(T, .3, 2.5, 2.8), f(T), b) +
                '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (kt(T, .15, .45, 2.3, 2.8), f(T), b) +
                '<g transform="scale(%s)"><g><animateTransform attributeName="transform" type="scale" values=".4;.4;1;1;1 .2;1 .2" keyTimes="%s" dur="%ss" begin="%s" repeatCount="indefinite"/>' % (f(sc), kt(T, .2, .6, 2.3, 2.8), f(T), b) +
                WAKE + larva_art(wagh) + '</g></g></g></g>')
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
                     '<g>%s%s</g>' % (sa(('.4', '.4', '1', '1'), (1.0, 2.8), typ='scale'), leaf % ('#5f8a3a' if side > 0 else '#4a7430', GREEN_DARK))) for side in (1, -1))
    life.append('<!-- a sprout rising from a lodged pod at %d,%d -->' % (x, y) +
                '<g transform="translate(%s %s) scale(%s)"><g opacity="0">%s' % (f(x), f(y - 1), f(sc), sa((0, 0, 1, 1, 0, 0), (.3, .6, 11, 12.5))) +
                '<circle r="7" fill="url(#glowPod)" opacity=".8">%s</circle>' % sa((.9, .9, .25, .25), (.6, 3.0)) +
                '<g>%s<path d="M0 0 C 1 -8, -2 -14, 1 -22" stroke="%s" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>' % (sa(('1 .02', '1 .02', '1 1', '1 1'), (.3, 1.9), typ='scale'), '#4f7a2e') +
                '<g>%s%s</g>' % (sa(('0 0', '0 0', '1 -22', '1 -22'), (.3, 1.9), typ='translate'), leaves) +
                '</g></g>')

# ------------------------------------------------------------------ fronds layer (animated): the young fronds on the near rise, bending in the gusts
fr = []
FROND_DRIPS = []  # drops falling from the frond tips, drawn outside the swinging fronds
FROND_BASES = [(1262, 556, 88, -14), (1290, 552, 104, 2), (1348, 550, 60, 26), (1418, 551, 96, -4), (1452, 554, 66, 20)]  # a few, not a bed
# the same plant taking hold on the slabs where the first growth is, smaller with distance: seeds that caught there earlier
FROND_BASES += [(1128, 511, 44, -10), (1146, 510, 56, 4), (1166, 509, 36, 22),
                (1402, 495, 34, -12), (1418, 494, 44, 6), (1434, 495, 28, 20),
                (852, 499, 30, -8), (866, 498, 38, 10),
                (992, 482, 22, -6), (1002, 481, 28, 12),
                (560, 445, 14, -8), (570, 445, 18, 10), (748, 452, 18, -4), (760, 452, 14, 16), (842, 441, 13, 6)]
for i, (x, y, h, a) in enumerate(FROND_BASES):
    tip = (x + math.sin(math.radians(a)) * h + h * .18, y - math.cos(math.radians(a)) * h)
    wdt = h * .09
    d = 'M%s %s Q %s %s %s %s Q %s %s %s %s Z' % (
        f(x - wdt), f(y), f(x - wdt + (tip[0] - x) * .2), f(y - h * .7), f(tip[0]), f(tip[1]),
        f(x + wdt + (tip[0] - x) * .5), f(y - h * .6), f(x + wdt), f(y))
    rib = 'M%s %s Q %s %s %s %s' % (f(x), f(y), f(x + (tip[0] - x) * .35), f(y - h * .65), f(tip[0]), f(tip[1]))
    per = [2, 3, 4][i % 3]
    amp = 8 + (i % 2) * 2
    base_c = mix(mix(GREEN_DARK, GREEN, .25 + .2 * (i % 2)), '#060a09', .62)
    lin([(0, mix(base_c, '#050807', .5), 1), (.55, base_c, 1), (1, mix(base_c, GREEN, .35), 1)], x, y, tip[0], tip[1], units=True, id='frondG%d' % i)
    far_half = 'M%s %s Q %s %s %s %s Q %s %s %s %s Z' % (f(x), f(y), f(x + (tip[0] - x) * .35), f(y - h * .65), f(tip[0]), f(tip[1]), f(x + wdt + (tip[0] - x) * .5), f(y - h * .6), f(x + wdt), f(y))
    drip_ = ''
    if i in (1, 3):  # water gathering at the tip, hanging while the frond swings
        dp = per * (1 if per >= 3 else 2)  # a whole number of swings, so it always lets go at the frond's rest angle
        drip_ = ('<ellipse cx="%s" cy="%s" rx=".9" ry="1.5" fill="#aebdc2" opacity="0">'
                 '<animate attributeName="opacity" values="0;0;.7;.7;0" keyTimes="0;.35;.55;.995;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>') % (f(tip[0]), f(tip[1] + 2), f(dp), f(i * .37))
        a0 = math.radians(-2)  # the frond's angle at the start of its swing, when the drop lets go
        rx_, ry_ = x + (tip[0] - x) * math.cos(a0) - (tip[1] + 2 - y) * math.sin(a0), y + (tip[0] - x) * math.sin(a0) + (tip[1] + 2 - y) * math.cos(a0)
        fall_ = y - ry_ - 4
        tf = math.sqrt(2 * fall_ / 128)
        FROND_DRIPS.append('<ellipse cx="%s" cy="%s" rx=".9" ry="1.5" fill="#aebdc2" opacity="0"><animateTransform attributeName="transform" type="translate" values="0 0;0 %s;0 %s" keyTimes="0;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 1 1;0 0 1 1"/>'
                           '<animate attributeName="opacity" values=".7;.7;0;0" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                               f(rx_), f(ry_), f(fall_), f(fall_), f(tf / dp), f(dp), f(i * .37), f(tf / dp * .9), f(tf / dp), f(dp), f(i * .37)))
    fr.append('<!-- a young frond on the near rise --><g><animateTransform attributeName="transform" type="rotate" values="%s %s %s;%s %s %s;%s %s %s" keyTimes="0;.3;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .3 1;.4 0 .6 1"/>'
              '<path d="%s" fill="url(#frondG%d)" stroke="%s" stroke-width="%s" stroke-opacity=".35" stroke-linejoin="round"/><path d="%s" fill="#040706" opacity=".35"/><path d="%s" stroke="%s" stroke-width="1" fill="none" opacity=".6"/><path d="%s" stroke="#a9bcc2" stroke-width="1" fill="none" opacity=".4" stroke-dasharray="%s"/>%s</g>' % (
                  f(-2), f(x), f(y), f(amp), f(x), f(y), f(-2), f(x), f(y), f(per), f(i * .37),
                  d, i, base_c, f(2.6 * h / 90), far_half, rib, mix(GREEN, '#0a1210', .45), d[:d.index(' Q ', d.index(' Q ') + 1)], ' '.join(f(v) for v in (12 + 3 * i, 7, 20, 10 + i, 30)), drip_))  # wet along its lit edge, in patches
fr.append('<!-- drops falling from the frond tips -->' + ''.join(FROND_DRIPS))
fr.append('<!-- three lodged pods at the frond feet -->' + ''.join(
    '<circle cx="%d" cy="%d" r="10" fill="url(#glowPod)" opacity=".25"/><g transform="translate(%d %d) rotate(%d) scale(.36) translate(0 13)">%s</g>' % (x, y, x, y, a, LODGED_POD) for x, y, a in [(1276, 552, -70), (1334, 548, 76), (1418, 549, -64)]))

# ------------------------------------------------------------------ near layer (static): the growth at the source, right in front of the lens
# The viewer stands at the edge of the growth the machine's seeds have raised around it: broad leaves, ferns and
# grass lean into the frame from the bottom and the left, near and out of focus, and more of it is implied all
# around. They frame the machine without crowding it: low along the bottom, tall only at the left edge, and the
# fronds of a tree fern standing off the frame arch in at the top left.
nrr = random.Random(131)
defs.append('<filter id="nearDof2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter>')
defs.append('<filter id="nearDof3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.6"/></filter>')
near_left = [draw_leaf(-34, 640, 8, 300, 44, 26, LIGHT_AT, nrr), draw_leaf(-40, 560, 58, 168, 36, 38, LIGHT_AT, nrr),
             draw_fern(-30, 474, 70, 124, 16, 40, LIGHT_AT, nrr), draw_leaf(-26, 660, 26, 200, 30, 30, LIGHT_AT, nrr)]
near_left += [draw_leaf(x_, H + 16, a_, L_, 5, 10, LIGHT_AT, nrr, near=False) for x_, a_, L_ in ((6, 12, 150), (22, 20, 120), (-4, 4, 176), (40, 30, 96))]  # grass
near_left += [draw_leaf(-30, 430, 62, 110, 30, 34, LIGHT_AT, nrr), draw_fern(-20, 330, 76, 110, 26, 44, LIGHT_AT, nrr, broad=.3), draw_leaf(-36, 250, 70, 96, 26, 36, LIGHT_AT, nrr)]
near_top = [draw_fern(-84, 150, 82, 200, 40, 74, LIGHT_AT, nrr, broad=.34), draw_fern(-64, 50, 102, 160, 32, 40, LIGHT_AT, nrr, broad=.34)]
near_bottom = []
for x_, a_, L_, w_, dr in ((30, -16, 140, 30, 20), (74, 6, 172, 36, 24), (116, 26, 118, 28, 22), (166, -8, 96, 24, 14)):
    near_bottom.append(draw_leaf(x_, H + 30, a_, L_, w_, dr, LIGHT_AT, nrr))
for x_, a_, L_, w_, dr in ((236, -30, 70, 20, 10), (282, 10, 58, 18, 8), (352, -14, 64, 18, 10), (400, 30, 72, 20, 12),
                          (560, -24, 96, 24, 14), (604, 8, 124, 28, 18), (652, 34, 102, 24, 16), (706, -12, 88, 22, 12), (762, 22, 110, 26, 16),
                          (1500, -30, 120, 28, 18), (1540, -8, 150, 32, 22)):  # broad leaves among the grass, lower where the lit rock is
    near_bottom.append(draw_leaf(x_, H + 26, a_, L_, w_, dr, LIGHT_AT, nrr))
for i in range(30):  # grass along the foot of the frame
    x_ = lerp(180, 820, i / 29) + nrr.uniform(-10, 10)
    near_bottom.append(draw_leaf(x_, H + 10, nrr.uniform(-28, 28), nrr.uniform(36, 74), nrr.uniform(3, 5), nrr.uniform(4, 12), LIGHT_AT, nrr, near=False))
for a_, L_ in ((-56, 84), (-22, 104), (14, 110), (48, 88)):
    near_bottom.append(draw_fern(470, H + 18, a_, L_, 12, 30, LIGHT_AT, nrr))
for x_, a_, L_, w_, dr in ((860, -22, 118, 28, 18), (900, 4, 146, 32, 22), (944, 24, 112, 26, 18), (980, 40, 80, 20, 14)):
    near_bottom.append(draw_leaf(x_, H + 30, a_, L_, w_, dr, LIGHT_AT, nrr))
near = ['<!-- the growth right in front of the lens: fronds of a tree fern off the frame arching in at the top left --><g filter="url(#nearDof3)">%s</g>' % ''.join(near_top),
        '<!-- broad leaves, a fern and grass leaning in from the left edge --><g filter="url(#nearDof2)">%s</g>' % ''.join(near_left),
        '<!-- broad leaves, ferns and grass along the foot of the frame --><g filter="url(#nearDof)">%s</g>' % ''.join(near_bottom)]

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
rain.append('<!-- rain near the Generator catching its light --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainLitMask)" opacity=".85"/>' % (W, H))
_wx0, _wy0 = GS(VAT[0] - 12, VAT[1] - 12)
_wx1, _wy1 = GS(VAT[0] + VAT[2] + 12, VAT[1] + VAT[3] + 12)
defs.append('<mask id="rainWinMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%s" cy="%s" rx="120" ry="150" fill="url(#litSpot)"/><rect x="%s" y="%s" width="%s" height="%s" rx="40" fill="#000" filter="url(#soft6)"/></mask>' % (
    W, H, f(GS(*CORE)[0]), f(GS(*CORE)[1]), f(_wx0 + 6), f(_wy0 + 6), f(_wx1 - _wx0 - 12), f(_wy1 - _wy0 - 12)))
rain.append('<!-- the streaks just outside the window blazing, the glass itself left clear --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainWinMask)" opacity=".4"/>' % (W, H))
defs.append('<mask id="rainSurgeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><ellipse cx="%d" cy="320" rx="330" ry="250" fill="url(#litSpot)"/></mask>' % (W, H, GX))
rain.append('<!-- the surge: the rain around the machine lit up --><rect x="0" y="0" width="%d" height="%d" fill="url(#rainLit)" mask="url(#rainSurgeMask)" opacity="0">%s</rect>' % (W, H, surge(SURGE_V, .9)))

# a few drops right in front of the lens: large, out of focus, falling fast on the rain's slant; green where the vat lights them
rad([(0, '#c8d4da', .05), (.7, '#c8d4da', .12), (.88, '#dfe8ec', .3), (1, '#dfe8ec', 0)], id='bokehCool')
rad([(0, GLOW_CORE, .08), (.7, GLOW_MID, .16), (.88, GLOW_CORE, .38), (1, GLOW_CORE, 0)], id='bokehLit')
brnd = random.Random(97)
bok = []
for i in range(9):
    x0 = brnd.uniform(-60, W - 200)
    per = brnd.choice((1.5, 2, 2.4, 3, 4))
    fall = .42 * brnd.uniform(.85, 1.15)
    r_ = brnd.uniform(3.5, 8)
    lit = x0 < 560
    t0 = brnd.uniform(0, per - fall - .05)
    # streaked along its fall by about a frame's travel, so it reads as one falling drop, not a chain of discs
    bok.append('<g opacity="0">'
               '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;%s %s;%s %s" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
               '<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;%s;%s;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/><ellipse cx="%s" cy="-20" rx="%s" ry="%s" fill="url(#%s)" transform="rotate(-25 %s -20)"/></g>' % (
                   f(.466 * (H + 40)), f(H + 40), f(.466 * (H + 40)), f(H + 40),
                   f(t0 / per), f((t0 + fall) / per), f(per), f(i * .53 % per),
                   f(t0 / per), f((t0 + .03) / per), f((t0 + fall - .03) / per), f((t0 + fall) / per), f(per), f(i * .53 % per), f(x0), f(r_), f(r_ + 15), 'bokehLit' if lit else 'bokehCool', f(x0)))
# (the drops read as soap bubbles at site size and were cut; the draws stay so nothing else moves)

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
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">The Genesis Prototype on Floria</title>\n  <desc id="scene-desc">A heavy industrial machine on wet rock, ringed by the growth its own seeds have raised, lets glowing seeds down a chute into a flood in a storm; the current spreads them across the plain, where some split and larvae swim out and others catch on rock and sprout; out in the distance the storm whips the water into whitecaps; far off a colossal tree rises from an island of young forest, its canopy spread under the clouds.</desc>\n'
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
          + layer('near', '<!-- ===================== THE GROWTH AT THE SOURCE, IN FRONT OF THE LENS ===================== -->\n' + '\n'.join(near))
          + layer('fronds', '<!-- ===================== NEAR FRONDS, a little out of focus this close (a baked soft edge: a live blur re-ran every frame as they swayed) ===================== -->\n' + '\n'.join(fr))
          + layer('rain', '<!-- ===================== RAIN ===================== -->\n' + '\n'.join(rain))
          + layer('top', '<!-- ===================== FINISH ===================== -->\n' + '\n'.join(top)))

page = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
page = page.replace('<!--LAYERS-->', layers)
io.open(os.path.join(HERE, 'source.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('ok', len(page) // 1024, 'KB')
