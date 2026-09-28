"""Export actual construction geometry and calibrated auxiliary arrays.

Run in Blender with an existing scene. This creates a provisional handoff only.
Depth, normals and object IDs are ray measurements, not predicted images.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

VIEWS=('front','front-left','left','back','right','front-right')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def scene_geometry(objects):
    vertices,triangles,labels,features=[],[],[],[]
    for object_id,obj in enumerate(objects,1):
        mesh=obj.data
        mesh.calc_loop_triangles()
        start=len(vertices)
        vertices.extend(obj.matrix_world@v.co for v in mesh.vertices)
        for triangle in mesh.loop_triangles:
            triangles.append(tuple(start+i for i in triangle.vertices))
            labels.append(object_id)
            material=mesh.materials[triangle.material_index]
            features.append(material.name in ('white','nose') or obj.name.startswith(('mouth','philtrum')))
    return vertices,triangles,labels,features


def bounds(objects):
    points=[o.matrix_world@Vector(corner) for o in objects for corner in o.bound_box]
    return [[min(v[i] for v in points) for i in range(3)],
            [max(v[i] for v in points) for i in range(3)]]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--spec',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.out.mkdir(parents=True,exist_ok=False)
    spec=json.loads(args.spec.read_text())
    scene=bpy.context.scene
    objects=sorted([o for o in scene.objects if o.type=='MESH' and not o.hide_render],key=lambda o:o.name)
    vertices,triangles,labels,features=scene_geometry(objects)
    bvh=BVHTree.FromPolygons(vertices,triangles,all_triangles=True)
    width,height=scene.render.resolution_x,scene.render.resolution_y
    records=[]
    low,high=bounds(objects)
    landmarks={
        'ear_top':{'point':[0,0,high[2]],'basis':'maximum evaluated geometry Z'},
        'eye_line':{'point':[0,0,spec['orbits'][0]['center'][1]],'basis':'authored orbital center'},
        'shoulder':{'point':[0,0,4.27],'basis':'provisional anatomical interpretation'},
        'hip':{'point':[0,0,3.04],'basis':'provisional anatomical interpretation'},
        'knee':{'point':[0,0,2.10],'basis':'provisional anatomical interpretation'},
        'sole':{'point':[0,0,low[2]],'basis':'minimum evaluated geometry Z'},
    }
    for name in VIEWS:
        camera=bpy.data.objects[name]
        scene.camera=camera
        rotation=camera.matrix_world.to_3x3()
        inv_rotation=rotation.transposed()
        right,up,direction=(rotation@Vector(v) for v in [(1,0,0),(0,1,0),(0,0,-1)])
        depth=np.full((height,width),np.nan,dtype=np.float32)
        normals=np.full((height,width,3),np.nan,dtype=np.float32)
        ids=np.zeros((height,width),dtype=np.uint16)
        feature=np.zeros((height,width),dtype=np.uint8)
        scale=camera.data.ortho_scale
        for row in range(height):
            base=camera.location+up*((.5-(row+.5)/height)*scale)
            for col in range(width):
                origin=base+right*(((col+.5)/width-.5)*scale)
                hit,normal,index,distance=bvh.ray_cast(origin,direction,camera.data.clip_end)
                if hit is None: continue
                depth[row,col]=distance
                normals[row,col]=inv_rotation@normal
                ids[row,col]=labels[index]
                feature[row,col]=features[index]
        for suffix,data in [('depth',depth),('normals',normals),('object-ids',ids),('features',feature)]:
            np.save(args.out/f'{name}.{suffix}.npy',data,allow_pickle=False)
        rows={key:(1-world_to_camera_view(scene,camera,Vector(value['point'])).y)*height-.5
              for key,value in landmarks.items()}
        records.append({'name':name,'matrixWorld':[list(r) for r in camera.matrix_world],
                        'angle':{'front':0,'front-left':45,'left':90,'back':180,'right':270,'front-right':315}[name],
                        'bodyAxisX':world_to_camera_view(scene,camera,Vector((0,0,0))).x*width-.5,
                        'orthoScale':scale,'landmarkRows':rows,
                        'coveredSamples':int(np.count_nonzero(ids)),
                        'depthRange':[float(np.nanmin(depth)),float(np.nanmax(depth))]})
        print('Exported actual geometry arrays:',name,flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    glb=args.out/'construction.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                              export_cameras=False,export_lights=False,export_yup=True)
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    roundtrip_bounds=bounds(imported)
    error=max(abs(a-b) for aa,bb in zip([low,high],roundtrip_bounds) for a,b in zip(aa,bb))
    imported_triangles=0
    for obj in imported:
        obj.data.calc_loop_triangles()
        imported_triangles+=len(obj.data.loop_triangles)
    if error>1e-5 or imported_triangles!=len(triangles):
        raise ValueError('GLB round trip changed bounds or triangle count')
    report={'schemaVersion':1,'species':spec['species'],'status':'provisional-unapproved',
        'renderer':{'blenderVersion':bpy.app.version_string,'engine':scene.render.engine,
                    'cyclesSamples':scene.cycles.samples,'cyclesSeed':scene.cycles.seed},
        'approval':None,'productionReady':False,'sceneSha256':sha(bpy.data.filepath),
        'specSha256':sha(args.spec),'exporterSha256':sha(__file__),
        'resolution':[width,height],'coordinates':'Blender: +X creature left, +Y rear, +Z up; arbitrary construction units',
        'glbCoordinates':'glTF +Y up. Blender (x,y,z) maps to glTF (x,z,-y).',
        'arrayConventions':{
            'rows':'top to bottom; pixel centers; no antialiasing',
            'depth':'float32 forward distance from orthographic camera plane, construction units, NaN background',
            'normals':'float32 unit geometric triangle normal in camera coordinates: +X right, +Y up, +Z toward camera; NaN background',
            'object-ids':'uint16 exact rendered object identity; zero background; not semantic anatomy segmentation',
            'features':'uint8 visible eye-white, nose and mouth geometry; proposed front style cutouts, no source pixel matching'},
        'objects':{str(i):obj.name for i,obj in enumerate(objects,1)},
        'landmarks':landmarks,'cameras':records,'geometryBounds':[low,high],
        'glbRoundTrip':{'boundsMaxError':error,'sourceTriangles':len(triangles),'importedTriangles':imported_triangles,'pass':True},
        'limitations':['No rig, animation, UV design or production topology','Anatomical landmark locations remain proposed','Art approval and semantic feature review required'],
        'outputs':{p.name:sha(p) for p in args.out.iterdir() if p.is_file()}}
    (args.out/'handoff.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':
    main()
