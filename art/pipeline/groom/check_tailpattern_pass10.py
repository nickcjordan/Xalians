"""B-5wvn: left/right symmetry and nonfinite checks of the pass 10 tail pattern. Usage: blender -b --python check_tailpattern_pass10.py -- GROOM OUT.json"""
import bpy, sys, json, numpy as np
g, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=g)
def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a); return a.reshape(-1, n) if n > 1 else a
b = bpy.data.objects['luceras_blockout']; co = arr(b.data.vertices, 'co'); M = arr(b.data.attributes['tail_pattern'].data, 'value', 1)
d = bpy.data.objects['Luceras interpolated coat'].data; nc = len(d.curves); pos = arr(d.attributes['position'].data, 'vector'); N = len(pos) // nc
r = pos.reshape(nc, N, 3)[:, 0]; t = arr(d.attributes['tail_pattern'].data, 'value', 1)
res = {'sculpt_vertices_white_gt_half': {'left_x_pos': int(((M > .5) & (co[:, 0] > 1e-4)).sum()), 'right_x_neg': int(((M > .5) & (co[:, 0] < -1e-4)).sum())},
       'coat_strands_white_gt_half': {'left_x_pos': int(((t > .5) & (r[:, 0] > 0)).sum()), 'right_x_neg': int(((t > .5) & (r[:, 0] < 0)).sum())},
       'nonfinite_points': int((~np.isfinite(pos)).sum())}
open(out, 'w').write(json.dumps(res, indent=1)); print('CHECK', json.dumps(res))
