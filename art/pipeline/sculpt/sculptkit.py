"""Generic Blender sculpt helpers for stage 5 parts (bpy + numpy, run inside Blender).

Volume building: metaball ellipsoids given as intended half-axes, mesh shells (ears), voxel remesh unions.
Surface sculpting: numpy displacement brushes on dense meshes (grooves along polylines, bulges, eyelid shells
around an eyeball), Laplacian smoothing with per-vertex weights. Attachment: cut a part and a body at a plane
and bridge the two open loops. Rigid parts: swept tubes along centerlines (horns, whiskers), spheres (eyes).
"""

import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

MB_K = 0.56  # surface half-extent per unit metaball radius at stiffness 2, threshold 0.6 (measured)
_K_TABLE = ((1.0, 0.39), (2.0, 0.56), (4.0, 0.68), (8.0, 0.76))  # stiffness -> K, measured in Blender 5.2


def mb_k(stiff):
    xs, ys = zip(*_K_TABLE)
    return float(np.interp(stiff, xs, ys))


# ---------------------------------------------------------------- mesh <-> numpy

def co(obj):
    me = obj.data
    a = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def set_co(obj, P):
    obj.data.vertices.foreach_set("co", np.asarray(P, dtype=float).ravel())
    obj.data.update()


def normals(obj):
    me = obj.data
    a = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("normal", a)
    return a.reshape(-1, 3)


def edges(obj):
    me = obj.data
    a = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", a)
    return a.reshape(-1, 2)


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def new_obj(name, me):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def mesh_from(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    return new_obj(name, me)


def evaluated_copy(obj, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    o = new_obj(name, me)
    o.matrix_world = obj.matrix_world.copy()
    return o


# ---------------------------------------------------------------- volumes

def metaball(name, elements, resolution=0.0012, threshold=0.6):
    """elements: dicts with co, half (a, b, c) intended half-axes, optional rot (euler degrees xyz),
    neg (bool), stiff (default 2)."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = resolution
    mb.render_resolution = resolution
    mb.threshold = threshold
    for e in elements:
        a, b, c = e["half"]
        m = max(a, b, c)
        el = mb.elements.new(type="ELLIPSOID")
        el.co = e["co"]
        el.radius = m / mb_k(e.get("stiff", 2.0))
        el.size_x, el.size_y, el.size_z = a / m, b / m, c / m
        el.stiffness = e.get("stiff", 2.0)
        el.use_negative = bool(e.get("neg", False))
        if "quat" in e:
            el.rotation = Quaternion(e["quat"])
        elif "rot" in e:
            from mathutils import Euler
            el.rotation = Euler([math.radians(x) for x in e["rot"]], "XYZ").to_quaternion()
    o = new_obj(name, mb)
    bpy.context.view_layer.update()
    m = evaluated_copy(o, name + "_mesh")
    bpy.data.objects.remove(o, do_unlink=True)
    return m


def join(objs, name):
    """Join meshes into a new object (world space)."""
    bm = bmesh.new()
    for o in objs:
        me = o.data.copy()
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return new_obj(name, me)


def voxel_remesh(obj, size):
    obj.data.remesh_voxel_size = size
    obj.data.remesh_voxel_adaptivity = 0.0
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.voxel_remesh()
    return obj


def keep_largest(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    seen, comps = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    for c in comps[1:]:
        bmesh.ops.delete(bm, geom=c, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    return len(comps)


def keep_near(obj, point):
    """Keep only the connected piece holding the vertex nearest to point."""
    P = co(obj)
    start = int(np.argmin(np.linalg.norm(P - np.asarray(point), axis=1)))
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    seen = {start}
    stack = [bm.verts[start]]
    while stack:
        x = stack.pop()
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in seen:
                seen.add(y.index)
                stack.append(y)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in seen], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def surface_hit(obj, origin, direction):
    tree = bvh(obj)
    hit = tree.ray_cast(Vector(origin), Vector(direction))
    return None if hit[0] is None else np.array(hit[0][:])


def nonmanifold_edges(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    n = sum(1 for e in bm.edges if not e.is_manifold)
    bm.free()
    return n


# ---------------------------------------------------------------- brushes

def _seg_dist(P, A, B):
    AB = B - A
    t = np.clip(((P - A) @ AB) / max(AB @ AB, 1e-12), 0, 1)
    Q = A + t[:, None] * AB
    return np.linalg.norm(P - Q, axis=1)


def polyline_dist(P, pts):
    pts = np.asarray(pts, float)
    d = np.full(len(P), 1e9)
    for i in range(len(pts) - 1):
        d = np.minimum(d, _seg_dist(P, pts[i], pts[i + 1]))
    return d


def groove(obj, pts, depth, width, mask=None):
    """Push the surface inward along the normal near a polyline (gaussian cross profile)."""
    P, N = co(obj), normals(obj)
    d = polyline_dist(P, pts)
    w = np.exp(-(d / width) ** 2)
    if mask is not None:
        w *= mask
    set_co(obj, P - N * (depth * w)[:, None])


def bulge(obj, center, radii, amount, axis=None):
    """Push outward along normals inside an ellipsoidal falloff (negative amount pulls in)."""
    P, N = co(obj), normals(obj)
    q = (P - np.asarray(center)) / np.asarray(radii)
    r2 = (q * q).sum(1)
    w = np.where(r2 < 1, (1 - r2) ** 2, 0.0)
    D = N if axis is None else np.broadcast_to(np.asarray(axis, float), P.shape)
    set_co(obj, P + D * (amount * w)[:, None])


def smooth(obj, iters, factor, weights=None):
    """Laplacian smoothing with optional per-vertex weights (0 keeps a vertex fixed)."""
    P = co(obj)
    E = edges(obj)
    n = len(P)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    deg[deg == 0] = 1
    w = factor * (np.ones(n) if weights is None else np.asarray(weights))
    for _ in range(iters):
        S = np.zeros_like(P)
        np.add.at(S, E[:, 0], P[E[:, 1]])
        np.add.at(S, E[:, 1], P[E[:, 0]])
        P = P + w[:, None] * (S / deg[:, None] - P)
    set_co(obj, P)


def eyelids(obj, center, radius, look, up, aperture=(0.95, 0.60), lid=0.0016, rim=0.0010, reach=2.3,
            upper_fold=0.0, crease=0.0, lower_lid=0.0, far_pull=0.8):
    """Wrap the surface around an eyeball: verts near the eye go onto a shell just outside the ball, except inside
    an almond aperture facing `look`, where they sink behind the ball so it shows. Aperture is (half width, half
    height) as sines of the opening angle."""
    P = co(obj)
    c = np.asarray(center, float)
    f = np.asarray(look, float); f /= np.linalg.norm(f)
    u = np.asarray(up, float); u = u - f * (u @ f); u /= np.linalg.norm(u)
    h = np.cross(u, f)
    D = P - c
    r = np.linalg.norm(D, axis=1)
    near = r < radius * reach
    d = D[near] / r[near, None]
    x, y, z = d @ h, d @ u, d @ f
    e = (x / aperture[0]) ** 2 + (y / aperture[1]) ** 2
    e = np.where(z > 0, e, 4.0)
    inside = np.clip((1.25 - e) / 0.45, 0, 1)  # 1 well inside the opening, 0 outside
    inside = inside * inside * (3 - 2 * inside)
    shell = radius + lid + rim * np.exp(-((e - 1.30) / 0.35) ** 2)
    # upper lid fold: a roll above the opening with a crease above it; lower lid: a smaller roll under it
    shell = shell + np.where(y > 0, upper_fold * np.exp(-((e - 1.75) / 0.40) ** 2)
                             - crease * np.exp(-((e - 2.70) / 0.35) ** 2), lower_lid * np.exp(-((e - 1.45) / 0.30) ** 2))
    target = inside * (radius * 0.80) + (1 - inside) * shell
    rr = r[near]
    t = np.clip((radius * reach - rr) / (radius * (reach - 1.35)), 0, 1)
    t = t * t * (3 - 2 * t)
    # Only pull verts that sit inside the shell outward, and only push the aperture inward; leave the far field.
    newr = np.where(inside > 0.01, rr + (target - rr) * t, np.where(rr < target, rr + (target - rr) * t, rr + (target - rr) * t * far_pull))
    P[near] = c + d * newr[:, None]
    set_co(obj, P)


# ---------------------------------------------------------------- attachment

def cut_keep(obj, point, normal, keep_positive, fill, region=None):
    """Bisect obj at a plane, delete the other side (optionally only inside a region test on vertex coords),
    optionally fill the cut. Returns the number of boundary edges left."""
    point, normal = Vector(point), Vector(normal).normalized()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    if region is not None:
        fs = [f for f in bm.faces if all(region(v.co) for v in f.verts)]
        es = {e for f in fs for e in f.edges}
        vs = {v for f in fs for v in f.verts}
        geom = list(vs) + list(es) + fs
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=point, plane_no=normal, dist=1e-7)
    kill = []
    for v in bm.verts:
        s = (v.co - point).dot(normal)
        if (s < -1e-6 if keep_positive else s > 1e-6) and (region is None or region(v.co)):
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    if fill:
        bnd = [e for e in bm.edges if e.is_boundary]
        bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(obj.data)
    nb = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    obj.data.update()
    return nb


def bridge_open_loops(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bnd = [e for e in bm.edges if e.is_boundary]
    res = bmesh.ops.bridge_loops(bm, edges=bnd)
    new_faces = res.get("faces", [])
    vids = sorted({v.index for f in new_faces for v in f.verts})
    bm.to_mesh(obj.data)
    left = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    obj.data.update()
    return vids, left


# ---------------------------------------------------------------- rigid parts

def frames(pts):
    """Parallel-transport frames along a polyline: tangents T, normals N, binormals B."""
    T = np.gradient(pts, axis=0)
    T /= np.linalg.norm(T, axis=1)[:, None]
    ref = np.array([1.0, 0.0, 0.0]) if abs(T[0][0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    N = np.zeros_like(T)
    n = np.cross(T[0], ref)
    n /= np.linalg.norm(n)
    for i in range(len(T)):
        if i:
            n = n - T[i] * (n @ T[i])
            n /= np.linalg.norm(n)
        N[i] = n
    B = np.cross(T, N)
    return T, N, B


def sweep(name, pts, radius_fn, segments=32, cap=True, N_ref=None):
    """Tube along pts. radius_fn(i, theta) -> radius; theta measured from frame N toward B."""
    T, N, B = frames(pts)
    if N_ref is not None:
        # rotate frames so N points as close as possible to N_ref at the start (stable orientation of the oval)
        pass
    n = len(pts)
    th = np.linspace(0, 2 * math.pi, segments, endpoint=False)
    V = []
    for i in range(n):
        for t in th:
            r = radius_fn(i, t)
            V.append(pts[i] + r * (math.cos(t) * N[i] + math.sin(t) * B[i]))
    F = []
    for i in range(n - 1):
        for j in range(segments):
            a, b = i * segments + j, i * segments + (j + 1) % segments
            F.append((a, b, b + segments, a + segments))
    if cap:
        V.append(pts[0] - T[0] * 1e-4)
        V.append(pts[-1] + T[-1] * 1e-4)
        c0, c1 = len(V) - 2, len(V) - 1
        for j in range(segments):
            F.append((c0, (j + 1) % segments, j))
            a, b = (n - 1) * segments + j, (n - 1) * segments + (j + 1) % segments
            F.append((a, b, c1))
    return mesh_from(name, V, F), (T, N, B)


def sphere(name, center, radius, segs=32, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=radius)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    o.location = center
    return o


def bvh(obj):
    bm = bmesh.new()
    me = obj.data.copy()
    me.transform(obj.matrix_world)
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def nearest_dist(tree, P):
    out = np.empty(len(P))
    for i, p in enumerate(P):
        hit = tree.find_nearest(Vector(p))
        out[i] = hit[3] if hit[0] is not None else np.nan
    return out


def bone_parent(obj, rig, bone):
    mw = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    bpy.context.view_layer.update()
    obj.matrix_world = mw


# ---------------------------------------------------------------- scalar fields and region brushes (stage 5 part 2)

def smooth_scalar(obj, f, iters, factor=0.5):
    """Laplacian diffusion of a per-vertex scalar over the mesh edges."""
    E = edges(obj)
    n = len(f)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    deg[deg == 0] = 1
    f = np.asarray(f, float).copy()
    for _ in range(iters):
        S = np.zeros(n)
        np.add.at(S, E[:, 0], f[E[:, 1]])
        np.add.at(S, E[:, 1], f[E[:, 0]])
        f = f + factor * (S / deg - f)
    return f


def taubin(obj, iters, weights, lam=0.5, mu=-0.53):
    """Taubin (lambda/mu) smoothing: removes high-frequency noise without shrinking the volume.
    weights: per-vertex 0..1 (0 keeps a vertex fixed)."""
    P = co(obj)
    E = edges(obj)
    n = len(P)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    deg[deg == 0] = 1
    w = np.asarray(weights, float)[:, None]
    for _ in range(iters):
        for k in (lam, mu):
            S = np.zeros_like(P)
            np.add.at(S, E[:, 0], P[E[:, 1]])
            np.add.at(S, E[:, 1], P[E[:, 0]])
            P = P + k * w * (S / deg[:, None] - P)
    set_co(obj, P)


def ridge(obj, pts, height, width, mask=None, power=2.0, taper=None):
    """Raise the surface along the normal near a polyline (negative height cuts a groove). power 2 is gaussian,
    higher is flatter on top (a plate edge). taper: optional per-point scale along the polyline."""
    P, N = co(obj), normals(obj)
    pts = np.asarray(pts, float)
    d = np.full(len(P), 1e9)
    s = np.ones(len(P))
    for i in range(len(pts) - 1):
        A, B = pts[i], pts[i + 1]
        AB = B - A
        t = np.clip(((P - A) @ AB) / max(AB @ AB, 1e-12), 0, 1)
        di = np.linalg.norm(P - (A + t[:, None] * AB), axis=1)
        better = di < d
        d = np.where(better, di, d)
        if taper is not None:
            s = np.where(better, taper[i] + (taper[i + 1] - taper[i]) * t, s)
    w = np.exp(-(d / width) ** power) * s
    if mask is not None:
        w = w * mask
    set_co(obj, P + N * (height * w)[:, None])
    return w


def normal_offset_to(tree, P, N, reach):
    """Signed distance along each vertex normal to the nearest point of another surface (0 when farther than reach)."""
    out = np.zeros(len(P))
    for i, p in enumerate(P):
        hit = tree.find_nearest(Vector(p), reach)
        if hit[0] is not None:
            out[i] = (np.array(hit[0][:]) - p) @ N[i]
    return out
