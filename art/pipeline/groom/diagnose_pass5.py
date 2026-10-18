import bpy,json,time,hashlib
from pathlib import Path
from mathutils import Vector
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
bpy.ops.wm.open_mainfile(filepath=str(O/'baseline_iter6/groom.blend'))
s=bpy.context.scene
body=bpy.data.objects['luceras_blockout']
info={'cameras':{o.name:{'dof':o.data.dof.use_dof,'ortho_scale':o.data.ortho_scale} for o in s.objects if o.type=='CAMERA'},'filter_type':s.cycles.pixel_filter_type,'filter_width':s.cycles.filter_width,'denoise':s.cycles.use_denoising,'samples':s.cycles.samples,'claws':[],'frames':[]}
for o in s.objects:
 if o.type=='MESH' and 'claw' in o.name.lower():
  pts=[body.matrix_world.inverted()@o.matrix_world@v.co for v in o.data.vertices]
  info['claws'].append({'name':o.name,'center':list(sum(pts,Vector())/len(pts)),'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)]})
s.camera=bpy.data.objects['groom_camera_sprite'];s.camera.data.dof.use_dof=False
for name,size,denoise,samples,width in [('direct192_no_denoise',192,False,128,1.5),('supersample768_denoise',768,True,64,1.0),('supersample768_no_denoise',768,False,128,1.0)]:
 s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100;s.cycles.samples=samples;s.cycles.use_denoising=denoise;s.cycles.filter_width=width
 s.render.filepath=str(O/('diagnostic_'+name+'.png'));t=time.perf_counter();bpy.ops.render.render(write_still=True)
 info['frames'].append({'name':name,'size':size,'denoise':denoise,'samples':samples,'filter_width':width,'seconds':time.perf_counter()-t})
 (O/'crispness_diagnostic.json').write_text(json.dumps(info,indent=2))
