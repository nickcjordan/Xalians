"""Layered lock sweeps for the ear fan front (R03, loop v3 round 22). numpy only; no Blender, no OpenVDB.

Used by author_fan_lock_sweeps.py (Blender, OpenVDB). Everything here works on a dense crop of the head skin's level set around
one wing (negative inside, narrow band clamped at +-band) and returns the edited crop, exactly as fan_clumps_front_fast_v2.build_wing
does, but the construction is different (specs/R03.md section 2 table and the method of methods.md R03):

  1. Every coat lock and every tuft clump is its own closed swept solid: a Bezier guide from the clump table, a rounded
     superellipse section with a raised spine on its front face, a narrower back (the undercut), width and thickness tapering to a
     real point (an apex vertex past the last ring), a small twist about its axis. The solid is a triangle mesh (`build_sweep`), made
     in plain numpy, closed and outward oriented (checked by `mesh_checks`).
  2. Layers. Layer 1 (secondaries and drape) is set back behind layer 2 (primaries) by `standoff` toward the tips, so every
     primary tip stands clear of the lock beneath it and the flank of the primary leaves an undercut over the secondary.
  3. Backing. The old front coat is stripped (the v2 strip with its ramps, so no cut wall) down to a backing surface that lies
     `backing.depthBehindDeepest` behind the deepest layer's rear faces (and never nearer than `backing.shift` behind the old
     mid-surface, never closer than `backing.minThickness` to the old rear face). There is no envelope core.
  4. Join. Each solid is voxelized to a level set by the caller (`voxelize`) and unioned with a hard minimum, so locks keep their
     own creases; a smooth union of radius `union.rootBlend` is used only within `union.rootBand` of the lock's root, which is
     the only place a lock is joined to the head by design (a lock that reaches the backing along its body is joined there too).
  5. Cup. A bowl (rim polygon, floor depth table, opening yawed `cup.yawDeg` outward, concave bowl, dish at the rim, filleted)
     is subtracted from the coat; then the pale tuft sweeps (layer 3) are added over the floor, rooted on it, their tips
     standing `tuft.standoff` clear of it.

Frames. Head-local (x, y, z): x_h = S (x_fit - CX), y_h = S df + DF0 (front is -y), z_h = Z0 - S y_fit, S = 3.721, with the fit frame of
loop_tools.canonical (x across, positive to the viewer's right in the front view; y down from the crown) and df the depth in figure
heights (front negative). u = |x_h| / S is the distance from the head's own center line. All spec numbers are figure heights.
"""
import copy
import fnmatch
import hashlib
import math

import numpy as np

import fan_clumps_front_fast_v2 as fcf

S = fcf.S
CX = fcf.CX
Z0 = fcf.Z0
DF0 = fcf.DF0

DEFAULTS = {
    'voxel': .0025,
    'strip': {
        'u': [.085, .100],          # |u| from which the old front is stripped: above y .045, and below it
        'yBlend': [.035, .055],     # the strip u switches from the first to the second over these rows
        'ramp': .008,
        'rampIn': .030,             # width of the strip edge toward the skull (a slope, not a wall)
        'bottom': .195,             # no strip below this row
        'maxDepth': .080,           # the cut sinks at most this far behind the old front face (the backing, not this cap, sets the depth)
        'depthRamp': .040,          # the cut sinks from the old front to the backing over this much
        'midBlur': .010,
    },
    'backing': {
        'shift': .006,              # the backing front is at least this far behind the old mid-surface
        'depthBehindDeepest': .014,  # and this far behind the deepest layer's rear faces (the spec's .015 does not fit the thin fan)
        'minThickness': .010,       # but never closer than this to the old rear face (what remains behind it is the R04 rear)
        'blur': .008,               # smoothing of the backing surface (figure heights)
    },
    'layers': [
        {'name': 'under', 'ids': ['?S*', '?D*'], 'layer': 1, 'standoff': .014, 'standoffFrom': .15, 'standoffTo': .75,
         'undercut': .85, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0, 'shingle': 0.},
        {'name': 'over', 'ids': ['?P*'], 'layer': 2, 'standoff': 0., 'standoffFrom': .15, 'standoffTo': .75,
         'undercut': .85, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0, 'shingle': .012},
    ],
    'section': {
        'p': 2.4,                   # superellipse exponent (2 is an ellipse; larger is fuller)
        'spine': .45,               # extra height of the front face along its center line, as a fraction of the half thickness
        'rollDeg': 14.,             # constant lean about the axis, alternating sign from lock to lock
        'twistDeg': 6.,             # peak twist about the axis (a deterministic per-lock sign and size), the spec asks under 10
        'widthScale': .9,
        'thickScale': .8,
        'camber': .016,             # forward camber of the front face at mid length
        'lowerRow': .17,            # locks whose tip row is at least this are the small lower locks
        'lowerScale': [1.5, 1.25],  # width and thickness scale of the small lower locks (pins at table size)
        'rings': 56,                # rings along a lock
        'around': 28,               # points around a ring
    },
    'tips': {
        'minHalfWidth': .0030,      # half width of the last ring (figure heights); at least 2 voxels of the assembly's final remesh (.0028 world = .0015 figure heights)
        'minHalfThick': .0030,      # the same for the thinnest the back of a lock may get under the rear clamp
        'length': .005,             # the apex vertex stands this far past the last ring
        'taperScale': 1.0,          # multiplies the table's taper exponents
        'thickTaperScale': 1.0,
    },
    'union': {
        'rootBand': .035,           # smooth union only within this distance of the lock root (figure heights)
        'rootRamp': .020,           # and fading out over this
        'rootBlend': .004,          # smooth union radius in the root band (figure heights)
        'rootCap': .020,            # the solid is carried this far behind its root, into the head
        'stemRadius': .45,          # radius of the stem rod from a coat lock root back into the backing, as a fraction of the root half width
        'stemInto': .006,           # the stem ends this far inside the backing (figure heights)
        'rearMargin': .004,         # the thickness clamp keeps the lock's back this far in front of the old rear face
        'rearClip': -.001,          # new material is cut off this far behind the old rear face (negative: in front of it)
        'seamBlur': 3,              # box blur radius (voxels, 3 passes) in the strip-edge and cup-rim seam bands; 0 = off
        'seamStripReach': .045,
        'seamCupReach': .006,
        'seamFade': .025,
        'ceilingBlend': .008,
    },
    'cup': {
        'polygons': None,           # {'L': [[x, y], ...], 'R': [...]} in the fit frame (None = fan_clumps_front_fast_v2.CUPS)
        'yawDeg': 35.,              # the opening's yaw outward from straight forward; the floor slope is tan(yaw)
        'floorStart': -.016,        # floor depth at u .100
        'floorMax': .036,
        'bowl': .008,               # extra depth toward the polygon's middle
        'dish': .018,               # the carve depth rises to the coat surface over this much inside the rim (0 = a wall)
        'fillet': .005,
        'skullRamp': .028,
        'shift': 0.,
    },
    'tuft': {
        'ids': ['?T*'],
        'standoff': .008,           # a tuft tip stands this far in front of the floor
        'liftFrom': .20,            # the lift starts at this fraction of the length
        'widthScale': 1.2,
        'thickScale': 1.5,
        'tipHalfWidth': .0025,
        'rootBand': .030,
        'rootBlend': .008,
        'floorBlend': .002,
        'twistDeg': 4.,
        'rollDeg': 6.,
        'shingle': .004,            # every second tuft clump stands this much further off the floor
    },
    'pale': {'tol': .004, 'gray': .58, 'smooth': 4},
    'clumps': {},                   # per-clump edits of the table rows (name or fnmatch pattern): root, tip, curl, widthRoot, widthMid,
                                    # thick, taper, plus standoff, twistDeg, spine, undercut, skip
    'skip': '',
    'ceiling': None,
}


OWNERS = []   # debug: (side, layer, slices, distance array) of every unioned solid, read by author_fan_lock_sweeps.py --debug-owner


def merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if k in ('clumps', 'note', 'schemaVersion'):
            out[k] = v if k == 'clumps' else out.get(k)
            continue
        if k not in out:
            raise SystemExit(f'unknown spec key {k}')
        if isinstance(out[k], dict) and isinstance(v, dict):
            for kk, vv in v.items():
                if kk not in out[k]:
                    raise SystemExit(f'unknown spec key {k}.{kk}')
                out[k][kk] = vv
        else:
            out[k] = v
    return out


def smoothstep(t):
    return fcf.smoothstep(t)


def smin(a, b, k):
    return fcf.smin(a, b, k)


def smax(a, b, k):
    return fcf.smax(a, b, k)


def jitter_of(name):
    return int(hashlib.md5(name.encode()).hexdigest()[:8], 16)/0xffffffff*2-1


def apply_clump_edits(table, edits):
    """Per-clump edits: patterns first (file order), then exact names. Returns new rows."""
    rows = [dict(c) for c in table]
    names = {c['name'] for c in rows}
    for pattern, change in edits.items():
        if pattern in names:
            continue
        hit = [c for c in rows if fnmatch.fnmatchcase(c['name'], pattern)]
        if not hit:
            raise SystemExit(f'spec clumps: {pattern} matches no clump')
        for c in hit:
            c.update(change)
    for name, change in edits.items():
        if name in names:
            next(c for c in rows if c['name'] == name).update(change)
    return rows


# ---- one solid -----------------------------------------------------------------------------------------------------------------
def dense_path(c, side, length_scale):
    """Front-view guide of a clump (fan_clumps_front_fast_v2.bezier_path): arrays of arc fraction, fit x, fit y and the length."""
    sg = 1. if side == 'L' else -1.
    x0, y0, _ = c['root']
    x1, y1, _ = c['tip']
    if length_scale != 1.:
        x1, y1 = x0+(x1-x0)*length_scale, y0+(y1-y0)*length_scale
    r = np.array([sg*(x0-CX), -y0])
    t = np.array([sg*(x1-CX), -y1])
    chord = t-r
    L = float(np.hypot(*chord))
    d = chord/L
    nl = np.array([-d[1], d[0]])
    ctrl = (r+t)/2-nl*(L/2)*np.tan(np.radians(c['curl']))
    s = np.linspace(0, 1, 400)[:, None]
    pts = (1-s)**2*r+2*(1-s)*s*ctrl+s**2*t
    seg = np.hypot(*np.diff(pts, axis=0).T)
    arc = np.r_[0, np.cumsum(seg)]
    return arc/arc[-1], sg*pts[:, 0]+CX, -pts[:, 1], float(arc[-1])


def ring_params(n):
    """n parameters in [0, 1], denser near both ends (the tip and the root need the rings)."""
    u = np.linspace(0, 1, n)
    return .5-.5*np.cos(np.pi*u)


def section_profiles(c, t, P, lower, tuft=False):
    """Half widths and the total thickness along t (spec section 3), figure heights."""
    sec = P['section']
    tips = P['tips']
    ws = sec['widthScale']*c.get('widthScale', 1.)
    ts = sec['thickScale']
    if tuft:
        ws *= P['tuft']['widthScale']
        ts *= P['tuft']['thickScale']
    if lower:
        ws *= sec['lowerScale'][0]
        ts *= sec['lowerScale'][1]
    wr, wm, th = c['widthRoot']*ws, c['widthMid']*ws, c['thick']*ts
    tp = c['taper']*tips['taperScale']
    rise = wr+(wm-wr)*smoothstep(t/.4)
    fall = wm*(np.clip(1-t, 0, 1)/.6)**tp
    w = np.where(t < .4, rise, fall)
    thw = tips['minHalfWidth'] if not tuft else P['tuft']['tipHalfWidth']
    w = np.maximum(w, 2*thw)
    thick = np.where(t < .4, th*(.75+.25*smoothstep(t/.4)), th*(np.clip(1-t, 0, 1)/.6)**(.8*c['taper']*tips['thickTaperScale']))
    thick = np.maximum(thick, 2*min(tips['minHalfThick'], thw*.6 if tuft else tips['minHalfThick']))
    return w/2, thick


def lock_geometry(c, side, P, layer_cfg, rear_df=None, floor_at=None):
    """Plan of one lock: axis (head-local), half widths, front and rear half heights, twist. Figure heights unless named _h.

    rear_df(xf, yf) gives the old rear face depth (thickness clamp); floor_at(xf, yf) gives the cup floor depth for tuft clumps."""
    sec, tips, un = P['section'], P['tips'], P['union']
    tuft = c['family'] == 'T'
    n = sec['rings']
    ls = layer_cfg.get('lengthScale', 1.)*c.get('lengthScale', 1.)
    frac, xs, ys, L = dense_path(c, side, ls)
    t = ring_params(n)
    xf = np.interp(t, frac, xs)
    yf = np.interp(t, frac, ys)
    lower = (not tuft) and c['tip'][1] >= sec['lowerRow']
    cfg = dict(layer_cfg)
    cfg.update({k: c[k] for k in ('standoff', 'undercut', 'standoffFrom', 'standoffTo', 'shingle') if k in c})
    pc = P
    if 'widthScale' in layer_cfg or 'thickScale' in layer_cfg:
        pc = copy.deepcopy(P)
        pc['section']['widthScale'] *= layer_cfg.get('widthScale', 1.)
        pc['section']['thickScale'] *= layer_cfg.get('thickScale', 1.)
    hw, thick = section_profiles(c, t, pc, lower, tuft)
    spine = c.get('spine', sec['spine'])
    if tuft:
        fl = floor_at(xf, yf)
        lift = P['tuft']['standoff']*smoothstep((t-P['tuft']['liftFrom'])/max(1e-6, 1-P['tuft']['liftFrom']))
        num_ = int(c['name'][2:]) if c['name'][2:].isdigit() else 0
        lift = lift+(P['tuft']['shingle']*smoothstep(t/.3) if num_ % 2 == 0 else 0.)    # every second clump stands proud of its neighbours
        rear = fl-lift
        front = rear-thick
    else:
        df_root, df_tip = c['root'][2], c['tip'][2]
        front = df_root+(df_tip-df_root)*t-sec['camber']*t*(1-t)
        sh = cfg.get('shingle', 0.)
        if sh and c['name'][2:].isdigit() and int(c['name'][2:]) % 2 == 0:
            front = front+sh*smoothstep(t/.25)     # every second lock lies behind its neighbours so each one's flank stands as an edge
        so = cfg.get('standoff', 0.)
        if so:
            a, b = cfg.get('standoffFrom', .15), cfg.get('standoffTo', .75)
            front = front+so*smoothstep((t-a)/max(1e-6, b-a))
        if rear_df is not None:
            clamp = rear_df(xf, yf)-front-un['rearMargin']
            thick = np.minimum(thick, np.maximum(clamp, 2*tips['minHalfThick']))
        rear = front+thick
    hr = thick/2/(1+spine/2)
    hf = hr*(1+spine)
    center = rear-hr
    ax = np.stack([S*(xf-CX), S*center+DF0, Z0-S*yf], axis=1)
    tw_deg = (P['tuft']['twistDeg'] if tuft else sec['twistDeg'])*c.get('twistScale', 1.)
    twist = np.radians(tw_deg*jitter_of(c['name']))*np.sin(np.pi*t)
    num = int(c['name'][2:]) if c['name'][2:].isdigit() else 0
    roll = (P['tuft']['rollDeg'] if tuft else sec['rollDeg'])*(1. if num % 2 else -1.)
    twist = twist+np.radians(roll)*smoothstep(t/.25)      # alternate locks lean to opposite sides so neighbours catch the light differently
    return {
        't': t, 'xf': xf, 'yf': yf, 'front': front, 'rear': rear, 'hw': hw, 'hf': hf, 'hr': hr, 'thick': thick, 'axis': ax,
        'twist': twist, 'L': L, 'undercut': cfg.get('undercut', 1.), 'spine': spine, 'tuft': tuft, 'lower': lower,
        'standoff': cfg.get('standoff', 0.) if not tuft else P['tuft']['standoff'], 'layer': 3 if tuft else cfg.get('layer', 2),
    }


def build_sweep(g, P):
    """Closed swept solid of one lock as (vertices float64 (n, 3) head-local, triangles int (m, 3)).

    Rings along the axis (plus a few before the root, inside the head), an apex vertex past the last ring, a center vertex on the
    root cap. Section: superellipse of exponent p, front half raised along its center line (spine), back half narrowed (undercut)."""
    sec, tips, un = P['section'], P['tips'], P['union']
    ax = g['axis']
    n = len(ax)
    M = sec['around']
    pexp = sec['p']
    T = np.gradient(ax, axis=0)
    T /= np.linalg.norm(T, axis=1)[:, None]
    fwd = np.array([0., -1., 0.])
    N = fwd[None, :]-(T@fwd)[:, None]*T
    nn = np.linalg.norm(N, axis=1)
    bad = nn < 1e-3
    if bad.any():
        N[bad] = np.array([0., 0., 1.])[None, :]-(T[bad, 2])[:, None]*T[bad]
        nn = np.linalg.norm(N, axis=1)
    N /= nn[:, None]
    B = np.cross(N, T)
    cb, sb = np.cos(g['twist'])[:, None], np.sin(g['twist'])[:, None]
    B2 = cb*B+sb*N
    N2 = cb*N-sb*B
    th = np.linspace(0, 2*np.pi, M, endpoint=False)
    c, s = np.cos(th), np.sin(th)
    ex = np.sign(c)*np.abs(c)**(2/pexp)
    en = np.sign(s)*np.abs(s)**(2/pexp)
    front_half = s > 0
    uc = g['undercut']
    hw, hf, hr = g['hw']*S, g['hf']*S, g['hr']*S
    spine = g['spine']
    # ring points
    xk = hw[:, None]*ex[None, :]*np.where(front_half, 1., uc)[None, :]
    raise_ = np.where(front_half, 1+spine*(1-ex**2), 1.)[None, :]
    yk = hr[:, None]*en[None, :]*raise_
    rings = ax[:, None, :]+xk[:, :, None]*B2[:, None, :]+yk[:, :, None]*N2[:, None, :]
    # root extension: the first section carried straight back along the root tangent, into the head
    ext_len = un['rootCap']*S
    n_ext = 3
    ext = []
    for k in range(n_ext, 0, -1):
        off = -T[0]*ext_len*k/n_ext
        ext.append(rings[0]+off[None, :])
    allr = np.concatenate([np.array(ext).reshape(-1, M, 3), rings], axis=0) if n_ext else rings
    nr = len(allr)
    apex = ax[-1]+T[-1]*(tips['length']*S)
    root_center = ax[0]-T[0]*ext_len
    verts = np.concatenate([allr.reshape(-1, 3), apex[None, :], root_center[None, :]], axis=0)
    ia, ic = nr*M, nr*M+1
    tris = []
    j = np.arange(M)
    j1 = (j+1) % M
    for r in range(nr-1):
        a0, a1 = r*M+j, r*M+j1
        b0, b1 = (r+1)*M+j, (r+1)*M+j1
        tris.append(np.stack([a0, a1, b1], axis=1))
        tris.append(np.stack([a0, b1, b0], axis=1))
    last = (nr-1)*M
    tris.append(np.stack([last+j, last+j1, np.full(M, ia)], axis=1))
    tris.append(np.stack([j1, j, np.full(M, ic)], axis=1))
    tris = np.concatenate(tris, axis=0).astype(np.int32)
    v0, v1, v2 = verts[tris[:, 0]], verts[tris[:, 1]], verts[tris[:, 2]]
    vol = float((v0*np.cross(v1, v2)).sum()/6)
    if vol < 0:
        tris = tris[:, ::-1].copy()
        vol = -vol
    return verts, tris, vol


def mesh_checks(verts, tris):
    """Closed (every edge in exactly two faces, opposite directions), Euler characteristic and signed volume."""
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]], axis=0)
    key = np.minimum(e[:, 0], e[:, 1]).astype(np.int64)*len(verts)+np.maximum(e[:, 0], e[:, 1])
    _, counts = np.unique(key, return_counts=True)
    directed = e[:, 0].astype(np.int64)*len(verts)+e[:, 1]
    consistent = len(np.unique(directed)) == len(directed)
    V, E, Fc = len(verts), len(counts), len(tris)
    v0, v1, v2 = verts[tris[:, 0]], verts[tris[:, 1]], verts[tris[:, 2]]
    return {'closed': bool((counts == 2).all()), 'oriented': bool(consistent), 'euler': int(V-E+Fc),
            'volume': float((v0*np.cross(v1, v2)).sum()/6), 'vertices': int(V), 'faces': int(Fc)}


# ---- the wing --------------------------------------------------------------------------------------------------------------------
def splat(wing, geoms, field, reduce):
    """Per column (x, z) of the crop: reduce (np.minimum or np.maximum) of g[field] over every sample disc of every geometry."""
    nx, ny, nz = wing.F.shape
    vs = wing.vs
    out = np.full((nx, nz), np.nan, np.float32)
    seed = np.inf if reduce is np.minimum else -np.inf
    work = np.full((nx, nz), seed, np.float32)
    for g in geoms:
        for k in range(len(g['t'])):
            cx = (g['axis'][k, 0]/vs)-wing.lo[0]
            cz = (g['axis'][k, 2]/vs)-wing.lo[2]
            rad = g['hw'][k]*S/vs
            i0, i1 = int(max(0, np.floor(cx-rad))), int(min(nx, np.ceil(cx+rad)+1))
            j0, j1 = int(max(0, np.floor(cz-rad))), int(min(nz, np.ceil(cz+rad)+1))
            if i1 <= i0 or j1 <= j0:
                continue
            ii, jj = np.meshgrid(np.arange(i0, i1), np.arange(j0, j1), indexing='ij')
            m = ((ii-cx)**2+(jj-cz)**2) <= rad*rad
            cur = work[i0:i1, j0:j1]
            work[i0:i1, j0:j1] = np.where(m, reduce(cur, g[field][k]), cur)
    out = np.where(np.isinf(work), np.nan, work)
    return out


def layer_for(c, layers):
    for cfg in layers:
        for pat in cfg['ids']:
            if fnmatch.fnmatchcase(c['name'], pat):
                return cfg
    raise SystemExit(f'no layer for clump {c["name"]}')


def stem_distance(sl, lo, vs, p0, p1, rad):
    """Signed distance of a capsule from p0 to p1 (head-local), radius rad, over the voxel block `sl` of a crop whose origin index is lo."""
    ox = ((lo[0]+np.arange(sl[0].start, sl[0].stop))*vs).astype(np.float32)[:, None, None]
    oy = ((lo[1]+np.arange(sl[1].start, sl[1].stop))*vs).astype(np.float32)[None, :, None]
    oz = ((lo[2]+np.arange(sl[2].start, sl[2].stop))*vs).astype(np.float32)[None, None, :]
    v = np.asarray(p1, np.float64)-np.asarray(p0, np.float64)
    vv = float(v@v)
    t = np.clip(((ox-p0[0])*v[0]+(oy-p0[1])*v[1]+(oz-p0[2])*v[2])/vv, 0, 1)
    return (np.sqrt((ox-p0[0]-t*v[0])**2+(oy-p0[1]-t*v[1])**2+(oz-p0[2]-t*v[2])**2)-rad).astype(np.float32)


def prune_thin_fragments(F, band, stride=2):
    """Remove every piece that is joined to the main body only through a neck thinner than `stride` voxels.

    The assembly remeshes the whole creature at .0028 world (about 2.2 voxels of the default grid) and refuses a result of more than
    one solid; a sliver of the old rear coat left behind the backing, or a lock tip joined by a one voxel neck, falls off there. The
    check samples the field every `stride` voxels, labels the connected inside cells, and fills every labelled piece but the largest
    (grown by one cell) with outside. Returns (field, sizes in coarse cells of the pieces removed)."""
    inside = F[::stride, ::stride, ::stride] < 0
    n = int(inside.sum())
    if n == 0:
        return F, []
    idx = np.full(inside.shape, -1, np.int64)
    idx[inside] = np.arange(n)
    ea, eb = [], []
    for ax in range(3):
        a = [slice(None)]*3
        b = [slice(None)]*3
        a[ax], b[ax] = slice(0, -1), slice(1, None)
        both = inside[tuple(a)] & inside[tuple(b)]
        ea.append(idx[tuple(a)][both])
        eb.append(idx[tuple(b)][both])
    lab = fcf.fc.labels_from_edges(n, np.concatenate(ea), np.concatenate(eb))
    uniq, counts = np.unique(lab, return_counts=True)
    if len(uniq) == 1:
        return F, []
    main = uniq[counts.argmax()]
    small = np.zeros(inside.shape, bool)
    small[inside] = lab != main
    g = small.copy()
    for ax in range(3):
        sl_a = [slice(None)]*3
        sl_b = [slice(None)]*3
        sl_a[ax], sl_b[ax] = slice(1, None), slice(0, -1)
        g[tuple(sl_a)] |= small[tuple(sl_b)]
        g[tuple(sl_b)] |= small[tuple(sl_a)]
    up = g
    for ax in range(3):
        up = np.repeat(up, stride, axis=ax)
    up = up[:F.shape[0], :F.shape[1], :F.shape[2]]
    pad = [(0, F.shape[i]-up.shape[i]) for i in range(3)]
    if any(p_[1] for p_ in pad):
        up = np.pad(up, pad)
    kill = up & (F < band*.5)
    F = np.where(kill, np.float32(band), F).astype(np.float32)
    sizes = sorted((int(c) for c in counts if c != counts.max()), reverse=True)
    return F, sizes


def build_wing(F, lo, vs, side, table, env, P, voxelize, band, log=print):
    """Edit one wing crop. voxelize(verts, tris) -> (slices into the crop, dense distance array) or None.

    Returns (F_new, tufts, info); tufts is a list of (slices, distance array) of the pale clumps."""
    wing = fcf.Wing(F, lo, vs, side)
    sg = wing.sg
    F = F.copy()
    nx, ny, nz = F.shape
    XF, YF = wing.fit_xy()
    U = np.broadcast_to(wing.U, XF.shape)
    sec, un = P['section'], P['union']
    info = {'side': side}
    st, bk, cu, tu = P['strip'], P['backing'], P['cup'], P['tuft']

    skip = set(n.strip() for n in P['skip'].split(',') if n.strip())
    mine = [c for c in table if c['side'] == side and c['name'] not in skip and c['name'][1:] not in skip and not c.get('skip')]
    coat = [c for c in mine if c['family'] in 'PSD']
    tuft = [c for c in mine if c['family'] == 'T']

    # --- surfaces of the old skin ---------------------------------------------------------------------------------------
    y_front0, y_rear0 = fcf.surfaces(F, wing)
    valid = ~np.isnan(y_front0)
    mid = (y_front0+y_rear0)/2
    r_mid = max(1, int(round(st['midBlur']*S/vs)))
    mid = fcf.blur_masked(np.where(valid, mid, 0.), valid, r_mid, passes=2)
    rear_fill = fcf.fill_nan((y_rear0-DF0)/S)                    # figure heights
    front_fill = fcf.fill_nan((y_front0-DF0)/S)

    def rear_df(xf, yf):
        c = (np.asarray(xf)-CX)*S/vs-wing.lo[0]
        r = (Z0-S*np.asarray(yf))/vs-wing.lo[2]
        c0 = np.clip(np.round(c).astype(int), 0, nx-1)
        r0 = np.clip(np.round(r).astype(int), 0, nz-1)
        return rear_fill[c0, r0]

    # --- cup floor (needed by the backing and the tuft) -----------------------------------------------------------------------
    polys = cu['polygons'] or {k: v for k, v in fcf.CUPS.items()}
    cup = [(x+cu['shift']*sg, y) for x, y in polys[side]]
    sdf_cup = fcf.polygon_sdf(XF, YF, cup).astype(np.float32)
    pcup = {'floor_start': cu['floorStart'], 'floor_slope': math.tan(math.radians(cu['yawDeg'])), 'floor_max': cu['floorMax'],
            'floor_bowl': cu['bowl']}
    fl = fcf.floor_df(U, YF, sdf_cup, pcup).astype(np.float32)

    def floor_at(xf, yf):
        c = (np.asarray(xf)-CX)*S/vs-wing.lo[0]
        r = (Z0-S*np.asarray(yf))/vs-wing.lo[2]
        c0 = np.clip(np.round(c).astype(int), 0, nx-1)
        r0 = np.clip(np.round(r).astype(int), 0, nz-1)
        return fl[c0, r0]

    # --- plans of every solid ---------------------------------------------------------------------------------------------------
    geoms = []
    for c in sorted(coat, key=lambda c: (layer_for(c, P['layers'])['layer'], c['name'])):
        cfg = layer_for(c, P['layers'])
        geoms.append((c, cfg, lock_geometry(c, side, P, cfg, rear_df=rear_df)))

    # --- backing: behind the deepest layer, behind the old mid-surface, in front of the old rear ---------------------------------
    mid_df = fcf.fill_nan((mid-DF0)/S)
    mid_df = np.where(np.isnan(mid_df), front_fill, mid_df)
    deepest = [g for c, cfg, g in geoms if cfg['layer'] == min(x[1]['layer'] for x in geoms)]
    plan_rear = splat(wing, deepest, 'rear', np.maximum)
    plan_rear = fcf.fill_nan(plan_rear)
    plan_rear = np.where(np.isnan(plan_rear), mid_df, plan_rear)
    b = np.maximum(mid_df+bk['shift'], plan_rear+bk['depthBehindDeepest'])
    if bk['blur'] > 0:
        rb = max(1, int(round(bk['blur']*S/vs)))
        ok = np.ones(b.shape, bool)
        b = fcf.blur_masked(b, ok, rb, passes=2)
    b = np.minimum(b, rear_fill-bk['minThickness'])
    if st['maxDepth']:
        b = np.minimum(b, front_fill+st['maxDepth'])
    b = np.maximum(b, front_fill)
    if st['depthRamp'] > 0:
        a_, b_ = st['u'], st['yBlend']
        u0 = a_[0]+(a_[1]-a_[0])*smoothstep((wing.YF-b_[0])/(b_[1]-b_[0]))
        t_d = smoothstep((wing.U-(u0-st['ramp']/2))/st['depthRamp']).astype(np.float32)
        b = front_fill+t_d*(b-front_fill)
    # inside the cup the backing may not be behind the floor, so a floor exists to carve down to
    wcup = smoothstep(-sdf_cup/.010)
    b = b+wcup*(np.minimum(b, fl)-b)
    plan_front = fcf.fill_nan(splat(wing, [g for _, _, g in geoms], 'front', np.minimum))
    cols = []
    for yy in (.03, .06, .09, .12, .15):
        for uu in (.10, .13, .16, .19, .22, .25):
            ci = int(round((sg*uu*S)/vs-wing.lo[0]))
            ck = int(round((Z0-S*yy)/vs-wing.lo[2]))
            if 0 <= ci < nx and 0 <= ck < nz:
                cols.append({'y': yy, 'u': uu, 'front': round(float(front_fill[ci, ck]), 3), 'mid': round(float(mid_df[ci, ck]), 3),
                             'rear': round(float(rear_fill[ci, ck]), 3), 'planFront': round(float(plan_front[ci, ck]), 3),
                             'planRear': round(float(plan_rear[ci, ck]), 3), 'backing': round(float(b[ci, ck]), 3)})
    info['columns'] = cols
    info['backing'] = {'meanBehindMid': float(np.nanmean((b-mid_df)[valid])), 'meanBehindFront': float(np.nanmean((b-front_fill)[valid]))}

    def backing_at(xf, yf):
        c = (np.asarray(xf)-CX)*S/vs-wing.lo[0]
        r = (Z0-S*np.asarray(yf))/vs-wing.lo[2]
        return b[int(np.clip(round(float(c)), 0, nx-1)), int(np.clip(round(float(r)), 0, nz-1))]

    # --- strip (v2 strip, cut at the backing) -----------------------------------------------------------------------------------
    pstrip = {'strip_u': st['u'], 'strip_y_blend': st['yBlend'], 'strip_ramp': st['ramp'], 'strip_ramp_in': st['rampIn'],
              'strip_bottom': st['bottom']}
    w = fcf.strip_weight(wing, pstrip)
    w = np.where(np.isnan(mid), 0., w).astype(np.float32)
    cut_y = (np.where(np.isnan(b), 0., b)*S+DF0).astype(np.float32)
    slope = (1/np.sqrt(1+np.gradient(cut_y, vs, axis=0)**2+np.gradient(cut_y, vs, axis=1)**2)).astype(np.float32)
    Y3 = wing.Y[None, :, None]
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        sl = F[chunk]
        g_ = (cut_y[chunk][:, None, :]-Y3)*slope[chunk][:, None, :]
        F[chunk] = sl+w[chunk][:, None, :]*(np.maximum(sl, g_)-sl)
    info['stripCells'] = int((w > .5).sum())

    # --- rear clip plane -------------------------------------------------------------------------------------------------------------
    Yrc = ((rear_fill+un['rearClip'])*S+DF0).astype(np.float32)
    slope_rc = (1/np.sqrt(1+np.gradient(Yrc, vs, axis=0)**2+np.gradient(Yrc, vs, axis=1)**2)).astype(np.float32)
    no_rc = np.isnan(y_rear0)

    def clip_to_rear(sl, d):
        cs = slice(sl[0].start, sl[0].stop), slice(sl[2].start, sl[2].stop)
        yb = Y3[:, sl[1], :]
        c3 = np.clip((yb-Yrc[cs][:, None, :])*slope_rc[cs][:, None, :], -band, band)
        c3 = np.where(no_rc[cs][:, None, :], -band, c3)
        return np.maximum(d, c3)

    def root_weight(sl, root_pt, rb, rr):
        """1 within rb of the root, fading to 0 over rr (head-local lengths)."""
        ox = (wing.lo[0]+sl[0].start+np.arange(sl[0].stop-sl[0].start))*vs
        oy = (wing.lo[1]+sl[1].start+np.arange(sl[1].stop-sl[1].start))*vs
        oz = (wing.lo[2]+sl[2].start+np.arange(sl[2].stop-sl[2].start))*vs
        d2 = (ox-root_pt[0])[:, None, None]**2+(oy-root_pt[1])[None, :, None]**2+(oz-root_pt[2])[None, None, :]**2
        return (1-smoothstep((np.sqrt(d2)-rb)/rr)).astype(np.float32)

    def union_lock(g, rb, blend, extra_clip=True, stem=False):
        verts, tris, vol = build_sweep(g, P)
        r = voxelize(verts, tris)
        if r is None:
            return None
        sl, d = r
        if extra_clip:
            d = clip_to_rear(sl, d)
        OWNERS.append((side, g.get('layer', 3), sl, d))
        cur = F[sl]
        joined = int(((cur < 0) & (d < 0)).sum())
        wgt = root_weight(sl, g['axis'][0], rb*S, un['rootRamp']*S)
        k = np.maximum(blend*S*wgt, 1e-6)
        F[sl] = np.minimum(smin(cur, d, k), band).astype(np.float32)
        if stem and not g['tuft']:
            # the stem: a rod from the root straight back in depth into the backing, so the lock is joined at its root even where the
            # cup carve takes the rim side of the root away (a lock reaches the backing only here unless it overlaps it)
            c0 = g['axis'][0]
            xf0, yf0 = g['xf'][0], g['yf'][0]
            yb = (backing_at(xf0, yf0)+un['stemInto'])*S+DF0
            p1 = np.array([c0[0], max(yb, c0[1]+.01*S), c0[2]])
            rad = max(g['hw'][0], .004)*S*un['stemRadius']
            lo_i = np.floor(np.minimum(c0, p1)/vs-rad/vs-3).astype(int)
            hi_i = np.ceil(np.maximum(c0, p1)/vs+rad/vs+3).astype(int)
            a_ = np.maximum(lo_i-wing.lo, 0)
            z_ = np.minimum(hi_i-wing.lo+1, np.array(F.shape))
            if np.all(z_ > a_):
                ss = tuple(slice(int(i), int(j)) for i, j in zip(a_, z_))
                ds = stem_distance(ss, wing.lo, vs, c0, p1, rad)
                F[ss] = np.minimum(smin(F[ss], ds, un['rootBlend']*S), band).astype(np.float32)
                joined += int((ds < 0).sum())
        return sl, d, joined, vol

    # --- coat locks ----------------------------------------------------------------------------------------------------------------------
    built = []
    for c, cfg, g in geoms:
        res = union_lock(g, un['rootBand'], un['rootBlend'], stem=True)
        rec = {'name': c['name'], 'layer': cfg['layer'], 'length': round(g['L'], 4), 'tipHalfWidth': round(float(g['hw'][-1]), 4),
               'thickMax': round(float(g['thick'].max()), 4), 'standoff': g['standoff']}
        if res is None:
            rec['skipped'] = 'outside crop'
        else:
            rec['joinedVoxels'] = res[2]
            rec['volume'] = round(res[3], 6)
        built.append(rec)
    info['coat'] = built

    # --- cup bowl, subtracted from the coat -------------------------------------------------------------------------------------------
    y_front1, _ = fcf.surfaces(F, wing)
    rim_df = fcf.fill_nan(np.where(np.isnan(y_front1), np.nan, (y_front1-DF0)/S))
    cut_df = fl.copy()
    carve_poly = cup
    if cu['skullRamp'] > 0:
        edge_u = min(abs(x-CX) for x, _ in cup)
        ramp = cu['skullRamp']
        carve_poly = [((x-sg*ramp) if abs(abs(x-CX)-edge_u) < .004 else x, y) for x, y in cup]
        t_ = smoothstep((edge_u-U)/ramp)
        cut_df = np.where(U < edge_u, (1-t_)*fl+t_*front_fill, fl).astype(np.float32)
    sdf_carve = fcf.polygon_sdf(XF, YF, carve_poly).astype(np.float32)
    if cu['dish'] > 0:
        rim = np.where(np.isnan(rim_df), front_fill, rim_df)
        dsh = smoothstep(-sdf_carve/cu['dish'])
        cut_df = (rim+dsh*(cut_df-rim)).astype(np.float32)
    cut_y2 = (cut_df*S+DF0).astype(np.float32)
    slope2 = (1/np.sqrt(1+np.gradient(cut_y2, vs, axis=0)**2+np.gradient(cut_y2, vs, axis=1)**2)).astype(np.float32)
    sdf_cup_h = (sdf_carve*S).astype(np.float32)
    kf = cu['fillet']*S
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        region = np.maximum(sdf_cup_h[chunk][:, None, :], (Y3-cut_y2[chunk][:, None, :])*slope2[chunk][:, None, :])
        F[chunk] = np.minimum(smax(F[chunk], -region, kf), band)
    info['cupFloorMean'] = float(fl[sdf_cup < 0].mean()) if (sdf_cup < 0).any() else None
    info['cupYawDeg'] = cu['yawDeg']

    # --- tuft sweeps -----------------------------------------------------------------------------------------------------------------
    tufts = []
    tuft_rec = []
    for c in sorted(tuft, key=lambda c: c['name']):
        cfg = {'standoff': tu['standoff'], 'undercut': .9}
        g = lock_geometry(c, side, P, cfg, rear_df=None, floor_at=floor_at)
        res = union_lock(g, tu['rootBand'], tu['rootBlend'], extra_clip=True)
        rec = {'name': c['name'], 'length': round(g['L'], 4), 'tipHalfWidth': round(float(g['hw'][-1]), 4)}
        if res is None:
            rec['skipped'] = 'outside crop'
        else:
            tufts.append((res[0], res[1]))
            rec['joinedVoxels'] = res[2]
        tuft_rec.append(rec)
    info['tuft'] = tuft_rec

    # --- seam smoothing: only where old geometry meets new (strip edge, cup rim) ---------------------------------------------------------
    if un['seamBlur'] > 0:
        a_, b_ = st['u'], st['yBlend']
        u0 = a_[0]+(a_[1]-a_[0])*smoothstep((wing.YF-b_[0])/(b_[1]-b_[0]))
        edge = np.abs(wing.U-(u0+.005))
        w_strip = smoothstep((un['seamStripReach']-edge)/un['seamFade'])*smoothstep((st['bottom']+.02-wing.YF)/.02)
        w_cup = 1-smoothstep((np.abs(sdf_cup)-un['seamCupReach'])/un['seamFade'])
        wsm = np.maximum(w_strip, w_cup).astype(np.float32)
        act = wsm > 1e-3
        if act.any():
            ix = np.where(act.any(axis=1))[0]
            iz = np.where(act.any(axis=0))[0]
            r = int(un['seamBlur'])
            i0, i1 = max(0, ix.min()-4*r), min(nx, ix.max()+4*r+1)
            k0, k1 = max(0, iz.min()-4*r), min(nz, iz.max()+4*r+1)
            sub = F[i0:i1, :, k0:k1]
            bl = sub
            for _ in range(3):
                bl = fcf.fc.box(bl, r)
            F[i0:i1, :, k0:k1] = sub+wsm[i0:i1, None, k0:k1]*(bl-sub)
            F = F.astype(np.float32)
            info['seamBlurCells'] = int(act.sum())

    # --- ceiling -----------------------------------------------------------------------------------------------------------------------
    if P['ceiling'] is not None:
        if un['ceilingBlend'] > 0:
            F = np.minimum(smax(F, np.clip(wing.Z[None, None, :]-P['ceiling'], -band, band), un['ceilingBlend']*S), band).astype(np.float32)
        else:
            F = np.maximum(F, np.clip(wing.Z[None, None, :]-P['ceiling'], -band, band)).astype(np.float32)

    F, pruned = prune_thin_fragments(F, band)
    info['prunedFragments'] = pruned[:30]

    # --- tip standoff achieved (column check of every primary tip zone against the secondaries beneath) ---------------------------------
    unders = [g for c, cfg, g in geoms if cfg['layer'] == min(x[1]['layer'] for x in geoms)]
    overs = [(c, g) for c, cfg, g in geoms if cfg['layer'] != min(x[1]['layer'] for x in geoms)]
    clear = []
    if unders and overs:
        s_front = splat(wing, unders, 'front', np.minimum)
        for c, g in overs:
            for k in range(len(g['t'])):
                if g['t'][k] < .65 or g['t'][k] > .97:
                    continue
                ci = int(np.clip(round(g['axis'][k, 0]/vs-wing.lo[0]), 0, nx-1))
                ck = int(np.clip(round(g['axis'][k, 2]/vs-wing.lo[2]), 0, nz-1))
                v = s_front[ci, ck]
                if not np.isnan(v):
                    clear.append(float(v-g['rear'][k]))
    info['tipClearance'] = ({'min': round(min(clear), 4), 'median': round(float(np.median(clear)), 4), 'samples': len(clear)} if clear else None)

    yf_fin, _ = fcf.surfaces(F, wing)
    prof = {}
    for yy in (.04, .07, .10, .13):
        row = []
        for uu in np.arange(.10, .275, .005):
            ci = int(round((sg*uu*S)/vs-wing.lo[0]))
            ck = int(round((Z0-S*yy)/vs-wing.lo[2]))
            v = yf_fin[ci, ck] if (0 <= ci < nx and 0 <= ck < nz) else np.nan
            row.append(None if np.isnan(v) else round(float((v-DF0)/S), 3))
        prof[str(yy)] = row
    info['frontProfile'] = prof

    sections = {}
    for yy in (.04, .07, .10, .13):
        ck = int(round((Z0-S*yy)/vs-wing.lo[2]))
        sections[f'{side}{yy}'] = F[:, :, ck].astype(np.float16)
    info['_sections'] = sections
    info['_origin'] = [int(v) for v in wing.lo]

    # --- envelope and cup coverage in the front view -----------------------------------------------------------------------------------------
    occ = (F < 0).any(axis=1)
    sheet = fcf.sample_grid(env['mask'].astype(np.float32), XF, YF, outside=0.) > .5
    zone = (U >= .10) & (YF >= -.005) & (YF <= .20)
    cell = (vs/S)**2
    info['envelope'] = {'missing': float((sheet & ~occ & zone).sum()*cell), 'extra': float((occ & ~sheet & zone).sum()*cell)}
    inside_cup = sdf_cup < 0
    tf = np.zeros(F.shape[:1]+F.shape[2:], bool)
    for sl, d in tufts:
        cs = (slice(sl[0].start, sl[0].stop), slice(sl[2].start, sl[2].stop))
        tf[cs] |= (d < 0).any(axis=1)
    info['paleFrontArea'] = float((tf & inside_cup).sum()*cell)
    info['cupArea'] = float(inside_cup.sum()*cell)
    # pale area seen from the side: the first material hit looking in along x from outside, and whether it is tuft
    inside = F < 0
    has = inside.any(axis=0)
    ix_hit = (nx-1-inside[::-1].argmax(axis=0)) if side == 'L' else inside.argmax(axis=0)
    iy_g, iz_g = np.meshgrid(np.arange(ny), np.arange(nz), indexing='ij')
    pale_hit = np.zeros((ny, nz), bool)
    for sl, d in tufts:
        a0, a1 = sl[0].start, sl[0].stop
        b0, b1 = sl[1].start, sl[1].stop
        c0, c1 = sl[2].start, sl[2].stop
        m = has[b0:b1, c0:c1] & (ix_hit[b0:b1, c0:c1] >= a0) & (ix_hit[b0:b1, c0:c1] < a1)
        li = np.clip(ix_hit[b0:b1, c0:c1]-a0, 0, a1-a0-1)
        val = d[li, np.arange(b1-b0)[:, None], np.arange(c1-c0)[None, :]]
        pale_hit[b0:b1, c0:c1] |= m & (val <= P['pale']['tol']*S)
    ys = (wing.lo[1]+iy_g[pale_hit])*vs
    dfs = (ys-DF0)/S
    info['paleSideArea'] = float(pale_hit.sum()*cell)
    info['paleSideCentroidXSide'] = float((dfs+.0067).mean()) if len(dfs) else None
    info['paleSideXSideRange'] = [float(dfs.min()+.0067), float(dfs.max()+.0067)] if len(dfs) else None
    return F, tufts, info
