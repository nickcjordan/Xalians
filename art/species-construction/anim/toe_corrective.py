"""Toe-curl corrective keys for rig-p8b (clip set batch 2, faint fix pass 4: it kneels on the balls of its feet, the toes curled
under). The rig's foot is one bone from the ankle to the toes' tips, so the toes cannot bend on it; these keys bend them. Numpy,
no Blender.

  python art/species-construction/anim/toe_corrective.py <rig dir> <rest skin npz> --full <shin swing>
      [--angle 40] [--rise0 88] [--mid-share .5] [--band .86,1.02] [--check-bakes a/poses.json,...] [--dry-run]

Each key turns the toes up toward the top of the foot (a dorsiflexion of the toes) about the toe joint's X axis (the MTP line,
joints.json toe.L / toe.R): a foot vertex at `along` (its distance from the ankle along the ankle-to-toe line, in units of that
line: 1 at the toe joint) turns by the angle times smoothstep(along, band) times its weight on the foot bone, so the turn
grows across the band at the root of the toes and is whole on the toes. Two keys a side, driven like every key of the rig by a
bone's swing (rig_core.driver_value of rig_core.swing_deg), here the shin's (the knee's bend), so the toes curl only as the
knees fold past every approved clip (rise0 88 degrees, above the largest shin swing of idle, Night Stalk, batch 1, batch 2's
displaced and held and batch 3: 83.1; their skins are unchanged bit for bit):
  toe_curl_mid.<side>  the toes turned --mid-share of --angle; rises from rise0 to the mid swing, falls to 0 at --full;
  toe_curl.<side>      the toes turned --angle; rises from the mid swing to --full and holds.
In a pose where the key is whole, a foot turned heel up by the same angle about the toe joint leaves the toes where they were
(faint's crumple turns the foot that way: akinza_clipset_b2.crumple_legs). Appends the keys to <rig dir>/correctives.json and
.npz under <rig dir>/correctives.lock (load the files as they are now, replace only these keys by name, write, release), and
writes <rig dir>/toe-corrective.json (parameters, the keys, every key's largest value over --check-bakes).
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('--full', type=float, required=True, help='shin swing (degrees) at which the curl is whole')
p.add_argument('--angle', type=float, default=40.)
p.add_argument('--rise0', type=float, default=88.)
p.add_argument('--mid-share', type=float, default=.5)
p.add_argument('--band', default='.86,1.02')
p.add_argument('--check-bakes', default='')
p.add_argument('--dry-run', action='store_true')
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
rest = s*(np.load(a.rest)['src'].astype(np.float64)-off)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
b0, b1 = (float(x) for x in a.band.split(','))


def toe_delta(sd, ang):
    """The toes turned up by ang degrees about the toe joint's X axis, graded across the band (rest space)."""
    an, to = np.array(J[f'ankle.{sd}']), np.array(J[f'toe.{sd}'])
    L = float(np.linalg.norm(to-an))
    ax = (to-an)/L
    wf = dense[:, NI[f'foot.{sd}']]
    ids = np.flatnonzero(wf > .02)
    along = (rest[ids]-an)@ax/L
    t = np.clip((along-b0)/(b1-b0), 0., 1.)
    g = t*t*(3-2*t)*wf[ids]
    keep = g > 1e-4
    ids, g = ids[keep], g[keep]
    V = rest[ids]-to
    th = -np.radians(ang)*g
    c, s_ = np.cos(th), np.sin(th)
    d = np.zeros_like(V)
    d[:, 1] = c*V[:, 1]-s_*V[:, 2]-V[:, 1]
    d[:, 2] = s_*V[:, 1]+c*V[:, 2]-V[:, 2]
    return ids, d


mid = a.rise0+a.mid_share*(a.full-a.rise0)
new_keys, deltas = [], {}
for sd in 'LR':
    for name, ang, rise, fall in ((f'toe_curl_mid.{sd}', a.angle*a.mid_share, [a.rise0, mid], a.full), (f'toe_curl.{sd}', a.angle, [mid, a.full], None)):
        k = dict(name=name, group=name.split('.')[0], bone=f'shin.{sd}', rise=[float(x) for x in rise], fall=None if fall is None else float(fall),
                 pose=f'toes turned up {ang:g} degrees about the toe joint (faint fix pass 4: kneeling on the balls of the feet)')
        ids, d = toe_delta(sd, ang)
        deltas[name] = (ids, d)
        new_keys.append(k)
        print(f'{name:18s} rise {k["rise"]} fall {k["fall"]}: {len(ids)} vertices, max move {np.linalg.norm(d, axis=1).max()*1000:.1f} mm', flush=True)


def bake_values(path):
    frames = json.loads(Path(path).read_text())
    vals = {k['name']: max(rc.key_value(J, fr['pose'], k, B) for fr in frames) for k in new_keys}
    sw = {b: round(max(rc.swing_deg(J, fr['pose'], b, B) for fr in frames), 2) for b in sorted({k['bone'] for k in new_keys})}
    return dict(frames=len(frames), swing_max_deg=sw, toe_key_value_max=round(max(vals.values()), 6))


rep = dict(params={k: str(v) for k, v in vars(a).items()}, keys=new_keys,
           clips={str(Path(b).parent.parent.name)+'/'+str(Path(b).parent.name): bake_values(b) for b in a.check_bakes.split(',') if b})
print(json.dumps(rep['clips']), flush=True)
if not a.dry_run:
    lock = R/'correctives.lock'
    t0 = time.time()
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f'toe_corrective.py (batch 2 builder) {time.strftime("%Y-%m-%d %H:%M:%S")}\n'.encode())
            os.close(fd)
            break
        except FileExistsError:
            if time.time()-t0 > 1800:
                raise SystemExit(f'{lock} held for 30 minutes: {lock.read_text(errors="replace").strip()}; nothing written')
            print('waiting for', lock, '(', lock.read_text(errors='replace').strip(), ')', flush=True)
            time.sleep(5)
    try:
        cur_json = json.loads((R/'correctives.json').read_text())
        mine = {k['name'] for k in new_keys}
        cur_keys = [k for k in cur_json['keys'] if k['name'] not in mine]
        with np.load(R/'correctives.npz') as cz:
            cur = {k['name']: (np.array(cz[k['name']+'__ids']), np.array(cz[k['name']+'__delta'])) for k in cur_keys}
        for k in new_keys:
            cur[k['name']] = (deltas[k['name']][0], deltas[k['name']][1].astype(np.float32))
        tmp = R/'correctives.tmp.npz'
        np.savez_compressed(tmp, **{f'{k}__ids': v[0] for k, v in cur.items()}, **{f'{k}__delta': v[1] for k, v in cur.items()})
        t1 = time.time()
        while True:
            try:
                os.replace(tmp, R/'correctives.npz')
                break
            except PermissionError:
                if time.time()-t1 > 1800:
                    tmp.unlink(missing_ok=True)
                    raise SystemExit('correctives.npz held open by another process for 30 minutes; nothing written')
                print('correctives.npz is open in another process; retrying', flush=True)
                time.sleep(10)
        out = dict(cur_json)
        out['keys'] = cur_keys+new_keys
        (R/'correctives.tmp.json').write_text(json.dumps(out, indent=1))
        os.replace(R/'correctives.tmp.json', R/'correctives.json')
    finally:
        lock.unlink(missing_ok=True)
    (R/'toe-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(cur_keys+new_keys), 'keys', flush=True)
