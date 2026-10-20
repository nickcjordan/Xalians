"""B-yqgg: inspect the rig, the base sculpt, the pawpart preview and paws.blend (read only). Writes work/inspect_*.json."""
import bpy, json, sys, numpy as np, hashlib
OUT = '/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass1/work'
CS = '/mnt/c/dev/art-data/pipeline/codex-stream'
FILES = {'rig': f'{CS}/luceras-rig/pass3/rig.blend', 'sculpt': f'{CS}/luceras-hindpaw/pass1/luceras_sculpt.blend',
         'preview': f'{CS}/luceras-pawpart/pass8/luceras_pawpart_preview.blend', 'paws': f'{CS}/luceras-pawpart/pass8/paws.blend'}
def topo(m):
    h = hashlib.sha256()
    for coll, prop, n, dt in [(m.loops, 'vertex_index', 1, np.int32), (m.polygons, 'loop_start', 1, np.int32), (m.polygons, 'loop_total', 1, np.int32)]:
        a = np.empty(len(coll) * n, dt); coll.foreach_get(prop, a); h.update(a.tobytes())
    return h.hexdigest()
res = {}
for tag, path in FILES.items():
    bpy.ops.wm.open_mainfile(filepath=path)
    d = {}
    for o in bpy.data.objects:
        e = dict(type=o.type, parent=o.parent.name if o.parent else None, parent_type=o.parent_type, parent_bone=o.parent_bone,
                 hide=o.hide_get() if o.name in bpy.context.view_layer.objects else None, hide_render=o.hide_render,
                 collections=[c.name for c in o.users_collection], props={k: str(o[k]) for k in o.keys()},
                 mods=[(m.name, m.type, getattr(m, 'object', None) and m.object.name) for m in o.modifiers], loc=list(o.matrix_world.translation))
        if o.type == 'MESH':
            m = o.data; e.update(verts=len(m.vertices), polys=len(m.polygons), topo=topo(m), vgroups=len(o.vertex_groups),
                                 uv=[u.name for u in m.uv_layers], attrs=[a.name for a in m.attributes],
                                 materials=[s.material.name if s.material else None for s in o.material_slots])
            if m.shape_keys:
                e['shape_keys'] = [k.name for k in m.shape_keys.key_blocks]
                ad = m.shape_keys.animation_data
                e['drivers'] = [(fc.data_path, fc.driver.expression, [(v.name, v.type, v.targets[0].bone_target, v.targets[0].transform_type, v.targets[0].transform_space) for v in fc.driver.variables]) for fc in (ad.drivers if ad else [])]
            if o.type == 'MESH' and len(m.vertices) < 400:
                e['vg_names'] = [g.name for g in o.vertex_groups]
        if o.type == 'ARMATURE':
            e['bones'] = [(b.name, b.parent.name if b.parent else None, b.use_deform, list(b.head_local), list(b.tail_local)) for b in o.data.bones]
            e['actions'] = [a.name for a in bpy.data.actions]
        d[o.name] = e
    res[tag] = d
    # coordinates of the main body for comparison
    if 'luceras_blockout' in bpy.data.objects:
        o = bpy.data.objects['luceras_blockout']; m = o.data
        V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
        W = np.array(o.matrix_world); V = V @ W[:3, :3].T + W[:3, 3]
        np.save(f'{OUT}/inspect_{tag}_body.npy', V)
json.dump(res, open(f'{OUT}/inspect.json', 'w'), indent=1, default=str)
print('INSPECT done')
