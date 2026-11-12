"""Akinza eyelids: export the eye region of the fur of record at rest (no render).

  run_blender.py eyelids_probe.py <log> -- <surface dir> <out dir> [--radius 0.13]

Writes <out>/eye-region.npz and <out>/eye-region.json (surface world units, the figure 1.86 tall):
  - every mesh object other than the skin whose name holds eye_globe, iris, ribbon or catch light: vertices, triangles,
    per-triangle material index, vertex normals;
  - the skin vertices within --radius of either eye centre (rig.json eyeCentres, passed through the globe bounds): their
    indices, positions, normals, and the triangles among them; every skin attribute's values there;
  - the fur strands rooted within --radius: their points, and every curve and point attribute's values;
  - the node trees of the materials those objects use (node types, key input values, links), for matching the lid's
    skin and fur to the face.
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--')+1:]
src, out = Path(argv[0]), Path(argv[1])
radius = float(argv[argv.index('--radius')+1]) if '--radius' in argv else 0.13
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src/'surface.blend'))
skin = bpy.data.objects['akinza_continuous_construction']
fur = bpy.data.objects.get('Akinza fur')
A, info = {}, dict(objects=[], materials={}, skinAttributes=[], furAttributes=[])


def world(o):
    m = o.data
    mw = np.array(o.matrix_world)
    co = np.empty(len(m.vertices)*3, np.float32)
    m.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)@mw[:3, :3].T+mw[:3, 3]
    nr = np.empty(len(m.vertices)*3, np.float32)
    m.vertices.foreach_get('normal', nr)
    nr = nr.reshape(-1, 3).astype(np.float64)@np.linalg.inv(mw[:3, :3])
    nr /= np.maximum(np.linalg.norm(nr, axis=1, keepdims=True), 1e-12)
    m.calc_loop_triangles()
    tri = np.empty(len(m.loop_triangles)*3, np.int32)
    m.loop_triangles.foreach_get('vertices', tri)
    mi = np.empty(len(m.loop_triangles), np.int32)
    m.loop_triangles.foreach_get('material_index', mi)
    return co, nr, tri.reshape(-1, 3), mi


def node_dump(mat):
    if mat is None or not mat.use_nodes:
        return None
    nodes = []
    for n in mat.node_tree.nodes:
        ins = {}
        for s in n.inputs:
            if s.is_linked or not hasattr(s, 'default_value'):
                continue
            v = s.default_value
            try:
                v = [round(float(x), 4) for x in v]
            except TypeError:
                v = round(float(v), 4) if isinstance(v, (int, float)) else str(v)
            ins[s.identifier+':'+s.name] = v
        extra = {k: str(getattr(n, k)) for k in ('attribute_name', 'attribute_type', 'operation', 'blend_type', 'data_type',
                                                 'interpolation_type', 'image') if hasattr(n, k)}
        nodes.append(dict(name=n.name, type=n.bl_idname, label=n.label, inputs=ins, **extra))
    links = [f'{l.from_node.name}.{l.from_socket.identifier} -> {l.to_node.name}.{l.to_socket.identifier}' for l in mat.node_tree.links]
    return dict(nodes=nodes, links=links)


mats = set()
centres = []
for o in bpy.data.objects:
    if o.type != 'MESH' or o is skin:
        continue
    if not any(k in o.name for k in ('eye_globe', 'iris', 'ribbon', 'catch light')):
        continue
    co, nr, tri, mi = world(o)
    A[o.name+'__v'], A[o.name+'__n'], A[o.name+'__t'], A[o.name+'__m'] = co, nr, tri, mi
    ms = [x.name if x else None for x in o.data.materials]
    mats.update(x for x in ms if x)
    info['objects'].append(dict(name=o.name, vertices=len(co), triangles=len(tri), materials=ms, hide_render=o.hide_render,
                                bounds=[co.min(0).tolist(), co.max(0).tolist()],
                                attributes=[(a.name, a.domain, a.data_type) for a in o.data.attributes]))
    if 'eye_globe' in o.name and 'ribbon' not in o.name:
        centres.append(((co.min(0)+co.max(0))/2).tolist())
info['eyeCentres'] = centres
C = np.array(centres)

sco, snr, stri, smi = world(skin)
d = np.min(np.linalg.norm(sco[:, None, :]-C[None], axis=2), axis=1)
sel = np.flatnonzero(d < radius)
A['skin__ids'], A['skin__v'], A['skin__n'] = sel, sco[sel], snr[sel]
inside = np.zeros(len(sco), bool)
inside[sel] = True
tk = inside[stri].all(1)
remap = np.full(len(sco), -1, np.int64)
remap[sel] = np.arange(len(sel))
A['skin__t'] = remap[stri[tk]]
A['skin__m'] = smi[tk]
info['skinMaterials'] = [x.name if x else None for x in skin.data.materials]
mats.update(x for x in info['skinMaterials'] if x)
for at in skin.data.attributes:
    info['skinAttributes'].append((at.name, at.domain, at.data_type))
    if at.domain == 'POINT' and at.data_type in ('FLOAT', 'FLOAT_COLOR', 'BYTE_COLOR', 'FLOAT_VECTOR', 'INT', 'BOOLEAN'):
        n = len(at.data)
        if at.data_type == 'FLOAT':
            v = np.empty(n, np.float32); at.data.foreach_get('value', v)
        elif at.data_type in ('FLOAT_COLOR', 'BYTE_COLOR'):
            v = np.empty(n*4, np.float32); at.data.foreach_get('color', v); v = v.reshape(-1, 4)
        elif at.data_type == 'FLOAT_VECTOR':
            v = np.empty(n*3, np.float32); at.data.foreach_get('vector', v); v = v.reshape(-1, 3)
        elif at.data_type == 'INT':
            v = np.empty(n, np.int32); at.data.foreach_get('value', v)
        else:
            v = np.empty(n, bool); at.data.foreach_get('value', v)
        A['skinattr__'+at.name] = v[sel]

if fur is not None:
    cd = fur.data
    offs = np.empty(len(cd.curves)+1, np.int32)
    cd.curve_offset_data.foreach_get('value', offs)
    pos = np.empty(len(cd.points)*3, np.float32)
    cd.points.foreach_get('position', pos)
    mw = np.array(fur.matrix_world)
    pos = pos.reshape(-1, 3).astype(np.float64)@mw[:3, :3].T+mw[:3, 3]
    roots = pos[offs[:-1]]
    dr = np.min(np.linalg.norm(roots[:, None, :]-C[None], axis=2), axis=1)
    cs = np.flatnonzero(dr < radius)
    A['fur__curves'] = cs
    A['fur__offsets'] = offs[cs]
    A['fur__counts'] = (offs[1:]-offs[:-1])[cs]
    pix = np.concatenate([np.arange(offs[c], offs[c+1]) for c in cs]) if len(cs) else np.zeros(0, int)
    A['fur__points'] = pos[pix]
    info['furMaterials'] = [x.name if x else None for x in cd.materials]
    mats.update(x for x in info['furMaterials'] if x)
    info['furCurves'] = len(cd.curves)
    for at in cd.attributes:
        info['furAttributes'].append((at.name, at.domain, at.data_type))
        if at.name.startswith('.') or at.name == 'position':
            continue
        n = len(at.data)
        try:
            if at.data_type == 'FLOAT':
                v = np.empty(n, np.float32); at.data.foreach_get('value', v)
            elif at.data_type in ('FLOAT_COLOR', 'BYTE_COLOR'):
                v = np.empty(n*4, np.float32); at.data.foreach_get('color', v); v = v.reshape(-1, 4)
            elif at.data_type == 'FLOAT_VECTOR':
                v = np.empty(n*3, np.float32); at.data.foreach_get('vector', v); v = v.reshape(-1, 3)
            elif at.data_type == 'FLOAT2':
                v = np.empty(n*2, np.float32); at.data.foreach_get('vector', v); v = v.reshape(-1, 2)
            elif at.data_type == 'INT':
                v = np.empty(n, np.int32); at.data.foreach_get('value', v)
            elif at.data_type == 'BOOLEAN':
                v = np.empty(n, bool); at.data.foreach_get('value', v)
            else:
                continue
        except Exception as e:  # noqa: BLE001
            print('attr skip', at.name, e)
            continue
        A['furattr__'+at.name] = v[cs] if at.domain == 'CURVE' else v[pix]
    info['furModifiers'] = [(m.name, m.type) for m in fur.modifiers]
for nm in sorted(mats):
    info['materials'][nm] = node_dump(bpy.data.materials.get(nm))
info['allObjects'] = [(o.name, o.type, o.hide_render, o.parent.name if o.parent else None) for o in bpy.data.objects]
np.savez_compressed(out/'eye-region.npz', **A)
(out/'eye-region.json').write_text(json.dumps(info, indent=1))
print('EYELIDS_PROBE_DONE', len(sel), 'skin vertices', len(A.get('fur__curves', [])), 'strands', centres)
