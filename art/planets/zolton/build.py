"""Zolton as a living SVG planet: the textures from textures.py slid behind an orthographic lens (feDisplacementMap), lit by
a fixed sun, with the storm's weather on top. Writes art/planets/zolton/planet.svg (one planet) and demo.html (the review page).

What is drawn, from the history (packages/content/json/planets.json, Zolton):
- the surface: "a mountainous world comprised of deep canyons saturated with dense, freezing gases and craggy spires whose
  metallic peaks act as natural lightning rods" (paragraph 2): steel-gray crags, bare metal on the peaks, frosted canyon floors.
- the rivers of current: strikes dissipate "into the planet's network of canyons, forming visible rivers of electricity that
  surged like wire currents over the crust" (paragraph 4): the canyon network glows blue-white, seen on the night side.
- the storm: "approximately 2.5 billion bolts per day" (paragraph 1): banded storm cloud wound into cyclones, turning faster
  than the ground, and lightning flickering inside it everywhere, brightest in the dark.
- bloodstorms: "crimson-lit ball-lightning that danced like electrical jellyfish above the clouds" (paragraph 7): one storm
  cell tinted dark red, with crimson sprites dancing over it.
- black lightning: "so intense that it generated low-yield nuclear fusion, generating a fatal neutron burst" (paragraph 5):
  rarely, a violet-black flash with a ring spreading from it.

Run from the repo root after textures.py: python art/planets/zolton/build.py
"""
import base64
import io
import math
import os
import random

from PIL import Image, ImageEnhance
import numpy as np

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, 'out')
R, C = 240.0, 300.0  # the planet's radius and center in a 600 by 600 box
WT, HT = 2 * math.pi * R, math.pi * R  # the flat maps at one map unit per radian of radius
SCALE = float(open(os.path.join(OUT, 'lens.txt')).read()) * R
SPIN, CLOUD_SPIN = 120.7, 105.3  # seconds per turn: the ground, and the storm above it (a little faster)


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def uri(name, fmt, q=None, width=None, wrap=False, punch=1.0):
    im = Image.open(os.path.join(OUT, name))
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if punch != 1.0:  # small planets: more contrast (or more glow) so the world survives the shrink
        if im.mode == 'RGB':
            im = ImageEnhance.Contrast(im).enhance(punch)
        else:
            r_, g_, b_, a_ = im.split()
            im = Image.merge('RGBA', (r_, g_, b_, a_.point(lambda v: min(255, int(v * punch)))))
    if wrap:  # one column from the far side on each edge, so two copies laid end to end meet without a seam
        w_, h_ = im.size
        padded = Image.new(im.mode, (w_ + 2 * PAD, h_))
        padded.paste(im, (PAD, 0))
        padded.paste(im.crop((w_ - PAD, 0, w_, h_)), (0, 0))
        padded.paste(im.crop((0, 0, PAD, h_)), (w_ + PAD, 0))
        im = padded
    b = io.BytesIO()
    if fmt == 'webp':
        im.save(b, 'WEBP', quality=q or 86, method=6) if q else im.save(b, 'WEBP', lossless=True, method=6)
        mime = 'image/webp'
    else:
        im.save(b, 'PNG', optimize=True)
        mime = 'image/png'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(b.getvalue()).decode())


PAD = 2  # wrapped columns on each side of a map


def images(width):
    """The pictures, at full size for the large planet or smaller for the map (a 150 px planet needs a quarter of the map)."""
    return {
        'surface': uri('surface.png', 'webp', 82, width, True, 1.3 if width else 1.0),
        'electric': uri('electric.png', 'webp', 86, width, True, 1.3 if width else 1.0),
        'clouds': uri('clouds.png', 'webp', 84, width, True),
        'cloudshade': uri('cloudshade.png', 'webp', 70, None, True),
        'cloudmask': uri('cloudmask.png', 'webp', 70, None, True),
        'bloodmask': uri('bloodmask.png', 'webp', 75, None, True),
        'lens': uri('lens.png', 'png'),  # lossless: every step of it is a pixel of displacement
        'night': uri('night.png', 'png'),
        'nightmask': uri('nightmask.png', 'png'),
    }


IMG_CACHE = {}
BLOODS = [tuple(float(v) for v in ln.split()) for ln in open(os.path.join(OUT, 'blood.txt')).read().splitlines() if ln.strip()]
MAPW = 2048  # the maps' width in pixels
UNIT = WT / MAPW  # plate units per map pixel
TILE_X = [C - 1.25 * WT + i * WT for i in range(2)]  # the two copies of every map, one map apart
TILE_Y = C - HT / 2
# each bloodstorm's eye and radius, in the map's own units
B_CELLS = [(lo / (2 * math.pi) * WT, (la / math.pi + .5) * HT, r / math.pi * HT) for lo, la, r in BLOODS]
DISCRETE = ' calcMode="discrete"'
# the storm's thickness, coarse, for placing flashes and strikes inside cloud
CLOUD_ALPHA = np.array(Image.open(os.path.join(OUT, 'clouds.png')).split()[3].resize((512, 256), Image.BILINEAR), float) / 255


def spin(body, dur):
    """Slide something drawn in map units east one map width a turn."""
    return '<g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g>' % (body, f(WT), f(dur))


def tiles(p, sym):
    return ''.join('<use href="#%s-%s" x="%s" y="%s"/>' % (p, sym, f(x), f(TILE_Y)) for x in TILE_X)


def flick(vals, per, at, w, beg):
    """An opacity flicker inside a window of its clock, its begin set so the clocks never line up."""
    kt = '0;' + ';'.join('%.4f' % (at + w * k) for k in (0, .12, .3, .5, .7, 1)) + ';1'
    return '<animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>' % (
        vals, kt, '%.3f' % per, '%.3f' % beg, DISCRETE)


def planet(p, width=None):
    """One planet, every id prefixed with p so several can share a page."""
    if width not in IMG_CACHE:
        IMG_CACHE[width] = images(width)
    IMG = IMG_CACHE[width]
    rnd = random.Random(26)
    d = []
    d.append('<filter id="%s-lens" filterUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s" color-interpolation-filters="sRGB">'
             '<feImage href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" result="raw"/><feGaussianBlur in="raw" stdDeviation="1" result="map"/>'
             '<feDisplacementMap in="SourceGraphic" in2="map" scale="%s" xChannelSelector="R" yChannelSelector="G"/></filter>' % (
                 p, f(C - 1.7 * R), f(C - 1.7 * R), f(3.4 * R), f(3.4 * R), IMG['lens'], f(C - R), f(C - R), f(2 * R), f(2 * R), f(SCALE)))
    def full_at(name, x=0.0):
        w_ = {'cloudshade': 512, 'cloudmask': 512}.get(name, width or MAPW)
        e = WT * PAD / w_
        return ' x="%s" y="0" width="%s" height="%s" preserveAspectRatio="none"' % (f(x - e), f(WT + 2 * e), f(HT)) if x == 0.0 else             ' x="%s" width="%s" height="%s" preserveAspectRatio="none"' % (f(x - e), f(WT + 2 * e), f(HT))
    d.append('<image id="%s-surface" href="%s"%s/>' % (p, IMG['surface'], full_at('surface')))
    d.append('<image id="%s-electric" href="%s"%s/>' % (p, IMG['electric'], full_at('electric')))
    d.append('<image id="%s-cloudshade" href="%s"%s/>' % (p, IMG['cloudshade'], full_at('cloudshade')))
    # one tile of storm (the bloodstorms are part of it)
    d.append('<image id="%s-storm" href="%s"%s/>' % (p, IMG['clouds'], full_at('clouds')))
    # where a flash inside the storm lights it up: the storm's thickness, as a mask in map units (both tiles)
    d.append('<mask id="%s-cm" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000">%s</mask>' % (
        p, ''.join('<image href="%s" y="%s"%s/>' % (IMG['cloudmask'], f(TILE_Y), full_at('cloudmask', x)) for x in TILE_X)))
    d.append('<mask id="%s-bm" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000">%s</mask>' % (
        p, ''.join('<image href="%s" y="%s"%s/>' % (IMG['bloodmask'], f(TILE_Y), full_at('cloudmask', x)) for x in TILE_X)))
    # surges: soft bright bands every 520 units, running east 520 units every 6.1 s on top of the ground's turn
    d.append('<linearGradient id="%s-band" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' % p)
    d.append('<mask id="%s-surge" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000"><g><animateTransform attributeName="transform" type="translate" values="0 0;520 0" dur="6.1s" repeatCount="indefinite"/>%s</g></mask>' % (
        p, ''.join('<rect x="%s" y="-1000" width="150" height="3000" fill="url(#%s-band)"/>' % (f(-4160 + 520 * k), p) for k in range(17))))
    d.append('<linearGradient id="%s-sprite" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a90"/><stop offset=".5" stop-color="#e02a48" stop-opacity=".7"/><stop offset="1" stop-color="#a0102a" stop-opacity="0"/></linearGradient>' % p)
    d.append('<clipPath id="%s-disc"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (p, f(C), f(C), f(R - 1.5)))
    d.append('<mask id="%s-nightm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, IMG['nightmask'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    d.append('<radialGradient id="%s-haze" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".78" stop-color="#9fb8ff" stop-opacity="0"/>'
             '<stop offset=".97" stop-color="#a9c0ff" stop-opacity=".26"/><stop offset="1" stop-color="#c8d8ff" stop-opacity=".42"/></radialGradient>' % (p, f(C), f(C), f(R)))
    d.append('<radialGradient id="%s-air" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".9" stop-color="#7d9cff" stop-opacity="0"/>'
             '<stop offset=".935" stop-color="#8fb0ff" stop-opacity=".55"/><stop offset=".965" stop-color="#6a7cff" stop-opacity=".18"/><stop offset="1" stop-color="#6a7cff" stop-opacity="0"/></radialGradient>' % (p, f(C), f(C), f(R * 1.075)))
    d.append('<linearGradient id="%s-sunside" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/></linearGradient>' % p)
    d.append('<mask id="%s-airm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="url(#%s-sunside)"/></mask>' % (p, p))
    d.append('<radialGradient id="%s-flash"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#d8f0ff" stop-opacity=".9"/><stop offset=".65" stop-color="#7ac4ff" stop-opacity=".35"/><stop offset="1" stop-color="#3a7cff" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-redsoft"><stop offset="0" stop-color="#d83050" stop-opacity=".45"/><stop offset=".5" stop-color="#a01830" stop-opacity=".3"/><stop offset="1" stop-color="#7a0020" stop-opacity="0"/></radialGradient>' % p)
    d.append('<filter id="%s-blur1" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="1"/></filter>' % p)
    d.append('<radialGradient id="%s-red"><stop offset="0" stop-color="#ffd0d8"/><stop offset=".25" stop-color="#ff3a5a" stop-opacity=".95"/><stop offset=".65" stop-color="#b0102c" stop-opacity=".4"/><stop offset="1" stop-color="#8a0020" stop-opacity="0"/></radialGradient>' % p)
    d.append('<filter id="%s-soft" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="1.6"/></filter>' % p)
    d.append('<radialGradient id="%s-void"><stop offset="0" stop-color="#05000a"/><stop offset=".35" stop-color="#2a0a44" stop-opacity=".9"/><stop offset=".7" stop-color="#b48aff" stop-opacity=".5"/><stop offset="1" stop-color="#b48aff" stop-opacity="0"/></radialGradient>' % p)

    o = []
    # where thick cloud is, for placing flashes and strikes inside the storm
    cloud_a = CLOUD_ALPHA
    def in_cloud(x, y, need):
        u = int((x / WT) * cloud_a.shape[1]) % cloud_a.shape[1]
        v = min(cloud_a.shape[0] - 1, max(0, int((y / HT) * cloud_a.shape[0])))
        return cloud_a[v, u] >= need

    def jag(x, y, ang, ln, n, spread, rr):
        pts = [(x, y)]
        for s in range(n):
            ang += rr.uniform(-spread, spread)
            step = ln / n * rr.uniform(.7, 1.3)
            x, y = x + math.cos(ang) * step, y + math.sin(ang) * step
            pts.append((x, y))
        return 'M' + ' L'.join('%s %s' % (f(a_), f(b_)) for a_, b_ in pts)

    # black lightning: about every 12.7 s, somewhere new in the storm (three sites in turn, each with its own fork). A near-black
    # bolt forks down through the cloud with a violet sheath; a hard white flash lights the cloud around it for a frame or two;
    # a soft violet glow, the neutron burst, spreads and fades. The dark bolt is drawn with the lit storm (so it can be dark);
    # its light is drawn with the storm's light.
    BP = 38.1
    br = random.Random(606)
    dark, glow_ = [], []
    sites = []
    for i in range(3):
        # where the storm faces the viewer when this strike comes: a little toward the sun from the disc's middle
        ts = 1.98 + 12.7 * i
        xc = ((1.25 - ts / CLOUD_SPIN) % 1.0) * WT - .25 * R
        for _ in range(4000):
            x, y = (xc + br.uniform(-.2, .2) * R) % WT, br.uniform(.32, .68) * HT
            if in_cloud(x, y, .6):
                break
        sites.append((x, y))
    for i, (x, y) in enumerate(sites):
        segs = []  # (x0, y0, x1, y1, width): the bolt drawn as tapering segments, each branch leaving from a point on its parent

        def branch(x0, y0, ang, ln, w0, depth):
            n_ = br.randint(4, 6)
            pts = [(x0, y0)]
            for s in range(n_):
                ang += br.uniform(-.7, .7)
                step = ln / n_ * br.uniform(.7, 1.3)
                pts.append((pts[-1][0] + math.cos(ang) * step, pts[-1][1] + math.sin(ang) * step))
            for s in range(n_):
                w = w0 * (1 - s / n_) + .5 * (s / n_)
                segs.append((pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], w))
                if depth < 2 and 0 < s < n_ - 1 and br.random() < .3:
                    branch(pts[s + 1][0], pts[s + 1][1], ang + br.choice((-1, 1)) * br.uniform(.5, 1.1), ln * .5, w * .7, depth + 1)

        for k in range(br.randint(3, 4)):
            branch(x, y, br.uniform(0, 2 * math.pi), br.uniform(40, 52), 1.8, 0)
        sheath = ''.join('<path d="M%s %s L%s %s" stroke="#8a5cff" stroke-width="%s"/>' % (f(a0), f(b0), f(a1), f(b1), f(w * 2.8)) for a0, b0, a1, b1, w in segs)
        core = ''.join('<path d="M%s %s L%s %s" stroke="#1a0826" stroke-width="%s"/>' % (f(a0), f(b0), f(a1), f(b1), f(w)) for a0, b0, a1, b1, w in segs)
        beg = (BP - 1.98 - i * 12.7) % BP  # the first strikes at t 1.98 s, then every 12.7 s at the next site
        # on 100 ms, off 50 ms, on 50 ms: a strike, not a drawing
        anim_on = '<animate attributeName="opacity" values="0;1;0;1;0;0" keyTimes="0;.0001;.0027;.004;.0053;1" dur="%ss" begin="-%.3fs" repeatCount="indefinite"%s/>' % (BP, beg, DISCRETE)
        for x0 in TILE_X:
            dark.append('<g opacity="0" transform="translate(%s %s)" stroke-linecap="round">%s<g opacity=".6" filter="url(#%s-soft)">%s</g>%s</g>' % (
                f(x0), f(TILE_Y), anim_on, p, sheath, core))
            glow_.append('<circle cx="%s" cy="%s" r="26" fill="url(#%s-flash)" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.0001;.0027;.004;1" dur="%ss" begin="-%.3fs" repeatCount="indefinite"%s/></circle>'
                         '<circle cx="%s" cy="%s" r="10" fill="url(#%s-void)" opacity="0"><animate attributeName="opacity" values="0;0;.85;0;0" keyTimes="0;.0001;.004;.035;1" dur="%ss" begin="-%.3fs" repeatCount="indefinite"/>'
                         '<animate attributeName="r" values="10;10;30;30" keyTimes="0;.0001;.035;1" dur="%ss" begin="-%.3fs" repeatCount="indefinite"/></circle>' % (
                             f(x0 + x), f(TILE_Y + y), p, BP, beg, DISCRETE, f(x0 + x), f(TILE_Y + y), p, BP, beg, BP, beg))

    # the air seen edge on: a thin lit rim on the sun's side
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-air)" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R * 1.075), p, p))
    # the lit world: ground, and the storm (bloodstorm laid in, black lightning's dark bolts in it) turning slower above it
    o.append('<g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s<g class="lyr-clouds">%s</g></g></g>' % (
        p, p, spin(tiles(p, 'surface'), SPIN), spin(tiles(p, 'storm') + '<g class="lyr-black">%s</g>' % ''.join(dark), CLOUD_SPIN)))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-haze)"/></g>' % (f(C), f(C), f(R), p))
    # the sun: night falls over the right
    o.append('<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></g>' % (IMG['night'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    # the night side's own light: rivers of current in the canyons, dimmed where the storm is thick, with surges travelling
    # across the network (a brighter copy seen through soft bands that run east faster than the ground turns)
    surge = '<g mask="url(#%s-surge)">%s</g>' % (p, tiles(p, 'electric'))
    o.append('<g class="lyr-current" style="mix-blend-mode:screen" mask="url(#%s-nightm)"><animate attributeName="opacity" values=".85;1;.9;.97;.82;.95;.85" keyTimes="0;.12;.3;.47;.66;.83;1" dur="7.31s" repeatCount="indefinite"/><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s<g class="lyr-clouds">%s</g></g></g></g>' % (
        p, p, p, spin(tiles(p, 'electric') + surge, SPIN), spin(tiles(p, 'cloudshade'), CLOUD_SPIN)))

    # the storm's light, in map units so it rides the storm through the lens. Lightning: each strike a burst of two or three
    # flashes (on, off, on) lighting the cloud around it, the brightest showing its channel; the bloodstorm's red lightning lights
    # soft patches of it; crimson sprites flicker above it in small clusters; black lightning's flash and burst.
    fl, red, sp = [], [], []
    n = 0
    while n < 200:
        x, y = rnd.uniform(0, WT), rnd.uniform(.1, .9) * HT
        if not in_cloud(x, y, .5):
            continue
        n += 1
        per = rnd.uniform(1.4, 5.2)
        at = rnd.uniform(0, 1 - .25 / per)
        beg, r = rnd.uniform(0, per), rnd.uniform(18, 26)
        a1, a2, a3 = at + .07 / per, at + .13 / per, at + .23 / per
        kt = '0;%.4f;%.4f;%.4f;%.4f;1' % (at, a1, a2, a3)
        burst = '<animate attributeName="opacity" values="0;1;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>' % (kt, '%.3f' % per, '%.3f' % beg, DISCRETE)
        chan = ''
        if rnd.random() < .5:
            ang0 = rnd.uniform(0, 2 * math.pi)
            sx0, sy0 = -math.cos(ang0) * 12, -math.sin(ang0) * 12
            forks = [jag(sx0, sy0, ang0, rnd.uniform(20, 30), 6, .8, rnd)]
            for k in range(rnd.randint(2, 3)):
                fk = rnd.uniform(.3, .7)
                forks.append(jag(sx0 + math.cos(ang0) * 25 * fk, sy0 + math.sin(ang0) * 25 * fk, ang0 + rnd.choice((-1, 1)) * rnd.uniform(.5, 1), rnd.uniform(7, 12), 3, .8, rnd))
            chan = '<path d="%s" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linejoin="bevel" stroke-linecap="round"/>' % ' '.join(forks)
        halo = '<ellipse rx="%s" ry="%s" transform="rotate(%s)" fill="url(#%s-flash)"/><circle r="4" fill="#ffffff" opacity=".85"/>' % (f(r), f(r / 2), f(rnd.uniform(0, 180)), p)
        for x0 in TILE_X:
            fl.append('<g transform="translate(%s %s)" opacity="0">%s%s%s</g>' % (f(x0 + x), f(TILE_Y + y), burst, halo, chan))
    for (bx0, by0, brr) in B_CELLS:
        for i in range(int(22 * brr / B_CELLS[0][2])):
            a_, r_ = rnd.uniform(0, 2 * math.pi), .8 * brr * math.sqrt(rnd.random())
            x, y = bx0 + math.cos(a_) * r_, by0 + math.sin(a_) * r_
            per = rnd.uniform(1.2, 3.4)
            at = rnd.uniform(0, 1 - .3 / per)
            beg = rnd.uniform(0, per)
            kt = '0;%.4f;%.4f;%.4f;%.4f;1' % (at, at + .07 / per, at + .13 / per, at + .23 / per)
            blobs = ''.join('<circle cx="%s" cy="%s" r="%s" fill="url(#%s-redsoft)"/>' % (f(rnd.uniform(-7, 7)), f(rnd.uniform(-5, 5)), f(rnd.uniform(6, 10)), p) for _ in range(rnd.randint(2, 3)))
            for x0 in TILE_X:
                red.append('<g transform="translate(%s %s)" opacity="0"><animate attributeName="opacity" values="0;1;.2;.7;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>%s</g>' % (
                    f(x0 + x), f(TILE_Y + y), kt, '%.3f' % per, '%.3f' % beg, DISCRETE, blobs))
        # sprites: clusters of two or three tapered streaks of hanging crimson tendrils, fading from top to bottom
        for i in range(int(7 * brr / B_CELLS[0][2]) + 1):
            a_, r_ = rnd.uniform(0, 2 * math.pi), .6 * brr * math.sqrt(rnd.random())
            cx_, cy_ = bx0 + math.cos(a_) * r_, by0 + math.sin(a_) * r_
            per = rnd.uniform(2.1, 4.8)
            at = rnd.uniform(0, 1 - .25 / per)
            beg = rnd.uniform(0, per)
            dur_ = rnd.uniform(.12, .2)
            kt = '0;%.4f;%.4f;%.4f;1' % (at, at + .3 * dur_ / per, at + dur_ / per)
            show = '<animate attributeName="opacity" values="0;1;.6;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>' % (kt, '%.3f' % per, '%.3f' % beg)
            for j in range(rnd.randint(2, 3)):
                sx_, sy_ = cx_ + rnd.uniform(-7, 7), cy_ + rnd.uniform(-5, 5)
                h_ = rnd.uniform(18, 24)
                tend = '<g opacity=".7" filter="url(#%s-blur1)">%s</g>' % (p, ''.join('<path d="M%s 0 Q%s %s %s %s" stroke="url(#%s-sprite)" stroke-width="1.6" fill="none" stroke-linecap="round"/>' % (
                    f(dx), f(dx + rnd.uniform(-1.2, 1.2)), f(h_ * .5), f(dx * 1.8), f(h_), p) for dx in (-1.2, 0, 1.2)))
                for x0 in TILE_X:
                    sp.append('<g transform="translate(%s %s)" opacity="0">%s%s</g>' % (f(x0 + sx_), f(TILE_Y + sy_ - h_ * .4), show, tend))
    light = ('<g class="lyr-lightning" mask="url(#%s-cm)">%s</g>' % (p, ''.join(fl))
             + '<g class="lyr-blood"><g mask="url(#%s-bm)">%s</g>%s</g>' % (p, ''.join(red), ''.join(sp))
             + '<g class="lyr-black" mask="url(#%s-cm)">%s</g>' % (p, ''.join(glow_)))
    o.append('<g style="mix-blend-mode:screen" clip-path="url(#%s-disc)"><g filter="url(#%s-lens)"><g class="lyr-clouds">%s</g></g></g>' % (
        p, p, spin(light, CLOUD_SPIN)))
    # the limb: a dark hairline under the air's rim hides the lens's last stair-steps at the edge
    o.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#05060d" stroke-width="2.2" mask="url(#%s-nightm)"/>' % (f(C), f(C), f(R - .6), p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="none" stroke="#9ab4ff" stroke-width="1.6" opacity=".55" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R - .2), p))
    return '<defs>%s</defs>%s' % (''.join(d), ''.join(o))


def stars(n, seed):
    r = random.Random(seed)
    o = []
    for i in range(n):
        x, y = r.uniform(0, 600), r.uniform(0, 600)
        if (x - C) ** 2 + (y - C) ** 2 < (R * 1.1) ** 2:
            continue
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#dfe6ff" opacity="%s"/>' % (f(x), f(y), f(r.uniform(.3, 1.1)), f(r.uniform(.2, .8))))
    return ''.join(o)


def svg(p, cls, label, with_stars=True, width=None):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p, width))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#05060c"/>%s%s</svg>' % (stars(90, 3), planet('z')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
