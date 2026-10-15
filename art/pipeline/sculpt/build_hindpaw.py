"""B-kgav: local hind-paw replacement. Approved pass-1 surface above 65 mm is frozen."""
from pathlib import Path
import sys

def compose2():
    from PIL import Image,ImageDraw,ImageFont
    import json
    out=Path(sys.argv[sys.argv.index('--out')+1]);inp=out.parent/'inputs';(out/'references').mkdir(exist_ok=True)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
    def comp(a,b,path,la,lb):
        a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');b=b.resize((round(b.width*a.height/b.height),a.height),Image.Resampling.LANCZOS)
        im=Image.new('RGB',(a.width+b.width,a.height+52),(25,27,30));im.paste(a,(0,52));im.paste(b,(a.width,52));d=ImageDraw.Draw(im);d.text((15,12),la,font=font,fill='white');d.text((a.width+15,12),lb,font=font,fill='white');im.save(path)
    refs={'leg_side':('clay_side.png',(390,310,1035,1060)),'leg_three_quarter_rear':('clay_three_quarter.png',(410,310,1025,1070)),'leg_rear':('clay_front.png',(600,340,990,1050)),'leg_front_three_quarter':('clay_three_quarter.png',(410,310,1025,1070)),'paw_side':('clay_side.png',(490,850,735,1003)),'paw_front_three_quarter':('clay_three_quarter.png',(665,885,945,1070))}
    for view,(name,box) in refs.items():
        crop=out/'references'/f'{view}_clay_crop.png';Image.open(inp/name).crop(box).save(crop)
        for r in (out/'renders').glob(f'*_{view}.png'):
            tag=r.name[:-len('_'+view+'.png')];dst=out/(f'composite_{view}_vs_clay.png' if tag=='final' else f'composite_{tag}_{view}_vs_clay.png')
            label='Clay authority' if view not in ('leg_rear','leg_three_quarter_rear') else 'Clay reference (no rear clay supplied)'
            comp(r,crop,dst,'B-kgav '+tag+' | '+view,label)
    if (out/'renders'/'full_side_left.png').exists():comp(out/'renders'/'full_side_left.png',inp/'furred_side.png',out/'composite_full_side_vs_furred.png','B-kgav | full side','Furred placement reference')
    for n in ('combined.png','clay_side.png'):
        Image.open(inp/n).save(out/'references'/('full_side_clay.png' if n=='clay_side.png' else n))
    tags=['baseline','iter1','iter6','final']
    if all((out/'renders'/f'{t}_paw_side.png').exists() for t in tags):
        im=Image.new('RGB',(2048,570),(25,27,30));d=ImageDraw.Draw(im);f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
        for i,(t,cap) in enumerate(zip(tags,['Pass 1: low web, small claws, flared heel','First toes and hooks; heel needs repair','Open digits; heel and collar repaired','Final: rounded tips and clean claw roots'])):
            a=Image.open(out/'renders'/f'{t}_paw_side.png').resize((512,512),Image.Resampling.LANCZOS);im.paste(a,(i*512,58));d.text((i*512+8,10),cap,font=f,fill='white')
        im.save(out/'progress.png')
if '--compose' in sys.argv:
    compose2();sys.exit(0)

# Reuse pass-1 mesh, weight, and audit helpers without executing its build.
exec(compile(Path(__file__).with_name('build_hindlegs.py').read_text().split('def main():')[0],str(Path(__file__).with_name('build_hindlegs.py')),'exec'))
OUT=Path(arg('--out','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-hindlegs/pass2'));OUT.mkdir(exist_ok=True);(OUT/'renders').mkdir(exist_ok=True)
ITER=int(arg('--iter','1'));TAG=arg('--tag',f'iter{ITER}');FINAL='--final' in ARGS

def make_new_paw(body,rig):
    for o in list(bpy.data.objects):
        if o.name.startswith('hind_claw_'):bpy.data.objects.remove(o,do_unlink=True)
    cuff=body.copy();cuff.data=body.data.copy();bpy.context.collection.objects.link(cuff)
    bm=bmesh.new();bm.from_mesh(cuff.data)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x<.04 or not .025<v.co.y<.34 or v.co.z>.095],context='VERTS')
    bm.to_mesh(cuff.data);bm.free()
    sk.cut_keep(cuff,(0,.146,0),(0,1,0),True,True)
    sk.cut_keep(cuff,(0,0,.085),(0,0,1),False,True)
    cp=sk.co(cuff);w=ss((.065-cp[:,2])/.030)*ss((cp[:,1]-.165)/.040)
    cp[:,0]+=(.131-cp[:,0])*.48*w
    cp[:,1]+=(.222-cp[:,1])*.45*w
    # Lower the original dorsal toe web to make room for the long individual digits.
    w=ss((.185-cp[:,1])/.039)*ss((.060-cp[:,2])/.030)
    cp[:,2]+=(.016-cp[:,2])*.35*w
    sk.set_co(cuff,cp)
    sk.smooth(cuff,25,.4,ss((.065-cp[:,2])/.025))
    parts=[cuff]
    claws=[];claw_lengths=[]
    for j,(x,tip) in enumerate(zip([.110,.137,.164,.191],[.072,.054,.056,.075])):
        rows=[]
        for t in np.linspace(0,1,44):
            y=.192+(tip-.192)*t;xx=(.142+(x-.142)*.52)*(1-ss(t/.40))+x*ss(t/.40)
            bump1=np.exp(-((t-.54)/.10)**2);bump2=np.exp(-((t-.85)/.095)**2)
            rx=(.0080+.0012*bump1+.0010*bump2)*(.28+.72*ss(t/.22))
            rz=(.009+.0033*bump1+.0032*bump2)*(.4+.6*ss(t/.20))
            z=.014+.002*bump1+.003*bump2+.004*ss((t-.88)/.12)
            if ITER>=2:
                rz+=.0015*bump1+.001*bump2;z+=.001*bump1
            if t>.94:
                rx*=1-.68*(t-.94)/.06
                rz*=1-.55*(t-.94)/.06
            rows.append((xx,y,z,rx,rz))
        parts.append(loft(f'toe_{j}',rows,28))
        for t in (.52,.82):
            y=.192+(tip-.192)*t
            padx=(.142+(x-.142)*.52)*(1-ss(t/.40))+x*ss(t/.40)
            pad=sk.sphere(f'pad_{j}_{t}',(padx,y,.009),1,24,12);pad.scale=(.0075,.013,.0065);parts.append(pad)
        # Large dark hook, embedded 5 mm into the toe, ending near ground.
        pts=[]
        for t in np.linspace(0,1,18):
            pts.append((x,tip+.004-.021*t,.021+.001*math.sin(math.pi*t)-.019*t*t))
        pts=np.array(pts);claw_lengths.append(float(np.linalg.norm(np.diff(pts,axis=0),axis=1).sum()))
        c,_=sk.sweep(f'hind_claw_l_{j+1}',pts,lambda i,t:.008*(1-i/17)**.75+.00015,segments=20)
        claws.append(c)
    bpy.context.view_layer.update();paw=sk.join(parts,'local_paw')
    for o in parts:bpy.data.objects.remove(o,do_unlink=True)
    sk.voxel_remesh(paw,.00125);sk.keep_largest(paw);sk.smooth(paw,5,.35)
    pp=sk.co(paw);q=(pp-np.array([.170,.182,.020]))/np.array([.050,.035,.025])
    sk.smooth(paw,90,.45,np.maximum(0,1-(q*q).sum(1))**2)
    bpy.context.view_layer.objects.active=paw
    dec=paw.modifiers.new("local_paw_budget","DECIMATE");dec.ratio=.30
    with bpy.context.temp_override(object=paw,active_object=paw):bpy.ops.object.modifier_apply(modifier=dec.name)
    P=sk.co(paw);P[:,2]-=.0025*ss((.012-P[:,2])/.008);P[:,2]=np.maximum(P[:,2],.0002);sk.set_co(paw,P)
    sk.cut_keep(paw,(0,0,.058),(0,0,1),False,False)
    cut_z(body,.060,True)
    bm=bmesh.new();bm.from_mesh(body.data)
    for sx in (1,-1):
        A=ordered_boundary(bm,sx);old=set(bm.verts);me=paw.data.copy()
        if sx<0:
            from mathutils import Matrix
            me.transform(Matrix.Diagonal((-1,1,1,1)))
        bm.from_mesh(me);bpy.data.meshes.remove(me);fresh=set(bm.verts)-old
        B=list({v for e in bm.edges if e.is_boundary and all(v in fresh for v in e.verts) for v in e.verts})
        # Identical canonical winding makes both bridge triangulations mirror exactly.
        if sx<0:
            for v in A+B:v.co.x*=-1
        stitch(bm,A,B)
        if sx<0:
            for v in A+B:v.co.x*=-1
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free();bpy.data.objects.remove(paw,do_unlink=True)
    P=sk.co(body);w=((P[:,1]>.175)&(P[:,1]<.31))*ss((.065-P[:,2])/.012)*ss((P[:,2]-.028)/.018)
    left_ids=np.where(P[:,0]>0)[0];tree=KDTree(len(left_ids))
    for i in left_ids:tree.insert(Vector(P[i]),int(i))
    tree.balance();right_ids=np.where((P[:,0]<0)&(w>0))[0]
    pairs=[(int(i),tree.find(Vector((-P[i,0],P[i,1],P[i,2])))[1]) for i in right_ids]
    sk.smooth(body,30,.40,w*(P[:,0]>0))
    Q=sk.co(body)
    for i,j in pairs:Q[i]=Q[j]*np.array([-1,1,1])
    sk.set_co(body,Q)
    for c in list(claws):
        r=bpy.data.objects.new(c.name.replace('_l_','_r_'),c.data.copy());bpy.context.collection.objects.link(r)
        a=sk.co(r);a[:,0]*=-1;sk.set_co(r,a)
        bm=bmesh.new();bm.from_mesh(r.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(r.data);bm.free()
        sk.bone_parent(c,rig,'leg_hl_03');sk.bone_parent(r,rig,'leg_hr_03');claws.append(r)
    return claws,claw_lengths

def main2():
    body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST'
    source=body.copy();source.data=body.data.copy();bpy.context.collection.objects.link(source);source.hide_render=True
    P0=sk.co(body);names,W=wm(body)
    oldclaw=np.array([tuple(o.matrix_world@v.co) for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('hind_claw_') for v in o.data.vertices])
    bones={b.name:[list(b.head_local),list(b.tail_local)] for b in rig.data.bones}
    if '--baseline' in ARGS:
        bpy.data.objects.remove(source,do_unlink=True);lookdev.setup_scene(engine='CYCLES')
        for n,c in legcam.frame_paws().items():lookdev.render(c,str(OUT/'renders'/f'baseline_{n}.png'),1024)
        return
    claws,clength=make_new_paw(body,rig);clean_local_topology(body);transfer_weights(body,source)
    allowed=(P0[:,2]<.065)&(P0[:,1]>.025)&(P0[:,1]<.34)
    band=(P0[:,1]>.075)&(P0[:,1]<.335)&(P0[:,2]>.335)&(P0[:,2]<.535)&(group_sum(names,W,'tail_')<.15)&(group_sum(names,W,'leg_f')<.1)
    detail=detailed_metrics(body,rig,P0,allowed,band,names,W,P0)
    P=sk.co(body);kd=KDTree(len(P))
    for i,p in enumerate(P):kd.insert(Vector(p),i)
    kd.balance()
    for label,mask in {'thigh':(P0[:,2]>.30)&(group_sum(names,W,'leg_h')>.5),'gaskin':(P0[:,2]>.20)&(P0[:,2]<.30)&(group_sum(names,W,'leg_h')>.5),'hock':(P0[:,2]>.15)&(P0[:,2]<.20)&(group_sum(names,W,'leg_h')>.5),'bellyBandPass1':band}.items():
        ds=np.array([kd.find(Vector(p))[2] for p in P0[mask]]);detail['displacement'][label]={'vertices':int(mask.sum()),'maxM':float(ds.max()),'meanM':float(ds.mean())}
    bpy.data.objects.remove(source,do_unlink=True)
    rigid=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig and o!=body]
    detail.update(buildId='B-kgav',nonManifoldEdges=sk.nonmanifold_edges(body),maxInfluencesPerVertex=max(len(v.groups) for v in body.data.vertices),triangles={o.name:sk.tri_count(o) for o in [body]+rigid})
    detail['triangles']['creatureTotal']=sum(detail['triangles'].values())
    detail['declaredEditRegion']={'zMaxM':.065,'yM':[.025,.34],'description':'Both paws below 65 mm; lower metatarsal collar blended only below this plane.'}
    detail['clawArcLengthM']=clength;detail['clawRootRadiusM']=.00695;detail['clawMaterialLinearValue']=.12
    heel=P[(P[:,0]>.04)&(P[:,1]>.215)&(P[:,1]<.25)&(abs(P[:,2]-.03)<.002)]
    detail['heelWidthAt30mmM']=float(np.ptp(heel[:,0]))
    oldheel=P0[(P0[:,0]>.04)&(P0[:,1]>.215)&(P0[:,1]<.25)&(abs(P0[:,2]-.03)<.002)]
    detail['baseHeelWidthAt30mmM']=float(np.ptp(oldheel[:,0]))
    clawpoints=np.array([tuple(o.matrix_world@v.co) for o in claws for v in o.data.vertices])
    def envelope(p,c):
        q=p[(p[:,0]>.04)&(p[:,1]>.025)&(p[:,1]<.31)&(p[:,2]<.055)]
        return float(max(q[:,1].max(),c[:,1].max())-min(q[:,1].min(),c[:,1].min()))
    detail['pawEnvelopeWithClawsM']=envelope(P,clawpoints);detail['basePawEnvelopeWithClawsM']=envelope(P0,oldclaw)
    detail['pawEnvelopeWithClawsRatio']=detail['pawEnvelopeWithClawsM']/detail['basePawEnvelopeWithClawsM']
    detail['pawStanceRatioToPass1']=detail['geometry']['pawCenterStanceWidthM']/detail['baseGeometry']['pawCenterStanceWidthM']
    # Through-cleft extent measured by vertical ray misses at midpoints of each pair.
    tree=sk.bvh(body);clefts=[]
    for x in [.1235,.1505,.1775]:
        ys=np.arange(.065,.155,.0005);miss=[float(y) for y in ys if tree.ray_cast(Vector((x,float(y),.07)),Vector((0,0,-1)))[0] is None]
        clefts.append(max(miss) if miss else .065)
    detail['toeCleftRearYM']=clefts;detail['toeCleftDepthFractionFromForemostPawTip']=[(y-.054)/detail['geometry']['pawLengthM'] for y in clefts]
    detail['toeCleftDepthFraction']=[(y-t)/detail['geometry']['pawLengthM'] for y,t in zip(clefts,[.072,.056,.075])]
    detail['toeCleftDefinition']='Vertical ray misses at midpoint X between digits, measured from the shorter adjacent nominal toe tip, divided by skin paw length.'
    detail['clawLengthM']=clength
    detail['pawLengthRatioToPass1']=detail['geometry']['pawLengthM']/detail['baseGeometry']['pawLengthM']
    mir=P[(P[:,0]>.04)&(P[:,1]>.025)&(P[:,1]<.34)&(P[:,2]<.065)].copy();mir[:,0]*=-1;ds=sk.nearest_dist(tree,mir)
    detail['pawMirrorAsymmetry']={'maxM':float(ds.max()),'meanM':float(ds.mean())}
    detail['jointMaxDisplacementM']=max(np.linalg.norm(np.array([b.head_local[:],b.tail_local[:]])-bones[b.name]) for b in rig.data.bones)
    (OUT/f'measurements_{TAG}.json').write_text(json.dumps(detail,indent=2))
    assert detail['nonManifoldEdges']==0 and detail['bodyConnectedComponents']==1
    assert detail['displacement']['allProtected']['maxM']==0
    assert detail['triangles']['creatureTotal']<400000
    assert .95<=detail['pawLengthRatioToPass1']<=1.05
    assert .95<=detail['pawStanceRatioToPass1']<=1.05
    assert .95<=detail['pawEnvelopeWithClawsRatio']<=1.05
    assert detail['bodyDegenerateFaces']==0 and detail['maxInfluencesPerVertex']<=4
    lookdev.setup_scene(engine='CYCLES')
    if body.data.has_custom_normals:body.data.normals_split_custom_set([(0,0,0)]*len(body.data.loops))
    for o in [body]+rigid:lookdev.apply_clay(o)
    dark=lookdev._material('hind_claw_dark',(.12,.12,.12),.75)
    for c in claws:c.data.materials.clear();c.data.materials.append(dark)
    for n,c in {**legcam.frame_legs(),**legcam.frame_paws()}.items():lookdev.render(c,str(OUT/'renders'/f'{TAG}_{n}.png'),1024)
    full=lookdev.frame_cameras([body]+rigid)
    lookdev.render(full['side_left'],str(OUT/'renders'/f'{TAG}_sprite_side_192.png'),192)
    if FINAL:
        for n,c in full.items():lookdev.render(c,str(OUT/'renders'/f'full_{n}.png'),1024)
        lookdev.render(full['side_left'],str(OUT/'renders'/'sprite_side_192.png'),192)
        (OUT/'measurements.json').write_text(json.dumps(detail,indent=2))
    bpy.data.objects.remove(bpy.data.objects['lookdev_ground'],do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('hindlegs.blend' if FINAL else TAG+'.blend')),compress=True)
    if FINAL:
        export(OUT/'hindlegs.glb',[body,rig]+rigid)
        part=bpy.data.objects.new('hindlegs_part',body.data.copy());bpy.context.collection.objects.link(part)
        bm=bmesh.new();bm.from_mesh(part.data);pn,pw=wm(body);hind=group_sum(pn,pw,'leg_h');bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not(hind[v.index]>.35 and v.co.z<.535)],context='VERTS');bm.to_mesh(part.data);bm.free()
        cc=[sk.evaluated_copy(c,c.name+'_part') for c in claws];export(OUT/'hindlegs_part.glb',[part]+cc,False)
        for o in [part]+cc:bpy.data.objects.remove(o,do_unlink=True)
    (OUT/f'blender_log_{TAG}.json').write_text(json.dumps({'blenderSeconds':time.time()-T0,'buildId':'B-kgav'},indent=2))

def audit2():
    body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig']
    meshes=[o for o in bpy.data.objects if o.type=='MESH'];P=sk.co(body)
    kd=KDTree(len(P))
    for i,p in enumerate(P):kd.insert(Vector(p),i)
    kd.balance()
    rn=['eye_l','eye_r','horn_l','horn_r','whiskers_l','whiskers_r']
    current={n:sk.co(bpy.data.objects[n]).copy() for n in rn}
    bone0={b.name:np.array([b.head_local[:],b.tail_local[:]]) for b in rig.data.bones}
    with bpy.data.libraries.load(str(OUT.parent/'pass1'/'hindlegs.blend'),link=False) as (src,dst):dst.objects=['luceras_blockout','luceras_rig']+rn
    base,br,*oldrigid=dst.objects;Q=sk.co(base)
    protected=~((Q[:,2]<.065)&(Q[:,1]>.025)&(Q[:,1]<.34))
    ds=np.array([kd.find(Vector(q))[2] for q in Q[protected]])
    d={'bodyMeshCount':sum(any(m.type=='ARMATURE' for m in o.modifiers) for o in meshes),'meshObjects':[o.name for o in meshes],
       'headPartAbsent':not any('head_part' in o.name for o in meshes),'nonManifoldEdges':sk.nonmanifold_edges(body),
       'protectedVertices':int(protected.sum()),'protectedMaxDisplacementM':float(ds.max()),'protectedMeanDisplacementM':float(ds.mean()),
       'jointMaxDisplacementM':max(float(np.linalg.norm(bone0[b.name]-np.array([b.head_local[:],b.tail_local[:]]))) for b in br.data.bones),
       'rigJointCount':len(rig.data.bones),'rigidDisplacementM':{n:float(np.linalg.norm(current[n]-sk.co(o),axis=1).max()) for n,o in zip(rn,oldrigid)},
       'clawParents':{o.name:{'parent':o.parent.name,'type':o.parent_type,'bone':o.parent_bone,'minWorldZ':min((o.matrix_world@v.co).z for v in o.data.vertices)} for o in meshes if o.name.startswith('hind_claw_')},
       'maxInfluencesPerVertex':max(len(v.groups) for v in body.data.vertices),'auditBlenderSeconds':time.time()-T0}
    assert d['bodyMeshCount']==1 and len(meshes)==15 and d['headPartAbsent']
    assert d['nonManifoldEdges']==0 and d['protectedMaxDisplacementM']==0 and d['jointMaxDisplacementM']==0
    assert max(d['rigidDisplacementM'].values())==0 and d['maxInfluencesPerVertex']<=4
    assert all(v['type']=='BONE' and v['bone'] in ('leg_hl_03','leg_hr_03') for v in d['clawParents'].values())
    (OUT/'saved_file_audit.json').write_text(json.dumps(d,indent=2))
def diagnostic():
    body=bpy.data.objects['luceras_blockout'];lookdev.setup_scene(engine='CYCLES')
    for n,a,e in [('paw_top',0,90),('paw_front',0,15)]:
        c=lookdev.place_camera('lookdev_cam_'+n,(Vector((.085,.02,0)),Vector((.21,.26,.07))),a,e)
        lookdev.render(c,str(OUT/'renders'/f'{TAG}_{n}.png'),1024)
    tree=sk.bvh(body);rows={}
    for y in [.08,.10,.12,.13,.14,.15]:
        segments=[];start=None
        for x in np.arange(.09,.212,.00025):
            hit=tree.ray_cast(Vector((float(x),y,.08)),Vector((0,0,-1)))[0]
            if hit is not None and start is None:start=float(x)
            if hit is None and start is not None:segments.append([start,float(x-.00025)]);start=None
        rows[str(y)]=segments
    (OUT/f'{TAG}_toe_sections.json').write_text(json.dumps(rows,indent=2))
if '--diagnostic' in ARGS:diagnostic()
elif '--audit' in ARGS:audit2()
else:
    main2()
    if FINAL:diagnostic()
