"""Magmuth as a living SVG planet: the textures from textures.py slid behind an orthographic lens (feDisplacementMap), lit by a
red dwarf from the upper left, with the world's own signature events on top. Writes art/planets/magmuth/planet.svg (one planet).

What is drawn, from the history (packages/content/json/planets.json, Magmuth):
- the surface: "boiling oceans of lava and molten rock pocked with obsidian islands and jagged spires of volcanic glass"
  (paragraph 1): black glass spires with a cold sheen, basalt, tar-pits, and the lowest basins melted into lava seas.
- the cracks: "the cracks in the earth glow an eerie red from the magma that seeps up from the planet's many deep and fiery
  crevasses" (paragraph 2): the fissure network glows red, on the night side and dimmer by day.
- the lava seas: "whole regions can liquify into molten seas" (paragraph 2), crusted over and churning: the crust cracks
  glow yellow-white and the molten rock beneath turns slowly under them.
- the eruptions: "Erratic volcanic eruptions create pyroclastic flows" and "Geysers erupt unexpectedly" (paragraph 3): three
  vents, each on a fissure, erupting in turn: a bright vent, a spreading glow, and a dark plume of ash rising.
- the fire: "Rivers of fire flash across the wastes with little to no warning" (paragraph 3): bright flashes along the
  fissures, and a surge of light running along them.
- the smoke: "The acrid air is thick with volcanic smoke, staining the sky crimson" and "violent ash storms thunder across the
  world" (paragraph 3): dark smoke and ash, wound into a few slow storms, with the red sun's light on their tops.
- the sun: "Magmuth orbits a red dwarf star, bringing hellish heat" (paragraph 2): the day side is red-orange, not white.

Run from the repo root after textures.py: python art/planets/magmuth/build.py
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
SPIN, CLOUD_SPIN = 131.3, 97.7  # seconds per turn: the ground, and the smoke above it (a little faster)
CHURN_DUR = 83.9  # seconds for the molten churn to cross one map
SURGE_DUR = 9.3  # seconds for a surge of fire to run one band along the fissures
MAPW = 2048  # the maps' width in pixels
PAD = 2  # wrapped columns on each side of a map
UNIT = WT / MAPW
TILE_X = [C - 1.25 * WT + i * WT for i in range(2)]  # the two copies of every map, one map apart
TILE_Y = C - HT / 2
DISCRETE = ' calcMode="discrete"'


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def f4(x):
    return '%.4f' % x


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


def images(width):
    """The pictures, at full size for the large planet or smaller for the map (a 150 px planet needs a quarter of the map)."""
    m = width or MAPW
    return {
        'surface': uri('surface.png', 'webp', 82, width, True, 1.3 if width else 1.0),
        'rivers': uri('rivers.png', 'webp', 86, width, True, 1.3 if width else 1.0),
        'seas': uri('seas.png', 'webp', 84, width, True, 1.15 if width else 1.0),
        'smoke': uri('clouds.png', 'webp', 84, width, True),
        'cloudshade': uri('cloudshade.png', 'webp', 70, None, True),
        'churn': uri('churn.png', 'webp', 70, None, True),
        'glowmask': uri('glowmask.png', 'png'),
        'daytint': uri('daytint.png', 'png'),
        'lens': uri('lens.png', 'png'),  # lossless: every step of it is a pixel of displacement
        'night': uri('night.png', 'png'),
        'nightmask': uri('nightmask.png', 'png'),
        'src_w': {'surface': m, 'rivers': m, 'seas': m, 'smoke': m, 'cloudshade': 512, 'churn': 1024},
    }


IMG_CACHE = {}
VENTS = [tuple(float(v) for v in ln.split()) for ln in open(os.path.join(OUT, 'vents.txt')).read().splitlines() if ln.strip()]
VENT_XY = [(lo / (2 * math.pi) * WT, (la / math.pi + .5) * HT) for lo, la in VENTS]
# the fissures' glow, coarse, for placing flashes on the fissures
RIV_ALPHA = np.array(Image.open(os.path.join(OUT, 'rivers.png')).split()[3].resize((512, 256), Image.BILINEAR), float) / 255


def spin(body, dur):
    """Slide something drawn in map units east one map width a turn."""
    return '<g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g>' % (body, f(WT), f(dur))


def tiles(p, sym):
    return ''.join('<use href="#%s-%s" x="%s" y="%s"/>' % (p, sym, f(x), f(TILE_Y)) for x in TILE_X)


def place(src_w, x0=0.0, y0=0.0):
    """The attributes that lay a wrapped map across one full map width, with its pad columns beyond the edges."""
    e = WT * PAD / src_w
    return ' x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none"' % (f(x0 - e), f(y0), f(WT + 2 * e), f(HT))


def envelope(at, t_rise, t_end, peak, mid=None):
    """Keytimes and values for one flash: dark, a linear rise to a peak, a fade to dark, dark until the clock comes round."""
    kt = '0;%s;%s;%s;1' % (f4(at), f4(t_rise), f4(t_end))
    return kt, '0;0;%s;0;0' % peak


def planet(p, width=None):
    """One planet, every id prefixed with p so several can share a page."""
    if width not in IMG_CACHE:
        IMG_CACHE[width] = images(width)
    IMG = IMG_CACHE[width]
    sw = IMG['src_w']
    rnd = random.Random(1601)
    d = []
    d.append('<filter id="%s-lens" filterUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s" color-interpolation-filters="sRGB">'
             '<feImage href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" result="raw"/><feGaussianBlur in="raw" stdDeviation="1" result="map"/>'
             '<feDisplacementMap in="SourceGraphic" in2="map" scale="%s" xChannelSelector="R" yChannelSelector="G"/></filter>' % (
                 p, f(C - 1.7 * R), f(C - 1.7 * R), f(3.4 * R), f(3.4 * R), IMG['lens'], f(C - R), f(C - R), f(2 * R), f(2 * R), f(SCALE)))
    d.append('<image id="%s-surface" href="%s"%s/>' % (p, IMG['surface'], place(sw['surface'])))
    d.append('<image id="%s-rivers" href="%s"%s/>' % (p, IMG['rivers'], place(sw['rivers'])))
    d.append('<image id="%s-seas" href="%s"%s/>' % (p, IMG['seas'], place(sw['seas'])))
    d.append('<image id="%s-smoke" href="%s"%s/>' % (p, IMG['smoke'], place(sw['smoke'])))
    d.append('<image id="%s-cloudshade" href="%s"%s/>' % (p, IMG['cloudshade'], place(sw['cloudshade'])))
    # the churn of the lava seas: one mask of two tiles, sliding east
    d.append('<mask id="%s-churn" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000"><g>'
             '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/>%s</g></mask>' % (
                 p, f(WT), f(CHURN_DUR), ''.join('<image href="%s"%s/>' % (IMG['churn'], place(sw['churn'], x, TILE_Y)) for x in TILE_X)))
    # the glow of the fissures is dimmer by day: the glow mask holds it at half strength in full sun
    d.append('<mask id="%s-gm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, IMG['glowmask'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    # surges of fire: bands that run east along the fissures on their own clock
    d.append('<linearGradient id="%s-band" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' % p)
    d.append('<mask id="%s-surge" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000"><g><animateTransform attributeName="transform" type="translate" values="0 0;520 0" dur="%ss" repeatCount="indefinite"/>%s</g></mask>' % (
        p, f(SURGE_DUR), ''.join('<rect x="%s" y="-1000" width="150" height="3000" fill="url(#%s-band)"/>' % (f(-4160 + 520 * k), p) for k in range(17))))
    d.append('<clipPath id="%s-disc"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (p, f(C), f(C), f(R - 1.5)))
    d.append('<mask id="%s-nightm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, IMG['nightmask'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    d.append('<radialGradient id="%s-haze" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".78" stop-color="#ff8a5a" stop-opacity="0"/>'
             '<stop offset=".97" stop-color="#ff9a6a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb08a" stop-opacity=".36"/></radialGradient>' % (p, f(C), f(C), f(R)))
    d.append('<radialGradient id="%s-air" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".9" stop-color="#ff7a4a" stop-opacity="0"/>'
             '<stop offset=".935" stop-color="#ff8a5a" stop-opacity=".5"/><stop offset=".965" stop-color="#e0502a" stop-opacity=".18"/><stop offset="1" stop-color="#e0502a" stop-opacity="0"/></radialGradient>' % (p, f(C), f(C), f(R * 1.075)))
    d.append('<linearGradient id="%s-sunside" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/></linearGradient>' % p)
    d.append('<mask id="%s-airm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="url(#%s-sunside)"/></mask>' % (p, p))
    d.append('<radialGradient id="%s-flash"><stop offset="0" stop-color="#fff4d8"/><stop offset=".3" stop-color="#ffb060" stop-opacity=".9"/><stop offset=".65" stop-color="#ff5a1a" stop-opacity=".35"/><stop offset="1" stop-color="#e8301a" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-ember"><stop offset="0" stop-color="#ffc070"/><stop offset=".35" stop-color="#ff7a20" stop-opacity=".85"/><stop offset=".7" stop-color="#d83a14" stop-opacity=".35"/><stop offset="1" stop-color="#b02a10" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-ground"><stop offset="0" stop-color="#ff6a1a" stop-opacity=".5"/><stop offset=".6" stop-color="#c83a10" stop-opacity=".18"/><stop offset="1" stop-color="#8a2008" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-plume"><stop offset="0" stop-color="#2a2020" stop-opacity=".95"/><stop offset=".6" stop-color="#3a302c" stop-opacity=".7"/><stop offset="1" stop-color="#3a302c" stop-opacity="0"/></radialGradient>' % p)

    o = []
    # the fissures' flashes: each a soft orange bloom on a fissure, on its own clock, fading in and out
    fl, rivers_fx = [], []
    n = 0
    tries = 0
    while n < 150 and tries < 60000:
        tries += 1
        x, y = rnd.uniform(0, WT), rnd.uniform(.1, .9) * HT
        u = int((x / WT) * RIV_ALPHA.shape[1]) % RIV_ALPHA.shape[1]
        v = min(RIV_ALPHA.shape[0] - 1, max(0, int((y / HT) * RIV_ALPHA.shape[0])))
        if RIV_ALPHA[v, u] < .55:
            continue
        n += 1
        per = rnd.uniform(1.6, 5.6)
        at = rnd.uniform(0, 1 - 1.2 / per)
        beg = rnd.uniform(0, per)
        kt = '0;%s;%s;%s;1' % (f4(at), f4(at + .35 / per), f4(at + 1.1 / per))
        ang = rnd.uniform(0, 180)
        bloom = '<ellipse rx="%s" ry="%s" transform="rotate(%s)" fill="url(#%s-flash)"/>' % (f(rnd.uniform(9, 16)), f(rnd.uniform(4, 7)), f(ang), p)
        for x0 in TILE_X:
            fl.append('<g transform="translate(%s %s)" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>%s</g>' % (
                f(x0 + x), f(TILE_Y + y), kt, '%.3f' % per, '%.3f' % beg, bloom))

    # the volcanoes: each vent erupts on its own clock. Its bright core and a spreading glow are drawn with the light; its dark
    # ash plume rises under the night, from the vent, drifting east.
    erupt_dark, erupt_light = [], []
    ERUPT_P = [61.3, 71.9, 53.7]
    for k, (vx, vy) in enumerate(VENT_XY):
        P = ERUPT_P[k]
        at = 0.06 + 0.21 * k
        t_rise = at + 1.6 / P
        t_mid = at + 5.0 / P
        t_end = at + 10.5 / P
        beg = (P - at * P + 3.0 * k) % P
        kt5 = '0;%s;%s;%s;1' % (f4(at), f4(t_rise), f4(t_end))
        kt_burst = '0;%s;%s;%s;1' % (f4(at), f4(at + .3 / P), f4(at + 2.2 / P))  # a short burst at the vent, fading over about two seconds
        kt_glow = '0;%s;%s;%s;1' % (f4(at), f4(at + .8 / P), f4(at + 4.5 / P))  # the glow on the ground around it
        kt6 = '0;%s;%s;%s;%s;1' % (f4(at), f4(t_rise), f4(t_mid), f4(t_end))
        plume_blobs = ''.join('<circle cx="%s" cy="%s" r="%s" fill="url(#%s-plume)"/>' % (f(dx), f(dy), f(rr), p)
                              for dx, dy, rr in ((0, -4, 8), (2, -13, 10), (5, -24, 12), (9, -35, 13), (14, -46, 14), (19, -54, 14)))
        for x0 in TILE_X:
            erupt_dark.append('<g transform="translate(%s %s)"><g opacity="0">'
                              '<animate attributeName="opacity" values="0;0;.9;.45;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                              '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;3 -4;9 -12;14 -20;14 -20" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                              '<g><animateTransform attributeName="transform" type="scale" values="0.2;0.2;1;1;1;1" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
                              '%s</g></g></g></g>' % (f(x0 + vx), f(TILE_Y + vy), kt6, '%.3f' % P, '%.3f' % beg,
                                                      kt6, '%.3f' % P, '%.3f' % beg, kt6, '%.3f' % P, '%.3f' % beg, plume_blobs))
            erupt_light.append('<g transform="translate(%s %s)">'
                               '<circle r="30" fill="url(#%s-ground)" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>'
                               '<circle r="9" fill="url(#%s-ember)" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>'
                               '</g>' % (f(x0 + vx), f(TILE_Y + vy), p, kt_glow, '%.3f' % P, '%.3f' % beg, p, kt_burst, '%.3f' % P, '%.3f' % beg))

    # the air seen edge on: a thin lit rim on the sun's side
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-air)" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R * 1.075), p, p))
    # the lit world: the ground, its cloudshade, and the smoke turning above it. Each part in its own group, so the page's
    # switches can show any of them alone.
    o.append('<g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s'
             '<g class="lyr-eruption">%s</g>'
             '<g class="lyr-clouds">%s%s</g>'
             '</g></g>' % (
                 p, p,
                 spin(tiles(p, 'surface'), SPIN),
                 spin(''.join(erupt_dark), SPIN),
                 spin(tiles(p, 'cloudshade'), CLOUD_SPIN),
                 spin(tiles(p, 'smoke'), CLOUD_SPIN)))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-haze)"/></g>' % (f(C), f(C), f(R), p))
    # the red dwarf's light on the day side, and the night falling over the right
    o.append('<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s"/><image href="%s" x="%s" y="%s" width="%s" height="%s"/></g>' % (
        IMG['daytint'], f(C - R), f(C - R), f(2 * R), f(2 * R), IMG['night'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    # the glow, which makes its own light: it goes above the night, with screen blending. Fissures (rivers) with their surge,
    # lava seas, fire flashes and eruptions, each in its own group.
    surge = '<g mask="url(#%s-surge)">%s</g>' % (p, tiles(p, 'rivers'))
    glow = ('<g class="lyr-rivers" mask="url(#%s-gm)"><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g></g>'
            % (p, p, p, spin(tiles(p, 'rivers') + surge, SPIN)))
    seas = ('<g class="lyr-seas" mask="url(#%s-churn)"><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g></g>'
            % (p, p, p, spin(tiles(p, 'seas'), SPIN)))
    flash = ('<g class="lyr-flash"><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g></g>'
             % (p, p, spin(''.join(fl), SPIN)))
    erupt = ('<g class="lyr-eruption"><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g></g>'
             % (p, p, spin(''.join(erupt_light), SPIN)))
    o.append('<g style="mix-blend-mode:screen">%s%s%s%s</g>' % (glow, seas, flash, erupt))
    # the limb: a dark hairline under the air's rim hides the lens's last stair-steps at the edge
    o.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#0a0303" stroke-width="2.2" mask="url(#%s-nightm)"/>' % (f(C), f(C), f(R - .6), p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="none" stroke="#ffa07a" stroke-width="1.6" opacity=".55" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R - .2), p))
    return '<defs>%s</defs>%s' % (''.join(d), ''.join(o))


def stars(n, seed):
    r = random.Random(seed)
    o = []
    for i in range(n):
        x, y = r.uniform(0, 600), r.uniform(0, 600)
        if (x - C) ** 2 + (y - C) ** 2 < (R * 1.1) ** 2:
            continue
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#f4e6dc" opacity="%s"/>' % (f(x), f(y), f(r.uniform(.3, 1.1)), f(r.uniform(.2, .8))))
    return ''.join(o)


def svg(p, cls, label, with_stars=True, width=None):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p, width))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#0a0506"/>%s%s</svg>' % (stars(90, 3), planet('m')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
