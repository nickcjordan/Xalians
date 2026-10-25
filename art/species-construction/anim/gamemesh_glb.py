"""Akinza game mesh pass 1: write the skinned, animated glb from the game mesh and the rig and clips of record.

  python art/species-construction/anim/gamemesh_glb.py <work dir> <rig dir> <bake dir> <out.glb> [--correctives FILE]

Inputs: <work dir>/gamemesh.npz and the baked maps (color.png, normal.png, ao.png) from gamemesh_build.py, the rig
of record (rig-p8b: joints.json, rig.json, weights) and the approved clips (clips4/bake: idle and stalk poses.json,
breath_key.npz). Pure numpy, no Blender.

Skeleton: the 49 rig_core.ANIM_BONES joints, each at its rest pivot with an identity rest rotation, so the inverse
bind matrices are translations and a joint's world matrix times its inverse bind matrix is exactly rig_core's
skinning transform x' = R x + t (bone_transforms). The clips' root move (`lift`, the crouch lowering the hips) is
carried by the pelvis joint's translation; the root joint never moves (its pose rotation is checked to be zero).
Space: rig metres (+Z up, facing -Y, left +X, origin on the floor under the pelvis) turned to glTF (+Y up, facing
+Z, left +X): (x, y, z) -> (x, z, -y).

Clips, 30 fps, linear keys at every frame: `idle` is frames 0 to 90 (frame 90 is the baked seam copy of frame 0),
3000 ms; `sig.night-stalk` is frames 0 to 44 plus idle frame 0 at 1500 ms (the atlas: frame 44 is idle frame 89's
pose and idle frame 0 follows), so the clip ends on the pose idle starts from. Morph targets: the clip's breath keys
(breath, breath_belly) with their per-frame values as morph weights; optional corrective targets (--correctives,
gamemesh_correctives.py) with their per-frame weights.

Sockets (tagged nodes, extras.xalians.socket), as the sprite atlas defines them:
  ground   child of the root, static: the floor point midway between the two ankles (feet planted; drift reported);
  head     child of the head joint: the head bone's midpoint;
  eye_l/r  children of the head joint: each eye's cornea front (sprites1/eyes/eye-sockets.json rest points);
  emitter  child of the root, animated: the mouth's midline skin vertex farthest forward, posed exactly as the sprites
           pose the skin (dual quaternions plus correctives and breath);
  carry    child of the root, animated: midway between the two hand bones' midpoints;
  status   child of the root, animated: above the head socket's column, 3.66 cm (4 sprite px at 109.26 px/m) over
           the highest game-mesh point within 7.32 cm (8 px, half a 16 px icon) of that column along the body,
           as this glb poses it.
Writes the glb and <out>.facts.json (counts, clips, bounds, sockets per frame for the sprite comparison).
"""
import argparse
import json
import struct
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402

C = np.array([[1., 0, 0], [0, 0, 1], [0, -1, 0]])        # rig (x, y, z) -> glTF (x, z, -y)
FPS = 30
PX_PER_M = 109.2635                                      # sprites1 atlas scale
STATUS_CLEAR_M = 4/PX_PER_M
STATUS_HALF_M = 8/PX_PER_M
B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
PARENT = rc.ANIM_PARENT


def load_rig(rig_dir):
    rig = json.loads((rig_dir/'rig.json').read_text())
    J = json.loads((rig_dir/'joints.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    return rig, J, s, off


def clip_frames(bake):
    idle = json.loads((bake/'idle'/'poses.json').read_text())
    stalk = json.loads((bake/'stalk'/'poses.json').read_text())
    assert len(idle) == 91 and len(stalk) == 45
    return {'idle': idle, 'sig.night-stalk': stalk+[idle[0]]}


def pivots(J):
    seg = rc.segments(J, B)
    return {b: np.asarray(seg[b][0], float) for b in NAMES}


def frame_T(J, fr):
    return rc.bone_transforms(J, fr['pose'], bones=B, root_translate=tuple(rc.lift_vec(fr['lift'])))


def joint_world(T, P):
    """bone -> (R, world pivot) in rig metres."""
    return {b: (T[b][0], T[b][0]@P[b]+T[b][1]) for b in NAMES}


def quat_xyzw(R):
    q = rc.quat_from_matrix(R)                 # w, x, y, z
    return np.array([q[1], q[2], q[3], q[0]])


def lbs(points, idx, w, T):
    return rc.skin_points(points, idx, w, T, B)


class Buf:
    def __init__(self):
        self.data = bytearray()
        self.views = []
        self.accessors = []

    def view(self, raw, target=None):
        while len(self.data) % 4:
            self.data += b'\0'
        v = dict(buffer=0, byteOffset=len(self.data), byteLength=len(raw))
        if target:
            v['target'] = target
        self.data += raw
        self.views.append(v)
        return len(self.views)-1

    def acc(self, arr, kind, comp=5126, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr)
        dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[comp]
        raw = arr.astype(dtype).tobytes()
        a = dict(bufferView=self.view(raw, target), componentType=comp, count=int(arr.shape[0]), type=kind)
        if normalized:
            a['normalized'] = True
        if minmax:
            flat = arr.reshape(arr.shape[0], -1).astype(np.float64)
            a['min'] = [float(x) for x in flat.min(0)]
            a['max'] = [float(x) for x in flat.max(0)]
        self.accessors.append(a)
        return len(self.accessors)-1


def main():
    p = argparse.ArgumentParser()
    p.add_argument('work', type=Path)
    p.add_argument('rig', type=Path)
    p.add_argument('bake', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('--correctives', type=Path, default=None)
    p.add_argument('--sprites', type=Path, default=None, help='sprites1 dir (eye sockets, mouth vertex check)')
    a = p.parse_args()
    rig, J, s, off = load_rig(a.rig)
    to_m = lambda X: s*(np.asarray(X, float)-off)
    P = pivots(J)
    G = np.load(a.work/'gamemesh.npz', allow_pickle=True)
    prims = [str(x) for x in G['prims']]
    frames = clip_frames(a.bake)
    corr = np.load(a.correctives, allow_pickle=True) if a.correctives else None
    corr_names = [str(x) for x in corr['names']] if corr is not None else []
    morph_names = ['breath', 'breath_belly']+corr_names

    # ---- rest mesh in rig metres, per primitive
    mesh = {}
    for pr in prims:
        pos = to_m(G[pr+'_pos'])
        d = dict(pos=pos, nrm=G[pr+'_nrm'].astype(float), tan=G[pr+'_tan'].astype(float), uv=G[pr+'_uv'].astype(float),
                 idx=G[pr+'_idx'].astype(np.int64), wj=G[pr+'_wj'].astype(np.int64), ww=G[pr+'_ww'].astype(float))
        d['morph'] = [G[pr+'_breath'].astype(float), G[pr+'_breath_belly'].astype(float)]
        for n in corr_names:
            d['morph'].append(corr[f'{pr}__{n}'].astype(float))
        mesh[pr] = d

    # ---- per frame transforms
    Ts = {c: [frame_T(J, fr) for fr in fl] for c, fl in frames.items()}
    for c, tl in Ts.items():
        for k, T in enumerate(tl):
            assert np.allclose(T['root'][0], np.eye(3)), (c, k, 'root rotates')

    # ---- sockets
    eyes = json.loads(((a.sprites or a.rig.parent/'sprites1')/'eyes'/'eye-sockets.json').read_text())['rest']
    eye_front = {k: to_m(v['front']) for k, v in eyes.items()}
    head_mid = (np.asarray(J['head_base'], float)+np.asarray(J['head_top'], float))/2
    # the mouth vertex, as clip_frames.py chooses it, from the source skin at rest
    src = np.load(a.work/'source.npz')
    skin_rest = src['verts'].astype(np.float64)
    mz = float(rig['mouthZ'])
    band = np.flatnonzero((np.abs(skin_rest[:, 0]) < .006) & (np.abs(skin_rest[:, 2]-mz) < .006))
    MOUTH_V = int(band[np.argmin(skin_rest[band, 1])])
    wt = np.load(a.rig/'weights.npz')
    widx = wt['idx'].astype(int)
    ww = np.round(wt['w'].astype(np.float64)*4096)/4096
    ww /= ww.sum(1, keepdims=True)
    KEYS = json.loads((a.rig/'correctives.json').read_text())['keys']
    cz = np.load(a.rig/'correctives.npz')
    SH = ac.load_shapes(a.bake)

    def sprite_vertex(v, fr, T):
        x = to_m(skin_rest[v:v+1])
        for k, (ids, dl) in SH.items():
            val = fr.get('shapes', {}).get(k, 0.)
            hit = np.flatnonzero(ids == v)
            if val and len(hit):
                x = x+val*dl[hit[0]]
        vals = rc.corrective_values(J, fr['pose'], KEYS, B)
        for kk in KEYS:
            val = vals[kk['name']]
            ids = cz[kk['name']+'__ids']
            hit = np.flatnonzero(ids == v)
            if val > 0 and len(hit):
                x = x+val*cz[kk['name']+'__delta'][hit[0]].astype(np.float64)
        Pq, _ = rc.skin_points_dq(x, widx[v:v+1], ww[v:v+1], T, B)
        return Pq[0]

    def posed_mesh(fr, T, include_corr=True):
        out = {}
        for pr, d in mesh.items():
            x = d['pos'].copy()
            vals = [fr.get('shapes', {}).get('breath', 0.), fr.get('shapes', {}).get('breath_belly', 0.)]
            x += vals[0]*d['morph'][0]+vals[1]*d['morph'][1]
            out[pr] = (x, vals)
        return out

    # corrective weights per clip and frame
    corr_w = {}
    if corr is not None:
        for c in frames:
            corr_w[c] = corr[f'weights__{c}'].astype(float)
            assert corr_w[c].shape == (len(frames[c]), len(corr_names)), (c, corr_w[c].shape)

    sock_frames = {}
    ground_all = []
    for c, fl in frames.items():
        rows = []
        for k, (fr, T) in enumerate(zip(fl, Ts[c])):
            W = joint_world(T, P)
            Rh, ph = W['head']

            def carried(bone, pt):
                R, t = T[bone]
                return R@np.asarray(pt, float)+t
            g = (carried('foot.L', J['ankle.L'])+carried('foot.R', J['ankle.R']))/2
            g[2] = 0.
            ground_all.append(g)
            head = carried('head', head_mid)
            carry = (carried('hand.L', (np.asarray(J['wrist.L'])+np.asarray(J['fingertip.L']))/2) +
                     carried('hand.R', (np.asarray(J['wrist.R'])+np.asarray(J['fingertip.R']))/2))/2
            emitter = sprite_vertex(MOUTH_V, fr, T)
            # status from this glb's own posed mesh (LBS + morphs)
            tops = []
            for pr, d in mesh.items():
                x = d['pos'].copy()
                sh = fr.get('shapes', {})
                x += sh.get('breath', 0.)*d['morph'][0]+sh.get('breath_belly', 0.)*d['morph'][1]
                if corr is not None:
                    for j in range(len(corr_names)):
                        x += corr_w[c][k, j]*d['morph'][2+j]
                X = lbs(x, d['wj'], d['ww'], T)
                col = np.abs(X[:, 1]-head[1]) <= STATUS_HALF_M
                if col.any():
                    tops.append(X[col, 2].max())
            status = np.array([head[0], head[1], max(tops)+STATUS_CLEAR_M])
            eye_l = carried('head', eye_front['eye_l'])
            eye_r = carried('head', eye_front['eye_r'])
            rows.append(dict(ground=g, head=head, eye_l=eye_l, eye_r=eye_r, emitter=emitter, carry=carry, status=status))
        sock_frames[c] = rows
    ground_all = np.array(ground_all)
    ground = ground_all[0]
    ground_drift_mm = float(np.linalg.norm(ground_all-ground, axis=1).max()*1000)

    # ---- glTF document
    buf = Buf()
    nodes = []
    for b in NAMES:
        par = PARENT[b]
        t = C@(P[b]-(P[par] if par else np.zeros(3)))
        n = dict(name=b)
        if np.abs(t).max() > 0:
            n['translation'] = [float(x) for x in t]
        nodes.append(n)
    for i, b in enumerate(NAMES):
        kids = [j for j, c in enumerate(NAMES) if PARENT[c] == b]
        if kids:
            nodes[i]['children'] = kids
    ji = {b: i for i, b in enumerate(NAMES)}

    def add_socket(name, parent, local_m):
        n = dict(name=f'socket_{name}', extras=dict(xalians=dict(socket=name)))
        t = C@np.asarray(local_m, float)
        n['translation'] = [float(x) for x in t]
        nodes.append(n)
        idx = len(nodes)-1
        nodes[ji[parent]].setdefault('children', []).append(idx)
        return idx
    sock_node = {}
    sock_node['ground'] = add_socket('ground', 'root', ground)
    sock_node['head'] = add_socket('head', 'head', head_mid-P['head'])
    sock_node['eye_l'] = add_socket('eye_l', 'head', eye_front['eye_l']-P['head'])
    sock_node['eye_r'] = add_socket('eye_r', 'head', eye_front['eye_r']-P['head'])
    for nm in ('emitter', 'carry', 'status'):
        sock_node[nm] = add_socket(nm, 'root', sock_frames['idle'][0][nm])

    # mesh
    materials = [
        dict(name='akinza_body', pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicFactor=0.0, roughnessFactor=0.9),
             normalTexture=dict(index=1), occlusionTexture=dict(index=2)),
        dict(name='akinza_eyes', pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicFactor=0.0, roughnessFactor=0.35),
             normalTexture=dict(index=1), occlusionTexture=dict(index=2)),
    ]
    prim_json = []
    facts_parts = {}
    for pr in prims:
        d = mesh[pr]
        pos = d['pos']@C.T
        nrm = d['nrm']@C.T
        nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
        tan = np.c_[d['tan'][:, :3]@C.T, d['tan'][:, 3]]
        tan[:, :3] /= np.linalg.norm(tan[:, :3], axis=1, keepdims=True)
        uv = np.c_[d['uv'][:, 0], 1-d['uv'][:, 1]]
        order = np.argsort(-d['ww'], 1)
        wj = np.take_along_axis(d['wj'], order, 1)
        wv = np.take_along_axis(d['ww'], order, 1).astype(np.float32)
        wv /= wv.sum(1, keepdims=True)
        wj[wv == 0] = 0
        attrs = dict(POSITION=buf.acc(pos, 'VEC3', target=34962, minmax=True),
                     NORMAL=buf.acc(nrm, 'VEC3', target=34962),
                     TANGENT=buf.acc(tan, 'VEC4', target=34962),
                     TEXCOORD_0=buf.acc(uv, 'VEC2', target=34962),
                     JOINTS_0=buf.acc(wj, 'VEC4', comp=5121, target=34962),
                     WEIGHTS_0=buf.acc(wv, 'VEC4', target=34962))
        targets = [dict(POSITION=buf.acc(m@C.T, 'VEC3', target=34962, minmax=True)) for m in d['morph']]
        ind = buf.acc(d['idx'].ravel(), 'SCALAR', comp=5125 if len(pos) > 65535 else 5123, target=34963)
        prim_json.append(dict(attributes=attrs, indices=ind, material=0 if pr != 'eyes' else 1, targets=targets, mode=4))
        facts_parts[pr] = dict(vertices=int(len(pos)), triangles=int(len(d['idx'])))
    meshes = [dict(name='akinza_full', primitives=prim_json, weights=[0.]*len(morph_names), extras=dict(targetNames=morph_names))]
    nodes.append(dict(name='akinza_full', mesh=0, skin=0))
    mesh_node = len(nodes)-1

    ibm = []
    for b in NAMES:
        M = np.eye(4)
        M[:3, 3] = -(C@P[b])
        ibm.append(M.T.ravel())          # column-major
    skin = dict(name='akinza_rig', joints=list(range(len(NAMES))), skeleton=0,
                inverseBindMatrices=buf.acc(np.array(ibm), 'MAT4'))

    # images
    images, textures = [], []
    for nm in ('color', 'normal', 'ao'):
        raw = (a.work/f'{nm}.png').read_bytes()
        images.append(dict(name=nm, mimeType='image/png', bufferView=buf.view(raw)))
        textures.append(dict(sampler=0, source=len(images)-1))

    # animations
    anims = []
    clip_facts = {}
    for c, fl in frames.items():
        Tl = Ts[c]
        nf = len(fl)
        times = np.arange(nf)/FPS
        tin = buf.acc(times, 'SCALAR', minmax=True)
        samplers, channels = [], []
        Wl = [joint_world(T, P) for T in Tl]
        for b in NAMES:
            par = PARENT[b]
            rots, trs = [], []
            for W in Wl:
                R, pw = W[b]
                if par is None or par == 'root':
                    Rp, pp = np.eye(3), np.zeros(3)
                else:
                    Rp, pp = W[par]
                Rl = Rp.T@R
                tl = Rp.T@(pw-pp)
                rots.append(quat_xyzw(C@Rl@C.T))
                trs.append(C@tl)
            rots = np.array(rots)
            for k in range(1, nf):
                if (rots[k]*rots[k-1]).sum() < 0:
                    rots[k] *= -1
            if b != 'root':
                samplers.append(dict(input=tin, output=buf.acc(rots, 'VEC4'), interpolation='LINEAR'))
                channels.append(dict(sampler=len(samplers)-1, target=dict(node=ji[b], path='rotation')))
            trs = np.array(trs)
            rest_t = C@(P[b]-(P[par] if par else np.zeros(3)))
            if b != 'root' and np.abs(trs-rest_t).max() > 1e-7:
                samplers.append(dict(input=tin, output=buf.acc(trs, 'VEC3'), interpolation='LINEAR'))
                channels.append(dict(sampler=len(samplers)-1, target=dict(node=ji[b], path='translation')))
        for nm in ('emitter', 'carry', 'status'):
            tr = np.array([C@r[nm] for r in sock_frames[c]])
            samplers.append(dict(input=tin, output=buf.acc(tr, 'VEC3'), interpolation='LINEAR'))
            channels.append(dict(sampler=len(samplers)-1, target=dict(node=sock_node[nm], path='translation')))
        mw = []
        for k, fr in enumerate(fl):
            sh = fr.get('shapes', {})
            row = [sh.get('breath', 0.), sh.get('breath_belly', 0.)]
            if corr is not None:
                row += list(corr_w[c][k])
            mw.append(row)
        mw = np.array(mw, float)
        samplers.append(dict(input=tin, output=buf.acc(mw.ravel(), 'SCALAR'), interpolation='LINEAR'))
        channels.append(dict(sampler=len(samplers)-1, target=dict(node=mesh_node, path='weights')))
        anims.append(dict(name=c, samplers=samplers, channels=channels))
        clip_facts[c] = dict(frames=nf, durationMs=round((nf-1)*1000/FPS, 3), morphWeightRange=[float(mw.min()), float(mw.max())])

    doc = dict(asset=dict(version='2.0', generator='xalians akinza gamemesh_glb.py (pass 1)'),
               scene=0, scenes=[dict(name='akinza', nodes=[0, mesh_node])],
               nodes=nodes, meshes=meshes, skins=[skin], materials=materials,
               samplers=[dict(magFilter=9729, minFilter=9987, wrapS=33071, wrapT=33071)],
               images=images, textures=textures, animations=anims,
               accessors=buf.accessors, bufferViews=buf.views, buffers=[dict(byteLength=0)],
               extras=dict(xalians=dict(species='akinza', note='secondary live glTF, pass 1; rig anim/rig-p8b, clips anim/clips4')))
    while len(buf.data) % 4:
        buf.data += b'\0'
    doc['buffers'][0]['byteLength'] = len(buf.data)
    js = json.dumps(doc, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(buf.data))
    glb += struct.pack('<II', len(js), 0x4E4F534A)+js+struct.pack('<II', len(buf.data), 0x004E4942)+bytes(buf.data)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_bytes(glb)

    # ---- facts: bounds over the rest pose and every frame (glTF space)
    rest = np.concatenate([mesh[pr]['pos'] for pr in prims])@C.T
    allpts = []
    for c, fl in frames.items():
        for k, (fr, T) in enumerate(zip(fl, Ts[c])):
            for pr in prims:
                d = mesh[pr]
                x = d['pos'].copy()
                sh = fr.get('shapes', {})
                x += sh.get('breath', 0.)*d['morph'][0]+sh.get('breath_belly', 0.)*d['morph'][1]
                if corr is not None:
                    for j in range(len(corr_names)):
                        x += corr_w[c][k, j]*d['morph'][2+j]
                allpts.append(lbs(x, d['wj'], d['ww'], T)@C.T)
    allpts = np.concatenate(allpts)
    facts = dict(
        parts=facts_parts, morphTargets=morph_names, joints=len(NAMES), mouthVertex=MOUTH_V, groundDriftMm=round(ground_drift_mm, 3),
        bounds=dict(rest=dict(min=[round(float(x), 4) for x in rest.min(0)], max=[round(float(x), 4) for x in rest.max(0)]),
                    footprintRadiusM=round(float(np.hypot(allpts[:, 0], allpts[:, 2]).max()), 4),
                    maxExtentM=round(float(np.linalg.norm(allpts, axis=1).max()), 4)),
        restHeightM=round(float(rest[:, 1].max()), 4),
        clips=clip_facts,
        sockets={c: [{k: [round(float(x), 6) for x in v] for k, v in r.items()} for r in rows] for c, rows in sock_frames.items()},
        bytes=len(glb))
    Path(str(a.out)+'.facts.json').write_text(json.dumps(facts, indent=1))
    print('GLB_DONE', a.out, len(glb), 'bytes', {k: v for k, v in facts.items() if k not in ('sockets',)})


if __name__ == '__main__':
    main()
