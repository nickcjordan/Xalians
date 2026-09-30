"""Local geometry-only method test from an existing, credited image.

Requires a separately installed Hunyuan3D checkout and public model weights.
Does not download models, call an API, synthesize images, or apply textures.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--weights', type=Path, required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--seed', type=int, default=12345)
    parser.add_argument('--steps', type=int, default=50)
    parser.add_argument('--resolution', type=int, default=380)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    output = args.out / 'shape.glb'
    record_path = args.out / 'reconstruction.json'
    if output.exists() or record_path.exists():
        raise FileExistsError('Use a new output directory for each attempt')
    os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
    os.environ['HF_HUB_OFFLINE'] = '1'
    sys.path.insert(0, str(args.source.resolve()))
    import torch
    from PIL import Image
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

    model_folder = args.weights / 'hunyuan3d-dit-v2-mini'
    record = {
        'scope': 'Unapproved local shape reconstruction from retained reference',
        'approval': None,
        'imageGeneration': False,
        'textureGeneration': False,
        'networkInference': False,
        'upstream': 'https://github.com/Tencent-Hunyuan/Hunyuan3D-2',
        'upstreamCommit': subprocess.check_output(
            ['git', '-C', str(args.source), 'rev-parse', 'HEAD'], text=True).strip(),
        'model': 'tencent/Hunyuan3D-2mini/hunyuan3d-dit-v2-mini',
        'inputs': {str(args.input): sha(args.input),
                   **{p.name: sha(p) for p in model_folder.iterdir() if p.is_file()}},
        'parameters': {'seed': args.seed, 'steps': args.steps,
                       'octreeResolution': args.resolution, 'numChunks': 8000,
                       'guidanceScale': 5.0, 'dtype': 'float16'},
        'runtime': {'torch': torch.__version__, 'gpu': torch.cuda.get_device_name()},
        'scriptSha256': sha(__file__),
        'status': 'running',
    }
    record_path.write_text(json.dumps(record, indent=2) + '\n')
    start = time.monotonic()
    try:
        pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            str(args.weights.resolve()), subfolder='hunyuan3d-dit-v2-mini',
            variant='fp16', device='cuda')
        mesh = pipeline(image=Image.open(args.input).convert('RGBA'),
                        num_inference_steps=args.steps,
                        octree_resolution=args.resolution, num_chunks=8000,
                        generator=torch.manual_seed(args.seed), output_type='trimesh')[0]
        mesh.export(output)
        record.update(status='mesh_exported', outputSha256=sha(output),
                      vertices=len(mesh.vertices), faces=len(mesh.faces),
                      bounds=mesh.bounds.tolist(), watertight=bool(mesh.is_watertight))
    except Exception:
        record.update(status='failed', error=traceback.format_exc())
        raise
    finally:
        record['elapsedSeconds'] = time.monotonic() - start
        record['peakGpuMemoryBytes'] = torch.cuda.max_memory_allocated()
        record_path.write_text(json.dumps(record, indent=2) + '\n')


if __name__ == '__main__':
    main()
