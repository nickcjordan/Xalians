"""Assemble and verify a portable, explicitly unapproved construction bundle."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from review_export import review

VIEWS=('front','front-left','left','back','right','front-right')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path,value):
    path.write_text(json.dumps(value,indent=2)+'\n')


def verify(directory):
    manifest=json.loads((directory/'manifest.json').read_text())
    if {v['name'] for v in manifest['views']}!=set(VIEWS) or len(manifest['views'])!=6:
        raise ValueError('Six unique named views are required')
    if not manifest['files']:
        raise ValueError('Bundle inventory is empty')
    for name,digest in manifest['files'].items():
        path=(directory/name).resolve()
        if not path.is_relative_to(directory.resolve()) or not path.is_file() or sha(path)!=digest:
            raise ValueError('Missing, escaped or changed bundle file: '+name)
    if manifest['approval'] is not None or manifest['productionReady'] is not False:
        raise ValueError('This builder cannot approve art or release a production pack')
    for view in manifest['views']:
        for key in ('image','mask','occupancy','depth','normals','objectIds'):
            if view[key] not in manifest['files']:raise ValueError('Unbound view artifact')
    return {'status':'technical-pass','files':len(manifest['files']),
            'manifestSha256':sha(directory/'manifest.json'),'approval':None,'productionReady':False}


def build(root,renders,export,out,species='akinza'):
    if out.exists():raise ValueError('Use a fresh candidate directory')
    export_review=review(export,renders)
    handoff=json.loads((export/'handoff.json').read_text())
    if handoff['species']!=species or species!='akinza':
        raise ValueError('This exercised handoff adapter currently supports Akinza only')
    assets=json.loads((renders/'review-assets.json').read_text())
    design=root/'docs/design/species-construction'/species
    refs=json.loads((design/'current-references.json').read_text())
    out.mkdir(parents=True)
    def copy(source,dest):
        dest=out/dest;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
    for path in export.iterdir():
        if path.is_file():copy(path,Path('geometry')/path.name)
    copy(renders/'blockout.blend','geometry/construction.blend')
    copy(renders/'geometry.json','records/geometry.json')
    copy(renders/'review-assets.json','records/render-checks.json')
    for path in (renders/'inputs').iterdir():
        if path.is_file():copy(path,Path('inputs')/path.name)
    for name in VIEWS:
        for suffix in ('.png','.occupancy.png'):copy(renders/(name+suffix),Path('views')/(name+suffix))
        copy(export/f'{name}.mask.png',Path('views')/f'{name}.mask.png')
    for name in ('contact.png','turntable.gif'):copy(renders/name,Path('review')/name)
    portable_references=[]
    for record in refs['references']:
        source=root/record['path'];dest=Path('references')/source.name;copy(source,dest)
        portable_references.append({**record,'path':dest.as_posix(),'sha256':sha(source),
                                    'sourceRepositoryPath':record['path']})
    write(out/'reference-index.json',{'references':portable_references,'rule':refs['rule']})
    for record in refs['approvals']:
        source=root/record['path'];copy(source,Path('decisions')/source.name)
    for name in ('brief.md','current-references.json','surface-handoff.md','reconciliation.md','independent-review-0020.json'):
        copy(design/name,Path('decisions')/name)
    copy(design/'records/study-0021.json','records/scoped-clay-reference-generation.json')
    copy(design/'prompts/study-0021-head-clay.txt','inputs/scoped-clay-reference-prompt.txt')
    copy(root/f'apps/web/src/svg/species/{species}.svg','references/source.svg')
    copy(root/f'docs/species-templates/{species}.json','references/species.json')
    copy(root/f'docs/design/species-view-readings/{species}/reading.md','decisions/reading.md')
    for name in ('export_geometry.py','review_export.py','build_handoff.py'):
        copy(root/'art/species-construction'/name,Path('inputs')/name)
    write(out/'construction-import.json',{
        'schemaVersion':1,'species':species,'mode':'direct-geometry-reference',
        'geometry':'geometry/construction.glb','editableScene':'geometry/construction.blend',
        'camerasAndArrays':'geometry/handoff.json','surfaceDirection':'decisions/surface-handoff.md',
        'references':'reference-index.json',
        'coordinates':handoff['glbCoordinates'],'approved':False,
        'numericTemplateCompatible':False,
        'templateLimitation':'Existing numeric template fields cannot express these authored ear and face surfaces. No lossy conversion is supplied.',
        'requirements':['Preserve construction geometry until reviewed','Compare imported model in supplied cameras before detail','Record downstream changes as a new candidate']})
    views=[]
    for camera in handoff['cameras']:
        n=camera['name'];box=assets['pixelBounds'][n]
        views.append({'name':n,'angle':camera['angle'],'bodyAxisX':camera['bodyAxisX'],
            'image':f'views/{n}.png','mask':f'views/{n}.mask.png',
            'occupancy':f'views/{n}.occupancy.png','depth':f'geometry/{n}.depth.npy',
            'normals':f'geometry/{n}.normals.npy','objectIds':f'geometry/{n}.object-ids.npy',
            'figureHeight':box[3]-box[1],'groundRow':box[3]-1,
            'camera':camera,'landmarkBasis':handoff['landmarks']})
    manifest={'schemaVersion':1,'kind':'construction-handoff-candidate','species':species,
        'status':'awaiting-Nick-review','productionReady':False,'approval':None,
        'pose':{'id':'neutral-construction','status':'proposed-inspection-arrangement',
                'description':'Arms lowered clear of torso, feet modestly separated. Separate from the expressive identity-reference pose.'},
        'generation':{'tool':'local Blender','billing':'local rendering; no API/key',
                      'record':'records/geometry.json','exactAuthoringInputs':'inputs/',
                      'interpretation':'decisions/reading.md','references':'decisions/current-references.json'},
        'views':views,'technicalChecks':export_review,
        'semanticReview':'decisions/reconciliation.md',
        'files':{str(p.relative_to(out)).replace('\\','/'):sha(p) for p in sorted(out.rglob('*')) if p.is_file()}}
    write(out/'manifest.json',manifest)
    result=verify(out);write(out/'bundle-checks.json',result)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path.cwd())
    parser.add_argument('--renders',type=Path,required=True)
    parser.add_argument('--export',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(build(args.root,args.renders,args.export,args.out)))
