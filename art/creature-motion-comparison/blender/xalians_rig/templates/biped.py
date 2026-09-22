"""Biped template: a two-legged runner with a horizontal torso, jaws, arm wings, and a tail.

Built first for Dromeus (a partly feathered ground bird with lizard features)
and generalized for Akinza (an upright eared feline). Everything that
differs between them is a proportion or an anatomy switch with the Dromeus
value as default: torso pitch, neck and shoulder and hip placement, teeth,
plumes, arm wings, ears, eye size, tail droop. Legs are solved against
ground contacts that step with the body, so a lunge plants the feet ahead
and the recovery hops them back. Performance parameters: ``wspread`` opens
arm wings, ``swipe`` swings the arms forward for a claw strike, ``jaw`` opens
the mouth.
"""

import math

import bpy
from mathutils import Euler, Matrix, Vector

from ..builders import egg, empty, feather, leaf_surface, sphere, tube
from ..motion import Loop, Track, key, solve_two_link
from ..skin import Skeleton, hide_render, skin_object, world_of

TAU = math.tau
rad = math.radians

DEFAULT_PROPORTIONS = {
    "torso_scale": [.34, .30, .60],
    "torso_center": [.06, 0, -.02],
    "head_length": .58,
    "neck_length": .50,
    "thigh": .40,
    "shin": .42,
    "ground_z": -.95,
    "tail_length": .85,
    "arm_length": .34,
    "wing_feather_length": .55,
    "lunge": .45,
    "hop": .55,
    "crouch_drop": .14,
    "torso_pitch": 78,
    "neck_root": [.34, -.02, .16],
    "neck_forward": .55,
    "neck_up": .82,
    "shoulder": [.26, .22, .14],
    "ear_spread": .12,
    "ear_tilt": 18,
    "tail_lift": -1,
    "swipe_reach": 125,
    "hip": [-.11, .17, -.26],
    "hip_stagger": .10,
    "tail_root": [-.30, 0, -.08],
    "tail_droop": [8, 4],
    "eye_scale": 1.0,
    "ear_length": .0,
}

DEFAULT_PARAMS = dict(breath=0.0, notice=0.0, crouch=0.0, rise=0.0, fwd=0.0, lean=0.0,
                      wspread=0.0, swipe=0.0, jaw=0.0, hpitch=0.0, hyaw=0.0, tail=0.0, land=0.0, sway=0.0)


class Biped:
    def __init__(self, spec, palette):
        self.spec = spec
        self.P = palette
        self.prop = {**DEFAULT_PROPORTIONS, **spec.get("proportions", {})}
        anatomy = spec.get("anatomy", {})
        self.teeth = anatomy.get("teeth", 6)
        self.tail_segments = anatomy.get("tail_segments", 3)
        self.tail_plumes = anatomy.get("tail_plumes", 3)
        self.crown_plumes = anatomy.get("crown_plumes", 3)
        self.wing_feathers = anatomy.get("wing_feathers", 4)
        self.back_feathers = anatomy.get("back_feathers", 4)
        self.ears = anatomy.get("ears", 0)
        self.toe_claws = anatomy.get("toe_claws", True)
        self.parts = {}
        self._build()
        self.tracks = {
            "action": Track(DEFAULT_PARAMS, spec["performance"]["action"]["keys"]),
            "idle": Loop(DEFAULT_PARAMS, spec["clips"]["idle"][1], self._idle),
        }

    def _feather(self, name, parent, tip, width, face, **kwargs):
        feather(name, parent, tip, width, face, self.P["ink"], self.P["plume_light"], **kwargs)

    # ------------------------------------------------------------ building
    def _build(self):
        P = self.P
        prop = self.prop
        self.stage = empty("%s | animator root" % self.spec["species"])
        self.body = empty("torso | run, crouch and lunge", self.stage)
        ts = tuple(prop["torso_scale"])
        tc = tuple(prop["torso_center"])
        # Local +Z of the egg points forward (+X) so the taper is the rump.
        pitch = prop["torso_pitch"]
        egg("torso outline", self.body, (tc[0], tc[1] + .04, tc[2]), tuple(s * 1.06 for s in ts), P["ink"],
            rotation=(0, rad(pitch), 0), taper=.42)
        self.torso = egg("torso hide", self.body, tc, ts, P["hide"], rotation=(0, rad(pitch), 0), taper=.42, shape_keys=True)
        belly_shift = Vector((.06, -.16, -.14)) if pitch > 45 else Vector((.10, -.16, -.06))
        egg("belly", self.body, (tc[0] + belly_shift.x, tc[1] + belly_shift.y, tc[2] + belly_shift.z),
            (.24, .16, .46) if pitch > 45 else (.22, .14, .40), P["belly"], rotation=(0, rad(pitch + 6), 0), taper=.5)
        back = empty("back plumage", self.body, (-.10, -.02, .30))
        for i in range(self.back_feathers):
            pivot = empty("back feather pivot %s" % i, back, (.16 - .12 * i, -.05 - .02 * (i % 2), -.01 * i),
                          (0, rad(118 + i * 6), 0))
            self._feather("back feather %s" % i, pivot, (.34 - .02 * i, 0), .17,
                          P["plume"] if i % 2 else P["plume_deep"], bend=.03, peak=.45)

        # Neck and head.
        neck_len = prop["neck_length"]
        self.neck = empty("neck | reach", self.body, tuple(prop["neck_root"]))
        nf, nu = neck_len * prop["neck_forward"], neck_len * prop["neck_up"]
        tube("neck", self.neck, (0, 0, 0), (nf, 0, nu), .16, P["hide"], 12, .8)
        tube("neck outline", self.neck, (-.01, .03, 0), (nf, .03, nu), .175, P["ink"], 12, .8)
        self.head = empty("head | jaws", self.neck, (nf, 0, nu))
        hl = prop["head_length"]
        sphere("skull outline", self.head, (.06, .02, .02), (.25, .19, .19), P["ink"])
        sphere("skull", self.head, (.06, -.01, .02), (.24, .18, .18), P["hide_light"])
        self.upper_jaw = empty("upper jaw", self.head, (.18, 0, 0))
        tube("snout", self.upper_jaw, (0, 0, .03), (hl * .78, 0, -.03), .12, P["hide_light"], 10, .35)
        tube("snout outline", self.upper_jaw, (-.02, .03, .03), (hl * .78, .03, -.03), .13, P["ink"], 10, .35)
        self.lower_jaw = empty("lower jaw | hinge", self.head, (.14, 0, -.09))
        tube("mandible", self.lower_jaw, (0, 0, 0), (hl * .70, 0, -.02), .085, P["hide"], 10, .35)
        tube("mandible outline", self.lower_jaw, (-.02, .03, 0), (hl * .70, .03, -.02), .095, P["ink"], 10, .35)
        sphere("tongue", self.lower_jaw, (.14, -.02, .02), (.12, .05, .03), P["tongue"])
        for i in range(self.teeth):
            x = .10 + i * (hl * .60 / max(1, self.teeth - 1))
            tube("upper tooth %s" % i, self.upper_jaw, (x, -.07, -.05), (x + .01, -.07, -.11), .022, P["tooth"], 6, .05)
            tube("lower tooth %s" % i, self.lower_jaw, (x - .03, -.06, .02), (x - .02, -.06, .08), .02, P["tooth"], 6, .05)
        self.bite_point = empty("bite point", self.head, (.18 + hl * .55, -.02, -.05))
        self.snout_tip = empty("snout tip", self.upper_jaw, (hl * .78, 0, -.03))
        es = prop["eye_scale"]
        sphere("eye rim", self.head, (.13, -.15, .08), (.075 * es, .04 * es, .07 * es), P["ink"])
        sphere("eye", self.head, (.135, -.17 - .01 * (es - 1), .08), (.06 * es, .03 * es, .055 * es), P["eye"])
        self.pupil = sphere("pupil", self.head, (.16, -.19 - .01 * (es - 1), .08), (.02 * es, .015 * es, .04 * es), P["ink"])
        sphere("brow ridge", self.head, (.12, -.13, .14), (.10, .045, .03), P["hide"])
        self.ear_pivots = []
        for i in range(self.ears):
            side = -1 if i % 2 == 0 else 1
            pivot = empty("ear pivot %s" % i, self.head, (-.02, side * prop["ear_spread"], .18),
                          (rad(side * -prop["ear_tilt"]), rad(-95), 0))
            leaf_surface("ear %s" % i, pivot, (prop["ear_length"], 0), prop["ear_length"] * .42, P["hide"], side * .015, cup=-.03, peak=.35)
            leaf_surface("ear inner %s" % i, pivot, (prop["ear_length"] * .8, 0), prop["ear_length"] * .24, P["belly"],
                         side * -.01, cup=-.02, peak=.35)
            self.ear_pivots.append(pivot)
        self.crown = []
        for i in range(self.crown_plumes):
            pivot = empty("crown plume pivot %s" % i, self.head, (-.06 - .05 * i, .02 - .03 * i, .12), (0, rad(150 + i * 10), 0))
            self._feather("crown plume %s" % i, pivot, (.42 - .04 * i, 0), .12, P["plume"] if i % 2 else P["plume_light"],
                          bend=.05, peak=.5)
            self.crown.append(pivot)

        # Arm wings: shoulder, upper arm, forearm with primaries, clawed hand.
        arm = prop["arm_length"]
        self.arms = {}
        sx, sy, sz = prop["shoulder"]
        for side, y, sign in (("far", sy, 1), ("near", -sy - .02, -1)):
            shoulder = empty("%s shoulder" % side, self.body, (sx, y, sz))
            sphere("%s shoulder cap" % side, shoulder, (0, 0, 0), (.10, .08, .10), P["hide"])
            tube("%s upper arm" % side, shoulder, (0, 0, 0), (0, 0, -arm), .055, P["hide"], 9, .8)
            elbow = empty("%s elbow" % side, shoulder, (0, 0, -arm))
            tube("%s forearm" % side, elbow, (0, 0, 0), (arm * .9, 0, -.05), .045, P["hide_light"], 9, .8)
            self.wing_pivots = getattr(self, "wing_pivots", {})
            self.wing_pivots[side] = []
            for i in range(self.wing_feathers):
                pivot = empty("%s wing feather pivot %s" % (side, i), elbow, (.05 + i * .07, sign * .015, -.01),
                              (0, rad(-150 + i * 4), 0))
                self._feather("%s wing feather %s" % (side, i), pivot,
                              (prop["wing_feather_length"] - .05 * i, 0), .15,
                              P["plume"] if i % 2 else P["plume_deep"], bend=.03, peak=.55)
                self.wing_pivots[side].append(pivot)
            hand = empty("%s hand" % side, elbow, (arm * .9, 0, -.05))
            if self.wing_feathers == 0:
                sphere("%s palm" % side, hand, (0, 0, 0), (.04, .035, .03), P["hide"])
            for claw, (dx, dz) in enumerate(((.13, -.04), (.11, -.10), (.06, -.13))):
                tube("%s hand claw %s" % (side, claw), hand, (0, 0, 0), (dx, sign * .02 * claw, dz), .018, P["claw"], 6, .1)
            self.arms[side] = {"shoulder": shoulder, "elbow": elbow, "hand": hand, "sign": sign}

        # Tail: rigid segments that lag, plumes at the tip.
        self.tail = []
        parent = self.body
        seg = prop["tail_length"] / self.tail_segments
        for i in range(self.tail_segments):
            pivot = empty("tail segment %s" % i, parent, tuple(prop["tail_root"]) if i == 0 else (-seg, 0, 0))
            tube("tail %s" % i, pivot, (0, 0, 0), (-seg, 0, 0), .11 - .025 * i, P["hide"], 10, .75)
            tube("tail outline %s" % i, pivot, (0, .03, 0), (-seg, .03, 0), .12 - .025 * i, P["ink"], 10, .75)
            self.tail.append(pivot)
            parent = pivot
        tip = empty("tail plume root", parent, (-seg, 0, 0))
        for i in range(self.tail_plumes):
            pivot = empty("tail plume pivot %s" % i, tip, (0, -.03 + .03 * i, 0), (0, rad(168 + (i - 1) * 16), 0))
            self._feather("tail plume %s" % i, pivot, (.50 - .06 * abs(i - 1), 0), .16,
                          P["plume"] if i == 1 else P["plume_deep"], bend=.05, peak=.55)

        # Legs, solved against stepping ground contacts.
        self.legs = []
        thigh, shin = prop["thigh"], prop["shin"]
        hx, hy, hz = prop["hip"]
        for side, (x, y) in enumerate(((hx - prop["hip_stagger"] / 2, hy - .01), (hx + prop["hip_stagger"] / 2, -hy - .01))):
            hip = empty("hip %s" % side, self.stage, (x, y, hz))
            tube("thigh %s" % side, hip, (0, 0, .16), (0, 0, -thigh), .13, P["trouser"], 10, .5)
            tube("thigh outline %s" % side, hip, (0, .03, .16), (0, .03, -thigh), .14, P["ink"], 10, .5)
            knee = empty("knee %s" % side, hip, (0, 0, -thigh))
            tube("shin %s" % side, knee, (0, 0, 0), (0, 0, -shin), .055, P["hide"], 9, .8)
            sphere("hock %s" % side, knee, (0, 0, 0), (.065, .06, .065), P["hide"])
            foot = empty("foot %s" % side, knee, (0, 0, -shin))
            sphere("ankle %s" % side, foot, (0, 0, .02), (.07, .06, .06), P["hide"])
            for toe, (dx, dy) in enumerate(((.24, -.05), (.20, .06), (-.09, 0))):
                tube("toe %s %s" % (side, toe), foot, (0, 0, 0), (dx, dy, -.03), .032, P["hide_light"], 7, .6)
                if self.toe_claws:
                    tube("toe claw %s %s" % (side, toe), foot, (dx, dy, -.03), (dx * 1.25, dy, -.07), .02, P["claw"], 6, .1)
            if self.toe_claws:
                tube("hooked claw %s" % side, foot, (.10, -.06, .0), (.14, -.08, .14), .028, P["claw"], 6, .2)
            toe_tips = [empty("toe tip %s %s" % (side, toe), foot, (dx, dy, -.03))
                        for toe, (dx, dy) in enumerate(((.24, -.05), (.20, .06), (-.09, 0)))]
            self.legs.append({"hip": hip, "knee": knee, "foot": foot, "base": Vector((x + .06, y, prop["ground_z"])),
                              "local": Vector((x, y, hz)), "lag": 0.0 if side == 1 else 1.5, "toes": toe_tips})
        self.parts.update({"bite": self.bite_point, "pupil": self.pupil, "foot": self.legs[1]["foot"],
                           "hand": self.arms["near"]["hand"]})

    # ------------------------------------------------------------ performance
    @staticmethod
    def _idle(frame, t):
        return {"breath": .5 - .5 * math.cos(TAU * t), "sway": math.sin(TAU * t),
                "hyaw": -3 * math.sin(TAU * t + .8), "hpitch": 2 * math.sin(TAU * t), "tail": .15 * math.sin(TAU * t + 2)}

    def track(self, clip):
        return self.tracks[clip]

    def apply_pose(self, frame, clip):
        track = self.tracks[clip]
        p = track.at(frame)
        lagged = lambda name, lag: track.at(frame - lag)[name]
        prop = self.prop

        body_z = -prop["crouch_drop"] * p["crouch"] + prop["hop"] * p["rise"] - .04 * p["land"] + .01 * p["breath"]
        self.body.location = (prop["lunge"] * p["fwd"], 0, body_z)
        self.body.rotation_euler = (0, rad(p["lean"]), 0)
        key(self.body, frame)
        keys = self.torso.data.shape_keys.key_blocks
        keys["breathe"].value = p["breath"]
        keys["crouch"].value = max(0.0, p["crouch"] * .6 + p["land"] * .5)
        keys["stretch"].value = max(0.0, min(1.0, p["rise"] * 2.0 - p["land"]))
        for block in ("breathe", "crouch", "stretch"):
            keys[block].keyframe_insert("value", frame=frame)

        notice = p["notice"]
        self.neck.rotation_euler = (0, rad(18 * p["crouch"] - 22 * p["rise"] - 6 * notice), rad(.5 * p["hyaw"]))
        key(self.neck, frame, ("rotation_euler",))
        self.head.rotation_euler = (0, rad(p["hpitch"] - 18 * p["crouch"] + 16 * p["rise"] + 4 * notice), rad(p["hyaw"]))
        key(self.head, frame, ("rotation_euler",))
        jaw = max(0.0, min(1.0, p["jaw"]))
        self.lower_jaw.rotation_euler = (0, rad(34 * jaw), 0)
        self.upper_jaw.rotation_euler = (0, rad(-10 * jaw), 0)
        key(self.lower_jaw, frame, ("rotation_euler",))
        key(self.upper_jaw, frame, ("rotation_euler",))
        for i, pivot in enumerate(self.crown):
            lift = lagged("notice", .5 * i) * 16 + lagged("rise", .4 * i) * 14 - lagged("fwd", .8 + .4 * i) * 10
            pivot.rotation_euler = (0, rad(150 + i * 10 - lift + 2 * p["sway"]), 0)
            key(pivot, frame, ("rotation_euler",))
        for i, pivot in enumerate(self.ear_pivots):
            side = -1 if i % 2 == 0 else 1
            prick = lagged("notice", .4 * i) * 14 - p["crouch"] * 18 + (p["fwd"] - lagged("fwd", 1.2)) * -60
            pivot.rotation_euler = (rad(side * (-prop["ear_tilt"] - 6 * lagged("notice", .4 * i))), rad(-95 - prick + 2 * p["sway"] * side), 0)
            key(pivot, frame, ("rotation_euler",))

        for side, arm in self.arms.items():
            sign = arm["sign"]
            spread = lagged("wspread", .4 if side == "far" else 0.0)
            # Folded: upper arm hangs back along the ribs. Spread: the arm swings
            # out and back, the forearm flips the primaries up into a wing.
            swipe = lagged("swipe", .5 if side == "far" else 0.0)
            arm["shoulder"].rotation_euler = (rad(sign * 14 * spread), rad(35 + 100 * spread + 8 * p["crouch"] - prop["swipe_reach"] * swipe),
                                              rad(sign * 10 * spread - sign * 12 * swipe))
            arm["elbow"].rotation_euler = (0, rad(-55 * spread - 12 * swipe), 0)
            key(arm["shoulder"], frame, ("rotation_euler",))
            key(arm["elbow"], frame, ("rotation_euler",))
            for i, pivot in enumerate(self.wing_pivots[side]):
                own = lagged("wspread", .3 * i + (.4 if side == "far" else 0.0))
                pivot.rotation_euler = (0, rad(-150 + i * 4 + (i - 1.5) * 12 * own + 20 * own), 0)
                key(pivot, frame, ("rotation_euler",))

        for i, pivot in enumerate(self.tail):
            lag = .8 + .7 * i
            whip = (lagged("fwd", lag) - p["fwd"]) * 40 + (p["rise"] - lagged("rise", lag)) * 30
            lift = p["tail"] * 14 + p["crouch"] * 8 - p["rise"] * 6
            base = prop["tail_droop"][0] if i == 0 else prop["tail_droop"][1]
            pivot.rotation_euler = (0, rad(base + prop["tail_lift"] * lift + whip + 1.5 * p["sway"] * (i + 1)), 0)
            key(pivot, frame, ("rotation_euler",))

        body_matrix = Matrix.Translation(self.body.location) @ Euler(self.body.rotation_euler).to_matrix().to_4x4()
        for leg in self.legs:
            hip_world = body_matrix @ leg["local"]
            step = lagged("fwd", leg["lag"])
            speed = abs(lagged("fwd", leg["lag"]) - lagged("fwd", leg["lag"] + 1.0))
            target = leg["base"] + Vector((prop["lunge"] * step * .92, 0, min(.16, speed * 5.0)))
            thigh_rot, knee_rot = solve_two_link(hip_world, target, prop["thigh"], prop["shin"], (.2, 0, -.8))
            leg["hip"].location = hip_world
            leg["hip"].rotation_euler = (0, thigh_rot, 0)
            leg["knee"].rotation_euler = (0, knee_rot, 0)
            leg["foot"].rotation_euler = (0, -(thigh_rot + knee_rot) + rad(6) - rad(25) * min(1.0, speed * 8), 0)
            key(leg["hip"], frame)
            key(leg["knee"], frame, ("rotation_euler",))
            key(leg["foot"], frame, ("rotation_euler",))

    # ------------------------------------------------------------ skin body
    #: Primitive parts the skin body replaces (matched by object name).
    SKIN_REPLACES = ("torso", "belly", "neck", "skull", "snout", "mandible", "tail 0", "tail 1", "tail 2",
                     "thigh", "shin", "hock", "ankle", "toe 0", "toe 1", "toe 2", "shoulder cap",
                     "upper arm", "forearm", "brow ridge", "toe claw")

    def finish(self, scene, frames):
        """When the spec asks for ``"body": "skin"``, grow one smooth body over the posed joints."""
        if self.spec.get("anatomy", {}).get("body") != "skin":
            return
        P = self.P
        prop = self.prop
        R = {**DEFAULT_SKIN, **self.spec.get("skin", {})}
        tc = Vector(prop["torso_center"])
        ts = prop["torso_scale"]
        pitch = rad(prop["torso_pitch"])
        # The torso's long axis (local +Z of the egg) points forward when pitched.
        axis = Vector((math.sin(pitch), 0, math.cos(pitch)))
        chest = tc + axis * ts[2] * .55
        rump = tc - axis * ts[2] * .55
        sk = Skeleton()
        sk.joint("rump", world_of(self.body, rump), R["rump"])
        sk.joint("torso", world_of(self.body, tc), R["torso"])
        sk.joint("chest", world_of(self.body, chest), R["chest"])
        sk.joint("neck root", world_of(self.neck), R["neck_root"])
        nf, nu = prop["neck_length"] * prop["neck_forward"], prop["neck_length"] * prop["neck_up"]
        sk.joint("neck", world_of(self.neck, (nf * .5, 0, nu * .5)), R["neck"])
        sk.joint("head", world_of(self.head, (.06, 0, .02)), R["head"])
        sk.joint("snout root", world_of(self.upper_jaw, (.02, 0, 0)), R["snout_root"])
        sk.joint("snout", world_of(self.snout_tip), R["snout"])
        sk.chain("rump", "torso", "chest", "neck root", "neck", "head", "snout root", "snout")
        seg = prop["tail_length"] / self.tail_segments
        previous = "rump"
        for i, pivot in enumerate(self.tail):
            name = sk.joint("tail %s" % i, world_of(pivot), R["tail"] * (1 - .22 * i))
            sk.chain(previous, name)
            previous = name
        tip = sk.joint("tail tip", world_of(self.tail[-1], (-seg, 0, 0)), R["tail_tip"])
        sk.chain(previous, tip)
        for side, leg in enumerate(self.legs):
            hip = sk.joint("hip %s" % side, world_of(leg["hip"], (0, 0, .10)), R["hip"])
            thigh = sk.joint("thigh %s" % side, world_of(leg["hip"], (0, 0, -prop["thigh"] * .45)), R["thigh"])
            knee = sk.joint("knee %s" % side, world_of(leg["knee"]), R["knee"])
            shin = sk.joint("shin %s" % side, world_of(leg["knee"], (0, 0, -prop["shin"] * .5)), R["shin"])
            foot = sk.joint("foot %s" % side, world_of(leg["foot"], (0, 0, .01)), R["foot"])
            sk.chain("torso", hip, thigh, knee, shin, foot)
            for t, toe in enumerate(leg["toes"]):
                name = sk.joint("toe %s %s" % (side, t), world_of(toe), R["toe"])
                sk.chain(foot, name)
        for side, arm in self.arms.items():
            shoulder = sk.joint("%s shoulder" % side, world_of(arm["shoulder"]), R["shoulder"])
            elbow = sk.joint("%s elbow" % side, world_of(arm["elbow"]), R["elbow"])
            hand = sk.joint("%s hand" % side, world_of(arm["hand"]), R["hand"])
            sk.chain("chest", shoulder, elbow, hand)
        self.skin_body = skin_object("%s skin body" % self.spec["species"], sk, P["hide"], "torso", frames, scene,
                                     subdivisions=R["subdivisions"], smooth=R["branch_smoothing"])

        # The pale belly is a second skin chain riding just proud of the hide.
        belly = Skeleton()
        down = Vector((0, 0, -1))
        drop = ts[0] * R["belly_drop"]
        belly.joint("belly rear", world_of(self.body, rump + axis * ts[2] * .15 + down * drop), R["belly"] * .75)
        belly.joint("belly", world_of(self.body, tc + down * drop), R["belly"])
        belly.joint("belly front", world_of(self.body, chest - axis * ts[2] * .12 + down * drop * .9), R["belly"] * .85)
        belly.joint("throat", world_of(self.neck, (nf * .35, 0, nu * .35 - .09)), R["belly"] * .45)
        belly.chain("belly rear", "belly", "belly front", "throat")
        self.skin_belly = skin_object("%s skin underside" % self.spec["species"], belly, P["belly"], "belly", frames, scene,
                                      subdivisions=R["subdivisions"], smooth=R["branch_smoothing"])

        # The lower jaw is rigid in its own pivot, so it needs no per-frame keys.
        jaw = Skeleton()
        jaw.joint("jaw root", lambda: Vector((0, 0, 0)), R["jaw_root"])
        jaw.joint("jaw tip", lambda: Vector((prop["head_length"] * .70, 0, -.02)), R["jaw_tip"])
        jaw.chain("jaw root", "jaw tip")
        self.skin_jaw = skin_object("%s skin lower jaw" % self.spec["species"], jaw, P["hide"], "jaw root", frames[:1], scene,
                                    parent=self.lower_jaw, subdivisions=R["subdivisions"])

        hide_render(bpy.data.objects, self.SKIN_REPLACES)


#: Skin radii (scene units) for the biped joints; a spec's ``skin`` block overrides any of them.
DEFAULT_SKIN = {
    "rump": .26, "torso": .30, "chest": .27, "neck_root": .17, "neck": .13, "head": .17, "snout_root": .12, "snout": .05,
    "tail": .10, "tail_tip": .035, "hip": .16, "thigh": .12, "knee": .06, "shin": .05, "foot": .06, "toe": .03,
    "shoulder": .07, "elbow": .045, "hand": .035, "belly": .22, "belly_drop": .55, "jaw_root": .07, "jaw_tip": .035,
    "subdivisions": 2, "branch_smoothing": .5,
}
