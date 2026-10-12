"""Head silhouette and skull shaping for the Akinza head, in field space plus a smooth vertex warp (round 1, R01).

Run with Blender: -b --factory-startup --python shape_head_silhouette_field.py --
  --scene <head.blend> --spec <silhouette.json> --out <new-dir>

The head skin (the largest mesh) becomes an OpenVDB level set in head-local coordinates. Every option is opt-in; an
absent key does nothing, so earlier runs stay reproducible.
  top_smooth:  a windowed Gaussian morph over the roof between the ear roots removes the small nubs on the crown.
  rear_smooth: the same morph over the rear centre melts the shingle patch and the arc that bounds the disc into one
               surface. `passes` repeats the blur; `fade` may be [x, y, z] and `quintic` uses a C2 ramp. A fade shorter
               than about 10 times the relief change leaves a visible crease at the window edge (head-0208).
  skull:       one ellipsoid joined with a smooth union (`blend`) gives a round crown and occiput that rise from the
               fan instead of ending in a disc. The field is meshed once, so there are no seams.
The optional `warp` is a smooth vertex displacement of the skin after meshing (no resampling): `tilt_left` and
`tilt_left_low` lower the character's right (-x) fan, `front_pull` draws the forward lip of the fan back in y,
`rear_low_pull` brings the lower rear in, `inner_rim_lower` and `inner_rim_lower_left` sink the roof beside the crown (top surface only), `forehead_pull` sets the brow back in y, `nape_pull` draws the lower back of
the head in toward the neck (it also squashes the neck stem, head-0221: use `nape_pull_gentle`, which tapers to zero above the stem
and keeps the surface slope under 1), `wing_recess` sets the fan wings back from the rear centre so the centre
stands proud. Each is weighted to zero near the face; eyes, nose and mouth are untouched. Akinza-specific.
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
spec = json.loads(args.spec.read_text())
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before silhouette shaping')
before = mesh_stats(head)
VS = spec['voxel']
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
before_top = float(points[:, 2].max())
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
HALF = 12
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid


def box_slices(low, high):
    a = np.clip(np.floor(np.array(low)/VS).astype(int)-lo, 0, np.array(shape)-1)
    b = np.clip(np.ceil(np.array(high)/VS).astype(int)-lo+1, 0, np.array(shape))
    return tuple(slice(int(i), int(j)) for i, j in zip(a, b))


def coordinates(slices):
    axes = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(slices)]
    return np.meshgrid(*axes, indexing='ij')


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smootherstep(t):
    """C2 ramp: the window weights of a large blur use it so the morph leaves no visible crease."""
    t = np.clip(t, 0, 1)
    return t*t*t*(t*(t*6-15)+10)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def gaussian(volume, sigma):
    radius = int(math.ceil(3*sigma/VS))
    offsets = np.arange(-radius, radius+1)
    kernel = np.exp(-.5*(offsets*VS/sigma)**2)
    kernel /= kernel.sum()
    out = volume.astype(np.float32)
    for axis in range(3):
        padded = np.pad(out, [(radius, radius) if a == axis else (0, 0) for a in range(3)], mode='edge')
        acc = np.zeros_like(out)
        for k, w in zip(offsets, kernel):
            index = [slice(None)]*3
            index[axis] = slice(radius+int(k), radius+int(k)+out.shape[axis])
            acc += np.float32(w)*padded[tuple(index)]
        out = acc
    return out


record = {}


def windowed_blur(name, cfg, mirror):
    """Weighted morph of the field to its Gaussian blur inside a smooth-edged box (|x| range when mirrored)."""
    sides = (1, -1) if mirror else (1,)
    for side in sides:
        xs = sorted([side*cfg['x'][0], side*cfg['x'][1]]) if mirror else cfg['x']
        fade = cfg['fade'] if isinstance(cfg['fade'], list) else [cfg['fade']]*3
        ramp = smootherstep if cfg.get('quintic') else smoothstep
        pad = 3*cfg['sigma']*cfg.get('passes', 1)**.5+max(fade)
        sl = box_slices([xs[0]-pad, cfg['y'][0]-pad, cfg['z'][0]-pad], [xs[1]+pad, cfg['y'][1]+pad, cfg['z'][1]+pad])
        X, Y, Z = coordinates(sl)
        native = field[sl].copy()
        blurred = native
        for _ in range(cfg.get('passes', 1)):
            blurred = gaussian(blurred, cfg['sigma'])
        ax = np.abs(X) if mirror else X
        lo_x, hi_x = (cfg['x'][0], cfg['x'][1])
        w = (ramp((ax-lo_x)/fade[0])*ramp((hi_x-ax)/fade[0])
             * ramp((Y-cfg['y'][0])/fade[1])*ramp((cfg['y'][1]-Y)/fade[1])
             * ramp((Z-cfg['z'][0])/fade[2])*ramp((cfg['z'][1]-Z)/fade[2])).astype(np.float32)
        change = w*(blurred-native)
        field[sl] = native+change
        record.setdefault(name, []).append({'side': side, 'maximumFieldChange': float(np.abs(change).max())})


if spec.get('top_smooth'):
    cfg = spec['top_smooth']
    windowed_blur('topSmooth', {**cfg, 'x': [-cfg['half_width'], cfg['half_width']]}, False)
if spec.get('rear_smooth'):
    cfg = spec['rear_smooth']
    windowed_blur('rearSmooth', {**cfg, 'x': [-cfg['half_width'], cfg['half_width']]}, False)

for index, sk in enumerate(spec.get('skulls', [])):
    c, r = np.array(sk['center']), np.array(sk['radii'])
    reach = r+sk['blend']*2+.02
    sl = box_slices(c-reach, c+reach)
    X, Y, Z = coordinates(sl)
    q = np.sqrt(((X-c[0])/r[0])**2+((Y-c[1])/r[1])**2+((Z-c[2])/r[2])**2)
    distance = ((q-1)*r.min()).astype(np.float32)
    # The ellipsoid distance must stay unclamped: clamping it to the band makes smin shift the whole box (head-0208 and
    # head-0214 showed the box edges as creases). Only the result is clamped.
    field[sl] = np.clip(smin(field[sl], distance, sk['blend']), -BAND, BAND).astype(np.float32)
    record.setdefault('skulls', []).append({'center': sk['center'], 'radii': sk['radii'], 'blend': sk['blend']})

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(field, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with shaped silhouette')
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


def remove_small_components(obj, max_vertices, max_extent):
    """Drop isolated flecks (thin spine tips that voxelize into a few vertices), recording each one."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, removed = set(bm.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex)
                        group.add(vertex)
                        queue.append(vertex)
        bounds = [[min(v.co[i] for v in group) for i in range(3)], [max(v.co[i] for v in group) for i in range(3)]]
        extent = max(bounds[1][i]-bounds[0][i] for i in range(3))
        if len(group) <= max_vertices and extent <= max_extent:
            removed.append({'vertices': len(group), 'maxExtent': extent, 'bounds': bounds})
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return removed


removed_flecks = remove_small_components(head, max_vertices=60, max_extent=.02)


def sm(t):
    return smoothstep(t)


def q5(t):
    return smootherstep(t)


def apply_warp(w):
    """Smooth vertex displacement of the skin, in head-local coordinates. Zero near the face and eyes."""
    verts = head.data.vertices
    P = np.empty(len(verts)*3, dtype=np.float32)
    verts.foreach_get('co', P)
    P = P.reshape(-1, 3).astype(np.float64)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    bz = sm((z-.25)/.15)
    ramp = sm((np.abs(x)-.3)/.6)
    dx, dy, dz = np.zeros_like(z), np.zeros_like(z), np.zeros_like(z)
    dz += -w.get('tilt_left', 0)*(x < 0)*ramp*bz
    dz += -w.get('tilt_left_low', 0)*(x < 0)*sm((np.abs(x)-.25)/.4)*(1-sm((z-.35)/.2))*sm((z+.05)/.2)
    dy += w.get('front_pull', 0)*sm((-y-.05)/.25)*bz*sm((np.abs(x)-.25)/.2)
    dy += -w.get('rear_low_pull', 0)*sm((y-.05)/.25)*(1-sm((z-.05)/.3))
    dz += -w.get('inner_rim_lower', 0)*sm((np.abs(x)-.12)/.1)*(1-sm((np.abs(x)-.5)/.2))*sm((z-.30)/.15)
    dz += -w.get('inner_rim_lower_left', 0)*sm((-x-.05)/.25)*(1-sm((-x-.6)/.3))*(x < 0)*sm((z-.30)/.15)
    dy += w.get('forehead_pull', 0)*sm((z-.12)/.2)*sm((-y)/.15)*(1-sm((np.abs(x)-.35)/.2))
    dy += -w.get('nape_pull', 0)*sm((y-.0)/.1)*sm((-.08-z)/.1)
    dy += -w.get('nape_pull_gentle', 0)*q5(y/.1)*q5((-.02-z)/.2)*(1-q5((-.18-z)/.14))
    dy += -w.get('wing_recess', 0)*sm((np.abs(x)-.3)/.25)*sm((y-.10)/.15)*sm((z+.1)/.2)*(1-sm((z-.4)/.15))
    moved = np.sqrt(dx**2+dy**2+dz**2)
    P[:, 0] += dx; P[:, 1] += dy; P[:, 2] += dz
    verts.foreach_set('co', P.astype(np.float32).ravel())
    head.data.update()
    return {'maximumDisplacement': float(moved.max()), 'movedVertices': int((moved > 1e-6).sum())}


if spec.get('warp'):
    record['warp'] = apply_warp(spec['warp'])
require_single_closed_mesh(head, args.out, 'Head skin with shaped silhouette')
after_points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'silhouette-shape.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Crown and occiput skull ellipsoid, top and rear smoothing in field space, then a smooth vertex warp of the fan; eyes, nose and mouth preserved',
    'spec': spec, 'record': record, 'removedFlecks': removed_flecks,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'skinTopZBefore': before_top, 'skinTopZAfter': float(after_points[:, 2].max()),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
