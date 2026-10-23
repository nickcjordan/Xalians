"""B-sntv pass 5: forearm-against-chest contact deformer (Geometry Nodes) on the sprite sculpt.

blender -b --python reskin_gncontact.py -- RIG_IN.blend CFG.json RIG_OUT.blend
Forearm-to-brisket contact in the tuck and the deep crouch is deliberate (an ungulate folds its forelegs against the
sternum). Instead of letting the two skins pass through, the chest skin is pushed out of a forearm volume:
  * a hidden proxy point cloud runs along each forearm and fore cannon (leg_f*_02, leg_f*_03), bound rigidly to its
    bone, with a per-point radius (the measured skin radius around the bone, plus a margin)
  * a Geometry Nodes modifier on the body, placed right after the Corrective Smooth, finds for every vertex the nearest
    proxy point (Sample Nearest), and moves the vertex away from it by softplus(R - d) (soft edge, no hard dent rim),
    weighted by a vertex group 'contact_mask' (trunk skin: spine, neck_01 and scapula weights; never the limb itself)
The push is zero wherever the forearm is not within R + a few mm of the skin, so rest and open poses are unchanged.
"""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, CFGP, OUTB = A[:3]
CFG = json.load(open(CFGP))
bpy.ops.wm.open_mainfile(filepath=RIG_IN)
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; me = body.data

# ---- proxy point cloud
pts, rad, groups = [], [], []
for side in ('l', 'r'):
    for bn, r0, r1, n in CFG['segments']:
        b = rig.data.bones[bn.replace('?', side)]; h, t = b.head_local, b.tail_local
        for i in range(n):
            u = i / (n - 1); pts.append(h.lerp(t, u)); rad.append(r0 + (r1 - r0) * u); groups.append(b.name)
pm = bpy.data.meshes.new('contact_proxy'); pm.from_pydata([tuple(p) for p in pts], [], [])
pm.attributes.new('radius', 'FLOAT', 'POINT').data.foreach_set('value', np.array(rad, np.float32))
proxy = bpy.data.objects.new('contact_proxy', pm); bpy.context.scene.collection.objects.link(proxy)
proxy.parent = rig; proxy['body_kind'] = 'contact_proxy'; proxy.hide_render = True
for g in sorted(set(groups)):
    vg = proxy.vertex_groups.new(name=g); vg.add([i for i, x in enumerate(groups) if x == g], 1.0, 'REPLACE')
am = proxy.modifiers.new('Armature', 'ARMATURE'); am.object = rig

# ---- mask: trunk skin (spine, neck_01, scapula), feathered over the surface
gn = [g.name for g in body.vertex_groups]; nv = len(me.vertices)
W = np.zeros(nv)
for v in me.vertices:
    for g in v.groups:
        n = gn[g.group]
        if n.startswith(('spine_', 'scapula')) or n == 'neck_01': W[v.index] += g.weight
mask = np.clip((W - CFG.get('mask_lo', 0.3)) / (CFG.get('mask_hi', 0.7) - CFG.get('mask_lo', 0.3)), 0, 1)
vg = body.vertex_groups.get('contact_mask') or body.vertex_groups.new(name='contact_mask')
q = np.round(mask * 256).astype(int)
for v in np.unique(q):
    if v > 0: vg.add(np.nonzero(q == v)[0].tolist(), v / 256.0, 'REPLACE')

# ---- node tree
ng = bpy.data.node_groups.new('ContactPush', 'GeometryNodeTree')
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
N = ng.nodes; L = ng.links
gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = proxy; oi.transform_space = 'RELATIVE'
pos = N.new('GeometryNodeInputPosition')
sn = N.new('GeometryNodeSampleNearest'); sn.domain = 'POINT'
L.new(oi.outputs['Geometry'], sn.inputs[0]); L.new(pos.outputs[0], sn.inputs['Sample Position'])
si_p = N.new('GeometryNodeSampleIndex'); si_p.data_type = 'FLOAT_VECTOR'; si_p.domain = 'POINT'
L.new(oi.outputs['Geometry'], si_p.inputs[0]); L.new(pos.outputs[0], si_p.inputs['Value']); L.new(sn.outputs['Index'], si_p.inputs['Index'])
nar = N.new('GeometryNodeInputNamedAttribute'); nar.data_type = 'FLOAT'; nar.inputs['Name'].default_value = 'radius'
si_r = N.new('GeometryNodeSampleIndex'); si_r.data_type = 'FLOAT'; si_r.domain = 'POINT'
L.new(oi.outputs['Geometry'], si_r.inputs[0]); L.new(nar.outputs['Attribute'], si_r.inputs['Value']); L.new(sn.outputs['Index'], si_r.inputs['Index'])
# pass 5 v2: push along the skin's own inward normal, just enough to put the skin below the forearm cylinder.
# h = height of the forearm axis above the skin along its normal, l = lateral offset; the cylinder bottom over this
# vertex is at h - sqrt(R^2 - l^2); push = softplus(sqrt(R^2 - l^2) - h). A forearm lying on the brisket dents the
# skin under it; one sunk below the surface takes the skin down under it (the chest wraps the forearm).
nrmn = N.new('GeometryNodeInputNormal')
dv = N.new('ShaderNodeVectorMath'); dv.operation = 'SUBTRACT'; L.new(si_p.outputs[0], dv.inputs[0]); L.new(pos.outputs[0], dv.inputs[1])   # p - v
hh = N.new('ShaderNodeVectorMath'); hh.operation = 'DOT_PRODUCT'; L.new(dv.outputs[0], hh.inputs[0]); L.new(nrmn.outputs[0], hh.inputs[1])
d2 = N.new('ShaderNodeVectorMath'); d2.operation = 'DOT_PRODUCT'; L.new(dv.outputs[0], d2.inputs[0]); L.new(dv.outputs[0], d2.inputs[1])
h2 = N.new('ShaderNodeMath'); h2.operation = 'MULTIPLY'; L.new(hh.outputs['Value'], h2.inputs[0]); L.new(hh.outputs['Value'], h2.inputs[1])
l2 = N.new('ShaderNodeMath'); l2.operation = 'SUBTRACT'; L.new(d2.outputs['Value'], l2.inputs[0]); L.new(h2.outputs[0], l2.inputs[1])
r2 = N.new('ShaderNodeMath'); r2.operation = 'MULTIPLY'; L.new(si_r.outputs[0], r2.inputs[0]); L.new(si_r.outputs[0], r2.inputs[1])
q2 = N.new('ShaderNodeMath'); q2.operation = 'SUBTRACT'; L.new(r2.outputs[0], q2.inputs[0]); L.new(l2.outputs[0], q2.inputs[1])
q2c = N.new('ShaderNodeMath'); q2c.operation = 'MAXIMUM'; L.new(q2.outputs[0], q2c.inputs[0]); q2c.inputs[1].default_value = 0.0
sq = N.new('ShaderNodeMath'); sq.operation = 'SQRT'; L.new(q2c.outputs[0], sq.inputs[0])
m1 = N.new('ShaderNodeMath'); m1.operation = 'SUBTRACT'; L.new(sq.outputs[0], m1.inputs[0]); L.new(hh.outputs['Value'], m1.inputs[1])
s = CFG.get('soft', 0.004)
m2 = N.new('ShaderNodeMath'); m2.operation = 'DIVIDE'; L.new(m1.outputs[0], m2.inputs[0]); m2.inputs[1].default_value = s
m2c = N.new('ShaderNodeMath'); m2c.operation = 'MINIMUM'; L.new(m2.outputs[0], m2c.inputs[0]); m2c.inputs[1].default_value = 40.0
m3 = N.new('ShaderNodeMath'); m3.operation = 'EXPONENT'; L.new(m2c.outputs[0], m3.inputs[0])
m4 = N.new('ShaderNodeMath'); m4.operation = 'ADD'; L.new(m3.outputs[0], m4.inputs[0]); m4.inputs[1].default_value = 1.0
m5 = N.new('ShaderNodeMath'); m5.operation = 'LOGARITHM'; L.new(m4.outputs[0], m5.inputs[0]); m5.inputs[1].default_value = math.e
m6 = N.new('ShaderNodeMath'); m6.operation = 'MULTIPLY'; L.new(m5.outputs[0], m6.inputs[0]); m6.inputs[1].default_value = s   # softplus
# only where the cylinder overlaps this vertex's column (l < R): gate by sqrt term > 0 smoothly
gate = N.new('ShaderNodeMath'); gate.operation = 'DIVIDE'; L.new(sq.outputs[0], gate.inputs[0]); gate.inputs[1].default_value = s
gatec = N.new('ShaderNodeMath'); gatec.operation = 'MINIMUM'; L.new(gate.outputs[0], gatec.inputs[0]); gatec.inputs[1].default_value = 1.0
m6g = N.new('ShaderNodeMath'); m6g.operation = 'MULTIPLY'; L.new(m6.outputs[0], m6g.inputs[0]); L.new(gatec.outputs[0], m6g.inputs[1])
capn = N.new('ShaderNodeMath'); capn.operation = 'MINIMUM'; L.new(m6g.outputs[0], capn.inputs[0]); capn.inputs[1].default_value = CFG.get('max_push', 0.05)
nrm = N.new('ShaderNodeVectorMath'); nrm.operation = 'SCALE'; L.new(nrmn.outputs[0], nrm.inputs[0]); nrm.inputs['Scale'].default_value = -1.0
nam = N.new('GeometryNodeInputNamedAttribute'); nam.data_type = 'FLOAT'; nam.inputs['Name'].default_value = 'contact_mask'
m7 = N.new('ShaderNodeMath'); m7.operation = 'MULTIPLY'; L.new(capn.outputs[0], m7.inputs[0]); L.new(nam.outputs['Attribute'], m7.inputs[1])
sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; L.new(nrm.outputs[0], sc.inputs[0]); L.new(m7.outputs[0], sc.inputs['Scale'])
st = N.new('GeometryNodeStoreNamedAttribute'); st.data_type = 'FLOAT'; st.domain = 'POINT'; st.inputs['Name'].default_value = 'contact_push'
L.new(gi.outputs[0], st.inputs[0]); L.new(m7.outputs[0], st.inputs['Value'])
sp = N.new('GeometryNodeSetPosition'); L.new(st.outputs[0], sp.inputs['Geometry']); L.new(sc.outputs[0], sp.inputs['Offset'])
L.new(sp.outputs[0], go.inputs[0])

md = body.modifiers.new('Contact Push', 'NODES'); md.node_group = ng
names = [m.name for m in body.modifiers]
target = names.index('Corrective Smooth') + 1 if 'Corrective Smooth' in names else len(names) - 1
try:
    body.modifiers.move(len(names) - 1, target)
except Exception:
    with bpy.context.temp_override(object=body):
        bpy.ops.object.modifier_move_to_index(modifier='Contact Push', index=target)
print('GNCONTACT modifiers', [m.name for m in body.modifiers][:6], 'proxy points', len(pts), flush=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
print('GNCONTACT done', flush=True)
