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

from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, 'out')
R, C = 240.0, 300.0  # the planet's radius and center in a 600 by 600 box
WT, HT = 2 * math.pi * R, math.pi * R  # the flat maps at one map unit per radian of radius
SCALE = float(open(os.path.join(OUT, 'lens.txt')).read()) * R
SPIN, CLOUD_SPIN = 61.3, 41.7  # seconds per turn: the ground, and the storm above it (faster)


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def uri(name, fmt, q=None):
    im = Image.open(os.path.join(OUT, name))
    b = io.BytesIO()
    if fmt == 'webp':
        im.save(b, 'WEBP', quality=q or 86, method=6) if q else im.save(b, 'WEBP', lossless=True, method=6)
        mime = 'image/webp'
    else:
        im.save(b, 'PNG', optimize=True)
        mime = 'image/png'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(b.getvalue()).decode())


IMG = {
    'surface': uri('surface.png', 'webp', 84),
    'electric': uri('electric.png', 'webp', 90),
    'clouds': uri('clouds.png', 'webp', 86),
    'cloudshade': uri('cloudshade.png', 'webp', 70),
    'lens': uri('lens.png', 'png'),  # lossless: every step of it is a pixel of displacement
    'night': uri('night.png', 'png'),
    'nightmask': uri('nightmask.png', 'png'),
}


def strip(img, dur, p):
    """A map sliding east behind the lens: two copies one map apart (the picture defined once), moved one map width a turn."""
    y = C - HT / 2
    tiles = ''.join('<use href="#%s-%s" x="%s" y="%s"/>' % (p, img, f(C - 1.25 * WT + i * WT), f(y)) for i in range(2))
    return '<g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g>' % (
        tiles, f(WT), f(dur))


def planet(p):
    """One planet, every id prefixed with p so several can share a page."""
    rnd = random.Random(26)
    d = []
    d.append('<filter id="%s-lens" filterUnits="userSpaceOnUse" x="%s" y="%s" width="%s" height="%s" color-interpolation-filters="sRGB">'
             '<feImage href="%s" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="none" result="map"/>'
             '<feDisplacementMap in="SourceGraphic" in2="map" scale="%s" xChannelSelector="R" yChannelSelector="G"/></filter>' % (
                 p, f(C - 1.7 * R), f(C - 1.7 * R), f(3.4 * R), f(3.4 * R), IMG['lens'], f(C - R), f(C - R), f(2 * R), f(2 * R), f(SCALE)))
    for k in ('surface', 'clouds', 'electric', 'cloudshade'):
        d.append('<image id="%s-%s" href="%s" width="%s" height="%s" preserveAspectRatio="none"/>' % (p, k, IMG[k], f(WT), f(HT)))
    d.append('<clipPath id="%s-disc"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (p, f(C), f(C), f(R - .4)))
    d.append('<mask id="%s-nightm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, IMG['nightmask'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    d.append('<radialGradient id="%s-haze" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".78" stop-color="#9fb8ff" stop-opacity="0"/>'
             '<stop offset=".97" stop-color="#a9c0ff" stop-opacity=".26"/><stop offset="1" stop-color="#c8d8ff" stop-opacity=".42"/></radialGradient>' % (p, f(C), f(C), f(R)))
    d.append('<radialGradient id="%s-air" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".9" stop-color="#7d9cff" stop-opacity="0"/>'
             '<stop offset=".935" stop-color="#8fb0ff" stop-opacity=".55"/><stop offset=".965" stop-color="#6a7cff" stop-opacity=".18"/><stop offset="1" stop-color="#6a7cff" stop-opacity="0"/></radialGradient>' % (p, f(C), f(C), f(R * 1.075)))
    d.append('<linearGradient id="%s-sunside" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff"/><stop offset=".75" stop-color="#fff" stop-opacity=".12"/></linearGradient>' % p)
    d.append('<mask id="%s-airm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><rect width="600" height="600" fill="url(#%s-sunside)"/></mask>' % (p, p))
    d.append('<radialGradient id="%s-flash"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#d8f2ff" stop-opacity=".85"/><stop offset=".6" stop-color="#5ab8ff" stop-opacity=".3"/><stop offset="1" stop-color="#3a7cff" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-blood"><stop offset="0" stop-color="#ffd0d8"/><stop offset=".2" stop-color="#ff3a5a" stop-opacity=".95"/><stop offset=".6" stop-color="#c0102e" stop-opacity=".45"/><stop offset="1" stop-color="#8a0020" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-bloodcell"><stop offset="0" stop-color="#a0283c" stop-opacity=".9"/><stop offset=".55" stop-color="#b04050" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-void"><stop offset="0" stop-color="#05000a"/><stop offset=".35" stop-color="#2a0a44" stop-opacity=".9"/><stop offset=".7" stop-color="#b48aff" stop-opacity=".5"/><stop offset="1" stop-color="#b48aff" stop-opacity="0"/></radialGradient>' % p)
    d.append('<filter id="%s-soft" x="-50%%" y="-50%%" width="200%%" height="200%%"><feGaussianBlur stdDeviation="1.2"/></filter>' % p)

    o = []
    # the air seen edge on: a thin lit rim on the sun's side
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-air)" mask="url(#%s-airm)"/></g>' % (f(C), f(C), f(R * 1.075), p, p))
    # the lit world: ground and storm through the lens
    o.append('<g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s<g class="lyr-clouds">%s</g></g></g>' % (p, p, strip('surface', SPIN, p), strip('clouds', CLOUD_SPIN, p)))
    # the bloodstorm cell: a patch of storm stained dark red, rotating with the clouds (drawn in the cloud map's place, so it
    # rides the same lens)
    o.append('<g class="lyr-blood" style="mix-blend-mode:multiply" clip-path="url(#%s-disc)"><g filter="url(#%s-lens)"><g><circle cx="%s" cy="%s" r="%s" fill="url(#%s-bloodcell)"/><circle cx="%s" cy="%s" r="%s" fill="url(#%s-bloodcell)"/>'
             '<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g></g></g>' % (
                 p, p, f(C - .35 * WT), f(C + .12 * R), f(.34 * R), p, f(C + .65 * WT), f(C + .12 * R), f(.34 * R), p, f(WT), f(CLOUD_SPIN)))
    o.append('<g class="lyr-haze"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-haze)"/></g>' % (f(C), f(C), f(R), p))
    # the sun: night falls over the lower right
    o.append('<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></g>' % (IMG['night'], f(C - R), f(C - R), f(2 * R), f(2 * R)))
    # the night side's own light: rivers of current in the canyons, dimmed where the storm is thick
    o.append('<g class="lyr-current" style="mix-blend-mode:screen" mask="url(#%s-nightm)"><g clip-path="url(#%s-disc)"><g filter="url(#%s-lens)">%s%s</g></g></g>' % (
        p, p, p, strip('electric', SPIN, p), '<g class="lyr-clouds">%s</g>' % strip('cloudshade', CLOUD_SPIN, p)))

    # lightning in the storm: flickers everywhere, a few forked strikes on the night side
    fl = []
    for i in range(44):
        while True:
            x, y = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
            if x * x + y * y < .9 and (x > -.05 or rnd.random() < .3):
                break
        night = x > .2
        r = rnd.uniform(10, 26) * (1.2 if night else .75)
        per = rnd.uniform(1.7, 6.3)
        at = rnd.uniform(0, .9)
        w = rnd.uniform(.012, .03)
        vals = '0;0;1;.25;.9;.1;0;0'
        kt = '0;' + ';'.join('%.4f' % (at + w * k) for k in (0, .12, .3, .5, .7, 1)) + ';1'
        beg = '%.3f' % rnd.uniform(0, per)
        px, py = C + x * R, C + y * R
        fl.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%s-flash)" opacity="0"><animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="discrete"/></circle>' % (
            f(px), f(py), f(r), p, vals if night else '0;0;.7;.15;.6;.05;0;0', kt, '%.3f' % per, beg))
        if night and rnd.random() < .55:
            pts = [(px, py)]
            ang = rnd.uniform(0, 2 * math.pi)
            for k in range(4):
                ang += rnd.uniform(-.9, .9)
                pts.append((pts[-1][0] + math.cos(ang) * rnd.uniform(3, 6), pts[-1][1] + math.sin(ang) * rnd.uniform(3, 6)))
            fl.append('<path d="M%s" stroke="#f4fcff" stroke-width=".9" fill="none" stroke-linejoin="bevel" opacity="0" filter="url(#%s-soft)"><animate attributeName="opacity" values="%s" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="discrete"/></path>' % (
                ' L'.join('%s %s' % (f(a), f(b)) for a, b in pts), p, '0;0;1;0;1;0;0;0', kt, '%.3f' % per, beg))
    o.append('<g class="lyr-lightning" style="mix-blend-mode:screen" clip-path="url(#%s-disc)">%s</g>' % (p, ''.join(fl)))

    # bloodstorm sprites: crimson ball-lightning dancing above the stained cell, each a glowing ball trailing jellyfish
    # tendrils. They ride the storm (same lens, same turn), so they come round with the cell and foreshorten at the limb, and
    # they make their own light, so the night does not hide them.
    sp = []
    cx0, cy0 = C - .35 * WT, C + .12 * R
    for i in range(10):
        a_, r_ = rnd.uniform(0, 2 * math.pi), .3 * R * math.sqrt(rnd.random())
        x, y = cx0 + math.cos(a_) * r_, cy0 + math.sin(a_) * r_ * .7
        s = rnd.uniform(1.5, 2.3)
        tend = ''.join('<path d="M%s 2 Q%s 7 %s 12" stroke="#ff4a66" stroke-width=".7" fill="none" opacity=".85"/>' % (f(dx), f(dx + rnd.uniform(-2, 2)), f(dx * 1.4)) for dx in (-2.4, -.8, .8, 2.4))
        body = '<circle r="7" fill="url(#%s-blood)"/><circle r="2.2" fill="#ffd8de"/>%s' % (p, tend)
        per = rnd.uniform(2.3, 4.9)
        at = rnd.uniform(0, .75)
        kt = '0;%.4f;%.4f;%.4f;%.4f;%.4f;1' % (at, at + .02, at + .08, at + .12, at + .2)
        beg = '%.3f' % rnd.uniform(0, per)
        one = ('<g opacity="0"><animate attributeName="opacity" values="0;0;1;.5;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"/>'
               '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;%s %s;%s %s" keyTimes="0;%.4f;%.4f;1" dur="%ss" begin="-%ss" repeatCount="indefinite"/>%s</g>' % (
                   kt, '%.3f' % per, beg, f(rnd.uniform(-5, 5)), f(rnd.uniform(-7, -3)), f(rnd.uniform(-5, 5)), f(rnd.uniform(-7, -3)), at, at + .2, '%.3f' % per, beg, body))
        for k in (0, 1):
            sp.append('<g transform="translate(%s %s) scale(%s)">%s</g>' % (f(x + k * WT), f(y), f(s), one))
    # the bloodstorm's own lightning: dark red flashes inside the cell
    for i in range(6):
        a_, r_ = rnd.uniform(0, 2 * math.pi), .28 * R * math.sqrt(rnd.random())
        x, y = cx0 + math.cos(a_) * r_, cy0 + math.sin(a_) * r_ * .7
        per, at = rnd.uniform(1.9, 4.1), rnd.uniform(0, .8)
        beg = '%.3f' % rnd.uniform(0, per)
        for k in (0, 1):
            sp.insert(0, '<circle cx="%s" cy="%s" r="%s" fill="url(#%s-blood)" opacity="0"><animate attributeName="opacity" values="0;0;.9;.2;.7;0;0" keyTimes="0;%.4f;%.4f;%.4f;%.4f;%.4f;1" dur="%ss" begin="-%ss" repeatCount="indefinite" calcMode="discrete"/></circle>' % (
                f(x + k * WT), f(y), f(rnd.uniform(14, 24)), p, at, at + .01, at + .025, at + .04, at + .06, '%.3f' % per, beg))
    o.append('<g class="lyr-blood" style="mix-blend-mode:screen" clip-path="url(#%s-disc)"><g filter="url(#%s-lens)"><g>%s<animateTransform attributeName="transform" type="translate" values="0 0;%s 0" dur="%ss" repeatCount="indefinite"/></g></g></g>' % (
        p, p, ''.join(sp), f(WT), f(CLOUD_SPIN)))

    # black lightning: rarely, a violet-black flash on the ground and the neutron burst's ring spreading from it
    bx, by = C - .18 * R, C + .38 * R
    BP = 12.7
    o.append('<g class="lyr-black" clip-path="url(#%s-disc)">'
             '<circle cx="%s" cy="%s" r="16" fill="url(#%s-void)" opacity="0"><animate attributeName="opacity" values="0;0;1;.8;0;0" keyTimes="0;.40;.405;.43;.5;1" dur="%ss" begin="-3.1s" repeatCount="indefinite"/>'
             '<animate attributeName="r" values="6;6;16;22;22" keyTimes="0;.40;.41;.5;1" dur="%ss" begin="-3.1s" repeatCount="indefinite"/></circle>'
             '<circle cx="%s" cy="%s" r="6" fill="none" stroke="#c9a6ff" stroke-width="1.6" opacity="0"><animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;.405;.42;.55;1" dur="%ss" begin="-3.1s" repeatCount="indefinite"/>'
             '<animate attributeName="r" values="6;6;58;58" keyTimes="0;.405;.55;1" dur="%ss" begin="-3.1s" repeatCount="indefinite"/></circle>'
             '<circle cx="%s" cy="%s" r="2.2" fill="#f0e6ff" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.40;.401;.415;1" dur="%ss" begin="-3.1s" repeatCount="indefinite" calcMode="discrete"/></circle></g>' % (
                 p, f(bx), f(by), p, BP, BP, f(bx), f(by), BP, BP, f(bx), f(by), BP))
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


def svg(p, cls, label, with_stars=True):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#05060c"/>%s%s</svg>' % (stars(90, 3), planet('z')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
