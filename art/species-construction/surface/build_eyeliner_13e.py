"""One 13e build, matched G1 comparison views and fresh body-wide sweeps."""
import sys,json,hashlib,runpy,gc
from pathlib import Path
import bpy
import numpy as np
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import review_fur_13
import render_surface as render
from eyeliner_styles import apply_outer,remove_outer
args=sys.argv[sys.argv.index('--')+1:]
skip_before='--skip-before' in args
if skip_before:args.remove('--skip-before')
before,out=map(Path,args)
out.mkdir(parents=True,exist_ok=True)

def shot(surface,dest,style):
    sys.argv=['review_fur_13.py','--','--surface',str(surface),'--out',str(dest),'--views','eye-close,head-front','--samples','24','--palette','T7','--eyeliner',style]
    render.main()

# Fresh before on the exact held 13c-fix surface.
if not skip_before:shot(before,out/'before','mix-g1')
bpy.ops.wm.open_mainfile(filepath=str(before/'surface.blend'))

def digest(data):
    result={}
    for a in data.attributes:
        if a.name.startswith('outer_liner_'):continue
        w=3 if a.data_type=='FLOAT_VECTOR' else 1
        if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','BOOLEAN'):continue
        arr=np.empty(len(a.data)*w,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
        a.data.foreach_get('vector' if w==3 else 'value',arr)
        result[a.name]=hashlib.sha256(arr.tobytes()).hexdigest()
    return result

def held():
    result={}
    for ob in bpy.data.objects:
        if ob.type not in ('MESH','CURVES'):continue
        item={'attrs':digest(ob.data),'matrix':[list(v) for v in ob.matrix_world],'slots':[m.name for m in ob.data.materials]}
        if ob.type=='MESH':
            co=np.empty(len(ob.data.vertices)*3,np.float32);ob.data.vertices.foreach_get('co',co)
            ids=np.empty(len(ob.data.loops),np.int32);ob.data.loops.foreach_get('vertex_index',ids)
            item.update(co=hashlib.sha256(co.tobytes()).hexdigest(),topology=hashlib.sha256(ids.tobytes()).hexdigest())
        else:
            starts=np.empty(len(ob.data.curves),np.int32);ob.data.curves.foreach_get('first_point_index',starts)
            item['curveStarts']=hashlib.sha256(starts.tobytes()).hexdigest()
        result[ob.name]=item
    return result
original=held()
namespace={'__file__':str(HERE/'verify_fur_12f.py')}
exec(compile((HERE/'verify_fur_12f.py').read_text().split('args=sys.argv')[0],'material_helpers','exec'),namespace)
graph=namespace['material_graph']
materials={m.name:graph(m) for m in bpy.data.materials if m.use_nodes}
apply_outer()
remove_outer()
assert all(materials[name]==graph(bpy.data.materials[name]) for name in materials),'Style roundtrip changed original material graphs'
(out/'style-roundtrip.json').write_text(json.dumps({'restoredAllOriginalGraphs':True},indent=2))
apply_outer()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(out/'surface.blend'))
bpy.ops.wm.open_mainfile(filepath=str(out/'surface.blend'))
assert original==held(),'Geometry, physical fur or inherited attributes changed'
(out/'held-data.json').write_text(json.dumps({'unchanged':True,'before':original,'after':held()},indent=2))
info=json.loads((before/'surface-info.json').read_text());info['eyeliner']='G1-outer';info['step13e']='Shader-only external liner, geometry and existing fur held'
(out/'surface-info.json').write_text(json.dumps(info,indent=2))
shot(out,out/'after','G1-outer')
gc.collect()
for script in ('sweep_fur_12d.py','sweep_obstacles_12d.py'):
    sys.argv=[script,'--',str(out),str(out/'r')]
    runpy.run_path(str(HERE/script),run_name='__main__')
    gc.collect()
print('13E_BUILD_RENDER_SWEEPS_COMPLETE',flush=True)
