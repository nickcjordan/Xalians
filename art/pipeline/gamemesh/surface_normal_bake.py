"""Bake body tangent normals by oriented nearest-surface correspondence."""
import bpy,numpy as np,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

def run(g):
 bpy.ops.wm.open_mainfile(filepath=str(g.OUT/'iter1_baked.blend'))
 src=bpy.data.objects['luceras_blockout'];dst=bpy.data.objects['game_body'];src.data.calc_loop_triangles();dst.data.calc_loop_triangles();dst.data.calc_tangents()
 sp=[src.matrix_world@v.co for v in src.data.vertices];sn=[(src.matrix_world.to_3x3()@v.normal).normalized() for v in src.data.vertices];st=[tuple(t.vertices) for t in src.data.loop_triangles];tree=BVHTree.FromPolygons(sp,st,all_triangles=True)
 size=2048;im=bpy.data.images.get('normal_2048') or bpy.data.images.load(str(g.OUT/'normal_2048.png'));im.name='normal_2048';im.colorspace_settings.name='Non-Color';pixels=np.array(im.pixels[:],dtype=np.float32).reshape(size,size,4);mask=np.zeros((size,size),bool);color=np.zeros((size,size,3),np.float32)
 uv=dst.data.uv_layers.active.data;matrix=dst.matrix_world;rotation=matrix.to_3x3();count=opposite=searches=0;maxdist=0.
 for tri in dst.data.loop_triangles:
  uu=np.array([uv[i].uv[:] for i in tri.loops])*size
  a,b,c=uu;den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  if abs(den)<1e-10:continue
  lo=np.maximum(0,np.floor(uu.min(axis=0)).astype(int));hi=np.minimum(size-1,np.ceil(uu.max(axis=0)).astype(int))
  xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));x=xx.ravel()+.5;y=yy.ravel()+.5
  v=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/den;w=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/den;u=1-v-w;inside=(u>=-1e-5)&(v>=-1e-5)&(w>=-1e-5)
  if not inside.any():continue
  weights=np.stack([u[inside],v[inside],w[inside]],axis=1);xs=xx.ravel()[inside];ys=yy.ravel()[inside]
  pp=np.array([matrix@dst.data.vertices[i].co for i in tri.vertices]);nn=np.array([rotation@dst.data.vertices[i].normal for i in tri.vertices]);tt=np.array([rotation@dst.data.loops[i].tangent for i in tri.loops]);sign=np.array([dst.data.loops[i].bitangent_sign for i in tri.loops]);points=weights@pp;normals=weights@nn;tangents=weights@tt;signs=weights@sign
  normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12);tangents-=normals*np.sum(normals*tangents,axis=1,keepdims=True);tangents/=np.maximum(np.linalg.norm(tangents,axis=1,keepdims=True),1e-12);bitangents=np.cross(normals,tangents)*np.where(signs<0,-1,1)[:,None]
  for k,(point,n) in enumerate(zip(points,normals)):
   q=Vector(point);normal=Vector(n);hit=tree.find_nearest(q)
   if hit is None:continue
   if hit[1].dot(normal)<0:
    searches+=1;candidates=tree.find_nearest_range(q,max(.003,hit[3]*3))
    valid=[h for h in candidates if h[1].dot(normal)>.05]
    if valid:hit=min(valid,key=lambda h:h[3])
   inds=st[hit[2]];high=barycentric_transform(hit[0],*[sp[i] for i in inds],*[sn[i] for i in inds]).normalized()
   if high.dot(normal)<0:opposite+=1
   tangent=np.array([high.dot(Vector(tangents[k])),high.dot(Vector(bitangents[k])),high.dot(normal)]);tangent/=max(np.linalg.norm(tangent),1e-12)
   color[ys[k],xs[k]]=tangent*.5+.5;mask[ys[k],xs[k]]=True;count+=1;maxdist=max(maxdist,hit[3])
 filled=mask.copy()
 # Eight-pixel bake padding at 2048 stays inside the 16-pixel island gap.
 for step in range(8):
  accum=np.zeros_like(color);amount=np.zeros((size,size),np.float32)
  for axis,shift in ((0,1),(0,-1),(1,1),(1,-1)):
   valid=np.roll(filled,shift,axis);vals=np.roll(color,shift,axis)
   if axis==0:valid[0 if shift==1 else -1,:]=False
   else:valid[:,0 if shift==1 else -1]=False
   accum+=vals*valid[:,:,None];amount+=valid
  new=(~filled)&(amount>0);color[new]=accum[new]/amount[new,None];filled|=new
 pixels[filled,:3]=color[filled];pixels[filled,3]=1;im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(g.OUT/'normal_2048.png');im.save()
 small=bpy.data.images.get('normal_1024');small.pixels # Retain a single runtime image name.
 bpy.data.images.remove(small,do_unlink=True);small=im.copy();small.name='normal_1024';small.scale(1024,1024);small.filepath_raw=str(g.OUT/'normal_1024.png');small.save()
 mat=bpy.data.materials['Luceras_body'];mat.node_tree.nodes['NORMAL_bake'].image=small
 settings=json.loads((g.OUT/'bake_settings.json').read_text());settings['body_normal_override']={'method':'Oriented nearest sculpt triangle, barycentric smooth source normal, encoded using interpolated game UV tangents. No geometry changes and no image painting.','size':2048,'padding_px_2048':8,'texels':count,'opposite_nearest_candidates_reselected':searches,'remaining_opposite_normals':opposite,'max_correspondence_distance_m':maxdist,'normal_scope':'Body only. Horns/claws retain Cycles selected-to-active bake. AO unchanged.'};g.write('bake_settings.json',settings)
 bpy.ops.wm.save_as_mainfile(filepath=str(g.OUT/'iter1_baked.blend'));print('NEAREST_NORMAL',settings['body_normal_override'],flush=True)
