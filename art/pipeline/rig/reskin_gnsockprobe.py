"""B-sntv pass 6: probe how a Geometry Nodes modifier input is addressed in this Blender (driver path)."""
import bpy
bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object
ng = bpy.data.node_groups.new('T', 'GeometryNodeTree')
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
sk = ng.interface.new_socket('Shot', in_out='INPUT', socket_type='NodeSocketInt')
ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput'); ng.links.new(gi.outputs['Geometry'], go.inputs['Geometry'])
md = o.modifiers.new('S', 'NODES'); md.node_group = ng; bpy.context.view_layer.update()
print('PROBE ident', sk.identifier)
print('PROBE rna', [p.identifier for p in md.bl_rna.properties])
for attr in ('properties', 'inputs', 'node_inputs'):
    if hasattr(md, attr):
        v = getattr(md, attr); print('PROBE has', attr, type(v), [p.identifier for p in v.bl_rna.properties] if hasattr(v, 'bl_rna') else v)
        try: print('PROBE keys', list(v.keys()))
        except Exception as e: print('PROBE keys err', e)
for path in (f'modifiers["S"]["{sk.identifier}"]', f'modifiers["S"].properties["{sk.identifier}"]', f'modifiers["S"].properties.{sk.identifier}', f'modifiers["S"].inputs["{sk.identifier}"].value'):
    try:
        fc = o.driver_add(path); print('PROBE ok', path); o.driver_remove(path)
    except Exception as e: print('PROBE fail', path, e)
