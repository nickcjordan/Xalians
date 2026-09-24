import { buildRosters } from '../roster.ts';
import { worldMatchupMultiplier, targetMatchupMultiplier } from '../creatureOnTable.ts';
import planets from '@xalians/content/planetRecords.json';
const { rosterA, rosterB } = buildRosters('why0');
const a: any = rosterA[0]; const b: any = rosterB[0];
console.log('world matchup', a.element, ['fire','water','ice','metal'].map((e) => worldMatchupMultiplier(a, e)));
console.log('target matchup', a.element, 'vs', b.element, targetMatchupMultiplier(a, b));
const pl: any = planets;
const list = Array.isArray(pl) ? pl : Object.values(pl);
const byPlanet: Record<string, string> = {};
list.forEach((p: any) => { byPlanet[String(p.name || p.planet || p.key).toLowerCase()] = String(p.element || p.type).toLowerCase(); });
const seen = new Set<string>();
let mismatch = 0;
[...rosterA, ...rosterB, ...buildRosters('why1').rosterA, ...buildRosters('why2').rosterB, ...buildRosters('why3').rosterA].forEach((r: any) => {
	if (seen.has(r.species)) return; seen.add(r.species);
	const home = byPlanet[String(r.provenance.origin).toLowerCase()];
	if (home !== String(r.element).toLowerCase()) { mismatch++; console.log('MISMATCH', r.species, r.element, r.provenance.origin, home); }
});
console.log('species seen', seen.size, 'mismatch', mismatch, Object.keys(byPlanet).slice(0,3));
