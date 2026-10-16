"""Reproduce step 12c's four views and export actual strand/skin evidence.

Run in WSL Blender with -- --surface DIR --out DIR [--extract-only].
The pair assembly and regional measurements use the exported NPZ on regular Python.
"""
import argparse
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_surface as render


VIEWS = {
    'head-backq': (155, 24, Vector((0, 0.02, 0.64)), 0.95, 1024, 1024),
    'head-side': (90, 8, Vector((0.07, -0.015, 0.63)), 0.65, 1024, 1024),
    'ear-back-close': (155, 14, Vector((0.23, 0.015, 0.67)), 0.48, 1024, 1024),
    'body-backq': (145, 8, Vector((0, 0.16, -0.03)), 2.05, 768, 1024),
}


def export(surface, out):
    bpy.ops.wm.open_mainfile(filepath=str(surface/'surface.blend'))
    skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    me = skin.data
    co = np.empty(len(me.vertices)*3, np.float32)
    me.vertices.foreach_get('co', co)
    normal = np.empty_like(co)
    me.vertex_normals.foreach_get('vector', normal)
    edges = np.empty(len(me.edges)*2, np.int32)
    me.edges.foreach_get('vertices', edges)
    data = dict(co=co.reshape(-1, 3), normal=normal.reshape(-1, 3), edges=edges.reshape(-1, 2))
    for a in me.attributes:
        if a.domain == 'POINT' and a.data_type in ('FLOAT', 'FLOAT_VECTOR'):
            v = np.empty(len(a.data)*(3 if a.data_type == 'FLOAT_VECTOR' else 1), np.float32)
            a.data.foreach_get('vector' if a.data_type == 'FLOAT_VECTOR' else 'value', v)
            data['attr_'+a.name] = v.reshape(-1, 3) if a.data_type == 'FLOAT_VECTOR' else v
    fur = bpy.data.objects['Akinza fur'].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    points = np.empty(len(fur.points)*3, np.float32)
    fur.points.foreach_get('position', points)
    starts = np.empty(len(fur.curves), np.int32)
    fur.curves.foreach_get('first_point_index', starts)
    points = points.reshape(-1, 3)
    data.update(roots=points[starts], first=points[starts+1]-points[starts], points=points, starts=starts)
    for name, width in (('nrm', 3), ('combp', 3), ('comb_flow', 1)):
        attr = fur.attributes.get(name)
        if attr is not None and len(attr.data) in (len(points), len(starts)):
            values = np.empty(len(attr.data)*width, np.float32)
            attr.data.foreach_get('vector' if width == 3 else 'value', values)
            if width == 3:
                values = values.reshape(-1, 3)
            data['curve_'+name] = values[starts] if len(attr.data) == len(points) else values
    from fur_systems import append_evidence
    append_evidence(surface, data)
    np.savez_compressed(out/'evidence.npz', **data)
    print('EXPORTED', out, len(data['starts']), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--surface', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--extract-only', action='store_true')
    p.add_argument('--views', default=','.join(VIEWS))
    a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
    a.out.mkdir(parents=True, exist_ok=True)
    export(a.surface, a.out)
    if not a.extract_only:
        render.VIEWS.update(VIEWS)
        sys.argv = [__file__, '--', '--surface', str(a.surface), '--out', str(a.out),
                    '--views', a.views, '--samples', '32', '--palette', 'T7']
        render.main()
