/*
	Expedition — world and site data access.

	Per docs/design/reclamation-design.md ("The world and its sites"): each world has an
	element and three sites, each with its own environment (medium, temperature band).
	Canonical data lives at packages/content/json/sites.json (the @xalians/content workspace
	package), authored in the lore voice and validated against the planet histories. Shape:

		{ [PlanetName]: [ { id, name, planet, element, environment: { medium,
			temperatureC: {min,max} }, description, source } x3 ] }

	The rules engine never imports this module: createMatch({worlds, ...}) takes a
	`worlds` array as an input, so callers (devtools, tests, the UI) decide which table to
	pass and the engine stays ignorant of where data lives.
*/

import rawSites from '@xalians/content/sites.json';
import planetRecords from '@xalians/content/planetRecords.json';
import type { PlanetRecordEntry, Sites } from '@xalians/content/schema';
import type { World, WorldFacts } from './types.ts';

// planetRecords.json is read structurally here (facts joined onto a world by planet name)
// rather than through PlanetRecordsSchema.parse, which is @xalians/content's own job; the
// cast documents the shape this module actually reads off it.
const PLANETS_BY_NAME = new Map<string, PlanetRecordEntry>(
	(Array.isArray(planetRecords) ? (planetRecords as PlanetRecordEntry[]) : []).map((p) => [p.name, p]),
);

// The planet record behind a world: terrain, physical band, hazards, the Generator
// report. Everything the table shows about a world beyond its sites comes from here.
function planetFacts(planetName: string): Omit<WorldFacts, 'planet' | 'element'> {
	const p = PLANETS_BY_NAME.get(planetName);
	if (!p) {
		return {};
	}
	const report = p.report || ({} as PlanetRecordEntry['report']);
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
export function normalizeSitesJson(raw: Sites | null | undefined): World[] | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const planetNames = Object.keys(raw);
	if (planetNames.length === 0) {
		return null;
	}
	const worlds: Array<World | null> = planetNames.map((planetName) => {
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
	return worlds as World[];
}

const WORLDS = normalizeSitesJson(rawSites as Sites);

/*
	getWorlds() -> [{ planet, element, sites: [site, site, site], planetKey, terrain,
	temperatureC, gravityVsEarth, hazards, terrainFeatures, images }, ...14 worlds]
	The planet facts come from planetRecords.json (the encyclopedia's planet source).
*/
export function getWorlds(): World[] {
	return WORLDS || [];
}
