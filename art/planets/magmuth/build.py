"""Magmuth as a living SVG planet, on the shared kit (art/planets/svgkit.py). Writes planet.svg and, through demo.py, demo.html.

What is drawn, from the history (packages/content/json/planets.json, Magmuth):
- the seas: "boiling oceans of lava and molten rock pocked with obsidian islands and jagged spires of volcanic glass" (p1):
  about two fifths of the world molten, under a crust broken into plates that part in bright seams and break up at the shores.
- the islands: "hot desiccated barrens consisting of hardened lava flows ... obsidian and basalt filled with fields of ash"
  (p2); "Almost everything on Magmuth is covered in a thick layer of ash" (p2): near-black basalt under grey ash, glass glinting.
- the fissures: "the cracks in the earth glow an eerie red from the magma that seeps up" (p2), and "Rivers of fire flash
  across the wastes with little to no warning" (p3): a crack network on the land that glows, with surges running along it.
- the sun: "Magmuth orbits a red dwarf star" (p2): a dim, red-orange daylight.
- the air: "thick with volcanic smoke, staining the sky crimson" (p3), "violent ash storms" (p3): dark streaky smoke and ash
  sheared by the wind, a crimson rim of air.
- eruptions: "Erratic volcanic eruptions" (p3), "Geysers erupt unexpectedly, causing it to rain bouts of flame and molten rock"
  (p3): now and then a vent bursts, lights the ground, throws embers and sends up a dark plume that spreads and drifts.

Run from the repo root after textures.py: python art/planets/magmuth/build.py
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from svgkit import (C, HT, R, TILE_X, TILE_Y, WT, Kit, f, facing_x, spin, stars, surge_mask, tiles)  # noqa: E402

KIT = Kit(HERE)
SPIN, SMOKE_SPIN = 118.3, 96.1  # seconds per turn: the ground, and the smoke and ash blowing over it
LAND = np.array(Image.open(os.path.join(KIT.out, 'landmask.png')), float) / 255
ERUPT = 37.7  # the eruptions' shared clock: four vents fire on it in turn
VOLCANOES = [(float(a) / (2 * math.pi) * WT, (float(b) / math.pi + .5) * HT) for a, b, _ in (ln.split() for ln in open(os.path.join(KIT.out, 'volcanoes.txt')) if ln.strip())]


def on_land(x, y):
    u = int((x / WT) * LAND.shape[1]) % LAND.shape[1]
    v = min(LAND.shape[0] - 1, max(0, int((y / HT) * LAND.shape[0])))
    return LAND[v, u] > .9


def eruption(p, x, y, at, rnd, s=1.0, dur=1.0):
    """One vent bursting at clock fraction `at`: a white-hot flash, the ground lit orange and fading, embers thrown out, and a
    dark plume of ash rising (seen from above: a spreading disc) that drifts east and thins."""
    a = '%.4f' % at

    def k(*xs):
        return ';'.join(['0'] + ['%.4f' % min(.9999, at + v * dur / ERUPT) for v in xs] + ['1'])

    def anim(attr, vals, kt):
        return '<animate attributeName="%s" values="%s" keyTimes="%s" dur="%ss" repeatCount="indefinite"/>' % (attr, vals, kt, ERUPT)
    o = []
    o.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%s-ground)" opacity="0">%s</circle>' % (f(x), f(y), f(46 * s), p, anim('opacity', '0;0;1;.7;0;0', k(0, .25, 1.4, 4.2))))
    o.append('<circle cx="%s" cy="%s" r="5" fill="url(#%s-burst)" opacity="0">%s%s</circle>' % (
        f(x), f(y), p, anim('opacity', '0;0;1;.8;0;0', k(0, .1, .45, 1.1)), anim('r', '%s;%s;%s;%s;%s;%s' % tuple(f(v * s) for v in (3, 3, 22, 14, 7, 3)), k(0, .15, .6, 1.1))))
    for i in range(32):
        ang = rnd.uniform(0, 2 * math.pi)
        dist = rnd.uniform(8, 50) * s
        dl = rnd.uniform(0, .6)
        tx, ty = x + math.cos(ang) * dist, y + math.sin(ang) * dist * .8
        o.append('<g opacity="0">%s<animateTransform attributeName="transform" type="translate" values="%s %s;%s %s;%s %s;%s %s" keyTimes="%s" dur="%ss" repeatCount="indefinite"/>'
                 '<ellipse rx="%s" ry="%s" transform="rotate(%s)" fill="url(#%s-ember)"/></g>' % (
                     anim('opacity', '0;0;1;0;0', k(.02 + dl, .1 + dl, .9 + dl * 1.4)),
                     f(x), f(y), f(x), f(y), f(tx), f(ty), f(tx), f(ty), k(.02 + dl, .9 + dl * 1.4), ERUPT,
                     f(rnd.uniform(1.8, 5.4) * .5), f(rnd.uniform(.6, 1.8) * .5), f(math.degrees(ang)), p))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s-pillar)" opacity="0">%s</ellipse>' % (f(x), f(y - 7 * s), f(1.5 * s), f(7 * s), p, anim('opacity', '0;0;1;.8;0;0', k(0, .1, 1.1, 1.5))))
    # the plume: opaque ash, its shadow cast on the ground below and to the right, its underside lit orange at first
    rx, ry = (4, 4, 22, 42, 56, 56), (3, 3, 16, 30, 40, 40)
    def plume_el(dx, dy, fill, ops):
        return '<ellipse cx="%s" cy="%s" rx="4" ry="3" fill="%s" opacity="0">%s%s%s%s</ellipse>' % (
            f(x + dx), f(y + dy), fill, anim('opacity', ops, k(.2, 1.2, 4, 9)), anim('rx', '%s;%s;%s;%s;%s;%s' % tuple(f(v * s) for v in rx), k(.2, 1.5, 5, 9)),
            anim('ry', '%s;%s;%s;%s;%s;%s' % tuple(f(v * s) for v in ry), k(.2, 1.5, 5, 9)), anim('cx', '%s;%s;%s;%s' % (f(x + dx), f(x + dx), f(x + dx + 26), f(x + dx + 26)), k(.2, 9)))
    plume = (plume_el(4, 4, 'url(#%s-shadow)' % p, '0;0;.6;.5;0;0') + plume_el(0, 0, 'url(#%s-plume)' % p, '0;0;.95;.9;0;0')
             + '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#%s-under)" opacity="0">%s</ellipse>' % (f(x), f(y), f(30 * s), f(22 * s), p, anim('opacity', '0;0;.4;0;0', k(.2, 1.2, 3.2))))
    return ''.join(o), plume


def planet(p, width=None):
    rnd = random.Random(1601)
    small = width is not None
    d = KIT.base_defs(p, air=('#ff7a40', '#ff7a40', '#7a1408'), haze=('#ff9a60', '#ff8a50', '#ffb080'))
    d.append(KIT.map_image(p, 'surface', 'surface.png', 84, width, 1.25 if small else 1.0))
    d.append(KIT.map_image(p, 'lava', 'lava-small.png' if small else 'lava.png', 78, width, 1.3 if small else 1.0))
    d.append(KIT.map_image(p, 'halo', 'lavahalo.png', 70, small=True))
    d.append(KIT.map_image(p, 'cracks', 'cracks.png', 84, width))
    d.append(KIT.map_image(p, 'smoke', 'smoke.png', 78, width))
    d.append(KIT.map_image(p, 'smokeshade', 'smokeshade.png', 70, small=True))
    d.append(KIT.map_image(p, 'smokeglow', 'smokeglow.png', 70, small=True))
    d.append(surge_mask(p, period=4.3, gap=610, width=90))
    d.append('<radialGradient id="%s-ground"><stop offset="0" stop-color="#ffb050" stop-opacity=".9"/><stop offset=".4" stop-color="#ff5a14" stop-opacity=".5"/><stop offset="1" stop-color="#c02000" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-burst"><stop offset="0" stop-color="#fffbe8"/><stop offset=".4" stop-color="#ffd070"/><stop offset="1" stop-color="#ff6a14" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-plume"><stop offset="0" stop-color="#3a2e2a"/><stop offset=".55" stop-color="#1e1714" stop-opacity=".95"/><stop offset="1" stop-color="#1e1714" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-shadow"><stop offset="0" stop-color="#000" stop-opacity=".8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-under"><stop offset="0" stop-color="#ff6a20"/><stop offset="1" stop-color="#ff6a20" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-ember"><stop offset="0" stop-color="#fff0c0"/><stop offset="1" stop-color="#ff5010" stop-opacity=".2"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-pillar"><stop offset="0" stop-color="#fff4d0"/><stop offset=".5" stop-color="#ffb040"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>' % p)
    d.append('<radialGradient id="%s-crimson" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#7a1408" stop-opacity=".0"/><stop offset=".9" stop-color="#a02010" stop-opacity=".35"/><stop offset="1" stop-color="#d03818" stop-opacity=".55"/></radialGradient>' % (p, f(C - .2 * R), f(C - .15 * R), f(1.15 * R)))
    d.append('<filter id="%s-billow" x="-30%%" y="-30%%" width="160%%" height="160%%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>' % p)
    d.append('<radialGradient id="%s-sun" cx="%s" cy="%s" r="%s" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe0c4"/><stop offset="1" stop-color="#f0a274"/></radialGradient>' % (
        p, f(C - .45 * R), f(C - .3 * R), f(1.6 * R)))

    # the vents: four sites on land, each where the ground faces the viewer when its turn on the eruption clock comes
    vents = []
    looks = [(1.0, 1.0, 0), (.75, .8, 0), (1.35, 1.25, .55), (.9, .9, -.2)]  # size, length, how far off center toward the limb
    for i in range(4):
        at = (.08 + i * .245) % 1
        xc = facing_x(at * ERUPT + 1.5, SPIN, .25 - looks[i][2])
        # the volcano nearest that point, among those in the middle band of latitude
        best = min(VOLCANOES, key=lambda v: (min(abs(v[0] - xc), WT - abs(v[0] - xc)) / R) ** 2 + ((v[1] - HT / 2) / R) ** 2 * .6)
        x, y = best
        vents.append((x, y, at, looks[i][0], looks[i][1]))
    fire, ash = [], []
    for (x, y, at, s_, dur_) in vents:
        for x0 in TILE_X:
            a_, b_ = eruption(p, x0 + x, TILE_Y + y, at, rnd, s_, dur_)
            fire.append(a_)
            ash.append(b_)
    plumes = ''.join(ash)

    o = []
    o.append(KIT.air_rim(p))
    # the lit world: ground, eruptions' ash, and the smoke blowing over it; then the red dwarf's light
    o.append(KIT.lensed(p, spin(tiles(p, 'surface'), SPIN)
                        + '<g class="lyr-smoke">%s</g>' % spin(tiles(p, 'smoke'), SMOKE_SPIN)))
    o.append('<g class="lyr-sun"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-sun)" style="mix-blend-mode:multiply"/></g>' % (f(C), f(C), f(R), p))
    o.append(KIT.haze(p))
    o.append('<g class="lyr-air"><circle cx="%s" cy="%s" r="%s" fill="url(#%s-crimson)" style="mix-blend-mode:screen"/></g>' % (f(C), f(C), f(R), p))
    o.append(KIT.night(p))
    # the lava's own light, day and night: the seas' seams and shores and the fissures, dimmed under thick smoke; its halo at
    # night; surges running along the fissures
    smoke_dim = '<g class="lyr-smoke">%s</g>' % spin(tiles(p, 'smokeshade'), SMOKE_SPIN)
    o.append(KIT.lensed(p, spin(tiles(p, 'lava'), SPIN) + smoke_dim, 'lyr-lava', ' style="mix-blend-mode:screen" opacity=".5"'))
    o.append('<g class="lyr-lava" style="mix-blend-mode:screen" mask="url(#%s-nightm)">%s</g>' % (p, KIT.lensed(p, spin(tiles(p, 'lava'), SPIN) + smoke_dim)))
    o.append('<g class="lyr-smoke" style="mix-blend-mode:screen" mask="url(#%s-nightm)" opacity=".6">%s</g>' % (p, KIT.lensed(p, spin(tiles(p, 'smokeglow'), SMOKE_SPIN))))
    o.append('<g class="lyr-lava" style="mix-blend-mode:screen" mask="url(#%s-nightm)">%s</g>' % (p, KIT.lensed(p, spin(tiles(p, 'halo'), SPIN) + smoke_dim)))
    o.append(KIT.lensed(p, spin('<g mask="url(#%s-surge)">%s</g>' % (p, tiles(p, 'cracks')), SPIN), 'lyr-rivers', ' style="mix-blend-mode:screen"'))
    # the eruptions' fire, above the night (it makes its own light)
    o.append(KIT.lensed(p, spin('<g filter="url(#%s-billow)">%s</g>' % (p, plumes), SPIN), 'lyr-erupt'))
    o.append(KIT.lensed(p, spin(''.join(fire), SPIN), 'lyr-erupt', ' style="mix-blend-mode:screen"'))
    o.append(KIT.limb(p, rim='#ff8a5a'))
    return '<defs>%s</defs>%s' % (''.join(d), ''.join(o))


def svg(p, cls, label, with_stars=True, width=None):
    return '<svg class="%s" viewBox="0 0 600 600" role="img" aria-label="%s">%s%s</svg>' % (cls, label, stars(90, 3) if with_stars else '', planet(p, width))


if __name__ == '__main__':
    open(os.path.join(HERE, 'planet.svg'), 'w', encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#05060c"/>%s%s</svg>' % (stars(90, 3), planet('m')))
    print('ok', os.path.getsize(os.path.join(HERE, 'planet.svg')) // 1024, 'KB')
