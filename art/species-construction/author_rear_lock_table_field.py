"""Build the ear fan's rear, top and crown coat from the R04 lock table, in field space.

Run with Blender (through loop_tools.py blender):
  blender -b --factory-startup --python author_rear_lock_table_field.py --
    --scene <head.blend> --out <new-dir> [options]

Implements specs/R04.md (ear fan rear and profile) as one authored lock system:

  1. The head skin becomes an OpenVDB level set.
  2. Plate cut (--plate): the wing's rear face is cut back to the spec's rear depth plan minus the room for two lock layers
     (a heightfield cut, faded in from the ear-root crease), so the locks make the visible surface.
  3. Section dome cut (--dome-cut): above-the-dome material in each vertical section of the wing (the front lip and any rim)
     is removed, so the top is one dome whose crest sits at df .020 to .028.
  4. Locks: every row of the table (T top-edge row, B1 edge row, B2 middle row, B3 root row of each wing, D dome coat, C crown
     tuft) is a tapered half-lens swept along a cubic axis (root and tip tangents from the table), a flat inner face
     buried in the surface under it, an outer face that bulges half the thickness. Roots are buried, tips lift off the
     surface under them. All are smooth-unioned into the field once and the field is meshed once.

The table is read from art/species-construction/specs/r04_locks.json (made by loop/r04_table.py from the spec). Coordinates are the
spec's back-view fit units; the head is placed at scale .50 with offset (0, -.02, .635) so head-local = (-3.721 x, 3.721 df + .04,
.537 - 3.721 y). Eyes, nose and mouth are separate objects and do not move.
Akinza-specific. Every parameter is recorded in rear-lock-table.json.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

S = 3.721           # figure units to head-local units
DF0 = .04           # head-local y of df 0
Z0 = .537           # head-local z of figure y 0

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--table', type=Path, default=Path(__file__).resolve().parent/'specs/r04_locks.json')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--blend', type=float, default=.0075, help='smooth union of the locks with the skin, head-local (.002 figure)')
parser.add_argument('--lock-blend', type=float, default=.003, help='smooth union between locks')
parser.add_argument('--rows', default='T,B1,B2,B3,D,C', help='which rows to build')
parser.add_argument('--plate', type=float, default=.016, help='depth the plate lies below the visible plan (figure units); 0 turns the plate cut off')
parser.add_argument('--plate-fade', type=float, nargs=2, default=[-.012, .018], help='plate weight ramp from the crease: u - crease at 0 and at 1')
parser.add_argument('--dome-cut', action='store_true', help='cut above the section dome of each wing (front lip, rear rim)')
parser.add_argument('--dome-k', type=float, nargs=2, default=[15., 4.5], help='dome curvature behind and in front of the crest')
parser.add_argument('--dome-slack', type=float, default=.003, help='allowed height above the dome curve before the cut, figure units')
parser.add_argument('--thick-scale', type=float, default=1., help='scale on lock thickness')
parser.add_argument('--width-scale', type=float, default=1., help='scale on lock width')
parser.add_argument('--d-lift', type=float, default=.003, help='dome-coat relief above the dome surface, figure units')
parser.add_argument('--c-lift', type=float, default=.0, help='crown tuft root raise above the dome surface, figure units')
parser.add_argument('--tip-min', type=float, nargs=2, default=[.002, .002], help='smallest half width and full thickness of a tip, figure units')
parser.add_argument('--cap', type=float, default=.012, help='how far a lock base reaches inward under its base plane at the lock middle; tapers to nothing at the tip (figure units)')
parser.add_argument('--only-side', default='', help='debug: build only L or R wing locks')
parser.add_argument('--bandwidth', type=int, default=12)
parser.add_argument('--max-island', type=int, default=0, help='remove closed islands of at most this many vertices before the single-solid gate (recorded); 0 = off')
parser.add_argument('--tip-taper', type=float, default=0., help='0 keeps the spec thickness curve; above 0 ties thickness to the width taper (thickness ~ width^this) so tips are not blades')
parser.add_argument('--d-thick', type=float, default=1., help='scale on dome-coat thickness')
parser.add_argument('--d-length', type=float, default=1., help='scale on dome-coat lock length (tip moves along the table chord)')
parser.add_argument('--front-margin', type=float, default=.012, help='wing locks stay this far behind the wall front surface (head-local); negative turns the clip off')
parser.add_argument('--taper-exp', type=float, default=1.4, help='exponent of the width fall from the widest point to the tip (spec 1.4; 1 is a straight blade)')
parser.add_argument('--cut-smooth', type=int, default=0, help='box-blur radius in voxels (3 passes) applied where the plate or dome cut changed the field; 0 = off')
parser.add_argument('--t-scale', type=float, default=1., help='extra scale on the top-edge row (T) width and thickness')
parser.add_argument('--samples', type=int, default=24, help='axis samples per lock')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.table])
table = json.loads(args.table.read_text())['locks']
rows = set(args.rows.split(','))

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before rear lock table')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = args.bandwidth
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid
XS = ((lo[0]+np.arange(shape[0]))*VS).astype(np.float32)
YS = ((lo[1]+np.arange(shape[1]))*VS).astype(np.float32)
ZS = ((lo[2]+np.arange(shape[2]))*VS).astype(np.float32)
print('grid', shape, 'band', BAND, flush=True)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def interp(xs, ys):
    xs, ys = np.array(xs, float), np.array(ys, float)
    order = np.argsort(xs)
    xs, ys = xs[order], ys[order]
    return lambda v: np.interp(v, xs, ys)


field0 = field.copy() if args.cut_smooth else None


# ---- plans from the spec (figure units) ---------------------------------------------------------------------------
# Sheet column edges of each wing, from the spec's section 1 outline (back view; L is the character's left, +x local).
TOP = {'L': interp([.060, .105, .142, .209, .249, .279], [.027, .013, .006, .000, .008, .029]),
       'R': interp([.090, .126, .217, .274], [.029, .022, .021, .050])}
BOTTOM = {'L': interp([.090, .153, .214, .249, .274], [.178, .163, .128, .093, .053]),
          'R': interp([.085, .138, .180, .226, .260], [.175, .176, .163, .126, .088])}
MID = interp([.08, .10, .13, .16, .19, .22, .25, .27], [.066, .068, .066, .062, .059, .055, .045, .030])
CREST = interp([.06, .10, .16, .20, .24, .27], [.020, .020, .025, .028, .028, .020])
CREASE = interp([.05, .10, .175], [.044, .068, .085])    # u of the ear-root crease at y


def plan_rear(u, y, side):
    top, bottom = TOP[side](u), BOTTOM[side](u)
    c = CREST(u)
    topr = c+np.sqrt(np.maximum(y-top, 0)/15.)
    botr = np.maximum(.022, .020)+np.sqrt(np.maximum(bottom-y, 0)/25.)
    return np.minimum(np.minimum(MID(u), topr), botr)


# ---- plate cut and dome cut -----------------------------------------------------------------------------------------
cuts = {}
if args.plate > 0 or args.dome_cut:
    for sign, side in ((1, 'L'), (-1, 'R')):
        xi = np.where(XS*sign > 0)[0]
        for chunk in np.array_split(xi, max(1, len(xi)//40)):
            x = XS[chunk][:, None, None]
            y = YS[None, :, None]
            z = ZS[None, None, :]
            u = np.abs(x)/S                        # (nx,1,1)
            yf = (Z0-z)/S                          # figure y, (1,1,nz)
            df = (y-DF0)/S                         # (1,ny,1)
            sl = field[chunk]
            if args.plate > 0:
                plan = plan_rear(u, yf, side)-args.plate        # (nx,1,nz)
                plate_y = (plan*S+DF0).astype(np.float32)
                # weight: fade in from the crease, and not below the wing's lower edge
                w = smoothstep((u-CREASE(np.clip(yf, .05, .175))-args.plate_fade[0])/(args.plate_fade[1]-args.plate_fade[0]))
                w = w*smoothstep((BOTTOM[side](u)+.012-yf)/.012)*smoothstep((yf+.02)/.02)
                w = w.astype(np.float32)
                # slope-normalised vertical distance to the plate surface
                dy = np.gradient(plate_y[:, 0, :], VS, axis=0)
                dz = np.gradient(plate_y[:, 0, :], VS, axis=1)
                scale = (1/np.sqrt(1+dy**2+dz**2))[:, None, :].astype(np.float32)
                g = (y-plate_y)*scale
                cut = np.maximum(sl, g)
                sl = sl+w*(cut-sl)
            if args.dome_cut:
                top = TOP[side](u)+args.dome_slack
                kk = np.where(df > CREST(u), args.dome_k[0], args.dome_k[1])
                allowed = top+kk*(df-CREST(u))**2          # figure y, (nx,ny,1)
                allowed_z = (Z0-allowed*S).astype(np.float32)
                slope = np.abs(2*kk*(df-CREST(u)))
                g = (z-allowed_z)/np.sqrt(1+slope**2).astype(np.float32)
                w = smoothstep((u-.09)/.03)*smoothstep((yf+.05)/.03)
                w = w.astype(np.float32)
                cut = np.maximum(sl, g.astype(np.float32))
                sl = sl+w*(cut-sl)
            field[chunk] = sl
    print('cuts done', flush=True)


if args.cut_smooth:
    def box(a, r):
        for ax_ in range(3):
            n_ = a.shape[ax_]
            c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(3)], mode='edge'), axis=ax_, dtype=np.float64)
            a = ((np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))/(2*r+1)).astype(np.float32)
        return a
    changed = (np.abs(field-field0) > 1e-5).astype(np.float32)
    del field0
    idx_ = np.argwhere(changed > 0)
    if len(idx_):
        a_ = np.maximum(idx_.min(axis=0)-args.cut_smooth*4, 0)
        b_ = np.minimum(idx_.max(axis=0)+args.cut_smooth*4+1, np.array(shape))
        sl_ = tuple(slice(int(i), int(j)) for i, j in zip(a_, b_))
        sub = field[sl_]
        weight = np.clip(box(box(changed[sl_], args.cut_smooth), args.cut_smooth)*4, 0, 1)
        blur = sub
        for _ in range(3):
            blur = box(blur, args.cut_smooth)
        field[sl_] = sub+weight*(blur-sub)
    del changed
    print('cut smoothing done', flush=True)


# ---- front surface of the wing wall: wing locks never reach in front of it --------------------------------------------
inside = field < 0
has = inside.any(axis=1)
first = inside.argmax(axis=1)
del inside
front2d = np.where(has, YS[first], np.nan).astype(np.float32)
fill = ~np.isnan(front2d)
for _ in range(400):
    if fill.all():
        break
    pad = np.pad(np.where(fill, front2d, 0.), 1)
    cnt = np.pad(fill.astype(np.float32), 1)
    num = sum(np.roll(np.roll(pad, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1))[1:-1, 1:-1]
    den = sum(np.roll(np.roll(cnt, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1))[1:-1, 1:-1]
    new = (~fill) & (den > 0)
    front2d[new] = (num[new]/den[new]).astype(np.float32)
    fill = fill | new
front2d[~fill] = 0.
print('front surface heightfield built', flush=True)


# ---- locks ------------------------------------------------------------------------------------------------------------
def to_local(xb, yd, df):
    return np.array([-S*xb, S*df+DF0, Z0-S*yd])


def surface_depth(xb, yd):
    """Head-local y of the original skin's rear surface at a back-view point (ray from behind)."""
    hit, normal, _, _ = tree.ray_cast(Vector((-S*xb, 3.0, Z0-S*yd)), Vector((0, -1, 0)))
    return None if hit is None else float(hit.y)


def surface_top(xb, df):
    hit, normal, _, _ = tree.ray_cast(Vector((-S*xb, S*df+DF0, 2.0)), Vector((0, 0, -1)))
    return None if hit is None else float(hit.z)


def bezier(p0, p1, p2, p3, t):
    t = t[:, None]
    return (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3


def lock_axis(l, n=None):
    n = n or args.samples
    if l['row'] == 'D' and args.d_length != 1.:
        l = dict(l, tip=[l['root'][0]+(l['tip'][0]-l['root'][0])*args.d_length, l['root'][1]+(l['tip'][1]-l['root'][1])*args.d_length])
    """Axis samples in head-local space, arc length, frames. Positions in back-view figure units."""
    xr, yr = l['root']
    xt, yt = l['tip']
    row = l['row']
    sx = -1. if xr < 0 else 1.
    depth_root, depth_tip = l['depthRoot'], l['depthTip']
    if row in ('B1', 'B2', 'B3', 'T'):
        a0, a1 = math.radians(l['dirRoot']), math.radians(l['dirTip'])
        d0 = np.array([sx*math.cos(a0), math.sin(a0)])
        d1 = np.array([sx*math.cos(a1), math.sin(a1)])
    else:
        d0 = d1 = np.array([xt-xr, yt-yr])
        d0 = d0/max(np.linalg.norm(d0), 1e-9)
        d1 = d0
    p0, p3 = np.array([xr, yr]), np.array([xt, yt])
    chord = np.linalg.norm(p3-p0)
    p1, p2 = p0+d0*chord/3, p3-d1*chord/3
    t = np.linspace(0, 1, n)
    xy = bezier(p0, p1, p2, p3, t)
    df = depth_root+(depth_tip-depth_root)*t
    return xy, df


def build_lock(l, lift_extra=0.):
    xy, df = lock_axis(l)
    row = l['row']
    if row == 'D':
        # dome coat: lie on the actual dome, relief d-lift above it
        ys = [surface_depth(x, y) for x, y in xy]
        if any(v is None for v in ys):
            return None
        df = (np.array(ys)-DF0)/S+args.d_lift
    if row == 'C':
        # crown tuft: the six spikes grow out of the dome at the whorl; the root sits on the dome, the tip keeps the
        # height the spec gives it (no tip above the figure top)
        top = surface_top(xy[0][0], df[0])
        ax = np.array([to_local(x, y, d) for (x, y), d in zip(xy, df)])
        if top is not None:
            root_z = top+args.c_lift*S-.01
            tip_z = ax[-1, 2]
            ax[:, 2] = np.linspace(root_z, tip_z, len(ax))
        return ax
    ax = np.array([to_local(x, y, d) for (x, y), d in zip(xy, df)])
    return ax


def lock_field(sample, l, wscale, tscale):
    """Return (slices, value) of the lock's field inside its bounding box, or None."""
    ax = sample
    n = len(ax)
    seg = np.diff(ax, axis=0)
    arc = np.r_[0, np.cumsum(np.linalg.norm(seg, axis=1))]
    L = arc[-1]
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    up = np.array([0., 0., 1.]) if l['row'] == 'T' else np.array([0., 1., 0.])
    nrm = up[None, :]-(tang@up)[:, None]*tang
    bad = np.linalg.norm(nrm, axis=1) < 1e-3
    alt = np.array([0., 1., 0.]) if l['row'] == 'T' else np.array([0., 0., 1.])
    nrm[bad] = alt-(tang[bad]@alt)[:, None]*tang[bad]
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    bin_ = np.cross(tang, nrm)
    wm, wr = l['widthMid']*S*wscale, l['widthRoot']*S*wscale
    th = l['thick']*S*tscale
    hmin, tmin = args.tip_min[0]*S, args.tip_min[1]*S

    def half_width(t):
        rise = np.where(t < .4, wr/2+(wm/2-wr/2)*smoothstep(t/.4), wm/2*np.clip(1-(t-.4)/.6, 0, 1)**args.taper_exp)
        return np.maximum(rise, hmin)

    def height(t):
        h = np.where(t < .4, th*(.75+.25*smoothstep(t/.4)), np.where(t < .9, th*(1-.6*(t-.4)/.5), th*(.4-.25*(t-.9)/.1)))
        if args.tip_taper > 0:
            w = np.clip(half_width(t)/(wm/2), 0, 1)
            h = np.minimum(h, th*np.maximum(w**args.tip_taper, .12))
        return np.maximum(h, tmin)

    reach = wm/2+th+.03
    low = ax.min(axis=0)-reach
    high = ax.max(axis=0)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    if any(s.stop <= s.start for s in sl):
        return None
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    X, Y, Z = np.meshgrid((lo[0]+xs)*VS, (lo[1]+ys)*VS, (lo[2]+zs)*VS, indexing='ij')
    P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    best = np.full(len(P), 1e9, np.float32)
    idx = np.zeros(len(P), np.int32)
    for k in range(n):
        d2 = ((P-ax[k].astype(np.float32))**2).sum(axis=1)
        m = d2 < best
        best[m] = d2[m]
        idx[m] = k
    q = P-ax[idx].astype(np.float32)
    s_loc = (q*tang[idx]).sum(axis=1)
    length = arc[idx]+s_loc
    aa = (q*bin_[idx]).sum(axis=1)
    cc = (q*nrm[idx]).sum(axis=1)
    t = np.clip(length/L, 0, 1)
    h = height(t).astype(np.float32)
    wh = half_width(t).astype(np.float32)
    crel = cc+h                                      # height above the base plane (crest at h)
    e = np.sqrt((aa/wh)**2+(np.maximum(crel, 0)/h)**2)
    # closed tip and buried root cap, and a floor so the base does not pierce the fan's front
    e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(wh, hmin*1.5))**2+(np.maximum(-length, 0)/(.02))**2
                +(np.maximum(-crel-args.cap*S*np.clip(wh/(wm/2), 0, 1), 0)/(.02))**2)
    d = (e-1)*np.minimum(wh, h)
    if args.front_margin >= 0 and l['row'] in ('T', 'B1', 'B2', 'B3'):
        fr = front2d[sl[0], sl[2]]                                  # (nx, nz)
        limit = np.broadcast_to(fr[:, None, :], tuple(s_.stop-s_.start for s_ in sl)).reshape(-1)+args.front_margin
        d = np.maximum(d, limit-P[:, 1])
    return sl, d.reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)


lock_field_arr = np.full(shape, BAND, dtype=np.float32)
built = []
for l in table:
    if l['row'] not in rows:
        continue
    if args.only_side and l['side'] and l['side'] != args.only_side:
        continue
    ax = build_lock(l)
    if ax is None:
        built.append({'name': l['name'], 'skipped': 'no surface'})
        continue
    ts = args.t_scale if l['row'] == 'T' else 1.
    r = lock_field(ax, l, args.width_scale*ts, args.thick_scale*ts*(args.d_thick if l['row'] == 'D' else 1.))
    if r is None:
        continue
    sl, d = r
    cur = lock_field_arr[sl]
    lock_field_arr[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, args.lock_blend)).astype(np.float32)
    built.append({'name': l['name'], 'axisRoot': [round(float(v), 4) for v in ax[0]], 'axisTip': [round(float(v), 4) for v in ax[-1]]})
print('locks', len(built), flush=True)

combined = np.minimum(smin(field, lock_field_arr, args.blend), BAND).astype(np.float32)
del lock_field_arr, field
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with rear lock table')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
removed_islands = []
if args.max_island:
    bmi = bmesh.new(); bmi.from_mesh(head.data)
    unseen, groups = set(bmi.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex); group.add(vertex); queue.append(vertex)
        groups.append(group)
    biggest = max(groups, key=len)
    for group in groups:
        if group is not biggest and len(group) <= args.max_island:
            removed_islands.append({'vertices': len(group),
                                    'bounds': [[round(min(v.co[i] for v in group), 4) for i in range(3)],
                                               [round(max(v.co[i] for v in group), 4) for i in range(3)]]})
            bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
    bmi.to_mesh(head.data); bmi.free()
require_single_closed_mesh(head, args.out, 'Head skin with rear lock table')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
params = {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}
(args.out/'rear-lock-table.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'R04: ear fan rear plate, section dome and the authored lock table (T, B1, B2, B3, D, C), field space; face untouched',
    'parameters': params, 'lockCount': len(built), 'locks': built, 'removedFlecks': removed_flecks, 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
