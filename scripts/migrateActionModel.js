// Schema-4 migration choices are authored defaults, not factual measurements.
// Frozen v2/v3 releases retain their original definitions.
const fs=require('fs');const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
function migrate(a, passive=false){
 if(a.spatial)return a;
 const old=a.delivery;const ongoing=old.persistence==='maintained';
 a.activation={operation:ongoing?'ongoing':'discrete'};
 if(!passive)a.timing={preparation:'brief',recovery:'brief'};
 a.delivery={mode:old.mode,approach:old.approach};
 const centered=['field','pulse'].includes(old.mode);
 const self=a.targeting.relation==='self';
 a.spatial={selectivity:['field','pulse','stream'].includes(old.mode)?'indiscriminate':'selective'};
 if(!self&&!centered)a.spatial.range=old.mode==='contact'?'contact':old.mode==='projectile'||(old.mode==='stream'&&old.shape==='focused')?'medium':'short';
 if(!self&&centered)a.spatial.area={shape:'radial',extent:'medium',anchor:'creature'};
 else if(!self&&old.shape==='diffuse')a.spatial.area={shape:'cone',extent:'medium',anchor:'creature'};
 else if(!self&&old.shape==='sweep')a.spatial.area={shape:'sweep',extent:'small',anchor:'creature'};
 // Anchored cones/sweeps still have outward range. Only radial/field areas have no remote boundary.
 if(a.spatial.area?.anchor==='creature'&&a.spatial.area.shape==='radial')delete a.spatial.range;
 a.effects=a.effects.map((e,i)=>{
 const {persistence,...payload}=e;
 const p=ongoing?'sustained':old.persistence==='residual'?'lingering':'resolved';
 return {...payload,recipient:self?'self':a.spatial.area?'area':e.recipient||'target',emphasis:i===0?'primary':'secondary',onset:'instant',persistence:p,...(p==='lingering'?{duration:'brief'}:{}),likelihood:'consistent'};
 });
 return a;
}
const manifest=read('docs/species-templates/RATIFIED.json');
for(const key of manifest.species){const p='docs/species-templates/'+key+'.json';const t=read(p);if(t.schemaVersion==='4.0.0')continue;const passive=key==='bioflim';const a=migrate(t.signatureAbility,passive);if(key==='hippochamp'){a.activation.operation='ongoing';a.effects.forEach(e=>e.persistence='sustained');}t.signature={kind:passive?'passive':'action',key:a.key};t.actions=passive?[]:[a];t.passives=passive?[a]:[];t.actionPool=t.abilityPool;delete t.signatureAbility;delete t.abilityPool;t.schemaVersion='4.0.0';write(p,t);}
const patterns=read('docs/ability-catalog/ability-patterns.json');patterns.patterns.forEach(a=>migrate(a));patterns.version='4.0.0';write('docs/ability-catalog/ability-patterns.json',patterns);
manifest.version='4.0.0';write('docs/species-templates/RATIFIED.json',manifest);
