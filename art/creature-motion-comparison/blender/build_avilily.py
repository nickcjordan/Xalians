"""Author and render an editable Avilily Blender motion study.

Run with Blender 5.2 in background mode. Frames 1-12 are quiet presence;
frames 21-50 are Blossoming Ambuscade. The model uses local mesh parts,
materials, pivots, lights, and keyed actions rather than 2D sprite planes.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUTPUT = ROOT / "rendered_blender"
RENDER = "--render" in sys.argv
PREVIEW = "--preview" in sys.argv


def color(hex_value):
    value = hex_value.lstrip("#")
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4
              for channel in channels]
    return tuple(linear) + (1,)


def material(name, hex_value, roughness=0.72):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color(hex_value)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color(hex_value)
    shader.inputs["Roughness"].default_value = roughness
    return mat


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

INK = material("deep teal feather edge", "234b50")
LEAF = material("floral green", "65ad6b")
LEAF_LIGHT = material("feather highlight", "a8d87e")
LEAF_DEEP = material("underside green", "387d69")
BREAST = material("warm pale breast", "e4efb0")
PETAL = material("coral flower petal", "ec9d83")
PETAL_LIGHT = material("petal inner light", "ffdda7")
THROAT = material("dark flower throat", "623f62")
EYE = material("eye iris", "1c3942", 0.28)
WHITE = material("eye and claw ivory", "f6f3d8", 0.45)
TALON = material("talon wood gold", "bd8e69")


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    if parent is not None:
        obj.parent = parent
    return obj


def sphere(name, parent, location, scale, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def tube(name, parent, start, end, radius, mat, vertices=9):
    start, end = Vector(start), Vector(end)
    middle = (start + end) / 2
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius * .82,
                                    radius2=radius, depth=(end - start).length)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = middle
    obj.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def leaf_surface(name, parent, tip, width, mat, y_offset=0.0, bend=.0):
    """A curved, ridged feather or petal spanning the local XZ plane."""
    end = Vector((tip[0], tip[1]))
    perpendicular = Vector((-end.y, end.x)).normalized()
    vertices = []
    faces = []
    segments = 8
    for step in range(segments + 1):
        t = step / segments
        mid = end * t + Vector((0, bend * math.sin(math.pi * t)))
        half = width * (math.sin(math.pi * t) ** .8) * .5
        for side in (-1, 0, 1):
            point = mid + perpendicular * half * side
            ridge = -.055 * math.sin(math.pi * t) if side == 0 else 0.0
            vertices.append((point.x, y_offset + ridge, point.y))
        if step:
            previous = (step - 1) * 3
            current = step * 3
            faces.extend(((previous, previous + 1, current + 1, current),
                          (previous + 1, previous + 2, current + 2, current + 1)))
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new("gentle feather thickness", "SOLIDIFY")
    modifier.thickness = .035
    modifier.offset = 0
    bevel = obj.modifiers.new("soft edge", "BEVEL")
    bevel.width = .012
    bevel.segments = 2
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def feather(name, parent, tip, width, face, bend=0.0, vein=False):
    leaf_surface(name + " dark edge", parent, tip, width * 1.13, INK, .045, bend)
    leaf_surface(name + " surface", parent, tip, width, face, -.025, bend)
    if vein:
        tube(name + " vein", parent,
             (tip[0] * .14, -.085, tip[1] * .14),
             (tip[0] * .75, -.085, tip[1] * .75 + bend * .2),
             .014, LEAF_LIGHT, 6)


stage = empty("Avilily | animator root")
body = empty("body | flit and crouch", stage)
sphere("body outline", body, (0, .055, 0), (.54, .38, .72), INK)
sphere("green feathered body", body, (0, -.01, .015), (.50, .38, .68), LEAF)
sphere("pale breast", body, (.20, -.34, -.06), (.31, .105, .48), BREAST)
sphere("side breast feather", body, (-.30, -.28, -.13), (.13, .09, .25), LEAF_DEEP)

rear_wing = empty("rear wing | feather fan", body, (-.33, .18, .29))
front_wing = empty("front wing | feather fan", body, (.27, -.37, .30))
for parent, sign, face in ((rear_wing, -1, LEAF_DEEP), (front_wing, 1, LEAF)):
    sphere("wing shoulder", parent, (sign * .08, 0, 0), (.27, .11, .18), face)
    for i in range(5):
        tip = (sign * (1.05 + i * .07), .22 - i * .12)
        feather("flight feather %s" % i, parent, tip, .33 - .025 * i,
                face if i % 2 else LEAF_LIGHT, bend=.04 * (2 - i), vein=i in (0, 2, 4))

streamers = []
for i in range(2):
    pivot = empty("head streamer %s" % i, body, (-.14 - .12 * i, .22 + .06 * i, .84))
    feather("trailing long feather %s" % i, pivot,
            (-.64 - i * .13, -1.55 + i * .15), .20 - i * .03,
            LEAF_DEEP if i == 0 else LEAF, bend=.12, vein=True)
    streamers.append(pivot)

for side, x in enumerate((-.18, .18)):
    y = .02 if side == 0 else -.18
    tube("leg %s" % side, body, (x, y, -.50), (x + .03, y - .04, -.88), .063, TALON)
    sphere("ankle %s" % side, body, (x + .03, y - .04, -.88), (.075, .065, .065), TALON)
    for claw in range(3):
        tx = x - .08 + .08 * claw
        tube("curved grip %s %s" % (side, claw), body,
             (x + .03, y - .04, -.89), (tx + .09, y - .20, -1.0), .024, WHITE, 7)

head = empty("head | attention and bloom", body, (.13, -.025, .77))
sphere("head contour", head, (.02, .02, .17), (.44, .38, .42), INK)
sphere("green face", head, (.025, -.045, .18), (.415, .38, .40), LEAF_LIGHT)
sphere("cheek plumage", head, (.27, -.23, .035), (.16, .17, .18), LEAF)
for i, direction in enumerate(((-.13, .60), (.02, .68), (.16, .60))):
    crest = empty("crest pivot %s" % i, head, (-.08 + i * .12, -.025, .45))
    feather("crest leaf %s" % i, crest, direction, .17,
            LEAF_DEEP if i == 1 else LEAF, vein=i == 1)

sphere("eye dark rim", head, (.23, -.398, .30), (.136, .047, .112), INK)
sphere("eye ivory", head, (.242, -.43, .31), (.108, .036, .090), WHITE)
sphere("pupil", head, (.278, -.462, .31), (.052, .025, .064), EYE)
sphere("eye glint", head, (.289, -.485, .341), (.018, .012, .019), WHITE)

bloom = empty("flower beak | hinged petals", head, (.43, -.25, .035))
sphere("dark nectar throat", bloom, (.105, -.045, 0), (.21, .15, .17), THROAT)
sphere("syrup bead", bloom, (.17, -.18, -.025), (.055, .026, .041), PETAL_LIGHT)
petals = []
for i in range(5):
    petal = empty("beak petal hinge %s" % i, bloom, (.04, -.08 + .018 * i, 0))
    feather("flower petal %s" % i, petal, (.47 + .035 * (i % 2), 0),
            .26 if i in (0, 4) else .23, PETAL if i % 2 else PETAL_LIGHT)
    petals.append(petal)


def key(obj, frame, fields=("location", "rotation_euler")):
    for field in fields:
        obj.keyframe_insert(data_path=field, frame=frame)


def smooth(value):
    x = max(0.0, min(1.0, value))
    return x * x * (3 - 2 * x)


def pose(frame, anticipation=0.0, rise=0.0, opened=0.0, wing=0.0, idle=0.0):
    body.location = (rise * .13, 0, -.10 * anticipation + .29 * rise + .014 * idle)
    body.rotation_euler = (0, math.radians(-8 * anticipation + 7 * rise), 0)
    body.scale = (1 + .006 * idle, 1, 1 + .01 * idle)
    key(body, frame)
    body.keyframe_insert(data_path="scale", frame=frame)
    head.rotation_euler = (math.radians(-7 * rise), math.radians(-12 * anticipation + 10 * rise), 0)
    key(head, frame, ("rotation_euler",))
    rear_wing.rotation_euler = (math.radians(12 * wing), math.radians(24 * anticipation - 30 * wing), 0)
    front_wing.rotation_euler = (math.radians(-17 * wing), math.radians(-20 * anticipation + 31 * wing), 0)
    key(rear_wing, frame, ("rotation_euler",))
    key(front_wing, frame, ("rotation_euler",))
    for i, pivot in enumerate(streamers):
        pivot.rotation_euler = (0, math.radians(-6 * rise + (i + 1) * idle), 0)
        key(pivot, frame, ("rotation_euler",))
    angles = (-78, -37, 0, 38, 80)
    for i, petal in enumerate(petals):
        petal.rotation_euler = (0, math.radians(angles[i] * opened), 0)
        key(petal, frame, ("rotation_euler",))


# Two named performances in one editable Blender timeline.
pose(1)
pose(4, idle=.55)
pose(7, idle=1)
pose(10, idle=.35)
pose(12)
pose(21)
pose(26, anticipation=.70)
pose(30, anticipation=1)
pose(34, anticipation=.20, rise=.70, opened=.65, wing=.75)
pose(38, rise=1, opened=1, wing=1)
pose(42, rise=.9, opened=1, wing=.88)
pose(46, rise=.37, opened=.42, wing=.30)
pose(50)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.film_transparent = True
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 50
scene.world.color = color("728880")[:3]
scene.view_settings.view_transform = "Standard"

bpy.ops.object.camera_add(location=(0, -6.7, 1.2))
camera = bpy.context.object
camera.name = "fixed stage camera | 3 quarter"
target = Vector((0, 0, .30))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.85
scene.camera = camera

def area_light(name, location, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, .25)) - obj.location).to_track_quat("-Z", "Y").to_euler()


area_light("warm canopy key", (-3, -4, 5), 460, 4)
area_light("cool leaf fill", (3, -2, 2), 180, 3)
area_light("rim through canopy", (1, 2, 4), 330, 3)

for frame, name in ((1, "quiet start"), (21, "action start"), (30, "anticipation"),
                    (35, "bloom opening cue"), (38, "bloom peak"), (50, "recovered")):
    scene.timeline_markers.new(name, frame=frame)

scene.frame_set(21)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "avilily_motion.blend"))
print("Saved editable Blender study:", HERE / "avilily_motion.blend")

if PREVIEW:
    scene.frame_set(38)
    scene.render.filepath = str(HERE / "preview.png")
    bpy.ops.render.render(write_still=True)
    print("Rendered Blender preview:", HERE / "preview.png")

if RENDER:
    for clip, start, count in (("idle", 1, 12), ("action", 21, 30)):
        folder = OUTPUT / clip
        folder.mkdir(parents=True, exist_ok=True)
        for i in range(count):
            scene.frame_set(start + i)
            scene.render.filepath = str(folder / f"{i:03d}.png")
            bpy.ops.render.render(write_still=True)
            print(f"Rendered Blender {clip} {i + 1}/{count}")
