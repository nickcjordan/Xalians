"""Build and export the stand-in quadruped: armature, body, weights, clips, glb, build facts.

    blender -b --factory-startup --python-exit-code 1 --python export_asset.py -- \
        --class ../roster/classes/quadruped.json --out ../out/standin.build

Writes ``standin.raw.glb`` (uncompressed glTF binary) and ``blender_facts.json``
(clip timings and events, sockets, size, bounds, measured counts from Blender)
into ``--out``. The node step ``contract/write_manifest.mjs`` compresses the
glb with meshopt and writes the contract manifest from these facts plus the
final file. Also writes ``token.png`` and ``token.svg`` (silhouette_token.py)
into ``--out``. KTX2 texture compression runs in that node step when ``toktx``
is on PATH.
"""

import json
import math
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import clips as clip_lib  # noqa: E402
import rig_modules  # noqa: E402
import silhouette_token  # noqa: E402
import standin_body  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    if name in ARGS:
        return ARGS[ARGS.index(name) + 1]
    return default


def to_gltf(v):
    """Blender (x, y, z) with +Z up and -Y forward to glTF (x, z, -y): +Y up, +Z forward."""
    return [v[0], v[2], -v[1]]


def r(x, n=4):
    return round(float(x), n)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.armatures, bpy.data.images):
        for block in list(coll):
            coll.remove(block)
    scene = bpy.context.scene
    scene.render.fps = clip_lib.FPS
    scene.render.fps_base = 1.0
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def mesh_points(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    m = ev.to_mesh()
    pts = [obj.matrix_world @ v.co for v in m.vertices]
    ev.to_mesh_clear()
    return pts


def main():
    t0 = time.time()
    class_path = Path(arg("--class", str(HERE.parent / "roster/classes/quadruped.json"))).resolve()
    out = Path(arg("--out", str(HERE.parent / "out/standin.build"))).resolve()
    out.mkdir(parents=True, exist_ok=True)
    spec = json.loads(class_path.read_text(encoding="utf-8"))

    clear_scene()
    plan = rig_modules.plan_skeleton(spec)
    rig = rig_modules.build_armature(plan, name="standin_rig")
    body = standin_body.build_body(plan, spec["body"], target_triangles=6000, name="standin_full")
    skin = standin_body.skin_to(body, rig, limit=4)
    t_build = time.time()

    # Bake clips with the armature modifier off: posing only needs joint matrices.
    arm_mod = next(m for m in body.modifiers if m.type == "ARMATURE")
    arm_mod.show_viewport = False
    poser = clip_lib.Poser(rig)
    clip_facts = {}
    for clip in clip_lib.all_clips():
        action, hits = clip_lib.bake_clip(rig, clip, poser)
        fact = {"durationMs": clip.duration_ms, "loop": clip.loop, "frames": clip.frames,
                "events": [{"name": n, "timeMs": ms} for n, ms in clip.events]}
        if clip.archetype:
            fact["archetype"] = clip.archetype
        if clip.travel:
            fact["travel"] = clip.travel
        if clip.reach and "hit" in hits:
            p = to_gltf(hits["hit"]["socket_emitter"])
            fact["reachM"] = r(math.hypot(p[0], p[2]), 3)
        clip_facts[clip.name] = fact
    arm_mod.show_viewport = True
    t_clips = time.time()

    # Max extent over every clip (vertices sampled every other frame), then rest bounds.
    max_extent = 0.0
    for name, fact in clip_facts.items():
        rig.animation_data.action = bpy.data.actions[name]
        for f in range(0, fact["frames"] + 1, 2):
            bpy.context.scene.frame_set(f)
            for p in mesh_points(body):
                max_extent = max(max_extent, p.length)
    rig.animation_data.action = None
    poser.reset()
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    rest = [to_gltf(p) for p in mesh_points(body)]
    mins = [min(p[i] for p in rest) for i in range(3)]
    maxs = [max(p[i] for p in rest) for i in range(3)]
    footprint = max(math.hypot(p[0], p[2]) for p in rest)
    height_cm = round(maxs[1] * 100)

    sockets = {}
    for b in rig.data.bones:
        tag = b.get("xalians")
        if tag is not None:
            sockets[tag["socket"]] = {"joint": b.name, "rest": [r(x) for x in to_gltf(b.head_local)]}

    # Low tier: collapse-decimated copy of the full body on the same skeleton.
    low, low_stats = standin_body.make_low_tier(body, rig, target_triangles=3000, name="standin_low")
    # Token: side-view silhouette of the full body at rest.
    body.data.calc_loop_triangles()
    tri_idx = [tuple(lt.vertices) for lt in body.data.loop_triangles]
    token_stats = silhouette_token.make_token(rest, tri_idx, out / "token.png", out / "token.svg")

    # Export: Y up, +Z forward (exporter converts Blender -Y), every action as its own animation.
    for o in bpy.context.scene.objects:
        o.select_set(o in (rig, body, low))
    raw = out / "standin.raw.glb"
    t_exp = time.time()
    bpy.ops.export_scene.gltf(
        filepath=str(raw),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_skins=True,
        export_all_influences=False,
        export_influence_nb=4,
        export_def_bones=False,
        export_morph=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_step=1,
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_reset_pose_bones=True,
        export_extras=True,
    )
    t_done = time.time()

    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    facts = {
        "format": "xalians-blender-facts-v1",
        "blender": bpy.app.version_string,
        "class": spec["class"],
        "classFile": class_path.name,
        "tierNodes": {"full": body.name, "low": low.name},
        "size": {"dimension": "heightCm", "builtHeightCm": r(maxs[1] * 100, 2), "referenceCm": height_cm,
                 "bandCm": [48, 66], "restHeightCm": 0},
        "bounds": {"rest": {"min": [r(x) for x in mins], "max": [r(x) for x in maxs]},
                   "footprintRadiusM": r(footprint, 3), "maxExtentM": r(max_extent, 3)},
        "sockets": sockets,
        "token": token_stats,
        "clips": clip_facts,
        "blenderMeasured": {"triangles": tris, "lowTriangles": low_stats["triangles"],
                            "lowInfluencesPerVertex": low_stats["influencesPerVertex"],
                            "lowUnweightedFixed": low_stats["unweightedFixed"], "vertices": len(body.data.vertices),
                            "joints": len(rig.data.bones),
                            "deformJoints": sum(1 for b in rig.data.bones if b.use_deform),
                            "influencesPerVertex": skin["influencesPerVertex"],
                            "unweightedFixed": skin["unweightedFixed"],
                            "morphTargets": 0, "materials": len(body.data.materials)},
        "seconds": {"build": r(t_build - t0, 2), "clips": r(t_clips - t_build, 2),
                    "measure": r(t_exp - t_clips, 2), "export": r(t_done - t_exp, 2), "total": r(t_done - t0, 2)},
    }
    (out / "blender_facts.json").write_text(json.dumps(facts, indent=2), encoding="utf-8")
    print("XALIANS_FACTS", json.dumps({"triangles": tris, "low": low_stats["triangles"], "token": token_stats, "joints": facts["blenderMeasured"]["joints"],
                                      "heightCm": height_cm, "seconds": facts["seconds"]}))


main()
