"""Shared fast helpers of the ear fan clump builders (author_fan_clumps_field_fast.py, fan_clumps_front_fast.py,
fan_clumps_front_run_fast.py). numpy only; the mesh helpers take the bpy module or a bpy mesh as an argument. Each function
replaces a slow pattern of the pinned originals with the same result:

  nearest_axis_index   argmin over axis samples as one matrix product per chunk (the original loops over samples, one full pass
                       over every voxel per sample)
  box                  the original box blur (edge padded mean, float64 cumsum), with the radius 1 case as three shifted sums
  labels_from_edges    connected components of a mesh from its edge array (the originals walk bmesh vertices with Python sets)
  build_mesh           triangles and quads into a bpy mesh through foreach_set instead of from_pydata lists
  fast_mesh_stats      components, non-manifold edges and vertex count without bmesh
"""
import os
from concurrent.futures import ThreadPoolExecutor

import numpy as np

# Worker threads for the array work (numpy releases the GIL inside its loops). FAN_FAST_THREADS=1 turns threading off; the
# results do not depend on it (every thread writes its own slice or its own tiles).
THREADS = max(1, int(os.environ.get('FAN_FAST_THREADS', min(4, (os.cpu_count() or 2)//2))))
_POOL = ThreadPoolExecutor(THREADS) if THREADS > 1 else None


def par_map(fn, items):
    """fn over items, on the pool when threading is on; results in order."""
    items = list(items)
    if _POOL is None or len(items) < 2:
        return [fn(i) for i in items]
    return list(_POOL.map(fn, items))



def nearest_axis_index(P, ax, chunk=200_000):
    """Index of the nearest axis sample for every row of P (n, 3); ties go to the lowest index, as the original loop does.
    P and ax are centred on the axis centroid first so float32 products keep their precision."""
    c = ax.mean(axis=0)
    A = (ax-c).astype(np.float32)
    a2 = (A*A).sum(axis=1)
    out = np.empty(len(P), np.int32)
    cf = c.astype(np.float32)
    for i in range(0, len(P), chunk):
        Q = P[i:i+chunk]-cf
        d2 = a2[None, :]-2*(Q@A.T)                 # |q|^2 is constant per row and does not change the argmin
        out[i:i+chunk] = d2.argmin(axis=1)
    return out


def box(a, r, axes=None):
    """Mean over a (2r+1) window along each axis, edge padded; float32. Same values as the original cumsum version: a radius up
    to 4 on float32 data is 2r shifted float32 sums (differences are rounding, below 1e-7), larger radii keep the cumsum."""
    axes = range(a.ndim) if axes is None else axes
    for ax in axes:
        n = a.shape[ax]
        if r <= 4 and a.dtype == np.float32 and n > r:
            v = np.moveaxis(a, ax, 0)
            out = v.copy()

            def part(sl, v=v, out=out, n=n):
                o, w = out[:, sl], v[:, sl]
                for j in range(1, r+1):
                    o[:n-j] += w[j:]
                    o[n-j:] += w[-1]
                    o[j:] += w[:n-j]
                    o[:j] += w[0]
                o *= np.float32(1./(2*r+1))
            if a.ndim > 1 and a.size > 2_000_000 and THREADS > 1:
                m = v.shape[1]
                cuts = np.linspace(0, m, min(THREADS, m)+1).astype(int)
                par_map(part, [slice(int(u), int(w)) for u, w in zip(cuts[:-1], cuts[1:])])
            else:
                part(slice(None) if a.ndim > 1 else slice(0, None))
            a = np.moveaxis(out, 0, ax)
            continue
        pad = [(r+1, r) if i == ax else (0, 0) for i in range(a.ndim)]
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax, dtype=np.float64)
        a = ((np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))/(2*r+1)).astype(np.float32)
    return a


def labels_from_edges(n, ea, eb):
    """Connected component label (a vertex index of the component) per vertex, from edge endpoint arrays."""
    lab = np.arange(n)
    while True:
        la, lb = lab[ea], lab[eb]
        diff = la != lb
        if not diff.any():
            return lab
        hi = np.maximum(la[diff], lb[diff])
        lo = np.minimum(la[diff], lb[diff])
        np.minimum.at(lab, hi, lo)
        while True:
            nxt = lab[lab]
            if np.array_equal(nxt, lab):
                break
            lab = nxt


def mesh_arrays(mesh):
    """(vertex coordinates (n, 3) float32, edge vertex pairs (m, 2), faces per edge (m,)) of a bpy mesh."""
    n = len(mesh.vertices)
    co = np.empty(n*3, np.float32)
    mesh.vertices.foreach_get('co', co)
    me = len(mesh.edges)
    ev = np.empty(me*2, np.int32)
    mesh.edges.foreach_get('vertices', ev)
    ei = np.empty(len(mesh.loops), np.int32)
    mesh.loops.foreach_get('edge_index', ei)
    return co.reshape(-1, 3), ev.reshape(-1, 2), np.bincount(ei, minlength=me)


def fast_mesh_stats(mesh):
    """Same record as blender_blockout.mesh_stats: components, nonManifoldEdges (an edge not shared by exactly two faces), vertices.
    A vertex on no edge counts as its own component, as in the bmesh walk."""
    co, ev, per_edge = mesh_arrays(mesh)
    n = len(co)
    lab = labels_from_edges(n, ev[:, 0], ev[:, 1])
    return {'components': int(len(np.unique(lab))), 'nonManifoldEdges': int((per_edge != 2).sum()), 'vertices': int(n)}


def small_components(mesh, max_verts, max_extent=None):
    """Vertex index arrays of the components that are not the largest, have at most max_verts vertices and (when max_extent
    is given) a bounding box no larger than it. Empty when the mesh is one piece (the usual case)."""
    co, ev, _ = mesh_arrays(mesh)
    lab = labels_from_edges(len(co), ev[:, 0], ev[:, 1])
    uniq, inv, counts = np.unique(lab, return_inverse=True, return_counts=True)
    if len(uniq) == 1:
        return []
    biggest = counts.argmax()
    groups = []
    order = np.argsort(inv, kind='stable')
    starts = np.r_[0, np.cumsum(counts)]
    for g in range(len(uniq)):
        if g == biggest or counts[g] > max_verts:
            continue
        ids = order[starts[g]:starts[g+1]]
        if max_extent is not None and (co[ids].max(axis=0)-co[ids].min(axis=0)).max() > max_extent:
            continue
        groups.append(ids)
    return groups


def build_mesh(bpy, name, vertices, tri_out, quads):
    """bpy mesh from vertices, triangle and quad index arrays (what convertToPolygons returns), triangles first."""
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(vertices))
    mesh.vertices.foreach_set('co', np.ascontiguousarray(vertices, dtype=np.float32).ravel())
    tri_out = np.asarray(tri_out, np.int32).reshape(-1, 3)
    quads = np.asarray(quads, np.int32).reshape(-1, 4)
    nt, nq = len(tri_out), len(quads)
    mesh.loops.add(nt*3+nq*4)
    mesh.polygons.add(nt+nq)
    mesh.loops.foreach_set('vertex_index', np.concatenate([tri_out.ravel(), quads.ravel()]).astype(np.int32))
    total = np.r_[np.full(nt, 3, np.int32), np.full(nq, 4, np.int32)]
    mesh.polygons.foreach_set('loop_start', np.r_[0, np.cumsum(total)[:-1]].astype(np.int32))
    mesh.polygons.foreach_set('loop_total', total)
    mesh.update(calc_edges=True)
    return mesh


def set_all_smooth(mesh):
    mesh.polygons.foreach_set('use_smooth', np.ones(len(mesh.polygons), bool))


def transform_vertices(mesh, matrix):
    """vertex.co = matrix @ vertex.co for every vertex, vectorized."""
    co = np.empty(len(mesh.vertices)*3, np.float32)
    mesh.vertices.foreach_get('co', co)
    m = np.array(matrix, np.float64)
    out = co.reshape(-1, 3).astype(np.float64)@m[:3, :3].T+m[:3, 3]
    mesh.vertices.foreach_set('co', out.astype(np.float32).ravel())
    mesh.update()


def require_single_closed(obj, out, stage):
    """blender_blockout.require_single_closed_mesh with the fast count; a failure is reported by the original so the
    geometry-failure files are the same."""
    stats = fast_mesh_stats(obj.data)
    if stats['components'] != 1 or stats['nonManifoldEdges'] != 0:
        import blender_blockout
        blender_blockout.require_single_closed_mesh(obj, out, stage)
    return stats


def _delete_vertices(obj, groups):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    verts = [bm.verts[int(i)] for g in groups for i in g]
    bmesh.ops.delete(bm, geom=verts, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def remove_voxel_specks(obj, max_extent):
    """blender_blockout.remove_voxel_specks (min_z unused): components of at most 16 vertices and extent <= max_extent."""
    groups = small_components(obj.data, 16, max_extent)
    if not groups:
        return []
    co = mesh_arrays(obj.data)[0]
    removed = []
    for g in groups:
        lo, hi = co[g].min(axis=0), co[g].max(axis=0)
        removed.append({'vertices': int(len(g)), 'maxExtent': float((hi-lo).max()), 'bounds': [lo.tolist(), hi.tolist()]})
    _delete_vertices(obj, groups)
    return removed


def remove_islands(obj, max_island):
    """Components other than the largest with at most max_island vertices are deleted; returns the removal records."""
    groups = small_components(obj.data, max_island)
    if not groups:
        return []
    co = mesh_arrays(obj.data)[0]
    removed = [{'vertices': int(len(g)), 'bounds': [[round(float(v), 4) for v in co[g].min(axis=0)],
                                                     [round(float(v), 4) for v in co[g].max(axis=0)]]} for g in groups]
    _delete_vertices(obj, groups)
    return removed


def reach_radius(wh, hh, tipr, band, spacing, frac=.9):
    """Distance from the nearest axis sample beyond which a clump field of the rear/front form is >= frac*band (so it is
    clamped and cannot move the surface). wh, hh: half width and half thickness along the axis (arrays); tipr: the tip floor
    of the length term. e >= max(|aa|/wh, |cc|/hh) for any p >= 1, so d = (e-1)*min(wh, hh) < frac*band needs
    |aa| <= wh*E, |cc| <= hh*E with E = 1+frac*band/min(wh, hh); the length terms bound the overshoot past either end, and
    three sample spacings cover the tangential offset of the nearest sample."""
    m = np.minimum(wh, hh)
    E = 1+frac*band/m
    perp = float(np.sqrt((wh*E)**2+(hh*E)**2).max())
    tip = np.sqrt(2.)*E[-1]*max(m[-1], tipr)
    root = .02*E[0]
    return perp+max(tip, root)+3*spacing


def _sample_tables(ax, tang, arc, L, wh_fn, hh_fn, band, tipr, rinf, h):
    """Per axis sample bounds shared by the tile test and the voxel pre-test: the largest half width and half thickness and the
    smallest min(wh, hh) in the t window a voxel nearest to that sample can have, the e a voxel needs to sit at the band, the
    cap size at the tip, and win, how far along its tangent a voxel can lie from its nearest sample (half a chord plus the tilt
    between chord and tangent times the distance |q| <= rinf+2h)."""
    K = len(ax)
    chord = np.diff(ax, axis=0)
    clen = np.linalg.norm(chord, axis=1)
    chat = chord/clen[:, None]
    sinphi = max(np.linalg.norm(np.cross(tang[:-1], chat), axis=1).max(), np.linalg.norm(np.cross(tang[1:], chat), axis=1).max())
    cosphi = np.sqrt(max(1-sinphi**2, 1e-6))
    win = .5*clen.max()/cosphi+(rinf+2*h)*sinphi+1e-6
    tau = win/L
    G = np.linspace(0, 1, 2001)
    whg, hhg = wh_fn(G).astype(np.float64), hh_fn(G).astype(np.float64)
    tk = arc/L
    wmax, hmax, mmin, capm = np.empty(K), np.empty(K), np.empty(K), np.empty(K)
    for k in range(K):
        i0 = int(np.floor(max(tk[k]-tau, 0)*2000))
        i1 = int(np.ceil(min(tk[k]+tau, 1)*2000))+1
        wmax[k], hmax[k] = whg[i0:i1].max(), hhg[i0:i1].max()
        mm = np.minimum(whg[i0:i1], hhg[i0:i1])
        mmin[k] = mm.min()
        capm[k] = np.maximum(mm, tipr).max()
    return wmax, hmax, mmin, capm, 1+band/mmin, win


def _tile_may_be_below_band(C, D, dmin, h, ax, tang, nrm, bin_, arc, L, tables, tw, root_len):
    """For tiles (centres C, distances D to the samples, half diagonal h) False when every voxel is provably at the band.

    A voxel's nearest sample k lies in the tile's candidate set (distance within dmin + 2h). With that sample's frame its
    (aa, cc) differ from the tile centre's by at most h along any direction, and its length parameter t stays within the
    tables' window of the sample's. So e >= max(|aa|/wh, |cc|/hh) is at least the bound below, taken at the largest wh, hh and
    the smallest min(wh, hh) in that window (the twist, at most tw, through cos and sin of tw); d >= band needs
    e >= 1+band/min(wh, hh). A voxel past the root or the tip is judged by the end-cap terms of e instead.
    Returns a bool per tile: True = may be below the band."""
    K = len(ax)
    nk = len(C)
    out = np.ones(nk, bool)
    wmax, hmax, mmin, capm, need, win = tables
    ct, st = np.cos(tw), np.sin(tw)
    beyond_root = root_len*need[0]
    beyond_tip = np.sqrt(2.)*capm[K-1]*need[K-1]
    step = max(1, 1_500_000//K)
    for i in range(0, nk, step):
        Ci = C[i:i+step]
        cand = D[i:i+step] <= (dmin[i:i+step]+2*h+1e-9)[:, None]
        R = Ci[:, None, :]-ax[None, :, :]                                   # (n, K, 3)
        u = np.abs((R*bin_[None, :, :]).sum(axis=2))
        v = np.abs((R*nrm[None, :, :]).sum(axis=2))
        sc = (R*tang[None, :, :]).sum(axis=2)                               # signed offset along the tangent
        lbu, lbv = np.maximum(u-h, 0), np.maximum(v-h, 0)
        laa = np.maximum(lbu*ct-(v+h)*st, 0)
        lcc = np.maximum(lbv*ct-(u+h)*st, 0)
        perp = np.maximum(laa/wmax[None, :], lcc/hmax[None, :]) >= need[None, :]
        inside = np.abs(sc)-h <= win                                        # an interior sample as the nearest
        ok = perp | ~inside
        # end samples also catch voxels beyond them, judged by the cap terms
        in0 = sc+h >= -win
        in1 = sc-h <= win
        ok[:, 0] = (perp[:, 0] | ~in0[:, 0]) & ((sc[:, 0]+h <= -beyond_root) | ~(sc[:, 0]-h < -win))
        ok[:, K-1] = (perp[:, K-1] | ~in1[:, K-1]) & ((sc[:, K-1]-h >= beyond_tip) | ~(sc[:, K-1]+h > win))
        out[i:i+step] = ~np.all(ok | ~cand, axis=1)
    return out


STATS = {'below': 0, 'sub': 0, 'clumps': 0}   # voxels below the band and voxels stored, summed over clumps (informational)


def swept_field(origin, shape, vs, ax, tang, nrm, bin_, arc, L, wh_fn, hh_fn, p, tipr, root_len, band, tw=0.,
                blur_r=0, blur_passes=0, tile=8, group_points=131_072):
    """Distance field of one swept rounded clump over a box, the shared core of the rear and front clump builders.

    Same arithmetic as the original per-clump block: nearest axis sample, local frame (tangent length, binormal aa, normal cc),
    optional twist, section superellipse e, end caps, d = (e-1)*min(wh, hh) clamped to the band, then `blur_passes` box blurs of
    radius `blur_r` (edge padded at the box boundary). The box is the voxels origin..origin+shape (voxel (i, j, k) at
    (origin+(i, j, k))*vs). Four things make it cheap and none changes a value:
      * tiles of tile^3 voxels farther than reach_radius from every axis sample are the band value outright;
      * inside a kept tile the nearest sample is searched in a window of samples that provably holds it for every voxel of the
        tile (samples within the distance of the tile centre's nearest sample plus two tile half diagonals), as one matrix
        product per group of tiles sharing a window start; ties go to the lowest index, as the original loop does;
      * a voxel whose lower bound e >= max(|aa|/wh, |cc|/hh) already puts d at the band skips the rest of the arithmetic;
      * only the bounding box of voxels below the band is stored and blurred (padded by the blur reach); outside it the field is
        the band value, which a blur leaves unchanged.
    Returns (sub, d): sub = three slices of the box, d the float32 field over them; None when nothing is below the band."""
    K = len(ax)
    T = tile
    T3 = T**3
    nx, ny, nz = shape
    tn = tuple(-(-n//T) for n in shape)
    tg = np.linspace(0, 1, 400)
    rinf = reach_radius(wh_fn(tg), hh_fn(tg), tipr, band, L/max(K-1, 1))
    c = ax.mean(axis=0)
    A = (ax-c).astype(np.float32)
    Aa = np.vstack([-2*A.T, (A*A).sum(axis=1)[None, :]]).astype(np.float32)          # (4, K)
    arc32 = arc.astype(np.float32)
    FR = np.stack([tang, bin_, nrm], axis=1).astype(np.float32)             # (K, 3, 3): rows tangent, binormal, normal
    ct, st = np.float32(np.cos(tw)), np.float32(np.sin(tw))
    # tile centres, distances to the samples, kept tiles and their sample windows
    cen = [(origin[a]+T*np.arange(tn[a])+(T-1)/2.)*vs for a in range(3)]
    Cc = np.stack(np.meshgrid(*cen, indexing='ij'), axis=-1).reshape(-1, 3)
    h = .5*vs*(T-1)*np.sqrt(3.)
    D = np.sqrt(((Cc[:, None, :]-ax[None, :, :])**2).sum(axis=2))
    dmin = D.min(axis=1)
    keep = np.nonzero(dmin-h <= rinf)[0]
    tables = _sample_tables(ax, tang, arc, L, wh_fn, hh_fn, band, tipr, rinf, h)
    wmax_, hmax_, _, _, need, win = tables
    invw, invh, need = (1./wmax_).astype(np.float32), (1./hmax_).astype(np.float32), need.astype(np.float32)
    if len(keep):
        keep = keep[_tile_may_be_below_band(Cc[keep], D[keep], dmin[keep], h, ax, tang, nrm, bin_, arc, L, tables, tw, root_len)]
    d3 = np.full((tn[0]*T, tn[1]*T, tn[2]*T), band, np.float32)
    if len(keep):
        cand = D[keep] <= (dmin[keep]+2*h+1e-9)[:, None]
        kmin = cand.argmax(axis=1)
        kmax = K-1-cand[:, ::-1].argmax(axis=1)
        tid = np.stack(np.unravel_index(keep, tn), axis=1)
        org = (np.array(origin)[None, :]+tid*T)*vs-c[None, :]
        off = np.stack(np.meshgrid(*[np.arange(T)]*3, indexing='ij'), axis=-1).reshape(-1, 3)*vs
        d6 = d3.reshape(tn[0], T, tn[1], T, tn[2], T).transpose(0, 2, 4, 1, 3, 5)
        order = np.argsort(kmin, kind='stable')
        kmin_s = kmin[order]
        bounds = np.r_[0, np.nonzero(np.diff(kmin_s))[0]+1, len(order)]
        per = max(1, group_points//T3)
        jobs = []
        for g in range(len(bounds)-1):
            members = order[bounds[g]:bounds[g+1]]
            s0 = int(kmin[members[0]])
            W = int((kmax[members]-s0+1).max())
            for u in range(0, len(members), per):
                jobs.append((members[u:u+per], s0, W))

        def run_job(job):
            mem, s0, W = job
            Aw = Aa[:, s0:s0+W]
            nt = len(mem)
            Q = np.empty((nt*T3, 4), np.float32)
            Q[:, :3] = (org[mem][:, None, :]+off[None, :, :]).reshape(-1, 3)
            Q[:, 3] = 1.
            M = Q@Aw
            k = M.argmin(axis=1)+s0
            n = len(k)
            q = Q[:, :3]-A[k]
            sab = np.einsum('nij,nj->ni', FR[k], q)                  # tangent length, binormal aa, normal cc
            aa, cc = sab[:, 1], sab[:, 2]
            # pre-test with the sample's table: a voxel whose lower bound already puts d at the band is the band value
            ca, cb = np.abs(aa), np.abs(cc)
            e1 = np.maximum(np.maximum(ca*ct-cb*st, 0)*invw[k], np.maximum(cb*ct-ca*st, 0)*invh[k])
            far = (e1 >= need[k]) & (np.abs(sab[:, 0]) <= win) & (k > 0) & (k < K-1)
            sel = np.nonzero(~far)[0]
            if len(sel) == 0:
                return
            k = k[sel]
            length = arc32[k]+sab[sel, 0]
            aa, cc = aa[sel], cc[sel]
            t = np.clip(length/L, 0, 1)
            if tw:
                ang = (tw*t).astype(np.float32)
                aa, cc = aa*np.cos(ang)-cc*np.sin(ang), aa*np.sin(ang)+cc*np.cos(ang)
            wh = wh_fn(t).astype(np.float32)
            hh = hh_fn(t).astype(np.float32)
            m = np.minimum(wh, hh)
            # d >= band wherever max(|aa|/wh, |cc|/hh) already gives (e_low-1)*m >= band
            e_low = np.maximum(np.abs(aa)/wh, np.abs(cc)/hh)
            near = (e_low-1)*m < band
            if not near.any():
                return
            wh, hh, m, aa, cc, length = wh[near], hh[near], m[near], aa[near], cc[near], length[near]
            e = ((np.abs(aa)/wh)**p+(np.abs(cc)/hh)**p)**(1./p)
            e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(m, tipr))**2*.5+(np.maximum(-length, 0)/root_len)**2)
            blk = np.full(n, band, np.float32)
            blk[sel[near]] = np.clip((e-1)*m, -band, band)
            ti = tid[mem]
            d6[ti[:, 0], ti[:, 1], ti[:, 2]] = blk.reshape(nt, T, T, T)
        par_map(run_job, jobs)
    d3 = d3[:nx, :ny, :nz]
    below = np.nonzero(d3.reshape(-1) < band)[0]
    if len(below) == 0:
        return None
    ii, jj, kk = np.unravel_index(below, shape)
    pad = blur_r*blur_passes
    a0 = np.maximum(np.array([ii.min(), jj.min(), kk.min()])-pad, 0)
    b0 = np.minimum(np.array([ii.max(), jj.max(), kk.max()])+1+pad, shape)
    sub = tuple(slice(int(u), int(v)) for u, v in zip(a0, b0))
    d = d3[sub]
    STATS['clumps'] += 1
    STATS['below'] += len(below)
    STATS['sub'] += d.size
    for _ in range(blur_passes):
        d = box(d, blur_r)
    return sub, np.ascontiguousarray(d) if blur_passes == 0 else d


def clean_and_check(obj, max_extent, max_island, out, stage):
    """remove_voxel_specks, then island removal, then require_single_closed, from one read of the mesh when nothing is removed
    (the usual case). Returns (flecks, islands, stats) with the records the three originals produced."""
    removed_f, removed_i = [], []
    arrs = None
    for phase in ('flecks', 'islands'):
        if phase == 'islands' and not max_island:
            continue
        if arrs is None:
            co, ev, per_edge = mesh_arrays(obj.data)
            lab = labels_from_edges(len(co), ev[:, 0], ev[:, 1])
            arrs = (co, ev, per_edge, lab)
        co, ev, per_edge, lab = arrs
        uniq, inv, counts = np.unique(lab, return_inverse=True, return_counts=True)
        groups = []
        if len(uniq) > 1:
            order = np.argsort(inv, kind='stable')
            starts = np.r_[0, np.cumsum(counts)]
            biggest = counts.argmax()
            for g in range(len(uniq)):
                if g == biggest:
                    continue
                ids = order[starts[g]:starts[g+1]]
                if phase == 'flecks':
                    if counts[g] <= 16 and (co[ids].max(axis=0)-co[ids].min(axis=0)).max() <= max_extent:
                        groups.append(ids)
                elif counts[g] <= max_island:
                    groups.append(ids)
        if groups:
            for ids in groups:
                lo_, hi_ = co[ids].min(axis=0), co[ids].max(axis=0)
                if phase == 'flecks':
                    removed_f.append({'vertices': int(len(ids)), 'maxExtent': float((hi_-lo_).max()), 'bounds': [lo_.tolist(), hi_.tolist()]})
                else:
                    removed_i.append({'vertices': int(len(ids)), 'bounds': [[round(float(v), 4) for v in lo_], [round(float(v), 4) for v in hi_]]})
            _delete_vertices(obj, groups)
            arrs = None
    if arrs is None:
        co, ev, per_edge = mesh_arrays(obj.data)
        lab = labels_from_edges(len(co), ev[:, 0], ev[:, 1])
    else:
        co, ev, per_edge, lab = arrs
    stats = {'components': int(len(np.unique(lab))), 'nonManifoldEdges': int((per_edge != 2).sum()), 'vertices': int(len(co))}
    if stats['components'] != 1 or stats['nonManifoldEdges'] != 0:
        import blender_blockout
        blender_blockout.require_single_closed_mesh(obj, out, stage)
    return removed_f, removed_i, stats
