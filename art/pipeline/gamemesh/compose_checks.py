"""Compose native-size review pairs and inspect the exported binary without dependencies beyond Pillow."""
import os
import json
import struct
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ITERATION=int(sys.argv[1]) if len(sys.argv)>1 else 1
class IterationOutput:
    def __init__(self,path):self.path=Path(path)
    def __truediv__(self,name):return self.path/str(name).replace('iter1_',f'iter{ITERATION}_')
OUT=IterationOutput(os.environ.get('GM_OUT',r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass1'))
try:
    FONT=ImageFont.truetype('arial.ttf',20)
except OSError:
    FONT=ImageFont.load_default()

def pair(view):
    a=Image.open(OUT/f'iter1_sculpt_{view}.png').convert('RGB')
    b=Image.open(OUT/f'iter1_game_{view}.png').convert('RGB')
    c=Image.new('RGB',(a.width+b.width+12,max(a.height,b.height)+36),(25,25,25))
    c.paste(a,(0,36));c.paste(b,(a.width+12,36));d=ImageDraw.Draw(c)
    d.text((8,7),'sculpt',font=FONT,fill='white');d.text((a.width+20,7),'game mesh',font=FONT,fill='white')
    c.save(OUT/f'check_{view}.png')

for view in ('sprite','full_side','full_three_quarter','head_three_quarter','hind_paw_side','ear_three_quarter','ear_side','horn_silhouette_side'):
    if (OUT/f'iter1_game_{view}.png').exists():pair(view)
poses=('rest','crouch','leap','landing')
if all((OUT/f'iter1_pose_{p}_{v}.png').exists() for p in poses for v in ('sculpt','game')):
    grid=Image.new('RGB',(4*512,2*548),(25,25,25));d=ImageDraw.Draw(grid)
    for col,p in enumerate(poses):
        for row,v in enumerate(('sculpt','game')):
            grid.paste(Image.open(OUT/f'iter1_pose_{p}_{v}.png'),(col*512,row*548+36))
            d.text((col*512+8,row*548+7),p+' / '+('sculpt' if v=='sculpt' else 'game mesh'),font=FONT,fill='white')
    grid.save(OUT/'pose_grid.png')
if (OUT/'iter1_uv_polygons.json').exists():
    uv=json.loads((OUT/'iter1_uv_polygons.json').read_text());im=Image.new('RGB',(1024,1024),(20,20,20));d=ImageDraw.Draw(im)
    for name,polys in uv.items():
        if 'eye' in name:continue
        color=(80,160,220) if name=='game_body' else (220,170,70)
        for poly in polys:d.polygon([(round(u*1023),round((1-v)*1023)) for u,v in poly],outline=color)
    im.save(OUT/'uv_layout.png')
    if (OUT/'normal_1024.png').exists():
        mask=Image.new('L',(1024,1024),0);md=ImageDraw.Draw(mask)
        for name,polys in uv.items():
            if 'eye' in name:continue
            for poly in polys:md.polygon([(round(u*1023),round((1-v)*1023)) for u,v in poly],fill=255)
        from PIL import ImageFilter
        # Exclude rasterized chart borders. Dark normals inside this mask are candidate misses.
        inner=mask.filter(ImageFilter.MinFilter(3));normal=Image.open(OUT/'normal_1024.png').convert('RGB')
        covered=black=negative_z=0
        for rgb,hit in zip(normal.getdata(),inner.getdata()):
            if not hit:continue
            covered+=1;black+=max(rgb)<8;negative_z+=rgb[2]<100
        quality={'interior_texels_tested':covered,'near_black_candidate_ray_misses':black,'low_blue_candidate_inverted_texels':negative_z,'method':'Conservative rasterized UV interior test, excludes one-pixel chart boundary. Low blue is a review flag, not proof of inversion. Render inspection still required.'}
        (OUT/'normal_quality.json').write_text(json.dumps(quality,indent=2))
if (OUT/'gamemesh.glb').exists():
    raw=(OUT/'gamemesh.glb').read_bytes();magic,ver,length=struct.unpack_from('<III',raw);jslen,jstype=struct.unpack_from('<II',raw,12)
    g=json.loads(raw[20:20+jslen]);binary_start=20+jslen+8
    component={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
    count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    def accessor(index):
        a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];fmt,size=component[a['componentType']];n=count[a['type']]
        offset=binary_start+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*size)
        return [struct.unpack_from('<'+fmt*n,raw,offset+i*stride) for i in range(a['count'])]
    tris=0;vertices=0;unweighted=0;maxinf=0;sums=[];missing=[]
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            at=p['attributes'];vertices+=g['accessors'][at['POSITION']]['count'];tris+=g['accessors'][p['indices']]['count']//3
            if 'JOINTS_0' not in at or 'WEIGHTS_0' not in at:missing.append(mesh.get('name'))
            else:
                for w in accessor(at['WEIGHTS_0']):
                    n=sum(x>1e-8 for x in w);unweighted+=n==0;maxinf=max(maxinf,n);sums.append(sum(w))
    result={'glb_version':ver,'header_length_matches':length==len(raw),'bytes':len(raw),'triangles':tris,'exported_vertices_including_uv_seams':vertices,'materials':len(g.get('materials',[])),'skins':len(g.get('skins',[])),'skin_joint_counts':[len(s['joints']) for s in g.get('skins',[])],'animations':len(g.get('animations',[])),'max_influences':maxinf,'unweighted_vertices':unweighted,'weight_sum_range':[min(sums),max(sums)] if sums else None,'meshes_missing_skin_attributes':missing,'images':g.get('images',[]),'material_records':g.get('materials',[])}
    (OUT/'glb_check.json').write_text(json.dumps(result,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k not in ('images','material_records')},indent=2))
