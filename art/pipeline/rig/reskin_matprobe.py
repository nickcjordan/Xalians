"""Surface pass: list objects, materials and key shader values in a blend (read only).
blender -b --python reskin_matprobe.py -- BLEND [BLEND ...]"""
import bpy, sys
for path in sys.argv[sys.argv.index('--') + 1:]:
    bpy.ops.wm.open_mainfile(filepath=path); print('FILE', path)
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVES'): continue
        mats = [m.name for m in getattr(o.data, 'materials', []) if m]
        print('OBJ', o.name, o.type, 'parent', o.parent and o.parent.name, o.parent_type, o.parent_bone, 'hide_render', o.hide_render, 'mats', mats, 'verts', len(o.data.vertices) if o.type == 'MESH' else len(o.data.curves))
    for m in bpy.data.materials:
        info = []
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.bl_idname in ('ShaderNodeBsdfPrincipled', 'ShaderNodeBsdfHairPrincipled'):
                    for k in ('Base Color', 'Color', 'Roughness', 'Melanin'):
                        if k in n.inputs and not n.inputs[k].is_linked:
                            v = n.inputs[k].default_value; info.append(f"{n.bl_idname[-14:]}.{k}={[round(x,3) for x in v] if hasattr(v,'__len__') else round(v,3)}")
                        elif k in n.inputs: info.append(f'{k}=linked')
        print('MAT', m.name, 'users', m.users, info[:6])
