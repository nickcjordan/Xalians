"""Outer eye corner v5t3 (Nick 2026-10-11): the v5t2 head with the skin at the very end of the lid, at each outer eye
corner, faired so the lid end rounds onto the head side with no sharp dark mark or shaded crescent.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5t2 head (H47 output):
  --python corner_v5t3_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json>

v5t2 left a short dark mark beside the left eye's outer edge (front view) and a narrow crescent at the lid end
(three-quarter view). Both are skin shading in the strip v5t2 held, between the opening and .004 to .012 out: the
closing's free skin met the held lid edge with a small notch. This step fairs that strip and the lid end in place,
only round the outer corners: Taubin smoothing (`iters`, `lam`, `mu`) of the skin vertices inside an ellipsoid round
each outer corner (`centre` x mirrored, `radii`, C2 fade `blend`), weighted to 0 within `edge[0]` of the exposed globe
(the skin edge that draws the opening and the end of the dark band stays exactly where it is) and full beyond
`edge[1]`. With `bandTrim` the globe's dark band faces at the outer end whose centre lies more than that distance from
the skin are reassigned to the white material (the band ends in a clean taper under the skin); off by default.
`roll` [s0, d0, d1, d2, amp] (s0 optional, default 0) first lifts the skin round the corner's lid end outward along its normal by amp times a
profile in the distance d to the exposed globe (0 within s0, full from d0 to d1, 0 beyond d2), so the lid edge rolls
over convexly instead of dipping into the globe's corner. No skin vertex comes within `globeClear` of the globe (it keeps its input place, or with `pushOut` is pushed out to
that distance). The lid roll and push-out were tried and left speckles where the lifted skin crossed the dark band; the
adopted spec uses the fairing alone. Writes head.blend, shape.glb, corner-v5t3.json.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {'centre': [.33, -.14, .03], 'radii': [.03, .045, .07], 'blend': [.5, 1.], 'edge': [.0015, .006],
            'iters': 60, 'lam': .5, 'mu': -.53, 'globeClear': .001, 'bandTrim': None, 'roll': None, 'normalSmooth': 20, 'pushOut': False}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
P = dict(DEFAULTS)
P.update({k: v for k, v in json.loads(args.spec.read_text()).items() if k != 'note'})


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def world_points(o):
    n = len(o.data.vertices)
    c = np.empty(n*3)
    o.data.vertices.foreach_get('co', c)
    M = np.array(o.matrix_world)
    return c.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before corner v5t3')
before = mesh_stats(head)
M = np.array(head.matrix_world)
pts = world_points(head)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
skin_tree = BVHTree.FromPolygons(pts.tolist(), tris.reshape(-1, 3).tolist())
w = np.zeros(len(pts))
roll = np.zeros(len(pts))
gtrees = []
record = {'eyes': {}}
for sgn, side in ((-1., '-1'), (1., '1')):
    globe = bpy.data.objects[f'eye_globe_{side}']
    G = world_points(globe)
    gtree = BVHTree.FromPolygons(G.tolist(), [tuple(p.vertices) for p in globe.data.polygons])
    gtrees.append(gtree)
    gn = np.empty(len(G)*3)
    globe.data.vertices.foreach_get('normal', gn)
    gn = gn.reshape(-1, 3)@np.array(globe.matrix_world)[:3, :3].T
    gn /= np.linalg.norm(gn, axis=1, keepdims=True)+1e-12
    c = np.array(P['centre'], float)*[sgn, 1., 1.]
    r = np.array(P['radii'], float)
    near_g = np.where(np.sqrt((((G-c)/(r*2))**2).sum(1)) < 1.)[0]
    exposed = [k for k in near_g if skin_tree.ray_cast(Vector(G[k]+gn[k]*.0005), Vector(gn[k]), .04)[0] is None]
    kd = KDTree(max(1, len(exposed)))
    for i_, k in enumerate(exposed):
        kd.insert(Vector(G[k]), i_)
    kd.balance()
    q = np.sqrt((((pts-c)/r)**2).sum(1))
    cand = np.where(q < P['blend'][1])[0]
    dE = np.array([kd.find(Vector(p_))[2] for p_ in pts[cand]]) if exposed else np.ones(len(cand))
    wc = (1-ss2(q[cand], *P['blend']))*ss2(dE, *P['edge'])
    w[cand] = np.maximum(w[cand], wc)
    if P['roll']:   # lid roll: lift the skin just outside the opening's end outward along its normal (0 at the edge)
        rr_ = P['roll'] if len(P['roll']) == 5 else [0.]+list(P['roll'])
        s0, a0, a1, a2, amp = rr_
        prof = ss2(dE, s0, a0)*(1-ss2(dE, a1, a2))
        roll[cand] = np.maximum(roll[cand], amp*prof*(1-ss2(q[cand], *P['blend'])))
    rec = {'exposedGlobeVerts': len(exposed), 'weighted': int((wc > 0).sum())}
    if P['bandTrim'] is not None:
        mats = [m.name if m else '' for m in globe.data.materials]
        band = next((i for i, n_ in enumerate(mats) if 'eyelid' in n_.lower()), None)
        white = next((i for i, n_ in enumerate(mats) if 'white' in n_.lower()), None)
        changed = 0
        if band is not None and white is not None:
            Mg = np.array(globe.matrix_world)
            for poly in globe.data.polygons:
                if poly.material_index != band:
                    continue
                cw = np.array(poly.center)@Mg[:3, :3].T+Mg[:3, 3]
                if np.sqrt((((cw-c)/r)**2).sum()) > 1.:
                    continue
                hit = skin_tree.find_nearest(Vector(cw))
                if hit[3] > P['bandTrim'] and skin_tree.ray_cast(Vector(cw+np.array(poly.normal)*.0005), Vector(poly.normal), .04)[0] is not None:
                    poly.material_index = white
                    changed += 1
        rec['bandFacesTrimmed'] = changed
    record['eyes'][side] = rec

act = np.where(w > 0)[0]
inact = np.zeros(len(pts), bool)
inact[act] = True
ev = np.empty(len(head.data.edges)*2, dtype=np.int64)
head.data.edges.foreach_get('vertices', ev)
ev = ev.reshape(-1, 2)
e = ev[inact[ev[:, 0]] | inact[ev[:, 1]]]
loc = -np.ones(len(pts), np.int64)
loc[act] = np.arange(len(act))
deg = np.zeros(len(act))
for a_ in (0, 1):
    m_ = inact[e[:, a_]]
    np.add.at(deg, loc[e[m_, a_]], 1)
new = pts.copy()
if P['roll']:
    vn = np.empty(len(pts)*3)
    head.data.vertices.foreach_get('normal', vn)
    vn = vn.reshape(-1, 3)@M[:3, :3].T
    vn /= np.linalg.norm(vn, axis=1, keepdims=True)+1e-12
    rv = np.where(roll > 0)[0]
    for _ in range(P['normalSmooth']):   # vertex normals averaged over neighbours (the voxel mesh's are noisy)
        acc = vn.copy()
        np.add.at(acc, ev[:, 0], vn[ev[:, 1]])
        np.add.at(acc, ev[:, 1], vn[ev[:, 0]])
        vn = acc/(np.linalg.norm(acc, axis=1, keepdims=True)+1e-12)
    new += roll[:, None]*vn
for _ in range(P['iters']):
    for stp in (P['lam'], P['mu']):
        acc = np.zeros((len(act), 3))
        for a_, b_ in ((0, 1), (1, 0)):
            m_ = inact[e[:, a_]]
            np.add.at(acc, loc[e[m_, a_]], new[e[m_, b_]])
        lap = acc/np.maximum(deg, 1)[:, None]-new[act]
        new[act] = new[act]+(stp*w[act])[:, None]*lap
# keep clear of the globes
dn = np.array([min(t.find_nearest(Vector(p_))[3] for t in gtrees) for p_ in new[act]])
do = np.array([min(t.find_nearest(Vector(p_))[3] for t in gtrees) for p_ in pts[act]])
bad = act[(dn < P['globeClear']) & (dn < do)]
if P['pushOut']:   # push back out to globeClear along the globe's normal
    for k in bad:
        best = min((t.find_nearest(Vector(new[k])) for t in gtrees), key=lambda h: h[3])
        new[k] = np.array(best[0])+np.array(best[1])*P['globeClear']
else:   # or keep the input position
    new[bad] = pts[bad]
Mi = np.linalg.inv(M)
head.data.vertices.foreach_set('co', (new@Mi[:3, :3].T+Mi[:3, 3]).ravel())
head.data.update()
disp = np.linalg.norm(new-pts, axis=1)
record['displacement'] = {'moved': int((disp > 0).sum()), 'max': float(disp.max()), 'heldOffGlobe': int(len(bad))}
require_single_closed_mesh(head, args.out, 'Head skin corner v5t3')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'corner-v5t3.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Outer eye corner v5t3 (Nick 2026-10-11): the lid-end skin at each outer corner faired in place',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q_.name: sha(q_) for q_ in args.out.iterdir() if q_.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('corner v5t3 ok', json.dumps(record), flush=True)
