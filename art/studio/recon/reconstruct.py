"""Local shape reconstruction from sheet views with Hunyuan3D-2 (geometry only), for the Creature Studio.

    <hy3d python> art/studio/recon/reconstruct.py --out <new dir> --view front=<png> [--view left=<png> --view back=<png>]
        [--model mini|mv|full] [--steps 50] [--resolution 380] [--seed 12345] [--crop front=x0,y0,x1,y1]

Runs the separately installed Hunyuan3D-2 checkout and local weights under C:\\dev\\art-data\\tools (no network:
the Hugging Face hub is set offline, no API key is read). One view runs the single-image model (mini or full);
front plus left and/or back runs the multi-view model (mv). The sheet views are on a plain white ground, so the
alpha is made here from the figure mask (near-white background removed, holes filled) instead of a learned
background remover. The whole GPU is kept under 6.5 GB, the ceiling set after this laptop's crashes in September:
torch gets 6.5 GB minus what other programs already hold at start, and raises out-of-memory instead of pushing
the driver to the edge. --cpu-offload keeps idle model parts in system memory for the larger models.

Every run needs a fresh output directory and writes shape.glb, inputs/ (the exact RGBA images given to the
model) and reconstruction.json (inputs and hashes, model, parameters, runtime, peak GPU memory, result).
Experiment X29; log in docs/design/creature-studio-head-recon-trial.md.
"""
import argparse
import hashlib
import json
import os
import sys
import time
import traceback
from pathlib import Path

TOOLS = Path(r'C:\dev\art-data\tools')
SOURCE = TOOLS/'Hunyuan3D-2'
MODELS = {
    'mini': (TOOLS/'hunyuan-mini-weights', 'hunyuan3d-dit-v2-mini'),
    'full': (TOOLS/'hunyuan-full-weights', 'hunyuan3d-dit-v2-0'),
    'mv': (TOOLS/'hunyuan-mv-weights', 'hunyuan3d-dit-v2-mv'),
}
GPU_CAP_GB = 6.5
CONTEXT_GB = 0.7        # the CUDA context and kernels, outside torch's allocator (measured: 7.1 GB total at a 5.4 GB cap)


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def rgba_from_white(path, crop=None, threshold=242):
    """The figure on a white ground as RGBA: alpha from the non-white mask with holes filled, edges kept."""
    import numpy as np
    from PIL import Image
    from scipy import ndimage
    im = Image.open(path).convert('RGB')
    if crop:
        im = im.crop(crop)
    a = np.asarray(im).astype(np.int16)
    fg = (a.min(axis=2) < threshold)
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, n = ndimage.label(fg)
    if n > 1:                                   # keep the figure, drop specks
        sizes = ndimage.sum(fg, lab, range(1, n+1))
        fg = np.isin(lab, 1+np.nonzero(sizes >= 0.02*sizes.max())[0])
    fg = ndimage.binary_fill_holes(fg)
    alpha = (ndimage.gaussian_filter(fg.astype(float), 0.7)*255).clip(0, 255).astype('uint8')
    out = np.dstack([np.asarray(im), alpha])
    return Image.fromarray(out, 'RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--view', action='append', required=True, help='name=path; names front, left, back')
    ap.add_argument('--crop', action='append', default=[], help='name=x0,y0,x1,y1 (pixels of that view)')
    ap.add_argument('--model', choices=sorted(MODELS), default=None)
    ap.add_argument('--steps', type=int, default=50)
    ap.add_argument('--resolution', type=int, default=380)
    ap.add_argument('--guidance', type=float, default=5.0)
    ap.add_argument('--seed', type=int, default=12345)
    ap.add_argument('--cpu-offload', action='store_true')
    args = ap.parse_args()
    views = dict(v.split('=', 1) for v in args.view)
    crops = {k: tuple(int(x) for x in v.split(',')) for k, v in (c.split('=', 1) for c in args.crop)}
    if set(views) - {'front', 'left', 'back'} or 'front' not in views:
        sys.exit('views: front is required; left and back are optional')
    model = args.model or ('mv' if len(views) > 1 else 'mini')
    if (model == 'mv') != (len(views) > 1):
        sys.exit('the mv model takes several views; mini and full take the front view only')
    if args.out.exists() and any(args.out.iterdir()):
        sys.exit(f'{args.out} is not empty: use a new output directory for each run')
    (args.out/'inputs').mkdir(parents=True, exist_ok=True)
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
    sys.path.insert(0, str(SOURCE))
    import torch
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

    images, record_inputs = {}, {}
    for name, p in views.items():
        im = rgba_from_white(p, crops.get(name))
        q = args.out/'inputs'/f'{name}.png'
        im.save(q)
        images[name] = im
        record_inputs[name] = {'source': str(p), 'sourceSha256': sha(p), 'crop': crops.get(name),
                               'given': str(q), 'givenSha256': sha(q)}
    weights, sub = MODELS[model]
    record = {'experiment': 'X29', 'scope': 'unapproved local geometry reconstruction from sheet views',
              'model': f'{weights.name}/{sub}', 'inputs': record_inputs,
              'parameters': {'steps': args.steps, 'octreeResolution': args.resolution, 'guidance': args.guidance,
                             'seed': args.seed, 'dtype': 'float16', 'gpuCapGB': GPU_CAP_GB},
              'runtime': {'torch': torch.__version__, 'gpu': torch.cuda.get_device_name()}, 'status': 'running'}
    rec_path = args.out/'reconstruction.json'
    rec_path.write_text(json.dumps(record, indent=1), encoding='utf-8')
    free, total = torch.cuda.mem_get_info()
    others = (total-free)/2**30                 # held by other programs (the desktop, the browser) at start
    cap = GPU_CAP_GB-others-CONTEXT_GB
    if cap < 3.0:
        sys.exit(f'only {cap:.1f} GB of the {GPU_CAP_GB} GB budget is free; other programs hold {others:.1f} GB')
    torch.cuda.set_per_process_memory_fraction(cap*2**30/total)
    record['parameters'].update(torchCapGB=round(cap, 2), othersAtStartGB=round(others, 2), cpuOffload=args.cpu_offload)
    t0 = time.monotonic()
    try:
        torch.set_default_dtype(torch.float16)
        pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(str(weights), subfolder=sub, variant='fp16',
                                                                device='cpu' if args.cpu_offload else 'cuda')
        torch.set_default_dtype(torch.float32)
        if args.cpu_offload:
            # upstream exposes the offload methods but not the component registry they read
            pipe.components = {n: getattr(pipe, n) for n in ('conditioner', 'model', 'vae')}
            pipe.enable_model_cpu_offload()
            pipe.device = torch.device('cuda')
        image = images if model == 'mv' else images['front']
        mesh = pipe(image=image, num_inference_steps=args.steps, guidance_scale=args.guidance,
                    octree_resolution=args.resolution, num_chunks=8000,
                    generator=torch.manual_seed(args.seed), output_type='trimesh')[0]
        out = args.out/'shape.glb'
        mesh.export(out)
        record.update(status='mesh_exported', outputSha256=sha(out), vertices=len(mesh.vertices),
                      faces=len(mesh.faces), bounds=mesh.bounds.tolist(), watertight=bool(mesh.is_watertight))
    except Exception:
        record.update(status='failed', error=traceback.format_exc())
        raise
    finally:
        record['elapsedSeconds'] = round(time.monotonic()-t0, 1)
        record['peakGpuMemoryGB'] = round(torch.cuda.max_memory_allocated()/2**30, 2)
        rec_path.write_text(json.dumps(record, indent=1), encoding='utf-8')
    print(json.dumps({k: record[k] for k in ('status', 'elapsedSeconds', 'peakGpuMemoryGB', 'vertices')}))


if __name__ == '__main__':
    main()
