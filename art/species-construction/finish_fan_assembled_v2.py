"""Version 2 (round 28 code fix): the same post step with fan_lock_sweeps_assembled_v2.py, which adds a field-space closing of the coat
(`union.closeRadius`, default 0 = version 1). Blind readers judged version 1's locks as separate hard serrated slabs against the
baseline's rounded overlapping lock bodies: every lock was its own solid joined by a hard minimum, so slits and crevices ran down to the
backing between neighbors. The closing fills every crevice narrower than twice the radius and leaves tips and the outline alone.

Round 28 findings from running this tool (the code fix of the order; none of it is used by the kept candidate):
  1. Version 1 barely edited the fan. The default window.cupFade .16 makes the edit weight rise to 1 only .16 fit units from each cup hull,
     which is wider than the wing, so the fields were blended at partial strength everywhere (F0 + w (F - F0)). That left a smoothed fan
     with crumpled foil and thin-film zigzag edges (the "crinkled" look) and almost no lock relief, so readers saw the baseline plus damage.
  2. At full strength (window.cupFade .03, seamBlend .04) the locks appear as rounded bodies, but the cup rim cuts them off in round stubs
     seen from the side, the top locks clip against the ceiling into flat nubs, and a box-shaped step shows from above. Window.yMin (new, v2)
     leaves the top rows and crown untouched; the side stubs are the weight cut at the cup hull and need a different cup protection.
  3. union.closeRadius (new, v2, from fan_lock_sweeps_v4b) fills slits narrower than twice the radius; at .004 it also fills the whole
     groove between neighbors and turns the fan into a smooth plate, so use .0015 or less.
The kept candidate does not use this step: it keeps the baseline coat and rebuilds only the cup and pale tuft with the H36 lock sweeps
(coat clumps skipped, strip disabled), see the round 28 build.json.

Akinza ear fan coat locks cut into the assembled creature after the assembly's voxel remesh (R03 tool, loop v3.11, round 28).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps). It keeps the baseline fan (the H33 cup, its pale tuft, the
outline and the drape) and, only inside a coat window, strips the remeshed front coat to a backing and cuts in the layered coat locks of
fan_lock_sweeps_assembled.py (the v3 lock sweeps, cup and tuft builders off) through a fine level set zipped into the assembly's .0028
world skin. The assembly remeshes the whole fused skin at .0028 world (.0056 head-local), which resampled every undercut, tip standoff
and point the H36 lock sweeps made before it; nothing remeshes the skin after this step.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python finish_fan_assembled_v2.py -- --asm <assembly dir> --out <new assembly dir>
      --table specs/r03_clumps.json --envelope specs/r03_envelope.npz --spec specs/r03_fan_assembled.json [--voxel .0016]
      [--mode locks|passthrough] [--sides L,R] [--p section.spine=.3 ...]

Coordinates. Head-local = (world - offset)/scale with offset and scale from assembly.json headTransform (scale .5, offset (0, -.02, .635));
fit units = head-local/3.721 (x_fit = x_h/3.721 + .0046, y_fit = (.537 - z_h)/3.721, df = (y_h - .04)/3.721), as in fan_lock_sweeps_v3.py. The
assembled objects carry the identity transform; only the skin object is edited, and only through its own vertex arrays.

The coat window (per side, fit units; spec.window):
  u = |x_h|/3.721 at least uMin, y_fit at most yMax (every depth: front, rim and rear faces of the sheet are replaced together),
  and outside each cup polygon plus cupMargin. The cup polygon is MEASURED, not authored: the convex hull of the centroids of the skin
  polygons that carry the pale material (the baseline cup's pale tuft), unless window.cupPolygons gives one. Polygons of the coarse skin
  whose centroid is in the window are deleted and replaced by the polygons of one fine level set (voxel spec.voxel, head-local) whose
  centroid is in the window and at least window.patchMargin from the hole's boundary; a zipper of triangles bridges each coarse hole loop
  to its fine loop (an outer loop and a front and a rear loop around each cup). The edits (strip, backing, locks) are weighted by the
  smoothstep of the signed distance to the window's edge over window.seamBlend, so they are zero at the seam and the fine field equals
  the old skin there.
Everything outside the window is the assembly's own vertex for vertex.

Levers: every key of fan_lock_sweeps_assembled.DEFAULTS (strip, backing, layers, section, tips, union, clumps, skip, ceiling) plus
  voxel, coarseVoxel, coarseHalf, window {uMin, yMax, cupMargin, cupInflate, cupPolygons, seamBlend, patchMargin, cropPad}, mode,
  maxIsland. A recipe set or sweep edits them as spec:<dotted.path>.

Outputs in --out: akinza.blend, akinza.glb, assembly.json (skin counts), fan-assembled.json (per lock tip standoff and radius, envelope
missing and extra, crown-to-tip drop, cup window checks, skin components and non-manifold edges, seam checks, figure height), stage-start.json
and source-snapshot/.
Invariants: skin one closed component (I08), figure height unchanged (I09), no skin change outside the coat window and its patch margin.
"""
import argparse
import ast
import json
import math
import shutil
import sys
import time
from pathlib import Path

import bpy
import numpy as np
import openvdb as vdb
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fan_lock_sweeps_assembled_v2 as fls  # noqa: E402
import fan_clumps_fast_common as fc  # noqa: E402
from blender_blockout import sha  # noqa: E402
from study_provenance import snapshot  # noqa: E402

T_START = time.time()
S, CX, Z0, DF0 = fls.S, fls.CX, fls.Z0, fls.DF0


def tick(msg):
    print(f'[{time.time()-T_START:7.1f}s] {msg}', flush=True)


def merge_all(over):
    return fls.merge(fls.DEFAULTS, over)


parser = argparse.ArgumentParser()
parser.add_argument('--asm', type=Path, required=True, help='the input assembly directory (akinza.blend, assembly.json)')
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--table', type=Path, default=HERE/'specs/r03_clumps.json')
parser.add_argument('--envelope', type=Path, default=HERE/'specs/r03_envelope.npz')
parser.add_argument('--spec', type=Path, default=HERE/'specs/r03_fan_assembled.json')
parser.add_argument('--voxel', type=float, default=None, help='fine voxel (head-local); overrides the spec')
parser.add_argument('--mode', default=None, choices=['locks', 'passthrough'])
parser.add_argument('--sides', default='L,R')
parser.add_argument('--p', action='append', help='a lever as a dotted path and a python literal, e.g. section.spine=.3')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
args.asm = args.asm.resolve()
scene_path = args.asm/'akinza.blend'
P = merge_all(json.loads(args.spec.read_text()) if args.spec else {})
for item in args.p or []:
    key, val = item.split('=', 1)
    path = key.split('.')
    node = P
    for part in path[:-1]:
        node = node[part]
    if path[-1] not in node:
        raise SystemExit(f'unknown lever {key}')
    node[path[-1]] = ast.literal_eval(val)
if args.voxel:
    P['voxel'] = args.voxel
if args.mode:
    P['mode'] = args.mode
provenance = snapshot(args.out, __file__, [scene_path, args.table, args.envelope] + ([args.spec] if args.spec else []))
for name in ('fan_lock_sweeps_assembled_v2.py', 'fan_lock_sweeps_v3.py', 'fan_clumps_front_fast_v2.py', 'fan_clumps_fast_common.py'):
    if (HERE/name).exists():
        shutil.copyfile(HERE/name, args.out/'source-snapshot'/name)
VF, VC = float(P['voxel']), float(P['coarseVoxel'])
HALF_F = int(P['bandVoxels'])
BAND = HALF_F*VF
W = P['window']
record = {'voxel': VF, 'mode': P['mode'], 'seam': {}, 'checks': {}, 'wings': {}}

ASM = json.loads((args.asm/'assembly.json').read_text(encoding='utf-8'))
HSCALE = float(ASM['headTransform']['scale'])
HOFF = np.array(ASM['headTransform']['translation'], dtype=np.float64)
record['asmTransform'] = {'scale': HSCALE, 'translation': HOFF.tolist()}
SIDES = [s for s in args.sides.split(',') if s]
SG = {'L': 1., 'R': -1.}

# ---------------------------------------------------------------------------------------------------------------------------------
# 1. The skin of the assembled scene, in head-local coordinates.
bpy.ops.wm.open_mainfile(filepath=str(scene_path))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
assert np.allclose(np.array(head.matrix_world), np.eye(4)), 'the assembled skin must carry the identity transform'
me = head.data
nv = len(me.vertices)
Vw = np.empty(nv*3, np.float32)
me.vertices.foreach_get('co', Vw)
Vw = Vw.reshape(-1, 3)
V = (Vw.astype(np.float64)-HOFF)/HSCALE
npoly = len(me.polygons)
nl = len(me.loops)
ls = np.empty(npoly, np.int32)
me.polygons.foreach_get('loop_start', ls)
lt = np.diff(np.append(ls, nl)).astype(np.int32)
loop_v = np.empty(nl, np.int32)
me.loops.foreach_get('vertex_index', loop_v)
mat_idx = np.empty(npoly, np.int32)
me.polygons.foreach_get('material_index', mat_idx)
materials = list(me.materials)
before_stats = fc.fast_mesh_stats(me)
tick(f'scene skin {nv} vertices, {npoly} polygons, stats {before_stats}')
cs = np.add.reduceat(V[loop_v], ls, axis=0)/lt[:, None]          # polygon centroids (head-local)
height_before = float(Vw[:, 2].max())

# ---------------------------------------------------------------------------------------------------------------------------------
# 2. The window: cup polygons measured from the pale polygons, signed distance to the window edge (fit units).
def hull(pts):
    pts = sorted(set(map(tuple, np.round(pts, 6).tolist())))
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1]+upper[:-1]               # counter-clockwise (x right, y up in the plane it is given in)


def polygon_sdf(px, py, poly):
    """Signed distance (negative inside) of points to a polygon (list of (x, y))."""
    poly = np.asarray(poly, np.float64)
    n = len(poly)
    d = np.full(px.shape, np.inf)
    inside = np.zeros(px.shape, bool)
    for i in range(n):
        a, b = poly[i], poly[(i+1) % n]
        ex, ey = b-a
        wx, wy = px-a[0], py-a[1]
        t = np.clip((wx*ex+wy*ey)/max(ex*ex+ey*ey, 1e-18), 0, 1)
        d = np.minimum(d, np.hypot(wx-ex*t, wy-ey*t))
        cond = ((a[1] > py) != (b[1] > py)) & (px < (b[0]-a[0])*(py-a[1])/(b[1]-a[1]+1e-30)+a[0])
        inside ^= cond
    return np.where(inside, -d, d)


pale_c = cs[mat_idx == 1]
cups = {}
for side in SIDES:
    given = (W['cupPolygons'] or {}).get(side)
    if given:
        cups[side] = [tuple(p) for p in given]
    else:
        sel = pale_c[np.sign(pale_c[:, 0]) == SG[side]]
        assert len(sel) > 50, f'no pale polygons on side {side}: the cup cannot be measured'
        pts = np.stack([sel[:, 0]/S+CX, (Z0-sel[:, 2])/S], axis=1)
        cups[side] = hull(pts)
    record['wings'].setdefault(side, {})['cupPolygon'] = [[round(a, 4), round(b, 4)] for a, b in cups[side]]
    xs_ = [p[0] for p in cups[side]]
    ys_ = [p[1] for p in cups[side]]
    record['wings'][side]['cupBBoxFit'] = [round(min(xs_), 4), round(max(xs_), 4), round(min(ys_), 4), round(max(ys_), 4)]
tick(f"cup polygons measured: {{ {', '.join(f'{k}: {len(v)} points' for k, v in cups.items())} }}")


# The window must leave a sliver of skin between its inner edge and the cup exclusion, or the cup pinches the window into a C and the
# hole loops merge (measured in the first control: uMin .09 left .0002). uMin is lowered where the cup hull comes closer than that.
UMIN = {}
for side in SIDES:
    u_inner = min(abs(p[0]-CX) for p in cups[side])
    UMIN[side] = float(W['uMin']) if not W['sliver'] else min(float(W['uMin']), u_inner-W['cupMargin']-W['cupInflate']-float(W['sliver']))
    record['wings'][side]['uMinEffective'] = round(UMIN[side], 4)
    record['wings'][side]['cupInnerU'] = round(u_inner, 4)


def phi_window(xh, zh, side):
    """Signed distance (fit units, positive inside the window) to the window edge, per point of the (x, z) plane."""
    sg = SG[side]
    u = np.abs(xh)/S
    yf = (Z0-zh)/S
    phi = np.minimum(np.minimum(u-UMIN[side], W['yMax']-yf), yf-float(W['yMin']))
    phi = np.where(np.sign(xh) == sg, phi, -1.)
    sdf = polygon_sdf(xh/S+CX, yf, cups[side])
    return np.minimum(phi, sdf-(W['cupMargin']+W['cupInflate']))


def edit_weight(xh, zh, side):
    """Edit weight per (x, z) column: 0 at the window's plane edges and inside the cup hull plus cupMargin, rising to 1 over
    seamBlend from the plane edges and over cupFade (default seamBlend) from the cup hull, so the coat never stops at a wall."""
    yf = (Z0-zh)/S
    sdf = polygon_sdf(xh/S+CX, yf, cups[side])
    fade_c = max(float(W.get('cupFade') or W['seamBlend']), 1e-6)
    t = np.minimum(phi_plane(xh, zh, side)/max(W['seamBlend'], 1e-6), (sdf-(W['cupMargin']+W['cupInflate']))/fade_c)
    return fls.smoothstep(t).astype(np.float32), t


def phi_plane(xh, zh, side):
    """Signed distance (fit units) to the window's plane edges only (inner edge and bottom row), no cup exclusion."""
    u = np.abs(xh)/S
    yf = (Z0-zh)/S
    return np.where(np.sign(xh) == SG[side], np.minimum(np.minimum(u-UMIN[side], W['yMax']-yf), yf-float(W['yMin'])), -1.)


in_win = np.zeros(npoly, bool)
for side in SIDES:
    in_win |= phi_plane(cs[:, 0], cs[:, 2], side) > 0
tick(f'window polygons: {int(in_win.sum())}')
record['seam']['windowPolygons'] = int(in_win.sum())

# ---------------------------------------------------------------------------------------------------------------------------------
# 3. Coarse level set of the whole skin (closed), cropped per wing and upsampled to the fine grid.
tri_parts = []
for k in (3, 4):
    sel = np.nonzero(lt == k)[0]
    if len(sel):
        q = loop_v[ls[sel][:, None]+np.arange(k)[None, :]]
        tri_parts.append(q[:, :3])
        if k == 4:
            tri_parts.append(q[:, [0, 2, 3]])
all_tris = np.concatenate(tri_parts).astype(np.int32)
del tri_parts
HALF_C = int(P['coarseHalf'])
cgrid = vdb.FloatGrid.createLevelSetFromPolygons(V.astype(np.float32), triangles=all_tris,
                                                 transform=vdb.createLinearTransform(voxelSize=VC), halfWidth=HALF_C)
del all_tris
tick('coarse level set')


def coarse_crop(box):
    a, b = box
    lo_c = np.floor(np.array(a)/VC).astype(int)-2
    hi_c = np.ceil(np.array(b)/VC).astype(int)+2
    arr = np.full(tuple(int(v) for v in hi_c-lo_c+1), HALF_C*VC, np.float32)
    cgrid.copyToArray(arr, ijk=tuple(int(v) for v in lo_c))
    return arr, lo_c


def sample_coarse(C, lo_c, xs, ys, zs):
    """Trilinear sample of the coarse field on the grid xs x ys x zs (1-D head-local coordinates), float32 (nx, ny, nz)."""
    def weights(v, axis):
        f = np.clip(v/VC-lo_c[axis], 0, C.shape[axis]-1.001)
        i0 = np.floor(f).astype(int)
        return i0, (f-i0).astype(np.float32)
    ix, tx = weights(xs, 0)
    iy, ty = weights(ys, 1)
    iz, tz = weights(zs, 2)
    x0, y0, z0 = ix.min(), iy.min(), iz.min()
    sub = C[x0:ix.max()+2, y0:iy.max()+2, z0:iz.max()+2]
    a = sub[ix-x0]*(1-tx)[:, None, None]+sub[ix-x0+1]*tx[:, None, None]
    a = a[:, iy-y0, :]*(1-ty)[None, :, None]+a[:, iy-y0+1, :]*ty[None, :, None]
    a = a[:, :, iz-z0]*(1-tz)[None, None, :]+a[:, :, iz-z0+1]*tz[None, None, :]
    return np.ascontiguousarray(a, dtype=np.float32)


table = json.loads(args.table.read_text())['clumps']
table = fls.apply_clump_edits(table, P['clumps'])+[dict(c) for c in P.get('addClumps', [])]
env = dict(np.load(args.envelope))
P['ceiling'] = float(V[:, 2].max())+.0004

fine_verts, fine_quads, fine_tris, fine_sdf_probe = [], [], [], []
infos = {}
n_off = 0
for side in SIDES:
    sg = SG[side]
    # crop box: x from .22 to the wing end, z from below the window to above the crown, y over the skin found there
    xa, xb = (.22, 1.12) if sg > 0 else (-1.12, -.22)
    za, zb = -.32, .62
    inb = (np.abs(V[:, 0]) > .20) & (np.abs(V[:, 0]) < 1.14) & (np.sign(V[:, 0]) == sg) & (V[:, 2] > za-.05) & (V[:, 2] < zb+.05)
    ya, yb = float(V[inb, 1].min())-W['cropPad'], float(V[inb, 1].max())+W['cropPad']
    box = ([xa, ya, za], [xb, yb, zb])
    lo = np.floor(np.array(box[0])/VF).astype(int)
    hi = np.ceil(np.array(box[1])/VF).astype(int)
    shape = tuple(int(v) for v in hi-lo+1)
    tick(f'wing {side} crop {shape} = {np.prod(shape)/1e6:.0f}M voxels, y {ya:.3f} to {yb:.3f}')
    C, lo_c = coarse_crop(box)
    xs = (lo[0]+np.arange(shape[0]))*VF
    ys = (lo[1]+np.arange(shape[1]))*VF
    zs = (lo[2]+np.arange(shape[2]))*VF
    F = np.clip(sample_coarse(C, lo_c, xs, ys, zs), -BAND, BAND)
    del C
    wing_info = {'crop': list(shape)}
    if P['mode'] == 'locks':
        # window weight per (x, z) column
        X2, Z2 = np.meshgrid(xs, zs, indexing='ij')
        weight, tt = edit_weight(X2, Z2, side)
        weight[tt <= 0] = 0.
        del X2, Z2, tt
        transform = vdb.createLinearTransform(voxelSize=VF)

        def voxelize(verts, tri, lo=lo, shape=shape, transform=transform):
            g = vdb.FloatGrid.createLevelSetFromPolygons(verts.astype(np.float32), triangles=tri.astype(np.int32), transform=transform,
                                                         halfWidth=HALF_F)
            bb = g.evalActiveVoxelBoundingBox()
            if not bb:
                return None
            mn, mx = np.array(bb[0]), np.array(bb[1])
            a_ = np.maximum(mn-lo, 0)
            z_ = np.minimum(mx-lo+1, np.array(shape))
            if np.any(z_ <= a_):
                return None
            sub = np.empty(tuple(int(v) for v in z_-a_), dtype=np.float32)
            g.copyToArray(sub, ijk=tuple(int(v) for v in a_+lo))
            return tuple(slice(int(i), int(j)) for i, j in zip(a_, z_)), sub

        Pw = json.loads(json.dumps(P))
        Pw['cup']['polygons'] = {side: [list(p) for p in cups[side]]}
        F, _, info = fls.build_wing(F, lo, VF, side, table, env, Pw, voxelize, BAND, log=tick, weight=weight)
        info.pop('_sections', None)
        info.pop('_origin', None)
        info.pop('columns', None)
        info.pop('frontProfile', None)
        wing_info.update(info)
        del weight
    record['wings'].setdefault(side, {}).update(wing_info)
    infos[side] = (lo, F)
    tick(f'wing {side} field done')
    if len(SIDES) > 1:
        pass
del cgrid


# ---------------------------------------------------------------------------------------------------------------------------------
# 4. Fine meshes, window patch selection, hole loops and the zipper.
def boundary_edges(polys):
    ea, eb = [], []
    for pa in polys:
        if len(pa) == 0:
            continue
        ea.append(pa.reshape(-1))
        eb.append(np.roll(pa, -1, axis=1).reshape(-1))
    if not ea:
        return np.zeros((0, 2), np.int64)
    a, b = np.concatenate(ea), np.concatenate(eb)
    big = int(max(a.max(), b.max()))+1
    fwd = a*big+b
    rev = b*big+a
    present = np.isin(fwd, rev)
    return np.stack([a[~present], b[~present]], axis=1)


def loops_from_edges(edges):
    nxt = {}
    pinch = set()
    for a, b in edges.tolist():
        if a in nxt:
            pinch.add(a)
        nxt[a] = b
    loops, seen = [], set()
    for start in list(nxt):
        if start in seen:
            continue
        loop, cur = [], start
        while cur not in seen and cur in nxt:
            seen.add(cur)
            loop.append(cur)
            cur = nxt[cur]
        loops.append(loop)
    return loops, pinch


def zipper(outer, inner, cv, fv):
    """Triangles bridging two closed loops that run the same way round (see finish_face_assembled.py): dynamic programming over monotone
    pairings minimizes the total rung length. Returns triples of ('c'|'f', id)."""
    po, pi = cv[outer], fv[inner]
    nO, nI = len(outer), len(inner)
    j0 = int(np.argmin(np.linalg.norm(pi-po[0], axis=1)))
    inner = np.roll(inner, -j0)
    pi = np.roll(pi, -j0, axis=0)
    idx = np.arange(nI)
    cost = np.empty(nI)
    came = np.zeros((nO, nI), np.int32)
    rung = np.linalg.norm(pi-po[0], axis=1)
    cost[:] = np.cumsum(rung)
    for i in range(1, nO):
        rung = np.linalg.norm(pi-po[i], axis=1)
        Sm = np.cumsum(rung)
        val = cost-(Sm-rung)
        rm = np.minimum.accumulate(val)
        k = np.maximum.accumulate(np.where(val <= rm, idx, 0))
        came[i] = k
        cost = rm+Sm
    moves = []
    i, j = nO-1, nI-1
    while i > 0:
        k = int(came[i, j])
        for t in range(j, k, -1):
            moves.append(('i', i, t))
        moves.append(('o', i, k))
        j = k
        i -= 1
    for t in range(j, 0, -1):
        moves.append(('i', 0, t))
    moves.reverse()
    tris = []
    for kind, i, t in moves:
        if kind == 'o':
            tris.append((('c', outer[i-1]), ('c', outer[i]), ('f', inner[t])))
        else:
            tris.append((('f', inner[t]), ('f', inner[t-1]), ('c', outer[i])))
    tris.append((('c', outer[nO-1]), ('c', outer[0]), ('f', inner[nI-1])))
    tris.append((('f', inner[0]), ('f', inner[nI-1]), ('c', outer[0])))
    return tris


def repair_pinches(polys_list, nvert, label):
    """Drop polygons around a vertex that has two outgoing boundary edges, until the hole boundary is a set of simple loops."""
    for attempt in range(30):
        edges = boundary_edges(polys_list)
        out_count = np.bincount(edges[:, 0], minlength=nvert) if len(edges) else np.zeros(nvert, int)
        pinched = np.nonzero(out_count > 1)[0]
        if len(pinched) == 0:
            return polys_list, edges
        polys_list = [p[~np.isin(p, pinched).any(axis=1)] if len(p) else p for p in polys_list]
    raise RuntimeError(f'{label} hole boundary stays pinched')


# coarse polygons kept, as arrays per polygon length, with their polygon ids
keep_idx = np.nonzero(~in_win)[0]
for attempt in range(12):
    polys_by_len = {}
    for k in (3, 4):
        sel = keep_idx[lt[keep_idx] == k]
        if len(sel):
            polys_by_len[k] = (sel, loop_v[ls[sel][:, None]+np.arange(k)[None, :]])
    edges = boundary_edges([v[1] for v in polys_by_len.values()])
    out_count = np.bincount(edges[:, 0], minlength=nv) if len(edges) else np.zeros(nv, int)
    pinched = np.nonzero(out_count > 1)[0]
    if len(pinched) == 0:
        break
    owner = np.repeat(np.arange(npoly), lt)
    bad = np.unique(owner[np.isin(loop_v, pinched)])
    keep_idx = np.setdiff1d(keep_idx, bad)
else:
    raise RuntimeError('coarse hole boundary stays pinched')
coarse_loops, _ = loops_from_edges(edges)
coarse_loops = [l for l in coarse_loops if len(l) >= 3]
tick(f'coarse hole boundary: {len(coarse_loops)} loops, sizes {[len(l) for l in coarse_loops]}')
loop_pts_all = []
for l in coarse_loops:
    p = V[np.array(l)]
    loop_pts_all.append(np.concatenate([p, .5*(p+np.roll(p, -1, axis=0))]))
loop_pts = np.concatenate(loop_pts_all)

from mathutils import kdtree  # noqa: E402
kd = kdtree.KDTree(len(loop_pts))
for i_, p_ in enumerate(loop_pts.tolist()):
    kd.insert(Vector(p_), i_)
kd.balance()
fine_world_parts, fq_parts, ft_parts = [], [], []
voff = 0
for side in SIDES:
    lo, F = infos[side]
    G = vdb.FloatGrid()
    G.background = BAND
    G.copyFromArray(np.ascontiguousarray(F, dtype=np.float32), ijk=(int(lo[0]), int(lo[1]), int(lo[2])))
    G.prune()
    verts, tri_o, quad_o = G.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    del G
    fw = verts.astype(np.float64)*VF
    q = np.asarray(quad_o, np.int64).reshape(-1, 4)
    t = np.asarray(tri_o, np.int64).reshape(-1, 3)
    # orientation: outward means the field increases along the normal
    def outward_fraction(polys):
        if len(polys) == 0:
            return None
        pick = np.random.default_rng(5).choice(len(polys), size=min(3000, len(polys)), replace=False)
        pp = fw[polys[pick]]
        n = np.cross(pp[:, 1]-pp[:, 0], pp[:, 2]-pp[:, 0])
        n /= np.maximum(np.linalg.norm(n, axis=1), 1e-30)[:, None]
        c = pp.mean(axis=1)
        def f_at(p):
            f = p/VF-lo
            i = np.clip(np.round(f).astype(int), 0, np.array(F.shape)-1)
            return F[i[:, 0], i[:, 1], i[:, 2]]
        return float((f_at(c+n*1.5*VF) > f_at(c-n*1.5*VF)).mean())
    frac = outward_fraction(q if len(q) else t)
    flipped = frac is not None and frac < .5
    if flipped:
        q, t = q[:, ::-1].copy(), t[:, ::-1].copy()
    record['wings'][side]['fineOutwardFraction'] = frac
    record['wings'][side]['fineFlipped'] = bool(flipped)
    # keep the polygons in the window and away from the coarse hole boundary
    def keep_fn(polys):
        if len(polys) == 0:
            return np.zeros(0, bool)
        c = fw[polys].mean(axis=1)
        phi_c = phi_plane(c[:, 0], c[:, 2], side)
        keep = phi_c > 0
        near = np.nonzero(keep & (phi_c < (W['patchMargin']+.012)/S))[0]
        for i_ in near.tolist():
            if kd.find_range(Vector(c[i_].tolist()), W['patchMargin'])[:1]:
                keep[i_] = False
        return keep
    q, t = q[keep_fn(q)], t[keep_fn(t)]
    fine_world_parts.append(fw)
    fq_parts.append(q+voff)
    ft_parts.append(t+voff)
    voff += len(fw)
    infos[side] = None
    del F
fine_world = np.concatenate(fine_world_parts)
fq = np.concatenate(fq_parts) if fq_parts else np.zeros((0, 4), np.int64)
ft = np.concatenate(ft_parts) if ft_parts else np.zeros((0, 3), np.int64)
tick(f'fine patch {len(fq)} quads, {len(ft)} tris from {len(fine_world)} vertices')

(fq, ft), fedges = repair_pinches([fq, ft], len(fine_world), 'fine patch')
fine_loops, _ = loops_from_edges(fedges)
fine_loops = [l for l in fine_loops if len(l) >= 3]
fine_loops.sort(key=len, reverse=True)
big_fine = fine_loops
fill_tris, extra_v = [], []


def describe(vs, loops):
    out = []
    for l in loops:
        p = vs[np.array(l)]
        out.append({'n': len(l), 'xFit': [round(float(p[:, 0].min()/S+CX), 3), round(float(p[:, 0].max()/S+CX), 3)],
                    'yFit': [round(float((Z0-p[:, 2].max())/S), 3), round(float((Z0-p[:, 2].min())/S), 3)],
                    'depth': [round(float(p[:, 1].min()), 3), round(float(p[:, 1].max()), 3)]})
    return out


record['seam']['coarseLoops'] = describe(V, coarse_loops)
record['seam']['fineLoops'] = describe(fine_world, big_fine)
tick(f'loops: coarse {[len(l) for l in coarse_loops]} fine {[len(l) for l in big_fine]}')

# compact the fine vertices
used_f = np.zeros(len(fine_world), bool)
used_f[fq.reshape(-1)] = True
used_f[ft.reshape(-1)] = True
remap_f = np.cumsum(used_f)-1
fine_world = fine_world[used_f]
fq, ft = remap_f[fq], remap_f[ft]
big_fine = [remap_f[np.array(l)] for l in big_fine]
coarse_loops = [np.array(l) for l in coarse_loops]

# pair loops by nearest centroid; a loop left without a partner must be a pinch-repair speck (24 edges or fewer), filled with a fan
pairs, taken = [], set()
cands = []
for i, cl in enumerate(coarse_loops):
    cc = V[cl].mean(axis=0)
    for j, fl_ in enumerate(big_fine):
        cands.append((float(np.linalg.norm(cc-fine_world[fl_].mean(axis=0))), i, j))
for d_, i, j in sorted(cands):
    if i in {p[0] for p in pairs} or j in taken:
        continue
    pairs.append((i, j))
    taken.add(j)
left_c = [i for i in range(len(coarse_loops)) if i not in {p[0] for p in pairs}]
left_f = [j for j in range(len(big_fine)) if j not in taken]
if any(len(coarse_loops[i]) > 24 for i in left_c) or any(len(big_fine[j]) > 24 for j in left_f):
    np.savez(args.out/'loops-debug.npz', **{f'c{i}': V[np.array(l)] for i, l in enumerate(coarse_loops)},
             **{f'f{i}': fine_world[np.array(l)] for i, l in enumerate(big_fine)})
    raise RuntimeError('seam: loops without a partner: coarse %s fine %s' % (
        [(i, len(coarse_loops[i])) for i in left_c], [(j, len(big_fine[j])) for j in left_f])
        + chr(10)+json.dumps(record['seam']['coarseLoops'])+chr(10)+json.dumps(record['seam']['fineLoops']))
record['seam']['fannedLoops'] = {'coarse': [len(coarse_loops[i]) for i in left_c], 'fine': [len(big_fine[j]) for j in left_f]}
record['seam']['pairs'] = [{'coarseLoop': len(coarse_loops[i]), 'fineLoop': len(big_fine[j]),
                            'centroidGap': round(float(np.linalg.norm(V[coarse_loops[i]].mean(axis=0)-fine_world[big_fine[j]].mean(axis=0))), 4)}
                           for i, j in pairs]

# final vertex numbering: used coarse vertices first, then the fine ones
lens = lt[keep_idx]
starts = ls[keep_idx]
cum = np.cumsum(lens)
loop_idx = np.arange(cum[-1])-np.repeat(cum-lens, lens)+np.repeat(starts, lens)
coarse_loops_v = loop_v[loop_idx]
used_c = np.zeros(nv, bool)
used_c[coarse_loops_v] = True
remap_c = np.cumsum(used_c)-1
n_c = int(used_c.sum())
V_out = np.concatenate([V[used_c], fine_world], axis=0)


def directed_edges(polys):
    a = polys.reshape(-1)
    b = np.roll(polys, -1, axis=1).reshape(-1)
    return set(zip(a.tolist(), b.tolist()))


bands = []
for i, j in pairs:
    best = None
    for variant in range(2):
        outer = coarse_loops[i][::-1] if variant == 0 else coarse_loops[i]
        inner = big_fine[j] if variant == 0 else big_fine[j][::-1]
        ring = zipper(outer, inner, V, fine_world)
        band = np.array([[remap_c[x] if kind == 'c' else n_c+x for kind, x in tri] for tri in ring], dtype=np.int64)
        be = directed_edges(band)
        # a correct bridge contains the reverse of every boundary edge of the coarse loop and of the fine loop
        ce = [(remap_c[a_], remap_c[b_]) for a_, b_ in zip(coarse_loops[i].tolist(), np.roll(coarse_loops[i], -1).tolist())]
        fe = [(n_c+a_, n_c+b_) for a_, b_ in zip(big_fine[j].tolist(), np.roll(big_fine[j], -1).tolist())]
        score = sum((b_, a_) in be for a_, b_ in ce+fe)
        if best is None or score > best[0]:
            best = (score, variant, band)
    record['seam'].setdefault('bridges', []).append({'variant': best[1], 'matched': best[0], 'of': len(coarse_loops[i])+len(big_fine[j]),
                                                    'triangles': len(best[2])})
    bands.append(best[2])
extra_pts = []
for i in left_c:
    lp_ = coarse_loops[i].tolist()
    cid = n_c+len(fine_world)+len(extra_pts)
    extra_pts.append(V[lp_].mean(axis=0))
    bands.append(np.array([(remap_c[b_], remap_c[a_], cid) for a_, b_ in zip(lp_, lp_[1:]+lp_[:1])], dtype=np.int64))
for j in left_f:
    lp_ = big_fine[j].tolist()
    cid = n_c+len(fine_world)+len(extra_pts)
    extra_pts.append(fine_world[lp_].mean(axis=0))
    bands.append(np.array([(n_c+b_, n_c+a_, cid) for a_, b_ in zip(lp_, lp_[1:]+lp_[:1])], dtype=np.int64))
if extra_pts:
    V_out = np.concatenate([V_out, np.array(extra_pts)], axis=0)
    V_world_extra = np.array(extra_pts)*HSCALE+HOFF
else:
    V_world_extra = np.zeros((0, 3))
band_all = np.concatenate(bands) if bands else np.zeros((0, 3), np.int64)

# pale material: a fine polygon inside a cup column (or its margin) and within a coarse polygon of the pale tuft keeps the pale material
pale_kd = kdtree.KDTree(len(pale_c))
for i_, p_ in enumerate(pale_c.tolist()):
    pale_kd.insert(Vector(p_), i_)
pale_kd.balance()


def fine_materials(polys):
    out = np.zeros(len(polys), np.int32)
    if len(polys) == 0:
        return out
    c = fine_world[polys].mean(axis=1)
    for side in SIDES:
        sg = SG[side]
        sdf = polygon_sdf(c[:, 0]/S+CX, (Z0-c[:, 2])/S, cups[side])
        cand = np.nonzero((np.sign(c[:, 0]) == sg) & (sdf < .004))[0]
        for i_ in cand.tolist():
            if pale_kd.find(Vector(c[i_].tolist()))[2] <= float(W['paleTol']):
                out[i_] = 1
    return out


loops_l, offs_l, mats_l = [remap_c[coarse_loops_v]], [np.cumsum(np.r_[0, lens])[:-1]], [mat_idx[keep_idx]]
count = int(lens.sum())
for polys in (fq, ft):
    if len(polys):
        k = polys.shape[1]
        loops_l.append((polys+n_c).reshape(-1))
        offs_l.append(count+np.arange(len(polys))*k)
        mats_l.append(fine_materials(polys))
        count += polys.size
if len(band_all):
    loops_l.append(band_all.reshape(-1))
    offs_l.append(count+np.arange(len(band_all))*3)
    mats_l.append(np.zeros(len(band_all), np.int32))
loops_all, offs_all, mats_all = np.concatenate(loops_l), np.concatenate(offs_l), np.concatenate(mats_l)
ends = np.r_[offs_all[1:], len(loops_all)]
nxt = np.roll(loops_all, -1)
nxt[ends-1] = loops_all[offs_all]
fwd = loops_all.astype(np.int64)*len(V_out)+nxt
rev = nxt.astype(np.int64)*len(V_out)+loops_all
uf, cf = np.unique(fwd, return_counts=True)
dup, unpaired = int((cf > 1).sum()), int((~np.isin(rev, uf)).sum())
record['seam']['duplicateDirectedEdges'] = dup
record['seam']['unpairedEdges'] = unpaired
tick(f'zipper: {record["seam"]}')
if dup or unpaired:
    raise RuntimeError(f'seam bridge is not manifold: {record["seam"]}')

# distance of the fine loops to the old skin
old_tree = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())
fl_pts = np.concatenate([fine_world[l] for l in big_fine])*HSCALE+HOFF
d_f = np.array([old_tree.find_nearest(Vector(v.tolist()))[3] for v in fl_pts[::max(1, len(fl_pts)//3000)]])
record['seam']['fineLoopToOldSkin'] = {'mean': float(d_f.mean()), 'max': float(d_f.max()), 'unit': 'world'}

# ---------------------------------------------------------------------------------------------------------------------------------
# 5. Write the mesh (world coordinates: kept vertices exactly as they were).
V_world = np.concatenate([Vw[used_c].astype(np.float64), fine_world*HSCALE+HOFF, V_world_extra], axis=0)
new_mesh = bpy.data.meshes.new('Skin with fan coat locks')
new_mesh.vertices.add(len(V_world))
new_mesh.vertices.foreach_set('co', V_world.astype(np.float32).reshape(-1))
new_mesh.loops.add(len(loops_all))
new_mesh.loops.foreach_set('vertex_index', loops_all.astype(np.int32))
new_mesh.polygons.add(len(offs_all))
new_mesh.polygons.foreach_set('loop_start', offs_all.astype(np.int32))
new_mesh.polygons.foreach_set('material_index', mats_all.astype(np.int32))
new_mesh.polygons.foreach_set('use_smooth', np.ones(len(offs_all), bool))
new_mesh.update(calc_edges=True)
for m_ in materials:
    new_mesh.materials.append(m_)
old_mesh = head.data
head.data = new_mesh
bpy.data.meshes.remove(old_mesh)
groups_ = fc.small_components(head.data, int(P['maxIsland']))
if groups_:
    co_all = fc.mesh_arrays(head.data)[0]
    record['islandsRemoved'] = [{'vertices': int(len(g_)), 'bounds': [co_all[g_].min(axis=0).tolist(), co_all[g_].max(axis=0).tolist()]}
                                for g_ in groups_]
    fc._delete_vertices(head, groups_)
    tick(f"removed islands {record['islandsRemoved']}")
after_stats = fc.fast_mesh_stats(head.data)
tick(f'skin after the fan finish {after_stats} (before {before_stats})')
record['skin'] = {'before': before_stats, 'after': after_stats}
if after_stats['components'] != 1 or after_stats['nonManifoldEdges'] != 0:
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'geometry-failure.blend'))
    raise RuntimeError(f'skin after the fan finish is not one closed solid: {after_stats}')

# ---------------------------------------------------------------------------------------------------------------------------------
# 6. Checks: deviation of the new skin from the old one by window position, figure height, crown to tip drop.
cp = np.empty(len(head.data.vertices)*3, np.float32)
head.data.vertices.foreach_get('co', cp)
cp = cp.reshape(-1, 3)
cl = (cp.astype(np.float64)-HOFF)/HSCALE
rng = np.random.default_rng(1)
sample = rng.choice(len(cl), size=min(30000, len(cl)), replace=False)
winphi = np.full(len(cl), -1.)
for side in SIDES:
    winphi = np.maximum(winphi, phi_window(cl[:, 0], cl[:, 2], side))
dist = np.array([old_tree.find_nearest(Vector(cp[i].tolist()))[3] for i in sample])
inside = winphi[sample] > 0
record['checks']['skinDeviationWorld'] = {
    'insideWindow': {'n': int(inside.sum()), 'p50': float(np.percentile(dist[inside], 50)) if inside.any() else None,
                     'p99': float(np.percentile(dist[inside], 99)) if inside.any() else None,
                     'max': float(dist[inside].max()) if inside.any() else None},
    'outsideWindow': {'n': int((~inside).sum()), 'p99': float(np.percentile(dist[~inside], 99)), 'max': float(dist[~inside].max())}}
record['checks']['figureHeightWorld'] = {'before': height_before, 'after': float(cp[:, 2].max())}
drop = {}
for side in SIDES:
    m = (np.sign(cl[:, 0]) == SG[side]) & (np.abs(cl[:, 0]) > .25) & (cl[:, 2] > -.3) & (cl[:, 2] < .6) & (np.abs(cl[:, 0]) < 1.2)
    crown = float(cl[m & (np.abs(cl[:, 0]) < .6), 2].max())
    tip = cl[m][np.argmax(np.abs(cl[m][:, 0]))]
    drop[side] = {'crownZ': crown, 'outerTip': [round(float(v), 4) for v in tip],
                  'drop': round((crown-float(tip[2]))/S, 4), 'unit': 'figure heights'}
record['checks']['crownToTipDrop'] = drop
record['checks']['topZHeadLocal'] = float(cl[:, 2].max())

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][head.name] = {'components': after_stats['components'], 'nonManifoldEdges': after_stats['nonManifoldEdges'],
                                    'vertices': after_stats['vertices']}
asm_record['outputs'] = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record.update({'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(scene_path), 'spec': P,
               'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fan-assembled.json').write_text(json.dumps(record, indent=1, default=float)+'\n')
tick('done')
