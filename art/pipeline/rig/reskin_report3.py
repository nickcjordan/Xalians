"""B-sntv pass 3: write pass3/report.json (pass 2 writer extended with the elbow clearance and re-pose).

python reskin_report2.py PASS2_DIR ITER_NAME
"""
import json, sys, hashlib
from pathlib import Path

P = Path(sys.argv[1]); W = P / 'work'; IT = W / sys.argv[2]


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


J = lambda p: json.loads(Path(p).read_text()) if Path(p).exists() else None
build = J(IT / 'build.json'); contact = J(IT / 'contact.json'); tab = J(P / 'flags_table.json'); pops = J(W / 'pops.json')
groom = J(W / 'groomcheck.json'); patch = J(W / 'patch4.json')
el3 = J(W / 'elbow_pass3.json'); el2 = J(W / 'elbow_pass2.json')
outs = {}
for pat in ('rig.blend', 'params.json', 'critic_status.md', 'flags_table.md', 'flags_table.json', 'audit/flags.json', 'audit/index.md',
            'audit/contact/*.png', 'compare/*.png', 'video/*.mp4', 'work/clips.blend', 'work/bake.json', 'work/measure.json',
            'work/check_after.json', 'work/pops.json', 'work/groomcheck.json', 'work/patch4.npz', 'work/patch4.json', 'work/w8.npz',
            'work/skel.json', 'work/cfg_p5.json', 'work/cd6.json', 'work/oldposes.json', 'work/elbow_pass3.json', 'work/elbow_pass2.json'):
    for f in sorted(P.glob(pat)):
        outs[str(f.relative_to(P)).replace('\\', '/')] = sha(f)
cors = contact['correctives'] if contact else []
rep = {
    'build_id': 'B-sntv', 'species': 'luceras', 'pass_': 3,
    'inputs': {'rig': 'luceras-tailflight/pass5/rig.blend (read only; the pass 1 pipeline is re-run from it, then the pass 2 stages)',
               'clip_params': 'luceras-reskin/pass1/params.json (unchanged in pass 2)', 'audit_before': 'luceras-defaudit/pass1 (B-j6jh)',
               'pass1': 'luceras-reskin/pass1'},
    'gate': 'pass 2 gate (coordinator): zero intersecting pairs in every pose (no deliberate contact claimed); collapse or flip below the B-j6jh count in every pose; independent critic finds nothing obvious (coordinator runs it)',
    'gate_table': tab,
    'gate_intersections_zero_all': all(v['intersect_zero'] for v in tab.values()) if tab else None,
    'gate_cf_below_all': all(v['cf_below_bj6jh'] for v in tab.values()) if tab else None,
    'method': {
        'review_poses': 'review.poses order: rest, crouch, leap, landing, head_left_up, tail_side_up, foreleg_step, breath_in (frames 1 to 71, as pass 1) plus crouch_deep (frame 81) and landing_old (frame 91). crouch_deep copies every pass 5 crouch channel exactly. landing_old copies every pass 5 landing channel except the two hind legs: they are reset and re-solved by the clip foot solver, feet 7 cm forward and 5 cm up from rest, soles level, knees tucked toward the body. The audit takes the order through AUD_SHEET.',
        'weights': 'Pass 1 heat weights (c 0.35, brisket to the thorax, rigid head) plus 12 steps of surface smoothing of the solved weights (removes single-vertex spikes, the cause of the pass 1 elbow pits); hock band widened to +-35 mm.',
        'sculpt': 'Vertex moves only; topology identical (groomcheck). Pass 1 mirror patch (S1, S2), then Taubin smoothing blended into feathered regions: hind cannons (seam rings, ripple bands, hock drip; critic 26, 27, 59, S3, S9), forearms (ripple bands, lumpy carpal pads; 36, S3, S4 pads), tail (specks, S11), belly bump (S5), throat bump (S6), brisket (S7); then a tangential relax of sliver triangles (109 -> 6), which removed the single rest flag at the right hip and the small counts in breath_in and head_left_up. Not changed: S8 haunch width (approved silhouette), S10 horn collar (horn seat), toes and pads under the claw objects, the dewclaw objects.',
        'correctives': 'Fitted on the final evaluated surface, after the armature, the DQ blend and the corrective smooth (the pass 1 shape keys failed because the smooth removed them). Two kinds of modifiers, appended after the corrective smooth, each masked by its own vertex group and driven by a joint-angle kernel (the quaternion channels of the joints that carry the region; 1 at the training pose, 0 at rest): (1) Smooth modifiers that unfold tight creases (factor and iterations picked per region by measuring that region at the training pose); (2) Displace modifiers along the deformed normal that push apart surfaces that still cross. Trained on every review pose and signature frames 8, 11, 22, 29, 38; the hard poses get a second round. The head is never smoothed.',
        'clips': 'Unchanged from pass 1 (coordinator ruling): foreleg sweep, 10 deg swing-out, elbow tuck 0.3, head curl reduced at the hit; the apex foreleg tuck is not loosened.',
    },
    'new_bones': (build or {}).get('new_bones'),
    'modifiers_on_sculpt': None,
    'correctives': cors,
    'corrective_count': {'smooth': sum(1 for c in cors if c.get('kind') == 'smooth'), 'displace': sum(1 for c in cors if c.get('kind') != 'smooth')},
    'contact_fit_before_after': {'before': contact.get('before') if contact else None, 'after': contact.get('after') if contact else None},
    'sculpt_patch': patch,
    'elbow_clearance_mm': {'definition': 'signed distance of the elbow joint (leg_f*_02 head) from the posed trunk skin (vertices whose dominant bone is a spine, neck_01 or scapula bone); positive = outside the ribcage surface', 'pass3': el3, 'pass2_same_measure': el2},
    'groom_check': groom,
    'pops': pops,
    'outputs_sha256': outs,
}
(P / 'report.json').write_text(json.dumps(rep, indent=1))
print('REPORT2', P / 'report.json', len(outs))
