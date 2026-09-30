"""Smooth shading bands, the shoulder shelf and chest facets of the Akinza body in field space.

Run with Blender: -b --factory-startup --python smooth_torso_field.py --
  --scene <body.blend> --fairing <fairing.json> --out <new-dir> [--voxel .0025]

The neck-and-shoulder warp (warp_neck_field.py) applies piecewise-linear depth and
width tables to the upper body. Their knots leave curvature ridges that read as
horizontal light bands across the chest and upper arm, and the source body has a
flat shelf where the shoulder meets the neck. This stage converts the closed body
to an OpenVDB level set, replaces the field inside a few compact ellipsoidal
regions by a Gaussian-blurred copy (the same weighted morph LIMB_REGIONS uses, with
volume compensation so thin parts keep their thickness) and meshes the field once.
Nothing outside the regions moves by more than the remeshing tolerance.

Every parameter lives in REGIONS; defaults reproduce this run. Akinza-specific.
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
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--regions', type=Path, help='optional JSON list replacing REGIONS')
parser.add_argument('--dry-run', action='store_true', help='report the chest ease and stop before meshing')
parser.add_argument('--chest-ease', type=Path, help='optional JSON: replace the chest front profile between two z anchors by a smooth Hermite curve')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)

# Blur regions, applied in order. compensation dilates by about sigma**2/(2r) for
# the local radius r so blurring does not thin the form.
# sigma is a scalar or an (x, y, z) triple; a long z sigma erases horizontal bands
# without thinning a vertical limb.
REGIONS = []
for side in [1, -1]:
    REGIONS.append({'name': f'upper arm {side:+d}', 'center': [side*.28, -.03, .27],
                    'radii': [.10, .10, .17], 'sigma': [.005, .005, .030], 'compensation': 0.0})
REGIONS.append({'name': 'upper chest and back', 'center': [0, -.02, .30], 'radii': [.26, .20, .15],
                'sigma': [.010, .010, .035], 'compensation': 0.0})
for side in [1, -1]:
    REGIONS.append({'name': f'shoulder shelf {side:+d}', 'center': [side*.13, -.02, .408],
                    'radii': [.10, .16, .045], 'sigma': .020, 'compensation': 0.0})
if args.regions:
    REGIONS = json.loads(args.regions.read_text())

provenance = snapshot(args.out, __file__, [args.scene, args.fairing] + ([args.regions] if args.regions else [])
                      + ([args.chest_ease] if args.chest_ease else []))
record = json.loads(args.fairing.read_text())
VS = args.voxel

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if any(abs(skin.matrix_world[i][j]-(1 if i == j else 0)) > 1e-9 for i in range(4) for j in range(4)):
    raise ValueError('The skin has a non-identity object transform')
require_single_closed_mesh(skin, args.out, 'Body before torso smoothing')
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


def box_slices(low, high):
    a = np.clip(np.floor(np.array(low)/VS).astype(int)-lo_index, 0, np.array(shape)-1)
    b = np.clip(np.ceil(np.array(high)/VS).astype(int)-lo_index+1, 0, np.array(shape))
    return tuple(slice(int(i), int(j)) for i, j in zip(a, b))


def coordinates(slices):
    axes = [(lo_index[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(slices)]
    return np.meshgrid(*axes, indexing='ij')


def gaussian(volume, sigmas):
    """Separable Gaussian; sigmas is one value per axis (x, y, z), zero skips an axis."""
    out = volume.astype(np.float32)
    for axis in range(3):
        sigma = sigmas[axis]
        if sigma <= 0:
            continue
        radius = int(math.ceil(3*sigma/VS))
        offsets = np.arange(-radius, radius+1)
        kernel = np.exp(-.5*(offsets*VS/sigma)**2)
        kernel /= kernel.sum()
        padded = np.pad(out, [(radius, radius) if a == axis else (0, 0) for a in range(3)], mode='edge')
        acc = np.zeros_like(out)
        for k, w in zip(offsets, kernel):
            index = [slice(None)]*3
            index[axis] = slice(radius+int(k), radius+int(k)+out.shape[axis])
            acc += np.float32(w)*padded[tuple(index)]
        out = acc
    return out


records = []
for region in REGIONS:
    center, radii = np.array(region['center']), np.array(region['radii'])
    sigma = np.broadcast_to(np.array(region['sigma'], dtype=float), (3,)).copy()
    sl = box_slices(center-radii-3*sigma, center+radii+3*sigma)
    X, Y, Z = coordinates(sl)
    native = field[sl].astype(np.float32)
    blurred = gaussian(native, sigma)
    r2 = ((X-center[0])/radii[0])**2+((Y-center[1])/radii[1])**2+((Z-center[2])/radii[2])**2
    weight = (np.maximum(0, 1-r2)**2).astype(np.float32)
    change = weight*(blurred-native-np.float32(region['compensation']))
    field[sl] = native+change
    records.append({**region, 'maximumFieldChange': float(np.max(np.abs(change)))})

chest_record = None
if args.chest_ease:
    # The neck-and-shoulder warp leaves a chest that is vertical up to about z .24 and then a plane tilted about
    # 39 degrees, joined over only .05 in z: the corner reads as a horizontal light band. Replace the front
    # profile between two anchors by a cubic Hermite curve that keeps each anchor's height and slope, so the
    # tilt grows over the whole span instead of at one corner. The change is a column-wise shift of the field
    # along y, weighted to the front wall (the interior is untouched), and fades out to the sides.
    spec = json.loads(args.chest_ease.read_text())
    args.chest_x_zero = spec['xZero']
    za, zb = spec['za'], spec['zb']
    x_full, x_zero = spec['xFull'], spec['xZero']
    y_solid, y_blend = spec['ySolid'], spec['yBlend']
    slope_h = spec.get('slopeHalfWidth', .02)
    xs_i = np.arange(field.shape[0])
    ys = (lo_index[1]+np.arange(field.shape[1]))*VS
    xs = (lo_index[0]+xs_i)*VS
    zs = (lo_index[2]+np.arange(field.shape[2]))*VS
    xi = np.where(np.abs(xs) <= x_zero)[0]
    zi = np.where((zs >= za-2*slope_h-2*VS) & (zs <= zb+2*slope_h+2*VS))[0]
    sub = field[xi[0]:xi[-1]+1, :, zi[0]:zi[-1]+1]
    inside = sub < 0
    first = np.argmax(inside, axis=1)                       # first solid voxel from the front, (x, z)
    has = inside.any(axis=1)
    jj = np.clip(first, 1, sub.shape[1]-1)
    f_out = np.take_along_axis(sub, (jj-1)[:, None, :], axis=1)[:, 0, :]
    f_in = np.take_along_axis(sub, jj[:, None, :], axis=1)[:, 0, :]
    t_cross = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
    y_front = ys[jj-1]+t_cross*VS                           # (x, z) front surface height
    zsub = zs[zi[0]:zi[-1]+1]
    xsub = xs[xi[0]:xi[-1]+1]

    def at_z(z):
        return int(np.argmin(np.abs(zsub-z)))
    ia, ib = at_z(za), at_z(zb)
    step = max(1, int(round(slope_h/VS)))
    if spec.get('order') == 'quintic-measured':
        # Match slope and curvature of the native profile at both anchors (the anchor at zb looks only downward,
        # because the neck starts just above it), so the new curve joins the untouched surface without a crease.
        ya_c, yb_c, dz = y_front[:, ia], y_front[:, ib], zsub[ib]-zsub[ia]
        h = step*VS
        m_a = (y_front[:, ia+step]-y_front[:, ia-step])/(2*h)
        c_a = (y_front[:, ia+step]-2*y_front[:, ia]+y_front[:, ia-step])/h**2
        m_b = (3*y_front[:, ib]-4*y_front[:, ib-step]+y_front[:, ib-2*step])/(2*h)
        c_b = (y_front[:, ib]-2*y_front[:, ib-step]+y_front[:, ib-2*step])/h**2
        if spec.get('endCurvature') is not None:
            c_a = np.full_like(c_a, spec['endCurvature'])
            c_b = np.full_like(c_b, spec['endCurvature'])
    else:
        m_a = (y_front[:, ia+step]-y_front[:, ia-step])/(zsub[ia+step]-zsub[ia-step])
        m_b = (y_front[:, ib+step]-y_front[:, ib-step])/(zsub[ib+step]-zsub[ib-step])
        if spec.get('startSlope') is not None:
            m_a = np.full_like(m_a, spec['startSlope'])
        ya_c, yb_c, dz = y_front[:, ia], y_front[:, ib], zsub[ib]-zsub[ia]
    t = np.clip((zsub[None, :]-zsub[ia])/dz, 0, 1)
    if spec.get('order') == 'quintic-measured':
        H = (1-10*t**3+15*t**4-6*t**5, t-6*t**3+8*t**4-3*t**5, .5*t**2-1.5*t**3+1.5*t**4-.5*t**5,
             .5*t**3-t**4+.5*t**5, -4*t**3+7*t**4-3*t**5, 10*t**3-15*t**4+6*t**5)
        target = (H[0]*ya_c[:, None]+H[1]*(dz*m_a)[:, None]+H[2]*(dz**2*c_a)[:, None]
                  +H[3]*(dz**2*c_b)[:, None]+H[4]*(dz*m_b)[:, None]+H[5]*yb_c[:, None])
    elif spec.get('order', 'cubic') == 'quintic':
        # Zero end curvature as well (the native chest is straight on both sides of the corner), so no new crease.
        h_a, h_ma, h_mb, h_b = (1-10*t**3+15*t**4-6*t**5, t-6*t**3+8*t**4-3*t**5,
                                -4*t**3+7*t**4-3*t**5, 10*t**3-15*t**4+6*t**5)
        target = h_a*ya_c[:, None]+h_ma*(dz*m_a)[:, None]+h_mb*(dz*m_b)[:, None]+h_b*yb_c[:, None]
    else:
        h00, h10, h01, h11 = 2*t**3-3*t**2+1, t**3-2*t**2+t, -2*t**3+3*t**2, t**3-t**2
        target = h00*ya_c[:, None]+h10*(dz*m_a)[:, None]+h01*yb_c[:, None]+h11*(dz*m_b)[:, None]
    inband = ((zsub >= zsub[ia]) & (zsub <= zsub[ib]))[None, :]
    raw_shift = np.where(inband & has, target-y_front, 0.0)                    # (x, z)
    if spec.get('xValid') is not None:
        # Beyond xValid the front wall is the shoulder, not the chest: hold the last chest column's shift.
        valid = np.abs(xsub) <= spec['xValid']
        edge_left, edge_right = np.where(valid)[0][0], np.where(valid)[0][-1]
        raw_shift[:edge_left] = raw_shift[edge_left]
        raw_shift[edge_right+1:] = raw_shift[edge_right]
    if spec.get('xSigma', 0) > 0:
        radius = int(math.ceil(3*spec['xSigma']/VS))
        kernel = np.exp(-.5*(np.arange(-radius, radius+1)*VS/spec['xSigma'])**2)
        kernel /= kernel.sum()
        padded = np.pad(raw_shift, [(radius, radius), (0, 0)], mode='edge')
        raw_shift = sum(w*padded[k:k+raw_shift.shape[0]] for k, w in enumerate(kernel))
    wx = 1-np.clip((np.abs(xsub)-x_full)/(x_zero-x_full), 0, 1)
    wx = wx*wx*(3-2*wx)
    shift = wx[:, None]*raw_shift                                              # (x, z)
    wy = 1-np.clip((ys-y_solid)/y_blend, 0, 1)
    wy = wy*wy*(3-2*wy)                                                        # 1 at the front, 0 inside the chest
    src = ys[None, :, None]-shift[:, None, :]*wy[None, :, None]                # sample position along y
    idx = np.clip((src-ys[0])/VS, 0, len(ys)-1.000001)
    j0 = np.floor(idx).astype(np.int64)
    frac = (idx-j0).astype(np.float32)
    shifted = (np.take_along_axis(sub, j0, axis=1)*(1-frac)+np.take_along_axis(sub, j0+1, axis=1)*frac).astype(np.float32)
    field[xi[0]:xi[-1]+1, :, zi[0]:zi[-1]+1] = shifted
    slopes = np.diff(np.where(inband, target, np.nan), axis=1)/np.diff(zsub)[None, :]
    chest_record = {'minimumTargetSlopeInBand': float(np.nanmin(slopes)), 'spec': spec, 'maximumShift': float(np.abs(shift).max()),
                    'shiftAtCenterColumn': [[round(float(zsub[k]), 4), round(float(shift[len(xsub)//2, k]), 5)] for k in range(0, len(zsub), 8)]}
    chest_record['shiftByColumn'] = [[round(float(xsub[i]), 4), round(float(np.abs(shift[i]).max()), 5),
                                      round(float(zsub[int(np.argmax(np.abs(shift[i])))]), 4)] for i in range(0, len(xsub), 8)]
    chest_record['frontHeightAnchors'] = [[round(float(xsub[i]), 4), round(float(ya_c[i]), 4), round(float(yb_c[i]), 4),
                                           round(float(m_a[i]), 3), round(float(m_b[i]), 3)] for i in range(0, len(xsub), 8)]
    print('chest ease', json.dumps(chest_record))
    if args.dry_run:
        sys.exit(0)

edited = vdb.FloatGrid()
edited.background = BAND
edited.copyFromArray(field, ijk=(0, 0, 0))
vertices, tris, quads = edited.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo_index)*VS
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Torso smoothed body')
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
after = require_single_closed_mesh(rebuilt, args.out, 'Body after torso smoothing')
old_name = skin.name
bpy.data.objects.remove(skin, do_unlink=True)
rebuilt.name = old_name

# Deviation from the input surface, split into inside and outside the edit regions.


def in_edit(co):
    for region in REGIONS:
        margin = 3*float(np.max(region['sigma']))+.01
        if sum(((co[i]-region['center'][i])/(region['radii'][i]+margin))**2 for i in range(3)) < 1:
            return True
    if chest_record and abs(co[0]) < args.chest_x_zero+.01 and .12 < co[2] < .40 and co[1] < .0:
        return True
    return False


rng = np.random.default_rng(7)
sample = rng.choice(len(rebuilt.data.vertices), size=min(80000, len(rebuilt.data.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = rebuilt.data.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside if in_edit(co) else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)
if not len(inside):
    inside = np.zeros(1)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
outputs = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Field-space smoothing of chest bands, shoulder shelf and upper arm; one meshing',
    'voxel': VS, 'regions': records, 'chestEase': chest_record, 'skinBefore': source_stats, 'skinAfter': after,
    'deviationOutsideEdit': {'sampled': int(len(outside)), 'maximum': float(outside.max()),
                             'p99': float(np.percentile(outside, 99))},
    'deviationInsideEdit': {'sampled': int(len(inside)), 'maximum': float(inside.max()),
                            'p99': float(np.percentile(inside, 99)), 'mean': float(inside.mean())},
    'outputs': outputs,
}
(args.out/'torso-smooth.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; torso and shoulder field smoothing',
                'body': after, 'torsoSmoothing': {k: v for k, v in summary.items() if k != 'regions'},
                'outputs': outputs})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('smooth ok', json.dumps({'before': source_stats, 'after': after,
                               'outside': summary['deviationOutsideEdit'], 'inside': summary['deviationInsideEdit']}))
