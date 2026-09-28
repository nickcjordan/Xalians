"""Build and render an isolated actual-geometry head method test."""
import argparse
import json
import math
import shutil
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0,str(Path(__file__).resolve().parent))
from blender_blockout import material, sphere, mesh_stats, sha
from blender_probe import aim, tube
from authored_surfaces import section_surface
import sculpted_head as sculpt

p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.out=args.out.resolve();args.out.mkdir(parents=True,exist_ok=False)
(args.out/'inputs').mkdir()
for name in ['sculpted_head.py','study_sculpted_head.py','authored_surfaces.py','blender_blockout.py','blender_probe.py','surface_math.py']:
    shutil.copyfile(Path(__file__).with_name(name),args.out/'inputs'/name)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={k:material(k,v) for k,v in {'clay':.30,'white':.75,'pupil':.009,'nose':.08,'rim':.035}.items()}
mats['pupil'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.16
pieces=sculpt.build(mats)
pieces.append(section_surface({'id':'neck','sections':[[4.40,.24,-.16,.22,0],[4.47,.205,-.145,.215,0],[4.62,.19,-.15,.22,0],[4.80,.26,-.15,.25,0]]}))
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces:obj.select_set(True)
bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();body=bpy.context.object;body.name='sculpted_head_coat_continuous'
body.data.remesh_voxel_size=.006
bpy.ops.object.voxel_remesh()
sm=body.modifiers.new('Local construction fusion','SMOOTH');sm.factor=.45;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
body.data.materials.clear();body.data.materials.append(mats['clay'])
for poly in body.data.polygons:poly.use_smooth=True
for side in [-1,1]:sculpt.eye_geometry(side,mats)
nose=sphere({'id':'nose','center':[0,-.50,4.985],'scale':[.065,.050,.042]},mats['nose'])
for v in nose.data.vertices:
    if v.co.z<0:v.co.x*=max(.30,1+v.co.z*15)
for side in [-1,1]:
    controls=[]
    for x,z in [(0,4.95),(.035,4.913),(.080,4.897),(.13,4.905),(.17,4.933)]:
        x*=side;controls.append([x,sculpt.face_y(x,z)-.007,z,.006,.006])
    # tube minimum-radius threshold is expressed in its own construction scale.
    mouth=tube('mouth_'+str(side),[[v*10 for v in row] for row in controls])
    for v in mouth.data.vertices:v.co/=10
    mouth.data.materials.append(mats['nose'])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=620;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world.color=(.6,.6,.6);scene.view_settings.view_transform='Standard'
target=Vector((0,0,5.20))
for pos,power,size in [((-3,-5,8),700,5),((4,-2,6),350,4),((1,4,8),650,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size;aim(lamp,target)
views=[]
for name,angle,elev in [('front',0,0),('front-left',45,0),('left',90,0),('back',180,0),('rear-oblique',135,1.5)]:
    a=math.radians(angle);bpy.ops.object.camera_add(location=target+Vector((10*math.sin(a),-10*math.cos(a),elev)))
    cam=bpy.context.object;cam.name=name;cam.data.type='ORTHO';cam.data.ortho_scale=3.85;aim(cam,target);scene.camera=cam
    scene.render.filepath=str(args.out/(name+'.png'));bpy.ops.render.render(write_still=True)
    views.append({'name':name,'angle':angle,'elevation':elev,'matrixWorld':[list(r) for r in cam.matrix_world]})
scene.camera=bpy.data.objects['front-left'];bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'geometry.json').write_text(json.dumps({'approval':None,'scope':'Internal head method test; all renders from one geometry','body':mesh_stats(body),'cameras':views,'outputs':{f.name:sha(f) for f in args.out.iterdir() if f.suffix in ['.png','.blend']},'sources':{f.name:sha(f) for f in (args.out/'inputs').iterdir()}},indent=2)+'\n')
