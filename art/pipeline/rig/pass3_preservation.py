"""Audit selected asset against pass2 without modifying either source."""
import bpy,sys,numpy as np,hashlib,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r,BASE

def snap(path):
 rig=p.openfile(path);names=[b.name for b in rig.data.bones];o=bpy.data.objects['luceras_blockout'];a=r.weights(o,names);keys={}
 for key in o.data.shape_keys.key_blocks:
  v=np.empty(len(key.data)*3,np.float32);key.data.foreach_get('co',v);keys[key.name]=hashlib.sha256(v.tobytes()).hexdigest()
 bone=[(b.name,b.parent.name if b.parent else None,list(b.head_local),list(b.tail_local),b.inherit_scale,b.use_deform) for b in rig.data.bones]
 ctrl=bpy.data.objects['Luceras_Controls'];controls=[(b.name,b.parent.name if b.parent else None,list(b.head_local),list(b.tail_local)) for b in ctrl.data.bones]
 return a,keys,bone,controls

def main():
 old=snap(BASE/'rig.blend');new=snap(p.OUT/'rig.blend');d=abs(old[0]-new[0]).max(axis=1)
 p.write('pass2_preservation.json',{'sculpt_weight_changed_vertices':int((d>0).sum()),'sculpt_max_weight_change':float(d.max()),'sculpt_corrective_coordinates_exact':old[1]==new[1],'shape_key_hashes':new[1],'skeleton_exact':old[2]==new[2],'control_bone_layout_exact':old[3]==new[3]})
if __name__=='__main__':main()
