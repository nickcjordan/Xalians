"""Reference-guided section surfaces for construction, authored in model units.

These are explicit geometry controls, not inferred biological measurements.
"""
import math

import bpy
import bmesh
from surface_math import profile


def mesh_object(name, verts, faces):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    return obj


def section_surface(spec):
    """Closed authored cage. Rows are [axis, halfwidth, low, high, centerX]."""
    rows=spec['sections']
    verts,faces=[],[]
    rings,count=96,64
    for r in range(rings+1):
        axis=rows[0][0]+(rows[-1][0]-rows[0][0])*r/rings
        width,low,high,cx=profile(rows,axis)
        for j in range(count):
            t=2*math.pi*j/count
            x=cx+width*math.sin(t)
            other=(low+high)/2+(high-low)/2*math.cos(t)
            if spec.get('axis','z')=='z':
                verts.append((x,other,axis))
            else:
                verts.append((x,axis,other))
        if r:
            for j in range(count):
                a=(r-1)*count+j;b=(r-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces += [tuple(reversed(range(count))),tuple(rings*count+j for j in range(count))]
    return mesh_object(spec['id'],verts,faces)


def coat_lock(spec):
    """Broad tapered coat mass, rooted under its supporting surface."""
    from mathutils import Vector
    a,b,c=map(Vector,spec['path'])
    width_axis=Vector(spec['widthAxis']).normalized()
    depth_axis=Vector(spec['depthAxis']).normalized()
    verts,faces=[],[]
    rings,count=24,24
    for i in range(rings+1):
        t=i/rings
        center=(1-t)**2*a+2*t*(1-t)*b+t*t*c
        taper=max(.015,math.sin(math.pi*(.15+.85*t))**spec.get('taperExponent',.8)*(1-.25*t))
        for j in range(count):
            angle=2*math.pi*j/count
            v=center+width_axis*(spec['width']*taper*math.cos(angle))+depth_axis*(spec['depth']*taper*math.sin(angle))
            verts.append(tuple(v))
        if i:
            for j in range(count):
                u=(i-1)*count+j;v=(i-1)*count+(j+1)%count
                faces.append((u,v,v+count,u+count))
    faces += [tuple(reversed(range(count))),tuple(rings*count+j for j in range(count))]
    return mesh_object(spec['id'],verts,faces)


def front_surface(rows,x,z):
    width,front,back=profile(rows,z)
    center=(front+back)/2
    ratio=max(-.999,min(.999,x/max(width,.001)))
    return center-(back-front)/2*math.sqrt(max(.001,1-ratio*ratio))


def facial_relief(spec,x,z):
    width=profile(spec['sections'],z)[0]
    weight=max(0,1-(x/max(.001,width))**2)**2
    cheek=spec.get('cheekRelief',0)*math.exp(-((abs(x)-.27)/.20)**2-((z-5.09)/.22)**2)
    muzzle=spec.get('muzzleRelief',0)*math.exp(-(x/.23)**4-((z-5.02)/.12)**2)
    muzzle+=spec.get('muzzlePads',0)*math.exp(-((abs(x)-.115)/.14)**2-((z-4.99)/.12)**2)
    return (cheek+muzzle)*weight


def head_surface(spec):
    rows=spec['sections']
    rings,count=96,128
    verts,faces=[],[]
    for r in range(rings+1):
        z=rows[0][0]+(rows[-1][0]-rows[0][0])*r/rings
        width,front,back=profile(rows,z)
        for j in range(count):
            angle=2*math.pi*j/count
            x=width*math.sin(angle)
            y=(front+back)/2+(back-front)/2*math.cos(angle)
            if math.cos(angle)<0:
                # Broad cheek and shallow central muzzle, integrated in the cage.
                y-=facial_relief(spec,x,z)
            verts.append((x,y,z))
        if r:
            for j in range(count):
                a=(r-1)*count+j;b=(r-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces += [tuple(reversed(range(count))),tuple(rings*count+j for j in range(count))]
    return mesh_object('reference_head_surface',verts,faces)


def ear_surface(side,spec):
    """Longitudinal shell cage with independent upper/lower contours and cup."""
    rows=spec['sections']
    count,rings=48,56
    verts,faces=[],[]
    for back in (0,1):
        for i in range(rings+1):
            x=rows[0][0]+(rows[-1][0]-rows[0][0])*i/rings
            bottom,top,rim,cup,thickness=profile(rows,x)
            for j in range(count+1):
                v=-1+2*j/count
                z=(top+bottom)/2+(top-bottom)/2*v
                y=rim+(spec.get('backCup',cup) if back else cup)*(1-v*v)+back*thickness
                if spec.get('coatEnvelope'):
                    envelope=math.sin(math.pi*(x-rows[0][0])/(rows[-1][0]-rows[0][0]))**.5
                    # Fringe affects only the silhouette margin, never the inner cup.
                    fringe=(.018*math.sin(x*31+.4)+.014*math.sin(x*47))
                    if spec.get('fringeKnots'):
                        lower,upper=profile(spec['fringeKnots'],x)
                        fringe=lower if v<0 else upper
                    z+=envelope*fringe*abs(v)**8
                    if spec.get('integratedCup'):
                        u=(x-rows[0][0])/(rows[-1][0]-rows[0][0])
                        y+=.20*max(0,(u-.55)/.45)**2
                        if not back:
                            y+=.19*math.exp(-((x-.64)/.285)**4-((v-.12)/.61)**4)
                            weight=max(0,min(1,(x-.72)/.42))*envelope*(1-v*v)
                            if spec.get('flowLocks'):
                                for lock in spec['flowLocks']:
                                    start,end,v0,v1,v2,width,relief=lock
                                    t=(x-start)/(end-start)
                                    if 0<t<1:
                                        center=(1-t)**2*v0+2*t*(1-t)*v1+t*t*v2
                                        spread=width*(1-.72*t)
                                        y-=relief*math.sin(math.pi*t)**.7*math.exp(-((v-center)/spread)**2)
                            else:
                                ridges=sum(math.exp(-((v-line+.20*u)/.18)**2) for line in [-.48,.04,.58])
                                y-=.043*weight*ridges
                verts.append((side*x,y,z))
    stride=(rings+1)*(count+1)
    for back in (0,1):
        for i in range(rings):
            for j in range(count):
                a=back*stride+i*(count+1)+j
                face=(a,a+1,a+count+2,a+count+1)
                faces.append(face if back else tuple(reversed(face)))
    boundary=list(range(count+1))
    boundary += [i*(count+1)+count for i in range(1,rings+1)]
    boundary += [rings*(count+1)+j for j in range(count-1,-1,-1)]
    boundary += [i*(count+1) for i in range(rings-1,0,-1)]
    for i,a in enumerate(boundary):
        b=boundary[(i+1)%len(boundary)]
        faces.append((a,b,b+stride,a+stride))
    return mesh_object(f'reference_ear_surface_{side}',verts,faces)


def eye_surface(part,head,mat):
    rows=head['sections']
    verts,faces=[],[]
    rings,count=18,96
    for ring in range(rings+1):
        r=max(.001,ring/rings)
        for j in range(count):
            theta=2*math.pi*j/count
            x=part['center'][0]+part['scale'][0]*r*math.cos(theta)
            z=part['center'][2]+part['scale'][2]*r*math.sin(theta)
            y=front_surface(rows,x,z)-part['relief']-part.get('bulge',.008)*(1-r*r)
            # Match the cage's cheek transition below the eye.
            y-=facial_relief(head,x,z)
            verts.append((x,y,z))
        if ring:
            for j in range(count):
                a=(ring-1)*count+j;b=(ring-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces.append(tuple(reversed(range(count))))
    obj=mesh_object(part['id'],verts,faces)
    obj.data.materials.append(mat)
    return obj


def orbital_surface(spec,head,mats):
    """One continuous flesh, lid and eye surface without stacked plaque edges."""
    verts,faces=[],[]
    rings,count=72,192
    rx,rz=spec['radii']
    cx,cz=spec['center']
    for i in range(rings+1):
        r=max(.0001,i/rings)
        for j in range(count):
            t=2*math.pi*j/count
            x,z=cx+rx*r*math.cos(t),cz+rz*r*math.sin(t)
            y=front_surface(head['sections'],x,z)-facial_relief(head,x,z)
            y+=.018*r**12
            y-=.040*(1-r*r)**1.5
            verts.append((x,y,z))
        if i:
            for j in range(count):
                a=(i-1)*count+j;b=(i-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces.append(tuple(reversed(range(count))))
    obj=mesh_object(spec['id'],verts,faces)
    keys=['clay','rim','white','pupil']
    for key in keys: obj.data.materials.append(mats[key])
    for face in obj.data.polygons:
        x,z=face.center.x,face.center.z
        r=math.sqrt(((x-cx)/rx)**2+((z-cz)/rz)**2)
        pupil=((x-cx)/spec['pupilRadii'][0])**2+((z-cz)/spec['pupilRadii'][1])**2
        face.material_index=0 if r>.845 else (1 if r>.81 else 2)
    # Exact oval pupil boundary on the same curved surface, without plaque relief.
    verts,faces=[],[]
    for i in range(33):
        r=max(.0001,i/32)
        for j in range(count):
            t=2*math.pi*j/count
            x=cx+spec['pupilRadii'][0]*r*math.cos(t)
            z=cz+spec['pupilRadii'][1]*r*math.sin(t)
            radius=math.sqrt(((x-cx)/rx)**2+((z-cz)/rz)**2)
            y=front_surface(head['sections'],x,z)-facial_relief(head,x,z)
            y+=.018*radius**12-.040*(1-radius*radius)**1.5-.0008
            verts.append((x,y,z))
        if i:
            for j in range(count):
                a=(i-1)*count+j;b=(i-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces.append(tuple(reversed(range(count))))
    pupil=mesh_object(spec['id']+'-pupil',verts,faces)
    pupil.data.materials.append(mats['pupil'])
    return obj
