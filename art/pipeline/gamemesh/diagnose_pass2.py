import bpy,json,numpy as np
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass2')
bpy.ops.wm.open_mainfile(filepath=str(p.parent/'pass1/iter8_mesh.blend'))
r={}
for name in ['game_body','luceras_blockout','horn_l','horn_r']:
 o=bpy.data.objects[name];o.data.calc_loop_triangles();v=np.array([x.co[:] for x in o.data.vertices]);r[name]={'vertices':len(v),'triangles':len(o.data.loop_triangles),'min':v.min(0).tolist(),'max':v.max(0).tolist(),'matrix':[list(x) for x in o.matrix_world]}
 if 'horn' in name:r[name]['first40']=v[:40].tolist()
r['bones']={b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in bpy.data.objects['luceras_rig'].data.bones}
(p/'iter0_diagnosis.json').write_text(json.dumps(r,indent=2))
