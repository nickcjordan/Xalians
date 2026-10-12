"""Rebuild Akinza's hind paws (R09) in field space from a graded toe arch, an instep mass and sheathed claws.

Run with Blender (through loop_tools.py blender):
  --python rebuild_hind_paws_field.py -- --body <shape.glb> --fairing <fairing.json> --out <new-dir> [--spec overrides.json]

A hind-paw-only pass: the leg above the morph band, the forepaws, the tails, the tail root and every other region
of the input body are left exactly as they are. The closed body becomes an OpenVDB level set. Per leg, in a box
around the foot, in the foot's own frame (U lateral, V forward negative, z world, origin at the ankle centre
measured on the input at z -.805):

  1. Ankle column. An elliptical column measured from the input leg at z -.83 (centre, half extents and the
     centre's drift per unit of z measured between -.80 and -.84) carries the leg down into the paw, so the leg
     above the band stays exactly as an earlier leg reshape left it.
  2. Paw. Four toe lobes (graded in size, the middle two leading, the outer two set back and splayed), a
     broad flat body mass under the toes, an instep mass (the high lateral shoulder of the paw), one straight
     dorsum slope from the ankle front to the toe bases and a round heel, joined by smooth minima. The sole is
     the floor plane (smooth maximum), so each toe lies on the floor along its middle.
  3. Morph. A weighted blend of the input field and the paw field across a z band that starts below the leg's
     frozen region, so no cut, ledge or fillet ring appears. Below the band the field is wholly the new paw.

Eight pale claws (four per foot) leave the toe tips: root sheathed inside the toe, pitched down
along the toe's yaw, curving down along its front face. The old hind claws are replaced; the forepaw claws stay.
All numbers are in the PAW dict (world units); --spec merges a JSON of overrides into it and the merged dict is
written to hind-paw-field.json. Akinza-specific construction, not a species-general backend.
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
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

PAW = {
    # ankle origin: the section of the input leg at this z
    'originZ': -.805,
    # column measured from the input leg here; centre drift per unit z from the two stations below
    'columnZ': -.830, 'driftZ': [-.800, -.840], 'columnBottomZ': -.905, 'columnBottomBlend': .02,
    'columnWidthScale': 1.0, 'columnDepthScale': 1.0,
    # morph band: weight 0 (input field) at the first z, 1 (paw field) at the second
    'morph': [-.838, -.872],
    # toes: centre (U, V, z), radii (U, V, z), yaw about z in degrees (positive swings the tip lateral)
    'toes': [
        {'center': [-.023, -.122, -.931], 'radii': [.022, .030, .027], 'yaw': -6},
        {'center': [.033, -.130, -.923], 'radii': [.028, .036, .034], 'yaw': -1},
        {'center': [.090, -.128, -.922], 'radii': [.028, .036, .035], 'yaw': 4},
        {'center': [.145, -.106, -.924], 'radii': [.024, .029, .032], 'yaw': 14},
    ],
    'body': {'center': [.060, -.068, -.924], 'radii': [.092, .082, .047]},
    'instep': {'center': [.062, -.028, -.906], 'radii': [.066, .040, .038]},
    'dorsum': {'a': [.006, -.010, -.874], 'b': [.054, -.098, -.914], 'ra': .030, 'rb': .029},
    'heel': {'center': [.004, .008, -.918], 'radii': [.050, .036, .040]},
    'blend': {'toeToToe': .006, 'toeToPad': .014, 'paw': .026, 'floor': .004},
    # claws, one per toe. The root is placed on the toe's own front surface at rootZ and moved `shift` along the
    # toe's forward axis (negative = inside the toe); length is along the curve, pitch is degrees below the toe's
    # own forward direction before the curl, the curl is straight down. A claw may instead give an explicit
    # `base` (U, V, z) as the first spec version did. The spec's explicit bases left the claws buried in the toe
    # (only a slit showed, body-0307); thicker claws moved .0035 forward and bent harder show as hooks.
    'claws': [
        {'toe': 0, 'rootZ': -.9135, 'shift': -.004, 'length': .040, 'radius': .0095, 'bend': .95, 'pitch': 32},
        {'toe': 1, 'rootZ': -.9065, 'shift': -.004, 'length': .046, 'radius': .0105, 'bend': 1.0, 'pitch': 36},
        {'toe': 2, 'rootZ': -.9065, 'shift': -.004, 'length': .046, 'radius': .0105, 'bend': 1.0, 'pitch': 36},
        {'toe': 3, 'rootZ': -.9085, 'shift': -.004, 'length': .040, 'radius': .0095, 'bend': 1.0, 'pitch': 36},
    ],
    'box': {'U': [-.10, .26], 'V': [-.30, .16], 'z': [-.98, -.82], 'fade': .012},
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
parser.add_argument('--voxel', type=float, default=.0025)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
if args.spec:
    merge(PAW, json.loads(args.spec.read_text()))
record = json.loads(args.fairing.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Fairing record does not describe the supplied body')
provenance = snapshot(args.out, __file__, [args.body, args.fairing]+([args.spec] if args.spec else []))
FLOOR = record.get('groundContact', {}).get('floorZ', -.957)
VS = args.voxel
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
require_single_closed_mesh(body, args.out, 'Hind paw rebuild input')
source_stats = mesh_stats(body)
body_material = body.data.materials[0] if body.data.materials else material('Continuous construction clay', .38)
old_hind = [o for o in objects if o != body and 'hind claw' in o.name.lower()]
claw_material = old_hind[0].data.materials[0] if old_hind and old_hind[0].data.materials else material('Pale curved claw', .74)
for o in old_hind:
    bpy.data.objects.remove(o, do_unlink=True)

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


def ellipse_distance(qu, qv, qa, ru, rv, ra):
    """Approximate distance to an ellipsoid (first order, as in the other paw code)."""
    e0, e1, e2 = qu/ru, qv/rv, qa/ra
    k0 = np.sqrt(e0*e0+e1*e1+e2*e2)
    k1 = np.sqrt((qu/(ru*ru))**2+(qv/(rv*rv))**2+(qa/(ra*ra))**2)
    return k0*(k0-1)/np.maximum(k1, 1e-9)


def yaw_ellipsoid(U, V, Z, center, radii, yaw_deg):
    """Ellipsoid whose long (V) axis is swung by yaw about z; positive yaw points the tip lateral (+U)."""
    y = math.radians(yaw_deg)
    dU, dV, dZ = U-center[0], V-center[1], Z-center[2]
    along = dU*math.sin(y)-dV*math.cos(y)    # toward the toe tip
    across = dU*math.cos(y)+dV*math.sin(y)
    return ellipse_distance(across, along, dZ, radii[0], radii[1], radii[2])


def segment_capsule(U, V, Z, a, b, ra, rb):
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b-a
    qu, qv, qz = U-a[0], V-a[1], Z-a[2]
    h = np.clip((qu*ba[0]+qv*ba[1]+qz*ba[2])/float(ba@ba), 0, 1)
    d = np.sqrt((qu-ba[0]*h)**2+(qv-ba[1]*h)**2+(qz-ba[2]*h)**2)
    return d-(ra+(rb-ra)*h)


def build_claw(spec, material_):
    """Tapered claw swept along a quadratic curve that bends toward its curl."""
    rings, segments = 24, 20
    base = Vector(spec['base']); forward = Vector(spec['forward']).normalized()
    curl = Vector(spec['curl']).normalized()
    curl = (curl-forward*curl.dot(forward)).normalized()
    length, bend = spec['length'], spec['bend']
    centers, tangents = [], []
    for j in range(rings+1):
        t = j/rings
        centers.append(base+forward*length*t*(1-.35*bend*t)+curl*length*bend*.55*t*t)
        tangents.append((forward*(1-.7*bend*t)+curl*length*bend*1.1*t/length).normalized())
    verts, faces = [], []
    for j, (c, tangent) in enumerate(zip(centers, tangents)):
        side_axis = tangent.cross(curl).normalized()
        up_axis = side_axis.cross(tangent).normalized()
        radius = spec['radius']*(1-j/rings)**.85
        if j == rings:
            verts.append(tuple(c)); break
        for i in range(segments):
            a = math.tau*i/segments
            verts.append(tuple(c+side_axis*radius*.8*math.cos(a)+up_axis*radius*math.sin(a)))
    tip = len(verts)-1
    for j in range(rings-1):
        for i in range(segments):
            k = (i+1) % segments
            faces.append((j*segments+i, j*segments+k, (j+1)*segments+k, (j+1)*segments+i))
    last = (rings-1)*segments
    for i in range(segments):
        faces.append((last+i, last+(i+1) % segments, tip))
    faces.append(tuple(reversed(range(segments))))
    mesh = bpy.data.meshes.new(spec['name'])
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(spec['name'], mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh); bm.free()
    obj.data.materials.append(material_)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    require_single_closed_mesh(obj, args.out, spec['name'])
    return obj, [tuple(c) for c in centers]


def section(side, z, band=.004, y_limit=.12, x_min=.15):
    """Centre and half extents of one leg at height z, measured from the input."""
    sel = points[(np.abs(points[:, 2]-z) < band) & (points[:, 1] < y_limit) & (side*points[:, 0] > x_min)]
    if len(sel) < 40:
        raise ValueError(f'Insufficient native section on side {side} at z={z}')
    low, high = sel[:, :2].min(axis=0), sel[:, :2].max(axis=0)
    return (low+high)/2, (high-low)/2


# ---- per-side field edit -----------------------------------------------------------------------------
report = {'sides': {}}
claw_specs = []
for side in (1, -1):
    origin, origin_half = section(side, PAW['originZ'])
    ax, ay = float(origin[0]), float(origin[1])
    col_c, col_h = section(side, PAW['columnZ'])
    top_c, _ = section(side, PAW['driftZ'][0])
    bot_c, _ = section(side, PAW['driftZ'][1])
    dz = PAW['driftZ'][1]-PAW['driftZ'][0]
    # drift of the centre per unit z, in the paw frame (U lateral positive, V forward negative)
    drift_u = float(side*(bot_c[0]-top_c[0])/dz)
    drift_v = float((bot_c[1]-top_c[1])/dz)
    col_u0, col_v0 = float(side*(col_c[0]-ax)), float(col_c[1]-ay)
    half_u, half_v = float(col_h[0])*PAW['columnWidthScale'], float(col_h[1])*PAW['columnDepthScale']
    box = PAW['box']
    u0, u1, v0, v1, z0, z1 = box['U'][0], box['U'][1], box['V'][0], box['V'][1], box['z'][0], box['z'][1]
    xs = sorted([ax+side*u0, ax+side*u1])
    low = np.array([xs[0], ay+v0, z0]); high = np.array([xs[1], ay+v1, z1])
    lo_idx = np.floor(low/VS).astype(int)
    hi_idx = np.ceil(high/VS).astype(int)
    shape = tuple(int(v) for v in hi_idx-lo_idx+1)
    native = np.empty(shape, dtype=np.float32)
    grid.copyToArray(native, ijk=tuple(int(v) for v in lo_idx))
    native = native.astype(np.float64)
    axes = [(lo_idx[i]+np.arange(shape[i]))*VS for i in range(3)]
    X, Y, Z = np.meshgrid(axes[0], axes[1], axes[2], indexing='ij', sparse=True)
    U, V = side*(X-ax), Y-ay

    # 1. ankle column, centre drifting with z, elliptical section
    cu = col_u0+drift_u*(Z-PAW['columnZ'])
    cv = col_v0+drift_v*(Z-PAW['columnZ'])
    column = ellipse_distance(U-cu, V-cv, np.zeros_like(Z+U), half_u, half_v, .5*(half_u+half_v))
    column = smax(column, PAW['columnBottomZ']-Z, PAW['columnBottomBlend'])

    # 2. paw
    blend = PAW['blend']
    toes = None
    for toe in PAW['toes']:
        value = yaw_ellipsoid(U, V, Z, toe['center'], toe['radii'], toe['yaw'])
        toes = value if toes is None else smin(toes, value, blend['toeToToe'])
    b, ins, dors, heel = PAW['body'], PAW['instep'], PAW['dorsum'], PAW['heel']
    pad = yaw_ellipsoid(U, V, Z, b['center'], b['radii'], 0)
    instep = yaw_ellipsoid(U, V, Z, ins['center'], ins['radii'], 0)
    dorsum = segment_capsule(U, V, Z, dors['a'], dors['b'], dors['ra'], dors['rb'])
    heel_f = yaw_ellipsoid(U, V, Z, heel['center'], heel['radii'], 0)
    mass = smin(smin(smin(smin(column, heel_f, blend['paw']), dorsum, blend['paw']), pad, blend['paw']),
                instep, blend['paw'])
    paw = smin(mass, toes, blend['toeToPad'])
    paw = smax(paw, FLOOR-Z, blend['floor'])
    paw = np.minimum(paw, BAND)

    # 3. morph from the input field to the paw field across the band
    m0, m1 = PAW['morph']
    w = smooth((Z-m0)/(m1-m0))
    merged = (1-w)*native+w*paw
    fade = box['fade']
    window = np.ones(shape)
    for axis_i, coord in enumerate((X, Y, Z)):
        window = window*smooth((coord-low[axis_i])/fade)*smooth((high[axis_i]-coord)/fade)
    final = native+window*(merged-native)
    final = np.clip(final, -BAND, BAND).astype(np.float32)
    grid.copyFromArray(final, ijk=tuple(int(v) for v in lo_idx))
    report['sides'][f'{side:+d}'] = {
        'origin': [ax, ay], 'originHalf': origin_half.tolist(),
        'column': {'centerUV': [col_u0, col_v0], 'half': [half_u, half_v], 'drift': [drift_u, drift_v]},
        'box': [low.tolist(), high.tolist()], 'shape': list(shape),
        'maxChange': float(np.max(np.abs(final-native.astype(np.float32))))}
    del native, column, toes, pad, instep, dorsum, heel_f, mass, paw, merged, final, window

    # claws, in the toe's own forward direction, root sheathed in the toe tip
    for i, c in enumerate(PAW['claws']):
        toe = PAW['toes'][c['toe']]
        yaw = math.radians(toe['yaw'])
        if 'base' in c:
            base_uv = c['base']
        else:
            cx, cy, cz = toe['center']; rx, ry, rz = toe['radii']
            face = ry*math.sqrt(max(0., 1-((c['rootZ']-cz)/rz)**2))
            base_uv = [cx+math.sin(yaw)*(face+c['shift']), cy-math.cos(yaw)*(face+c['shift']), c['rootZ']]
        pitch = math.radians(c['pitch'])
        forward_uv = (math.sin(yaw)*math.cos(pitch), -math.cos(yaw)*math.cos(pitch), -math.sin(pitch))
        claw_specs.append({
            'name': f'Curved hind claw {side:+d} {i+1}',
            'base': [ax+side*base_uv[0], ay+base_uv[1], base_uv[2]],
            'forward': [side*forward_uv[0], forward_uv[1], forward_uv[2]], 'curl': [0, 0, -1],
            'length': c['length'], 'bend': c['bend'], 'radius': c['radius']})

# ---- mesh once ---------------------------------------------------------------------------------------
vertices, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Hind paw rebuilt body')
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
# drop small closed islands (a thin remnant of removed material) and record them
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
            b_ = e.other_vert(a)
            if b_ not in seen:
                seen.add(b_); queue.append(b_); comp.append(b_)
    islands.append(comp)
islands.sort(key=len, reverse=True)
removed = []
for comp in islands[1:]:
    if len(comp) <= 5000:
        xs_ = [v.co.x for v in comp]; ys_ = [v.co.y for v in comp]; zs_ = [v.co.z for v in comp]
        removed.append({'vertices': len(comp), 'x': [min(xs_), max(xs_)], 'y': [min(ys_), max(ys_)], 'z': [min(zs_), max(zs_)]})
        bmesh.ops.delete(bm, geom=comp, context='VERTS')
bm.to_mesh(rebuilt.data); bm.free()
report['removedIslands'] = removed
require_single_closed_mesh(rebuilt, args.out, 'Hind paw rebuilt body')
bpy.data.objects.remove(body, do_unlink=True)
claw_paths = {}
claws = []
for spec in claw_specs:
    obj, path = build_claw(spec, claw_material)
    claws.append(obj)
    claw_paths[spec['name']] = {'root': path[0], 'tip': path[-1]}
claw_minimums = {c.name: min(v.co.z for v in c.data.vertices) for c in claws}
if any(z < FLOOR-.00002 for z in claw_minimums.values()):
    raise ValueError('A claw passes below the floor')

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
           'scope': 'Hind paws rebuilt in field space: ankle column, graded toe arch, instep mass, round heel, sheathed claws; one meshing',
           'voxel': VS, 'source': source_stats, 'body': mesh_stats(rebuilt), 'paw': PAW, 'report': report,
           'floorZ': FLOOR, 'claws': claw_specs, 'clawPaths': claw_paths, 'clawMinimumZ': claw_minimums}
(args.out/'hind-paw-field.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; hind paw rebuild',
                'body': mesh_stats(rebuilt), 'hindPawRebuild': {k: v for k, v in summary.items() if k != 'paw'},
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('hind paw rebuild done', json.dumps({k: v['maxChange'] for k, v in report['sides'].items()}))
