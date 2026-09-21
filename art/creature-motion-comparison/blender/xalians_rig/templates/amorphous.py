"""Amorphous template: a keyed metaball mass with riding plates, a hooded eye, and a pseudopod.

The defaults reproduce the Bioflim study exactly. Anatomy switches: ``shell``
(plate count and fresh plate count), ``pseudopods`` (pseudopod element
count), and ``eye`` (single hooded eye on or off).
"""

import math
import random

from mathutils import Vector

from ..builders import Metamass, empty, rock_plate, sphere
from ..motion import Loop, Track

TAU = math.tau
rad = math.radians

DEFAULT_PROPORTIONS = {
    "ground_z": -.95,
    "pod_root": [.40, -.32, .02],
    "pod_tip": [1.38, -.66, .40],
    "plate_radius": .86,
}

DEFAULT_PARAMS = dict(heave=0.0, gather=0.0, reach=0.0, lift=0.0, fresh=0.0, sag=0.0,
                      glance=0.0, blink=0.0, runnel=0.0, bead=0.0)

PLATE_DIRECTIONS = [
    (0.10, -0.25, 1.00), (0.55, -0.05, .80), (-0.45, -0.10, .85), (0.05, 0.55, .80),
    (0.95, -0.25, .35), (-0.85, -0.35, .45), (0.40, 0.75, .40), (-0.40, 0.70, .45),
    (-0.55, -0.80, .30), (-0.20, -0.70, .68), (0.70, 0.25, .55),
]
FRESH_DIRECTIONS = [(0.32, -0.45, .82), (-0.15, 0.22, .98), (-0.62, -0.62, .55), (0.62, 0.55, .58)]


class Amorphous:
    def __init__(self, spec, palette):
        self.spec = spec
        self.P = palette
        self.prop = {**DEFAULT_PROPORTIONS, **spec.get("proportions", {})}
        anatomy = spec.get("anatomy", {})
        self.plate_count = anatomy.get("plates", len(PLATE_DIRECTIONS))
        self.fresh_count = anatomy.get("fresh_plates", len(FRESH_DIRECTIONS))
        self.pod_count = anatomy.get("pseudopod_elements", 6)
        self.has_eye = anatomy.get("eye", True)
        self.rng = random.Random(spec.get("render", {}).get("shape_seed", 606))
        self.parts = {}
        self._build()
        self.tracks = {
            "action": Track(DEFAULT_PARAMS, spec["performance"]["action"]["keys"]),
            "idle": Loop(DEFAULT_PARAMS, spec["clips"]["idle"][1], self._idle),
        }

    def _build(self):
        P = self.P
        prop = self.prop
        ground = prop["ground_z"]
        self.stage = empty("%s | animator root" % self.spec["species"])
        self.mass_root = empty("mass | heave and gather", self.stage, (0, 0, 0))
        self.mass = Metamass("slime", self.mass_root, P["slime"])
        el = self.mass.element
        self.core = el((0, 0, -.15), 1.05, "ELLIPSOID")
        self.core.size_x, self.core.size_y, self.core.size_z = 1.0, .9, 1.25
        self.hood = el((.04, -.02, .55), .78)
        self.shoulder = el((-.30, .15, .25), .62)
        self.front_swell = el((.42, -.25, .05), .55)
        self.skirt = []
        for i in range(6):
            angle = TAU * i / 6 + .3
            self.skirt.append(el((math.cos(angle) * .66, math.sin(angle) * .50, ground + .42), .74))
        self.runnels = [el((.78, -.48, -.30), .24), el((-.62, -.60, -.10), .21)]
        self.pod_root = Vector(prop["pod_root"])
        self.pod_tip = Vector(prop["pod_tip"])
        self.pod = [el(self.pod_root, .44 - .028 * i) for i in range(self.pod_count)]
        self.drop = sphere("falling acid drop", self.mass_root, (.86, -.52, -.7), (.001, .001, .001), P["drip"], 12, 8)

        shell_root = empty("shell | plates ride the hood", self.mass_root, (.02, 0, .32))
        self.plates = []
        self.fresh = []
        for i in range(self.plate_count):
            normal = Vector(PLATE_DIRECTIONS[i % len(PLATE_DIRECTIONS)]).normalized()
            pivot = empty("plate pivot %s" % i, shell_root)
            pivot.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
            plate = rock_plate("rock plate %s" % i, pivot, P["rock"],
                               (.30 + .05 * (i % 3), .26 + .04 * ((i + 1) % 3), .11), self.rng)
            plate.location = (0, 0, prop["plate_radius"])
            plate.rotation_euler = (0, 0, self.rng.uniform(0, TAU))
            self.plates.append(plate)
        for i in range(self.fresh_count):
            normal = Vector(FRESH_DIRECTIONS[i % len(FRESH_DIRECTIONS)]).normalized()
            pivot = empty("fresh plate pivot %s" % i, shell_root)
            pivot.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
            plate = rock_plate("fresh plate %s" % i, pivot, P["rock_fresh"], (.16, .14, .07), self.rng)
            plate.location = (0, 0, .82)
            self.fresh.append(plate)

        if self.has_eye:
            self.eye_root = empty("eye | glance and blink", self.mass_root, (.40, -.70, .62))
            sphere("eye socket rim", self.eye_root, (0, .06, 0), (.24, .16, .21), P["slime_deep"])
            sphere("single eye", self.eye_root, (0, 0, 0), (.20, .12, .18), P["sclera"])
            self.pupil = sphere("slit pupil", self.eye_root, (.02, -.10, 0), (.05, .035, .12), P["pupil"])
            self.lid = sphere("hood lid", self.eye_root, (0, .02, .12), (.27, .19, .07), P["slime_deep"])
            self.lid.rotation_euler = (rad(-14), 0, 0)
            self.parts["pupil"] = self.pupil

        mass_obj = self.mass.object
        self.parts["pod_tip"] = lambda: mass_obj.matrix_world @ self.pod[-1].co.copy()
        self.parts["ground"] = lambda: Vector((0, 0, ground))

    @staticmethod
    def _idle(frame, t):
        return {"heave": .5 - .5 * math.cos(TAU * t), "runnel": t,
                "glance": .25 * math.sin(TAU * t + 1.0), "blink": 1.0 if frame == 9 else 0.0}

    def track(self, clip):
        return self.tracks[clip]

    def apply_pose(self, frame, clip):
        track = self.tracks[clip]
        p = track.at(frame)
        lagged = lambda name, lag: track.at(frame - lag)[name]
        heave, gather, sag = p["heave"], p["gather"], p["sag"]
        ground = self.prop["ground_z"]
        keyel = Metamass.key

        core = self.core
        core.co = (0, 0, -.15 - .06 * gather + .10 * heave - .05 * sag)
        core.size_z = 1.25 - .10 * gather + .18 * heave - .12 * sag
        core.size_x = 1.0 - .08 * gather + .05 * heave + .10 * sag
        core.keyframe_insert("co", frame=frame)
        core.keyframe_insert("size_x", frame=frame)
        core.keyframe_insert("size_z", frame=frame)
        self.hood.co = (.04 + .05 * heave, -.02, .55 - .08 * gather + .24 * heave - .10 * sag + .02 * p["heave"])
        self.hood.radius = .78 - .04 * gather + .08 * heave
        keyel(self.hood, frame)
        self.shoulder.co = (-.30, .15, .25 + .10 * heave - .06 * sag)
        keyel(self.shoulder, frame)
        self.front_swell.co = (.42 + .10 * gather + .12 * heave, -.25, .05 + .12 * heave - .04 * sag)
        self.front_swell.radius = .55 + .10 * gather
        keyel(self.front_swell, frame)
        for i, item in enumerate(self.skirt):
            angle = TAU * i / 6 + .3
            spread = 1 - .16 * lagged("gather", 1.0) + .16 * lagged("sag", 1.0 + .3 * i)
            item.co = (math.cos(angle) * .66 * spread, math.sin(angle) * .50 * spread, ground + .42 - .03 * sag)
            item.radius = .74 - .06 * gather + .05 * sag
            keyel(item, frame)
        r = p["runnel"] if clip == "idle" else max(0.0, min(1.0, (sag - .2) / .8))
        self.runnels[0].co = (.78 + .10 * r, -.48, -.30 - .40 * r)
        self.runnels[0].radius = .24 - .08 * r
        self.runnels[1].co = (-.62 - .05 * r, -.60, -.10 - .45 * r)
        self.runnels[1].radius = .21 - .07 * r
        for item in self.runnels:
            keyel(item, frame)
        fall = max(0.0, min(1.0, (r - .55) / .45))
        self.drop.location = (.90 + .04 * fall, -.54, -.62 - .30 * fall)
        size = .07 * (1 - fall * .5) if fall > 0 else .001
        self.drop.scale = (size, size, size * (1.3 - .3 * fall))
        self.drop.keyframe_insert("location", frame=frame)
        self.drop.keyframe_insert("scale", frame=frame)
        for k, item in enumerate(self.pod):
            own = lagged("reach", .45 * k)
            s = k / (len(self.pod) - 1)
            along = self.pod_root.lerp(self.pod_tip, s * own)
            item.co = along + Vector((0, 0, .22 * math.sin(math.pi * s) * own))
            item.radius = (.44 - .028 * k) * (.55 + .45 * own) if own > .02 else .30 - .02 * k
            keyel(item, frame)

        for i, plate in enumerate(self.plates):
            lift = lagged("lift", .3 * (i % 4))
            plate.location = (0, 0, self.prop["plate_radius"] + .16 * lift + .06 * heave - .02 * gather)
            plate.rotation_euler = (rad(14 * lift * (1 if i % 2 else -1)),
                                    rad(10 * lift * (1 if i % 3 else -1)), plate.rotation_euler.z)
            plate.keyframe_insert("location", frame=frame)
            plate.keyframe_insert("rotation_euler", frame=frame)
        for i, plate in enumerate(self.fresh):
            grow = max(0.001, lagged("fresh", .4 * i))
            plate.scale = (.16 * grow, .14 * grow, .07 * grow)
            plate.location = (0, 0, .82 + .06 * heave)
            plate.keyframe_insert("scale", frame=frame)
            plate.keyframe_insert("location", frame=frame)

        if self.has_eye:
            self.eye_root.location = (.40 + .06 * heave, -.70 - .04 * heave, .62 + .20 * heave - .08 * gather - .06 * sag)
            self.eye_root.keyframe_insert("location", frame=frame)
            self.pupil.location = (.02 + .06 * p["glance"], -.10, -.01 * p["glance"])
            self.pupil.keyframe_insert("location", frame=frame)
            self.lid.scale = (.27, .19, .07)
            self.lid.location = (0, .01 - .03 * p["blink"], .12 - .17 * p["blink"])
            self.lid.keyframe_insert("scale", frame=frame)
            self.lid.keyframe_insert("location", frame=frame)
