"""Fair the common tail attachment without remeshing the rest of the creature."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--tail-record', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--iterations', type=int, default=600)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
record = json.loads(args.tail_record.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Tail and contact record does not describe the supplied body')
provenance = snapshot(args.out, __file__, [args.body, args.tail_record])
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
require_single_closed_mesh(body, args.out, 'Tail-root finish input')
vertices = np.empty(len(body.data.vertices)*3, dtype=np.float32)
body.data.vertices.foreach_get('co', vertices)
vertices = vertices.reshape(-1,3).astype(np.float64)
original = vertices.copy()
edges = np.empty(len(body.data.edges)*2, dtype=np.int32)
body.data.edges.foreach_get('vertices', edges)
edges = edges.reshape(-1,2)
center = np.array([.015,.13,-.065])
radii = np.array([.14,.16,.15])
radius2 = np.sum(((vertices-center)/radii)**2, axis=1)
weight = np.maximum(0,1-radius2)**2
t = np.clip((vertices[:,1]-.035)/.030, 0, 1)
weight *= t*t*(3-2*t)
selected = np.flatnonzero(weight>0)
if len(selected)<100:
    raise ValueError('Tail root support contains too few vertices')
lookup = np.full(len(vertices), -1, dtype=np.int32)
lookup[selected] = np.arange(len(selected))
source = np.concatenate([edges[:,0],edges[:,1]])
neighbor = np.concatenate([edges[:,1],edges[:,0]])
mask = lookup[source]>=0
source, neighbor = lookup[source[mask]], neighbor[mask]
degree = np.bincount(source, minlength=len(selected))
local_weight = weight[selected,None]

def relax(factor):
    average = np.stack([np.bincount(source, weights=vertices[neighbor,i], minlength=len(selected))
                        /degree for i in range(3)], axis=1)
    vertices[selected] += factor*local_weight*(average-vertices[selected])

# Paired equal/opposite relaxation damps the sharp join while avoiding the
# sustained volume loss of repeated positive Laplacian smoothing.
for _ in range(args.iterations):
    relax(.5)
    relax(-.5)
outside = weight==0
if not np.array_equal(original[outside], vertices[outside]):
    raise ValueError('Tail root operation changed geometry outside its support')
body.data.vertices.foreach_set('co', vertices.astype(np.float32).ravel())
body.data.update()
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
if any(face.calc_area()<1e-14 for face in bm.faces):
    raise ValueError('Tail root fairing introduced a collapsed face')
after_volume = bm.calc_volume(signed=True)
bm.to_mesh(body.data); bm.free()
before_mesh = body.data.copy()
before_mesh.vertices.foreach_set('co', original.astype(np.float32).ravel())
bm = bmesh.new(); bm.from_mesh(before_mesh)
before_volume = bm.calc_volume(signed=True)
bm.free(); bpy.data.meshes.remove(before_mesh)
if abs(after_volume-before_volume)/abs(before_volume)>.005:
    raise ValueError('Tail root finish changed more than .5 percent of body volume')
for polygon in body.data.polygons:
    polygon.use_smooth = True
require_single_closed_mesh(body, args.out, 'Finished local tail root')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
summary = {
    'approval':None, 'stageProvenanceSha256':provenance,
    'scope':'Local common tail-root tangent correction without remeshing',
    'supportCenter':center.tolist(), 'supportRadii':radii.tolist(),
    'minimumPosteriorY':.035, 'iterations':args.iterations,
    'selectedVertices':len(selected), 'unchangedVertices':int(outside.sum()),
    'outsideVertexSha256':hashlib.sha256(original[outside].astype(np.float32).tobytes()).hexdigest(),
    'maximumDisplacement':float(np.linalg.norm(vertices-original,axis=1).max()),
    'beforeVolume':before_volume, 'afterVolume':after_volume,
    'body':mesh_stats(body), 'wholeBodyRemesh':False,
    'preservedRegions':'Outside support: distal branches/tips, pelvis outline, anterior torso, limbs and paws',
}
(args.out/'tail-root-refinement.json').write_text(json.dumps(summary,indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval':None, 'stageProvenanceSha256':provenance,
                'scope':'Inherited tail/contact controls with local root refinement',
                'body':mesh_stats(body), 'rootRefinement':summary,
                'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated,indent=2)+'\n')
