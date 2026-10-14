"""Local remesh of a fore paw's toe zone (Blender, bmesh), for hands v3c.

Hands v3 and v3b moved the paw's old vertices onto the new toe surface; in the concave valleys between the toes the vertices
crowded and printed zigzag pleats that no amount of smoothing removed (coordinator review of v3b, 2026-10-14). This rebuilds
the faces of the toe zone from the new surface instead:

  1. copy      the skin's faces whose vertices all lie in the toe zone (side x, |x| above xMin, y in [yMin, yMax],
               z in [zMin, zCopy]) into a separate mesh and close its open top with a filled cap
  2. remesh    voxel remesh of that closed piece (voxel size `voxel`, no adaptivity): evenly spaced quads over the toes
  3. cut       the skin is cut by the plane z = zCut (below zCopy) and keeps what is above it in the toe zone; the remeshed
               piece is cut .001 lower (pieceGap) and keeps what is below, so the cap is gone
  4. stitch    the two cut loops (unequal vertex counts) are bridged by a band about one edge tall (bmesh bridge_loops,
               no merge: bridge_loops with merge silently skips loops of unequal counts); the result is one closed
               component
  5. material  every new face takes the material index of the nearest old face (the fur stage reads the pale area from it)
  6. project   every new vertex (the piece and its cut loop) moves onto the hands field's zero set (Newton steps on the
               trilinear field) and is smoothed lightly (Taubin, `smooth` passes, projected back each pass); the skin's cut
               loop and the skin above it do not move here
  7. blend     the skin just above the cut (z from zCut to zCut + blendH) moves onto the field with a weight that is 1 at
               the cut and fades to 0 at the top, so the seam leaves no step
By position, never by vertex index.
"""
import numpy as np
import bmesh
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree


def _trilinear(A, lo, step):
    import neck_v1_field as nf
    return nf.Trilinear(A, lo, step)


def remesh_side(skin, side, F, lo, step, rs, log=print):
    me = skin.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    xmin, ymin, ymax, zmin, zcopy, zcut = rs['xMin'], rs['yMin'], rs['yMax'], rs['zMin'], rs['zCopy'], rs['zCut']

    def inzone(co, ztop):
        return side*co.x > xmin and ymin < co.y < ymax and zmin < co.z < ztop

    # old face centers and materials in the zone, for step 5
    old = [(f.calc_center_median(), f.material_index) for f in bm.faces if all(inzone(v.co, zcopy+.01) for v in f.verts)]
    kd = KDTree(len(old))
    for i, (c, _m) in enumerate(old):
        kd.insert(c, i)
    kd.balance()
    # 1. copy
    faces = [f for f in bm.faces if all(inzone(v.co, zcopy) for v in f.verts)]
    vmap, verts, polys = {}, [], []
    for f in faces:
        poly = []
        for v in f.verts:
            if v.index not in vmap:
                vmap[v.index] = len(verts)
                verts.append(tuple(v.co))
            poly.append(vmap[v.index])
        polys.append(poly)
    pm = bpy.data.meshes.new('toe_patch_src')
    pm.from_pydata(verts, [], polys)
    pm.update()
    pb = bmesh.new()
    pb.from_mesh(pm)
    bnd = [e for e in pb.edges if e.is_boundary]
    bmesh.ops.holes_fill(pb, edges=bnd, sides=0)
    pb.to_mesh(pm)
    pb.free()
    # 2. remesh
    ob = bpy.data.objects.new('toe_patch_src', pm)
    bpy.context.scene.collection.objects.link(ob)
    mod = ob.modifiers.new('voxel', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = float(rs['voxel'])
    mod.adaptivity = 0.0
    dg = bpy.context.evaluated_depsgraph_get()
    rm = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(pm)
    nrem = len(rm.vertices)
    # 3. cut the piece (keep below zcut) and the skin (keep above zcut inside the zone)
    rb = bmesh.new()
    rb.from_mesh(rm)
    bmesh.ops.bisect_plane(rb, geom=rb.verts[:]+rb.edges[:]+rb.faces[:], plane_co=(0, 0, zcut-rs['pieceGap']), plane_no=(0, 0, 1),
                           clear_outer=True)
    rb.to_mesh(rm)
    rb.free()
    zone_faces = [f for f in bm.faces if all(inzone(v.co, zcopy+.01) for v in f.verts)]
    gz = list({v for f in zone_faces for v in f.verts})+list({e for f in zone_faces for e in f.edges})+zone_faces
    bmesh.ops.bisect_plane(bm, geom=gz, plane_co=(0, 0, zcut), plane_no=(0, 0, 1), clear_inner=True)
    skin_loop = {e for e in bm.edges if e.is_boundary}
    before = set(bm.verts)
    bm.from_mesh(rm)
    bpy.data.meshes.remove(rm)
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    # by set difference: the appended vertices reuse the slots the skin cut freed, so they are not the tail of bm.verts
    new_verts = [v for v in bm.verts if v not in before]
    patch_loop = {e for e in bm.edges if e.is_boundary} - skin_loop
    log(f'side {side:+d}: remeshed piece {nrem} vertices; seam loops {len(skin_loop)} skin edges, {len(patch_loop)} piece edges')
    # 4. stitch
    res = bmesh.ops.bridge_loops(bm, edges=list(skin_loop | patch_loop), use_merge=False)
    band = set(res['faces'])
    left = [e for e in bm.edges if e.is_boundary]
    if left:
        raise SystemExit(f'side {side:+d}: {len(left)} boundary edges left after the stitch')
    # 5. materials of the new faces
    bm.verts.ensure_lookup_table()
    newset = set(v for v in new_verts if v.is_valid)
    seam = {v for e in skin_loop if e.is_valid for v in e.verts}
    nf_new = 0
    for f in bm.faces:
        if f in band or any(v in newset for v in f.verts):
            _co, i, _d = kd.find(f.calc_center_median())
            f.material_index = old[i][1]
            nf_new += 1
    # 6. project the new vertices onto the field and smooth lightly
    if F is None:
        bm.normal_update()
        bm.to_mesh(me)
        bm.free()
        me.update()
        return {'side': side, 'remeshedPieceVertices': nrem, 'seamSkinEdges': len(skin_loop), 'seamPieceEdges': len(patch_loop)}
    bm.verts.index_update()
    bm.verts.ensure_lookup_table()
    ids = [v.index for v in newset if v.is_valid and v not in seam]
    fF = _trilinear(F, lo, step)
    gx, gy, gz_ = np.gradient(F, step)
    fg = [_trilinear(g, lo, step) for g in (gx, gy, gz_)]

    def project(P, iters=30, cap=.002):
        for _ in range(iters):
            e = fF(P)
            g = np.stack([f(P) for f in fg], 1)
            st = -(e/np.maximum((g*g).sum(1), 1e-8))[:, None]*g
            n = np.linalg.norm(st, axis=1)
            st *= np.minimum(1, cap/np.maximum(n, 1e-12))[:, None]
            P = P+st
        return P
    idx = np.array(ids)
    P = np.array([tuple(bm.verts[i].co) for i in idx])
    near = np.abs(fF(P)) < rs.get('band', .005)
    f0 = fF(P)
    log(f'side {side:+d}: new vertices vs field: |F| median {np.median(np.abs(f0)):.5f}, p90 {np.percentile(np.abs(f0), 90):.5f}, '
        f'p99 {np.percentile(np.abs(f0), 99):.5f}, max {np.abs(f0).max():.5f}; above band {int((~near).sum())}; '
        f'z of those {np.percentile(P[~near][:, 2], [5, 50, 95]).round(4).tolist() if (~near).any() else None}; '
        f'sign + {int((f0[~near] > 0).sum())}')
    if rs.get('stopAfterReport'):
        raise SystemExit('stopAfterReport')
    P = project(P)
    loc = {int(i): k for k, i in enumerate(idx)}
    e0, e1, fsum, deg = [], [], np.zeros((len(idx), 3)), np.zeros(len(idx))
    for k, i in enumerate(idx):
        for e in bm.verts[i].link_edges:
            o = e.other_vert(bm.verts[i])
            deg[k] += 1
            if o.index in loc:
                e0.append(k)
                e1.append(loc[o.index])
            else:
                fsum[k] += np.array(tuple(o.co))
    e0, e1 = np.array(e0, np.int64), np.array(e1, np.int64)
    for _ in range(int(rs['smooth'])):
        for lam in (rs['lam'], rs['mu']):
            acc = fsum.copy()
            np.add.at(acc, e0, P[e1])
            P = P+lam*(acc/np.maximum(deg, 1)[:, None]-P)
        P = project(P, iters=6)
    for k, i in enumerate(idx):
        bm.verts[i].co = Vector(P[k])
    # 7. blend the skin above the cut onto the field: fully at the cut loop, fading out over `blendH` above it, so the
    # piece (exactly on the field) and the skin (v3b's smoothed surface, up to about .005 off it) meet with no step
    bh = float(rs.get('blendH', 0.0))
    nblend = 0
    if bh > 0:
        ring = [v for v in bm.verts if v not in newset and side*v.co.x > xmin and ymin < v.co.y < ymax and zcut-1e-6 <= v.co.z < zcut+bh]
        if ring:
            Q = np.array([tuple(v.co) for v in ring])
            t = np.clip((Q[:, 2]-zcut)/bh, 0, 1)
            wq = 1-t*t*(3-2*t)
            Qp = project(Q)
            Q = Q+wq[:, None]*(Qp-Q)
            for v, q in zip(ring, Q):
                v.co = Vector(q)
            nblend = len(ring)
    resid = float(np.abs(fF(P)).max()) if len(P) else 0.0
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    me.update()
    out = {'side': side, 'remeshedPieceVertices': nrem, 'seamSkinEdges': len(skin_loop), 'seamPieceEdges': len(patch_loop),
           'newFaces': nf_new, 'projectedVertices': int(len(idx)), 'fieldResidualMax': resid, 'blendedSkinVertices': nblend}
    log(f'side {side:+d}: stitched; {out}')
    return out
