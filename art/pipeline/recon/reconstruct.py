"""Stage 4 shape reconstruction with Hunyuan3D-2 (geometry only) from masked clay views.

    <shape-env python> art/pipeline/recon/reconstruct.py --out <new dir> --view front=<rgba png> --view left=<rgba png>
        [--model mv|mini|full] [--steps 50] [--resolution 380] [--guidance 5.0] [--seed 12345]

Inputs are RGBA images already masked by masks.py (the alpha is the figure). Runs the local checkout and weights
under C:\\dev\\art-data\\tools with the Hugging Face hub offline. GPU rule: the whole card stays under 6.5 GB, so
torch's allocator is capped at 6.5 GB minus what other programs hold at start minus the CUDA context, and an
overrun raises out-of-memory instead of pushing the driver; idle model parts stay in system memory (CPU offload).
Writes shape.glb and run.json (inputs with hashes, parameters, peak GPU memory, seconds, output hash, license line).
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
SOURCE = TOOLS / 'Hunyuan3D-2'
MODELS = {
    'mini': (TOOLS / 'hunyuan-mini-weights', 'hunyuan3d-dit-v2-mini'),
    'full': (TOOLS / 'hunyuan-full-weights', 'hunyuan3d-dit-v2-0'),
    'mv': (TOOLS / 'hunyuan-mv-weights', 'hunyuan3d-dit-v2-mv'),
}
GPU_CAP_GB = 6.5
CONTEXT_GB = 0.7
LICENSE = ("tool: Hunyuan3D-2, Tencent Hunyuan 3D 2.0 Community License, noted per Nick's 2026-10-14 ruling "
           "that licensing is not a gate")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--view', action='append', required=True, help='name=rgba path; names front, left, back, right')
    ap.add_argument('--model', choices=sorted(MODELS), default=None)
    ap.add_argument('--steps', type=int, default=50)
    ap.add_argument('--resolution', type=int, default=380)
    ap.add_argument('--guidance', type=float, default=5.0)
    ap.add_argument('--seed', type=int, default=12345)
    args = ap.parse_args()
    views = dict(v.split('=', 1) for v in args.view)
    model = args.model or ('mv' if len(views) > 1 else 'mini')
    if model != 'mv' and len(views) != 1:
        sys.exit('mini and full take one view')
    if args.out.exists() and any(args.out.iterdir()):
        sys.exit(f'{args.out} is not empty: use a new output directory for each run')
    args.out.mkdir(parents=True, exist_ok=True)
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
    sys.path.insert(0, str(SOURCE))
    import torch
    from PIL import Image
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

    images = {k: Image.open(p).convert('RGBA') for k, p in views.items()}
    weights, sub = MODELS[model]
    record = {'tool': LICENSE, 'model': f'{weights.name}/{sub}',
              'inputs': {k: {'path': str(p), 'sha256': sha(p)} for k, p in views.items()},
              'parameters': {'steps': args.steps, 'octreeResolution': args.resolution, 'guidance': args.guidance,
                             'seed': args.seed, 'dtype': 'float16', 'cpuOffload': True, 'gpuCapGB': GPU_CAP_GB},
              'runtime': {'torch': torch.__version__, 'gpu': torch.cuda.get_device_name()}, 'status': 'running'}
    rec_path = args.out / 'run.json'
    rec_path.write_text(json.dumps(record, indent=1), encoding='utf-8')
    free, total = torch.cuda.mem_get_info()
    others = (total - free) / 2**30
    cap = GPU_CAP_GB - others - CONTEXT_GB
    if cap < 3.0:
        sys.exit(f'only {cap:.1f} GB of the {GPU_CAP_GB} GB budget is free; other programs hold {others:.1f} GB')
    torch.cuda.set_per_process_memory_fraction(cap * 2**30 / total)
    record['parameters'].update(torchCapGB=round(cap, 2), othersAtStartGB=round(others, 2))
    t0 = time.monotonic()
    try:
        torch.set_default_dtype(torch.float16)
        pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(str(weights), subfolder=sub, variant='fp16',
                                                                device='cpu')
        torch.set_default_dtype(torch.float32)
        pipe.components = {n: getattr(pipe, n) for n in ('conditioner', 'model', 'vae')}
        pipe.enable_model_cpu_offload()
        pipe.device = torch.device('cuda')
        image = images if model == 'mv' else next(iter(images.values()))
        mesh = pipe(image=image, num_inference_steps=args.steps, guidance_scale=args.guidance,
                    octree_resolution=args.resolution, num_chunks=8000,
                    generator=torch.manual_seed(args.seed), output_type='trimesh')[0]
        out = args.out / 'shape.glb'
        mesh.export(out)
        record.update(status='mesh_exported', outputSha256=sha(out), vertices=len(mesh.vertices),
                      faces=len(mesh.faces), bounds=mesh.bounds.tolist(), watertight=bool(mesh.is_watertight),
                      components=len(mesh.split(only_watertight=False)))
    except Exception:
        record.update(status='failed', error=traceback.format_exc())
        raise
    finally:
        record['seconds'] = round(time.monotonic() - t0, 1)
        record['peakGpuMemoryGB'] = round(torch.cuda.max_memory_allocated() / 2**30, 2)
        record['peakGpuReservedGB'] = round(torch.cuda.max_memory_reserved() / 2**30, 2)
        rec_path.write_text(json.dumps(record, indent=1), encoding='utf-8')
    print(json.dumps({k: record.get(k) for k in ('status', 'seconds', 'peakGpuMemoryGB', 'faces', 'components',
                                                  'watertight')}))


if __name__ == '__main__':
    main()
