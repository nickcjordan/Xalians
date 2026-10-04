"""Layered lock sweeps for the ear fan rear (R04, loop v3 round 25). numpy only; no Blender, no OpenVDB.

Used by fan_lock_sweeps_rear_run.py (Blender, OpenVDB), which author_fan_lock_sweeps.py --part rear calls. It shares the section, leaf
taper, layer, root-band union and fragment code with the front tool (fan_lock_sweeps_v3.py, imported and not edited) and adds what
the rear needs (specs/R04.md sections 2 and 3, method of methods.md R04):

  1. Strip. The old rear fan (shell, plate, the H27/H31/H33 rear lock rows, the thick lower edge) is cleared behind
     S(u, y) = max(rear(u, y) - strip.depth, M(u)) in field space, faded in from the ear-root crease and out toward the lower edge,
     exactly as the field tool H34 did, so the dome and the face are untouched. The cut edge is smoothed where the strip changed
     the field. The head dome inside the crease is blurred as a heightfield (crest held) to drop the seams of the old cuts.
  2. Locks. Every rear lock (K crown line, I root band, M middle, T top edge, E edge row) and every crown tuft clump C is its own
     closed swept solid (`build_sweep_rear`): the table's four control points become a Catmull-Rom guide on the 3D depth plan
     (x, y, df) with three path levers (planSweep: the outer wing swept back in plan; profileLean: the E band leaning back over its
     height; tuftCeiling: crown tuft tips never above a row), a rounded superellipse section whose raised spine is on the REAR face
     and whose front half is narrower (the undercut), a convex leaf taper to a real point with a tip half width of at least two
     output voxels, a small twist and roll. The solid is a closed, outward oriented triangle mesh checked by `mesh_checks`.
  3. Layers. E (edge row) lies under M and T, under I, under K, under the crown tuft C. A lower layer's tips are pulled
     `standoff` toward the head beyond the table's own depth, so every upper tip stands clear of the lock under it and its flank
     leaves an undercut.
  4. Backing. A rear backing slab stands in place of the field core: its rear face lies `backing.inside` behind the deepest lock
     fronts (never nearer the envelope than `backing.belowEnvelope`), its outline is the envelope inset along the edges and it thins
     to nothing toward the outline (`backing.feather`), so between locks the surface is a groove, not a plate.
  5. Join. Each solid is voxelized by the caller and unioned with a hard minimum, so locks keep their creases; a smooth union of
     radius `rootBlend` (per layer) acts only within `union.rootBand` of the lock root: the one place a lock is joined to the head by
     design, buried by the table's own root burial (`union.burial` adds more). I and K roots blend widest (about .012) so the valley at
     the dome is a soft concave groove.

Frames. Head-local (x, y, z): x_h = -S x_back, y_h = S df + DF0 (front is -y; df positive toward the rear), z_h = Z0 - S y_fit, S = 3.721
(figure heights to head-local). The character's left wing L (back-view -x) is head-local +x. u = |x_back|. All spec numbers are figure heights.
"""
import copy
import fnmatch
import json
import math

import numpy as np

import fan_lock_sweeps_v3 as fls
import fan_clumps_front_fast_v2 as fcf

S = fcf.S
Z0 = fcf.Z0
DF0 = fcf.DF0
smoothstep = fls.smoothstep
smin = fls.smin
smax = fls.smax
jitter_of = fls.jitter_of
ring_params = fls.ring_params
mesh_checks = fls.mesh_checks

DEFAULTS = {
    'voxel': .0025,
    'strip': {
        'depth': .030,              # the strip keeps rear(u, y) minus this, never in front of M(u)
        'edge': .019,               # near the nape (u under .10) the strip stops this far above the envelope lower edge
        'crown': .052,              # near the crown (u under .09) the strip fades in below this row
        'creaseMargin': .004,       # the strip starts this far inside the crease line
        'cutSmooth': 3,             # box blur radius (voxels, 3 passes) where the strip changed the field; 0 = off
    },
    'dome': {
        'blur': 6,                  # heightfield blur radius (voxels, 2 passes) of the dome inside the crease; 0 = off
        'yMin': .050,
        'yMax': .176,
    },
    'backing': {
        'inside': .004,             # the backing rear face lies this far behind the deepest lock fronts (figure heights)
        'belowEnvelope': .006,      # and at least this far in front of the rear envelope
        'lap': .008,                # the slab front face lies this far in front of the strip cut S(u, y), inside the kept body
        'inset': [.012, .015],      # outline inset from the envelope: top edge, other edges
        'crown': .066,              # beside the dome (u under .09) the backing only starts below this row
        'feather': .012,            # the slab thins to nothing over this much inside its outline
        'blur': .006,               # smoothing of the backing rear surface (figure heights)
        'blend': .005,              # smooth union of the slab with the kept skin
    },
    'layers': [
        {'name': 'edge', 'ids': ['?E*'], 'layer': 2, 'standoff': .008, 'standoffFrom': .15, 'standoffTo': .75, 'undercut': .85,
         'rootBlend': .006, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0},
        {'name': 'middle', 'ids': ['?M*', '?T*'], 'layer': 3, 'standoff': .004, 'standoffFrom': .15, 'standoffTo': .75, 'undercut': .85,
         'rootBlend': .008, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0},
        {'name': 'band', 'ids': ['?I*'], 'layer': 4, 'standoff': .002, 'standoffFrom': .15, 'standoffTo': .75, 'undercut': .85,
         'rootBlend': .012, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0},
        {'name': 'crown', 'ids': ['?K*'], 'layer': 5, 'standoff': 0., 'standoffFrom': .15, 'standoffTo': .75, 'undercut': .9,
         'rootBlend': .012, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0},
        {'name': 'tuft', 'ids': ['C*'], 'layer': 6, 'standoff': 0., 'standoffFrom': .15, 'standoffTo': .75, 'undercut': .9,
         'rootBlend': .006, 'lengthScale': 1.0, 'widthScale': 1.0, 'thickScale': 1.0},
    ],
    'paths': {
        'planSweep': {'extra': 0., 'u0': .16, 'u1': .22, 'rows': 'IMTE'},   # extra df (rearward) added to the outer wing, rising over u0 to u1
        'profileLean': {'amount': 0., 'y0': .04, 'y1': .16, 'rows': 'E'},   # extra df at the top of the band, falling to 0 at y1 (the band leans back going up)
        'tuftCeiling': {'yMin': .016},                                      # crown tuft path points never above this row (smaller y is higher)
        'kRootShift': .006,         # K row: roots move this far toward and past the centerline so the pair fuses across the crown parting
        'kSweepDeg': 0.,            # K row: turn the clump about its root, in the back view, this many degrees downward
        'clampEnvelope': {'rows': 'IMTE', 'tol': .002},                     # outer faces never pass the rear envelope by more than tol
        'samples': 40,              # Catmull-Rom samples per segment before the arc resample
    },
    'section': {
        'p': 2.4,                   # superellipse exponent (2 is an ellipse; larger is fuller)
        'spine': .45,               # extra height of the rear (outer) face along its center line, as a fraction of the half thickness
        'rollDeg': 10.,             # constant lean about the axis, alternating sign from lock to lock
        'twistDeg': 6.,             # peak twist about the axis (deterministic per lock)
        'widthScale': 1.0,
        'thickScale': 1.0,
        'rings': 56,
        'around': 28,
    },
    'tips': {
        'minHalfWidth': {'default': .0030, 'C': .0020},    # figure heights; at least 2 voxels of the assembly's final remesh (.0015)
        'minHalfThick': .0030,
        'length': .005,             # the apex vertex stands this far past the last ring
        'leafA': 1.8,               # width fall (1 - s^a)^b over the outer 60% of a lock: a sets how long it holds its width, b the tip angle
        'leafB': 1.0,
        'leafThickA': 1.6,
        'leafThickB': .8,
    },
    'union': {
        'rootBand': .035,           # smooth union only within this distance of the lock root (figure heights)
        'rootRamp': .020,
        'rootCap': .020,            # the solid is carried this far behind its root, into the head
        'burial': 0.,               # extra df the root is buried forward of the table (the table already buries .006 fading by t .35)
        'burialTo': .35,
        'seamBlur': 0,              # extra box blur radius over the backing edge; 0 = off
        'ceilingBlend': .008,
    },
    'clumps': {},                   # per-clump edits of the table rows (name or fnmatch pattern): path, widthRoot, widthMid, thick, standoff, ...
    'skip': '',
    'ceiling': None,
}


def merge(base, over):
    """fls.merge, but the spec may replace whole lists and the nested tips.minHalfWidth / paths dicts one key at a time."""
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if k in ('note', 'schemaVersion'):
            continue
        if k not in out:
            raise SystemExit(f'unknown spec key {k}')
        if k == 'clumps':
            out[k] = v
            continue
        if isinstance(out[k], dict) and isinstance(v, dict):
            for kk, vv in v.items():
                if kk not in out[k]:
                    raise SystemExit(f'unknown spec key {k}.{kk}')
                if isinstance(out[k][kk], dict) and isinstance(vv, dict):
                    for k3, v3 in vv.items():
                        if k3 not in out[k][kk] and k not in ('tips',):
                            raise SystemExit(f'unknown spec key {k}.{kk}.{k3}')
                        out[k][kk][k3] = v3
                else:
                    out[k][kk] = vv
        else:
            out[k] = v
    return out


# ---- envelope --------------------------------------------------------------------------------------------------------------
class Envelope:
    """The rear envelope of specs/R04.md section 3 as data (specs/r04_envelope.json)."""

    def __init__(self, d):
        self.d = d
        self.top = {k: (np.array(v[0], float), np.array(v[1], float)) for k, v in d['top'].items()}
        self.bottom = {k: (np.array(v[0], float), np.array(v[1], float)) for k, v in d['bottom'].items()}
        self.tip_u = d['tipU']
        self.P = tuple(np.array(a, float) for a in d['P'])
        self.crest = tuple(np.array(a, float) for a in d['crest'])
        self.M = tuple(np.array(a, float) for a in d['M'])
        self.crease_pts = tuple(np.array(a, float) for a in d['crease'])
        self.roll_k = d['topRollK']
        self.wedge = d['wedge']

    def top_y(self, u, side):
        return np.interp(u, *self.top[side])

    def bottom_y(self, u, side):
        return np.interp(u, *self.bottom[side])

    def PU(self, u):
        return np.interp(u, *self.P)

    def CU(self, u):
        return np.interp(u, *self.crest)

    def MU(self, u):
        return np.interp(u, *self.M)

    def crease(self, y):
        return np.interp(y, *self.crease_pts)

    def rear(self, u, y, side):
        """Outer rear surface df of the wing at (u, y): min(P(u), top roll, lower wedge)."""
        top, bottom = self.top_y(u, side), self.bottom_y(u, side)
        topr = self.CU(u)+np.sqrt(np.maximum(y-top, 0)/self.roll_k)
        s = np.maximum(bottom-y, 0)
        w = self.wedge
        on = smoothstep((u-w['fadeFrom'])/w['fadeOver'])
        wedge = on*(self.MU(u)+w['offset']+w['slope']*s)+(1-on)*1.
        return np.minimum(np.minimum(self.PU(u), topr), wedge)

    def chain_distance(self, u, y, pts_u, pts_y):
        best = np.full(np.shape(u), 1e9)
        for i in range(len(pts_u)-1):
            ax, ay, bx, by = pts_u[i], pts_y[i], pts_u[i+1], pts_y[i+1]
            dx, dy = bx-ax, by-ay
            t = np.clip(((u-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy), 0, 1)
            best = np.minimum(best, np.hypot(u-(ax+t*dx), y-(ay+t*dy)))
        return best


# ---- one solid -----------------------------------------------------------------------------------------------------------------
def catmull(p, per=40):
    p = np.array(p, float)
    q = np.vstack([2*p[0]-p[1], p, 2*p[-1]-p[-2]])
    out = []
    for i in range(1, len(p)):
        p0, p1, p2, p3 = q[i-1], q[i], q[i+1], q[i+2]
        for t in np.linspace(0, 1, per, endpoint=False):
            out.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    out.append(p[-1])
    return np.array(out)


def layer_for(c, layers):
    return fls.layer_for(c, layers)


def tip_half_width(P, row):
    mh = P['tips']['minHalfWidth']
    return mh.get(row, mh['default']) if isinstance(mh, dict) else mh


def lock_path(c, P):
    """The guide of one lock on the depth plan: (x_back, y, df) control points with the path levers applied, as an array (4, 3)."""
    pp = P['paths']
    path = np.array(c['path'], float)
    row = c['row']
    sgb = 1. if path[-1, 0] > 0 else -1.
    if row == 'K':
        if pp['kRootShift']:
            path[:, 0] -= sgb*pp['kRootShift']
        if pp['kSweepDeg']:
            a = math.radians(pp['kSweepDeg'])
            r = path[1:, :2]-path[0, :2]
            ca, sa = math.cos(a), math.sin(a)
            out, dn = sgb*r[:, 0], r[:, 1]
            path[1:, 0] = path[0, 0]+sgb*(out*ca-dn*sa)
            path[1:, 1] = path[0, 1]+(out*sa+dn*ca)
    ls = c.get('lengthScale', 1.)
    if ls != 1.:
        path = path[0]+(path-path[0])*ls
    ps = pp['planSweep']
    if ps['extra'] and row in ps['rows']:
        path[:, 2] += ps['extra']*smoothstep((np.abs(path[:, 0])-ps['u0'])/max(1e-6, ps['u1']-ps['u0']))
    pl = pp['profileLean']
    if pl['amount'] and row in pl['rows']:
        path[:, 2] += pl['amount']*np.clip((pl['y1']-path[:, 1])/max(1e-6, pl['y1']-pl['y0']), 0, 1)
    if row == 'C':
        path[:, 1] = np.maximum(path[:, 1], pp['tuftCeiling']['yMin'])
    return path


def section_profiles(c, t, P):
    """Half widths and total thickness along t (specs/R04.md section 2: width rises to its widest at t .4, then a convex leaf fall)."""
    sec, tips = P['section'], P['tips']
    row = c['row']
    ws = sec['widthScale']*c.get('widthScale', 1.)
    ts = sec['thickScale']*c.get('thickScale', 1.)
    wr, wm, th = c['widthRoot']*ws, c['widthMid']*ws, c['thick']*ts
    rise = wr+(wm-wr)*smoothstep(t/.4)
    sf = np.clip((t-.4)/.6, 0, 1)
    fall = wm*np.clip(1-sf**tips['leafA'], 0, 1)**tips['leafB']
    w = np.where(t < .4, rise, fall)
    thw = tip_half_width(P, row)
    w = np.maximum(w, 2*thw)
    tfall = th*np.clip(1-sf**tips['leafThickA'], 0, 1)**tips['leafThickB']
    thick = np.where(t < .4, th*(.7+.3*smoothstep(t/.4)), tfall)
    thick = np.maximum(thick, 2*min(tips['minHalfThick'], thw))
    return w/2, thick


def lock_geometry_rear(c, P, cfg, env):
    """Plan of one rear lock: axis (head-local), half widths, thickness, twist. Figure heights unless named _h."""
    sec, un = P['section'], P['union']
    n = sec['rings']
    row = c['row']
    side = c['side']
    path = lock_path(c, P)
    dense = catmull(path, P['paths']['samples'])
    seg = np.hypot(*np.diff(dense[:, :2], axis=0).T)
    arc3 = np.r_[0, np.cumsum(np.linalg.norm(np.diff(dense, axis=0), axis=1))]
    frac = arc3/arc3[-1]
    t = ring_params(n)
    xb = np.interp(t, frac, dense[:, 0])
    yf = np.interp(t, frac, dense[:, 1])
    df = np.interp(t, frac, dense[:, 2])
    hw, thick = section_profiles(c, t, P)
    so = cfg.get('standoff', 0.)
    c_so = c.get('standoff')
    if c_so is not None:
        so = c_so
    if so:
        a, b = cfg.get('standoffFrom', .15), cfg.get('standoffTo', .75)
        df = df-so*smoothstep((t-a)/max(1e-6, b-a))
    if un['burial']:
        df = df-un['burial']*(1-smoothstep(t/max(1e-6, un['burialTo'])))
    cl = P['paths']['clampEnvelope']
    if row in cl['rows']:
        lim = env.rear(np.abs(xb), yf, side)+cl['tol']-thick/2
        df = np.minimum(df, lim)
    spine = c.get('spine', sec['spine'])
    ax = np.stack([-S*xb, S*df+DF0, Z0-S*yf], axis=1)
    twist = np.radians(sec['twistDeg']*c.get('twistScale', 1.)*jitter_of(c['name']))*np.sin(np.pi*t)
    num = int(''.join(ch for ch in c['name'] if ch.isdigit()) or 0)
    roll = sec['rollDeg']*(1. if num % 2 else -1.)
    twist = twist+np.radians(roll)*smoothstep(t/.25)
    L = float(arc3[-1])
    return {
        't': t, 'xb': xb, 'yf': yf, 'df': df, 'front': df-thick/2, 'rear': df+thick/2, 'hw': hw, 'thick': thick, 'axis': ax,
        'twist': twist, 'L': L, 'undercut': c.get('undercut', cfg.get('undercut', 1.)), 'spine': spine, 'row': row,
        'standoff': so, 'layer': cfg.get('layer', 2), 'tuft': row == 'C', 'rootBlend': cfg.get('rootBlend', .008),
    }


def build_sweep_rear(g, P):
    """Closed swept solid of one rear lock as (vertices float64 (n, 3) head-local, triangles int (m, 3), volume).

    Rings along the axis (plus a few before the root, inside the head), an apex vertex past the last ring, a center vertex on the root
    cap. Section: superellipse of exponent p, the rear (outer) half raised along its center line (spine), the front half narrowed
    (undercut)."""
    sec, tips, un = P['section'], P['tips'], P['union']
    ax = g['axis']
    n = len(ax)
    M = sec['around']
    pexp = sec['p']
    T = np.gradient(ax, axis=0)
    T /= np.linalg.norm(T, axis=1)[:, None]
    fwd = np.array([0., 1., 0.])                       # outward is the rear
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
    outer = s > 0
    uc = g['undercut']
    hw = g['hw']*S
    spine = g['spine']
    h_out = g['thick']/2/(1+spine)*S                   # the spine brings the outer face center line to thick/2
    h_in = g['thick']/2*S
    xk = hw[:, None]*ex[None, :]*np.where(outer, 1., uc)[None, :]
    raise_ = np.where(outer, 1+spine*(1-ex**2), 1.)[None, :]
    yk = np.where(outer[None, :], h_out[:, None], h_in[:, None])*en[None, :]*raise_
    rings = ax[:, None, :]+xk[:, :, None]*B2[:, None, :]+yk[:, :, None]*N2[:, None, :]
    ext_len = un['rootCap']*S
    n_ext = 3
    ext = []
    for k in range(n_ext, 0, -1):
        off = -T[0]*ext_len*k/n_ext
        ext.append(rings[0]+off[None, :])
    allr = np.concatenate([np.array(ext).reshape(-1, M, 3), rings], axis=0)
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


# ---- the wing --------------------------------------------------------------------------------------------------------------------
def root_weight(wing, sl, root_pt, rb, rr):
    ox = (wing.lo[0]+sl[0].start+np.arange(sl[0].stop-sl[0].start))*wing.vs
    oy = (wing.lo[1]+sl[1].start+np.arange(sl[1].stop-sl[1].start))*wing.vs
    oz = (wing.lo[2]+sl[2].start+np.arange(sl[2].stop-sl[2].start))*wing.vs
    d2 = (ox-root_pt[0])[:, None, None]**2+(oy-root_pt[1])[None, :, None]**2+(oz-root_pt[2])[None, None, :]**2
    return (1-smoothstep((np.sqrt(d2)-rb)/rr)).astype(np.float32)


def strip_rear(F, wing, env, P, side):
    """Clear the old rear fan behind S(u, y) on this wing's half; returns (F, changed cell count)."""
    st = P['strip']
    vs = wing.vs
    X, Y, Z = wing.X, wing.Y, wing.Z
    sgx = 1. if side == 'L' else -1.
    xi = np.where(sgx*X > 0)[0]
    F0 = F.copy() if st['cutSmooth'] else None
    for chunk in np.array_split(xi, max(1, len(xi)//40)):
        x = X[chunk][:, None, None]
        y = Y[None, :, None]
        z = Z[None, None, :]
        u = np.abs(x)/S
        yf = (Z0-z)/S
        sl = F[chunk]
        plan = np.maximum(env.rear(u, yf, side)-st['depth'], env.MU(u))
        plate_y = (plan*S+DF0).astype(np.float32)
        w = smoothstep((u-env.crease(np.clip(yf, .05, .175))+st['creaseMargin'])/.008)
        margin = np.interp(u, [.10, .14], [-st['edge'], .012])
        w = w*smoothstep((env.bottom_y(u, side)+margin-yf)/.010)*smoothstep((yf+.04)/.02)
        crown = smoothstep((yf-st['crown']-.012)/.012)
        w = w*(crown+(1-crown)*smoothstep((u-.08)/.012))
        w = w.astype(np.float32)
        dy = np.gradient(plate_y[:, 0, :], vs, axis=0)
        dz = np.gradient(plate_y[:, 0, :], vs, axis=1)
        scale = (1/np.sqrt(1+dy**2+dz**2))[:, None, :].astype(np.float32)
        g = (y-plate_y)*scale
        cut = np.maximum(sl, g)
        F[chunk] = sl+w*(cut-sl)
    changed_n = 0
    if st['cutSmooth']:
        changed = (np.abs(F-F0) > 1e-5).astype(np.float32)
        del F0
        idx_ = np.argwhere(changed > 0)
        changed_n = int(len(idx_))
        if len(idx_):
            r_ = st['cutSmooth']
            a_ = np.maximum(idx_.min(axis=0)-r_*4, 0)
            b_ = np.minimum(idx_.max(axis=0)+r_*4+1, np.array(F.shape))
            sl_ = tuple(slice(int(i), int(j)) for i, j in zip(a_, b_))
            sub = F[sl_]
            weight = np.clip(fcf.fc.box(fcf.fc.box(changed[sl_], r_), r_)*4, 0, 1)
            blur = sub
            for _ in range(3):
                blur = fcf.fc.box(blur, r_)
            F[sl_] = sub+weight*(blur-sub)
    return F, changed_n


def blur_dome(F, wing, env, P, side):
    """The kept dome inside the crease as a blurred heightfield, so the seams of the old cuts drop under .002; the crest is held."""
    dm = P['dome']
    if dm['blur'] <= 0:
        return F
    X, Y, Z = wing.X, wing.Y, wing.Z
    vs = wing.vs
    sgx = 1. if side == 'L' else -1.
    inside_ = F < 0
    ny_ = inside_.shape[1]
    has_ = inside_.any(axis=1)
    yrear = Y[ny_-1-inside_[:, ::-1, :].argmax(axis=1)].astype(np.float64)
    del inside_
    blur_ = fcf.blur_masked(yrear, has_, dm['blur'], passes=2)
    u_ = np.abs(X)[:, None]/S
    zf_ = (Z0-Z[None, :])/S
    crease_ = env.crease(np.clip(zf_, .05, .175))
    half = (smoothstep(sgx*X/.01)[:, None])
    wd = (half*smoothstep((crease_-P['strip']['creaseMargin']-u_)/.012)*smoothstep((zf_-dm['yMin']+.02)/.02)
          * smoothstep((dm['yMax']-zf_)/.02)).astype(np.float32)
    target = np.where(np.isnan(blur_), yrear, blur_).astype(np.float32)
    gy = Y[None, :, None]-target[:, None, :]
    slope = np.hypot(np.gradient(target, vs, axis=0), np.gradient(target, vs, axis=1))
    gy = gy/np.sqrt(1+slope**2)[:, None, :]
    cut_ = np.maximum(F, gy.astype(np.float32))
    slab_ = np.maximum(gy.astype(np.float32), (yrear.astype(np.float32)-.03*S)[:, None, :]-Y[None, :, None])
    cut_ = np.minimum(cut_, slab_)
    del slab_
    F = np.where(((wd > 1e-3) & has_)[:, None, :], F+wd[:, None, :]*(cut_-F), F).astype(np.float32)
    return F


def build_wing_rear(F, lo, vs, side, table, env, P, voxelize, band, log=print):
    """Edit one wing crop. voxelize(verts, tris) -> (slices into the crop, dense distance array) or None.

    Returns (F_new, info). The crown tuft (side 'C') is built with the character's left wing (side 'L')."""
    wing = fcf.Wing(F, lo, vs, side)
    F = F.copy()
    nx, ny, nz = F.shape
    un, bk = P['union'], P['backing']
    info = {'side': side}
    skip = set(n.strip() for n in P['skip'].split(',') if n.strip())
    want = {side} | ({'C'} if side == 'L' else set())
    mine = [c for c in table if c['side'] in want and c['name'] not in skip and c['name'][1:] not in skip and not c.get('skip')]

    # plans of every solid (the backing stands behind their fronts)
    geoms = []
    for c in sorted(mine, key=lambda c: (layer_for(c, P['layers'])['layer'], c['name'])):
        cfg = layer_for(c, P['layers'])
        c2 = dict(c)
        c2['side'] = side if c['side'] == 'C' else c['side']
        geoms.append((c, cfg, lock_geometry_rear(c2, P, cfg, env)))

    # strip and dome blur
    F, changed = strip_rear(F, wing, env, P, side)
    info['stripChangedCells'] = changed
    F = blur_dome(F, wing, env, P, side)
    X, Y, Z = wing.X, wing.Y, wing.Z
    U = wing.U
    YF = wing.YF

    # backing slab
    xsel = (1. if side == 'L' else -1.)*X > 0
    wall = [g for c, cfg, g in geoms if not g['tuft'] and c['row'] != 'K']
    plan_front = fls.splat(wing, wall, 'front', np.minimum)
    plan_front = fcf.fill_nan(plan_front)
    rear_env = env.rear(U, YF, side)*np.ones((nx, nz))
    S_cut = np.maximum(rear_env-P['strip']['depth'], env.MU(U))
    Bk = np.where(np.isnan(plan_front), rear_env-bk['belowEnvelope'], plan_front+bk['inside'])
    Bk = np.minimum(Bk, rear_env-bk['belowEnvelope'])
    if bk['blur'] > 0:
        Bk = fcf.blur_masked(Bk, np.ones(Bk.shape, bool), max(1, int(round(bk['blur']*S/vs))), passes=2)
    tu, ty = env.top[side]
    bu, by_ = env.bottom[side]
    uu = np.broadcast_to(U, (nx, nz))
    yy = np.broadcast_to(YF, (nx, nz))
    d_top = env.chain_distance(uu, yy, tu, ty)
    d_bot = env.chain_distance(uu, yy, bu, by_)
    inside_t = (yy >= env.top_y(uu, side)) & (uu <= env.tip_u[side])
    inside_b = (yy <= env.bottom_y(uu, side)) & (uu <= env.tip_u[side])
    sd_t = np.where(inside_t, d_top, -d_top)
    sd_b = np.where(inside_b, d_bot, -d_bot)
    sd2 = np.maximum(bk['inset'][0]-sd_t, bk['inset'][1]-sd_b)
    sd2 = np.maximum(sd2, env.crease(np.clip(yy, .05, .175))-P['strip']['creaseMargin']-uu)
    if bk['crown'] > 0:
        sd2 = np.maximum(sd2, (bk['crown']-yy)-1.*smoothstep((uu-.085)/.015))
    sd2 = np.where(xsel[:, None], sd2, 1.)
    sd2h = (sd2*S).astype(np.float32)
    dfb = (Bk*S+DF0).astype(np.float32)
    dfa_fig = S_cut-bk['lap']
    if bk['feather'] > 0:
        tf = smoothstep(-sd2/bk['feather'])
        dfa_fig = np.where(Bk > dfa_fig, Bk-(Bk-dfa_fig)*tf, dfa_fig)
    dfa = (dfa_fig*S+DF0).astype(np.float32)
    sb = (1/np.sqrt(1+np.gradient(dfb, vs, axis=0)**2+np.gradient(dfb, vs, axis=1)**2)).astype(np.float32)
    Y3 = Y[None, :, None]
    kc = bk['blend']*S
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        g1 = (Y3-dfb[chunk][:, None, :])*sb[chunk][:, None, :]
        g2 = dfa[chunk][:, None, :]-Y3
        core = np.clip(np.maximum(np.maximum(sd2h[chunk][:, None, :], g1), g2), -band, band)
        F[chunk] = np.minimum(smin(F[chunk], core, kc), band).astype(np.float32)
    info['backing'] = {'meanBehindFronts': float(np.nanmean((Bk-plan_front)[xsel])) if xsel.any() else None}

    # locks
    built = []
    for c, cfg, g in geoms:
        verts, tris, vol = build_sweep_rear(g, P)
        r = voxelize(verts, tris)
        rec = {'name': c['name'], 'row': c['row'], 'layer': cfg['layer'], 'length': round(g['L'], 4),
               'tipHalfWidth': round(float(g['hw'][-1]), 4), 'thickMax': round(float(g['thick'].max()), 4),
               'standoff': g['standoff'], 'tipY': round(float(g['yf'][-1]), 4), 'tipDf': round(float(g['df'][-1]), 4),
               'tipOuterDf': round(float(g['rear'][-1]), 4), 'volume': round(vol, 6)}
        if r is None:
            rec['skipped'] = 'outside crop'
            built.append(rec)
            continue
        sl, d = r
        cur = F[sl]
        rec['joinedVoxels'] = int(((cur < 0) & (d < 0)).sum())
        wgt = root_weight(wing, sl, g['axis'][0], un['rootBand']*S, un['rootRamp']*S)
        k = np.maximum(g['rootBlend']*S*wgt, 1e-6)
        F[sl] = np.minimum(smin(cur, d, k), band).astype(np.float32)
        built.append(rec)
    info['locks'] = built

    # ceiling and fragments
    if P['ceiling'] is not None:
        F = np.minimum(smax(F, np.clip(wing.Z[None, None, :]-P['ceiling'], -band, band), un['ceilingBlend']*S), band).astype(np.float32)
    F, pruned = fls.prune_thin_fragments(F, band)
    info['prunedFragments'] = pruned[:30]

    # measures: rear face against the envelope, the dome row, the cavity window, the tuft clearance
    _, yr = fcf.surfaces(F, wing)
    ok = ~np.isnan(yr)
    rear_df = (yr-DF0)/S
    zone = (U >= .10) & (YF >= .02) & (YF <= .16) & ok & xsel[:, None]
    dev = (rear_df-rear_env)[zone]
    prof = {}
    for yy_ in (.04, .08, .12):
        row = {}
        for uu_ in (.10, .13, .16, .19, .22, .25):
            ci = int(round(((1. if side == 'L' else -1.)*uu_*S)/vs-wing.lo[0]))
            ck = int(round((Z0-S*yy_)/vs-wing.lo[2]))
            if 0 <= ci < nx and 0 <= ck < nz and ok[ci, ck]:
                row[str(uu_)] = [round(float(rear_df[ci, ck]), 4), round(float(rear_env[ci, ck]), 4)]
        prof[str(yy_)] = row
    info['rearVsEnvelope'] = {'meanDev': round(float(np.mean(dev)), 4) if dev.size else None,
                              'maxAbsDev': round(float(np.abs(dev).max()), 4) if dev.size else None,
                              'samples': prof}
    dome = {}
    for yy_ in (.06, .08, .10, .12):
        ck = int(round((Z0-S*yy_)/vs-wing.lo[2]))
        row = []
        for uu_ in np.arange(0., .16, .01):
            ci = int(round(((1. if side == 'L' else -1.)*uu_*S)/vs-wing.lo[0]))
            row.append(round(float(rear_df[ci, ck]), 4) if 0 <= ci < nx and 0 <= ck < nz and ok[ci, ck] else None)
        dome[str(yy_)] = row
    info['domeRows'] = dome
    # cavity window: lock samples at u > .19, y .045 to .12, x_side = df + .011 in .020 to .055 (df .009 to .044), E tips below y .12 excepted
    intr = []
    for c, cfg, g in geoms:
        if g['tuft']:
            continue
        m = (np.abs(g['xb']) > .19) & (g['yf'] >= .045) & (g['yf'] <= .12) & (g['front'] < .044)
        if m.any():
            intr.append({'name': c['name'], 'minFrontDf': round(float(g['front'][m].min()), 4), 'samples': int(m.sum())})
    info['cavityWindow'] = {'locksIntruding': intr}
    c_tips = [g['yf'][-1] for c, cfg, g in geoms if g['tuft']]
    info['crownTuftTipMinY'] = round(float(min(c_tips)), 4) if c_tips else None
    return F, info
