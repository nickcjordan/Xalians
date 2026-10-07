/*
	Shared schema 5 fixtures for the expedition tests.

	The engine reads a creature through `record.actions`, `record.passives`, `record.signature`,
	a bare `record.element`, `record.attributes`, `record.temperament` and the few physiology
	fields the strain rules use. These builders write exactly that shape, so a test states
	what it cares about in one line (an action's kind and intensity, an attribute) and the
	builder fills in a v5 ability around it.

	`v5Ability({ name, action, intensity })` takes the short act word the tests were written
	with and builds a complete v5 action: 'strike' is contact harm, 'beam' and 'hurl' are
	projectile harm, 'burst', 'spray' and 'cloud' are area harm, 'ward' is a self-protect and
	'mend' is a restore. The records are partial on purpose (physiology carries only what the
	rules read), so the builders return `any`; the generator's own tests cover full records.
*/

type Short = {
	key?: string;
	name?: string;
	action?: string;
	intensity?: number;
	signature?: boolean;
	instrument?: string;
};

const AREA_DELIVERY: Record<string, string> = { burst: 'pulse', spray: 'stream', cloud: 'field' };
const PROJECTILE = new Set(['beam', 'hurl']);

const common = {
	activation: { continuity: 'discrete' },
	timing: { preparation: 'immediate', recovery: 'brief' },
};
const effectBase = { onset: 'instant', persistence: 'resolved', likelihood: 'consistent' };

export function v5Ability(short: Short): any {
	const action = short.action || 'strike';
	const name = short.name || action;
	const key = short.key || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	const intensity = typeof short.intensity === 'number' ? short.intensity : 50;
	const base = { key, name, description: `${name}.`, instrument: short.instrument || 'fists', ...common };
	if (action === 'ward') {
		return {
			...base,
			delivery: { mode: 'self', approach: 'stationary' }, targeting: ['self'], spatial: {},
			effects: [{ key: 'guard', type: 'protect', intensity, recipient: 'self', ...effectBase }],
		};
	}
	if (action === 'mend') {
		return {
			...base,
			delivery: { mode: 'self', approach: 'stationary' }, targeting: ['self'], spatial: {},
			effects: [{ key: 'mend', type: 'restore', intensity, recipient: 'self', ...effectBase }],
		};
	}
	if (AREA_DELIVERY[action]) {
		return {
			...base,
			delivery: { mode: AREA_DELIVERY[action], approach: 'stationary' }, targeting: ['other'],
			spatial: { range: 'contact', area: { shape: 'radial', extent: 'medium', anchor: 'target', persistence: 'resolved' } },
			effects: [{ key: 'blow', type: 'harm', mechanism: 'impact', intensity, recipient: 'area', ...effectBase }],
		};
	}
	return {
		...base,
		delivery: { mode: PROJECTILE.has(action) ? 'projectile' : 'contact', approach: PROJECTILE.has(action) ? 'stationary' : 'closing' },
		targeting: ['other'], spatial: { range: 'contact' },
		effects: [{ key: 'blow', type: 'harm', mechanism: 'impact', intensity, recipient: 'target', ...effectBase }],
	};
}

const DEFAULT_ATTRIBUTES = {
	strength: 50, vitality: 50, endurance: 50, agility: 50, reflex: 50,
	intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
};
const DEFAULT_TEMPERAMENT = { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 };
const DEFAULT_PHYSIOLOGY = {
	breathes: ['gas'],
	environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } },
};

/*
	v5Record(fields) -> a schema 5 record.

	fields.abilities is the short act list (see v5Ability); the one marked `signature: true` is
	declared as the record's signature. `element` is a key ('metal'); an `{ primary }` object
	is read as its primary. Everything else passes straight through onto the record.
*/
export function v5Record(fields: any = {}): any {
	const { abilities, element, attributes, ...rest } = fields;
	const acts = (abilities && abilities.length > 0 ? abilities : [{ name: 'Strike', action: 'strike', intensity: 60 }]).map(v5Ability);
	const signed = (abilities || []).findIndex((a: Short) => a && a.signature);
	const record: any = {
		species: 'testling',
		provenance: { serial: 1, origin: 'magmuth' },
		element: typeof element === 'string' ? element : (element && element.primary) || 'fire',
		attributes: { ...DEFAULT_ATTRIBUTES, ...(attributes || {}) },
		physiology: DEFAULT_PHYSIOLOGY,
		temperament: DEFAULT_TEMPERAMENT,
		actions: acts,
		passives: [],
		...rest,
	};
	if (signed >= 0 && !record.signature) {
		record.signature = { type: 'action', key: acts[signed].key };
	}
	return record;
}
