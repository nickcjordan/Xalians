import bpy, sys, numpy as np, json
f = sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.open_mainfile(filepath=f)
out = []
for o in bpy.data.objects:
    d = {'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None, 'mods': [(m.name, m.type) for m in getattr(o, 'modifiers', [])]}
    if o.type == 'MESH':
        co = np.array([o.matrix_world @ v.co for v in o.data.vertices]) if len(o.data.vertices) < 3000 else None
        d['verts'] = len(o.data.vertices)
        if co is not None: d['center'] = co.mean(0).round(4).tolist()
        d['attrs'] = [a.name for a in o.data.attributes][:40]
        d['vgroups'] = len(o.vertex_groups)
    out.append(d)
print('INSPECT', json.dumps(out))
if bpy.context.scene.objects.get('luceras_blockout'):
    b = bpy.data.objects['luceras_blockout']
    print('MATRIX', [list(r) for r in b.matrix_world])
    if b.data.shape_keys: print('SHAPEKEYS', [k.name for k in b.data.shape_keys.key_blocks][:30])
for a in bpy.data.actions: print('ACTION', a.name, a.frame_range[:])
print('SCENE', bpy.context.scene.frame_start, bpy.context.scene.frame_end, [m.name for m in bpy.data.markers] if hasattr(bpy.data,'markers') else '', [ (m.name,m.frame) for m in bpy.context.scene.timeline_markers])
