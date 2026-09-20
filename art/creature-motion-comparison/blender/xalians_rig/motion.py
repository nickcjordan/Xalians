"""Eased key tracks, lag, keyframe helpers, and the two-link leg solver."""

import math

import bpy
from mathutils import Vector


def ease(kind, u):
    u = max(0.0, min(1.0, u))
    if kind == "linear":
        return u
    if kind == "in":
        return u * u
    if kind == "out":
        return 1 - (1 - u) * (1 - u)
    return u * u * (3 - 2 * u)


class Track:
    """A performance as data: ``[frame, ease_into_key, {param: value}]`` entries.

    ``at(frame)`` evaluates every parameter at any fractional frame, so a part
    can read the track a little behind the body to lag it. Parameters missing
    from a key fall back to ``defaults``.
    """

    def __init__(self, defaults, keys):
        self.defaults = dict(defaults)
        self.keys = [(float(frame), kind, {**self.defaults, **values}) for frame, kind, values in keys]

    @property
    def start(self):
        return self.keys[0][0]

    @property
    def end(self):
        return self.keys[-1][0]

    def at(self, frame):
        frame = max(self.start, min(self.end, frame))
        for (f0, _, p0), (f1, kind, p1) in zip(self.keys, self.keys[1:]):
            if f0 <= frame <= f1:
                u = ease(kind, (frame - f0) / (f1 - f0)) if f1 > f0 else 1.0
                return {k: p0[k] + (p1[k] - p0[k]) * u for k in self.defaults}
        return dict(self.defaults)


class Loop:
    """A periodic quiet-presence track computed by a function of phase 0..1."""

    def __init__(self, defaults, length, function):
        self.defaults = dict(defaults)
        self.length = length
        self.function = function

    def at(self, frame):
        t = ((frame - 1) % self.length) / self.length
        return {**self.defaults, **self.function(frame, t)}


def key(obj, frame, fields=("location", "rotation_euler")):
    for field in fields:
        obj.keyframe_insert(data_path=field, frame=frame)


def solve_two_link(hip_world, target, upper, lower, reach_bias=None):
    """Planar (XZ) two-link IK from a hip toward a target point.

    Returns ``(thigh_rotation, knee_rotation)`` about Y for a chain whose
    segments hang along local -Z. The visible joint bends backward as on a
    bird's ankle. When the target is out of reach the chain points toward it,
    blended toward ``reach_bias`` if given, at nearly full extension.
    """
    delta = target - hip_world
    reach = upper + lower - .01
    d = math.hypot(delta.x, delta.z)
    if d > reach:
        direction = Vector((delta.x, 0, delta.z)).normalized()
        if reach_bias is not None:
            direction = (direction * .8 + Vector(reach_bias).normalized() * .2).normalized()
        delta = direction * reach
        d = reach
    d = max(d, abs(upper - lower) + .01)
    aim = math.atan2(-delta.x, -delta.z)
    hip_angle = math.acos(max(-1, min(1, (upper ** 2 + d ** 2 - lower ** 2) / (2 * upper * d))))
    knee_bend = math.acos(max(-1, min(1, (upper ** 2 + lower ** 2 - d ** 2) / (2 * upper * lower))))
    return aim + hip_angle, -(math.pi - knee_bend)


def all_fcurves():
    """Yield every f-curve across the legacy and the layered action APIs."""
    for action in bpy.data.actions:
        if hasattr(action, "fcurves"):
            yield from action.fcurves
        for layer in getattr(action, "layers", ()):
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves


def make_linear():
    """Every frame is baked, so straight segments keep the track's own easing."""
    for curve in all_fcurves():
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
