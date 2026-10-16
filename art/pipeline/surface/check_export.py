"""Read the actual GLB and verify ship budgets, textures, alpha, and skin data."""
import json,struct,hashlib,io
import numpy as np
from PIL import Image
from pathlib import Path
OUT=Path('C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
b=(OUT/'luceras_surface.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1,'MAT4':16}[a['type']]
 return np.ndarray((a['count'],k),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dtype).itemsize*k),np.dtype(dtype).itemsize)).copy()
counts={};maxinf=0;unweighted=0;weight_error=0;finite=True
for m in g['meshes']:
 counts[m.get('name','mesh')]=sum(g['accessors'][p['indices']]['count']//3 for p in m['primitives'])
 for p in m['primitives']:
  a=p['attributes'];w=acc(a['WEIGHTS_0']);maxinf=max(maxinf,int((w>1e-7).sum(1).max()));unweighted+=int((w.sum(1)<.01).sum());weight_error=max(weight_error,float(np.abs(w.sum(1)-1).max()));finite=finite and bool(np.isfinite(acc(a['POSITION'])).all())
textures=[]
for i,im in enumerate(g['images']):
 v=g['bufferViews'][im['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];pic=Image.open(io.BytesIO(data));textures.append({'index':i,'name':im.get('name'),'size':list(pic.size),'bytes':len(data),'mode':pic.mode})
materials=[{'name':m.get('name'),'alphaMode':m.get('alphaMode','OPAQUE'),'alphaCutoff':m.get('alphaCutoff'),'doubleSided':m.get('doubleSided',False),'baseColorTexture':m.get('pbrMetallicRoughness',{}).get('baseColorTexture'),'metallicRoughnessTexture':m.get('pbrMetallicRoughness',{}).get('metallicRoughnessTexture'),'occlusionTexture':m.get('occlusionTexture'),'normalTexture':m.get('normalTexture')} for m in g['materials']]
checks={'triangles':sum(counts.values())<=12000,'materials':len(materials)<=2,'joints':max(len(s['joints']) for s in g['skins'])<=40,'max_four_influences':maxinf<=4,'all_vertices_weighted':unweighted==0,'normalized_weights':weight_error<1e-5,'finite_positions':finite,'no_blending':all(m['alphaMode']!='BLEND' for m in materials),'body_mask':materials[0]['alphaMode']=='MASK','textures_1024':all(i['size']==[1024,1024] for i in textures),'orm_bound':bool(materials[0]['occlusionTexture']) and bool(materials[0]['metallicRoughnessTexture'])}
report={'build_id':'B-rmyz','file_bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'triangles_per_mesh':counts,'triangles_total':sum(counts.values()),'materials':materials,'textures':textures,'joints':max(len(s['joints']) for s in g['skins']),'max_influences':maxinf,'unweighted_vertices':unweighted,'maximum_weight_sum_error':weight_error,'checks':checks}
(OUT/'export_check.json').write_text(json.dumps(report,indent=2));(OUT/'export_gltf.json').write_text(json.dumps(g,indent=2));m=json.loads((OUT/'measurements.json').read_text());m.update(glb_size_bytes=len(b),glb_sha256=report['sha256'],exported_textures=textures,exported_materials=materials);(OUT/'measurements.json').write_text(json.dumps(m,indent=2));print(json.dumps(report,indent=2))
if not all(checks.values()):raise SystemExit(1)
