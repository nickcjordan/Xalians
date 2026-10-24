"""B-sntv pass 10b: how the plume is driven (read only).

blender -b --python reskin_plumeprobe.py -- CLIPS.blend GROOM.blend
Prints the rig's tail bones at rest (armature space), the clip's own plume spine proxy (vertex groups, extent) and the
groom pass 12 proxy (vertex groups, extent, armature target), and the plume curves' modifiers and surface.
"""
import bpy, sys
import numpy as np
A = sys.argv[sys.argv.index('--') + 1:]
CLIPS, GROOM = A[0], A[1]
bpy.ops.wm.open_mainfile(filepath=CLIPS)
rig = bpy.data.objects['luceras_rig']
for b in rig.data.bones:
    if b.name.startswith('tail_'):
        print('BONE', b.name, [round(x, 3) for x in b.head_local], [round(x, 3) for x in b.tail_local], 'deform', b.use_deform, 'parent', b.parent.name if b.parent else None)
def proxy_info(o, tag):
    V = np.array([v.co[:] for v in o.data.vertices]); W = np.array(o.matrix_world)
    Vw = V @ W[:3, :3].T + W[:3, 3]
    print(tag, o.name, 'verts', len(V), 'groups', [g.name for g in o.vertex_groups], 'mods', [(m.type, getattr(m, 'object', None) and m.object.name) for m in o.modifiers], 'parent', o.parent and o.parent.name, o.parent_type, o.parent_bone)
    print(tag, 'world min', Vw.min(0).round(3).tolist(), 'max', Vw.max(0).round(3).tolist())
    for g in o.vertex_groups:
        idx = [v.index for v in o.data.vertices if any(x.group == g.index and x.weight > 0.5 for x in v.groups)]
        if idx: print(tag, ' group', g.name, len(idx), 'y', round(float(Vw[idx, 1].min()), 3), round(float(Vw[idx, 1].max()), 3), 'z', round(float(Vw[idx, 2].min()), 3), round(float(Vw[idx, 2].max()), 3))
p = bpy.data.objects.get('luceras_plume_spine')
if p: proxy_info(p, 'CLIPPROXY')
with bpy.data.libraries.load(GROOM, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith(('Plume', 'luceras_plume_spine'))]
for o in dst.objects:
    if o is None: continue
    if o.type == 'MESH': proxy_info(o, 'GROOMPROXY')
    else:
        print('CURVES', o.name, len(o.data.curves), 'surface', o.data.surface and o.data.surface.name, 'attrs', [a.name for a in o.data.attributes if not a.name.startswith('.')][:20])
        for m in o.modifiers:
            if m.type == 'NODES' and m.node_group: print('   mod', m.name, m.node_group.name, sorted({n.bl_idname for n in m.node_group.nodes}))
