import json,struct
from pathlib import Path
p=Path('C:/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6/gamemesh.glb')
b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);out=Path('C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
(out/'input_glb.json').write_text(json.dumps(g,indent=2))
for i,m in enumerate(g['meshes']):
 print(i,m.get('name'),[(p.get('material'),g['accessors'][p['attributes']['POSITION']].get('min'),g['accessors'][p['attributes']['POSITION']].get('max'),g['accessors'][p['indices']]['count']//3) for p in m['primitives']])
print('NODES',json.dumps(g['nodes'],indent=2))
