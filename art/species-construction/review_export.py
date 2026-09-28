"""Verify calibrated geometry arrays against their own rendered construction."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

VIEWS=('front','front-left','left','back','right','front-right')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_arrays(depth,normals,ids,features,valid_ids):
    if depth.ndim!=2 or normals.shape!=depth.shape+(3,) or ids.shape!=depth.shape or features.shape!=depth.shape:
        raise ValueError('Auxiliary array dimensions disagree')
    covered=ids>0
    if not np.any(covered) or not set(np.unique(ids)).issubset({0,*valid_ids}):
        raise ValueError('Empty coverage or unknown object identity')
    if not np.all(np.isfinite(depth[covered])) or not np.all(depth[covered]>0):
        raise ValueError('Invalid foreground depth')
    if not np.all(np.isnan(depth[~covered])) or not np.all(np.isnan(normals[~covered])):
        raise ValueError('Background must have NaN depth and normals')
    if not np.all(np.isfinite(normals[covered])) or np.max(np.abs(np.linalg.norm(normals[covered],axis=1)-1))>1e-4:
        raise ValueError('Normals must be finite unit vectors')
    if not set(np.unique(features)).issubset({0,1}) or np.any(features[~covered]):
        raise ValueError('Feature mask is invalid or outside geometry')
    return covered


def review(directory,renders):
    report=json.loads((directory/'handoff.json').read_text())
    geometry=json.loads((renders/'geometry.json').read_text())
    for name,digest in report['outputs'].items():
        if sha(directory/name)!=digest: raise ValueError('Changed handoff output: '+name)
    for name,digest in geometry['outputs'].items():
        if sha(renders/name)!=digest: raise ValueError('Changed construction output: '+name)
    if report['sceneSha256']!=sha(renders/'blockout.blend'):
        raise ValueError('Auxiliary arrays and images use different geometry')
    details=[]
    previews={}
    for name in VIEWS:
        depth,normals,ids,features=[np.load(directory/f'{name}.{kind}.npy',allow_pickle=False)
                                  for kind in ('depth','normals','object-ids','features')]
        covered=check_arrays(depth,normals,ids,features,set(map(int,report['objects'])))
        with Image.open(renders/f'{name}.png') as im:
            occupancy=np.asarray(im.getchannel('A'))>=128
        if list(occupancy.shape[::-1])!=report['resolution']:
            raise ValueError('Canvas differs from exported geometry')
        overlap=np.count_nonzero(covered&occupancy)/np.count_nonzero(covered|occupancy)
        if overlap<.995: raise ValueError('Geometry rays disagree with alpha: '+name)
        normal_png=np.zeros(covered.shape+(4,),dtype=np.uint8)
        normal_png[covered,:3]=np.clip((normals[covered]+1)*127.5,0,255).astype(np.uint8)
        normal_png[covered,3]=255
        Image.fromarray(normal_png).save(directory/f'{name}.normal-preview.png')
        mask=np.where(occupancy,0,255).astype(np.uint8)
        if name=='front': mask[(features==1)&occupancy]=255
        Image.fromarray(mask).save(directory/f'{name}.mask.png')
        for suffix in ('normal-preview.png','mask.png'):
            previews[f'{name}.{suffix}']=sha(directory/f'{name}.{suffix}')
        details.append({'name':name,'rayAlphaIoU':overlap,'visibleObjects':sorted(int(v) for v in np.unique(ids) if v)})
    landmark_spreads={key:max(c['landmarkRows'][key] for c in report['cameras'])-
                     min(c['landmarkRows'][key] for c in report['cameras']) for key in report['landmarks']}
    # Blender camera transforms use float32. Sub-millipixel noise is immaterial.
    if any(value>1e-3 for value in landmark_spreads.values()):
        raise ValueError('Principal cameras disagree on landmark rows')
    axes={c['name']:c.get('bodyAxisX') for c in report['cameras']}
    front=np.asarray(Image.open(renders/'front.png').getchannel('A'))>=128
    back=np.asarray(Image.open(renders/'back.png').getchannel('A'))>=128
    if axes['front'] is None or axes['back'] is None:
        raise ValueError('Projected model axes are required for front/back comparison')
    indices=np.rint(axes['front']+axes['back']-np.arange(front.shape[1])).astype(int)
    valid=(indices>=0)&(indices<front.shape[1]);reflected=np.zeros_like(front)
    reflected[:,valid]=front[:,indices[valid]]
    back_overlap=np.count_nonzero(reflected&back)/np.count_nonzero(reflected|back)
    if back_overlap<.995:raise ValueError('Front/back silhouettes disagree about model axes')
    result={'scope':'Exact-model construction handoff diagnostics, not final art approval',
            'status':'technical-pass','productionReady':False,'approval':None,
            'handoffSha256':sha(directory/'handoff.json'),'geometrySha256':sha(renders/'geometry.json'),
            'views':details,'landmarkRowSpreads':landmark_spreads,'derivedOutputs':previews,
            'frontBackBodyAxisIoU':back_overlap,'bodyAxes':axes,
            'maskMethod':'Alpha >= 128 black occupancy. Front white cutouts come from exact eye-white, nose and mouth geometry ray hits.',
            'remainingGates':['Nick approval of this geometry','Semantic review of final style masks and anatomy','Surface direction and complete production pack release']}
    (directory/'review.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('renders',type=Path)
    args=parser.parse_args()
    review(args.directory,args.renders)
