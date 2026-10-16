"""Localized velvet and fine free-standing hairs from the step 14 concha."""
import json
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent))
from refine_ear_root_12b2 import values
from concha_v1_post import coordinates
from render_surface import lin
from concha_14_paths import baseline

root=HERE.parents[2]
work=root/'untracked/species-construction/akinza/surface/fur-steps'
# Rejected diagnostic revision: its front-ray projection crosses ear/head
# sheets. Retained to reproduce the failed fourth build, never the selected coat.
revision2='--revision2' in sys.argv
before=baseline(work);out=work/('s14c' if revision2 else 's12-14');out.mkdir(parents=True,exist_ok=True)
asm=root/'untracked/species-construction/akinza/assembled-3301'
geo=np.load(asm/'concha-region-match.npz')
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))
bpy.context.preferences.filepaths.save_version=0
info=json.loads((before/'surface-info.json').read_text())
skin=bpy.data.objects[info['skin']];co=values(skin.data,'position','vector',3)
assert np.array_equal(co,geo['before']), 'Surface must match assembled-3300 exactly'
old_co=co.copy();co+=geo['delta'];skin.data.vertices.foreach_set('co',co.ravel());skin.data.update()
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
tree=KDTree(len(co))
for i,q in enumerate(old_co):tree.insert(Vector(q),i)
tree.balance()
cu=bpy.data.objects['Akinza fur'].data
s=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',s)
count=np.diff(np.r_[s,len(cu.points)])
points=values(cu,'position','vector',3);old=points.copy();radius=values(cu,'radius');oldrad=radius.copy()
roots=points[s].copy();uv=coordinates(roots)
nearest=np.array([tree.find(Vector(q))[1] for q in roots])
nrm=values(cu,'nrm','vector',3)
if len(nrm)==len(points):nrm=nrm[s]
velvet_center=[.074,.019] if revision2 else [.064,.019]
velvet_radius=[.078,.075] if revision2 else [.051,.039]
r=np.linalg.norm((uv-velvet_center)/velvet_radius,axis=1)
front=(nrm[:,1]<-.15)&(values(skin.data,'earw')[nearest]>.95)
active=np.maximum.reduceat(radius,s)>0
weight=np.clip((1-r)/.32,0,1);weight=weight*weight*(3-2*weight);weight*=front
if revision2:
    weight=np.clip((1-r)/.18,0,1);weight=weight*weight*(3-2*weight)
    weight*=np.clip((-nrm[:,1]-.03)/.12,0,1)*np.clip((values(skin.data,'earw')[nearest]-.80)/.15,0,1)*np.clip((abs(roots[:,0])-.15)/.02,0,1)
changed=(weight>0)&active
delta=geo['delta'][nearest]
changed|=(np.linalg.norm(delta,axis=1)>0)&active
strlen=values(cu,'strlen')

def clear_front(path):
    """Keep edited fibers outside the front sheet, including segment chords."""
    path=path.copy()
    for j,q in enumerate(path):
        hit=bvh.ray_cast(Vector((float(q[0]),-1,float(q[2]))),Vector((0,1,0)),2)
        if hit[0] is not None:path[j,1]=min(path[j,1],hit[0].y-.0007)
    for iteration in range(8):
        bad=False
        for j in range(1,len(path)):
            mid=(path[j-1]+path[j])*.5
            hit=bvh.ray_cast(Vector((float(mid[0]),-1,float(mid[2]))),Vector((0,1,0)),2)
            if hit[0] is not None and mid[1]>hit[0].y-.0007:
                shift=mid[1]-hit[0].y+.0007
                path[j-1:j+1,1]-=shift;bad=True
        if not bad:break
    return path

for i in np.where(changed)[0]:
    sl=slice(s[i],s[i]+count[i]);path=points[sl].copy()
    length=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
    target=length*(1-weight[i])+(.0014+.0011*(.5+.5*np.sin(i*2.17)))*weight[i]
    if revision2 and length>.025 and weight[i]>.10:
        # Retire residual earlier native furnishings instead of leaving their
        # long faded paths behind the newly generated cup hairs.
        target=.002+.001*(.5+.5*np.sin(i*2.17))
    arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    path=np.column_stack([np.interp(np.linspace(0,min(target,length),count[i]),arc,path[:,k]) for k in range(3)])
    path+=delta[i]
    # Project only edited short hairs away from the new compact fold.
    for j in range(len(path)):
        hit=bvh.find_nearest(Vector(path[j]))
        signed=np.dot(path[j]-np.array(hit[0]),np.array(hit[1]))
        if signed<.0004:path[j]=np.array(hit[0])+np.array(hit[1])*.0004
    if revision2:path=clear_front(path)
    points[sl]=path
    radius[sl]=oldrad[s[i]]*(1-np.linspace(0,1,count[i]))**1.4+.000001
    newlength=np.linalg.norm(np.diff(path,axis=0),axis=1).sum()
    strlen[sl if cu.attributes['strlen'].domain=='POINT' else i]=newlength
cu.points.foreach_set('position',points.ravel());cu.attributes['radius'].data.foreach_set('value',radius)
cu.attributes['strlen'].data.foreach_set('value',strlen)

def attribute(data,name,v):
    a=data.attributes.get(name) or data.attributes.new(name,'FLOAT','POINT')
    a.data.foreach_set('value',np.asarray(v,np.float32))

skinuv=coordinates(co);skinr=np.linalg.norm((skinuv-velvet_center)/velvet_radius,axis=1)
normal=np.empty_like(co);skin.data.vertex_normals.foreach_get('vector',normal.ravel())
skinw=np.clip((1-skinr)/.32,0,1);skinw=skinw*skinw*(3-2*skinw)
skinw*=(normal[:,1]<-.15)&(values(skin.data,'earw')>.95)
if revision2:
    skinw=np.clip((1-skinr)/.18,0,1);skinw=skinw*skinw*(3-2*skinw)
    skinw*=np.clip((-normal[:,1]-.03)/.12,0,1)*np.clip((values(skin.data,'earw')-.80)/.15,0,1)*np.clip((abs(co[:,0])-.15)/.02,0,1)
attribute(skin.data,'concha_velvet14',skinw)
attribute(cu,'concha_velvet14',np.repeat(weight,count))

def velvet(mat):
    t=mat.node_tree;output=next(n for n in t.nodes if n.bl_idname=='ShaderNodeOutputMaterial')
    previous=output.inputs['Surface'].links[0].from_socket
    a=t.nodes.new('ShaderNodeAttribute');a.attribute_name='concha_velvet14';a.name='14 local velvet mask'
    blue=t.nodes.new('ShaderNodeBsdfDiffuse');blue.inputs['Color'].default_value=lin('#659AB5');blue.inputs['Roughness'].default_value=.8;blue.name='14 blue velvet'
    mix=t.nodes.new('ShaderNodeMixShader');mix.name='14 local velvet mix'
    t.links.new(a.outputs['Fac'],mix.inputs[0]);t.links.new(previous,mix.inputs[1]);t.links.new(blue.outputs[0],mix.inputs[2]);t.links.new(mix.outputs[0],output.inputs['Surface'])
for mat in {bpy.data.materials['Akinza hair'],*skin.data.materials}:velvet(mat)

# Remove both the old render fibers and their hidden design guides.
for name in ('Akinza canal tuft 13g','Akinza canal guides 13g'):
    ob=bpy.data.objects.get(name)
    if ob:bpy.data.objects.remove(ob,do_unlink=True)

material=bpy.data.materials.new('Akinza white concha hairs 14');material.use_nodes=True
t=material.node_tree;t.nodes.clear()
hair=t.nodes.new('ShaderNodeBsdfHairPrincipled');hair.model='CHIANG';hair.parametrization='COLOR'
hair.inputs['Color'].default_value=(.98,.98,.98,1);hair.inputs['Roughness'].default_value=.5;hair.inputs['Radial Roughness'].default_value=.55
diff=t.nodes.new('ShaderNodeBsdfDiffuse');diff.inputs['Color'].default_value=(.98,.98,.98,1)
mix=t.nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.75 if revision2 else .55
t.links.new(hair.outputs[0],mix.inputs[1]);t.links.new(diff.outputs[0],mix.inputs[2])
trans=t.nodes.new('ShaderNodeBsdfTranslucent');trans.inputs['Color'].default_value=(.98,.98,.98,1)
light=t.nodes.new('ShaderNodeMixShader');light.inputs[0].default_value=.12 if revision2 else .08
t.links.new(mix.outputs[0],light.inputs[1]);t.links.new(trans.outputs[0],light.inputs[2])
output=t.nodes.new('ShaderNodeOutputMaterial');t.links.new(light.outputs[0],output.inputs['Surface'])

def front_y(x,z):
    hit=bvh.ray_cast(Vector((float(x),-1,float(z))),Vector((0,1,0)),2)
    assert hit[0] is not None,(x,z)
    return hit[0].y

rng=np.random.default_rng(141014);paths=[];radii=[]
for side in (-1,1):
    for i in range(1100):
        lock=i%3;f=rng.uniform(-1,1)
        # Roots occupy the cup and its forward ridge, rather than a flat patch.
        u=.055+rng.uniform(-.010,.010);v=.019+rng.uniform(-.013,.013)
        if revision2:
            angle=rng.uniform(0,2*np.pi);spread=np.sqrt(rng.random())
            u=(.047,.054,.061)[lock]+.0035*spread*np.cos(angle)
            v=(.011,.019,.027)[lock]+.0045*spread*np.sin(angle)
        start=np.array([side*(.17+.8*u-.6*v),0,.64+.6*u+.8*v])
        start[1]=front_y(start[0],start[2])-.0005
        du=(.058,.073,.063)[lock]*rng.uniform(.78,1.15)
        dv=(-.012,.012,.036)[lock]+f*.008
        if revision2:
            fraction=rng.uniform(.65,1.12)
            du=(.074,.086,.068)[lock]*fraction
            dv=((- .008,.014,.044)[lock]+f*.008)*fraction
        enduv=np.array([u+du,v+dv])
        end=np.array([side*(.17+.8*enduv[0]-.6*enduv[1]),0,.64+.6*enduv[0]+.8*enduv[1]])
        t=np.linspace(0,1,16);path=start[None]+(end-start)[None]*t[:,None]
        path[:,0]+=side*.002*np.sin(np.pi*t)*np.sin(lock*2+f)
        path[:,2]+=.003*np.sin(np.pi*t)*(lock-1)
        ys=np.array([front_y(q[0],q[2]) for q in path])
        # Continuous free lift, maximum 14 mm, dissolving with fine varied tips.
        path[:,1]=ys-.0005-(.009+.004*np.cos(f))*np.sin(np.pi*t/2)
        if revision2:
            control=float(ys.min()-.026)
            path[:,1]=(1-t)**2*start[1]+2*t*(1-t)*control+t*t*(ys[-1]-.012)
            path[:,1]=np.minimum(path[:,1],ys-.0005)
        path[0]=start
        if revision2:path=clear_front(path)
        paths.append(path)
        radius=rng.uniform(.000040,.000075) if revision2 else rng.uniform(.000105,.000175)
        radii.append((radius*(1-t)**1.6+.0000006) if not revision2 or i<550 else np.zeros_like(t))
paths=np.array(paths,np.float32);radii=np.array(radii,np.float32)
hair=bpy.data.hair_curves.new('Concha hairs 14');hair.add_curves([16]*len(paths));hair.points.foreach_set('position',paths.ravel())
attribute(hair,'radius',radii.ravel())
ob=bpy.data.objects.new('Akinza concha tuft 14',hair);bpy.context.scene.collection.objects.link(ob);hair.materials.append(material)
info.update(parent=str(before),assembly='assembled-3301',additionalFurObjects=[ob.name],
    concha14=dict(nativeEdited=int(changed.sum()),fibers=len(paths),visibleFibers=1100 if revision2 else 2200,revision=2 if revision2 else 1,retired='13g tuft and hidden guides; prior native tuft radii remain suppressed'))
(out/'surface-info.json').write_text(json.dumps(info,indent=2)+'\n')
np.savez_compressed(out/'patch-evidence.npz',changed=changed,weight=weight,skinWeight=skinw,roots=roots,nearest=nearest,delta=delta,
    geometryMask=geo['mask'],geometryDelta=geo['delta'],starts=s,children=paths,radii=radii)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
print('CONCHA_COAT_SAVED',info['concha14'],flush=True)
