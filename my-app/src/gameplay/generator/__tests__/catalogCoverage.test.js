import { describe, test, expect } from 'vitest';
import speciesRecords from '../../../json/speciesRecords.json';
import registries from '../../../json/registries.json';
import catalog from '../../../json/abilityCatalog.json';
import { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM } from '../constants.js';

/*
	Variety floors from docs/design/xalian-ability-grammar-draft.md ("Variety floors"):
	at least 6 valid names for every reachable instrument x action x medium cell, and at
	least 30 total reachable names per species. Coverage claims come only from the
	automated checker (scripts/checkCatalogCoverage.js, docs/ability-catalog/COVERAGE.md,
	regenerate with `node scripts/checkCatalogCoverage.js` from the repo root); this test
	only re-checks the two floors against the my-app JSON copies so a regression here is
	caught by `yarn test`, not only by the standalone script.

	Reachability mirrors generate.js's own `allowedActions` and `nameCandidates` exactly
	(docs/design/xalian-creature-system-hardening.md Decision 10): instruments come from
	the template, mediums are the template's element plus its ELEMENT_ADJACENCY entries,
	actions per instrument come from registries.instrumentActions plus the conduit medium's
	action row when the instrument is a declared conduit for that medium, and valid names
	for a cell are the medium's catalog cell for the action plus the neutral pool for the
	action, filtered to entries that are untagged or tagged with that instrument.
*/

function entryName(e) {
	return Array.isArray(e) ? e[0] : e;
}

function entryAllows(e, instrument) {
	return !Array.isArray(e) || e[1].includes(instrument);
}

function validNamesForCell(medium, action, instrument) {
	const cell = (catalog.elements && catalog.elements[medium] && catalog.elements[medium][action]) || [];
	const neutral = (catalog.neutral && catalog.neutral[action]) || [];
	const seen = new Set();
	const names = [];
	[...cell, ...neutral].forEach((e) => {
		if (!entryAllows(e, instrument)) {
			return;
		}
		const key = entryName(e).toLowerCase();
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		names.push(entryName(e));
	});
	return names;
}

function actionsForInstrumentMedium(template, instrument, medium) {
	const table = registries.instrumentActions || {};
	const row = (Array.isArray(table[instrument]) ? table[instrument] : []).slice();
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

function mediumsFor(template) {
	return [template.element, ...(ELEMENT_ADJACENCY[template.element] || [])];
}

// cache: cell key -> valid names, since a cell's validity depends only on the catalog and
// the instrument, not on which species reaches it (matches checkCatalogCoverage.js)
const cellCache = new Map();
function cellFor(instrument, action, medium) {
	const key = `${medium}|${action}|${instrument}`;
	if (!cellCache.has(key)) {
		cellCache.set(key, validNamesForCell(medium, action, instrument));
	}
	return cellCache.get(key);
}

function coverageFor(template) {
	const instruments = Array.isArray(template.instruments) && template.instruments.length > 0 ? template.instruments : [];
	const mediums = mediumsFor(template);
	const cells = [];
	const seenCellKeys = new Set();
	instruments.forEach((instrument) => {
		mediums.forEach((medium) => {
			actionsForInstrumentMedium(template, instrument, medium).forEach((action) => {
				const cellKey = `${instrument}|${medium}|${action}`;
				if (seenCellKeys.has(cellKey)) {
					return;
				}
				seenCellKeys.add(cellKey);
				cells.push({ instrument, medium, action, names: cellFor(instrument, action, medium) });
			});
		});
	});
	const distinctNames = new Set();
	cells.forEach((c) => c.names.forEach((n) => distinctNames.add(n.toLowerCase())));
	return { cells, totalReachableNames: distinctNames.size };
}

const SPECIES_NAME_FLOOR = 30;
const CELL_NAME_FLOOR = 6;

// Ratchet: docs/ability-catalog/COVERAGE.md currently reports 0 distinct thin cells
// (under the 6-name floor) across the whole roster. This is the ceiling, not a target:
// lower it as the catalog improves so a regression is caught; never raise it to make a
// catalog regression pass. Regenerate the report (node scripts/checkCatalogCoverage.js)
// after any catalog change and update this number to match if it legitimately moves.
const THIN_CELL_COUNT_RATCHET = 0;

describe('ability catalog coverage (grammar-doc variety floors)', () => {
	const perSpecies = speciesRecords.records.map((template) => ({ template, coverage: coverageFor(template) }));

	test('every ratified species reaches at least 30 distinct ability names', () => {
		const under = perSpecies.filter((s) => s.coverage.totalReachableNames < SPECIES_NAME_FLOOR).map((s) => `${s.template.key} (${s.coverage.totalReachableNames})`);
		expect(under, `species under the ${SPECIES_NAME_FLOOR}-name floor: ${under.join(', ')}`).toEqual([]);
	});

	test('no reachable cell has zero valid names', () => {
		const empty = [];
		const seen = new Set();
		perSpecies.forEach(({ coverage }) => {
			coverage.cells.forEach((c) => {
				const key = `${c.medium}|${c.action}|${c.instrument}`;
				if (c.names.length === 0 && !seen.has(key)) {
					seen.add(key);
					empty.push(key);
				}
			});
		});
		expect(empty, `cells with zero valid names: ${empty.join(', ')}`).toEqual([]);
	});

	test('thin cells (under the 6-name floor) do not exceed the recorded ratchet', () => {
		const thinKeys = new Set();
		perSpecies.forEach(({ coverage }) => {
			coverage.cells.forEach((c) => {
				if (c.names.length < CELL_NAME_FLOOR) {
					thinKeys.add(`${c.medium}|${c.action}|${c.instrument}`);
				}
			});
		});
		expect(thinKeys.size, `thin cells found: ${Array.from(thinKeys).join(', ')}`).toBeLessThanOrEqual(THIN_CELL_COUNT_RATCHET);
	});
});

// One cell per name, forever (grammar doc, "Curated Name Catalog"): after the 2026-09-07
// dedupe (docs/ability-catalog/DEDUPE-LEDGER-2026-09-07.md) no name sits in two element
// cells and no neutral name is also element-owned. This keeps it that way.
describe('catalog: one cell per name', () => {
	const nameOf = (e) => (Array.isArray(e) ? e[0] : e).toLowerCase();
	test('no name appears in more than one element cell', () => {
		const seen = new Map();
		const dups = [];
		Object.entries(catalog.elements).forEach(([el, cells]) => {
			Object.entries(cells).forEach(([action, list]) => {
				list.forEach((e) => {
					const k = nameOf(e);
					if (seen.has(k)) dups.push(`${k}: ${seen.get(k)}, ${el}/${action}`);
					seen.set(k, `${el}/${action}`);
				});
			});
		});
		expect(dups).toEqual([]);
	});
	test('no neutral name is also element-owned, and no neutral name sits in two actions', () => {
		const owned = new Set();
		Object.values(catalog.elements).forEach((cells) => Object.values(cells).forEach((list) => list.forEach((e) => owned.add(nameOf(e)))));
		const seen = new Set();
		const bad = [];
		Object.entries(catalog.neutral).forEach(([action, list]) => {
			list.forEach((e) => {
				const k = nameOf(e);
				if (owned.has(k)) bad.push(`${action}: ${k} is element-owned`);
				if (seen.has(k)) bad.push(`${action}: ${k} repeats across neutral actions`);
				seen.add(k);
			});
		});
		expect(bad).toEqual([]);
	});
});
