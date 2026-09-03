/*
	The Xalian generator: expands a seed into a full creature record from a ratified
	species template.

	This is the "expand(seed, generatorVersion, mintOrigin)" pipeline of
	docs/design/xalian-creature-system-redesign.md section 9, in generation order:
	archetype, attributes, physiology, affinity, traits, appearance, abilities,
	temperament. The record it produces is the shape in docs/design/
	xalian-creature-data-structure.md: nature only, no game numbers. Games derive.

	It is React-free and imports no game code. It lives under my-app/src/gameplay for now,
	next to the games that consume it; when the Lambda mints real Scrambler Tokens this
	file moves to lambda/src/ unchanged (it is plain ES module code with no browser
	dependencies).

	Everything tunable is in ./constants.js and pinned by GENERATOR_VERSION.
*/

import { makeRng } from './prng.js';
import {
	GENERATOR_VERSION,
	SCHEMA_VERSION,
	ATTRIBUTE_KEYS,
	CAPABILITY_KEYS,
	GRADED_SENSE_KEYS,
	TEMPERAMENT_KEYS,
	ELEMENT_ADJACENCY,
	SECONDARY_AFFINITY_CHANCE,
	FAVORED_DRAWS,
	TRAIT_EXCLUSIONS,
	TILT_STRENGTH,
	TRAIT_TILTS,
	FINISH_ODDS,
	ROLLED_ABILITY_COUNT,
	ROLLED_INTENSITY_BAND,
	SECONDARY_MEDIUM_SHARE,
	CONDUIT_ACTIONS_BY_MEDIUM,
	TEMPERAMENT_ATTRIBUTE_PULL,
	TEMPERAMENT_JITTER,
	TEMPERAMENT_TILTS,
} from './constants.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clamp(n, lo, hi) {
	return Math.max(lo, Math.min(hi, n));
}

function band(value, fallback) {
	if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
		return [Math.min(value[0], value[1]), Math.max(value[0], value[1])];
	}
	return fallback;
}

// where a rolled value sits in its band, 0 at the bottom and 1 at the top
function percentile(value, [lo, hi]) {
	if (hi <= lo) {
		return 0.5;
	}
	return clamp((value - lo) / (hi - lo), 0, 1);
}

function rollInBand(rng, [lo, hi]) {
	return rng.range(lo, hi);
}

// favored attributes skew toward the band top: best of FAVORED_DRAWS draws
function rollFavoredInBand(rng, [lo, hi]) {
	let best = lo;
	for (let i = 0; i < FAVORED_DRAWS; i++) {
		best = Math.max(best, rng.range(lo, hi));
	}
	return best;
}

// ---------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------

function rollArchetype(rng, template, registries) {
	const weights = Object.entries(template.archetypeWeights || { balanced: 100 });
	const key = rng.weighted(weights);
	const row = (registries.archetypes || []).find((a) => a.key === key);
	return { key, favors: row && Array.isArray(row.favors) ? row.favors.slice() : [] };
}

function rollAttributes(rng, template, archetype) {
	const attributes = {};
	const bands = {};
	ATTRIBUTE_KEYS.forEach((key) => {
		const b = band(template.attributes && template.attributes[key], [30, 70]);
		bands[key] = b;
		attributes[key] = archetype.favors.includes(key) ? rollFavoredInBand(rng, b) : rollInBand(rng, b);
	});
	return { attributes, bands };
}

function rollPhysiology(rng, template) {
	const src = template.physiology || {};
	const size = src.size || {};
	const heightBand = band(size.heightCm, [100, 200]);
	const weightBand = band(size.weightKg, [50, 150]);
	// a band that starts under 5 (a floating Neph weighs a few kilograms) keeps one
	// decimal so its whole band is reachable; everything else rolls whole units
	const sizeRound = (value, [lo]) => (lo < 5 ? Math.round(value * 10) / 10 : Math.round(value));
	const heightCm = sizeRound(heightBand[0] + (heightBand[1] - heightBand[0]) * rng.float(), heightBand);
	// weight follows height with some scatter, so a tall individual is usually heavy too
	const heightP = percentile(heightCm, heightBand);
	const weightP = clamp(heightP + (rng.float() - 0.5) * 0.5, 0, 1);
	const weightKg = sizeRound(weightBand[0] + (weightBand[1] - weightBand[0]) * weightP, weightBand);

	const capabilities = {};
	const capabilityBands = {};
	CAPABILITY_KEYS.forEach((key) => {
		const b = band(src.capabilities && src.capabilities[key], [0, 0]);
		capabilityBands[key] = b;
		capabilities[key] = rollInBand(rng, b);
	});

	const senses = {};
	const senseBands = {};
	GRADED_SENSE_KEYS.forEach((key) => {
		const b = band(src.senses && src.senses[key], [0, 0]);
		senseBands[key] = b;
		senses[key] = rollInBand(rng, b);
	});
	if (Array.isArray(src.senses && src.senses.special) && src.senses.special.length > 0) {
		senses.special = src.senses.special.slice();
	}

	const chiralityRule = src.genome && src.genome.chirality;
	const chirality = chiralityRule === 'achiral' ? 'achiral' : (rng.chance(0.5) ? 'levo' : 'dextro');

	const composition = { primary: (src.composition && src.composition.primary) || 'flesh' };
	if (src.composition && src.composition.secondary) {
		composition.secondary = src.composition.secondary;
	}

	const tolerance = src.environmentalTolerance || {};
	const physiology = {
		corporeality: src.corporeality || 'corporeal',
		composition,
		bodyPlan: src.bodyPlan || 'biped',
		anatomy: Array.isArray(src.anatomy) ? src.anatomy.slice() : [],
		covering: src.covering || 'bare',
		heightCm,
		weightKg,
		lifespan: src.lifespan || 'standard',
		genome: { chirality },
		diet: src.diet || 'none',
		communication: Array.isArray(src.communication) ? src.communication.slice() : [],
		breathes: Array.isArray(src.breathes) ? src.breathes.slice() : [],
		environmentalTolerance: {
			ambientMedia: Array.isArray(tolerance.ambientMedia) ? tolerance.ambientMedia.slice() : [],
			temperatureC: tolerance.temperatureC
				? { min: tolerance.temperatureC.min, max: tolerance.temperatureC.max }
				: { min: -10, max: 40 },
		},
		capabilities,
		senses,
	};
	return { physiology, heightBand, weightBand, capabilityBands, senseBands };
}

function rollAffinities(rng, template) {
	const primary = template.element;
	const affinities = { [primary]: 100 };
	const graph = ELEMENT_ADJACENCY[primary] || [];
	let secondary = null;
	if (graph.length > 0 && rng.chance(SECONDARY_AFFINITY_CHANCE)) {
		secondary = rng.pick(graph);
		affinities[secondary] = rng.range(1, 99);
	}
	return { element: { primary, affinities }, secondary };
}

// the quantity a tilt reads, as a 0..1 percentile of its band
function tiltPercentile(spec, ctx) {
	const [kind, name] = spec.on.split(':');
	switch (kind) {
		case 'mass':
			return percentile(ctx.physiology.weightKg, ctx.weightBand);
		case 'height':
			return percentile(ctx.physiology.heightCm, ctx.heightBand);
		case 'capability':
			return percentile(ctx.physiology.capabilities[name], ctx.capabilityBands[name]);
		case 'attribute':
			return percentile(ctx.attributes[name], ctx.attributeBands[name]);
		case 'senses': {
			const ps = GRADED_SENSE_KEYS.map((k) => percentile(ctx.physiology.senses[k], ctx.senseBands[k]));
			return ps.reduce((a, b) => a + b, 0) / ps.length;
		}
		case 'affinity':
			return clamp((ctx.element.affinities[name] || 0) / 100, 0, 1);
		default:
			return 0.5;
	}
}

function tiltedPercent(key, percent, ctx) {
	if (percent >= 100) {
		return 100;
	}
	const spec = TRAIT_TILTS[key];
	if (!spec) {
		return clamp(percent, 1, 99);
	}
	if (key === 'phasing' && ctx.physiology.corporeality !== 'corporeal') {
		return 100;
	}
	const p = tiltPercentile(spec, ctx);
	const factor = 1 + TILT_STRENGTH * (p - 0.5) * spec.dir;
	return clamp(Math.round(percent * factor), 1, 99);
}

function rollTraits(rng, template, ctx) {
	const pool = (template.traits && template.traits.pool) || {};
	const tilted = Object.keys(pool)
		.filter((key) => pool[key] > 0)
		.map((key) => ({ key, percent: tiltedPercent(key, pool[key], ctx) }));

	// a non-corporeal body phases whether or not the template listed it
	if (ctx.physiology.corporeality === 'non-corporeal' && !tilted.some((t) => t.key === 'phasing')) {
		tilted.push({ key: 'phasing', percent: 100 });
	}

	// exclusion partners: the higher percent rolls first, its partner skips if it lands
	const order = tilted.slice().sort((a, b) => b.percent - a.percent);
	const landed = [];
	const partnerOf = (key) => {
		const pair = TRAIT_EXCLUSIONS.find((p) => p.includes(key));
		return pair ? pair.find((k) => k !== key) : null;
	};
	order.forEach(({ key, percent }) => {
		const partner = partnerOf(key);
		if (partner && landed.includes(partner)) {
			return;
		}
		if (percent >= 100 || rng.chance(percent / 100)) {
			landed.push(key);
		}
	});
	// stored in template order so two individuals of a species list traits alike
	return Object.keys(pool).concat(['phasing']).filter((k, i, arr) => landed.includes(k) && arr.indexOf(k) === i);
}

function rollFinish(rng) {
	const r = rng.float();
	let acc = 0;
	for (const [finish, odds] of FINISH_ODDS) {
		acc += odds;
		if (r < acc) {
			return finish;
		}
	}
	return 'standard';
}

function instrumentRow(registries, instrument) {
	const table = registries.instrumentActions || {};
	return Array.isArray(table[instrument]) ? table[instrument] : [];
}

function allowedActions(registries, template, instrument, medium) {
	const row = instrumentRow(registries, instrument).slice();
	const conduits = template.conduits || {};
	if (conduits[instrument] === medium) {
		(CONDUIT_ACTIONS_BY_MEDIUM[medium] || []).forEach((a) => {
			if (!row.includes(a)) {
				row.push(a);
			}
		});
	}
	return row;
}

function entryName(e) {
	return Array.isArray(e) ? e[0] : e;
}

function entryAllows(e, instrument) {
	return !Array.isArray(e) || e[1].includes(instrument);
}

// name candidates: the medium's cell for the action plus the neutral pool, filtered to
// names this instrument may carry and names this creature has not used yet
function nameCandidates(catalog, medium, action, instrument, usedNames) {
	const cell = (catalog.elements && catalog.elements[medium] && catalog.elements[medium][action]) || [];
	const neutral = (catalog.neutral && catalog.neutral[action]) || [];
	const pick = (list) => list.filter((e) => entryAllows(e, instrument) && !usedNames.has(entryName(e).toLowerCase())).map(entryName);
	return { owned: pick(cell), neutral: pick(neutral) };
}

function rollAbilities(rng, template, element, secondary, registries, catalog) {
	const signatureSrc = template.signatureAbility || {};
	const sigBand = band(signatureSrc.intensity, [60, 90]);
	const signature = {
		name: signatureSrc.name || 'Signature',
		signature: true,
		instrument: signatureSrc.instrument || 'body',
		action: signatureSrc.action || 'strike',
		medium: signatureSrc.medium || element.primary,
		intensity: rollInBand(rng, sigBand),
	};
	if (signatureSrc.description) {
		signature.description = signatureSrc.description;
	}

	const abilities = [signature];
	const usedNames = new Set([signature.name.toLowerCase()]);
	const usedActions = new Set([signature.action]);
	const instruments = Array.isArray(template.instruments) && template.instruments.length > 0 ? template.instruments : ['body'];
	const count = rng.range(ROLLED_ABILITY_COUNT[0], ROLLED_ABILITY_COUNT[1]);

	let attempts = 0;
	while (abilities.length < count + 1 && attempts < 40) {
		attempts += 1;
		const instrument = rng.pick(instruments);
		const medium = secondary && rng.chance(SECONDARY_MEDIUM_SHARE) ? secondary : element.primary;
		const allowed = allowedActions(registries, template, instrument, medium);
		if (allowed.length === 0) {
			continue;
		}
		// prefer an action this creature does not already have, so its act list has range
		const fresh = allowed.filter((a) => !usedActions.has(a));
		const action = rng.pick(fresh.length > 0 ? fresh : allowed);
		const { owned, neutral } = nameCandidates(catalog, medium, action, instrument, usedNames);
		// owned names carry the element's texture; the neutral pool is the fallback the
		// catalog notes reserve for thin cells
		let name;
		if (owned.length > 0 && (neutral.length === 0 || rng.chance(0.8))) {
			name = rng.pick(owned);
		} else if (neutral.length > 0) {
			name = rng.pick(neutral);
		} else {
			continue;
		}
		usedNames.add(name.toLowerCase());
		usedActions.add(action);
		abilities.push({
			name,
			signature: false,
			instrument,
			action,
			medium,
			intensity: rollInBand(rng, ROLLED_INTENSITY_BAND),
		});
	}
	return abilities;
}

function rollTemperament(rng, attributes, archetype, traits) {
	const temperament = {};
	TEMPERAMENT_KEYS.forEach((axis) => {
		const spec = TEMPERAMENT_TILTS[axis] || { attributes: [] };
		let center = 50;
		if (spec.attributes && spec.attributes.length > 0) {
			const mean = spec.attributes.reduce((n, k) => n + (attributes[k] || 50), 0) / spec.attributes.length;
			center += (mean - 50) * TEMPERAMENT_ATTRIBUTE_PULL;
		}
		Object.entries(spec.traits || {}).forEach(([trait, nudge]) => {
			if (traits.includes(trait)) {
				center += nudge;
			}
		});
		if (spec.archetypes && spec.archetypes[archetype.key]) {
			center += spec.archetypes[archetype.key];
		}
		const jitter = rng.range(-TEMPERAMENT_JITTER, TEMPERAMENT_JITTER);
		temperament[axis] = clamp(Math.round(center + jitter), 0, 100);
	});
	return temperament;
}

// ---------------------------------------------------------------------------
// generateXalian
// ---------------------------------------------------------------------------

/*
	generateXalian({ template, seed, origin, serial, generatedAt, registries, catalog })
	  -> creature record

	template:    a ratified species template (one entry of speciesRecords.json records)
	seed:        the genome; any string or number. Same seed + same GENERATOR_VERSION
	             always yields the same record.
	origin:      planet key whose Generator expands the token (defaults to the species'
	             home planet)
	serial:      Nth of this species ever generated (bookkeeping; the caller knows)
	generatedAt: ISO timestamp (defaults to now; pass a fixed value for golden fixtures)
	registries:  registries.json (archetype favors, instrument action rows)
	catalog:     abilityCatalog.json (name cells)
*/
export function generateXalian({ template, seed, origin, serial, generatedAt, registries, catalog }) {
	if (!template || !template.key) {
		throw new Error('generateXalian: a species template with a key is required');
	}
	const root = makeRng(`${template.key}|${seed}|${GENERATOR_VERSION}`);

	const archetype = rollArchetype(root.fork('archetype'), template, registries || {});
	const { attributes, bands: attributeBands } = rollAttributes(root.fork('attributes'), template, archetype);
	const phys = rollPhysiology(root.fork('physiology'), template);
	const { element, secondary } = rollAffinities(root.fork('affinity'), template);

	const tiltContext = {
		physiology: phys.physiology,
		heightBand: phys.heightBand,
		weightBand: phys.weightBand,
		capabilityBands: phys.capabilityBands,
		senseBands: phys.senseBands,
		attributes,
		attributeBands,
		element,
	};
	const traits = rollTraits(root.fork('traits'), template, tiltContext);
	const finish = rollFinish(root.fork('appearance'));
	const abilities = rollAbilities(root.fork('abilities'), template, element, secondary, registries || {}, catalog || {});
	const temperament = rollTemperament(root.fork('temperament'), attributes, archetype, traits);
	const id = `xal_${root.fork('id').hex(20)}`;

	return {
		id,
		species: template.key,
		provenance: {
			seed: String(seed),
			generatorVersion: GENERATOR_VERSION,
			schemaVersion: SCHEMA_VERSION,
			generatedAt: generatedAt || new Date().toISOString(),
			origin: origin || template.homePlanet,
			serial: typeof serial === 'number' ? serial : 1,
		},
		physiology: phys.physiology,
		archetype,
		attributes,
		element,
		traits,
		temperament,
		appearance: { finish },
		abilities,
	};
}

/*
	generateBatch({ templates, seed, count, registries, catalog, generatedAt })
	  -> array of records, cycling through the templates in order so a batch of N covers
	     every species about N / templates.length times. Deterministic under seed.
*/
export function generateBatch({ templates, seed, count, registries, catalog, generatedAt }) {
	if (!Array.isArray(templates) || templates.length === 0) {
		return [];
	}
	const records = [];
	for (let i = 0; i < count; i++) {
		const template = templates[i % templates.length];
		const serial = Math.floor(i / templates.length) + 1;
		records.push(generateXalian({
			template,
			seed: `${seed}-${i}`,
			origin: template.homePlanet,
			serial,
			generatedAt,
			registries,
			catalog,
		}));
	}
	return records;
}
