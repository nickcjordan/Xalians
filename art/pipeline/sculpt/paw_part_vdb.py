"""B-9cvs: mesh the paw skin field once with OpenVDB (Blender's bundled openvdb module), then run paw_part_blend.py on it.

Usage: blender -b SCULPT.blend --python paw_part_vdb.py -- GRID.npz PAWS.npz OUT_DIR TAG [paw_part_blend flags]
GRID.npz comes from paw_part_skel.py (<kind>_F dense signed distance in metres, <kind>_X0 origin, <kind>_h voxel).
The field is copied into an openvdb FloatGrid (level set class), meshed at isovalue 0 with convertToQuads, mapped back
to world space, and written as <kind>_V / <kind>_Q into PAWS.npz with every other array passed through.
"""
import sys, os, runpy, numpy as np
import openvdb as vdb

args = sys.argv[sys.argv.index('--') + 1:]
gridp, pawsp = args[0], args[1]; rest = args[2:]
G = dict(np.load(gridp)); out = {k: v for k, v in G.items() if not (k.endswith('_F') or k.endswith('_X0') or k.endswith('_h'))}
for kind in ('hind', 'fore'):
    F = G[f'{kind}_F'].astype(np.float32); X0 = G[f'{kind}_X0']; h = float(G[f'{kind}_h'])
    g = vdb.FloatGrid(background=float(F.max())); g.gridClass = vdb.GridClass.LEVEL_SET
    g.copyFromArray(F / h)   # index-space distances
    pts, quads = g.convertToQuads(isovalue=0.0)
    V = X0 + np.asarray(pts, float) * h; Q = np.asarray(quads, np.int64)
    nc = "shells filtered later by paw_part_blend.remesh_onto"
    # outward orientation: signed volume must be positive
    tri = np.r_[Q[:, [0, 1, 2]], Q[:, [0, 2, 3]]]; vol = np.einsum('ij,ij->i', V[tri[:, 0]], np.cross(V[tri[:, 1]], V[tri[:, 2]])).sum() / 6
    if vol < 0: Q = Q[:, ::-1]
    out[f'{kind}_V'] = V; out[f'{kind}_Q'] = Q
    print('VDB mesh', kind, 'verts', len(V), 'quads', len(Q), 'shells', nc, 'volume_ml', round(abs(vol) * 1e6, 2))
np.savez_compressed(pawsp, **out)
sys.argv = [sys.argv[0], '--', pawsp] + rest
runpy.run_path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/sculpt/paw_part_blend.py', run_name='__main__')
