"""B-xcbx hind leg sculpt. CPU only. Base-surface brushes and locally remeshed authored paws."""
import sys,json,time,math
from pathlib import Path
HERE=Path(__file__).resolve().parent
def compose_review():
    from PIL import Image,ImageDraw,ImageFont
    out=Path(sys.argv[sys.argv.index("--out")+1]) if "--out" in sys.argv else Path("pass1")
    inp=out.parent/"inputs";(out/"references").mkdir(exist_ok=True)
    font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",24)
    refs={"leg_side":("clay_side.png",(390,310,1035,1060)),"leg_three_quarter_rear":("clay_three_quarter.png",(410,310,1025,1070)),"leg_rear":("clay_front.png",(600,340,990,1050)),"leg_front_three_quarter":("clay_three_quarter.png",(410,310,1025,1070))}
    def compose(a,b,path,left_label,right_label):
        a=Image.open(a).convert("RGB");b=Image.open(b).convert("RGB")
        b=b.resize((round(b.width*a.height/b.height),a.height),Image.Resampling.LANCZOS)
        im=Image.new("RGB",(a.width+b.width,a.height+52),(25,27,30))
        im.paste(a,(0,52));im.paste(b,(a.width,52));d=ImageDraw.Draw(im)
        d.text((18,12),left_label,font=font,fill="white");d.text((a.width+12,12),right_label,font=font,fill="white");im.save(path)
    for view,(name,box) in refs.items():
        crop=out/"references"/f"{view}_clay_crop.png";Image.open(inp/name).crop(box).save(crop)
        for render in sorted((out/"renders").glob(f"*_{view}.png")):
            tag=render.name[:-len("_"+view+".png")]
            label="Clay authority" if view in ("leg_side","leg_front_three_quarter") else "Clay authority (no rear reference supplied)"
            name=f"composite_{view}_vs_clay.png" if tag=="final" else f"composite_{tag}_{view}_vs_clay.png"
            compose(render,crop,out/name,f"B-xcbx {tag} | {view}",label)
    if (out/"renders"/"full_side_left.png").exists():
        compose(out/"renders"/"full_side_left.png",inp/"furred_side.png",out/"composite_full_side_vs_furred.png","B-xcbx | full side","Furred placement reference")
    tags=["iter1","iter12","iter23"]
    if not (out/"renders"/"iter23_leg_side.png").exists():
        tags[-1]=max([p.name.split("_")[0] for p in (out/"renders").glob("iter*_leg_side.png")],key=lambda x:int(x[4:]))
    captions=["Base-surface muscle borders and belly tuck","Four toes; hock and sole review","Reconstructed ankle joined to authored digits"]
    canvas=Image.new("RGB",(1536,564),(25,27,30));d=ImageDraw.Draw(canvas);small=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",17)
    for i,(tag,cap) in enumerate(zip(tags,captions)):
        im=Image.open(out/"renders"/f"{tag}_leg_side.png").resize((512,512),Image.Resampling.LANCZOS)
        canvas.paste(im,(512*i,52));d.text((512*i+10,8),tag,font=small,fill="white");d.text((512*i+10,29),cap,font=small,fill="white")
    canvas.save(out/"progress.png")
if "--compose" in sys.argv:
    compose_review();sys.exit(0)

sys.path[:0]=[str(HERE),str(HERE.parent/"roster")]
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
import sculptkit as sk,lookdev,legcam
T0=time.time()
ARGS=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
def arg(k,d):return ARGS[ARGS.index(k)+1] if k in ARGS else d
OUT=Path(arg("--out","/mnt/c/dev/art-data/pipeline/codex-stream/luceras-hindlegs/pass1"))
STAGE=int(arg("--stage","24")); TAG=arg("--tag","final" if "--final" in ARGS else f"iter{STAGE}"); FINAL="--final" in ARGS
OUT.mkdir(exist_ok=True); (OUT/"renders").mkdir(exist_ok=True)
LOG={}
def log(s):print(f"[{time.time()-T0:.1f}s] {s}",flush=True)
def ss(t):
    t=np.clip(t,0,1);return t*t*(3-2*t)
def wm(o):
    names=[g.name for g in o.vertex_groups];W=np.zeros((len(o.data.vertices),len(names)))
    for v in o.data.vertices:
        for g in v.groups:W[v.index,g.group]=g.weight
    return names,W
def group_sum(names,W,prefix):return W[:,[i for i,n in enumerate(names) if n.startswith(prefix)]].sum(1)
def point(tree,y,z):
    h=tree.ray_cast(Vector((.5,y,z)),Vector((-1,0,0)))
    return np.array((h[0] if h[0] is not None else tree.find_nearest(Vector((.13,y,z)))[0])[:])
def brush_line(body,line,amount,width,mask):
    tree=sk.bvh(body)
    pts=[point(tree,y,z) for y,z in line]
    sk.ridge(body,pts,amount,width,mask,taper=[.15]+[1.]*(len(pts)-2)+[.15])
def sculpt(body,P0,names,W):
    P=P0; hind=group_sum(names,W,"leg_h"); tail=group_sum(names,W,"tail_");fore=group_sum(names,W,"leg_f")
    # Upper attachment band, including the thigh-front belly seam.
    band=(P[:,1]>.075)&(P[:,1]<.335)&(P[:,2]>.335)&(P[:,2]<.535)&(tail<.15)&(fore<.1)
    leg=(hind>.5)&(P[:,2]<.46)&(tail<.1)
    allowed=band|leg
    m=ss((P[:,1]-.075)/.045)*ss((.335-P[:,1])/.025)*ss((.535-P[:,2])/.045)
    m*=allowed*(P[:,0]>0)
    sk.taubin(body,8,m)
    # Remove the reconstruction streak across the lateral thigh before adding muscle borders.
    q=(P-np.array([.137,.218,.433]))/np.array([.05,.065,.085])
    w=np.maximum(0,1-(q*q).sum(1))**2*m
    sk.smooth(body,26,.45,w)
    tree=sk.bvh(body)
    # Deep rear mass and front quadriceps, both formed from the reconstruction.
    for y,z,radii,amp in [(.245,.423,(.085,.09,.10),.009),(.160,.408,(.06,.055,.105),.007),(.151,.327,(.05,.035,.037),.005)]:
        before=sk.co(body);sk.bulge(body,point(tree,y,z),radii,amp);after=sk.co(body);sk.set_co(body,before+(after-before)*m[:,None])
    strength=1 if STAGE<3 else 0.9
    brush_line(body,[(.21,.505),(.230,.470),(.235,.438),(.215,.405),(.190,.370),(.158,.338)],-.0065*strength,.014,m)
    brush_line(body,[(.278,.470),(.286,.431),(.275,.391),(.244,.356),(.212,.330)],-.0045*strength,.012,m)
    # Patella edge and front plane of the knee.
    brush_line(body,[(.141,.347),(.139,.326),(.151,.308),(.173,.294)],.0045,.009,m)
    brush_line(body,[(.166,.314),(.185,.301),(.202,.291)],-.0035,.007,m)
    Q=sk.co(body)
    knee=np.exp(-((P[:,2]-.326)/.014)**2-((P[:,1]-.137)/.021)**2)*m
    Q[:,1]-=.006*knee
    sk.set_co(body,Q)
    # Lean gaskin with a separated rear tendon.
    brush_line(body,[(.218,.301),(.247,.267),(.272,.227),(.286,.194)],.0048*strength,.009,m)
    brush_line(body,[(.230,.294),(.258,.259),(.282,.219),(.292,.194)],-.0038*strength,.0065,m)
    before=sk.co(body);sk.bulge(body,point(sk.bvh(body),.300,.187),(.035,.020,.017),.0060);sk.set_co(body,before+(sk.co(body)-before)*m[:,None])
    Q=sk.co(body);hh=np.exp(-((Q[:,2]-.183)/.024)**2-((Q[:,1]-.284)/.033)**2)*m
    Q[:,0]+=(.0846-Q[:,0])*.28*hh
    # Faceted calcaneal envelope: a distinct rear point, not a spherical side bulge.
    hz=np.linspace(.145,.220,31);back=[]
    for z in hz:
        sel=(Q[:,0]>0)&(abs(Q[:,2]-z)<.003)&(Q[:,1]>.24)&(Q[:,1]<.335)
        back.append(float(Q[sel,1].max()) if sel.any() else .30)
    target=np.interp(Q[:,2],[.145,.165,.185,.200,.220],[.282,.300,.317,.308,.300])
    oldback=np.interp(Q[:,2],hz,back)
    fac=ss((Q[:,1]-oldback+.022)/.022)*ss((Q[:,2]-.145)/.012)*ss((.220-Q[:,2])/.012)*m
    Q[:,1]+=(target-oldback)*fac*np.exp(-((Q[:,0]-.0846)/.020)**2)
    sk.set_co(body,Q)
    # Blend transverse reconstruction bumps below the hock into the lengthwise shaft.
    q=(sk.co(body)-np.array([.085,.295,.170]))/np.array([.04,.035,.023])
    sk.smooth(body,24,.45,np.maximum(0,1-(q*q).sum(1))**2*m)
    q=(sk.co(body)-np.array([.085,.260,.143]))/np.array([.05,.065,.048])
    w=np.maximum(0,1-(q*q).sum(1))**2*m
    sk.smooth(body,22,.45,w)
    # Long metatarsal cord, ending in the extensor fan above the paw.
    brush_line(body,[(.264,.167),(.248,.135),(.227,.102),(.203,.070),(.180,.049)],.0044*strength,.006,m)
    brush_line(body,[(.276,.159),(.259,.126),(.239,.095),(.215,.066)],-.0028*strength,.005,m)
    # Raise the seam by up to 24 mm at its old low point. Finite support is the declared band.
    Q=sk.co(body);r=ss((P[:,1]-.075)/.033)*ss((.165-P[:,1])/.033)*ss((.445-P[:,2])/.065)
    r*=band*ss((P[:,2]-.335)/.012)
    Q[:,2]+=.024*r
    sk.set_co(body,Q)
    sk.taubin(body,2,m)
    if STAGE>=3:
        # Smooth the seam only, without broadening the protected-region mask.
        q=sk.co(body);w=ss((P[:,1]-.075)/.02)*ss((.18-P[:,1])/.025)*ss((.45-P[:,2])/.035)*band
        sk.taubin(body,18,w)
    # Preserve the original attachment and use the left sculpt as the right surface authority.
    Q=sk.co(body)
    left=body.copy();left.data=body.data.copy();bpy.context.collection.objects.link(left)
    sk.cut_keep(left,(0,0,0),(1,0,0),True,False)
    tree=sk.bvh(left)
    idx=np.where((P[:,0]<-.03)&allowed)[0]
    for i in idx:
        p=Vector((-Q[i,0],Q[i,1],Q[i,2]));hit=tree.find_nearest(p)
        if hit[0] is not None:
            a=np.array(hit[0][:]);a[0]*=-1
            # exact projection in free leg; taper only at torso attachment edges
            fac=1. if leg[i] and P[i,2]<.43 else float(mirror_fade(P[i]))
            Q[i]+=fac*(a-Q[i])
    sk.set_co(body,Q);bpy.data.objects.remove(left,do_unlink=True)
    LOG["declaredBand"]={"boundsM":{"y":[.075,.335],"z":[.335,.535]},"additionalLimits":"base tail weight <0.15 and foreleg weight <0.1","blend":"45 mm upper attachment fade; 33 mm belly seam ramp","legRegion":"hind bone weight >0.5, z<0.46, tail weight<0.1"}
    return allowed,band,leg
def mirror_fade(p):return ss((p[1]-.075)/.045)*ss((.335-p[1])/.025)*ss((.535-p[2])/.045)
def loft(name,rows,segments=32):
    # rows: center xyz, half-width x, half-height z; sections perpendicular to Y.
    V=[];F=[]
    for x,y,z,rx,rz in rows:
        for j in range(segments):
            t=2*math.pi*j/segments;V.append((x+rx*math.cos(t),y,z+rz*math.sin(t)))
    for i in range(len(rows)-1):
        for j in range(segments):
            a=i*segments+j;b=i*segments+(j+1)%segments;F.append((a,b,b+segments,a+segments))
    F.append(tuple(reversed(range(segments))));F.append(tuple((len(rows)-1)*segments+j for j in range(segments)))
    o=sk.mesh_from(name,V,F)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
    return o
def cut_z(obj,z,above):
    # Only hind ankles, away from forelegs and tail.
    sk.cut_keep(obj,(0,0,z),(0,0,1),above,False,region=lambda p:p.y>.025 and p.y<.34)
def ordered_boundary(bm,sx):
    es=[e for e in bm.edges if e.is_boundary and all(v.co.x*sx>0 and .025<v.co.y<.34 and v.co.z<.1 for v in e.verts)]
    if not es:return []
    adj={}
    for e in es:
        a,b=e.verts;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
    start=min(adj,key=lambda v:v.index);loop=[start];prev=None;cur=start
    for _ in range(len(adj)+2):
        nxt=[v for v in adj[cur] if v!=prev][0]
        if nxt==start:break
        loop.append(nxt);prev,cur=cur,nxt
    if len(loop)!=len(adj):raise RuntimeError(f"multiple boundary loops {len(loop)} / {len(adj)}")
    return loop
def stitch(bm,A,B):
    # Match winding and use angular monotone zipper triangles between unequal rings.
    center=sum((v.co for v in A),Vector())/len(A)
    def sort(loop):return sorted(loop,key=lambda v:math.atan2(v.co.y-center.y,v.co.x-center.x))
    A,B=sort(A),sort(B);i=j=0;n=len(A);m=len(B)
    while i<n or j<m:
        if i<n and (j==m or (i+1)/n<(j+1)/m):
            vs=(A[i%n],A[(i+1)%n],B[j%m]);i+=1
        else:vs=(A[i%n],B[(j+1)%m],B[j%m]);j+=1
        bm.faces.new(vs)
def make_paws(body,rig):
    log("authoring local paw")
    # Keep a short cuff of the existing left ankle for the remesh union.
    cuff=body.copy();cuff.data=body.data.copy();bpy.context.collection.objects.link(cuff);cuff.name="paw_cuff"
    bm=bmesh.new();bm.from_mesh(cuff.data)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x<=0 or v.co.y<.025 or v.co.y>.34 or v.co.z>.11],context="VERTS")
    bm.to_mesh(cuff.data);bm.free()
    sk.cut_keep(cuff,(0,.135,0),(0,1,0),True,True)
    # Retain the reconstructed ankle and heel. Lower its old toe-root plate into the authored digits.
    cp=sk.co(cuff);cp[:,2]*=1-.70*ss((.19-cp[:,1])/.055)*ss((.075-cp[:,2])/.035);sk.set_co(cuff,cp)
    parts=[cuff]
    # Rounded heel and ankle volume overlaps the reconstruction cuff by 12 mm.
    V=[];F=[];seg=32
    for z,x,y,rx,ry in [(.098,.103,.226,.023,.027),(.085,.108,.218,.026,.029),(.070,.114,.211,.028,.031),(.050,.120,.205,.027,.030),(.030,.125,.200,.029,.031),(.014,.128,.195,.026,.028),(.006,.128,.194,.018,.022)]:
        for j in range(seg):
            t=2*math.pi*j/seg;V.append((x+rx*math.cos(t),y+ry*math.sin(t),z))
    for i in range(6):
        for j in range(seg):
            a=i*seg+j;b=i*seg+(j+1)%seg;F.append((a,b,b+seg,a+seg))
    F.extend([tuple(reversed(range(seg))),tuple(6*seg+j for j in range(seg))])
    ankle=sk.mesh_from("paw_heel",V,F)
    bm=bmesh.new();bm.from_mesh(ankle.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(ankle.data);bm.free();sk.cut_keep(ankle,(0,0,.037),(0,0,1),False,True);parts.append(ankle)
    parts.append(loft("paw_palm",[(.119,.237,.026,.001,.001),(.119,.229,.027,.014,.016),(.121,.209,.031,.025,.027),(.131,.180,.027,.032,.023),(.144,.157,.024,.039,.020),(.146,.143,.023,.030,.016),(.146,.134,.022,.015,.010)]))
    claws=[]
    for j,(x,tip) in enumerate(zip([.108,.134,.160,.184],[.060,.046,.048,.063])):
        rows=[]
        for t in np.linspace(0,1,22):
            y=.178+(.012+tip-.178)*t
            xx=(.140+(x-.140)*.7)*(1-t)+x*t
            width=.0105*(1-.23*t)+.0015*np.exp(-((t-.56)/.18)**2)
            height=.011+ .0035*np.exp(-((t-.53)/.20)**2)+.0017*np.exp(-((t-.86)/.14)**2)
            z=.014+.004*(1-t)+.002*np.sin(math.pi*t)+.0015*np.exp(-((t-.53)/.22)**2)
            rows.append((xx,y,z,width,height))
        parts.append(loft(f"toe_{j}",rows,24))
        # Distinct ventral pad lobes, unioned into the toe.
        pad=sk.sphere(f"pad_{j}",(x,tip+.033,.009),1,24,12);pad.scale=(.008,.015,.007);parts.append(pad)
        pts=np.array([(x,tip+.018,.020),(x,tip+.010,.022),(x,tip+.001,.018),(x,tip-.005,.010),(x,tip-.007,.006)])
        claw,_=sk.sweep(f"hind_claw_l_{j+1}",pts,lambda i,t: [.007,.0068,.0048,.0028,.0004][i],segments=20)
        claws.append(claw)
    
    parts.append(loft("plantar_pad",[(.125,.227,.011,.004,.004),(.125,.215,.010,.018,.008),(.140,.180,.010,.032,.008),(.147,.145,.010,.037,.008),(.147,.128,.011,.027,.008),(.147,.118,.012,.008,.004)],32))
    bpy.context.view_layer.update()
    paw=sk.join(parts,"local_paw")
    for o in parts:bpy.data.objects.remove(o,do_unlink=True)
    log(f"paw bounds {sk.co(paw).min(0)} {sk.co(paw).max(0)}");sk.voxel_remesh(paw,.0018);sk.keep_largest(paw);sk.smooth(paw,20,.5);sk.taubin(paw,4,np.ones(len(paw.data.vertices)))
    bpy.context.view_layer.objects.active=paw
    dec=paw.modifiers.new("local_paw_budget","DECIMATE");dec.ratio=.60
    with bpy.context.temp_override(object=paw,active_object=paw):bpy.ops.object.modifier_apply(modifier=dec.name)
    sk.smooth(paw,4,.35,(sk.co(paw)[:,1]<.18).astype(float))
    Ppaw=sk.co(paw);Ppaw[:,2]-=(Ppaw[:,2].min()-.0002)*ss((.045-Ppaw[:,2])/.025);sk.set_co(paw,Ppaw)
    sk.cut_keep(paw,(0,0,.073),(0,0,1),False,False)
    # Remove both old feet, retaining all other original vertices.
    cut_z(body,.078,True)
    bm=bmesh.new();bm.from_mesh(body.data)
    for sx in (1,-1):
        A=ordered_boundary(bm,sx)
        old=set(bm.verts)
        me=paw.data.copy()
        if sx<0:
            from mathutils import Matrix
            me.transform(Matrix.Diagonal((-1,1,1,1)))
        bm.from_mesh(me);bpy.data.meshes.remove(me)
        fresh=set(bm.verts)-old
        B=list({v for e in bm.edges if e.is_boundary and all(v in fresh for v in e.verts) for v in e.verts})
        stitch(bm,A,B)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free();bpy.data.objects.remove(paw,do_unlink=True)
    # Blend the collar and ankle transition with finite support below the old ankle.
    P=sk.co(body);w=((P[:,1]>.025)&(P[:,1]<.34))*ss((.10-P[:,2])/.025)*ss((P[:,2]-.035)/.025)
    sk.smooth(body,16,.45,w)
    # Taper the reconstructed low shaft into the authored paw without shifting its axis.
    P=sk.co(body);zs=np.arange(.045,.141,.005);cx=[];cy=[]
    for z in zs:
        sel=(P[:,0]>0)&(P[:,1]>.15)&(P[:,1]<.31)&(abs(P[:,2]-z)<.003)
        cx.append(float((P[sel,0].min()+P[sel,0].max())/2));cy.append(float((P[sel,1].min()+P[sel,1].max())/2))
    w=.22*ss((P[:,2]-.04)/.025)*ss((.135-P[:,2])/.03)*((P[:,0]>0)&(P[:,1]>.15)&(P[:,1]<.31))
    P[:,0]+=(np.interp(P[:,2],zs,cx)-P[:,0])*w
    P[:,1]+=(np.interp(P[:,2],zs,cy)-P[:,1])*w
    sk.set_co(body,P)
    # Round the lateral heel flare into the lean ankle; keep ground-contact and toe positions.
    P=sk.co(body)
    w=.28*np.exp(-((P[:,1]-.218)/.028)**2)*ss((P[:,2]-.008)/.016)*ss((.075-P[:,2])/.030)*(P[:,0]>0)
    P[:,0]+=(.128-P[:,0])*w;sk.set_co(body,P)
    # Lower the broad dorsal web so knuckles rise above a low long paw.
    P=sk.co(body)
    w=(P[:,0]>0)*ss((.073-P[:,2])/.018)*ss((P[:,2]-.016)/.024)*np.exp(-((P[:,1]-.155)/.048)**2)
    P[:,2]-=.007*w;sk.set_co(body,P)
    q=(P-np.array([.128,.222,.020]))/np.array([.05,.030,.028])
    sk.smooth(body,14,.4,np.maximum(0,1-(q*q).sum(1))**2*(P[:,0]>0))
    # Extensor fan authored as brushes on the united paw surface.
    tree=sk.bvh(body)
    for x,tip in zip([.108,.134,.160,.184],[.060,.046,.048,.063]):
        pts=[]
        for t in np.linspace(0,1,12):
            xx=.113*(1-t)+x*t;y=.223*(1-t)+(tip+.020)*t
            h=tree.ray_cast(Vector((xx,y,.15)),Vector((0,0,-1)))
            if h[0] is not None:pts.append(np.array(h[0][:]))
        if len(pts)>1:sk.ridge(body,pts,.0024,.004,((sk.co(body)[:,0]>0)&(sk.co(body)[:,2]<.135)).astype(float),taper=np.sin(np.linspace(0,math.pi,len(pts))))
    # Shift the low ankle only 11 mm toward the hock, keeping the long bone axes fixed.
    P=sk.co(body)
    w=((P[:,0]>0)&(P[:,1]>.13)&(P[:,1]<.34))*ss((P[:,1]-.13)/.055)*ss((.15-P[:,2])/.10)*ss((P[:,2]-.005)/.020)
    P[:,1]+=.011*w
    P[:,0]+=.004*((P[:,0]>0)&(P[:,1]>.025)&(P[:,1]<.34))*ss((.12-P[:,2])/.055)
    sk.set_co(body,P)
    for c in list(claws):
        cp=sk.co(c);cp[:,0]+=.004;sk.set_co(c,cp)
        r=bpy.data.objects.new(c.name.replace("_l_","_r_"),c.data.copy());bpy.context.collection.objects.link(r)
        a=sk.co(r);a[:,0]*=-1;sk.set_co(r,a)
        bm=bmesh.new();bm.from_mesh(r.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(r.data);bm.free()
        sk.bone_parent(c,rig,"leg_hl_03");sk.bone_parent(r,rig,"leg_hr_03");claws.append(r)
    return claws
def reflect_free_leg(body,protected_points):
    names,W=wm(body);wl=group_sum(names,W,"leg_hl");wr=group_sum(names,W,"leg_hr")
    P=sk.co(body)
    ml=(P[:,0]>.001)&(wl>.55)&(P[:,2]<.51)
    mr=np.zeros(len(P),dtype=bool)
    # Both attachment collars lie inside the declared thigh seam band.
    bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table()
    frozen_co={tuple(p) for p in protected_points}
    frozen={v for v in bm.verts if tuple(v.co) in frozen_co}
    faces=[f for f in bm.faces if all(v.co.x>0 for v in f.verts) and any(ml[v.index] for v in f.verts)]
    verts={v for f in faces for v in f.verts}
    # Extract left patch in its original topology, then reflect its coordinates.
    lookup={v:i for i,v in enumerate(verts)}
    core_indices={lookup[v] for v in verts if wl[v.index]>.65}
    coords=[(-v.co.x,v.co.y,v.co.z) for v in verts]
    fs=[tuple(reversed([lookup[v] for v in f.verts])) for f in faces]
    expanded=set(verts)
    for _ in range(3):
        expanded|={e.other_vert(v) for v in list(expanded) for e in v.link_edges if e.other_vert(v).co.x>0}
    kd=KDTree(sum(v.co.x>0 for v in bm.verts))
    for v in bm.verts:
        if v.co.x>0:kd.insert(v.co,v.index)
    kd.balance();expanded_ids={v.index for v in expanded}
    for v in bm.verts:
        if v.co.x<0:
            _,ix,_=kd.find(Vector((-v.co.x,v.co.y,v.co.z)))
            mr[v.index]=ix in expanded_ids and v not in frozen
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if mr[v.index]],context="VERTS")
    Aedges=[e for e in bm.edges if e.is_boundary]
    def walk(es):
        adj={}
        for e in es:
            a,b=e.verts;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
        if not adj or any(len(x)!=2 for x in adj.values()):raise RuntimeError("non-simple mirror collar")
        start=next(iter(adj));loop=[start];prev=None;cur=start
        for _ in range(len(adj)+1):
            nxt=[v for v in adj[cur] if v!=prev][0]
            if nxt==start:break
            loop.append(nxt);prev,cur=cur,nxt
        if len(loop)!=len(adj):raise RuntimeError(f"multiple mirror collar loops: {len(loop)} / {len(adj)}")
        return loop
    A=walk(Aedges)
    new=[bm.verts.new(v) for v in coords]
    for f in fs:bm.faces.new([new[i] for i in f])
    fresh=set(new);fixed_core={new[i] for i in core_indices};B=walk([e for e in bm.edges if e.is_boundary and all(v in fresh for v in e.verts)])
    # Orient and phase the matching nonplanar loops by their closest correspondence.
    ia,ib=min(((i,j) for i in range(len(A)) for j in range(len(B))),key=lambda ij:(A[ij[0]].co-B[ij[1]].co).length_squared)
    A=A[ia:]+A[:ia];B=B[ib:]+B[:ib]
    if (A[1].co-B[1].co).length+(A[-1].co-B[-1].co).length > (A[1].co-B[-1].co).length+(A[-1].co-B[1].co).length:
        B=[B[0]]+list(reversed(B[1:]))
    def lengths(loop):
        d=np.array([(loop[(i+1)%len(loop)].co-loop[i].co).length for i in range(len(loop))])
        return np.r_[0,np.cumsum(d)]/d.sum()
    aa,bb=lengths(A),lengths(B);i=j=0;n=len(A);m=len(B)
    while i<n or j<m:
        if i<n and (j==m or aa[i+1]<bb[j+1]):
            tri=(A[i%n],A[(i+1)%n],B[j%m]);i+=1
        else:tri=(A[i%n],B[(j+1)%m],B[j%m]);j+=1
        bm.faces.new(tri)
    # Relax the annular attachment strip, leaving the exact reflected free leg fixed.
    collar=set(A+B)
    for _ in range(3):collar|={e.other_vert(v) for v in list(collar) for e in v.link_edges}
    collar={v for v in collar if v not in frozen and v not in fixed_core and .075<v.co.y<.335 and .335<v.co.z<.535}
    for _ in range(20):bmesh.ops.smooth_vert(bm,verts=list(collar),factor=.35,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    # Reproject only the relaxed collar to the left surface, retaining the fixed outer band.
    leftfaces=[f for f in bm.faces if all(v.co.x>=0 for v in f.verts)]
    lv=list({v for f in leftfaces for v in f.verts});li={v:i for i,v in enumerate(lv)}
    from mathutils.bvhtree import BVHTree
    tree=BVHTree.FromPolygons([v.co for v in lv],[[li[v] for v in f.verts] for f in leftfaces])
    for v in collar:
        if v.co.x>-.03:continue
        h=tree.find_nearest(Vector((-v.co.x,v.co.y,v.co.z)))
        if h[0] is not None:
            target=Vector((-h[0].x,h[0].y,h[0].z))
            fac=ss((.535-v.co.z)/.025)*ss((v.co.y-.075)/.025)*ss((.335-v.co.y)/.025)
            v.co=v.co.lerp(target,float(fac))
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
    LOG["mirrorTopology"]={"mirroredVertices":len(coords),"mirroredFaces":len(fs),"attachmentCollarVertices":[len(A),len(B)],"definition":"left hind weight >.55 below z .51 reflected exactly; right hole extends three topology rings beyond reflected left patch; six-ring attachment collar relaxed inside band"}
    log(f"reflected {len(coords)} leg vertices")

def clean_local_topology(body):
    bm=bmesh.new();bm.from_mesh(body.data)
    wires=[e for e in bm.edges if not e.link_faces]
    bmesh.ops.delete(bm,geom=wires,context="EDGES")
    loose=[v for v in bm.verts if not v.link_edges]
    bmesh.ops.delete(bm,geom=loose,context="VERTS")
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
def transfer_weights(body,source):
    # Nearest-surface barycentric interpolation; retained base points recover original weights.
    names,W=wm(source);source.data.calc_loop_triangles()
    tris=np.array([t.vertices[:] for t in source.data.loop_triangles]);P=sk.co(source)
    from mathutils.bvhtree import BVHTree
    tree=BVHTree.FromPolygons([Vector(p) for p in P],tris.tolist(),all_triangles=True)
    body.vertex_groups.clear()
    gs=[body.vertex_groups.new(name=n) for n in names]
    for v in body.data.vertices:
        q,normal,index,dist=tree.find_nearest(v.co)
        ids=tris[index];a,b,c=P[ids];u=b-a;vv=c-a;r=np.array(q)-a
        den=(u@u)*(vv@vv)-(u@vv)**2
        beta=((vv@vv)*(r@u)-(u@vv)*(r@vv))/max(den,1e-20)
        gamma=((u@u)*(r@vv)-(u@vv)*(r@u))/max(den,1e-20)
        w=np.maximum(0,np.array([1-beta-gamma,beta,gamma]))@W[ids]
        idx=np.argsort(w)[-4:];s=w[idx].sum()
        for i in idx:
            if w[i]>1e-8:gs[i].add([v.index],float(w[i]/s),"REPLACE")
def export(path,objs,skin=True):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,export_skins=skin,export_animations=False,export_apply=False)
def detailed_metrics(body,rig,P0,allowed,band,names,W,soft):
    P=sk.co(body);tree=sk.bvh(body)
    fn,fw=wm(body)
    def angle(a,b,c):
        u=(np.array(a)-b)[1:];v=(np.array(c)-b)[1:]
        return float(np.degrees(np.arccos(np.clip(u@v/(np.linalg.norm(u)*np.linalg.norm(v)),-1,1))))
    bones={n:rig.data.bones[n] for n in ["leg_hl_01","leg_hl_02","leg_hl_03"]}
    hip=np.array(bones["leg_hl_01"].head_local);knee=np.array(bones["leg_hl_02"].head_local);hock=np.array(bones["leg_hl_03"].head_local);tip=np.array(bones["leg_hl_03"].tail_local)
    def geometry_metrics(P,H):
        paw=P[(P[:,0]>.04)&(P[:,1]>.025)&(P[:,1]<.31)&(P[:,2]<.055)]
        sections=[]
        for z in np.arange(.345,.481,.005):
            q=P[(P[:,0]>.06)&(P[:,1]>.1)&(P[:,1]<.335)&(abs(P[:,2]-z)<.0025)&(H>.5)]
            if len(q)>5:sections.append((float(np.ptp(q[:,1])),float(z)))
        hp=P[(P[:,0]>.04)&(P[:,0]<.15)&(P[:,1]>.24)&(P[:,1]<.335)&(P[:,2]>.15)&(P[:,2]<.22)]
        point=hp[np.argmax(hp[:,1])]
        # Heel center at the low bend, sampled consistently on base and output.
        heel=P[(P[:,0]>.06)&(P[:,0]<.17)&(P[:,1]>.175)&(P[:,1]<.29)&(abs(P[:,2]-.03)<.003)]
        heel_center=np.array([(heel[:,0].min()+heel[:,0].max())/2,float(np.quantile(heel[:,1],.75)),.03])
        return {"thighDepthAtWidestM":max(sections)[0],"thighDepthSectionZ":max(sections)[1],"hockPoint":point.tolist(),"hockPointHeightM":float(point[2]),"pawLengthM":float(np.ptp(paw[:,1])),"pawWidthM":float(np.ptp(paw[:,0])),"pawMinZM":float(paw[:,2].min()),"pawCenterStanceWidthM":float(paw[:,0].min()+paw[:,0].max()),"heelCenterProxy":heel_center.tolist(),"metatarsusSurfaceProxyLengthM":float(np.linalg.norm(hock-heel_center)),"hockSurfaceProxyAngleDeg":angle(knee,hock,heel_center)}
    new=geometry_metrics(P,group_sum(fn,fw,"leg_hl"));base=geometry_metrics(P0,group_sum(names,W,"leg_hl"))
    tuck=[]
    for y in np.arange(.08,.141,.002):
        h=tree.ray_cast(Vector((0,float(y),-.1)),Vector((0,0,1)))
        if h[0] is not None:tuck.append([float(y),float(h[0].z)])
    roi=[v for v in tuck if .10<=v[0]<=.125]
    new["bellyTuckHeightM"]=max(z for y,z in roi);new["bellyTuckSamplesYZ"]=tuck
    new["bellyTuckDefinition"]="highest midline underline ray hit at y 0.100 to 0.125 m, immediately ahead of stifle"
    n2,w2=wm(body);hleft=group_sum(n2,w2,"leg_hl")
    asym={}
    for label,sel in {"freeLeg":(P[:,0]>0)&(hleft>.7)&(P[:,2]<.48),"legAndAttachmentBand":(P[:,0]>0)&(P[:,1]>.10)&(P[:,1]<.335)&(P[:,2]<.535)}.items():
        q=P[sel].copy();q[:,0]*=-1;ds=sk.nearest_dist(tree,q)
        asym[label]={"samples":len(q),"maxM":float(ds.max()),"meanM":float(ds.mean()),"p99M":float(np.quantile(ds,.99))}
    # Exact retention proof: every protected source vertex must still exist at its exact original coordinates.
    kd=KDTree(len(P))
    for i,p in enumerate(P):kd.insert(Vector(p),i)
    kd.balance()
    head=(P0[:,1]<-.1)|(W[:,[i for i,n in enumerate(names) if n.startswith(("head","neck","jaw","ear"))]].sum(1)>.5);fore=group_sum(names,W,"leg_f")>.5;tail=group_sum(names,W,"tail_")>.5
    trunk=(~allowed)&~head&~fore&~tail
    disp={}
    for label,mask in {"headNeck":head,"trunkOutsideBand":trunk,"forelegs":fore,"tail":tail,"allProtected":~allowed}.items():
        ds=np.array([kd.find(Vector(p))[2] for p in P0[mask]])
        disp[label]={"vertices":int(mask.sum()),"maxM":float(ds.max()),"meanM":float(ds.mean()),"exactRetainedVertices":int((ds<1e-10).sum()),"method":"source vertex to nearest output vertex, exact zero proves original coordinate retained"}
    ds=np.linalg.norm(soft[band]-P0[band],axis=1)
    disp["declaredBand"]={"vertices":int(band.sum()),"maxM":float(ds.max()),"meanM":float(ds.mean()),"method":"matched original vertex displacement before local paw remesh and reflected right patch replacement"}
    ds=sk.nearest_dist(tree,P0[band])
    disp["declaredBandFinalSurfaceDistance"]={"maxM":float(ds.max()),"meanM":float(ds.mean()),"method":"original band points to final triangle surface after topology changes"}
    bm=bmesh.new();bm.from_mesh(body.data)
    seen=set();components=0;component_details=[]
    for v in bm.verts:
        if v in seen:continue
        components+=1;stack=[v];seen.add(v);comp=[]
        while stack:
            a=stack.pop();comp.append(tuple(a.co))
            for e in a.link_edges:
                b=e.other_vert(a)
                if b not in seen:seen.add(b);stack.append(b)
        component_details.append({"vertices":len(comp),"bounds":[np.min(comp,axis=0).tolist(),np.max(comp,axis=0).tolist()]})
    degenerate=sum(f.calc_area()<1e-12 for f in bm.faces)
    degen_points=[list(f.calc_center_median()) for f in bm.faces if f.calc_area()<1e-12]
    bad_edges=[{"center":list((e.verts[0].co+e.verts[1].co)/2),"faces":len(e.link_faces)} for e in bm.edges if not e.is_manifold]
    volume=bm.calc_volume(signed=True);bm.free()
    return {"lengthsM":{n:float(b.length) for n,b in bones.items()},"lengthDefinitions":{"leg_hl_01":"hip to stifle","leg_hl_02":"stifle to hock","leg_hl_03":"hock to rig toe tip, includes metatarsus and paw"},"lengthRatioToBase":{n:1.0 for n in bones},"stifleAngleSideDeg":angle(hip,knee,hock),"hockRigAngleSideDeg":angle(knee,hock,tip),"stanceWidthM":float(2*tip[0]),"jointPositionsUnchanged":True,"rigJointCount":len(rig.data.bones),"geometry":new,"baseGeometry":base,"surfaceProxyRatios":{"metatarsus":new["metatarsusSurfaceProxyLengthM"]/base["metatarsusSurfaceProxyLengthM"],"pawCenterStance":new["pawCenterStanceWidthM"]/base["pawCenterStanceWidthM"]},"toeCountPerPaw":{"left":4,"right":4},"leftRightAsymmetry":asym,"displacement":disp,"nonManifoldEdgeDetails":bad_edges,"bodyConnectedComponents":components,"componentDetails":component_details,"degenerateFaceCenters":degen_points,"bodyDegenerateFaces":degenerate,"bodySignedVolumeM3":volume,"maxWeightSumError":float(np.abs(w2.sum(1)-1).max())}

def main():
    body=bpy.data.objects["luceras_blockout"];rig=bpy.data.objects["luceras_rig"];rig.data.pose_position="REST"
    assert not any("head_part" in o.name for o in bpy.data.objects)
    source=body.copy();source.data=body.data.copy();bpy.context.collection.objects.link(source);source.name="base_weight_source";source.hide_render=True
    log(f"body modifiers {[(m.name,m.type) for m in body.modifiers]}");P0=sk.co(body);names,W=wm(body)
    allowed,band,leg=sculpt(body,P0,names,W);Q=sk.co(body).copy()
    np.savez(OUT/f"{TAG}_soft.npz",P=Q,allowed=allowed,band=band,leg=leg)
    log("soft forms and symmetry")
    claws=make_paws(body,rig) if STAGE>=2 else []
    if STAGE>=2:transfer_weights(body,source)
    if STAGE>=4:
        reflect_free_leg(body,P0[~allowed])
        clean_local_topology(body)
        transfer_weights(body,source)
    log("weights transferred")
    rigid=[o for o in bpy.data.objects if o.type=="MESH" and o.parent==rig and o!=body and o!=source]
    detail=detailed_metrics(body,rig,P0,allowed,band,names,W,Q)
    bpy.data.objects.remove(source,do_unlink=True)
    lookdev.setup_scene(engine="CYCLES")
    for o in [body]+rigid:
        if o==body and STAGE>=5 and o.data.has_custom_normals:
            o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
        lookdev.apply_clay(o)
    cams=legcam.frame_legs()
    for n,c in cams.items():lookdev.render(c,str(OUT/"renders"/f"{TAG}_{n}.png"),size=1024)
    full=lookdev.frame_cameras([body]+rigid)
    lookdev.render(full["side_left"],str(OUT/"renders"/f"{TAG}_sprite_side_192.png"),size=192)
    log("review renders")
    P=sk.co(body); tree=sk.bvh(body)
    mir=P[(P[:,0]>0)&(P[:,1]>.10)&(P[:,1]<.33)&(P[:,2]<.43)].copy();mir[:,0]*=-1
    asym=sk.nearest_dist(tree,mir)
    np.savez(OUT/f"{TAG}_result.npz",P=P,mirror=mir,dist=asym)
    d=np.linalg.norm(Q-P0,axis=1)
    masks={"headNeck":P0[:,1]<-.10,"trunkOutsideBand":~allowed & (P0[:,2]>.335),"declaredBand":band,"forelegs":group_sum(names,W,"leg_f")>.5,"tail":group_sum(names,W,"tail_")>.5}
    meas={"buildId":"B-xcbx","declaredBand":LOG["declaredBand"],"displacement":{k:{"vertices":int(m.sum()),"maxM":float(d[m].max()),"meanM":float(d[m].mean())} for k,m in masks.items()},
    "triangles":{o.name:sk.tri_count(o) for o in [body]+rigid},"nonManifoldEdges":sk.nonmanifold_edges(body),"maxInfluencesPerVertex":max(len(v.groups) for v in body.data.vertices),"leftRightAsymmetry":{"maxM":float(asym.max()),"meanM":float(asym.mean()),"samples":len(mir),"method":"mirrored left surface vertices to right triangle surface; excludes attachment above z .43"}}
    meas["triangles"]["creatureTotal"]=sum(meas["triangles"].values())
    meas.update(detail)
    (OUT/f"measurements_{TAG}.json").write_text(json.dumps(meas,indent=2))
    if FINAL:(OUT/"measurements.json").write_text(json.dumps(meas,indent=2))
    if FINAL:
        assert meas["nonManifoldEdges"]==0 and meas["bodyConnectedComponents"]==1 and meas["bodyDegenerateFaces"]==0
        assert meas["triangles"]["creatureTotal"]<400000
        assert meas["maxInfluencesPerVertex"]<=4
        assert meas["displacement"]["allProtected"]["maxM"]==0
        assert all(.95<=v<=1.05 for v in meas["surfaceProxyRatios"].values())
        for n,c in full.items():lookdev.render(c,str(OUT/"renders"/f"full_{n}.png"),size=1024)
        lookdev.render(full["side_left"],str(OUT/"renders"/"sprite_side_192.png"),size=192)
    # Preserve intermediate blends for reproducible independent visual review.
    if FINAL:bpy.data.objects.remove(bpy.data.objects["lookdev_ground"],do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/("hindlegs.blend" if FINAL else f"{TAG}.blend")),compress=True)
    if FINAL:
        export(OUT/"hindlegs.glb",[body,rig]+rigid)
        part=bpy.data.objects.new("hindlegs_part",body.data.copy());bpy.context.collection.objects.link(part)
        bm=bmesh.new();bm.from_mesh(part.data)
        pn,pw=wm(body);hindpart=group_sum(pn,pw,"leg_h")
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not (hindpart[v.index]>.35 and v.co.z<.535)],context="VERTS")
        bm.to_mesh(part.data);bm.free()
        temp_claws=[sk.evaluated_copy(c,c.name+"_part") for c in claws]
        export(OUT/"hindlegs_part.glb",[part]+temp_claws,False)
        for o in [part]+temp_claws:bpy.data.objects.remove(o,do_unlink=True)
    LOG["blenderSeconds"]=time.time()-T0
    (OUT/f"blender_log_{TAG}.json").write_text(json.dumps(LOG,indent=2));log("done")
def audit_saved():
    import hashlib
    body=bpy.data.objects["luceras_blockout"];rig=bpy.data.objects["luceras_rig"]
    meshes=[o for o in bpy.data.objects if o.type=="MESH"]
    result={"meshObjects":[o.name for o in meshes],"bodyMeshCount":sum(any(m.type=="ARMATURE" for m in o.modifiers) for o in meshes),"bodyNonManifoldEdges":sk.nonmanifold_edges(body),"rigJoints":len(rig.data.bones),"headPartAbsent":not any("head_part" in o.name for o in bpy.data.objects),"clawParents":{o.name:{"object":o.parent.name if o.parent else None,"type":o.parent_type,"bone":o.parent_bone} for o in meshes if o.name.startswith("hind_claw_")},"maxInfluences":max(len(v.groups) for v in body.data.vertices)}
    orig=json.loads((OUT/"base_inventory.json").read_text())
    result["jointMaxDisplacementM"]=max(max(np.linalg.norm(np.array(b.head_local)-orig["bones"][b.name]["head"]),np.linalg.norm(np.array(b.tail_local)-orig["bones"][b.name]["tail"])) for b in rig.data.bones)
    rigid_names=["eye_l","eye_r","horn_l","horn_r","whiskers_l","whiskers_r"]
    current={n:sk.co(bpy.data.objects[n]).copy() for n in rigid_names}
    with bpy.data.libraries.load(str(OUT.parent/"inputs"/"base.blend"),link=False) as (src,dst):dst.objects=list(rigid_names)
    result["rigidGeometry"]={}
    for name,o in zip(rigid_names,dst.objects):
        before=sk.co(o);after=current[name]
        result["rigidGeometry"][name]={"vertexCount":len(after),"maxDisplacementM":float(np.linalg.norm(after-before,axis=1).max())}
    assert result["bodyMeshCount"]==1 and len(meshes)==15 and result["headPartAbsent"]
    assert result["bodyNonManifoldEdges"]==0 and result["rigJoints"]==40 and result["maxInfluences"]<=4
    assert result["jointMaxDisplacementM"]==0 and all(v["maxDisplacementM"]==0 for v in result["rigidGeometry"].values())
    result["auditBlenderSeconds"]=time.time()-T0
    (OUT/"saved_file_audit.json").write_text(json.dumps(result,indent=2))
if "--audit-saved" in ARGS:audit_saved()
else:main()

