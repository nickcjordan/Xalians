"""B-78vx: read-only inventory of the approved rig (objects, bones, controls, constraints, drivers)."""
import bpy, sys, json
from pathlib import Path
RIG = '/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/rig.blend'
OUT = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.open_mainfile(filepath=RIG)
d = {'objects': [], 'bones': {}, 'ctrl_bones': {}, 'actions': [a.name for a in bpy.data.actions]}
for o in bpy.data.objects:
    d['objects'].append(dict(name=o.name, type=o.type, kind=o.get('body_kind'), parent=o.parent.name if o.parent else None, parent_type=o.parent_type,
                             parent_bone=o.parent_bone, hide_render=o.hide_render, hide=o.hide_get(), verts=len(o.data.vertices) if o.type == 'MESH' else None,
                             collections=[c.name for c in o.users_collection], mods=[(m.type, getattr(m, 'object', None) and m.object.name) for m in o.modifiers],
                             groups=[g.name for g in o.vertex_groups][:6] if o.type == 'MESH' else None,
                             props={k: str(o[k]) for k in o.keys()}))
rig = bpy.data.objects['luceras_rig']
for b in rig.data.bones:
    d['bones'][b.name] = dict(head=list(b.head_local), tail=list(b.tail_local), parent=b.parent.name if b.parent else None, deform=b.use_deform,
                              inherit_scale=b.inherit_scale, cons=[c.type for c in rig.pose.bones[b.name].constraints])
ctrl = bpy.data.objects.get('Luceras_Controls')
if ctrl:
    for b in ctrl.data.bones:
        pb = ctrl.pose.bones[b.name]
        d['ctrl_bones'][b.name] = dict(head=list(b.head_local), tail=list(b.tail_local), parent=b.parent.name if b.parent else None,
                                       cons=[(c.type, c.name, getattr(c, 'subtarget', None), getattr(c, 'pole_subtarget', None), getattr(c, 'pole_angle', None)) for c in pb.constraints])
    d['ctrl_props'] = {k: str(ctrl[k]) for k in ctrl.keys()}
d['rig_props'] = {k: str(rig[k]) for k in rig.keys()}
o = bpy.data.objects['luceras_blockout']
sk = o.data.shape_keys
d['shape_keys'] = [kb.name for kb in sk.key_blocks]
d['drivers'] = [dict(path=fc.data_path, expr=fc.driver.expression, vars=[(v.name, v.targets[0].bone_target, v.targets[0].transform_type, v.targets[0].transform_space) for v in fc.driver.variables]) for fc in sk.animation_data.drivers]
sc = bpy.context.scene
d['scene'] = dict(fps=sc.render.fps, start=sc.frame_start, end=sc.frame_end, engine=sc.render.engine)
(OUT / 'rig_inventory.json').write_text(json.dumps(d, indent=1))
print('INSPECT done')
