import json
from pathlib import Path
p=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass1')
d=json.loads((p/'source_inspection.json').read_text())
bones=next(o['bones'] for o in d['game']['objects'] if o['type']=='ARMATURE')
rows=[]
for b in bones:
 n=b['name']
 if n=='root':note='Floor origin retained. Global motion control, not a skinning pivot.'
 elif n.startswith('spine_'):note='Axial chain remains inside the torso. Connected segment endpoints follow the back and chest centerline.'
 elif n.startswith('neck_'):note='Neck centerline retained between chest and skull. Extreme-pose ripples are addressed with weights.'
 elif n=='head_01':note='Skull base pivot retained behind the jaw and muzzle. Eyes and horns remain rigid head attachments.'
 elif n=='jaw_01':note='Existing jaw hinge retained under and behind the muzzle. No new jaw split or geometry edit.'
 elif n.startswith('ear_'):note='Ear root and blade chain follow the ear. Base bone drives the rigid blade; second name retained for compatibility.'
 elif n.startswith('horn_'):note='Existing horn attachment reference retained at the skull. Horn meshes are rigidly weighted to head_01, matching the approved source parenting.'
 elif n.startswith('socket_'):note='Nondeforming attachment reference retained. Not an anatomical bending joint.'
 elif n.startswith('tail_'):note='Segment endpoints track the tail centerline from rump through the tip. No pivot relocation needed.'
 elif n.startswith('leg_f'):
  note={'01':'Shoulder pivot remains inside the proximal foreleg at the chest attachment.','02':'Elbow pivot aligns with the visible upper/lower limb bend.','03':'Wrist pivot aligns with the paw base. Terminal segment carries the toes and rigid claws.'}[n[-2:]]
 else:note={'01':'Hip pivot remains inside the upper thigh, below the rump.','02':'Stifle pivot aligns with the forward knee bend.','03':'Hock pivot aligns with the rear ankle bend. Terminal segment carries the metatarsal, paw, toes and rigid claws.'}[n[-2:]]
 rows.append(dict(name=n,head_before=b['head'],head_after=b['head'],tail_before=b['tail'],tail_after=b['tail'],moved=False,sprite_only=False,review=note))
(p/'joint_review.json').write_text(json.dumps(dict(evidence=['iter0_pivots_side.png','iter0_pivots_front.png','iter0_pivots_three_quarter.png','iter0_crouch_closeups.png','iter0_leap_closeups.png'],joints=rows,pivot_moves=0,additional_joints=0,toe_articulation='The inherited three-segment legs have no separate toe joints. Toes remain on the terminal segment within the 40-joint budget.'),indent=2))
