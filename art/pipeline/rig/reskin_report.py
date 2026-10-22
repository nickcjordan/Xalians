"""B-sntv: write pass1/report.json (build, method, new bones, outputs with sha256, gate, what remains, blockedBy).

python reskin_report.py PASS1_DIR
"""
import json, sys, hashlib
from pathlib import Path

P = Path(sys.argv[1]); W = P / 'work'


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


build = json.loads((W / 'it8' / 'build.json').read_text())
tab = json.loads((P / 'flags_table.json').read_text())
pops = json.loads((W / 'pops.json').read_text()) if (W / 'pops.json').exists() else None
outs = {}
for pat in ('rig.blend', 'params.json', 'critic_status.md', 'flags_table.md', 'flags_table.json', 'audit/flags.json', 'audit/index.md',
            'audit/contact/*.png', 'compare/*.png', 'video/*.mp4', 'work/clips.blend', 'work/bake.json', 'work/measure.json',
            'work/check_after.json', 'work/pops.json', 'work/patch.npz', 'work/w6.npz', 'work/skel.json', 'work/cfg8.json'):
    for f in sorted(P.glob(pat)):
        outs[str(f.relative_to(P)).replace('\\', '/')] = sha(f)
gate = {p: dict(collapse_or_flip_before=t['cf_tris'][0], collapse_or_flip_after=t['cf_tris'][1], target_lt=round(t['target'], 1),
                collapse_flip_pass=t['cf_pass'], intersect_before=t['intersect'][0], intersect_after=t['intersect'][1],
                intersect_pass=t['intersect_pass'], overmove_before=t['overmove'][0], overmove_after=t['overmove'][1]) for p, t in tab.items()}
rep = {
    'build_id': 'B-sntv', 'species': 'luceras', 'pass_': 1,
    'inputs': {'rig': 'luceras-tailflight/pass5/rig.blend (read only)', 'clips_params': 'luceras-tailflight/pass5/params.json (copied, then edited in pass1/params.json)',
               'audit_before': 'luceras-defaudit/pass1 (B-j6jh)'},
    'method': {
        'skeleton': 'Added scapula_l / scapula_r (deform, sprite-only, parent spine_05, dorsal border (+-0.040, -0.030, 0.448) to the shoulder joint). Each has a Damped Track (influence 0.5) at a non-deform helper scapula_*_aim parented to the upper arm, 6 cm past the joint along the blade line. The blade swings with the arm through the existing clips with no new keys. pose_rig bakes identity channels for the scapula like any deform bone; the constraint drives it. Every existing bone name kept. Pivots reviewed against limb cross-sections: elbow, wrist, stifle and hock heads sit inside the limb at plausible joint centres (stifle 2.7 cm behind the front of the thigh, hock 2.5 cm in front of the calcaneus), so none was moved, which keeps the approved clips exact.',
        'weights': 'Bone heat (screened Poisson, cotangent Laplacian, lumped areas, solved with scipy) on the sculpt body from proxy segments. Spine bones are sagittal slabs down toward the measured underline. spine_05\'s lower copies run forward to the point of the chest (sternum), so the brisket belongs to the thorax. Each vertex attaches to its nearest proxy visible along a straight line inside the body (ray-tested). Heat constant c = 0.35 (wider, smoother blends than c = 1). Skull, jaw and ear-blade vertices (old head+jaw+ear weight 1) are held as boundary values, so the head stays rigid. Wrist and hock get a joint band (+-15 / 25 mm about the joint plane), so paws and cannons are rigid on leg_*_03; the old double ring on the hind cannons is gone as a weight boundary. Pruned below 0.005 and normalized. Claws, eyes, horns and whiskers keep their single rigid groups (untouched).',
        'volume': 'Armature (linear) + a second Armature in dual-quaternion mode blended in by a dq_mask vertex group (the leg, neck and tail bones\' weights; multi-modifier), then Corrective Smooth (rest = original coordinates, length-weighted, 150 iterations, factor 0.7) masked off the rigid head. Offline only.',
        'correctives': 'The six PSD keys were removed. A joint-angle-driven corrective fitter was built and tried (art/pipeline/rig/reskin_corrective.py: relaxed posed target, inverse-skinned, quaternion-kernel drivers on the joint channels). It made the flags worse (crouch 1966 -> 1858, leap 1520 -> 1725, f22 5757 -> 7712, f29 6857 -> 7408 collapse or flip, trial it6), because the corrective smooth after the armature smooths the key deltas back out. So the shipped rig has NO corrective shape keys.',
        'review_poses': 'review.poses rewritten with the clip Poser (constant keys at frames 1 + 10 * index, same names). crouch: stalking crouch, pelvis 12 cm down, hind heels 12 deg up, elbows half tucked. leap: airborne stretch, forelegs reaching forward, hind legs trailing parallel (thighs adducted 7 deg). landing: forelegs planted, body nose-down 9 deg, hind feet gathered under the belly 7 cm forward and 5 cm up, soles down, stifles tucked in. head_left_up: neck and head yaw 8 + 14 + 22 deg, up 24 deg. tail_side_up: per-joint lift 4 to 8 deg, yaw 6 to 12 deg. foreleg_step: left fore paw 7 cm forward, 8 cm up. breath_in: as before.',
        'clips': 'luceras_clips.py gains FORE_DIVE and three parameters (defaults keep the old motion). This pass sets them in pass1/params.json: dive_fore_sweep 1.0 with dive_fore_pose (75, -35, 25), blended from 40 ms before the apex to the dive start, so the forelegs sweep back along the chest for the dive instead of folding forward under the jaw; fore_tuck_abduct_deg 10, so the tucked forelegs ride beside the ribs, in with the tuck and out with the reach (needs a matching pose_rig change: spec key "abduct"); dive_neck_deg (-40, -28) and dive_head_deg -32 (was -40, -36 and -36), so the head curls 10 deg less at the hit. fore_crouch_elbow_tuck lowered 0.6 -> 0.3: the ridge it was added for came from the old tube weights. Timing, events, travel, hit frame (29), contact height (0.400 m) and the arc are unchanged; the hit-height solve re-centred the body (reach 0.474 -> 0.502 m). Horn lead margin stays positive (107 mm).',
        'sculpt': 'S1 (right hip crumple) and S2 (right hind cannon facet): right-side vertices that are rough where the left is clean were pulled onto the mirrored left surface. 4,287 vertices, max 3.8 mm, mean 0.37 mm. Vertex moves only, no topology change.',
    },
    'new_bones': build['new_bones'],
    'modifiers_on_sculpt': build['modifiers'],
    'removed_shape_keys': build['removed_shape_keys'][1:],
    'correctives_new': [],
    'topology_changed': False,
    'groom_note': 'Topology unchanged, so the luceras-groom pass 12 triangle bindings still hold. The rest surface moved up to 3.8 mm on the right hip and hind leg (patch), and the deformation is new, so the groom needs a re-check, not a regrow.',
    'gate': gate,
    'gate_passed': all(v['collapse_flip_pass'] and v['intersect_pass'] for v in gate.values()),
    'pops': pops,
    'outputs_sha256': outs,
    'what_remains': [
        'The gate does not pass. Collapse or flip is 16 to 87 percent of the pass 1 count on the moving poses, not under 2 percent. Intersections are down on most poses but not zero. The worst are the signature frames f22 and f29 (5,090 and 6,188 collapse or flip triangles). They come from the approved foreleg tuck at the apex (FORE_TUCK elbow -112 deg: about 1,500 a side) and from the forearms pressing on the ribs (552 to 966 intersecting pairs at f11, f22 and f29).',
        'Also at f29: the curled neck compresses the throat against the chest (about 1,700 a side), and at f22 and f29 the hind extension presses the gaskin into the rump (about 50 pairs a side).',
        'landing, head_left_up, tail_side_up and breath_in had almost no flags in pass 1. They now have small counts (229, 39, 5, 2). landing is a new, more demanding pose; head_left_up overmove rose (3,745 -> 7,416) because the neck blends are wider.',
        'Correctives: the automatic relax-and-inverse-skin fitter did not work under the corrective smooth (see method). The next step is correctives fitted through the full modifier stack (optimize the key so the evaluated output reaches the target), or a post-smooth displacement stage.',
        'Hock and stifle pivots are unchanged (items 25, 46). Boxy hocks remain.',
        'Sculpt seams and ripples (S3, S4, the cannon ring that shows at rest) and S5 to S11 are untouched.',
        'New: pin-sized pits on the elbow skin and lumpy bunching at the neck base between the shoulders in the crouch.',
        'Brief steps not done: none skipped, but step 4 (correctives) produced no keys, and the step 6 clip edits go beyond f29 (sweep from just before the apex; foreleg abduction during the tuck; elbow tuck 0.3). Each is listed in method.clips for Nick to accept or roll back through params.json.',
    ],
    'blockedBy': ['Gate not met within the about 3 hour cap (excluding about 25 minutes of slot wait behind the Akinza rig job). No external blocker.'],
}
(P / 'report.json').write_text(json.dumps(rep, indent=1))
print('REPORT', P / 'report.json', 'gate_passed', rep['gate_passed'], len(outs), 'outputs')
