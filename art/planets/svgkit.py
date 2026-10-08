"""Shared SVG parts of the living planets, from Zolton (the approved first planet): the lens filter, map tiles sliding behind it,
the disc clip, night mask, air rim and haze, flicker timing, stars and the page player. A world's build.py makes a Kit for its
out/ folder and draws its own layers with it.
"""
import base64
import io
import math
import os
import random

from PIL import Image, ImageEnhance

R, C = 240.0, 300.0  # the planet's radius and center in a 600 by 600 box
WT, HT = 2 * math.pi * R, math.pi * R  # the flat maps at one map unit per radian of radius
MAPW = 2048
TILE_X = [C - 1.25 * WT + i * WT for i in range(2)]  # the two copies of every map, one map apart
TILE_Y = C - HT / 2
PAD = 2  # wrapped columns on each side of a map
DISCRETE = ' calcMode="discrete"'


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def spin(body, dur):
    """Slide something drawn in map units east one map width a turn."""
    return '<g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g>' % (body, f(WT), f(dur))


def flick(vals, per, at, w, beg, discrete=True):
    """An opacity flicker inside a window of its clock, its begin set so the clocks never line up."""
    kt = '0;' + ';'.join('%.4f' % (at + w * k) for k in (0, .12, .3, .5, .7, 1)) + ';1'
    return '<animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>' % (
        vals, kt, '%.3f' % per, '%.3f' % beg, DISCRETE if discrete else '')


def facing_x(t, dur, lead=.25):
    """Where in a map turning once per `dur` seconds the point facing the viewer (a little toward the sun) sits at time t."""
    return ((1.25 - t / dur) % 1.0) * WT - lead * R


def stars(n, seed):
    r = random.Random(seed)
    o = []
    for i in range(n):
        x, y = r.uniform(0, 600), r.uniform(0, 600)
        if (x - C) ** 2 + (y - C) ** 2 < (R * 1.1) ** 2:
            continue
        o.append('<circle cx="%s" cy="%s" r="%s" fill="#dfe6ff" opacity="%s"/>' % (f(x), f(y), f(r.uniform(.3, 1.1)), f(r.uniform(.2, .8))))
    return ''.join(o)


class Kit:
    def __init__(self, here):
        self.out = os.path.join(here, 'out')
        self.scale = float(open(os.path.join(self.out, 'lens.txt')).read()) * R
        self.cache = {}

    def uri(self, name, fmt='webp', q=None, width=None, wrap=False, punch=1.0):
        key = (name, fmt, q, width, wrap, punch)
        if key in self.cache:
            return self.cache[key]
        im = Image.open(os.path.join(self.out, name))
        if width and im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        if punch != 1.0:
            if im.mode == 'RGB':
                im = ImageEnhance.Contrast(im).enhance(punch)
            else:
                r_, g_, b_, a_ = im.split()
                im = Image.merge('RGBA', (r_, g_, b_, a_.point(lambda v: min(255, int(v * punch)))))
        if wrap:
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
        self.cache[key] = 'data:%s;base64,%s' % (mime, base64.b64encode(b.getvalue()).decode())
        return self.cache[key]

    def map_image(self, p, sym, name, q=84, width=None, punch=1.0, small=False):
        """A full map as a symbol (drawn once, used twice): `small` maps are 512 wide whatever the planet's size."""
        w_ = 512 if small else (width or MAPW)
        e = WT * PAD / w_
        href = self.uri(name, 'webp', q, None if small else width, True, punch)
        # the wrapped columns keep the image's edges from smoothing to transparent, but the two copies must not overlap (a
        # translucent glow drawn twice there shows as a bright stripe), so each copy is clipped to its own map width
        return ('<clipPath id="%s-%s-clip"><rect x="0" y="-1" width="%s" height="%s"/></clipPath>' % (p, sym, f(WT), f(HT + 2))
                + '<g id="%s-%s" clip-path="url(#%s-%s-clip)"><image href="%s" x="%s" y="0" width="%s" height="%s" preserveAspectRatio="none"/></g>' % (
                    p, sym, p, sym, href, f(-e), f(WT + 2 * e), f(HT)))

    def map_mask(self, p, mid, name, width=None, small=False):
        """A map as a mask in map units, both copies."""
        w_ = 512 if small else (width or MAPW)
        e = WT * PAD / w_
        href = self.uri(name, 'webp', 75, None if small else width, True)
        return '<mask id="%s-%s" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000">%s</mask>' % (
            p, mid, ''.join('<image href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none"/>' % (href, f(x - e), f(TILE_Y), f(WT + 2 * e), f(HT)) for x in TILE_X))

    def base_defs(self, p, air=('#7d9cff', '#8fb0ff', '#6a7cff'), haze=('#9fb8ff', '#a9c0ff', '#c8d8ff')):
        d = []
        d.append('<filter id="%s-lens" filterUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s" color-interpolation-filters="sRGB">'
                 '<feImage href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" result="raw"/><feGaussianBlur in="raw" stdDeviation="1" result="map"/>'
                 '<feDisplacementMap in="SourceGraphic" in2="map" scale="%s" xChannelSelector="R" yChannelSelector="G"/></filter>' % (
                     p, f(C - 1.7 * R), f(C - 1.7 * R), f(3.4 * R), f(3.4 * R), self.uri('lens.png', 'png'), f(C - R), f(C - R), f(2 * R), f(2 * R), f(self.scale)))
        d.append('<clipPath id="%s-disc"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (p, f(C), f(C), f(R - 1.5)))
        d.append('<mask id="%s-nightm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
            p, self.uri('nightmask.png', 'png'), f(C - R), f(C - R), f(2 * R), f(2 * R)))
        d.append('<radialGradient id="%s-haze" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".78" stop-color="%s" stop-opacity="0"/>'
                 '<stop offset=".97" stop-color="%s" stop-opacity=".26"/><stop offset="1" stop-color="%s" stop-opacity=".42"/></radialGradient>' % (p, f(C), f(C), f(R), haze[0], haze[1], haze[2]))
        d.append('<radialGradient id="%s-air" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".9" stop-color="%s" stop-opacity="0"/>'
                 '<stop offset=".935" stop-color="%s" stop-opacity=".55"/><stop offset=".965" stop-color="%s" stop-opacity=".18"/><stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>' % (
                     p, f(C), f(C), f(R * 1.075), air[0], air[1], air[2], air[2]))
        d.append('<linearGradient id="%s-sunside" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/></linearGradient>' % p)
        d.append('<mask id="%s-airm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="url(#%s-sunside)"/></mask>' % (p, p))
        d.append('<filter id="%s-soft" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="1.6"/></filter>' % p)
        return d

    def lensed(self, p, body, cls='', extra=''):
        """A layer drawn in map units, bent onto the sphere and clipped to the disc."""
        return '<g%s%s clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s</g></g>' % (' class="%s"' % cls if cls else '', extra, p, p, body)

    def air_rim(self, p):
        return '<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-air)" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R * 1.075), p, p)

    def haze(self, p):
        return '<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-haze)"/></g>' % (f(C), f(C), f(R), p)

    def night(self, p):
        return '<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></g>' % (self.uri('night.png', 'png'), f(C - R), f(C - R), f(2 * R), f(2 * R))

    def limb(self, p, rim='#9ab4ff'):
        return ('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#05060d" stroke-width="2.2" mask="url(#%s-nightm)"/>' % (f(C), f(C), f(R - .6), p)
                + '<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="1.6" opacity=".55" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R - .2), rim, p))


def tiles(p, sym):
    return ''.join('<use href="#%s-%s" x="%s" y="%s"/>' % (p, sym, f(x), f(TILE_Y)) for x in TILE_X)


def surge_mask(p, period=6.1, gap=520, width=150):
    """Soft bright bands every `gap` units, running east `gap` units every `period` seconds (on top of whatever turn they ride)."""
    return ('<linearGradient id="%s-band" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' % p
            + '<mask id="%s-surge" maskUnits="userSpaceOnUse" x="-4000" y="-1000" width="8000" height="3000"><g><animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/>%s</g></mask>' % (
                p, f(gap), period, ''.join('<rect x="%s" y="-1000" width="%s" height="3000" fill="url(#%s-band)"/>' % (f(-4160 + gap * k), f(width), p) for k in range(int(8400 / gap)))))
