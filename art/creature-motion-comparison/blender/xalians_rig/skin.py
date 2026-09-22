"""One smooth body over a posed joint skeleton.

The primitive assemblies (eggs, tubes, cones) that the templates started with
read as assemblies the moment a contour line is drawn on them. This module
replaces a body's core with one mesh: a graph of joints with a radius each,
grown into a surface by Blender's Skin modifier and smoothed by subdivision.
The joints are the same pivots the template already poses, so the
performance track is untouched; each frame's joint positions are read from
the keyed pivots after posing and stored as a shape key, and the modifiers
rebuild the surface from them. Everything is data: joint names, radii and
chains come from the template and the spec, the mesh is a pure function of
the pose.
"""

import bpy
from mathutils import Vector

from .builders import link, smooth_shade


class Skeleton:
    """Joints and the edges between them, in world space per frame."""

    def __init__(self):
        self.names = []
        self.getters = {}
        self.radii = {}
        self.edges = []

    def joint(self, name, getter, radius):
        """``getter()`` returns the joint's world position for the current frame."""
        if name not in self.getters:
            self.names.append(name)
        self.getters[name] = getter
        self.radii[name] = (radius, radius) if isinstance(radius, (int, float)) else tuple(radius)
        return name

    def chain(self, *names):
        for a, b in zip(names, names[1:]):
            self.edges.append((a, b))

    def positions(self):
        return [Vector(self.getters[name]()) for name in self.names]


def world_of(obj, local=(0, 0, 0)):
    """A getter for a point in ``obj``'s local space, evaluated at the current frame."""
    offset = Vector(local)
    return lambda: obj.matrix_world @ offset


def skin_object(name, skeleton, mat, root, frames, scene, parent=None, subdivisions=2, smooth=1.0):
    """Build the skinned body and bake one shape key per frame from the posed skeleton.

    ``frames`` is the ordered list of frame numbers to bake. The mesh is left
    with a Skin and a Subdivision modifier; the shape keys drive the base mesh
    so the surface follows the pose exactly.
    """
    index = {n: i for i, n in enumerate(skeleton.names)}
    per_frame = {}
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        per_frame[frame] = skeleton.positions()
    first = per_frame[frames[0]]

    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata([tuple(v) for v in first], [(index[a], index[b]) for a, b in skeleton.edges], [])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link(obj, parent)
    obj.data.materials.append(mat)

    skin = obj.modifiers.new("skin", "SKIN")
    skin.use_smooth_shade = True
    skin.branch_smoothing = smooth
    layer = obj.data.skin_vertices[0].data
    for n, i in index.items():
        layer[i].radius = skeleton.radii[n]
        layer[i].use_root = n == root
    sub = obj.modifiers.new("smooth", "SUBSURF")
    sub.levels = subdivisions
    sub.render_levels = subdivisions
    smooth_shade(obj)

    obj.shape_key_add(name="Basis", from_mix=False)
    for frame in frames:
        block = obj.shape_key_add(name=f"f{frame:03d}", from_mix=False)
        for i, co in enumerate(per_frame[frame]):
            block.data[i].co = co
        block.value = 0.0
        # A key is fully on at its own frame and off at its neighbours; with
        # linear interpolation and one key per baked frame nothing blends.
        for at, value in ((frame - 1, 0.0), (frame, 1.0), (frame + 1, 0.0)):
            block.value = value
            block.keyframe_insert("value", frame=at)
        block.value = 0.0
    scene.frame_set(frames[0])
    return obj


def hide_render(objects, words):
    """Hide from render every mesh whose name contains one of ``words``."""
    hidden = []
    for obj in objects:
        if obj.type == "MESH" and "skin" not in obj.name and any(word in obj.name for word in words):
            obj.hide_render = True
            hidden.append(obj.name)
    return hidden
