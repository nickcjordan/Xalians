"""Grow the ear fan's rear (R04) as a volume of coat clumps, in field space (trial twin of the planned author_fan_clumps_field.py).

Run with Blender (through loop_tools.py blender):
  blender -b --factory-startup --python author_fan_clumps_field-trial.py -- --scene <head.blend> --spec <R04.md> --out <dir>

Implements specs/R04.md (clump volume), part rear:
  1. The head skin becomes an OpenVDB level set.
  2. Strip: everything behind S(u, y) = max(rear(u, y) - .030, M(u)) is cleared outside the crease (the old shell, plate, lock rows).
  3. Core: a slab from the fan mid-surface to rear(u, y) - .012, inside the sheet envelope inset, is smooth-unioned in.
  4. Dome blur: the kept head dome surface inside the crease is blurred so seams drop (crest held).
  5. Clumps: every row of the spec's tables (K, I, M, T, E, C) is swept along a Catmull-Rom path with a tapered, superellipse
     section and smooth-unioned by layer. The field is meshed once.
Coordinates: back-view fit units; head-local = (-S xb, S df + DF0, Z0 - S y). Eyes, nose, mouth are separate objects.
"""
import argparse
import json
import math
from pathlib import Path
import re
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

S = 3.721
DF0 = .04
Z0 = .537

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--part', default='rear')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=12)
parser.add_argument('--strip-depth', type=float, default=.030, help='strip starts this far in front of the rear envelope (figure units)')
parser.add_argument('--core-inset', type=float, default=.014, help='core outline inset from the sheet envelope (figure units)')
parser.add_argument('--core-behind', type=float, default=.012, help='core rear face lies this far in front of the rear envelope')
parser.add_argument('--k-same', type=float, default=.004, help='smooth union radius within a layer (figure units)')
parser.add_argument('--k-layer', type=float, default=.003, help='smooth union radius between layers')
parser.add_argument('--k-core', type=float, default=.005)
parser.add_argument('--dome-blur', type=int, default=7, help='box-blur radius in voxels (2 passes) of the dome surface; 0 = off')
parser.add_argument('--samples', type=int, default=28)
parser.add_argument('--width-scale', type=float, default=1.)
parser.add_argument('--thick-scale', type=float, default=1.)
parser.add_argument('--skip', default='', help='comma list of clump names to drop')
parser.add_argument('--taper-exp', type=float, default=1.3, help='exponent of the width fall from the widest point to the tip')
parser.add_argument('--strip-ramp-start', type=float, default=-.004, help='strip weight ramp across the crease: start offset (figure units)')
parser.add_argument('--strip-ramp-width', type=float, default=.006, help='strip weight ramp width (figure units)')
parser.add_argument('--round-add', type=float, default=0., help='added to every clump roundness (inner-face squareness)')
parser.add_argument('--max-island', type=int, default=5000)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
SKIP = set(n for n in args.skip.split(',') if n)

# ---- spec tables -------------------------------------------------------------------------------------------------------
ROW = re.compile(r'^\| ([LR]?[A-Z]\w*?\d+) \| (\d) \| \(([^)]*)\) \| \(([^)]*)\) \| \(([^)]*)\) \| \(([^)]*)\) \| ([\d.]+) \| ([\d.]+) / ([\d.]+) \| ([\d.]+) \| ([+-]?\d+) / ([+-]?\d+) \|')
clumps = []
for line in args.spec.read_text(encoding='utf-8').splitlines():
    m = ROW.match(line)
    if not m:
        continue
    name = m.group(1)
    rowk = 'C' if name[0] == 'C' else name[1]
    pts = [[float(v) for v in m.group(i).split(',')] for i in (3, 4, 5, 6)]
    clumps.append(dict(name=name, row=rowk, layer=int(m.group(2)), path=pts, length=float(m.group(7)), wroot=float(m.group(8)),
                       wmid=float(m.group(9)), thick=float(m.group(10))))
assert len(clumps) == 69, len(clumps)

ROUND = {'I': 1.3, 'M': 1.3, 'T': 1.2, 'E': 1.2, 'K': 1.0, 'C': 1.0}
TIPR = {'T': .0015, 'E': .0015, 'I': .002, 'M': .002, 'K': .002, 'C': .0012}

# ---- envelope and plans (figure units; back view x) ----------------------------------------------------------------------
ENV = [(-.279, .029), (-.240, .006), (-.200, .001), (-.140, .006), (-.080, .019), (.000, .020), (.080, .030), (.140, .024),
       (.200, .020), (.240, .026), (.275, .049), (.240, .111), (.200, .140), (.160, .167), (.120, .178), (.085, .175),
       (-.085, .175), (-.120, .174), (-.160, .156), (-.200, .136), (-.240, .094)]


def interp(xs, ys):
    xs, ys = np.array(xs, float), np.array(ys, float)
    o = np.argsort(xs)
    return lambda v: np.interp(v, xs[o], ys[o])


TOP = {'L': interp([.080, .140, .200, .240, .279], [.019, .006, .001, .006, .029]),
       'R': interp([.080, .140, .200, .240, .275], [.030, .024, .020, .026, .049])}
BOTTOM = {'L': interp([.085, .120, .160, .200, .240, .279], [.175, .174, .156, .136, .094, .029]),
          'R': interp([.085, .120, .160, .200, .240, .275], [.175, .178, .167, .140, .111, .049])}
PU = interp([.06, .08, .10, .13, .16, .19, .22, .25, .27, .285], [.064, .066, .068, .066, .066, .070, .074, .074, .070, .060])
MU = interp([.08, .10, .13, .16, .19, .22, .25, .27, .285], [.020, .022, .026, .032, .044, .056, .060, .060, .058])
CU = interp([.06, .10, .16, .20, .24, .27], [.020, .020, .025, .030, .034, .034])
CREASE = interp([.05, .10, .175], [.044, .068, .085])


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def rear_plan(u, y, side):
    top, bottom = TOP[side](u), BOTTOM[side](u)
    topr = CU(u)+np.sqrt(np.maximum(y-top, 0)/15.)
    s_ = np.maximum(bottom-y, 0)
    wedge = MU(u)+.004+.6*s_
    wedge = wedge+(1-smoothstep((u-.08)/.03))*10.
    return np.minimum(np.minimum(PU(u), topr), wedge)


# ---- load ---------------------------------------------------------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before fan clumps')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
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
print('grid', shape, flush=True)

# ---- sheet envelope signed distance on the (x, z) grid (inside positive, figure units) ---------------------------------
xb_g = (-XS/S)[:, None]*np.ones((1, len(ZS)), np.float32)
yf_g = ((Z0-ZS)/S)[None, :]*np.ones((len(XS), 1), np.float32)
poly = np.array(ENV)
pa, pb = poly, np.roll(poly, -1, axis=0)
dmin = np.full(xb_g.shape, 1e9, np.float32)
for a_, b_ in zip(pa, pb):
    ab = b_-a_
    t_ = np.clip(((xb_g-a_[0])*ab[0]+(yf_g-a_[1])*ab[1])/(ab@ab), 0, 1)
    d_ = np.hypot(xb_g-(a_[0]+t_*ab[0]), yf_g-(a_[1]+t_*ab[1]))
    dmin = np.minimum(dmin, d_)
inside = np.zeros(xb_g.shape, bool)
for a_, b_ in zip(pa, pb):
    cond = ((a_[1] > yf_g) != (b_[1] > yf_g)) & (xb_g < (b_[0]-a_[0])*(yf_g-a_[1])/(b_[1]-a_[1]+1e-12)+a_[0])
    inside ^= cond
sd = np.where(inside, dmin, -dmin).astype(np.float32)
print('envelope sd', flush=True)

# ---- strip and core (per x chunk) -----------------------------------------------------------------------------------------
before_field = None
for sign, side in ((1, 'L'), (-1, 'R')):
    xi = np.where(XS*sign > 0)[0]
    for chunk in np.array_split(xi, max(1, len(xi)//40)):
        x = XS[chunk][:, None, None]
        y = YS[None, :, None]
        u = np.abs(x)/S                                  # (nx,1,1)
        yf = (Z0-ZS[None, None, :])/S                    # (1,1,nz)
        u2, yf2 = u[:, 0, :]*np.ones((1, len(ZS))), yf[0]*np.ones((len(chunk), 1))
        rear = rear_plan(u2, yf2, side)                  # (nx,nz)
        sdf = np.maximum(rear-args.strip_depth, MU(u2))
        sy = (sdf*S+DF0).astype(np.float32)
        dy = np.gradient(sy, VS, axis=0)
        dz = np.gradient(sy, VS, axis=1)
        sc = (1/np.sqrt(1+dy**2+dz**2)).astype(np.float32)
        crease = CREASE(np.clip(yf2, .05, .175))
        w = smoothstep((u2-(crease+args.strip_ramp_start))/args.strip_ramp_width)*smoothstep((.19-yf2)/.015)*smoothstep((yf2+.03)/.02)
        w = w.astype(np.float32)
        sl = field[chunk]
        g = (y-sy[:, None, :])*sc[:, None, :]
        sl = sl+w[:, None, :]*(np.maximum(sl, g)-sl)
        # core slab
        sdc = sd[chunk]
        ry = ((rear-args.core_behind)*S+DF0).astype(np.float32)
        fy = ((MU(u2)-.004)*S+DF0).astype(np.float32)
        dyr = np.gradient(ry, VS, axis=0)
        dzr = np.gradient(ry, VS, axis=1)
        scr = (1/np.sqrt(1+dyr**2+dzr**2)).astype(np.float32)
        g_rear = (y-ry[:, None, :])*scr[:, None, :]
        g_front = fy[:, None, :]-y
        g_out = ((args.core_inset-sdc)*S)[:, None, :]
        core = np.maximum(np.maximum(g_rear, g_front), g_out).astype(np.float32)
        wc = (w > 0)[:, None, :]
        core = np.where(wc, BAND+(core-BAND)*w[:, None, :], BAND).astype(np.float32)
        sl = np.where(wc, smin(sl, core, args.k_core*S), sl).astype(np.float32)
        field[chunk] = sl
print('strip and core done', flush=True)


# ---- dome blur ------------------------------------------------------------------------------------------------------------
def box2d_masked(val, valid, r, passes=2):
    num = np.where(valid, val, 0.).astype(np.float64)
    den = valid.astype(np.float64)
    for _ in range(passes):
        for ax_ in (0, 1):
            n_ = num.shape[ax_]
            outs = []
            for a in (num, den):
                c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(2)], mode='edge'), axis=ax_)
                outs.append(np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))
            num, den = outs
    return np.where(den > 1e-6, num/np.maximum(den, 1e-6), np.nan)


dome_report = {}
if args.dome_blur > 0:
    ins = field < 0
    ny_ = ins.shape[1]
    has_ = ins.any(axis=1)
    yrear = YS[ny_-1-ins[:, ::-1, :].argmax(axis=1)].astype(np.float64)
    del ins
    blur_ = box2d_masked(yrear, has_, args.dome_blur)
    u_ = np.abs(XS)[:, None]/S
    zf_ = (Z0-ZS[None, :])/S
    crease_ = CREASE(np.clip(zf_, .05, .175))
    wd = (smoothstep((crease_-.004-u_)/.012)*smoothstep((zf_-.045)/.015)*smoothstep((.19-zf_)/.02)).astype(np.float32)
    target = np.where(np.isnan(blur_), yrear, blur_)
    target = np.minimum(target, yrear+.0005*S).astype(np.float32)        # peaks cut, valleys filled only a little
    target = (wd*target+(1-wd)*yrear).astype(np.float32)
    gy = YS[None, :, None]-target[:, None, :]
    slope = np.hypot(np.gradient(target, VS, axis=0), np.gradient(target, VS, axis=1))
    gy = (gy/np.sqrt(1+slope**2)[:, None, :]).astype(np.float32)
    cut_ = np.maximum(field, gy)
    slab_ = np.maximum(gy, (yrear.astype(np.float32)-.03*S)[:, None, :]-YS[None, :, None])
    cut_ = np.minimum(cut_, slab_)
    del slab_, gy
    msk = ((wd > 1e-3) & has_)[:, None, :]
    field = np.where(msk, field+wd[:, None, :]*(cut_-field), field).astype(np.float32)
    del cut_
    ix0 = int(round(0/VS-lo[0]))
    dome_report = {'maxChange': float(np.nanmax(np.abs((target-yrear)[wd > .5]))/S) if (wd > .5).any() else 0.}
    print('dome blurred', dome_report, flush=True)


# ---- clumps ---------------------------------------------------------------------------------------------------------------
def to_local(p):
    xb, yd, df = p
    return np.array([-S*xb, S*df+DF0, Z0-S*yd])


def catmull(pts, n):
    p = np.array(pts)
    ext = np.vstack([2*p[0]-p[1], p, 2*p[-1]-p[-2]])
    out = []
    ts = np.linspace(0, 3, n)
    for t in ts:
        i = min(int(t), 2)
        f = t-i
        p0, p1, p2, p3 = ext[i], ext[i+1], ext[i+2], ext[i+3]
        out.append(.5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f**3))
    return np.array(out)


def clump_field(c):
    path = catmull([to_local(p) for p in c['path']], args.samples)
    ax = path
    seg = np.diff(ax, axis=0)
    arc = np.r_[0, np.cumsum(np.linalg.norm(seg, axis=1))]
    L = arc[-1]
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    up = np.array([0., 1., 0.])
    nrm = up[None, :]-(tang@up)[:, None]*tang
    bad = np.linalg.norm(nrm, axis=1) < 1e-3
    alt = np.array([0., 0., 1.])
    nrm[bad] = alt-(tang[bad]@alt)[:, None]*tang[bad]
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    bin_ = np.cross(tang, nrm)
    wr, wm = c['wroot']*S*args.width_scale/2, c['wmid']*S*args.width_scale/2
    th = c['thick']*S*args.thick_scale
    tipw = TIPR[c['row']]*S
    rnd = ROUND[c['row']]+(args.round_add if c['row'] not in 'KC' else 0.)
    n_out, n_in = 2.0, 2.0+(rnd-1)*3.3

    def hw(t):
        v = np.where(t < .4, wr+(wm-wr)*t/.4, wm*np.clip(1-(t-.4)/.6, 0, 1)**args.taper_exp)
        return np.maximum(v, tipw)

    def ht(t):
        v = np.where(t < .4, th*(.7+.3*t/.4), th*np.clip(1-(t-.4)/.6, 0, 1)**1.1)
        floor = np.where(L-t*L > .004*S, .003*S, tipw)
        return np.maximum(v, floor)/2

    reach = wm+th+.03
    low, high = ax.min(axis=0)-reach, ax.max(axis=0)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    X, Y, Z = np.meshgrid((lo[0]+xs)*VS, (lo[1]+ys)*VS, (lo[2]+zs)*VS, indexing='ij')
    P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    best = np.full(len(P), 1e9, np.float32)
    idx = np.zeros(len(P), np.int32)
    for k in range(len(ax)):
        d2 = ((P-ax[k].astype(np.float32))**2).sum(axis=1)
        m = d2 < best
        best[m] = d2[m]
        idx[m] = k
    q = P-ax[idx].astype(np.float32)
    length = arc[idx]+(q*tang[idx]).sum(axis=1)
    aa = (q*bin_[idx]).sum(axis=1)
    cc = (q*nrm[idx]).sum(axis=1)
    t = np.clip(length/L, 0, 1)
    h = ht(t).astype(np.float32)
    w = hw(t).astype(np.float32)
    n = np.where(cc > 0, n_out, n_in).astype(np.float32)
    e = (np.abs(aa/w)**n+np.abs(cc/h)**n)**(1/n)
    e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(w, tipw*1.5))**2+(np.maximum(-length, 0)/.03)**2)
    d = ((e-1)*np.minimum(w, h)).reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)
    # light blur (sigma about 1.5 voxels) so short tapers leave no ribs
    for _ in range(2):
        for ax_ in range(3):
            n_ = d.shape[ax_]
            cs = np.cumsum(np.pad(d, [(2, 1) if i == ax_ else (0, 0) for i in range(3)], mode='edge'), axis=ax_, dtype=np.float64)
            d = ((np.take(cs, np.arange(3, n_+3), axis=ax_)-np.take(cs, np.arange(0, n_), axis=ax_))/3).astype(np.float32)
    return sl, d, ax, L


acc = np.full(shape, BAND, dtype=np.float32)
stats = []
last_layer = None
for c in sorted(clumps, key=lambda c: (c['layer'], c['name'])):
    if c['name'] in SKIP:
        continue
    sl, d, ax, L = clump_field(c)
    cur = acc[sl]
    k = (args.k_same if c['layer'] == last_layer else args.k_layer)*S
    acc[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, k)).astype(np.float32)
    last_layer = c['layer']
    stats.append({'name': c['name'], 'row': c['row'], 'layer': c['layer'], 'arcLengthFig': round(float(L/S), 4), 'specLength': c['length'],
                  'tipLocal': [round(float(v), 4) for v in ax[-1]], 'rootLocal': [round(float(v), 4) for v in ax[0]]})
print('clumps', len(stats), flush=True)

combined = np.minimum(smin(field, acc, args.k_core*S), BAND).astype(np.float32)
del acc, field
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with fan clumps')
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
            removed_islands.append({'vertices': len(group)})
            bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
    bmi.to_mesh(head.data); bmi.free()
require_single_closed_mesh(head, args.out, 'Head skin with fan clumps')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
params = {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}
(args.out/'fan-clumps.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'R04: ear fan rear clump volume (strip, core, dome blur, 69 clumps), field space; face untouched',
    'parameters': params, 'clumpCount': len(stats), 'clumps': stats, 'dome': dome_report,
    'removedFlecks': removed_flecks, 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
