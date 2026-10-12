import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyReview, canPresent, planBuild, status, STANDARD_CAMERAS, submitReport } from '../engine.ts';
import { initCreature, openCreature, type CreatureData, type Store } from '../store.ts';
import { ReportSchema, type Build, type Defect, type Hold, type Note, type Part } from '../schema.ts';
import { verifyAll } from '../verify.ts';

const HASH = 'a'.repeat(64);
const HASH2 = 'b'.repeat(64);

function tmpRoot(): string {
	return mkdtempSync(join(tmpdir(), 'studio-test-'));
}

function fresh(): { root: string; store: Store } {
	const root = tmpRoot();
	const store = initCreature(root, { key: 'akinza', name: 'Akinza', speciesTemplate: 'docs/x.json', silhouette: 'x.svg' });
	store.acquireLock('test');
	return { root, store };
}

function addPart(store: Store, key = 'skull', extra: Partial<Part> = {}) {
	return store.create(
		'part',
		{ key, name: key, includes: [], why: 'because', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 4, wallMinutes: 100 }, ...extra },
		'orchestrator',
	);
}

function addDefect(store: Store, part: Part, extra: Partial<Defect> = {}) {
	return store.create('defect', { part: part.id, description: 'brow is flat', origin: 'nick', status: 'open', attempts: [], ...extra }, 'orchestrator');
}

const goodReport = {
	changed: 'raised the brow',
	outputs: ['front'],
	defectResults: [] as { defect: string; result: 'fixed'; evidence: string }[],
	blockedBy: { hold: 'nothing' },
	outsideChanges: [],
};

// In-memory data for pure engine tests, with explicit timestamps.
let seq = 0;
function pad(n: number): string {
	return n.toString().padStart(26, '0').replace(/0/g, 'A');
}
function mkId(letter: string): string {
	seq++;
	return `${letter}-${pad(seq)}`;
}
function ts(n: number): string {
	return new Date(Date.UTC(2026, 9, 12, 12, n)).toISOString();
}
const base = (letter: string, n: number) => ({ id: mkId(letter), alias: `${letter}-${String(seq).padStart(4, 'a')}`, rev: 1, createdAt: ts(n), updatedAt: ts(n), createdBy: 'orchestrator' as const });

function memData(): { data: CreatureData; part: Part; defect: Defect } {
	const store = fresh().store;
	const creature = store.load().creature;
	const part: Part = { ...base('P', 0), key: 'skull', name: 'skull', includes: [], why: '', scope: {}, dependsOn: [], order: 1, status: 'in-progress', budget: { builds: 6, wallMinutes: 100 } };
	const defect: Defect = { ...base('D', 0), part: part.id, description: 'flat', origin: 'nick', status: 'open', attempts: [] };
	return { data: { creature, references: [], parts: [part], holds: [], defects: [defect], builds: [], notes: [] }, part, defect };
}

function mkBuild(part: Part, defect: Defect, n: number, method: string, extra: Partial<Build> = {}): Build {
	return { ...base('B', n), part: part.id, kind: 'build', goal: { text: 'g' }, targets: [defect.id], method, outputs: [], checks: [], lookNotes: [], cost: {}, status: 'reviewed', ...extra };
}

function mkNote(n: number, extra: Partial<Note>): Note {
	return { ...base('N', n), kind: 'audit', by: 'orchestrator', text: 'audit', ...extra } as Note;
}

describe('schema strictness', () => {
	it('rejects a report with a score', () => {
		expect(ReportSchema.safeParse({ ...goodReport, score: 8 }).success).toBe(false);
	});
	it('accepts a good report and rejects a missing blockedBy or outsideChanges', () => {
		expect(ReportSchema.safeParse(goodReport).success).toBe(true);
		const { blockedBy: _b, ...noBlocked } = goodReport;
		expect(ReportSchema.safeParse(noBlocked).success).toBe(false);
		const { outsideChanges: _o, ...noOutside } = goodReport;
		expect(ReportSchema.safeParse(noOutside).success).toBe(false);
	});
	it('rejects unknown fields on a stored record', () => {
		const { store } = fresh();
		expect(() => store.create('part', { key: 'x', name: 'x', includes: [], why: '', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 1, wallMinutes: 1 }, score: 9 } as never, 'orchestrator')).toThrow();
	});
});

describe('ids and aliases', () => {
	it('makes time-ordered ids and unique aliases of the right shape', () => {
		const { store } = fresh();
		const seen = new Set<string>();
		const ids: string[] = [];
		for (let i = 0; i < 60; i++) {
			const h = store.create('hold', { statement: `s${i}`, scope: {}, source: { kind: 'inferred', reason: 'r', by: 'o' }, status: 'active', history: [] }, 'orchestrator');
			expect(h.id).toMatch(/^H-[0-9A-HJKMNP-TV-Z]{26}$/);
			expect(h.alias).toMatch(/^H-[a-z2-7]{4}$/);
			expect(seen.has(h.alias)).toBe(false);
			seen.add(h.alias);
			ids.push(h.id);
		}
		expect([...ids].sort()).toEqual(ids.slice().sort());
		expect(new Set(ids).size).toBe(60);
	});
});

describe('store', () => {
	let store: Store;
	beforeEach(() => {
		store = fresh().store;
	});

	it('updates atomically, bumps rev, and writes stable pretty JSON', () => {
		const part = addPart(store);
		const next = store.update<'part'>(part.id, { status: 'in-progress' }, { actor: 'orchestrator', expectedRev: 1 });
		expect(next.rev).toBe(2);
		const text = readFileSync(join(store.dir, 'parts', `${part.id}.json`), 'utf8');
		expect(text.endsWith('}\n')).toBe(true);
		expect(text).toContain('\n  "id"');
		expect(Object.keys(JSON.parse(text)).slice(0, 3)).toEqual(['id', 'alias', 'rev']);
	});

	it('refuses a stale expectedRev', () => {
		const part = addPart(store);
		store.update<'part'>(part.id, { status: 'in-progress' }, { actor: 'orchestrator', expectedRev: 1 });
		expect(() => store.update<'part'>(part.id, { status: 'approved' }, { actor: 'orchestrator', expectedRev: 1 })).toThrow(/rev 2/);
	});

	it('refuses an update that fails validation and leaves the file alone', () => {
		const part = addPart(store);
		expect(() => store.update<'part'>(part.id, { status: 'bogus' as never }, { actor: 'orchestrator' })).toThrow();
		expect(store.get(part.id)!.record.rev).toBe(1);
	});

	it('refuses a second live lock and mutation without a lock', () => {
		const other = openCreature(store.root, 'akinza');
		expect(() => other.acquireLock('someone-else')).toThrow(/locked by session "test"/);
		store.releaseLock();
		expect(() => addPart(store)).toThrow(/not locked/);
		other.acquireLock('someone-else');
		expect(() => store.create('part', { key: 'x', name: 'x', includes: [], why: '', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 1, wallMinutes: 1 } }, 'orchestrator', { session: 'test' })).toThrow(/not "test"/);
	});

	it('lets a review by nick via studio in without the lock', () => {
		store.releaseLock();
		const note = store.create('note', { kind: 'review', by: 'nick', via: 'studio', text: 'ok', verdict: 'adjust' }, 'nick');
		expect(note.kind).toBe('review');
	});
});

describe('engine: budgets and stalls', () => {
	it('refuses when the build budget is spent', () => {
		const { store } = fresh();
		const part = addPart(store, 'skull', { budget: { builds: 1, wallMinutes: 100 } });
		const d = addDefect(store, part);
		const first = store.create('build', { ...planBuild(store.load(), { part: part.key, kind: 'build', goal: 'g', targets: [d.alias], method: 'm1' }) }, 'orchestrator');
		expect(first.status).toBe('planned');
		expect(() => planBuild(store.load(), { part: part.key, kind: 'build', goal: 'g', targets: [d.alias], method: 'm2' })).toThrow(/build budget/);
	});

	it('refuses when wall minutes are spent', () => {
		const { data, part, defect } = memData();
		data.builds.push(mkBuild(part, defect, 1, 'm', { status: 'failed', cost: { wallMinutes: 100 } }));
		expect(() => planBuild(data, { part: part.key, kind: 'build', goal: 'g', targets: [defect.id], method: 'new' })).toThrow(/time budget/);
	});

	it('refuses targets from another part and multiple targets without the flag', () => {
		const { data, part, defect } = memData();
		const other: Part = { ...part, id: mkId('P'), alias: 'P-zzzz', key: 'neck' };
		const foreign: Defect = { ...defect, id: mkId('D'), alias: 'D-zzzz', part: other.id };
		data.parts.push(other);
		data.defects.push(foreign);
		expect(() => planBuild(data, { part: part.key, kind: 'build', goal: 'g', targets: [foreign.id], method: 'm' })).toThrow(/another part/);
		const second: Defect = { ...defect, id: mkId('D'), alias: 'D-yyyy' };
		data.defects.push(second);
		expect(() => planBuild(data, { part: part.key, kind: 'build', goal: 'g', targets: [defect.id, second.id], method: 'm' })).toThrow(/allowMultiple/);
		expect(planBuild(data, { part: part.key, kind: 'build', goal: 'g', targets: [defect.id, second.id], method: 'm', allowMultiple: true }).targets).toHaveLength(2);
	});

	function stalled() {
		const { data, part, defect } = memData();
		data.builds.push(mkBuild(part, defect, 1, 'm1'), mkBuild(part, defect, 2, 'm2'));
		return { data, part, defect };
	}
	const plan = (data: CreatureData, part: Part, defect: Defect, method = 'm3') => planBuild(data, { part: part.key, kind: 'build', goal: 'g', targets: [defect.id], method });

	it('detects a stall after two builds and refuses a third', () => {
		const { data, part, defect } = stalled();
		const s = status(data);
		expect(s.parts[0]!.stalledDefects).toEqual([defect.alias]);
		expect(s.next).toMatch(/stalled/);
		expect(() => plan(data, part, defect)).toThrow(/stalled.*audit note/);
	});

	it('is unlocked by an audit that lifts an inferred hold, only once the hold is lifted', () => {
		const { data, part, defect } = stalled();
		const hold: Hold = { ...base('H', 0), statement: 's', scope: {}, source: { kind: 'inferred', reason: 'r', by: 'o' }, status: 'active', history: [] };
		data.holds.push(hold);
		data.notes.push(mkNote(5, { about: { defect: defect.id }, cause: 'brow rim', outcome: 'lift-inferred-hold', outcomeDetail: hold.id }));
		expect(() => plan(data, part, defect)).toThrow(/still active/);
		hold.status = 'lifted';
		expect(plan(data, part, defect).targets).toEqual([defect.id]);
	});

	it('does not accept lifting a hold that was not inferred', () => {
		const { data, part, defect } = stalled();
		const hold: Hold = { ...base('H', 0), statement: 's', scope: {}, source: { kind: 'nick', quote: 'q', date: 'd' }, status: 'lifted', history: [] };
		data.holds.push(hold);
		data.notes.push(mkNote(5, { about: { defect: defect.id }, outcome: 'lift-inferred-hold', outcomeDetail: hold.id }));
		expect(() => plan(data, part, defect)).toThrow(/not inferred/);
	});

	it('is unlocked by change-method only with a method no earlier build used', () => {
		const { data, part, defect } = stalled();
		data.notes.push(mkNote(5, { about: { defect: defect.id }, outcome: 'change-method' }));
		expect(() => plan(data, part, defect, 'm2')).toThrow(/already used/);
		expect(plan(data, part, defect, 'm3').method).toBe('m3');
	});

	it('is unlocked by redefine-part only if the part was updated after the audit', () => {
		const { data, part, defect } = stalled();
		data.notes.push(mkNote(5, { about: { defect: defect.id }, outcome: 'redefine-part' }));
		expect(() => plan(data, part, defect)).toThrow(/not updated after/);
		part.updatedAt = ts(6);
		part.rev = 2;
		expect(plan(data, part, defect).part).toBe(part.id);
	});

	it('is unlocked by ask-nick only once the question is answered', () => {
		const { data, part, defect } = stalled();
		const q = mkNote(6, { kind: 'question', about: { defect: defect.id }, text: 'ok?' });
		data.notes.push(mkNote(5, { about: { defect: defect.id }, outcome: 'ask-nick' }), q);
		expect(() => plan(data, part, defect)).toThrow(/not answered/);
		q.answered = mkId('N');
		expect(plan(data, part, defect).targets).toEqual([defect.id]);
	});

	it('does not unlock on an audit with no outcome, or one older than the last build', () => {
		const { data, part, defect } = stalled();
		data.notes.push(mkNote(0, { about: { defect: defect.id }, outcome: 'change-method' }));
		expect(() => plan(data, part, defect)).toThrow(/audit note/);
		data.notes.push(mkNote(5, { about: { defect: defect.id } }));
		expect(() => plan(data, part, defect)).toThrow(/no outcome/);
	});
});

describe('reports and presenting', () => {
	it('submitReport checks outputs exist and sets reported', () => {
		const { part, defect } = memData();
		const build = mkBuild(part, defect, 1, 'm', { status: 'running', outputs: [{ name: 'front', blob: HASH }] });
		expect(submitReport(build, goodReport).status).toBe('reported');
		expect(() => submitReport(build, { ...goodReport, outputs: ['back'] })).toThrow(/no such output/);
		expect(() => submitReport(build, { ...goodReport, score: 3 })).toThrow();
	});

	it('canPresent lists missing look notes and failed gates', () => {
		const { part, defect } = memData();
		const build = mkBuild(part, defect, 1, 'm', {
			outputs: [{ name: 'front', blob: HASH }],
			checks: [{ id: 'closed', kind: 'gate', passed: false }, { id: 'sym', kind: 'measure', value: 0.2 }],
			lookNotes: [{ camera: 'front', imageBlob: HASH, note: 'ok' }, { camera: 'back', imageBlob: HASH2, note: 'stray' }],
		});
		const r = canPresent(build, STANDARD_CAMERAS);
		expect(r.ok).toBe(false);
		expect(r.reasons).toContain('gate check "closed" has not passed');
		expect(r.reasons).toContain('no look note for camera top');
		expect(r.reasons.some((x) => x.includes('back') && x.includes('not among'))).toBe(true);
		expect(r.reasons.some((x) => x.includes('front'))).toBe(false);
	});

	it('canPresent passes with every gate and look note in place', () => {
		const { part, defect } = memData();
		const outputs = STANDARD_CAMERAS.map((c, i) => ({ name: c, blob: i.toString(16).padStart(64, '0') }));
		const build = mkBuild(part, defect, 1, 'm', {
			outputs,
			checks: [{ id: 'closed', kind: 'gate', passed: true }],
			lookNotes: STANDARD_CAMERAS.map((c, i) => ({ camera: c, imageBlob: outputs[i]!.blob, note: 'seen' })),
		});
		expect(canPresent(build).ok).toBe(true);
	});
});

describe('applyReview', () => {
	it('approves, marks approved dependents stale, strikes holds, closes defects', () => {
		const { data, part, defect } = memData();
		const neck: Part = { ...part, id: mkId('P'), alias: 'P-neck', key: 'neck', dependsOn: [part.id], status: 'approved' };
		const jaw: Part = { ...part, id: mkId('P'), alias: 'P-jaww', key: 'jaw', dependsOn: [part.id], status: 'in-progress' };
		const build = mkBuild(part, defect, 1, 'm', { status: 'presented' });
		const hold: Hold = { ...base('H', 0), statement: 's', scope: {}, source: { kind: 'inferred', reason: 'r', by: 'o' }, status: 'active', history: [] };
		data.parts.push(neck, jaw);
		data.builds.push(build);
		data.holds.push(hold);
		const note = mkNote(9, { kind: 'review', by: 'nick', about: { build: build.id }, verdict: 'approve', holdsStruck: [hold.id], defectsClosed: [defect.id], text: 'yes' });
		const u = applyReview(data, note);
		expect(u.parts.find((p) => p.id === part.id)).toMatchObject({ status: 'approved', approvedBuild: build.id });
		expect(u.parts.find((p) => p.id === neck.id)!.status).toBe('stale');
		expect(u.parts.find((p) => p.id === jaw.id)).toBeUndefined();
		expect(u.holds[0]).toMatchObject({ status: 'struck' });
		expect(u.holds[0]!.history.at(-1)).toMatchObject({ status: 'struck', by: 'nick' });
		expect(u.defects[0]!.status).toBe('fixed');
		expect(u.builds[0]!.status).toBe('reviewed');
	});

	it('refuses a review by the orchestrator', () => {
		const { data, part, defect } = memData();
		const build = mkBuild(part, defect, 1, 'm', { status: 'presented' });
		data.builds.push(build);
		const note = mkNote(9, { kind: 'review', by: 'orchestrator', about: { build: build.id }, verdict: 'approve' });
		expect(() => applyReview(data, note)).toThrow(/only Nick/);
	});
});

describe('verify', () => {
	it('passes a clean tree and catches a dangling reference and a bad record', () => {
		const { root, store } = fresh();
		const part = addPart(store);
		addDefect(store, part);
		expect(verifyAll(root).errors).toEqual([]);

		const dangling = store.create('defect', { part: 'P-' + 'Z'.repeat(26), description: 'orphan', origin: 'nick', status: 'open', attempts: [] }, 'orchestrator');
		const r = verifyAll(root);
		expect(r.errors.some((e) => e.includes(dangling.id) || e.includes('part') && e.includes('does not resolve'))).toBe(true);

		writeFileSync(join(store.dir, 'notes', 'junk.json'), JSON.stringify({ id: 'N-x' }));
		mkdirSync(join(root, 'art', 'creatures', 'empty'), { recursive: true });
		const r2 = verifyAll(root);
		expect(r2.errors.some((e) => e.includes('notes/junk.json'))).toBe(true);
		expect(r2.errors.some((e) => e.includes('missing creature.json'))).toBe(true);
	});

	it('catches duplicate aliases', () => {
		const { root, store } = fresh();
		const a = addPart(store, 'a');
		const b = addPart(store, 'b');
		const file = join(store.dir, 'parts', `${b.id}.json`);
		const rec = JSON.parse(readFileSync(file, 'utf8'));
		rec.alias = a.alias;
		writeFileSync(file, JSON.stringify(rec));
		expect(verifyAll(root).errors.some((e) => e.includes('already used'))).toBe(true);
	});
});
