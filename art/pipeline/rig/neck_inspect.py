"""B-6kf7: inspect rig and sculpt inputs around the neck (read only)."""
import bpy, sys, json, numpy as np
RIG='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/rig.blend'
SC='/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/luceras_sculpt.blend'
out={}
bpy.ops.wm.open_mainfile(filepath=SC)
out['sculpt_objects']={o.name:(o.type,len(o.data.vertices) if o.type=='MESH' else None, dict(o.items()) if o.keys() else {}) for o in bpy.data.objects}
b=bpy.data.objects['luceras_blockout']; Vs=np.array([v.co[:] for v in b.data.vertices]); out['sculpt_groups']=[g.name for g in b.vertex_groups]; out['sculpt_mods']=[(m.name,m.type) for m in b.modifiers]
out['sculpt_shape_keys']=[k.name for k in b.data.shape_keys.key_blocks] if b.data.shape_keys else None
bpy.ops.wm.open_mainfile(filepath=RIG)
out['rig_objects']={o.name:(o.type,len(o.data.vertices) if o.type=='MESH' else None,str({k:o[k] for k in o.keys()})[:200],[(m.name,m.type) for m in getattr(o,'modifiers',[])]) for o in bpy.data.objects}
b=bpy.data.objects['luceras_blockout']; V=np.array([v.co[:] for v in b.data.vertices])
out['rig_body_eq_sculpt']=float(np.abs(V-Vs).max()) if V.shape==Vs.shape else 'shape differs'
k=b.data.shape_keys; base=np.array([v.co[:] for v in k.key_blocks['Basis'].data])
out['basis_eq_mesh']=float(np.abs(base-V).max())
ks={}
for kb in k.key_blocks[1:]:
    x=np.array([v.co[:] for v in kb.data]); d=np.linalg.norm(x-base,axis=1); nz=d>1e-7
    ks[kb.name]=dict(nonzero=int(nz.sum()),max_mm=float(1000*d.max()),bbox=[x[nz].min(0).tolist(),x[nz].max(0).tolist()] if nz.any() else None, rel=kb.relative_key.name)
out['keys']=ks
out['drivers']=[(fc.data_path,fc.driver.expression,[(v.name,v.targets[0].bone_target) for v in fc.driver.variables]) for fc in k.animation_data.drivers]
rig=bpy.data.objects['luceras_rig']
out['bones']={bn.name:(list(bn.head_local),list(bn.tail_local),bn.parent.name if bn.parent else None,bn.use_deform) for bn in rig.data.bones if any(s in bn.name for s in ('neck','head','jaw','ear','spine_05','spine_04','horn'))}
gi={g.index:g.name for g in b.vertex_groups}
# per-group weight sums near the neck
W={}
for v in b.data.vertices:
    for g in v.groups:
        if g.weight>0: W.setdefault(gi[g.group],[]).append((v.index,g.weight))
nk={n:dict(count=len(W.get(n,[])),y=[float(V[[i for i,_ in W[n]],1].min()),float(V[[i for i,_ in W[n]],1].max())] if n in W else None) for n in ('neck_01','neck_02','head_01','jaw_01','spine_05','spine_04')}
out['neck_groups']=nk
out['groups']=[g.name for g in b.vertex_groups]
out['other_props']={o.name:{k:str(o[k])[:200] for k in o.keys()} for o in bpy.data.objects if o.keys()}
open('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-neck/pass1/work/inspect.json','w').write(json.dumps(out,indent=1,default=str))
print('INSPECT done')
