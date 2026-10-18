"""Additional binary and texture checks for the delivered pass 4 file."""
import json,struct,io,hashlib
from pathlib import Path
from PIL import Image,ImageChops
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass6')
raw=(OUT/'gamemesh.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);start=28+n
images=[]
for image in doc.get('images',[]):
 view=doc['bufferViews'][image['bufferView']];data=raw[start+view.get('byteOffset',0):start+view.get('byteOffset',0)+view['byteLength']]
 with Image.open(io.BytesIO(data)) as im:
  im=im.convert('RGB');matches=[]
  for name in ('normal_1024.png','ao_1024.png'):
   with Image.open(OUT/name) as file:
    if im.size==file.size and ImageChops.difference(im,file.convert('RGB')).getbbox() is None:matches.append(name)
  images.append({'name':image.get('name'),'size':list(im.size),'pixel_matches':matches})
meshes=[]
for mesh in doc['meshes']:
 for prim in mesh['primitives']:meshes.append({'name':mesh.get('name'),'attributes':list(prim['attributes']),'tangents': 'TANGENT' in prim['attributes']})
m=json.loads((OUT/'measurements.json').read_text());mapping={'shoulder':'leg_fl_01','elbow':'leg_fl_02','wrist':'leg_fl_03','hip':'leg_hl_01','stifle':'leg_hl_02','hock':'leg_hl_03','neck':'neck_01','tail_base':'tail_01'}
m['named_bend_volume_change']={label:{variant:{pose:data['regions'].get(bone) for pose,data in poses.items()} for variant,poses in m['volume_change_per_joint_region_per_pose'].items()} for label,bone in mapping.items()}
m['triangles_per_exported_mesh']={mesh.get('name'):sum(doc['accessors'][p['indices']]['count']//3 for p in mesh['primitives']) for mesh in doc['meshes']}
(OUT/'measurements.json').write_text(json.dumps(m,indent=2))
record={'embedded_images':images,'mesh_attributes':meshes,'both_runtime_maps_match_embedded_pixels':all(any(n in x['pixel_matches'] for x in images) for n in ('normal_1024.png','ao_1024.png')),'no_animations':len(doc.get('animations',[]))==0,'blend_sha256':hashlib.sha256((OUT/'gamemesh.blend').read_bytes()).hexdigest()}
(OUT/'completion_audit.json').write_text(json.dumps(record,indent=2));print(json.dumps(record,indent=2))

rings=json.loads((OUT/'joint_edge_rings.json').read_text())
m['joint_edge_cycles_verified']=rings.get('all_at_least_three',False)
m['joint_edge_cycle_counts']={name:r.get('edge_rings') for name,r in rings.get('joints',{}).items()}
m['joint_edge_cycle_method_note']='Vertex-disjoint graph cycles winding once around a joint axis in axial bands, with local radial limits. Not proof of organized quad loops.'
m['distance_method']='Nearest sculpt surface distances sampled at game vertices, supplemented by reverse sculpt samples. Not an exact Hausdorff bound.'
(OUT/'measurements.json').write_text(json.dumps(m,indent=2))

