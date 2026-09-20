"""Part builders shared by every body-plan template."""

import math
import random

import bpy
from mathutils import Vector


def link(obj, parent=None):
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def empty(name, parent=None, location=(0, 0, 0), rotation=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = .05
    obj.location = location
    obj.rotation_euler = rotation
    return link(obj, parent)


def smooth_shade(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def sphere(name, parent, location, scale, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(mat)
    smooth_shade(obj)
    return obj


SQUASH_KEYS = (("breathe", 1.035, .985), ("crouch", 1.10, .90), ("stretch", .93, 1.09))


def egg(name, parent, location, scale, mat, rotation=(0, 0, 0), taper=.36, shape_keys=False):
    """A sphere narrowed toward its local bottom, optionally with squash keys."""
    obj = sphere(name, parent, location, scale, mat, 32, 20)
    obj.rotation_euler = rotation
    mesh = obj.data
    for vertex in mesh.vertices:
        z = vertex.co.z
        factor = 1 - taper * max(0.0, -z) ** 1.4 + .06 * max(0.0, z) * (1 - z)
        vertex.co.x *= factor
        vertex.co.y *= factor
    mesh.update()
    if shape_keys:
        obj.shape_key_add(name="Basis", from_mix=False)
        for key_name, sx, sz in SQUASH_KEYS:
            block = obj.shape_key_add(name=key_name, from_mix=False)
            for i, vertex in enumerate(mesh.vertices):
                block.data[i].co = Vector((vertex.co.x * sx, vertex.co.y * sx, vertex.co.z * sz))
    return obj


def tube(name, parent, start, end, radius, mat, vertices=9, taper=.82):
    start, end = Vector(start), Vector(end)
    middle = (start + end) / 2
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius * taper,
                                    radius2=radius, depth=(end - start).length)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = middle
    obj.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    smooth_shade(obj)
    return obj


def leaf_surface(name, parent, tip, width, mat, y_offset=0.0, bend=0.0, cup=-.055, peak=.5,
                 thickness=.035):
    """A curved, ridged feather or petal spanning the local XZ plane.

    ``peak`` places the widest point along the length (0.5 is symmetric, lower
    values give a broad base and a long point).
    """
    end = Vector((tip[0], tip[1]))
    perpendicular = Vector((-end.y, end.x)).normalized()
    vertices = []
    faces = []
    segments = 9
    for step in range(segments + 1):
        t = step / segments
        mid = end * t + Vector((0, bend * math.sin(math.pi * t)))
        if t <= peak:
            profile = math.sin(math.pi / 2 * t / peak)
        else:
            profile = math.cos(math.pi / 2 * (t - peak) / (1 - peak))
        half = width * (profile ** .85) * .5
        for side in (-1, 0, 1):
            point = mid + perpendicular * half * side
            ridge = cup * math.sin(math.pi * t) if side == 0 else 0.0
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
    link(obj, parent)
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new("gentle feather thickness", "SOLIDIFY")
    modifier.thickness = thickness
    modifier.offset = 0
    bevel = obj.modifiers.new("soft edge", "BEVEL")
    bevel.width = .012
    bevel.segments = 2
    smooth_shade(obj)
    return obj


def feather(name, parent, tip, width, face, ink, vein_mat=None, bend=0.0, vein=False, peak=.5, edge=1.13):
    """A two-layer feather: dark edge behind, colored surface in front, optional vein."""
    leaf_surface(name + " dark edge", parent, tip, width * edge, ink, .045, bend, peak=peak)
    leaf_surface(name + " surface", parent, tip, width, face, -.025, bend, peak=peak)
    if vein:
        tube(name + " vein", parent,
             (tip[0] * .12, -.085, tip[1] * .12),
             (tip[0] * .74, -.085, tip[1] * .74 + bend * .2),
             .013, vein_mat or face, 6)


def rock_plate(name, parent, mat, size, rng=random):
    """A flattened, jittered icosphere. Draws from ``rng`` so plate shapes are reproducible."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    for vertex in obj.data.vertices:
        jitter = 1 + rng.uniform(-.16, .16)
        vertex.co = Vector((vertex.co.x * jitter, vertex.co.y * jitter, max(-.35, vertex.co.z) * jitter))
    obj.scale = size
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("chipped edge", "BEVEL")
    bevel.width = .04
    bevel.segments = 1
    return obj


class Metamass:
    """A metaball object whose elements are keyed directly for amorphous bodies."""

    def __init__(self, name, parent, mat, resolution=.09, render_resolution=.045, threshold=.6):
        self.data = bpy.data.metaballs.new(name)
        self.data.resolution = resolution
        self.data.render_resolution = render_resolution
        self.data.threshold = threshold
        self.data.materials.append(mat)
        self.object = link(bpy.data.objects.new(name + " mass", self.data), parent)

    def element(self, co, radius, kind="BALL", stiffness=2.0):
        item = self.data.elements.new(type=kind)
        item.co = co
        item.radius = radius
        item.stiffness = stiffness
        return item

    @staticmethod
    def key(item, frame):
        item.keyframe_insert("co", frame=frame)
        item.keyframe_insert("radius", frame=frame)
