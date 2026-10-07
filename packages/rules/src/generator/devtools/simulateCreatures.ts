/*
	Batch report and grade calibration for the v5 creature generator (the v5 port of
	simulateGenerator.ts). Generates a deterministic batch over every species in the
	current catalog (canonicalCreatureRelease.ts) and writes
	docs/design/creature-batch-report.md with roster-wide and per-species observations.
	Nothing in the report is a target: every number is an observation for tuning.

	With --calibrate it also writes packages/content/json/creatureGradeCalibration.json,
	the score quantiles creatureGrade.ts reads for its percentile lookup.

	With --check it writes nothing and fails when either the report or the calibration
	no longer matches what the current catalog and grade weights produce, so a species or
	lever change that moves the numbers has to land with a fresh run. CI runs this.

	Run from the repo root (output paths resolve against process.cwd()):

		npm run simulate:creatures -- [--n=200] [--seed=creature-batch-2026-10-06] [--calibrate]
		npm run check:creature-simulation
*/
import fs from 'fs';
import path from 'path';
import type { CreatureRecord, Species } from '@xalians/content/creature';
import registriesJson from '@xalians/content/registries.json';
import { CREATURE_FINISH_ODDS, generateXalian, getSpeciesTemplates, intensityRolls } from '../canonicalCreatureRelease.ts';
import { scoreCreature, type CreatureGradeCalibration, type CreatureScore } from '../creatureGrade.ts';

const DEFAULT_SEED = 'creature-batch-2026-10-06';
const REPORT_PATH = 'docs/design/creature-batch-report.md';
const CALIBRATION_PATH = 'packages/content/json/creatureGradeCalibration.json';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

function bandPosition(value: number, [lo, hi]: readonly [number, number]): number {
	return hi <= lo ? 0.5 : clamp((value - lo) / (hi - lo), 0, 1);
}

function mean(values: number[]): number {
	return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(n: number, of: number): number {
	return of > 0 ? (100 * n) / of : 0;
}

const fmt1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '-');
const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '-');
const fmtPct = (n: number) => `${fmt1(n)}%`;

function table(headers: string[], rows: string[][]): string {
	return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

// nearest-rank quantile of a sorted-ascending array at whole percentile p (0..100)
function quantileAt(sorted: number[], p: number): number {
	if (sorted.length === 0) {
		return 0;
	}
	return sorted[clamp(Math.round((p / 100) * (sorted.length - 1)), 0, sorted.length - 1)];
}

// Calibration JSON stores rounded scores so a run is stable across platforms' last-bit
// floating point differences.
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

interface Args {
	n: number;
	seed: string;
	calibrate: boolean;
	check: boolean;
}

function parseArgs(argv: string[]): Args {
	const args: Args = { n: 200, seed: DEFAULT_SEED, calibrate: false, check: false };
	argv.forEach((arg) => {
		if (arg === '--calibrate') args.calibrate = true;
		else if (arg === '--check') args.check = true;
		else if (arg.startsWith('--n=')) args.n = parseInt(arg.slice('--n='.length), 10) || args.n;
		else if (arg.startsWith('--seed=')) args.seed = arg.slice('--seed='.length);
	});
	return args;
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

interface Graded {
	record: CreatureRecord;
	score: CreatureScore;
}

const registryNames = new Map<string, string>(
	Object.values(registriesJson as unknown as Record<string, unknown>)
		.filter(Array.isArray)
		.flat()
		.filter((row): row is { key: string; name: string } => !!row && typeof row === 'object' && 'key' in row && 'name' in row)
		.map((row) => [row.key, row.name])
);

function speciesSection(species: Species, graded: Graded[]): string[] {
	const records = graded.map((g) => g.record);
	const lines: string[] = [];
	lines.push(`### ${species.name} (\`${species.key}\`), n = ${records.length}`);
	lines.push('');
	const attributeRows = Object.entries(species.attributes).map(([key, band]) => {
		const values = records.map((r) => r.attributes[key as keyof CreatureRecord['attributes']] ?? 0);
		return [registryNames.get(key) ?? key, `${band[0]}-${band[1]}`, fmt1(mean(values)), fmt2(mean(values.map((v) => bandPosition(v, band))))];
	});
	lines.push(table(['attribute', 'band', 'mean', 'band position'], attributeRows));
	lines.push('');
	const ordinary = records.flatMap((r) => r.actions.filter((a) => !species.actions.some((g) => g.key === a.key)));
	const names = ordinary.map((a) => a.name.toLowerCase());
	const diversity = names.length ? new Set(names).size / names.length : 0;
	const instruments = new Map<string, number>();
	ordinary.forEach((a) => instruments.set(a.instrument, (instruments.get(a.instrument) ?? 0) + 1));
	const instrumentMix = [...instruments.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k} ${fmtPct(pct(v, ordinary.length))}`).join(', ');
	lines.push(`Ordinary actions: ${ordinary.length} drawn, name diversity ${fmt2(diversity)}. Instruments: ${instrumentMix || 'none'}.`);
	lines.push('');
	const massPositions = records.map((r) => bandPosition(r.physiology.massKg, species.physiology.size.massKg));
	lines.push(`Size: mean mass ${fmt1(mean(records.map((r) => r.physiology.massKg)))} kg (band ${species.physiology.size.massKg.join('-')}, mean position ${fmt2(mean(massPositions))}).`);
	lines.push('');
	const scores = graded.map((g) => g.score);
	lines.push(`Grade score: mean ${fmt2(mean(scores.map((s) => s.score)))} (finish ${fmt2(mean(scores.map((s) => s.components.finish)))}, attributes ${fmt2(mean(scores.map((s) => s.components.attributes)))}, size ${fmt2(mean(scores.map((s) => s.components.size)))}, abilities ${fmt2(mean(scores.map((s) => s.components.abilities)))}).`);
	lines.push('');
	return lines;
}

function rosterSection(args: Args, speciesCount: number, graded: Graded[], replay: { matched: number; total: number }): string[] {
	const total = graded.length;
	const lines: string[] = [];
	lines.push('# Creature batch report (v5)');
	lines.push('');
	lines.push(`Generated by \`npm run simulate:creatures\`. Seed: \`${args.seed}\`. Species: ${speciesCount}. N per species: ${args.n}. Deterministic sample; every number is an observation, not a target.`);
	lines.push('');
	lines.push('## Roster-wide');
	lines.push('');
	lines.push(`Total records: ${total}.`);
	lines.push('');
	lines.push('### Finish, observed vs odds');
	lines.push('');
	const finishCounts = new Map<string, number>();
	graded.forEach((g) => finishCounts.set(g.record.appearance.finish, (finishCounts.get(g.record.appearance.finish) ?? 0) + 1));
	const standardOdds = 1 - CREATURE_FINISH_ODDS.reduce((a, [, odds]) => a + odds, 0);
	const finishes: Array<[string, number]> = [['standard', standardOdds], ...CREATURE_FINISH_ODDS.map(([k, v]) => [k, v] as [string, number])];
	lines.push(table(['finish', 'observed', 'expected'], finishes.map(([name, odds]) => [name, String(finishCounts.get(name) ?? 0), fmt1(total * odds)])));
	lines.push('');
	lines.push('### Grade');
	lines.push('');
	const scores = graded.map((g) => g.score.score).sort((a, b) => a - b);
	lines.push(table(['p10', 'p50', 'p90', 'p99', 'max'], [[10, 50, 90, 99, 100].map((p) => fmt2(quantileAt(scores, p)))]));
	lines.push('');
	const components = ['finish', 'attributes', 'size', 'abilities'] as const;
	lines.push(table(['component', 'mean', 'share of records scoring above 0'], components.map((c) => {
		const values = graded.map((g) => g.score.components[c]);
		return [c, fmt2(mean(values)), fmtPct(pct(values.filter((v) => v > 0).length, total))];
	})));
	lines.push('');
	lines.push(`Ability rolls replayed for the grade: ${replay.matched} of ${replay.total} matched the stored intensity.`);
	lines.push('');
	return lines;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
	const args = parseArgs(process.argv.slice(2));
	const root = process.cwd();
	const templates = getSpeciesTemplates();
	// Generation time is metadata, not an input; pinned so the report checks byte for byte.
	const generatedAt = '2000-01-01T00:00:00.000Z';

	const perSpecies = new Map<string, Graded[]>();
	const replay = { matched: 0, total: 0 };
	templates.forEach((species) => {
		const graded: Graded[] = [];
		for (let i = 0; i < args.n; i++) {
			const record = generateXalian(species.key, `${args.seed}-${species.key}-${i}`, {
				generatedAt, origin: species.homePlanet, serial: i + 1, profile: 'full',
			});
			const rolls = intensityRolls(species.key, record.provenance.seed);
			replay.total += rolls.length;
			replay.matched += rolls.filter((roll) => {
				const ability = (roll.kind === 'action' ? record.actions : record.passives).find((a) => a.key === roll.ability);
				const effect = ability?.effects.find((e) => e.key === roll.effect);
				return !!effect && 'intensity' in effect && effect.intensity === roll.intensity;
			}).length;
			graded.push({ record, score: scoreCreature(record, species) });
		}
		perSpecies.set(species.key, graded);
	});
	const all = templates.flatMap((t) => perSpecies.get(t.key) ?? []);

	const lines = [...rosterSection(args, templates.length, all, replay), '## Per species', ''];
	templates.forEach((t) => lines.push(...speciesSection(t, perSpecies.get(t.key) ?? [])));
	const report = lines.join('\n');

	const sorted = all.map((g) => g.score.score).sort((a, b) => a - b);
	const calibration: CreatureGradeCalibration = {
		seed: args.seed,
		n: all.length,
		quantiles: Array.from({ length: 101 }, (_, p) => [p, round6(quantileAt(sorted, p))] as [number, number]),
	};
	const calibrationJson = `${JSON.stringify(calibration, null, 2)}\n`;

	const reportPath = path.resolve(root, REPORT_PATH);
	const calibrationPath = path.resolve(root, CALIBRATION_PATH);
	const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '');

	if (args.check) {
		let stale = false;
		if (read(reportPath) !== report) {
			console.error(`${REPORT_PATH} is stale; run npm run simulate:creatures -- --calibrate`);
			stale = true;
		}
		if (read(calibrationPath) !== calibrationJson) {
			console.error(`${CALIBRATION_PATH} is stale; run npm run simulate:creatures -- --calibrate`);
			stale = true;
		}
		if (replay.matched !== replay.total) {
			console.error(`ability replay drifted: ${replay.total - replay.matched} of ${replay.total} rolls did not reproduce`);
			stale = true;
		}
		if (stale) {
			process.exitCode = 1;
		} else {
			console.log(`creature simulation is current (${all.length} records over ${templates.length} species)`);
		}
		return;
	}

	fs.mkdirSync(path.dirname(reportPath), { recursive: true });
	fs.writeFileSync(reportPath, report);
	console.log(`wrote ${reportPath}`);
	if (args.calibrate) {
		fs.writeFileSync(calibrationPath, calibrationJson);
		console.log(`wrote ${calibrationPath}`);
	}
	console.log(`grade score p50 ${fmt2(quantileAt(sorted, 50))}, p90 ${fmt2(quantileAt(sorted, 90))}, p99 ${fmt2(quantileAt(sorted, 99))}`);
	console.log(`ability replay: ${replay.matched} of ${replay.total} rolls reproduced`);
}

main();
