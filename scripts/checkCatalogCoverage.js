// Ability-catalog coverage checker (WP2 of docs/design/xalian-creature-system-hardening.md,
// Decision 10). The grammar doc (docs/design/xalian-ability-grammar-draft.md, "Variety
// floors") requires an automated floor check: at least 6 valid names for every reachable
// instrument x action x medium cell, and at least 30 total reachable names per species,
// and says coverage claims come only from this checker. This script is that checker.
//
// Reachability mirrors the generator exactly (my-app/src/gameplay/generator/generate.js
// `allowedActions` and `nameCandidates`, constants.js `ELEMENT_ADJACENCY` and
// `CONDUIT_ACTIONS_BY_MEDIUM`), not a reinterpretation of it:
//
//   instruments = template.instruments
//   mediums     = template.element plus ELEMENT_ADJACENCY[template.element]
//   actions(instrument, medium) = registries.instrumentActions[instrument]
//                                 plus CONDUIT_ACTIONS_BY_MEDIUM[medium] when
//                                 template.conduits[instrument] === medium
//   valid names(instrument, action, medium) = entries of
//                                 abilityCatalog.elements[medium][action] plus
//                                 abilityCatalog.neutral[action] that are untagged or
//                                 tagged with that instrument, deduplicated by lowercase name
//
// Data inputs are read from lambda/src/json/ (the source copies), not the my-app build
// copies. Run directly (`node scripts/checkCatalogCoverage.js`) it writes
// docs/ability-catalog/COVERAGE.md and prints the roster totals. Used as a module, it
// exports computeCoverage() and renderReport(coverage) so the vitest suite next to the
// generator can assert the floors without shelling out.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_DIR = path.join(ROOT, 'lambda', 'src', 'json');
const CONSTANTS_PATH = path.join(ROOT, 'my-app', 'src', 'gameplay', 'generator', 'constants.js');
const REPORT_PATH = path.join(ROOT, 'docs', 'ability-catalog', 'COVERAGE.md');

const THIN_CELL_FLOOR = 6;
const SPECIES_NAME_FLOOR = 30;

function loadJson(name) {
	return JSON.parse(fs.readFileSync(path.join(JSON_DIR, name), 'utf8'));
}

// constants.js is an ESM file (`export const ...`) with only static exports, so a plain
// require() works under modern Node (the CJS loader detects and translates it). Fall back
// to a source-eval that only strips the `export` keyword, so the two tables are never
// hand-duplicated here, if require() ever stops working under a Node downgrade.
function loadConstants() {
	try {
		return require(CONSTANTS_PATH);
	} catch (e) {
		const src = fs.readFileSync(CONSTANTS_PATH, 'utf8');
		const commonJsSrc = src.replace(/export const/g, 'const') + '\nmodule.exports = { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM };\n';
		const mod = { exports: {} };
		// eslint-disable-next-line no-new-func
		new Function('module', 'exports', commonJsSrc)(mod, mod.exports);
		return mod.exports;
	}
}

function entryName(e) {
	return Array.isArray(e) ? e[0] : e;
}

function entryAllows(e, instrument) {
	return !Array.isArray(e) || !Array.isArray(e[1]) || e[1].length === 0 || e[1].includes(instrument);
}

// valid names for one (instrument, action, medium) cell: the medium's cell for the action
// plus the neutral pool for the action, filtered to names this instrument may carry,
// deduplicated by lowercase name (first-seen casing wins).
function validNamesForCell(catalog, medium, action, instrument) {
	const cell = (catalog.elements && catalog.elements[medium] && catalog.elements[medium][action]) || [];
	const neutral = (catalog.neutral && catalog.neutral[action]) || [];
	const seen = new Set();
	const names = [];
	[...cell, ...neutral].forEach((e) => {
		if (!entryAllows(e, instrument)) {
			return;
		}
		const name = entryName(e);
		const key = name.toLowerCase();
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		names.push(name);
	});
	return names;
}

function computeCoverage() {
	const speciesRecords = loadJson('speciesRecords.json');
	const registries = loadJson('registries.json');
	const catalog = loadJson('abilityCatalog.json');
	const { ELEMENT_ADJACENCY, CONDUIT_ACTIONS_BY_MEDIUM } = loadConstants();

	// cache: cell key -> { medium, action, instrument, names, validCount }. Valid names for
	// a cell depend only on the catalog and the instrument's tag, not on which species
	// reaches it, so this is computed once and shared across every species that reaches it.
	const cellCache = new Map();
	function cellFor(instrument, action, medium) {
		const key = `${medium}|${action}|${instrument}`;
		if (!cellCache.has(key)) {
			const names = validNamesForCell(catalog, medium, action, instrument);
			cellCache.set(key, { key, medium, action, instrument, names, validCount: names.length });
		}
		return cellCache.get(key);
	}

	function mediumsFor(template) {
		const primary = template.element;
		const adjacency = ELEMENT_ADJACENCY[primary] || [];
		return [primary, ...adjacency];
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

	const speciesReports = speciesRecords.records.map((template) => {
		const instruments = Array.isArray(template.instruments) && template.instruments.length > 0 ? template.instruments : [];
		const mediums = mediumsFor(template);
		const cells = [];
		const seenCellKeys = new Set();
		instruments.forEach((instrument) => {
			mediums.forEach((medium) => {
				const actions = actionsForInstrumentMedium(template, instrument, medium);
				actions.forEach((action) => {
					const cell = cellFor(instrument, action, medium);
					const cellKey = `${instrument}|${cell.key}`;
					if (seenCellKeys.has(cellKey)) {
						return;
					}
					seenCellKeys.add(cellKey);
					cells.push(cell);
				});
			});
		});

		const nameSet = new Set();
		cells.forEach((cell) => cell.names.forEach((n) => nameSet.add(n.toLowerCase())));
		const thinCells = cells.filter((c) => c.validCount < THIN_CELL_FLOOR).sort((a, b) => a.validCount - b.validCount || a.medium.localeCompare(b.medium) || a.action.localeCompare(b.action) || a.instrument.localeCompare(b.instrument));

		return {
			key: template.key,
			name: template.name,
			element: template.element,
			instruments,
			mediums,
			reachableCellCount: cells.length,
			thinCellCount: thinCells.length,
			thinCells: thinCells.map((c) => ({ medium: c.medium, action: c.action, instrument: c.instrument, validCount: c.validCount, names: c.names })),
			totalReachableNames: nameSet.size,
			meetsNameFloor: nameSet.size >= SPECIES_NAME_FLOOR,
		};
	});

	// roster-wide: group every distinct reachable cell under the 6-name floor by
	// medium x action x instrument, with the list of species that reach it. A cell's
	// validCount and names are identical for every species that reaches it (they depend
	// only on the catalog and the instrument), so this is a straight grouping.
	const thinCellRoster = new Map();
	speciesReports.forEach((s) => {
		s.thinCells.forEach((c) => {
			const key = `${c.medium}|${c.action}|${c.instrument}`;
			if (!thinCellRoster.has(key)) {
				thinCellRoster.set(key, { medium: c.medium, action: c.action, instrument: c.instrument, validCount: c.validCount, names: c.names, species: [] });
			}
			thinCellRoster.get(key).species.push(s.key);
		});
	});
	const thinCellsRosterWide = Array.from(thinCellRoster.values()).sort(
		(a, b) => a.validCount - b.validCount || a.medium.localeCompare(b.medium) || a.action.localeCompare(b.action) || a.instrument.localeCompare(b.instrument)
	);

	const speciesUnderNameFloor = speciesReports.filter((s) => !s.meetsNameFloor).map((s) => s.key);

	const totals = {
		speciesCount: speciesReports.length,
		totalReachableCells: speciesReports.reduce((sum, s) => sum + s.reachableCellCount, 0),
		distinctReachableCells: cellCache.size,
		totalThinCellInstances: speciesReports.reduce((sum, s) => sum + s.thinCellCount, 0),
		distinctThinCells: thinCellsRosterWide.length,
		speciesUnderNameFloor: speciesUnderNameFloor.length,
		speciesUnderNameFloorKeys: speciesUnderNameFloor,
		nameFloor: SPECIES_NAME_FLOOR,
		cellFloor: THIN_CELL_FLOOR,
	};

	return {
		generatedAt: new Date().toISOString(),
		floors: { cellFloor: THIN_CELL_FLOOR, nameFloor: SPECIES_NAME_FLOOR },
		species: speciesReports.sort((a, b) => a.key.localeCompare(b.key)),
		thinCellsRosterWide,
		totals,
	};
}

function renderReport(coverage) {
	const lines = [];
	lines.push('# Ability Catalog Coverage Report');
	lines.push('');
	lines.push(`Generated by \`scripts/checkCatalogCoverage.js\` from \`lambda/src/json/speciesRecords.json\`, \`registries.json\`, and \`abilityCatalog.json\`, on ${coverage.generatedAt}.`);
	lines.push('');
	lines.push(`Floors (from \`docs/design/xalian-ability-grammar-draft.md\`, "Variety floors"): at least ${coverage.floors.cellFloor} valid names for every reachable instrument x action x medium cell, and at least ${coverage.floors.nameFloor} total reachable names per species. Coverage claims come only from this checker.`);
	lines.push('');
	lines.push('## Roster summary');
	lines.push('');
	lines.push(`${coverage.totals.speciesCount} species checked. ${coverage.totals.distinctReachableCells} distinct reachable cells across the roster (${coverage.totals.totalReachableCells} species-cell instances). ${coverage.totals.distinctThinCells} distinct cells are thin (under ${coverage.floors.cellFloor} valid names), touching ${coverage.totals.totalThinCellInstances} species-cell instances. ${coverage.totals.speciesUnderNameFloor} of ${coverage.totals.speciesCount} species are under the ${coverage.floors.nameFloor}-name floor${coverage.totals.speciesUnderNameFloor > 0 ? `: ${coverage.totals.speciesUnderNameFloorKeys.join(', ')}` : ''}.`);
	lines.push('');
	lines.push('| Species | Element | Reachable cells | Thin cells | Total reachable names | Meets 30 floor |');
	lines.push('|---|---|---|---|---|---|');
	coverage.species.forEach((s) => {
		lines.push(`| ${s.name} (${s.key}) | ${s.element} | ${s.reachableCellCount} | ${s.thinCellCount} | ${s.totalReachableNames} | ${s.meetsNameFloor ? 'yes' : 'NO'} |`);
	});
	lines.push('');
	lines.push('## Thin cells (roster-wide, under the 6-name floor)');
	lines.push('');
	if (coverage.thinCellsRosterWide.length === 0) {
		lines.push('None. Every reachable cell across the roster meets the 6-name floor.');
	} else {
		lines.push('Each cell is listed once with the names it currently has (identical for every species that reaches it, since a cell depends only on the catalog and the instrument) and the species that reach it.');
		lines.push('');
		coverage.thinCellsRosterWide.forEach((c) => {
			const nameList = c.names.length > 0 ? c.names.join(', ') : '(none)';
			lines.push(`- **${c.medium} x ${c.action} x ${c.instrument}** — ${c.validCount} valid name${c.validCount === 1 ? '' : 's'}: ${nameList}. Reached by: ${c.species.join(', ')}.`);
		});
	}
	lines.push('');
	return lines.join('\n');
}

function main() {
	const coverage = computeCoverage();
	const report = renderReport(coverage);
	fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
	fs.writeFileSync(REPORT_PATH, report, 'utf8');
	console.log(`Wrote ${REPORT_PATH}`);
	console.log(`Species checked: ${coverage.totals.speciesCount}`);
	console.log(`Distinct reachable cells: ${coverage.totals.distinctReachableCells} (thin: ${coverage.totals.distinctThinCells})`);
	console.log(`Species under the ${coverage.floors.nameFloor}-name floor: ${coverage.totals.speciesUnderNameFloor}${coverage.totals.speciesUnderNameFloor > 0 ? ` (${coverage.totals.speciesUnderNameFloorKeys.join(', ')})` : ''}`);
}

module.exports = { computeCoverage, renderReport };

if (require.main === module) {
	main();
}
