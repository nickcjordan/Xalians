"""Fail-closed checks. Semantic evidence is reviewed, never machine-proven."""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image
from common import VIEWS, binary, bounds, digest, iou, overlay, read_json, write_json


def check(directory, reference, annotations):
    d = Path(directory); ref = binary(reference)
    checks = []; masks = {}; shapes = {}; heights = []; bottoms = []
    def add(name, ok, evidence, blocked=False):
        checks.append({'name': name, 'status': 'blocked' if blocked else 'pass' if ok else 'fail', 'evidence': evidence})
    add('productionValidation', False,
        'Pilot diagnostics only. Strict manifest, independent source inventory and body-axis validation remain unfinished.', True)
    inventory = {}
    for name in VIEWS:
        try:
            files = [d / f'{name}{suffix}' for suffix in ('.png','.mask.png','.occupancy.png','.geometry.json')]
            for path in files: inventory[path.name] = digest(path)
            a = binary(files[2]); feature = binary(files[1]); im = Image.open(files[0])
            if a.shape != ref.shape or feature.shape != ref.shape or im.size != (ref.shape[1],ref.shape[0]):
                raise ValueError('Mismatched canvas')
            if np.any(feature & ~a): raise ValueError('Features extend outside occupancy')
            l,t,r,b = bounds(a)
            if min(l,t) < 1 or r >= im.width-1 or b >= im.height-1: raise ValueError('Clipped view')
            masks[name] = a; shapes[name] = feature; heights.append(b-t+1); bottoms.append(b)
            add(f'{name}:files', True, {'bounds':[l,t,r,b]})
        except (OSError, ValueError) as e:
            add(f'{name}:files', False, str(e))
    h = bounds(ref)[3]-bounds(ref)[1]+1
    if 'front' in masks:
        score = iou(ref,masks['front'])
        overlay(ref,masks['front'],d/'front-overlay.png')
        inventory['front-overlay.png'] = digest(d/'front-overlay.png')
        add('front:occupancyIoU',score>=0.95,{'value':score,'minimum':0.95})
    if len(masks) == 6:
        add('heightSpread', max(heights)-min(heights)<=0.01*h,{'pixels':max(heights)-min(heights),'limit':0.01*h})
        add('groundSpread',max(bottoms)-min(bottoms)<=1,{'pixels':max(bottoms)-min(bottoms),'limit':1})
        score = iou(masks['front'][:,::-1], masks['back'])
        overlay(masks['front'][:,::-1], masks['back'], d/'back-overlay.png')
        inventory['back-overlay.png'] = digest(d/'back-overlay.png')
        add('back:mirroredIoU',score>=0.95,{'value':score,'minimum':0.95,'method':'bbox-centered preliminary screen; body-axis review also required'})
    # Annotations must cite this exact candidate, not an earlier image.
    ann = read_json(annotations) if annotations else {}
    add('annotationBindings', bool(ann.get('imageHashes')) and ann.get('imageHashes') ==
        {n:digest(d/f'{n}.png') for n in masks}, 'Exact per-view image hashes required', not bool(ann))
    for gate in ('features', 'landmarks', 'parts', 'pose', 'rendering', 'maskDerivation', 'backProjection'):
        record = ann.get(gate,{})
        # Reviewed gates require an identity and concrete notes. Numeric detail below remains mandatory.
        valid = record.get('status') == 'pass' and bool(record.get('reviewer')) and bool(record.get('notes'))
        add(f'review:{gate}', valid, record, not bool(record))
    landmark_rows = ann.get('landmarkRows',{})
    required = ann.get('requiredLandmarks',[])
    for key in required:
        rows = [landmark_rows.get(n,{}).get(key) for n in VIEWS]
        visible = [r for r in rows if isinstance(r,(float,int)) and not isinstance(r,bool)]
        # Occluded cases must be separately substantiated by the reviewed landmarks gate.
        well_formed = all(isinstance(r,(float,int)) and not isinstance(r,bool) and 0<=r<ref.shape[0]
                          or isinstance(r,dict) and r.get('visibility')=='occluded' and bool(r.get('occluder')) for r in rows)
        add(f'landmark:{key}',bool(visible) and well_formed and max(visible)-min(visible)<=0.015*h,{'rows':rows,'limit':0.015*h})
    add('landmarkInventory',bool(required),required,not bool(required))
    feature_pairs = ann.get('featurePairs',[])
    for item in feature_pairs:
        dist = float(np.linalg.norm(np.array(item['source'])-np.array(item['candidate'])))
        add('feature:'+item['id'],dist<=0.02*h,{'distance':dist,'limit':0.02*h})
    expected = ann.get('sourceFeatureIds',[])
    add('featureInventory',bool(expected) and len(expected)==len(set(expected)) and
        sorted(expected)==sorted(x['id'] for x in feature_pairs),expected,not bool(expected))
    # Literal mask comparison, with source-eye exemption only when explicitly annotated and reviewed.
    feature_ref_path = ann.get('featureReference')
    if feature_ref_path and 'front' in shapes:
        source = binary(feature_ref_path)
        add('front:featureRawIoU',True,{'value':iou(source,shapes['front']),'informational':True})
        keep = np.ones(source.shape,dtype=bool)
        for x0,y0,x1,y1 in ann.get('approvedEyeRegions',[]): keep[y0:y1,x0:x1] = False
        score = iou(source & keep,shapes['front'] & keep)
        add('front:featureIoU',score>=0.95,{'value':score,'minimum':0.95,'eyeRegions':ann.get('approvedEyeRegions',[])})
    else:
        add('front:featureIoU',False,'Source feature reference and correspondences required',True)
    inventory['reference'] = digest(reference)
    if annotations: inventory['annotations'] = digest(annotations)
    result = {'status':'fail' if any(x['status']=='fail' for x in checks) else
              'blocked' if any(x['status']=='blocked' for x in checks) else 'pass',
              'checks':checks,'inventory':inventory,'approval':None}
    write_json(d/'report.json',result)
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory'); p.add_argument('reference'); p.add_argument('--annotations')
    a=p.parse_args(); r=check(a.directory,a.reference,a.annotations)
    print(r['status']); raise SystemExit(0 if r['status']=='pass' else 1)
