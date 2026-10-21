"""B-j6jh: read-only inventory of the pass5 rig/clips for the deformation audit (nothing saved)."""
import bpy, sys, json
a = sys.argv[sys.argv.index('--') + 1:]
out = {}
for src in a[:-1]:
    bpy.ops.wm.open_mainfile(filepath=src)
    d = dict(actions={ac.name: list(ac.frame_range) for ac in bpy.data.actions}, objects=[])
    for o in bpy.data.objects:
        d['objects'].append(dict(name=o.name, type=o.type, kind=o.get('body_kind'), hide_render=o.hide_render, parent=o.parent.name if o.parent else None,
            ptype=o.parent_type, pbone=o.parent_bone, verts=len(o.data.vertices) if o.type == 'MESH' else None,
            mods=[(m.type, m.name, m.show_render) for m in o.modifiers], ngroups=len(o.vertex_groups) if o.type == 'MESH' else None,
            sk=[k.name for k in o.data.shape_keys.key_blocks] if o.type == 'MESH' and o.data.shape_keys else None))
    rig = bpy.data.objects.get('luceras_rig')
    d['rig_props'] = {k: str(rig[k]) for k in rig.keys()} if rig else None
    d['scene'] = dict(frame_start=bpy.context.scene.frame_start, frame_end=bpy.context.scene.frame_end, action=rig.animation_data.action.name if rig and rig.animation_data and rig.animation_data.action else None)
    out[src] = d
open(a[-1], 'w').write(json.dumps(out, indent=1))
