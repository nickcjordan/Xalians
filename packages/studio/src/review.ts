import { StudioError } from './errors.ts';
import { applyReview, holdChangeRefusal } from './engine.ts';
import type { Build, Defect, Hold, Note } from './schema.ts';
import type { Store } from './store.ts';

const fraction = (v: unknown, name: string): number => {
	if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new StudioError(`mark ${name} must be a number from 0 to 1`);
	return v;
};

export interface MarkInput {
	camera: string;
	shape: 'ellipse' | 'rect';
	x: number;
	y: number;
	w: number;
	h: number;
	description: string;
}

export interface ReviewInput {
	build: string;
	verdict: 'approve' | 'reject' | 'adjust';
	text: string;
	holdsStruck?: string[];
	defectsClosed?: string[];
	marks?: MarkInput[];
}

function pick<T extends { id: string; alias: string }>(list: readonly T[], ref: string, what: string): T {
	const found = list.find((r) => r.id === ref || r.alias === ref);
	if (!found) throw new StudioError(`no ${what} ${ref}`);
	return found;
}

const NICK = { actor: 'nick' as const, bypassLock: true };

/**
 * Nick's review from the studio screen. Creates a defect per mark (origin nick), then the review
 * note, then applies the review's effects, all as Nick and without the creature lock (the review
 * screen is where he looks at the build). The engine's review rules apply.
 */
export function recordReview(store: Store, input: ReviewInput): { note: Note; defects: Defect[]; applied: string[] } {
	const data = store.load();
	const build = pick(data.builds, input.build, 'build');
	if (!['approve', 'reject', 'adjust'].includes(input.verdict)) throw new StudioError('verdict must be approve, reject or adjust');
	if (build.status !== 'presented') throw new StudioError(`build ${build.alias} is ${build.status}; only a presented build can be reviewed`);
	if (input.verdict === 'approve' && build.kind === 'preview') throw new StudioError('a preview cannot be approved; choose a direction and ask for a build');

	const marks = input.marks ?? [];
	for (const m of marks) {
		if (!m.description || !m.description.trim()) throw new StudioError('every mark needs a description of what is wrong');
		if (m.shape !== 'ellipse' && m.shape !== 'rect') throw new StudioError('mark shape must be ellipse or rect');
		fraction(m.x, 'x'); fraction(m.y, 'y'); fraction(m.w, 'w'); fraction(m.h, 'h');
		if (!m.camera) throw new StudioError('every mark needs a camera');
	}
	const holdsStruck = (input.holdsStruck ?? []).map((r) => pick(data.holds, r, 'hold').id);
	const defectsClosed = (input.defectsClosed ?? []).map((r) => pick(data.defects, r, 'defect').id);

	const defects: Defect[] = marks.map((m) =>
		store.create('defect', {
			part: build.part,
			description: m.description.trim(),
			region: { buildId: build.id, camera: m.camera, shape: m.shape, x: m.x, y: m.y, w: m.w, h: m.h },
			origin: 'nick',
			status: 'open',
			attempts: [],
		}, 'nick', { bypassLock: true }),
	);

	const note = store.create('note', {
		kind: 'review',
		about: { build: build.id, part: build.part },
		by: 'nick',
		via: 'studio',
		text: input.text,
		date: new Date().toISOString().slice(0, 10),
		verdict: input.verdict,
		...(defects.length ? { marks: defects.map((d) => d.id) } : {}),
		...(holdsStruck.length ? { holdsStruck } : {}),
		...(defectsClosed.length ? { defectsClosed } : {}),
		evidence: [...new Set(build.outputs.map((o) => o.blob))],
	}, 'nick', { bypassLock: true });

	const applied: string[] = [];
	const updates = applyReview(store.load(), note);
	for (const p of updates.parts) { store.update<'part'>(p.id, () => p, NICK); applied.push(`part ${p.alias} ${p.status}`); }
	for (const h of updates.holds) { store.update<'hold'>(h.id, () => h, NICK); applied.push(`hold ${h.alias} ${h.status}`); }
	for (const d of updates.defects) { store.update<'defect'>(d.id, () => d, NICK); applied.push(`defect ${d.alias} ${d.status}`); }
	for (const b of updates.builds) { store.update<'build'>(b.id, () => b, NICK); applied.push(`build ${b.alias} ${b.status}`); }
	return { note, defects, applied };
}

/** Nick strikes a hold in the screen. Only Nick strikes; the reason is kept in the hold's history. */
export function strikeHold(store: Store, holdRef: string, reason: string): Hold {
	if (!reason || !reason.trim()) throw new StudioError('a reason is needed to strike a hold');
	const data = store.load();
	const hold = pick(data.holds, holdRef, 'hold');
	if (hold.status !== 'active') throw new StudioError(`hold ${hold.alias} is already ${hold.status}`);
	const refusal = holdChangeRefusal(data, hold, 'strike', 'nick');
	if (refusal) throw new StudioError(refusal);
	return store.update<'hold'>(hold.id, (h) => {
		h.status = 'struck';
		h.history.push({ at: new Date().toISOString(), status: 'struck', by: 'nick', reason: reason.trim() });
	}, NICK);
}

export interface ChoiceInput {
	builds: string[];
	chosen: string;
	text: string;
}

/**
 * Nick picks a direction among previews presented together. A preview cannot be approved, so this
 * records a decision note; the chosen preview becomes reviewed, the others superseded.
 */
export function recordChoice(store: Store, input: ChoiceInput): { note: Note; chosen: Build } {
	const data = store.load();
	if (!input.builds || input.builds.length < 2) throw new StudioError('choosing needs at least two previews');
	const builds = input.builds.map((r) => pick(data.builds, r, 'build'));
	const chosen = builds.find((b) => b.id === input.chosen || b.alias === input.chosen);
	if (!chosen) throw new StudioError(`chosen build ${input.chosen} is not among the options`);
	for (const b of builds) {
		if (b.kind !== 'preview') throw new StudioError(`build ${b.alias} is not a preview`);
		if (b.status !== 'presented') throw new StudioError(`build ${b.alias} is ${b.status}, not presented`);
	}
	const others = builds.filter((b) => b.id !== chosen.id).map((b) => b.alias).join(', ');
	const extra = (input.text ?? '').trim();
	const note = store.create('note', {
		kind: 'decision',
		about: { build: chosen.id, part: chosen.part },
		by: 'nick',
		via: 'studio',
		text: `Chose ${chosen.alias} over ${others}.${extra ? ` ${extra}` : ''}`,
		date: new Date().toISOString().slice(0, 10),
	}, 'nick', { bypassLock: true });
	for (const b of builds) store.update<'build'>(b.id, (x) => { x.status = b.id === chosen.id ? 'reviewed' : 'superseded'; }, NICK);
	return { note, chosen: store.get(chosen.id)!.record as Build };
}
