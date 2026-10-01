"""Reshape Akinza's neck base, trapezius slopes and shoulder caps (R05) as signed-distance edits, one meshing.

Run with Blender (through loop_tools.py blender):
  --python shape_neck_shoulders_field.py -- --body <shape.glb> --fairing <fairing.json> --out <new-dir> [--spec overrides.json]

The closed body skin becomes an OpenVDB level set. In a box over the neck base and shoulders, three edits:

  1. Silhouette cut. The target front/back outline of the neck, trapezius slope and cap (spec R05, in the figure's
     fit units, converted to world) is a closed 2D region in (|x|, z). Everything above that outline is removed by a
     smooth-max with the region's signed distance, extruded through the depth (y). Away from the neck the cut
     boundary is lifted toward the front and back faces by `lift`, so the top surface that remains stays a dome
     across the depth instead of a flat plateau.
  2. Back cut. Behind the shoulders the rearmost surface is made non-increasing outward from the spine: a plane that
     falls `slope` per unit of |x| from the surface at `probeX` removes the cap's rear bulge and the pocket that sat
     between the bulge and the upper back. Weighted in by |x| and by z so the spine and the arm are untouched.
  3. Smoothing only where the field changed: a Gaussian blur weighted by how far it moved, so there is no seam.

Nothing outside the box moves. Claws and every other object of the input file are carried unchanged. All numbers
are in the NS dict (world units unless noted); --spec merges a JSON of overrides into it and the merged dict is
written to shoulder-field.json. Akinza-specific construction, not a species-general backend.
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
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

H = 1.8605          # figure height the loop measures against
FLOOR = -.957

NS = {
    'voxel': .0025,
    # target outline of the character's left half, fit units (x from the neck midline, y down from the crown), from
    # spec R05 section 1, then a flare that stays outside the current arm so nothing below the cap is cut
    'outline': [[.040, .205], [.035, .220], [.030, .225], [.029, .230], [.028, .235], [.0278, .240], [.028, .245],
                [.0305, .250], [.038, .255], [.050, .260], [.060, .2625], [.070, .2645], [.080, .267],
                [.090, .271], [.100, .277], [.110, .285], [.120, .292], [.130, .298], [.140, .304],
                [.150, .3135], [.153, .320], [.1558, .330], [.1595, .340], [.163, .350], [.168, .362],
                [.176, .378], [.19, .40]],
    'cutBlend': .012,
    # lift of the cut boundary toward the front and back faces (world): c at the faces, 0 within h0 of ym
    'lift': {'c': .02, 'ym': -.04, 'h0': .03, 'h1': .075, 'zFull': .41, 'zZero': .435},
    'back': {'enable': True, 'slope': .10, 'x0': .10, 'xRamp': .04, 'zRamp': [.27, .30], 'zTop': [.40, .43],
             'probeX': .12, 'probeHalf': .012, 'blend': .015},
    # fill-only blur min(field, blur(field)) inside a weighted box: closes the groove between the chest and the cap
    # front without eroding convex forms; the box is in |x|, y, z world units
    'fill': {'enable': False, 'sigma': .02, 'x': [.09, .27], 'y': [-.13, -.03], 'z': [.27, .40], 'fade': .02},
    'blurSigma': .006,
    'blurPasses': 1,
    'changeScale': .01,
    'box': {'x': [-.36, .36], 'y': [-.22, .14], 'z': [.24, .47], 'fade': .03},
    'maxIslandVertices': 5000,
}


def merge(base, extra):
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            merge(base[key], value)
        else:
            base[key] = value
    return base


parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--fairing', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
if args.spec:
    merge(NS, json.loads(args.spec.read_text()))
record = json.loads(args.fairing.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Fairing record does not describe the supplied body')
provenance = snapshot(args.out, __file__, [args.body, args.fairing]+([args.spec] if args.spec else []))
VS = NS['voxel']
HALF_WIDTH = 18
BAND = HALF_WIDTH*VS

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.body.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in objects:
    transform = obj.matrix_world.copy()
    for vertex in obj.data.vertices:
        vertex.co = transform @ vertex.co
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bm.to_mesh(obj.data); bm.free()
body = max(objects, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(body, args.out, 'Neck and shoulder input')
source_stats = mesh_stats(body)
body_material = body.data.materials[0] if body.data.materials else material('Continuous construction clay', .38)

body.data.calc_loop_triangles()
points = np.empty(len(body.data.vertices)*3, dtype=np.float32)
body.data.vertices.foreach_get('co', points)
points = points.reshape(-1, 3)
triangles = np.empty(len(body.data.loop_triangles)*3, dtype=np.int32)
body.data.loop_triangles.foreach_get('vertices', triangles)
triangles = triangles.reshape(-1, 3)
grid = vdb.FloatGrid.createLevelSetFromPolygons(
    points, triangles=triangles, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF_WIDTH)


# ---- field helpers ---------------------------------------------------------------------------------
def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    k = np.maximum(k, 1e-6)
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def blur(values, sigma):
    radius = int(math.ceil(3*sigma/VS))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)*VS/sigma)**2)
    kernel /= kernel.sum()
    for axis in range(3):
        pad = [(0, 0)]*3
        pad[axis] = (radius, radius)
        padded = np.pad(values, pad, mode='edge')
        total = np.zeros_like(values)
        for offset, weight in enumerate(kernel):
            index = [slice(None)]*3
            index[axis] = slice(offset, offset+values.shape[axis])
            total += weight*padded[tuple(index)]
        values = total
    return values


def polygon_sdf(px, pz, poly, boundary_edges):
    """Signed distance (positive outside) from points to a closed polygon in the plane, brute force.
    Only the first `boundary_edges` edges are real boundary; the rest close the region for the inside test."""
    best = np.full(px.shape, 1e9)
    inside = np.zeros(px.shape, dtype=bool)
    n = len(poly)
    for i in range(n):
        ax, az = poly[i]
        bx, bz = poly[(i+1) % n]
        ex, ez = bx-ax, bz-az
        length2 = ex*ex+ez*ez
        t = np.clip(((px-ax)*ex+(pz-az)*ez)/max(length2, 1e-12), 0, 1)
        if i < boundary_edges:
            best = np.minimum(best, np.hypot(px-(ax+t*ex), pz-(az+t*ez)))
        crosses = ((az > pz) != (bz > pz))
        with np.errstate(divide='ignore', invalid='ignore'):
            xi = ax+(pz-az)*ex/np.where(ez == 0, 1e-12, ez)
        inside ^= crosses & (px < xi)
    return np.where(inside, -best, best)


def to_world(point):
    return point[0]*H, FLOOR+H*(1-point[1])


# ---- the edit --------------------------------------------------------------------------------------
box = NS['box']
low = np.array([box['x'][0], box['y'][0], box['z'][0]])
high = np.array([box['x'][1], box['y'][1], box['z'][1]])
lo_idx = np.floor(low/VS).astype(int)
hi_idx = np.ceil(high/VS).astype(int)
shape = tuple(int(v) for v in hi_idx-lo_idx+1)
native = np.empty(shape, dtype=np.float32)
grid.copyToArray(native, ijk=tuple(int(v) for v in lo_idx))
native = native.astype(np.float64)
axes = [(lo_idx[i]+np.arange(shape[i]))*VS for i in range(3)]
X, Y, Z = np.meshgrid(axes[0], axes[1], axes[2], indexing='ij', sparse=True)
AX = np.abs(X)

# 1. silhouette cut
outline = [to_world(p) for p in NS['outline']]
region = [(0., outline[0][1])]+outline+[(outline[-1][0], -.6), (0., -.6)]
px = np.repeat(AX[:, 0, 0][:, None], shape[2], axis=1)
pz = np.repeat(Z[0, 0, :][None, :], shape[0], axis=0)
sdf2 = polygon_sdf(px, pz, region, len(outline)).reshape(shape[0], 1, shape[2])
lf = NS['lift']
lift_y = smooth((np.abs(Y-lf['ym'])-lf['h0'])/(lf['h1']-lf['h0']))
lift_z = 1-smooth((Z-lf['zFull'])/(lf['zZero']-lf['zFull']))
cut = sdf2-lf['c']*lift_y*lift_z
edited = smax(native, cut, NS['cutBlend'])

# 2. back cut: the rearmost surface falls monotonically outward from the spine
bk = NS['back']
back_report = {}
if bk['enable']:
    # rearmost native surface (largest y with field < 0) at |x| near probeX, per z row
    back_a = np.full(shape[2], np.nan)
    sel = (np.abs(AX[:, 0, 0]-bk['probeX']) <= bk['probeHalf'])
    for k in range(shape[2]):
        slab = native[sel, :, k]
        inside_y = np.where((slab < 0).any(axis=0))[0]
        if len(inside_y):
            back_a[k] = axes[1][inside_y.max()]
    good = ~np.isnan(back_a)
    back_a = np.interp(np.arange(shape[2]), np.where(good)[0], back_a[good])
    back_a = np.convolve(np.pad(back_a, 6, mode='edge'), np.ones(13)/13, mode='valid')
    back_plane = back_a.reshape(1, 1, -1)-bk['slope']*np.maximum(AX-bk['x0'], 0)
    cut_b = Y-back_plane
    wx = smooth((AX-bk['x0'])/bk['xRamp'])
    wz = smooth((Z-bk['zRamp'][0])/(bk['zRamp'][1]-bk['zRamp'][0]))*(1-smooth((Z-bk['zTop'][0])/(bk['zTop'][1]-bk['zTop'][0])))
    cut_applied = smax(edited, cut_b, bk['blend'])
    edited = edited+wx*wz*(cut_applied-edited)
    back_report = {'rearAtProbe': {f'{axes[2][k]:.3f}': float(back_a[k]) for k in range(0, shape[2], 8)}}

# 2b. front groove fill
fl = NS['fill']
if fl['enable']:
    def band(coord, lo, hi):
        return smooth((coord-lo)/fl['fade'])*smooth((hi-coord)/fl['fade'])
    wf = band(AX, *fl['x'])*band(Y, *fl['y'])*band(Z, *fl['z'])
    filled = np.minimum(edited, blur(edited, fl['sigma']))
    edited = edited+wf*(filled-edited)

# 3. smoothing only where the field moved
for _ in range(NS['blurPasses']):
    moved = smooth(np.abs(edited-native)/NS['changeScale'])
    edited = edited+moved*(blur(edited, NS['blurSigma'])-edited)

fade = box['fade']
window = np.ones(shape)
for ax, coord in enumerate((X, Y, Z)):
    window = window*smooth((coord-low[ax])/fade)*smooth((high[ax]-coord)/fade)
final = native+window*(edited-native)
final = np.clip(final, -BAND, BAND).astype(np.float32)
grid.copyFromArray(final, ijk=tuple(int(v) for v in lo_idx))
max_change = float(np.max(np.abs(final-native.astype(np.float32))))
del native, edited, final, window, cut, sdf2

# ---- mesh once -------------------------------------------------------------------------------------
vertices, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Neck and shoulder rebuilt body')
mesh.from_pydata(vertices.astype(np.float64).tolist(), [], faces)
mesh.update()
rebuilt = bpy.data.objects.new('akinza_field_body', mesh)
bpy.context.collection.objects.link(rebuilt)
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
rebuilt.data.materials.append(body_material)
for polygon in rebuilt.data.polygons:
    polygon.use_smooth = True
bm = bmesh.new(); bm.from_mesh(rebuilt.data)
bm.verts.ensure_lookup_table()
seen, islands = set(), []
for start in bm.verts:
    if start in seen:
        continue
    comp, queue = [start], [start]
    seen.add(start)
    while queue:
        a = queue.pop()
        for e in a.link_edges:
            b = e.other_vert(a)
            if b not in seen:
                seen.add(b); queue.append(b); comp.append(b)
    islands.append(comp)
islands.sort(key=len, reverse=True)
removed = []
for comp in islands[1:]:
    if len(comp) <= NS['maxIslandVertices']:
        removed.append({'vertices': len(comp)})
        bmesh.ops.delete(bm, geom=comp, context='VERTS')
bm.to_mesh(rebuilt.data); bm.free()
require_single_closed_mesh(rebuilt, args.out, 'Neck and shoulder rebuilt body')
bpy.data.objects.remove(body, do_unlink=True)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))

summary = {'approval': None, 'stageProvenanceSha256': provenance,
           'scope': 'Neck base, trapezius slopes and shoulder caps reshaped in field space: silhouette cut, back cut, local blur, one meshing',
           'voxel': VS, 'source': source_stats, 'body': mesh_stats(rebuilt), 'ns': NS, 'maxFieldChange': max_change,
           'back': back_report, 'removedIslands': removed}
(args.out/'shoulder-field.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; neck and shoulder reshape',
                'body': mesh_stats(rebuilt),
                'neckShoulderReshape': {k: v for k, v in summary.items() if k != 'ns'},
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('neck and shoulder reshape done', json.dumps({'maxChange': max_change}))
