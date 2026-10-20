"""B-t5dc: surface cleanup for the paw parts (pass 7). Shape stays; only local surface quality changes.

Called from paw_part_blend.py (--clean CLEAN.json) on each part after the voxel remesh and before the weld, and on
the weld band after the weld. Every operation is masked and local:

  global   light Taubin (lambda/mu) pass over the whole part: removes OpenVDB faceting and fine ripples; low
           frequencies (knuckles, ridges, dip, pads) pass through unchanged.
  lips     convex-only smoothing on the toe-cleft lips: vertices whose mean curvature is sharper than the knuckle domes
           and that sit near a cleft mid plane are relaxed; concave cleft floors are left where they are, so the
           clefts keep their depth while the hard V edges round off.
  band     Taubin pass in a band around the sculpt-to-tube hand-over on the leg (t below the join), fading in and out,
           so the step blends into one surface.
  pins     the join zone (the weld matches the body ring there) and the flat sole are pinned.

Usage inside Blender: import paw_part_clean as PC; PC.clean_part(ob, kind, sg, D, cfg)
"""
import numpy as np
try:
    import bmesh
except ImportError:
    bmesh = None

MM = 0.001


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def _arrays(me):
    n = len(me.vertices); V = np.empty(n * 3); me.vertices.foreach_get('co', V)
    E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E)
    return V.reshape(-1, 3), E.reshape(-1, 2)


class Lap:
    def __init__(s, E, n):
        s.E = E; s.n = n; s.C = np.maximum(np.bincount(E.ravel(), minlength=n), 1).astype(float)

    def avg(s, X):
        S = np.zeros((s.n,) + X.shape[1:])
        np.add.at(S, s.E[:, 0], X[s.E[:, 1]]); np.add.at(S, s.E[:, 1], X[s.E[:, 0]])
        return S / (s.C[:, None] if X.ndim == 2 else s.C)

    def lap(s, V):
        return s.avg(V) - V

    def blur(s, w, k):
        for _ in range(k): w = 0.5 * w + 0.5 * s.avg(w)
        return w


def normals(V, F):
    N = np.zeros_like(V)
    for tri in ((0, 1, 2), (0, 2, 3)):
        a, b, c = V[F[:, tri[0]]], V[F[:, tri[1]]], V[F[:, tri[2]]]; fn = np.cross(b - a, c - a)
        for j in tri: np.add.at(N, F[:, j], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-15)


def mean_curv(L, V, N, hbar):
    return -(L.lap(V) * N).sum(1) / (hbar * hbar) * 4   # ~ 1/radius, positive convex (1/m)


def taubin(L, V, w, it, lam=0.5, mu=-0.53):
    for _ in range(it):
        V = V + (lam * w)[:, None] * L.lap(V)
        V = V + (mu * w)[:, None] * L.lap(V)
    return V


def frames(D, kind, sg):
    m = np.array([sg, 1, 1.0])
    return dict(cut=D[f'{kind}_cut'] * m, a=D[f'{kind}_axis'] * m, O=D[f'{kind}_O'] * m, f=D[f'{kind}_f'] * m, l=D[f'{kind}_l'] * m, tips=D[f'{kind}_tips'] * m)


def masks(V, D, kind, sg, c):
    Fr = frames(D, kind, sg); t = (V - Fr['cut']) @ Fr['a']   # > 0 below the join plane, along the leg
    pin = 1 - sstep(c['pin_t'][0] * MM, c['pin_t'][1] * MM, t)                          # join zone
    pin = np.maximum(pin, 1 - sstep(c['pin_sole'][0] * MM, c['pin_sole'][1] * MM, V[:, 2]))   # flat sole
    free = 1 - pin
    # cleft region: near the mid plane of each neighbouring toe pair, from the tips back past the joint, above the floor
    tips = Fr['tips']; cl = np.zeros(len(V))
    for i in range(3):
        A, B = tips[i], tips[i + 1]; pm = 0.5 * (A + B); fm = Fr['f'].copy(); fm[2] = 0; fm /= np.linalg.norm(fm)
        n = np.array([-fm[1], fm[0], 0.0]); r = V - pm; dm = np.abs(r @ n); um = r @ fm
        w = (1 - sstep(c['cleft_half_w'][0] * MM, c['cleft_half_w'][1] * MM, dm)) * (1 - sstep(c['cleft_back'][0] * MM, c['cleft_back'][1] * MM, -um)) \
            * (1 - sstep(c['cleft_front'] * MM, (c['cleft_front'] + 3) * MM, um)) * sstep(c['cleft_zmin'] * MM, (c['cleft_zmin'] + 3) * MM, V[:, 2])
        cl = np.maximum(cl, w)
    hb = c.get('band_' + kind)
    band = np.zeros(len(V))
    if hb:
        band = sstep(hb[0] * MM, hb[1] * MM, t) * (1 - sstep(hb[2] * MM, hb[3] * MM, t))
    return dict(t=t, free=free, cleft=cl, band=band)


def clean_part(ob, kind, sg, D, c, log=None):
    me = ob.data; V, E = _arrays(me)
    F = np.array([list(p.vertices) for p in me.polygons if len(p.vertices) == 4])
    V, info = clean_arrays(V, E, F, D, kind, sg, c)
    me.vertices.foreach_set('co', V.ravel()); me.update()
    ob['clean'] = str(info)
    if log is not None: log[ob.name] = info
    return info


def clean_arrays(V, E, F, D, kind, sg, c):
    V0 = V.copy(); L = Lap(E, len(V))
    hbar = float(np.mean(np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)))
    M = masks(V, D, kind, sg, c)
    # protect_cleft: keep the global and spike passes out of the toe clefts (their depth is a measured ratio)
    keep = (1 - M['cleft']) if c.get('protect_cleft') else np.ones(len(V))
    # 0. spikes: vertices far off their neighbour average (the shrinkwrap snapped them across a narrow cleft to the
    #    wrong wall, giving torn cleft edges) are pulled back; the mask is recomputed every round
    nsp = 0
    for _ in range(c.get('spike_rounds', 0)):
        lap = L.lap(V); g = np.linalg.norm(lap, axis=1) / hbar
        w = sstep(c['spike_g'][0], c['spike_g'][1], g); w = np.maximum(w, L.blur(w, 1)) * M['free'] * keep
        nsp = max(nsp, int((g > c['spike_g'][1]).sum()))
        V = V + (c.get('spike_w', 0.8) * w)[:, None] * lap
    # 1. global light Taubin (faceting, ripples)
    V = taubin(L, V, M['free'] * keep * c['global_w'], c['global_it'])
    # 2. cleft lips: convex-only relaxation, mask recomputed each round from the current curvature
    for _ in range(c['lip_rounds']):
        N = normals(V, F); H = mean_curv(L, V, N, hbar) * MM   # 1/mm
        w = M['cleft'] * sstep(c['lip_H'][0], c['lip_H'][1], H) * M['free']
        w = L.blur(w, 2) * c['lip_w']
        lap = L.lap(V); nl = (lap * N).sum(1)
        # move along the normal only, and only inward (rounds the edge, never lifts the floor)
        V = V + (w * np.minimum(nl, 0))[:, None] * N + (0.5 * w)[:, None] * (lap - nl[:, None] * N)
    # 3. cleft floors: a light tangential-plus-normal relax that keeps floor height (floor U-rounding)
    if c.get('floor_it', 0):
        V = taubin(L, V, M['cleft'] * M['free'] * c['floor_w'], c['floor_it'])
    # 4. leg hand-over band
    if M['band'].any():
        V = taubin(L, V, M['band'] * M['free'] * c['band_w'], c['band_it'], lam=0.6, mu=-0.62)
    d = np.linalg.norm(V - V0, axis=1) / MM
    info = dict(moved_mm_max=round(float(d.max()), 3), moved_mm_p99=round(float(np.percentile(d, 99)), 3), moved_mm_mean=round(float(d.mean()), 4),
                cleft_verts=int((M['cleft'] > 0.5).sum()), spike_verts_max=nsp, band_verts=int((M['band'] > 0.5).sum()))
    return V, info


def clean_weld(ob, c, log=None):
    """Weld band: join the bridge triangles into quads where two triangles share a long edge and are nearly coplanar,
    split remaining n-gons from the bisect into quads plus at most one triangle, then relax the band vertices tangentially
    (the cap ring is pinned)."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    cap = max(bm.faces, key=lambda f: len(f.verts)); capv = set(cap.verts)
    band = set()
    for v in capv:
        for f in v.link_faces:
            if f is not cap: band.add(f)
    ring2 = {w for f in band for w in f.verts} - capv
    for v in ring2:
        for f in v.link_faces:
            if f is not cap: band.add(f)
    tris = [f for f in band if len(f.verts) == 3]
    bmesh.ops.join_triangles(bm, faces=tris, angle_face_threshold=np.radians(c.get('weld_join_face_deg', 40)), angle_shape_threshold=np.radians(c.get('weld_join_shape_deg', 60)))
    ng = [f for f in bm.faces if len(f.verts) > 4 and f is not cap and f.is_valid]
    if ng: bmesh.ops.triangulate(bm, faces=ng, quad_method='BEAUTY', ngon_method='BEAUTY')
    tris = [f for f in bm.faces if len(f.verts) == 3]
    if tris: bmesh.ops.join_triangles(bm, faces=tris, angle_face_threshold=np.radians(40), angle_shape_threshold=np.radians(60))
    cap = max(bm.faces, key=lambda f: len(f.verts)); capv = set(cap.verts)
    # tangential relax of the two vertex rows next to the cap ring
    near = set()
    for v in capv:
        for e in v.link_edges:
            w = e.other_vert(v)
            if w not in capv: near.add(w)
    near2 = {e.other_vert(v) for v in near for e in v.link_edges} - capv
    rel = list(near | near2)
    for _ in range(c.get('weld_relax_it', 6)):
        new = {}
        for v in rel:
            nb = [e.other_vert(v).co for e in v.link_edges]
            avg = sum(nb, v.co * 0) / len(nb); dvec = avg - v.co; n = v.normal
            new[v] = v.co + 0.5 * (dvec - n * dvec.dot(n)) + 0.25 * n * dvec.dot(n)
        for v, co in new.items(): v.co = co
        bm.normal_update()
    q = sum(1 for f in bm.faces if len(f.verts) == 4); t3 = sum(1 for f in bm.faces if len(f.verts) == 3); ngn = sum(1 for f in bm.faces if len(f.verts) > 4)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()
    for p in ob.data.polygons: p.use_smooth = True
    info = dict(quads=q, tris=t3, ngons_incl_cap=ngn)
    if log is not None: log[ob.name + '_weld'] = info
    return info
