"""Render red flagged curves with neutral skin and unflagged coat, front/back."""
import sys,json
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import render_surface as render
p=Path(sys.argv[sys.argv.index('--')+1]); evidence=Path(sys.argv[sys.argv.index('--')+2]);out=evidence/'overlay';out.mkdir(parents=True,exist_ok=True)
# render.main opens the scene itself, so install diagnostics at palette setup.
def diagnostic_palette(*args):
 flags=np.load(evidence/'sweep-flags.npz');fur=bpy.data.objects['Akinza fur'];cu=fur.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy();fur.modifiers.clear();fur.data=cu
 attr=cu.attributes.new('artifact_flag','FLOAT','CURVE');attr.data.foreach_set('value',flags['flagged'].astype(np.float32))
 mat=bpy.data.materials.new('12d artifact flags');mat.use_nodes=True;t=mat.node_tree;t.nodes.clear()
 a=t.nodes.new('ShaderNodeAttribute');a.attribute_name='artifact_flag'
 mix=t.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.inputs[6].default_value=(.24,.28,.32,1);mix.inputs[7].default_value=(1,.015,.005,1);t.links.new(a.outputs['Fac'],mix.inputs[0])
 e=t.nodes.new('ShaderNodeEmission');t.links.new(mix.outputs[2],e.inputs['Color']);o=t.nodes.new('ShaderNodeOutputMaterial');t.links.new(e.outputs[0],o.inputs[0]);cu.materials.clear();cu.materials.append(mat)
 skinmat=bpy.data.materials.new('12d neutral occluder');skinmat.use_nodes=True;skinmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.28,.31,.34,1)
 for ob in bpy.data.objects:
  if ob.type=='MESH':
   for i in range(len(ob.data.materials)):ob.data.materials[i]=skinmat
render.apply_palette=diagnostic_palette
render.VIEWS.update({'flags-front':(0,4,Vector((0,.16,-.03)),2.05,768,1024),'flags-back':(180,4,Vector((0,.16,-.03)),2.05,768,1024)})
sys.argv=[__file__,'--','--surface',str(p),'--out',str(out),'--views','flags-front,flags-back','--samples','4','--palette','T7']
render.main()
