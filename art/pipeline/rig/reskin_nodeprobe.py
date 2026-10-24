"""Surface pass: dump the node trees of chosen materials and the attributes of chosen curves (read only).
blender -b --python reskin_nodeprobe.py -- BLEND"""
import bpy, sys
import numpy as np
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index('--') + 1])
for mn in ('Luceras fine wiry Chiang storm coat', 'Pass7 paw Chiang pattern', 'Transferred storm slate skin', 'Matte dark brown horn horn_l', 'Amber horizontal goat eye eye_l', 'White Chiang whiskers', 'Short dark slate eyelid rim'):
    m = bpy.data.materials.get(mn)
    if not m: continue
    print('MAT', mn)
    for n in m.node_tree.nodes:
        extra = ''
        if n.bl_idname == 'ShaderNodeAttribute': extra = f'attr={n.attribute_name} type={n.attribute_type}'
        if n.bl_idname == 'ShaderNodeTexImage': extra = f'img={n.image and n.image.name}'
        if n.bl_idname == 'ShaderNodeBsdfHairPrincipled': extra = f'parametrization={n.parametrization}'
        ins = {i.name: (round(i.default_value, 3) if isinstance(i.default_value, float) else None) for i in n.inputs if not i.is_linked and hasattr(i, 'default_value') and isinstance(getattr(i, 'default_value', None), float)}
        print('  NODE', n.bl_idname, n.name, extra, {k: v for k, v in list(ins.items())[:8]})
    for l in m.node_tree.links: print('  LINK', l.from_node.name, l.from_socket.name, '->', l.to_node.name, l.to_socket.name)
for on in ('Luceras interpolated coat', 'Pass7 paw fur', 'Luceras white whiskers'):
    o = bpy.data.objects[on]; d = o.data
    print('CURVES', on, len(d.curves), len(d.points), [(a.name, a.domain, a.data_type) for a in d.attributes if not a.name.startswith('.')])
    if 'radius' in d.attributes:
        r = np.empty(len(d.points), np.float32); d.attributes['radius'].data.foreach_get('value', r); print('  radius', float(r.min()), float(np.median(r)), float(r.max()))
    print('  mods', [(m.name, m.node_group and m.node_group.name) for m in o.modifiers])
