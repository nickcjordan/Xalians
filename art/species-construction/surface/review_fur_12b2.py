"""The original 12b cameras, at approximately 1000 pixels."""
import sys
import argparse
import hashlib
import json
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_surface as render

render.VIEWS.update({
    'ears-front': (0, 3, Vector((0, -.02, .74)), 1.35, 1024, 667),
    'head-side': (90, 2, Vector((0, -.12, .58)), .42, 1024, 1024),
    'ear-root-close': (62, 4, Vector((.15, -.05, .70)), .24, 1024, 1024),
})
if '--extract-only' in sys.argv:
    import bpy
    import numpy as np
    from review_fur_12c import export
    parser = argparse.ArgumentParser()
    parser.add_argument('--surface', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--extract-only', action='store_true')
    parser.add_argument('--verify-before', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.out.mkdir(parents=True, exist_ok=True)
    export(args.surface, args.out)
    cu = bpy.data.objects['Akinza fur'].data
    attr = cu.attributes['cupm']
    cup = np.empty(len(attr.data), np.float32)
    attr.data.foreach_get('value', cup)
    np.save(args.out/'curve-cup.npy', cup)
    if args.verify_before:
        changed = np.load(args.surface/'patch-evidence.npz')['changed']
        def fingerprints():
            fur = bpy.data.objects['Akinza fur'].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
            starts = np.empty(len(fur.curves), np.int32)
            fur.curves.foreach_get('first_point_index', starts)
            point_changed = np.repeat(changed, np.diff(np.r_[starts, len(fur.points)]))
            attrs = {}
            for a in fur.attributes:
                width = 3 if a.data_type == 'FLOAT_VECTOR' else 1
                if a.data_type not in ('FLOAT', 'FLOAT_VECTOR', 'INT', 'BOOLEAN'):
                    continue
                v = np.empty(len(a.data)*width, np.float32 if a.data_type.startswith('FLOAT') else np.int32)
                a.data.foreach_get('vector' if width == 3 else 'value', v)
                v = v.reshape(-1, width)
                mask = changed if a.domain == 'CURVE' else point_changed
                attrs[a.name] = hashlib.sha256(v[~mask].tobytes()).hexdigest()
            meshes = {}
            for ob in bpy.data.objects:
                if ob.type != 'MESH':
                    continue
                v = np.empty(len(ob.data.vertices)*3, np.float32)
                ob.data.vertices.foreach_get('co', v)
                loops = np.empty(len(ob.data.loops), np.int32)
                ob.data.loops.foreach_get('vertex_index', loops)
                meshes[ob.name] = dict(geometry=hashlib.sha256(v.tobytes()+loops.tobytes()).hexdigest(),
                                      materials=[m.name if m else None for m in ob.data.materials])
            return dict(unselectedFurAttributes=attrs, meshes=meshes,
                        furMaterials=[m.name if m else None for m in fur.materials])
        final = fingerprints()
        bpy.ops.wm.open_mainfile(filepath=str(args.verify_before/'surface.blend'))
        before = fingerprints()
        assert before == final, 'Unselected fur attributes, mesh geometry or material slots changed'
        (args.out/'protection-check.json').write_text(json.dumps(dict(equal=True, final=final), indent=2))
else:
    render.main()
