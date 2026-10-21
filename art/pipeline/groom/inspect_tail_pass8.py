"""B-hxhq: report tail bones, tail mesh centerline and clip actions (read only)."""
import bpy, sys, json, numpy as np
a = sys.argv[sys.argv.index('--')+1:]
for f in a:
    bpy.ops.wm.open_mainfile(filepath=f)
    print('FILE', f)
    for o in bpy.data.objects:
        print('OBJ', o.name, o.type, o.parent.name if o.parent else None, o.parent_type, o.parent_bone, [(m.name, m.type, getattr(m,'object',None) and m.object.name) for m in getattr(o,'modifiers',[])], o.animation_data.action.name if o.animation_data and o.animation_data.action else None)
    for o in bpy.data.objects:
        if o.type == 'ARMATURE':
            for b in o.data.bones:
                if 'tail' in b.name.lower():
                    print('BONE', o.name, b.name, b.parent.name if b.parent else None, b.use_deform, [round(x,4) for x in o.matrix_world @ b.head_local], [round(x,4) for x in o.matrix_world @ b.tail_local])
    for ac in bpy.data.actions:
        print('ACTION', ac.name, tuple(ac.frame_range), [m.name+':'+str(m.frame) for m in ac.pose_markers])
    s = bpy.context.scene
    print('SCENE', s.name, s.frame_start, s.frame_end, [(m.name, m.frame) for m in s.timeline_markers], [sc.name for sc in bpy.data.scenes])
    b = bpy.data.objects.get('luceras_blockout')
    if b:
        co = np.array([v.co[:] for v in b.data.vertices])
        names = [g.name for g in b.vertex_groups]
        print('VGROUPS', names)
        tg = [g.index for g in b.vertex_groups if 'tail' in g.name.lower()]
        best = {}
        for v in b.data.vertices:
            for g in v.groups:
                if g.group in tg and g.weight > .5:
                    best.setdefault(b.vertex_groups[g.group].name, []).append(v.index)
        for k, ids in sorted(best.items()):
            c = co[ids]; print('TAILSEG', k, len(ids), c.mean(0).round(4).tolist(), c.min(0).round(4).tolist(), c.max(0).round(4).tolist())
        tip = co[co[:, 1] > .5]
        if len(tip):
            i = np.argmax(tip[:, 1]); print('TAILMAX_Y', tip[i].round(4).tolist())
            for y in np.arange(.40, .75, .02):
                sel = co[(abs(co[:, 1]-y) < .005) & (co[:, 1] > .35) & (co[:, 2] > .15)]
                if len(sel): print('SLICE', round(y,3), len(sel), sel.mean(0).round(4).tolist(), (sel.max(0)-sel.min(0)).round(4).tolist())
