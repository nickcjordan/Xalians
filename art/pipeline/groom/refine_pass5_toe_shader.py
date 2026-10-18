from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text();p=json.loads((O/'parameters.json').read_text())
needle="assign(body,m)\n"
extra="""assign(body,m)
 # Shallow shading-only toe creases. Original mesh coordinates remain untouched.
 ta=m.node_tree.nodes.new('ShaderNodeAttribute');ta.attribute_name='toe_break';inv=m.node_tree.nodes.new('ShaderNodeMath');inv.operation='MULTIPLY';inv.inputs[1].default_value=-1;m.node_tree.links.new(ta.outputs['Fac'],inv.inputs[0]);bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=P['toe_bump_distance'];bump.inputs['Strength'].default_value=.65;m.node_tree.links.new(inv.outputs[0],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],b.inputs['Normal'])
"""
assert needle in s;s=s.replace(needle,extra,1)
needle=" # Save a ready-to-render neutral scene at the required sheet height."
extra=""" data=bpy.data.cameras.new('groom_camera_toes');data.type='ORTHO';data.ortho_scale=.24;data.dof.use_dof=False;o=bpy.data.objects.new(data.name,data);coll.objects.link(o);target=Vector((.15,.09,.035));o.location=target+Vector((.7,-.8,.55))*5;o.rotation_mode='QUATERNION';o.rotation_quaternion=(target-o.location).to_track_quat('-Z','Y')
 # Save a ready-to-render neutral scene at the required sheet height."""
assert needle in s;s=s.replace(needle,extra)
p['toe_bump_distance']=.0016
compile(s,'toe_shader','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
