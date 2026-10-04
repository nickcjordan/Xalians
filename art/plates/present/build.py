"""Build the Present plate: python art/plates/present/build.py writes source.html beside it.

Generated rather than hand-edited: the crowd, the tiers, the city and the lights are procedural.
Edit this script, run it, then export with scripts/plates/export-plate.py present. Every drawn
piece traces to a line of PIECES below.
"""
import io
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1536, 1152
HZ = 560  # the far city's ground line

CONCEPT = """The present day. The one machine that prints Scrambler Tokens, the Mercurius Machine, stands
on Valleron, and King Kozrak holds it: his citadel, the greatest of the Vallerii spires, rises over the
city with the Machine burning gold at its apex, and his searchlights sweep the city. He has called a
galactic tournament. Below the citadel, one of his arenas is packed to the rim under floodlights, hung
with the banners of the factions that have come from across Xalia, and a fight is on its floor: two
squads of creatures, shown only as abstract blobs in their elements' colors (Nick, 2026-10-03: at this
distance they need no detail), trade little attack moves, and when their leaders' great attacks meet in
the middle it flashes, rings dust over the floor and sets the crowd roaring. Above the arena, projected from the king's box, hangs the prize: a Scrambler
Token, the same printed genome card carried home in beat 06. Ships from across Xalia come down out of
a sky where the plague still smolders in the galaxy's arms and settle on the city's landing decks, and a
faction's ship waits on a deck in the foreground, its hatch open, to carry a token home."""

PIECES = """Piece list (far to near). Key light: the arena's floodlights, cold white, making the bowl the
brightest place in the frame; second light: the Machine's gold at the citadel's apex and the token's
gold over the arena; the rest is blue night lit warm from below by the city.
- sky: deep night, blue-black at the top to a warm smoke glow over the city. Static.
- stars: sparse, fewer toward the city glow. Static.
- the galaxy: a band of pale gold across the sky, its arms smoldering crimson in patches (the plague
  of beat 05, still burning). Static; the smolder breathes slowly.
- clouds: low banks of smoke cloud over the city lit warm from below, thin dark bands higher up. Static.
- arriving ships: craft gliding down out of the sky with their faction's running lights (fire orange,
  ice blue, storm yellow, plant green) and a short faint trail; each levels out, settles on a landing deck,
  holds, and fades.
- far city: Valleron, crowded to the horizon (most life gathered here): rows of blocks and lesser Vallerii
  spires in haze, paler and dimmer with distance, thousands of warm windows; a few spires carry red
  obstruction beacons, some of which blink.
- landing decks: columns carrying wide lamp-railed platforms, as on Grimedes, three at left and one at
  right, the arriving ships' destinations.
- the near city: blocks and lit streets on the ground all around the arena, in two depth bands around
  the citadel's foot.
- the citadel: Kozrak's stronghold, the greatest Vallerii spire, right of center, flanked by two lesser
  spires; its left faces lit warm from below by the arena, its upper sections in the Machine's gold.
- the Mercurius Machine: at the citadel's apex, a gold core held in a level ring and an upright ring
  that turns, like a gyroscope; it glows and pulses slowly.
- the banners: two long crimson banners on the citadel's foot carrying the Machine's gyroscope as sigil.
- searchlights: one beam from each flanking spire's tip, sweeping slowly across the city and the arena's
  far side, never in step.
- the king's box: a lit, canopied box on the arena's far rim facing the floor, hung with crimson, the
  projector's lens on its roof.
- the projection: a cone of gold light from the lens up to the token.
- the token (the prize): a Scrambler Token shown huge in light above the arena, in open sky over the
  skyline: the printed card of beat 06 (cut top right corner, a scrambled helix, a row of gold contacts),
  drawn in luminous gold lines, scan lines drifting through it, turning slowly.
- the arena: a vast elliptical bowl in the lower middle: outer facade with lit arches, the rim, tiers
  stepping down to the floor, every tier packed with the crowd as thousands of small warm lights.
- faction banners: six long banners in element colors hanging from the far rim over the top tiers.
- floodlight masts: lattice towers on the rim, each with a bank of lamps tipped toward the floor and a
  soft cone of light onto it; the lit haze over the bowl.
- the floor: sand under the floodlights, a ring marked on it, scorch marks from earlier fights.
- the squads: two sides of three creatures each on the floor's far half, at the arena's scale: little dots
  about three crowd dots across (Nick, 2026-10-04: from this distance a creature is only a dot; no eyes,
  legs or detail), each a small blob of its element's color (a body and a smaller head on the side it
  faces) over a small glow: storm, plant and ice at left; fire, water and rock at right. They bob, nudge
  forward as they attack and back as they are hit, flashing the attacker's color.
- the attack moves, one about every 1.25 s: storm's bolt at fire, fire's fireball at ice, plant's volley of
  darts at rock, water's globe of water at ice, ice's shards at rock, rock's thrown stone at storm; each lands with
  a glow of its element and a spray of sparks.
- the big exchange: fire's great fireball and storm's great bolt meet in the middle: a white-hot flash with
  both colors, a starburst, the floor lit, a ring of dust, a puff of dust, sparks.
- the crowd's roar: a swell after the volley lands and a great one after the big exchange; the crowd's lights
  swell and a warm band of light runs round the tiers.
- near roofs: dark rooftops in the foreground at left with a mast and a blinking beacon (under the
  archive screen's record label).
- the landing deck: in the foreground at right, a high deck with lit edge lamps and a floodlight pole;
  a docked faction ship on it (a long hull in its faction's green, a lit cockpit, a running stripe, idling
  engines, an open lit hatch over a lowered ramp), waiting.
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


def rad(stops, cx=.5, cy=.5, r=.5, id=None, units=None, fx=None, fy=None):
    gid[0] += 1
    i = id or 'g%d' % gid[0]
    u = ' gradientUnits="userSpaceOnUse"' if units else ''
    fo = (' fx="%s" fy="%s"' % (f(fx), f(fy))) if fx is not None else ''
    s = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (f(o), c, (' stop-opacity="%s"' % f(a)) if a is not None and a < 1 else '') for o, c, a in stops)
    defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s"%s%s>%s</radialGradient>' % (i, f(cx), f(cy), f(r), fo, u, s))
    return i


def anim(attr, values, dur, phase, keyTimes=None, spline=False, calc=None):
    kt = ' keyTimes="%s"' % keyTimes if keyTimes else ''
    n = len(values.split(';')) - 1
    sp = (' calcMode="spline" keySplines="%s"' % ';'.join(['.42 0 .58 1'] * n)) if spline else (' calcMode="%s"' % calc if calc else '')
    return '<animate attributeName="%s" values="%s"%s%s dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (attr, values, kt, sp, f(dur), f(phase))


def rot(values, dur, phase, keyTimes=None, spline=False):
    kt = ' keyTimes="%s"' % keyTimes if keyTimes else ''
    n = len(values.split(';')) - 1
    sp = (' calcMode="spline" keySplines="%s"' % ';'.join(['.42 0 .58 1'] * n)) if spline else ''
    return '<animateTransform attributeName="transform" type="rotate" values="%s"%s%s dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (values, kt, sp, f(dur), f(phase))


def trans(values, dur, phase, keyTimes=None, typ='translate', spline=False):
    kt = ' keyTimes="%s"' % keyTimes if keyTimes else ''
    n = len(values.split(';')) - 1
    sp = (' calcMode="spline" keySplines="%s"' % ';'.join(['.42 0 .58 1'] * n)) if spline else ''
    return '<animateTransform attributeName="transform" type="%s" values="%s"%s%s dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (typ, values, kt, sp, f(dur), f(phase))


def ell(t):
    """The arena's tier ellipse at depth t (0 the rim, 1 the floor's edge): cx, cy, rx, ry."""
    return (AX, lerp(RIM_CY, FLOOR_CY, t), lerp(RIM_RX, FLOOR_RX, t), lerp(RIM_RY, FLOOR_RY, t))


def ept(e, a):
    cx, cy, rx, ry = e
    return (cx + rx * math.cos(a), cy + ry * math.sin(a))


def arc_pts(e, a0, a1, n=48):
    return [ept(e, lerp(a0, a1, i / n)) for i in range(n + 1)]


# ------------------------------------------------------------------ palette
SKY_TOP, SKY_MID, SKY_LOW, SKY_GLOW = '#03040a', '#0a0f24', '#1b1a33', '#4b3038'
GOLD, GOLD_HOT, GOLD_DEEP = '#f2c45a', '#fff1c4', '#8a5a18'
PLAGUE, PLAGUE_DEEP = '#c23a3a', '#5a1420'
FLOOD = '#f1f3ff'
WIN = '#ffcf8a'
STONE_LIT, STONE_MID, STONE_DARK = '#6e6152', '#3a332c', '#17141a'
ELEC, FIRE = '#8fd8ff', '#ff8a3a'
FACTIONS = ['#ff8a3a', '#9fdcff', '#ffe066', '#8be08a']

# the arena's geometry
AX = 700
RIM_CY, RIM_RX, RIM_RY = 818, 660, 212
FLOOR_CY, FLOOR_RX, FLOOR_RY = 900, 380, 124
FCX, FCY = AX, FLOOR_CY  # the floor's center, where the fight is

# the citadel and the token
CX = 1150  # the citadel's axis
CROWN_Y = 236  # the Machine's center
TOK_CX, TOK_CY, TOK_W = 700, 330, 212  # the projected token, in open sky over the arena
LENS = (1004, 520)  # the gallery's projector lens

# ------------------------------------------------------------------ filters
defs.append('''<filter id="soft2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="soft4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="soft8" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="soft16" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
<filter id="soft30" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>''')

lamp = {}
for name, c in [('gold', GOLD), ('flood', FLOOD), ('win', WIN), ('red', '#ff4a3a'), ('elec', ELEC), ('fire', FIRE), ('plague', PLAGUE)] + [('fac%d' % i, c) for i, c in enumerate(FACTIONS)]:
    lamp[name] = rad([(0, c, 1), (.25, c, .55), (1, c, 0)], id='lamp-' + name)

# ------------------------------------------------------------------ sky layer (static)
sky = []
g_sky = lin([(0, SKY_TOP, 1), (.38, SKY_MID, 1), (.62, SKY_LOW, 1), (.86, SKY_GLOW, 1), (1, '#6a4038', 1)], 0, 0, 0, HZ + 20, units=True, id='skyFill')
sky.append('<rect width="%d" height="%d" fill="url(#skyFill)"/>' % (W, H))
# stars
sr = random.Random(3)
st = []
for _ in range(420):
    x, y = sr.uniform(0, W), sr.uniform(0, HZ - 40)
    fade = 1 - y / (HZ - 40)
    if sr.random() > fade * 1.15:
        continue
    st.append('<circle cx="%s" cy="%s" r="%s" fill="#e8ecff" opacity="%s"/>' % (f(x), f(y), f(sr.uniform(.5, 1.25)), f(sr.uniform(.25, .8) * fade)))
sky.append('<!-- stars --><g>%s</g>' % ''.join(st))
# the galaxy: a band from low left to high right behind the citadel, gold dust in patches, its arms smoldering
GAL = lambda t: (lerp(-120, 1660, t), lerp(500, 70, t) + 60 * math.sin(t * math.pi * 1.2))
gal = []
gr = random.Random(5)
g_dust = rad([(0, '#f6e3b8', .55), (.5, '#c8aa80', .18), (1, '#c8aa80', 0)], id='galDust')
g_core = rad([(0, '#fff3d6', .8), (.3, '#f4d6a0', .35), (1, '#f4d6a0', 0)], id='galCore')
g_smol = rad([(0, PLAGUE, .55), (.4, PLAGUE_DEEP, .3), (1, PLAGUE_DEEP, 0)], id='galSmolder')
for i in range(34):
    t = i / 33
    x, y = GAL(t)
    ang = math.degrees(math.atan2(-430, 1780))
    w = gr.uniform(180, 320)
    gal.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#galDust)" transform="rotate(%s %s %s)" opacity="%s"/>' % (f(x + gr.uniform(-30, 30)), f(y + gr.uniform(-25, 25)), f(w), f(gr.uniform(48, 92)), f(ang), f(x), f(y), f(gr.uniform(.3, .6))))
# the core, left of the citadel, where the band is brightest
gal.append('<ellipse cx="1340" cy="156" rx="260" ry="104" fill="url(#galCore)" transform="rotate(-14 1340 156)" opacity=".7"/>')
gal.append('<ellipse cx="1340" cy="156" rx="110" ry="44" fill="url(#galCore)" transform="rotate(-14 1340 156)" opacity=".65"/>')
# dust lanes: darker streaks along the band
for i in range(10):
    t = gr.uniform(.05, .95)
    x, y = GAL(t)
    gal.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s" transform="rotate(-13 %s %s)" filter="url(#soft8)"/>' % (f(x), f(y + gr.uniform(-6, 10)), f(gr.uniform(60, 140)), f(gr.uniform(5, 10)), SKY_MID, f(gr.uniform(.35, .6)), f(x), f(y)))
# star dust: fine points along the band
for _ in range(1100):
    t = gr.random() if gr.random() < .7 else gr.gauss(.82, .06)
    x, y = GAL(t)
    d = gr.gauss(0, 46)
    gal.append('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (f(x + gr.uniform(-40, 40)), f(y + d), f(gr.uniform(.4, 1.1)), gr.choice(['#fff4dc', '#ffe0b0', '#f0e8ff']), f(gr.uniform(.2, .7) * math.exp(-(d / 50) ** 2))))
sky.append('<!-- the galaxy: a band of gold dust with a brighter core --><g filter="url(#soft2)">%s</g>' % ''.join(gal[:-1100]))
sky.append('<g>%s</g>' % ''.join(gal[-1100:]))
# the plague's smolder in the arms (static base; it breathes in skyfx)
SMOLDER = [(.12, 0, 120, 30), (.28, -14, 90, 22), (.47, 18, 70, 18), (.78, -10, 110, 26), (.9, 12, 80, 20)]
sm = []
for (t, dy, rx, ry) in SMOLDER:
    x, y = GAL(t)
    sm.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#galSmolder)" transform="rotate(-13 %s %s)" opacity=".75"/>' % (f(x), f(y + dy), f(rx), f(ry), f(x), f(y)))
sky.append('<!-- the plague smoldering in the galaxy\'s arms -->' + ''.join(sm))

# clouds: low banks of smoke cloud over the city, lit warm from below by its lights, and a few thin dark bands drifting across
# the galaxy higher up. Ragged edges come from a displacement of their soft shapes (static, so the filter is free).
defs.append('<filter id="cloudEdge" x="-20%" y="-60%" width="140%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".012 .05" numOctaves="3" seed="8" result="n"/>'
            '<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feDisplacementMap in="b" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>')


def cloud_band(y, x0, x1, th, seed, top, bot, op, n=14):
    r = random.Random(seed)
    g = lin([(0, top, 1), (.6, mix(top, bot, .6), 1), (1, bot, 1)], 0, y - th, 0, y + th * .6, units=True)
    sh = []
    for i in range(n):
        cx = lerp(x0, x1, (i + r.random()) / n)
        sh.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(cx), f(y + r.uniform(-th * .25, th * .2)), f(r.uniform(60, 150)), f(r.uniform(th * .35, th * .7))))
    return '<g fill="url(#%s)" opacity="%s" filter="url(#cloudEdge)">%s</g>' % (g, f(op), ''.join(sh))


sky.append('<!-- high thin cloud across the galaxy -->' + cloud_band(250, -100, 900, 26, 51, '#141428', '#23203a', .55, 10))
sky.append('<!-- high thin cloud at right -->' + cloud_band(150, 900, 1650, 20, 52, '#121226', '#201c34', .45, 8))
sky.append('<!-- low smoke cloud over the city, lit from below -->' + cloud_band(468, -120, 1660, 46, 53, '#1c1a2c', '#7a4a42', .75, 22))
sky.append('<!-- a second low bank, nearer the horizon -->' + cloud_band(520, -120, 1660, 34, 54, '#2a2234', '#a0644a', .55, 20))

# ------------------------------------------------------------------ skyfx layer (animated): the smolder breathing, arriving ships
skyfx = []
for k, (t, dy, rx, ry) in enumerate(SMOLDER):
    x, y = GAL(t)
    per = 9 + k * 1.7
    skyfx.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#galSmolder)" transform="rotate(-13 %s %s)" opacity="0">%s</ellipse>' % (
        f(x), f(y + dy), f(rx * 1.5), f(ry * 1.5), f(x), f(y), anim('opacity', '0;.85;.3;.7;0', per, per * (.13 + .21 * k), '0;.3;.55;.75;1', spline=True)))


for i_, c_ in enumerate(FACTIONS):
    lin([(0, c_, .3), (1, c_, 0)], 0, 0, 1, 0, id='trail-fac%d' % i_)


def ship(scale, hue):
    """A small craft seen from the side and below, nose left: a pale hull that leads the eye, a fin, running lights, the engine glow behind."""
    s = scale
    return ('<path d="M%s 0 L%s %s L%s %s L%s %s L%s %s Z" fill="#4a4d62"/>' % (f(-22 * s), f(-8 * s), f(-5 * s), f(14 * s), f(-6 * s), f(20 * s), f(-2 * s), f(18 * s), f(4 * s))
            + '<path d="M%s %s L%s %s L%s %s Z" fill="#5c6078"/>' % (f(4 * s), f(-5.5 * s), f(12 * s), f(-11 * s), f(14 * s), f(-6 * s))
            + '<path d="M%s %s L%s %s L%s %s" stroke="#b4b8cc" stroke-width="%s" fill="none"/>' % (f(-21 * s), f(-.4 * s), f(-8 * s), f(-5 * s), f(14 * s), f(-6 * s), f(.9 * s))
            + '<path d="M%s %s L%s %s" stroke="#1a1b26" stroke-width="%s"/>' % (f(-18 * s), f(2.4 * s), f(17 * s), f(3 * s), f(1.4 * s))
            + '<path d="M%s %s L%s %s L%s %s Z" fill="#cfe8ff" opacity=".8"/>' % (f(-17 * s), f(-1.6 * s), f(-9 * s), f(-4.4 * s), f(-7 * s), f(-1.4 * s))
            + '<circle cx="%s" cy="%s" r="%s" fill="url(#lamp-%s)"/>' % (f(22 * s), f(0), f(8 * s), hue)
            + '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(20.5 * s), f(0), f(1.6 * s), '#ffffff')
            + '<circle cx="%s" cy="%s" r="%s" fill="url(#lamp-%s)" opacity=".9"/>' % (f(-4 * s), f(3 * s), f(4.5 * s), hue)
            + '<circle cx="%s" cy="%s" r="%s" fill="url(#lamp-red)" opacity=".8"/>' % (f(12 * s), f(-10.5 * s), f(3.5 * s)))


# arriving ships: (start, pad, scale, faction, period, phase). Each glides in, levels out, settles on its landing deck, holds, and fades.
ARRIVING = []  # drawn at the start of cityfx, in front of the far city and its decks
ARRIVALS = [((-100, 250), (236, 466), 1.8, 0, 22.13, 3.07), ((420, -60), (318, 478), 1.3, 1, 27.31, 6.97), ((-100, 400), (138, 481), 1.5, 2, 19.37, 9.23), ((1660, 380), (1470, 489), 1.4, 3, 24.19, 18.29)]
for (p0, p1, s, fac, per, ph) in ARRIVALS:
    nose_left = p1[0] < p0[0]
    flip = '' if nose_left else ' transform="scale(-1 1)"'
    ang = math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
    tilt = (ang - 180) if nose_left else ang
    tilt = max(-45, min(45, tilt * .8))
    trail = '<polygon points="%s,%s %s,0 %s,%s" fill="url(#trail-fac%d)">%s</polygon>' % (f(20 * s), f(-2 * s), f(46 * s), f(20 * s), f(2 * s), fac, anim('opacity', '1;1;0;0', per, ph, '0;.3;.45;1'))
    ARRIVING.append('<!-- an arriving ship --><g opacity="0">%s<g>%s<g>%s<g%s>%s%s</g></g></g></g>' % (
        anim('opacity', '0;1;1;0;0', per, ph, '0;.06;.7;.76;1'),
        trans('%s %s;%s %s;%s %s' % (f(p0[0]), f(p0[1]), f(p1[0]), f(p1[1]), f(p1[0]), f(p1[1])), per, ph, '0;.6;1').replace('repeatCount', 'calcMode="spline" keySplines=".25 .1 .4 1;0 0 1 1" repeatCount'),
        rot('%s;%s;0;0' % (f(tilt), f(tilt)), per, ph, '0;.42;.55;1'),
        flip, trail, ship(s, 'fac%d' % fac)))

# ------------------------------------------------------------------ city layer (static): the far city, landing towers, the citadel
city = []
cr = random.Random(21)
# warm smoke glow over the city
city.append('<ellipse cx="760" cy="%d" rx="1000" ry="150" fill="url(#%s)"/>' % (HZ - 20, rad([(0, '#a0603e', .5), (.6, '#6a3a34', .18), (1, '#6a3a34', 0)])))


def towers(y_base, n, hmin, hmax, wmin, wmax, top, bot, win_op, win_n, seed, xs=None, needles=0):
    r = random.Random(seed)
    out = []
    g = lin([(0, top, 1), (1, bot, 1)], 0, y_base - hmax, 0, y_base + 10, units=True)
    x = -30
    while x < W + 30:
        w = r.uniform(wmin, wmax)
        h = r.uniform(hmin, hmax)
        if r.random() < needles:
            h *= 1.9
            w *= .45
        y0 = y_base - h
        # a tower: a block with a stepped top
        p = [(x, y_base + 10), (x, y0 + 8), (x + w * .2, y0 + 8), (x + w * .2, y0), (x + w * .8, y0), (x + w * .8, y0 + 8), (x + w, y0 + 8), (x + w, y_base + 10)]
        out.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(p), g))
        # windows
        wins = []
        for _ in range(int(win_n * w * h / 2000)):
            wx = r.uniform(x + 2, x + w - 3)
            wy = r.uniform(y0 + 10, y_base)
            if r.random() < .55:
                wins.append('<rect x="%s" y="%s" width="1.6" height="1.2" fill="%s" opacity="%s"/>' % (f(wx), f(wy), r.choice([WIN, '#ffe3b0', '#ffb070', '#cfe0ff']), f(r.uniform(.4, 1) * win_op)))
        out.append(''.join(wins))
        x += w + r.uniform(-4, 8)
    return out


# Vallerii architecture, as on Grimedes in beat 04: three-faced tapering spires, ribbed, with collar ledges where the sections
# join, a lit spine of windows on the face toward the light, buttress fins at the foot and a needle mast at the tip.
# Template units: base half width 70, apex 560 up.
SP_FINS = [[(-88, 0), (-70, -96), (-70, 0)], [(88, 0), (70, -96), (70, 0)]]
SP_LEFT = [(-70, 0), (-24, -380), (-10, -500), (0, -560), (-4, -500), (-10, -380), (-30, 0)]
SP_MID = [(-30, 0), (-10, -380), (-4, -500), (0, -560), (4, -500), (10, -380), (30, 0)]
SP_RIGHT = [(30, 0), (10, -380), (4, -500), (0, -560), (10, -500), (24, -380), (70, 0)]
SP_COLLARS = [(-120, 52, 14), (-250, 38, 12), (-380, 25, 10), (-500, 11, 8)]
SP_WINDOWS = [(-58, -92, 5, 4.4), (-130, -170, 4.5, 3.8), (-204, -230, 4, 3.5), (-270, -300, 3.5, 3), (-338, -360, 3, 2.6), (-414, -440, 2.5, 2), (-506, -520, 1.5, 1.2)]
spire_sets = {}
BEACONS = []


def spire_set(name, lit_lo, lit_hi, mid_lo, mid_hi, dark_lo, dark_hi, rib, collar):
    """Three face gradients (bottom to top) for spires under one light."""
    spire_sets[name] = dict(
        left=lin([(0, lit_lo, 1), (1, lit_hi, 1)], 0, 1, 0, 0, id='spL-' + name),
        mid=lin([(0, mid_lo, 1), (1, mid_hi, 1)], 0, 1, 0, 0, id='spM-' + name),
        right=lin([(0, dark_lo, 1), (1, dark_hi, 1)], 0, 1, 0, 0, id='spR-' + name),
        rib=rib, collar=collar)


# far spires are hazed toward the city glow; mid spires carry the arena's warm light low on the left face
spire_set('far', '#4e4252', '#2e2a40', '#3c3448', '#262238', '#2a2436', '#1e1a2e', '#4a4258', '#4e4658')
spire_set('mid', '#6a5244', '#24202e', '#3a3238', '#1a1824', '#1a161e', '#100e16', '#4a4048', '#57494a')
spire_set('cit', '#8a6448', '#2c2430', '#4a3a36', '#1c1822', '#1c1618', '#0e0c12', '#5a4a44', '#6a5644')


def spire(x, by, h, hw, set_, windows=True, mast=True, beacon=None, flip=False, win_op=1.0):
    S = spire_sets[set_]
    sx, sy = hw / 70.0 * (-1 if flip else 1), h / 560.0
    o = ['<g transform="translate(%s %s) scale(%s %s)">' % (f(x), f(by), f(sx), f(sy))]
    o.append('<polygon points="%s" fill="%s"/>' % (pts(SP_FINS[0]), S['rib']))
    o.append('<polygon points="%s" fill="#0c0b10"/>' % pts(SP_FINS[1]))
    o.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(SP_LEFT), S['left']))
    o.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(SP_MID), S['mid']))
    o.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(SP_RIGHT), S['right']))
    o.append('<g stroke="%s" stroke-width="1.4" opacity=".6" vector-effect="non-scaling-stroke">%s</g>' % (S['rib'], ''.join(
        '<line x1="%s" y1="0" x2="%s" y2="-380"/>' % (f(a), f(b)) for a, b in [(-56, -19), (-42, -14), (42, 14), (56, 19), (-14, -5), (14, 5)])))
    for (cy, cw, th) in SP_COLLARS:
        o.append('<polygon points="%s" fill="%s"/>' % (pts([(-cw, cy), (cw, cy), (cw * .9, cy - th), (-cw * .9, cy - th)]), S['collar']))
        o.append('<polygon points="%s" fill="#0b0a0e" opacity=".55"/>' % pts([(-cw, cy), (cw, cy), (cw * .92, cy + th * .6), (-cw * .92, cy + th * .6)]))
    if windows:
        for (y0, y1, w0, w1) in SP_WINDOWS:
            o.append('<polygon points="%s" fill="%s" opacity="%s"/>' % (pts([(-w0, y0), (w0, y0), (w1, y1), (-w1, y1)]), WIN, f(.85 * win_op)))
    if mast:
        o.append('<g stroke="#15141a" stroke-width="2.6" vector-effect="non-scaling-stroke"><line x1="0" y1="-560" x2="0" y2="-640"/><line x1="-9" y1="-600" x2="9" y2="-600"/></g>')
    o.append('</g>')
    if beacon and TOK_CX - TOK_W / 2 - 30 < x < TOK_CX + TOK_W / 2 + 30 and by - 640 * sy < TOK_CY + 110:
        beacon = None  # keep every beacon clear of the token
    if beacon:
        BEACONS.append((x, by - 640 * sy))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="url(#lamp-%s)" opacity=".85"/><circle cx="%s" cy="%s" r="1.6" fill="#ffe0b0"/>' % (
            f(x), f(by - 640 * sy), f(10 + 6 * sy), beacon, f(x), f(by - 640 * sy)))
    return ''.join(o)


# the far city: rows of blocks with lesser spires among them, far to near, each row paler, smaller and dimmer the farther back
city.append('<!-- far city, back row: hazed into the glow -->' + ''.join(towers(HZ - 34, 0, 18, 46, 20, 44, '#2e2a42', '#3a3044', .35, 3, 31)))
fr = random.Random(77)
for _ in range(9):
    x_ = fr.uniform(20, 1500)
    if 1060 < x_ < 1350:
        continue  # the citadel stands there
    city.append(spire(x_, HZ - 30, fr.uniform(70, 130), fr.uniform(9, 14), 'far', mast=fr.random() < .5, beacon='red' if fr.random() < .5 else None, flip=fr.random() < .5, win_op=.4))
city.append('<rect x="0" y="%d" width="%d" height="60" fill="url(#%s)"/>' % (HZ - 80, W, lin([(0, '#5a3a40', 0), (1, '#5a3a40', .5)])))
city.append('<!-- far city, middle row -->' + ''.join(towers(HZ - 12, 0, 26, 70, 18, 46, '#221f34', '#2a2436', .6, 4, 32)))
for _ in range(7):
    x_ = fr.uniform(380, 1500)
    if 880 < x_ < 1420:
        continue  # the citadel stands there
    city.append(spire(x_, HZ - 8, fr.uniform(120, 190), fr.uniform(14, 20), 'far', beacon='red', flip=fr.random() < .5, win_op=.6))
city.append('<rect x="0" y="%d" width="%d" height="50" fill="url(#%s)"/>' % (HZ - 50, W, lin([(0, '#4a3038', 0), (1, '#4a3038', .45)])))
city.append('<!-- far city, front row -->' + ''.join(towers(HZ + 30, 0, 40, 96, 24, 60, '#16141f', '#1c1822', .85, 5, 33)))
# ground haze along the base of the city
city.append('<rect x="0" y="%d" width="%d" height="120" fill="url(#%s)"/>' % (HZ - 30, W, lin([(0, '#3a2a34', 0), (.5, '#3a2a34', .55), (1, '#2a2030', .9)])))


def deck_tower(x, by, h, s):
    """A landing deck, as on Grimedes: a column carrying a wide flat platform with a lamp rail. Base (x, by), deck h above."""
    yt = by - h
    o = ['<g>']
    o.append('<path d="M%s %s L%s %s M%s %s L%s %s" stroke="#22202a" stroke-width="1" opacity=".8"/>' % (f(x - 58 * s), f(yt + 2), f(x - 26 * s), f(by), f(x + 58 * s), f(yt + 2), f(x + 26 * s), f(by)))
    o.append('<polygon points="%s" fill="#1a1822"/>' % pts([(x - 9 * s, by), (x - 5 * s, yt), (x + 5 * s, yt), (x + 9 * s, by)]))
    o.append('<polygon points="%s" fill="#121018"/>' % pts([(x - 62 * s, yt), (x + 62 * s, yt), (x + 50 * s, yt + 16 * s), (x - 50 * s, yt + 16 * s)]))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#2c2a34"/>' % (f(x), f(yt), f(62 * s), f(9 * s)))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#3a3842"/>' % (f(x), f(yt - 1), f(60 * s), f(7 * s)))
    o.append(''.join('<circle cx="%s" cy="%s" r="%s" fill="#ffb454"/>' % (f(x + dx * s), f(yt - 14 * s), f(1.6 + .6 * s)) for dx in (-52, -30, -8, 14, 36, 56)))
    o.append('<path d="M%s %s L%s %s" stroke="#4a4852" stroke-width="1.2"/>' % (f(x - 60 * s), f(yt - 13 * s), f(x + 60 * s), f(yt - 13 * s)))
    o.append('</g>')
    return ''.join(o)


# landing decks: the arriving ships' destinations, at left and far right
LT = [(236, 470, 150, .62), (318, 482, 118, .5), (138, 488, 104, .46), (1470, 492, 112, .5)]  # (x, deck y, height, scale)
for (x_, yt_, h_, s_) in LT:
    city.append('<!-- a landing deck -->' + deck_tower(x_, yt_ + h_, h_, s_))


def city_blocks(y_from, y_to, seed):
    """The near city around the arena: rows of blocks on the ground plane from the far city's edge to the bottom of the frame,
    larger and darker toward the viewer, roofs catching the glow, windows lit, street lamps along each row's street."""
    out = []
    r = random.Random(seed)
    y = y_from
    while y < y_to:
        s = (y - 520) / 600.0  # depth scale: small far, large near
        g_front = lin([(0, mix('#2a2432', '#15121a', min(1, s)), 1), (1, mix('#1a1620', '#0a090d', min(1, s)), 1)], 0, y - 70 * s, 0, y, units=True)
        roof = mix('#4a3e4a', '#2a2430', min(1, s))
        x = -40 + r.uniform(0, 40 * s)
        row = []
        lamps = []
        while x < W + 40:
            w = r.uniform(34, 90) * (.4 + s)
            h = r.uniform(16, 60) * (.35 + s)
            d = r.uniform(8, 20) * (.3 + s)
            row.append('<rect x="%s" y="%s" width="%s" height="%s" fill="url(#%s)"/>' % (f(x), f(y - h), f(w), f(h + 2), g_front))
            row.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (f(x), f(y - h - d * .45), f(w), f(d * .45), roof))
            row.append('<rect x="%s" y="%s" width="%s" height="1" fill="#8a6e5a" opacity=".35"/>' % (f(x), f(y - h - d * .45), f(w)))
            for _ in range(int(w * h / (260 * (.4 + s)))):
                if r.random() < .5:
                    row.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (
                        f(r.uniform(x + 2, x + w - 4)), f(r.uniform(y - h + 3, y - 3)), f(1.4 + 1.6 * s), f(1.2 + 1.8 * s), r.choice([WIN, '#ffe3b0', '#ffb070']), f(r.uniform(.35, .9))))
            x += w + r.uniform(2, 14) * (.4 + s)
        out.append(''.join(row))
        out.append('<rect x="0" y="%s" width="%d" height="%s" fill="#0c0a0e" opacity=".85"/>' % (f(y), W, f(6 + 10 * s)))
        lx = r.uniform(0, 30)
        while lx < W:
            lamps.append('<circle cx="%s" cy="%s" r="%s" fill="#ffc070" opacity=".75"/>' % (f(lx), f(y + 3 + 4 * s), f(.7 + 1.2 * s)))
            lx += 18 + 30 * s
        out.append('<g>%s</g>' % ''.join(lamps))
        y += 14 + 46 * s
    return out


city.append('<!-- the middle city: blocks and lit streets on the ground behind the citadel foot -->' + ''.join(city_blocks(588.0, 704.0, 41)))

# the citadel: Kozrak's stronghold, the greatest Vallerii spire, flanked by two lesser ones that carry the searchlights. Its left
# faces catch the arena's light from below; the Machine's gold falls on its upper sections.
CIT_BY, CIT_H, CIT_HW = 704, 520, 118
FLANK = [(988, 700, 300, 46, False), (1318, 704, 270, 42, True)]  # (x, base, height, half width, mirrored)
for (x_, by_, h_, hw_, fl_) in FLANK:
    city.append('<!-- a flanking spire -->' + spire(x_, by_, h_, hw_, 'mid', mast=False, flip=fl_))
CROWN_Y = CIT_BY - CIT_H + 60  # the Machine's center
defs.append('<clipPath id="citClip"><rect x="0" y="%s" width="%d" height="%d"/></clipPath>' % (f(CROWN_Y + 26), W, H))
city.append('<!-- the citadel, its point ending at a collar under the Machine --><g clip-path="url(#citClip)">' + spire(CX, CIT_BY, CIT_H, CIT_HW, 'cit', mast=False) + '</g>'
            + '<ellipse cx="%s" cy="%s" rx="38" ry="7" fill="#2e2622"/><path d="M%s %s A38 7 0 0 1 %s %s" fill="none" stroke="%s" stroke-width="1.4" opacity=".8"/>' % (f(CX), f(CROWN_Y + 27), f(CX - 38), f(CROWN_Y + 27), f(CX + 38), f(CROWN_Y + 27), GOLD)
            + '<path d="M%s %s L%s %s M%s %s L%s %s" stroke="#2a2420" stroke-width="4"/>' % (f(CX - 30), f(CROWN_Y + 26), f(CX - 52), f(CROWN_Y + 20), f(CX + 30), f(CROWN_Y + 26), f(CX + 52), f(CROWN_Y + 20)))
# warm uplight from the arena on the citadel's foot
city.append('<polygon points="%s" fill="url(#%s)"/>' % (pts([(CX - CIT_HW * 1.26, CIT_BY), (CX - CIT_HW * .4, CIT_BY - 230), (CX + CIT_HW * .4, CIT_BY - 230), (CX + CIT_HW * 1.26, CIT_BY)]), lin([(0, '#e0a868', .28), (1, '#e0a868', 0)], 0, 1, 0, 0)))
# the citadel's needle: rises from the Machine's core to a gold beacon
city.append('<path d="M%s %s L%s %s" stroke="#16141a" stroke-width="4"/>' % (f(CX), f(CROWN_Y - 20), f(CX), f(CROWN_Y - 128)))
city.append('<circle cx="%s" cy="%s" r="14" fill="url(#lamp-gold)"/><circle cx="%s" cy="%s" r="2" fill="%s"/>' % (f(CX), f(CROWN_Y - 130), f(CX), f(CROWN_Y - 130), GOLD_HOT))

# the banners: two long crimson banners with the gold ring sigil, hanging on the citadel's foot either side of its lit spine
for bx in (CX - 62, CX + 38):
    city.append('<!-- a banner --><g><path d="M%s 506 L%s 506 L%s 664 L%s 652 L%s 664 Z" fill="#5a1018"/>' % (f(bx), f(bx + 24), f(bx + 24), f(bx + 12), f(bx))
                + '<path d="M%s 506 L%s 664" stroke="#7a1a22" stroke-width="3" opacity=".7"/>' % (f(bx + 4), f(bx + 4))
                + '<ellipse cx="%s" cy="540" rx="8" ry="2.6" fill="none" stroke="%s" stroke-width="1.4"/><ellipse cx="%s" cy="540" rx="3" ry="8" fill="none" stroke="%s" stroke-width="1.4"/>' % (f(bx + 12), GOLD, f(bx + 12), GOLD)
                + '<circle cx="%s" cy="540" r="1.8" fill="%s"/>' % (f(bx + 12), GOLD_HOT)
                + '<rect x="%s" y="502" width="32" height="5" fill="#2a2228"/></g>' % f(bx - 4))

mm = []
# the Mercurius Machine: a gold core held at the citadel's apex inside two great rings, one upright and one level around the
# needle, like a gyroscope; the level ring passes behind the needle and in front of it. Its light falls on the spire's upper sections.
mm.append('<circle cx="%d" cy="%d" r="150" fill="url(#%s)"/>' % (CX, CROWN_Y, rad([(0, GOLD, .42), (.4, GOLD_DEEP, .16), (1, GOLD_DEEP, 0)], id='machineHalo')))
RING_LV = (CX, CROWN_Y + 6, 74, 20)  # the level ring
RING_UP = (CX, CROWN_Y, 34, 64)  # the upright ring (its turning is in cityfx)
# the level ring's back half, behind the core
mm.append('<path d="M%s %s A%s %s 0 0 1 %s %s" fill="none" stroke="#2a2420" stroke-width="9"/>' % (f(CX - 74), f(CROWN_Y + 6), f(74), f(20), f(CX + 74), f(CROWN_Y + 6)))
mm.append('<path d="M%s %s A%s %s 0 0 1 %s %s" fill="none" stroke="%s" stroke-width="1.4" opacity=".55"/>' % (f(CX - 74), f(CROWN_Y + 4), f(74), f(20), f(CX + 74), f(CROWN_Y + 4), GOLD))
# the core
mm.append('<circle cx="%d" cy="%d" r="22" fill="url(#%s)"/>' % (CX, CROWN_Y, rad([(0, GOLD_HOT, 1), (.5, GOLD, 1), (1, GOLD_DEEP, 1)])))
MACHINE_FRONT = ('<path d="M%s %s A%s %s 0 0 0 %s %s" fill="none" stroke="#2e2622" stroke-width="10"/>' % (f(CX - 74), f(CROWN_Y + 6), f(74), f(20), f(CX + 74), f(CROWN_Y + 6))
                 + '<path d="M%s %s A%s %s 0 0 0 %s %s" fill="none" stroke="%s" stroke-width="2" opacity=".85"/>' % (f(CX - 74), f(CROWN_Y + 3), f(74), f(20), f(CX + 74), f(CROWN_Y + 3), GOLD_HOT)
                 # three clamps where the level ring is held
                 + ''.join('<rect x="%s" y="%s" width="7" height="12" fill="#3a2e24" stroke="%s" stroke-width=".8"/>' % (f(CX + dx - 3.5), f(CROWN_Y + 6 + dy - 6), GOLD) for dx, dy in [(-52, 14), (0, 20), (52, 14)]))
city.append('<!-- the Mercurius Machine -->' + ''.join(mm))


city.append('<!-- the near city: blocks and lit streets on the ground in front of the citadel -->' + ''.join(city_blocks(704.0, H + 60, 42)))

# ------------------------------------------------------------------ cityfx layer (animated)
cityfx = list(ARRIVING)
# obstruction beacons on the far spires: a few of them blink, each on its own clock
for k_, (x_, y_) in enumerate(BEACONS[::2]):
    cityfx.append('<circle cx="%s" cy="%s" r="8" fill="url(#lamp-red)" opacity="0">%s</circle>' % (f(x_), f(y_), anim('opacity', '0;1;1;0;0', 2.2 + k_ * .37, k_ * .9, '0;.06;.22;.32;1')))
# the Machine's pulse
cityfx.append('<circle cx="%d" cy="%d" r="80" fill="url(#lamp-gold)" opacity=".2">%s</circle>' % (CX, CROWN_Y, anim('opacity', '.15;.45;.25;.5;.15', 6.4, 2.1, '0;.3;.5;.72;1', spline=True)))
# the Machine's upright ring turning about the needle, and the level ring's front half in front of it
cityfx.append('<!-- the upright ring --><ellipse cx="%s" cy="%s" rx="64" ry="%s" fill="none" stroke="#3a2e24" stroke-width="7">%s</ellipse>' % (f(CX), f(CROWN_Y), f(RING_UP[3]), anim('rx', '64;45;5;45;64', 11, 2.4, '0;.25;.5;.75;1'))
              + '<ellipse cx="%s" cy="%s" rx="64" ry="%s" fill="none" stroke="%s" stroke-width="1.6" opacity=".8">%s</ellipse>' % (f(CX), f(CROWN_Y), f(RING_UP[3] - 3), GOLD_HOT, anim('rx', '61;43;3;43;61', 11, 2.4, '0;.25;.5;.75;1')))
cityfx.append(MACHINE_FRONT)
# searchlights from the citadel's shoulders: soft beams that sweep slowly, never in step
g_beam = lin([(0, '#e8f0ff', .5), (.5, '#e8f0ff', .16), (1, '#e8f0ff', 0)], 0, 0, 1, 0, id='beam')
for (x, y, a0, a1, per, ph, ln) in [(988, 404, 156, 166, 26.13, 4.07, 820), (1318, 438, 14, 56, 31.17, 19.03, 700)]:
    beam = '<polygon points="0,-4 %s,-46 %s,46 0,4" fill="url(#beam)" filter="url(#soft8)"/><polygon points="0,-1.5 %s,-12 %s,12 0,1.5" fill="url(#beam)" opacity=".7" filter="url(#soft2)"/>' % (f(ln), f(ln), f(ln * .8), f(ln * .8))
    cityfx.append('<!-- a searchlight --><g transform="translate(%s %s)"><g>%s%s</g><circle r="6" fill="#f4f6ff"/></g>' % (
        f(x), f(y), rot('%s;%s;%s' % (f(a0), f(a1), f(a0)), per, ph, '0;.5;1', spline=True), beam))
# the projection: a cone of gold light from the lens on the king's box roof up to the token's lower edge
TH = TOK_W * 46 / 74
LENS = (AX, RIM_CY - RIM_RY - 36)
col_top = TOK_CY + TH * .5 - 4
g_col = lin([(0, GOLD, .08), (.6, GOLD, .26), (1, GOLD, .42)], 0, col_top, 0, LENS[1], units=True, id='projCol')
prize = []
prize.append('<!-- the projection cone --><polygon points="%s" fill="url(#projCol)" filter="url(#soft4)"/>' % pts([(TOK_CX - TOK_W * .44, col_top), (TOK_CX + TOK_W * .44, col_top), (LENS[0] + 5, LENS[1]), (LENS[0] - 5, LENS[1])]))
prize.append('<path d="M%s %s L%s %s M%s %s L%s %s" stroke="%s" stroke-width="1" opacity=".35"/>' % (f(LENS[0] - 3), f(LENS[1]), f(TOK_CX - TOK_W * .44), f(col_top), f(LENS[0] + 3), f(LENS[1]), f(TOK_CX + TOK_W * .44), f(col_top), GOLD_HOT))
prize.append('<circle cx="%s" cy="%s" r="12" fill="url(#lamp-gold)"/><circle cx="%s" cy="%s" r="3" fill="%s"/>' % (f(LENS[0]), f(LENS[1]), f(LENS[0]), f(LENS[1]), GOLD_HOT))
# the Machine's thread: a filament of gold from the Machine's core to the token, sagging across the sky, the mark that the
# Machine is where the prize comes from; every half turn of the token a bright pulse runs down it and the card brightens as it arrives
TOK_TURN, TOK_PH = 16.37, 3.513
PULSE = TOK_TURN / 2
PULSE_PH = TOK_PH - 2.503  # the pulse sets off after clash two's roar and reaches the card about 5.9 s
fil = 'M%s %s Q%s %s %s %s' % (f(CX - 18), f(CROWN_Y + 4), f(980), f(350), f(TOK_CX + TOK_W / 2 + 1), f(TOK_CY - 6))
prize.append('<!-- the Machine\'s thread --><path d="%s" fill="none" stroke="%s" stroke-width="12" opacity=".35" filter="url(#soft4)"/><path d="%s" fill="none" stroke="%s" stroke-width="4" opacity=".75"/><path d="%s" fill="none" stroke="%s" stroke-width="1.2" opacity=".9"/>' % (fil, GOLD, fil, GOLD, fil, GOLD_HOT))
stub_x = '%s;%s;%s' % (f(TOK_CX + TOK_W / 2 + 1), f(TOK_CX + TOK_W * .3), f(TOK_CX + TOK_W / 2 + 1))
prize.append('<!-- the thread\'s end, following the card\'s edge as it turns -->' + ''.join(
    '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" opacity="%s"%s>%s</line>' % (f(TOK_CX + TOK_W / 2 + 1), f(TOK_CY - 6), f(TOK_CX + TOK_W / 2 + 1), f(TOK_CY - 6), c_, w_, o_, fl_, anim('x2', stub_x, TOK_TURN, TOK_PH, '0;.5;1', spline=True))
    for (c_, w_, o_, fl_) in [(GOLD, '12', '.35', ' filter="url(#soft4)"'), (GOLD, '4', '.75', ''), (GOLD_HOT, '1.2', '.9', '')]))
prize.append('<!-- the pulse down the thread --><g opacity="0">%s<circle r="30" fill="url(#lamp-gold)"/><circle r="7" fill="%s"/><animateMotion path="%s" keyPoints="0;0;1;1" keyTimes="0;.7;.847;1" calcMode="linear" dur="%ss" begin="-%ss" repeatCount="indefinite"/></g>' % (
    anim('opacity', '0;0;1;1;0;0', PULSE, PULSE_PH, '0;.695;.705;.842;.852;1'), GOLD_HOT, fil, f(PULSE), f(PULSE_PH)))
prize.append('<!-- the token\'s glow swells as the pulse arrives --><circle cx="%s" cy="%s" r="%s" fill="url(#lamp-gold)" opacity="0">%s</circle>' % (
    f(TOK_CX), f(TOK_CY), f(TOK_W * .75), anim('opacity', '0;0;.7;0;0', PULSE, PULSE_PH, '0;.845;.865;.93;1', spline=True)))

# the token, the prize: the beat 06 card drawn in light, a projection rather than an object
TW = TOK_W
k = TW / 74.0


def card_outline(inset=0.0):
    x0, y0, x1, y1 = inset, inset, 74 - inset, 46 - inset
    cut = 7 - inset
    return 'M%s %s L%s %s L%s %s L%s %s L%s %s Z' % (f(x0), f(y0), f(x1 - cut), f(y0), f(x1), f(y0 + cut), f(x1), f(y1), f(x0), f(y1))


tok = []
tok.append('<path d="%s" fill="%s" opacity=".1"/>' % (card_outline(), GOLD))
tok.append('<path d="%s" fill="none" stroke="%s" stroke-width=".9" filter="url(#glow2)"/>' % (card_outline(), GOLD_HOT))
tok.append('<path d="%s" fill="none" stroke="%s" stroke-width=".3" opacity=".55"/>' % (card_outline(2.6), GOLD))
# the card brightens when the Machine's pulse reaches it: a fuller fill and a heavier rim, for about 0.4 s
tok.append('<g opacity="0">%s<path d="%s" fill="%s" opacity=".3"/><path d="%s" fill="none" stroke="%s" stroke-width="2" filter="url(#glow2)"/></g>' % (
    anim('opacity', '0;0;1;0;0', PULSE, PULSE_PH, '0;.845;.86;.9;1', spline=True), card_outline(), GOLD, card_outline(), GOLD_HOT))
# the contacts along the bottom edge: drawn as lit outlines with a faint fill
for i in range(12):
    tok.append('<rect x="%s" y="38.4" width="4.4" height="6.4" fill="%s" fill-opacity=".28" stroke="%s" stroke-width=".35"/>' % (f(4.2 + i * 5.5), GOLD, GOLD_HOT))
# the scrambled helix: segments out of order, offset, a few rungs missing (the encryption is never resolved)
hr = random.Random(66)
SEG = [0, 5, 9, 14, 18, 23, 28]
ORDER = [2, 0, 4, 1, 5, 3]
OY = [-2.4, 2.0, -1.2, 2.8, -3.0, 1.4]
AMP = [.8, 1.15, .88, 1.2, .74, 1.05]
SGN = [1, -1, 1, 1, -1, 1]
x = 7.5
cols = []
for s_ in ORDER:
    for i in range(SEG[s_], SEG[s_ + 1]):
        d = 7.8 * AMP[s_] * SGN[s_] * math.sin(i * .66)
        cols.append((x, 11.4 + OY[s_] + d, 11.4 + OY[s_] - d, s_))
        x += 2.15
    x += .5 + hr.random() * .7
sc = (27 * 2.15) / (x - .6 - 2.15 - 7.5)
cols = [(7.5 + (c[0] - 7.5) * sc, c[1], c[2], c[3]) for c in cols]
hel = []
for i, (cx_, ya, yb, s_) in enumerate(cols):
    if hr.random() > .2:
        hel.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".45" opacity=".6"/>' % (f(cx_), f(ya), f(cx_), f(yb), GOLD))
    if i + 1 < len(cols) and cols[i + 1][3] == s_:
        n_ = cols[i + 1]
        hel.append('<path d="M%s %s L%s %s M%s %s L%s %s" stroke="%s" stroke-width=".9"/>' % (f(cx_), f(ya), f(n_[0]), f(n_[1]), f(cx_), f(yb), f(n_[0]), f(n_[2]), GOLD_HOT))
tok.append('<g filter="url(#glow2)">%s</g>' % ''.join(hel))
# the encoded band under the helix
for row in range(3):
    xx = 7 + hr.random() * 3
    while xx < 66:
        w_ = 1 + hr.random() * 5.5
        tok.append('<rect x="%s" y="%s" width="%s" height=".8" fill="%s" opacity="%s"/>' % (f(xx), f(26 + row * 3.6), f(w_), GOLD, f(.2 + hr.random() * .25)))
        xx += w_ + 1 + hr.random() * 2.4
# projection lines: fine horizontal scan lines across the whole card, and one brighter band drifting down through it
scan = ''.join('<rect x="0" y="%s" width="74" height=".25" fill="%s" opacity=".18"/>' % (f(y_), GOLD_HOT) for y_ in [i * 1.6 for i in range(29)])
tok_scan = scan + '<rect x="0" y="-8" width="74" height="4" fill="%s" opacity=".22">%s</rect>' % (GOLD_HOT, trans('0 0;0 58', 4.613, 1.317))
tok_body = ''.join(tok)
# the token turns slowly about its vertical axis (a horizontal scale between .6 and 1, never edge on), tipped a little toward
# the viewer, and its light wavers like a projection
prize.append('<!-- the token, the prize: the beat 06 card in light, over the arena -->'
              '<circle cx="%s" cy="%s" r="%s" fill="url(#lamp-gold)" opacity=".22"/>' % (f(TOK_CX), f(TOK_CY), f(TW * .75))
              + '<g transform="translate(%s %s)"><g>%s<g transform="skewY(-3) translate(%s %s) scale(%s)"><g opacity=".92">%s%s<clipPath id="tokClip"><path d="%s"/></clipPath><g clip-path="url(#tokClip)">%s</g></g></g></g></g>' % (
                  f(TOK_CX), f(TOK_CY), trans('1 1;.6 1;1 1', 16.37, 3.513, '0;.5;1', typ='scale', spline=True), f(-TW / 2), f(-TH / 2), f(k),
                  anim('opacity', '.92;.8;.95;.86;.92', 3.137, .713, '0;.21;.48;.77;1'), tok_body, card_outline(), tok_scan))

# ------------------------------------------------------------------ arena layer (static)
arena = []
# the outer facade at both ends and along the near side: the rim's lower half dropped to the ground
FAC_DROP = 150
rim = ell(0)
lower = arc_pts(rim, 0, math.pi, 96)
facade = lower + [(x_, y_ + FAC_DROP) for (x_, y_) in reversed(lower)]
arena.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(facade), lin([(0, '#3a3230', 1), (1, '#18141a', 1)], 0, RIM_CY, 0, RIM_CY + RIM_RY + FAC_DROP, units=True)))
# arches along the facade, lit from inside
for i in range(1, 40):
    a = math.pi * i / 40
    x_, y_ = ept(rim, a)
    xb, yb = x_, y_ + FAC_DROP
    w_ = 10 * abs(math.cos(a - math.pi / 2)) + 4
    if abs(math.cos(a)) > .97:
        continue
    arena.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (f(x_ - w_ / 2), f(y_ + 26), f(w_), f(34), WIN, f(.35 + .3 * abs(math.cos(a)))))
    arena.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (f(x_ - w_ / 2), f(y_ + 82), f(w_), f(30), WIN, f(.2 + .2 * abs(math.cos(a)))))
# the bowl: concentric tiers from the rim down to the floor
N_T = 13
g_far_riser = lin([(0, '#7a6a58', 1), (1, '#4a4038', 1)], 0, RIM_CY - RIM_RY, 0, FLOOR_CY, units=True)
for i in range(N_T):
    t0, t1 = i / N_T, (i + 1) / N_T
    e0, e1 = ell(t0), ell(t1)
    # tread: the ring between this tier's ellipse and the next, filled in two halves
    far = arc_pts(e0, math.pi, 2 * math.pi) + list(reversed(arc_pts(e1, math.pi, 2 * math.pi)))
    near = arc_pts(e0, 0, math.pi) + list(reversed(arc_pts(e1, 0, math.pi)))
    shade = i / N_T
    arena.append('<polygon points="%s" fill="%s"/>' % (pts(far), mix('#4e4440', '#6a5c4e', shade)))
    arena.append('<polygon points="%s" fill="%s"/>' % (pts(near), mix('#2a2428', '#3a322e', shade)))
    # the far riser: a thin lit band under the far tread's inner edge (faces the viewer and the floodlights)
    riser = arc_pts(e1, math.pi, 2 * math.pi)
    arena.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2.2" opacity=".75"/>' % (pts(riser), mix('#8a7a66', '#c8b490', shade)))
    # aisles: radial stairs every so often
# aisles: radial stair lines from rim to floor
for k in range(14):
    a = 2 * math.pi * k / 14 + .11
    p0, p1 = ept(ell(0), a), ept(ell(1), a)
    arena.append('<path d="M%s %s L%s %s" stroke="#1e1a1c" stroke-width="%s" opacity=".7"/>' % (f(p0[0]), f(p0[1]), f(p1[0]), f(p1[1]), f(5 if math.sin(a) > 0 else 3)))
# the rim: a parapet ring
arena.append('<path d="%s" fill="none" stroke="#5a4e44" stroke-width="7"/>' % ('M' + ' L'.join('%s %s' % (f(x_), f(y_)) for x_, y_ in arc_pts(rim, 0, 2 * math.pi, 120)) + ' Z'))
arena.append('<path d="%s" fill="none" stroke="#b8a68a" stroke-width="1.6" opacity=".55"/>' % ('M' + ' L'.join('%s %s' % (f(x_), f(y_ - 3)) for x_, y_ in arc_pts(rim, math.pi, 2 * math.pi, 80))))
# the crowd: thousands of small warm lights packed on every tread
crowd = []
crowd_roar = []
cw = random.Random(9)
for i in range(N_T - 1):
    tm = (i + .5) / N_T
    e = ell(tm)
    circ = math.pi * (3 * (e[2] + e[3]) - math.sqrt((3 * e[2] + e[3]) * (e[2] + 3 * e[3])))
    n = int(circ / 4.2)
    for j in range(n):
        a = 2 * math.pi * (j + cw.random() * .6) / n
        if math.cos(a) > .985 or math.cos(a) < -.985:
            continue
        x_, y_ = ept(e, a)
        y_ += cw.uniform(-1.5, 1.5)
        near_side = math.sin(a) > 0
        c = cw.choice(['#ffd9a0', '#ffefcf', '#f0b070', '#ffe6c0', '#e8c8a0', '#ffd0b0'])
        if cw.random() < .04:
            c = cw.choice(FACTIONS)
        op = cw.uniform(.35, .85) * (.75 if near_side else 1)
        r_ = cw.uniform(.9, 1.6) * (.85 + .3 * tm)
        dot = '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (f(x_), f(y_), f(r_), c, f(op))
        crowd.append(dot)
        if cw.random() < .45:
            crowd_roar.append('<circle cx="%s" cy="%s" r="%s" fill="#fff4dc"/>' % (f(x_), f(y_), f(r_ * 1.4)))
arena.append('<!-- the crowd -->' + '<g>%s</g>' % ''.join(crowd))
# the floor: sand under the floodlights, a ring marked on it, scorch marks, the projector set in its center,
# and the two fighters' marks (scuffed ground where each power stands)
fe = ell(1)
defs.append('<filter id="sand" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 2.2" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .42  0 0 0 0 .36  0 0 0 0 .28  0 0 0 -1.1 .9"/><feComposite in2="SourceGraphic" operator="in"/></filter>')
arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)"/>' % (f(fe[0]), f(fe[1]), f(fe[2]), f(fe[3]), rad([(0, '#877356', 1), (.55, '#6a5a42', 1), (1, '#382e26', 1)], id='floor')))
arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#000" filter="url(#sand)" opacity=".5"/>' % (f(fe[0]), f(fe[1]), f(fe[2]), f(fe[3])))
arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="#6a5840" stroke-width="2.2" opacity=".8"/>' % (f(fe[0]), f(fe[1]), f(fe[2] * .66), f(fe[3] * .66)))
for (dx, dy, rx_, ry_) in [(-200, 26, 40, 11), (190, -30, 34, 9), (40, 52, 26, 7), (-60, -48, 22, 6)]:
    arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#2a1e18" opacity=".45" filter="url(#soft4)"/>' % (f(FCX + dx), f(FCY + dy), f(rx_), f(ry_)))
FY = 822  # the fight's ground line: the floor's far half, above the record label on a phone

arena.append('<!-- the near floodlights\' pool on the front of the floor --><ellipse cx="%s" cy="%s" rx="270" ry="62" fill="url(#lamp-win)" opacity=".34"/>' % (f(AX), f(FLOOR_CY + 34)))
for (dx, dy, rx_, ry_) in [(-110, 40, 46, 12), (90, 54, 38, 10), (10, 70, 60, 14)]:
    arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#24180f" opacity=".28" filter="url(#soft4)"/>' % (f(FCX + dx), f(FCY + dy), f(rx_), f(ry_)))
# the floor wall: the low wall between the floor and the first tier
arena.append('<path d="%s" fill="none" stroke="#2a2422" stroke-width="5"/>' % ('M' + ' L'.join('%s %s' % (f(x_), f(y_)) for x_, y_ in arc_pts(fe, 0, 2 * math.pi, 100)) + ' Z'))
# haze over the bowl: the floodlights light the air above the arena
arena.append('<!-- the lit haze over the bowl --><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)"/>' % (f(AX), f(RIM_CY - 40), f(RIM_RX * .95), f(RIM_RY * 1.15), rad([(0, '#fff2dc', .16), (.6, '#ffe8c8', .07), (1, '#ffe8c8', 0)])))
# the king's box: a lit, canopied box on the far rim facing the floor, hung with Kozrak's crimson
KB = ept(rim, math.pi * 1.5)
kx, ky = KB[0], KB[1] + 4
arena.append('<!-- the king\'s box -->'
             + '<polygon points="%s" fill="#1a1418"/>' % pts([(kx - 70, ky + 16), (kx - 62, ky - 22), (kx + 62, ky - 22), (kx + 70, ky + 16)])
             + '<polygon points="%s" fill="#2a2024" stroke="%s" stroke-width="1.2"/>' % (pts([(kx - 80, ky - 22), (kx - 60, ky - 40), (kx + 60, ky - 40), (kx + 80, ky - 22)]), GOLD)
             + '<rect x="%s" y="%s" width="100" height="14" fill="%s" opacity=".85"/>' % (f(kx - 50), f(ky - 14), WIN)
             + ''.join('<rect x="%s" y="%s" width="3" height="16" fill="#1a1418"/>' % (f(kx - 50 + 16.6 * i), f(ky - 16)) for i in range(7))
             + ''.join('<path d="M%s %s L%s %s L%s %s L%s %s Z" fill="#6a1220"/>' % (f(x_), f(ky - 22), f(x_ + 14), f(ky - 22), f(x_ + 14), f(ky + 22), f(x_), f(ky + 30)) for x_ in (kx - 66, kx + 52))
             + '<rect x="%s" y="%s" width="16" height="6" fill="#2a2024" stroke="%s" stroke-width=".8"/>' % (f(kx - 8), f(ky - 46), GOLD))
# faction banners: long banners in the factions' element colors hanging from the far rim over the top tiers, each with a pale
# emblem; more factions than the four whose ships are in the sky
BANNERS = [(1.17, '#ff8a3a'), (1.27, '#9fdcff'), (1.37, '#8be08a'), (1.63, '#ffe066'), (1.73, '#4ac0c8'), (1.83, '#b07ad8')]
for (a_, c_) in BANNERS:
    x_, y_ = ept(rim, math.pi * a_)
    arena.append('<!-- a faction banner --><path d="M%s %s L%s %s L%s %s L%s %s L%s %s Z" fill="%s" opacity=".9"/><path d="M%s %s L%s %s" stroke="#000" stroke-width="2" opacity=".25"/><circle cx="%s" cy="%s" r="4" fill="#fff6e0" opacity=".75"/><rect x="%s" y="%s" width="24" height="3" fill="#2a2228"/>' % (
        f(x_ - 9), f(y_ - 2), f(x_ + 9), f(y_ - 2), f(x_ + 9), f(y_ + 58), f(x_), f(y_ + 50), f(x_ - 9), f(y_ + 58), c_, f(x_ + 6), f(y_ - 2), f(x_ + 6), f(y_ + 54), f(x_), f(y_ + 16), f(x_ - 12), f(y_ - 4)))
# floodlight masts on the rim: lattice towers, each with a bank of lamps tipped toward the floor and a soft cone of light onto it
MASTS = [math.pi * 1.12, math.pi * 1.33, math.pi * 1.67, math.pi * 1.88, math.pi * .07, math.pi * .93]
for a in MASTS:
    bx, by = ept(rim, a)
    far_ = math.sin(a) < 0
    hgt = 170 if far_ else 150
    top_y = by - hgt
    side = 1 if bx < AX else -1  # the bank tips toward the arena's center
    s = .9 if far_ else 1.1
    lat = ['<path d="M%s %s L%s %s M%s %s L%s %s" stroke="#1a171c" stroke-width="%s"/>' % (f(bx - 9 * s), f(by), f(bx - 2 * s), f(top_y), f(bx + 9 * s), f(by), f(bx + 2 * s), f(top_y), f(2.6 * s))]
    for j in range(7):
        y0 = by - hgt * j / 7
        y1 = by - hgt * (j + 1) / 7
        w0 = 9 * s * (1 - j / 7) + 2 * s * j / 7
        w1 = 9 * s * (1 - (j + 1) / 7) + 2 * s * (j + 1) / 7
        lat.append('<path d="M%s %s L%s %s M%s %s L%s %s" stroke="#1a171c" stroke-width="%s"/>' % (f(bx - w0), f(y0), f(bx + w1), f(y1), f(bx + w0), f(y0), f(bx - w1), f(y1), f(1 * s)))
    lat.append('<path d="M%s %s L%s %s" stroke="#6a5c50" stroke-width=".9" opacity=".5"/>' % (f(bx - 9 * s), f(by), f(bx - 2 * s), f(top_y)))
    bank = '<g transform="translate(%s %s) rotate(%s)"><rect x="-22" y="-10" width="44" height="20" fill="#221e26"/>%s</g>' % (
        f(bx), f(top_y - 6), f(side * 14), ''.join('<circle cx="%s" cy="%s" r="2.6" fill="%s"/>' % (f(-16 + 8 * c_), f(-4 + 8 * r_), FLOOD) for c_ in range(5) for r_ in range(2)))
    glow = '<ellipse cx="%s" cy="%s" rx="40" ry="18" fill="url(#lamp-flood)" opacity=".85"/>' % (f(bx), f(top_y - 6))
    # the cone: from the bank to the floor, very faint
    cone = '<polygon points="%s" fill="url(#%s)" filter="url(#soft16)"/>' % (pts([(bx - 10, top_y), (bx + 10, top_y), (FCX + (bx - FCX) * .25 + 120, FCY), (FCX + (bx - FCX) * .25 - 120, FCY)]),
                                                                            lin([(0, '#f4f2ff', .16), (1, '#f4f2ff', .02)], bx, top_y, FCX, FCY, units=True))
    arena.append('<!-- a floodlight mast -->' + cone + ''.join(lat) + bank + glow)
# the floodlights' light pooled on the floor
arena.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#lamp-flood)" opacity=".14"/>' % (f(FCX), f(FCY), f(FLOOR_RX * 1.05), f(FLOOR_RY * 1.2)))

# ------------------------------------------------------------------ fight layer (animated): the clash, the dust, the roar
fight = []
FP = 9.613  # the fight's clock (no clock here lands on the film's 50 ms frames exactly)
PH = 7.633  # where in the clock the still frame sits: the great fireball and the whole great bolt about to meet (u .794)


def light(cx, cy, r, grad, values, keyTimes, phase, extra=''):
    return '<circle cx="%s" cy="%s" r="%s" fill="url(#%s)" opacity="0"%s>%s</circle>' % (f(cx), f(cy), f(r), grad, extra, anim('opacity', values, FP, phase, keyTimes))


def jag_path(x0, y0, x1, y1, n, amp, seed):
    r = random.Random(seed)
    p = [(x0, y0)]
    for i in range(1, n):
        u = i / n
        p.append((lerp(x0, x1, u) + r.uniform(-amp, amp) * .3, lerp(y0, y1, u) + r.uniform(-amp, amp)))
    p.append((x1, y1))
    return 'M' + ' L'.join('%s %s' % (f(a_), f(b_)) for a_, b_ in p)


def jag_pts(x0, y0, x1, y1, n, amp, seed, bow=0.0):
    r = random.Random(seed)
    p = [(x0, y0)]
    for i in range(1, n):
        u = i / n
        p.append((lerp(x0, x1, u) + r.uniform(-amp, amp) * .3, lerp(y0, y1, u) + r.uniform(-amp, amp) - bow * math.sin(math.pi * u)))
    p.append((x1, y1))
    return p


def ku(*xs):
    """keyTimes from a list of clock fractions, 0 and 1 added."""
    return ';'.join(['0'] + [f(x) for x in xs] + ['1'])


# ---- the squads. Nick, 2026-10-03: two sides, each a few abstract blobs that stand for creatures (at this distance they need
# no detail), trading little attack moves. Each creature is a small blob of its element's color, a body and a smaller head on
# the side it faces, over a small glow (Nick, 2026-10-04: at arena distance a creature is a little dot). Left squad: storm, ice, plant. Right squad: fire, water, rock.
mx, my = FCX, FY - 8  # the middle of the floor's far half, where the big exchange meets
SQUAD = {
    'storm': dict(x=FCX - 70, y=FY - 2, c='#ffe066', s=1, side=1),
    'plant': dict(x=FCX - 104, y=FY + 18, c='#8be08a', s=1, side=1),
    'ice': dict(x=FCX - 136, y=FY - 4, c='#8fd0ff', s=1, side=1),
    'fire': dict(x=FCX + 70, y=FY - 2, c='#ff7a2a', s=1, side=-1),
    'water': dict(x=FCX + 104, y=FY + 18, c='#3a8fe0', s=1, side=-1),
    'rock': dict(x=FCX + 136, y=FY - 4, c='#c08a50', s=1, side=-1),
}
for k_, c_ in SQUAD.items():
    rad([(0, c_['c'], 1), (.3, c_['c'], .5), (1, c_['c'], 0)], id='lamp-' + k_)

# Each attack: (attacker, target, kind, u at launch, u at hit). The big exchange (fire's fireball against storm's bolt meeting
# in the middle) is handled apart, at u .80.
ATTACKS = [('storm', 'fire', 'bolt', .044, .05), ('fire', 'ice', 'ball', .16, .23), ('plant', 'rock', 'darts', .3, .36),
           ('water', 'ice', 'glob', .43, .5), ('ice', 'rock', 'shards', .56, .62), ('rock', 'storm', 'stone', .66, .73)]
LOB = 36  # the creatures are dots, so lobs stay low over the sand, never up into the crowd  # the control height of a lob from or over the back row (the arc's top is half this above the line)
BIG = (.74, .80)  # fire and storm wind up, then their attacks meet in the middle


def front(k):
    """Where a creature's attacks leave from: the front of its head."""
    c = SQUAD[k]
    return (c['x'] + c['side'] * 5, c['y'] - 7)


def body_of(k):
    """A creature at arena distance: a small blob of its element's color, a body and a smaller head on the side it faces."""
    c = SQUAD[k]
    sd, col = c['side'], c['c']
    body = mix('#3a3640', col, .78)
    return ('<ellipse cx="0" cy="-3.2" rx="4.2" ry="3.4" fill="%s"/>' % body
            + '<circle cx="%s" cy="-6.4" r="2.4" fill="%s"/>' % (f(sd * 3), body)
            + '<ellipse cx="%s" cy="-4.4" rx="2.4" ry="1.2" fill="#ffffff" opacity=".25"/>' % f(-sd * .8))


def flash_of(k, attacker):
    """The blob in the attacker's color, for the moment of a hit."""
    c = SQUAD[k]
    col = SQUAD[attacker]['c']
    return ('<ellipse cx="0" cy="-3.2" rx="4.2" ry="3.4" fill="%s"/>' % col + '<circle cx="%s" cy="-6.4" r="2.4" fill="%s"/>' % (f(c['side'] * 3), col))


# each creature's motion: a lunge toward its opponents when it attacks, a recoil away when it is hit, an idle bob
moves = {k: [] for k in SQUAD}
for (a, t_, kind, ul, uh) in ATTACKS:
    moves[a].append((ul - .02, 0)); moves[a].append((ul, 6)); moves[a].append((ul + .035, 0))
    moves[t_].append((uh - .004, 0)); moves[t_].append((uh + .006, -5)); moves[t_].append((uh + .05, 0))
for k in ('fire', 'storm'):
    moves[k].append((BIG[0] - .02, 0)); moves[k].append((BIG[0] + .03, 7)); moves[k].append((BIG[1] + .02, 0))
hits = {k: [] for k in SQUAD}
for (a, t_, kind, ul, uh) in ATTACKS:
    hits[t_].append((uh, a))
for k, c in SQUAD.items():
    pts_ = sorted(moves[k])
    times, vals = [0.0], [0.0]
    for (u, dx) in pts_:
        if u <= times[-1] + .002:
            continue
        times.append(u)
        vals.append(dx * c['side'])
    if times[-1] < .998:
        times.append(1.0)
        vals.append(0.0)
    tr = trans(';'.join('%s 0' % f(v) for v in vals), FP, PH, ';'.join(f(u) for u in times))
    bob = trans('1 1;1.08 .92;.96 1.08;1 1', .9 + .13 * len(k), .07 * len(k), '0;.3;.7;1', typ='scale', spline=True)
    # the flash of a hit: the body takes the attacker's color for a moment, and squashes
    flash = ''
    sq_t, sq_v = [0.0], ['1 1']
    for (uh, att) in sorted(hits[k]):
        flash += '<g opacity="0">%s%s</g>' % (anim('opacity', '0;0;.7;0;0', FP, PH, ku(uh, uh + .005, uh + .05)), flash_of(k, att))
        sq_t += [uh, uh + .008, uh + .04]
        sq_v += ['1 1', '1.12 .88', '1 1']
    sq_t.append(1.0)
    sq_v.append('1 1')
    squash = trans(';'.join(sq_v), FP, PH, ';'.join(f(u) for u in sq_t), typ='scale')
    fight.append('<!-- a creature (%s) --><ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#lamp-%s)" opacity="1"/>' % (k, f(c['x']), f(c['y'] - 2), f(13), f(5), k)
                 + '<g transform="translate(%s %s) scale(%s)"><g>%s<g>%s<g>%s%s%s</g></g></g></g>' % (f(c['x']), f(c['y']), f(c['s']), tr, bob, squash, body_of(k), flash))


def bolt(p, u_on, u_end, values, glow=11):
    """A bolt of lightning that strikes in two steps (its first half, then its full length), holds flickering, and dies in a flicker."""
    half = len(p) // 2
    d1 = 'M' + ' L'.join('%s %s' % (f(a_), f(b_)) for a_, b_ in p[:half + 1])
    d2 = 'M' + ' L'.join('%s %s' % (f(a_), f(b_)) for a_, b_ in p[half:])
    tail = '%s;%s;%s;1' % (f(u_end), f(u_end + .006), f(u_end + .012))
    k1 = '0;%s;%s;%s;%s;%s;%s' % (f(u_on), f(u_on + .009), f(u_on + .015), f(u_on + .021), f(u_on + .027), tail)
    k2 = '0;%s;%s;%s;%s;%s;%s' % (f(u_on + .005), f(u_on + .009), f(u_on + .015), f(u_on + .021), f(u_on + .027), tail)
    o = ''
    for d, k in ((d1, k1), (d2, k2)):
        o += '<path d="%s" stroke="%s" stroke-width="%s" fill="none" opacity="0" filter="url(#soft2)">%s</path>' % (d, '#ffe066', glow * .55, anim('opacity', values, FP, PH, k, calc='discrete'))
        o += '<path d="%s" stroke="#fffbe6" stroke-width="2.2" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0" filter="url(#glow2)">%s</path>' % (d, anim('opacity', values, FP, PH, k, calc='discrete'))
    return o


BOLT_V = '0;1;.35;1;.5;1;.6;.25;0;0'


def missile(p0, p1, u0, u1, body, arc=0.0, grow=.01, size=.45):
    """Something thrown from p0 to p1 between u0 and u1 at constant speed along a shallow arc, born small at the thrower."""
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - arc)
    a = lambda t: (lerp(lerp(p0[0], mid[0], t), lerp(mid[0], p1[0], t), t), lerp(lerp(p0[1], mid[1], t), lerp(mid[1], p1[1], t), t))
    ts = [i / 10 for i in range(11)]
    pos = [a(t) for t in ts]
    times = ku(*([u0] + [lerp(u0, u1, t) for t in ts[1:]]))
    vals = ';'.join('%s %s' % (f(x), f(y)) for x, y in [pos[0], pos[0]] + pos[1:] + [pos[-1]])
    return '<g opacity="0">%s<g>%s<g>%s%s</g></g></g>' % (
        anim('opacity', '0;0;1;1;0;0', FP, PH, ku(u0, u0 + .001, u1, u1 + .004), calc='discrete'),
        trans(vals, FP, PH, times), trans('0 0;0 0;%s %s;%s %s' % (f(size), f(size), f(size), f(size)), FP, PH, ku(u0, u0 + grow), typ='scale'), body)


def hit_burst(k, u, grad):
    """Where an attack lands on a creature: a glow of the attack's element and a small spray of sparks."""
    c = SQUAD[k]
    x, y = c['x'], c['y'] - 5
    o = '<!-- the hit on %s -->' % k + light(x, y, 32, grad, '0;0;1;0;0', ku(u, u + .004, u + .03), PH)
    r = random.Random(int(u * 1000))
    for j in range(5):
        ang = r.uniform(-math.pi, 0)
        dx, dy = math.cos(ang) * r.uniform(8, 14), math.sin(ang) * r.uniform(6, 11)
        o += '<circle r="1.2" fill="#fff4dc" opacity="0">%s%s</circle>' % (anim('opacity', '0;0;1;0;0', FP, PH, ku(u, u + .003, u + .03)),
                                                                           trans('%s %s;%s %s;%s %s;%s %s' % (f(x), f(y), f(x), f(y), f(x + dx), f(y + dy), f(x + dx), f(y + dy)), FP, PH, ku(u, u + .03)))
    return o


g_jetw = lin([(0, '#2a78c0', .9), (.6, '#4aa8e8', .95), (1, '#dff4ff', 1)], 0, 0, 1, 0, id='jetWater')
for (a, t_, kind, ul, uh) in ATTACKS:
    p0, c_t = front(a), SQUAD[t_]
    if a in ('plant', 'water'):
        p0 = (SQUAD[a]['x'], p0[1] - 24)  # the middle row throws up from above its head, so the lob clears the front row
    p1 = (c_t['x'] - c_t['side'] * 2, c_t['y'] - 5)
    tag = '<!-- %s: %s at %s -->' % (kind, a, t_)
    if a in ('plant', 'water'):
        hd = front(a)
        fight.append('<!-- the throw rising from %s --><path d="M%s %s L%s %s" stroke="%s" stroke-width="5" stroke-linecap="round" opacity="0" filter="url(#soft2)">%s</path>' % (
            a, f(hd[0]), f(hd[1]), f(p0[0]), f(p0[1]), SQUAD[a]['c'], anim('opacity', '0;0;.7;0;0', FP, PH, ku(ul - .008, ul, ul + .012))))
    if kind == 'stone':
        p1 = (c_t['x'] - c_t['side'] * 2, c_t['y'] - 6)
    if kind == 'bolt':
        fight.append(tag + bolt(jag_pts(p0[0], p0[1], p1[0], p1[1], 10, 9, 93), ul, max(uh + .02, ul + .034), BOLT_V))
    elif kind == 'ball':
        fight.append(tag + missile(p0, p1, ul, uh, '<ellipse cx="%s" rx="26" ry="9" fill="url(#lamp-fire)" opacity=".8"/><circle r="30" fill="url(#lamp-fire)"/><circle r="11" fill="#ff9a40" opacity=".9" filter="url(#soft2)"/><circle r="5" fill="#ffe6b0"/>' % f(-SQUAD[a]['side'] * 16), arc=LOB))
    elif kind == 'darts':
        for j in range(3):
            d = .008 * j
            fight.append(tag + missile((p0[0], p0[1] + 6 * j - 12), (p1[0], p1[1] + 5 * j - 5), ul + d, uh + d, '<ellipse cx="%s" rx="22" ry="3" fill="#8be08a" opacity=".45"/><ellipse rx="16" ry="5.5" fill="#d8f8c8"/><ellipse rx="26" ry="11" fill="url(#lamp-plant)"/>' % f(-SQUAD[a]['side'] * 18), arc=LOB - 10 + 8 * j))
    elif kind == 'shards':
        for j in range(3):
            d = .007 * j
            fight.append(tag + missile((p0[0], p0[1] + 5 * j - 5), (p1[0], p1[1] + 6 * j - 6), ul + d, uh + d, '<ellipse cx="%s" rx="22" ry="3" fill="#d8f2ff" opacity=".45"/><polygon points="-18,0 0,-8 18,0 0,8" fill="#f2fbff"/><ellipse rx="26" ry="11" fill="url(#lamp-ice)"/>' % f(-SQUAD[a]['side'] * 18), arc=LOB - 6 + 8 * j))
    elif kind == 'stone':
        fight.append(tag + missile(p0, p1, ul, uh, '<ellipse cx="%s" rx="18" ry="4" fill="#d8c8a8" opacity=".4"/><ellipse rx="60" ry="30" fill="url(#lamp-rock)"/><g>%s<polygon points="-21,-6 -14,-19 -2,-23 13,-18 22,-6 19,9 7,20 -9,18 -20,9" fill="#c08a50"/><path d="M-12 -12 Q-4 -18 6 -15" stroke="#e8dcc0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="6" cy="6" r="3" fill="#5a4c3e"/></g>' % (f(-SQUAD[a]['side'] * 14), rot('0;0;400;400', FP, PH, ku(ul, uh))), arc=LOB, size=.2))
    elif kind == 'glob':
        fight.append(tag + missile(p0, p1, ul, uh, '<ellipse cx="%s" rx="22" ry="5" fill="#3a8fe0" opacity=".4"/><circle r="24" fill="url(#lamp-water)"/><circle r="11" fill="#5ab0f0"/><circle cx="-3" cy="-4" r="4" fill="#e8f8ff" opacity=".9"/>' % f(-SQUAD[a]['side'] * 16), arc=LOB))
        for j, (dx, dy) in enumerate(((-14, -16), (12, -20), (20, -4), (-20, -2))):
            fight.append('<circle r="3.4" fill="#cdeeff" opacity="0">%s%s</circle>' % (anim('opacity', '0;0;1;0;0', FP, PH, ku(uh, uh + .003, uh + .035)),
                                                                                   trans('%s %s;%s %s;%s %s;%s %s' % (f(p1[0]), f(p1[1]), f(p1[0]), f(p1[1]), f(p1[0] + dx), f(p1[1] + dy), f(p1[0] + dx), f(p1[1] + dy + 6)), FP, PH, ku(uh, uh + .035))))
    elif kind == 'jet':
        jl_ = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        ja_ = math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
        r_ = random.Random(31)
        top = ' '.join('L%s %s' % (f(jl_ * u), f(-9 - 3 * math.sin(u * 23) + r_.uniform(-1.5, 1.5))) for u in [i / 12 for i in range(1, 12)])
        bot = ' '.join('L%s %s' % (f(jl_ * u), f(9 + 3 * math.sin(u * 19 + 1) + r_.uniform(-1.5, 1.5))) for u in [i / 12 for i in range(11, 0, -1)])
        jw = ('<path d="M0 -6 %s Q%s -16 %s 0 Q%s 16 %s 9 %s L0 6 Z" fill="url(#jetWater)" filter="url(#soft2)"/>' % (top, f(jl_ * 1.04), f(jl_ * 1.1), f(jl_ * 1.04), f(jl_ * .92), bot)
              + ''.join('<path d="M%s %s L%s %s" stroke="#f2fdff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>' % (f(jl_ * u0), f(o_), f(jl_ * u1), f(o_)) for u0, u1, o_ in ((.05, .3, -1), (.36, .62, 1.5), (.68, .95, -.5)))
              + ''.join('<circle cx="%s" cy="%s" r="%s" fill="#e8fbff" opacity=".85"/>' % (f(jl_ * 1.04 + dx), f(dy), f(rr)) for dx, dy, rr in ((4, -16, 3.6), (12, 12, 3), (-2, 19, 2.6), (16, -5, 3.2))))
        fight.append(tag + '<g transform="translate(%s %s) rotate(%s)"><g opacity="0">%s<g>%s%s</g></g></g>' % (
            f(p0[0]), f(p0[1]), f(ja_), anim('opacity', '0;0;1;1;0;0', FP, PH, ku(ul, ul + .001, uh + .02, uh + .05)),
            trans('0 1;0 1;1 1;1 1;.4 1;.4 1', FP, PH, ku(ul, uh, uh + .02, uh + .05), typ='scale'), jw))
    fight.append(hit_burst(t_, uh, 'lamp-' + a))


def clash(u, tag):
    """Where two attacks meet at u: a white-hot flash, both colors around it, a starburst, the floor lit, a ring of dust spreading
    over the floor, a puff of dust rising and thinning, sparks of both colors."""
    k = lambda *xs: ';'.join(['0'] + [f(u + x) for x in xs] + ['1'])
    o = []
    o.append('<!-- the clash %s -->' % tag + light(mx, my, 60, 'lamp-flood', '0;0;1;.45;0;0', k(-.004, .004, .025, .07), PH))
    o.append(light(mx - 14, my, 40, 'lamp-storm', '0;0;.9;0;0', k(-.004, .004, .1), PH))
    o.append(light(mx + 14, my, 40, 'lamp-fire', '0;0;.9;0;0', k(-.004, .004, .11), PH))
    rays = ''.join('<polygon points="0,-4 %s,0 0,4" transform="rotate(%s)" fill="#fff8e8"/>' % (f(L), f(ang)) for ang, L in [(i * 45 + (i % 2) * 8, 40 if i % 2 == 0 else 24) for i in range(8)])
    o.append('<g transform="translate(%s %s) scale(1 .6)"><g opacity="0" filter="url(#glow2)">%s<g>%s%s</g></g></g>' % (f(mx), f(my), anim('opacity', '0;0;1;0;0', FP, PH, k(-.004, .004, .045)), trans('.3 .3;.3 .3;1.25 1.25;1.25 1.25', FP, PH, k(-.004, .045), typ='scale'), rays))
    o.append(light(mx, FY, 140, 'lamp-flood', '0;0;.4;0;0', k(-.004, .008, .1), PH, ' transform="translate(%s %s) scale(1 .36) translate(%s %s)"' % (f(mx), f(FY), f(-mx), f(-FY))))
    o.append('<ellipse cx="%s" cy="%s" rx="10" ry="4" fill="none" stroke="#d8c8a8" stroke-width="3" opacity="0" filter="url(#soft2)">%s%s%s</ellipse>' % (
        f(mx), f(FY), anim('rx', '6;6;110;140;140', FP, PH, k(.004, .08, .13)), anim('ry', '2;2;34;44;44', FP, PH, k(.004, .08, .13)), anim('opacity', '0;0;.75;0;0', FP, PH, k(.004, .03, .13))))
    o.append('<ellipse cx="%s" cy="%s" rx="14" ry="8" fill="#c8b898" opacity="0" filter="url(#soft8)">%s%s%s</ellipse>' % (
        f(mx), f(my - 6), anim('opacity', '0;0;.55;0;0', FP, PH, k(.008, .05, .13)), anim('cy', '%s;%s;%s;%s' % (f(my - 6), f(my - 6), f(my - 24), f(my - 24)), FP, PH, k(.008, .13)), anim('rx', '14;14;34;34', FP, PH, k(.008, .13))))
    sp = random.Random(4 + int(u * 100))
    for j in range(6):
        c = 'lamp-storm' if j % 2 == 0 else 'lamp-fire'
        t0 = sp.uniform(.02, .08)
        o.append(light(mx + sp.uniform(-40, 40), FY + sp.uniform(-8, 8), 6, c, '0;0;.9;0;0', k(t0, t0 + .012, t0 + .05), PH))
    return o


# the big exchange: the fire creature throws a great fireball and the storm creature answers with a great bolt; they meet in
# the middle of the floor with a flash, a ring of dust and the crowd's roar
fp0, sp0 = front('fire'), front('storm')
fight.append('<!-- the great fireball -->' + missile(fp0, (mx + 4, my), BIG[0] + .02, BIG[1], '<ellipse cx="34" rx="52" ry="16" fill="url(#lamp-fire)" opacity=".85"/><ellipse cx="18" rx="30" ry="12" fill="#ff8a3a" opacity=".55" filter="url(#soft4)"/><circle r="56" fill="url(#lamp-fire)"/><circle r="26" fill="#ff9a40" opacity=".9" filter="url(#soft2)"/><circle r="12" fill="#ffe6b0"/>', arc=26, grow=.02))
fight.append('<!-- the great bolt -->' + bolt(jag_pts(sp0[0], sp0[1], mx - 5, my, 8, 5, 97), BIG[1] - .013, BIG[1] + .04, BOLT_V, glow=16))
fight += clash(BIG[1], 'great')
# the crowd's roar: a swell after the plant's volley lands, and a great one after the big exchange; the crowd's lights swell and a
# warm band of light runs round the tiers, then settle
ROAR_V, ROAR_T = '0;0;.5;0;0;.9;.3;0;0', '0;.36;.4;.47;.8;.84;.9;.97;1'
ROAR_PARTS = []
ROAR_PARTS.append('<!-- the roar --><g opacity="0">%s%s</g>' % (anim('opacity', ROAR_V, FP, PH, ROAR_T), ''.join(crowd_roar)))
band = rad([(0, '#ffe2b0', 0), (.62, '#ffe2b0', 0), (.8, '#ffe2b0', .45), (1, '#ffe2b0', 0)], id='roarBand')
ROAR_PARTS.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#roarBand)" opacity="0">%s</ellipse>' % (
    f(AX), f((RIM_CY + FLOOR_CY) / 2), f(RIM_RX * 1.02), f(RIM_RY * 1.12), anim('opacity', ROAR_V.replace('.9', '.8'), FP, PH, ROAR_T)))
fight[0:0] = ROAR_PARTS  # the roar lights the crowd behind the floor, never the creatures on it


# ------------------------------------------------------------------ near layer (static): roofs at left, the landing deck and a faction ship at right
near = []
# near roofs at left: dark blocks with a mast and a few lit windows (the archive screen's record label sits over this corner)
roofs = [(-30, 1000, 120, 968), (110, 1030, 250, 1000), (240, 1060, 380, 1030)]
for (x0, y0, x1, y1) in roofs:
    near.append('<!-- a near roof --><polygon points="%s" fill="#0e0c12"/>' % pts([(x0, 1160), (x0, y0), (x1 - 40, y1), (x1, y1 + 8), (x1, 1160)]))
    near.append('<path d="M%s %s L%s %s" stroke="#4a3e40" stroke-width="1.6" opacity=".7"/>' % (f(x0), f(y0), f(x1 - 40), f(y1)))
    nr = random.Random(int(x0) + 7)
    for _ in range(6):
        near.append('<rect x="%s" y="%s" width="4" height="6" fill="%s" opacity="%s"/>' % (f(nr.uniform(x0 + 8, x1 - 12)), f(nr.uniform(y0 + 24, 1140)), WIN, f(nr.uniform(.4, .8))))
near.append('<!-- a roof mast --><path d="M64 976 L64 880" stroke="#121016" stroke-width="4"/><circle cx="64" cy="878" r="2.5" fill="#ff5a4a"/>')
# the landing deck: a high platform coming in from the right edge, its rim lit. The deck and its ship are drawn at their old
# place and lifted 60 units as one, so the ramp's light lands inside the phone crop.
DOCK0 = len(near)
DECK_RING = True
deck = [(1720, 989), (1196, 1036), (1100, 1230), (1720, 1230)]
near.append('<!-- the landing deck --><polygon points="%s" fill="url(#%s)"/>' % (pts(deck), lin([(0, '#262229', 1), (1, '#0c0b10', 1)], 0, 1000, 0, 1152, units=True)))
near.append('<polygon points="1720,989 1196,1036 1196,1024 1720,977" fill="#1c1a22"/><path d="M1720 977 L1196 1024" stroke="#8a7e72" stroke-width="1.6"/>')
near.append('<path d="M1720 989 L1196 1036 L1120 1160" fill="none" stroke="#6a5e58" stroke-width="2.4"/>')
near.append('<!-- the deck\'s landing ring --><ellipse cx="1420" cy="1124" rx="170" ry="40" fill="none" stroke="#ffb860" stroke-width="3" opacity=".3"/><ellipse cx="1420" cy="1124" rx="120" ry="28" fill="none" stroke="#ffb860" stroke-width="1.4" opacity=".2"/>')
for i in range(5):
    x_, y_ = lerp(1192, 1112, i / 4), lerp(1044, 1206, i / 4)
    near.append('<circle cx="%s" cy="%s" r="7" fill="url(#lamp-win)" opacity=".55"/><circle cx="%s" cy="%s" r="1.6" fill="#ffd0a0"/>' % (f(x_), f(y_), f(x_), f(y_)))
for i in range(10):
    x_ = lerp(1700, 1200, i / 9)
    y_ = lerp(991, 1035, i / 9)
    near.append('<circle cx="%s" cy="%s" r="6" fill="url(#lamp-win)" opacity=".55"/><circle cx="%s" cy="%s" r="1.5" fill="#ffd0a0"/>' % (f(x_), f(y_), f(x_), f(y_)))
# the docked faction ship: a long hull, nose toward the arena, its cockpit lit, its faction's running stripe and engines idling green
SHIP_C = '#8be08a'
hull = [(1160, 1004), (1198, 984), (1290, 971), (1420, 967), (1482, 975), (1508, 990), (1504, 1012), (1472, 1022), (1222, 1025)]
near.append('<!-- the docked faction ship -->'
            '<polygon points="%s" fill="url(#%s)"/>' % (pts(hull), lin([(0, '#a4aac2', 1), (.45, '#70758e', 1), (1, '#3c4056', 1)], 0, 967, 0, 1025, units=True)))
near.append('<polygon points="%s" fill="#4a4e60"/>' % pts([(1396, 968), (1438, 944), (1462, 946), (1452, 969)]))
near.append('<path d="M1160 1004 L1198 984 L1290 971 L1420 967 L1482 975" fill="none" stroke="#9a9aae" stroke-width="1.4" opacity=".6"/>')
near.append('<path d="M1300 972 L1300 1024 M1360 969 L1360 1024 M1430 968 L1430 1022" stroke="#14141a" stroke-width="1.2" opacity=".8"/>')
near.append('<polygon points="%s" fill="#bfe8ff" opacity=".55"/>' % pts([(1186, 993), (1212, 980), (1252, 977), (1244, 992)]))
near.append('<polygon points="%s" fill="#ffffff" opacity=".25"/>' % pts([(1200, 986), (1214, 980), (1236, 979), (1226, 984)]))
near.append('<path d="M1236 1002 L1478 996" stroke="#b8f8b8" stroke-width="2.8"/>')
# its faction's paint: the upper hull panels and the fin in the faction's green, so the ship reads as theirs
near.append('<polygon points="%s" fill="%s" opacity=".55"/>' % (pts([(1300, 972), (1420, 968), (1480, 976), (1478, 986), (1300, 988)]), '#7ed08a'))
near.append('<polygon points="%s" fill="%s" opacity=".8"/>' % (pts([(1400, 967), (1438, 945), (1460, 947), (1450, 968)]), '#7ed08a'))
# an open hatch above the lowered ramp, lit from inside: the ship is waiting to load
near.append('<ellipse cx="1322" cy="1052" rx="52" ry="10" fill="url(#lamp-win)"/>'
            '<rect x="1320" y="1006" width="32" height="18" fill="#fff2d0"/><rect x="1316" y="1003" width="40" height="4" fill="#2a2a34"/>'
            '<polygon points="1320,1024 1352,1024 1338,1050 1298,1050" fill="#c8a878"/><polygon points="1320,1024 1352,1024 1346,1032 1316,1032" fill="#ffe2a8" opacity=".8"/>'
            '<path d="M1298 1050 L1320 1024 M1338 1050 L1352 1024" stroke="#3a3226" stroke-width="1.4"/>')
for (ex, ey) in [(1506, 988), (1504, 1008)]:
    near.append('<circle cx="%s" cy="%s" r="7" fill="#1a1a20" stroke="#4a4a56" stroke-width="1.2"/>' % (f(ex), f(ey)))
# landing legs and a lowered ramp, its edge lit
for (x0, x1) in [(1250, 1242), (1450, 1458)]:
    near.append('<path d="M%s 1022 L%s 1046" stroke="#15141a" stroke-width="5"/><path d="M%s 1046 L%s 1046" stroke="#15141a" stroke-width="4"/>' % (f(x0), f(x1), f(x1 - 8), f(x1 + 8)))
# a deck floodlight on a pole at the deck's corner
near.append('<path d="M1560 1004 L1560 930" stroke="#141218" stroke-width="4"/><rect x="1544" y="922" width="22" height="9" fill="#222028"/><ellipse cx="1550" cy="930" rx="26" ry="12" fill="url(#lamp-win)" opacity=".7"/>')
import re as _re
for i_ in range(DOCK0, len(near)):
    m_ = _re.match(r'(\s*<!--.*?-->)?(.*)', near[i_], _re.S)
    near[i_] = (m_.group(1) or '') + '<g transform="translate(-120 -90)">' + m_.group(2) + '</g>'

# ------------------------------------------------------------------ nearfx layer (animated): the ship's engines idle, the roof beacon blinks
nearfx = []
for k_, (ex, ey) in enumerate([(1386, 898), (1384, 918)]):
    nearfx.append('<circle cx="%s" cy="%s" r="16" fill="url(#lamp-fac3)" opacity=".5">%s</circle><circle cx="%s" cy="%s" r="3.2" fill="#eaffea" opacity=".9"/>' % (
        f(ex + 4), f(ey), anim('opacity', '.35;.7;.45;.65;.35', 2.3 + k_ * .4, k_ * .7, '0;.3;.55;.8;1', spline=True), f(ex + 2), f(ey)))
nearfx.append('<circle cx="64" cy="878" r="10" fill="url(#lamp-red)" opacity="0">%s</circle>' % anim('opacity', '0;1;1;0;0', 2.6, .4, '0;.06;.2;.3;1'))

# ------------------------------------------------------------------ top layer: finish
vig = lin([(0, '#030308', .55), (.22, '#030308', 0), (.82, '#030308', 0), (1, '#030308', .6)], id='vignette')
sidev = lin([(0, '#030308', .55), (.14, '#030308', 0), (.86, '#030308', 0), (1, '#030308', .55)], 0, 0, 1, 0, id='sideVignette')
top = ['<rect width="%d" height="%d" fill="url(#vignette)"/>' % (W, H), '<rect width="%d" height="%d" fill="url(#sideVignette)" opacity=".6"/>' % (W, H)]


# ------------------------------------------------------------------ assemble
def pieces(items):
    """One group per drawn piece, its comment first, so the piece audit and the bake see pieces rather than thousands of loose shapes."""
    import re
    out = []
    for it in items:
        m = re.match(r'\s*(<!--.*?-->)(.*)', it, re.S)
        if m:
            out.append(m.group(1) + '<g>' + m.group(2) + '</g>')
        else:
            out.append('<g>' + it + '</g>')
    return '\n'.join(out)


def layer(id_, body, role=False):
    head = '<svg class="layer" id="layer-%s" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"' % (id_, W, H)
    if role:
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">An arena on Valleron</title>\n  <desc id="scene-desc">Under King Kozrak\'s citadel, with the Mercurius Machine burning gold at its crown, a packed arena watches two squads of creatures, small shapes in the colors of their elements, trade attacks on its floor until the attacks of their leaders meet in a flash, while a Scrambler Token shown in light hangs above it as the prize and ships from across the galaxy come down to the city.</desc>\n'
    else:
        head += ' aria-hidden="true">\n'
    return head + body + '\n</svg>\n'


NOTES_WHAT = ("The present day, on Valleron. King Kozrak's citadel, the greatest of the Vallerii spires, rises over a crowded city with the Mercurius Machine burning gold at its apex, the only machine that prints Scrambler Tokens. Below it, one of his arenas is packed to the rim under floodlights and hung with the banners of factions from across Xalia, and a fight is on: two squads of creatures, abstract blobs in their elements' colors, trading attacks. Over the arena, projected from the king's box, hangs the prize, the same printed genome card that was carried home in beat 06, and a thread of gold runs to it from the Machine that makes it. Ships come down out of a sky where the plague still smolders in the galaxy's arms and settle on the city's landing decks, and a faction's ship waits on a deck in the foreground with its hatch open.")
NOTES_HOW = ("On a ten-second clock the squads trade an attack about every second and a quarter (a bolt, a fireball, a volley of darts, a globe of water, ice shards, a thrown stone, lobbed over the front row), each creature nudging forward as it attacks and back as it is hit; then the two leaders' great attacks meet in the middle with a flash, a ring of dust and the crowd's roar. The token turns slowly with scan lines running through it, and every eight seconds a pulse runs down the Machine's thread and the card brightens as it arrives; the searchlights sweep the city out of step, ships glide in and settle on the decks, the Machine's ring turns, and the plague breathes in the galaxy. Every animation starts mid-cycle, so the still frame shows the great fireball and bolt about to meet.")

svg_defs = '<svg class="defs" id="layer-defs" width="0" height="0" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n<defs>\n%s\n</defs>\n</svg>\n' % (W, H, '\n'.join(defs))
piece_comment = '<!--\n' + CONCEPT + '\n\n' + PIECES.replace('--', '-') + '\n-->\n'
layers = (piece_comment + svg_defs
          + layer('sky', '<!-- ===================== SKY AND GALAXY ===================== -->\n' + pieces(sky), role=True)
          + layer('skyfx', '<!-- ===================== SMOLDER AND ARRIVING SHIPS ===================== -->\n' + pieces(skyfx))
          + layer('city', '<!-- ===================== FAR CITY AND THE CITADEL ===================== -->\n' + pieces(city))
          + layer('cityfx', '<!-- ===================== BEACONS, SEARCHLIGHTS, THE MACHINE, THE TOKEN ===================== -->\n' + pieces(cityfx))
          + layer('arena', '<!-- ===================== THE ARENA ===================== -->\n' + pieces(arena))
          + layer('fight', '<!-- ===================== THE FIGHT AND THE ROAR ===================== -->\n' + pieces(fight))
          + layer('prize', '<!-- ===================== THE PROJECTION AND THE TOKEN ===================== -->\n' + pieces(prize))
          + layer('near', '<!-- ===================== LANDING DECK AND NEAR ROOFS ===================== -->\n' + pieces(near))
          + layer('nearfx', '<!-- ===================== NEAR LIGHTS ===================== -->\n' + pieces(nearfx))
          + layer('top', '<!-- ===================== FINISH ===================== -->\n' + pieces(top)))

page = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
page = page.replace('<!--LAYERS-->', layers).replace('NOTES_WHAT', NOTES_WHAT).replace('NOTES_HOW', NOTES_HOW)
io.open(os.path.join(HERE, 'source.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('ok', len(page) // 1024, 'KB')
