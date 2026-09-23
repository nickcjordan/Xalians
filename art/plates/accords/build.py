"""Build the Accords plate: python art/plates/accords/build.py writes source.html beside it.

The Accords plate is generated rather than hand-edited because most of it is procedural
(cloud billows, spire facets, lightning, sprites). Edit this script, run it, then export with
scripts/plates/export-plate.py accords. Every drawn piece traces to a line of PIECES below.
"""
import io
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1536, 1920
HZ = 905  # the horizon: the far edge of the cloud sea

CONCEPT = """The Accords put every Xalian Generator under APEX, and APEX could only reach them
because of one thing: the QEDs forged in Zolton's bloodstorms. This plate is that forge, the
machine that made the link. A QED works stands on the summit of one of Zolton's metal spires,
high above a sea of storm cloud lit red from inside. Crimson sprites, the storm's electrical
jellyfish, bloom above the clouds. Chips are forged at opposite ends of a sprite: a pod hung on a
tether above, the mast's cradle below. When a vast sprite blooms between them, a dark-red discharge
runs down the mast and both ends pulse together, the entangled pair. One steady cold lamp on the
mast never flickers while everything around it storms."""

PIECES = """Piece list (far to near). Key light: the storm, glowing crimson from inside the cloud sea
and lighting every spire from below; cool mauve skylight from the horizon rims the upper edges.
- sky: upper atmosphere, near black violet at the top to dusky mauve at the horizon. Static.
- stars: sparse, fading toward the horizon. Static.
- storm wall: a long low bank of storm cells along the horizon at left with a thin anvil smear
  above it, well clear of the forge mast; cool crowns, lit crimson and white from within.
- cloud sea: rows of billows from the horizon to the foreground, smaller, paler and flatter with
  distance, lit crimson from within in the valleys between billows. The billows are static; the
  storm breathing and the flashes light them.
- far spires: small metal needles piercing the far cloud sea, hazed toward the horizon color.
- mid spires: three large needles rising from the mid cloud sea, left, center left and right,
  underlit crimson, rimmed cool.
- the forge spire: the largest metal spire, center right, rising from the cloud to a flat summit,
  a cool rim on its summit edge and seams on its faces.
- the QED works: a blockhouse on the summit with a row of amber windows, and the cradle
  mast, a short tapering lattice with a forked cradle at its tip, the sprite's lower end.
- the upper collector: the chip at the sprite's other end, a pod on a tether hung from a lift
  envelope above the frame; the tether runs down through the sprite to the cradle. It pings with
  the cradle at the forging.
- the chips: the same small carrier with a dim white core in the pod and between the cradle prongs,
  so the two ends read as a matched pair.
- standing charge: a dim steady crimson glow at the cradle and at the pod, a faint haze between
  them and a faint crimson line along the tether: the sprite column at rest.
- the relay lamp: a steady cold white lamp on an arm of the mast. It never flickers.
- sprites: crimson ball-lightning with a red head and violet-blue tendrils hanging below it,
  blooming above the cloud sea, flickering and fading; eight of them on separate clocks, staggered
  so the sky is never quiet for long.
- the forging: a vast sprite with a crimson halo blooms directly over the cradle every 12 seconds,
  its tendrils wrapping the prongs; a crimson discharge runs down the mast, the cradle pings with
  the pair's signature (a white-hot core and soft crimson rings, used by no other light), the upper
  collector pulses with it at the sprite's other end, and the works' windows dip.
- lightning, all bloodstorm crimson: a crawler across the cloud tops at left; a bolt from the
  right sprite into the right mid spire's tip, on that sprite's clock; a bolt from inside the storm
  wall into the far center needle; the high right sprite into the far right spire tip; the upper
  left sprite into the center-left mid spire tip; a bolt out of the near cloud into the near needle;
  two short forked bolts inside the near cloud. Each strike leaves a glint on its tip. Fast,
  flickering, dark red with a hot core, with an afterglow on the clouds.
- near crags: dark crags at bottom left and right framing the view, their upper edges
  catching the storm's red light from below.
- the cable: a haul line from an anchor pylon on the right crag up to the works, sagging. The
  pylon's legs catch the storm light and a small crimson lamp burns at its head.
- near needle: a metal spire piercing the near cloud at center left, the foreground's lightning rod.
- tip glints: every metal spire tip holds a steady cold glint, the metallic peaks of the lore.
- storm breathing: slow swells of red light in the cloud sea on their own clocks, and two dim
  flickers deep in the near cloud, the storm seen only as light.
- finish: vignette, paper and brush-stroke sheets."""

rnd = random.Random(7)


def f(v):
    # keyTimes, phases and periods need three decimals (one decimal collapsed every bloom); coordinates need one
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


def kt(period, *ts):
    # keyTimes given as fractions of a 12 s clock, rescaled so the event lasts the same seconds on any clock
    return ';'.join(['0'] + [f(t * 12 / period) for t in ts] + ['1'])


def ease(n):
    return ' keySplines="%s"' % ';'.join(['.42 0 .58 1'] * n)


# ------------------------------------------------------------------ palette
SKY_TOP, SKY_MID, SKY_LOW, SKY_HZ = '#07060d', '#161026', '#3b2c47', '#735a73'
CRIMSON, CRIMSON_HOT, CRIMSON_DEEP = '#c4283c', '#ff6a5c', '#5a0f22'
METAL_LIT, METAL_MID, METAL_DARK = '#5a5866', '#2b2a33', '#0e0d12'
COLD = '#dff2ff'
AMBER = '#ffc983'

# ------------------------------------------------------------------ filters
defs.append('''<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="soft12" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="soft4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glowWide" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="boltGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="cloudFar" x="-5%" y="-40%" width="110%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".03 .06" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.4"/></filter>
<filter id="cloudMid" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".016 .03" numOctaves="4" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2"/></filter>
<filter id="cloudNear" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".008 .016" numOctaves="4" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="48" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="3"/></filter>
<filter id="strokes" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".004 .03" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" values="0 0 0 0 .75  0 0 0 0 .7  0 0 0 0 .8  0 0 0 .16 0"/></filter>
<filter id="rockGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".05 .012" numOctaves="3" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 .7  0 0 0 0 .7  0 0 0 0 .78  0 0 0 .5 -.18" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>''')
sky_g = lin([(0, SKY_TOP, 1), (.38, SKY_MID, 1), (.78, SKY_LOW, 1), (1, SKY_HZ, 1)], 0, 0, 0, HZ + 20, units=True, id='sky')
hz_glow = rad([(0, '#b08a96', .55), (.5, '#7d5c74', .22), (1, '#3b2c47', 0)], id='hzGlow')
cloud_red = rad([(0, '#ff4a4e', .5), (.45, '#9c1e36', .28), (1, '#3a0d22', 0)], id='cloudRed')
flash_red = rad([(0, '#ff8d86', .9), (.35, '#e0344a', .55), (1, '#6a0f2a', 0)], id='flashRed')
flash_white = rad([(0, '#ffffff', .9), (.35, '#d6c9ff', .45), (1, '#6a5a9a', 0)], id='flashWhite')
lamp_cold = rad([(0, '#ffffff', 1), (.2, COLD, .8), (1, '#8fc4ff', 0)], id='lampCold')
lamp_red = rad([(0, '#ffe0dc', 1), (.25, '#ff5a5a', .8), (1, '#a01030', 0)], id='lampRed')
win_amber = rad([(0, '#ffe6b8', .9), (1, '#ff9a3a', 0)], id='winAmber')

# ------------------------------------------------------------------ sky layer
sky = []
sky.append('<rect width="%d" height="%d" fill="url(#sky)"/>' % (W, HZ + 40))
lin([(0, '#ffffff', .3), (.62, '#ffffff', .3), (.8, '#ffffff', 1), (1, '#ffffff', 1)], 0, 0, 0, HZ + 40, units=True, id='strokeRamp')
defs.append('<mask id="strokeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="url(#strokeRamp)"/></mask>' % (W, HZ + 40, W, HZ + 40))
sky.append('<rect width="%d" height="%d" filter="url(#strokes)" mask="url(#strokeMask)"/>' % (W, HZ + 40))
sky.append('<ellipse cx="760" cy="%d" rx="1150" ry="210" fill="url(#hzGlow)"/>' % HZ)
# stars
st = []
for _ in range(170):
    x = rnd.uniform(0, W)
    y = rnd.uniform(0, HZ - 120) ** 1.0
    y = (rnd.random() ** 1.6) * (HZ - 160)
    op = max(.08, (1 - y / (HZ - 100)) * rnd.uniform(.35, .95))
    r = rnd.choice([.7, .8, 1, 1, 1.2, 1.5, 1.9])
    st.append('<circle cx="%s" cy="%s" r="%s" opacity="%s"/>' % (f(x), f(y), f(r), f(op)))
sky.append('<!-- stars --><g fill="#e8e2f4">%s</g>' % ''.join(st))
AURORA = []
ar = random.Random(17)
for (x0, x1, y0, h, col, op) in [(-100, 900, 330, 240, '#b04a9a', .26), (500, 1650, 250, 210, '#7a5ad0', .2), (200, 1300, 420, 170, '#c0406a', .14)]:
    pts_bot = []
    n = 30
    ph = ar.uniform(0, 3)
    for i in range(n + 1):
        t = i / n
        pts_bot.append((lerp(x0, x1, t), y0 + 45 * math.sin(t * 5.2 + ph) + 18 * math.sin(t * 13 + ph * 2)))
    g = lin([(0, col, 0), (.7, col, op * .6), (1, col, op)], 0, y0 - h, 0, y0 + 50, units=True)
    d = 'M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in pts_bot) + ' L%s %s L%s %s Z' % (f(x1), f(y0 - h), f(x0), f(y0 - h))
    rays = ''.join('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(x), f(y), f(x - 4), f(y - h * ar.uniform(.4, .9))) for x, y in pts_bot)
    AURORA.append((d, g, rays, col))
# the aurora: the erratic magnetosphere as faint curtains high in the sky
aur = ['<!-- aurora: the erratic magnetosphere, faint curtains high above the storm -->']
for d, g, rays, col in AURORA:
    aur.append('<g filter="url(#soft12)"><path d="%s" fill="url(#%s)"/><g stroke="%s" stroke-width="5" opacity=".14">%s</g></g>' % (d, g, col, rays))
pass  # aurora dropped in round 0: it read as muddy blocks, not curtains


# a billow: a cauliflower dome of overlapping circles, flattened by perspective (k), shaded crown to base
def billow_group(cx, cy, rx, ry, top, bot, n=4, rim=None):
    g = lin([(0, top, 1), (.45, mix(top, bot, .55), 1), (1, bot, 1)])
    k = ry / rx
    out = ['<g transform="translate(%s %s) scale(1 %s)">' % (f(cx), f(cy), f(k))]
    m = n + 2
    for i in range(m):
        t = (i + .5) / m
        r = rx * rnd.uniform(.32, .5) * (1 - abs(t - .5) * .8)
        x = (t - .5) * rx * 1.7 + rnd.uniform(-.08, .08) * rx
        y = -math.sin(t * math.pi) * rx * .28 + rnd.uniform(-.06, .06) * rx
        out.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%s)"/>' % (f(x), f(y), f(r), g))
    out.append('</g>')
    return ''.join(out)


# the thunderhead: a column of billows rising from the far horizon, capped by a flat anvil
th = []
th.append('<!-- the storm wall: a long low bank of storm cells along the horizon at left, a thin anvil smear above -->')
def wall_top(x):
    y = 740 - 70 * math.sin(math.pi * min(1, x / 980)) + 18 * math.sin(x / 70) + 10 * math.sin(x / 23)
    # the wall's right end slopes down into the horizon instead of stopping on a vertical edge
    k = max(0.0, min(1.0, (x - 640) / 260))
    return y + (HZ - 20 - y) * k * k
body = ['M-20 %s' % f(HZ + 4)]
for xx in range(-20, 901, 20):
    body.append('L%s %s' % (f(xx), f(wall_top(xx) + 26)))
body.append('L900 %s Z' % f(HZ + 4))
g_wall = lin([(0, '#5e4660', 1), (.6, '#3c2840', 1), (1, '#2a1830', 1)], 0, 660, 0, HZ, units=True, id='stormWall')
crowns = []
for xx in range(-20, 860, 46):
    crowns.append(billow_group(xx + rnd.uniform(-12, 12), wall_top(xx) + 18, rnd.uniform(60, 95), rnd.uniform(34, 48), '#9c8098', '#3e2a42', 3))
    for dy, top_, bot_ in ((55, '#7e6480', '#34223a'), (95, '#6a5270', '#2e1c34')):
        if wall_top(xx) + dy < HZ - 10:
            crowns.append(billow_group(xx + 23 + rnd.uniform(-12, 12), wall_top(xx) + dy, rnd.uniform(60, 95), rnd.uniform(30, 44), top_, bot_, 3))
anvil = []
for i in range(16):
    t = i / 15
    anvil.append(billow_group(lerp(120, 760, t) + rnd.uniform(-15, 15), 640 + 30 * abs(t - .45) + rnd.uniform(-6, 6), rnd.uniform(70, 110), rnd.uniform(12, 20), '#b7a0b6', '#5a4460', 3))
lin([(0, '#ffffff', 1), (.7, '#ffffff', 1), (1, '#ffffff', 0)], 0, 0, 920, 0, units=True, id='wallFeather')
defs.append('<mask id="wallMask" maskUnits="userSpaceOnUse" x="-40" y="500" width="1000" height="440"><rect x="-40" y="500" width="1000" height="440" fill="url(#wallFeather)"/></mask>')
th.append('<g mask="url(#wallMask)"><g filter="url(#cloudMid)" opacity=".94"><g opacity=".75">%s</g><path d="%s" fill="url(#stormWall)"/>%s</g></g>' % (''.join(anvil), ' '.join(body), ''.join(crowns)))
th.append('<ellipse cx="420" cy="820" rx="360" ry="70" fill="url(#cloudRed)" opacity=".35"/>')
sky.append(''.join(th))

# ------------------------------------------------------------------ land layer (static): cloud rows interleaved with spires by depth
land = []


def cloud_row(y, rx, ry, top, bot, filt, xs=None, skip=None, n=4, red=0.0):
    out = []
    x = -rx * rnd.uniform(.2, .8)
    while x < W + rx:
        cx = x + rnd.uniform(-rx * .2, rx * .2)
        cy = y + rnd.uniform(-ry * .6, ry * .6)
        if not (skip and skip(cx, cy)):
            out.append(billow_group(cx, cy, rx * rnd.uniform(.8, 1.2), ry * 1.7 * rnd.uniform(.8, 1.2), top, bot, n))
        x += rx * rnd.uniform(.7, 1.1)
    s = '<g filter="url(#%s)">%s</g>' % (filt, ''.join(out))
    if red:
        glows = []
        x = rnd.uniform(0, rx * 3)
        while x < W:
            if not (skip and skip(x, y)) and not (780 < x < 1260 and 1180 < y < 1360):
                glows.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#cloudRed)" opacity="%s"/>' % (f(x), f(y - ry * .3), f(max(300, rx * 2.6)), f(max(60, ry * 1.8)), f(red * rnd.uniform(.35, .6))))
            x += max(700, rx * rnd.uniform(5, 8))
        s += ''.join(glows)
    return s


def spire(x, base, top, width, lit, dark, rim, under, lean=0.0, flat=0, seed=None, name=None, pale=True):
    r = random.Random(seed if seed is not None else int(x * 7 + top))
    n = 14
    left, right = [], []
    for i in range(n + 1):
        t = i / n  # 0 at top
        wv = max(flat * .5 * (1 + t * 1.5), width * (t ** .72) * .5) if flat else width * (t ** .72) * .5
        j = width * .06 * (r.random() - .5) * (0 if (i == 0 or (flat and i < 3)) else 1)
        cx = x + lean * (1 - t) * width
        y = lerp(top, base, t)
        # shoulders: occasional steps in the silhouette
        sl = width * (.035 if flat else .05) * (1 if r.random() < .3 else 0) * (0 if flat and i < 3 else 1)
        sr = width * (.035 if flat else .05) * (1 if r.random() < .3 else 0) * (0 if flat and i < 3 else 1)
        left.append((cx - wv - sl + j, y))
        right.append((cx + wv + sr + j, y))
    if flat:
        left[0] = (x + lean * width - flat * .5, top)
        right[0] = (x + lean * width + flat * .5, top)
    poly = left + right[::-1]
    # the ridge between the lit face (left) and the shadow face (right)
    ridge = [(lerp(l[0], rr[0], .42 + .08 * r.random()), l[1]) for l, rr in zip(left, right)]
    cid = 'clip%d' % (len(defs) + r.randint(0, 99999))
    defs.append('<clipPath id="%s"><polygon points="%s"/></clipPath>' % (cid, pts(poly)))
    # lit from below by the storm: a metallic cap catching the sky, a dark body, a warm base
    cap = '#3a3444' if flat else mix(lit, '#9aa2bc', .5)
    g_lit = lin([(0, cap, 1), (.06, mix(lit, cap, .4), 1), (.1, lit, 1), (.18, mix(lit, dark, .55), 1), (.6, mix(dark, under, .1), 1), (1, mix(dark, under, .28), 1)], 0, top, 0, base, units=True)
    g_sh = lin([(0, mix(dark, lit, .45), 1), (.15, dark, 1), (.6, mix(dark, under, .08), 1), (1, mix(dark, under, .3), 1)], 0, top, 0, base, units=True)
    g_under = lin([(0, under, 0), (.25, under, .05), (.8, under, .45), (1, under, .6)], 0, top, 0, base, units=True) if flat else lin([(0, under, 0), (.35, under, 0), (.8, under, .3), (1, under, .42)], 0, top, 0, base, units=True)
    fade = lin([(0, '#ffffff', 1), (.8, '#ffffff', 1), (1, '#ffffff', 0)], 0, top, 0, base, units=True)
    mid = 'fade%d' % gid[0]
    defs.append('<mask id="%s" maskUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s"><rect x="%s" y="%s" width="%s" height="%s" fill="url(#%s)"/></mask>' % (
        mid, f(x - width * 1.5), f(top - 40), f(width * 3), f(base - top + 80), f(x - width * 1.5), f(top - 40), f(width * 3), f(base - top + 80), fade))
    out = ['<g>']
    out.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(poly), g_sh))
    out.append('<polygon points="%s" fill="url(#%s)"/>' % (pts(left + ridge[::-1]), g_lit))
    # facets: a few darker and lighter planes across both faces
    fac = []
    for k in range(int(5 + width / 40)):
        i0 = r.randint(0, n - 4)
        i1 = min(n, i0 + r.randint(2, 4))
        a = left if r.random() < .5 else right
        # a slanted plane: from the edge at one height to the ridge a few steps lower
        p = [a[i0], ridge[min(n, i0 + 1)], ridge[i1], a[max(i0 + 1, i1 - 2)]]
        c = '#000000' if (r.random() < .65 or not pale or i0 > n * .6) else '#c8c0dc'
        fac.append('<polygon points="%s" fill="%s" opacity="%s"/>' % (pts(p), c, f(r.uniform(.04, .1))))
    out.append('<g clip-path="url(#%s)">%s' % (cid, ''.join(fac)))
    if not flat:
        tx_ = (left[0][0] + right[0][0]) / 2
        out.append('<circle cx="%s" cy="%s" r="%s" fill="#dfe6f4" opacity=".75" filter="url(#glow)"/>' % (f(tx_), f(top + 2), f(max(3, width / 22))))
    # panel seams: a few straight joints across the metal, catching the storm light
    for k in range((3 if width >= 70 else 1) if (pale or flat) else 0):
        i0 = r.randint(2, n - 3)
        yy = left[i0][1]
        x0_ = lerp(left[i0][0], ridge[i0][0], r.uniform(.1, .4))
        out.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#8a86a4" stroke-width="%s" opacity="%s"/>' % (
            f(x0_), f(yy), f(ridge[i0][0] - 2), f(yy + r.uniform(4, 12)), f(max(.8, min(3, width / 36))), '.45' if width >= 70 else '.2'))
    out.append('<rect x="%s" y="%s" width="%s" height="%s" fill="url(#%s)"/>' % (f(x - width), f(top), f(width * 2), f(base - top), g_under))
    out.append('</g>')
    # the rim: the cool skylight catching the left edge
    out.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity="%s" stroke-linejoin="round"/>' % (pts(left[:int(n * .3)]), rim, f(max(.8, width / 180)), '.6' if flat else '.4'))
    if flat:
        out.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.6" opacity=".6"/>' % (f(left[0][0]), f(left[0][1]), f(right[0][0]), f(right[0][1]), rim))
    out.append('<polyline points="%s" fill="none" stroke="#c4283c" stroke-width="%s" opacity=".7" stroke-linejoin="round"/>' % (pts(left[int(n * .5):]), f(max(1.2, width / 120))))
    out.append('<polyline points="%s" fill="none" stroke="#c4283c" stroke-width="%s" opacity=".5" stroke-linejoin="round"/>' % (pts(right[int(n * .5):]), f(max(1, width / 150))))
    # metallic sheen: thin vertical glints down the lit face, the spire's ore catching the sky
    if False:
        sh = []
        for k in range(int(width / 40)):
            i0 = r.randint(0, n // 2)
            t = r.uniform(.15, .6)
            p0 = (lerp(left[i0][0], ridge[i0][0], t), left[i0][1])
            i1 = min(n, i0 + r.randint(2, 5))
            p1 = (lerp(left[i1][0], ridge[i1][0], t), left[i1][1])
            sh.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(p0[0]), f(p0[1]), f(p1[0]), f(p1[1])))
        out.append('<g stroke="%s" stroke-width="%s" opacity=".22" stroke-linecap="round" clip-path="url(#%s)">%s</g>' % (rim, f(width / 200), cid, ''.join(sh)))
    out.append('</g>')
    return ''.join(out), left, right


ROWS0 = [
    # y, rx, ry, top, bottom, filter, red
    (HZ + 4, 20, 5, '#98809a', '#5d4a60', 'cloudFar', .0),
    (HZ + 14, 26, 7, '#937a94', '#523f57', 'cloudFar', .15),
    (HZ + 30, 34, 9, '#8c7290', '#48344e', 'cloudFar', .2),
    (HZ + 52, 44, 12, '#866b89', '#3f2c45', 'cloudFar', .3),
    (HZ + 82, 56, 16, '#806484', '#37263e', 'cloudMid', .35),
    (HZ + 122, 70, 21, '#7a5e7e', '#312138', 'cloudMid', .4),
    (HZ + 172, 88, 27, '#735876', '#2c1d33', 'cloudMid', .45),
    (HZ + 236, 108, 34, '#6d526f', '#281a2f', 'cloudMid', .5),
    (HZ + 316, 132, 42, '#674c68', '#24172b', 'cloudNear', .55),
    (HZ + 410, 160, 52, '#604762', '#1f1426', 'cloudNear', .6),
    (HZ + 520, 190, 62, '#59425c', '#1b1122', 'cloudNear', .6),
    (HZ + 650, 225, 74, '#513c56', '#170e1e', 'cloudNear', .55),
    (HZ + 800, 260, 86, '#49354e', '#130b1a', 'cloudNear', .5),
    (HZ + 960, 300, 96, '#412f47', '#100816', 'cloudNear', .45),
]
ROWS0 = [(y, rx, ry, top, mix(bot, '#4a1026', .35), fl, red) for (y, rx, ry, top, bot, fl, red) in ROWS0]
rows = []
for a, b in zip(ROWS0, ROWS0[1:]):
    rows.append(a)
    rows.append(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, mix(a[3], b[3], .5), mix(a[4], b[4], .5), a[5], (a[6] + b[6]) / 2 * .6))
rows.append(ROWS0[-1])

SPIRES = [
    # x, base (where the cloud swallows it), top, width, name
    (128, HZ + 60, 840, 36, 'far spire, far left'),
    (318, HZ + 50, 790, 30, 'far spire, left'),
    (780, HZ + 45, 862, 20, 'far needle, center'),
    (1236, HZ + 55, 846, 30, 'far spire, right'),
    (1486, HZ + 70, 858, 40, 'far spire, far right'),
    (660, HZ + 250, 950, 110, 'mid spire, center left'),
    (170, HZ + 530, 1050, 110, 'mid spire, left'),
    (1420, HZ + 340, 948, 150, 'mid spire, right'),
    (1012, HZ + 470, 800, 400, 'the forge spire'),
]

spire_geo = {}
emitted = set()
body = lin([(0, '#5d4a60', 1), (.08, '#3e2c45', 1), (.5, '#24172b', 1), (1, '#0f0814', 1)], 0, HZ, 0, H, units=True, id='cloudBody')
land.append('<!-- the body of the cloud sea, behind its billows --><rect x="0" y="%d" width="%d" height="%d" fill="url(#cloudBody)"/>' % (HZ - 2, W, H - HZ + 2))
for ri, (y, rx, ry, top, bot, filt, red) in enumerate(rows):
    # spires whose base sits behind this row are drawn first, so the row swallows their feet
    for si, (x, base, tp, w, name) in enumerate(SPIRES):
        if si in emitted or base > y + ry * 1.2:
            continue
        emitted.add(si)
        dist = max(0, min(1, (HZ + 400 - base) / 400))
        lit = mix('#2e2b38', '#6d5e72', dist)
        dark = mix('#0b0a0f', '#43354a', dist)
        rim = mix('#b8b4d0', '#b39cb4', dist)
        under = mix('#c4283c', '#a0405a', dist) if name != 'the forge spire' else '#8a2438'
        if name == 'the forge spire':
            lit = '#2b2a33'
        flat = 168 if name == 'the forge spire' else 0
        s, L, R = spire(x, 1236 if flat else y + 12, tp, w, lit, dark, rim, under, lean=0 if flat else (.04 if si % 2 else -.03), flat=flat, seed=si + 3, pale=not flat)
        spire_geo[name] = (L, R)
        land.append('<!-- %s -->%s' % (name, s))
        if name != 'the forge spire':
            # a few billows of this row in front of the spire's foot, overlapping it
            cl = []
            n_ = max(2, int(w * 1.6 / rx) + 1)
            for k in range(n_):
                cx = x - w * .8 + (k + .5) * (w * 1.6 / n_)
                cl.append(billow_group(cx + rnd.uniform(-6, 6), y + 8 + rnd.uniform(-4, 4), max(rx, w * .45), ry * 1.7, top, bot, 4))
            land.append('<!-- billows in front of the %s foot --><g filter="url(#%s)">%s</g>' % (name, filt, ''.join(cl)))
        if name == 'the forge spire':
            foot = []
            for cx in range(790, 1250, 70):
                foot.append(billow_group(cx + rnd.uniform(-20, 20), 1232 + rnd.uniform(-10, 10), 120, 78, '#6a4f6b', '#2e1830', 4))
            for (cx, cy, rr) in [(880, 1150, 80), (985, 1168, 70), (1095, 1138, 86), (1180, 1160, 64), (840, 1170, 70), (1150, 1180, 70), (1030, 1180, 70)]:
                foot.append(billow_group(cx, cy, rr, rr * .75, '#6a4f6b', '#2e1830', 4))
            land.append('<!-- billows wrapping the forge spire foot, a few climbing its flanks --><g filter="url(#cloudNear)">%s</g>' % ''.join(foot))
    skip = None
    land.append('<!-- cloud sea, row %d -->%s' % (ri, cloud_row(y, rx, ry, top, bot, filt, skip=skip, red=red)))
    if ri == 4:
        lin([(0, '#7d6478', 0), (.35, '#7d6478', .55), (1, '#7d6478', 0)], 0, HZ - 30, 0, HZ + 90, units=True, id='hzHaze')
        land.append('<!-- haze where the cloud sea meets the sky --><rect x="0" y="%d" width="%d" height="120" fill="url(#hzHaze)"/>' % (HZ - 30, W))

land.append('<!-- hot spots: the storm glowing through the near cloud -->'
            '<ellipse cx="560" cy="1420" rx="130" ry="60" fill="url(#cloudRed)" opacity=".55"/>'
            '<ellipse cx="1180" cy="1330" rx="120" ry="56" fill="url(#cloudRed)" opacity=".5"/>')
# a near needle piercing the near cloud: the foreground's lightning rod
_ns, _nl, _nr = spire(720, 1595, 1250, 110, '#3a3444', '#0b0a0f', '#b8b4d0', '#c4283c', lean=.03, seed=41)
land.append('<!-- near needle: a metal spire piercing the near cloud -->' + _ns)
_nf = [billow_group(720 + dx, 1628 + rnd.uniform(-8, 8), 150, 96, '#5a4260', '#2a1428', 4) for dx in (-150, -60, -20, 30, 120, 200)]
land.append('<!-- billows at the near needle foot --><g filter="url(#cloudNear)">%s</g>' % ''.join(_nf))

# the QED works on the forge spire's summit
SUMMIT_Y = 800
works = []
works.append('<!-- the QED works: blockhouse and cradle mast -->')
g_block = lin([(0, '#4a4656', 1), (1, '#141219', 1)])
works.append('<polygon points="946,800 946,748 972,736 1060,736 1078,748 1078,800" fill="url(#%s)"/>' % g_block)
works.append('<polygon points="946,748 972,736 1060,736 1078,748" fill="#6d6878" opacity=".7"/>')
works.append('<line x1="946" y1="748" x2="972" y2="736" stroke="#b8b4d0" stroke-width="1.2" opacity=".6"/>')
wins = ''.join('<rect x="%d" y="760" width="7" height="10" fill="%s"/>' % (x, AMBER) for x in range(956, 1070, 14))
works.append('<g id="windows">%s</g>' % wins)
works.append('<rect x="950" y="776" width="124" height="3" fill="#000" opacity=".35"/>')
# gantry on the left: a service platform with a rail

# the cradle mast: a tapering lattice from the roof to the sprite zone
MAST_X, MAST_BASE, MAST_TOP = 1014, 736, 560
lat = []
lx0, rx0 = MAST_X - 14, MAST_X + 14
lx1, rx1 = MAST_X - 7, MAST_X + 7
lat.append('<line x1="%d" y1="%d" x2="%d" y2="%d"/>' % (lx0, MAST_BASE, lx1, MAST_TOP))
lat.append('<line x1="%d" y1="%d" x2="%d" y2="%d"/>' % (rx0, MAST_BASE, rx1, MAST_TOP))
seg = 22
yy = MAST_BASE
side = 0
while yy - seg > MAST_TOP:
    t0 = (MAST_BASE - yy) / (MAST_BASE - MAST_TOP)
    t1 = (MAST_BASE - yy + seg) / (MAST_BASE - MAST_TOP)
    xl0, xr0 = lerp(lx0, lx1, t0), lerp(rx0, rx1, t0)
    xl1, xr1 = lerp(lx0, lx1, t1), lerp(rx0, rx1, t1)
    if side:
        lat.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(xl0), yy, f(xr1), yy - seg))
    else:
        lat.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(xr0), yy, f(xl1), yy - seg))
    side ^= 1
    yy -= seg
works.append('<g stroke="#403c4c" stroke-width="2.2" stroke-linecap="round">%s</g>' % ''.join(lat))
works.append('<g stroke="#3a3646" stroke-width="4.5" stroke-linecap="round"><line x1="%d" y1="%d" x2="%d" y2="%d"/><line x1="%d" y1="%d" x2="%d" y2="%d"/></g>' % (lx0, MAST_BASE, lx1, MAST_TOP, rx0, MAST_BASE, rx1, MAST_TOP))
works.append('<g stroke="#9a96b4" stroke-width="1.2" opacity=".55"><line x1="%d" y1="%d" x2="%d" y2="%d"/></g>' % (lx0 - 2, MAST_BASE, lx1 - 2, MAST_TOP))
works.append('<!-- the cradle holding a dim standing charge between forgings --><ellipse cx="1014" cy="520" rx="48" ry="40" fill="url(#lampRed)" opacity=".45"/>')
works.append('<!-- a faint standing haze of charge between the pod and the cradle, the sprite column at rest --><ellipse cx="1014" cy="340" rx="150" ry="190" fill="url(#cloudRed)" opacity=".45"/>')
# the cradle: a ring holding the chip carrier, and two prongs reaching up into the storm
def CHIP(cx, cy):
    # the entangled chip: a small dark carrier with a dim white core, the same at both ends
    return ('<rect x="%s" y="%s" width="10" height="14" fill="#3a1a24" stroke="#ff8a7a" stroke-width="1.2"/>'
            '<rect x="%s" y="%s" width="4" height="6" fill="#ffffff" opacity=".7"/>' % (f(cx - 5), f(cy - 7), f(cx - 2), f(cy - 3)))


works.append('<!-- the cradle: the forked tip that reaches into the sprite -->'
             '<g transform="translate(1014 560) scale(1.7) translate(-1014 -392)"><g fill="none" stroke="#6d6878" stroke-width="2.8" stroke-linecap="round">'
             '<ellipse cx="1014" cy="392" rx="20" ry="5"/>'
             '<path d="M998 392 C 994 372, 998 356, 1004 346"/><path d="M1030 392 C 1034 372, 1030 356, 1024 346"/>'
             '<line x1="1014" y1="392" x2="1014" y2="370"/></g>'
             '<circle cx="1014" cy="368" r="3.4" fill="#2a2632" stroke="#8a86a4" stroke-width="1"/></g>'
             '<!-- the chip in the cradle, twin of the chip in the pod -->%s' % CHIP(1014, 519))
# the upper collector: the chip at the sprite's other end, a pod hung from a lift envelope above the
# frame on a tether that runs down through the sprite to the cradle
works.append('<!-- the upper collector: a pod at the top end of the sprite, on a tether from above and down to the cradle -->'
             '<line x1="1014" y1="0" x2="1014" y2="95" stroke="#2a2632" stroke-width="2.2"/>'

             '<line x1="1014" y1="182" x2="1014" y2="512" stroke="#4a4458" stroke-width="1.8"/>'
             '<line x1="1014" y1="182" x2="1014" y2="512" stroke="#8a2a3a" stroke-width="1.4" opacity=".5"/>'
             '<ellipse cx="1014" cy="150" rx="48" ry="42" fill="url(#lampRed)" opacity=".45"/>'
             '<g transform="translate(1014 150) scale(2.3) translate(-1014 -92)">'
             '<path d="M1005 76 Q 1014 64 1023 76 L 1021 98 Q 1014 106 1007 98 Z" fill="#3a3444" stroke="#8a86a4" stroke-width="1.2"/>'
             '<line x1="1006" y1="86" x2="1022" y2="86" stroke="#8a86a4" stroke-width="1"/>'
             '<path d="M1003 80 L 996 76 M1025 80 L 1032 76" stroke="#8a86a4" stroke-width="1.2"/>'
             '</g><!-- the chip in the pod -->%s' % CHIP(1014, 150))
# the relay lamp: a steady cold light on an arm; the only thing on the plate that never flickers
works.append('<!-- the relay lamp: steady cold light on an arm of the mast -->'
             '<ellipse cx="1059" cy="652" rx="26" ry="30" fill="url(#lampCold)" opacity=".3"/>'
             '<path d="M1022 660 L1052 654 M1022 678 L1050 660" stroke="#6d6878" stroke-width="5" fill="none" stroke-linecap="round"/>'
             '<path d="M1022 658 L1052 652" stroke="#9a96b4" stroke-width="1" fill="none"/>'
             '<rect x="1050" y="646" width="18" height="16" fill="#2a2632" stroke="#7a7690" stroke-width="1.4"/>'
             '<circle cx="1059" cy="652" r="20" fill="url(#lampCold)" opacity=".2"/>'
             '<circle cx="1059" cy="652" r="3.6" fill="#ffffff"/>')
land.append(''.join(works))

# the cable: from the works down to an anchor pylon on the right crag (the pylon lives in the near layer)
land.append('<!-- the cable: from the works to the anchor pylon on the right crag -->'
            '<path d="M1078 770 Q 1300 1120, 1472 1370" fill="none" stroke="#1a1720" stroke-width="2.2"/>'
            '<path d="M1078 776 Q 1306 1128, 1478 1376" fill="none" stroke="#1a1720" stroke-width="1.4" opacity=".8"/>')

# ------------------------------------------------------------------ high layer (animated): sprites and far flashes


def sprite(cx, cy, s, period, phase, seed, name, tail=None, halo=0, tip=0, sx=1, sy=1, hy=0, reach=88):
    r = random.Random(seed)
    g_head = rad([(0, '#ffd2c4', 1), (.25, '#ff5a4c', .95), (.7, '#c41c3a', .55), (1, '#6a0a2a', 0)])
    if halo and 'headHot' not in ''.join(defs[-40:]):
        rad([(0, '#fff0ea', 1), (.5, '#ff8a7a', .9), (1, '#ff5a4c', 0)], id='headHot')
    g_tail = lin([(0, '#e0304a', 1 if halo else .85), (.55, '#9a2a8a', .75 if halo else .6), (.88, '#5a4ac0', max(.35, tip)), (1, '#4a3ab0', tip)])
    parts = []
    if halo:
        parts.append('<ellipse cx="0" cy="%s" rx="%s" ry="%s" fill="url(#cloudRed)" opacity=".9"/>' % (f(halo * .2 + hy), f(halo), f(halo * .55)))
        parts.append('<ellipse cx="0" cy="%s" rx="%s" ry="%s" fill="url(#flashRed)" opacity=".75"/>' % (f(halo * .08 + hy), f(halo * .38), f(halo * .24)))
    parts.append('<ellipse cx="0" cy="0" rx="%s" ry="%s" fill="url(#%s)"/>' % (f(44 * s), f(26 * s), g_head))
    if halo:
        parts.append('<ellipse cx="0" cy="0" rx="%s" ry="%s" fill="url(#%s)"/>' % (f(30 * s), f(17 * s), g_head))
        parts.append('<ellipse cx="0" cy="-2" rx="%s" ry="%s" fill="url(#headHot)"/>' % (f(16 * s), f(8 * s)))
    # tendrils: thin tapering streamers hanging below the head
    for k in range(14):
        x0 = r.uniform(-30, 30) * s if halo else r.uniform(-34, 34) * s
        L = r.uniform(*tail) if tail else r.uniform(60 + seed * 9, 150 + seed * 14) * s
        if halo and abs(x0) <= 12 * s:
            L = reach  # the central tendrils reach the cradle chip
        sway = r.uniform(-18, 18) * min(s, 1.6) * (.15 if halo and abs(x0) <= 12 * s else 1)
        wd = r.uniform(1.2, 2.8) * min(s, 1.8)
        d = 'M%s %s C %s %s, %s %s, %s %s L %s %s C %s %s, %s %s, %s %s Z' % (
            f(x0 - wd), f((-4 if halo else 6) * s), f(x0 - wd + sway * .3), f(L * .4), f(x0 + sway * .8), f(L * .7), f(x0 + sway), f(L),
            f(x0 + sway + .4), f(L), f(x0 + sway * .8 + wd * .4), f(L * .7), f(x0 + wd + sway * .3), f(L * .4), f(x0 + wd), f((-4 if halo else 6) * s))
        parts.append('<path d="%s" fill="url(#%s)"/>' % (d, g_tail))
    # a faint crown of upward streamers
    for k in range(6 if halo else 4):
        x0 = r.uniform(-24, 24) * s
        L = r.uniform(26, 50) * s
        parts.append('<path d="M%s %s Q %s %s, %s %s" stroke="#ff7a6a" stroke-width="%s" fill="none" opacity=".25"/>' % (f(x0), f(-10 * s), f(x0 + r.uniform(-8, 8) * s), f(-L * .6), f(x0 + r.uniform(-10, 10) * s), f(-L), f(.7 * s)))
    # bloom fast, flicker, fade slowly; dark for the rest of its clock
    a, b_, c, d_, e = .0, .144 / period, .72 / period, 2.4 / period, 4.56 / period
    op = '<animate attributeName="opacity" values="0;1;.55;.95;.4;0;0" keyTimes="0;%s;%s;%s;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (f(b_), f(.36 / period), f(c), f(d_), f(e), f(period), f(phase))
    grow = '<animateTransform attributeName="transform" type="scale" additive="sum" values=".86 .6;1 1;1 1.06;1 1.06" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="spline" keySplines=".15 .6 .35 1;.4 0 .6 1;0 0 1 1"/>' % (f(c), f(e), f(period), f(phase))
    if halo:
        grow = ''  # the forging sprite is already reaching the cradle the instant it blooms
    return ('<!-- sprite: %s -->' % name) + '<g transform="translate(%s %s) scale(%s %s)"><g opacity="0" filter="url(#glow)">%s%s<g>%s</g></g></g>' % (f(cx), f(cy), f(sx), f(sy), op, grow, ''.join(parts))


high = []
FORGE_T = 12.0
FORGE_PH = 1.4  # phase: the still frame (t=0) catches the forging sprite as it fades
high.append(sprite(1014, 165, 1.6, FORGE_T, FORGE_PH, 1, 'the forging sprite, spanning the upper collector to the cradle', tail=(60, 150), halo=160, tip=.8, sx=1.6, sy=2.0, hy=55, reach=177))
high.append(sprite(600, 380, 1.4, 12, 3.1, 2, 'left of center, high above the mid spire'))
high.append(sprite(300, 430, 1.4, 8, 7.85, 3, 'above the storm wall'))
high.append(sprite(1330, 540, 1.2, 12, 7.1, 4, 'right, above the mid spire'))
high.append(sprite(430, 560, .45, 24, 4.0, 5, 'far, left of center, above the anvil smear'))
high.append(sprite(470, 230, .8, 8, 3.85, 6, 'high, left'))
high.append(sprite(1440, 210, 1.0, 12, 5.3, 7, 'high, right'))
high.append(sprite(700, 140, .6, 24, 20.4, 8, 'highest, center left'))


# flashes inside the thunderhead: light swelling inside the cloud, never a hard shape
def flash(cx, cy, rx, ry, grad, period, phase, peak=.8, name=''):  # noqa: shared by the high and storm layers
    return ('<!-- flash: %s -->' % name) + '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)" opacity="0"><animate attributeName="opacity" values="0;%s;.15;%s;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
        f(cx), f(cy), f(rx), f(ry), grad, f(peak), f(peak * .8), kt(period, .01, .025, .04, .13), f(period), f(phase))


high.append(flash(780, 800, 260, 80, 'flashRed', 12, 9.1, .75, 'inside the storm wall, lighting it from within'))
high.append(flash(620, 780, 220, 70, 'flashWhite', 8, 3.7, .8, 'inside the storm wall, right of center'))
high.append('<!-- the storm wall breathing: a slow crimson glow always alive inside it -->'
            '<ellipse cx="720" cy="790" rx="300" ry="80" fill="url(#cloudRed)" opacity=".15"><animate attributeName="opacity" values=".15;.35;.22;.3;.15" keyTimes="0;.3;.5;.75;1" dur="12s" begin="-2.3s" repeatCount="indefinite" %s%s/></ellipse>' % (SPLINE, ease(4)))

# ------------------------------------------------------------------ storm layer (animated): lightning, forging, cloud flashes


def bolt_path(x0, y0, x1, y1, r, rough=.18, branches=3, depth=0, step=18):
    L = math.hypot(x1 - x0, y1 - y0)
    n = max(6, int(L / step))
    p = [(x0, y0)]
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    off = 0
    for i in range(1, n):
        t = i / n
        off += r.uniform(-1, 1) * L * rough / math.sqrt(n)
        off *= .85
        p.append((lerp(x0, x1, t) + nx * off, lerp(y0, y1, t) + ny * off))
    if depth == 0 and y1 - y0 > 50:
        # the last leg comes down onto the target from above, never hooking in sideways
        p[-1] = (x1 + (p[-1][0] - x1) * .15, p[-1][1])
    p.append((x1, y1))
    out = [(p, depth)]
    if depth < 2:
        for k in range(branches):
            i = r.randint(1, n - 2)
            bx, by = p[i]
            ang = math.atan2(y1 - y0, x1 - x0) + r.choice([-1, 1]) * r.uniform(.4, .9)
            BL = L * r.uniform(.15, .35) / (depth + 1)
            out += bolt_path(bx, by, bx + BL * math.cos(ang), by + BL * math.sin(ang), r, rough, max(1, branches - 1), depth + 1)
    return out


def bolt(x0, y0, x1, y1, seed, color, core, period, phase, glow_at, glow_grad, name, width=2.4, rough=.18, branches=3, step=18):
    color, core = '#c4283c', '#ff7a7a'
    r = random.Random(seed)
    segs = bolt_path(x0, y0, x1, y1, r, rough=rough, branches=branches, step=step)
    body = ''.join('<polyline points="%s" stroke-width="%s" opacity="%s"/>' % (pts(p), f(width / (1 + d * .9)), f(1 / (1 + d * .6))) for p, d in segs)
    flick = '<animate attributeName="opacity" values="0;1;.1;.9;.25;.8;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (kt(period, .004, .01, .016, .022, .03, .05), f(period), f(phase))
    s = ('<!-- lightning: %s -->' % name)
    s += '<g opacity="0" fill="none" stroke-linejoin="round" stroke-linecap="round">%s<g stroke="%s" filter="url(#boltGlow)">%s</g><g stroke="%s">%s</g></g>' % (
        flick, color, body.replace('stroke-width="', 'stroke-width="2*'), core, body)
    s = s.replace('stroke-width="2*', 'stroke-width="')
    # the struck tip washes crimson on the bolt's clock
    if y1 - y0 > 50:
        s += '<ellipse cx="%s" cy="%s" rx="40" ry="70" fill="url(#lampRed)" opacity="0"><animate attributeName="opacity" values="0;.5;.25;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (f(x1), f(y1 + 55), kt(period, .008, .04, .1), f(period), f(phase))
    # a glint on the tip it lands on
    if y1 - y0 > 50:
        s += '<circle cx="%s" cy="%s" r="10" fill="url(#lampRed)" opacity="0"><animate attributeName="opacity" values="0;1;.4;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>' % (f(x1), f(y1), kt(period, .006, .03, .07), f(period), f(phase))
    # the afterglow on the clouds, lingering after the bolt is gone
    gx, gy, grx, gry = glow_at
    s += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s)" opacity="0"><animate attributeName="opacity" values="0;.85;.45;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite" %s keySplines="0 0 1 1;.3 0 .7 1;.2 0 .5 1;0 0 1 1"/></ellipse>' % (
        f(gx), f(gy), f(grx), f(gry), glow_grad, kt(period, .006, .03, .08), f(period), f(phase), SPLINE)
    return s


storm = []
storm.append(bolt(292, 1236, 505, 1208, 21, '#ff3a4a', '#ffd0cc', 24, 7.4, (400, 1228, 190, 55), 'flashRed', 'a crimson crawler across the cloud tops, left', 4.2, .18, 2, 7))
storm.append(bolt(1334, 650, 1421, 950, 33, '#ff3a4a', '#ffe0dc', 12, 6.46, (1420, 1185, 170, 50), 'flashRed', 'a sprite over the right mid spire discharging into its tip', 3.6))
storm.append(bolt(700, 745, 781, 866, 45, '#ff3a4a', '#ffd6d0', 12, 5.6, (780, 915, 120, 36), 'flashRed', 'a red bolt from the storm wall into the far center needle', 3.2))
storm.append(bolt(600, 560, 660, 950, 81, '#ff3a4a', '#ffd6d0', 12, 2.54, (660, 1040, 150, 44), 'flashRed', 'the upper left sprite discharging into the center-left mid spire tip', 3.2))

# the forging: the discharge down the cradle mast, timed to the forging sprite's bloom
TIP_RUN = bolt_path(1014, 440, 1014, 519, random.Random(78), rough=.1, branches=0)[0][0]
_mr = random.Random(77)
_segs = bolt_path(1014, 560, 1014, 736, _mr, rough=.25, branches=2, step=12)
MAST_RUN = [_segs[0][0], _segs[1][0] if len(_segs) > 1 else _segs[0][0]]
lin([(0, '#ff5a64', 1), (.6, '#ff4a58', .7), (1, '#c4283c', .15)], 0, 560, 0, 736, units=True, id='mastRun')
defs.append('<clipPath id="forgeRun"><rect x="960" y="430" width="110" height="0"><animate attributeName="height" values="0;320;320" keyTimes="0;.01;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></rect></clipPath>' % (f(FORGE_T), f(FORGE_PH)))
fk = 'values="0;1;.2;.95;.3;0;0" keyTimes="0;.012;.02;.03;.045;.09;1" dur="%ss" begin="-%ss" repeatCount="indefinite"' % (f(FORGE_T), f(FORGE_PH))
storm.append('<!-- the forging: the discharge running down the cradle mast -->'
             '<g opacity="0" clip-path="url(#forgeRun)"><animate attributeName="opacity" %s/>'
             '<polyline points="%s" fill="none" stroke="#c4283c" stroke-width="5" filter="url(#boltGlow)"/>'
             '<polyline points="%s" fill="none" stroke="#ff7a7a" stroke-width="1.8"/>'
             '<g fill="none" stroke="url(#mastRun)" stroke-linejoin="round" filter="url(#glow)">%s</g>'
             '<g fill="none" stroke="#ffd6d0" stroke-linejoin="round">%s</g></g>' % (
                 fk, pts(TIP_RUN), pts(TIP_RUN),
                 ''.join('<polyline points="%s" stroke-width="%s"/>' % (pts(q), '3.5' if d == 0 else '2') for q, d in _segs),
                 ''.join('<polyline points="%s" stroke-width="%s"/>' % (pts(q), '1.2' if d == 0 else '.7') for q, d in _segs)))
# the cradle flare: a crimson bloom at the tip that fades slowly after the discharge
storm.append('<!-- the cradle flare -->'
             '<circle cx="1014" cy="519" r="30" fill="url(#lampRed)" opacity="0"><animate attributeName="opacity" values="0;.5;.3;0;0" keyTimes="0;.014;.08;.3;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s keySplines="0 0 1 1;.3 0 .7 1;.2 0 .5 1;0 0 1 1"/></circle>' % (f(FORGE_T), f(FORGE_PH), SPLINE))
# 2 the upper collector carries the same flare, so the pair is balanced, in the still as well
storm.append('<!-- the upper collector flare, matching the cradle -->'
             '<circle cx="1014" cy="150" r="36" fill="url(#headHot)" opacity="0"><animate attributeName="opacity" values="0;.5;.3;0;0" keyTimes="0;.014;.08;.3;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s keySplines="0 0 1 1;.3 0 .7 1;.2 0 .5 1;0 0 1 1"/></circle>' % (f(FORGE_T), f(FORGE_PH), SPLINE))
storm.append('<!-- the forging sprite blazing white-hot at its head -->'
             '<ellipse cx="1014" cy="165" rx="44" ry="36" fill="url(#headHot)" opacity="0" filter="url(#glow)"><animate attributeName="opacity" values="0;.9;.5;0;0" keyTimes="0;.012;.035;.08;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (f(FORGE_T), f(FORGE_PH)))
# the works' windows dip while the forge draws, then recover
storm.append('<!-- the works windows dipping during the forging -->'
             '<rect x="952" y="758" width="124" height="14" fill="#1a1418" opacity="0"><animate attributeName="opacity" values="0;.8;.3;.7;0;0" keyTimes="0;.014;.03;.05;.14;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></rect>' % (f(FORGE_T), f(FORGE_PH)))
# the pair's signature, shared by the cradle and the upper collector and used by no other light: a white-hot core
# and two thin crimson rings pinging outward a quarter second apart
def ping(cx, cy, r0, r1, name):
    out = ['<!-- the entangled signature: %s -->' % name]
    out.append('<circle cx="%s" cy="%s" r="%s" fill="url(#lampRed)" opacity="0"><animate attributeName="opacity" values="0;.9;.4;0;0" keyTimes="0;.012;.06;.24;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s keySplines="0 0 1 1;.3 0 .7 1;.2 0 .5 1;0 0 1 1"/></circle>' % (f(cx), f(cy), f(r1 * .8), f(FORGE_T), f(FORGE_PH), SPLINE))
    out.append('<circle cx="%s" cy="%s" r="%s" fill="#ffffff" opacity="0" filter="url(#glow)"><animate attributeName="opacity" values="0;1;.7;0;0" keyTimes="0;.012;.05;.14;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>' % (f(cx), f(cy), f(r0 * .28), f(FORGE_T), f(FORGE_PH)))
    for k, lag in enumerate((0, .021)):
        a0 = .012 + lag
        out.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#ff5a64" stroke-width="%s" opacity="0" filter="url(#soft4)">'
                   '<animate attributeName="r" values="%s;%s;%s;%s" keyTimes="0;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                   '<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;%s;%s;%s;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>' % (
                       f(cx), f(cy), f(r0), f(max(3, r0 * .45)), f(r0), f(r0), f(r1), f(r1), f(a0), f(a0 + .07), f(FORGE_T), f(FORGE_PH),
                       f(a0 - .001), f(a0), f(a0 + .07), f(FORGE_T), f(FORGE_PH)))
    return ''.join(out)


storm.append(ping(1014, 519, 10, 50, 'the cradle, as the sprite touches it'))
storm.append(ping(1014, 150, 14, 60, 'the upper collector, at the same instant'))
storm.append(flash(700, 760, 120, 50, 'flashRed', 12, 5.64, .8, 'light inside the storm wall at the root of its bolt'))
storm.append(bolt(790, 1175, 720, 1250, 93, '#ff3a4a', '#ffd6d0', 12, 8.7, (720, 1330, 150, 44), 'flashRed', 'a bolt out of the near cloud into the near needle tip', 3.2))
storm.append(bolt(370, 1368, 500, 1394, 101, '#ff3a4a', '#ffd6d0', 12, 4.5, (430, 1380, 150, 50), 'flashRed', 'forked lightning inside the near cloud, left', 2.6, .28, 2, 10))
storm.append(bolt(1100, 1318, 1210, 1340, 103, '#ff3a4a', '#ffd6d0', 24, 10.0, (1150, 1330, 140, 46), 'flashRed', 'forked lightning inside the near cloud, right', 2.6, .28, 2, 10))
# dim flickers deep in the near cloud: lightning inside the storm, seen only as light
storm.append(flash(330, 1500, 260, 90, 'flashRed', 12, 9.5, .6, 'deep in the near cloud, beside the left crag'))
storm.append(flash(1120, 1680, 280, 90, 'flashRed', 24, 22.05, .6, 'deep in the near cloud, right'))
storm.append(bolt(1450, 350, 1486, 858, 69, '#ff3a4a', '#ffd6d0', 12, 4.92, (1486, 915, 110, 34), 'flashRed', 'the high right sprite discharging into the far right spire tip', 3.2))
# the storm's own breathing: slow swells of red light in the cloud sea
for (cx, cy, rx, ry, per, ph) in [(560, 1300, 190, 70, 6, 1.0), (1360, 1420, 200, 70, 12, 3.3), (250, 1440, 260, 80, 8, 4.9), (420, 1120, 110, 36, 8, 2.1)]:
    storm.append('<!-- the storm breathing in the cloud sea -->'
                 '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#cloudRed)" opacity=".25"><animate attributeName="opacity" values=".25;.6;.35;.5;.25" keyTimes="0;.2;.45;.7;1" dur="%ss" begin="-%ss" repeatCount="indefinite" %s%s/></ellipse>' % (
                     f(cx), f(cy), f(rx), f(ry), f(per), f(ph), SPLINE, ease(4)))

# ------------------------------------------------------------------ near layer (static): crags and the anchor pylon
near = []
nr = random.Random(5)


def crag(points_top, bottom, lit_edge, inner_color):
    poly = points_top + [(points_top[-1][0], bottom), (points_top[0][0], bottom)]
    g = lin([(0, '#221f28', 1), (.4, '#121016', 1), (1, '#050407', 1)], 0, min(p[1] for p in points_top), 0, bottom, units=True)
    s = '<polygon points="%s" fill="url(#%s)"/>' % (pts(poly), g)
    cr_ = random.Random(len(points_top))
    # the storm's light on the faces just under the edge, strongest at the edge
    g_edge = lin([(0, inner_color, .5), (1, inner_color, 0)])
    side_ = 1 if points_top[0][0] < 700 else -1
    for k_, (a_, b_) in enumerate(zip(lit_edge, lit_edge[1:])):
        d = cr_.uniform(60, 140)
        if k_ % 2:
            continue
        s += '<polygon points="%s" fill="url(#%s)" opacity="%s"/>' % (pts([a_, b_, (b_[0] + side_ * d * .5, b_[1] + d), (a_[0] + side_ * d * .4, a_[1] + d * .8)]), g_edge, f(cr_.uniform(.4, .6)))
    # a few dark planes breaking the mass
    for k in range(4):
        i = cr_.randint(1, len(lit_edge) - 3)
        a_, b_ = lit_edge[i], lit_edge[i + 2]
        if abs(a_[1] - b_[1]) < 4:
            continue  # no dark plane hanging off a level ledge: it reads as a block
        s += '<polygon points="%s" fill="#000" opacity=".35"/>' % pts([a_, b_, (b_[0] + 30, b_[1] + 160), (a_[0] - 20, a_[1] + 140)])
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="3" opacity=".6" stroke-linejoin="round"/>' % (pts(lit_edge), inner_color)
    return s


def jag(x0, y0, x1, y1, n, amp, r):
    p = []
    for i in range(n + 1):
        t = i / n
        p.append((lerp(x0, x1, t) + r.uniform(-amp, amp) * .4, lerp(y0, y1, t) + r.uniform(-amp, amp)))
    return p


left_top = [(-20, 1500)] + jag(40, 1470, 520, 1860, 12, 22, nr) + [(560, 1940)]
right_top = [(1000, 1940)] + jag(1080, 1850, 1556, 1430, 12, 24, nr)
right_top = [(x, 1484) if 1425 <= x <= 1535 else (x, y) for (x, y) in right_top]  # the pylon's ledge
near.append('<!-- near crag, left: its upper edge catches the storm light from below -->' + crag(left_top, 1940, left_top[1:-1], '#a8405a'))
near.append('<!-- near crag, right: carries the anchor pylon -->' + crag(right_top, 1940, right_top[1:], '#a8405a'))
# the anchor pylon: the lower end of the haul cable
near.append('<!-- the anchor pylon on the right crag -->'
            '<g transform="translate(80 -82)"><g stroke="#1c1a22" stroke-width="4" stroke-linecap="round" fill="none"><path d="M1362 1566 L1391 1452 M1428 1566 L1399 1452"/>'
            '<path d="M1369 1538 L1421 1538 M1376 1510 L1414 1510 M1383 1482 L1407 1482" stroke-width="2.6"/>'
            '<path d="M1369 1538 L1414 1510 L1383 1482 M1421 1538 L1376 1510 L1407 1482" stroke-width="1.8"/></g>'
            '<polygon points="1351,1566 1439,1566 1445,1580 1345,1580" fill="#15131a"/>'
            '<path d="M1362 1566 L1391 1452" stroke="#a8405a" stroke-width="1.6" opacity=".5" fill="none"/>'
            '<circle cx="1395" cy="1450" r="14" fill="url(#lampRed)" opacity=".5"/>'
            '<circle cx="1395" cy="1450" r="4" fill="#2a2632" stroke="#a8405a" stroke-width="1.2"/></g>')
# wisps of cloud drifting across the near crags, fading before they wrap
wisps = []
for (y, x0, dx, dur, ph, rx, ry) in []:  # the drifting wisps were cut in round 1: invisible at any strength that stayed subtle
    wisps.append('<ellipse cx="0" cy="0" rx="%s" ry="%s" fill="#6d5870" opacity="0" filter="url(#soft)">'
                 '<animateMotion dur="%ss" begin="-%ss" repeatCount="indefinite" path="M%s %s l %s 0"/>'
                 '<animate attributeName="opacity" values="0;.35;.35;0" keyTimes="0;.2;.8;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></ellipse>' % (
                     f(rx), f(ry), f(dur), f(ph), f(x0), f(y), f(dx), f(dur), f(ph)))

# ------------------------------------------------------------------ top layer: finish
vig = lin([(0, '#050409', .55), (.25, '#050409', 0), (.8, '#050409', 0), (1, '#050409', .6)], id='vignette')
side = lin([(0, '#050409', .5), (.15, '#050409', 0), (.85, '#050409', 0), (1, '#050409', .5)], 0, 0, 1, 0, id='sideVignette')
top = ['<rect width="%d" height="%d" fill="url(#vignette)"/>' % (W, H), '<rect width="%d" height="%d" fill="url(#sideVignette)" opacity=".5"/>' % (W, H)]


# ------------------------------------------------------------------ assemble
def layer(id_, body, role=False):
    head = '<svg class="layer" id="layer-%s" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"' % (id_, W, H)
    if role:
        head += ' role="img" aria-labelledby="scene-title scene-desc">\n  <title id="scene-title">The QED works on Zolton</title>\n  <desc id="scene-desc">A lattice mast on the summit of a metal spire reaches into a bloodstorm; crimson sprites bloom above a sea of storm cloud lit red from within, and lightning strikes the spires.</desc>\n'
    else:
        head += ' aria-hidden="true">\n'
    return head + body + '\n</svg>\n'


svg_defs = '<svg class="defs" id="layer-defs" width="0" height="0" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n<defs>\n%s\n</defs>\n</svg>\n' % (W, H, '\n'.join(defs))
piece_comment = '<!--\n' + CONCEPT + '\n\n' + PIECES.replace('--', '-') + '\n-->\n'
layers = (piece_comment + svg_defs
          + layer('sky', '<!-- ===================== SKY ===================== -->\n' + '\n'.join(sky), role=True)
          + layer('high', '<!-- ===================== SPRITES AND FAR FLASHES ===================== -->\n' + '\n'.join(high))
          + layer('land', '<!-- ===================== CLOUD SEA, SPIRES, WORKS ===================== -->\n' + '\n'.join(land))
          + layer('storm', '<!-- ===================== LIGHTNING AND THE FORGING ===================== -->\n' + '\n'.join(storm))
          + layer('near', '<!-- ===================== NEAR CRAGS ===================== -->\n' + '\n'.join(near))
          + layer('top', '<!-- ===================== DRIFTING WISPS AND FINISH ===================== -->\n' + '\n'.join(wisps) + '\n' + '\n'.join(top)))

page = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
page = page.replace('<!--LAYERS-->', layers)
io.open(os.path.join(HERE, 'source.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('ok', len(page) // 1024, 'KB')
