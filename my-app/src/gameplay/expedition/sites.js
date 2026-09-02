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
		};
	});
	if (worlds.some((w) => w === null)) {
		return null;
	}
	return worlds;
}

const WORLDS = normalizeSitesJson(rawSites);

/*
	getWorlds() -> [{ planet, element, sites: [site, site, site] }, ...14 worlds]
*/
export function getWorlds() {
	return WORLDS;
}
