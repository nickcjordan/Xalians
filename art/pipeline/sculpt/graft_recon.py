"""Place a head reconstruction (Hunyuan3D-2 shape.glb, facing -Y, unit cube) on the Luceras blockout head.

Used by build_head.py (pass 3). Scale is set so the skull width (x extent in the box y -0.27..-0.20,
z 0.49..0.60, below the horn line, same definition as pass 1 and 2) matches a target; pitch and translation are
chosen so the reconstruction's neck section at the upper neck plane centers on the kept blockout neck ring and the
nose tip lands at a target height. Then the reconstruction's own horns, ears and whisker spikes are removed:
everything above the horn cut surface, everything lateral of the skull in the ear band, then the largest piece.
"""

import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import sculptkit as sk


def import_glb(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    ms = [o for o in new if o.type == "MESH"]
    o = sk.join(ms, name)
    for x in new:
        bpy.data.objects.remove(x, do_unlink=True)
    return o


def rot_x(deg):
    a = math.radians(deg)
    return np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])


def skull_width(W):
    box = W[(W[:, 1] > -0.27) & (W[:, 1] < -0.20) & (W[:, 2] > 0.49) & (W[:, 2] < 0.60) & (np.abs(W[:, 0]) < 0.075)]
    # leave out the reconstruction's ear roots (removed later by strip_parts with the same rule)
    box = box[~((box[:, 2] > 0.555) & (box[:, 1] > -0.228) & (np.abs(box[:, 0]) > 0.052))]
    return float(box[:, 0].max() - box[:, 0].min()) if len(box) else 0.0


def place(P0, width, ring_c, plane_p, plane_n, nose_z, pitches=np.arange(-20, 21, 2.0)):
    """Return (scale, pitch, translation, report) for raw recon points P0."""
    best = None
    c0 = P0.mean(0)
    for pitch in pitches:
        R = rot_x(pitch)
        s = 0.14 / (P0[:, 1].max() - P0[:, 1].min()) * 4.0
        t = np.zeros(3)
        for _ in range(6):
            W = (P0 - c0) @ R.T * s + t
            # neck section at the plane: centroid of points within 2 mm of it, below the jaw line
            d = (W - plane_p) @ plane_n
            sec = W[(np.abs(d) < 0.002) & (W[:, 2] < ring_c[2] + 0.08) & (np.abs(W[:, 0]) < 0.09)]
            if len(sec) < 20:
                t = t + (ring_c - W.mean(0))
                continue
            sc = (sec.max(0) + sec.min(0)) / 2
            t = t + (ring_c - sc) * np.array([0, 1, 1])
            W = (P0 - c0) @ R.T * s + t
            w = skull_width(W)
            if w > 0:
                s *= 0.117 / w if width is None else width / w
        W = (P0 - c0) @ R.T * s + t
        nose = W[np.argmin(W[:, 1])]
        err = abs(nose[2] - nose_z)
        if best is None or err < best[0]:
            best = (err, s, pitch, t.copy(), nose.copy(), skull_width(W))
    err, s, pitch, t, nose, w = best
    return s, pitch, t, c0, dict(scale=float(s), pitchDeg=float(pitch), noseTip=nose.round(4).tolist(),
                                 noseZError=float(err), skullWidth=w)


def strip_parts(obj, horn_cut, ear_band, ear_halfx, keep_point):
    """Delete horn, ear and whisker growth from a placed reconstruction, fill holes, keep the head piece."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    kill = []
    for v in bm.verts:
        x, y, z = v.co
        if horn_cut(x, y, z):
            kill.append(v)
        elif ear_band[0] < z < ear_band[1] and abs(x) > ear_halfx(y, z):
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    sk.keep_near(obj, keep_point)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return len(kill)


def _box(name, lo, hi, rot=None, pivot=None):
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    c = (lo + hi) / 2
    h = (hi - lo) / 2
    V = np.array([[sx, sy, sz] for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]) * h + c
    if rot is not None:
        V = (V - pivot) @ rot.T + pivot
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return sk.mesh_from(name, V, F)


def cut_boxes(obj, boxes):
    """Exact boolean difference of each box from obj (obj must be closed), applied in turn."""
    for i, bx in enumerate(boxes):
        m = obj.modifiers.new(f"cut{i}", "BOOLEAN")
        m.operation = "DIFFERENCE"
        m.solver = "EXACT"
        m.object = bx
        with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
            bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(bx, do_unlink=True)


def strip_parts_bool(obj, voxel, horn_cut_z, ear_halfx, ear_band, ear_front_y, neck_plane, keep_point):
    """Closed-surface version of strip_parts: voxel remesh the reconstruction (closes it), then cut the horns, the
    nape behind the horns, the ear roots and the lower neck away with exact booleans, then keep the head piece."""
    sk.voxel_remesh(obj, voxel)
    sk.keep_near(obj, keep_point)
    B = 1.0
    boxes = [
        _box("cut_horns", (-B, -B, horn_cut_z), (B, B, B)),
        _box("cut_nape", (-B, -0.150, 0.600), (B, B, B)),
        _box("cut_ear_l", (ear_halfx, ear_front_y, ear_band[0]), (B, B, ear_band[1])),
        _box("cut_ear_r", (-B, ear_front_y, ear_band[0]), (-ear_halfx, B, ear_band[1])),
    ]
    p, n = neck_plane
    # a box whose top face is the neck plane: everything on the body side of it goes
    z = np.array([0.0, 0.0, 1.0])
    ax = np.cross(z, n)
    ang = math.acos(float(np.clip(z @ n, -1, 1)))
    from mathutils import Matrix, Vector as V3
    R = np.array(Matrix.Rotation(ang, 3, V3(ax / (np.linalg.norm(ax) + 1e-12))))
    boxes.append(_box("cut_neck", p + np.array([-B, -B, -2 * B]), p + np.array([B, B, 0.0]), rot=R, pivot=p))
    cut_boxes(obj, boxes)
    sk.keep_near(obj, keep_point)
    return sk.nonmanifold_edges(obj)
