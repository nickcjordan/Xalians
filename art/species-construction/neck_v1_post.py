"""Akinza neck v1: the jaw underside, the head's neck stub, the join column and the top of the yoke rebuilt as one surface.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps). The head stub (kept by H39 from H37), the join
loft (assembly J) and the yoke top (B-24Y) were built by three steps that each had to keep the others; here they are edited
together on the one fused skin, after the assembly's voxel remesh, so nothing resamples them afterwards.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python neck_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/neck-v1.json

Method (world units; the field composition is neck_v1_field.py). In a window around the neck the old skin's signed distance S
is sampled on a grid (BVH nearest point, sign from the face normal). The old neck is eroded away on its axis (S + delta), an
authored column C (superellipse sections from the spec's table) is joined to what is left with a C2 smooth minimum whose radius
varies with height and angle (soft fillets under the jaw, at the jaw sides, at the nape and into the yoke), a masked Gaussian
blur takes out the old bands at the neck base, and the part mask w returns the field to S exactly at the part's edge. Each skin
vertex where the field changed is moved onto the new zero set by Newton steps along the gradient, then the moved vertices are
relaxed along the surface and projected again. Same vertices and faces; vertices outside the part do not move at all (checked).

Records: neck-v1.json (spec, displacement statistics, sections before and after) and the skin's counts in assembly.json.
Development options: --s-cache <npz> saves (or reuses) the S grid; --dump <npz> saves the skin before and after.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha
import neck_v1_field as nf

T0 = time.time()


def tick(message):
    print(f'[{time.time()-T0:7.1f}s] {message}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--s-cache', type=Path, default=None)
p.add_argument('--dump', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
G = spec['grid']
STEP = float(G['step'])
LO = np.array(G['lo'], float)
HI = np.array(G['hi'], float)
SHAPE = tuple(int(v) for v in np.round((HI-LO)/STEP).astype(int)+1)

bpy.ops.wm.open_mainfile(filepath=str((args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = skin.data
if not np.allclose(np.array(skin.matrix_world), np.eye(4)):
    raise SystemExit('the skin object is expected at the identity transform')
nv = len(me.vertices)
co = np.empty(nv*3)
me.vertices.foreach_get('co', co)
V0 = co.reshape(-1, 3).copy()
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles)*3, np.int32)
me.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tick(f'skin {skin.name}: {nv} vertices, {len(tris)} triangles, grid {SHAPE}')


def signed_distance():
    margin = .03
    inbox = np.all((V0 > LO-margin) & (V0 < HI+margin), axis=1)
    tsel = tris[inbox[tris].any(1)]
    used = np.unique(tsel)
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(len(used))
    bvh = BVHTree.FromPolygons([Vector(v) for v in V0[used]], remap[tsel].tolist(), all_triangles=True)
    far = float(G.get('far', .08))
    S = np.full(SHAPE, np.nan)
    xs = LO[0]+STEP*np.arange(SHAPE[0])
    ys = LO[1]+STEP*np.arange(SHAPE[1])
    zs = LO[2]+STEP*np.arange(SHAPE[2])
    for i, x in enumerate(xs):
        for j, y in enumerate(ys):
            for k, z in enumerate(zs):
                q = Vector((x, y, z))
                loc, nrm, _, dist = bvh.find_nearest(q, far)
                if loc is not None:
                    S[i, j, k] = dist if (q-loc).dot(nrm) >= 0 else -dist
    # beyond `far` from the skin: the sign of the nearest finite sample in the same vertical column
    for i in range(SHAPE[0]):
        for j in range(SHAPE[1]):
            col = S[i, j]
            bad = np.isnan(col)
            if not bad.any():
                continue
            if bad.all():
                S[i, j] = far
                continue
            good = np.where(~bad)[0]
            nearest = good[np.abs(good[None, :]-np.where(bad)[0][:, None]).argmin(1)]
            col[bad] = np.sign(col[nearest])*far
    return S


key = {'lo': LO.tolist(), 'step': STEP, 'shape': list(SHAPE), 'far': G.get('far', .08), 'input': sha(args.out/'akinza.glb')}
S = None
if args.s_cache and args.s_cache.is_file():
    z = np.load(args.s_cache, allow_pickle=False)
    if json.loads(str(z['key'])) == key:
        S = z['S']
        tick('S from cache')
if S is None:
    S = signed_distance()
    tick('S sampled')
    if args.s_cache:
        np.savez_compressed(args.s_cache, S=S, key=json.dumps(key))

F, w, parts = nf.compose(S, LO, STEP, spec)
tick('field composed')
V1, stats, wall = nf.move_vertices(V0, tris, S, F, w, LO, STEP, spec, log=tick)
stats['fieldChangedOutsideMaskMax'] = float(np.abs(F-S)[w <= 0].max())
tick(json.dumps(stats))
if stats['outsidePartMax'] != 0.0 or stats['outsidePartMoved'] != 0:
    raise SystemExit('vertices outside the part moved')

me.vertices.foreach_set('co', V1.ravel())
me.update()
st = mesh_stats(skin)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'neck v1 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'fieldSha256': sha(Path(nf.__file__)), 'displacement': stats, 'skinAfter': st,
          'sectionsBefore': nf.sections(V0), 'sectionsAfter': nf.sections(V1), 'seconds': round(time.time()-T0, 1),
          'outputs': asm_record['outputs']}
(args.out/'neck-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    np.savez_compressed(args.dump, before=V0, after=V1, tris=tris, wall=wall)
tick(f'done: {st}')
