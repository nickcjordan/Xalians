"""Akinza game mesh pass 1: the builder's checks, numbers only (gamemesh-pass1-brief.md, "Checks the builder runs").

  python art/species-construction/anim/gamemesh_checks.py <asset dir> <work dir> <rig dir> <bake dir> <sprites dir>
      --raw <raw glb> [--validator <validator output file>] [--shots <viewer shots.json>]

Writes <asset dir>/checks.json:
  triangles per part (build.json, the npz) and in the shipped file; topology of the body and parts (non-manifold,
  boundary, zero-area, folded faces, components) at rest, and folded triangles of the posed body at the deepest crouch
  (every edge bending back past 143 degrees);
  weights read back from the glb: influences per vertex, sums, unweighted vertices, joints referenced;
  playback: the glb decoded here (node TRS sampled from its own animation samplers at the key times, joint world
  matrices times inverse bind matrices, linear blend skinning, morph weights) against the numpy reference the build
  used (rig_core.skin_points), max error in mm, at idle 0, idle 45, the deepest Night Stalk frame and Night Stalk's
  end (1.5 s, idle frame 0);
  silhouettes: per region (ears, head, arms, legs, feet, tails, trunk), at rest and the deepest Night Stalk frame,
  from the 720 px side masks (gamemesh_compare.py): outline pixels of the source labeled by the region drawn there,
  their distance to the game mesh's outline (max, p95), the same the other way round, and the region's pixels drawn
  by one and not the other;
  plain skinning against the sprite poses (gamemesh_correctives.py plain-vs-sprite.json);
  sockets against the sprite atlas: the glb's sockets per frame mapped into the atlas cell by a scale and offset fit
  on the head socket (identical definitions), the pixel distance of every socket per frame;
  the validator output split into expected missing-clip failures and others; the viewer shots.
"""
import argparse
import json
import re
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import gamemesh_glb as gg  # noqa: E402

REGION_RGB = dict(ears=(1, 0, 0), head=(0, 1, 0), arms=(0, 0, 1), legs=(1, 1, 0), feet=(1, 0, 1), tails=(0, 1, 1), trunk=(1, 1, 1))


def read_glb(path):
    b = Path(path).read_bytes()
    jl = struct.unpack_from('<I', b, 12)[0]
    js = json.loads(b[20:20+jl])
    bl = struct.unpack_from('<I', b, 20+jl)[0]
    binb = b[28+jl:28+jl+bl]
    return js, binb


def accessor(js, binb, i):
    a = js['accessors'][i]
    v = js['bufferViews'][a['bufferView']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    arr = np.frombuffer(binb, dt, a['count']*n, v.get('byteOffset', 0)+a.get('byteOffset', 0))
    return arr.reshape(a['count'], n) if n > 1 else arr


def quat_mat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])


def glb_pose(js, binb, anim_name, k):
    """Node local matrices at key k of the named animation, from the file alone."""
    anim = next(x for x in js['animations'] if x['name'] == anim_name)
    loc = []
    for n in js['nodes']:
        M = np.eye(4)
        if 'rotation' in n:
            M[:3, :3] = quat_mat(n['rotation'])
        if 'translation' in n:
            M[:3, 3] = n['translation']
        loc.append(M)
    weights = None
    for ch in anim['channels']:
        s = anim['samplers'][ch['sampler']]
        out = accessor(js, binb, s['output'])
        node, path = ch['target']['node'], ch['target']['path']
        if path == 'rotation':
            loc[node][:3, :3] = quat_mat(out[k])
        elif path == 'translation':
            loc[node][:3, 3] = out[k]
        elif path == 'weights':
            nt = len(js['meshes'][0]['extras']['targetNames'])
            weights = out.reshape(-1, nt)[k]
    parent = {}
    for i, n in enumerate(js['nodes']):
        for c in n.get('children', []):
            parent[c] = i
    world = [None]*len(loc)

    def W(i):
        if world[i] is None:
            world[i] = (W(parent[i]) if i in parent else np.eye(4))@loc[i]
        return world[i]
    return [W(i) for i in range(len(loc))], weights


def skin_glb(js, binb, worlds, weights):
    sk = js['skins'][0]
    ibm = accessor(js, binb, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    mats = np.stack([worlds[j]@ibm[i] for i, j in enumerate(sk['joints'])])
    outs = []
    for pr in js['meshes'][0]['primitives']:
        P = accessor(js, binb, pr['attributes']['POSITION']).astype(np.float64)
        for t, wv in zip(pr.get('targets', []), weights if weights is not None else []):
            P = P+wv*accessor(js, binb, t['POSITION'])
        Jn = accessor(js, binb, pr['attributes']['JOINTS_0']).astype(int)
        Wn = accessor(js, binb, pr['attributes']['WEIGHTS_0']).astype(np.float64)
        Ph = np.c_[P, np.ones(len(P))]
        X = np.zeros((len(P), 3))
        for c in range(4):
            X += Wn[:, c:c+1]*np.einsum('nij,nj->ni', mats[Jn[:, c]], Ph)[:, :3]
        outs.append(X)
    return np.concatenate(outs)


def outline(mask):
    return mask & ~ndimage.binary_erosion(mask, structure=np.ones((3, 3)), border_value=0)


def labels(img):
    a = np.asarray(Image.open(img).convert('RGBA')).astype(int)
    lab = np.full(a.shape[:2], '', object)
    on = a[..., 3] > 127
    for r, c in REGION_RGB.items():
        m = on & (np.abs(a[..., 0]-255*c[0]) < 60) & (np.abs(a[..., 1]-255*c[1]) < 60) & (np.abs(a[..., 2]-255*c[2]) < 60)
        lab[m] = r
    return on, lab


def silhouette(src_png, game_png):
    s_on, s_lab = labels(src_png)
    g_on, g_lab = labels(game_png)
    so, go = outline(s_on), outline(g_on)
    dist_to_g = ndimage.distance_transform_edt(~go)
    dist_to_s = ndimage.distance_transform_edt(~so)
    out = {}
    for r in REGION_RGB:
        ms = so & (s_lab == r)
        mg = go & (g_lab == r)
        d1 = dist_to_g[ms]
        d2 = dist_to_s[mg]
        out[r] = dict(sourceOutlinePx=int(ms.sum()),
                      sourceToGameMaxPx=round(float(d1.max()), 2) if len(d1) else None,
                      sourceToGameP95Px=round(float(np.quantile(d1, .95)), 2) if len(d1) else None,
                      gameToSourceMaxPx=round(float(d2.max()), 2) if len(d2) else None,
                      gameToSourceP95Px=round(float(np.quantile(d2, .95)), 2) if len(d2) else None,
                      regionPxSourceOnly=int(((s_lab == r) & ~g_on).sum()), regionPxGameOnly=int(((g_lab == r) & ~s_on).sum()))
    out['all'] = dict(sourcePx=int(s_on.sum()), gamePx=int(g_on.sum()), xorPx=int((s_on ^ g_on).sum()),
                      outlineMaxPx=round(float(max(dist_to_g[so].max(), dist_to_s[go].max())), 2))
    return out


def main():
    p = argparse.ArgumentParser()
    for k in ('asset', 'work', 'rig', 'bake', 'sprites'):
        p.add_argument(k, type=Path)
    p.add_argument('--raw', type=Path, required=True)
    p.add_argument('--validator', type=Path, default=None)
    p.add_argument('--shots', type=Path, default=None)
    p.add_argument('--compare', type=Path, default=None)
    p.add_argument('--correctives', type=Path, default=None)
    a = p.parse_args()
    out = {}
    build = json.loads((a.work/'build.json').read_text())
    G = np.load(a.work/'gamemesh.npz', allow_pickle=True)
    out['build'] = {k: build.get(k) for k in ('chosen', 'sweep', 'bodyTopology', 'parts', 'bodyWeights', 'weightCrossCheck', 'export', 'bake', 'sourceTopology')}
    tri = {'body (skin)': build['chosen']['triangles']}
    for k, v in build['parts'].items():
        tri[k] = v['triangles']
    tri['total'] = int(sum(tri.values()))
    out['triangles'] = tri

    js, binb = read_glb(a.raw)
    # weights from the file
    wrep = {}
    for i, pr in enumerate(js['meshes'][0]['primitives']):
        Wn = accessor(js, binb, pr['attributes']['WEIGHTS_0']).astype(np.float64)
        Jn = accessor(js, binb, pr['attributes']['JOINTS_0']).astype(int)
        wrep[f'primitive{i}'] = dict(vertices=len(Wn), influencesMax=int((Wn > 0).sum(1).max()),
                                     sumMin=float(Wn.sum(1).min()), sumMax=float(Wn.sum(1).max()),
                                     unweighted=int((Wn.sum(1) <= 0).sum()), jointsUsed=int(len(np.unique(Jn[Wn > 0]))),
                                     jointIndexMax=int(Jn.max()))
    out['weights'] = wrep

    # playback from the file against the reference
    rig, J, s, off = gg.load_rig(a.rig)
    frames = gg.clip_frames(a.bake)
    stalk = frames['sig.night-stalk']
    deep = int(np.argmin([rc.lift_vec(f['lift'])[2] for f in stalk[:45]]))
    corr = np.load(a.correctives, allow_pickle=True) if a.correctives else None
    cn = [str(x) for x in corr['names']] if corr is not None else []
    play = []
    for clip, k in (('idle', 0), ('idle', 45), ('sig.night-stalk', deep), ('sig.night-stalk', 45)):
        worlds, mw = glb_pose(js, binb, clip, k)
        X = skin_glb(js, binb, worlds, mw)
        fr = frames[clip][k]
        T = gg.frame_T(J, fr)
        ref = []
        for pr in [str(x) for x in G['prims']]:
            x = s*(G[pr+'_pos'].astype(np.float64)-off)
            sh = fr.get('shapes', {})
            x = x+sh.get('breath', 0.)*G[pr+'_breath']+sh.get('breath_belly', 0.)*G[pr+'_breath_belly']
            for j, n in enumerate(cn):
                x = x+corr[f'weights__{clip}'][k, j]*corr[f'{pr}__{n}']
            wwv = G[pr+'_ww'].astype(float)
            ref.append(rc.skin_points(x, G[pr+'_wj'].astype(int), wwv/wwv.sum(1, keepdims=True), T, rc.ANIM_BONES)@gg.C.T)
        ref = np.concatenate(ref)
        play.append(dict(clip=clip, frame=k, maxErrorMm=round(float(np.linalg.norm(X-ref, axis=1).max()*1000), 4)))
    out['playbackFromFile'] = play
    out['deepFrame'] = deep

    # posed folds at the deepest crouch (body primitive, the file's own skinning)
    worlds, mw = glb_pose(js, binb, 'sig.night-stalk', deep)
    X = skin_glb(js, binb, worlds, mw)
    pr0 = js['meshes'][0]['primitives'][0]
    I = accessor(js, binb, pr0['indices']).reshape(-1, 3).astype(int)
    P0 = accessor(js, binb, pr0['attributes']['POSITION']).astype(np.float64)
    nb = len(P0)

    def folds(V):
        # merge split (uv seam) vertices by position for adjacency
        key = np.round(P0*1e6).astype(np.int64)
        _, vid = np.unique(key, axis=0, return_inverse=True)
        vid = vid.ravel()
        F = vid[I]
        n = np.cross(V[I[:, 1]]-V[I[:, 0]], V[I[:, 2]]-V[I[:, 0]])
        area = np.linalg.norm(n, axis=1)
        n = n/np.maximum(area, 1e-15)[:, None]
        edges = {}
        for f, (x, y, z) in enumerate(F):
            for e in ((x, y), (y, z), (z, x)):
                edges.setdefault(tuple(sorted(e)), []).append(f)
        sharp = np.zeros(len(F), int)
        bad_edges = 0
        for fs in edges.values():
            if len(fs) == 2 and n[fs[0]]@n[fs[1]] < -.8:
                bad_edges += 1
                sharp[fs[0]] += 1
                sharp[fs[1]] += 1
        return dict(sharpFoldEdges=int(bad_edges), facesWithAFoldEdge=int((sharp > 0).sum()), foldedFaces=int((sharp >= 3).sum()),
                    zeroAreaFaces=int((area < 1e-12).sum()))
    out['bodyFolds'] = dict(rest=folds(P0), deepCrouch=folds(X[:nb]))

    # silhouettes
    if a.compare:
        sil = {}
        for pose in ('rest', 'crouch'):
            sil[pose] = silhouette(a.compare/'masks'/f'{pose}-source.png', a.compare/'masks'/f'{pose}-game.png')
        out['silhouette720'] = sil
    pvs = a.work/'plain-vs-sprite.json'
    if pvs.exists():
        out['plainVsSprite'] = json.loads(pvs.read_text())

    # sockets against the atlas
    facts = json.loads(Path(str(a.raw)+'.facts.json').read_text())
    atlas = json.loads((a.sprites/'atlas'/'manifest.json').read_text())
    rows_g, rows_a = [], []
    for clip, n in (('idle', 90), ('sig.night-stalk', 45)):
        fs = atlas['clips'][clip]['facings']['side']['frames']
        for k in range(n):
            rows_g.append(facts['sockets'][clip][k])
            rows_a.append(fs[k]['sockets'])
    hy = np.array([r['head'][1] for r in rows_g])
    hz = np.array([r['head'][2] for r in rows_g])
    ax = np.array([r['head'][0] for r in rows_a])
    ay = np.array([r['head'][1] for r in rows_a])
    # side_left: cell x grows toward the creature's back (+y), cell y grows down (-z); one shared scale
    A = np.c_[np.r_[hy, -hz], np.r_[np.ones_like(hy), np.zeros_like(hy)], np.r_[np.zeros_like(hy), np.ones_like(hy)]]
    sol, *_ = np.linalg.lstsq(A, np.r_[ax, ay], rcond=None)
    k_, bx, by = sol
    sock = dict(fit=dict(pxPerM=round(float(k_), 4), offset=[round(float(bx), 3), round(float(by), 3)], atlasPxPerM=atlas['scale']['pixelsPerMeter']))
    for nm in ('ground', 'head', 'eye_l', 'eye_r', 'emitter', 'carry', 'status'):
        g = np.array([[k_*r[nm][1]+bx, -k_*r[nm][2]+by] for r in rows_g])
        at = np.array([r[nm] for r in rows_a])
        d = np.linalg.norm(g-at, axis=1)
        sock[nm] = dict(maxPx=round(float(d.max()), 3), meanPx=round(float(d.mean()), 3),
                        meanOffsetPx=[round(float(x), 3) for x in (g-at).mean(0)])
    out['socketsAgainstAtlas'] = sock
    out['groundDriftMm'] = facts['groundDriftMm']

    if a.validator and a.validator.exists():
        txt = a.validator.read_text(encoding='utf-8', errors='replace')
        fails = [l.strip()[2:] for l in txt.splitlines() if l.strip().startswith('- ')]
        req = ['move', 'hurt', 'evade', 'guard', 'displaced', 'held', 'faint', 'act.light', 'act.heavy']
        expected = [f for f in fails if re.search(r"required clip missing|names missing clip|must have required property '(" + '|'.join(re.escape(r) for r in req) + r")'", f)]
        out['validator'] = dict(passedLine=next((l for l in txt.splitlines() if l.startswith('passed')), None),
                                expectedMissingClipFailures=expected, otherFailures=[f for f in fails if f not in expected],
                                warnings=[l[9:] for l in txt.splitlines() if l.startswith('warning: ')])
    if a.shots and a.shots.exists():
        sh = json.loads(a.shots.read_text())
        out['viewer'] = {k: {kk: vv for kk, vv in v.items()} for k, v in sh['views'].items()}
    (a.asset/'checks.json').write_text(json.dumps(out, indent=1))
    print(json.dumps({k: v for k, v in out.items() if k not in ('build',)}, indent=1)[:12000])


if __name__ == '__main__':
    main()
