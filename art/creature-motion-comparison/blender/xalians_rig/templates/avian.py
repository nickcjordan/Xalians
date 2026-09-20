"""Avian template: a perching bird made of rigid feather parts on pivots.

Anatomy switches read from the ratified record's keys: ``wings`` (always),
``crest``, ``tail``, ``talons`` (legs solved against the perch), and a beak
that is either ``simple`` or ``radial_flower``. Proportions and the
performance track come from the spec; the defaults reproduce the Avilily
second pass exactly.
"""

import math

from mathutils import Euler, Matrix, Vector

from ..builders import egg, empty, feather, leaf_surface, sphere, tube
from ..motion import Loop, Track, key, solve_two_link

TAU = math.tau
rad = math.radians

DEFAULT_PROPORTIONS = {
    "body_scale": [.44, .38, .70],
    "wing_length": 1.08,
    "streamer_length": 1.45,
    "petal_length": .56,
    "petal_width": .29,
    "thigh": .30,
    "shin": .33,
    "perch_z": -.95,
    "hop": .75,
    "crouch_drop": .16,
}

DEFAULT_PARAMS = dict(breath=0.0, notice=0.0, crouch=0.0, rise=0.0, fwd=0.0, lean=0.0,
                      wraise=0.0, wspread=0.0, hpitch=0.0, hyaw=0.0, opn=0.0, throat=0.0,
                      bead=0.0, land=0.0, tail=0.0, sway=0.0)


class Avian:
    def __init__(self, spec, palette):
        self.spec = spec
        self.P = palette
        self.prop = {**DEFAULT_PROPORTIONS, **spec.get("proportions", {})}
        anatomy = spec.get("anatomy", {})
        self.beak_kind = anatomy.get("beak", "radial_flower")
        self.crest_count = anatomy.get("crest", 3)
        self.streamer_count = anatomy.get("streamers", 2)
        self.tail_count = anatomy.get("tail", 3)
        self.flank_rows = anatomy.get("flank_rows", 2)
        self.parts = {}
        self._build()
        self.tracks = {
            "action": Track(DEFAULT_PARAMS, spec["performance"]["action"]["keys"]),
            "idle": Loop(DEFAULT_PARAMS, spec["clips"]["idle"][1], self._idle),
        }

    # ------------------------------------------------------------ building
    def _feather(self, name, parent, tip, width, face, **kwargs):
        feather(name, parent, tip, width, face, self.P["ink"], self.P["leaf_light"], **kwargs)

    def _build(self):
        P = self.P
        prop = self.prop
        self.stage = empty("%s | animator root" % self.spec["species"])
        self.body = empty("body | flit, crouch and hop", self.stage)
        body_scale = tuple(prop["body_scale"])
        egg("body outline", self.body, (0, .05, 0), tuple(s * 1.06 for s in body_scale), P["ink"], taper=.36)
        self.body_mesh = egg("feathered body", self.body, (0, -.01, .01), body_scale, P["leaf"], taper=.36, shape_keys=True)
        egg("pale breast", self.body, (.19, -.30, -.02), (.29, .13, .50), P["breast"], rotation=(0, rad(6), 0), taper=.5)
        egg("neck", self.body, (.14, -.02, .62), (.30, .27, .26), P["leaf"], taper=.05)
        egg("neck outline", self.body, (.13, .03, .62), (.33, .30, .28), P["ink"], taper=.05)

        flank = empty("near flank contour feathers", self.body, (-.04, -.31, .12))
        for row in range(self.flank_rows):
            for col in range(3):
                pivot = empty("flank feather pivot %s %s" % (row, col), flank,
                              (-.10 + col * .11 - row * .06, -.015 * row, -.02 - row * .19),
                              (0, rad(150 - col * 6), 0))
                leaf_surface("flank feather %s %s" % (row, col), pivot, (.26, 0), .19,
                             P["leaf_deep"] if row else P["leaf"], -.02, peak=.4)

        self.tail_feathers = []
        if self.tail_count:
            tail_root = empty("tail | fan", self.body, (-.22, .04, -.58))
            for i in range(self.tail_count):
                pivot = empty("tail feather pivot %s" % i, tail_root, (0, -.04 + .04 * i, 0),
                              (0, rad(152 + i * 11), 0))
                self._feather("tail feather %s" % i, pivot, (.62 - .05 * abs(i - 1), 0), .20,
                              P["leaf_deep"] if i == 1 else P["leaf"], bend=.04, vein=i == 1, peak=.6)
                self.tail_feathers.append(pivot)

        wing_len = prop["wing_length"]
        self.wing_roots = {}
        self.primaries = {"near": [], "far": []}
        for side, y, face, sign in (("far", .32, P["leaf_deep"], 1), ("near", -.34, P["leaf"], -1)):
            root = empty("%s wing | shoulder" % side, self.body, (-.09, y, .44))
            self.wing_roots[side] = root
            sphere("%s shoulder" % side, root, (-.02, sign * .02, .02), (.17, .10, .15), face)
            for i in range(5):
                pivot = empty("%s primary pivot %s" % (side, i), root, (.02 * i, sign * .012 * (4 - i), -.03 * i))
                self._feather("%s primary %s" % (side, i), pivot, (wing_len - .07 * i, .05 - .02 * i),
                              .30 - .03 * i, face if i % 2 else P["leaf_light"], bend=.05 * (2 - i) / 2,
                              vein=i in (0, 2, 4), peak=.55)
                self.primaries[side].append(pivot)
            for i in range(3):
                covert = empty("%s covert pivot %s" % (side, i), root,
                               (.05 + .06 * i, sign * .07, .05 - .04 * i), (0, rad(-4 + i * 6), 0))
                leaf_surface("%s covert %s" % (side, i), covert, (.42 - .04 * i, .02), .19,
                             P["leaf_light"] if i == 1 else face, sign * .01, peak=.4)

        self.head = empty("head | attention and bloom", self.body, (.27, -.04, .86))
        sphere("head contour", self.head, (.02, .02, .10), (.40, .35, .38), P["ink"])
        sphere("face", self.head, (.03, -.04, .11), (.38, .35, .365), P["leaf_light"])
        sphere("cheek plumage", self.head, (.24, -.22, -.03), (.15, .15, .17), P["leaf"])
        sphere("brow feather", self.head, (.24, -.33, .28), (.12, .05, .045), P["leaf_deep"])
        self.crests = []
        angles = (118, 100, 82)
        for i in range(self.crest_count):
            crest = empty("crest pivot %s" % i, self.head, (-.12 + i * .10, -.02, .38), (0, rad(angles[i % 3]), 0))
            self._feather("crest leaf %s" % i, crest, (.55, 0), .16, P["leaf_deep"] if i == 1 else P["leaf"],
                          vein=i == 1, peak=.45)
            self.crests.append(crest)

        sphere("eye dark rim", self.head, (.22, -.36, .22), (.13, .05, .11), P["ink"])
        sphere("eye ivory", self.head, (.23, -.39, .225), (.105, .04, .088), P["white"])
        self.pupil = sphere("pupil", self.head, (.265, -.42, .225), (.055, .028, .066), P["eye"])
        sphere("eye glint", self.head, (.278, -.445, .255), (.018, .012, .019), P["white"])

        self.streamers = []
        for i in range(self.streamer_count):
            pivot = empty("head streamer %s" % i, self.head, (-.22 - .08 * i, .10 + .08 * i, .06),
                          (0, rad(138 + i * 8), 0))
            self._feather("trailing long feather %s" % i, pivot, (prop["streamer_length"] - i * .12, 0),
                          .20 - .03 * i, P["leaf_deep"] if i == 0 else P["leaf"], bend=-.12, vein=True, peak=.7)
            self.streamers.append(pivot)

        self._build_beak()
        self._build_legs()
        self.parts.update({"bead": self.bead, "pupil": self.pupil, "foot": self.legs[1]["foot"]})

    def _build_beak(self):
        P = self.P
        self.bloom = empty("flower beak | radial hinges", self.head, (.38, -.10, -.02), (0, rad(12), rad(-20)))
        sphere("beak base collar", self.bloom, (-.02, 0, 0), (.11, .13, .13), P["ink"])
        self.petals = []
        self.stamens = []
        if self.beak_kind == "simple":
            tube("upper bill", self.bloom, (0, 0, .03), (.42, 0, -.01), .10, P["petal"], 9, .15)
            tube("lower bill", self.bloom, (0, 0, -.04), (.34, 0, -.06), .08, P["petal_deep"], 9, .15)
            self.throat = sphere("throat", self.bloom, (.06, 0, -.01), (.06, .09, .05), P["throat"])
            self.bead = sphere("bead", self.bloom, (.40, -.02, -.03), (.001, .001, .001), P["petal_light"])
            return
        self.throat = sphere("dark nectar throat", self.bloom, (.12, 0, 0), (.16, .13, .13), P["throat"])
        self.bead = sphere("syrup bead", self.bloom, (.28, -.03, -.03), (.055, .05, .045), P["petal_light"])
        for i in range(3):
            angle = TAU * (i / 3 + .12)
            self.stamens.append(tube("stamen %s" % i, self.bloom, (.10, 0, 0),
                                     (.42, .07 * math.cos(angle), .07 * math.sin(angle)), .012, P["stamen"], 6, 1))
        petal_mats = (P["petal"], P["petal_light"], P["petal_deep"], P["petal"], P["petal_light"])
        for i in range(5):
            ring = empty("petal ring %s" % i, self.bloom, (0, 0, 0), (TAU * (i / 5 + .05), 0, 0))
            hinge = empty("petal hinge %s" % i, ring, (.04, 0, .085))
            petal = leaf_surface("flower petal %s" % i, hinge, (self.prop["petal_length"], 0),
                                 self.prop["petal_width"], petal_mats[i], cup=-.07, peak=.55)
            petal.rotation_euler = (rad(90), 0, 0)
            self.petals.append(hinge)

    def _build_legs(self):
        P = self.P
        thigh, shin = self.prop["thigh"], self.prop["shin"]
        self.legs = []
        for side, (x, y) in enumerate(((-.06, .14), (.10, -.14))):
            hip = empty("hip %s" % side, self.stage, (x, y, -.40))
            tube("thigh %s" % side, hip, (0, 0, .04), (0, 0, -thigh), .085, P["trouser"], 9, .7)
            knee = empty("knee %s" % side, hip, (0, 0, -thigh))
            tube("shin %s" % side, knee, (0, 0, 0), (0, 0, -shin), .052, P["talon"], 9, .85)
            sphere("knee joint %s" % side, knee, (0, 0, 0), (.06, .06, .06), P["talon"])
            foot = empty("foot %s" % side, knee, (0, 0, -shin))
            sphere("ankle %s" % side, foot, (0, 0, 0), (.07, .065, .06), P["talon"])
            for claw, (dx, dy) in enumerate(((.13, -.05), (.05, -.10), (-.10, -.04))):
                tube("curved grip %s %s" % (side, claw), foot, (0, 0, -.01), (dx, dy, -.10), .024, P["white"], 7)
            self.legs.append({"hip": hip, "knee": knee, "foot": foot,
                              "perch": Vector((x + .02, y, self.prop["perch_z"])),
                              "local": Vector((x, y, -.40))})

    # ------------------------------------------------------------ performance
    @staticmethod
    def _idle(frame, t):
        return {"breath": .5 - .5 * math.cos(TAU * t), "sway": math.sin(TAU * t),
                "hyaw": -2.5 * math.sin(TAU * t + .8), "hpitch": 1.5 * math.sin(TAU * t)}

    def track(self, clip):
        return self.tracks[clip]

    def apply_pose(self, frame, clip):
        track = self.tracks[clip]
        p = track.at(frame)
        lagged = lambda name, lag: track.at(frame - lag)[name]
        prop = self.prop

        body_z = -prop["crouch_drop"] * p["crouch"] + prop["hop"] * p["rise"] - .05 * p["land"] + .012 * p["breath"]
        self.body.location = (p["fwd"], 0, body_z)
        self.body.rotation_euler = (0, rad(p["lean"]), 0)
        key(self.body, frame)
        keys = self.body_mesh.data.shape_keys.key_blocks
        keys["breathe"].value = p["breath"]
        keys["crouch"].value = max(0.0, p["crouch"] * .8 + p["land"] * .5)
        keys["stretch"].value = max(0.0, min(1.0, p["rise"] * 2.2 - p["land"]))
        for block in ("breathe", "crouch", "stretch"):
            keys[block].keyframe_insert("value", frame=frame)

        notice = p["notice"]
        self.head.rotation_euler = (0, rad(p["hpitch"] - 4 * notice - 6 * p["crouch"]), rad(p["hyaw"]))
        self.head.location = (.27 - .07 * p["crouch"] + .05 * p["rise"], -.04, .86 - .05 * p["crouch"])
        key(self.head, frame)
        angles = (118, 100, 82)
        for i, crest in enumerate(self.crests):
            lift = lagged("notice", .6 * i) * 22 + lagged("rise", .5 * i) * 10 - p["crouch"] * 8
            crest.rotation_euler = (0, rad(angles[i % 3] - lift + 2 * p["sway"] * (i - 1)), 0)
            key(crest, frame, ("rotation_euler",))

        for i, streamer in enumerate(self.streamers):
            lag = 1.5 + i
            drag = (lagged("rise", lag) - p["rise"]) * 110 + (p["crouch"] - lagged("crouch", lag)) * 40
            drag += (p["fwd"] - lagged("fwd", lag)) * 160
            base = 138 + i * 8
            streamer.rotation_euler = (0, rad(base + drag + 4 * p["sway"] * (1 + .5 * i) - 6 * p["rise"]), 0)
            key(streamer, frame, ("rotation_euler",))

        for i, pivot in enumerate(self.tail_feathers):
            fan = lagged("tail", .4 * i) * (i - 1) * 14 - 6 * lagged("rise", .8)
            pivot.rotation_euler = (0, rad(152 + i * 11 + fan + 1.5 * p["sway"]), 0)
            key(pivot, frame, ("rotation_euler",))

        for side, sign in (("near", -1), ("far", 1)):
            raise_now = p["wraise"]
            root = self.wing_roots[side]
            # Rest points the primaries down and back; full raise sweeps them up
            # and back over the shoulder, never forward across the chest.
            root.rotation_euler = (rad(sign * (-18 * raise_now)), rad(148 + 92 * raise_now), rad(sign * 6 * raise_now))
            key(root, frame, ("rotation_euler",))
            for i, pivot in enumerate(self.primaries[side]):
                own = lagged("wraise", .45 * i)
                spread = lagged("wspread", .3 * i)
                fan = (i - 2) * (5 + 11 * spread) + (own - raise_now) * 60
                pivot.rotation_euler = (0, rad(fan), 0)
                key(pivot, frame, ("rotation_euler",))

        opened = max(0.0, min(1.0, p["opn"]))
        for i, hinge in enumerate(self.petals):
            own = lagged("opn", .35 * ((i * 2) % 5))
            hinge.rotation_euler = (0, rad(15 - 82 * max(-0.2, own)), 0)
            key(hinge, frame, ("rotation_euler",))
        if self.beak_kind == "simple":
            self.bloom.rotation_euler = (0, rad(12 - 10 * opened), rad(-20))
            key(self.bloom, frame, ("rotation_euler",))
        else:
            self.throat.scale = (.15 + .06 * p["throat"], .12 + .06 * p["throat"], .12 + .06 * p["throat"])
            self.throat.location = (.12 + .04 * p["throat"], 0, 0)
            key(self.throat, frame, ("scale", "location"))
        b = max(0.0, p["bead"])
        self.bead.scale = (.06 * b + .001, .055 * b + .001, .05 * b + .001)
        self.bead.location = (.30 + .10 * b, -.03, -.03 - .04 * b)
        key(self.bead, frame, ("scale", "location"))
        for stamen in self.stamens:
            stamen.scale = (1, 1, .05 + .95 * opened)
            stamen.keyframe_insert("scale", frame=frame)

        body_matrix = Matrix.Translation(self.body.location) @ Euler(self.body.rotation_euler).to_matrix().to_4x4()
        for leg in self.legs:
            hip_world = body_matrix @ leg["local"]
            thigh_rot, knee_rot = solve_two_link(hip_world, leg["perch"], prop["thigh"], prop["shin"], (.35, 0, -.65))
            leg["hip"].location = hip_world
            leg["hip"].rotation_euler = (0, thigh_rot, 0)
            leg["knee"].rotation_euler = (0, knee_rot, 0)
            leg["foot"].rotation_euler = (0, -(thigh_rot + knee_rot) - rad(4), 0)
            key(leg["hip"], frame)
            key(leg["knee"], frame, ("rotation_euler",))
            key(leg["foot"], frame, ("rotation_euler",))
