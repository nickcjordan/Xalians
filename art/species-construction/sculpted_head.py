"""Akinza construction experiment: recessed eyes and directional coat volumes.

Coordinates are proposed authoring controls, not recovered animal measurements.
No generated image is used as render geometry or as a texture.
"""
import math
import random
from mathutils import Vector
import bpy
from authored_surfaces import mesh_object


def gauss(x, z, cx, cz, sx, sz):
    return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)


def face_y(x, z):
    # Independent cheek, muzzle, nasal bridge, brow and socket fields.
    zz=(z-5.28)/.565
    width=.60*math.sqrt(max(.0001,1-zz*zz))
    baseline=.035-.405*math.sqrt(max(.0001,1-zz*zz-(x/.60)**4))
    edge=max(0,1-(abs(x)/max(.01,width))**6)
    value=-.065*gauss(abs(x),z,.34,5.06,.23,.21)
    value-=.15*gauss(abs(x),z,.105,4.96,.145,.11)
    value-=.065*gauss(x,z,0,4.85,.22,.10)
    value-=.050*gauss(x,z,0,5.18,.105,.25)
    value+=.025*gauss(abs(x),z,.248,5.27,.15,.225)
    return baseline+value*edge


def head_mesh():
    vertices=[];faces=[];rings=128;count=192
    for i in range(rings+1):
        phi=math.pi*(.00005+.9999*i/rings)
        z=5.28+.565*math.cos(phi)
        width=.60*math.sin(phi)
        for j in range(count):
            a=2*math.pi*j/count
            x=width*math.sin(a)
            y=.035+.405*math.sin(phi)*math.cos(a)
            if math.cos(a)<0:
                y=face_y(x,z)
            # Rounded side cheek volume without a pointed jaw cage.
            x*=1+.075*math.exp(-((z-5.03)/.17)**2)*abs(math.sin(a))**4
            vertices.append((x,y,z))
        if i:
            for j in range(count):
                a=(i-1)*count+j;b=(i-1)*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
    faces.extend([tuple(reversed(range(count))),tuple(rings*count+j for j in range(count))])
    return mesh_object('head_sculpt_fields',vertices,faces)


def coat_clump(name, path, width, thickness, normal, variant):
    """Swept asymmetric coat wedge with changing section and transported frame."""
    a,b,c,d=map(Vector,path);out=Vector(normal).normalized()
    verts=[];faces=[];rings=22;count=18
    for i in range(rings+1):
        t=i/rings
        center=(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
        tangent=(3*(1-t)**2*(b-a)+6*(1-t)*t*(c-b)+3*t*t*(d-c)).normalized()
        axis=tangent.cross(out).normalized();dep=axis.cross(tangent).normalized()
        shoulder=.16+.08*variant
        envelope=(.48+.52*min(1,t/shoulder))*(max(.001,1-t)**(.72+.2*variant))
        depth=thickness*(.6+.4*math.sin(math.pi*t))*(max(.002,1-t)**.6)
        for j in range(count):
            angle=2*math.pi*j/count
            lateral=math.cos(angle)
            asym=1+(.12+.10*variant)*lateral
            # Raised central ridge, flatter underside, no spherical bulb.
            height=math.sin(angle)
            height=height**.72 if height>=0 else height*.38
            v=center+axis*(width*envelope*lateral*asym)+dep*(depth*height)
            verts.append(tuple(v))
        if i:
            for j in range(count):
                a0=(i-1)*count+j;b0=(i-1)*count+(j+1)%count
                faces.append((a0,b0,b0+count,a0+count))
    faces.extend([tuple(reversed(range(count))),tuple(rings*count+j for j in range(count))])
    return mesh_object(name,verts,faces)


def ear_point(side,u,v,back=False):
    x=1.00+.665*u
    z=5.49+.345*v+.15*u
    radius=u*u+v*v
    y=.055+.19*max(0,1-radius)+.09*u+( .13 if back else 0)
    return Vector((side*x,y,z))


def ear_shell(side):
    verts=[];faces=[];rings=36;count=120
    for back in (False,True):
        for i in range(rings+1):
            r=max(.0001,i/rings)
            for j in range(count):
                t=2*math.pi*j/count
                verts.append(tuple(ear_point(side,r*math.cos(t),r*math.sin(t),back)))
        base=int(back)*(rings+1)*count
        for i in range(rings):
            for j in range(count):
                a=base+i*count+j;b=base+i*count+(j+1)%count
                faces.append((a,b,b+count,a+count))
        faces.append(tuple(base+j for j in reversed(range(count))))
    stride=(rings+1)*count
    for j in range(count):
        a=rings*count+j;b=rings*count+(j+1)%count
        faces.append((a,b,b+stride,a+stride))
    return mesh_object('ear_cup_'+str(side),verts,faces)


def ear_coat(side,seed=19):
    rng=random.Random(seed);parts=[]
    # Offset rows overlap, revealing a large inner tissue opening.
    for row,n in []:
        for i in range(n):
            angle=math.radians(-114+(234*i/(n-1))+(5 if row else 0))
            radial=.77 if row==0 else .56
            u=math.cos(angle);v=math.sin(angle)
            a=ear_point(side,radial*u,radial*v)
            tip=ear_point(side,(1.15-.14*row)*u,(1.18-.13*row)*v)
            a.y-=.025+.020*row;tip.y-=.055+.035*row
            # Flow sweeps outward, with the distal ends bending down.
            tip.x+=side*(.055+.045*rng.random())
            tip.z-=.025+.06*(1-v)*rng.random()
            length=tip-a
            b=a+length*.30+Vector((0,-.035,.045))
            c=a+length*.76+Vector((0,-.05,.025))
            parts.append(coat_clump(f'ear_front_{side}_{row}_{i}',[a,b,c,tip],.060+.026*rng.random(),.040+.016*rng.random(),(0,-1,0),rng.random()))
    # Coat covers the rear shell and overlaps the cranial root.
    # Broad front groups share an outward sweep rather than radiating as spikes.
    for row in range(3):
        for i in range(7):
            x=.46+.14*i+.045*row
            z=5.57+.075*row+.05*math.sin(i*.45)
            y=-.025+.035*i/6-.018*row
            a=Vector((side*x,y+.028,z))
            d=Vector((side*(x+.34+.08*rng.random()),y+.07,z+.12-.11*i/6))
            b=a+Vector((side*.12,-.045,.10))
            c=d+Vector((-side*.09,-.065,.055))
            parts.append(coat_clump(f'ear_canopy_{side}_{row}_{i}',[a,b,c,d],.070+.026*rng.random(),.033+.009*rng.random(),(0,-1,0),rng.random()))
    for row in range(2):
        for i in range(10):
            x=.52+i*.108+.035*row
            z=5.16+.28*(i/9)**1.6+.07*row
            a=Vector((side*x,.105-.04*row,z+.13))
            d=Vector((side*(x+.12+.07*rng.random()),.035,z-.12+.06*row))
            b=a+Vector((side*.09,-.07,.01));c=d+Vector((side*.02,-.035,.075))
            parts.append(coat_clump(f'ear_lower_{side}_{row}_{i}',[a,b,c,d],.064+.02*rng.random(),.042,(0,-1,0),rng.random()))
    for row in range(5):
        for i in range(13):
            angle=math.radians(-100+210*i/12+5*(row%2))
            r=.02+.19*row
            a=ear_point(side,r*math.cos(angle),r*math.sin(angle),True)
            tip=ear_point(side,min(1.10,r+.36)*math.cos(angle),min(1.14,r+.37)*math.sin(angle),True)
            a.y-=.043;tip.y+=.012
            delta=tip-a
            b=a+delta*.33+Vector((0,.025,.025))
            c=a+delta*.75+Vector((0,.035,.025))
            parts.append(coat_clump(f'ear_back_{side}_{row}_{i}',[a,b,c,tip],.067+.027*rng.random(),.035+.016*rng.random(),(0,1,0),rng.random()))
    return parts


def scalp_coat():
    rng=random.Random(47);parts=[]
    # Crown flows up and back. Rooted overlaps continue down cheeks and occiput.
    for side in [-1,1]:
        for row in range(3):
            for i in range(8):
                x=side*(.025+i*.051)
                z=5.57+.045*row-.10*(i/7)**2
                y=face_y(x,z)+.015
                a=Vector((x,y,z));d=a+Vector((side*(.055+.055*i/7),.09+.07*row,.16+.025*rng.random()))
                parts.append(coat_clump(f'crown_{side}_{row}_{i}',[a,a+Vector((side*.02,-.006,.07)),d-Vector((side*.025,.065,.02)),d],.039+.010*rng.random(),.018,(0,-1,0),rng.random()))
        for row in range(2):
            for i in range(9):
                z=4.91+i*.058
                x=side*(.43+.07*math.sin(i/8*math.pi)-.035*row)
                a=Vector((x,face_y(x,z)+.04+.018*row,z))
                d=a+Vector((side*(.13+.03*rng.random()),.105,-.075-.055*rng.random()))
                parts.append(coat_clump(f'cheek_{side}_{row}_{i}',[a,a+Vector((side*.04,-.035,0)),d-Vector((side*.04,.035,-.02)),d],.055+.011*rng.random(),.030,(0,-1,0),rng.random()))
    for row in range(6):
        for i in range(15):
            angle=-1.3+2.6*i/14
            z=5.65-.12*row
            width=.60*math.sqrt(max(.001,1-((z-5.28)/.565)**2))
            a=Vector((width*math.sin(angle),.035+.405*math.sqrt(max(.001,1-((z-5.28)/.565)**2))*math.cos(angle)-.025,z))
            d=a+Vector((.04*math.sin(angle),.03,-.17))
            parts.append(coat_clump(f'occiput_{row}_{i}',[a,a+Vector((0,.025,-.04)),d+Vector((0,.04,.06)),d],.058,.025,(0,1,0),rng.random()))
    return parts


def eye_point(side,r,angle):
    x=side*.248+.169*r*math.cos(angle)
    z=5.265+.237*r*math.sin(angle)
    y=-.354-.097*math.sqrt(max(.0001,1-(r*.94)**2))
    return x,y,z


def eye_geometry(side,mats):
    # Curved eye is independent of skull slope; lid bridges into the socket.
    parts=[];verts=[];faces=[];nr=40;nt=128
    for i in range(nr+1):
        r=max(.0001,i/nr)
        for j in range(nt): verts.append(eye_point(side,r,2*math.pi*j/nt))
        if i:
            for j in range(nt):
                a=(i-1)*nt+j;b=(i-1)*nt+(j+1)%nt;faces.append((a,b,b+nt,a+nt))
    eye=mesh_object(f'curved_eye_{side}',verts,faces);eye.data.materials.append(mats['white']);parts.append(eye)
    verts=[];faces=[]
    for i in range(13):
        t=i/12;r=1+.17*t
        for j in range(nt):
            angle=2*math.pi*j/nt;x,y,z=eye_point(side,r,angle)
            _,inner,_=eye_point(side,1,angle)
            outer=face_y(x,z)+.012
            smooth=t*t*(3-2*t)
            y=inner*(1-smooth)+outer*smooth-(.006+.008*max(0,math.sin(angle)))*math.sin(math.pi*t)
            verts.append((x,y,z))
        if i:
            for j in range(nt):
                a=(i-1)*nt+j;b=(i-1)*nt+(j+1)%nt;faces.append((a,b,b+nt,a+nt))
    lid=mesh_object(f'socket_lid_{side}',verts,faces)
    lid.data.materials.append(mats['clay']);lid.data.materials.append(mats['rim'])
    for poly in lid.data.polygons: poly.material_index=1 if poly.index<nt else 0
    parts.append(lid)
    verts=[];faces=[]
    for i in range(33):
        r=max(.0001,i/32)
        for j in range(nt):
            angle=2*math.pi*j/nt
            x=side*.248+.078*r*math.cos(angle);z=5.265+.145*r*math.sin(angle)
            er=math.sqrt(((x-side*.248)/.169)**2+((z-5.265)/.237)**2)
            y=-.355-.097*math.sqrt(max(.0001,1-(er*.94)**2))
            verts.append((x,y,z))
        if i:
            for j in range(nt):
                a=(i-1)*nt+j;b=(i-1)*nt+(j+1)%nt;faces.append((a,b,b+nt,a+nt))
    pupil=mesh_object(f'forward_pupil_{side}',verts,faces);pupil.data.materials.append(mats['pupil']);parts.append(pupil)
    return parts


def build(mats):
    pieces=[head_mesh()]
    for side in [-1,1]: pieces.extend([ear_shell(side),*ear_coat(side)])
    pieces+=scalp_coat()
    return pieces
