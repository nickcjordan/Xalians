"""B-sntv: inventory of the pass 5 rig for the re-skin (read-only).

blender -b --python reskin_inspect.py -- RIG.blend OUT.json
"""
import bpy, sys, json
import numpy as np

A = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=A[0])
rig = bpy.data.objects['luceras_rig']
out = {'bones': {}, 'objects': {}, 'drivers': [], 'constraints': {}, 'props': {k: str(v) for k, v in rig.items()}}
for b in rig.data.bones:
    out['bones'][b.name] = dict(head=[round(x, 4) for x in b.head_local], tail=[round(x, 4) for x in b.tail_local],
                                parent=b.parent.name if b.parent else None, deform=b.use_deform, roll_z=[round(x, 3) for x in b.matrix_local.col[2][:3]],
                                inherit_scale=b.inherit_scale, connect=b.use_connect, props={k: str(v) for k, v in b.items()})
for p in rig.pose.bones:
    if p.constraints:
        out['constraints'][p.name] = [(c.type, c.name, getattr(c, 'subtarget', ''), c.influence, c.mute) for c in p.constraints]
body = bpy.data.objects['luceras_blockout']
me = body.data
gn = [g.name for g in body.vertex_groups]
W = np.zeros((len(me.vertices), len(gn)))
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
nz = (W > 1e-4).sum(1)
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
out['body'] = dict(groups=gn, verts=len(me.vertices), polys=len(me.polygons), influences_hist=np.bincount(nz).tolist(),
                   sum_min=float(W.sum(1).min()), sum_max=float(W.sum(1).max()), bbox=[co.min(0).tolist(), co.max(0).tolist()],
                   mods=[(m.type, m.name, {k: str(getattr(m, k)) for k in ('object', 'use_deform_preserve_volume', 'use_multi_modifier', 'vertex_group', 'use_vertex_groups', 'use_bone_envelopes') if hasattr(m, k)}) for m in body.modifiers],
                   matrix_world=[list(r) for r in body.matrix_world], parent=body.parent.name if body.parent else None,
                   group_vert_count={n: int((W[:, j] > 1e-4).sum()) for j, n in enumerate(gn)},
                   attrs=[a.name for a in me.attributes], shape_keys=[k.name for k in me.shape_keys.key_blocks] if me.shape_keys else [])
if me.shape_keys and me.shape_keys.animation_data:
    for d in me.shape_keys.animation_data.drivers:
        dr = d.driver
        out['drivers'].append(dict(path=d.data_path, type=dr.type, expr=dr.expression,
                                   vars=[dict(name=v.name, type=v.type, targets=[dict(id=t.id.name if t.id else None, bone=t.bone_target, data_path=t.data_path, transform_type=t.transform_type, rotation_mode=t.rotation_mode, space=t.transform_space) for t in v.targets]) for v in dr.variables]))
for o in bpy.data.objects:
    out['objects'][o.name] = dict(type=o.type, kind=o.get('body_kind'), parent=o.parent.name if o.parent else None, ptype=o.parent_type, pbone=o.parent_bone,
                                  groups=[g.name for g in o.vertex_groups] if o.type == 'MESH' else None,
                                  mods=[(m.type, getattr(getattr(m, 'object', None), 'name', None)) for m in o.modifiers] if hasattr(o, 'modifiers') else None,
                                  collections=[c.name for c in o.users_collection])
act = bpy.data.actions.get('review.poses')
if act:
    out['review_poses'] = dict(range=list(act.frame_range), n_fcurves=sum(1 for _ in getattr(act, 'fcurves', [])) if hasattr(act, 'fcurves') else None,
                               layers=len(act.layers) if hasattr(act, 'layers') else None)
    try:
        fcs = act.layers[0].strips[0].channelbags[0].fcurves
    except Exception:
        fcs = getattr(act, 'fcurves', [])
    out['review_poses']['paths'] = sorted({f.data_path.split('"')[1] for f in fcs if '"' in f.data_path})
    out['review_poses']['keys_frames'] = sorted({round(k.co[0]) for f in fcs for k in f.keyframe_points})
json.dump(out, open(A[1], 'w'), indent=1)
print('INSPECT done', flush=True)
