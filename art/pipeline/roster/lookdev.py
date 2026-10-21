"""Look-dev scene: the fixed lights, ground, cameras and clay material every creature review image comes from.

Used from inside Blender (bpy). Space follows the roster rule: meters, +Z up, the creature faces -Y, its left
is +X, origin at the ground point under the body center.

    import lookdev
    lookdev.setup_scene(engine="EEVEE")            # world, three-point lights, ground, clay material
    lookdev.apply_clay(obj)
    cams = lookdev.frame_cameras(objects)           # standard cameras framed to the objects' bounds
    lookdev.render(cams["side_left"], path, size=1024)

Standard cameras (all orthographic, aimed at the bounds center, framed with a 6 percent margin):
front (from -Y), three_quarter_left (from -Y +X at 45 degrees, 12 degrees above), side_left (from +X),
back (from +Y), top (from +Z, front toward the bottom of the frame). ``sprite`` is the side_left framing
rendered at 192 px. Lighting: key from the front left above, fill from the front right, rim from behind,
all area lights in neutral white; a dark mid gray ground (0.12 linear) under a lighter clay (0.50) for figure contrast, and a world of the ground's gray, so low
cameras show no horizon line.
"""

import math

import bpy
from mathutils import Vector

CLAY_RGB = (0.50, 0.50, 0.50)
GROUND_RGB = (0.12, 0.12, 0.12)
CAMERAS = {
    # name: (azimuth degrees measured from the creature's front (-Y) toward its left (+X), elevation degrees)
    "front": (0.0, 4.0),
    "three_quarter_left": (45.0, 12.0),
    "side_left": (90.0, 0.0),
    "back": (180.0, 4.0),
    "top": (0.0, 90.0),
}


def _clear():
    for obj in list(bpy.data.objects):
        if obj.name.startswith("lookdev_"):
            bpy.data.objects.remove(obj, do_unlink=True)


def setup_scene(engine="EEVEE"):
    scene = bpy.context.scene
    _clear()
    if engine == "EEVEE":
        scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in _engines() else "BLENDER_EEVEE_NEXT"
        try:
            scene.eevee.taa_render_samples = 16
        except AttributeError:
            pass
    elif engine == "CYCLES":
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 24
        scene.cycles.use_denoising = True
    else:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"

    world = bpy.data.worlds.get("lookdev_world") or bpy.data.worlds.new("lookdev_world")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (*GROUND_RGB, 1.0)
    bg.inputs["Strength"].default_value = 0.45
    scene.world = world

    # Ground: a large plane at z = 0, mid gray, matte.
    bpy.ops.mesh.primitive_plane_add(size=40.0, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "lookdev_ground"
    gm = _material("lookdev_ground_mat", GROUND_RGB, 0.95)
    ground.data.materials.append(gm)

    _light("lookdev_key", (-1.6, -2.2, 2.6), 110.0, 2.0)
    _light("lookdev_fill", (2.4, -1.8, 1.2), 25.0, 3.0)
    _light("lookdev_rim", (0.6, 2.8, 2.2), 50.0, 1.5)
    return scene


def _engines():
    return {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}


def _light(name, location, power, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.size = size
    data.color = (1.0, 1.0, 1.0)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    direction = Vector((0, 0, 0.3)) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def _material(name, rgb, roughness):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = (*rgb, 1.0)
    return mat


def apply_clay(obj):
    mat = _material("lookdev_clay", CLAY_RGB, 0.85)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True


def world_bounds(objects):
    dg = bpy.context.evaluated_depsgraph_get()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objects:
        ev = o.evaluated_get(dg)
        m = ev.to_mesh()
        for v in m.vertices:
            p = o.matrix_world @ v.co
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
        ev.to_mesh_clear()
    return lo, hi


def camera_direction(azimuth, elevation):
    """Unit vector from the target toward the camera."""
    a, e = math.radians(azimuth), math.radians(elevation)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


def place_camera(name, bounds, azimuth, elevation, margin=0.06):
    lo, hi = bounds
    center = (lo + hi) / 2
    d = camera_direction(azimuth, elevation)
    data = bpy.data.cameras.get(name) or bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.clip_start = 0.01
    data.clip_end = 100.0
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
    obj.location = center + d * 10.0
    up = "Y" if elevation < 89 else None
    if up:
        obj.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    else:
        # Top view: creature's front (-Y) toward the bottom of the frame.
        obj.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    # Fit the ortho scale to the bounds' eight corners projected on the camera plane.
    inv = obj.matrix_world.inverted()
    xs, ys = [], []
    for i in range(8):
        c = Vector((hi.x if i & 1 else lo.x, hi.y if i & 2 else lo.y, hi.z if i & 4 else lo.z))
        p = inv @ c
        xs.append(p.x)
        ys.append(p.y)
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    data.ortho_scale = max(w, h) * (1 + 2 * margin)
    data.shift_x = ((max(xs) + min(xs)) / 2) / data.ortho_scale
    data.shift_y = ((max(ys) + min(ys)) / 2) / data.ortho_scale
    return obj


def frame_cameras(objects, names=None, bounds=None):
    bounds = bounds or world_bounds(objects)
    cams = {}
    for name in names or CAMERAS:
        az, el = CAMERAS[name]
        cams[name] = place_camera(f"lookdev_cam_{name}", bounds, az, el)
    return cams


def render(camera, path, size=1024):
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return path
