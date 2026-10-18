"""B-8ezj: source-preserving QuadriFlow game mesh, baking and comparison evidence.

Run through run_gamemesh.sh. Stages are restartable from numbered checkpoints.
"""
import ast
import json
import math
import os
import sys
import time
import types
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

PIPE = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(PIPE / p) for p in ('roster', 'blockout', 'blender')]
import lookdev
_blockpath=PIPE/'blockout'/'build_blockout.py'
_blocktree=ast.parse(_blockpath.read_text())
_blocktree.body=[n for n in _blocktree.body if not (isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Name) and n.value.func.id=='main')]
block=types.ModuleType('blockout_reused');block.__file__=str(_blockpath)
exec(compile(_blocktree,str(_blockpath),'exec'),block.__dict__)
import clips

ITERATION=int(os.environ.get('GM_ITERATION','8'))
class IterationOutput:
    def __init__(self,path):self.path=Path(path)
    def __truediv__(self,name):return self.path/str(name).replace('iter1_',f'iter{ITERATION}_')
    def mkdir(self,**kwargs):return self.path.mkdir(**kwargs)
OUT = IterationOutput('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1')
SOURCE = '/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend'
ARGS = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
STAGE = ARGS[ARGS.index('--stage')+1] if '--stage' in ARGS else 'mesh'
OUT.mkdir(exist_ok=True)

def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2))

def select(o, others=()):
    bpy.ops.object.select_all(action='DESELECT')
    o.hide_set(False)
    o.select_set(True)
    for p in others:
        p.hide_set(False)
        p.select_set(True)
    bpy.context.view_layer.objects.active = o

def triangles(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)

def manifold(o):
    bm = bmesh.new(); bm.from_mesh(o.data)
    n = sum(not e.is_manifold for e in bm.edges)
    bm.free()
    return n

def components(o):
    adjacent=[[] for v in o.data.vertices]
    for e in o.data.edges:
        a,b=e.vertices;adjacent[a].append(b);adjacent[b].append(a)
    remaining=set(range(len(adjacent)));sizes=[]
    while remaining:
        start=remaining.pop();stack=[start];size=1
        while stack:
            for n in adjacent[stack.pop()]:
                if n in remaining:remaining.remove(n);stack.append(n);size+=1
        sizes.append(size)
    return sorted(sizes,reverse=True)

def duplicate(o, name):
    n = o.copy(); n.data = o.data.copy(); n.name = name
    bpy.context.scene.collection.objects.link(n)
    return n

def apply(o, m):
    select(o); bpy.ops.object.modifier_apply(modifier=m.name)

def material(name, rgb):
    return lookdev._material(name, rgb, .85)

def assign(o, mat):
    o.data.materials.clear(); o.data.materials.append(mat)
    for p in o.data.polygons:
        p.material_index = 0; p.use_smooth = True

def normalize(o, rig):
    valid = {g.index for g in o.vertex_groups if g.name in rig.data.bones}
    fixes = 0
    for v in o.data.vertices:
        weights = sorted([(g.group, g.weight) for g in v.groups if g.group in valid and g.weight > 1e-8], key=lambda x:-x[1])[:4]
        for gi in [g.group for g in v.groups]:
            o.vertex_groups[gi].remove([v.index])
        if not weights:
            p = o.matrix_world @ v.co
            bone = min((b for b in rig.data.bones if b.use_deform), key=lambda b:(rig.matrix_world @ ((b.head_local+b.tail_local)/2)-p).length_squared)
            vg = o.vertex_groups.get(bone.name) or o.vertex_groups.new(name=bone.name)
            weights = [(vg.index,1.)]; fixes += 1
        total = sum(w for g,w in weights)
        for g,w in weights:
            o.vertex_groups[g].add([v.index], w/total, 'REPLACE')
    return fixes

def bind_rigid(o, rig, bone):
    if bone not in rig.data.bones:
        raise RuntimeError('Rigid object has no valid source bone: '+o.name+' / '+bone)
    world = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'OBJECT'; o.parent_bone = ''; o.matrix_world = world
    o.vertex_groups.clear()
    vg = o.vertex_groups.new(name=bone); vg.add(list(range(len(o.data.vertices))),1.,'REPLACE')
    for m in list(o.modifiers):
        if m.type == 'ARMATURE': o.modifiers.remove(m)
    m = o.modifiers.new('rig','ARMATURE'); m.object = rig

def uv(objects):
    select(objects[0], objects[1:])
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.012, area_weight=0., correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=8/1024)
    bpy.ops.object.mode_set(mode='OBJECT')

def density_guide(mesh,rig):
    """Expand selected anatomy in remesh space, then invert by triangle correspondence."""
    original=[v.co.copy() for v in mesh.vertices]
    def smooth(x):
        x=max(0.,min(1.,x));return x*x*(3-2*x)
    tailbones=[b for b in rig.data.bones if b.name.startswith('tail_')]
    legbones=[b for b in rig.data.bones if b.name.startswith('leg_') and b.name.endswith(('_02','_03'))]
    def nearest_axis(p,bones):
        candidates=[]
        for b in bones:
            a=b.head_local;d=b.tail_local-a;t=max(0.,min(1.,(p-a).dot(d)/d.length_squared))
            candidates.append(a+t*d)
        return min(candidates,key=lambda c:(c-p).length_squared)
    for v,p in zip(mesh.vertices,original):
        delta=Vector()
        head=smooth((-p.y-.10)/.09)*smooth((p.z-.40)/.10)
        delta+=(p-Vector((0,-.21,.56)))*(.6*head)
        ear=smooth((abs(p.x)-.035)/.035)*smooth((p.z-.58)/.04)*smooth((-p.y-.10)/.05)
        delta+=(p-Vector((.07 if p.x>0 else -.07,-.17,.63)))*ear
        tail=smooth((p.y-.27)/.10)
        if tail:delta+=(p-nearest_axis(p,tailbones))*(1.8*tail)
        lower=smooth((.30-p.z)/.10)*(1-smooth((p.y-.27)/.06))
        if lower:delta+=(p-nearest_axis(p,legbones))*(.9*lower)
        v.co=p+delta
    mesh.update();mesh.calc_loop_triangles()
    tris=[tuple(t.vertices) for t in mesh.loop_triangles];warped=[v.co.copy() for v in mesh.vertices]
    return original,warped,tris,BVHTree.FromPolygons(warped,tris,all_triangles=True)

def graft_tail(low,source):
    """Regional tail retopology from sculpt cross-sections, joined to the closed body."""
    source.data.calc_loop_triangles()
    points=np.array([v.co[:] for v in source.data.vertices])
    tri=np.array([t.vertices[:] for t in source.data.loop_triangles])
    tv=points[tri];lo=tv[:,:,1].min(axis=1);hi=tv[:,:,1].max(axis=1)
    bm=bmesh.new();bm.from_mesh(low.data)
    root=max((v for v in bm.verts if abs(v.co.x)<.025 and v.co.z>.43),key=lambda v:v.co.y)
    faces=list(root.link_faces)
    bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
    wire=[e for e in bm.edges if e.is_wire]
    if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
    isolated=[v for v in bm.verts if not v.link_edges]
    if isolated:bmesh.ops.delete(bm,geom=isolated,context='VERTS')
    border=[e for e in bm.edges if e.is_boundary];adj={}
    for e in border:
        a,b=e.verts;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
    if not adj or any(len(n)!=2 for n in adj.values()):raise RuntimeError('Tail graft boundary is not a simple loop')
    first=next(iter(adj));loop=[first];previous=None;current=first
    while True:
        nxt=next(v for v in adj[current] if v!=previous)
        if nxt==first:break
        loop.append(nxt);previous,current=current,nxt
    if len(loop)!=len(adj):raise RuntimeError('Tail graft found multiple boundary loops')
    start=max(.34,max(v.co.y for v in loop)+.004)
    end=float(points[:,1].max())
    rings=[];segments=10
    for y in np.linspace(start,end-.001,40):
        hits=[]
        for t in tv[(lo<y)&(hi>y)]:
            for j in range(3):
                a,b=t[j],t[(j+1)%3]
                if (a[1]-y)*(b[1]-y)<0:
                    p=a+(b-a)*((y-a[1])/(b[1]-a[1]))
                    if y>=.36 or p[2]>.38:hits.append(p)
        if len(hits)<3:continue
        h=np.array(hits);center=(h.min(axis=0)+h.max(axis=0))/2
        angle=np.arctan2(h[:,2]-center[2],h[:,0]-center[0]);order=np.argsort(angle);angle=angle[order];h=h[order]
        aa=np.r_[angle[-1]-2*math.pi,angle,angle[0]+2*math.pi];hh=np.vstack([h[-1],h,h[0]])
        ring=[]
        for theta in np.linspace(-math.pi,math.pi,segments,endpoint=False):
            j=int(np.searchsorted(aa,theta));j=max(1,min(j,len(aa)-1));f=(theta-aa[j-1])/max(1e-12,aa[j]-aa[j-1]);p=hh[j-1]*(1-f)+hh[j]*f
            ring.append(bm.verts.new(p))
        rings.append(ring)
    center=sum((v.co for v in loop),Vector())/len(loop)
    loop.sort(key=lambda v:math.atan2(v.co.z-center.z,v.co.x-center.x))
    # Zipper joins unequal boundary counts without leaving duplicate vertices.
    a=loop;b=rings[0];i=j=0
    while i<len(a) or j<len(b):
        if j==len(b) or (i<len(a) and (i+1)/len(a)<=(j+1)/len(b)):
            bm.faces.new((a[i%len(a)],a[(i+1)%len(a)],b[j%len(b)]));i+=1
        else:
            bm.faces.new((a[i%len(a)],b[(j+1)%len(b)],b[j%len(b)]));j+=1
    for a,b in zip(rings,rings[1:]):
        for j in range(segments):bm.faces.new((a[j],a[(j+1)%segments],b[(j+1)%segments],b[j]))
    tip=bm.verts.new(points[np.argmax(points[:,1])])
    for j in range(segments):bm.faces.new((rings[-1][j],rings[-1][(j+1)%segments],tip))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    facts={'method':'Regional remesh using 40 sculpt cross-section rings with 10 vertices per ring, zipper-joined to the body boundary.','removed_body_faces':len(faces),'body_boundary_vertices':len(loop),'rings':len(rings),'vertices_per_ring':segments,'start_y_m':start,'tip_y_m':end,'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'non_manifold_vertices':sum(not v.is_manifold for v in bm.verts)}
    bm.to_mesh(low.data);bm.free();low.data.update();write('iter1_tail_graft.json',facts)

def fit_ears(low, source, steps=16, smoothing=0.):
    """Damped sculpt-sample fitting, with optional local Laplacian regularization."""
    from mathutils.kdtree import KDTree
    records=[]
    for side in (-1,1):
        def ear(p):return p.x*side>.045 and p.z>.60 and p.y<-.10
        lv=[v for v in low.data.vertices if ear(v.co)]
        sv=[v.co.copy() for v in source.data.vertices if ear(v.co)]
        adj={v.index:[] for v in lv}
        for edge in low.data.edges:
            a,b=edge.vertices
            if a in adj:adj[a].append(low.data.vertices[b])
            if b in adj:adj[b].append(low.data.vertices[a])
        for iteration in range(steps):
            if smoothing:
                smooth={v.index:sum((w.co for w in adj[v.index]),Vector())/len(adj[v.index]) for v in lv if adj[v.index]}
                for v in lv:
                    if v.index in smooth:v.co=v.co.lerp(smooth[v.index],smoothing)
            kd=KDTree(len(lv))
            for i,v in enumerate(lv):kd.insert(v.co,i)
            kd.balance();sums=[Vector() for v in lv];counts=[0]*len(lv)
            for point in sv:
                co,i,d=kd.find(point);sums[i]+=point;counts[i]+=1
            for i,v in enumerate(lv):
                if counts[i]:v.co=v.co.lerp(sums[i]/counts[i],.35)
        records.append({'side':side,'vertices':len(lv),'source_samples':len(sv)})
    low.data.update()
    write('iter1_ear_fit.json',{'method':'Damped centroidal sculpt-surface fitting','steps':steps,'laplacian_factor':smoothing,'regions':records})


def mesh():
    if not (OUT/'sculpt_check.json').exists():
        raise RuntimeError('Read-only sculpt check must complete before mesh construction.')
    bpy.ops.wm.open_mainfile(filepath=SOURCE)
    rig = bpy.data.objects['luceras_rig']
    rig.data.pose_position='POSE';rig.hide_set(False);rig.hide_viewport=False
    clips.Poser(rig).reset(); bpy.context.view_layer.update()
    originals = [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('lookdev_')]
    body = bpy.data.objects['luceras_blockout']
    low = duplicate(body,'game_body')
    for m in list(low.modifiers): low.modifiers.remove(m)
    low.vertex_groups.clear()
    bm=bmesh.new();bm.from_mesh(low.data)
    inconsistent_before=sum(not e.is_contiguous for e in bm.edges if e.is_manifold)
    bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges))
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
    write('iter1_normal_repair.json',{'inconsistent_winding_edges_on_source_copy':inconsistent_before,'fix':'Recalculate consistent outward face winding on game working copy only. Source preserved.'})
    select(low)
    diag=json.loads((OUT/'iter0_quad_diagnosis.json').read_text()) if (OUT/'iter0_quad_diagnosis.json').exists() else {}
    if diag.get('precondition')=='voxel_0.001m_working_copy':
        low.data.remesh_voxel_size=.001;bpy.ops.object.voxel_remesh()
    guide=density_guide(low.data,rig) if ITERATION==3 else None
    low.data.use_mirror_x = True
    low.data.use_mirror_y = False;low.data.use_mirror_z = False
    for v in low.data.vertices:v.co*=1000
    low.data.update()
    print('BEGIN QUADRIFLOW', flush=True)
    result=bpy.ops.object.quadriflow_remesh(use_mesh_symmetry=True, use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=True, mode='FACES', target_faces=4600 if guide else 4250, seed=0)
    if 'FINISHED' not in result or triangles(low)>11000:
        raise RuntimeError('QuadriFlow did not produce the requested budget: '+str(result)+' / '+str(triangles(low)))
    for v in low.data.vertices:v.co/=1000
    low.data.update()
    # QuadriFlow's mirrored halves must share their center vertices before projection.
    bm=bmesh.new();bm.from_mesh(low.data)
    boundary_before=sum(e.is_boundary for e in bm.edges)
    if ITERATION>=4 and boundary_before:
        # Remove only the defective central strip and rebuild its opposite half exactly.
        boundary_verts={v for e in bm.edges if e.is_boundary for v in e.verts}
        cut=max(abs(v.co.x) for v in boundary_verts)+.00001
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-8,plane_co=(cut,0,0),plane_no=(1,0,0),clear_inner=True,clear_outer=False)
        for v in bm.verts:
            if v.is_boundary:v.co.x=0
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        copied=bmesh.ops.duplicate(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces))
        bmesh.ops.scale(bm,vec=(-1,1,1),verts=[v for v in copied['geom'] if isinstance(v,bmesh.types.BMVert)])
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        write('iter1_seam_rebuild.json',{'cut_offset_in_density_guide_m':cut,'method':'Cut away defective QuadriFlow center strip, snap the new boundary to X=0, duplicate and mirror the clean half, weld shared center vertices.'})
    else:bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    boundary_after=sum(e.is_boundary for e in bm.edges)
    bm.to_mesh(low.data);bm.free();low.data.update()
    write('iter1_symmetry_weld.json',{'boundary_before':boundary_before,'boundary_after':boundary_after,'merge_distance_m':.00002,'timing':'Before shrinkwrap projection'})
    if guide:
        original,warped,tris,tree=guide
        for v in low.data.vertices:
            hit=tree.find_nearest(v.co);indices=tris[hit[2]]
            v.co=barycentric_transform(hit[0],*[warped[i] for i in indices],*[original[i] for i in indices])
        low.data.update()
        write('iter1_density_guide.json',{'method':'Spatial density guide. Inflate head/ears, lower legs/paws and tail in remesh space; inverse barycentric mapping to original triangles.','target_quad_faces':4600,'head_expansion':1.6,'ear_additional_expansion':2.,'lower_limb_radial_expansion':1.9,'tail_radial_expansion':2.8})
    if ITERATION>=4:
        bm=bmesh.new();bm.from_mesh(low.data);candidates=[]
        eye_centers=[bpy.data.objects[n].matrix_world.translation for n in ('eye_l','eye_r')]
        for e in bm.edges:
            p=(e.verts[0].co+e.verts[1].co)/2;l=e.calc_length()
            target=.003 if abs(p.x)>.04 and p.y<-.10 and p.z>.58 else .006 if p.z<.08 else .009 if p.z<.24 else .008 if p.y>.30 else 100
            if ITERATION>=6 and (min((p-c).length for c in eye_centers)<.028 or (p.y<-.27 and p.z>.46)):
                target=min(target,.003)
            if l>target:candidates.append((l/target,e))
        candidates.sort(key=lambda x:-x[0]);chosen=[e for score,e in candidates[:400 if ITERATION>=6 else 350 if ITERATION>=5 else 450]]
        bmesh.ops.subdivide_edges(bm,edges=chosen,cuts=1,use_grid_fill=True)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(low.data);bm.free();low.data.update()
        write('iter1_density_guide.json',{'method':'Local edge-length density guide on QuadriFlow output. Subdivide selected long edges around ears, paws, lower legs and tail, then project new vertices to the approved sculpt.','selected_edges':len(chosen),'target_lengths_m':{'ears':.003,'paws':.006,'lower_legs':.009,'tail':.008},'note':'Spatial inflation from iteration 3 was rejected because it shortened the tail and introduced shape regressions.'})
    print('END QUADRIFLOW', triangles(low), flush=True)
    # Project the retopology onto the approved surface without modifying that surface.
    m = low.modifiers.new('approved_surface','SHRINKWRAP'); m.target=body; m.wrap_method='NEAREST_SURFACEPOINT'; m.offset=0
    apply(low,m)
    if ITERATION>=5:graft_tail(low,body)
    if ITERATION>=7:fit_ears(low,body,16,0.)
    if ITERATION>=8:fit_ears(low,body,32,.18)
    bm=bmesh.new();bm.from_mesh(low.data)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4])
    bm.to_mesh(low.data);bm.free();low.data.update()
    m = low.modifiers.new('nearest_face_weights','DATA_TRANSFER');m.object=body;m.use_vert_data=True;m.data_types_verts={'VGROUP_WEIGHTS'};m.vert_mapping='POLYINTERP_NEAREST'
    select(low);bpy.ops.object.datalayout_transfer(modifier=m.name);apply(low,m)
    fixed=normalize(low,rig)
    m=low.modifiers.new('rig','ARMATURE');m.object=rig
    bodymat=material('Luceras_body',(.5,.5,.5));eyemat=material('Luceras_eyes',(.12,.12,.12))
    assign(low,bodymat)
    game=[low];pairs=[(body,low)];removed=[];parts={}
    for src in originals:
        if src==body: continue
        if 'whisker' in src.name:
            removed.append(src.name);continue
        if not any(k in src.name for k in ('horn','eye','claw')):continue
        n=duplicate(src,'game_'+src.name)
        if ITERATION>=3 and 'eye' in src.name:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if ITERATION>=6 else 12,ring_count=7 if ITERATION>=6 else 6,radius=.017)
            sphere=bpy.context.object;n.data=sphere.data.copy();bpy.data.objects.remove(sphere,do_unlink=True)
        for m in list(n.modifiers):
            if m.type!='ARMATURE': apply(n,m)
        count=triangles(n);target=(192 if ITERATION>=6 else 120) if 'eye' in src.name else (700 if ITERATION>=3 else 500) if 'horn' in src.name else 24
        if count>target:
            m=n.modifiers.new('budget','DECIMATE');m.ratio=target/count;apply(n,m)
        bind_rigid(n,rig,src.parent_bone)
        assign(n,eyemat if 'eye' in src.name else bodymat)
        game.append(n);pairs.append((src,n));parts[src.name]=triangles(n)
    uv([o for o in game if o.data.materials[0]==bodymat])
    uv([o for o in game if o.data.materials[0]==eyemat])
    for o in originals:o.hide_render=True;o.hide_set(True)
    for o in list(bpy.data.objects):
        if o.name.startswith('lookdev_'):bpy.data.objects.remove(o,do_unlink=True)
    write('iter1_mesh.json',{'body_triangles':triangles(low),'rigid_triangles':parts,'total':sum(triangles(o) for o in game),'body_non_manifold':manifold(low),'unweighted_repaired':fixed,'removed_whiskers':removed,'pairs':[(a.name,b.name) for a,b in pairs],'uv_method':'Smart project 66 degrees, average island scale, fraction pack 8/1024. Underside seam preference not explicitly enforced.','remesh':'QuadriFlow 4250 faces, X symmetry, nearest surface projection. See numbered density, seam, tail and ear correction records.'})
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iter1_mesh.blend'))
    # Early silhouettes expose lost toes or tail tips while the full bake is still pending.
    lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=8
    for name in ('full_three_quarter','hind_paw_side'):
        box,az,el=cameras()[name];cam=lookdev.place_camera('lookdev_preview_'+name,box,az,el,.04)
        for variant in ('sculpt','game'):
            visible(variant);lookdev.render(cam,OUT/f'iter1_prebake_{variant}_{name}.png',size=512)

def bake():
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_mesh.blend'))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16
    scene.render.bake.use_selected_to_active=True;scene.render.bake.use_clear=False
    scene.render.bake.normal_space='TANGENT'
    scene.render.bake.margin=16;scene.render.bake.cage_extrusion=.008;scene.render.bake.max_ray_distance=.025
    data=json.loads((OUT/'iter1_mesh.json').read_text());pairs=[(bpy.data.objects[a],bpy.data.objects[b]) for a,b in data['pairs'] if 'eye' not in a]
    mat=bpy.data.materials['Luceras_body'];nodes=mat.node_tree.nodes
    for kind in ('NORMAL','AO'):
        image=bpy.data.images.new('normal_2048' if kind=='NORMAL' else 'ao_2048',2048,2048,alpha=False,float_buffer=False)
        image.generated_color=(.5,.5,1,1) if kind=='NORMAL' else (1,1,1,1);image.colorspace_settings.name='Non-Color'
        node=nodes.new('ShaderNodeTexImage');node.image=image;node.name=kind+'_bake';nodes.active=node
        for src,dst in pairs:
            print('BAKE',kind,src.name,flush=True)
            for a,b in pairs:a.hide_render=True;b.hide_render=True
            if kind=='AO':
                for a,b in pairs:a.hide_render=False
            src.hide_render=False;dst.hide_render=False
            select(dst,[src]);bpy.ops.object.bake(type=kind)
            src.hide_render=True
        image.filepath_raw=str(OUT/(image.name+'.png'));image.file_format='PNG';image.save()
        small=image.copy();small.name=image.name.replace('2048','1024');small.scale(1024,1024);small.filepath_raw=str(OUT/(small.name+'.png'));small.save();node.image=small
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    normal=nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(nodes['NORMAL_bake'].outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    # glTF exporter recognizes the Occlusion input on the named settings group.
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    gn=nodes.new('ShaderNodeGroup');gn.node_tree=group;mat.node_tree.links.new(nodes['AO_bake'].outputs['Color'],gn.inputs['Occlusion'])
    for o in bpy.data.objects:
        if o.type=='MESH':o.hide_render=not o.name.startswith('game_')
    write('bake_settings.json',{'engine':'Cycles CPU','samples':16,'size_bake':2048,'size_game':1024,'space':'tangent','normal_convention':'OpenGL +Y','selected_to_active':True,'cage_extrusion_m':.008,'max_ray_distance_m':.025,'margin_px_2048':16,'ao':'Selected-to-active per matched object with other sculpt body/horn/claw sources visible for contact occlusion.'})
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iter1_baked.blend'))

def region(o,v):
    weighted=[g for g in v.groups if g.weight>1e-8]
    return o.vertex_groups[max(weighted,key=lambda g:g.weight).group].name if weighted else 'unweighted'

def measure():
    game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
    body=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig']
    bm=bmesh.new();bm.from_mesh(src.data);bm.transform(src.matrix_world);tree=BVHTree.FromBMesh(bm);bm.free()
    distances={}
    for v in body.data.vertices:
        hit=tree.find_nearest(body.matrix_world@v.co)
        distances.setdefault(region(body,v),[]).append(hit[3])
    densities={}
    for o in game:
        o.data.calc_loop_triangles();uvs=o.data.uv_layers.active.data;areas={}
        for t in o.data.loop_triangles:
            pts=[o.matrix_world@o.data.vertices[i].co for i in t.vertices]
            a=(pts[1]-pts[0]).cross(pts[2]-pts[0]).length/2
            p=[uvs[i].uv for i in t.loops];u=abs((p[1]-p[0]).cross(p[2]-p[0]))/2
            key=region(o,o.data.vertices[t.vertices[0]]) if o==body else o.name
            x=areas.setdefault(key,[0,0]);x[0]+=a;x[1]+=u
        for k,(a,u) in areas.items():
            if a>0:densities[o.name+'/'+k]=1024*math.sqrt(u/a)
    bodydens=[v for k,v in densities.items() if not 'eye' in k and v>0]
    uvdata={}
    for o in game:
        layer=o.data.uv_layers.active.data
        uvdata[o.name]=[[list(layer[i].uv) for i in p.loop_indices] for p in o.data.polygons]
    write('iter1_uv_polygons.json',uvdata)
    inf=[sum(g.weight>1e-8 and o.vertex_groups[g.group].name in rig.data.bones for g in v.groups) for o in game for v in o.data.vertices]
    sums=[sum(g.weight for g in v.groups if o.vertex_groups[g.group].name in rig.data.bones) for o in game for v in o.data.vertices]
    r={'triangles_per_object':{o.name:triangles(o) for o in game},'triangles_total':sum(triangles(o) for o in game),'vertices':sum(len(o.data.vertices) for o in game),'materials':sorted({m.name for o in game for m in o.data.materials}),'joints':len(rig.data.bones),'max_influences':max(inf),'unweighted_count':inf.count(0),'body_non_manifold_edges':manifold(body),'texture_sizes':{'normal':[1024,1024],'ao':[1024,1024],'review_normal':[2048,2048],'review_ao':[2048,2048]},'texel_density_px_per_m':densities,'texel_density_ratio':{'min':min(bodydens),'max':max(bodydens),'max_to_min':max(bodydens)/min(bodydens)},'distance_m':{k:{'mean':float(np.mean(v)),'max':max(v),'samples':len(v)} for k,v in distances.items()},'distance_method':'One-way nearest sculpt surface distances at game vertices. This underestimates face-interior silhouette error after shrinkwrap; reverse sampled distances added separately.'}
    # Reverse distance includes detail absent from low topology, unlike projected vertex distances.
    bm=bmesh.new();bm.from_mesh(body.data);bm.transform(body.matrix_world);tree=BVHTree.FromBMesh(bm);bm.free();reverse={}
    for v in src.data.vertices:
        if v.index%3:continue
        reverse.setdefault(region(src,v),[]).append(tree.find_nearest(src.matrix_world@v.co)[3])
    r['reverse_distance_m']={k:{'mean':float(np.mean(v)),'max':max(v),'samples':len(v)} for k,v in reverse.items()}
    r['weight_sum_range']=[min(sums),max(sums)]
    r['body_connected_component_vertex_counts']=components(body)
    r['rigid_distance_m']={}
    pairs=json.loads((OUT/'iter1_mesh.json').read_text())['pairs']
    for a,b in pairs:
        if b=='game_body':continue
        original=bpy.data.objects[a];target=bpy.data.objects[b]
        bm=bmesh.new();bm.from_mesh(target.data);bm.transform(target.matrix_world);tree=BVHTree.FromBMesh(bm);bm.free()
        ds=[tree.find_nearest(original.matrix_world@v.co)[3] for v in original.data.vertices]
        r['rigid_distance_m'][a]={'sculpt_to_game_mean':float(np.mean(ds)),'sculpt_to_game_max':max(ds),'samples':len(ds)}
    r['hard_budget_checks']={'triangles':r['triangles_total']<=12000,'materials':len(r['materials'])<=2,'joints':r['joints']<=60,'influences':r['max_influences']<=4,'every_vertex_weighted':r['unweighted_count']==0,'body_closed':r['body_non_manifold_edges']==0,'one_body_component':len(r['body_connected_component_vertex_counts'])==1,'normalized':min(sums)>.9999 and max(sums)<1.0001}
    write('measurements.json',r)
    return r

def cameras():
    # Reuse only camera constants from compare_render, avoiding its top-level rendering loop.
    path=PIPE/'sculpt'/'compare_render.py';tree=ast.parse(path.read_text())
    assignments=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ('BOX','FULL','HIND','FORE','FORE_L','VIEWS') for t in n.targets)]
    ns={'Vector':Vector};exec(compile(ast.Module(body=assignments,type_ignores=[]),str(path),'exec'),ns)
    views={k:ns['VIEWS'][k] for k in ('full_side','full_three_quarter','hind_paw_side')}
    views['head_three_quarter']=((Vector((-.16,-.33,.44)),Vector((.16,-.05,.75))),45,12)
    views['sprite']=views['full_side']
    return views

def visible(which):
    for o in bpy.data.objects:
        if o.type=='MESH' and not o.name.startswith('lookdev_'):
            o.hide_render=(o.name.startswith('game_') != (which=='game'))

def renders():
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_baked.blend'))
    rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='POSE';rig.hide_set(False);rig.hide_viewport=False
    poser=clips.Poser(rig);poser.reset();bpy.context.view_layer.update()
    facts=measure()
    lookdev.setup_scene('CYCLES');scene=bpy.context.scene;scene.cycles.samples=16
    for o in bpy.data.objects:
        if o.type=='MESH' and not o.name.startswith(('game_','lookdev_')):
            if 'eye' in o.name:assign(o,bpy.data.materials['Luceras_eyes'])
            else:lookdev.apply_clay(o)
    for name,(box,az,el) in cameras().items():
        cam=lookdev.place_camera('lookdev_cam_'+name,box,az,el,margin=.04)
        for variant in ('sculpt','game'):
            visible(variant);lookdev.render(cam,OUT/f'iter1_{variant}_{name}.png',size=192 if name=='sprite' else 768)
    # Wireframe remains a Cycles render; shader overlay leaves geometry unchanged.
    mat=bpy.data.materials['Luceras_body'];nodes=mat.node_tree.nodes;links=mat.node_tree.links
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');wire=nodes.new('ShaderNodeWireframe');wire.use_pixel_size=True;wire.inputs['Size'].default_value=.65
    mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.5,.5,.5,1);mix.inputs[2].default_value=(.015,.015,.015,1);links.new(wire.outputs[0],mix.inputs[0]);links.new(mix.outputs[0],bs.inputs['Base Color'])
    visible('game')
    for name in ('full_side','full_three_quarter'):
        lookdev.render(bpy.data.objects['lookdev_cam_'+name],OUT/f'wire_{name}.png',size=768)
    nodes.remove(mix);nodes.remove(wire)
    # Use the original region cone-volume proxy and identical POSES on both meshes.
    volumes={};body=bpy.data.objects['game_body'];src=bpy.data.objects['luceras_blockout']
    for variant,obj in (('sculpt',src),('game',body)):
        obj.hide_set(False);obj.data.calc_loop_triangles();regions,tri=block.regions(obj,rig);poser.reset();bpy.context.view_layer.update()
        pts=block.verts_np(obj,True);v0=block.closed_volume(pts,tri)
        initial={name:block.cone_volume(pts,faces,np.array(rig.matrix_world@rig.data.bones[name].head_local)) for name,faces in regions.items() if name in rig.data.bones}
        volumes[variant]={}
        for pose,fn in block.POSES.items():
            fn(poser,rig);bpy.context.view_layer.update();p=block.verts_np(obj,True);per={}
            for name,r0 in initial.items():
                r1=block.cone_volume(p,regions[name],np.array(rig.matrix_world@rig.pose.bones[name].head))
                if abs(r0)>1e-9:per[name]={'rest_m3':r0,'posed_m3':r1,'change_fraction':(abs(r1)-abs(r0))/abs(r0)}
            volumes[variant][pose]={'whole_volume_change_fraction':(abs(block.closed_volume(p,tri))-abs(v0))/abs(v0),'regions':per,'flagged_over_30_percent_loss':[n for n,x in per.items() if x['change_fraction']<-.3]}
            visible(variant)
            box=(Vector((-.23,-.60,-.10)),Vector((.23,.90,1.05)))
            cam=lookdev.place_camera('lookdev_pose',box,90,0,.04);lookdev.render(cam,OUT/f'iter1_pose_{pose}_{variant}.png',size=512)
    poser.reset();bpy.context.view_layer.update();visible('game')
    facts['volume_change_per_joint_region_per_pose']=volumes
    facts['volume_method']='Dominant-bone surface patches closed to the moving bone head, matching the blockout cone-volume proxy. Not an anatomical enclosed volume; unstable small patches need visual review.'
    write('measurements.json',facts)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iter1_review.blend'))
    export()

def export():
    rig=bpy.data.objects['luceras_rig'];clips.Poser(rig).reset();bpy.context.view_layer.update()
    game=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('game_')]
    # Keep per-part names in measurements, then merge to one skinned object per material.
    bodyparts=[o for o in game if 'eye' not in o.name];eyeparts=[o for o in game if 'eye' in o.name]
    select(bodyparts[0],bodyparts[1:]);bpy.ops.object.join();body=bpy.context.object;body.name='game_body_horns_claws'
    select(eyeparts[0],eyeparts[1:]);bpy.ops.object.join();eyes=bpy.context.object;eyes.name='game_eyes'
    for o in list(bpy.data.objects):
        if o not in (body,eyes,rig):bpy.data.objects.remove(o,do_unlink=True)
    for o in (body,eyes):o.hide_render=False;o.hide_set(False)
    for im in bpy.data.images:
        if im.name.startswith(('normal_1024','ao_1024')):im.pack()
    select(body,[eyes,rig])
    bpy.ops.export_scene.gltf(filepath=str(OUT/'gamemesh.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_all_influences=False,export_apply=False,export_texcoords=True,export_normals=True,export_tangents=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gamemesh.blend'))

if __name__=='__main__':
    print('STAGE',STAGE,flush=True)
    if STAGE=='mesh':mesh()
    elif STAGE=='all':
        mesh();bake();renders()
        if ITERATION>=2:
            print('REVIEW WINDOW: awaiting next iteration instruction for up to 90 seconds',flush=True)
            request=OUT.path/f'iter{ITERATION}_continue.json'
            deadline=time.time()+90
            while time.time()<deadline and not request.exists():time.sleep(.5)
            if request.exists():
                cfg=json.loads(request.read_text());os.environ['GM_ITERATION']=str(cfg['iteration'])
                import runpy
                runpy.run_path(__file__,run_name='__main__')
    elif STAGE=='bake':bake()
    elif STAGE=='render':renders()
    elif STAGE=='export':
        bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter1_review.blend'));export()
