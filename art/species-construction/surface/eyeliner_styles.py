"""Reversible eyeliner shaders on the existing globe band and adjacent skin.

The saved globe has 59 latitude rings of 256 vertices. Rings 23 through 29
span its visible liner. No mesh positions, fur or material slots are changed.
"""
import json
from pathlib import Path
import bpy
import numpy as np
from render_surface import MatBuilder,lin
from mathutils import Vector
from mathutils.bvhtree import BVHTree

STYLES=('current','none','hairline','upper','cat-eye','ice-blue','mix-g1','mix-g2','mix-g3')


def apply(style,palette):
    if style not in STYLES:raise ValueError(f'Unknown eyeliner style: {style}')
    if style=='current':return
    mat=bpy.data.materials['Upper emphasized eyelid'];t=mat.node_tree
    original_color=tuple(t.nodes.get('Principled BSDF').inputs['Base Color'].default_value) if style.startswith('mix-') else None
    t.nodes.clear();b=MatBuilder(t)
    inset=b.attr('liner_distance').outputs['Fac']
    vertical=b.attr('liner_vertical').outputs['Fac']
    outward=b.attr('liner_outward').outputs['Fac']
    upper=b.ramp(vertical,-.03,.07)
    width=.00045
    if style in ('upper','cat-eye'):
        width=b.m('MULTIPLY',upper,b.m('ADD',.00045,b.m('MULTIPLY',b.ramp(outward,0,1),.00045)))
    if style.startswith('mix-'):
        widest=b.attr('liner_original_width').outputs['Fac']
        topwidth=b.m('MULTIPLY',widest,b.m('ADD',.55,b.m('MULTIPLY',b.ramp(outward,0,1),.45)))
        lowerwidth=.00035
        if style=='mix-g2':lowerwidth=b.m('MULTIPLY',lowerwidth,b.ramp(outward,-.55,.55))
        if style=='mix-g3':lowerwidth=0
        width=b.m('ADD',b.m('MULTIPLY',upper,topwidth),b.m('MULTIPLY',b.m('SUBTRACT',1,upper),lowerwidth))
    band=b.m('SUBTRACT',1,b.ramp(inset,width,b.m('ADD',width,.00020)))
    if style=='none':band=0
    elif style=='upper':band=b.m('MULTIPLY',band,upper)
    elif style=='cat-eye':band=b.m('MULTIPLY',band,b.m('MAXIMUM',upper,.10))
    elif style=='mix-g2':band=b.m('MULTIPLY',band,b.m('MAXIMUM',upper,b.ramp(outward,-.55,.15)))
    elif style=='mix-g3':band=b.m('MULTIPLY',band,upper)
    white=t.nodes.new('ShaderNodeBsdfPrincipled');white.name='Unlined eye white'
    source=bpy.data.materials['Ocular white'].node_tree.nodes.get('Principled BSDF')
    for name in ('Base Color','Roughness','Coat Weight','Coat Roughness'):
        white.inputs[name].default_value=source.inputs[name].default_value
    dark=t.nodes.new('ShaderNodeBsdfPrincipled');dark.inputs['Roughness'].default_value=.58
    dark.inputs['Base Color'].default_value=lin(palette['blue']) if style=='ice-blue' else lin('#263947' if style=='cat-eye' else '#465765')
    if style.startswith('mix-'):dark.inputs['Base Color'].default_value=original_color
    mix=t.nodes.new('ShaderNodeMixShader');b.put(mix,0,band);t.links.new(white.outputs[0],mix.inputs[1]);t.links.new(dark.outputs[0],mix.inputs[2])
    output=t.nodes.new('ShaderNodeOutputMaterial');t.links.new(mix.outputs[0],output.inputs['Surface'])
    skin=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
    bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
    for ob in bpy.data.objects:
        if ob.type!='MESH' or not ob.name.startswith('head_eye_globe_'):continue
        me=ob.data;assert len(me.vertices)==15106,'Unexpected eye topology'
        co=np.empty(len(me.vertices)*3,np.float32);me.vertices.foreach_get('co',co);co=co.reshape(-1,3)
        # Actual skin intersection, rather than a fraction of the inherited
        # upper-heavy band, gives a physically even line at the fur boundary.
        distance=[]
        for v in co:
            hit=bvh.find_nearest(Vector(v))
            distance.append(np.dot(v-np.array(hit[0]),np.array(hit[1])))
        distance=np.array(distance)
        fields={'liner_distance':distance,'liner_vertical':(co[:,2]-.6524094)/.0911818,'liner_outward':(abs(co[:,0])-.0847464)/.067866}
        if style.startswith('mix-'):
            ids=[i for i,m in enumerate(me.materials) if m==mat]
            bandverts=np.unique([v for p in me.polygons if p.material_index in ids for v in p.vertices])
            measured=distance[bandverts];measured=measured[measured>0]
            widest=float(np.quantile(measured,.95))
            print('MIX_ORIGINAL_LINER',ob.name,'color',original_color,'width',widest,flush=True)
            fields['liner_original_width']=np.full(len(co),widest)
        for name,v in fields.items():
            a=me.attributes.get(name) or me.attributes.new(name,'FLOAT','POINT');a.data.foreach_set('value',v.astype(np.float32))
    for sm in skin.data.materials:
        tree=sm.node_tree
        for node in tree.nodes:
            if node.bl_idname=='ShaderNodeMath' and node.operation=='MAXIMUM' and node.inputs[1].is_linked:
                src=node.inputs[1].links[0].from_node
                if src.bl_idname=='ShaderNodeMapRange' and src.inputs['Value'].is_linked and src.inputs['Value'].links[0].from_node.attribute_name=='eyed':
                    tree.links.remove(node.inputs[1].links[0]);node.inputs[1].default_value=0
    if style=='cat-eye':
      # A shader-only flick spans both the lid skin and its existing short fur.
      # Tinting those few hairs keeps the flick visible without rebuilding fur.
      for sm in [*skin.data.materials,bpy.data.materials['Akinza hair'],mat]:
        tree=sm.node_tree;sb=MatBuilder(tree);geom=sb.node('ShaderNodeNewGeometry');sep=sb.node('ShaderNodeSeparateXYZ');tree.links.new(geom.outputs['Position'],sep.inputs[0])
        x=sb.m('ABSOLUTE',sep.outputs['X']);dx=sb.m('SUBTRACT',x,.142)
        dz=sb.m('SUBTRACT',sep.outputs['Z'],sb.m('ADD',.657,sb.m('MULTIPLY',dx,.65)))
        taper=sb.m('MULTIPLY',sb.ramp(dx,-.001,.0015),sb.m('SUBTRACT',1,sb.ramp(dx,.008,.019)))
        wing=sb.m('MULTIPLY',taper,sb.m('SUBTRACT',1,sb.ramp(sb.m('ABSOLUTE',dz),.0003,.0022)))
        wing=sb.m('MULTIPLY',wing,sb.m('SUBTRACT',1,sb.ramp(sep.outputs['Y'],-.035,-.005)))
        output=next(n for n in tree.nodes if n.bl_idname=='ShaderNodeOutputMaterial');original=output.inputs['Surface'].links[0].from_socket
        dm=tree.nodes.new('ShaderNodeBsdfPrincipled');dm.inputs['Base Color'].default_value=lin('#263947');dm.inputs['Roughness'].default_value=.58
        mx=tree.nodes.new('ShaderNodeMixShader');sb.put(mx,0,wing);tree.links.new(original,mx.inputs[1]);tree.links.new(dm.outputs[0],mx.inputs[2]);tree.links.new(mx.outputs[0],output.inputs['Surface'])


def configured(style=None,palette=None):
    here=Path(__file__).resolve().parent
    cfg=json.loads((here/'akinza-surface.json').read_text())
    apply(style or cfg.get('eyeliner',{}).get('style','current'),palette or json.loads((here/'akinza-palettes.json').read_text())['T7'])
