import bpy,numpy as np,json
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
bpy.ops.wm.open_mainfile(filepath=str(O/'groom.blend'))
h=bpy.data.objects['Luceras interpolated coat'];b=bpy.data.objects['luceras_blockout'];a=np.array([p.vector[:] for p in h.data.attributes['position'].data]).reshape(-1,9,3)
d={}
for n in ['plume_white','strand_tone','coat_gain']:
 v=np.array([x.value for x in h.data.attributes[n].data]);d[n]={'range':[float(v.min()),float(v.max())],'nonzero':int(sum(v>0)), 'positive_root_bounds': [a[v>0,0].min(0).tolist(),a[v>0,0].max(0).tolist()]}
co=np.array([v.co[:] for v in b.data.vertices]);d['tail_bins']=[]
for y in np.arange(.50,.71,.025):
 c=co[(co[:,1]>y)&(co[:,1]<y+.025)];
 if not len(c):continue
 d['tail_bins'].append({'y':float(y),'bounds':[c.min(0).tolist(),c.max(0).tolist()]})
(O/'debug_geometry.json').write_text(json.dumps(d,indent=2))

