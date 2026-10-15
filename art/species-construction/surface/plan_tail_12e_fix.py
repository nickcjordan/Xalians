"""Fill actual tail stalks and smooth the fur envelope without stripe clumps."""
import argparse
import json
from pathlib import Path
import numpy as np
from tail_profile_12e import widths,unit
from tail_roots_12e_fix import root_axes,connector_selection,assign,smooth,CONNECTOR_DEFAULTS,LEGACY_CONNECTOR


def main():
    p=argparse.ArgumentParser();p.add_argument('--baseline',type=Path,required=True);p.add_argument('--parent',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--height',type=float,default=1.0)
    a=p.parse_args();d=np.load(a.baseline/'r/evidence.npz');f=np.load(a.baseline/'r/sweep-flags.npz');c=np.load(a.baseline/'r/collision-evidence.npz');parent=np.load(a.parent/'r/evidence.npz');prior=np.load(a.parent/'patch-evidence.npz')
    ni=c['nearest'];tails=root_axes(d,f,ni);conn=connector_selection(d,f,ni,tails)
    roots=d['roots'];normal=unit(d['curve_nrm']);original=d['points'];points=parent['points'].copy();starts=d['starts'];counts=np.diff(np.r_[starts,len(points)])
    root_id,_,root_s=assign(roots,tails)
    tail_id=np.zeros(len(roots),np.int8)
    for t in tails:tail_id[t['selected']]=t['number']
    selected=(tail_id>0)|(conn['weight']>0)|prior['changed']
    connector_weight=np.maximum(conn['weight'],prior['hip_blend'])
    core=connector_selection(d,f,ni,tails,LEGACY_CONNECTOR)
    measurement_core=(core['weight']>0)|(prior['hip_blend']>0)
    rng=np.random.default_rng(12120501)
    envelopes=[]
    for tail in tails:
        mask=(tail_id==tail['number'])|((connector_weight>0)&(root_id==tail['number']))
        ids=np.where(mask)[0];s=root_s[ids]
        tangent=unit(tail['spline'](s,1));nn=normal[ids]
        offset=roots[ids]-tail['spline'](s)
        radial=unit(offset-tangent*np.sum(offset*tangent,axis=1)[:,None])
        radial=unit(radial+nn*np.maximum(0,.3-np.sum(radial*nn,axis=1))[:,None])
        frame1=unit(np.cross(tangent,np.array([0,1,0])));frame2=np.cross(tangent,frame1)
        angle=np.arctan2(np.sum(radial*frame2,axis=1),np.sum(radial*frame1,axis=1))
        # Keep one common safe proximal field through the last connector root.
        # Expansion and downstream lay then rise continuously on the tube.
        connector=(tail_id==0)&(connector_weight>0)&(root_id==tail['number'])
        join=float(root_s[connector].max())
        envelopes.append(dict(tail=tail['number'],expansionStart=join,world=tail['spline'](join).tolist(),connectorParameterRange=[float(root_s[connector].min()),join]))
        progression=np.clip((s-join)/(tail['grid'][-1]-join),0,1)
        sine=np.maximum(0,np.sin(np.pi*progression**.93))
        h=(.033*(1-progression)+.014*progression+.089*sine**1.5)*a.height
        h*=1+.025*np.cos(2*angle+2*s)+.020*np.sin(3*angle-3*s)
        h*=rng.uniform(.92,1.08,len(ids))
        sweep=(.019+.020*smooth(progression/.2)+.046*sine**1.15+.018*smooth((progression-.74)/.26))*rng.uniform(.84,1.16,len(ids))
        phase=rng.uniform(0,2*np.pi,len(ids));bend=rng.uniform(1.5,1.9,len(ids));arc=rng.uniform(.95,1.25,len(ids))
        for j,i in enumerate(ids):
            sl=slice(starts[i],starts[i]+counts[i]);v=np.linspace(0,1,counts[i]);vv=v[:,None]
            is_connector=tail_id[i]==0
            rr=radial[j]
            direction=tangent[j]
            height=h[j]
            forward=sweep[j]
            lateral=np.cross(direction,rr);lateral=unit(lateral)
            delta=original[sl]-roots[i];basis=np.stack((v,v*v),axis=1)
            residual=delta-basis@np.linalg.lstsq(basis,delta,rcond=None)[0]
            residual*=min(.22,.0018/max(np.linalg.norm(residual,axis=1).max(),1e-9))
            # Root hairs share one nearly straight tilted progress, spending
            # their fixed arc-length budget on useful fill and downstream lay.
            # Curvature grows continuously into the main plume.
            curvature=smooth((s[j]-join)/.10)
            radial_progress=vv**1.1*(1-curvature)+np.sin(vv*np.pi/2)**arc[j]*curvature
            flow_progress=vv**1.1*(1-curvature)+vv**bend[j]*curvature
            shaped=(rr*height*radial_progress+direction*forward*flow_progress
                    +lateral*.0016*(.5+sine[j])*(np.sin(2*np.pi*vv+phase[j])-np.sin(phase[j]))*vv
                    +residual)
            # The cap is a continuous anatomical function for every strand,
            # not a switch at the diagnostic tube mask. All connector roots
            # precede join, keeping the unchanged body length limit intact.
            length=np.linalg.norm(np.diff(shaped,axis=0),axis=1).sum()
            limit=.0385+.25*smooth((s[j]-join)/.08)
            shaped*=min(1,limit/max(length,1e-9))
            if is_connector:
                w=connector_weight[i]
                points[sl]=points[sl]*(1-w)+(roots[i]+shaped)*w
            else:points[sl]=roots[i]+shaped
    points[starts]=roots
    a.out.mkdir(parents=True,exist_ok=True)
    np.save(a.out/'measurement-core.npy',measurement_core)
    np.savez_compressed(a.out/'planned-patch.npz',points=points,changed=selected,tail_id=tail_id,
                        hip_blend=connector_weight,starts=starts,connector_id=root_id,connector_s=root_s,
                        connector_distance=conn['distance'],connector_skin_weight=conn['skin_weight'])
    info=dict(seed=12120501,baseline=str(a.baseline),parent=str(a.parent),selected=int(selected.sum()),
              connectorCurves=int((connector_weight>0).sum()),rootPositions=[t['root_position'].tolist() for t in tails],
              scope='true tubes plus bounded anatomical root connectors and the prior local root blend',heightScale=a.height,envelopes=envelopes,connectorSelection=CONNECTOR_DEFAULTS,measurementSelector=LEGACY_CONNECTOR)
    (a.out/'plan-info.json').write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
    # The same immutable extended axes and ownership are used for both scenes.
    for t in tails:
        own=core['skin_id']==t['number'];t['skin']=t['skin']|((core['skin_weight']>0)&own)
        t['selected']=t['selected']|(measurement_core&(root_id==t['number']))
    result=dict(before=widths(d,tails,ni),parent=widths(parent,tails,ni),after=widths(dict(d,points=points),tails,ni))
    (a.out/'planned-widths.json').write_text(json.dumps(result,indent=2))
    print([(x['tail'],{k:dict(rootRatio=v['width'][0]/v['midWidth'],first3Ratio=float(np.median(v['width'][:3]))/v['midWidth'],mid=v['midWidth']) for k,v in x['views'].items()}) for x in result['after']])


if __name__=='__main__':main()
