import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { creatureDir, listCreatureKeys } from './store.ts';
import { KIND_DIR, SCHEMAS, STAGE_IDS, type Kind } from './schema.ts';

export interface VerifyResult {
	creatures: number;
	records: number;
	errors: string[];
}

type Loose = Record<string, unknown> & { id: string; alias: string };

/** Validates every record of every creature, every id reference, and alias and id uniqueness. */
export function verifyAll(repoRoot: string): VerifyResult {
	const errors: string[] = [];
	let records = 0;
	const keys = listCreatureKeys(repoRoot);
	for (const key of keys) records += verifyCreature(repoRoot, key, errors);
	return { creatures: keys.length, records, errors };
}

function readJson(file: string, errors: string[], label: string): unknown {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (e) {
		errors.push(`${label}: not valid JSON (${(e as Error).message})`);
		return undefined;
	}
}

function verifyCreature(root: string, key: string, errors: string[]): number {
	const dir = creatureDir(root, key);
	const all = new Map<string, { kind: Kind; rec: Loose; label: string }>();
	const aliases = new Map<string, string>();
	let count = 0;

	const add = (kind: Kind, value: unknown, label: string) => {
		if (value === undefined) return;
		const result = SCHEMAS[kind].safeParse(value);
		if (!result.success) {
			const issue = result.error.issues[0];
			errors.push(`${label}: ${issue?.path.join('.') || '(root)'}: ${issue?.message ?? 'invalid'}`);
			return;
		}
		count++;
		const rec = result.data as unknown as Loose;
		if (all.has(rec.id)) errors.push(`${label}: duplicate id ${rec.id}`);
		all.set(rec.id, { kind, rec, label });
		const other = aliases.get(rec.alias);
		if (other) errors.push(`${label}: alias ${rec.alias} already used by ${other}`);
		else aliases.set(rec.alias, label);
	};

	const creatureFile = join(dir, 'creature.json');
	if (!existsSync(creatureFile)) {
		errors.push(`${key}: missing creature.json`);
		return 0;
	}
	add('creature', readJson(creatureFile, errors, `${key}/creature.json`), `${key}/creature.json`);

	for (const [kind, sub] of Object.entries(KIND_DIR) as [Exclude<Kind, 'creature'>, string][]) {
		const subDir = join(dir, sub);
		if (!existsSync(subDir)) continue;
		for (const f of readdirSync(subDir).filter((n) => n.endsWith('.json')).sort()) {
			const label = `${key}/${sub}/${f}`;
			const value = readJson(join(subDir, f), errors, label);
			add(kind, value, label);
			const rec = value as { id?: string } | undefined;
			if (rec?.id && f !== `${rec.id}.json`) errors.push(`${label}: file name does not match id ${rec.id}`);
		}
	}

	const need = (from: string, ref: unknown, kind: Kind, what: string) => {
		if (ref === undefined || ref === 'nothing') return;
		if (typeof ref !== 'string') return;
		const target = all.get(ref);
		if (!target) errors.push(`${from}: ${what} ${ref} does not resolve`);
		else if (target.kind !== kind) errors.push(`${from}: ${what} ${ref} is a ${target.kind}, expected ${kind}`);
	};

	for (const { kind, rec, label } of all.values()) {
		const r = rec as Record<string, any>;
		switch (kind) {
			case 'creature':
				if (r.key !== key) errors.push(`${label}: key ${r.key} does not match folder ${key}`);
				for (const id of STAGE_IDS) need(label, r.stages?.[id]?.approvedBy, 'note', `stage ${id} approvedBy`);
				break;
			case 'part':
				for (const d of r.dependsOn ?? []) need(label, d, 'part', 'dependsOn');
				need(label, r.approvedBuild, 'build', 'approvedBuild');
				need(label, r.startBuild, 'build', 'startBuild');
				break;
			case 'hold':
				need(label, r.scope?.part, 'part', 'scope.part');
				break;
			case 'defect':
				need(label, r.part, 'part', 'part');
				need(label, r.region?.buildId, 'build', 'region.buildId');
				for (const b of r.attempts ?? []) need(label, b, 'build', 'attempt');
				break;
			case 'build':
				need(label, r.part, 'part', 'part');
				for (const d of r.targets ?? []) need(label, d, 'defect', 'target');
				need(label, r.goal?.sourceNote, 'note', 'goal.sourceNote');
				for (const dr of r.report?.defectResults ?? []) need(label, dr.defect, 'defect', 'defectResults.defect');
				need(label, r.report?.blockedBy?.hold, 'hold', 'blockedBy.hold');
				break;
			case 'note': {
				need(label, r.about?.build, 'build', 'about.build');
				need(label, r.about?.part, 'part', 'about.part');
				need(label, r.about?.hold, 'hold', 'about.hold');
				need(label, r.about?.defect, 'defect', 'about.defect');
				for (const d of r.marks ?? []) need(label, d, 'defect', 'marks');
				for (const h of r.holdsStruck ?? []) need(label, h, 'hold', 'holdsStruck');
				for (const d of r.defectsClosed ?? []) need(label, d, 'defect', 'defectsClosed');
				need(label, r.answered, 'note', 'answered');
				for (const hc of r.holdsChecked ?? []) need(label, hc.hold, 'hold', 'holdsChecked.hold');
				break;
			}
			default:
				break;
		}
	}
	return count;
}
