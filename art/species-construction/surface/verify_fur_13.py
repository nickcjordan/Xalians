"""Saved-data equality for the exact local changes authorized by run 13."""
import sys,json,hashlib
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values

def digest(v):return hashlib.sha256(v.tobytes()).hexdigest()

def snapshot(path,changed,allowed):
    bpy.ops.wm.open_mainfile(filepath=str(path/'surface.blend'))
    # Reuse the established material graph serialization without its CLI body.
    namespace={'__file__':str(Path(__file__).with_name('verify_fur_12f.py'))}
    source=Path(__file__).with_name('verify_fur_12f.py').read_text().split('args=sys.argv')[0]
    exec(compile(source,'verify_fur_12f_helpers','exec'),namespace)
    result={'materials':{m.name:namespace['material_graph'](m) for m in bpy.data.materials if m.use_nodes},'meshes':{}}
    for ob in bpy.data.objects:
        if ob.type!='MESH':continue
        me=ob.data;co=np.empty(len(me.vertices)*3,np.float32);me.vertices.foreach_get('co',co)
        topology=np.empty(len(me.loops),np.int32);me.loops.foreach_get('vertex_index',topology)
        attrs={}
        for a in me.attributes:
            if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','BOOLEAN'):continue
            w=3 if a.data_type=='FLOAT_VECTOR' else 1;v=np.empty(len(a.data)*w,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
            a.data.foreach_get('vector' if w==3 else 'value',v);attrs[a.name]=digest(v)
        result['meshes'][ob.name]=dict(co=digest(co),topology=digest(topology),attrs=attrs,matrix=[list(v) for v in ob.matrix_world],slots=[m.name for m in me.materials])
    cu=bpy.data.objects['Akinza fur'].data;s=np.empty(len(cu.curves),np.int32);cu.curves.foreach_get('first_point_index',s)
    pointmask=np.repeat(changed,np.diff(np.r_[s,len(cu.points)]));attrs={}
    for a in cu.attributes:
        if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','BOOLEAN'):continue
        w=3 if a.data_type=='FLOAT_VECTOR' else 1;v=np.empty(len(a.data)*w,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
        a.data.foreach_get('vector' if w==3 else 'value',v);v=v.reshape(-1,w)
        if a.name in allowed:v=v[~(changed if a.domain=='CURVE' else pointmask)]
        attrs[a.name]=digest(v)
    result['fur']=dict(attrs=attrs,starts=digest(s),roots=digest(values(cu,'position','vector',3)[s]),matrix=[list(v) for v in bpy.data.objects['Akinza fur'].matrix_world],slots=[m.name for m in cu.materials])
    return result

if __name__=='__main__':
    before,after,part=sys.argv[sys.argv.index('--')+1:];before=Path(before);after=Path(after)
    changed=np.load(after/'patch-evidence.npz')['changed']
    allowed=['radius'] if part=='13b' else ['position','radius','cupm','strlen','pale','fur_tone','fur_guided']
    baseline=snapshot(before,changed,allowed);final=snapshot(after,changed,allowed)
    assert baseline==final,'Held saved data differs'
    if part=='13c':
        patch=np.load(after/'patch-evidence.npz');r=patch['roots'][changed]
        assert np.all((abs(r[:,0])>.165)&(abs(r[:,0])<.36)&(r[:,2]>.60)&(r[:,2]<.81)&(patch['thickness'][changed]<.096))
    (after/'saved-protection-check.json').write_text(json.dumps(dict(equal=True,baseline=str(before),allowed=allowed,changedCurves=int(changed.sum()),protected=final),indent=2))
    print('SAVED_PROTECTION_PASS')
