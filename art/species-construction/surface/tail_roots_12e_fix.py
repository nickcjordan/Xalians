"""Immutable anatomy guides for the exposed connectors omitted by the tube mask."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d
from scipy.spatial import cKDTree
from tail_profile_12e import coordinates, unit
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from tails_v6_field import samples


def smooth(x):
    x=np.clip(x,0,1);return x*x*(3-2*x)


def root_axes(d, flags, nearest):
    source=Path(__file__).resolve().parents[3]/'untracked/species-construction/akinza/assembled-3300/tails-v6.json'
    specs=json.loads(source.read_text())['spec']['tails']
    old=coordinates(d,flags,nearest);result=[]
    for tail,spec in zip(old,specs):
        authored,arc=samples(spec);author=authored[:,:3]
        # The anatomy guide supplies the part inside the rump and the stalk.
        # The approved skin supplies the existing distal curve and exact tip.
        distal=tail['spline'](tail['grid'][6:])
        join=cKDTree(author).query(distal[0])[1]
        centers=np.vstack((author[:max(join,2)],distal))
        centers=gaussian_filter1d(centers,.65,axis=0,mode='nearest')
        s=np.r_[0,np.cumsum(np.linalg.norm(np.diff(centers,axis=0),axis=1))]
        spl=CubicSpline(s,centers,bc_type='natural')
        dense=np.linspace(s[0],s[-1],4096);axis=spl(dense)
        first=np.where(axis[:,1]>=.115)[0][0];start=dense[first]
        tail.update(spline=spl,grid=np.linspace(start,s[-1],65),axis_s=dense,axis=axis,
                    root_position=axis[first],anatomy_source=str(source))
        result.append(tail)
    # A guide can still be inside the fixed rump. Move its measurement origin
    # only to the first exposed, anatomically owned skin sample. This is fixed
    # from baseline skin, never inferred from the groomed plume.
    ids,distance,position=assign(d['co'],result)
    for tail in result:
        m=(ids==tail['number'])&(distance<.082)&(d['co'][:,1]>.10)&(d['attr_ptail']>.02)
        first=max(tail['grid'][0],float(position[m].min()))
        tail['grid']=np.linspace(first,tail['grid'][-1],65)
        tail['root_position']=tail['spline'](first)
    return result


def assign(pos,tails):
    distances=[];parameters=[]
    for tail in tails:
        distance,index=cKDTree(tail['axis']).query(pos,workers=-1)
        distances.append(distance);parameters.append(tail['axis_s'][index])
    distances=np.array(distances);parameters=np.array(parameters)
    ids=np.argmin(distances,axis=0)
    cols=np.arange(len(pos))
    return ids+1,distances[ids,cols],parameters[ids,cols]


CONNECTOR_DEFAULTS=dict(beforeStart=.085,longitudinalFade=.035,yStart=.045,yFade=.025)
LEGACY_CONNECTOR=dict(beforeStart=.045,longitudinalFade=.045,yStart=.075,yFade=.035)


def connector_selection(d,flags,nearest,tails,config=None):
    config=CONNECTOR_DEFAULTS if config is None else config
    co=d['co'];ids,distance,s=assign(co,tails)
    starts=np.array([x['grid'][0] for x in tails])[ids-1]
    # A short rear tube around the authored connector, plus a smooth rump fade.
    w=smooth((s-(starts-config['beforeStart']))/config['longitudinalFade'])*(1-smooth((distance-.065)/.025))
    w*=1-smooth((s-starts-.125)/.025)
    w*=smooth((co[:,1]-config['yStart'])/config['yFade'])
    # Spatial diagnostic labels do not define the anatomical connector.
    w[(co[:,2]>.12)|(co[:,2]<-.36)|(abs(co[:,0])>.29)]=0
    w[flags['actualTailSkin']]=0
    return dict(skin_weight=w,skin_id=ids,skin_s=s,skin_distance=distance,
                weight=w[nearest],tail_id=ids[nearest],s=s[nearest],distance=distance[nearest])
