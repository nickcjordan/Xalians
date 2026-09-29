"""Rebuild paws and the tail root of a closed body in signed-distance space.

Run with Blender: -b --factory-startup --python rebuild_body_field.py --
  --body <shape.glb> --tail-record <fairing.json> --out <new-dir>

The closed body becomes an OpenVDB level set. Edits happen on the distance
field and the field is meshed once, so every blend is a smooth union rather
than a Boolean seam followed by vertex smoothing:

* hind paws: the native leg morphs across the ankle into an analytic paw
  (ankle, heel, sloped dorsum, pad mass, four toe lobes) whose sole is
  intersected with the floor plane for planted contact;
* forepaws: rebuilt after accepted study 0020, with the dorsum facing out, the
  palm facing the thigh, four digits spread front to back and claws curling
  toward the palm;
* tails (optional): distal sweeps rebuilt from new controls onto the tail-free
  torso, keeping the accepted root and proximal fan;
* knees, calves and forearms: bounded plain blurs remove small lumps;
* tail root: bounded fill-only blurs close the crease and round the sheer side
  wall where the fan meets the pelvis, then a light blur rounds the lip.

Akinza-specific construction, not a species-general sculpting backend.
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
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from blender_probe import aim
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--tail-record', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--tail-blur-sigma', type=float, default=.011)
parser.add_argument('--tail-fill-sigma', type=float, default=.022)
parser.add_argument('--tail-side-sigma', type=float, default=.032)
parser.add_argument('--skip-tail-root', action='store_true')
parser.add_argument('--skip-limb-smoothing', action='store_true')
# Optional tail rebuild: new sweep controls plus the tail-free torso they fuse onto.
parser.add_argument('--tail-controls', type=Path)
parser.add_argument('--tail-free-body', type=Path)
parser.add_argument('--tail-sweep-sigma', type=float, default=.005)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
record = json.loads(args.tail_record.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Tail and contact record does not describe the supplied body')
if bool(args.tail_controls) != bool(args.tail_free_body):
    raise ValueError('A tail rebuild needs both --tail-controls and --tail-free-body')
provenance = snapshot(args.out, __file__, [args.body, args.tail_record]
                      +([args.tail_controls, args.tail_free_body] if args.tail_controls else []))
FLOOR = record.get('groundContact', {}).get('floorZ', -.957)
VS = args.voxel

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
require_single_closed_mesh(body, args.out, 'Field rebuild input')
source_stats = mesh_stats(body)
body_material = body.data.materials[0] if body.data.materials else material('Continuous construction clay', .38)
old_claws = [o for o in objects if o != body]
# Accepted paw study 0020 and the preferred first sheet both show pale claws.
claw_material = material('Pale curved claw', .74)
claw_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .35

body.data.calc_loop_triangles()
points = np.empty(len(body.data.vertices)*3, dtype=np.float32)
body.data.vertices.foreach_get('co', points)
points = points.reshape(-1, 3)
triangles = np.empty(len(body.data.loop_triangles)*3, dtype=np.int32)
body.data.loop_triangles.foreach_get('vertices', triangles)
triangles = triangles.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], triangles.tolist())

HALF_WIDTH = 18
grid = vdb.FloatGrid.createLevelSetFromPolygons(
    points, triangles=triangles, transform=vdb.createLinearTransform(voxelSize=VS),
    halfWidth=HALF_WIDTH)
BAND = HALF_WIDTH*VS
lo_index = np.floor(points.min(axis=0)/VS).astype(int)-24
hi_index = np.ceil(points.max(axis=0)/VS).astype(int)+24
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


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def ellipsoid(p, center, radii):
    q = [(p[i]-center[i])/radii[i] for i in range(3)]
    k0 = np.sqrt(q[0]**2+q[1]**2+q[2]**2)
    k1 = np.sqrt((q[0]/radii[0])**2+(q[1]/radii[1])**2+(q[2]/radii[2])**2)
    return k0*(k0-1)/np.maximum(k1, 1e-9)


def capsule(p, a, b, ra, rb, scale=(1, 1, 1)):
    """Tapered capsule; scale squashes the local cross-section per world axis."""
    q = [(p[i]-a[i])/scale[i] for i in range(3)]
    ba = [(b[i]-a[i])/scale[i] for i in range(3)]
    h = np.clip((q[0]*ba[0]+q[1]*ba[1]+q[2]*ba[2])/sum(c*c for c in ba), 0, 1)
    d = np.sqrt(sum((q[i]-ba[i]*h)**2 for i in range(3)))
    return (d-(ra+(rb-ra)*h))*min(scale)


def section(side, z, band=.004, y_limit=.12, x_min=.15):
    """Center and half extents of one leg or arm at height z, measured from the input."""
    sel = points[(np.abs(points[:, 2]-z) < band) & (points[:, 1] < y_limit)
                 & (side*points[:, 0] > x_min)]
    if len(sel) < 40:
        raise ValueError(f'Insufficient native section on side {side} at z={z}')
    low, high = sel[:, :2].min(axis=0), sel[:, :2].max(axis=0)
    return (low+high)/2, (high-low)/2


edits = {}
claw_specs = []
tail_controls = record['tailControls']

# Tail rebuild ------------------------------------------------------------
def catmull_samples(controls):
    """The same Catmull-Rom sampling as blender_probe.tube, including radii."""
    c = np.array(controls, dtype=np.float64)
    out = []
    for i in range(len(c)-1):
        a, b, cc, d = c[max(0, i-1)], c[i], c[i+1], c[min(len(c)-1, i+2)]
        for j in range(12):
            t = j/12
            out.append(.5*((2*b)+(-a+cc)*t+(2*a-5*b+4*cc-d)*t*t+(-a+3*b-3*cc+d)*t**3))
    out.append(c[-1])
    return np.array(out)


def separable_blur(values, width):
    """Gaussian blur by shifted sums; edge values are repeated at the box border."""
    radius = int(math.ceil(3*width/VS))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)*VS/width)**2)
    kernel /= kernel.sum()
    for axis_index in range(3):
        pad = [(0, 0)]*3
        pad[axis_index] = (radius, radius)
        padded = np.pad(values, pad, mode='edge')
        total = np.zeros_like(values)
        for offset, weight in enumerate(kernel):
            index = [slice(None)]*3
            index[axis_index] = slice(offset, offset+values.shape[axis_index])
            total += weight*padded[tuple(index)]
        values = total
    return values


def sweep_field(sweeps, slices):
    """Distance to round sweeps with linearly varying radius, per segment box."""
    result = np.full(tuple(s.stop-s.start for s in slices), BAND, dtype=np.float64)
    for samples in sweeps:
        for a, b in zip(samples[:-1], samples[1:]):
            ra, rb = max(.0015, max(a[3], a[4])), max(.0015, max(b[3], b[4]))
            reach = max(ra, rb)+BAND
            low = np.minimum(a[:3], b[:3])-reach
            high = np.maximum(a[:3], b[:3])+reach
            local = box_slices(low, high)
            inner = tuple(slice(max(l.start, s.start), min(l.stop, s.stop)) for l, s in zip(local, slices))
            if any(i.stop <= i.start for i in inner):
                continue
            X, Y, Z = coordinates(inner)
            ba = b[:3]-a[:3]
            h = np.clip(((X-a[0])*ba[0]+(Y-a[1])*ba[1]+(Z-a[2])*ba[2])/float(ba@ba), 0, 1)
            d = np.sqrt((X-a[0]-ba[0]*h)**2+(Y-a[1]-ba[1]*h)**2+(Z-a[2]-ba[2]*h)**2)-(ra+(rb-ra)*h)
            view = tuple(slice(i.start-s.start, i.stop-s.start) for i, s in zip(inner, slices))
            result[view] = np.minimum(result[view], d)
    return result


if args.tail_controls:
    new_controls = json.loads(args.tail_controls.read_text())['tailControls']
    old_sweeps = [catmull_samples(c) for c in tail_controls]
    new_sweeps = [catmull_samples(c) for c in new_controls]
    every = np.concatenate(old_sweeps+new_sweeps)
    tb = box_slices(every[:, :3].min(axis=0)-.16, every[:, :3].max(axis=0)+.16)
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.tail_free_body.resolve()))
    free_objects = [o for o in bpy.data.objects if o not in prior and o.type == 'MESH']
    free = max(free_objects, key=lambda o: len(o.data.vertices))
    free_points = np.array([free.matrix_world @ v.co for v in free.data.vertices], dtype=np.float32)
    free.data.calc_loop_triangles()
    free_tris = np.empty(len(free.data.loop_triangles)*3, dtype=np.int32)
    free.data.loop_triangles.foreach_get('vertices', free_tris)
    free_grid = vdb.FloatGrid.createLevelSetFromPolygons(
        free_points, triangles=free_tris.reshape(-1, 3),
        transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF_WIDTH)
    torso = np.empty(tuple(s.stop-s.start for s in tb), dtype=np.float32)
    free_grid.copyToArray(torso, ijk=tuple(int(lo_index[i]+tb[i].start) for i in range(3)))
    for obj in free_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    old = sweep_field(old_sweeps, tb)
    # A minimum over short tapered cones leaves faint ribs at each cone joint
    # under grazing light; a light separable blur of the new sweeps removes them.
    new = separable_blur(sweep_field(new_sweeps, tb), args.tail_sweep_sigma)
    # Near the old tails the native field fades to the tail-free torso; elsewhere
    # the native surface, including its corrected buttocks and thighs, is kept.
    t = np.clip((.035-old)/.035, 0, 1)
    w = t*t*(3-2*t)
    native = field[tb].astype(np.float64)
    base = (1-w)*native+w*torso
    field[tb] = np.minimum(smin(base, new, .025), BAND).astype(np.float32)
    tail_controls = new_controls
    edits['tailRebuild'] = {'controls': str(args.tail_controls), 'tailFreeBody': str(args.tail_free_body),
                            'replacementBand': .035, 'unionBlend': .025, 'sweepBlurSigma': args.tail_sweep_sigma,
                            'tailFreeSha256': sha(args.tail_free_body)}

# Hind paws ---------------------------------------------------------------
HIND = {
    # The native leg morphs into the analytic paw across this band: a weighted
    # blend of two distance fields, which leaves no cut ledge or fillet ring.
    'morph': [-.745, -.850],
    'ankleTop': [-.0225, .001, -.760, .0685, .057], 'ankleBottom': [.012, .000, -.875, .060, .048],
    'heel': {'center': [.015, .008, -.918], 'radii': [.058, .046, .040]},
    'pad': {'center': [.030, -.075, -.922], 'radii': [.080, .080, .038]},
    'dorsum': [[.008, -.015, -.845, .047], [.035, -.105, -.915, .030]],
    'toes': [[-.036, -.130, -.924], [.010, -.148, -.922], [.056, -.148, -.922], [.100, -.128, -.924]],
    'toeRadii': [.025, .035, .035],
    'blend': {'toeToToe': .006, 'toeToPad': .016, 'paw': .030, 'floor': .004},
}
for side in [1, -1]:
    center, half = section(side, -.805)
    ax, ay = float(center[0]), float(center[1])
    low = (min(side*.18, ax+side*.26), ay-.30, FLOOR-.02)
    high = (max(side*.18, ax+side*.26), ay+.16, -.70)
    sl = box_slices(low, high)
    X, Y, Z = coordinates(sl)
    U, V = side*(X-ax), Y-ay
    p = (U, V, Z)
    h = HIND
    top, bottom = h['ankleTop'], h['ankleBottom']
    ratio_top, ratio_bottom = top[3]/top[4], bottom[3]/bottom[4]
    ankle = capsule(p, top[:3], bottom[:3], top[4], bottom[4], ((ratio_top+ratio_bottom)/2, 1, 1))
    heel = ellipsoid(p, h['heel']['center'], h['heel']['radii'])
    pad = ellipsoid(p, h['pad']['center'], h['pad']['radii'])
    (d0, d1) = h['dorsum']
    dorsum = capsule(p, d0[:3], d1[:3], d0[3], d1[3])
    toes = None
    for toe in h['toes']:
        value = ellipsoid(p, toe, h['toeRadii'])
        toes = value if toes is None else smin(toes, value, h['blend']['toeToToe'])
    mass = smin(smin(smin(ankle, heel, h['blend']['paw']), dorsum, h['blend']['paw']), pad, h['blend']['paw'])
    paw = smin(mass, toes, h['blend']['toeToPad'])
    paw = smax(paw, FLOOR-Z, h['blend']['floor'])
    native = field[sl]
    t = np.clip((Z-h['morph'][0])/(h['morph'][1]-h['morph'][0]), 0, 1)
    w = t*t*(3-2*t)
    field[sl] = np.minimum((1-w)*native+w*np.minimum(paw, BAND), BAND)
    edits[f'hind{side:+d}'] = {'ankleCenterXY': [ax, ay], 'ankleHalfXY': half.tolist(),
                               'box': [list(low), list(high)]}
    for i, (tu, tv, tz) in enumerate(h['toes']):
        front = tv-h['toeRadii'][1]
        claw_specs.append({
            'name': f'Curved hind claw {side:+d} {i+1}',
            'base': [ax+side*tu, ay+front+.012, tz+.010],
            'forward': [0, -1, 0], 'curl': [0, 0, -1],
            'length': .044, 'bend': 1.0, 'radius': .0085, 'floor': FLOOR})

# Forepaws ----------------------------------------------------------------
FORE = {'wristZ': -.130, 'tipZ': -.292,
        # Morph along the paw axis, masked to the arm's own radius so the
        # neighboring thigh inside the box is never blended.
        'morphAxial': [0.0, .070], 'morphRadial': [.078, .098],
        'wrist': [[-.040, .050], [.050, .048]],
        'palm': {'center': [.095, 0, 0], 'radii': [.065, .036, .054]},
        'digits': [[.143, -.004, -.039], [.150, -.004, -.013], [.150, -.004, .013], [.143, -.004, .039]],
        'digitRadii': [.028, .025, .0145],
        'blend': {'digitToDigit': .004, 'digitToPalm': .012, 'palmToWrist': .025}}
for side in [1, -1]:
    wrist_center, wrist_half = section(side, FORE['wristZ'], y_limit=.05, x_min=.33)
    tip_center, _ = section(side, FORE['tipZ'], y_limit=.05, x_min=.33)
    W = np.array([wrist_center[0], wrist_center[1], FORE['wristZ']])
    T = np.array([tip_center[0], tip_center[1], FORE['tipZ']])
    axis = (T-W)/np.linalg.norm(T-W)
    lateral = np.array([side, 0, 0])-axis*axis[0]*side
    lateral /= np.linalg.norm(lateral)
    width = np.cross(axis, lateral)
    width *= np.sign(width[1]) or 1
    corners = [W+axis*s+lateral*t+width*r for s in [-.05, .23] for t in [-.07, .07] for r in [-.09, .09]]
    low, high = np.min(corners, axis=0), np.max(corners, axis=0)
    sl = box_slices(low, high)
    X, Y, Z = coordinates(sl)
    rel = (X-W[0], Y-W[1], Z-W[2])
    S = rel[0]*axis[0]+rel[1]*axis[1]+rel[2]*axis[2]
    Tt = rel[0]*lateral[0]+rel[1]*lateral[1]+rel[2]*lateral[2]
    R = rel[0]*width[0]+rel[1]*width[1]+rel[2]*width[2]
    p = (S, Tt, R)
    f = FORE
    (w0, w1) = f['wrist']
    wrist = capsule(p, [w0[0], 0, 0], [w1[0], 0, 0], w0[1], w1[1])
    palm = ellipsoid(p, f['palm']['center'], f['palm']['radii'])
    digits = None
    for digit in f['digits']:
        value = ellipsoid(p, digit, f['digitRadii'])
        digits = value if digits is None else smin(digits, value, f['blend']['digitToDigit'])
    paw = smin(smin(wrist, palm, f['blend']['palmToWrist']), digits, f['blend']['digitToPalm'])
    native = field[sl]
    ta = np.clip((S-f['morphAxial'][0])/(f['morphAxial'][1]-f['morphAxial'][0]), 0, 1)
    tr = np.clip((np.sqrt(Tt*Tt+R*R)-f['morphRadial'][0])/(f['morphRadial'][1]-f['morphRadial'][0]), 0, 1)
    w = ta*ta*(3-2*ta)*(1-tr*tr*(3-2*tr))
    field[sl] = np.minimum((1-w)*native+w*np.minimum(paw, BAND), BAND)
    edits[f'fore{side:+d}'] = {'wrist': W.tolist(), 'tip': T.tolist(), 'axis': axis.tolist(),
                               'lateral': lateral.tolist(), 'width': width.tolist(),
                               'wristHalfXY': wrist_half.tolist(),
                               'box': [low.tolist(), high.tolist()]}
    for i, (s, t, r) in enumerate(f['digits']):
        base = W+axis*(s+f['digitRadii'][0]-.010)+lateral*(t-.008)+width*r
        claw_specs.append({
            'name': f'Curved fore claw {side:+d} {i+1}',
            'base': base.tolist(), 'forward': axis.tolist(), 'curl': (-lateral).tolist(),
            'length': .026, 'bend': .85, 'radius': .0048, 'floor': None})

# Tail root ---------------------------------------------------------------
if not args.skip_tail_root:
    center, radii = np.array([.015, .13, -.065]), np.array([.14, .16, .15])
    sigma, fill_sigma = args.tail_blur_sigma, args.tail_fill_sigma
    pad_width = 3*max(sigma, fill_sigma, args.tail_side_sigma)
    sl = box_slices(center-radii-pad_width, center+radii+pad_width)
    X, Y, Z = coordinates(sl)
    native = field[sl].astype(np.float64)

    def blur(values, width):
        radius = int(math.ceil(3*width/VS))
        kernel = np.exp(-.5*(np.arange(-radius, radius+1)*VS/width)**2)
        kernel /= kernel.sum()
        for axis_index in range(3):
            values = np.apply_along_axis(lambda line: np.convolve(line, kernel, mode='same'), axis_index, values)
        return values

    r2 = ((X-center[0])/radii[0])**2+((Y-center[1])/radii[1])**2+((Z-center[2])/radii[2])**2
    weight = np.maximum(0, 1-r2)**2
    ramp = np.clip((Y-.035)/.030, 0, 1)
    weight *= ramp*ramp*(3-2*ramp)
    # Fill only: a wide blur is taken where it adds material, which closes the
    # concave crease under the ledge without eroding convex tail or pelvis form.
    filled = native+weight*(np.minimum(native, blur(native, fill_sigma))-native)
    # The fan's side edge on the -x buttock was a sheer wall (surface normal
    # nearly -x, standing about .085 behind the pelvis; located by camera ray
    # casts in the 0134 opposite-side closeup). Round its corner at that scale,
    # keeping the overlap edge that study 0018 shows. The support is centered on
    # the concave corner where that wall meets the pelvis surface near y=.065.
    side_center, side_radii = np.array([-.038, .085, -.045]), np.array([.060, .070, .105])
    side_r2 = sum(((axis_values-side_center[i])/side_radii[i])**2 for i, axis_values in enumerate((X, Y, Z)))
    side_weight = np.maximum(0, 1-side_r2)**2
    filled = filled+side_weight*(np.minimum(filled, blur(filled, args.tail_side_sigma))-filled)
    weight = np.maximum(weight, side_weight)
    # A light full blur then rounds the remaining lip.
    finished = filled+weight*(blur(filled, sigma)-filled)
    field[sl] = finished.astype(np.float32)
    edits['tailRoot'] = {'center': center.tolist(), 'radii': radii.tolist(),
                         'sideFillet': {'center': side_center.tolist(), 'radii': side_radii.tolist(),
                                        'sigma': args.tail_side_sigma},
                         'fillSigma': fill_sigma, 'sigma': sigma, 'minimumPosteriorY': .035,
                         'maximumFill': float(np.max(native-filled)),
                         'maximumFieldChange': float(np.max(np.abs(finished-native)))}

# Limb medium-form smoothing ------------------------------------------------
# Plain bounded blurs remove knee knobs, shin notches, calf lumps and forearm
# grooves smaller than about twice sigma. A limb of radius r shrinks by roughly
# sigma**2/r, well under the visible scale here. Regions avoid tails and torso.
LIMB_REGIONS = [
    {'name': f'{name} {side:+d}', 'center': [side*cx, cy, cz], 'radii': radii, 'sigma': sigma,
     'maximumY': maximum_y, 'volumeCompensation': compensation}
    for side in [1, -1]
    # compensation dilates by about sigma**2/(2r) for the local limb radius r,
    # so smoothing removes lumps without thinning the requested leg fullness.
    for name, cx, cy, cz, radii, sigma, maximum_y, compensation in [
        ('knee and calf', .285, -.010, -.500, [.160, .150, .200], .030, .120, .0055),
        ('forearm', .430, -.060, .020, [.090, .090, .150], .020, .060, .0040)]]
if not args.skip_limb_smoothing:
    limb_records = []
    for region in LIMB_REGIONS:
        center, radii, sigma = np.array(region['center']), np.array(region['radii']), region['sigma']
        sl = box_slices(center-radii-3*sigma, center+radii+3*sigma)
        X, Y, Z = coordinates(sl)
        native = field[sl].astype(np.float64)
        radius = int(math.ceil(3*sigma/VS))
        kernel = np.exp(-.5*(np.arange(-radius, radius+1)*VS/sigma)**2)
        kernel /= kernel.sum()
        blurred = native
        for axis_index in range(3):
            blurred = np.apply_along_axis(lambda line: np.convolve(line, kernel, mode='same'), axis_index, blurred)
        r2 = ((X-center[0])/radii[0])**2+((Y-center[1])/radii[1])**2+((Z-center[2])/radii[2])**2
        weight = np.maximum(0, 1-r2)**2
        ty = np.clip((region['maximumY']-Y)/.03, 0, 1)
        weight *= ty*ty*(3-2*ty)
        change = weight*(blurred-native-region['volumeCompensation'])
        field[sl] = (native+change).astype(np.float32)
        limb_records.append({**region, 'maximumFieldChange': float(np.max(np.abs(change)))})
    edits['limbSmoothing'] = limb_records

# Mesh the field once ------------------------------------------------------
edited = vdb.FloatGrid()
edited.background = BAND
edited.copyFromArray(field, ijk=(0, 0, 0))
vertices, tris, quads = edited.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo_index)*VS
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Field rebuilt body')
mesh.from_pydata(vertices.tolist(), [], faces)
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
require_single_closed_mesh(rebuilt, args.out, 'Field rebuilt body')
bpy.data.objects.remove(body, do_unlink=True)
for claw in old_claws:
    bpy.data.objects.remove(claw, do_unlink=True)


def build_claw(spec, rings=24, segments=20):
    """Tapered claw swept along a quadratic curve that bends toward its curl."""
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
    claw_mesh = bpy.data.meshes.new(spec['name'])
    claw_mesh.from_pydata(verts, [], faces)
    claw_mesh.update()
    obj = bpy.data.objects.new(spec['name'], claw_mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(claw_mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(claw_mesh); bm.free()
    obj.data.materials.append(claw_material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    require_single_closed_mesh(obj, args.out, spec['name'])
    return obj


claws = [build_claw(spec) for spec in claw_specs]

# Verification --------------------------------------------------------------
def in_edit(co):
    x, y, z = co
    if 'tailRebuild' in edits and y > .04 and -.70 < z < .30 and x > -.20:
        return True
    if z < -.70 and abs(x) > .15:
        return True
    if abs(x) > .33 and y < .06 and -.33 < z < -.09:
        return True
    for region in edits.get('limbSmoothing', []):
        if sum(((co[i]-region['center'][i])/(region['radii'][i]+.02))**2 for i in range(3)) < 1:
            return True
    if 'tailRoot' in edits:
        c, r = edits['tailRoot']['center'], edits['tailRoot']['radii']
        if sum(((co[i]-c[i])/(r[i]+.035))**2 for i in range(3)) < 1:
            return True
    return False


rng = np.random.default_rng(7)
sample = rng.choice(len(rebuilt.data.vertices), size=min(60000, len(rebuilt.data.vertices)), replace=False)
deviations = []
for index in sample:
    co = rebuilt.data.vertices[int(index)].co
    if not in_edit(co):
        _, _, _, distance = old_tree.find_nearest(co)
        deviations.append(distance)
deviations = np.array(deviations)
contact = {}
for side in [1, -1]:
    planted = [v.co for v in rebuilt.data.vertices if side*v.co.x > .15 and v.co.z < FLOOR+.0015]
    contact[f'{side:+d}'] = {'verticesWithin0015': len(planted),
                             'minimumZ': min(v.co.z for v in rebuilt.data.vertices if side*v.co.x > .15)}
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
target = Vector((0, 0, -.25))
for pos, power, size in [((-3, -5, 7), 650, 4), ((4, -2, 4), 300, 4), ((1, 4, 6), 550, 3)]:
    bpy.ops.object.light_add(type='AREA', location=target+Vector(pos))
    lamp = bpy.context.object
    lamp.data.energy, lamp.data.size = power, size
    aim(lamp, target)
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance,
    'scope': 'Signed-distance rebuild of hind paws, forepaws and tail root; one field meshing',
    'voxel': VS, 'levelSetHalfWidthVoxels': HALF_WIDTH,
    'source': source_stats, 'body': mesh_stats(rebuilt),
    'hindPaw': HIND, 'forePaw': FORE, 'edits': edits,
    'claws': [{**spec, 'minimumZ': claw_minimums[spec['name']]} for spec in claw_specs],
    'outsideEditDeviation': {'sampledVertices': int(len(deviations)),
                             'maximum': float(deviations.max()), 'p99': float(np.percentile(deviations, 99)),
                             'mean': float(deviations.mean())},
    'floorZ': FLOOR, 'contact': contact,
}
(args.out/'field-rebuild.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated['tailControls'] = tail_controls
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': 'Inherited tail/contact controls with signed-distance paw and tail-root rebuild',
                'body': mesh_stats(rebuilt), 'fieldRebuild': summary,
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
