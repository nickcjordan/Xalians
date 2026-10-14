"""A reconstruction (shape.glb) as a signed distance grid the studio's field can use (part kind "grid").

    <python with trimesh and scipy> art/studio/recon/mesh_to_grid.py --glb <shape.glb> --out <grid.npz>
        [--box x0,y0,z0,x1,y1,z1] [--voxel 0.0015] [--smooth 1.0] [--height 0.658] [--center-y 0.005]

The mesh is brought into the studio frame exactly as recon_scene.py does (glTF y-up to z-up, facing -y, scaled to
--height, on the ground, centered in x, centered in y on --center-y). Inside --box, every voxel gets its distance to
the surface (nearest of dense surface samples) with the sign from that sample's face normal (outside where the
offset points along the normal). --smooth is a Gaussian blur in voxels: it takes off the reconstruction's faint
scan relief while keeping the forms, since the zero level of a lightly blurred distance field moves very little.
Writes origin, voxel, values (float32, meters) and a record of the source and settings. Experiment X29.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import trimesh
from scipy import ndimage
from scipy.spatial import cKDTree


def studio_frame(v, height, center_y):
    v = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)
    lo, hi = v.min(0), v.max(0)
    s = height/(hi[2]-lo[2])
    off = np.array([-(lo[0]+hi[0])/2*s, center_y-(lo[1]+hi[1])/2*s, -lo[2]*s])
    return v*s+off, s, off


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--glb', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--box', default='-0.14,-0.32,0.26,0.14,0.08,0.62')
    ap.add_argument('--voxel', type=float, default=0.0015)
    ap.add_argument('--smooth', type=float, default=1.0)
    ap.add_argument('--height', type=float, default=0.658)
    ap.add_argument('--center-y', type=float, default=0.005)
    ap.add_argument('--samples', type=int, default=3_000_000)
    ap.add_argument('--floor', type=float, help='cut everything below this height (the ground plate a model copies '
                                                'from a drawn shadow)')
    args = ap.parse_args()
    m = trimesh.load(args.glb, force='mesh')
    v, s, off = studio_frame(np.asarray(m.vertices, float), args.height, args.center_y)
    mesh = trimesh.Trimesh(v, m.faces, process=False)
    pts, fi = trimesh.sample.sample_surface(mesh, args.samples, seed=7)
    nrm = mesh.face_normals[fi]
    tree = cKDTree(pts)
    box = np.array([float(x) for x in args.box.split(',')])
    lo, hi = box[:3], box[3:]
    shape = np.ceil((hi-lo)/args.voxel).astype(int)+1
    axes = [lo[i]+np.arange(shape[i])*args.voxel for i in range(3)]
    vals = np.empty(shape, np.float32)
    for i, x in enumerate(axes[0]):
        Y, Z = np.meshgrid(axes[1], axes[2], indexing='ij')
        q = np.stack([np.full(Y.size, x), Y.ravel(), Z.ravel()], 1)
        d, k = tree.query(q, workers=-1)
        sign = np.sign(np.einsum('ij,ij->i', q-pts[k], nrm[k]))
        sign[sign == 0] = 1
        vals[i] = (d*sign).reshape(Y.shape)
    if args.smooth > 0:
        vals = ndimage.gaussian_filter(vals, args.smooth).astype(np.float32)
    if args.floor is not None:
        vals = np.maximum(vals, (args.floor-axes[2])[None, None, :]).astype(np.float32)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    record = {'source': str(args.glb), 'sourceSha256': hashlib.sha256(args.glb.read_bytes()).hexdigest(),
              'frame': {'height': args.height, 'centerY': args.center_y, 'scale': s, 'offset': off.tolist()},
              'box': box.tolist(), 'voxel': args.voxel, 'smooth': args.smooth, 'samples': args.samples, 'floor': args.floor,
              'shape': shape.tolist()}
    np.savez_compressed(args.out, origin=lo.astype(np.float64), voxel=np.float64(args.voxel), values=vals,
                        record=json.dumps(record))
    print(json.dumps(record))


if __name__ == '__main__':
    main()
