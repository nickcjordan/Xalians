"""Luceras tail shaft skin (B-gnqp, ruling N-m8rw): the skin under the shaft takes the local fur root colour (the C7 ramp: dark on
top, lighter underneath) and a matte finish, so it stops catching a highlight through the gaps in the fur.

Adds one material, 'Tail shaft skin (matte)' (Principled BSDF, roughness 1, no specular, no coat or sheen, base colour from a new
body point attribute 'shaft_skin_color'), and assigns it to the body faces whose vertices all lie on the shaft (tail position
t0 to t1, tail_02 to the plume base). The colour blends from the body's own coat_color to the fur colour over root_blend, so the
edge of the region (under the dense tail-root fur) has no step. Nothing else on the body changes (positions, weights, the other
attributes, the original material); no curves object is touched.
Optional 'foot': the same treatment on the furred faces of the hind feet (leg_h?_03 from foot_from to foot_to, dorsal and side
only, pads and claws excluded), colour = the nearest lower-leg coat strand's coat_color.

blender -b SCENE --python tail_skin.py -- PARAMS.json OUT.blend REPORT.json
"""
import bpy, sys, json
import numpy as np
from pathlib import Path
from mathutils.kdtree import KDTree
A = sys.argv[sys.argv.index('--') + 1:]; P = json.loads(Path(A[0]).read_text()); OUTB = A[1]; REP = Path(A[2])
def g(k, d): return P.get(k, d)
s = bpy.context.scene; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


def sst(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


rig.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
Mw = np.array(body.matrix_world); me = body.data; NV = len(me.vertices)
e = body.evaluated_get(dg); m = e.to_mesh(); VL = arr(m.vertices, 'co').astype(np.float64); VNL = arr(m.vertices, 'normal').astype(np.float64); e.to_mesh_clear()
VW = VL @ Mw[:3, :3].T + Mw[:3, 3]; VN = VNL @ Mw[:3, :3].T; VN /= np.linalg.norm(VN, axis=1, keepdims=True)
gn = [x.name for x in body.vertex_groups]; Wt = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for gg in v.groups: Wt[v.index, gg.group] = gg.weight
dgi = [i for i, x in enumerate(gn) if x.startswith(('root', 'spine', 'neck', 'head', 'jaw', 'ear', 'horn', 'leg', 'tail', 'scapula'))]
DOM = np.array(gn)[np.array(dgi)][Wt[:, dgi].argmax(1)]
TAILS = ['tail_0%d' % i for i in range(1, 7)]; Mr = np.array(rig.matrix_world)
ti = np.full(NV, -1.0); tz = np.zeros((NV, 3))
for k, b in enumerate(TAILS):
    bb = rig.data.bones[b]; Mb = Mr @ np.array(bb.matrix_local); h = (Mr @ np.r_[np.array(bb.head_local[:]), 1])[:3]; t_ = (Mr @ np.r_[np.array(bb.tail_local[:]), 1])[:3]
    y = (t_ - h) / np.linalg.norm(t_ - h); msk = DOM == b; ti[msk] = k + np.clip(((VW[msk] - h) @ y) / np.linalg.norm(t_ - h), 0, 1); tz[msk] = Mb[:3, 2] / np.linalg.norm(Mb[:3, 2])
C = json.loads(Path(g('colour_params', '')).read_text())
hue = np.array(C.get('hue', [1.0, 0.955, 0.93])); hue = hue / (hue @ np.array([0.2126, 0.7152, 0.0722]))
Lt, Lu0, Lu1 = C['L_top'], C['under_root'], C['under_plume']; ur = C['under_ramp']; tr_ = C.get('top_ramp', [2.0, 3.9]); sb = C.get('side_blend', [-0.6, 0.6])
t0, t1 = g('t_range', [0.9, 4.75]); rb = g('root_blend', [0.9, 1.6])
sd = np.einsum('ij,ij->i', VN, tz)
Lu = Lu0 + (Lu1 - Lu0) * sst(ur[0], ur[1], ti); Ltt = Lt + (C.get('L_top_plume', Lt) - Lt) * sst(tr_[0], tr_[1], ti)
L = (Lu + (Ltt - Lu) * sst(sb[0], sb[1], sd)) * g('skin_gain', 1.0)
fur = np.outer(L, hue)
cc = arr(me.attributes['coat_color'].data, 'color', 4)[:, :3] if 'coat_color' in me.attributes else np.full((NV, 3), 0.5)
w = sst(rb[0], rb[1], ti)[:, None]; col = cc + (fur - cc) * w
inreg = (ti >= t0) & (ti <= t1)
LOG = dict(params=P, shaft_vertices=int(inreg.sum()))
# optional foot (skin under the furred top and sides of the hind feet)
if g('foot', None):
    F = g('foot', {}); coat = s.objects['Luceras interpolated coat'].data
    cia = arr(coat.attributes['bind_ia'].data, 'value', 1, np.int32); ccol = arr(coat.attributes['coat_color'].data, 'color', 4)[:, :3]
    fm = np.zeros(NV, bool)
    for bn in ('leg_hl_03', 'leg_hr_03'):
        b_ = rig.data.bones[bn]; h_ = (Mr @ np.r_[np.array(b_.head_local[:]), 1])[:3]; t_ = (Mr @ np.r_[np.array(b_.tail_local[:]), 1])[:3]
        u_ = (t_ - h_) / np.linalg.norm(t_ - h_); pl = np.array([0, 0, -1.0]) - u_ * (-u_[2]); pl /= np.linalg.norm(pl)
        idx = np.where(DOM == bn)[0]; fr = ((VW[idx] - h_) @ u_) / np.linalg.norm(t_ - h_)
        ok = (fr >= F['from_frac']) & (fr <= F['to_frac']) & ((VN[idx] @ pl) <= F.get('plantar_max', 0.4)) & (VW[idx, 2] >= F.get('z_min_m', 0.0))
        fm[idx[ok]] = True
    on = np.isin(DOM[cia], ['leg_hl_03', 'leg_hr_03']); kd = KDTree(int(on.sum())); src = np.where(on)[0]
    for j, i in enumerate(src): kd.insert(VW[cia[i]].tolist(), j)
    kd.balance()
    if F.get('use_body_color', True): col[fm] = cc[fm] * F.get('skin_gain', 1.0)     # the skin's own transferred coat colour, now matte
    else:
        for i in np.where(fm)[0]: col[i] = ccol[src[kd.find(VW[i].tolist())[1]]] * F.get('skin_gain', 1.0)
    inreg = inreg | fm; LOG['foot_vertices'] = int(fm.sum())
at = me.attributes.get('shaft_skin_color') or me.attributes.new('shaft_skin_color', 'FLOAT_COLOR', 'POINT')
at.data.foreach_set('color', np.c_[col, np.ones(NV)].astype(np.float32).ravel())
mat = bpy.data.materials.new('Tail shaft skin (matte)'); mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
o = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); atn = nt.nodes.new('ShaderNodeAttribute'); atn.attribute_name = 'shaft_skin_color'; atn.attribute_type = 'GEOMETRY'
nt.links.new(atn.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 1.0
for nm, v in (('Specular IOR Level', 0.0), ('Coat Weight', 0.0), ('Sheen Weight', 0.0), ('Metallic', 0.0)):
    if nm in bsdf.inputs: bsdf.inputs[nm].default_value = v
nt.links.new(bsdf.outputs[0], o.inputs['Surface'])
me.materials.append(mat); mi_new = len(me.materials) - 1
pv = np.empty(sum(len(p.vertices) for p in me.polygons), np.int32); me.polygons.foreach_get('vertices', pv)
ls = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_total', ls); st = np.r_[0, np.cumsum(ls)[:-1]]
allin = np.logical_and.reduceat(inreg[pv], st)
mi = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mi); mi[allin] = mi_new; me.polygons.foreach_set('material_index', mi); me.update()
LOG['faces_reassigned'] = int(allin.sum()); LOG['material'] = mat.name
rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()
REP.parent.mkdir(parents=True, exist_ok=True); REP.write_text(json.dumps(LOG, indent=1)); Path(OUTB).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('SKIN', json.dumps(LOG), flush=True)
