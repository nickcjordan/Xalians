"""Parametric clips as code, baked to keyframes at 30 fps.

A clip is a function of time (ms) that returns body-level parameters in the
creature's own terms (forward, up, pitch nose-up, jaw open, tail lift, foot
offsets). ``bake_clip`` evaluates it every frame, maps the parameters onto
joints through world-space axes converted into each joint's rest frame, keeps
the feet on their targets with an analytic two-joint solve, and keys every
deform joint. The root joint is never keyed, so it never translates.

Keyed tracks reuse the idea of the older study library (eased keys, lag on a
chain) but nothing is imported from it.
"""

import math
from dataclasses import dataclass, field

FPS = 30
TAIL_LAG_MS = 70.0
LEGS = ("fl", "fr", "hl", "hr")


# -- eased key tracks ---------------------------------------------------------

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
    """``[(ms, ease_into_this_key, {param: value})]``; missing params are 0."""

    def __init__(self, keys):
        self.keys = keys
        self.params = sorted({k for _, _, v in keys for k in v})

    def __call__(self, t):
        keys = self.keys
        if t <= keys[0][0]:
            return dict(keys[0][2])
        for (t0, _, p0), (t1, kind, p1) in zip(keys, keys[1:]):
            if t0 <= t <= t1:
                u = ease(kind, (t - t0) / (t1 - t0)) if t1 > t0 else 1.0
                return {k: p0.get(k, 0.0) + (p1.get(k, 0.0) - p0.get(k, 0.0)) * u for k in self.params}
        return dict(keys[-1][2])


def wave(t, period, phase=0.0, harmonic=1):
    return math.sin(2 * math.pi * (harmonic * t / period + phase))


@dataclass
class Clip:
    name: str
    duration_ms: int
    loop: bool
    fn: object
    events: list = field(default_factory=list)
    archetype: str | None = None
    travel: dict | None = None
    reach: bool = False          # measure reachM at the "hit" event
    free_legs: bool = False      # no foot planting (faint)

    @property
    def frames(self):
        n = self.duration_ms * FPS / 1000
        if abs(n - round(n)) > 1e-6:
            raise ValueError(f"{self.name}: {self.duration_ms} ms is not a whole number of frames at {FPS} fps")
        return int(round(n))


# -- the clips ----------------------------------------------------------------

def idle(t):
    T = 3000.0
    return {
        "up": 0.004 * wave(t, T),
        "bend": 0.012 * wave(t, T, 0.1),
        "neck_pitch": 0.02 * wave(t, T, 0.25),
        "ear_l": 0.10 * wave(t, T, 0.0, 2),
        "ear_r": 0.10 * wave(t, T, 0.3, 2),
        "tail_yaw": 0.18 * wave(t, T),
        "tail_lift": 0.05 * wave(t, T, 0.5, 2),
    }


lunge = Track([
    (0, "linear", {}),
    (300, "smooth", {"up": -0.04, "fwd": -0.03, "pitch": -0.05, "neck_pitch": -0.15, "head_pitch": -0.10,
                     "tail_lift": 0.25, "ear_l": -0.4, "ear_r": -0.4}),
    (450, "out", {"up": 0.02, "fwd": 0.06, "pitch": 0.05, "neck_pitch": -0.10, "head_pitch": 0.0,
                  "ff_fwd": 0.05, "ff_up": 0.07, "tail_lift": 0.1, "ear_l": -0.6, "ear_r": -0.6}),
    (700, "out", {"up": 0.0, "fwd": 0.10, "pitch": -0.08, "neck_pitch": -0.28, "head_pitch": 0.10, "jaw": 0.35,
                  "ff_fwd": 0.10, "ff_up": 0.0, "tail_lift": -0.1, "ear_l": -0.6, "ear_r": -0.6}),
    (900, "smooth", {"fwd": 0.08, "neck_pitch": -0.2, "jaw": 0.1, "ff_fwd": 0.10, "ear_l": -0.3, "ear_r": -0.3}),
    (1200, "smooth", {"up": 0.005, "ff_fwd": 0.0}),
    (1500, "smooth", {}),
])

act_light = Track([
    (0, "linear", {}),
    (250, "smooth", {"up": -0.01, "fwd": -0.02, "neck_pitch": 0.10, "head_pitch": 0.10, "ear_l": -0.3, "ear_r": -0.3}),
    (380, "out", {"fwd": 0.04, "neck_pitch": -0.30, "head_pitch": -0.10, "jaw": 0.30, "ear_l": -0.4, "ear_r": -0.4}),
    (700, "smooth", {}),
    (900, "smooth", {}),
])

act_heavy = Track([
    (0, "linear", {}),
    (450, "smooth", {"pitch": 0.35, "up": 0.05, "fwd": -0.04, "ff_up": 0.15, "ff_fwd": 0.03, "tail_lift": -0.2,
                     "neck_pitch": 0.1}),
    (620, "in", {"pitch": -0.12, "up": -0.03, "fwd": 0.06, "neck_pitch": -0.2, "jaw": 0.3, "ff_fwd": 0.06,
                 "tail_lift": 0.2}),
    (1100, "smooth", {}),
    (1400, "smooth", {}),
])

hurt = Track([
    (0, "linear", {}),
    (80, "out", {"fwd": -0.04, "pitch": 0.12, "head_pitch": 0.25, "roll": 0.05, "ear_l": -0.6, "ear_r": -0.6}),
    (500, "smooth", {}),
])

evade = Track([
    (0, "linear", {}),
    (200, "out", {"side": 0.08, "roll": -0.15, "yaw": 0.15, "head_pitch": 0.1}),
    (600, "smooth", {}),
])


def guard(t):
    T = 900.0
    base = {"up": -0.03, "fwd": -0.02, "neck_pitch": -0.15, "head_pitch": -0.10, "ear_l": -0.5, "ear_r": -0.5,
            "tail_lift": -0.15}
    base["up"] += 0.004 * wave(t, T, 0.25 - 250 / T)  # peak tension at the "set" event
    return base


displaced = Track([
    (0, "linear", {}),
    (60, "out", {"fwd": -0.08, "pitch": 0.15, "roll": -0.10, "head_pitch": 0.2}),
    (350, "smooth", {"fwd": -0.05, "pitch": 0.05}),
    (600, "smooth", {}),
    (700, "linear", {}),
])


def held(t):
    T = 1500.0
    return {"up": -0.02, "roll": 0.08 * wave(t, T), "yaw": 0.06 * wave(t, T, 0.25, 2),
            "neck_pitch": 0.08 * wave(t, T, 0.1, 2), "ear_l": -0.5, "ear_r": -0.5, "tail_yaw": 0.25 * wave(t, T, 0, 2)}


faint = Track([
    (0, "linear", {}),
    (400, "smooth", {"roll": 0.10, "up": -0.05, "neck_pitch": -0.1}),
    (900, "in", {"roll": 1.2, "up": -0.22, "neck_pitch": -0.3, "head_pitch": -0.2, "tail_lift": -0.3,
                 "ear_l": -0.6, "ear_r": -0.6}),
    (1200, "out", {"roll": 1.25, "up": -0.23, "neck_pitch": -0.3, "head_pitch": -0.2, "tail_lift": -0.3,
                   "ear_l": -0.6, "ear_r": -0.6}),
])


def move(t):
    """Walk in place (treadmill): diagonal pairs, foot_down for fl/hr at 0 and fr/hl at 400."""
    T = 800.0
    out = {"up": 0.008 * math.cos(4 * math.pi * t / T), "tail_yaw": 0.12 * wave(t, T)}
    for leg, phase in (("fl", 0.0), ("hr", 0.0), ("fr", 0.5), ("hl", 0.5)):
        th = 2 * math.pi * (t / T + phase) + math.pi
        out[f"{leg}_fwd"] = -0.07 * math.cos(th)
        out[f"{leg}_up"] = 0.05 * max(0.0, math.sin(th))
    return out


def all_clips():
    return [
        Clip("idle", 3000, True, idle),
        Clip("move", 800, True, move, [("foot_down", 0), ("foot_down", 400)], travel={"distanceM": 1.1}),
        Clip("hurt", 500, False, hurt, [("impact", 80)]),
        Clip("evade", 600, False, evade, [("clear", 200)]),
        Clip("guard", 900, True, guard, [("set", 250)]),
        Clip("displaced", 700, False, displaced, [("impact", 60), ("settle", 600)]),
        Clip("held", 1500, True, held),
        Clip("faint", 1200, False, faint, [("down", 900)], free_legs=True),
        Clip("act.light", 900, False, act_light, [("hit", 380), ("recover", 700)], archetype="strike", reach=True),
        Clip("act.heavy", 1400, False, act_heavy, [("hit", 620), ("recover", 1100)], archetype="slam", reach=True),
        Clip("sig.lunge", 1500, False, lunge, [("launch", 300), ("hit", 700), ("recover", 1200)],
             archetype="lunge", travel={"distanceM": 1.6, "startMs": 300, "endMs": 700}, reach=True),
    ]


# -- baking (bpy) ---------------------------------------------------------------

def _axes():
    from mathutils import Vector
    return {
        "nose_up": Vector((-1, 0, 0)),   # creature faces -Y: rotating about -X lifts the nose
        "nose_down": Vector((1, 0, 0)),
        "yaw_left": Vector((0, 0, 1)),
        "roll": Vector((0, -1, 0)),
        "tail_up": Vector((1, 0, 0)),
        "ear_fwd": Vector((1, 0, 0)),
    }


class Poser:
    def __init__(self, rig):
        self.rig = rig
        self.pb = rig.pose.bones
        self.rest_inv = {b.name: b.matrix_local.to_3x3().inverted() for b in rig.data.bones}
        self.ax = _axes()
        self.deform = [b.name for b in rig.data.bones if b.use_deform]
        self.legs = {}
        for leg in LEGS:
            a, b, c = (rig.data.bones[f"leg_{leg}_{i:02d}"] for i in (1, 2, 3))
            H0, K0, F0 = a.head_local, a.tail_local, b.tail_local
            line = (F0 - H0).normalized()
            pole = (K0 - H0) - line * (K0 - H0).dot(line)
            self.legs[leg] = {"names": (a.name, b.name, c.name), "L1": (K0 - H0).length, "L2": (F0 - K0).length,
                              "F0": F0.copy(), "pole": pole.normalized(), "c_rest": c.matrix_local.to_3x3()}

    def reset(self):
        from mathutils import Quaternion, Vector
        for p in self.pb:
            p.rotation_mode = "QUATERNION"
            p.rotation_quaternion = Quaternion()
            p.location = Vector()
            p.scale = (1, 1, 1)

    def rot(self, name, axis, angle):
        from mathutils import Quaternion
        if abs(angle) < 1e-9:
            return
        p = self.pb[name]
        p.rotation_quaternion = Quaternion(self.rest_inv[name] @ axis, angle) @ p.rotation_quaternion

    def move(self, name, world):
        self.pb[name].location = self.pb[name].location + self.rest_inv[name] @ world

    def apply(self, params, tail_params):
        from mathutils import Vector
        g = lambda k: params.get(k, 0.0)  # noqa: E731
        ax = self.ax
        self.move("spine_01", Vector((g("side"), -g("fwd"), g("up"))))
        self.rot("spine_01", ax["nose_up"], g("pitch"))
        self.rot("spine_01", ax["roll"], g("roll"))
        self.rot("spine_01", ax["yaw_left"], g("yaw"))
        for i in range(2, 6):
            self.rot(f"spine_{i:02d}", ax["nose_up"], g("bend"))
        self.rot("neck_01", ax["nose_up"], g("neck_pitch") * 0.5)
        self.rot("neck_02", ax["nose_up"], g("neck_pitch") * 0.5)
        self.rot("head_01", ax["nose_up"], g("head_pitch"))
        self.rot("jaw_01", ax["nose_down"], g("jaw"))
        for side in ("l", "r"):
            self.rot(f"ear_{side}_01", ax["ear_fwd"], g(f"ear_{side}") * 0.6)
            self.rot(f"ear_{side}_02", ax["ear_fwd"], g(f"ear_{side}") * 0.4)
        for i, tp in enumerate(tail_params):
            self.rot(f"tail_{i + 1:02d}", ax["tail_up"], tp.get("tail_lift", 0.0) * 0.5)
            self.rot(f"tail_{i + 1:02d}", ax["yaw_left"], tp.get("tail_yaw", 0.0) * 0.5)

    def plant_feet(self, params, view_layer):
        """Analytic two-joint solve per leg toward the rest foot point plus the clip's offset."""
        from mathutils import Matrix, Vector
        g = lambda k: params.get(k, 0.0)  # noqa: E731
        solved = {}
        for leg, L in self.legs.items():
            pair = "ff" if leg[0] == "f" else "hf"
            fwd = g(f"{leg}_fwd") + g(f"{pair}_fwd")
            up = g(f"{leg}_up") + g(f"{pair}_up")
            a = self.pb[L["names"][0]]
            H = a.head.copy()
            F = L["F0"] + Vector((0, -fwd, up))
            parent_rot = (a.parent.matrix.to_3x3() @ a.bone.parent.matrix_local.to_3x3().inverted())
            pole = parent_rot @ L["pole"]
            d = F - H
            L1, L2 = L["L1"], L["L2"]
            dist = max(abs(L1 - L2) + 1e-4, min(L1 + L2 - 1e-4, d.length))
            n = d.normalized()
            along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
            h = math.sqrt(max(L1 * L1 - along * along, 0.0))
            side = (pole - n * pole.dot(n)).normalized()
            K = H + n * along + side * h
            solved[leg] = (H, K, H + n * dist)
        for step in (0, 1):
            for leg, (H, K, F) in solved.items():
                p = self.pb[self.legs[leg]["names"][step]]
                start, end = (H, K) if step == 0 else (K, F)
                M = p.matrix.copy()
                cur = (M.col[1].xyz).normalized()
                q = cur.rotation_difference((end - start).normalized())
                R = q.to_matrix() @ M.to_3x3()
                p.matrix = Matrix.Translation(p.head) @ R.to_4x4()
            view_layer.update()
        for leg in self.legs:
            p = self.pb[self.legs[leg]["names"][2]]
            p.matrix = Matrix.Translation(p.head) @ self.legs[leg]["c_rest"].to_4x4()
        view_layer.update()


def bake_clip(rig, clip, poser, sockets=("socket_emitter",)):
    """Create one action named exactly ``clip.name`` and key every deform joint on every frame."""
    import bpy
    view_layer = bpy.context.view_layer
    action = bpy.data.actions.new(clip.name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    hits = {}
    n = clip.frames
    for f in range(n + 1):
        t = f * 1000.0 / FPS
        if clip.loop and f == n:
            t = 0.0  # the last frame of a loop is exactly its first
        params = clip.fn(t)
        tail = []
        for i in range(4):
            tt = t - TAIL_LAG_MS * i
            tt = tt % clip.duration_ms if clip.loop else max(0.0, tt)
            tail.append(clip.fn(tt))
        poser.reset()
        poser.apply(params, tail)
        view_layer.update()
        if not clip.free_legs:
            poser.plant_feet(params, view_layer)
        for name in poser.deform:
            p = rig.pose.bones[name]
            p.keyframe_insert("rotation_quaternion", frame=f, group=name)
            p.keyframe_insert("location", frame=f, group=name)
        for ev, ms in clip.events:
            if ev == "hit" and round(ms * FPS / 1000) == f:
                hits[ev] = {s: tuple(rig.pose.bones[s].head) for s in sockets}
    action.frame_range = (0, n)
    return action, hits
