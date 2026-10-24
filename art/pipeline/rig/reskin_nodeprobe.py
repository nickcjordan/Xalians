"""Surface pass: dump the node trees of chosen materials and the attributes of chosen curves (read only).
blender -b --python reskin_nodeprobe.py -- BLEND"""
import bpy, sys
import numpy as np
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index('--') + 1])
for mn in (sys.argv[sys.argv.index('--') + 2].split(',') if len(sys.argv) > sys.argv.index('--') + 2 else ['Plume tufts']):
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
for on in ('Plume tufts white', 'Plume tufts dark'):
    o = bpy.data.objects[on]; d = o.data
    print('CURVES', on, len(d.curves), len(d.points), [(a.name, a.domain, a.data_type) for a in d.attributes if not a.name.startswith('.')])
    if 'radius' in d.attributes:
        r = np.empty(len(d.points), np.float32); d.attributes['radius'].data.foreach_get('value', r); print('  radius', float(r.min()), float(np.median(r)), float(r.max()))
    print('  mods', [(m.name, m.node_group and m.node_group.name) for m in o.modifiers])
    for an in ('plume_color', 'white_root', 'detail_tone', 'tuft_id'):
        if an in d.attributes:
            a_ = d.attributes[an]; n_ = 4 if a_.data_type == 'FLOAT_COLOR' else 3 if a_.data_type == 'FLOAT_VECTOR' else 1
            v = np.empty(len(a_.data) * n_, np.float32 if a_.data_type != 'INT' else np.int32); a_.data.foreach_get('color' if n_ == 4 else 'vector' if n_ == 3 else 'value', v)
            v = v.reshape(-1, n_) if n_ > 1 else v
            print('  attr', an, a_.domain, a_.data_type, 'min', np.round(v.min(0), 3).tolist(), 'max', np.round(v.max(0), 3).tolist(), 'mean', np.round(v.mean(0), 3).tolist())
