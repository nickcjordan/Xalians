"""Saiphus as a living SVG planet: a gas giant's banded atmosphere slid behind an orthographic lens (feDisplacementMap), lit by a
fixed sun, with the floating islands, the sulfuric cloud and its storm, and the lightning on top. Writes art/planets/saiphus/planet.svg
(one planet) and demo.html (the review page). Textures come from textures.py.

What is drawn, from the history (packages/content/json/planets.json, Saiphus):
- the atmosphere: "A hydrogen-helium gas giant" (paragraph 1). No solid surface: banded zones and belts that slide at their own
  speeds, with eddies where they shear. Zones are pale, belts ochre-brown.
- the life band: "a thin life band in its upper atmosphere" (paragraph 2). Its floating islands are "little more than flying
  boulders" to "hundreds of miles across", so they are small flecks of dark-green and brown land in one band, drifting slowly
  against it, with cloud between: "Separated by a sea of clouds and dense fog" (paragraph 2).
- the sulfuric cloud: "Sulfuric acid clouds sweep haphazardly across the sky" (paragraph 3). Yellowish cloud, thickest over the
  life band, sweeping on its own clock.
- the storm: "the planet is regularly afflicted with violent and relentless storms" (paragraph 3). One cyclone sits in a shear
  zone, where a band turns; it flares now and then, and lightning flickers inside it ("likely swatted out of the sky by surges
  of freak lightning", paragraph 5).
- lightning in the cloud deck: the storms are lit from inside; flashes show only in thick cloud.
- the air's rim: "sunrises that light the entire world and all its clouds beautiful shades of orange and pink" (paragraph 2).

Run from the repo root after textures.py: python art/planets/saiphus/build.py
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
# seconds per turn, each layer on its own clock: the zones and belts shear (belts faster than zones), the islands drift slower
# than the band they sit in, the cloud deck (storm, lightning) turns on its own
BELT_SPIN, ZONE_SPIN, CLOUD_SPIN, ISLAND_SPIN = 74.3, 96.1, 61.7, 139.9
FLARE_DUR = 37.3  # the storm's flare: one swell every 37.3 s
FLARE_PEAK = 52.0  # the swell peaks when the storm is on the sunlit face (about 52 s into the turn of the cloud)
PAD = 2  # wrapped columns on each side of a map
MAPW = 2048  # the large planet's maps are 2048 wide; the map-size planets use 1024


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def uri(name, fmt, q=None, width=None, wrap=False, punch=1.0):
    im = Image.open(os.path.join(OUT, name))
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if punch != 1.0:  # small planets: more contrast (or more opacity) so the world survives the shrink
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
        im.save(b, 'WEBP', quality=q or 86, method=6)
        mime = 'image/webp'
    else:
        im.save(b, 'PNG', optimize=True)
        mime = 'image/png'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(b.getvalue()).decode())


def images(width):
    """The pictures, at full size for the large planet or at 1024 for the map (a 150 px planet needs a quarter of the map)."""
    small = bool(width)
    return {
        'belts': uri('belts.png', 'webp', 84, width, True, 1.2 if small else 1.0),
        'zones': uri('zones.png', 'webp', 84, width, True, 1.2 if small else 1.0),
        'islands': uri('islands-s.png' if small else 'islands.png', 'webp', 90, None, True, 1.5 if small else 1.0),
        'cplain': uri('clouds-plain.png', 'webp', 84, width, True),
        'cstorm': uri('clouds-storm.png', 'webp', 84, width, True),
        'cloudmask': uri('cloudmask.png', 'webp', 70, None, True),
        'lens': uri('lens.png', 'png'),  # lossless: every step of it is a pixel of displacement
        'night': uri('night.png', 'png'),
        'nightmask': uri('nightmask.png', 'png'),
    }


IMG_CACHE = {}
MAP_STORM = [float(v) for v in open(os.path.join(OUT, 'storm.txt')).read().split()]  # the storm: lon, lat, radius (radians)
MAP_LIFE = [float(v) for v in open(os.path.join(OUT, 'life.txt')).read().split()]
# the storm's center and radius in the map's own units
ST_X, ST_Y, ST_R = MAP_STORM[0] / (2 * math.pi) * WT, (MAP_STORM[1] / math.pi + .5) * HT, MAP_STORM[2] * R
TILE_X = [C - 1.25 * WT + i * WT for i in range(2)]  # the two copies of every map, one map apart
TILE_Y = C - HT / 2
CLOUD_ALPHA = np.array(Image.open(os.path.join(OUT, 'clouds.png')).split()[3].resize((512, 256), Image.BILINEAR), float) / 255
DISCRETE = ' calcMode="discrete"'


def in_cloud(x, y, need):
    u = int((x / WT) * CLOUD_ALPHA.shape[1]) % CLOUD_ALPHA.shape[1]
    v = min(CLOUD_ALPHA.shape[0] - 1, max(0, int((y / HT) * CLOUD_ALPHA.shape[0])))
    return CLOUD_ALPHA[v, u] >= need


def spin(body, dur):
    """Slide something drawn in map units east one map width a turn."""
    return '<g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g>' % (body, f(WT), f(dur))


def tiles(p, sym):
    return ''.join('<use href="#%s-%s" x="%s" y="%s"/>' % (p, sym, f(x), f(TILE_Y)) for x in TILE_X)


def planet(p, width=None):
    """One planet, every id prefixed with p so several can share a page."""
    if width not in IMG_CACHE:
        IMG_CACHE[width] = images(width)
    IMG = IMG_CACHE[width]
    rnd = random.Random(26)
    map_w = width or MAPW

    def box(name, x=0.0, y=None):
        """An image laid over one map width, with its PAD columns of wrap on each side."""
        w_ = 512 if name == 'cloudmask' else map_w
        e = WT * PAD / w_
        ys = '' if y is None else ' y="%s"' % f(y)
        return '%s x="%s" width="%s" height="%s" preserveAspectRatio="none"' % (ys, f(x - e), f(WT + 2 * e), f(HT))

    d = []
    d.append('<filter id="%s-lens" filterUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s" color-interpolation-filters="sRGB">'
             '<feImage href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" result="raw"/><feGaussianBlur in="raw" stdDeviation="1" result="map"/>'
             '<feDisplacementMap in="SourceGraphic" in2="map" scale="%s" xChannelSelector="R" yChannelSelector="G"/></filter>' % (
                 p, f(C - 1.7 * R), f(C - 1.7 * R), f(3.4 * R), f(3.4 * R), IMG['lens'], f(C - R), f(C - R), f(2 * R), f(2 * R), f(SCALE)))
    for sym, key in (('belts', 'belts'), ('zones', 'zones'), ('islands', 'islands'), ('cplain', 'cplain'), ('cstorm', 'cstorm')):
        d.append('<image id="%s-%s" href="%s"%s/>' % (p, sym, IMG[key], box(key, 0.0, 0)))
    # one mask per cloud picture, for where a flash or a flare may light the cloud (both tiles)
    d.append('<mask id="%s-cm" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000">%s</mask>' % (
        p, ''.join('<image href="%s"%s/>' % (IMG['cloudmask'], box('cloudmask', x, TILE_Y)) for x in TILE_X)))
    d.append('<clipPath id="%s-disc"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (p, f(C), f(C), f(R - 1.5)))
    d.append('<mask id="%s-nightm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, IMG['nightmask'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    d.append('<radialGradient id="%s-haze" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".78" stop-color="#ffb27a" stop-opacity="0"/>'
             '<stop offset=".97" stop-color="#ffa070" stop-opacity=".22"/><stop offset="1" stop-color="#ffc08a" stop-opacity=".36"/></radialGradient>' % (p, f(C), f(C), f(R)))
    # the thick atmosphere's glowing rim: a broad band just outside the disc, lit on the sunny side
    d.append('<radialGradient id="%s-air" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".84" stop-color="#ffb27a" stop-opacity="0"/>'
             '<stop offset=".93" stop-color="#ffb27a" stop-opacity=".4"/><stop offset=".97" stop-color="#ff8a5a" stop-opacity=".18"/><stop offset="1" stop-color="#ff8a5a" stop-opacity="0"/></radialGradient>' % (p, f(C), f(C), f(R * 1.07)))
    # limb darkening: the disc darkens and hazes toward its edge on the day side
    d.append('<radialGradient id="%s-limb" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#1a0c04" stop-opacity="0"/>'
             '<stop offset=".85" stop-color="#1a0c04" stop-opacity=".22"/><stop offset="1" stop-color="#1a0c04" stop-opacity=".55"/></radialGradient>' % (p, f(C), f(C), f(R)))
    d.append('<linearGradient id="%s-sunside" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/></linearGradient>' % p)
    d.append('<mask id="%s-airm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="url(#%s-sunside)"/></mask>' % (p, p))
    d.append('<radialGradient id="%s-flash"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#fff6cc" stop-opacity=".9"/><stop offset=".65" stop-color="#ffd468" stop-opacity=".35"/><stop offset="1" stop-color="#ffb030" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-glow"><stop offset="0" stop-color="#fff6d0" stop-opacity=".8"/><stop offset=".45" stop-color="#ffe27a" stop-opacity=".38"/><stop offset="1" stop-color="#ffc84a" stop-opacity="0"/></radialGradient>' % p)
    d.append('<filter id="%s-blur1" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="1"/></filter>' % p)

    o = []
    # the bands: the belts over the whole sphere, the zones laid over them with their own alpha; each on its own clock
    o.append('<g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">'
             '<g class="lyr-bands">%s%s</g>'
             '<g class="lyr-islands">%s</g>'
             '<g class="lyr-clouds">%s</g>'
             '<g class="lyr-storm">%s</g></g></g>' % (
                 p, p,
                 spin(tiles(p, 'belts'), BELT_SPIN), spin(tiles(p, 'zones'), ZONE_SPIN),
                 spin(tiles(p, 'islands'), ISLAND_SPIN),
                 spin(tiles(p, 'cplain'), CLOUD_SPIN),
                 spin(tiles(p, 'cstorm'), CLOUD_SPIN)))
    o.append('<g class="lyr-limb"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-limb)"/></g>' % (f(C), f(C), f(R - 1.5), p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-haze)"/></g>' % (f(C), f(C), f(R), p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-air)" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R * 1.07), p, p))
    # the sun: night falls over the right
    o.append('<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></g>' % (IMG['night'], f(C - R), f(C - R), f(2 * R), f(2 * R)))

    # the storm's own light, in map units so it rides the storm through the lens: the flare (a swell of the storm's glow, masked
    # to its cloud) and the lightning inside cloud, each on its own clock; both drawn above the night so they show in the dark
    fl, glow, sp = [], [], []
    def jag(x, y, ang, ln, n, spread):
        pts = [(x, y)]
        for s in range(n):
            ang += rnd.uniform(-spread, spread)
            step = ln / n * rnd.uniform(.7, 1.3)
            x, y = x + math.cos(ang) * step, y + math.sin(ang) * step
            pts.append((x, y))
        return 'M' + ' L'.join('%s %s' % (f(a_), f(b_)) for a_, b_ in pts)

    def flash(x, y, per, at, beg, r, chan_p):
        """One strike: a burst of two or three flashes (on, off, on), a halo and sometimes a jagged channel."""
        a1, a2, a3 = at + .07 / per, at + .13 / per, at + .23 / per
        kt = '0;%.4f;%.4f;%.4f;%.4f;1' % (at, a1, a2, a3)
        burst = '<animate attributeName="opacity" values="0;1;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>' % (
            kt, '%.3f' % per, '%.3f' % beg, DISCRETE)
        chan = ''
        if rnd.random() < chan_p:
            ang0 = rnd.uniform(0, 2 * math.pi)
            sx0, sy0 = -math.cos(ang0) * 12, -math.sin(ang0) * 12
            forks = [jag(sx0, sy0, ang0, rnd.uniform(20, 30), 6, .8)]
            for k in range(rnd.randint(2, 3)):
                fk = rnd.uniform(.3, .7)
                forks.append(jag(sx0 + math.cos(ang0) * 25 * fk, sy0 + math.sin(ang0) * 25 * fk, ang0 + rnd.choice((-1, 1)) * rnd.uniform(.5, 1), rnd.uniform(7, 12), 3, .8))
            chan = '<path d="%s" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linejoin="bevel" stroke-linecap="round"/>' % ' '.join(forks)
        halo = '<ellipse rx="%s" ry="%s" transform="rotate(%s)" fill="url(#%s-flash)"/><circle r="4" fill="#ffffff" opacity=".85"/>' % (
            f(r), f(r / 2), f(rnd.uniform(0, 180)), p)
        return burst, halo, chan

    # general lightning: strikes placed only inside cloud, on out-of-step clocks
    n = 0
    while n < 130:
        x, y = rnd.uniform(0, WT), rnd.uniform(.1, .9) * HT
        if not in_cloud(x, y, .5):
            continue
        n += 1
        per = rnd.uniform(1.4, 5.2)
        at = rnd.uniform(0, 1 - .25 / per)
        beg, r = rnd.uniform(0, per), rnd.uniform(18, 26)
        burst, halo, chan = flash(x, y, per, at, beg, r, .5)
        for x0 in TILE_X:
            fl.append('<g transform="translate(%s %s)" opacity="0">%s%s%s</g>' % (f(x0 + x), f(TILE_Y + y), burst, halo, chan))
    # the storm's lightning: more and quicker, inside the storm's disc and only where its cloud is thick
    sites = 0
    while sites < 36:
        a_, r_ = rnd.uniform(0, 2 * math.pi), ST_R * .85 * math.sqrt(rnd.random())
        x, y = ST_X + math.cos(a_) * r_, ST_Y + math.sin(a_) * r_
        if not in_cloud(x % WT, y, .5):
            continue
        sites += 1
        per = rnd.uniform(1.2, 3.4)
        at = rnd.uniform(0, 1 - .3 / per)
        beg, r = rnd.uniform(0, per), rnd.uniform(16, 22)
        burst, halo, chan = flash(x, y, per, at, beg, r, .6)
        for x0 in TILE_X:
            fl.append('<g transform="translate(%s %s)" opacity="0">%s%s%s</g>' % (f(x0 + x), f(TILE_Y + y), burst, halo, chan))
    # the flare: the storm's glow swells on its own clock, rising in about three seconds and fading over about ten
    for x0 in TILE_X:
        glow.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%s-glow)" opacity="0"><animate attributeName="opacity" values="0;.55;1;.4;0;0" '
                    'keyTimes="0;.08;.12;.3;.5;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/></circle>' % (
                        f(x0 + ST_X), f(TILE_Y + ST_Y), f(ST_R * 1.3), p, '%.3f' % FLARE_DUR, '%.3f' % ((.12 * FLARE_DUR - FLARE_PEAK) % FLARE_DUR)))
    light = ('<g class="lyr-flare" mask="url(#%s-cm)">%s</g>' % (p, ''.join(glow)) +
             '<g class="lyr-lightning" mask="url(#%s-cm)">%s</g>' % (p, ''.join(fl)))
    o.append('<g style="mix-blend-mode:screen" clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g>' % (
        p, p, spin(light, CLOUD_SPIN)))
    # the limb: a dark hairline under the air's rim hides the lens's last stair-steps at the edge
    o.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#0b0710" stroke-width="2.2" mask="url(#%s-nightm)"/>' % (f(C), f(C), f(R - .6), p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="none" stroke="#ffb27a" stroke-width="1.6" opacity=".55" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R - .2), p))
    return '<defs>%s</defs>%s' % (''.join(d), ''.join(o))


def stars(n, seed):
    r = random.Random(seed)
    o = []
    for i in range(n):
        x, y = r.uniform(0, 600), r.uniform(0, 600)
        if (x - C) ** 2 + (y - C) ** 2 < (R * 1.1) ** 2:
            continue
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#f4ecdf" opacity="%s"/>' % (f(x), f(y), f(r.uniform(.3, 1.1)), f(r.uniform(.2, .8))))
    return ''.join(o)


def svg(p, cls, label, with_stars=True, width=None):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p, width))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#0a0810"/>%s%s</svg>' % (stars(90, 3), planet('s')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
