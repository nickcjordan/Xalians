"""Luceras surface pass (fur 1): a new groom file from the approved pass 12 groom, with the sheet's surface facts.

blender -b --python build_surface_fur1.py -- GROOM_IN.blend CLIP_RIG.blend OUT_GROOM.blend REPORT.json PARAMS.json

Writes a new groom (the input is never written):
  1. plume proxy: the groom rig gets tail_07..tail_09 at the clip rig's rest positions, and the proxy extension past
     the sculpt tail tip is weighted along tail_06..tail_09 (linear between bone midpoints along the spine arc), the
     scheme of animate/tailflight_rig.py, so no scene that uses this groom can repeat D-2mcv
  2. leg pattern (coat_color on the coat strands): white on the inner and rear faces of the forelegs (continuing the
     chest) and on the inner and front faces of the hind legs (continuing the belly), dark on the outer faces, with a
     soft transition (smoothstep over the angle around the leg axis), as the sheet's side and three-quarter views show
  3. hock: the coat strands on the lower gaskin taper in length toward the hock, so the long feathered gaskin fur
     runs into the short paw fur without a step
  4. blaze edge: the coat colour of the head strands is blurred over neighbouring roots (soft, furry blaze edge)
  5. whiskers: radius scaled down (fine, not glassy) and the emission mix removed
  6. coat contrast: an RGB curve after the coat colour (darks slightly deeper, whites unchanged)
Horns, eyes (with the cornea), claws and eyelid rims keep the groom's approved materials; the fur scene copies them
onto the clip objects.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index('--') + 1:]
GIN, CLIPRIG, GOUT, REP, PARP = A[:5]
P = json.load(open(PARP))
rep = dict(input=GIN, output=GOUT, params=P)

# clip rig rest positions of the plume bones (armature space)
bpy.ops.wm.open_mainfile(filepath=CLIPRIG)
cr = bpy.data.objects['luceras_rig']
plume_bones = {n: (list(cr.data.bones[n].head_local), list(cr.data.bones[n].tail_local)) for n in ('tail_06', 'tail_07', 'tail_08', 'tail_09')}

bpy.ops.wm.open_mainfile(filepath=GIN)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
body = bpy.data.objects['luceras_blockout']; proxy = bpy.data.objects['luceras_plume_spine']
coat = bpy.data.objects['Luceras interpolated coat']; whisk = bpy.data.objects['Luceras white whiskers']

# ---- 1. plume bones + proxy weights
bpy.context.view_layer.objects.active = rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones; added = []
d6 = np.array(eb['tail_06'].tail) - np.array(plume_bones['tail_06'][1])
for n in ('tail_07', 'tail_08', 'tail_09'):
    if n in eb: continue
    b = eb.new(n); h, t = plume_bones[n]; b.head = Vector(h); b.tail = Vector(t)
    b.parent = eb['tail_06' if n == 'tail_07' else f'tail_0{int(n[-1]) - 1}']; b.use_connect = True; b.use_deform = True
    y = (b.tail - b.head).normalized(); b.align_roll(Vector((1, 0, 0)).cross(y)); added.append(n)
bpy.ops.object.mode_set(mode='OBJECT')
rep['plume_bones_added'] = added; rep['tail_06_tip_mismatch_mm'] = round(float(np.linalg.norm(d6)) * 1000, 2)
sp = np.load(str(Path(GIN).parent / 'plume_spine.npz')); S, a = sp['S'], sp['a']
pb_ = json.loads((Path(GIN).parent / 'plume_build.json').read_text())['spine']
M = np.array(proxy.matrix_world.inverted() @ rig.matrix_world)
def arc_of(p): q = M[:3, :3] @ np.array(p) + M[:3, 3]; return float(a[int(np.argmin(np.linalg.norm(S - q, axis=1)))])
names = ('tail_06', 'tail_07', 'tail_08', 'tail_09')
mids = [arc_of((np.array(rig.data.bones[n].head_local) + np.array(rig.data.bones[n].tail_local)) / 2) for n in names]
va = np.r_[np.repeat(a, 10), a[-1]]; gi = {g.index: g.name for g in proxy.vertex_groups}
W0 = [{gi[g.group]: g.weight for g in v.groups if g.weight > 0} for v in proxy.data.vertices]; W = []
for w, x in zip(W0, va):
    if x <= pb_['on_sculpt_m']: W.append(dict(w)); continue
    if x <= mids[0]: W.append({'tail_06': 1.0}); continue
    if x >= mids[-1]: W.append({names[-1]: 1.0}); continue
    k = int(np.searchsorted(mids, x)) - 1; u = (x - mids[k]) / (mids[k + 1] - mids[k]); W.append({names[k]: 1 - u, names[k + 1]: u})
for g in list(proxy.vertex_groups): proxy.vertex_groups.remove(g)
vg = {}
for i, w in enumerate(W):
    for k_, x in w.items():
        if x > 1e-6:
            if k_ not in vg: vg[k_] = proxy.vertex_groups.new(name=k_)
            vg[k_].add([i], float(x), 'REPLACE')
proxy['role'] = 'Plume spine proxy (luceras-surface fur 1): extension weighted along tail_06..tail_09 (D-2mcv fix built in)'
rep['proxy'] = dict(groups=[g.name for g in proxy.vertex_groups], bone_mid_arcs=[round(m, 3) for m in mids])

# ---- curve data helpers
def arr(items, key, n, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x
cd = coat.data; NC = len(cd.curves)
offs = arr(cd.curves, 'first_point_index', 1, np.int32); cnt = arr(cd.curves, 'points_length', 1, np.int32)
pos = arr(cd.attributes['position'].data, 'vector', 3)
Mc = np.array(coat.matrix_world); posw = pos @ Mc[:3, :3].T + Mc[:3, 3]
roots = posw[offs]
ca = cd.attributes['coat_color']; ncomp = 4 if ca.data_type in ('FLOAT_COLOR', 'BYTE_COLOR') else 3
col = arr(ca.data, 'color' if ncomp == 4 else 'vector', ncomp)
assert ca.domain == 'CURVE', ca.domain
rep['coat'] = dict(curves=NC, coat_color_domain=ca.domain, coat_color_type=ca.data_type)
lum = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
dark = np.median(col[lum < np.percentile(lum, 30), :3], axis=0); white = np.median(col[lum > np.percentile(lum, 90), :3], axis=0)
rep['coat']['dark_ref'] = dark.round(4).tolist(); rep['coat']['white_ref'] = white.round(4).tolist()
Rw = np.array(rig.matrix_world)
def bone_seg(n):
    b = rig.data.bones[n]; return (Rw @ np.r_[b.head_local, 1])[:3], (Rw @ np.r_[b.tail_local, 1])[:3]
def seg_param(p, h, t):
    ax = t - h; u = np.clip(((p - h) @ ax) / (ax @ ax), 0, 1); foot = h + u[:, None] * ax; return u, foot, np.linalg.norm(p - foot, axis=1)
def sstep(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---- 2. leg pattern
newcol = col.copy(); leg_w = np.full(NC, -1.0)
for side, sx in (('l', 1.0), ('r', -1.0)):
    for kind in ('f', 'h'):
        segs = [bone_seg(f'leg_{kind}{side}_0{i}') for i in (1, 2, 3)]
        # strands whose root is nearest to this leg's chain and within reach, below the body line
        best = np.full(NC, 1e9); u_all = np.zeros(NC); seg_i = np.zeros(NC, int); foot_all = np.zeros((NC, 3))
        for i, (h, t) in enumerate(segs):
            u, foot, d = seg_param(roots, h, t); m = d < best; best[m] = d[m]; u_all[m] = u[m]; seg_i[m] = i; foot_all[m] = foot[m]
        reach = P['leg_reach_m']; inleg = (best < reach) & ((seg_i > 0) | (u_all > P['upper_from_u']))
        inleg &= np.sign(roots[:, 0]) == sx
        rad = roots - foot_all; rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
        medial = np.array([-sx, 0.0, 0.0]); rear = np.array([0.0, 1.0, 0.0])   # the creature faces -Y
        want = (medial + (rear if kind == 'f' else -rear) * P['fore_rear_share' if kind == 'f' else 'hind_front_share'])
        want /= np.linalg.norm(want)
        c = rad @ want                                           # 1 on the white face, -1 on the outer face
        w = sstep(P['white_from_cos'], P['white_full_cos'], c)
        # fade in from the top of the leg (the existing body pattern rules above it)
        top = np.where(seg_i == 0, sstep(P['upper_from_u'], P['upper_full_u'], u_all), 1.0)
        f = inleg * top
        target = dark[None, :] * (1 - w[:, None]) + white[None, :] * w[:, None]
        newcol[:, :3] = np.where(f[:, None] > 0, newcol[:, :3] * (1 - f[:, None] * P['leg_strength']) + target * (f[:, None] * P['leg_strength']), newcol[:, :3])
        leg_w[inleg] = w[inleg]
        rep.setdefault('legs', {})[f'{kind}{side}'] = dict(strands=int(inleg.sum()), white_share=round(float((w[inleg] > 0.5).mean()), 3) if inleg.any() else 0)

# ---- 2b. the same leg rule on the skin colour under the fur (sparse leg fur shows the skin)
ba = body.data.attributes.get('coat_color')
if ba is not None and ba.domain == 'POINT':
    bn = 4 if ba.data_type in ('FLOAT_COLOR', 'BYTE_COLOR') else 3
    bcol = arr(ba.data, 'color' if bn == 4 else 'vector', bn)
    Mb = np.array(body.matrix_world); bv = arr(body.data.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]
    for side, sx in (('l', 1.0), ('r', -1.0)):
        for kind in ('f', 'h'):
            segs = [bone_seg(f'leg_{kind}{side}_0{i}') for i in (1, 2, 3)]
            best = np.full(len(bv), 1e9); u_all = np.zeros(len(bv)); seg_i = np.zeros(len(bv), int); foot_all = np.zeros((len(bv), 3))
            for i, (h, t) in enumerate(segs):
                u, foot, d = seg_param(bv, h, t); m_ = d < best; best[m_] = d[m_]; u_all[m_] = u[m_]; seg_i[m_] = i; foot_all[m_] = foot[m_]
            inleg = (best < P['leg_reach_m']) & ((seg_i > 0) | (u_all > P['upper_from_u'])) & (np.sign(bv[:, 0]) == sx) & (seg_i < 2)
            rad = bv - foot_all; rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
            want = np.array([-sx, 0.0, 0.0]) + np.array([0.0, 1.0, 0.0]) * (P['fore_rear_share'] if kind == 'f' else -P['hind_front_share']); want /= np.linalg.norm(want)
            w = sstep(P['white_from_cos'], P['white_full_cos'], rad @ want)
            top = np.where(seg_i == 0, sstep(P['upper_from_u'], P['upper_full_u'], u_all), 1.0); f = inleg * top
            tgt = dark[None, :] * (1 - w[:, None]) + white[None, :] * w[:, None]
            bcol[:, :3] = np.where(f[:, None] > 0, bcol[:, :3] * (1 - f[:, None]) + tgt * f[:, None], bcol[:, :3])
    ba.data.foreach_set('color' if bn == 4 else 'vector', bcol.astype(np.float32).ravel()); rep['skin_leg_pattern'] = True
else:
    rep['skin_leg_pattern'] = f'skipped: body coat_color domain {ba.domain if ba else None}'

# ---- 4. blaze edge: blur the head strands' colour over neighbouring roots
hh, ht = bone_seg('head_01'); _, _, dh = seg_param(roots, hh, ht)
head = dh < P['head_reach_m']; hi = np.nonzero(head)[0]
kd = KDTree(len(hi))
for k, i in enumerate(hi): kd.insert(Vector(roots[i]), k)
kd.balance(); rr = P['blaze_blur_m']; blurred = newcol.copy()
for k, i in enumerate(hi):
    nb = kd.find_range(Vector(roots[i]), rr)
    if len(nb) < 2: continue
    idx = np.array([hi[j] for _, j, _ in nb]); dd = np.array([d for _, _, d in nb]); wt = np.exp(-(dd / (0.5 * rr)) ** 2)
    blurred[i, :3] = (newcol[idx, :3] * wt[:, None]).sum(0) / wt.sum()
newcol = blurred; rep['blaze'] = dict(head_strands=int(len(hi)), blur_radius_mm=rr * 1000)
ca.data.foreach_set('color' if ncomp == 4 else 'vector', newcol.astype(np.float32).ravel())

# ---- 3. hock taper: shorten the lower gaskin coat strands toward the hock
lens_scale = np.ones(NC)
for side in 'lr':
    h, t = bone_seg(f'leg_h{side}_02'); u, foot, d = seg_param(roots, h, t)
    near = d < P['leg_reach_m']
    s = 1.0 - (1.0 - P['hock_min_scale']) * sstep(P['hock_taper_from_u'], 1.0, u)
    lens_scale = np.where(near, np.minimum(lens_scale, s), lens_scale)
    h3, t3 = bone_seg(f'leg_h{side}_03'); u3, _, d3 = seg_param(roots, h3, t3)
    near3 = (d3 < P['leg_reach_m']) & (u3 < P['hock_cannon_u'])
    lens_scale = np.where(near3, np.minimum(lens_scale, P['hock_min_scale'] + (1 - P['hock_min_scale']) * 0.0), lens_scale)
ch = np.nonzero(lens_scale < 0.999)[0]
pt_scale = np.repeat(lens_scale, cnt)
root_rep = np.repeat(pos[offs], cnt, axis=0)
newpos = root_rep + (pos - root_rep) * pt_scale[:, None]
cd.attributes['position'].data.foreach_set('vector', newpos.astype(np.float32).ravel())
# the short paw fur at the top of the cannon is lengthened toward the hock, so the two lengths meet
paw = bpy.data.objects['Pass7 paw fur']; pd = paw.data
poffs = arr(pd.curves, 'first_point_index', 1, np.int32); pcnt = arr(pd.curves, 'points_length', 1, np.int32)
ppos = arr(pd.attributes['position'].data, 'vector', 3); Mp = np.array(paw.matrix_world); proots = (ppos @ Mp[:3, :3].T + Mp[:3, 3])[poffs]
pscale = np.ones(len(poffs))
for side in 'lr':
    h3, t3 = bone_seg(f'leg_h{side}_03'); u3, _, d3 = seg_param(proots, h3, t3)
    near = (d3 < P['leg_reach_m']) & (u3 < P['paw_boost_to_u'])
    pscale = np.where(near, 1 + (P['paw_boost'] - 1) * (1 - u3 / P['paw_boost_to_u']), pscale)
prr = np.repeat(ppos[poffs], pcnt, axis=0); ppos2 = prr + (ppos - prr) * np.repeat(pscale, pcnt)[:, None]
pd.attributes['position'].data.foreach_set('vector', ppos2.astype(np.float32).ravel())
rep['hock'] = dict(coat_strands_shortened=int(len(ch)), coat_min_scale=P['hock_min_scale'], paw_strands_lengthened=int((pscale > 1.001).sum()), paw_boost=P['paw_boost'])

# ---- 5. whiskers
wd = whisk.data
r = arr(wd.attributes['radius'].data, 'value', 1); wd.attributes['radius'].data.foreach_set('value', (r * P['whisker_radius_scale']).astype(np.float32))
for m in whisk.data.materials:
    for n in m.node_tree.nodes:
        if n.bl_idname == 'ShaderNodeMixShader': n.inputs['Factor'].default_value = 0.0
rep['whiskers'] = dict(radius_scale=P['whisker_radius_scale'], emission='removed')

# ---- 6. coat contrast curve
m = bpy.data.materials['Luceras fine wiry Chiang storm coat']; nt = m.node_tree
hair = nt.nodes['Principled Hair BSDF']; src = hair.inputs['Color'].links[0].from_socket
cv = nt.nodes.new('ShaderNodeRGBCurve'); cv.name = 'Surface fur1 contrast'
c0 = cv.mapping.curves[3]
c0.points[0].location = (0.0, 0.0); c0.points[1].location = (1.0, 1.0)
c0.points.new(P['curve_dark_in'], P['curve_dark_out'])
cv.mapping.update()
nt.links.new(src, cv.inputs['Color']); nt.links.new(cv.outputs['Color'], hair.inputs['Color'])
rep['coat_curve'] = dict(dark_in=P['curve_dark_in'], dark_out=P['curve_dark_out'])

bpy.ops.wm.save_as_mainfile(filepath=GOUT)
for f in ('plume_spine.npz', 'plume_build.json'):
    Path(GOUT).parent.joinpath(f).write_bytes(Path(GIN).parent.joinpath(f).read_bytes())
Path(REP).write_text(json.dumps(rep, indent=1)); print('SURFACE groom done', json.dumps(rep.get('legs')), flush=True)
