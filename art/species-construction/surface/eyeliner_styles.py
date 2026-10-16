"""Reversible eyeliner shaders on the existing globe band and adjacent skin.

The saved globe has 59 latitude rings of 256 vertices. Rings 23 through 29
span its inherited liner. G1-outer instead colors the surrounding lid and
its existing short hairs. No positions, radii or material slots are changed.
"""
import json
import hashlib
from pathlib import Path
import bpy
import numpy as np
from render_surface import MatBuilder,lin
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

STYLES=('current','none','hairline','upper','cat-eye','ice-blue','mix-g1','mix-g2','mix-g3','G1-outer')


def apply(style,palette):
    if style not in STYLES:raise ValueError(f'Unknown eyeliner style: {style}')
    if style!='G1-outer':
        remove_outer()
    if style=='current':return
    if style=='G1-outer':
        apply_outer()
        return
    mat=bpy.data.materials['Upper emphasized eyelid'];t=mat.node_tree
    original_color=(.018,.018,.018,1.) if style.startswith('mix-') else None
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
        if style=='mix-g3':topwidth=widest
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


def apply_outer():
    """Place the full G1 ring on the skin side of the actual eye intersection."""
    skin=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
    fur=bpy.data.objects['Akinza fur'].data
    eyes=[o for o in bpy.data.objects if o.name.startswith('head_eye_globe_')]
    boxes=[np.array([v.co[:] for v in o.data.vertices]) for o in eyes]
    me=skin.data
    co=np.empty(len(me.vertices)*3,np.float32);me.vertices.foreach_get('co',co);co=co.reshape(-1,3)
    pts=np.empty(len(fur.points)*3,np.float32);fur.attributes['position'].data.foreach_get('vector',pts);pts=pts.reshape(-1,3)
    geometry_key=hashlib.sha256(b'13e-v2'+co.tobytes()+pts.tobytes()+b''.join(box.tobytes() for box in boxes)).hexdigest()
    if not all(data.get('outer_liner_geometry')==geometry_key for data in (me,fur)):
        # Use the exact close camera's image plane. Euclidean distance to the
        # globe exaggerates the lower band where the globe and skin are tangent.
        angle=np.deg2rad(2.)
        def project(v):return np.column_stack((v[:,0],v[:,1]*np.sin(angle)+v[:,2]*np.cos(angle)))
        projected=project(co);hair_projected=project(pts)
        skin_distance=np.full(len(co),1.,np.float32);hair_distance=np.full(len(pts),1.,np.float32)
        me.calc_loop_triangles()
        triangles=np.empty(len(me.loop_triangles)*3,np.int32);me.loop_triangles.foreach_get('vertices',triangles);triangles=triangles.reshape(-1,3)
        for eye,box in zip(eyes,boxes):
            tree=BVHTree.FromObject(eye,bpy.context.evaluated_depsgraph_get())
            raw=np.full(len(co),1.,np.float32)
            lo=box.min(0)-.006;hi=box.max(0)+.006
            for i in np.where(((co>lo)&(co<hi)).all(1))[0]:
                hit=tree.find_nearest(Vector(co[i]))
                if hit[1].y<-.05:raw[i]=np.dot(co[i]-np.array(hit[0]),np.array(hit[1]))
            values=raw[triangles]
            crossing=triangles[(values.min(1)<=0)&(values.max(1)>=0)&(abs(values).max(1)<.02)]
            samples=[]
            for tri in crossing:
                hits=[]
                for i,j in ((0,1),(1,2),(2,0)):
                    u,v=tri[i],tri[j]
                    if raw[u]*raw[v]<0:
                        t=float(raw[u]/(raw[u]-raw[v]));hits.append(projected[u]+t*(projected[v]-projected[u]))
                if len(hits)==2:
                    count=max(2,int(np.ceil(np.linalg.norm(hits[1]-hits[0])/.000025))+1)
                    samples.extend(np.linspace(hits[0],hits[1],count))
            samples=np.array(samples)
            assert len(samples)>100,'Missing anterior eye/skin intersection'
            outline=KDTree(len(samples))
            for i,v in enumerate(samples):outline.insert(Vector((v[0],v[1],0)),i)
            outline.balance()
            center=project(box.mean(0,keepdims=True))[0]
            lower=samples.min(0)-.006;upper=samples.max(0)+.006
            for positions,projection,distance in ((co,projected,skin_distance),(pts,hair_projected,hair_distance)):
                selected=np.where(((projection>lower)&(projection<upper)).all(1)&(positions[:,1]<box.mean(0)[1]))[0]
                for i in selected:
                    near,index,d=outline.find(Vector((projection[i,0],projection[i,1],0)))
                    outward=samples[index]-center
                    sign=1 if np.dot(projection[i]-samples[index],outward)>=0 else -1
                    distance[i]=sign*d
            print('OUTER_CONTOUR',eye.name,len(samples),'samples',flush=True)
        for data,positions,distance in ((me,co,skin_distance),(fur,pts,hair_distance)):
            fields={'outer_liner_distance':distance,'outer_liner_vertical':(positions[:,2]-.6524094)/.0911818,'outer_liner_outward':(abs(positions[:,0])-.0847464)/.067866}
            for name,v in fields.items():
                a=data.attributes.get(name)
                if a is not None and a.domain!='POINT':data.attributes.remove(a);a=None
                a=a or data.attributes.new(name,'FLOAT','POINT');a.data.foreach_set('value',v.astype(np.float32))
            data['outer_liner_geometry']=geometry_key
    mat=bpy.data.materials['Upper emphasized eyelid']
    if 'G1 source eyelid' not in bpy.data.materials:
        backup=mat.copy();backup.name='G1 source eyelid';backup.use_fake_user=True
    mat.node_tree.nodes.clear()
    source=bpy.data.materials['Ocular white'].node_tree.nodes.get('Principled BSDF')
    white=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    for name in ('Base Color','Roughness','Coat Weight','Coat Roughness'):
        white.inputs[name].default_value=source.inputs[name].default_value
    output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(white.outputs[0],output.inputs['Surface'])
    for sm in [*skin.data.materials,bpy.data.materials['Akinza hair']]:
        t=sm.node_tree
        # Remove the inherited skin halo, exactly as the other G1 mockups do.
        for node in list(t.nodes):
            if node.bl_idname=='ShaderNodeMath' and node.operation=='MAXIMUM' and node.inputs[1].is_linked:
                src=node.inputs[1].links[0].from_node
                if src.bl_idname=='ShaderNodeMapRange' and src.inputs['Value'].is_linked and getattr(src.inputs['Value'].links[0].from_node,'attribute_name','')=='eyed':
                    node['outer_original_halo']=src.name
                    node['outer_original_halo_default']=node.inputs[1].default_value
                    t.links.remove(node.inputs[1].links[0]);node.inputs[1].default_value=0
        output=next(n for n in t.nodes if n.bl_idname=='ShaderNodeOutputMaterial')
        if output.inputs['Surface'].links[0].from_node.name=='G1 outer mix':
            previous=output.inputs['Surface'].links[0].from_node.inputs[1].links[0].from_socket
            t.links.new(previous,output.inputs['Surface'])
        for node in list(t.nodes):
            if node.name.startswith('G1 outer '):t.nodes.remove(node)
        existing=set(t.nodes);b=MatBuilder(t)
        dist=b.attr('outer_liner_distance').outputs['Fac']
        upper=b.ramp(b.attr('outer_liner_vertical').outputs['Fac'],-.03,.07)
        outward=b.ramp(b.attr('outer_liner_outward').outputs['Fac'],0,1)
        top=b.m('MULTIPLY',.00171,b.m('ADD',.55,b.m('MULTIPLY',outward,.45)))
        width=b.m('ADD',b.m('MULTIPLY',upper,top),b.m('MULTIPLY',b.m('SUBTRACT',1,upper),.00035))
        # Dark starts at the globe outline and grows only onto the lid.
        band=b.m('MULTIPLY',b.m('GREATER_THAN',dist,0.),b.m('SUBTRACT',1,b.ramp(dist,width,b.m('ADD',width,.00015))))
        dark=t.nodes.new('ShaderNodeBsdfPrincipled');dark.inputs['Base Color'].default_value=(.018,.018,.018,1);dark.inputs['Roughness'].default_value=.58
        previous=output.inputs['Surface'].links[0].from_socket
        mix=t.nodes.new('ShaderNodeMixShader');b.put(mix,0,band);t.links.new(previous,mix.inputs[1]);t.links.new(dark.outputs[0],mix.inputs[2]);t.links.new(mix.outputs[0],output.inputs['Surface'])
        for node in t.nodes:
            if node not in existing:node.name='G1 outer '+node.name
        mix.name='G1 outer mix'


def remove_outer():
    """Keep legacy comparisons usable when a saved external style is selected."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:continue
        t=mat.node_tree
        output=next((n for n in t.nodes if n.bl_idname=='ShaderNodeOutputMaterial'),None)
        if output and output.inputs['Surface'].is_linked:
            node=output.inputs['Surface'].links[0].from_node
            if node.name=='G1 outer mix':t.links.new(node.inputs[1].links[0].from_socket,output.inputs['Surface'])
        for node in list(t.nodes):
            if node.name.startswith('G1 outer '):t.nodes.remove(node)
            elif 'outer_original_halo' in node:
                t.links.new(t.nodes[node['outer_original_halo']].outputs['Result'],node.inputs[1])
                node.inputs[1].default_value=node['outer_original_halo_default']
                del node['outer_original_halo_default']
                del node['outer_original_halo']
    mat=bpy.data.materials['Upper emphasized eyelid']
    backup=bpy.data.materials.get('G1 source eyelid')
    if backup:
        restored=backup.copy();restored.use_fake_user=False
        mat.user_remap(restored);bpy.data.materials.remove(mat);restored.name='Upper emphasized eyelid'
