import numpy as np,json,struct
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
p=Path('C:/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6/gamemesh.glb');b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1,'MAT4':16}[a['type']]
 return np.ndarray((a['count'],k),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dtype).itemsize*k),np.dtype(dtype).itemsize)).copy()
prim=g['meshes'][0]['primitives'][0];uv=acc(prim['attributes']['TEXCOORD_0']);uv[:,1]=1-uv[:,1];tri=acc(prim['indices']).reshape(-1,3)
im=Image.new('L',(2048,2048));d=ImageDraw.Draw(im)
for t in tri:d.polygon([tuple(v) for v in uv[t]*2048],fill=255)
mask=np.array(im.filter(ImageFilter.MaxFilter(23)))>0
for key,w,h in [('eye',112,112),('tuft',64,144),('pale',56,128),('dark',56,128),('whisker',20,128)]:
 a=np.pad(mask.astype(np.int32),((1,0),(1,0))).cumsum(0).cumsum(1);s=a[h:,w:]-a[:-h,w:]-a[h:,:-w]+a[:-h,:-w];yy,xx=np.where(s==0)
 if len(xx):x,y=int(xx[0]),int(yy[0]);mask[y:y+h,x:x+w]=True;print(key,x,y,w,h)
 else:print('NO FIT',key)
