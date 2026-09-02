/*
	*** PROVISIONAL / THROWAWAY TEST DATA - NEVER CANON ***

	Deterministically rolls full creature records (matching the ratified shape in
	docs/design/xalian-creature-data-structure.md / docs/design/sample-record-graviclaw.json)
	from the hand-sketched templates in provisionalSpecies.js. Used only to feed the
	Tribute rules engine and simulator before the real generator exists. Physiology
	fields outside what Tribute reads are stubbed with plausible-looking placeholders -
	do not treat any of it as canon or as a preview of the real generator's output.
*/

import { PROVISIONAL_SPECIES } from './provisionalSpecies.js';
import { createRngState, nextRandom } from '../tributeRules.js';

const ARCHETYPE_KEYS = [
	'vanguard', 'juggernaut', 'berserker', 'bulwark', 'survivor', 'stalwart',
	'skirmisher', 'runner', 'prowler', 'predator', 'seeker', 'sage',
	'virtuoso', 'sovereign', 'rogue', 'balanced',
];

const ELEMENTS = [
	'fire', 'water', 'air', 'electric', 'rock', 'plant', 'chemical', 'light',
	'dark', 'psychic', 'ghost', 'metal', 'ice', 'sand',
];

const NEUTRAL_BAND = [30, 70];

function makeRng(seed) {
	let state = createRngState(seed);
	return {
		float() {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
		int(maxExclusive) {
			return Math.floor(this.float() * maxExclusive);
		},
		range(lo, hi) {
			return lo + Math.floor(this.float() * (hi - lo + 1));
		},
		pick(array) {
			return array[this.int(array.length)];
		},
	};
}

function rollAttributes(rng, attributeBands) {
	const attrs = {};
	const keys = [
		'strength', 'vitality', 'endurance', 'agility', 'reflex',
		'intelligence', 'willpower', 'instinct', 'charisma', 'resilience',
	];
	keys.forEach((key) => {
		const band = (attributeBands && attributeBands[key]) || NEUTRAL_BAND;
		attrs[key] = rng.range(band[0], band[1]);
	});
	return attrs;
}

function rollElement(rng, primary) {
	const affinities = { [primary]: 100 };
	// 75% mono / 25% graded secondary 1-99, per the ratified record contract
	if (rng.float() < 0.25) {
		let secondary = primary;
		while (secondary === primary) {
			secondary = rng.pick(ELEMENTS);
		}
		affinities[secondary] = rng.range(1, 99);
	}
	return { primary, affinities };
}

function rollAbilityName(rng, action) {
	// throwaway flavor text, not the real name catalog
	const adjectives = ['Sudden', 'Hollow', 'Bound', 'Wracked', 'Silent', 'Rending', 'Undertow'];
	const nouns = ['Reach', 'Strike', 'Verge', 'Choir', 'Line', 'Grasp', 'Fold'];
	return `${rng.pick(adjectives)} ${rng.pick(nouns)}`;
}

function rollAbility(rng, template, action) {
	return {
		name: rollAbilityName(rng, action),
		signature: false,
		instrument: rng.pick(template.instruments),
		action,
		medium: template.element,
		intensity: rng.range(20, 100),
	};
}

function rollAbilities(rng, template) {
	const count = rng.range(2, 3); // signature + 2-3 rolled
	const abilities = [];
	for (let i = 0; i < count; i++) {
		const action = rng.pick(template.actionPool);
		abilities.push(rollAbility(rng, template, action));
	}
	return abilities;
}

function buildSignature(template, serial) {
	return {
		name: template.signature.name,
		signature: true,
		instrument: template.signature.instrument,
		action: template.signature.action,
		medium: template.element,
		intensity: 70 + (serial * 7) % 31, // the lore-defining act runs strong (70-100) but not uniform, so cards spread out
		description: template.signature.description,
	};
}

function pad(n, width) {
	return String(n).padStart(width, '0');
}

/*
	rollXalians(count, seed) -> array of full creature records, deterministic under seed.
	Cycles through PROVISIONAL_SPECIES for variety.
*/
export function rollXalians(count, seed) {
	const rng = makeRng(seed);
	const records = [];

	for (let i = 0; i < count; i++) {
		const template = PROVISIONAL_SPECIES[i % PROVISIONAL_SPECIES.length];
		const serial = Math.floor(i / PROVISIONAL_SPECIES.length) + 1;

		const attributes = rollAttributes(rng, template.attributeBands);
		const element = rollElement(rng, template.element);
		const archetypeKey = rng.pick(ARCHETYPE_KEYS);

		const abilities = [buildSignature(template, serial), ...rollAbilities(rng, template)];

		const record = {
			id: `xal_prov_${template.key}_${pad(serial, 4)}`,
			species: template.key,
			provenance: {
				seed: `provisional-${seed}-${i}`,
				generatorVersion: 'provisional-0.0.0',
				schemaVersion: '1.0.0',
				generatedAt: new Date(0).toISOString(),
				origin: template.origin,
				serial,
			},
			physiology: {
				corporeality: 'corporeal',
				composition: { primary: 'flesh' },
				bodyPlan: 'biped',
				anatomy: template.instruments.filter((i2) => i2 !== 'body' && i2 !== 'mind' && i2 !== 'gaze'),
				covering: 'hide',
				heightCm: rng.range(60, 300),
				weightKg: rng.range(20, 500),
				lifespan: 'standard',
				genome: { chirality: rng.float() < 0.5 ? 'levo' : 'dextro' },
				diet: 'omnivore',
				communication: ['vibration'],
				breathes: ['gas'],
				environmentalTolerance: {
					ambientMedia: ['gas'],
					temperatureC: { min: -10, max: 40 },
				},
				capabilities: {
					flight: 0, swim: 0, burrow: 0, climb: 0, sprint: 0, leap: 0, manipulation: 0,
				},
				senses: { sight: 50, hearing: 50, smell: 50 },
			},
			archetype: { key: archetypeKey, favors: [] },
			attributes,
			element,
			traits: { guaranteed: [], rolled: [] },
			temperament: {
				boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50,
			},
			appearance: { finish: 'standard' },
			abilities,
		};

		records.push(record);
	}

	return records;
}
