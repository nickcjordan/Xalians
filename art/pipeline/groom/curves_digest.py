"""Digest every curves object's data (sha256 per attribute, curve offsets and counts) so two scenes can be diffed.
blender -b SCENE --python curves_digest.py -- OUT.json [ROOTS.npz]
With ROOTS.npz, also dumps the rest roots (from the binding) of the named objects for a root-position diff."""
import bpy, sys, json, hashlib
import numpy as np
A = sys.argv[sys.argv.index('--') + 1:]; OUT = A[0]
out = {}
for o in bpy.data.objects:
    if o.type != 'CURVES': continue
    d = o.data; rec = dict(curves=len(d.curves), points=len(d.points), hide_render=o.hide_render, surface=d.surface.name if d.surface else None,
                           modifiers=[(m.name, m.type, getattr(getattr(m, 'node_group', None), 'name', None), m.show_render) for m in o.modifiers],
                           materials=[m.name if m else None for m in d.materials], attrs={})
    offs = np.empty(len(d.curves), np.int32); d.curves.foreach_get('first_point_index', offs); rec['offsets_sha'] = hashlib.sha256(offs.tobytes()).hexdigest()
    for a in d.attributes:
        if a.name.startswith('.'): continue
        key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector', 'BYTE_COLOR': 'color', 'FLOAT2': 'vector'}.get(a.data_type, 'value')
        w = {'FLOAT_COLOR': 4, 'BYTE_COLOR': 4, 'FLOAT_VECTOR': 3, 'FLOAT2': 2}.get(a.data_type, 1)
        dt = np.int32 if a.data_type in ('INT', 'BOOLEAN') else np.float32
        x = np.empty(len(a.data) * w, dt)
        try: a.data.foreach_get(key, x)
        except Exception as ex: rec['attrs'][a.name] = 'unread: ' + str(ex); continue
        rec['attrs'][a.name] = hashlib.sha256(x.tobytes()).hexdigest()
    out[o.name] = rec
b = bpy.data.objects.get('luceras_blockout')
if b is not None:
    V = np.empty(len(b.data.vertices) * 3, np.float32); b.data.vertices.foreach_get('co', V)
    L = np.empty(len(b.data.loops), np.int32); b.data.loops.foreach_get('vertex_index', L)
    out['__body__'] = dict(vertices_sha=hashlib.sha256(V.tobytes()).hexdigest(), loops_sha=hashlib.sha256(L.tobytes()).hexdigest(), matrix=[list(r) for r in b.matrix_world])
json.dump(out, open(OUT, 'w'), indent=1); print('DIGEST done', len(out), flush=True)
