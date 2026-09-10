/*
	Batch report and grade-calibration tool for the Xalian creature generator (WP4,
	docs/design/xalian-creature-system-hardening.md). Generates a deterministic batch
	across every ratified species template and writes docs/species-templates/
	BATCH-REPORT.md with roster-wide and per-species observations. Nothing in the report
	is a target: every number is an observation for the tuning session, and the report
	says so in its own header.

	With --calibrate it also writes packages/content/json/gradeCalibration.json (score
	quantiles for grade.js's percentile lookup), the single shared copy both the API
	and the frontend read via @xalians/content.

	This must be run from the repo root — every output path below resolves relative to
	process.cwd(), not to this file:

		node my-app/scripts/runNode.cjs my-app/src/gameplay/generator/devtools/simulateGenerator.js [--n=200] [--seed=batch-2026-09-07] [--calibrate]

	--n         records per ratified species (default 200)
	--seed      seed prefix for the batch; each species gets "<seed>-<speciesKey>" so a
	            batch is reproducible per species independent of run order (default
	            batch-2026-09-07)
	--calibrate also (re)writes the two gradeCalibration.json copies
*/
import fs from 'fs';
import path from 'path';
import { getSpeciesTemplates, generateBatch, GENERATOR_VERSION } from '../index.js';
import registries from '@xalians/content/registries.json';
import { ATTRIBUTE_KEYS, FINISH_ODDS } from '../constants.js';
import { scoreRecord } from '../grade.js';

// ---------------------------------------------------------------------------
// small stats helpers (deliberately not imported from generate.js's private helpers —
// this tool only reads the generator's public API and the same exported tables any
// caller may use)
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

function bandPosition(value, [lo, hi]) {
	if (hi <= lo) {
		return 0.5;
	}
	return clamp((value - lo) / (hi - lo), 0, 1);
}

function mean(values) {
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(n, of) {
	return of > 0 ? (100 * n) / of : 0;
}

function fmt1(n) {
	return Number.isFinite(n) ? n.toFixed(1) : '-';
}

function fmtPct(n) {
	return `${fmt1(n)}%`;
}

function table(headers, rows) {
	const head = `| ${headers.join(' | ')} |`;
	const sep = `| ${headers.map(() => '---').join(' | ')} |`;
	const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
	return [head, sep, body].join('\n');
}

// nearest-rank quantile of a sorted-ascending array at whole percentile p (0..100)
function quantileAt(sortedValues, p) {
	if (sortedValues.length === 0) {
		return 0;
	}
	const rank = clamp(Math.round((p / 100) * (sortedValues.length - 1)), 0, sortedValues.length - 1);
	return sortedValues[rank];
}

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = { n: 200, seed: 'batch-2026-09-07', calibrate: false };
	argv.forEach((arg) => {
		if (arg === '--calibrate') {
			args.calibrate = true;
		} else if (arg.startsWith('--n=')) {
			args.n = parseInt(arg.slice('--n='.length), 10) || args.n;
		} else if (arg.startsWith('--seed=')) {
			args.seed = arg.slice('--seed='.length);
		}
	});
	return args;
}

// ---------------------------------------------------------------------------
// per-species stats
// ---------------------------------------------------------------------------

const ARCHETYPE_FAVORS = new Map((registries.archetypes || []).map((a) => [a.key, new Set(a.favors || [])]));

function traitCountBucket(count) {
	return count >= 5 ? '5+' : String(count);
}

function speciesStats(template, records) {
	const n = records.length;

	// attributes: mean raw value, mean band position, favored/unfavored split
	const attributeRows = ATTRIBUTE_KEYS.map((key) => {
		const b = band(template.attributes && template.attributes[key], [30, 70]);
		const values = records.map((r) => r.attributes[key]);
		const positions = values.map((v) => bandPosition(v, b));
		return { key, mean: mean(values), meanPosition: mean(positions) };
	});
	const favoredPositions = [];
	const unfavoredPositions = [];
	records.forEach((r) => {
		const favors = ARCHETYPE_FAVORS.get(r.archetype.key) || new Set();
		ATTRIBUTE_KEYS.forEach((key) => {
			const b = band(template.attributes && template.attributes[key], [30, 70]);
			const p = bandPosition(r.attributes[key], b);
			(favors.has(key) ? favoredPositions : unfavoredPositions).push(p);
		});
	});
	const favoredMean = mean(favoredPositions);
	const unfavoredMean = mean(unfavoredPositions);

	// build (archetype) shares vs authored weights
	const weights = template.archetypeWeights || { balanced: 100 };
	const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
	const buildCounts = new Map();
	records.forEach((r) => buildCounts.set(r.archetype.key, (buildCounts.get(r.archetype.key) || 0) + 1));
	const buildRows = Object.keys(weights).map((key) => ({
		key,
		authoredShare: pct(weights[key], weightSum),
		observedShare: pct(buildCounts.get(key) || 0, n),
	}));

	// trait landed rate vs authored percent, and observed trait count distribution
	const pool = (template.traits && template.traits.pool) || {};
	const traitRows = Object.keys(pool).map((key) => {
		const landed = records.filter((r) => r.traits.includes(key)).length;
		return { key, authoredPercent: pool[key], observedRate: pct(landed, n) };
	});
	const expectedTraitCount = Object.values(pool).reduce((a, b) => a + b, 0) / 100;
	const traitCounts = records.map((r) => r.traits.length);
	const traitCountDist = {};
	traitCounts.forEach((c) => {
		const b = traitCountBucket(c);
		traitCountDist[b] = (traitCountDist[b] || 0) + 1;
	});

	// ability name diversity
	const abilityNames = records.flatMap((r) => r.abilities.map((a) => a.name.toLowerCase()));
	const diversity = abilityNames.length > 0 ? new Set(abilityNames).size / abilityNames.length : 0;

	// size mean and band position
	const sizeSrc = (template.physiology && template.physiology.size) || {};
	const heightBand = band(sizeSrc.heightCm, [100, 200]);
	const weightBand = band(sizeSrc.weightKg, [50, 150]);
	const heights = records.map((r) => r.physiology.heightCm);
	const weights_ = records.map((r) => r.physiology.weightKg);

	return {
		key: template.key,
		name: template.name,
		n,
		attributeRows,
		favoredMean,
		unfavoredMean,
		favoredLift: favoredMean - unfavoredMean,
		buildRows,
		traitRows,
		expectedTraitCount,
		observedTraitCountMean: mean(traitCounts),
		traitCountDist,
		diversity,
		abilityCount: abilityNames.length,
		heightMean: mean(heights),
		heightMeanPosition: mean(heights.map((h) => bandPosition(h, heightBand))),
		weightMean: mean(weights_),
		weightMeanPosition: mean(weights_.map((w) => bandPosition(w, weightBand))),
	};
}

// ---------------------------------------------------------------------------
// roster-wide stats
// ---------------------------------------------------------------------------

function rosterStats(templates, perSpecies, allRecords) {
	const total = allRecords.length;

	// build share vs template weights, aggregated
	const buildCounts = new Map();
	allRecords.forEach((r) => buildCounts.set(r.archetype.key, (buildCounts.get(r.archetype.key) || 0) + 1));
	const expectedBuildCounts = new Map();
	templates.forEach((t) => {
		const records = perSpecies.get(t.key);
		const weights = t.archetypeWeights || { balanced: 100 };
		const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
		Object.keys(weights).forEach((key) => {
			const expected = (records.length * weights[key]) / weightSum;
			expectedBuildCounts.set(key, (expectedBuildCounts.get(key) || 0) + expected);
		});
	});
	const buildKeys = new Set([...buildCounts.keys(), ...expectedBuildCounts.keys()]);
	const buildRows = Array.from(buildKeys).sort().map((key) => ({
		key,
		observedShare: pct(buildCounts.get(key) || 0, total),
		expectedShare: pct(expectedBuildCounts.get(key) || 0, total),
	}));

	// secondary affinity share, strength decile histogram, share >= 50
	const withSecondary = allRecords.filter((r) => Object.keys(r.element.affinities).some((k) => k !== r.element.primary));
	const secondaryShare = pct(withSecondary.length, total);
	const strengths = withSecondary.map((r) => {
		const key = Object.keys(r.element.affinities).find((k) => k !== r.element.primary);
		return r.element.affinities[key];
	});
	const deciles = new Array(10).fill(0);
	strengths.forEach((s) => {
		deciles[clamp(Math.floor((s - 1) / 10), 0, 9)] += 1;
	});
	const shareAtOrAbove50 = pct(strengths.filter((s) => s >= 50).length, strengths.length);

	// finish counts vs odds
	const finishCounts = new Map();
	allRecords.forEach((r) => finishCounts.set(r.appearance.finish, (finishCounts.get(r.appearance.finish) || 0) + 1));
	const finishNamed = new Set(FINISH_ODDS.map(([name]) => name));
	const standardOdds = 1 - FINISH_ODDS.reduce((a, [, odds]) => a + odds, 0);
	const finishRows = [['standard', standardOdds], ...FINISH_ODDS].map(([name, odds]) => ({
		name,
		observed: finishCounts.get(name) || 0,
		expected: total * odds,
	}));

	// trait count distribution roster-wide
	const traitCountDist = {};
	allRecords.forEach((r) => {
		const b = traitCountBucket(r.traits.length);
		traitCountDist[b] = (traitCountDist[b] || 0) + 1;
	});

	// action mix, medium mix, secondary-medium share across rolled (non-signature) abilities
	const rolled = allRecords.flatMap((r) => r.abilities.filter((a) => !a.signature).map((a) => ({ ...a, species: r.species, secondary: Object.keys(r.element.affinities).find((k) => k !== r.element.primary) })));
	const actionCounts = new Map();
	const mediumCounts = new Map();
	let secondaryMediumUses = 0;
	rolled.forEach((a) => {
		actionCounts.set(a.action, (actionCounts.get(a.action) || 0) + 1);
		mediumCounts.set(a.medium, (mediumCounts.get(a.medium) || 0) + 1);
		if (a.secondary && a.medium === a.secondary) {
			secondaryMediumUses += 1;
		}
	});
	const actionRows = Array.from(actionCounts.entries()).sort((a, b) => b[1] - a[1]).map(([action, count]) => ({ action, count, share: pct(count, rolled.length) }));
	const mediumRows = Array.from(mediumCounts.entries()).sort((a, b) => b[1] - a[1]).map(([medium, count]) => ({ medium, count, share: pct(count, rolled.length) }));
	const secondaryMediumShare = pct(secondaryMediumUses, rolled.length);

	// favored/unfavored lift, roster-wide average of the per-species lift
	const perSpeciesLifts = templates.map((t) => {
		const records = perSpecies.get(t.key);
		const favoredPositions = [];
		const unfavoredPositions = [];
		records.forEach((r) => {
			const favors = ARCHETYPE_FAVORS.get(r.archetype.key) || new Set();
			ATTRIBUTE_KEYS.forEach((key) => {
				const b = band(t.attributes && t.attributes[key], [30, 70]);
				const p = bandPosition(r.attributes[key], b);
				(favors.has(key) ? favoredPositions : unfavoredPositions).push(p);
			});
		});
		return mean(favoredPositions) - mean(unfavoredPositions);
	});

	return {
		total,
		buildRows,
		secondaryShare,
		deciles,
		strengthCount: strengths.length,
		shareAtOrAbove50,
		finishRows,
		traitCountDist,
		actionRows,
		mediumRows,
		secondaryMediumShare,
		rolledAbilityCount: rolled.length,
		meanFavoredLift: mean(perSpeciesLifts),
	};
}

// ---------------------------------------------------------------------------
// markdown rendering
// ---------------------------------------------------------------------------

function renderTraitCountDist(dist, total) {
	return ['0', '1', '2', '3', '4', '5+'].map((b) => `${b}: ${dist[b] || 0} (${fmtPct(pct(dist[b] || 0, total))})`).join(', ');
}

function renderRoster(stats, args, generatorVersion, generatedAt) {
	const lines = [];
	lines.push('# Batch report');
	lines.push('');
	lines.push(`Generator version: ${generatorVersion}. Seed: \`${args.seed}\`. N per species: ${args.n}. Generated: ${generatedAt}.`);
	lines.push('');
	lines.push('Every number here is an observation for the tuning session, not a target.');
	lines.push('');
	lines.push('## Roster-wide');
	lines.push('');
	lines.push(`Total records: ${stats.total}.`);
	lines.push('');
	lines.push('### Build (archetype) share, observed vs authored weights');
	lines.push('');
	lines.push(table(['archetype', 'observed share', 'expected share'], stats.buildRows.map((r) => [r.key, fmtPct(r.observedShare), fmtPct(r.expectedShare)])));
	lines.push('');
	lines.push('### Secondary affinity');
	lines.push('');
	lines.push(`Observed share with a secondary: ${fmtPct(stats.secondaryShare)} (target 25%). Share of secondaries at or above strength 50: ${fmtPct(stats.shareAtOrAbove50)} (of ${stats.strengthCount} with a secondary).`);
	lines.push('');
	lines.push('Strength histogram, deciles 1-10 through 91-99:');
	lines.push('');
	lines.push(table(['1-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '91-99'], [stats.deciles.map(String)]));
	lines.push('');
	lines.push('### Finish, observed vs odds');
	lines.push('');
	lines.push(table(['finish', 'observed', 'expected'], stats.finishRows.map((r) => [r.name, String(r.observed), fmt1(r.expected)])));
	lines.push('');
	lines.push('### Trait count distribution, roster-wide');
	lines.push('');
	lines.push(renderTraitCountDist(stats.traitCountDist, stats.total));
	lines.push('');
	lines.push('### Action mix across rolled abilities');
	lines.push('');
	lines.push(table(['action', 'count', 'share'], stats.actionRows.map((r) => [r.action, String(r.count), fmtPct(r.share)])));
	lines.push('');
	lines.push('### Medium mix across rolled abilities');
	lines.push('');
	lines.push(table(['medium', 'count', 'share'], stats.mediumRows.map((r) => [r.medium, String(r.count), fmtPct(r.share)])));
	lines.push('');
	lines.push(`Share of rolled abilities using the secondary medium: ${fmtPct(stats.secondaryMediumShare)} (of ${stats.rolledAbilityCount} rolled abilities).`);
	lines.push('');
	lines.push(`Mean favored-vs-unfavored attribute band-position lift, averaged across species: ${fmt1(stats.meanFavoredLift * 100)} points (0-100 scale).`);
	lines.push('');
	return lines;
}

function renderSpecies(s) {
	const lines = [];
	lines.push(`### ${s.name} (\`${s.key}\`), n = ${s.n}`);
	lines.push('');
	lines.push('Attributes (mean, band position 0-1):');
	lines.push('');
	lines.push(table(['attribute', 'mean', 'band position'], s.attributeRows.map((r) => [r.key, fmt1(r.mean), r.meanPosition.toFixed(2)])));
	lines.push('');
	lines.push(`Favored mean band position: ${s.favoredMean.toFixed(2)}. Unfavored: ${s.unfavoredMean.toFixed(2)}. Lift: ${(s.favoredLift * 100).toFixed(1)} points.`);
	lines.push('');
	lines.push('Build shares (observed vs authored weight):');
	lines.push('');
	lines.push(table(['archetype', 'observed', 'authored'], s.buildRows.map((r) => [r.key, fmtPct(r.observedShare), fmtPct(r.authoredShare)])));
	lines.push('');
	lines.push('Trait landed rate vs authored percent:');
	lines.push('');
	lines.push(table(['trait', 'authored %', 'observed %'], s.traitRows.map((r) => [r.key, fmt1(r.authoredPercent), fmtPct(r.observedRate)])));
	lines.push('');
	lines.push(`Observed trait count mean: ${s.observedTraitCountMean.toFixed(2)} (authored expected count: ${s.expectedTraitCount.toFixed(2)}). Distribution: ${renderTraitCountDist(s.traitCountDist, s.n)}`);
	lines.push('');
	lines.push(`Ability name diversity: ${s.diversity.toFixed(2)} (${s.abilityCount} abilities rolled).`);
	lines.push('');
	lines.push(`Size mean: height ${s.heightMean.toFixed(1)} cm (band position ${s.heightMeanPosition.toFixed(2)}), weight ${s.weightMean.toFixed(1)} kg (band position ${s.weightMeanPosition.toFixed(2)}).`);
	lines.push('');
	return lines;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
	const args = parseArgs(process.argv.slice(2));
	const root = process.cwd();
	const templates = getSpeciesTemplates();
	const generatedAt = new Date().toISOString();

	const perSpecies = new Map();
	templates.forEach((t) => {
		const records = generateBatch(args.n, `${args.seed}-${t.key}`, { templates: [t], generatedAt });
		perSpecies.set(t.key, records);
	});
	const allRecords = templates.flatMap((t) => perSpecies.get(t.key));

	const roster = rosterStats(templates, perSpecies, allRecords);
	const speciesSections = templates.map((t) => speciesStats(t, perSpecies.get(t.key)));

	const lines = [];
	lines.push(...renderRoster(roster, args, GENERATOR_VERSION, generatedAt));
	lines.push('## Per species');
	lines.push('');
	speciesSections.forEach((s) => lines.push(...renderSpecies(s)));

	const reportPath = path.resolve(root, 'docs/species-templates/BATCH-REPORT.md');
	fs.mkdirSync(path.dirname(reportPath), { recursive: true });
	fs.writeFileSync(reportPath, lines.join('\n'));
	console.log(`wrote ${reportPath}`);

	if (args.calibrate) {
		const scores = allRecords.map((r) => scoreRecord(r, templates.find((t) => t.key === r.species)).score).sort((a, b) => a - b);
		const quantiles = [];
		for (let p = 0; p <= 100; p++) {
			quantiles.push([p, quantileAt(scores, p)]);
		}
		const calibration = {
			generatorVersion: GENERATOR_VERSION,
			seed: args.seed,
			n: allRecords.length,
			quantiles,
		};
		const contentPath = path.resolve(root, 'packages/content/json/gradeCalibration.json');
		const json = JSON.stringify(calibration, null, 2);
		fs.writeFileSync(contentPath, json);
		console.log(`wrote ${contentPath}`);
	}

	// roster-wide numbers and outliers for the console, so a run's headline results are
	// visible without opening the report
	console.log('');
	console.log(`secondary affinity share: ${fmtPct(roster.secondaryShare)} (target 25%)`);
	console.log(`finish counts: ${roster.finishRows.map((r) => `${r.name}=${r.observed} (expected ${fmt1(r.expected)})`).join(', ')}`);
	console.log(`trait count distribution: ${renderTraitCountDist(roster.traitCountDist, roster.total)}`);
	console.log(`mean favored-vs-unfavored lift: ${fmt1(roster.meanFavoredLift * 100)} points`);

	const byTraitCountGap = speciesSections.slice().sort((a, b) => Math.abs(b.observedTraitCountMean - b.expectedTraitCount) - Math.abs(a.observedTraitCountMean - a.expectedTraitCount)).slice(0, 5);
	console.log('largest observed-vs-expected trait count gap:');
	byTraitCountGap.forEach((s) => console.log(`  ${s.key}: observed ${s.observedTraitCountMean.toFixed(2)} vs expected ${s.expectedTraitCount.toFixed(2)}`));

	const byDiversity = speciesSections.slice().sort((a, b) => a.diversity - b.diversity).slice(0, 5);
	console.log('lowest ability name diversity:');
	byDiversity.forEach((s) => console.log(`  ${s.key}: ${s.diversity.toFixed(2)} (${s.abilityCount} abilities)`));

	const tiltedTraits = [];
	speciesSections.forEach((s) => {
		s.traitRows.forEach((r) => {
			const gap = r.observedRate - r.authoredPercent;
			if (Math.abs(gap) > 10) {
				tiltedTraits.push({ species: s.key, trait: r.key, authored: r.authoredPercent, observed: r.observedRate, gap });
			}
		});
	});
	console.log(`pool entries off authored percent by more than 10 points: ${tiltedTraits.length}`);
	tiltedTraits.forEach((t) => console.log(`  ${t.species}.${t.trait}: authored ${fmt1(t.authored)} vs observed ${fmt1(t.observed)} (gap ${fmt1(t.gap)})`));
}

main();
