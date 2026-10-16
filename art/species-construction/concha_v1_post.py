"""Small mirrored ear-base cups with compact positional support, after P-lids1."""
import argparse
import json
import sys
import time
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from blender_blockout import mesh_stats, sha


def coordinates(co):
    x=np.abs(co[:,0])-.17;z=co[:,2]-.64
    return np.column_stack((.8*x+.6*z,-.6*x+.8*z))


def sculpt(skin,spec):
    me=skin.data
    co=np.empty(len(me.vertices)*3,np.float32);me.vertices.foreach_get('co',co);co=co.reshape(-1,3)
    uv=coordinates(co)
    r=np.linalg.norm((uv-np.array(spec['centerUV']))/spec['radiusUV'],axis=1)
    normals=np.empty_like(co);me.vertex_normals.foreach_get('vector',normals.ravel())
    candidate=(r<1)&(normals[:,1]<-.15)
    bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
    mask=np.zeros(len(co),bool)
    for i in np.where(candidate)[0]:
        hit=bvh.ray_cast(Vector((float(co[i,0]),-1,float(co[i,2]))),Vector((0,1,0)),2)
        mask[i]=hit[0] is not None and abs(hit[0].y-co[i,1])<spec['frontTolerance']
    delta=np.zeros_like(co)
    rr=r[mask]
    bowl=spec['depth']*(1-rr*rr)**3
    ridge=spec['ridge']*np.exp(-((rr-.77)/.16)**2)*(1-rr*rr)**2*5
    delta[mask,1]=bowl-ridge
    result=co+delta
    me.vertices.foreach_set('co',result.ravel());me.update()
    moved=np.linalg.norm(result-co,axis=1)
    assert np.array_equal(result[~mask],co[~mask])
    st=mesh_stats(skin)
    assert st['components']==1 and st['nonManifoldEdges']==0,st
    record=dict(vertices=len(co),supportVertices=int(mask.sum()),movedVertices=int((moved>0).sum()),
        outsideFalloffMax=float(moved[~mask].max()),maxMove=float(moved.max()),
        leftMoved=int(((moved>0)&(co[:,0]<0)).sum()),rightMoved=int(((moved>0)&(co[:,0]>0)).sum()),
        skinAfter=st,topologyUnchanged=True)
    return co,delta,mask,record


def main():
    p=argparse.ArgumentParser();p.add_argument('--asm',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--spec',type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(a.asm/'akinza.blend'))
    bpy.context.preferences.filepaths.save_version=0
    skin=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
    spec=json.loads(a.spec.read_text());co,delta,mask,record=sculpt(skin,spec)
    np.savez_compressed(a.out/'concha-region-match.npz',before=co,delta=delta,mask=mask)
    bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'akinza.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(a.out/'akinza.glb'),export_format='GLB')
    assembly=json.loads((a.asm/'assembly.json').read_text())
    assembly['outputs']={n:sha(a.out/n) for n in ('akinza.blend','akinza.glb')}
    assembly['objects'][skin.name]=record['skinAfter']
    (a.out/'assembly.json').write_text(json.dumps(assembly,indent=2)+'\n')
    record.update(spec=spec,inputSha256=sha(a.asm/'akinza.blend'),scriptSha256=sha(Path(__file__)),specSha256=sha(a.spec),approval=None)
    (a.out/'concha-v1.json').write_text(json.dumps(record,indent=2)+'\n')
    print('CONCHA_REGION_MATCH',json.dumps(record),flush=True)

if __name__=='__main__':main()
