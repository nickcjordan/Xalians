"""Stage 5 part 1 for Luceras: rebuild the head on the approved blockout (run inside Blender 5.2).

    blender -b --factory-startup --python-exit-code 1 <blockout.blend> --python build_head.py -- --out <dir> --tag <t> [--final]

Steps: keep the blockout body; cut the neck at plane 1 and take the neck-and-head chunk; strip the old head (beyond
the skull plane), old ears, old horns; build the new skull, muzzle, jaw and cheeks as metaball ellipsoids; add ear
shells; union by voxel remesh; blend the neck seam; sculpt lids around the eyeballs, the nose, the split lip and
mouth line with numpy brushes; bridge the head back onto the untouched body at plane 1; transfer skin weights from
the blockout; sweep ridged horns along the fitted centerline; add eyeballs and whisker tubes, all bone-parented to
head_01. Writes renders for the tag; with --final also the blend, glbs and measurements.
"""

import json
import math
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / "roster")]

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.kdtree import KDTree  # noqa: E402

import headcam  # noqa: E402
import hornpath  # noqa: E402
import lookdev  # noqa: E402
import sculptkit as sk  # noqa: E402

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


OUT = Path(arg("--out"))
TAG = arg("--tag", "iter")
FINAL = "--final" in ARGS
OUT.mkdir(parents=True, exist_ok=True)
LOG = {}


def lap(k):
    LOG[k] = round(time.time() - T0, 1)
    print(f"[{LOG[k]:7.1f}s] {k}", flush=True)


# ------------------------------------------------------------------ the spec (meters, -Y forward, +X left)

NECK_A = np.array([0.0, -0.109, 0.437])
NECK_B = np.array([0.0, -0.175, 0.537])
N1 = (NECK_B - NECK_A) / np.linalg.norm(NECK_B - NECK_A)
P1 = NECK_A + 0.25 * (NECK_B - NECK_A)          # body/head seam plane
GAP = 0.006
P2 = NECK_A + 0.62 * (NECK_B - NECK_A)          # upper neck plane: blockout neck kept from plane 1 to here
M2 = np.array([0.0, N1[2], -N1[1]])             # in the plane, pointing back and up (toward the nape)
PH = np.array([0.0, -0.186, 0.537])             # skull plane (reference for the seam blend)
NH = np.array([0.0, -0.985, -0.172]); NH /= np.linalg.norm(NH)

EYE_R = 0.0130
EYE_C = np.array([0.034, -0.245, 0.568])        # first guess; seated on the surface after the union
EYE_LOOK = np.array([0.52, -0.83, 0.20]); EYE_LOOK /= np.linalg.norm(EYE_LOOK)
EYE_PROUD = 0.42                                 # fraction of the radius left in front of the surface

SKULL = [
    dict(co=(0, -0.207, 0.580), half=(0.048, 0.045, 0.039), rot=(10, 0, 0)),     # braincase
    dict(co=(0, -0.250, 0.551), half=(0.041, 0.052, 0.031), rot=(28, 0, 0)),     # face wedge, sloping to the nose
    dict(co=(0, -0.285, 0.512), half=(0.029, 0.020, 0.021), rot=(12, 0, 0)),     # muzzle, blunt
    dict(co=(0, -0.252, 0.490), half=(0.024, 0.046, 0.013), rot=(8, 0, 0)),      # jaw
    dict(co=(0, -0.289, 0.489), half=(0.008, 0.009, 0.006)),                     # chin
    dict(co=(0, -0.3098, 0.5170), half=(0.0100, 0.0052, 0.0056), rot=(-25, 0, 0), stiff=4.0),  # nose pad, wide on top
    dict(co=(0, -0.3092, 0.5115), half=(0.0042, 0.0045, 0.0045), stiff=4.0),     # nose pad, point at the split
    dict(co=(0, -0.207, 0.497), half=(0.025, 0.028, 0.024)),                     # throat
    dict(co=(0, -0.185, 0.552), half=(0.036, 0.028, 0.045)),                     # occiput
]
for sx in (1, -1):
    SKULL += [
        dict(co=(sx * 0.033, -0.246, 0.528), half=(0.025, 0.033, 0.024), rot=(15, 0, 0)),  # cheek
        dict(co=(sx * 0.0128, -0.2995, 0.4995), half=(0.0145, 0.0115, 0.0115), stiff=2.5),  # whisker pad
        dict(co=(sx * 0.021, -0.279, 0.523), half=(0.019, 0.024, 0.019), rot=(20, 0, 0)),  # maxilla: cheek into muzzle
    ]

EAR = dict(base=(0.042, -0.182, 0.596), up=(0.70, 0.20, 0.69), face=(0.68, -0.72, 0.10),
           height=0.052, width=0.038, cup=0.0105, thick=0.003)

HORN_R0, HORN_TIP = 0.0225, 0.0012


# ------------------------------------------------------------------ helpers

def signed(P, p, n):
    return (np.asarray(P) - p) @ n


def neck_region(v):
    return abs(v.y - P1[1]) < 0.11 and v.z > 0.36


def strip_old_head(chunk):
    sk.cut_keep(chunk, PH, NH, keep_positive=False, fill=True)
    # old ears behind the skull plane
    bm = bmesh.new()
    bm.from_mesh(chunk.data)
    kill = [v for v in bm.verts if abs(v.co.x) > 0.040 and v.co.z > 0.585 and v.co.y > -0.205]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bnd = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
    bm.to_mesh(chunk.data)
    bm.free()
    return 0


def ear_shell(spec, side):
    nu, nv = 18, 22
    W, H = spec["width"] / 2, spec["height"]
    verts, faces = [], []
    for j in range(nv + 1):
        v = j / nv
        w = W * math.sqrt(max(0.0, 1 - ((v - 0.42) / 0.58) ** 2))
        for i in range(nu + 1):
            u = (i / nu) * 2 - 1
            # rounded top: pull the top row's corners down
            vv = v * H - 0.010
            depth = spec["cup"] * (1 - u * u) * math.sin(math.pi * min(v * 0.9 + 0.1, 1.0))
            verts.append((u * w, vv, depth))  # hollow opens toward the face direction
        if j:
            for i in range(nu):
                a = (j - 1) * (nu + 1) + i
                faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    o = sk.mesh_from(f"ear_{side}", verts, faces)
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = spec["thick"]
    m.offset = 0.0
    m.use_rim = True
    sm = o.modifiers.new("sub", "SUBSURF")
    sm.levels = 1
    solid = sk.evaluated_copy(o, f"ear_{side}_solid")
    bpy.data.objects.remove(o, do_unlink=True)
    # local frame: x across the ear, y up the ear, -z the hollow side -> world
    sx = 1 if side == "l" else -1
    up = np.array(spec["up"], float) * [sx, 1, 1]; up /= np.linalg.norm(up)
    face = np.array(spec["face"], float) * [sx, 1, 1]; face -= up * (face @ up); face /= np.linalg.norm(face)
    across = np.cross(up, face)
    R = np.stack([across, up, -face], 1)  # columns: local x, y, z
    P = sk.co(solid)
    sk.set_co(solid, P @ R.T + np.array(spec["base"]) * [sx, 1, 1])
    return solid


def horn(side):
    pts, tan, s = hornpath.centerline(None, 460)
    sx = 1 if side == "l" else -1
    pts = pts * [sx, 1, 1]
    # outer side of the curl (the keel the ridges stand proud on): opposite the curvature vector
    k = np.gradient(tan * [sx, 1, 1], axis=0)
    T, N, B = sk.frames(pts)
    seg_len = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    arc = np.concatenate([[0], np.cumsum(seg_len)])
    L = arc[-1]
    r = HORN_TIP + (HORN_R0 - HORN_TIP) * (1 - arc / L) ** 0.7
    spacing = 0.0040 + 0.0075 * (r / HORN_R0)
    phase = np.concatenate([[0], np.cumsum(seg_len / spacing[:-1])])
    kn = np.linalg.norm(k, axis=1) + 1e-9
    outer = -k / kn[:, None]
    th_out = np.arctan2((outer * B).sum(1), (outer * N).sum(1))
    fade = np.clip((0.86 - arc / L) / 0.14, 0, 1)

    def rad(i, t):
        face = math.cos(t - th_out[i])
        rr = r[i] * (1 - 0.10 * max(0.0, face) ** 2)          # flatter outer face
        ph = phase[i] + 0.10 * math.sin(2 * t + 0.9 * phase[i]) + 0.05 * math.sin(3 * t - 0.4 * phase[i])
        fr = ph - math.floor(ph)
        crest = (0.5 + 0.5 * math.cos(2 * math.pi * fr)) ** 2.2
        amp = 0.075 * fade[i] * (0.5 + 0.5 * max(0.0, face))
        base_flare = 1 + 0.05 * max(0.0, 1 - arc[i] / 0.02)
        return rr * base_flare * (1 + amp * crest)

    o, _ = sk.sweep(f"horn_{side}", pts, rad, segments=32)
    return o, dict(baseToTip=float(np.linalg.norm(pts[-1] - pts[0])), arc=float(L), tip=pts[-1].tolist(),
                   top=pts[np.argmax(pts[:, 2])].tolist(), maxX=float(np.abs(pts[:, 0]).max()))


WHISKER_ROOTS = [(0.0170, -0.2970, 0.5045), (0.0200, -0.2950, 0.5005), (0.0220, -0.2925, 0.4965),
                 (0.0150, -0.2990, 0.5005), (0.0180, -0.2970, 0.4965), (0.0205, -0.2940, 0.4925),
                 (0.0230, -0.2910, 0.5025)]


def whiskers(side):
    sx = 1 if side == "l" else -1
    objs = []
    rng = np.random.default_rng(7)
    for i, root in enumerate(WHISKER_ROOTS):
        root = np.array(root) * [sx, 1, 1]
        fan = (i - 3) / 3.0
        d0 = np.array([sx * 0.80, 0.30 + 0.05 * rng.normal(), -0.05 - 0.22 * (root[2] < 0.499) + 0.14 * fan])
        d0 /= np.linalg.norm(d0)
        length = 0.105 + 0.030 * rng.random()
        n = 24
        pts = []
        p = root.copy()
        d = d0.copy()
        for j in range(n):
            pts.append(p.copy())
            d = d + np.array([0, 0.004, -0.010])  # gentle droop and sweep back
            d /= np.linalg.norm(d)
            p = p + d * length / (n - 1)
        pts = np.array(pts)
        o, _ = sk.sweep(f"whisker_{side}{i}", pts, lambda j, t: 0.00045 * (1 - j / (n - 1)) + 0.00008, segments=5)
        objs.append(o)
    w = sk.join(objs, f"whiskers_{side}")
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    return w


def transfer_weights(src_obj, src_P, dst_obj):
    names = [g.name for g in src_obj.vertex_groups]
    W = np.zeros((len(src_P), len(names)))
    for v in src_obj.data.vertices:
        for g in v.groups:
            W[v.index, g.group] = g.weight
    kd = KDTree(len(src_P))
    for i, p in enumerate(src_P):
        kd.insert(p, i)
    kd.balance()
    dst_obj.vertex_groups.clear()
    groups = [dst_obj.vertex_groups.new(name=n) for n in names]
    P = sk.co(dst_obj)
    for vi, p in enumerate(P):
        hits = kd.find_n(Vector(p), 4)
        ws = np.array([1.0 / (h[2] + 1e-5) for h in hits])
        ws /= ws.sum()
        row = sum(w * W[h[1]] for w, h in zip(ws, hits))
        s = row.sum()
        if s > 0:
            row = row / s
        for gi in np.nonzero(row > 1e-3)[0]:
            groups[gi].add([vi], float(row[gi]), "REPLACE")


# ------------------------------------------------------------------ build

def main():
    body = bpy.data.objects["luceras_blockout"]
    rig = bpy.data.objects["luceras_rig"]
    old_pose = rig.data.pose_position
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    blk_P = sk.co(body).copy()
    blk_copy = bpy.data.objects.new("blockout_ref", body.data.copy())
    bpy.context.scene.collection.objects.link(blk_copy)
    blk_copy.hide_render = True
    blk_tree = sk.bvh(blk_copy)
    lap("load")

    # chunk: neck and head beyond plane 1, closed at the cut
    chunk = bpy.data.objects.new("head_chunk", body.data.copy())
    bpy.context.scene.collection.objects.link(chunk)
    chunk.vertex_groups.clear()
    P0 = P1 - N1 * 0.016
    sk.cut_keep(chunk, P0, N1, keep_positive=True, fill=True, region=neck_region)
    bm = bmesh.new(); bm.from_mesh(chunk.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co - Vector(P0)).dot(Vector(N1)) < -1e-6], context="VERTS")
    bm.to_mesh(chunk.data); bm.free()
    sk.keep_largest(chunk)
    sk.cut_keep(chunk, P2, N1, keep_positive=False, fill=False, region=neck_region)
    bm = bmesh.new(); bm.from_mesh(chunk.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co - Vector(P2)).dot(Vector(N1)) > 1e-6], context="VERTS")
    bm.to_mesh(chunk.data); bm.free()
    sk.keep_near(chunk, (P1 + P2) / 2 + M2 * 0.03)
    Pc = sk.co(chunk)
    ring = Pc[np.abs(signed(Pc, P2, N1)) < 1e-5]
    rc = (ring.max(0) + ring.min(0)) / 2
    wx = float(np.abs(ring[:, 0] - rc[0]).max())
    mm = (ring - rc) @ M2
    wm_hi, wm_lo = float(mm.max()), float(-mm.min())
    rc = rc + M2 * (wm_hi - wm_lo) / 2
    wm = (wm_hi + wm_lo) / 2
    LOG["neckRing"] = dict(center=rc.round(4).tolist(), halfX=round(wx, 4), halfM=round(wm, 4))
    # continue the neck tube past the ring with a gentle taper (no shelf where the metaballs take over), then close it
    bm = bmesh.new(); bm.from_mesh(chunk.data)
    for k in range(3):
        bnd = [e for e in bm.edges if e.is_boundary]
        res = bmesh.ops.extrude_edge_only(bm, edges=bnd)
        nv = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
        for v in nv:
            p = np.array(v.co[:])
            v.co = Vector(rc + (p - rc) * 0.975 + N1 * 0.009)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bm.to_mesh(chunk.data); bm.free()
    tilt = math.degrees(math.atan2(-N1[1], N1[2]))
    SKULL.extend([
        dict(co=tuple(rc + N1 * 0.012), half=(wx * 0.90, wm * 0.90, 0.022), rot=(tilt, 0, 0), stiff=4.0),
        dict(co=tuple(rc + N1 * 0.036 + M2 * 0.002), half=(wx * 0.84, wm * 0.84, 0.026), rot=(tilt, 0, 0), stiff=3.0),
    ])
    lap(f"neck chunk {len(Pc)} verts, ring {LOG['neckRing']}")

    skull = sk.metaball("skull", SKULL, resolution=0.0012)
    ears = [ear_shell(EAR, s) for s in ("l", "r")]
    head = sk.join([chunk, skull] + ears, "luceras_head")
    for o in [chunk, skull] + ears:
        bpy.data.objects.remove(o, do_unlink=True)
    sk.voxel_remesh(head, 0.0012)
    sk.keep_largest(head)
    lap(f"union remesh: {len(head.data.vertices)} verts")

    # blend the junction between the kept neck and the new skull
    P = sk.co(head)
    s2 = signed(P, P2, N1)
    s1 = signed(P, P1, N1)
    keep1 = np.clip((s1 - 0.010) / 0.015, 0, 1)
    w = np.exp(-((s2 - 0.004) / 0.020) ** 2) * keep1
    sk.smooth(head, 60, 0.5, w)
    # unify the metaball forms into one skull (not near the seam cut)
    sk.smooth(head, 8, 0.5, keep1)
    lap("seam blend")

    # face sculpt: seat the eyes on the surface, then wrap lids around them
    global EYE_C
    hit = sk.surface_hit(head, EYE_C + EYE_LOOK * 0.05, -EYE_LOOK)
    if hit is not None:
        EYE_C = hit - EYE_LOOK * (EYE_R * (1 - EYE_PROUD))
        EYE_C[0] = abs(EYE_C[0])
    LOG["eyeCenter"] = EYE_C.round(4).tolist()
    up = np.array([0, 0, 1.0])
    for sx in (1, -1):
        c = EYE_C * [sx, 1, 1]
        look = EYE_LOOK * [sx, 1, 1]
        sk.eyelids(head, c, EYE_R, look, up, aperture=(0.86, 0.58), lid=0.0012, rim=0.0010)
    # nose: nostril commas and the split under it
    for sx in (1, -1):
        sk.groove(head, [(sx * 0.0030, -0.3150, 0.5135), (sx * 0.0068, -0.3130, 0.5110), (sx * 0.0080, -0.3100, 0.5083)],
                  depth=0.0015, width=0.0009)
    # back edge of the jaw (separates cheek from throat, as in the shaved clay side)
    for sx in (1, -1):
        sk.groove(head, [(sx * 0.040, -0.200, 0.535), (sx * 0.035, -0.208, 0.505), (sx * 0.024, -0.218, 0.482),
                         (sx * 0.010, -0.222, 0.474)], depth=0.0022, width=0.0055)
    # philtrum and mouth line (inverted Y, hare-like split lip)
    sk.groove(head, [(0, -0.3150, 0.5080), (0, -0.3130, 0.4990)], depth=0.0013, width=0.0008)
    for sx in (1, -1):
        sk.groove(head, [(0, -0.3120, 0.4990), (sx * 0.006, -0.3085, 0.4930), (sx * 0.0125, -0.3015, 0.4900),
                         (sx * 0.0175, -0.2935, 0.4905)], depth=0.0009, width=0.0008)
    sk.voxel_remesh(head, 0.0013)
    sk.keep_largest(head)
    P = sk.co(head)
    s1 = signed(P, P1, N1)
    sk.smooth(head, 2, 0.3, np.clip((s1 - 0.010) / 0.02, 0, 1))
    # clean the lid margins (voxel steps along the almond rim)
    for sx in (1, -1):
        d = np.linalg.norm(P - EYE_C * [sx, 1, 1], axis=1)
        sk.smooth(head, 10, 0.45, np.clip((EYE_R * 2.0 - d) / (EYE_R * 0.6), 0, 1))
    lap(f"face sculpt: {len(head.data.vertices)} verts")

    head_part = bpy.data.objects.new("luceras_head_part", head.data.copy())
    bpy.context.scene.collection.objects.link(head_part)

    # attach to the untouched body at plane 1
    sk.cut_keep(head, P1 + N1 * GAP, N1, keep_positive=True, fill=False, region=neck_region)
    sk.keep_largest(head)
    newbody = bpy.data.objects.new("body_tmp", body.data.copy())
    bpy.context.scene.collection.objects.link(newbody)
    sk.cut_keep(newbody, P1, N1, keep_positive=False, fill=False, region=neck_region)
    bm = bmesh.new(); bm.from_mesh(newbody.data)
    kill = [v for v in bm.verts if (v.co - Vector(P1)).dot(Vector(N1)) > 1e-6 and v.co.y < 0.0 and v.co.z > 0.40]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(newbody.data); bm.free()
    sk.keep_largest(newbody)
    merged = sk.join([newbody, head], "merged")
    vids, left = sk.bridge_open_loops(merged)
    P = sk.co(merged)
    s1 = signed(P, P1, N1)
    band = np.exp(-((s1 - GAP / 2) / 0.011) ** 2) * (np.abs(P[:, 1] - P1[1]) < 0.12)
    sk.smooth(merged, 18, 0.5, band)
    lap(f"attach: bridge faces verts {len(vids)}, open edges left {left}")
    for o in (newbody, head):
        bpy.data.objects.remove(o, do_unlink=True)

    old_me = body.data
    body.data = merged.data
    body.data.name = "luceras_body"
    bpy.data.objects.remove(merged, do_unlink=True)
    transfer_weights(blk_copy, blk_P, body)
    lap("weights")

    # rigid parts
    parts = {}
    horn_info = {}
    for s in ("l", "r"):
        o, info = horn(s)
        parts[f"horn_{s}"] = o
        horn_info[s] = info
        parts[f"eye_{s}"] = sk.sphere(f"eye_{s}", tuple(EYE_C * [1 if s == "l" else -1, 1, 1]), EYE_R, 32, 18)
        parts[f"whiskers_{s}"] = whiskers(s)
    for o in parts.values():
        sk.bone_parent(o, rig, "head_01")
    lap("rigid parts")

    # renders
    lookdev.setup_scene("EEVEE")
    for o in [body] + list(parts.values()):
        lookdev.apply_clay(o)
    for o in (blk_copy, head_part):
        o.hide_render = True
    bounds = (Vector((-0.16, -0.33, 0.44)), Vector((0.16, -0.05, 0.75)))
    cams = headcam.frame_head(bounds)
    rdir = OUT / "renders"
    rdir.mkdir(exist_ok=True)
    headcam.render_set(cams, str(rdir), prefix=f"{TAG}_", size=1024 if FINAL else 768)
    lap("head renders")

    meas = measure(body, head_part, parts, horn_info, blk_tree)
    (OUT / f"measurements_{TAG}.json").write_text(json.dumps(meas, indent=1))

    if FINAL:
        full = lookdev.frame_cameras([body] + list(parts.values()))
        for name, cam in full.items():
            lookdev.render(cam, str(rdir / f"full_{name}.png"), size=1024)
        lookdev.render(full["side_left"], str(rdir / "sprite_side_192.png"), size=192)
        lap("full renders")
        rig.data.pose_position = old_pose
        bpy.data.objects.remove(blk_copy, do_unlink=True)
        # head part file: skull mesh plus rigid parts, unparented copies in world space
        head_part.hide_render = False
        blend = OUT / "head.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
        export_glb(OUT / "head.glb", [body, rig] + list(parts.values()), skin=True)
        hp_objs = [head_part]
        for k, o in parts.items():
            c = bpy.data.objects.new(f"part_{k}", o.data)
            bpy.context.scene.collection.objects.link(c)
            c.matrix_world = o.matrix_world.copy()
            hp_objs.append(c)
        export_glb(OUT / "head_part.glb", hp_objs, skin=False)
        lap("saved")
    LOG["total"] = round(time.time() - T0, 1)
    (OUT / f"blender_log_{TAG}.json").write_text(json.dumps(LOG, indent=1))


def export_glb(path, objs, skin):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                              export_skins=skin, export_animations=False, export_apply=False)


def measure(body, head_part, parts, horn_info, blk_tree):
    P = sk.co(head_part)
    m = {}
    nose = P[np.argmin(P[:, 1])]
    m["noseTip"] = nose.round(4).tolist()
    m["headLengthM"] = round(float(-0.175 - nose[1]), 4)
    crown = P[(np.abs(P[:, 0]) < 0.004) & (P[:, 1] < -0.19) & (P[:, 1] > -0.23)]
    m["crownZ"] = round(float(crown[:, 2].max()), 4) if len(crown) else None
    sl = P[(P[:, 1] > -0.27) & (P[:, 1] < -0.20) & (P[:, 2] > 0.49) & (P[:, 2] < 0.60)]
    m["skullWidthM"] = round(float(sl[:, 0].max() - sl[:, 0].min()), 4)
    m["muzzleLengthM"] = round(float((EYE_C[1] - EYE_R) - nose[1]), 4)
    m["eyeDiameterM"] = round(2 * EYE_R, 4)
    m["eyeSpacingM"] = round(2 * float(EYE_C[0]), 4)
    m["hornBaseToTipM"] = round(horn_info["l"]["baseToTip"], 4)
    m["hornArcLengthM"] = round(horn_info["l"]["arc"], 4)
    allh = []
    for k in ("horn_l", "horn_r"):
        o = parts[k]
        M = np.array(o.matrix_world)
        Q = sk.co(o)
        allh.append(Q @ M[:3, :3].T + M[:3, 3])
    allh = np.vstack(allh)
    m["hornSpanM"] = round(float(allh[:, 0].max() - allh[:, 0].min()), 4)
    m["hornTopZ"] = round(float(allh[:, 2].max()), 4)
    m["hornTip"] = horn_info["l"]["tip"]
    ear = P[(P[:, 0] > 0.045) & (P[:, 1] > -0.205) & (P[:, 2] > 0.59)]
    m["earHeightM"] = round(float(np.linalg.norm(ear.max(0) - ear.min(0))) if len(ear) else 0, 4)
    m["earExtent"] = (ear.max(0) - ear.min(0)).round(4).tolist() if len(ear) else None
    m["triangles"] = {"head_part_skull": sk.tri_count(head_part), "body_with_head": sk.tri_count(body)}
    for k, o in parts.items():
        m["triangles"][k] = sk.tri_count(o)
    m["triangles"]["headAndHornsTotal"] = (m["triangles"]["head_part_skull"] + m["triangles"]["horn_l"]
                                          + m["triangles"]["horn_r"] + m["triangles"]["eye_l"] + m["triangles"]["eye_r"]
                                          + m["triangles"]["whiskers_l"] + m["triangles"]["whiskers_r"])
    B = sk.co(body)
    s1 = signed(B, P1, N1)
    d = sk.nearest_dist(blk_tree, B)
    out = s1 < 0
    neck = (s1 >= 0) & (signed(B, PH, NH) < -0.025)
    m["displacementOutsideHead"] = {"region": "body side of the neck seam plane (plane 1)", "verts": int(out.sum()),
                                    "maxM": float(np.nanmax(d[out])), "meanM": float(np.nanmean(d[out]))}
    m["displacementNeckBlend"] = {"region": "plane 1 to 2.5 cm short of the skull plane (declared neck blend)",
                                  "verts": int(neck.sum()), "maxM": float(np.nanmax(d[neck])), "meanM": float(np.nanmean(d[neck]))}
    m["closedManifoldNonManifoldEdges"] = {"body_with_head": sk.nonmanifold_edges(body), "head_part": sk.nonmanifold_edges(head_part)}
    return m


main()
