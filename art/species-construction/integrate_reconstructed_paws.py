"""Retain the reference-derived ankle and rebuild the invented distal digits."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys
import bpy
import bmesh
from mathutils import Matrix,Vector

sys.path.insert(0,str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material,mesh_stats,sha,sphere
from blender_probe import tube

parser=argparse.ArgumentParser()
parser.add_argument('--body',type=Path,required=True)
parser.add_argument('--paw',type=Path,required=True)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out=args.out.resolve();args.out.mkdir(parents=True,exist_ok=False)
shutil.copyfile(__file__,args.out/'integration_source.py')
provenance_sha = snapshot(args.out, __file__, [args.body,args.paw])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)


def load(path):
    prior=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    obs=[o for o in bpy.data.objects if o not in prior and o.type=='MESH']
    for o in obs:
        transform=o.matrix_world.copy()
        for v in o.data.vertices:v.co=transform@v.co
        o.parent=None;o.matrix_world=Matrix.Identity(4)
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bm.to_mesh(o.data);bm.free()
    return max(obs,key=lambda o:len(o.data.vertices))


def edit_mesh(obj,action):
    bm=bmesh.new();bm.from_mesh(obj.data)
    action(bm)
    bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data);bm.free()


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj


body=load(args.body)
activate(body)
group=body.vertex_groups.new(name='Lower thigh scan residue')
for v in body.data.vertices:
    x,y,z=v.co
    w=math.exp(-((abs(x)-.225)/.085)**2-((z+.365)/.105)**2)*max(0,min(1,(-y+.015)/.045))
    if w>.001:group.add([v.index],w,'REPLACE')
mod=body.modifiers.new('Remove isolated thigh dimples','SMOOTH')
mod.vertex_group=group.name;mod.iterations=600;mod.factor=.65
bpy.ops.object.modifier_apply(modifier=mod.name)
edit_mesh(body,lambda bm:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
          dist=.000001,plane_co=(0,0,-.770),plane_no=(0,0,1),clear_inner=True))
paw=load(args.paw)
edit_mesh(paw,lambda bm:bmesh.ops.delete(bm,geom=[v for v in bm.verts
          if v.co.z < -.975 or v.co.z > .46 or (v.co.y < -.18 and v.co.z < -.55)],context='VERTS'))
activate(paw)
paw.data.remesh_voxel_size=.011
bpy.ops.object.voxel_remesh()
mod=paw.modifiers.new('Remove reconstructed fur residue','SMOOTH')
mod.iterations=65;mod.factor=.7
bpy.ops.object.modifier_apply(modifier=mod.name)
pieces=[paw]
pieces.append(sphere({'id':'Compact paw body','center':[0,-.25,-.64],'scale':[.46,.52,.325]}))
claws=[]
for i in range(4):
    x=(i-1.5)*.205
    front=-.68-(.045 if i in [1,2] else 0)
    pieces.append(sphere({'id':f'Grouped toe {i}','center':[x,front,-.765],
                         'scale':[.132,.205,.172]}))
    controls=[[x,front-.11,-.735,.063,.056], [x,front-.20,-.755,.056,.045],
              [x,front-.25,-.795,.033,.029], [x,front-.26,-.843,.002,.002]]
    claw=tube(f'Short curved hind claw {i}',[[n*10 for n in row] for row in controls])
    for v in claw.data.vertices:v.co/=10
    activate(claw)
    sub=claw.modifiers.new('Rounded claw sections','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    claws.append(claw)
activate(paw)
for o in pieces:o.select_set(True)
bpy.ops.object.join()
paw.data.remesh_voxel_size=.009
bpy.ops.object.voxel_remesh()
mod=paw.modifiers.new('Fuse four toes to paw roof','SMOOTH');mod.iterations=16;mod.factor=.5
bpy.ops.object.modifier_apply(modifier=mod.name)
base_paw=paw.data.copy()
base_claws=[o.data.copy() for o in claws]
for o in [paw,*claws]:bpy.data.objects.remove(o,do_unlink=True)
skin_parts=[body]
claw_mat=material('Short animal hind claws',.10)
for obj in list(bpy.context.scene.objects):
    if 'fore_claw' in obj.name:
        bpy.data.objects.remove(obj,do_unlink=True)
for side in [-1,1]:
    for i in range(4):
        x=side*.479+(i-1.5)*.029
        z=-.259+.008*abs(i-1.5)
        skin_parts.append(sphere({'id':f'Compact fore digit {side} {i}',
                                  'center':[x,-.142,z],'scale':[.0175,.026,.026]}))
        claw=tube(f'Tapered fore claw {side} {i}',[
            [x,-.157,z-.010,.008,.009],[x,-.167,z-.027,.007,.007],
            [x,-.164,z-.042,.010,.010]])
        # Author the short tip explicitly; the legacy sweep clamps radii at .01.
        for v in claw.data.vertices:
            t=max(0,min(1,(-v.co.z+z-.010)/.033))
            v.co.x=x+(v.co.x-x)*(1-.92*t)
            v.co.y=-.164+(v.co.y+.164)*(1-.75*t)
        claw.data.materials.append(claw_mat)
for side in [-1,1]:
    for i,base in enumerate([base_paw,*base_claws]):
        mesh=base.copy();obj=bpy.data.objects.new(('Paw' if i==0 else 'Claw')+f' {side} {i}',mesh)
        bpy.context.collection.objects.link(obj)
        for v in mesh.vertices:
            x,y,z=v.co
            # Align the inferred ankle shaft without bending the toe cluster.
            center_shift=.20*max(0,min(1,(z+.5)/.55))
            # Measured body cross-section at z=-.77 is centered at x=.299,y=.031.
            # Continue its outward shaft direction toward the planted toe cluster.
            v.co=(side*(.327+(.1-z)*.055+(x-center_shift)*.20),y*.14-.058,z*.155-.818)
        bm=bmesh.new();bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        if i==0:skin_parts.append(obj)
        else:obj.data.materials.clear();obj.data.materials.append(claw_mat)
    bridge=tube('Measured shin to ankle transition '+str(side),[
        [side*.265,.022,-.665,.027,.025], [side*.289,.027,-.735,.055,.053],
        [side*.310,.029,-.783,.057,.057], [side*.326,.024,-.815,.048,.049],
        [side*.343,.008,-.851,.023,.024]])
    activate(bridge)
    sub=bridge.modifiers.new('Tangent-continuous ankle sections','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    skin_parts.append(bridge)
activate(body)
for o in skin_parts:o.select_set(True)
bpy.ops.object.join()
body.data.remesh_voxel_size=.0025
bpy.ops.object.voxel_remesh()
group=body.vertex_groups.new(name='Ankle splice only')
for v in body.data.vertices:
    x,y,z=v.co
    if abs(x)>.20 and -.83<z<-.70:
        w=max(0,1-abs(z+.765)/.065)
        group.add([v.index],w,'REPLACE')
mod=body.modifiers.new('Blend shaft above ankle articulation','SMOOTH')
mod.vertex_group=group.name;mod.iterations=35;mod.factor=.65
bpy.ops.object.modifier_apply(modifier=mod.name)
body.data.materials.clear();body.data.materials.append(material('Construction clay',.38))
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':
        activate(obj);bpy.ops.mesh.customdata_custom_splitnormals_clear()
        obj.data.validate(clean_customdata=True)
        for p in obj.data.polygons:p.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
(args.out/'integration.json').write_text(json.dumps({
    'approval':None,'stageProvenanceSha256':provenance_sha,'inputs':{str(p):sha(p) for p in [args.body,args.paw]},
    'scriptSha256':sha(args.out/'integration_source.py'),
    'changes':['Removed old feet and ankle region','Removed reconstructed six-toe cluster',
               'Retained ankle and sloping bridge','Built four grouped toes and short curved claws'],
    'digitCountScope':'Illustration arrangement only, no species-record change',
    'body':mesh_stats(body),'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.suffix in ['.glb','.blend']}
},indent=2)+'\n')
