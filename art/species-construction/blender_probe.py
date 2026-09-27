"""Render a provisional connected attachment study from a JSON volume spec.

Run with Blender in background mode. No image model, API, or network is used.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def aim(obj, point, up="Y"):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", up).to_euler()


def tube(name, controls):
    """Smooth varying elliptical sweep; geometry joins are fused by voxel remesh."""
    samples = []
    for i in range(len(controls) - 1):
        a = Vector(controls[max(0, i - 1)])
        b = Vector(controls[i])
        c = Vector(controls[i + 1])
        d = Vector(controls[min(len(controls) - 1, i + 2)])
        for j in range(12):
            t = j / 12
            samples.append(0.5 * ((2 * b) + (-a + c) * t
                           + (2*a - 5*b + 4*c - d)*t*t
                           + (-a + 3*b - 3*c + d)*t*t*t))
    samples.append(Vector(controls[-1]))
    verts, faces = [], []
    count = 32
    for i, point in enumerate(samples):
        center = Vector(point[:3])
        tangent = Vector(samples[min(i+1, len(samples)-1)][:3]) - Vector(samples[max(0, i-1)][:3])
        tangent.normalize()
        axis = Vector((0, 1, 0))
        if abs(tangent.dot(axis)) > 0.95:
            axis = Vector((0, 0, 1))
        broad = tangent.cross(axis).normalized()
        thin = tangent.cross(broad).normalized()
        for j in range(count):
            angle = 2 * math.pi * j / count
            verts.append(center + broad * max(0.01, point[3]) * math.cos(angle)
                         + thin * max(0.01, point[4]) * math.sin(angle))
        if i:
            for j in range(count):
                prev = (i-1)*count
                now = i*count
                faces.append((prev+j, prev+(j+1)%count, now+(j+1)%count, now+j))
    faces += [tuple(reversed(range(count))), tuple((len(samples)-1)*count+j for j in range(count))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
    args.out.mkdir(parents=True, exist_ok=True)
    spec = json.loads(args.spec.read_text())
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    pieces = []
    for volume in spec["volumes"]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=volume["center"])
        obj = bpy.context.object
        obj.name = volume["id"]
        obj.scale = volume["scale"]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        pieces.append(obj)
    pieces += [tube(branch["id"], branch["controls"]) for branch in spec["sweeps"]]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = "provisional_connected_tail_and_pelvis"
    model.data.remesh_voxel_size = spec["voxelSize"]
    bpy.ops.object.voxel_remesh()
    smooth = model.modifiers.new("Blend organic junction", "SMOOTH")
    smooth.factor = 0.8
    smooth.iterations = 7
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for polygon in model.data.polygons:
        polygon.use_smooth = True
    bm = bmesh.new()
    bm.from_mesh(model.data)
    unseen = set(bm.verts)
    components = 0
    while unseen:
        components += 1
        queue = [unseen.pop()]
        while queue:
            vertex = queue.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in unseen:
                    unseen.remove(other)
                    queue.append(other)
    nonmanifold = sum(not edge.is_manifold for edge in bm.edges)
    bm.free()
    material = bpy.data.materials.new("Neutral construction clay")
    material.diffuse_color = (0.43, 0.43, 0.43, 1)
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.43,0.43,0.43,1)
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    model.data.materials.clear()
    model.data.materials.append(material)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.world.color = (0.6, 0.6, 0.6)
    scene.view_settings.view_transform = "Standard"
    for location, power, size in [((-3,-4,6), 500, 5), ((4,3,5), 450, 5), ((-3,4,1), 200, 4)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = power, "DISK", size
        aim(light, spec["target"])
    cameras = []
    target = Vector(spec["target"])
    views = [("rear", (0, 7, 0)), ("left", (7, 0, 0)), ("above", (0, 0, 7))]
    views += [(f"turn-{angle:03d}", (7*math.sin(math.radians(angle)),
                                  -7*math.cos(math.radians(angle)), 1.4))
              for angle in range(0, 360, 45)]
    for name, offset in views:
        bpy.ops.object.camera_add(location=target + Vector(offset))
        camera = bpy.context.object
        camera.name = name
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = spec["orthoScale"]
        aim(camera, target)
        if name == "above":
            # Looking down +Z with the creature's front (-Y) toward page top.
            camera.rotation_euler = (0, 0, math.pi)
        scene.camera = camera
        scene.render.filepath = str(args.out / f"{name}.png")
        bpy.context.view_layer.update()
        cameras.append({"name": name, "matrixWorld": [list(row) for row in camera.matrix_world],
                        "projection": "orthographic", "orthoScale": camera.data.ortho_scale,
                        "resolution": [640, 640], "image": f"{name}.png"})
        bpy.ops.render.render(write_still=True)
    scene.camera = bpy.data.objects["rear"]
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out / "probe.blend"))
    report = {"status": "technical-pass" if components == 1 and nonmanifold == 0 else "technical-fail",
              "scope": "Provisional tail/pelvis only; not approved creature geometry",
              "specSha256": sha(args.spec), "builderSha256": sha(__file__),
              "blenderVersion": bpy.app.version_string, "components": components,
              "nonManifoldEdges": nonmanifold, "vertices": len(model.data.vertices),
              "approval": None, "coordinateSystem": spec["coordinateSystem"],
              "cameras": cameras, "outputs": {p.name: sha(p) for p in args.out.iterdir()
                                              if p.suffix in (".png", ".blend")}}
    (args.out / "geometry.json").write_text(json.dumps(report, indent=2)+"\n")
    if report["status"] != "technical-pass":
        raise RuntimeError("Probe is not one closed connected surface")


if __name__ == "__main__":
    main()
