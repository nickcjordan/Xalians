"""Scoped cleanup and real eye openings in the reconstructed Akinza head."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha, sphere

parser = argparse.ArgumentParser()
parser.add_argument('--mesh', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out / 'refine_source.py')
provenance_sha = snapshot(args.out, __file__, [args.mesh])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.mesh.resolve()))
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
before = mesh_stats(body)
bm = bmesh.new()
bm.from_mesh(body.data)
unseen = set(bm.verts)
components = []
while unseen:
    first = unseen.pop()
    component = {first}
    stack = [first]
    while stack:
        v = stack.pop()
        for edge in v.link_edges:
            other = edge.other_vert(v)
            if other in unseen:
                unseen.remove(other)
                component.add(other)
                stack.append(other)
    components.append(component)
largest = max(components, key=len)
bmesh.ops.delete(bm, geom=[v for group in components if group is not largest for v in group], context='VERTS')
# A front-only reconstruction's accidental side differences are not authored anatomy.
bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                       dist=.000001, plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
for v in bm.verts:
    if abs(v.co.x) < .00001:
        v.co.x = 0
bm.to_mesh(body.data)
bm.free()
mirror = body.modifiers.new('Symmetric construction proposal', 'MIRROR')
mirror.use_clip = True
mirror.merge_threshold = .00001
bpy.ops.object.modifier_apply(modifier=mirror.name)


def ramp(value, a, b):
    return max(0, min(1, (value - a) / (b - a)))


def smooth_region(name, weight, iterations, factor=.7):
    group = body.vertex_groups.new(name=name)
    for v in body.data.vertices:
        w = weight(*v.co)
        if w > 0:
            group.add([v.index], min(1, w), 'REPLACE')
    mod = body.modifiers.new(name, 'SMOOTH')
    mod.factor = factor
    mod.iterations = iterations
    mod.vertex_group = group.name
    bpy.ops.object.modifier_apply(modifier=mod.name)


smooth_region('Forehead scan cleanup',
              lambda x, y, z: ramp(-y, .16, .28) * ramp(z, .14, .20)
              * ramp(.45-z, 0, .06) * ramp(.42-abs(x), 0, .10), 160)
smooth_region('Cheek residue cleanup',
              lambda x, y, z: ramp(-y, .08, .20) * ramp(abs(x), .23, .32)
              * ramp(.46-abs(x), 0, .06) * ramp(z+.23, 0, .08)
              * ramp(.12-z, 0, .08), 80)
smooth_region('Occipital groove reduction',
              lambda x, y, z: ramp(y, .12, .28) * ramp(.44-abs(x), 0, .14)
              * ramp(z+.38, 0, .12), 40)
smooth_region('Bridge scan residue',
              lambda x,y,z:ramp(-y,.20,.28)*math.exp(-(x/.085)**2-((z-.105)/.060)**2),180)
smooth_region('Lower cheek scan cleanup',
              lambda x,y,z: ramp(-y,.10,.18)*ramp(abs(x),.09,.14)
              *ramp(.36-abs(x),0,.08)*ramp(z+.31,0,.06)*ramp(-.11-z,0,.06), 240)
native_tree = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                                  [list(p.vertices) for p in body.data.polygons])


def native_front(x, z):
    hit, _, _, _ = native_tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    if hit is None:
        raise ValueError(f'Native eye surface not found at {(x, z)}')
    return hit.y


# Reconstruct only the muzzle's front graph. Smooth compact weights retain
# native boundary positions and tangents without a rectangular guide collar.
def ease(t):
    t=max(0,min(1,t))
    return t*t*t*(10+t*(-15+6*t))


def guide(x,z):
    chin=-.270+1.8*x*x
    pads=sum(math.exp(-((x-side*.06)/.065)**2) for side in [-1,1])
    return chin-.067*pads*math.exp(-((z+.170)/.072)**2)


nu,nv=100,100
positions=np.empty((nv+1,nu+1,2))
native=np.empty((nv+1,nu+1))
heights=np.empty((nv+1,nu+1))
for j in range(nv+1):
    for i in range(nu+1):
        x=-.22+.44*i/nu
        bottom=-.29+.07*(x/.22)**2
        z=-.115+(bottom+.115)*j/nv
        positions[j,i]=[x,z]
        native[j,i]=native_front(x,z)
        weight=(ease((.18-abs(x))/.07)*ease((-.115-z)/.05)
                *ease((z-bottom)/.045))
        nose_protection=ease((.045-abs(x))/.015)*ease((z+.170)/.018)
        weight*=1-nose_protection
        heights[j,i]=native[j,i]*(1-weight)+guide(x,z)*weight
heights=(heights+heights[:,::-1])/2
verts=[(float(positions[j,i,0]),float(heights[j,i]),float(positions[j,i,1]))
       for j in range(nv+1) for i in range(nu+1)]
faces=[]
n=len(verts);verts.extend((x,.02,z) for x,y,z in list(verts))
for j in range(nv):
    for i in range(nu):
        a=j*(nu+1)+i;b=a+1;c=b+nu+1;d=a+nu+1
        faces.extend([(a,b,c,d),(a+n,d+n,c+n,b+n)])
edge=list(range(nu+1))+[j*(nu+1)+nu for j in range(1,nv+1)]
edge+=list(range(nv*(nu+1)+nu-1,nv*(nu+1)-1,-1))
edge+=[j*(nu+1) for j in range(nv-1,0,-1)]
for a,b in zip(edge,edge[1:]+edge[:1]):faces.append((a,a+n,b+n,b))
cut_verts=[]
for y in [-1,-.12]:
    for zside in [0,1]:
        for i in range(41):
            x=-.21+.42*i/40
            z=-.121 if zside==0 else -.285+.07*(x/.22)**2
            cut_verts.append((x,y,z))
cut_faces=[]
for i in range(40):
    cut_faces.extend([(i,i+1,i+42,i+41),(i+82,i+123,i+124,i+83),
                      (i,i+82,i+83,i+1),(i+41,i+42,i+124,i+123)])
cut_faces.extend([(0,41,123,82),(40,122,163,81)])
cut_mesh=bpy.data.meshes.new('Curved lower-face excision');cut_mesh.from_pydata(cut_verts,[],cut_faces);cut_mesh.update()
cutter=bpy.data.objects.new('Curved lower-face excision',cut_mesh);bpy.context.collection.objects.link(cutter)
bm=bmesh.new();bm.from_mesh(cut_mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cut_mesh);bm.free()
bpy.context.view_layer.objects.active=body
cut=body.modifiers.new('Excise complete lower transition','BOOLEAN')
cut.operation='DIFFERENCE';cut.solver='EXACT';cut.object=cutter
bpy.ops.object.modifier_apply(modifier=cut.name)
bpy.data.objects.remove(cutter,do_unlink=True)
mesh=bpy.data.meshes.new('Coupled lower muzzle surface');mesh.from_pydata(verts,[],faces);mesh.update()
patch=bpy.data.objects.new('Constrained pad to chin transition',mesh);bpy.context.collection.objects.link(patch)
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);patch.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
body.data.remesh_voxel_size=.0025;bpy.ops.object.voxel_remesh()
smooth_region('Muzzle overlap resampling',lambda x,y,z:ramp(-y,.16,.23)
              *ease((.15-abs(x))/.025)*ease((-.16-z)/.02)*ease((z+.295)/.025),12)
native_tree = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                                  [list(p.vertices) for p in body.data.polygons])


clay = material('Head clay', .38)
white = material('Ocular white', .78)
dark = material('Pupil', .006)
dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .12
rim_mat = material('Eyelid edge', .04)
nose_mat = material('Nose', .075)
body.data.materials.clear()
body.data.materials.append(clay)
for poly in body.data.polygons:
    poly.use_smooth = True


eye_boundaries = {}
eye_fits = {}
EYE_X, EYE_Z, EYE_RX, EYE_RZ = .202, .035, .112, .143


def eye_y(side, x, z):
    dx = x-side*EYE_X
    dz = z-EYE_Z
    u, v = dx/EYE_RX, dz/EYE_RZ
    return float(np.dot(eye_fits[side][:3], [1, u, v]))-.085+.045*u*u+.045*v*v



eye_records = []
socket_patches = []
for side in [-1, 1]:
    cx, cz, rx, rz = side*EYE_X, EYE_Z, EYE_RX, EYE_RZ
    # Save the original surface at the aperture before removing its fused relief.
    tree = BVHTree.FromPolygons([v.co for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
    boundary = []
    samples, heights = [], []
    for u in np.linspace(-.88, .88, 25):
        for v in np.linspace(-.88, .88, 25):
            if u*u+v*v < .88**2:
                samples.append([1, u, v, u*u, u*v, v*v])
                heights.append(native_front(cx+rx*u, cz+rz*v))
    eye_fits[side] = np.linalg.lstsq(np.array(samples), np.array(heights), rcond=None)[0]
    for i in range(128):
        a = i*math.tau/128
        x, z = cx+rx*math.cos(a), cz+rz*math.sin(a)
        hit, _, _, _ = tree.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
        if hit is None:
            bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'failed-surface.blend'))
            bpy.ops.export_scene.gltf(filepath=str(args.out/'failed-surface.glb'), export_format='GLB')
            raise ValueError(f'Eye boundary ray missed the surface at {(x, z)}')
        boundary.append((x, hit.y-.002, z))
    boundary = [(x, eye_y(side, x, z)-.001, z) for x, y, z in boundary]
    eye_boundaries[side] = boundary
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=1, depth=1, location=(cx, -.61, cz), rotation=(math.pi/2, 0, 0))
    cutter = bpy.context.object
    cutter.scale = (rx*1.35, rz*1.35, .96)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.objects.active = body
    cut = body.modifiers.new('True eye aperture', 'BOOLEAN')
    cut.operation = 'DIFFERENCE'
    cut.solver = 'EXACT'
    cut.object = cutter
    bpy.ops.object.modifier_apply(modifier=cut.name)
    print('After eye aperture:', side, len(body.data.vertices), 'vertices', flush=True)
    if not body.data.polygons:
        raise ValueError('Eye Boolean produced an empty head')
    bpy.data.objects.remove(cutter, do_unlink=True)
    # Replace the folded annulus with a closed socket volume. Moving its old
    # vertices left overlapping triangles along the Boolean wall.
    verts, faces = [], []
    rings, segments = 12, 128
    for j in range(rings+1):
        t = j/rings
        radius = 1+.65*t
        blend = min(1, (radius-1)/.30)
        blend = blend*blend*(3-2*blend)
        for i in range(segments):
            angle = i*math.tau/segments
            ux, uz = math.cos(angle), math.sin(angle)
            px,pz=cx+rx*radius*ux,cz+rz*radius*uz
            inner_y = eye_y(side,px,pz)+.003
            outer_y = native_front(px,pz)
            verts.append((cx+rx*radius*ux,inner_y*(1-blend)+outer_y*blend,cz+rz*radius*uz))
    front_count = len(verts)
    verts.extend((x,0,z) for x,y,z in list(verts))
    for j in range(rings):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            c=b+segments;d=a+segments
            faces.extend([(a,d,c,b),(a+front_count,b+front_count,c+front_count,d+front_count)])
    for j in [0,rings]:
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+front_count,a+front_count))
    mesh = bpy.data.meshes.new('Socket annulus')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    patch = bpy.data.objects.new('Socket annulus '+str(side),mesh)
    bpy.context.collection.objects.link(patch)
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free()
    socket_patches.append(patch)
    # Closed ocular volumes match the actual aperture boundary, with a rear hemisphere.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64, radius=1)
    globe = bpy.context.object
    globe.name = 'eye_globe_'+str(side)
    for v in globe.data.vertices:
        x, y, z = v.co
        px, pz = cx+rx*x, cz+rz*z
        r2 = x*x+z*z
        front_y = eye_y(side, px, pz)
        v.co = (px, front_y if y < 0 else front_y+.21*(1-r2), pz)
    globe.data.materials.append(white)
    for poly in globe.data.polygons:
        poly.use_smooth = True
    # Thin closed iris lens follows the curved globe. Both projected centers face forward.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=1)
    iris = bpy.context.object
    iris.name = 'forward_iris_'+str(side)
    for v in iris.data.vertices:
        x, y, z = v.co
        px, pz = cx+.053*x, cz+.004+.087*z
        v.co = (px, eye_y(side, px, pz)-.001+.007*y, pz)
    iris.data.materials.append(dark)
    for poly in iris.data.polygons:
        poly.use_smooth = True
    curve = bpy.data.curves.new('lid_curve_'+str(side), 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .0028
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(boundary)-1)
    for point, co in zip(spline.points, boundary):
        point.co = (*co, 1)
    spline.use_cyclic_u = True
    lid = bpy.data.objects.new('lid_'+str(side), curve)
    bpy.context.collection.objects.link(lid)
    lid.data.materials.append(rim_mat)
    eye_records.append({'side': side, 'centerXZ': [cx, cz], 'apertureRadiiXZ': [rx, rz],
                        'closedGlobe': mesh_stats(globe), 'iris': mesh_stats(iris)})

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
for patch in socket_patches:
    patch.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
body.data.remesh_voxel_size=.0022
bpy.ops.object.voxel_remesh()
def socket_fair_weight(x,y,z):
    radius=min(math.hypot((x-side*EYE_X)/EYE_RX,(z-EYE_Z)/EYE_RZ) for side in [-1,1])
    if not 1.05 < radius < 1.75: return 0
    native_y=native_front(x,z)
    if y > native_y+.035:return 0
    return math.sin(math.pi*(radius-1.05)/.70)**2

smooth_region('Socket overlap curvature', socket_fair_weight, 35)
# Only tiny isolated remnants may be removed, never a meaningful disconnected part.
bm=bmesh.new();bm.from_mesh(body.data)
unseen=set(bm.verts);debris=[]
while unseen:
    first=unseen.pop();component={first};stack=[first]
    while stack:
        v=stack.pop()
        for edge in v.link_edges:
            other=edge.other_vert(v)
            if other in unseen:unseen.remove(other);component.add(other);stack.append(other)
    if len(component)<=64:
        bounds=[[min(v.co[i] for v in component) for i in range(3)],
                [max(v.co[i] for v in component) for i in range(3)]]
        if max(bounds[1][i]-bounds[0][i] for i in range(3))<.01:
            debris.append({'vertices':len(component),'bounds':bounds})
            bmesh.ops.delete(bm,geom=list(component),context='VERTS')
bm.to_mesh(body.data);bm.free()
body.data.materials.clear()
body.data.materials.append(clay)
body.data.materials.append(nose_mat)
nose_index = len(body.data.materials)-1
body.data.update()
for poly in body.data.polygons:
    x, y, z = poly.center
    width = .034*max(.20, 1+.8*(z+.108)/.05)
    if abs(x) < width and -.153 < z < -.108 and y < -.338:
        poly.material_index = nose_index

# A thin closed-mouth crease follows the final head surface. It does not add a
# lip shelf or an open cavity, and its projection is measured after all unions.
mouth_tree=BVHTree.FromPolygons([v.co for v in body.data.vertices],
                               [list(p.vertices) for p in body.data.polygons])
mouth_mat=material('Closed mouth crease',.105)
mouth_paths=[]
for side in [-1,1]:
    mouth_paths.append([(side*.105*t,-.192-.020*math.sin(math.pi*t)-.005*t)
                        for t in np.linspace(0,1,65)])
mouth_paths.append([(0,z) for z in np.linspace(-.151,-.192,25)])
for index,path in enumerate(mouth_paths):
    curve=bpy.data.curves.new('Closed mouth path '+str(index),'CURVE')
    curve.dimensions='3D';curve.bevel_depth=.0013;curve.bevel_resolution=3
    curve.use_fill_caps=True
    spline=curve.splines.new('POLY');spline.points.add(len(path)-1)
    for point,(x,z) in zip(spline.points,path):
        hit,_,_,_=mouth_tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        if hit is None:raise ValueError('Mouth surface ray missed')
        point.co=(x,hit.y-.0003,z,1)
    mouth=bpy.data.objects.new('closed_mouth_'+str(index),curve)
    bpy.context.collection.objects.link(mouth);mouth.data.materials.append(mouth_mat)

body.name = 'cleaned_head_with_openings'
bpy.context.view_layer.objects.active = body
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'refinement.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance_sha, 'sourceSha256': sha(args.mesh), 'scriptSha256': sha(args.out/'refine_source.py'),
    'retainNativeUpperPads': False,
    'muzzlePadField': {'centersXZ':[[-.06,-.170],[.06,-.170]],'radiiXZ':[.065,.072],'projection':.067},
    'closedMouth': {'radius':.0013,'halfWidth':.105,'centerZ':-.192,'surfaceRayCast':True},
    'noseMaterialRegion': {'z':[-.153,-.108],'maximumY':-.338,'halfWidthRule':'.034*max(.20, 1+.8*(z+.108)/.05)'},
    'muzzleFairing': {'method':'Compact C2 surface blend with protected nose', 'domain':'Curved jaw footprint with native boundary positions and tangents'}, 'removedDebris': debris,
    'changes': ['Largest connected component retained', 'Positive-X half mirrored',
                'Region-masked smoothing of scan residue', 'Bounded paired-pad crowns blend into native cheek and chin boundaries',
                'Thin closed mouth follows final surface without an additive lip',
                'Eye apertures cut through fused relief', 'Closed separate eyes and forward-centered irises'],
    'before': before, 'body': mesh_stats(body), 'eyes': eye_records,
    'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.glb', '.blend']}
}, indent=2)+'\n')
