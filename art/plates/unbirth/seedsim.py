"""Seed flight for the Unbirth plate: real physics, sampled into SMIL.

A seed leaves a vent on the jet, slows under gravity and drag, and from then on the wind carries
it. How it falls depends on what it is:
- parachute: a glowing seed under a tuft of fine filaments (like a dandelion). The tuft opens at the
  top of the climb; after that the seed sinks slowly at its terminal speed while gusts push it
  downwind, and it sways under the tuft.
- samara: a seed with one wing (like a maple key). It autorotates, so it falls slowly while spinning,
  its wing flicking side to side.
- nut: a heavy husked seed. It flies a true ballistic arc (it slows to the top of the climb and
  speeds up on the way down) with only a little push from the wind, tumbling as it goes.

`fly()` integrates the flight at 1/60 s and returns samples every `step` seconds, so an
animateMotion with `values` (calcMode linear) plays it back exactly. `aim()` finds the wind
strength that lands a seed on a chosen spot.
"""
import math

G = 128.0  # units per second squared: the machine is about 30 m tall at 13 units a metre
DT = 1 / 40


def wind_at(t, y, phase, strength):
    # stronger aloft, gusting on two periods
    aloft = min(1.0, max(.35, (480 - y) / 300))
    gust = 1 + .32 * math.sin(2 * math.pi * t / 2.3 + phase) + .18 * math.sin(2 * math.pi * t / .9 + phase * 1.7)
    return strength * aloft * gust


def fly(kind, p0, v0, ground, strength, phase=0.0, step=1 / 15, max_t=16.0, k_open=3.2, sink=40.0, period=2.2, glide=22.0, fine=(1.5, .075), drag=.35):
    """Returns [(t, x, y, angle)] until the seed reaches the ground line y = ground(x). A parachute
    seed with a bigger canopy (larger k_open) falls slower and so travels farther on the wind."""
    x, y = p0
    vx, vy = v0
    t = 0.0
    opened = kind not in ('parachute', 'glider')
    out = []
    next_s = 0.0
    while t < max_t:
        w = wind_at(t, y, phase, strength)
        k = .35
        if kind == 'parachute':
            if not opened and vy > -30:
                opened = True
            k = k_open if opened else 1.4  # the open canopy is a strong brake: terminal fall g/k (62 at 3.2)
        elif kind == 'samara':
            k = 3.0 if vy > -20 else 1.2  # once it starts to fall it autorotates and brakes; terminal ~ 67
        else:
            k = drag  # a heavy seed: gravity and a little drag, the wind leaning on it
        if kind == 'glider':
            if not opened and vy > -30:
                opened = True
            if opened:
                # a winged seed glides: a steady sink with a slow swoop (the phugoid), sailing a little
                # faster than the wind; it eases toward that glide rather than snapping to it
                sw = 2 * math.pi * t / period + phase
                tvx = w + glide * (1 - .35 * math.cos(sw))  # speed builds through the dive
                tvy = sink * (1 + .5 * math.sin(sw))
                vx += (tvx - vx) * min(1, 2.5 * DT)
                vy += (tvy - vy) * min(1, 2.5 * DT)
            else:
                vx += 1.4 * (w - vx) * DT
                vy += (G - 1.4 * vy) * DT
        else:
            ax = k * (w - vx)
            ay = G - k * vy
            vx += ax * DT
            vy += ay * DT
        x += vx * DT
        y += vy * DT
        t += DT
        if kind == 'parachute':
            # the seed hangs under the tuft and swings as the gusts change
            ang = (8 * math.sin(2 * math.pi * t / 1.3 + phase) - .06 * (w - vx)) if opened else math.degrees(math.atan2(vy, vx)) + 90
        elif kind == 'samara':
            ang = 0.0
        elif kind == 'glider':
            # the wing pitches with its path: nose down in the dive of each swoop, level as it slows
            ang = .7 * math.degrees(math.atan2(vy, vx))
        else:
            ang = t * 260  # tumbling
        if vy > 0 and y >= ground(x):
            out.append((t, x, ground(x), ang))  # the landing replaces this step's sample
            break
        if t >= next_s:
            out.append((t, x, y, ang))
            next_s += fine[1] if t < fine[0] else step  # finer through the climb and the turn at its top
    return out


def aim(kind, p0, v0, target, ground_y, phase=0.0, lo=0.0, hi=400.0, wind=None):
    """The wind strength that brings the seed down at target x on the line y = ground_y. With a
    fixed `wind`, it is the horizontal launch speed that is found instead (a heavy seed is thrown,
    not carried)."""
    tx = target
    for _ in range(40):
        mid = (lo + hi) / 2
        if wind is None:
            path = fly(kind, p0, v0, lambda x: ground_y, mid, phase)
        else:
            path = fly(kind, p0, (mid, v0[1]), lambda x: ground_y, wind, phase)
        if path[-1][1] < tx:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def aim_k(p0, v0, target, ground_y, wind, phase=0.0, lo=1.4, hi=12.0):
    """The canopy (k_open) that brings a parachute seed down at target x on the line y = ground_y,
    in a wind of fixed strength: seeds differ in size, the wind is one wind."""
    for _ in range(18):
        mid = (lo + hi) / 2
        path = fly('parachute', p0, v0, lambda x: ground_y, wind, phase, k_open=mid)
        if path[-1][1] < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def aim_sink(p0, v0, target, ground_y, wind, phase=0.0, period=2.2, lo=12.0, hi=140.0):
    """The sink speed that brings a gliding seed down at target x: a broader wing sinks slower and
    glides farther on the same wind."""
    for _ in range(18):
        mid = (lo + hi) / 2
        path = fly('glider', p0, v0, lambda x: ground_y, wind, phase, sink=mid, period=period)
        if path[-1][1] < target:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def aim_speed(p0, elev, target, ground_y, wind, phase=0.0, lo=10.0, hi=900.0, drag=.35):
    """The muzzle speed that brings a pod fired at a fixed elevation (degrees) down at target x on
    the line y = ground_y: a barrel's angle is fixed, its charge is not."""
    r = math.radians(elev)
    for _ in range(30):
        mid = (lo + hi) / 2
        path = fly('nut', p0, (mid * math.cos(r), -mid * math.sin(r)), lambda x: ground_y, wind, phase, drag=drag)
        if path[-1][1] < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
