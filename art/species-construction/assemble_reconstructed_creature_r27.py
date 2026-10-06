"""Join corrected construction studies and retain separate ocular/claw objects.

Round 27 copy of assemble_reconstructed_creature.py (the pinned original is untouched). It adds an optional authored
neck column: --neck-sections names a JSON table of sheet-derived elliptic sections (rows of world z, front, back,
half width and superellipse exponent). With the table, (1) head and body vertices in the table's z window move along
horizontal rays from the column axis onto the authored section (smooth z fade, per-row angular weights, capped by
--neck-max-shift) before the cuts, and (2) the bridge loft is built from the authored sections plus a residual that
decays from the stub sections, so it meets both stubs with no step. Without the table every line below runs exactly as
in the original and the geometry is identical."""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_provenance import snapshot
from blender_blockout import material, mesh_stats, sha, sphere, require_single_closed_mesh, remove_voxel_specks

parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--head', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--tail-record', type=Path)
parser.add_argument('--head-scale', type=float, default=.60)
parser.add_argument('--jaw-anchor-z', type=float, default=.538)
parser.add_argument('--head-depth-offset', type=float, default=-.045)
# Where the body is cut for the neck bridge. loop_tools raises it with the jaw anchor when a body was
# retargeted with a different neck length (retarget.json headShiftZ).
parser.add_argument('--body-trim', type=float, default=.425)
# Largest removable remesh flake above the neck, in voxels. Removed pieces are
# recorded with their bounds; anything larger still fails the closed-solid gate.
parser.add_argument('--fragment-voxels', type=float, default=4)
# Neck bridge and fusion shape. Every default is the value that was hard-coded, so a run without these options
# is byte-for-byte today's output. loop_tools.py assemble --join passes them from a join JSON.
parser.add_argument('--head-trim-offset', type=float, default=.048, help='head cut sits this far below the jaw anchor')
parser.add_argument('--neck-inner-offset', type=float, default=.010, help='spacing of the tangent-sampling sections beside each cut')
parser.add_argument('--section-segments', type=int, default=128, help='samples per measured neck outline')
parser.add_argument('--tangent-limit', type=float, default=3, help='endpoint tangents are bounded to this multiple of the loft slope')
parser.add_argument('--bridge-rings', type=int, default=31, help='interior rings of the neck loft')
parser.add_argument('--min-neck-length', type=float, default=.015, help='smallest allowed span between the body and head cuts')
parser.add_argument('--voxel-size', type=float, default=.0028, help='remesh voxel size of the fused body')
parser.add_argument('--fusion-iterations', type=int, default=90, help='smoothing iterations of the neck fusion')
parser.add_argument('--fusion-factor', type=float, default=.6, help='smoothing factor of the neck fusion')
parser.add_argument('--fusion-x-extent', type=float, default=.16, help='half width (x) of the neck fusion region')
parser.add_argument('--fusion-y-extent', type=float, default=.15, help='half depth (y) of the neck fusion region')
parser.add_argument('--fusion-z-below', type=float, default=.03, help='fusion region reaches this far below the body cut')
parser.add_argument('--fusion-z-above', type=float, default=.025, help='fusion region reaches this far above the head cut')
parser.add_argument('--fusion-fade-x', type=float, default=.045)
parser.add_argument('--fusion-fade-y', type=float, default=.035)
parser.add_argument('--fusion-fade-z', type=float, default=.025)
parser.add_argument('--neck-sections', type=Path, default=None, help='JSON table of authored neck sections; absent: no authored neck')
parser.add_argument('--neck-back-fill', type=float, default=0.0, help='world y offset added to the authored back edge (positive moves it backward, away from the sheet), ramped in over z .43 to .465')
parser.add_argument('--neck-exponent', type=float, default=1.0, help='multiplier of the table superellipse exponents (above 1 boxier, below 1 more pointed)')
parser.add_argument('--neck-max-shift', type=float, default=.012, help='cap on how far the stub morph moves any vertex (world), linear to 75 percent of it then saturating')
parser.add_argument('--head-anchor-local-z', type=float, default=.27, help='height of the jaw anchor above the head origin, per unit head scale')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
shutil.copyfile(__file__, args.out/'assembly_source.py')
provenance_sha = snapshot(args.out, __file__, [args.body,args.head]+([args.tail_record] if args.tail_record else []))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def load(path, label, scale=1, offset=(0, 0, 0)):
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    objects = [o for o in bpy.data.objects if o not in prior and o.type == 'MESH']
    for obj in objects:
        transform = obj.matrix_world.copy()
        for v in obj.data.vertices:
            v.co = (transform @ v.co)*scale+Vector(offset)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.name = label+'_'+obj.name
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
        bm.to_mesh(obj.data)
        bm.free()
    return max(objects, key=lambda o: len(o.data.vertices)), objects


body, body_objects = load(args.body, 'body')
require_single_closed_mesh(body, args.out, 'Imported body after seam welding')
head_offset = (0, args.head_depth_offset, args.jaw_anchor_z+args.head_anchor_local_z*args.head_scale)
head, head_objects = load(args.head, 'head', args.head_scale, head_offset)
require_single_closed_mesh(head, args.out, 'Imported head after seam welding')
head_materials = list(head.data.materials)
head_material_indices = [p.material_index for p in head.data.polygons]
head_surface = BVHTree.FromPolygons([v.co for v in head.data.vertices],
                                   [list(p.vertices) for p in head.data.polygons])
nose_material_indices = {i for i, mat in enumerate(head_materials) if 'nose' in mat.name.lower()}
# A head may carry a pale inner-ear coat (author_fan_front_spec_field.py); it is transferred like the nose material.
pale_material_indices = {i for i, mat in enumerate(head_materials) if 'pale inner-ear' in mat.name.lower()}
separate_noses = [obj.name for obj in head_objects if obj != head
                  and any('nose' in mat.name.lower() for mat in obj.data.materials)]
if not nose_material_indices and not separate_noses:
    raise ValueError('Imported head does not identify its nose material')


def horizontal_section(obj, height, segments=args.section_segments):
    """Sample the actual closed neck outline in a horizontal cutting plane."""
    vertices = np.empty(len(obj.data.vertices)*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', vertices)
    vertices = vertices.reshape(-1, 3)
    edges = np.empty(len(obj.data.edges)*2, dtype=np.int32)
    obj.data.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    a, b = vertices[edges[:, 0]], vertices[edges[:, 1]]
    mask = ((a[:, 2] < height) & (b[:, 2] >= height)) | ((b[:, 2] < height) & (a[:, 2] >= height))
    a, b = a[mask], b[mask]
    if len(a) < 32:
        raise ValueError(f'Insufficient native neck section at z={height}')
    points = a+(b-a)*((height-a[:, 2])/(b[:, 2]-a[:, 2]))[:, None]
    center = (points[:, :2].min(axis=0)+points[:, :2].max(axis=0))/2
    relative = points[:, :2]-center
    angles = np.arctan2(relative[:, 1], relative[:, 0])
    radii = np.linalg.norm(relative, axis=1)
    order = np.argsort(angles)
    samples = np.linspace(-math.pi, math.pi, segments, endpoint=False)
    sampled = np.interp(samples, angles[order], radii[order], period=math.tau)
    outline = center+np.stack([np.cos(samples), np.sin(samples)], axis=1)*sampled[:, None]
    return outline, {'height': height, 'intersectionCount': len(points),
                     'minimumXY': points[:, :2].min(axis=0).tolist(),
                     'maximumXY': points[:, :2].max(axis=0).tolist()}


# ---- authored neck column (round 27). Everything below is inert unless --neck-sections is given. ----
SAMPLE_ANGLES = np.linspace(-math.pi, math.pi, args.section_segments, endpoint=False)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def soft_clamp(d, cap):
    """Linear up to 75 percent of the cap, then a smooth saturation at the cap."""
    knee = .75*cap
    a = np.abs(d)
    return np.sign(d)*np.where(a <= knee, a, knee+(cap-knee)*np.tanh((a-knee)/(cap-knee)))


def section_points(obj, height):
    """Raw intersection points of the mesh edges with the plane z = height (N, 3), or None."""
    vertices = np.empty(len(obj.data.vertices)*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', vertices)
    vertices = vertices.reshape(-1, 3)
    edges = np.empty(len(obj.data.edges)*2, dtype=np.int32)
    obj.data.edges.foreach_get('vertices', edges)
    edges = edges.reshape(-1, 2)
    a, b = vertices[edges[:, 0]], vertices[edges[:, 1]]
    mask = ((a[:, 2] < height) & (b[:, 2] >= height)) | ((b[:, 2] < height) & (a[:, 2] >= height))
    a, b = a[mask], b[mask]
    if len(a) < 32:
        return None
    return (a+(b-a)*((height-a[:, 2])/(b[:, 2]-a[:, 2]))[:, None]).astype(np.float64)


class NeckColumn:
    """Sheet-derived neck: at each world z an elliptic (superellipse) section with half width, front and back edges."""
    GRID = .0005

    def __init__(self, path, back_fill, exponent, max_shift):
        self.path = path
        doc = json.loads(path.read_text(encoding='utf-8'))
        rows = sorted(doc['rows'], key=lambda r: r['z'])
        if len(rows) < 3:
            raise ValueError('neck table needs at least three rows')
        self.rows = rows
        self.max_shift = max_shift
        self.back_fill = back_fill
        z = np.array([r['z'] for r in rows], float)
        self.z0, self.z1 = float(z[0]), float(z[-1])
        self.fade = float(doc.get('fade', .012))
        self.residual_fade = float(doc.get('residualFade', .5))
        self.grid = np.arange(self.z0, self.z1+self.GRID/2, self.GRID)
        jaw, jaw_z = float(doc.get('jawFillet', 0)), doc.get('jawFilletZ', [.466, .482])
        base, base_z = float(doc.get('baseFillet', 0)), doc.get('baseFilletZ', [.430, .445])
        self.sigma = np.maximum(float(doc.get('smooth', .003)),
                                np.maximum(jaw*smoothstep((self.grid-jaw_z[0])/(jaw_z[1]-jaw_z[0])),
                                           base*(1-smoothstep((self.grid-base_z[0])/(base_z[1]-base_z[0])))))
        field = lambda key, default=None: np.array([r.get(key, default) for r in rows], float)
        interp = lambda values: np.interp(self.grid, z, values)
        self.half = self._smooth(interp(field('half')))
        self.front = self._smooth(interp(field('front')))
        fill_z = doc.get('fillZ', [.43, .465])
        self.back = (self._smooth(interp(field('back')))
                     + back_fill*smoothstep((self.grid-fill_z[0])/(fill_z[1]-fill_z[0])))
        self.exp = interp(field('exp', 2.0))*exponent
        weight = lambda key: interp(np.array([r.get(key, r.get('w', 1.0)) for r in rows], float))
        self.w_front, self.w_side, self.w_back = weight('wFront'), weight('wSide'), weight('wBack')

    def _smooth(self, values):
        pad = int(np.ceil(3*self.sigma.max()/self.GRID))+1
        ext = np.concatenate([np.full(pad, values[0]), values, np.full(pad, values[-1])])
        out = np.empty_like(values)
        for i in range(len(values)):
            h = int(np.ceil(3*self.sigma[i]/self.GRID))
            k = np.arange(-h, h+1)*self.GRID
            w = np.exp(-.5*(k/self.sigma[i])**2)
            out[i] = (ext[pad+i-h:pad+i+h+1]*w).sum()/w.sum()
        return out

    def at(self, name, z):
        return np.interp(z, self.grid, getattr(self, name))

    def radius(self, theta, z):
        """Radius of the authored section along direction theta from its axis (0, y0) at height z; returns (radius, y0)."""
        a, f, b, n = self.at('half', z), self.at('front', z), self.at('back', z), self.at('exp', z)
        y0, semi = (f+b)/2, (b-f)/2
        c, s = np.cos(theta), np.sin(theta)
        return (np.abs(c/a)**n+np.abs(s/semi)**n)**(-1/n), y0

    def ring(self, z, theta=SAMPLE_ANGLES):
        r, y0 = self.radius(theta, z)
        return np.stack([r*np.cos(theta), y0+r*np.sin(theta)], axis=1)

    def angular_weight(self, theta, z):
        """Per-row weights blended around the section: front at the front (-y), side at the sides, back at the back."""
        psi = np.arccos(np.clip(-np.sin(theta), -1, 1))
        wf, ws, wb = self.at('w_front', z), self.at('w_side', z), self.at('w_back', z)
        front_half = wf+(ws-wf)*smoothstep(psi/(math.pi/2))
        back_half = ws+(wb-ws)*smoothstep((psi-math.pi/2)/(math.pi/2))
        return np.where(psi <= math.pi/2, front_half, back_half)

    def z_weight(self, z):
        return smoothstep((z-self.z0)/self.fade)*smoothstep((self.z1-z)/self.fade)

    def morph(self, obj):
        """Move the object's vertices inside the table window along horizontal rays from the column axis onto the section."""
        count = len(obj.data.vertices)
        co = np.empty(count*3, dtype=np.float32)
        obj.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3).astype(np.float64)
        step = .0025
        levels = np.arange(self.z0, self.z1+step/2, step)
        measured = []
        for level in levels:
            points = section_points(obj, level)
            r_aut, y0 = self.radius(SAMPLE_ANGLES, level)
            if points is None:
                measured.append(None)
                continue
            rel = points[:, :2]-np.array([0, y0])
            r = np.linalg.norm(rel, axis=1)
            keep = r < .14
            angle = np.arctan2(rel[keep, 1], rel[keep, 0])
            order = np.argsort(angle)
            measured.append(np.interp(SAMPLE_ANGLES, angle[order], r[keep][order], period=math.tau))
        record = {'vertices': int(count), 'moved': 0, 'maxShift': 0.0, 'levelsMeasured': int(sum(m is not None for m in measured))}
        if record['levelsMeasured'] < 2:
            return record
        current = np.stack([m if m is not None else np.full(len(SAMPLE_ANGLES), np.nan) for m in measured])
        aut = np.stack([self.radius(SAMPLE_ANGLES, level)[0] for level in levels])
        delta = aut-current                     # authored minus current, per level and angle (nan where unmeasured)
        window = np.where((co[:, 2] > self.z0) & (co[:, 2] < self.z1) & (np.abs(co[:, 0]) < .2))[0]
        if not len(window):
            return record
        z = co[window, 2]
        f = np.clip((z-self.z0)/step, 0, len(levels)-1-1e-9)
        i0 = f.astype(int)
        u = f-i0
        y0 = self.at('front', z)/2+self.at('back', z)/2
        rel = np.stack([co[window, 0], co[window, 1]-y0], axis=1)
        radius = np.linalg.norm(rel, axis=1)
        theta = np.arctan2(rel[:, 1], rel[:, 0])
        p = (theta+math.pi)/math.tau*len(SAMPLE_ANGLES)
        j0 = np.floor(p).astype(int) % len(SAMPLE_ANGLES)
        j1 = (j0+1) % len(SAMPLE_ANGLES)
        v = p-np.floor(p)
        pick = lambda table, i: table[i, j0]*(1-v)+table[i, j1]*v
        d = pick(delta, i0)*(1-u)+pick(delta, i0+1)*u
        r_now = pick(current, i0)*(1-u)+pick(current, i0+1)*u
        valid = np.isfinite(d)
        offset = radius-np.nan_to_num(r_now)
        near = np.where(offset > .004, 1-smoothstep((offset-.004)/.008), np.where(offset < -.02, 1-smoothstep((-.02-offset)/.02), 1.0))
        shift = np.where(valid, soft_clamp(np.nan_to_num(d)*self.angular_weight(theta, z)*self.z_weight(z)*near, self.max_shift), 0.0)
        new_radius = np.maximum(radius+shift, .002)
        co[window, 0] = new_radius*np.cos(theta)
        co[window, 1] = y0+new_radius*np.sin(theta)
        obj.data.vertices.foreach_set('co', co.astype(np.float32).reshape(-1))
        obj.data.update()
        record['moved'] = int(np.count_nonzero(np.abs(shift) > 1e-6))
        record['maxShift'] = float(np.abs(shift).max())
        return record


neck_column = None
neck_morph_record = {}
if args.neck_sections is not None:
    neck_column = NeckColumn(args.neck_sections.resolve(), args.neck_back_fill, args.neck_exponent, args.neck_max_shift)
    neck_morph_record = {'head': neck_column.morph(head), 'body': neck_column.morph(body)}

body_trim, head_trim = args.body_trim, args.jaw_anchor_z-args.head_trim_offset
if head_trim-body_trim < args.min_neck_length:
    raise ValueError('Jaw anchor leaves insufficient space for the measured neck transition')
inner = args.neck_inner_offset
lower_inner, lower_inner_record = horizontal_section(body, body_trim-inner)
lower, lower_record = horizontal_section(body, body_trim)
upper, upper_record = horizontal_section(head, head_trim)
upper_inner, upper_inner_record = horizontal_section(head, head_trim+inner)
length = head_trim-body_trim
slope = (upper-lower)/length
start_tangent = (lower-lower_inner)/inner
end_tangent = (upper_inner-upper)/inner
# Bound endpoint tangents componentwise so interpolation cannot bulge past the
# measured outlines. The former tilted sweep projected in front of the jaw.
for tangent in [start_tangent, end_tangent]:
    tangent[:] = np.where(tangent*slope <= 0, 0,
                          np.sign(slope)*np.minimum(np.abs(tangent), args.tangent_limit*np.abs(slope)))
bridge_rings = []
for outline, height in [(lower_inner, body_trim-inner), (lower, body_trim)]:
    bridge_rings.append([(float(x), float(y), height) for x, y in outline])
if neck_column is not None:
    if body_trim < neck_column.z0 or head_trim > neck_column.z1:
        raise ValueError('The neck table must cover the loft from the body cut to the head cut')
    authored_lower, authored_upper = neck_column.ring(body_trim), neck_column.ring(head_trim)
    rf = max(neck_column.residual_fade, 1e-6)
for t in np.linspace(0, 1, args.bridge_rings+2)[1:-1]:
    outline = ((2*t**3-3*t*t+1)*lower+(t**3-2*t*t+t)*length*start_tangent
               +(-2*t**3+3*t*t)*upper+(t**3-t*t)*length*end_tangent)
    if neck_column is not None:
        # authored section plus the stubs' residuals, each decaying over the residual fade: the ring is the stub's own
        # section at both cuts (no step) and the sheet-derived section in between
        authored = neck_column.ring(body_trim+t*length)
        outline = (authored+(1-smoothstep(t/rf))*(lower-authored_lower)
                   +smoothstep((t-(1-rf))/rf)*(upper-authored_upper))
    bridge_rings.append([(float(x), float(y), body_trim+t*length) for x, y in outline])
for outline, height in [(upper, head_trim), (upper_inner, head_trim+inner)]:
    bridge_rings.append([(float(x), float(y), height) for x, y in outline])
bridge_vertices = [point for ring in bridge_rings for point in ring]
count = len(lower)
bridge_faces = []
for ring in range(len(bridge_rings)-1):
    for i in range(count):
        j = (i+1) % count
        bridge_faces.append((ring*count+i, ring*count+j, (ring+1)*count+j, (ring+1)*count+i))
bridge_faces.extend([tuple(reversed(range(count))),
                     tuple((len(bridge_rings)-1)*count+i for i in range(count))])
bridge_mesh = bpy.data.meshes.new('Measured horizontal neck loft')
bridge_mesh.from_pydata(bridge_vertices, [], bridge_faces)
bridge_mesh.update()
bridge = bpy.data.objects.new('Measured neck bridge', bridge_mesh)
bpy.context.collection.objects.link(bridge)
bm = bmesh.new(); bm.from_mesh(bridge_mesh)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(bridge_mesh); bm.free()
require_single_closed_mesh(bridge, args.out, 'Measured neck bridge before fusion')
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                      dist=.000001, plane_co=(0, 0, head_trim), plane_no=(0, 0, 1), clear_inner=True)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(head.data)
bm.free()
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                      dist=.000001, plane_co=(0, 0, body_trim), plane_no=(0, 0, 1), clear_outer=True)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(body.data)
bm.free()
require_single_closed_mesh(body, args.out, 'Body neck plane trim')
require_single_closed_mesh(head, args.out, 'Head neck plane trim')
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
head.select_set(True)
bridge.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.data.remesh_voxel_size = args.voxel_size
bpy.ops.object.voxel_remesh()
neck = body.vertex_groups.new(name='Neck fusion')
def fade(value, low, high):
    t = max(0, min(1, (value-low)/(high-low)))
    return t*t*(3-2*t)

for v in body.data.vertices:
    x, y, z = v.co
    weight = (fade(args.fusion_x_extent-abs(x), 0, args.fusion_fade_x)*fade(y+args.fusion_y_extent, 0, args.fusion_fade_y)
              *fade(args.fusion_y_extent-y, 0, args.fusion_fade_y)*fade(z-(body_trim-args.fusion_z_below), 0, args.fusion_fade_z)
              *fade(head_trim+args.fusion_z_above-z, 0, args.fusion_fade_z))
    if weight > 0:
        neck.add([v.index], weight, 'REPLACE')
mod = body.modifiers.new('Blend head and neck', 'SMOOTH')
mod.vertex_group = neck.name
mod.iterations = args.fusion_iterations
mod.factor = args.fusion_factor
bpy.ops.object.modifier_apply(modifier=mod.name)
tip_corrections=[]
contact_correction=None
if args.tail_record:
    tail_record=json.loads(args.tail_record.read_text())
    if tail_record['outputs']['shape.glb'] != sha(args.body):
        raise ValueError('Tail controls do not belong to the supplied body')
    for controls in tail_record['tailControls']:
        tip=Vector(controls[-1][:3]);prior=Vector(controls[-2][:3])
        direction=(tip-prior).normalized()
        selected=[v for v in body.data.vertices if (v.co-tip).length<.06]
        if not selected:raise ValueError('No mesh vertices near recorded tail tip')
        maximum=max((v.co-tip).dot(direction) for v in selected)
        for vertex in selected:
            delta=vertex.co-tip;along=delta.dot(direction)
            t=max(0,min(1,(along+.055)/(maximum+.055)))
            radial=delta-direction*along
            vertex.co=tip+direction*(along-maximum*t*t)+radial*(1-t**3)
        tip_corrections.append({'endpoint':list(tip),'beforeMaximumOffset':maximum,'vertices':len(selected)})
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
    if 'groundContact' in tail_record:
        floor=tail_record['groundContact']['floorZ']
        blend=tail_record['groundContact']['blendHeight']
        count=0
        for vertex in body.data.vertices:
            x,y,z=vertex.co
            if abs(x)>.25 and z<floor+blend:
                t=max(0,min(1,(z-floor)/blend))
                vertex.co.z=floor+blend*(6*t**3-8*t**4+3*t**5)
                count+=1
        contact_correction={'floorZ':floor,'blendHeight':blend,'affectedVertices':count}
bpy.ops.mesh.customdata_custom_splitnormals_clear()
body.data.validate(clean_customdata=True)
body.data.materials.clear()
body.data.materials.append(material('Continuous construction clay', .38))
if nose_material_indices:
    body.data.materials.append(head_materials[min(nose_material_indices)])
pale_slot = None
if pale_material_indices:
    body.data.materials.append(head_materials[min(pale_material_indices)])
    pale_slot = len(body.data.materials)-1
pale_faces = 0
body.data.update()
for poly in body.data.polygons:
    poly.use_smooth = True
    if nose_material_indices and poly.center.z > .49:
        _, _, face_index, distance = head_surface.find_nearest(poly.center)
        if (face_index is not None and distance < .0075
                and head_material_indices[face_index] in nose_material_indices):
            poly.material_index = 1
    if pale_slot is not None and poly.center.z > .60 and abs(poly.center.x) > .17:
        _, _, face_index, distance = head_surface.find_nearest(poly.center)
        if (face_index is not None and distance < .006
                and head_material_indices[face_index] in pale_material_indices):
            poly.material_index = pale_slot
            pale_faces += 1
body.name = 'akinza_continuous_construction'
fragment_limit = args.fragment_voxels*body.data.remesh_voxel_size
removed_fragments = remove_voxel_specks(body, max_extent=fragment_limit, min_z=.49)
require_single_closed_mesh(body, args.out, 'Final assembly including corrected tail tips')
neck_authored_record = None
if neck_column is not None:
    rows = []
    for row in neck_column.rows:
        z = row['z']
        points = section_points(body, z)
        achieved = None
        if points is not None:
            keep = points[(np.abs(points[:, 0]) < .12) & (points[:, 1] > -.2) & (points[:, 1] < .12)]
            if len(keep):
                achieved = {'half': float((keep[:, 0].max()-keep[:, 0].min())/2), 'front': float(keep[:, 1].min()),
                            'back': float(keep[:, 1].max()), 'centerX': float((keep[:, 0].max()+keep[:, 0].min())/2)}
        rows.append({'z': z, 'target': {'half': float(neck_column.at('half', z)), 'front': float(neck_column.at('front', z)),
                                        'back': float(neck_column.at('back', z))},
                     'weights': {'front': float(neck_column.at('w_front', z)), 'side': float(neck_column.at('w_side', z)),
                                 'back': float(neck_column.at('w_back', z))},
                     'achieved': achieved})
    neck_authored_record = {'table': str(neck_column.path), 'sha256': sha(neck_column.path), 'backFill': args.neck_back_fill,
                            'exponent': args.neck_exponent, 'maxShift': args.neck_max_shift, 'morph': neck_morph_record,
                            'loft': {'bodyCut': body_trim, 'headCut': head_trim, 'residualFade': neck_column.residual_fade},
                            'rows': rows}
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
(args.out/'assembly.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance_sha, 'scope': 'Internal whole-creature reconciliation, not animation topology',
    'inputs': {str(args.head): sha(args.head), str(args.body): sha(args.body)},
    'headTransform': {'scale': args.head_scale, 'translation': list(head_offset), 'neckTrimZ': head_trim,
                      'jawAnchor': {'headLocalZ': -args.head_anchor_local_z, 'worldZ': args.jaw_anchor_z}},
    'neck': 'Native horizontal sections joined by bounded Hermite loft and locally relaxed',
    'join': {k: (v if not isinstance(v, Path) else str(v)) for k, v in vars(args).items()
             if k not in ('body', 'head', 'out', 'tail_record')},
    'neckSections': [lower_inner_record, lower_record, upper_record, upper_inner_record],
    'neckAuthored': neck_authored_record,
    'seamWeldDistance': .000001,
    'noseMaterialTransfer': 'Nearest imported head polygon within .0075 world units after remesh',
    'paleMaterialTransfer': {'slot': pale_slot, 'faces': pale_faces, 'rule': 'nearest imported head polygon within .006 world units, |x| above .17, z above .60'},
    'separateNoseObjectsPreserved': separate_noses,
    'tipCorrectionsAfterFinalRemesh': tip_corrections,
    'groundContactAfterFinalRemesh': contact_correction,
    'removedTinyHeadFragments': removed_fragments,
    'tinyHeadFragmentLimit': {'vertices':16,'extent':fragment_limit,'minimumZ':.49},
    'scriptSha256': sha(args.out/'assembly_source.py'),
    'objects': {o.name: mesh_stats(o) for o in bpy.context.scene.objects if o.type == 'MESH'},
    'outputs': {f.name: sha(f) for f in args.out.iterdir() if f.suffix in ['.blend', '.glb']}
}, indent=2)+'\n')
