"""Snapshot the held Akinza fur inputs and prepare a repeatable front render.

prepare copies only named files, leaving the source worktree untouched.
compare reads the two render outputs and writes pixel and timing measurements.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil


def prepare(root, source):
    base = source / 'untracked/species-construction/akinza/surface/fur-steps/s12-13b'
    scripts = source / 'art/species-construction/surface'
    files = [(base / n, 'source/surface/' + n) for n in ('surface.blend', 'surface-info.json')]
    files += [(scripts / n, 'source/scripts/' + n) for n in (
        'review_fur_12d.py', 'render_surface.py', 'tiger_stripes.py', 'eyeliner_styles.py',
        'akinza-palettes.json', 'akinza-surface.json')]
    hashes = {}
    for src, name in files:
        dest = root / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        hashes[name] = hashlib.sha256(dest.read_bytes()).hexdigest()
    (root / 'input-hashes.json').write_text(json.dumps(hashes, indent=2))
    config = {
        'mappings': [{'source': root.as_posix(), 'target': 'benchmark'}],
        'inputs': [(root / n).as_posix() for n in hashes],
        'outputs': [(root / 'render/body-front.png').as_posix(), (root / 'render/index.json').as_posix()],
        'args': ['-b', '--python-exit-code', '1', '--python', (root / 'source/scripts/review_fur_12d.py').as_posix(),
                 '--', '--surface', (root / 'source/surface').as_posix(), '--out', (root / 'render').as_posix(),
                 '--views', 'body-front', '--samples', '32', '--palette', 'T7', '--device', 'CPU']}
    (root / 'job.json').write_text(json.dumps(config, indent=2))


def compare(root):
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(root / 'mini/body-front.png')).astype(np.int16)
    b = np.asarray(Image.open(root / 'local/body-front.png')).astype(np.int16)
    if a.shape != b.shape:
        raise ValueError('render dimensions differ')
    diff = np.abs(a - b)
    metrics = {'dimensions': list(a.shape), 'meanAbsoluteChannelDifference8bit': float(diff.mean()),
               'maximumChannelDifference8bit': int(diff.max()),
               'differentPixels': int(np.any(diff != 0, axis=2).sum()),
               'differentPixelPercent': float(np.any(diff != 0, axis=2).mean() * 100)}
    log = (root / 'mini-evidence/blender.log').read_text()
    match = re.search(r'Maximum resident set size \(kbytes\):\s*(\d+)', log)
    metrics['miniPeakRssKiB'] = int(match[1]) if match else None
    for name in ('mini', 'local'):
        metrics[name] = json.loads((root / (name + '-evidence/result.json')).read_text())
        metrics[name]['render'] = json.loads((root / name / 'index.json').read_text())
    Image.fromarray(np.minimum(diff * 8, 255).astype('uint8')).save(root / 'difference-x8.png')
    (root / 'comparison.json').write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'compare'])
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2] / 'untracked/mini-blender-benchmark')
    parser.add_argument('--source', type=Path, default=Path('C:/dev/src/xalians-akinza-loop'))
    args = parser.parse_args()
    if args.action == 'prepare':
        prepare(args.root, args.source)
    else:
        compare(args.root)
