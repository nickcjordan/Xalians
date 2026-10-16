"""Independent saved comparison of anatomy support and all held coat/eye data."""
import hashlib
import json
import sys
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
from verify_fur_13 import digest
before,after=map(Path,sys.argv[sys.argv.index('--')+1:])
patch=np.load(after/'patch-evidence.npz');changed=patch['changed'];starts=patch['starts']

def snapshot(folder):
    bpy.ops.wm.open_mainfile(filepath=str(folder/'surface.blend'))
    result={}
    namespace={'__file__':str(Path(__file__).with_name('verify_fur_12f.py'))}
    exec(compile(Path(__file__).with_name('verify_fur_12f.py').read_text().split('args=sys.argv')[0],'material_helpers','exec'),namespace)
    for ob in bpy.data.objects:
        if ob.type not in ('MESH','CURVES') or ob.name in ('Akinza canal tuft 13g','Akinza canal guides 13g','Akinza concha tuft 14'):continue
        data=ob.data;attrs={}
        for a in data.attributes:
            if a.name=='concha_velvet14' or a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','INT8','BOOLEAN'):continue
            width=3 if a.data_type=='FLOAT_VECTOR' else 1
            v=np.empty(len(a.data)*width,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
            a.data.foreach_get('vector' if width==3 else 'value',v);v=v.reshape(-1,width)
            if ob.name=='Akinza fur' and a.name in ('position','radius','strlen'):
                counts=np.diff(np.r_[starts,len(data.points)]);v=v[~(changed if a.domain=='CURVE' else np.repeat(changed,counts))]
            if ob.type=='MESH' and ob.name=='akinza_continuous_construction' and a.name=='position':v=v[~patch['geometryMask']]
            attrs[a.name]=digest(v)
        if ob.type=='MESH':
            loop=np.empty(len(data.loops),np.int32);data.loops.foreach_get('vertex_index',loop);attrs['topology']=digest(loop)
        result[ob.name]=dict(attrs=attrs,matrix=[list(v) for v in ob.matrix_world],slots=[m.name for m in data.materials])
    mats={m.name:namespace['material_graph'](m) for m in bpy.data.materials if m.use_nodes and not m.name.startswith('Akinza white concha')}
    # Reconstruct the original graph by removing only the explicitly new velvet splice.
    for name,g in mats.items():
        new={n['name'] for n in g['nodes'] if n['name'].startswith('14 ')}
        if not new:continue
        incoming=[l for l in g['links'] if l[2]=='14 local velvet mix' and l[3]=='Shader']
        # Socket identifiers of a MixShader duplicate Shader/Shader_001.
        prior=next(l for l in g['links'] if l[2]=='14 local velvet mix' and l[0] not in new)
        outlink=next(l for l in g['links'] if l[0]=='14 local velvet mix')
        g['links']=[l for l in g['links'] if l[0] not in new and l[2] not in new]
        g['links'].append((prior[0],prior[1],outlink[2],outlink[3]));g['links'].sort()
        g['nodes']=[n for n in g['nodes'] if n['name'] not in new]
    return result,mats
a,ma=snapshot(before);b,mb=snapshot(after)
assert a==b,'Held object data changed'
# The retired material remains in the file only if it still has users; compare all used original materials.
for name,graph in mb.items():
    if name in ma:assert graph==ma[name], 'Original material changed: '+name
skin=bpy.data.objects['akinza_continuous_construction'];co=values(skin.data,'position','vector',3)
asm=after.parents[2]/'assembled-3301/concha-region-match.npz'
geo=np.load(asm)
assert np.array_equal(co,geo['before']+geo['delta'])
assert np.array_equal(values(bpy.data.objects['Akinza fur'].data,'position','vector',3)[starts][~changed],patch['roots'][~changed])
assert not bpy.data.objects.get('Akinza canal tuft 13g') and not bpy.data.objects.get('Akinza canal guides 13g')
report=dict(heldObjectsExact=True,originalMaterialGraphsExact=True,heldNativeRootsExact=True,
    geometryEqualsNewAssembly=True,oldTuftAndGuidesRemoved=True,nativeEdited=int(changed.sum()),outsideGeometryMax=0,
    protected=a,surfaceSha256=hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest())
(after/'held-data.json').write_text(json.dumps(report,indent=2)+'\n')
print('14_HELD_DATA_PASS',flush=True)
