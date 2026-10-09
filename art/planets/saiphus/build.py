"""Saiphus as a living SVG planet, on the shared kit (art/planets/svgkit.py). Writes planet.svg and, through demo.py, demo.html.

What is drawn, from the history (packages/content/json/planets.json, Saiphus):
- the giant: "A hydrogen-helium gas giant" (p1): no ground, only cloud bands, pale zones and rose belts with sheared, curling
  edges, turning as a whole.
- the storms: "the planet is regularly afflicted with violent and relentless storms" (p3) and "the immense superstorms stirring
  beneath" (p5): storm ovals set between the bands, one great dark superstorm, lightning flickering in them ("surges of freak
  lightning", p5).
- the haze: "Sulfuric acid clouds sweep haphazardly across the sky" (p3): thin yellowish streaks blowing faster than the bands.
- the life band: "a thin life band in its upper atmosphere ... islands of floating landmass appear to hover across the sky.
  Separated by a sea of clouds and dense fog ... from little more than flying boulders to landmasses that are hundreds of miles
  across ... clusters of rolling plains carrying fruitful vegetation" (p2): one band of small green-and-brown flecks, some in
  clusters, under drifting fog, casting faint shadows, drifting slower than the haze.
- dawn: "sunrises that light the entire world and all its clouds beautiful shades of orange and pink" (p2): a warm band along
  the terminator.
- the night: "floating colonies of bright, colorful airborne algae and bioluminescent zooplankton" (p2): faint teal and violet
  glows in the life band on the dark side.
- Benthane squalls: "plumes of concentrated Benthane gas from the deeper layers ... would jettison themselves high into the sky
  as a result of enormous shifts in atmospheric pressure caused by the immense superstorms stirring beneath them" (p5): now
  and then a plume bursts up out of a storm and spreads.

Run from the repo root after textures.py: python art/planets/saiphus/build.py
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from svgkit import (C, HT, R, TILE_X, TILE_Y, WT, DISCRETE, Kit, f, facing_x, spin, stars, tiles)  # noqa: E402

KIT = Kit(HERE)
BANDS, LIFE, HAZE = 131.3, 147.9, 97.7  # seconds per turn: the cloud bands, the life band's islands and fog, the sulfur haze
SQUALL = 31.3  # the Benthane squalls' clock: three storms in turn
STORMS = [tuple(float(v) for v in ln.split()) for ln in open(os.path.join(KIT.out, 'storms.txt')) if ln.strip()]
STORM_XY = [(lo / (2 * math.pi) * WT, (la / math.pi + .5) * HT, r / math.pi * HT) for lo, la, r in STORMS]


def planet(p, width=None):
    rnd = random.Random(1630)
    small = width is not None
    d = KIT.base_defs(p, air=('#ffd8c4', '#ffc8b0', '#c890b8'), haze=('#ffe4d0', '#ffd8c0', '#ffe8d8'))
    d.append(KIT.map_image(p, 'bands', 'bands.png', 84, width, 1.15 if small else 1.0))
    d.append(KIT.map_image(p, 'sulfur', 'haze.png', 80, width))  # not 'haze': the kit's limb gradient has that id
    d.append(KIT.map_image(p, 'islands', 'islands.png', 86, width))
    d.append(KIT.map_image(p, 'islandshade', 'islandshade.png', 70, width))
    d.append(KIT.map_image(p, 'fog', 'fog.png', 78, width))
    d.append(KIT.map_image(p, 'bio', 'bio.png', 80, width, 1.4 if small else 1.0))
    d.append(KIT.map_mask(p, 'sm', 'stormmask.png', small=True))
    d.append('<radialGradient id="%s-limbdark" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#fff"/><stop offset=".9" stop-color="#d8c8d0"/><stop offset="1" stop-color="#a890a8"/></radialGradient>' % (p, f(C), f(C), f(R)))
    d.append('<radialGradient id="%s-flash"><stop offset="0" stop-color="#d8e0ff" stop-opacity=".5"/><stop offset=".4" stop-color="#b0beff" stop-opacity=".22"/><stop offset="1" stop-color="#8090ff" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-squall"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#e4fff4" stop-opacity=".95"/><stop offset=".6" stop-color="#b8eadc" stop-opacity=".55"/><stop offset="1" stop-color="#a0d8d0" stop-opacity="0"/></radialGradient>' % p)

    # lightning in the storms: bursts of two flashes, some showing a channel, on out-of-step clocks
    fl = []
    for (sx, sy, sr) in STORM_XY:
        for i in range(int(3 + sr * .25)):
            a_, r_ = rnd.uniform(0, 2 * math.pi), sr * .9 * math.sqrt(rnd.random())
            x, y = sx + math.cos(a_) * r_ * 1.6, sy + math.sin(a_) * r_
            per = rnd.uniform(1.4, 5.0)
            at = rnd.uniform(0, 1 - .25 / per)
            beg = rnd.uniform(0, per)
            kt = '0;%.4f;%.4f;%.4f;%.4f;1' % (at, at + .07 / per, at + .13 / per, at + .23 / per)
            burst = '<animate attributeName="opacity" values="0;1;0;1;0;0" keyTimes="%s" dur="%ss" begin="-%ss" repeatCount="indefinite"%s/>' % (kt, '%.3f' % per, '%.3f' % beg, DISCRETE)
            r = rnd.uniform(20, 34)
            for x0 in TILE_X:
                fl.append('<g transform="translate(%s %s)" opacity="0">%s<ellipse rx="%s" ry="%s" transform="rotate(%s)" fill="url(#%s-flash)"/></g>' % (
                    f(x0 + x), f(TILE_Y + y), burst, f(r), f(r * .8), f(rnd.uniform(0, 180)), p))
    # Benthane squalls: from three of the storms in turn, each when its storm faces the viewer, a plume bursts up, pale and
    # bright, spreads, drifts east and thins
    sq = []
    order = sorted(range(len(STORM_XY)), key=lambda i: -STORM_XY[i][2])[:3]
    for k, i in enumerate(order):
        sx, sy, sr = STORM_XY[i]
        at = (.1 + k * .33) % 1
        # nudge the clock so this storm is facing the viewer when its squall comes
        t_face = ((1.25 - (sx + .25 * R) / WT) % 1.0) * BANDS
        beg = (t_face - at * SQUALL) % SQUALL

        def anim(attr, vals, kt):
            return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" begin="-%.3fs" repeatCount="indefinite"/>' % (attr, vals, kt, SQUALL, SQUALL - beg)

        def k_(*xs):
            return ';'.join(['0'] + ['%.4f' % min(.9999, at + v / SQUALL) for v in xs] + ['1'])
        # the plume bursts out of the storm's core and spreads flat above it like an anvil, carried north and east past the storm's
        # rim; a second, smaller puff follows
        x, y = sx + sr * .2, sy
        for x0 in TILE_X:
            for (dl, sc) in ((0, 1.0), (.8, .6)):
                kk = lambda *xs: k_(*[v + dl for v in xs])
                sq.append('<ellipse cx="%s" cy="%s" rx="3" ry="2" fill="url(#%s-squall)" opacity="0">%s%s%s%s%s</ellipse>' % (
                    f(x0 + x), f(TILE_Y + y), p, anim('opacity', '0;0;1;.8;0;0', kk(0, .4, 3, 8)),
                    anim('rx', ';'.join(f(v * sc) for v in (4, 4, 22, 40, 46, 46)), kk(0, .6, 4, 8)),
                    anim('ry', ';'.join(f(v * sc) for v in (3, 3, 10, 16, 18, 18)), kk(0, .6, 4, 8)),
                    anim('cx', '%s;%s;%s;%s' % (f(x0 + x), f(x0 + x), f(x0 + x + 30), f(x0 + x + 30)), kk(0, 8)),
                    anim('cy', '%s;%s;%s;%s;%s' % (f(TILE_Y + y), f(TILE_Y + y), f(TILE_Y + y - sr * 1.0), f(TILE_Y + y - sr * 1.4), f(TILE_Y + y - sr * 1.4)), kk(0, 2, 6))))

    o = []
    o.append(KIT.air_rim(p))
    # the lit world: bands, the life band's islands with their shadows and fog, the sulfur haze
    o.append(KIT.lensed(p, spin(tiles(p, 'bands'), BANDS)
                        + '<g class="lyr-islands">%s</g>' % spin(tiles(p, 'islandshade') + tiles(p, 'islands') + tiles(p, 'fog'), LIFE)
                        + '<g class="lyr-haze">%s</g>' % spin(tiles(p, 'sulfur'), HAZE)
                        + '<g class="lyr-squall">%s</g>' % spin(''.join(sq), BANDS)))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-limbdark)" style="mix-blend-mode:multiply"/></g>' % (f(C), f(C), f(R), p))
    o.append(KIT.haze(p))
    o.append('<g class="lyr-sun"><image href="%s" x="%s" y="%s" width="%s" height="%s" clip-path="url(#%s-disc)" style="mix-blend-mode:multiply"/></g>' % (
        KIT.uri('dawnmul.png', 'png'), f(C - R), f(C - R), f(2 * R), f(2 * R), p))  # the blend on the image itself, in a group with no clip, so it is not isolated
    o.append(KIT.night(p))
    # the night's own light: the algae and plankton glowing in the life band
    d.append('<mask id="%s-deep" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600"><image href="%s" x="%s" y="%s" width="%s" height="%s"/></mask>' % (
        p, KIT.uri('deepnight.png', 'png'), f(C - R), f(C - R), f(2 * R), f(2 * R)))
    o.append('<g class="lyr-bio" style="mix-blend-mode:screen" mask="url(#%s-deep)">%s</g>' % (p, KIT.lensed(p, spin(tiles(p, 'bio'), LIFE))))
    # lightning above the night (it makes its own light), masked to the storms
    o.append(KIT.lensed(p, spin('<g mask="url(#%s-sm)">%s</g>' % (p, ''.join(fl)), BANDS), 'lyr-lightning', ' style="mix-blend-mode:screen"'))
    o.append(KIT.limb(p, rim='#ffd0c0'))
    return '<defs>%s</defs>%s' % (''.join(d), ''.join(o))


def svg(p, cls, label, with_stars=True, width=None):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p, width))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#05060c"/>%s%s</svg>' % (stars(90, 3), planet('s')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
