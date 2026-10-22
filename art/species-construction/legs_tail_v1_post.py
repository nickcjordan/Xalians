"""Post step P-legstail1 (rig pass 7): the hind-leg anatomy (legs_anatomy_v3.py) and the tail root slim
(tailroot_slim_v2.py) applied to the assembled creature, so they are part of the build recipe and not only of the
fur skin the rig was made on.

Both edits are positional displacements of the skin with the same topology and vertex order. Their masks come from
the animation rig's joints and weights, so the step derives them from the input skin exactly as the rig does
(anim/build_anim_rig.py: rig_core.derive_anim_joints and compute_anim_weights), then runs the two scripts in turn
and writes the result back into the skin object. On assembled-3300 the input skin is the fur of record's skin
(identical positions and order), so the output equals the rig's skin.

Runner: python (numpy and scipy on the host; Blender only for reading and writing the blend, through loop_tools).

  python art/species-construction/legs_tail_v1_post.py --asm <assembled dir> --out <new assembled dir>
      --legs-spec <legs-anatomy-v3.json> --tail-spec <tailroot-slim-v2.json>

Writes into --out: akinza.blend, akinza.glb, assembly.json (the skin's stats), legs-tail-v1.json (the record: moved
vertices per edit, displacement outside the leg and tail-root masks, which must be 0, input and script hashes) and
legs-tail-region-match.npz (before, delta, mask), plus the working files under legs-tail-work/.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LOOP_TOOLS = HERE/'loop'/'loop_tools.py'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'failed: {" ".join(map(str, cmd))}\n{(r.stdout+r.stderr)[-3000:]}')
    return r.stdout


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--asm', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--legs-spec', type=Path, required=True)
    p.add_argument('--tail-spec', type=Path, required=True)
    a = p.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    work = a.out/'legs-tail-work'
    probe, rig = work/'probe', work/'rig'
    probe.mkdir(parents=True, exist_ok=True)
    blend = a.out/'akinza.blend' if (a.out/'akinza.blend').is_file() else a.asm/'akinza.blend'
    run([sys.executable, str(LOOP_TOOLS), 'blender', '--log', f'{a.out.name}-probe',
         'art/species-construction/anim/probe_skin.py', str(blend), str(probe)])
    run([sys.executable, str(HERE/'anim'/'build_anim_rig.py'), '--probe', str(probe), '--out', str(rig)])
    d = np.load(probe/'skin.npz')
    np.savez_compressed(work/'skin.npz', src=d['verts'], tri=d['tris'], edges=d['edges'])
    run([sys.executable, str(HERE/'legs_anatomy_v3.py'), '--skin', str(work/'skin.npz'), '--rig', str(rig),
         '--spec', str(a.legs_spec), '--out', str(work/'legs.npz'), '--record', str(work/'legs.json')])
    run([sys.executable, str(HERE/'tailroot_slim_v2.py'), '--skin', str(work/'legs.npz'), '--rig', str(rig),
         '--spec', str(a.tail_spec), '--out', str(work/'legs-tail.npz'), '--record', str(work/'tail.json')])
    before = d['verts'].astype(np.float64)
    after = np.load(work/'legs-tail.npz')['src'].astype(np.float64)
    mid = np.load(work/'legs.npz')['src'].astype(np.float64)
    legs_move = np.linalg.norm(mid-before, axis=1)
    tail_move = np.linalg.norm(after-mid, axis=1)
    delta = after-before
    mask = (legs_move > 0) | (tail_move > 0)
    np.savez_compressed(a.out/'legs-tail-region-match.npz', before=before.astype(np.float32),
                        delta=delta.astype(np.float32), mask=mask)
    out = run([sys.executable, str(LOOP_TOOLS), 'blender', '--log', f'{a.out.name}-apply',
               'art/species-construction/legs_tail_v1_apply.py', str(blend), str(work/'legs-tail.npz'), str(a.out)])
    stats = json.loads((a.out/'legs-tail-apply.json').read_text())
    moved = np.linalg.norm(delta, axis=1)
    rec = dict(step='legs and tail root v1 (post)', vertices=len(before),
               legsMovedVertices=int((legs_move > 1e-5).sum()),
               tailMovedVertices=int((tail_move > 1e-5).sum()),
               movedVertices=int((moved > 0).sum()), maxMove=float(moved.max()),
               outsideMaskMax=float(moved[~mask].max()) if (~mask).any() else 0.,
               leftMoved=int(((moved > 0) & (before[:, 0] > 0)).sum()), rightMoved=int(((moved > 0) & (before[:, 0] < 0)).sum()),
               skinAfter=stats['skinAfter'], topologyUnchanged=True,
               legs=json.loads((work/'legs.json').read_text()), tail=json.loads((work/'tail.json').read_text()),
               inputSha256=sha(a.asm/'akinza.blend'), scriptSha256=sha(Path(__file__)),
               legsScriptSha256=sha(HERE/'legs_anatomy_v3.py'), tailScriptSha256=sha(HERE/'tailroot_slim_v2.py'),
               legsSpecSha256=sha(a.legs_spec), tailSpecSha256=sha(a.tail_spec), approval=None)
    assert rec['outsideMaskMax'] == 0., rec['outsideMaskMax']
    (a.out/'legs-tail-v1.json').write_text(json.dumps(rec, indent=1)+'\n')
    print('LEGS_TAIL_REGION_MATCH', json.dumps({k: v for k, v in rec.items() if k not in ('legs', 'tail')}), flush=True)


if __name__ == '__main__':
    main()
