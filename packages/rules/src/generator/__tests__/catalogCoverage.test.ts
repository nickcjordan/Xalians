import { describe, test, expect } from 'vitest';
import speciesRecords from '@xalians/content/speciesRecords.json';
import registriesJson from '@xalians/content/registries.json';
import catalogJson from '@xalians/content/abilityCatalog.json';
import { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM } from '../constants.ts';

// This checker mirrors scripts/checkCatalogCoverage.js's untyped, string-keyed traversal
// of the bundled JSON on purpose (the two must compute the same thing); `any` here is
// that traversal, not a hole in the generator's own typed API (generate.ts, index.ts).
const registries = registriesJson as any;
const catalog = catalogJson as any;
const ADJACENCY = ELEMENT_ADJACENCY as any;
const CONDUITS = CONDUIT_ACTIONS_BY_MEDIUM as any;
const records = speciesRecords as any;

/*
	Variety floors from docs/design/xalian-ability-grammar-draft.md ("Variety floors"):
	at least 6 valid names for every reachable instrument x action x medium cell, and at
	least 30 total reachable names per species. Coverage claims come only from the
	automated checker (scripts/checkCatalogCoverage.js, docs/ability-catalog/COVERAGE.md,
	regenerate with `node scripts/checkCatalogCoverage.js` from the repo root); this test
	only re-checks the two floors against the apps/web JSON copies so a regression here is
	caught by `npm test`, not only by the standalone script.

	Reachability mirrors generate.ts's own `allowedActions` and `nameCandidates` exactly
	(docs/design/xalian-creature-system-hardening.md Decision 10): instruments come from
	the template, mediums are the template's element plus its ELEMENT_ADJACENCY entries,
	actions per instrument come from registries.instrumentActions plus the conduit medium's
	action row when the instrument is a declared conduit for that medium, and valid names
	for a cell are the medium's catalog cell for the action plus the neutral pool for the
	action, filtered to entries that are untagged or tagged with that instrument.
*/

function entryName(e: any): string {
	return Array.isArray(e) ? e[0] : e;
}

function entryAllows(e: any, instrument: string): boolean {
	return !Array.isArray(e) || e[1].includes(instrument);
}

function validNamesForCell(medium: string, action: string, instrument: string): string[] {
	const cell = (catalog.elements && catalog.elements[medium] && catalog.elements[medium][action]) || [];
	const neutral = (catalog.neutral && catalog.neutral[action]) || [];
	const seen = new Set<string>();
	const names: string[] = [];
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

function actionsForInstrumentMedium(template: any, instrument: string, medium: string): string[] {
	const table = registries.instrumentActions || {};
	const row: string[] = (Array.isArray(table[instrument]) ? table[instrument] : []).slice();
	const conduits = template.conduits || {};
	if (conduits[instrument] === medium) {
		(CONDUITS[medium] || []).forEach((a: string) => {
			if (!row.includes(a)) {
				row.push(a);
			}
		});
	}
	return row;
}

function mediumsFor(template: any): string[] {
	return [template.element, ...(ADJACENCY[template.element] || [])];
}

// cache: cell key -> valid names, since a cell's validity depends only on the catalog and
// the instrument, not on which species reaches it (matches checkCatalogCoverage.js)
const cellCache = new Map<string, string[]>();
function cellFor(instrument: string, action: string, medium: string): string[] {
	const key = `${medium}|${action}|${instrument}`;
	if (!cellCache.has(key)) {
		cellCache.set(key, validNamesForCell(medium, action, instrument));
	}
	return cellCache.get(key)!;
}

interface Cell {
	instrument: string;
	medium: string;
	action: string;
	names: string[];
}

function coverageFor(template: any): { cells: Cell[]; totalReachableNames: number } {
	const instruments: string[] = Array.isArray(template.instruments) && template.instruments.length > 0 ? template.instruments : [];
	const mediums = mediumsFor(template);
	const cells: Cell[] = [];
	const seenCellKeys = new Set<string>();
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
	const distinctNames = new Set<string>();
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
	const perSpecies = records.records.map((template: any) => ({ template, coverage: coverageFor(template) }));

	test('every ratified species reaches at least 30 distinct ability names', () => {
		const under = perSpecies.filter((s: any) => s.coverage.totalReachableNames < SPECIES_NAME_FLOOR).map((s: any) => `${s.template.key} (${s.coverage.totalReachableNames})`);
		expect(under, `species under the ${SPECIES_NAME_FLOOR}-name floor: ${under.join(', ')}`).toEqual([]);
	});

	test('no reachable cell has zero valid names', () => {
		const empty: string[] = [];
		const seen = new Set<string>();
		perSpecies.forEach(({ coverage }: any) => {
			coverage.cells.forEach((c: Cell) => {
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
		const thinKeys = new Set<string>();
		perSpecies.forEach(({ coverage }: any) => {
			coverage.cells.forEach((c: Cell) => {
				if (c.names.length < CELL_NAME_FLOOR) {
					thinKeys.add(`${c.medium}|${c.action}|${c.instrument}`);
				}
			});
		});
		expect(thinKeys.size, `thin cells found: ${Array.from(thinKeys).join(', ')}`).toBeLessThanOrEqual(THIN_CELL_COUNT_RATCHET);
	});
});
