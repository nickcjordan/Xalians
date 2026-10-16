"""Prepare a small real Blender job for local and spillover integration checks."""
import json
from pathlib import Path


def prepare():
    root = Path(__file__).resolve().parents[2] / 'untracked/mini-blender-smoke'
    root.mkdir(parents=True, exist_ok=True)
    script = root / 'smoke.py'
    script.write_text('import bpy,json,sys\nfrom pathlib import Path\n'
                      'out=Path(sys.argv[-1]); out.parent.mkdir(parents=True,exist_ok=True)\n'
                      'out.write_text(json.dumps({"version":bpy.app.version_string,"build":bpy.app.build_hash.decode()}))\n')
    config = {'mappings': [{'source': root.as_posix(), 'target': 'smoke'}],
              'inputs': [script.as_posix()], 'outputs': [(root / 'output.json').as_posix()],
              'args': ['-b', '--python-exit-code', '1', '--python', script.as_posix(),
                       '--', (root / 'output.json').as_posix()]}
    (root / 'job.json').write_text(json.dumps(config, indent=2))


if __name__ == '__main__':
    prepare()
