"""Akinza game mesh pass 1, Blender stage: decimate the skin of record, carry weights and keys, UV, bake, export.

  run_blender.py gamemesh_build.py <log> -- <surface dir> <rig dir> <bake dir> <work dir> [--body 10000]
      [--factors 0,0.001,0.003,0.01,0.03] [--factor F] [--size 2048] [--out-size 1024]

Method (Luceras game mesh record: importance-weighted Collapse decimation of the approved surface, no remesh, no
smoothing, no projection; rigid small parts decimated on their own budgets):
  * the skin of record (fur-steps/s12-29c-legs3b, 621,482 vertices) is copied; before decimating, every rig-p8b skin
    weight (49 bones, dense), the two breath keys (clips4/bake/breath_key.npz) and the 24 corrective keys (rig-p8b
    correctives.npz) are stored on it as point attributes, so Collapse carries them along the surface itself (each
    surviving vertex is a merge of its own neighbors), never by nearest-surface lookup across close parts (the tails,
    the rump);
  * importance per vertex from its strongest rig bone and the face zone (ears, hands, feet and the face 1.0, head .75,
    tail tips .8, tails .6, limbs .35, trunk .15) becomes the Collapse vertex group 1 - 0.95 * importance (a high
    importance raises the cost of collapsing there; nothing is locked); --factors sweeps the group factor, each at
    the body budget, and the per-region triangle shares are logged; the factor whose shares sit closest to the
    targets (log ratio) is applied unless --factor is given;
  * parts: each eye's globe and iris joined (220 + 80 triangles), each claw 32, the nose 160, rigid on their bone
    (eyes and nose on head, fore claws on the hand, hind claws on the foot, as clip_frames.py poses them). The
    eyeliner ribbons, the catch lights and the mouth crease are not geometry here: they are painted into the color
    bake (body and eyes), where the sprites show them;
  * one UV atlas for every part (smart project 66 degrees, average island scale, packed);
  * maps at --size, saved at --out-size: base color = the paint each source is drawn with (every material's surface
    output rewired to emission of its own base color, palette T7 and the eyeliner of record applied first; no light),
    baked selected-to-active: body from the fur of record, the skin, the ribbons and the mouth crease (cage 15 mm,
    so the rays meet the coat as the camera does), eyes from globes, irises, catch lights and ribbons, claws and
    nose from their own; missed texels are filled from their neighbors. Normal (tangent space) from each part's own
    source surface (cage 4 mm). AO on the game mesh itself (all parts, 32 samples).
Writes <work>/gamemesh.npz (per primitive: positions in source units, corner normals, MikkTSpace tangents, UVs,
indices, the four strongest carried weights, breath and corrective deltas in rig metres), source.npz (the source
skin at rest), color.png, normal.png, ao.png, gamemesh.blend and build.json (sweep, counts, topology, timings).
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import gamemesh_common as gm  # noqa: E402

a_ = sys.argv[sys.argv.index('--')+1:]
p = argparse.ArgumentParser()
p.add_argument('surface', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('work', type=Path)
p.add_argument('--body', type=int, default=10000)
p.add_argument('--factors', default='0,0.006,0.02,0.05,0.1,0.2')
p.add_argument('--proj-res', type=int, default=1280)
p.add_argument('--factor', type=float, default=None)
p.add_argument('--size', type=int, default=2048)
p.add_argument('--out-size', type=int, default=1024)
p.add_argument('--color-extrusion', type=float, default=.015)
p.add_argument('--stop-after', default=None, help='mesh: stop after the mesh and its checks')
a = p.parse_args(a_)
a.work.mkdir(parents=True, exist_ok=True)
t0 = time.time()
LOG = dict(args={k: str(v) for k, v in vars(a).items()})


def log(k, v):
    LOG[k] = v
    (a.work/'build.json').write_text(json.dumps(LOG, indent=1))
    print('LOG', k, json.dumps(v)[:2000], flush=True)


gm.open_look(a.surface)
import rig_core as rc  # noqa: E402  (path set by open_look)
log('openSeconds', round(time.time()-t0, 1))
NAMES = rc.ANIM_NAMES
rig = json.loads((a.rig/'rig.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
wt = np.load(a.rig/'weights.npz')
widx = wt['idx'].astype(int)
ww = np.round(wt['w'].astype(np.float64)*4096)/4096
ww /= ww.sum(1, keepdims=True)
KEYS = json.loads((a.rig/'correctives.json').read_text())['keys']
cz = np.load(a.rig/'correctives.npz')
bz = np.load(a.bake/'breath_key.npz')

skin = bpy.data.objects[gm.SKIN]
fur = bpy.data.objects[gm.FUR]
skin_rest = gm.world_co(skin)
skin_tris = gm.tris_of(skin)
np.savez_compressed(a.work/'source.npz', verts=skin_rest.astype(np.float32), tris=skin_tris)
nv = len(skin_rest)
log('source', dict(vertices=nv, triangles=len(skin_tris), matrixIdentity=bool(np.allclose(np.array(skin.matrix_world), np.eye(4)))))
src_topo = gm.topology(skin)
log('sourceTopology', src_topo)

# ---------------------------------------------------------------- carried data as point attributes
low = gm.duplicate(skin, 'game_body')
low.vertex_groups.clear()
for m in list(low.modifiers):
    low.modifiers.remove(m)
W = np.zeros((nv, len(NAMES)), np.float32)
for k in range(widx.shape[1]):
    np.add.at(W, (np.arange(nv), widx[:, k]), ww[:, k])
for j, b in enumerate(NAMES):
    at = low.data.attributes.new('w_'+b, 'FLOAT', 'POINT')
    at.data.foreach_set('value', W[:, j])


def vec_attr(name, ids, delta):
    D = np.zeros((nv, 3), np.float32)
    D[ids] = delta
    at = low.data.attributes.new(name, 'FLOAT_VECTOR', 'POINT')
    at.data.foreach_set('vector', D.ravel())


vec_attr('k_breath', bz['ids'], bz['delta'])
vec_attr('k_breath_belly', bz['belly_ids'], bz['belly_delta'])
for kk in KEYS:
    vec_attr('c_'+kk['name'], cz[kk['name']+'__ids'], cz[kk['name']+'__delta'])

# ---------------------------------------------------------------- importance
dom = np.array([NAMES[i] for i in widx[:, 0]])
base = np.array([rc.base_of(b) for b in dom])
imp = np.full(nv, .15)
imp[np.isin(base, ['forearm', 'upperarm', 'shin', 'thigh', 'clavicle', 'neck', 'glute', 'hip'])] = .35
tail = np.char.startswith(dom, 'tail_') & (dom != 'tail_root')
imp[tail] = .6
imp[np.isin(dom, ['tail_a4', 'tail_a5', 'tail_b4', 'tail_b5', 'tail_c4', 'tail_c5'])] = .8
imp[np.isin(base, ['head', 'jaw'])] = .75
imp[np.char.startswith(dom, 'ear_')] = 1.
imp[np.isin(base, ['hand', 'foot'])] = 1.
eyes_c = np.array(rig['eyeCentres'], float)
face = (np.linalg.norm(skin_rest[:, None, :]-eyes_c[None], axis=2).min(1) < .09) | \
       (np.linalg.norm(skin_rest-np.array([0., -.2, .565]), axis=1) < .07)
imp[face & np.isin(base, ['head', 'jaw'])] = 1.
vg = low.vertex_groups.new(name='collapse_control')
q = np.round(imp*20)/20
for val in np.unique(q):
    vg.add(np.flatnonzero(q == val).tolist(), float(1-.95*val), 'REPLACE')


def region_of_names(names):
    out = []
    for b in names:
        bb = rc.base_of(b)
        if b.startswith('ear_'):
            out.append('ears')
        elif bb in ('head', 'jaw', 'neck'):
            out.append('head')
        elif bb in ('clavicle', 'upperarm', 'forearm'):
            out.append('arms')
        elif bb == 'hand':
            out.append('hands')
        elif bb in ('thigh', 'shin', 'hip', 'glute'):
            out.append('legs')
        elif bb == 'foot':
            out.append('feet')
        elif b.startswith('tail_') and b != 'tail_root':
            out.append('tails')
        else:
            out.append('trunk')
    return np.array(out)


REGION_OF_BONE = dict(zip(NAMES, region_of_names(NAMES)))
src_region = np.array([REGION_OF_BONE[b] for b in dom])
src_tri_region = src_region[skin_tris[:, 0]]
log('sourceRegionTriangles', {r: int((src_tri_region == r).sum()) for r in np.unique(src_tri_region)})
TARGET_SHARE = dict(ears=.13, head=.17, hands=.06, feet=.06, tails=.20, arms=.08, legs=.10, trunk=.20)


def read_float_attrs(mesh, names):
    n = len(mesh.vertices)
    out = np.empty((n, len(names)), np.float32)
    buf = np.empty(n, np.float32)
    for j, nm in enumerate(names):
        mesh.attributes[nm].data.foreach_get('value', buf)
        out[:, j] = buf
    return out


def region_counts(mesh):
    Wv = read_float_attrs(mesh, ['w_'+b for b in NAMES])
    d = np.argmax(Wv, 1)
    reg = np.array([REGION_OF_BONE[NAMES[i]] for i in d])
    mesh.calc_loop_triangles()
    t = np.empty(len(mesh.loop_triangles)*3, np.int32)
    mesh.loop_triangles.foreach_get('vertices', t)
    t = t.reshape(-1, 3)
    rt = reg[t[:, 0]]
    return {r: int((rt == r).sum()) for r in TARGET_SHARE}, len(t)


mod = low.modifiers.new('weighted collapse', 'DECIMATE')
mod.decimate_type = 'COLLAPSE'
mod.use_collapse_triangulate = True
mod.use_symmetry = False
mod.vertex_group = vg.name
src_tris = len(skin_tris)


def solve(factor):
    mod.vertex_group_factor = factor
    mod.ratio = a.body/src_tris
    hist = []
    for _ in range(4):
        dg = bpy.context.evaluated_depsgraph_get()
        ev = low.evaluated_get(dg)
        me = ev.to_mesh()
        counts, n = region_counts(me)
        ev.to_mesh_clear()
        hist.append(dict(ratio=mod.ratio, triangles=n))
        if abs(n-a.body) <= max(6, .005*a.body):
            break
        mod.ratio = min(1., mod.ratio*a.body/max(n, 1))
    score = float(sum(math.log(max(counts[r], 1)/(TARGET_SHARE[r]*n))**2 for r in TARGET_SHARE))
    return dict(factor=factor, ratio=mod.ratio, triangles=n, regions=counts, score=round(score, 4), history=hist)


sweep = []
if a.factor is None:
    for f in [float(x) for x in a.factors.split(',')]:
        t1 = time.time()
        r = solve(f)
        r['seconds'] = round(time.time()-t1, 1)
        sweep.append(r)
        log('sweep', sweep)
    best = min(sweep, key=lambda r: r['score'])
    factor = best['factor']
else:
    factor = a.factor
final = solve(factor)
log('chosen', final)
gm.apply(low, mod)
low.vertex_groups.clear()
for poly in low.data.polygons:
    poly.use_smooth = True
topo = gm.topology(low)
log('bodyTopology', topo)

# carried weights: four strongest, normalized
Wl = read_float_attrs(low.data, ['w_'+b for b in NAMES]).astype(np.float64)
order = np.argsort(-Wl, 1)[:, :4]
w4 = np.take_along_axis(Wl, order, 1)
sums = w4.sum(1)
unweighted = int((sums <= 1e-8).sum())
w4 /= np.maximum(sums, 1e-12)[:, None]
lost = 1-np.take_along_axis(Wl, order, 1).sum(1)/np.maximum(Wl.sum(1), 1e-12)
log('bodyWeights', dict(unweighted=unweighted, carriedSumRange=[float(Wl.sum(1).min()), float(Wl.sum(1).max())],
                        droppedBeyondFourMax=float(lost.max()), droppedBeyondFourMean=float(lost.mean())))
# check against the nearest source vertex (a cross-check only, not used)
from mathutils.kdtree import KDTree  # noqa: E402
kd = KDTree(nv)
for i, v in enumerate(skin_rest):
    kd.insert(v, i)
kd.balance()
low_co = gm.world_co(low)
near = np.array([kd.find(v)[1] for v in low_co])
near_dist = np.array([kd.find(v)[2] for v in low_co])
dom_low = np.array([NAMES[i] for i in order[:, 0]])
agree = (dom_low == dom[near])
log('weightCrossCheck', dict(nearestSourceDistanceMm=dict(max=float(near_dist.max()*s*1000), p99=float(np.quantile(near_dist, .99)*s*1000)),
                             dominantBoneAgreesWithNearestSource=float(agree.mean()),
                             disagreeByRegion={r: int(((~agree) & (np.array([REGION_OF_BONE[b] for b in dom_low]) == r)).sum()) for r in TARGET_SHARE}))
if a.stop_after == 'mesh':
    bpy.ops.wm.save_as_mainfile(filepath=str(a.work/'gamemesh-mesh.blend'))
    log('seconds', round(time.time()-t0, 1))
    print('BUILD_DONE mesh', flush=True)
    raise SystemExit(0)

# ---------------------------------------------------------------- rigid parts
parts = {}


def rigid_part(name, sources, budget_each, bone):
    objs = []
    for src_o in sources:
        o = gm.duplicate(src_o, 'tmp_'+src_o.name)
        o.vertex_groups.clear()
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        n = gm.triangles(o)
        if n > budget_each:
            m = o.modifiers.new('collapse', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'
            m.use_collapse_triangulate = True
            m.ratio = budget_each/n
            gm.apply(o, m)
        objs.append(o)
    gm.select(objs[0], objs[1:])
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    for poly in o.data.polygons:
        poly.use_smooth = True
    bm_tri = o.modifiers.new('tri', 'TRIANGULATE')
    gm.apply(o, bm_tri)
    parts[name] = dict(object=o, bone=bone, sources=[x.name for x in sources])
    return o


obj = bpy.data.objects
eye_parts = {}
for sd, key in (('L', '1'), ('R', '-1')):
    globe = obj[f'head_eye_globe_{key}']
    iris = obj[f'head_iris_and_pupil_{key}']
    g = rigid_part(f'game_eye_{sd}_globe', [globe], 220, 'head')
    i = rigid_part(f'game_eye_{sd}_iris', [iris], 80, 'head')
    gm.select(g, [i])
    bpy.ops.object.join()
    e = bpy.context.view_layer.objects.active
    e.name = f'game_eye_{sd}'
    parts.pop(f'game_eye_{sd}_iris')
    parts[f'game_eye_{sd}'] = dict(object=e, bone='head', sources=[globe.name, iris.name])
    parts.pop(f'game_eye_{sd}_globe')
claw_objs = []
for o in [o for o in obj if o.type == 'MESH' and 'claw' in o.name and not o.name.startswith(('tmp_', 'game_'))]:
    sd = 'L' if '+1' in o.name else 'R'
    bone = f'hand.{sd}' if 'fore claw' in o.name else f'foot.{sd}'
    nm = 'game_claw_'+o.name.split('claw ')[1].replace(' ', '_').replace('+1', 'L').replace('-1', 'R')+('_fore' if 'fore' in o.name else '_hind')
    rigid_part(nm, [o], 32, bone)
nose = rigid_part('game_nose', [obj['head_nose_finish']], 160, 'head')
log('parts', {k: dict(bone=v['bone'], triangles=gm.triangles(v['object']), sources=v['sources'],
                      topology={kk: vv for kk, vv in gm.topology(v['object']).items() if kk in ('nonManifoldEdges', 'boundaryEdges', 'zeroAreaFaces', 'foldedFaces', 'components')})
              for k, v in parts.items()})

# ---------------------------------------------------------------- UV atlas
game = [low]+[v['object'] for v in parts.values()]
for o in game:
    while o.data.uv_layers:
        o.data.uv_layers.remove(o.data.uv_layers[0])
    o.data.uv_layers.new(name='UVMap')
gm.smart_uv(game)
log('uv', dict(objects=[o.name for o in game]))

# ---------------------------------------------------------------- bakes
rewired = gm.rewire_base_color_emission()
log('rewired', rewired)
S = a.size
ribbons = [o for o in obj if o.type == 'MESH' and 'ribbon' in o.name]
catch = [o for o in obj if o.type == 'MESH' and o.name.startswith('catch light')]
mouth = [o for o in obj if o.type == 'MESH' and 'closed_mouth' in o.name]
groups = [
    ('body', [low], [fur, skin]+ribbons+mouth, a.color_extrusion, .04),
    ('eyes', [parts['game_eye_L']['object'], parts['game_eye_R']['object']],
     [obj['head_eye_globe_1'], obj['head_eye_globe_-1'], obj['head_iris_and_pupil_1'], obj['head_iris_and_pupil_-1']]+catch+ribbons, .003, .012),
    ('claws', [v['object'] for k, v in parts.items() if 'claw' in k], [o for o in obj if o.type == 'MESH' and 'Curved' in o.name and 'claw' in o.name], .003, .012),
    ('nose', [nose], [obj['head_nose_finish']], .003, .012),
]


import gamemesh_project as gp  # noqa: E402
meshes_all = [o for o in obj if o.type == 'MESH' and not o.name.startswith(('game_', 'tmp_'))]


def pixels(img):
    px = np.empty(img.size[0]*img.size[1]*4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(img.size[1], img.size[0], 4)


def fill(px, valid, iters=24):
    """Unfilled texels take the mean of their filled 4-neighbors, repeated (padding and misses)."""
    px = px.copy()
    valid = valid.copy()
    for _ in range(iters):
        acc = np.zeros_like(px[..., :3])
        cnt = np.zeros(valid.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = np.roll(valid, (dy, dx), (0, 1))
            sp = np.roll(px[..., :3], (dy, dx), (0, 1))
            acc += sp*sv[..., None]
            cnt += sv
        new = (~valid) & (cnt > 0)
        px[new, :3] = acc[new]/cnt[new, None]
        valid |= new
        if valid.all():
            break
    return px, valid


def masks_for(objs):
    m = np.zeros((S, S), bool)
    for o in objs:
        m |= gm.uv_coverage(o, S)
    return m


group_mask = {g[0]: masks_for(g[1]) for g in groups}
bake_log = {}
for kind in ('EMIT', 'NORMAL'):
    final_px = np.zeros((S, S, 4), np.float32)
    final_px[..., 3] = 1
    have = np.zeros((S, S), bool)
    for gname, actives, sources, ext, ray in groups:
        t1 = time.time()
        if kind == 'NORMAL':
            sources = [x for x in sources if x.type == 'MESH' and x not in ribbons+mouth+catch]
            if gname == 'body':
                sources = [skin]
                ext, ray = .004, .012
            if gname == 'eyes':
                sources = [x for x in sources if 'globe' in x.name or 'iris' in x.name]
        fur.hide_render = (gname != 'body') or kind == 'NORMAL'
        if kind == 'EMIT' and gname == 'body':
            sources = [skin]+ribbons+mouth          # meshes only: the fallback where no view sees a texel
        for act in actives:
            img = gm.bake_selected(act, sources, S, kind, extrusion=ext, max_ray=ray, samples=4 if kind == 'EMIT' else 1,
                                   margin=2, colorspace='sRGB' if kind == 'EMIT' else 'Non-Color')
            px = pixels(img)
            mk = gm.uv_coverage(act, S)
            if kind == 'EMIT' and gname == 'body':
                miss = mk & (px[..., :3].max(2) < 1e-4)
                bake_log[f'{kind}/{gname}/fallbackMissTexels'] = int(miss.sum())
                okm = mk & ~miss
                px2, _ = fill(px, okm, iters=40)
                px = np.where(mk[..., None], px2, px)
                pcol, pw, pinfo = gp.projection_color([act], S, fur, meshes_all, a.work, res=a.proj_res, samples=8, log=log)
                seen = mk & (pw > 0)
                px[seen, :3] = pcol[seen]
                bake_log[f'{kind}/{gname}/projection'] = dict(pinfo, coveredTexels=int(mk.sum()), seenTexels=int(seen.sum()),
                                                              fallbackTexels=int((mk & ~seen).sum()))
                np.save(a.work/'projection_weight.npy', pw.astype(np.float32))
            final_px[mk] = px[mk]
            have |= mk
            bpy.data.images.remove(img)
        bake_log[f'{kind}/{gname}/seconds'] = round(time.time()-t1, 1)
        log('bake', bake_log)
    final_px, _ = fill(final_px, have, iters=48)
    final_px[..., 3] = 1
    if kind == 'NORMAL':
        empty = ~have
        final_px[empty, :3] = (.5, .5, 1.)
    name = 'color' if kind == 'EMIT' else 'normal'
    out = bpy.data.images.new(name+'_full', S, S, alpha=False, float_buffer=(kind == 'NORMAL'))
    out.colorspace_settings.name = 'sRGB' if kind == 'EMIT' else 'Non-Color'
    out.pixels.foreach_set(final_px.ravel())
    out.filepath_raw = str(a.work/f'{name}_{S}.png')
    out.file_format = 'PNG'
    out.save()
    small = out.copy()
    small.scale(a.out_size, a.out_size)
    small.filepath_raw = str(a.work/f'{name}.png')
    small.file_format = 'PNG'
    small.save()

# AO on the game mesh itself, one part at a time (a multi-object bake writes only the active object's texels)
t1 = time.time()
ao_info = gm.bake_ao(game, S, a.work, a.out_size)
bake_log['AO/seconds'] = round(time.time()-t1, 1)
bake_log['AO'] = ao_info
log('bake', bake_log)

# ---------------------------------------------------------------- export
def export(objs, rigid):
    """Split by (vertex, uv) corner; one glTF vertex per pair."""
    P_, N_, T_, U_, I_, WJ, WW, KB, KBB, CORR = [], [], [], [], [], [], [], [], [], {k['name']: [] for k in KEYS}
    base = 0
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        me.calc_tangents(uvmap='UVMap')
        nl = len(me.loops)
        lv = np.empty(nl, np.int32)
        me.loops.foreach_get('vertex_index', lv)
        uv = np.empty(nl*2, np.float32)
        me.uv_layers['UVMap'].data.foreach_get('uv', uv)
        uv = uv.reshape(-1, 2)
        tg = np.empty(nl*3, np.float32)
        me.loops.foreach_get('tangent', tg)
        sg = np.empty(nl, np.float32)
        me.loops.foreach_get('bitangent_sign', sg)
        cn = np.empty(nl*3, np.float32)
        me.corner_normals.foreach_get('vector', cn)
        key = np.c_[lv, np.round(uv*1e6).astype(np.int64)]
        uniq, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        inv = inv.ravel()
        nu = len(uniq)
        mw = np.array(o.matrix_world)
        co = gm.world_co(o)
        P_.append(co[lv[first]])
        nrm = np.zeros((nu, 3))
        np.add.at(nrm, inv, cn.reshape(-1, 3))
        nrm = nrm@mw[:3, :3].T
        N_.append(nrm/np.linalg.norm(nrm, axis=1, keepdims=True))
        tan = np.zeros((nu, 3))
        np.add.at(tan, inv, tg.reshape(-1, 3))
        tan = tan@mw[:3, :3].T
        tan /= np.maximum(np.linalg.norm(tan, axis=1, keepdims=True), 1e-12)
        sgn = np.zeros(nu)
        np.add.at(sgn, inv, sg)
        T_.append(np.c_[tan, np.where(sgn >= 0, 1., -1.)])
        U_.append(uv[first])
        lt = np.empty(len(me.loop_triangles)*3, np.int32)
        me.loop_triangles.foreach_get('loops', lt)
        I_.append(inv[lt].reshape(-1, 3)+base)
        vi = lv[first]
        if rigid is None:
            WJ.append(order[vi])
            WW.append(w4[vi])
            for nm, lst in (('k_breath', KB), ('k_breath_belly', KBB)):
                buf = np.empty(len(me.vertices)*3, np.float32)
                me.attributes[nm].data.foreach_get('vector', buf)
                lst.append(buf.reshape(-1, 3)[vi])
            for kk in KEYS:
                buf = np.empty(len(me.vertices)*3, np.float32)
                me.attributes['c_'+kk['name']].data.foreach_get('vector', buf)
                CORR[kk['name']].append(buf.reshape(-1, 3)[vi])
        else:
            bone = rigid[o.name]
            WJ.append(np.tile([NAMES.index(bone), 0, 0, 0], (nu, 1)))
            WW.append(np.tile([1., 0, 0, 0], (nu, 1)))
            KB.append(np.zeros((nu, 3)))
            KBB.append(np.zeros((nu, 3)))
            for kk in KEYS:
                CORR[kk['name']].append(np.zeros((nu, 3)))
        me.free_tangents()
        base += nu
    out = dict(pos=np.concatenate(P_), nrm=np.concatenate(N_), tan=np.concatenate(T_), uv=np.concatenate(U_),
               idx=np.concatenate(I_), wj=np.concatenate(WJ), ww=np.concatenate(WW), breath=np.concatenate(KB),
               breath_belly=np.concatenate(KBB))
    for k, v in CORR.items():
        out['corr_'+k] = np.concatenate(v)
    return out


body_parts = [low, nose]+[v['object'] for k, v in parts.items() if 'claw' in k]
rigid_map = {v['object'].name: v['bone'] for v in parts.values()}
prims = dict(body=export([low], None))
rest = export([nose]+[v['object'] for k, v in parts.items() if 'claw' in k], rigid_map)
n0 = len(prims['body']['pos'])
for k in prims['body']:
    if k == 'idx':
        prims['body'][k] = np.concatenate([prims['body'][k], rest[k]+n0])
    else:
        prims['body'][k] = np.concatenate([prims['body'][k], rest[k]])
prims['eyes'] = export([parts['game_eye_L']['object'], parts['game_eye_R']['object']], rigid_map)
part_of = np.array(['body']*n0+['nose']*len(export([nose], rigid_map)['pos'])+['claws']*(len(rest['pos'])-len(export([nose], rigid_map)['pos'])))
arrays = dict(prims=np.array(list(prims)), body_part=part_of)
for pr, d in prims.items():
    for k, v in d.items():
        arrays[f'{pr}_{k}'] = v
np.savez_compressed(a.work/'gamemesh.npz', **arrays)
log('export', {pr: dict(vertices=len(d['pos']), triangles=len(d['idx'])) for pr, d in prims.items()})
for o in bpy.data.objects:
    o.hide_render = False
bpy.ops.wm.save_as_mainfile(filepath=str(a.work/'gamemesh.blend'))
log('seconds', round(time.time()-t0, 1))
print('BUILD_DONE', flush=True)
