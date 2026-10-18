import bpy,json,numpy as np
bpy.ops.wm.open_mainfile(filepath='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend')
o=bpy.data.objects['luceras_blockout'];a=np.array([v.co[:] for v in o.data.vertices]);r=[]
for lo in np.arange(.53,.71,.01):
 q=a[(a[:,1]>=lo)&(a[:,1]<lo+.01)]
 if len(q):r.append({'y':float(lo),'min':q.min(0).tolist(),'max':q.max(0).tolist(),'mean':q.mean(0).tolist()})
open('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass4/tail_inspection.json','w').write(json.dumps(r,indent=2))
