"""Clip primitives shared by the Akinza clips (plan step 3), copied from the Luceras slice clips
(`git show creature-pipeline:art/pipeline/animate/luceras_clips.py`, roster layer section 3): eased key tracks,
a wave, lag down a chain, a decaying overshoot, and a breathing cycle. Pure Python, no bpy.

Times are milliseconds unless a name says frames; FPS is the clip rate.
"""
import math

FPS = 30


def clamp01(u):
    return max(0.0, min(1.0, u))


def ease(kind, u):
    u = clamp01(u)
    if kind == "linear":
        return u
    if kind == "in":
        return u * u
    if kind == "in3":
        return u * u * u
    if kind == "out":
        return 1 - (1 - u) ** 2
    if kind == "out3":
        return 1 - (1 - u) ** 3
    if kind == "hold":
        return 0.0 if u < 1 else 1.0
    if kind == "back":  # overshoot then settle (about 8 percent past the key)
        s = 1.70158
        v = u - 1
        return 1 + v * v * ((s + 1) * v + s)
    if kind == "settle":  # a gentle start and a long easing into the end (clips pass 3: the crouch eases into the bottom)
        g = 1 - (1 - u) ** 1.8
        return g * g * (3 - 2 * g)
    if kind == "slowstart":  # a long slow start and a long eased end (pass 3: the rise from the crouch, ending at idle speed)
        g = u ** 1.4
        return g * g * g * (g * (6 * g - 15) + 10)
    return u * u * (3 - 2 * u)  # smooth


class Track:
    """Keys ``[(ms, ease_into_this_key, {param: value})]``; a param missing from a key holds 0 (rest)."""

    def __init__(self, keys):
        self.keys = sorted(keys, key=lambda k: k[0])
        self.params = sorted({k for _, _, v in keys for k in v})

    def __call__(self, t):
        keys = self.keys
        if t <= keys[0][0]:
            return {k: keys[0][2].get(k, 0.0) for k in self.params}
        for (t0, _, p0), (t1, kind, p1) in zip(keys, keys[1:]):
            if t0 <= t <= t1:
                u = ease(kind, (t - t0) / (t1 - t0)) if t1 > t0 else 1.0
                return {k: p0.get(k, 0.0) + (p1.get(k, 0.0) - p0.get(k, 0.0)) * u for k in self.params}
        return {k: keys[-1][2].get(k, 0.0) for k in self.params}


def wave(t, period, phase=0.0, harmonic=1):
    return math.sin(2 * math.pi * (harmonic * t / period + phase))


def lagged(fn, t, lag_ms, period=None):
    """``fn`` evaluated ``lag_ms`` late; wraps inside a loop period, holds the first value before 0."""
    tt = t - lag_ms
    return fn(tt % period if period else max(0.0, tt))


def damped(t, t0, amp, period_ms, decay_ms):
    """A decaying oscillation starting at t0 (overshoot/whip primitive)."""
    if t < t0:
        return 0.0
    x = t - t0
    return amp * math.exp(-x / decay_ms) * math.sin(2 * math.pi * x / period_ms)


def breath(t, period_ms, inhale_share=0.4, phase=0.0):
    """Breathing cycle, 0 (empty) to 1 (full) and back, periodic in period_ms with zero slope at both ends of
    each half: a quicker eased inhale (inhale_share of the period) and a longer eased exhale. Luceras used the
    symmetric 0.5 - 0.5 cos; the split follows resting breathing, where the exhale is the longer, passive half."""
    u = ((t / period_ms) + phase) % 1.0
    if u < inhale_share:
        return 0.5 - 0.5 * math.cos(math.pi * u / inhale_share)
    return 0.5 + 0.5 * math.cos(math.pi * (u - inhale_share) / (1 - inhale_share))


def window(frame, start, end, kind="smooth"):
    """Eased share 0 to 1 of a move that runs from frame `start` to frame `end` (0 before, 1 after)."""
    if end <= start:
        return 1.0 if frame >= end else 0.0
    return ease(kind, (frame - start) / (end - start))


def frame_ms(frame):
    return frame * 1000.0 / FPS
