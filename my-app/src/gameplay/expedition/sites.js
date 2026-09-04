/*
	Expedition — world and site data access.

	Per docs/design/reclamation-design.md ("The world and its sites"): each world has an
	element and three sites, each with its own environment (medium, temperature band).
	Canonical data lives at lambda/src/json/sites.json, copied to my-app/src/json/sites.json
	by the copy-json build step, authored in the lore voice and validated against the
	planet histories. Shape:

		{ [PlanetName]: [ { id, name, planet, element, environment: { medium,
			temperatureC: {min,max} }, description, source } x3 ] }

	The rules engine never imports this module: createMatch({worlds, ...}) takes a
	`worlds` array as an input, so callers (devtools, tests, the UI) decide which table to
	pass and the engine stays ignorant of where data lives.
*/

import rawSites from '../../json/sites.json';
import planetRecords from '../../json/planetRecords.json';

const PLANETS_BY_NAME = new Map((Array.isArray(planetRecords) ? planetRecords : []).map((p) => [p.name, p]));

// The planet record behind a world: terrain, physical band, hazards, the Generator
// report. Everything the table shows about a world beyond its sites comes from here.
function planetFacts(planetName) {
	const p = PLANETS_BY_NAME.get(planetName);
	if (!p) {
		return {};
	}
	const report = p.report || {};
	return {
		planetKey: p.key,
		terrain: p.physical ? p.physical.terrainLabel : undefined,
		temperatureC: p.physical ? p.physical.temperatureC : undefined,
		gravityVsEarth: p.physical ? p.physical.gravityVsEarth : undefined,
		hazards: Array.isArray(report.hazards) ? report.hazards : [],
		terrainFeatures: report.terrain && Array.isArray(report.terrain.features) ? report.terrain.features : [],
		images: p.images,
	};
}

// Converts the { [PlanetName]: [site, site, site] } shape into the flat per-world array
// the engine consumes: [{ planet, element, sites: [site, site, site] }].
export function normalizeSitesJson(raw) {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const planetNames = Object.keys(raw);
	if (planetNames.length === 0) {
		return null;
	}
	const worlds = planetNames.map((planetName) => {
		const siteList = raw[planetName];
		if (!Array.isArray(siteList) || siteList.length === 0) {
			return null;
		}
		return {
			planet: planetName,
			element: siteList[0].element,
			sites: siteList,
			...planetFacts(planetName),
		};
	});
	if (worlds.some((w) => w === null)) {
		return null;
	}
	return worlds;
}

const WORLDS = normalizeSitesJson(rawSites);

/*
	getWorlds() -> [{ planet, element, sites: [site, site, site], planetKey, terrain,
	temperatureC, gravityVsEarth, hazards, terrainFeatures, images }, ...14 worlds]
	The planet facts come from planetRecords.json (the encyclopedia's planet source).
*/
export function getWorlds() {
	return WORLDS;
}
