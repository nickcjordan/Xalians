import bpy, sys, numpy as np
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index('--')+1])
dg = bpy.context.evaluated_depsgraph_get()
for n in ('Plume tufts dark', 'Plume white core'):
    o = bpy.data.objects[n]; e = o.evaluated_get(dg)
    print('ATTR', n, [(a.name, a.domain, a.data_type) for a in o.data.attributes], 'EVAL', [(a.name, a.domain) for a in e.data.attributes])
    a = o.data.attributes['plume_color']; v = np.empty(len(a.data)*4, np.float32); a.data.foreach_get('color', v); print('VAL', n, v[:8])
    m = o.data.materials[0]; print('MAT', m.name, [(nd.bl_idname, getattr(nd,'attribute_name','')) for nd in m.node_tree.nodes])
