"""B-kgav: local hind-paw replacement. Approved pass-1 surface above 65 mm is frozen."""
from pathlib import Path
import sys

def compose2():
    from PIL import Image,ImageDraw,ImageFont
    import json
    out=Path(sys.argv[sys.argv.index('--out')+1]);inp=out.parent/'inputs';(out/'references').mkdir(exist_ok=True)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
    build='B-gsn9' if out.name=='pass3' else 'B-kgav'
    def comp(a,b,path,la,lb):
        a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');b=b.resize((round(b.width*a.height/b.height),a.height),Image.Resampling.LANCZOS)
        im=Image.new('RGB',(a.width+b.width,a.height+52),(25,27,30));im.paste(a,(0,52));im.paste(b,(a.width,52));d=ImageDraw.Draw(im);d.text((15,12),la,font=font,fill='white');d.text((a.width+15,12),lb,font=font,fill='white');im.save(path)
    refs={'leg_side':('clay_side.png',(390,310,1035,1060)),'leg_three_quarter_rear':('clay_three_quarter.png',(410,310,1025,1070)),'leg_rear':('clay_front.png',(600,340,990,1050)),'leg_front_three_quarter':('clay_three_quarter.png',(410,310,1025,1070)),'paw_side':('clay_side.png',(490,850,735,1003)),'paw_front_three_quarter':('clay_three_quarter.png',(665,885,945,1070))}
    for view,(name,box) in refs.items():
        crop=out/'references'/f'{view}_clay_crop.png';Image.open(inp/name).crop(box).save(crop)
        for r in (out/'renders').glob(f'*_{view}.png'):
            tag=r.name[:-len('_'+view+'.png')];dst=out/(f'composite_{view}_vs_clay.png' if tag=='final' else f'composite_{tag}_{view}_vs_clay.png')
            label='Clay authority' if view not in ('leg_rear','leg_three_quarter_rear') else 'Clay reference (no rear clay supplied)'
            comp(r,crop,dst,build+' '+tag+' | '+view,label)
    if (out/'renders'/'full_side_left.png').exists():comp(out/'renders'/'full_side_left.png',inp/'furred_side.png',out/'composite_full_side_vs_furred.png',build+' | full side','Furred placement reference')
    for n in ('combined.png','clay_side.png'):
        Image.open(inp/n).save(out/'references'/('full_side_clay.png' if n=='clay_side.png' else n))
    tags=['baseline','iter1','iter2','final'] if out.name=='pass3' else ['baseline','iter1','iter6','final']
    if all((out/'renders'/f'{t}_paw_side.png').exists() for t in tags):
        im=Image.new('RGB',(2048,570),(25,27,30));d=ImageDraw.Draw(im);f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
        caps=['Pass 2: thin digits and low instep','First volume pass: dorsal lift and width','Refined knuckle volume and instep','Final paw; heel and claws preserved'] if out.name=='pass3' else ['Pass 1: low web, small claws, flared heel','First toes and hooks; heel needs repair','Open digits; heel and collar repaired','Final: rounded tips and clean claw roots']
        for i,(t,cap) in enumerate(zip(tags,caps)):
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
    (OUT/'audit_rigid_diagnostic.json').write_text(json.dumps(d,indent=2))
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

def main3():
    body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST'
    P0=sk.co(body);P=P0.copy();names,W=wm(body)
    bones={b.name:np.array([b.head_local[:],b.tail_local[:]]) for b in rig.data.bones}
    claws=[o for o in bpy.data.objects if o.name.startswith('hind_claw_') and o.type=='MESH']
    claw0={o.name:np.array([tuple(o.matrix_world@v.co) for v in o.data.vertices]) for o in claws}
    allowed=(np.abs(P0[:,0])>.065)&(P0[:,1]>.04)&(P0[:,1]<.210)&(P0[:,2]<.065)&(group_sum(names,W,'leg_h')>.5)
    ids=np.where(allowed&(P0[:,0]>0))[0];q=P0[ids].copy();x,y,z=q.T
    centers=np.array([.110,.137,.164,.191]);tips=np.array([.072,.054,.056,.075])
    digit=np.abs(x[:,None]-centers).argmin(1)
    if ITER>=11:
        free=set(int(i) for i in ids if P0[i,1]<.145);adj={i:[] for i in free}
        for e in body.data.edges:
            a,b=e.vertices
            if a in free and b in free:adj[a].append(b);adj[b].append(a)
        labels={};seen=set()
        for i in free:
            if i in seen:continue
            stack=[i];seen.add(i);component=[]
            while stack:
                v=stack.pop();component.append(v)
                for u in adj[v]:
                    if u not in seen:seen.add(u);stack.append(u)
            label=int(np.abs(centers-np.mean(P0[component,0])).argmin())
            labels.update({v:label for v in component})
        for k,i in enumerate(ids):
            if i in labels:digit[k]=labels[i]
    cx=centers[digit];tip=tips[digit]
    # Widen the free digits while retaining tight, nonintersecting clefts.
    spread=ss(((.145 if ITER>=11 else .148 if ITER>=3 else .153)-y)/(.012 if ITER>=11 else .010 if ITER>=3 else .018))*ss((y-tip)/.017)
    gain=1.44 if ITER==1 else 1.49
    q[:,0]=x+(x-cx)*(gain-1)*spread
    if ITER>=10:
        offset=x-cx
        shape=1.9 if ITER>=13 else 2.4
        bounded=.0135*np.tanh(shape*offset/.0135)/np.tanh(shape)
        q[:,0]=x+(bounded-offset)*spread
    if ITER==12:q[:,0]=x+(x-cx)*.44*spread
    # Lift dorsal volume without moving the sole or the seated claw roots.
    toe=ss((y-tip-.003)/.038)
    fade=ss((.210-y)/.025)
    top=ss((z-.004)/.022)
    amp=.027 if ITER==1 else .029
    ceiling=ss((.065-z)/.020) if ITER==1 else np.clip((.065-z)/.035,0,1)
    q[:,2]=z+amp*toe*fade*top*ceiling
    if ITER==1:q[:,2]=np.minimum(q[:,2],.0649)
    if ITER>=3:
        q[:,2]+=.008*np.exp(-((y-.151)/.018)**2)*ss((z-.010)/.020)*np.clip((.065-q[:,2])/.012,0,1)
    if ITER>=4:
        t=(.192-y)/(.192-tip)
        q[:,2]-=(.003 if ITER>=5 else .0045)*np.exp(-((t-.69)/.055)**2)*ss((z-.012)/.015)
    if ITER>=5:
        gap=np.exp(-((x[:,None]-np.array([.1235,.1505,.1775]))/.0045)**2).max(1)
        q[:,2]-=.012*gap*np.exp(-((y-.165)/.025)**2)*ss((z-.018)/.018)*ss((.065-z)/.012)
    P[ids]=q
    if ITER>=4:
        sk.set_co(body,P)
        sm=allowed*(P0[:,0]>0)*ss((P0[:,1]-.125)/.025)*ss((.207-P0[:,1])/.025)*ss((P0[:,2]-.010)/.020)*ss((.065-P0[:,2])/.012)
        sk.smooth(body,65,.40,sm)
        P=sk.co(body)
    if ITER>=6:
        surf=sk.bvh(body)
        for i in ids:
            xx,yy,zz=P[i]
            if not .137<yy<.201:continue
            hit=surf.ray_cast(Vector((float(xx),float(yy),.065)),Vector((0,0,-1)))[0]
            if hit is None or hit.z<zz-1e-5 or hit.z<.018:continue
            h=hit.z
            target=.057+.10*(yy-.14)-.004*((xx-.15)/.055)**2
            blend=ss((yy-.137)/.017)*ss((.201-yy)/.017)*ss((zz-.008)/(h-.008))
            P[i,2]+=(target-h)*blend
        sk.set_co(body,P)
        sk.smooth(body,150 if ITER>=7 else 12,.40,sm)
        P=sk.co(body)
    if ITER>=8:
        a=P[ids].copy();xx,yy,zz=a.T
        tx=np.clip((.192-yy[:,None])/(.192-tips[None,:]),0,1)
        centerpaths=(.142+(centers-.142)*.52)[None,:]*(1-ss(tx/.40))+centers[None,:]*ss(tx/.40)
        mid=(centerpaths[:,:-1]+centerpaths[:,1:])/2
        grooves=np.exp(-((xx[:,None]-mid)/.004)**2).max(1)
        a[:,2]-=(.0065 if ITER>=9 else .009)*grooves*ss((yy-.140)/.012)*ss((.195-yy)/.022)*ss((zz-.026)/.018)*ss((.065-P0[ids,2])/.012)
        P[ids]=a
        sk.set_co(body,P);sk.smooth(body,38 if ITER>=9 else 8,.35,sm);P=sk.co(body)
    # Repair only any newly folded triangles inside the editable left paw.
    if ITER>=11:
        from mathutils.bvhtree import BVHTree
        body.data.calc_loop_triangles()
        faces=[tuple(f.vertices) for f in body.data.loop_triangles if all(allowed[v] and P0[v,0]>0 for v in f.vertices)]
        for repair in range(8):
            bv=BVHTree.FromPolygons([Vector(v) for v in P],faces,all_triangles=True)
            pairs=[(a,b) for a,b in bv.overlap(bv) if a<b and not set(faces[a]).intersection(faces[b])]
            if not pairs:break
            bad=set(v for a,b in pairs for face in (faces[a],faces[b]) for v in face)
            rw=np.zeros(len(P))
            for v in bad:
                ds=((P[ids]-P[v])**2).sum(1)
                rw[ids]=np.maximum(rw[ids],np.exp(-ds/.000064))
            sk.set_co(body,P);sk.smooth(body,45,.45,rw);P=sk.co(body)
        log(f'local fold repair rounds {repair}, remaining candidates {len(pairs)}')
        assert not pairs, 'Local paw surface folds remain'
    # The inherited paw topology is symmetric. Copy each edited left vertex exactly.
    kd=KDTree(len(P0))
    for i,v in enumerate(P0):kd.insert(Vector(v),i)
    kd.balance()
    for i in ids:
        _,j,d=kd.find(Vector(P0[i]*np.array([-1,1,1])))
        assert d<1e-7
        P[j]=P[i]*np.array([-1,1,1])
    sk.set_co(body,P)
    band=(P0[:,1]>.075)&(P0[:,1]<.335)&(P0[:,2]>.335)&(P0[:,2]<.535)&(group_sum(names,W,'tail_')<.15)&(group_sum(names,W,'leg_f')<.1)
    detail=detailed_metrics(body,rig,P0,allowed,band,names,W,P)
    rigid=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig and o!=body]
    detail.update(buildId='B-gsn9',nonManifoldEdges=sk.nonmanifold_edges(body),maxInfluencesPerVertex=max(len(v.groups) for v in body.data.vertices),triangles={o.name:sk.tri_count(o) for o in [body]+rigid})
    detail['triangles']['creatureTotal']=sum(detail['triangles'].values())
    detail['declaredEditRegion']={'zMaxM':.065,'yM':[.04,.210],'absXMinM':.065,'hindWeightMin':.5,'description':'Existing hind digit and instep vertices only. Heel at y >= 0.210 m frozen.'}
    delta=np.linalg.norm(P-P0,axis=1)
    for label,m in {'atOrAbove65mm':P0[:,2]>=.065,'heel':(P0[:,1]>=.210)&(P0[:,2]<.065),'thigh':(P0[:,2]>.3)&(group_sum(names,W,'leg_h')>.5),'gaskin':(P0[:,2]>.20)&(P0[:,2]<.30)&(group_sum(names,W,'leg_h')>.5),'hock':(P0[:,2]>.15)&(P0[:,2]<.20)&(group_sum(names,W,'leg_h')>.5),'bellyBandPass1':band}.items():
        detail['displacement'][label]={'vertices':int(m.sum()),'maxM':float(delta[m].max()),'meanM':float(delta[m].mean()),'method':'Same-index vertex displacement; topology unchanged'}
    tree=sk.bvh(body);L=detail['geometry']['pawLengthM']
    heights=[];widths=[]
    for j,cx in enumerate(centers):
        heights.append(max(tree.ray_cast(Vector((float(cx),float(y),.08)),Vector((0,0,-1)))[0].z for y in np.linspace(.105,.145,81)))
        sel=(P[:,0]>cx-.0134)&(P[:,0]<cx+.0134)&(abs(P[:,1]-.12)<.0015)&(P[:,2]<.065)
        widths.append(float(np.ptp(P[sel,0])))
    detail['knuckleHeightM']=heights;detail['knuckleHeightFraction']=[h/L for h in heights]
    detail['digitWidthM']=widths;detail['digitWidthFraction']=[w/L for w in widths]
    detail['clayProportions']={'knuckleHeightFraction':49/148,'digitWidthFraction':27/180,'method':'Manual image landmark measurement, side crop skin paw length 148 px and knuckle height 49 px; front three-quarter projected paw length 180 px and central digit width 27 px. Perspective and painted shading make these approximate.'}
    detail['proportionRelativeErrors']={'knuckleHeight':[abs(h/L/(49/148)-1) for h in heights],'digitWidth':[abs(w/L/.15-1) for w in widths]}
    detail['jointMaxDisplacementM']=max(float(np.linalg.norm(np.array([b.head_local[:],b.tail_local[:]])-bones[b.name])) for b in rig.data.bones)
    detail['clawMaxDisplacementM']=max(float(np.linalg.norm(np.array([tuple(o.matrix_world@v.co) for v in o.data.vertices])-claw0[o.name],axis=1).max()) for o in claws)
    prior=json.loads((OUT.parent/'pass2'/'measurements.json').read_text())
    for key in ['clawLengthM','clawArcLengthM','clawMaterialLinearValue','heelWidthAt30mmM','toeCleftDepthFraction','toeCleftDefinition']:detail[key]=prior[key]
    clefts=[]
    for cx in [.1235,.1505,.1775]:
        misses=[float(y) for y in np.arange(.065,.16,.0005) if tree.ray_cast(Vector((cx,float(y),.07)),Vector((0,0,-1)))[0] is None]
        clefts.append(max(misses) if misses else .065)
    detail['toeCleftRearYM']=clefts
    detail['toeCleftDepthFraction']=[(y-t)/L for y,t in zip(clefts,[.072,.056,.075])]
    detail['heelWidthAt30mmDefinition']='Unchanged heel vertices, y >= 0.210 m; value inherited from exact-identical pass 2 heel.'
    detail['pawLengthRatioToPass2']=L/detail['baseGeometry']['pawLengthM'];detail['pawStanceRatioToPass2']=detail['geometry']['pawCenterStanceWidthM']/detail['baseGeometry']['pawCenterStanceWidthM']
    mir=P[(P[:,0]>.04)&(P[:,1]>.025)&(P[:,1]<.34)&(P[:,2]<.065)].copy();mir[:,0]*=-1;ds=sk.nearest_dist(tree,mir)
    detail['pawMirrorAsymmetry']={'maxM':float(ds.max()),'meanM':float(ds.mean())}
    detail['topologyChanged']=False;detail['skinWeightsChanged']=False
    (OUT/f'measurements_{TAG}.json').write_text(json.dumps(detail,indent=2))
    assert detail['nonManifoldEdges']==0 and detail['bodyConnectedComponents']==1 and detail['bodyDegenerateFaces']==0
    assert detail['displacement']['allProtected']['maxM']==0 and detail['displacement']['atOrAbove65mm']['maxM']==0
    assert detail['triangles']['creatureTotal']<400000 and detail['maxInfluencesPerVertex']<=4
    assert .95<=detail['pawLengthRatioToPass2']<=1.05 and .95<=detail['pawStanceRatioToPass2']<=1.05
    lookdev.setup_scene(engine='CYCLES')
    if body.data.has_custom_normals:body.data.normals_split_custom_set([(0,0,0)]*len(body.data.loops))
    for n,c in {**legcam.frame_paws(),**legcam.frame_legs()}.items():lookdev.render(c,str(OUT/'renders'/f'{TAG}_{n}.png'),1024)
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
        bm=bmesh.new();bm.from_mesh(part.data);hind=group_sum(names,W,'leg_h');bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not(hind[v.index]>.35 and v.co.z<.535)],context='VERTS');bm.to_mesh(part.data);bm.free()
        cc=[sk.evaluated_copy(c,c.name+'_part') for c in claws];export(OUT/'hindlegs_part.glb',[part]+cc,False)
        for o in [part]+cc:bpy.data.objects.remove(o,do_unlink=True)
    (OUT/f'blender_log_{TAG}.json').write_text(json.dumps({'blenderSeconds':time.time()-T0,'buildId':'B-gsn9'},indent=2))


def audit3():
    body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];P=sk.co(body)
    meshes=[o for o in bpy.data.objects if o.type=='MESH'];rn=[o.name for o in meshes if o!=body]
    now={n:np.array([tuple(bpy.data.objects[n].matrix_world@v.co) for v in bpy.data.objects[n].data.vertices]) for n in rn}
    n,W=wm(body);bones={b.name:np.array([b.head_local[:],b.tail_local[:]]) for b in rig.data.bones}
    with bpy.data.libraries.load(str(OUT.parent/'pass2'/'hindlegs.blend'),link=False) as (src,dst):dst.objects=['luceras_blockout','luceras_rig']+rn
    base,br,*rigids=dst.objects
    for obj in dst.objects:bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.update()
    Q=sk.co(base);bn,BW=wm(base)
    assert P.shape==Q.shape and n==bn
    dP=np.linalg.norm(P-Q,axis=1)
    allowed=(np.abs(Q[:,0])>.065)&(Q[:,1]>.04)&(Q[:,1]<.210)&(Q[:,2]<.065)&(group_sum(bn,BW,'leg_h')>.5)
    d={'buildId':'B-gsn9','bodyMeshCount':sum(any(m.type=='ARMATURE' for m in o.modifiers) for o in meshes),'meshObjects':[o.name for o in meshes],'headPartAbsent':not any('head_part' in o.name for o in meshes),'bodyVertices':len(P),'sameTopology':len(body.data.polygons)==len(base.data.polygons) and all(tuple(a.vertices)==tuple(b.vertices) for a,b in zip(body.data.polygons,base.data.polygons)),
       'protectedMaxDisplacementM':float(dP[~allowed].max()),'protectedMeanDisplacementM':float(dP[~allowed].mean()),'above65mmMaxDisplacementM':float(dP[Q[:,2]>=.065].max()),'heelMaxDisplacementM':float(dP[(Q[:,1]>=.210)&(Q[:,2]<.065)].max()),
       'skinWeightMaxDifference':float(np.max(np.abs(W-BW))),'jointMaxDisplacementM':max(float(np.linalg.norm(bones[b.name]-np.array([b.head_local[:],b.tail_local[:]]))) for b in br.data.bones),'rigJointCount':len(rig.data.bones),'rigidDisplacementM':{n:float(np.linalg.norm(now[n]-np.array([tuple(o.matrix_world@v.co) for v in o.data.vertices]),axis=1).max()) for n,o in zip(rn,rigids)},
       'clawParents':{o.name:{'parent':o.parent.name,'type':o.parent_type,'bone':o.parent_bone} for o in meshes if o.name.startswith('hind_claw_')},'nonManifoldEdges':sk.nonmanifold_edges(body),'maxInfluencesPerVertex':max(len(v.groups) for v in body.data.vertices),'auditBlenderSeconds':time.time()-T0}
    assert d['bodyMeshCount']==1 and len(meshes)==15 and d['headPartAbsent'] and d['sameTopology']
    assert d['nonManifoldEdges']==0 and d['protectedMaxDisplacementM']==0 and d['jointMaxDisplacementM']==0 and d['skinWeightMaxDifference']==0
    (OUT/'audit_rigid_diagnostic.json').write_text(json.dumps(d,indent=2))
    assert max(d['rigidDisplacementM'].values())==0 and d['maxInfluencesPerVertex']<=4
    assert all(v['type']=='BONE' and v['bone'] in ('leg_hl_03','leg_hr_03') for v in d['clawParents'].values())
    from mathutils.bvhtree import BVHTree
    body.data.calc_loop_triangles()
    local=[tuple(f.vertices) for f in body.data.loop_triangles if all(P[v,0]>.065 and .04<P[v,1]<.21 and P[v,2]<.065 for v in f.vertices)]
    bv=BVHTree.FromPolygons([Vector(v) for v in P],local,all_triangles=True)
    overlaps=[(a,b) for a,b in bv.overlap(bv) if a<b and not set(local[a]).intersection(local[b])]
    d['pawNonAdjacentTriangleOverlapCandidates']=len(overlaps)
    d['overlapCandidateCenters']=[np.mean(P[list(local[a])],axis=0).tolist() for a,b in overlaps[:30]]
    (OUT/'saved_file_audit.json').write_text(json.dumps(d,indent=2))
if '--audit3' in ARGS:audit3()
elif '--pass3' in ARGS:main3()
elif '--diagnostic' in ARGS:diagnostic()
elif '--audit' in ARGS:audit2()
else:
    main2()
    if FINAL:diagnostic()
