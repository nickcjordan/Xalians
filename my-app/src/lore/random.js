// getRandomRecord(rng): pulls a random record from entries, worlds, species,
// and eras with equal weight per kind (each kind has a 1-in-4 chance of
// being picked, regardless of how many records that kind has).

import { allEntries } from './loaders';
import { getWorlds } from './worlds';
import { getSpeciesList } from './species';
import { getEras } from './chronicle';

const KINDS = ['entry', 'world', 'species', 'era'];

function pick(list, rng) {
	return list[Math.floor(rng() * list.length)];
}

export function getRandomRecord(rng = Math.random) {
	const kind = KINDS[Math.floor(rng() * KINDS.length)];
	switch (kind) {
		case 'entry': {
			const entry = pick(allEntries, rng);
			return { kind: 'entry', key: entry.key, name: entry.title };
		}
		case 'world': {
			const world = pick(getWorlds(), rng);
			return { kind: 'world', key: world.key, name: world.name };
		}
		case 'species': {
			const species = pick(getSpeciesList(), rng);
			return { kind: 'species', key: species.key, name: species.name };
		}
		case 'era':
		default: {
			const era = pick(getEras(), rng);
			return { kind: 'era', key: era.key, name: era.name };
		}
	}
}
