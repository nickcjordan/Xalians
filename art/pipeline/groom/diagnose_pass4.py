import bpy,numpy as np,json,time,sys
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass4')
bpy.ops.wm.open_mainfile(filepath=str(O/'groom.blend'));body=bpy.data.objects['luceras_blockout'];co=np.array([v.co[:] for v in body.data.vertices]);col=np.array([a.color[:] for a in body.data.attributes['coat_color'].data])[:,:3];mask=(co[:,1]<-.15)&(co[:,2]>.49)&(abs(co[:,0])<.07)
r={'head_color_linear_quantiles':np.quantile(col[mask],[0,.1,.25,.5,.75,.9,1],axis=0).tolist(),'head_vertices':int(mask.sum()),'head_untouched_gray_vertices':int(sum(mask&(col.mean(1)>.35)&(col.mean(1)<.7)))}
(O/'head_color_diagnostic.json').write_text(json.dumps(r,indent=2));s=bpy.context.scene;s.camera=bpy.data.objects['groom_camera_tail_plume'];s.render.resolution_x=900;s.render.resolution_y=900;s.cycles.samples=96;s.cycles.use_denoising=False;s.render.filepath=str(O/'diagnostic_tail_no_denoise.png');t=time.perf_counter();bpy.ops.render.render(write_still=True);r['render_seconds']=time.perf_counter()-t;r['samples']=96;r['denoise']=False;(O/'tail_diagnostic_measurements.json').write_text(json.dumps(r,indent=2))
