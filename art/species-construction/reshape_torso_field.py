"""Reshape the Akinza trunk (R06) to a side-profile station table, in field space.

Run with Blender: -b --factory-startup --python reshape_torso_field.py --
  --scene <body.blend> --fairing <fairing.json> --spec <torso-reshape.json> --out <new-dir> [--voxel .0025]

The body becomes an OpenVDB level set. Two resampling passes, then one meshing:

  x pass (spec.halfWidth): per z slice the flank half width about the midline is rescaled so the model's
          half width lands on the target (inside: linear in |x|, outside: blends to the identity over lateralFade).
  y pass (spec.edges): per z slice the trunk's front and back edges (model rows -> target rows, fit units,
          converted with sideOffset and the figure height) are mapped piecewise linearly: in front of the target
          front edge the map is a shift that eases to the identity over frontFade, between the edges it is a linear
          stretch, behind the target back edge a shift that eases out over backFade. Weights in |x| (frontX, backX
          rows: y, full, end) keep the arms out of the map, and spec.yFade fades the whole pass in z.
  optional beltBlur: a z-direction Gaussian blend over the belt line (zRange, sigma) within |x| xFull.

Monotonicity of every map is checked, so the field never folds. Every parameter is in the spec.
"""
import argparse
import copy
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--fairing', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)

spec = json.loads(args.spec.read_text())
provenance = snapshot(args.out, __file__, [args.scene, args.fairing, args.spec])
record = json.loads(args.fairing.read_text())
VS = args.voxel
H = spec.get('figureHeight', 1.8605)
FLOOR = spec.get('floorZ', -.957)
OFF = spec.get('sideOffset', -.0191)

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(skin, args.out, 'Body before torso reshape')
source_stats = mesh_stats(skin)
material = skin.data.materials[0] if skin.data.materials else None

skin.data.calc_loop_triangles()
points = np.empty(len(skin.data.vertices)*3, dtype=np.float32)
skin.data.vertices.foreach_get('co', points)
points = points.reshape(-1, 3)
triangles = np.empty(len(skin.data.loop_triangles)*3, dtype=np.int32)
skin.data.loop_triangles.foreach_get('vertices', triangles)
triangles = triangles.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], triangles.tolist())

HALF_WIDTH = 18
BAND = HALF_WIDTH*VS
grid = vdb.FloatGrid.createLevelSetFromPolygons(
    points, triangles=triangles, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF_WIDTH)
PAD = int(math.ceil(.05/VS))
lo_index = np.floor(points.min(axis=0)/VS).astype(int)-PAD
hi_index = np.ceil(points.max(axis=0)/VS).astype(int)+PAD
shape = tuple(int(v) for v in hi_index-lo_index+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo_index))
if not (field.min() < 0 < field.max()):
    raise ValueError('Level set conversion produced no interior')
xs = (lo_index[0]+np.arange(shape[0]))*VS
ys = (lo_index[1]+np.arange(shape[1]))*VS
zs = (lo_index[2]+np.arange(shape[2]))*VS


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*t*(10+t*(-15+6*t))


def gauss_smooth(values, step, sigma):
    if sigma <= 0:
        return values
    radius = int(math.ceil(3*sigma/step))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)*step/sigma)**2)
    kernel /= kernel.sum()
    return np.convolve(np.pad(values, radius, mode='edge'), kernel, mode='valid')


def fit_y(z):
    return 1-(z-FLOOR)/H


def fit_to_world_y(v):
    return OFF+H*v


edges = np.array(spec['edges'], dtype=np.float64)
yf = spec['yFade']
report = {}

# Slice range: the fade bands of the y pass.
z_top = FLOOR+H*(1-yf['topZero'])
z_bot = FLOOR+H*(1-yf['bottomZero'])
zi = np.where((zs <= z_top) & (zs >= z_bot))[0]
z0, z1 = zi[0], zi[-1]+1
zz = zs[z0:z1]
fy = fit_y(zz)


def row_interp(rows, col):
    return np.interp(fy, rows[:, 0], rows[:, col])


sm = spec.get('edgeSmoothing', .012)
Fm = gauss_smooth(fit_to_world_y(row_interp(edges, 1)), VS, sm)
Bm = gauss_smooth(fit_to_world_y(row_interp(edges, 2)), VS, sm)
Ft = gauss_smooth(fit_to_world_y(row_interp(edges, 3)), VS, sm)
Bt = gauss_smooth(fit_to_world_y(row_interp(edges, 4)), VS, sm)
kz = smooth((fy-yf['topZero'])/(yf['topFull']-yf['topZero']))*smooth((yf['bottomZero']-fy)/(yf['bottomZero']-yf['bottomFull']))
dF = (Fm-Ft)*kz      # source minus target at the front edge (negative y is forward)
dB = (Bm-Bt)*kz
fx = np.array(spec['frontX']); bx = np.array(spec['backX'])
xsm = spec.get('xSmoothing', 0)     # optional smoothing (world z) of the lateral weight tables
full_f, end_f = (gauss_smooth(np.interp(fy, fx[:, 0], fx[:, c]), VS, xsm) for c in (1, 2))
full_b, end_b = (gauss_smooth(np.interp(fy, bx[:, 0], bx[:, c]), VS, xsm) for c in (1, 2))
LF, LB = spec.get('frontFade', .12), spec.get('backFade', .2)
ax = np.abs(xs)

hw = spec.get('halfWidth')
if hw:
    rows = np.array(hw['rows'])
    M = np.interp(fy, rows[:, 0], rows[:, 1])*H
    T = np.interp(fy, rows[:, 0], rows[:, 2])*H
    kx_z = smooth((fy-hw['fadeTop'][0])/(hw['fadeTop'][1]-hw['fadeTop'][0]))*smooth((hw['fadeBottom'][1]-fy)/(hw['fadeBottom'][1]-hw['fadeBottom'][0]))
    Lx = hw['lateralFade']
    sub = field[:, :, z0:z1].copy()
    mins = []
    for k in range(sub.shape[2]):
        Mk = T[k]+kx_z[k]*(M[k]-T[k])           # source half width at this slice (T when the weight is 0)
        inside = ax*(Mk/T[k])
        outside = Mk+(ax-T[k])*(T[k]+Lx-Mk)/Lx
        srcx = np.where(ax >= T[k]+Lx, ax, np.where(ax >= T[k], outside, inside))
        srcx = np.where(xs < 0, -srcx, srcx)
        d = np.diff(srcx)/VS
        mins.append(float(d.min()))
        if d.min() <= .1:
            raise ValueError('x warp folds at slice %d' % k)
        idx = np.clip((srcx-xs[0])/VS, 0, len(xs)-1.000001)
        i0 = np.floor(idx).astype(np.int64)
        f = (idx-i0).astype(np.float32)
        sub[:, :, k] = sub[i0, :, k]*(1-f)[:, None]+sub[i0+1, :, k]*f[:, None]
    field[:, :, z0:z1] = sub
    report['xPass'] = {'minDsrcDx': min(mins)}

sub = field[:, :, z0:z1].copy()
min_dy = 9.
yy = np.broadcast_to(ys[None, :], (len(xs), len(ys)))
for k in range(sub.shape[2]):
    wf = 1-smooth((ax-full_f[k])/(end_f[k]-full_f[k]))
    wb = 1-smooth((ax-full_b[k])/(end_b[k]-full_b[k]))
    ft, bt = Ft[k], Bt[k]
    fm = ft+wf*dF[k]                      # (x,) source front edge for each x
    bm = bt+wb*dB[k]
    front = yy+(fm-ft)[:, None]*(1-smooth((ft-yy)/LF))
    back = yy+(bm-bt)[:, None]*(1-smooth((yy-bt)/LB))
    mid = fm[:, None]+(yy-ft)*((bm-fm)/(bt-ft))[:, None]
    src = np.where(yy < ft, front, np.where(yy <= bt, mid, back))
    d = np.diff(src, axis=1)/VS
    min_dy = min(min_dy, float(d.min()))
    if d.min() <= .1:
        ix, iy = np.unravel_index(np.argmin(d), d.shape)
        raise ValueError(f'y warp folds: dsrc/dy {d.min():.3f} at x={xs[ix]:.3f} y={ys[iy]:.3f} z={zz[k]:.3f}')
    idy = np.clip((src-ys[0])/VS, 0, len(ys)-1.000001)
    j0 = np.floor(idy).astype(np.int64)
    f = (idy-j0).astype(np.float32)
    col = sub[:, :, k]
    sub[:, :, k] = np.take_along_axis(col, j0, axis=1)*(1-f)+np.take_along_axis(col, j0+1, axis=1)*f
field[:, :, z0:z1] = sub
report['yPass'] = {'minDsrcDy': min_dy, 'zSlices': int(z1-z0), 'zRange': [float(zz[0]), float(zz[-1])]}

bb = spec.get('beltBlur')
if bb:
    bz_top, bz_bot = bb['zRange']
    pad = 2*bb['zFade']+3*bb['sigma']
    zi = np.where((zs <= bz_top+pad) & (zs >= bz_bot-pad))[0]
    a, b = zi[0], zi[-1]+1
    blk = field[:, :, a:b]
    radius = int(math.ceil(3*bb['sigma']/VS))
    kern = np.exp(-.5*(np.arange(-radius, radius+1)*VS/bb['sigma'])**2)
    kern /= kern.sum()
    padded = np.pad(blk, ((0, 0), (0, 0), (radius, radius)), mode='edge')
    blurred = np.zeros_like(blk)
    for i, w in enumerate(kern):
        blurred += w*padded[:, :, i:i+blk.shape[2]]
    zb = zs[a:b]
    wz = smooth((bz_top+bb['zFade']-zb)/bb['zFade'])*smooth((zb-(bz_bot-bb['zFade']))/bb['zFade'])
    wx = 1-smooth((ax-bb['xFull'])/bb['xFade'])
    w = wx[:, None, None]*wz[None, None, :]
    target = np.minimum(blk, blurred) if bb.get('fillOnly') else blurred
    field[:, :, a:b] = (blk*(1-w)+target*w).astype(np.float32)
    report['beltBlur'] = {'zSlab': [float(zs[a]), float(zs[b-1])]}

edited = vdb.FloatGrid()
edited.background = BAND
edited.copyFromArray(field, ijk=(0, 0, 0))
vertices, tris, quads = edited.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo_index)*VS
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Torso reshaped body')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
rebuilt = bpy.data.objects.new(skin.name, mesh)
bpy.context.collection.objects.link(rebuilt)
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()
if material:
    rebuilt.data.materials.append(material)
for polygon in rebuilt.data.polygons:
    polygon.use_smooth = True
after = require_single_closed_mesh(rebuilt, args.out, 'Body after torso reshape')
old_name = skin.name
bpy.data.objects.remove(skin, do_unlink=True)
rebuilt.name = old_name

rng = np.random.default_rng(7)
sample = rng.choice(len(rebuilt.data.vertices), size=min(80000, len(rebuilt.data.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = rebuilt.data.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside if z_bot-.03 < co[2] < z_top+.03 else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
outputs = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Field-space x and y resampling of the trunk onto a side-profile station table; one meshing',
    'spec': spec, 'voxel': VS, 'skinBefore': source_stats, 'skinAfter': after, 'passes': report,
    'deviationOutsideTorsoSlab': {'sampled': int(len(outside)), 'maximum': float(outside.max()),
                                  'p99': float(np.percentile(outside, 99))},
    'deviationInsideTorsoSlab': {'sampled': int(len(inside)), 'maximum': float(inside.max()),
                                 'p99': float(np.percentile(inside, 99)), 'mean': float(inside.mean())},
    'outputs': outputs,
}
(args.out/'torso-reshape.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; torso reshape',
                'body': after, 'torsoReshape': {k: v for k, v in summary.items() if k != 'spec'},
                'outputs': outputs})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('torso reshape ok', json.dumps({'before': source_stats, 'after': after, 'outside': summary['deviationOutsideTorsoSlab']}))
