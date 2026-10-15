"""Quantify actual strand shape and assemble native-resolution review pairs."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.spatial import cKDTree
ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'

def unit(v): return v/np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-9)
def metrics(d,m):
 p=d['points'];s=d['starts'];end=np.r_[s[1:]-1,len(p)-1];r=p[s];v=p[end]-r;n=d['curve_nrm']; tang=v-n*np.sum(v*n,axis=1)[:,None]
 length=np.add.reduceat(np.linalg.norm(np.diff(p,axis=0,append=p[-1:]),axis=1)*np.isin(np.arange(len(p)),end,invert=True),s)
 tip=unit(p[end]-p[end-1]);first=unit(p[s+1]-r)
 return dict(count=int(m.sum()),reachMedian=float(np.median(np.linalg.norm(v[m],axis=1))),reachP95=float(np.percentile(np.linalg.norm(v[m],axis=1),95)),arcLengthMedian=float(np.median(length[m])),liftDegreesMedian=float(np.median(np.degrees(np.arcsin(np.clip(np.sum(unit(v[m])*n[m],axis=1),-1,1))))),liftDegreesP95=float(np.percentile(np.degrees(np.arcsin(np.clip(np.sum(unit(v[m])*n[m],axis=1),-1,1))),95)),reachOver03Percent=float(100*np.mean(np.linalg.norm(v[m],axis=1)>.03)),lateralMedian=float(np.median(abs(np.sum(v[m]*np.cross(n[m],unit(d['curve_combp'][m])),axis=1)))),bendDegreesMedian=float(np.median(np.degrees(np.arccos(np.clip(np.sum(first[m]*tip[m],axis=1),-1,1))))))

def main():
 b=np.load(WORK/'12d-before/evidence.npz');r=b['roots'];n=b['curve_nrm']
 regions={
 'chest':(abs(r[:,0])<.14)&(r[:,1]<-.015)&(r[:,2]>.05)&(r[:,2]<.36),
 'rib-flank':(abs(r[:,0])>.12)&(abs(r[:,0])<.21)&(r[:,2]>-.02)&(r[:,2]<.30)&(r[:,1]<.015),
 'inner-arm':(abs(r[:,0])>.21)&(abs(r[:,0])<.31)&(r[:,2]>.02)&(r[:,2]<.29)&(r[:,1]<.015)&(n[:,0]*np.sign(r[:,0])<-.3),
 'outer-upper-arm-control':(abs(r[:,0])>.23)&(abs(r[:,0])<.34)&(r[:,2]>.12)&(r[:,2]<.33)&(r[:,1]<.015)&(n[:,0]*np.sign(r[:,0])>.3)}
 result={'units':'world units; fixed figure height 1.8605','before':{k:metrics(b,m) for k,m in regions.items()}}
 if (WORK/'s12d/r/evidence.npz').exists():
  a=np.load(WORK/'s12d/r/evidence.npz');result['after']={k:metrics(a,m) for k,m in regions.items()}
  patch=np.load(WORK/'s12d/patch-evidence.npz');result['changedCurves']=int(patch['changed'].sum());result['unselectedPointPositionsEqual']=bool(np.array_equal(patch['before_points'][np.repeat(~patch['changed'],np.diff(np.r_[patch['starts'],len(patch['before_points'])]))],patch['after_points'][np.repeat(~patch['changed'],np.diff(np.r_[patch['starts'],len(patch['before_points'])]))]))
 if (WORK/'s12d/patch-evidence.npz').exists():
  patch=np.load(WORK/'s12d/patch-evidence.npz');flags=np.load(WORK/'12d-before/sweep-flags.npz');ni=patch['nearest'];delta=np.linalg.norm(patch['after_points']-patch['before_points'],axis=1);movement=np.maximum.reduceat(delta,patch['starts'])
  movement_masks={name:flags['region']==i for i,name in enumerate(['chest-ribs','neck','head','ears','arms','hands','hips','legs','feet','tails'])}
  movement_masks['sole']=(b['roots'][:,2]<-.91)&(b['curve_nrm'][:,2]<-.25)&(b['attr_solef'][ni]>.5)
  movement_masks['true-tail-noncollision']=flags['actualTail']&~flags['collision']
  held={k:dict(strands=int(m.sum()),movedOver1e6=int(((movement>1e-6)&m).sum()),maxMovement=float(movement[m].max()) if m.any() else 0,p95Movement=float(np.percentile(movement[m],95)) if m.any() else 0) for k,m in movement_masks.items()}
  assert held['true-tail-noncollision']['maxMovement']==0
  (WORK/'12d-held-movement.json').write_text(json.dumps(held,indent=2))
 (WORK/'12d-metrics.json').write_text(json.dumps(result,indent=2))
 font=ImageFont.truetype('arial.ttf',22)
 for view in ('chest-front','chest-threequarter','chest-underarm','body-backq','body-front','held-head-side','held-ears-front','held-sole'):
  before=WORK/f'12d-before/{view}.png';after=WORK/f's12d/r/{view}.png'
  if not before.exists():continue
  if after.exists():
   imgs=[Image.open(p).convert('RGB') for p in (before,after)]
   w,h=imgs[0].size;pair=Image.new('RGB',(2*w,h+36),'white');draw=ImageDraw.Draw(pair)
   for i,im in enumerate(imgs):pair.paste(im,(w*i,36));draw.text((w*i+15,5),['Before: 12b2','Now: 12d'][i],font=font,fill='black')
   pair.save(WORK/f'12d-{view}.png')
   if view=='chest-underarm':
    # Native-resolution worst flank/axilla silhouette crop, same coordinates.
    crops=[im.crop((350,350,820,1000)) for im in imgs];out=Image.new('RGB',(940,686),'white');draw=ImageDraw.Draw(out)
    for i,im in enumerate(crops):out.paste(im,(470*i,36));draw.text((470*i+10,5),['Before: 12b2','Now: 12d'][i],font=font,fill='black')
    out.save(WORK/'12d-worst-spot.png')
  elif view=='chest-underarm':Image.open(before).crop((350,350,820,1000)).save(WORK/'12d-diagnosis-crop.png')
 overlay_paths=[WORK/f'{folder}/overlay/flags-{view}.png' for view in ('front','back') for folder in ('12d-before','s12d/r')]
 if all(p.exists() for p in overlay_paths):
  out=Image.new('RGB',(1536,2150),'white');draw=ImageDraw.Draw(out)
  for i,p in enumerate(overlay_paths):
   x=(i%2)*768;y=(i//2)*1060;out.paste(Image.open(p).convert('RGB'),(x,y+36));draw.text((x+12,y+5),('Before: 12b2' if i%2==0 else 'Now: 12d')+(' front' if i<2 else ' back'),font=font,fill='black')
  draw.text((12,2120),'Red: diagnostic flags; intentional plume overhangs are reported separately.',font=font,fill='black');out.save(WORK/'12d-artifact-overlay.png')
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
