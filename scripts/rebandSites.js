// Clamps every Reclamation site's temperature band to its planet's habitable band.
//
// Why: the 42 sites in lambda/src/json/sites.json were authored before the species
// records existed and several span the planet's physical extremes (the Ash Wastes of
// Magmuth run 65 to 355 C). The ratified species records band every species inside its
// planet's habitable band (docs/species-templates/RULINGS.md, "Planet rebuild"), so a
// site band wider than that band would strain a creature standing on its own home
// ground. The habitable band is not bundled anywhere yet, so this script approximates it
// from the native species: the intersection of their tolerance bands (so no native is
// strained by temperature on its own world), or their union when the bands do not meet.
//
// A site whose authored band does not overlap the habitable band at all is hostile ground
// by its own lore (the Fissure Forges, Luminax's dark side, the Krystos catacombs): its
// band stands as authored and every creature is strained there unless a trait exempts it
// (luminous on Luminax, nocturnal on Grimedes). The authored band is kept on the site as `authoredTemperatureC` and a
// `bandNote` explains the clamp. Idempotent: it always works from `authoredTemperatureC`
// when present.
//
//   node scripts/rebandSites.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsonDir = path.join(root, 'lambda', 'src', 'json');
const sitesPath = path.join(jsonDir, 'sites.json');
const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));
const species = JSON.parse(fs.readFileSync(path.join(jsonDir, 'speciesRecords.json'), 'utf8')).records;

// The planet's habitable band is approximated from its native species: the intersection
// of their tolerance bands when it is non-empty (so no native is ever strained at a site
// inside it), else the union.
const unions = {};
const intersections = {};
species.forEach((s) => {
	const band = s.physiology.environmentalTolerance.temperatureC;
	const key = s.homePlanet;
	if (!unions[key]) {
		unions[key] = { min: band.min, max: band.max };
		intersections[key] = { min: band.min, max: band.max };
	} else {
		unions[key].min = Math.min(unions[key].min, band.min);
		unions[key].max = Math.max(unions[key].max, band.max);
		intersections[key].min = Math.max(intersections[key].min, band.min);
		intersections[key].max = Math.min(intersections[key].max, band.max);
	}
});
const habitable = {};
Object.keys(unions).forEach((key) => {
	const i = intersections[key];
	habitable[key] = i.min <= i.max ? i : unions[key];
});

let changed = 0;
Object.keys(sites).forEach((planetName) => {
	const key = planetName.toLowerCase();
	const hab = habitable[key];
	if (!hab) {
		console.warn(`no native species for ${planetName}; bands left as authored`);
		return;
	}
	sites[planetName].forEach((site) => {
		const authored = site.authoredTemperatureC || site.environment.temperatureC;
		let min = Math.max(authored.min, hab.min);
		let max = Math.min(authored.max, hab.max);
		let how = 'intersection';
		if (min > max) {
			// no overlap: the site is hostile ground by its own lore (a lava forge, the
			// dark side of Luminax, APEX's cold catacombs); every creature is strained
			// there unless a trait exempts it, so the authored band stands
			min = authored.min;
			max = authored.max;
			how = 'kept as authored: lies wholly outside the habitable band, hostile to every creature';
		}
		const before = JSON.stringify(site.environment.temperatureC);
		site.authoredTemperatureC = { min: authored.min, max: authored.max };
		site.environment.temperatureC = { min, max };
		site.bandNote = `Authored ${authored.min} to ${authored.max} C; clamped 2026-09-03 to the planet's habitable band ${hab.min} to ${hab.max} C (from native species tolerances) by ${how}. scripts/rebandSites.js`;
		if (before !== JSON.stringify(site.environment.temperatureC)) {
			changed += 1;
			console.log(`${site.id}: ${authored.min}..${authored.max} -> ${min}..${max} (${how})`);
		}
	});
});

fs.writeFileSync(sitesPath, JSON.stringify(sites, null, 2) + '\n');
console.log(`habitable bands:`, JSON.stringify(habitable));
console.log(`${changed} site bands changed`);
