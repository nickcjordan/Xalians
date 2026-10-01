"""Rebuild Akinza's arms and forepaws (R07) in field space from a shoulder, elbow, wrist, digit-tip chain.

Run with Blender (through loop_tools.py blender):
  --python rebuild_arms_field.py -- --body <shape.glb> --fairing <fairing.json> --out <new-dir> [--spec overrides.json]

The closed body becomes an OpenVDB level set. Per arm, in a box around the arm, three field edits and one meshing:

  1. Trunk only. The native arm is removed by a morphological opening of the native field: the core
     {field < -openRadius} is kept, its distance transform is taken (exact squared Euclidean distance by
     separable shifted minima, truncated at the opening radius), and the opened field is dist(core) - openRadius.
     Everything thinner than twice the opening radius (the arm, the paw) disappears; the trunk, hip and thigh
     stay. A weight that is a tube around the native arm axis, faded in z from the shoulder, applies it, and the
     result is smoothed only where it changed the field.
  2. New arm. An analytic limb along shoulder S, elbow E, wrist W and digit tips T: round upper arm (deeper than
     wide), elbow with an olecranon point, forearm with one swell and a taper to a narrow wrist, a mitten paw
     (dorsum out, palm toward the thigh) with four lobes that curl toward the palm.
  3. Union. smooth-min of the trunk-only field and the new arm, with a blend width that is large at the
     shoulder (one fillet into the trunk) and small below the armpit (so a hole opens between arm and trunk).

Four pale curved claws per paw leave the lobe tips on the palm side. Hind claws are carried unchanged.
All numbers are in the ARM dict (world units; the right arm is built in a side frame with x' outward and
mirrored). --spec merges a JSON of overrides into it and the merged dict is written to arm-field.json.
Akinza-specific construction, not a species-general backend.
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

ARM = {
    # side frame: x' outward from the midline, y forward negative, z up. S y is the trunk's mid depth at
    # S z plus shoulderDepthOffset, measured on the input (spec R07: trunk mid depth + .010).
    'S': [.236, None, .299],
    'shoulderDepthOffset': .010,
    # offsets from S: upper arm 22 deg out and 4 back, forearm 10 out and 15 forward, paw continues it
    'E_from_S': [.080, .015, -.198],
    'W_from_E': [.035, -.051, -.195],
    'T_from_W': [.020, -.030, -.114],
    # (ru lateral, rv depth) radii, world
    'upperArm': {'S': [.0385, .0437], 'mid': [.0381, .0428], 'E': [.0400, .0440]},
    # forearm and paw rod stations: (distance from E, ru, rv); the last is the knuckle line
    'rod': [[0.000, .0419, .0446], [.056, .0409, .0391], [.1116, .0363, .0353], [.167, .0326, .0326],
            [.205, .0298, .0316], [.2329, .0316, .0354], [.2608, .0335, .0391], [.2887, .0335, .0409]],
    'wristS': .205,           # distance of W from E along the lower axis
    'pawEndS': .2845,         # flat cut of the rod, inside the lobes
    'pawEndBlend': .010,
    # upperRod: a single station rod from S to E in place of the two smin-joined capsules (their union leaves a
    # faint ring of up to blend/4 at the joint). Stations are (fraction of S to E, ru, rv); radii are smoothed
    # with `stationSmoothing` like the forearm's. None keeps the capsules (body-0303 and every earlier run).
    'upperRod': None,
    'olecranon': {'back': .0270, 'radii': [.022, .020, .028]},
    'swell': {'s': .056, 'out': .004, 'back': .004, 'radii': [.0425, .0405, .090], 'blend': .030},
    'joinBlend': .014,
    # deltoid cap: fills the undercut under the trapezius ledge; its outer edge stays inside R05's shoulder width
    'deltoid': {'offset': [-.004, .015, .012], 'radii': [.050, .058, .050], 'blend': .02},        # between upper arm and the lower rod and ellipsoids
    # lobes: root s from W, tip s from W (world), width radius, thickness radius, tip t shift (palmward negative)
    'lobeRootS': .066,
    'lobeTipS': [.0967, .1079, .1191, .1116],
    'lobeR': [-.0307, -.0102, .0102, .0307],
    'lobeWidthRadius': .0112,
    'lobeThickRadius': .0295,
    'lobeTipThickRadius': .0265,
    'lobeCap': .0204,
    'lobeTipT': [-.004, -.006, -.007, -.006],
    'lobeBlend': .006,
    'lobeToRod': .010,
    # claws
    'claw': {'length': .021, 'bend': .45, 'radius': .0042, 'insetS': .006, 'palmFraction': .25},
    # clawEach (round 16): optional per-claw lists that override the single claw dict, so the four claw tips can
    # separate in the front view. tiltDeg turns the claw's forward axis from the paw axis toward the palm,
    # length and bend replace the shared values, baseOutward moves the base along t (outward positive) from the
    # lobe tip centre. None keeps every earlier run exact.
    'clawEach': None,
    # removal and union
    'openRadius': .065,
    'stationSmoothing': 0.0,   # sigma (world) for the rod radius profile; 0 = piecewise linear as in body-0303
    'openBias': .002,
    'farReach': .06,
    'trunkBlurSigma': .005,
    'oldArmAxis': [[.250, -.060, .340], [.270, -.050, .270], [.292, -.030, .200], [.313, -.005, .140],
                   [.357, -.022, .080], [.392, -.043, .020], [.426, -.069, -.040], [.452, -.097, -.100],
                   [.467, -.113, -.160], [.469, -.125, -.220], [.474, -.136, -.280], [.480, -.140, -.340]],
    'tubeFull': .14, 'tubeZero': .19,
    'removeZ': [.300, .345],     # weight 1 at and below the first, 0 at and above the second
    'removeYFade': [.060, .090],  # weight 0 behind y .09 so tails are never touched,
    'removeYFadeZ': [.10, .14],   # but only below this height (above it the old arm's back must go too)
    'fillet': {'top': .09, 'low': .05, 'topZ': .30, 'lowZ': .22},
    # keepNativeAbove [z0, z1]: add no material above z1 (blended in from z0). A body whose shoulders were
    # reshaped after the first arm rebuild (neck and shoulder stage) keeps its caps and trapezius slopes;
    # set `deltoid` to null at the same time. None keeps every earlier run exact.
    'keepNativeAbove': None,
    # fusionByRemoval: the union blend width follows the removal weight, so where the native arm was kept (above
    # removeZ) the new arm fuses with a hard minimum and adds no fillet on top of the native one. None = off.
    'fusionByRemoval': None,
    # fusionBlend: true replaces the union by w*smin(trunk-only, arm, k) + (1-w)*min(native, arm) with w the removal
    # weight. A smooth minimum of a partly removed native arm against the new arm (which lies on the same surface)
    # raises a bump of k/4 all round the arm wherever w is between 0 and 1, which shows as a shading band at the
    # top of the removal fade; this blend adds the fillet only where the trunk meets the arm. False = off.
    # 'native' blends w*smin(trunk, arm, k) + (1-w)*native: where the native arm stays nothing is added at all.
    'fusionBlend': False,
    'maxIslandVertices': 5000,
    'box': {'x': [.0, .55], 'y': [-.26, .13], 'z': [-.36, .42], 'fade': .02},
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
    merge(ARM, json.loads(args.spec.read_text()))
record = json.loads(args.fairing.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Fairing record does not describe the supplied body')
provenance = snapshot(args.out, __file__, [args.body, args.fairing]+([args.spec] if args.spec else []))
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
require_single_closed_mesh(body, args.out, 'Arm rebuild input')
source_stats = mesh_stats(body)
body_material = body.data.materials[0] if body.data.materials else material('Continuous construction clay', .38)
old_fore = [o for o in objects if o != body and 'fore claw' in o.name.lower()]
claw_material = old_fore[0].data.materials[0] if old_fore and old_fore[0].data.materials else material('Pale curved claw', .74)
for o in old_fore:
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


def distance_to_set(inside, reach):
    """Exact Euclidean distance (voxels) to the True voxels, truncated at `reach` voxels."""
    cap = float((reach+1)**2)
    d = np.where(inside, 0., cap).astype(np.float32)
    for axis in range(3):
        new = d.copy()
        for k in range(1, reach+1):
            c = np.float32(k*k)
            dst = [slice(None)]*3; src = [slice(None)]*3
            dst[axis] = slice(k, None); src[axis] = slice(0, -k)
            np.minimum(new[tuple(dst)], d[tuple(src)]+c, out=new[tuple(dst)])
            dst[axis] = slice(0, -k); src[axis] = slice(k, None)
            np.minimum(new[tuple(dst)], d[tuple(src)]+c, out=new[tuple(dst)])
        d = new
    return np.sqrt(np.minimum(d, cap))


def smooth_profile(s, *columns, sigma):
    """Resample station columns every 1 mm and Gaussian-smooth them (edge values repeated)."""
    grid_s = np.arange(s[0], s[-1]+1e-9, .001)
    out = []
    for col in columns:
        v = np.interp(grid_s, s, col)
        radius = int(math.ceil(3*sigma/.001))
        kernel = np.exp(-.5*(np.arange(-radius, radius+1)*.001/sigma)**2)
        kernel /= kernel.sum()
        out.append(np.convolve(np.pad(v, radius, mode='edge'), kernel, mode='valid'))
    return (grid_s, *out)


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v/np.linalg.norm(v)


def frame(axis, hint):
    """Orthonormal lateral (closest to hint) and depth vectors for a limb axis."""
    a = unit(axis)
    u = unit(np.asarray(hint, dtype=np.float64)-a*np.dot(hint, a))
    v = np.cross(a, u)
    return a, u, v


def ellipse_distance(qu, qv, qa, ru, rv, ra):
    """Approximate distance to an ellipsoid-section solid (first-order, as in the paw code)."""
    e0, e1, e2 = qu/ru, qv/rv, qa/ra
    k0 = np.sqrt(e0*e0+e1*e1+e2*e2)
    k1 = np.sqrt((qu/(ru*ru))**2+(qv/(rv*rv))**2+(qa/(ra*ra))**2)
    return k0*(k0-1)/np.maximum(k1, 1e-9)


def capsule(P, A, B, rA, rB, hint):
    A, B = np.asarray(A, float), np.asarray(B, float)
    ba = B-A
    length = float(np.linalg.norm(ba))
    a, u, v = frame(ba, hint)
    q = [P[i]-A[i] for i in range(3)]
    t = q[0]*a[0]+q[1]*a[1]+q[2]*a[2]
    h = np.clip(t/length, 0, 1)
    qa = t-h*length
    qu = q[0]*u[0]+q[1]*u[1]+q[2]*u[2]
    qv = q[0]*v[0]+q[1]*v[1]+q[2]*v[2]
    ru = rA[0]+(rB[0]-rA[0])*h
    rv = rA[1]+(rB[1]-rA[1])*h
    return ellipse_distance(qu, qv, qa, ru, rv, .5*(ru+rv))


def ellipsoid(P, center, axes, radii):
    q = [P[i]-center[i] for i in range(3)]
    comps = [q[0]*ax[0]+q[1]*ax[1]+q[2]*ax[2] for ax in axes]
    return ellipse_distance(comps[0], comps[1], comps[2], radii[0], radii[1], radii[2])


def seg_distance(P, A, B):
    """Distance from points to a segment."""
    A, B = np.asarray(A, float), np.asarray(B, float)
    ba = B-A
    q = [P[i]-A[i] for i in range(3)]
    h = np.clip((q[0]*ba[0]+q[1]*ba[1]+q[2]*ba[2])/float(ba@ba), 0, 1)
    return np.sqrt(sum((q[i]-ba[i]*h)**2 for i in range(3)))


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
    return obj


# ---- trunk mid depth (shoulder depth) --------------------------------------------------------------
sz = ARM['S'][2]
sel = points[(np.abs(points[:, 2]-sz) < .004) & (np.abs(points[:, 0]) < .05) & (points[:, 1] < .125)]
trunk_mid_y = float((sel[:, 1].min()+sel[:, 1].max())/2)
S = np.array([ARM['S'][0], trunk_mid_y+ARM['shoulderDepthOffset'], sz]) if ARM['S'][1] is None else np.array(ARM['S'], float)
E = S+np.array(ARM['E_from_S'])
W = E+np.array(ARM['W_from_E'])
T = W+np.array(ARM['T_from_W'])
a1, u1, v1 = frame(E-S, [1, 0, 0])
a2, u2, v2 = frame(W-E, [1, 0, 0])
if v1[1] < 0: v1 = -v1
if v2[1] < 0: v2 = -v2
report = {'trunkMidY': trunk_mid_y, 'S': S.tolist(), 'E': E.tolist(), 'W': W.tolist(), 'T': T.tolist(),
          'lengths': {'upperArm': float(np.linalg.norm(E-S)), 'forearm': float(np.linalg.norm(W-E)),
                      'paw': float(np.linalg.norm(T-W))}, 'sides': {}}

# ---- per-side field edit -----------------------------------------------------------------------------
rod_s = np.array([r[0] for r in ARM['rod']]); rod_ru = np.array([r[1] for r in ARM['rod']])
rod_rv = np.array([r[2] for r in ARM['rod']])
if ARM['stationSmoothing'] > 0:
    # piecewise-linear station radii leave a slope kink, and a faint shading ring, at every station
    # (seen on assembled-0305); smoothing the sampled profile removes them. Default 0 keeps earlier runs exact.
    rod_s, rod_ru, rod_rv = smooth_profile(rod_s, rod_ru, rod_rv, sigma=ARM['stationSmoothing'])
claw_specs = []
for side in (1, -1):
    box = ARM['box']
    xs = sorted([side*box['x'][0], side*box['x'][1]])
    low = np.array([xs[0], box['y'][0], box['z'][0]])
    high = np.array([xs[1], box['y'][1], box['z'][1]])
    lo_idx = np.floor(low/VS).astype(int)
    hi_idx = np.ceil(high/VS).astype(int)
    shape = tuple(int(v) for v in hi_idx-lo_idx+1)
    native = np.empty(shape, dtype=np.float32)
    grid.copyToArray(native, ijk=tuple(int(v) for v in lo_idx))
    native = native.astype(np.float64)
    axes = [(lo_idx[i]+np.arange(shape[i]))*VS for i in range(3)]
    X, Y, Z = np.meshgrid(axes[0], axes[1], axes[2], indexing='ij', sparse=True)
    Xp = side*X
    P = (Xp, Y, Z)

    # 1. trunk only
    rho = ARM['openRadius']
    # reach beyond the opening radius so that the removed arm gets a proper far-field distance value
    # (a flat tiny positive value there bent the union with the new arm and left a jagged ridge)
    reach = int(math.ceil((rho+ARM['farReach'])/VS))
    # the level set band saturates at -BAND inside, so depth comes from the distance to the outside
    depth = distance_to_set(native >= 0, reach)*VS
    core = depth > rho
    del depth
    dist = distance_to_set(core, reach)*VS
    opened = np.where(core, -(rho), dist-rho)
    trunk = np.maximum(native, opened-ARM['openBias'])
    changed = smooth((trunk-native)/.01)
    trunk = trunk+changed*(blur(trunk, ARM['trunkBlurSigma'])-trunk)
    axis = np.array(ARM['oldArmAxis'], float)
    tube = np.full(shape, 9., dtype=np.float64)
    for i in range(len(axis)-1):
        tube = np.minimum(tube, seg_distance(P, axis[i], axis[i+1]))
    w = 1-smooth((tube-ARM['tubeFull'])/(ARM['tubeZero']-ARM['tubeFull']))
    z0, z1 = ARM['removeZ']
    w = w*(1-smooth((Z-z0)/(z1-z0)))
    # tails sit behind the body below z .10; above it nothing but the old arm and the back is in the box
    y0, y1 = ARM['removeYFade']
    yw = 1-smooth((Y-y0)/(y1-y0))
    w = w*(yw+(1-yw)*smooth((Z-ARM['removeYFadeZ'][0])/(ARM['removeYFadeZ'][1]-ARM['removeYFadeZ'][0])))
    rm = (1-w)*native+w*trunk
    del core, dist, opened, changed, tube

    # 2. new arm
    ua = ARM['upperArm']
    if ARM['upperRod']:
        # one capped rod along S to E whose radius profile is smoothed (no capsule joint, no station kinks)
        length1 = float(np.linalg.norm(E-S))
        st = np.array(ARM['upperRod'], float)
        us, uru, urv = st[:, 0]*length1, st[:, 1], st[:, 2]
        if ARM['stationSmoothing'] > 0:
            us, uru, urv = smooth_profile(us, uru, urv, sigma=ARM['stationSmoothing'])
        t1 = (Xp-S[0])*a1[0]+(Y-S[1])*a1[1]+(Z-S[2])*a1[2]
        qu1 = (Xp-S[0])*u1[0]+(Y-S[1])*u1[1]+(Z-S[2])*u1[2]
        qv1 = (Xp-S[0])*v1[0]+(Y-S[1])*v1[1]+(Z-S[2])*v1[2]
        tc1 = np.clip(t1, 0, length1)
        ru1 = np.interp(tc1, us, uru)
        rv1 = np.interp(tc1, us, urv)
        upper = ellipse_distance(qu1, qv1, t1-tc1, ru1, rv1, .5*(ru1+rv1))
    else:
        upper = smin(capsule(P, S, (S+E)/2, ua['S'], ua['mid'], [1, 0, 0]),
                     capsule(P, (S+E)/2, E, ua['mid'], ua['E'], [1, 0, 0]), .006)
    t_axis = (Xp-E[0])*a2[0]+(Y-E[1])*a2[1]+(Z-E[2])*a2[2]
    qu = (Xp-E[0])*u2[0]+(Y-E[1])*u2[1]+(Z-E[2])*u2[2]
    qv = (Xp-E[0])*v2[0]+(Y-E[1])*v2[1]+(Z-E[2])*v2[2]
    tc = np.clip(t_axis, 0, rod_s[-1])
    ru_t = np.interp(tc, rod_s, rod_ru)
    rv_t = np.interp(tc, rod_s, rod_rv)
    ra = .5*(ru_t+rv_t)
    qa = np.where(t_axis < 0, t_axis, 0.)
    rod = ellipse_distance(qu, qv, qa, ru_t, rv_t, ra)
    rod = smax(rod, t_axis-ARM['pawEndS'], ARM['pawEndBlend'])
    swell_c = E+a2*ARM['swell']['s']+u2*ARM['swell']['out']+v2*ARM['swell']['back']
    swell = ellipsoid(P, swell_c, (u2, v2, a2), ARM['swell']['radii'])
    vback = unit(v1+v2)
    ole_c = E+vback*ARM['olecranon']['back']
    ole = ellipsoid(P, ole_c, (u2, vback, a2), ARM['olecranon']['radii'])
    lower = smin(smin(rod, swell, ARM['swell']['blend']), ole, ARM['joinBlend'])
    # paw lobes in the lower frame: s from W, t along u2 (outward), r along v2 (back)
    sW = (Xp-W[0])*a2[0]+(Y-W[1])*a2[1]+(Z-W[2])*a2[2]
    tW = (Xp-W[0])*u2[0]+(Y-W[1])*u2[1]+(Z-W[2])*u2[2]
    rW = (Xp-W[0])*v2[0]+(Y-W[1])*v2[1]+(Z-W[2])*v2[2]
    local = (sW, tW, rW)
    lobes = None
    for i in range(4):
        s_tip = ARM['lobeTipS'][i]
        s_end = s_tip-ARM['lobeCap']
        A = (ARM['lobeRootS'], 0., ARM['lobeR'][i])
        B = (s_end, ARM['lobeTipT'][i], ARM['lobeR'][i])
        rA = (ARM['lobeThickRadius'], ARM['lobeWidthRadius'])
        rB = (ARM['lobeTipThickRadius'], ARM['lobeWidthRadius'])
        value = capsule(local, A, B, rA, rB, [0, 1, 0])
        lobes = value if lobes is None else smin(lobes, value, ARM['lobeBlend'])
    lower = smin(lower, lobes, ARM['lobeToRod'])
    arm = smin(upper, lower, ARM['joinBlend'])
    dl = ARM['deltoid']
    if dl:
        deltoid = ellipsoid(P, S+np.array(dl['offset']), (np.array([1., 0, 0]), np.array([0, 1., 0]), np.array([0, 0, 1.])), dl['radii'])
        arm = smin(arm, deltoid, dl['blend'])

    # 3. union with the trunk-only field
    fz = smooth((Z-ARM['fillet']['lowZ'])/(ARM['fillet']['topZ']-ARM['fillet']['lowZ']))
    k = ARM['fillet']['low']+(ARM['fillet']['top']-ARM['fillet']['low'])*fz
    if ARM['fusionByRemoval'] is not None:
        k = ARM['fusionByRemoval']+(k-ARM['fusionByRemoval'])*w
    if ARM['fusionBlend'] == 'native':
        # nothing is added where the native arm stays (a shoulder that was reshaped after the first rebuild)
        merged = w*smin(trunk, arm, k)+(1-w)*native
    elif ARM['fusionBlend']:
        merged = w*smin(trunk, arm, k)+(1-w)*np.minimum(native, arm)
    else:
        merged = smin(rm, arm, k)
    if ARM['keepNativeAbove']:
        c0, c1 = ARM['keepNativeAbove']
        keep = smooth((Z-c0)/(c1-c0))
        merged = merged+keep*(np.maximum(merged, native)-merged)
    # blend to the untouched field at the box faces
    fade = box['fade']
    window = np.ones(shape)
    for ax, coord in enumerate((X, Y, Z)):
        lo_c, hi_c = low[ax], high[ax]
        window = window*smooth((coord-lo_c)/fade)*smooth((hi_c-coord)/fade)
    # the inner x face sits inside the trunk, the outer faces in air; both fade the same way
    final = native+window*(merged-native)
    final = np.clip(final, -BAND, BAND).astype(np.float32)
    grid.copyFromArray(final, ijk=tuple(int(v) for v in lo_idx))
    report['sides'][f'{side:+d}'] = {'box': [low.tolist(), high.tolist()], 'shape': list(shape),
                                     'maxChange': float(np.max(np.abs(final-native.astype(np.float32))))}
    del native, rm, trunk, arm, merged, final, window, upper, lower, lobes, rod, swell, ole

    # claws: base inside each lobe tip on the palm side, aimed along the paw axis, curling palmward
    palm = -u2
    for i in range(4):
        s_tip = ARM['lobeTipS'][i]
        t_tip = ARM['lobeTipT'][i]
        c = ARM['claw']
        each = ARM['clawEach'] or {}
        local_base = (s_tip-c['insetS'], t_tip-c['palmFraction']*2*ARM['lobeThickRadius']+(each.get('baseOutward') or [0]*4)[i],
                      ARM['lobeR'][i])
        base = W+a2*local_base[0]+u2*local_base[1]+v2*local_base[2]
        tilt = math.radians((each.get('tiltDeg') or [0]*4)[i])
        forward = a2*math.cos(tilt)+palm*math.sin(tilt)
        claw_specs.append({
            'name': f'Curved fore claw {side:+d} {i+1}',
            'base': [side*base[0], base[1], base[2]],
            'forward': [side*forward[0], forward[1], forward[2]], 'curl': [side*palm[0], palm[1], palm[2]],
            'length': (each.get('length') or [c['length']]*4)[i], 'bend': (each.get('bend') or [c['bend']]*4)[i],
            'radius': c['radius']})

# ---- mesh once ---------------------------------------------------------------------------------------
vertices, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Arm rebuilt body')
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
# a thin remnant of removed material can survive as a tiny island; drop small closed islands and record them
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
    if len(comp) <= ARM['maxIslandVertices']:
        xs = [v.co.x for v in comp]; ys = [v.co.y for v in comp]; zs = [v.co.z for v in comp]
        removed.append({'vertices': len(comp), 'x': [min(xs), max(xs)], 'y': [min(ys), max(ys)], 'z': [min(zs), max(zs)]})
        bmesh.ops.delete(bm, geom=comp, context='VERTS')
bm.to_mesh(rebuilt.data); bm.free()
report['removedIslands'] = removed
require_single_closed_mesh(rebuilt, args.out, 'Arm rebuilt body')
bpy.data.objects.remove(body, do_unlink=True)
claws = [build_claw(spec, claw_material) for spec in claw_specs]

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

# arm joints in the rig's convention (the .R side is the -x side): the rig can use them directly
arm_joints = {'shoulder.R': [-S[0], S[1], S[2]], 'elbow.R': [-E[0], E[1], E[2]], 'wrist.R': [-W[0], W[1], W[2]],
              'fingertip.R': [-T[0], T[1], T[2]]}
summary = {'approval': None, 'stageProvenanceSha256': provenance,
           'scope': 'Arms and forepaws rebuilt in field space: trunk-only opening, analytic limb and mitten paw, one meshing',
           'voxel': VS, 'source': source_stats, 'body': mesh_stats(rebuilt), 'arm': ARM, 'report': report,
           'armJoints': arm_joints, 'claws': claw_specs}
(args.out/'arm-field.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; arm rebuild',
                'body': mesh_stats(rebuilt), 'armRebuild': {k: v for k, v in summary.items() if k not in ('arm',)},
                'armJoints': arm_joints,
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('arm rebuild done', json.dumps(report['lengths']))
