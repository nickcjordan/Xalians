import fs from 'node:fs';
import validator from 'gltf-validator';
const dir=process.argv[2];
const bytes=fs.readFileSync(dir+'/luceras_rigged.glb');
const result=await validator.validateBytes(new Uint8Array(bytes),{uri:'luceras_rigged.glb',maxIssues:1000});
fs.writeFileSync(dir+'/gltf_validation.json',JSON.stringify(result,null,2));
const length=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+length).toString());
const jointCounts=(gltf.skins||[]).map(x=>x.joints.length);
const binStart=20+length+8;
let varyingSamplers=0;
for(const animation of gltf.animations||[])for(const sampler of animation.samplers){
 const a=gltf.accessors[sampler.output],v=gltf.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type];
 if(a.componentType!==5126||!n)continue;
 const base=binStart+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||n*4;
 let varying=false;
 for(let i=1;i<a.count&&!varying;i++)for(let j=0;j<n;j++)if(Math.abs(bytes.readFloatLE(base+i*stride+j*4)-bytes.readFloatLE(base+j*4))>1e-5)varying=true;
 if(varying)varyingSamplers++;
}
const proof={validator:'Khronos glTF Validator 2.0.0-dev.3.10',errors:result.issues.numErrors,warnings:result.issues.numWarnings,jointCounts,meshNames:(gltf.meshes||[]).map(x=>x.name),animations:(gltf.animations||[]).map(x=>({name:x.name,channels:x.channels.length})),noControlNodes:!(gltf.nodes||[]).some(x=>/CTRL_|Luceras_Controls/.test(x.name||'')),noSculptMeshes:!(gltf.meshes||[]).some(x=>/luceras_blockout|^horn_|^eye_|^whiskers_|^fore_claw|^hind_claw/.test(x.name||'')),allSkinned:(gltf.nodes||[]).filter(n=>n.mesh!==undefined).every(n=>n.skin!==undefined)};
proof.varyingAnimationSamplers=varyingSamplers;
proof.meshObjectNames=(gltf.nodes||[]).filter(n=>n.mesh!==undefined).map(n=>n.name);
proof.noSculptMeshes=proof.meshObjectNames.every(n=>n==='game_body_horns_claws'||n==='game_eyes');
proof.triangles=(gltf.meshes||[]).reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+(gltf.accessors[p.indices??p.attributes.POSITION].count/3),0),0);
proof.materials=(gltf.materials||[]).length;
proof.fileBytes=bytes.length;
proof.images=(gltf.images||[]).map(im=>{
 const out={name:im.name,mimeType:im.mimeType};
 if(im.mimeType==='image/png'&&im.bufferView!==undefined){const v=gltf.bufferViews[im.bufferView],p=binStart+(v.byteOffset||0);out.width=bytes.readUInt32BE(p+16);out.height=bytes.readUInt32BE(p+20)}
 return out;
});
proof.passed=proof.errors===0&&jointCounts.every(x=>x<=40)&&proof.noControlNodes&&proof.noSculptMeshes&&proof.allSkinned&&proof.animations.length>0&&varyingSamplers>0&&proof.triangles===11478;
fs.writeFileSync(dir+'/glb_check.json',JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof,null,2));
process.exitCode=proof.passed?0:1;
