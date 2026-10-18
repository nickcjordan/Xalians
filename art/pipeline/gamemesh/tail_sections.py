import bpy,json
from pathlib import Path
r={}
for name in ['luceras_blockout','game_body']:
 o=bpy.data.objects[name];a={}
 for y in [.24,.26,.28,.30,.32,.36,.40,.5,.6,.7]:
  vs=[v.co for v in o.data.vertices if abs(v.co.y-y)<.007]
  a[y]={'n':len(vs),'x':[min(v.x for v in vs),max(v.x for v in vs)] if vs else [],'z':[min(v.z for v in vs),max(v.z for v in vs)] if vs else []}
 r[name]=a
print(json.dumps(r),flush=True);Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1/iter4_tail_sections.json').write_text(json.dumps(r,indent=2))
