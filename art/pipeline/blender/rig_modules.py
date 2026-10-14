"""Rig modules: build a Blender armature from a skeleton class spec.

Each module builder is a pure function from its spec entry to a list of
``Joint`` plans (name, head, tail, parent, deform, socket). ``plan_skeleton``
runs every module in order; ``build_armature`` turns the plan into one
armature object in a single edit-mode pass. Only ``build_armature`` touches
bpy, so the planning half can be tested without Blender.
"""

from dataclasses import dataclass, field

SOCKETS = ("ground", "head", "eye_l", "eye_r", "emitter", "status", "carry")


@dataclass
class Joint:
    name: str
    head: tuple
    tail: tuple
    parent: str | None
    deform: bool = True
    socket: str | None = None
    module: str = ""
    connect: bool = False


@dataclass
class Plan:
    joints: list = field(default_factory=list)

    def names(self):
        return [j.name for j in self.joints]

    def get(self, name):
        for j in self.joints:
            if j.name == name:
                return j
        raise KeyError(name)

    def add(self, joint):
        if joint.parent is not None and joint.parent not in self.names():
            raise ValueError(f"{joint.name}: parent {joint.parent} is not built yet")
        if joint.name in self.names():
            raise ValueError(f"duplicate joint {joint.name}")
        self.joints.append(joint)


def lerp(a, b, u):
    return tuple(a[i] + (b[i] - a[i]) * u for i in range(3))


def mirror_points(points):
    return [(-p[0], p[1], p[2]) for p in points]


def joint_name(module, side, index):
    return f"{module}_{side}_{index:02d}" if side else f"{module}_{index:02d}"


def chain(plan, module, side, points, parent, deform=True):
    """Joints along consecutive points; each joint's tail is the next joint's head."""
    previous = parent
    for i in range(len(points) - 1):
        name = joint_name(module, side, i + 1)
        plan.add(Joint(name, tuple(points[i]), tuple(points[i + 1]), previous, deform,
                       module=module, connect=i > 0))
        previous = name
    return previous


def bowed(start, end, count, bow):
    """``count + 1`` points from start to end with a sine bow added on z."""
    import math
    pts = []
    for i in range(count + 1):
        u = i / count
        p = lerp(start, end, u)
        pts.append((p[0], p[1], p[2] + bow * math.sin(math.pi * u)))
    return pts


# -- module builders --------------------------------------------------------

def m_root(plan, spec, _all):
    plan.add(Joint("root", (0, 0, 0), (0, 0, 0.08), None, deform=False,
                   socket=spec.get("socket", "ground"), module="root"))


def m_spine(plan, spec, _all):
    pts = bowed(spec["from"], spec["to"], spec["count"], spec.get("arch", 0.0))
    chain(plan, "spine", None, pts, spec["parent"])


def m_neck_head(plan, spec, _all):
    if len(spec["neck"]) != spec["neckCount"] + 1:
        raise ValueError("neck_head: neck needs neckCount + 1 points")
    last = chain(plan, "neck", None, spec["neck"], spec["parent"])
    head = spec["head"]
    plan.add(Joint("head_01", tuple(head[0]), tuple(head[1]), last, module="head", connect=True))


def m_single(module):
    def build(plan, spec, _all):
        plan.add(Joint(f"{module}_01", tuple(spec["from"]), tuple(spec["to"]), spec["parent"],
                       deform=module != "horn", module=module))
    return build


def _points_for(spec, all_specs, key="points"):
    if "mirror" in spec:
        source = next(s for s in all_specs if s.get("module") == spec["module"]
                      and s.get("side") == spec["mirror"] and s.get("name") == spec.get("name"))
        return mirror_points(source[key])
    return spec[key]


def m_limb(plan, spec, all_specs):
    chain(plan, spec.get("name", "leg"), spec["side"], _points_for(spec, all_specs), spec["parent"])


def m_tail(plan, spec, _all):
    pts = bowed(spec["from"], spec["to"], spec["count"], -spec.get("droop", 0.0))
    chain(plan, "tail", None, pts, spec["parent"])


def m_ear(plan, spec, all_specs):
    pts = _points_for(spec, all_specs)
    if "count" in spec and len(pts) != spec["count"] + 1:
        raise ValueError("ear: points must be count + 1")
    chain(plan, "ear", spec["side"], pts, spec["parent"])


def m_sockets(plan, spec, _all):
    for item in spec["items"]:
        if item["socket"] not in SOCKETS:
            raise ValueError(f"unknown socket {item['socket']}")
        at = tuple(item["at"])
        plan.add(Joint(item["name"], at, (at[0], at[1], at[2] + 0.02), item["parent"],
                       deform=False, socket=item["socket"], module="socket"))


MODULES = {
    "root": m_root,
    "spine": m_spine,
    "neck_head": m_neck_head,
    "jaw": m_single("jaw"),
    "horn": m_single("horn"),
    "limb": m_limb,
    "tail": m_tail,
    "ear": m_ear,
    "sockets": m_sockets,
}


def plan_skeleton(class_spec):
    plan = Plan()
    specs = class_spec["modules"]
    for spec in specs:
        MODULES[spec["module"]](plan, spec, specs)
    return plan


def build_armature(plan, name="standin_rig"):
    """Create the armature object from a plan. Sockets get the ``xalians`` custom property."""
    import bpy
    from mathutils import Vector

    data = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit = data.edit_bones
    for j in plan.joints:
        b = edit.new(j.name)
        b.head = Vector(j.head)
        b.tail = Vector(j.tail)
        b.roll = 0.0
        b.use_deform = j.deform
        if j.parent:
            b.parent = edit[j.parent]
            b.use_connect = j.connect and (edit[j.parent].tail - b.head).length < 1e-6
    bpy.ops.object.mode_set(mode="OBJECT")
    for j in plan.joints:
        if j.socket:
            # Bone (not pose bone) property: the glTF exporter writes it as node extras.
            data.bones[j.name]["xalians"] = {"socket": j.socket}
            obj.pose.bones[j.name]["xalians"] = {"socket": j.socket}
    return obj
