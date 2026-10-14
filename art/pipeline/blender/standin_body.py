"""Stand-in quadruped body: metaball capsules along the deform joints, one mesh.

Not art. It exists so the chain has a closed skinned mesh with UVs and a
texture: metaballs give one watertight surface (heat weighting needs that),
decimation brings it to a few thousand triangles, smart UV projection lays it
out, and a generated 1024 noise image is the base color.
"""

import math
import random

import bpy
import numpy as np
from mathutils import Vector

RADIUS_KEY = {"spine": "spine", "neck": "neck", "head": "head", "jaw": "jaw",
              "leg": "leg", "tail": "tail", "ear": "ear"}


def _radius_along(radii, u):
    if len(radii) == 2:
        return radii[0] + (radii[1] - radii[0]) * u
    seg = u * (len(radii) - 1)
    i = min(int(seg), len(radii) - 2)
    return radii[i] + (radii[i + 1] - radii[i]) * (seg - i)


def build_metaball(plan, body):
    mb = bpy.data.metaballs.new("standin_mball")
    mb.resolution = 0.012
    mb.render_resolution = 0.012
    mb.threshold = 0.6
    obj = bpy.data.objects.new("standin_mball", mb)
    bpy.context.scene.collection.objects.link(obj)
    radius = body["radius"]
    # Index joints of a chain so radii taper along the whole module.
    chains = {}
    for j in plan.joints:
        if not j.deform or j.module not in RADIUS_KEY:
            continue
        key = j.name.rsplit("_", 1)[0]
        chains.setdefault(key, []).append(j)
    for key, joints in chains.items():
        radii = radius[RADIUS_KEY[joints[0].module]]
        n = len(joints)
        for i, j in enumerate(joints):
            a, b = Vector(j.head), Vector(j.tail)
            length = (b - a).length
            r = _radius_along(radii, (i + 0.5) / n) if j.module != "leg" else _radius_along(radii, i / max(1, n - 1))
            el = mb.elements.new(type="CAPSULE")
            el.co = (a + b) / 2
            el.radius = r * 1.6
            el.size_x = length / 2
            # Capsule axis is local X; rotate X onto the bone direction.
            el.rotation = Vector((1, 0, 0)).rotation_difference((b - a).normalized())
            el.stiffness = 2.0
    # Head and muzzle blobs, eye bumps.
    head = plan.get("head_01")
    hc = Vector(head.head).lerp(Vector(head.tail), 0.35)
    el = mb.elements.new(type="ELLIPSOID")
    el.co = hc
    el.radius = radius["head"][0] * 1.7
    el.size_x, el.size_y, el.size_z = 0.8, 1.15, 0.85
    el.stiffness = 2.0
    for f in ("fl", "fr", "hl", "hr"):
        toe = plan.get(f"leg_{f}_03")
        el = mb.elements.new(type="ELLIPSOID")
        el.co = Vector(toe.head).lerp(Vector(toe.tail), 0.6) + Vector((0, 0, 0.012))
        el.radius = 0.045
        el.size_x, el.size_y, el.size_z = 0.7, 1.0, 0.45
        el.stiffness = 2.0
    return obj


def noise_texture(size=1024, seed=7):
    """Value noise in a warm-gray stand-in palette, tileable, as a packed PNG image."""
    rng = np.random.default_rng(seed)
    img = np.zeros((size, size), dtype=np.float32)
    amp, total = 1.0, 0.0
    for cells in (8, 16, 32, 64, 128):
        grid = rng.random((cells, cells)).astype(np.float32)
        rep = size // cells
        up = np.kron(grid, np.ones((rep, rep), dtype=np.float32))
        # Cheap smoothing: average with rolled copies.
        k = max(1, rep // 2)
        up = (up + np.roll(up, k, 0) + np.roll(up, k, 1) + np.roll(np.roll(up, k, 0), k, 1)) / 4
        img += up * amp
        total += amp
        amp *= 0.55
    img /= total
    base = np.array([0.42, 0.36, 0.30], dtype=np.float32)
    dark = np.array([0.20, 0.17, 0.15], dtype=np.float32)
    rgb = dark[None, None, :] + (base - dark)[None, None, :] * (img[..., None] * 1.6 - 0.2).clip(0, 1)
    rgba = np.concatenate([rgb, np.ones((size, size, 1), dtype=np.float32)], axis=2)
    image = bpy.data.images.new("standin_basecolor", size, size, alpha=False)
    image.pixels.foreach_set(rgba.ravel())
    image.file_format = "PNG"
    image.pack()
    return image


def make_material(image):
    mat = bpy.data.materials.new("standin_mat")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.8
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def build_body(plan, body, target_triangles=6000, name="standin_full"):
    mball = build_metaball(plan, body)
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(mball.evaluated_get(dg))
    mesh.name = name
    bpy.data.objects.remove(mball)
    # Flat soles: nothing below the ground plane (the origin is the ground point).
    for v in mesh.vertices:
        if v.co.z < 0.0:
            v.co.z = 0.0
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for o in bpy.context.scene.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    if tris > target_triangles:
        dec = obj.modifiers.new("decimate", "DECIMATE")
        dec.ratio = target_triangles / tris
        bpy.ops.object.modifier_apply(modifier=dec.name)
    tri = obj.modifiers.new("tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.shade_smooth()

    obj.data.materials.append(make_material(noise_texture()))
    return obj


def skin_to(body, rig, limit=4):
    """Automatic (heat) weights, then at most ``limit`` influences, normalized; no vertex left unweighted."""
    for o in bpy.context.scene.objects:
        o.select_set(False)
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    bpy.context.view_layer.objects.active = body
    for o in bpy.context.scene.objects:
        o.select_set(o == body)
    # Drop near-zero weights first so the limit keeps meaningful influences.
    bpy.ops.object.vertex_group_clean(group_select_mode="ALL", limit=0.01)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=limit)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)

    deform = [b for b in rig.data.bones if b.use_deform]
    fixed = 0
    for v in body.data.vertices:
        if sum(g.weight for g in v.groups) > 1e-4:
            continue
        p = v.co
        best = min(deform, key=lambda b: _dist_to_segment(p, b.head_local, b.tail_local))
        group = body.vertex_groups.get(best.name) or body.vertex_groups.new(name=best.name)
        group.add([v.index], 1.0, "REPLACE")
        fixed += 1
    influences = max((sum(1 for g in v.groups if g.weight > 0) for v in body.data.vertices), default=0)
    return {"unweightedFixed": fixed, "influencesPerVertex": influences}


def _dist_to_segment(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (a + ab * t - p).length
