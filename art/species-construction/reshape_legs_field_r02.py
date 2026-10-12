"""Reshape the Akinza hind legs to a station table of edge positions, in field space.

Run with Blender: -b --factory-startup --python reshape_legs_field.py --
  --scene <body.blend> --fairing <fairing.json> --spec <leg-reshape.json> --out <new-dir> [--voxel .0025]

The body becomes an OpenVDB level set. For each leg the current silhouette edges (medial and lateral in x,
front and back in y) are measured from the mesh slice by slice, a target edge pair per slice comes from the
spec's station table (half widths about a straight leg axis, in figure-height units), and the field is
resampled along x and then along y so the current edges land on the target edges:

  x pass: F'(x, y, z) = F(src(x), y, z), src piecewise linear in the leg's own coordinate u = side*x:
          [tLo, tHi] maps onto [mLo, mHi], outside the leg the map is a shift that fades to the identity
          toward the midline (xFade) and behind the leg (yFade), and the whole warp fades in z (zTop, zBottom).
  y pass: the leg's depth is scaled about its measured center by (target depth / measured depth), masked to the
          leg in x, fading in z (depthTop, depthBottom), so thigh depth is not touched above the knee.

Sampling maps are checked for monotonicity, the field is meshed once, and every parameter lives in the spec.
Edge measurement and smoothing parameters are in the spec too. Akinza-specific; new options default to the
behavior of earlier runs. Opt-in spec keys added in round 2 attempt B: axisShift (lateral leg translation rows y, dx),
depthAnchorFrac (depth scaled about front+frac*depth), scaleSmoothing (sigma in z for the depth ratio and anchor),
kneePlane (x, z, halfX, halfZ, amplitude, yReach: a convex plane on the front of the knee).
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

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if any(abs(skin.matrix_world[i][j]-(1 if i == j else 0)) > 1e-9 for i in range(4) for j in range(4)):
    raise ValueError('The skin has a non-identity object transform')
require_single_closed_mesh(skin, args.out, 'Body before leg reshape')
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
    padded = np.pad(values, radius, mode='edge')
    return np.convolve(padded, kernel, mode='valid')


def fade_z(z, top, bottom):
    """1 between the two fade bands, smooth to 0 above `top` pair and below `bottom` pair."""
    up = smooth((top[0]-z)/(top[0]-top[1]))
    down = smooth((z-bottom[1])/(bottom[0]-bottom[1]))
    return up*down


# Station table -> target edges in world units, per slice height.
st = np.array(spec['stations'], dtype=np.float64)       # rows: y, lateral, medial
dt = np.array(spec['depthStations'], dtype=np.float64)  # rows: y, depth
axis = np.array(spec['axis'], dtype=np.float64)         # rows: world z, world |x|
STEP = spec.get('sliceStep', .004)
z_top, z_bot = spec['zRange']
slice_z = np.arange(z_top, z_bot-1e-9, -STEP)
fit_y = 1-(slice_z-FLOOR)/H
order = np.argsort(axis[:, 0])
ax_x = np.interp(slice_z, axis[order, 0], axis[order, 1])
# extend the axis linearly below its last station
slope = (axis[order[0], 1]-axis[order[1], 1])/(axis[order[0], 0]-axis[order[1], 0])
below = slice_z < axis[order[0], 0]
ax_x[below] = axis[order[0], 1]+slope*(slice_z[below]-axis[order[0], 0])
if 'axisShift' in spec:
    # optional lateral translation of the whole target leg (fit-unit rows: y, outward dx), eased by xTop/xBottom
    sh = np.array(spec['axisShift'], dtype=np.float64)
    ax_x = ax_x+np.interp(fit_y, sh[:, 0], sh[:, 1])*H
t_hi = ax_x+np.interp(fit_y, st[:, 0], st[:, 1])*H
t_lo = ax_x-np.interp(fit_y, st[:, 0], st[:, 2])*H
t_depth = np.interp(fit_y, dt[:, 0], dt[:, 1])*H
t_hi = gauss_smooth(t_hi, STEP, spec.get('targetSmoothing', .006))
t_lo = gauss_smooth(t_lo, STEP, spec.get('targetSmoothing', .006))
t_depth = gauss_smooth(t_depth, STEP, spec.get('targetSmoothing', .006))


def measure(side):
    """Medial/lateral x edge (as u = side*x) and y range of one leg at each slice height."""
    m_lo, m_hi, y_lo, y_hi = [], [], [], []
    u = side*points[:, 0]
    for z in slice_z:
        y_cap = np.interp(-z, [-spec['frontOnlyAbove'], -spec['frontOnlyBelow']], [spec['yCapTop'], spec['yCapBottom']])
        sel = (np.abs(points[:, 2]-z) < spec.get('sliceBand', .004)) & (u > spec['uMin']) & (u < spec['uMax']) \
              & (points[:, 1] < y_cap)
        p = points[sel]
        if len(p) < 30:
            raise ValueError(f'Too few vertices at z={z:.3f} side {side}')
        uu = side*p[:, 0]
        m_lo.append(np.percentile(uu, .5)); m_hi.append(np.percentile(uu, 99.5))
        yy = p[:, 1]
        # depth is measured on the leg's own x range so neighboring masses do not count
        y_lo.append(np.percentile(yy, .5)); y_hi.append(np.percentile(yy, 99.5))
    sm = spec.get('measureSmoothing', .012)
    return [gauss_smooth(np.array(a), STEP, sm) for a in (m_lo, m_hi, y_lo, y_hi)]


def lerp_field_z(values, z_query):
    return np.interp(z_query, slice_z[::-1], values[::-1])


report = {}
yfade = spec['yFade']
x_fade = spec['xFade']
for side in (1, -1):
    m_lo, m_hi, y_lo, y_hi = measure(side)
    if 'freezeBelow' in spec:
        # below the ankle the paw begins and silhouette edges are not the leg's: carry the offsets of the last
        # measured slice (edge shifts and depth ratio) down so the fade eases the warp out instead of measuring the paw
        f = int(np.argmin(np.abs(slice_z-spec['freezeBelow'])))
        below = np.arange(len(slice_z)) > f
        m_lo = np.where(below, t_lo+(m_lo[f]-t_lo[f]), m_lo)
        m_hi = np.where(below, t_hi+(m_hi[f]-t_hi[f]), m_hi)
        ratio = (y_hi[f]-y_lo[f])/t_depth[f]
        yc = (y_hi[f]+y_lo[f])/2
        y_lo = np.where(below, yc-t_depth*ratio/2, y_lo)
        y_hi = np.where(below, yc+t_depth*ratio/2, y_hi)
    m_depth = y_hi-y_lo
    # depthAnchorFrac (default .5, the center): the depth is scaled about y_lo+frac*depth, so a smaller fraction
    # keeps the front edge nearer where it is and lets the back (calf) carry the change
    y_center = y_lo+spec.get('depthAnchorFrac', .5)*m_depth
    report[f'side{side:+d}'] = {
        'z': slice_z.tolist(), 'measuredLo': m_lo.tolist(), 'measuredHi': m_hi.tolist(),
        'targetLo': t_lo.tolist(), 'targetHi': t_hi.tolist(),
        'measuredDepth': m_depth.tolist(), 'targetDepth': t_depth.tolist(), 'yCenter': y_center.tolist()}
    zi = np.where((zs <= z_top) & (zs >= z_bot))[0]
    z0, z1 = zi[0], zi[-1]+1
    zz = zs[z0:z1]
    kx = fade_z(zz, spec['xTop'], spec['xBottom'])
    ky = fade_z(zz, spec['depthTop'], spec['depthBottom'])
    mlo, mhi = lerp_field_z(m_lo, zz), lerp_field_z(m_hi, zz)
    tlo, thi = lerp_field_z(t_lo, zz), lerp_field_z(t_hi, zz)
    # x range of this side
    xm = np.where(side*xs > x_fade[0]-.01)[0]
    x0, x1 = xm[0], xm[-1]+1
    sub = field[x0:x1, :, z0:z1].astype(np.float32)
    U = side*xs[x0:x1]
    # --- x pass
    wy = 1-smooth((ys-yfade[0])/(yfade[1]-yfade[0]))                      # (y)
    x0f, lat_len = x_fade
    src = np.empty(sub.shape, dtype=np.float32)
    for k in range(sub.shape[2]):
        # piecewise linear and monotone: medial anchor x0f stays, the leg's edges land on the target edges,
        # and the lateral side blends back to the identity over lat_len
        inside = mlo[k]+(U-tlo[k])*(mhi[k]-mlo[k])/(thi[k]-tlo[k])
        medial = x0f+(U-x0f)*(mlo[k]-x0f)/(tlo[k]-x0f)
        lateral = mhi[k]+(U-thi[k])*(thi[k]+lat_len-mhi[k])/lat_len
        mapped = np.where(U >= thi[k]+lat_len, U, np.where(U >= thi[k], lateral,
                          np.where(U >= tlo[k], inside, np.where(U > x0f, medial, U))))
        # behind the leg the map fades to the identity (2D weight)
        src[:, :, k] = U[:, None]+(wy[None, :]*kx[k])*(mapped[:, None]-U[:, None])
    src_x = side*src  # world x of the source position
    d = np.diff(src_x, axis=0)/VS
    if d.min() <= .1:
        ix, iy, iz = np.unravel_index(np.argmin(d), d.shape)
        raise ValueError(f'x warp folds: minimum dsrc/dx {d.min():.3f} on side {side} at x={xs[x0+ix]:.3f} '
                         f'y={ys[iy]:.3f} z={zz[iz]:.3f}')
    idx = np.clip((src_x-xs[x0])/VS, 0, sub.shape[0]-1.000001)
    i0 = np.floor(idx).astype(np.int64)
    frac = (idx-i0).astype(np.float32)
    warped = (np.take_along_axis(sub, i0, axis=0)*(1-frac)+np.take_along_axis(sub, i0+1, axis=0)*frac).astype(np.float32)
    report[f'side{side:+d}']['minimumDsrcDx'] = float(d.min())
    # --- y pass about the leg's measured center, masked to the leg in x
    scale = m_depth/np.maximum(t_depth, 1e-4)
    if spec.get('scaleSmoothing', 0) > 0:
        # smooth the depth ratio and anchor along z so measurement noise does not print ripple bands on the shin
        scale = gauss_smooth(scale, STEP, spec['scaleSmoothing'])
        y_center = gauss_smooth(y_center, STEP, spec['scaleSmoothing'])
    scale_z = lerp_field_z(scale, zz)
    yc_z = lerp_field_z(y_center, zz)
    xm_lo, xm_hi = tlo-spec['yMaskMargin'], thi+spec['yMaskMargin']
    srcy = np.empty(warped.shape, dtype=np.float32)
    Y = ys[None, :]
    for k in range(warped.shape[2]):
        wxm = smooth((U-xm_lo[k])/spec['yMaskFade'])*(1-smooth((U-xm_hi[k])/spec['yMaskFade']))
        s = 1+ky[k]*(scale_z[k]-1)
        sy = yc_z[k]+(Y-yc_z[k])*s
        srcy[:, :, k] = Y+wxm[:, None]*(sy-Y)
    dy = np.diff(srcy, axis=1)/VS
    if dy.min() <= .1:
        raise ValueError(f'y warp folds: minimum dsrc/dy {dy.min():.3f} on side {side}')
    idy = np.clip((srcy-ys[0])/VS, 0, warped.shape[1]-1.000001)
    j0 = np.floor(idy).astype(np.int64)
    fy = (idy-j0).astype(np.float32)
    final = (np.take_along_axis(warped, j0, axis=1)*(1-fy)+np.take_along_axis(warped, j0+1, axis=1)*fy).astype(np.float32)
    field[x0:x1, :, z0:z1] = final
    report[f'side{side:+d}']['minimumDsrcDy'] = float(dy.min())

kp = spec.get('kneePlane')
if kp:
    # a flat, slightly convex kneecap plane on the front of each knee: the field is lowered by a smooth bump
    # (positive amplitude pushes the surface forward by about that many world units)
    for side in (1, -1):
        cx, cz = side*kp['x'], kp['z']
        zz_i = np.where((zs > cz-3*kp['halfZ']) & (zs < cz+3*kp['halfZ']))[0]
        xx_i = np.where((xs > cx-3*kp['halfX']) & (xs < cx+3*kp['halfX']))[0]
        # the front surface y at the center, from the current mesh
        near = (np.abs(points[:, 2]-cz) < .01) & (np.abs(points[:, 0]-cx) < .03)
        front_y = float(points[near, 1].min())
        wx = np.exp(-((xs[xx_i]-cx)/kp['halfX'])**4)
        wz = np.exp(-((zs[zz_i]-cz)/kp['halfZ'])**4)
        wy = np.exp(-((ys-front_y)/kp['yReach'])**2)
        bump = kp['amplitude']*wx[:, None, None]*wy[None, :, None]*wz[None, None, :]
        block = field[xx_i[0]:xx_i[-1]+1, :, zz_i[0]:zz_i[-1]+1]
        field[xx_i[0]:xx_i[-1]+1, :, zz_i[0]:zz_i[-1]+1] = (block-bump).astype(np.float32)
        report[f'kneePlane{side:+d}'] = {'frontY': front_y, 'center': [cx, cz]}

edited = vdb.FloatGrid()
edited.background = BAND
edited.copyFromArray(field, ijk=(0, 0, 0))
vertices, tris, quads = edited.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo_index)*VS
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Leg reshaped body')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
rebuilt = bpy.data.objects.new(skin.name, mesh)
bpy.context.collection.objects.link(rebuilt)
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
if material:
    rebuilt.data.materials.append(material)
for polygon in rebuilt.data.polygons:
    polygon.use_smooth = True
after = require_single_closed_mesh(rebuilt, args.out, 'Body after leg reshape')
old_name = skin.name
bpy.data.objects.remove(skin, do_unlink=True)
rebuilt.name = old_name

rng = np.random.default_rng(7)
sample = rng.choice(len(rebuilt.data.vertices), size=min(80000, len(rebuilt.data.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = rebuilt.data.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    is_in = abs(co[0]) > x_fade[0]-.03 and z_bot-.03 < co[2] < z_top+.03 and co[1] < yfade[1]+.02
    (inside if is_in else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
outputs = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Field-space x and y resampling of the hind legs onto a station table; one meshing', 'spec': spec,
    'voxel': VS, 'skinBefore': source_stats, 'skinAfter': after, 'slices': report,
    'deviationOutsideLegBox': {'sampled': int(len(outside)), 'maximum': float(outside.max()),
                               'p99': float(np.percentile(outside, 99))},
    'deviationInsideLegBox': {'sampled': int(len(inside)), 'maximum': float(inside.max()),
                              'p99': float(np.percentile(inside, 99)), 'mean': float(inside.mean())},
    'outputs': outputs,
}
(args.out/'leg-reshape.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; leg reshape',
                'body': after, 'legReshape': {k: v for k, v in summary.items() if k != 'slices'},
                'outputs': outputs})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('leg reshape ok', json.dumps({'before': source_stats, 'after': after, 'outside': summary['deviationOutsideLegBox']}))
