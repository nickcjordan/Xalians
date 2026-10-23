"""B-sntv pass 7: visibility of crossing pairs from the 8 audit camera directions (shared by the gate, brisket and shot sculpt tools).

measure(V, X, F, TDOM, gn) -> dict(pairs, visible, hidden, hidden_buried_max_mm, hidden_over_5mm, visible_by_camera,
visible_bones, visible_pairs (list), deep_pairs (hidden, buried > 5 mm))
"""
import math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri


def cam_dir(az, el):
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


CAMS = {'left': (90, 0), 'right': (-90, 0), 'front': (0, 0), 'back': (180, 0), 'top': (0, 90), 'underside': (0, -90),
        'low34_front_left': (45, -12), 'low34_rear_left': (135, -12)}


def crossing_points(V, a, b, F):
    pts = []
    for s, t in ((a, b), (b, a)):
        T = [Vector(V[i]) for i in F[t]]
        for k in range(3):
            p0, p1 = Vector(V[F[s][k]]), Vector(V[F[s][(k + 1) % 3]]); d = p1 - p0; L = d.length
            if L < 1e-9: continue
            h = intersect_ray_tri(T[0], T[1], T[2], d / L, p0, False)
            if h is not None and (h - p0).length <= L: pts.append(h)
    return pts


def buried(V, a, b, F):
    best = 0.0
    for s, t in ((a, b), (b, a)):
        T = V[F[t]]; n = np.cross(T[1] - T[0], T[2] - T[0]); nn = np.linalg.norm(n)
        if nn < 1e-14: continue
        n /= nn
        for vi in F[s]:
            sd = float((V[vi] - T[0]) @ n); best = max(best, abs(sd)) if sd < 0 else best
    return best


def measure(V, X, F, TDOM, gn):
    tree = BVHTree.FromPolygons(V.tolist(), F.tolist(), all_triangles=True)
    dirs = {k: cam_dir(*v) for k, v in CAMS.items()}
    vis, hid, seen_by, deep = [], [], {}, []
    for a, b in X:
        pts = crossing_points(V, a, b, F) or [Vector(V[F[a]].mean(0))]
        cams = set()
        for p in pts:
            for k, d in dirs.items():
                if tree.ray_cast(p + d * 4e-4, d, 10.0)[0] is None: cams.add(k)
        if cams:
            vis.append((a, b))
            for k in cams: seen_by[k] = seen_by.get(k, 0) + 1
        else:
            bd = buried(V, a, b, F); hid.append(bd)
            if bd > 0.005: deep.append((a, b))
    bp = {}
    for a, b in vis:
        k = '|'.join(sorted((gn[TDOM[a]], gn[TDOM[b]]))); bp[k] = bp.get(k, 0) + 1
    return dict(pairs=len(X), visible=len(vis), hidden=len(hid), hidden_buried_max_mm=round(max(hid) * 1000, 1) if hid else 0.0,
                hidden_over_5mm=int(sum(1 for h in hid if h > 0.005)), visible_by_camera=seen_by,
                visible_bones=sorted(bp.items(), key=lambda x: -x[1])[:6], visible_pairs=vis, deep_pairs=deep)


