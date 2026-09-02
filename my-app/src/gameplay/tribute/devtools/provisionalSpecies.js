/*
	*** PROVISIONAL / THROWAWAY TEST DATA - NEVER CANON ***

	These are hand-sketched species templates used only to exercise the Tribute rules
	engine before the real generator produces creature records (see docs/design/
	tribute-design.md, "Path to playing it" step 1: "the generator does not exist yet, so
	first playtests need hand-authored or script-generated records following the ratified
	template"). None of this is lore, none of it should be migrated into
	lambda/src/json/species.json, and none of it should be read by any non-devtools code.
	Delete freely once real generated creatures exist.

	Each template covers: element, 1-2 instruments, an action pool (consistent with the
	design doc's range classes), attribute bands per attribute (as [lo, hi]), and a
	signature ability. rollProvisionalXalians.js turns these into full records matching
	docs/design/xalian-creature-data-structure.md's ratified shape.
*/

// attribute band helper - every attribute must have a band; unlisted attributes default
// to a neutral [30, 70] band in the roller.
function bands(overrides) {
	const base = {
		strength: [30, 70],
		vitality: [30, 70],
		endurance: [30, 70],
		agility: [30, 70],
		reflex: [30, 70],
		intelligence: [30, 70],
		willpower: [30, 70],
		instinct: [30, 70],
		charisma: [30, 70],
		resilience: [30, 70],
	};
	return { ...base, ...overrides };
}

export const PROVISIONAL_SPECIES = [
	// --- pure-contact species (2) ---
	{
		key: 'stonebrawler',
		element: 'rock',
		origin: 'stonera',
		instruments: ['fists', 'body'],
		actionPool: ['strike', 'crush', 'shove'],
		attributeBands: bands({ strength: [70, 95], resilience: [65, 90], agility: [10, 30], reflex: [15, 35] }),
		signature: { name: 'Jorian Reckoning', instrument: 'fists', action: 'crush', description: 'Channels a belt-storm impact into one crushing blow.' },
	},
	{
		key: 'magmauler',
		element: 'fire',
		origin: 'magmuth',
		instruments: ['fists', 'tail'],
		actionPool: ['strike', 'crush', 'rake'],
		attributeBands: bands({ strength: [65, 90], vitality: [55, 85], reflex: [10, 30], charisma: [10, 30] }),
		signature: { name: 'Massacre Grip', instrument: 'fists', action: 'strike', description: 'The bare-knuckle blow every Magmuth blood feud opens with.' },
	},

	// --- projection species (2) ---
	{
		key: 'nephdrifter',
		element: 'air',
		origin: 'saiphus',
		instruments: ['vents', 'body'],
		actionPool: ['burst', 'cloud', 'lash'],
		attributeBands: bands({ endurance: [70, 95], instinct: [45, 70], strength: [15, 35], resilience: [15, 35] }),
		signature: { name: 'Benthane Bloom', instrument: 'vents', action: 'burst', description: 'Vents a hydrogen bloom lit by static, the Windsailor protest-bomb made flesh.' },
	},
	{
		key: 'gravenmaw',
		element: 'dark',
		origin: 'grimedes',
		instruments: ['gaze', 'jaws'],
		actionPool: ['beam', 'ambush', 'strike'],
		attributeBands: bands({ instinct: [70, 95], strength: [40, 65], charisma: [10, 30], willpower: [40, 60] }),
		signature: { name: 'Event Collapse', instrument: 'gaze', action: 'beam', description: 'Focuses a bounded gravity well down a beam of pure void.' },
	},

	// --- reach species (2) ---
	{
		key: 'coilwhip',
		element: 'plant',
		origin: 'floria',
		instruments: ['tendrils', 'body'],
		actionPool: ['lash', 'snare', 'drain'],
		attributeBands: bands({ agility: [65, 90], vitality: [55, 80], strength: [20, 40], charisma: [15, 35] }),
		signature: { name: "World Tree's Reach", instrument: 'tendrils', action: 'lash', description: 'A whip-crack of root and vine grown city-tall in a heartbeat.' },
	},
	{
		key: 'shockstrider',
		element: 'electric',
		origin: 'zolton',
		instruments: ['antennae', 'body'],
		actionPool: ['lash', 'snare', 'strike'],
		attributeBands: bands({ reflex: [70, 95], agility: [55, 80], willpower: [15, 35], charisma: [15, 35] }),
		signature: { name: 'Bloodstorm Lattice', instrument: 'antennae', action: 'snare', description: 'Traces a crimson-lightning net that entangles anything it touches, QED-fast.' },
	},

	// --- support-heavy species (1) ---
	{
		key: 'aegiscrown',
		element: 'metal',
		origin: 'veridium',
		instruments: ['body', 'core'],
		actionPool: ['ward', 'mend', 'shove'],
		attributeBands: bands({ willpower: [70, 95], intelligence: [55, 85], strength: [30, 55], agility: [10, 30] }),
		signature: { name: 'Worldship Bastion', instrument: 'core', action: 'ward', description: 'Draws on the ancient worldship\'s core to throw up a plating field that holds an entire line.' },
	},

	// --- filling out element/planet variety (4 more, mixed range classes) ---
	{
		key: 'tidewarden',
		element: 'water',
		origin: 'poseidas',
		instruments: ['fins', 'body'],
		actionPool: ['spray', 'drain', 'shove'],
		attributeBands: bands({ endurance: [60, 90], vitality: [60, 85], agility: [30, 50], charisma: [30, 55] }),
		signature: { name: 'Death Tide Reprise', instrument: 'body', action: 'spray', description: 'Recreates, in miniature, the algael bloom that once drowned a coastline.' },
	},
	{
		key: 'hollowdrift',
		element: 'ghost',
		origin: 'phantiri',
		instruments: ['mind', 'body'],
		actionPool: ['terrorize', 'ambush', 'drain'],
		attributeBands: bands({ instinct: [55, 80], willpower: [55, 80], charisma: [45, 75], strength: [10, 25] }),
		signature: { name: 'Dreadscape Toll', instrument: 'mind', action: 'terrorize', description: "Opens a sliver of the corpse-piled Dreadscape in the enemy's mind." },
	},
	{
		key: 'permafrostguard',
		element: 'ice',
		origin: 'krystos',
		instruments: ['claws', 'body'],
		actionPool: ['crush', 'ward', 'strike'],
		attributeBands: bands({ resilience: [70, 95], strength: [55, 80], agility: [15, 35], instinct: [30, 50] }),
		signature: { name: 'Catacomb Lockdown', instrument: 'body', action: 'ward', description: 'Freezes the ground itself into a barrier remembered from APEX\'s cold-storage vaults.' },
	},
	{
		key: 'psiweaver',
		element: 'psychic',
		origin: 'telypso',
		instruments: ['mind', 'gaze'],
		actionPool: ['beam', 'mend', 'ambush'],
		attributeBands: bands({ intelligence: [65, 90], instinct: [55, 80], willpower: [45, 70], strength: [10, 25] }),
		signature: { name: 'Asylum Chorus', instrument: 'mind', action: 'mend', description: "Harmonizes a wound the way Telypso's Generator harmonizes its screaming patients." },
	},
];

export function getProvisionalSpecies(key) {
	return PROVISIONAL_SPECIES.find((s) => s.key === key) || null;
}
