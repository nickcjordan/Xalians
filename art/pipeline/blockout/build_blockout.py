"""Stage 4: blockout, proxy rig, poses, renders and Blender-side validators for one creature.

    blender -b --factory-startup --python-exit-code 1 --python build_blockout.py -- \
        --glb <reconstruction shape.glb> --out <dir> --creature luceras --back-height 0.57 [--voxel 0.002]

Steps: import the reconstruction, keep its largest piece, place it (ground at z 0, midline at x 0, body center
at y 0, facing -Y) and scale it so the top of the back is --back-height; voxel remesh to one closed surface;
measure landmarks (landmarks.py) and write the creature rig spec; build the quadruped armature with
rig_modules.py; bind with automatic weights, at most 4 influences, normalized; pose rest, crouch, leap peak and
landing (joint rotations; the body offset rides on spine_01 as in clips.Poser, the root never moves); measure
volume per pose and per joint region and count new self-intersections; render through roster/lookdev.py;
export the bound rest mesh as glb and save the .blend; write the Blender-side validators.
"""

import json
import math
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PIPE = HERE.parent
for p in (HERE, PIPE / "blender", PIPE / "roster"):
    sys.path.insert(0, str(p))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import clips  # noqa: E402
import landmarks  # noqa: E402
import lookdev  # noqa: E402
import rig_modules  # noqa: E402
import standin_body  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


T0 = time.time()
TIMES = {}


def lap(name):
    TIMES[name] = round(time.time() - T0, 2)


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for b in list(coll):
            coll.remove(b)


def select_only(obj):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def verts_np(obj, evaluated=False):
    if evaluated:
        dg = bpy.context.evaluated_depsgraph_get()
        ev = obj.evaluated_get(dg)
        m = ev.to_mesh()
        a = np.empty(len(m.vertices) * 3)
        m.vertices.foreach_get("co", a)
        ev.to_mesh_clear()
    else:
        a = np.empty(len(obj.data.vertices) * 3)
        obj.data.vertices.foreach_get("co", a)
    a = a.reshape(-1, 3)
    M = np.array(obj.matrix_world)
    return a @ M[:3, :3].T + M[:3, 3]


def keep_largest(obj):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    parts.sort(key=lambda o: len(o.data.vertices), reverse=True)
    dropped = [len(o.data.polygons) for o in parts[1:]]
    for o in parts[1:]:
        bpy.data.objects.remove(o, do_unlink=True)
    return parts[0], len(parts), dropped


def mesh_stats(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    nonmanifold = sum(1 for e in bm.edges if not e.is_manifold)
    boundary = sum(1 for e in bm.edges if e.is_boundary)
    vol = bm.calc_volume(signed=True)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    return {"triangles": tris, "vertices": len(obj.data.vertices), "nonManifoldEdges": nonmanifold,
            "boundaryEdges": boundary, "volumeM3": vol}


# --------------------------------------------------------------------------------------------------------
# rig spec from landmarks

def rig_spec(pts, creature):
    r = lambda p: [round(float(x), 4) for x in p]  # noqa: E731
    fl = [r(p) for p in pts["fore"]["l"]["points"]]
    hl = [r(p) for p in pts["hind"]["l"]["points"]]
    s = pts["sockets"]
    return {
        "format": "xalians-skeleton-class-v1",
        "class": "quadruped",
        "creature": creature,
        "note": "Creature spec: the quadruped class with joint placements measured from the stage 4 blockout "
                "(art/pipeline/blockout/landmarks.py). Blender space: meters, +Z up, faces -Y, left is +X, origin "
                "at the ground point under the body center. Right limbs, ear and horn mirror the left.",
        "modules": [
            {"module": "root", "socket": "ground"},
            {"module": "spine", "count": 5, "parent": "root", "points": [r(p) for p in pts["spine"]]},
            {"module": "neck_head", "neckCount": 2, "parent": "spine_05",
             "neck": [r(p) for p in pts["neck"]], "head": [r(p) for p in pts["head"]]},
            {"module": "jaw", "parent": "head_01", "from": r(pts["jaw"][0]), "to": r(pts["jaw"][1])},
            {"module": "limb", "name": "leg", "side": "fl", "parent": "spine_05", "points": fl},
            {"module": "limb", "name": "leg", "side": "fr", "mirror": "fl", "parent": "spine_05"},
            {"module": "limb", "name": "leg", "side": "hl", "parent": "spine_01", "points": hl},
            {"module": "limb", "name": "leg", "side": "hr", "mirror": "hl", "parent": "spine_01"},
            {"module": "tail", "count": 6, "parent": "spine_01", "points": [r(p) for p in pts["tail"]]},
            {"module": "ear", "side": "l", "count": 2, "parent": "head_01", "points": [r(p) for p in pts["ears"]["l"]]},
            {"module": "ear", "side": "r", "mirror": "l", "parent": "head_01"},
            {"module": "horn", "side": "l", "parent": "head_01", "from": r(pts["horns"]["l"]["base"]),
             "to": r(pts["horns"]["l"]["top"])},
            {"module": "horn", "side": "r", "mirror": "l", "parent": "head_01"},
            {"module": "sockets", "items": [
                {"socket": "head", "name": "socket_head", "parent": "head_01", "at": r(s["head"])},
                {"socket": "eye_l", "name": "socket_eye_l", "parent": "head_01", "at": r(s["eye_l"])},
                {"socket": "eye_r", "name": "socket_eye_r", "parent": "head_01", "at": r(s["eye_r"])},
                {"socket": "emitter", "name": "socket_emitter", "parent": "head_01", "at": r(s["emitter"])},
                {"socket": "status", "name": "socket_status", "parent": "head_01", "at": r(s["status"])},
                {"socket": "carry", "name": "socket_carry", "parent": "spine_03", "at": r(s["carry"])}]},
        ],
    }


# --------------------------------------------------------------------------------------------------------
# poses

def tail(n, **kw):
    return [dict(kw) for _ in range(n)]


def pose_rest(poser, rig):
    poser.reset()


def pose_crouch(poser, rig):
    """Hind legs folded, chest low: the body drops and pitches nose-down, feet stay planted."""
    poser.reset()
    p = {"up": -0.14, "fwd": 0.02, "pitch": -0.12, "neck_pitch": 0.25, "head_pitch": 0.15,
         "ear_l": -0.4, "ear_r": -0.4}
    poser.apply(p, tail(6, tail_lift=-0.12))
    bpy.context.view_layer.update()
    poser.plant_feet(p, bpy.context.view_layer)


def pose_leap(poser, rig):
    """Leap peak: hind legs extended back, forelegs tucked, body stretched, head forward. Airborne, so the body
    is lifted on spine_01 (the root stays at the origin) and the feet are free."""
    poser.reset()
    p = {"up": 0.20, "pitch": 0.06, "bend": -0.04, "neck_pitch": -0.55, "head_pitch": 0.35,
         "ear_l": -0.6, "ear_r": -0.6}
    poser.apply(p, tail(6, tail_lift=0.30))
    X = Vector((1, 0, 0))
    for s in ("l", "r"):
        poser.rot(f"leg_h{s}_01", X, 1.65)
        poser.rot(f"leg_h{s}_02", X, -0.95)
        poser.rot(f"leg_h{s}_03", X, 0.90)
        poser.rot(f"leg_f{s}_01", X, 0.75)
        poser.rot(f"leg_f{s}_02", X, -1.75)
        poser.rot(f"leg_f{s}_03", X, 1.20)
    bpy.context.view_layer.update()


def pose_landing(poser, rig):
    """Landing: forelegs planted, hind legs swung forward to reach under the body (feet still in the air),
    tail up, body pitched nose-down."""
    from mathutils import Quaternion
    poser.reset()
    p = {"up": 0.03, "pitch": -0.20, "neck_pitch": 0.30, "head_pitch": 0.15, "ear_l": -0.5, "ear_r": -0.5}
    poser.apply(p, tail(6, tail_lift=0.32))
    bpy.context.view_layer.update()
    poser.plant_feet(p, bpy.context.view_layer)
    X = Vector((1, 0, 0))
    for s in ("l", "r"):
        for i in (1, 2, 3):
            rig.pose.bones[f"leg_h{s}_{i:02d}"].rotation_quaternion = Quaternion()
        poser.rot(f"leg_h{s}_01", X, -0.75)
        poser.rot(f"leg_h{s}_02", X, -0.10)
        poser.rot(f"leg_h{s}_03", X, -0.40)
    bpy.context.view_layer.update()


POSES = {"rest": pose_rest, "crouch": pose_crouch, "leap": pose_leap, "landing": pose_landing}


# --------------------------------------------------------------------------------------------------------
# deformation measures

def regions(body, rig):
    """Dominant deform joint per vertex; region face lists (faces whose three vertices share a region)."""
    names = [g.name for g in body.vertex_groups]
    n = len(body.data.vertices)
    dom = np.full(n, -1)
    best = np.zeros(n)
    for v in body.data.vertices:
        for g in v.groups:
            if g.weight > best[v.index]:
                best[v.index] = g.weight
                dom[v.index] = g.group
    tri = np.empty(len(body.data.loop_triangles) * 3, dtype=np.int64)
    body.data.loop_triangles.foreach_get("vertices", tri)
    tri = tri.reshape(-1, 3)
    d = dom[tri]
    same = (d[:, 0] == d[:, 1]) & (d[:, 1] == d[:, 2])
    out = {}
    for gi in np.unique(d[same, 0]):
        if gi < 0:
            continue
        out[names[gi]] = tri[same & (d[:, 0] == gi)]
    return out, tri


def cone_volume(points, faces, apex):
    a = points[faces[:, 0]] - apex
    b = points[faces[:, 1]] - apex
    c = points[faces[:, 2]] - apex
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)


def closed_volume(points, tri):
    a, b, c = points[tri[:, 0]], points[tri[:, 1]], points[tri[:, 2]]
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)


def self_intersections(points, tri):
    bvh = BVHTree.FromPolygons([tuple(map(float, p)) for p in points], tri.tolist(), all_triangles=True)
    pairs = bvh.overlap(bvh)
    out = []
    for i, j in pairs:
        if i >= j:
            continue
        if set(tri[i]) & set(tri[j]):
            continue
        out.append((i, j))
    return out


# --------------------------------------------------------------------------------------------------------

def main():
    glb = Path(arg("--glb")).resolve()
    out = Path(arg("--out")).resolve()
    creature = arg("--creature", "luceras")
    back_h = float(arg("--back-height", "0.57"))
    voxel = float(arg("--voxel", "0.002"))
    out.mkdir(parents=True, exist_ok=True)
    (out / "renders").mkdir(exist_ok=True)
    report = {"creature": creature, "source": str(glb), "blender": bpy.app.version_string}

    clear()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects:
        o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    for o in list(bpy.context.scene.objects):
        if o != body:
            bpy.data.objects.remove(o, do_unlink=True)
    body.parent = None
    select_only(body)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body, n_parts, dropped = keep_largest(body)
    report["import"] = {"pieces": n_parts, "droppedPieceFaces": dropped, "keptFaces": len(body.data.polygons)}

    # Place and scale (landmarks.normalize), written straight into the vertices.
    v = verts_np(body)
    vn, scale, off = landmarks.normalize(v, back_h)
    body.data.vertices.foreach_set("co", vn.ravel())
    body.data.update()
    report["placement"] = {"scaleFromReconstruction": scale, "offsetM": off.tolist(),
                           "rule": "ground at z 0; x midline = mean of the four feet; y 0 midway between the fore "
                                   "and hind feet; scale so the top of the back is " + str(back_h) + " m"}
    lap("import_place")

    # One closed surface.
    body.data.remesh_voxel_size = voxel
    body.data.use_remesh_fix_poles = True
    select_only(body)
    bpy.ops.object.voxel_remesh()
    body, n_parts2, dropped2 = keep_largest(body)
    st = mesh_stats(body)
    if st["triangles"] > 300000:
        dec = body.modifiers.new("dec", "DECIMATE")
        dec.ratio = 200000 / st["triangles"]
        select_only(body)
        bpy.ops.object.modifier_apply(modifier=dec.name)
    tri_mod = body.modifiers.new("tri", "TRIANGULATE")
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=tri_mod.name)
    body.name = f"{creature}_blockout"
    body.data.name = body.name
    st = mesh_stats(body)
    report["remesh"] = {"voxelM": voxel, "piecesAfter": n_parts2, "droppedAfter": dropped2, **st}
    lap("remesh")

    # Landmarks, proportions, rig spec.
    v = verts_np(body)
    pts, facts = landmarks.measure(v, back_h)
    props = landmarks.proportions(v, pts, facts)
    spec = rig_spec(pts, creature)
    (out / f"{creature}.rig_spec.json").write_text(json.dumps(spec, indent=1), encoding="utf-8")
    (out / "landmarks.json").write_text(json.dumps({"points": pts, "facts": facts, "ratios": landmarks.RATIOS},
                                                   indent=1, default=float), encoding="utf-8")
    lap("measure")

    plan = rig_modules.plan_skeleton(spec)
    rig = rig_modules.build_armature(plan, name=f"{creature}_rig")
    select_only(body)
    for o in bpy.context.scene.objects:
        o.select_set(o in (body, rig))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    unweighted_auto = sum(1 for vv in body.data.vertices if sum(g.weight for g in vv.groups) <= 1e-4)
    skin = standin_body.limit_and_fix_weights(body, rig, 4)
    unweighted_final = sum(1 for vv in body.data.vertices if sum(g.weight for g in vv.groups) <= 1e-4)
    max_inf = max(sum(1 for g in vv.groups if g.weight > 0) for vv in body.data.vertices)
    sums = [sum(g.weight for g in vv.groups) for vv in body.data.vertices]
    report["bind"] = {"method": "ARMATURE_AUTO (bone heat), clean < 0.01, limit 4, normalize; any vertex left "
                                "unweighted is given to its nearest deform joint",
                      "unweightedAfterAutoWeights": unweighted_auto, "unweightedFixedByNearestJoint": skin["unweightedFixed"],
                      "unweightedFinal": unweighted_final, "maxInfluences": max_inf,
                      "weightSumRange": [round(min(sums), 4), round(max(sums), 4)]}
    lap("bind")

    # Poses: measure and collect bounds.
    body.data.calc_loop_triangles()
    reg, tri = regions(body, rig)
    bones = {b.name: b for b in rig.data.bones}
    poser = clips.Poser(rig)
    rest_pts = verts_np(body, evaluated=True)
    rest_vol = closed_volume(rest_pts, tri)
    rest_reg = {}
    for name, faces in reg.items():
        apex = np.array(bones[name].head_local)
        rest_reg[name] = cone_volume(rest_pts, faces, apex)
    rest_x = self_intersections(rest_pts, tri)
    tri_region = {}
    for name, faces in reg.items():
        for f in map(tuple, faces):
            tri_region[f] = name
    pose_facts = {}
    pose_pts = {}
    for pname, fn in POSES.items():
        fn(poser, rig)
        bpy.context.view_layer.update()
        P = verts_np(body, evaluated=True)
        pose_pts[pname] = P
        vol = closed_volume(P, tri)
        per = {}
        for name, faces in reg.items():
            pb = rig.pose.bones[name]
            apex = np.array(rig.matrix_world @ pb.head)
            r0 = rest_reg[name]
            r1 = cone_volume(P, faces, apex)
            if abs(r0) > 1e-7:
                per[name] = {"restCm3": round(r0 * 1e6, 2), "poseCm3": round(r1 * 1e6, 2),
                             "change": round((r1 - r0) / abs(r0), 4)}
        xs = self_intersections(P, tri) if pname != "rest" else rest_x
        new = len(xs) - len(rest_x)
        involved = {}
        rest_set = set(rest_x)
        for i, j in xs:
            if (i, j) in rest_set:
                continue
            for k in (i, j):
                nm = tri_region.get(tuple(tri[k]), "mixed")
                involved[nm] = involved.get(nm, 0) + 1
        worst = sorted(per.items(), key=lambda kv: kv[1]["change"])[:5]
        pose_facts[pname] = {
            "volumeM3": vol, "volumeChange": round((vol - rest_vol) / rest_vol, 4),
            "worstRegions": [{"joint": k, **val} for k, val in worst],
            "regionsOver30PercentLoss": [k for k, val in per.items() if val["change"] < -0.30],
            "selfIntersectingPairs": len(xs), "newSelfIntersectingPairs": new,
            "newIntersectionRegions": dict(sorted(involved.items(), key=lambda kv: -kv[1])[:8]),
            "lowestPointZ": float(P[:, 2].min()),
            "regions": per,
        }
    poser.reset()
    bpy.context.view_layer.update()
    lap("poses")

    # Renders.
    lookdev.setup_scene("EEVEE")
    lookdev.apply_clay(body)
    bpy.data.objects["lookdev_ground"].hide_render = False
    rig.hide_render = True
    rest_bounds = lookdev.world_bounds([body])
    cams = lookdev.frame_cameras([body], bounds=rest_bounds)
    renders = {}

    def project_bbox(cam, P, size):
        from bpy_extras.object_utils import world_to_camera_view
        scene = bpy.context.scene
        sub = P[:: max(1, len(P) // 20000)]
        uv = np.array([tuple(world_to_camera_view(scene, cam, Vector(p)))[:2] for p in sub])
        x0, y0 = uv.min(0)
        x1, y1 = uv.max(0)
        return [float(x0 * size), float((1 - y1) * size), float(x1 * size), float((1 - y0) * size)]

    for name, cam in cams.items():
        path = out / "renders" / f"rest_{name}.png"
        lookdev.render(cam, path, 1024)
        renders[f"rest_{name}"] = {"path": str(path), "bboxPx": project_bbox(cam, rest_pts, 1024)}
    sprite = out / "renders" / "sprite_side_192.png"
    lookdev.render(cams["side_left"], sprite, 192)
    renders["sprite_side_192"] = {"path": str(sprite)}
    lap("render_rest")

    # Pose sheet cameras: framed to the union of every pose so all four share one scale.
    allp = np.vstack([pose_pts[k] for k in POSES])
    ub = (Vector(allp.min(0)), Vector(allp.max(0)))
    pcams = {n: lookdev.place_camera(f"lookdev_pose_{n}", ub, *lookdev.CAMERAS[n])
             for n in ("side_left", "three_quarter_left")}
    for pname, fn in POSES.items():
        fn(poser, rig)
        bpy.context.view_layer.update()
        for cname, cam in pcams.items():
            path = out / "renders" / f"pose_{pname}_{cname}.png"
            lookdev.render(cam, path, 768)
            renders[f"pose_{pname}_{cname}"] = {"path": str(path)}
    poser.reset()
    bpy.context.view_layer.update()
    lap("render_poses")

    # Export glb (rest, skinned, no animations) and save the blend.
    for o in bpy.context.scene.objects:
        o.select_set(o in (rig, body))
    glb_out = out / f"{creature}_blockout.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb_out), export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=False, export_skins=True, export_influence_nb=4,
                              export_animations=False, export_extras=True, export_materials="NONE")
    blend_out = out / f"{creature}_blockout.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out))
    lap("export")

    # Validators (Blender side): nothing blocks here but a crash; every result is reported.
    root = rig.data.bones["root"]
    head_sock = rig.data.bones["socket_head"].head_local
    deform = [b for b in rig.data.bones if b.use_deform]
    v_final = verts_np(body)
    pts2, facts2 = landmarks.measure(v_final, back_h)
    comps = len(set(_components(body)))
    checks = [
        {"name": "height: top of back 0.57 m within 2 percent", "value": round(facts2["backTopZ"], 4),
         "pass": abs(facts2["backTopZ"] - back_h) <= 0.02 * back_h},
        {"name": "forward is -Y (nose ahead of the tail, head socket at negative y)",
         "value": {"noseY": round(facts2["noseTip"][1], 4), "tailTipY": round(float(v_final[:, 1].max()), 4),
                   "headSocketY": round(head_sock.y, 4)},
         "pass": facts2["noseTip"][1] < 0 < float(v_final[:, 1].max()) and head_sock.y < 0},
        {"name": "root joint at the origin", "value": [round(x, 6) for x in root.head_local],
         "pass": root.head_local.length < 1e-6},
        {"name": "ground: lowest vertex at z 0", "value": round(float(v_final[:, 2].min()), 5),
         "pass": abs(float(v_final[:, 2].min())) < 1e-4},
        {"name": "one closed manifold", "value": {"components": comps, "nonManifoldEdges": st["nonManifoldEdges"],
                                                  "boundaryEdges": st["boundaryEdges"]},
         "pass": comps == 1 and st["nonManifoldEdges"] == 0},
        {"name": "triangles under 300,000", "value": st["triangles"], "pass": st["triangles"] < 300000},
        {"name": "joints within 60", "value": {"joints": len(rig.data.bones), "deform": len(deform)},
         "pass": len(rig.data.bones) <= 60},
        {"name": "influences within 4", "value": max_inf, "pass": max_inf <= 4},
        {"name": "unweighted vertices 0", "value": unweighted_final, "pass": unweighted_final == 0},
        {"name": "weights normalized", "value": report["bind"]["weightSumRange"],
         "pass": abs(min(sums) - 1) < 1e-3 and abs(max(sums) - 1) < 1e-3},
        {"name": "joint naming rule", "value": sorted(b.name for b in rig.data.bones),
         "pass": all(_named(b.name) for b in rig.data.bones)},
        {"name": "socket tags present", "value": sorted(b["xalians"]["socket"] for b in rig.data.bones if "xalians" in b),
         "pass": {"ground", "head", "eye_l", "eye_r", "emitter", "status", "carry"} <=
                 {b["xalians"]["socket"] for b in rig.data.bones if "xalians" in b}},
        {"name": "deformation: no joint region loses more than 30 percent volume in any pose",
         "value": {k: f["regionsOver30PercentLoss"] for k, f in pose_facts.items()},
         "pass": all(not f["regionsOver30PercentLoss"] for f in pose_facts.values())},
    ]
    validators = {"stage": "04-blockout", "where": "Blender, before export", "blocking": "none at this stage "
                  "(only a crash blocks); every result reported", "checks": checks,
                  "passed": sum(1 for c in checks if c["pass"]), "total": len(checks)}
    (out / "validators.json").write_text(json.dumps(validators, indent=1, default=float), encoding="utf-8")

    report.update({"measurements": props, "facts": facts2, "poses": pose_facts, "renders": renders,
                   "joints": len(rig.data.bones), "deformJoints": len(deform), "seconds": TIMES,
                   "glb": str(glb_out), "blend": str(blend_out)})
    (out / "blender_report.json").write_text(json.dumps(report, indent=1, default=float), encoding="utf-8")
    lap("done")
    print("XALIANS_BLOCKOUT", json.dumps({"seconds": TIMES, "triangles": st["triangles"],
                                         "validators": f"{validators['passed']}/{validators['total']}"}))


def _components(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    seen = set()
    labels = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        seen.add(v.index)
        while stack:
            cur = stack.pop()
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if o.index not in seen:
                    seen.add(o.index)
                    stack.append(o)
        labels.append(v.index)
    bm.free()
    return labels


def _named(name):
    import re
    return bool(re.fullmatch(r"root|socket_[a-z_]+|(spine|neck|head|jaw|tail)_\d\d|(leg)_(fl|fr|hl|hr)_\d\d|"
                             r"(ear|horn)_(l|r)_\d\d", name))


main()
