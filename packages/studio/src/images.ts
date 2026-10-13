import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { putFile, storeRoot } from './blobs.ts';
import { StudioError } from './errors.ts';
import { SHEET_ELEMENTS, VISION_ELEMENTS, VisionContextSchema, type Build, type Defect, type Note, type Reference } from './schema.ts';
import type { Who } from './intake.ts';
import type { MarkInput } from './review.ts';
import type { Store } from './store.ts';

const NICK = { actor: 'nick' as const, bypassLock: true };
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
const opts = (who: Who) => ({ actor: who.actor, ...(who.session ? { session: who.session } : {}) });

export const CODEX_TIMEOUT_MS = 15 * 60 * 1000;
export const IMAGE_TOOL = 'codex image_gen' as const;

export type ImageStage = 'vision' | 'sheet';

export function elementsFor(stage: ImageStage): readonly string[] {
	return stage === 'vision' ? VISION_ELEMENTS : SHEET_ELEMENTS;
}

function checkStage(value: string | undefined): ImageStage {
	if (value !== 'vision' && value !== 'sheet') throw new StudioError('--stage must be vision or sheet');
	return value;
}

/** The text sent to Codex: the user's prompt, then the fixed instructions for the image tool and the output file. */
export function wrapperPrompt(prompt: string, inputNames: string[]): string {
	const inputs = inputNames.length > 0 ? `Input images, if any, are the files in the current folder named ${inputNames.join(', ')}. ` : '';
	return `${prompt.trim()}\n\nUse your built-in image generation tool to generate exactly one image. ${inputs}Copy the generated PNG into the current folder as output.png. Reply with only the absolute path of the original generated file.\n`;
}

/** Reads the "tokens used" line Codex prints at the end of a run; null when absent. */
export function parseCodexTokens(log: string): number | null {
	const matches = [...log.matchAll(/tokens used[:\s]+(\d[\d,._]*)/gi)];
	const last = matches[matches.length - 1];
	if (!last) return null;
	const n = Number(last[1]!.replace(/[,._]/g, ''));
	return Number.isFinite(n) ? n : null;
}

export interface ImageRunInput {
	stage: string;
	element: string;
	label: string;
	summary?: string;
	promptFile: string;
	inputs?: string[];
	governs?: string[];
	notFor?: string[];
}

/**
 * On Windows a bare `codex` resolves, without a shell, to whatever `codex.exe` is first on PATH,
 * which can be an older WinGet install whose default model the account rejects. The npm install
 * is the one the shell uses, so prefer its script entry (run with node, no shell) when present.
 */
function defaultCodexBin(): string {
	if (process.platform === 'win32' && process.env.APPDATA) {
		const npmEntry = join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
		if (existsSync(npmEntry)) return npmEntry;
	}
	return 'codex';
}

function runCodex(bin: string, args: string[], input: string): { status: number | null; log: string; timedOut: boolean; error?: string } {
	const isScript = /\.(?:c|m)?js$/i.test(bin);
	const command = isScript ? process.execPath : bin;
	const argv = isScript ? [bin, ...args] : args;
	const attempt = (shell: boolean) => spawnSync(command, argv, { input, encoding: 'utf8', timeout: CODEX_TIMEOUT_MS, windowsHide: true, maxBuffer: 256 * 1024 * 1024, shell });
	let r = attempt(false);
	if (r.error && (r.error as NodeJS.ErrnoException).code === 'ENOENT' && process.platform === 'win32' && !isScript) r = attempt(true);
	const log = `${r.stdout ?? ''}${r.stderr ? `\n${r.stderr}` : ''}`;
	const timedOut = (r.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
	return { status: r.status, log, timedOut, ...(r.error && !timedOut ? { error: r.error.message } : {}) };
}

/**
 * Generates one image through Codex and records the run as an image build. The run happens in a
 * folder under the studio store, never inside the repository (a repo Stop hook traps Codex there).
 * A failed run is recorded as a failed build with the log tail, and returned (not thrown).
 */
export function runImage(store: Store, input: ImageRunInput, who: Who): Build {
	const stage = checkStage(input.stage);
	const allowed = elementsFor(stage);
	if (!allowed.includes(input.element)) throw new StudioError(`element ${input.element} is not a ${stage} element; use one of ${allowed.join(', ')}`);
	if (!input.label.trim()) throw new StudioError('an image needs a --label (its short option name)');
	if (!existsSync(input.promptFile)) throw new StudioError(`prompt file not found: ${input.promptFile}`);
	const prompt = readFileSync(input.promptFile, 'utf8').trim();
	if (!prompt) throw new StudioError('the prompt file is empty');
	const stageState = store.load().creature.stages[stage];
	if (stageState.status === 'locked') throw new StudioError(`the ${stage} stage is not open yet`);
	if (stageState.status === 'approved') throw new StudioError(`the ${stage} stage is approved; images cannot be added to it`);

	const files = (input.inputs ?? []).map((f) => resolve(f));
	for (const f of files) if (!existsSync(f)) throw new StudioError(`input image not found: ${f}`);
	const names = files.map((f, i) => (files.findIndex((g) => basename(g) === basename(f)) === i ? basename(f) : `${i + 1}-${basename(f)}`));
	if (names.includes('output.png')) throw new StudioError('an input image cannot be named output.png');

	// Codex uses the model in the user's config unless STUDIO_CODEX_MODEL names another (a config pointing at a model the account cannot use fails every run).
	const model = process.env.STUDIO_CODEX_MODEL?.trim() || null;
	const started = new Date();
	const build = store.create('build', {
		kind: 'image',
		goal: { text: `${input.label.trim()}: ${stage} ${input.element}` },
		targets: [],
		method: IMAGE_TOOL,
		outputs: [],
		checks: [],
		lookNotes: [],
		cost: {},
		status: 'running',
		startedAt: started.toISOString(),
		deadline: new Date(started.getTime() + CODEX_TIMEOUT_MS).toISOString(),
		image: {
			stage,
			element: input.element,
			label: input.label.trim(),
			...(input.summary?.trim() ? { summary: input.summary.trim() } : {}),
			prompt,
			promptSha256: sha(prompt),
			inputs: files.map((f, i) => ({ name: names[i]!, blob: putFile(f) })),
			tool: IMAGE_TOOL,
			generatedPath: '',
			codexTokens: null,
			model,
			...(input.governs?.length ? { governs: input.governs } : {}),
			...(input.notFor?.length ? { notFor: input.notFor } : {}),
		},
	} as never, who.actor, who.session ? { session: who.session } : {}) as Build;

	const runDir = join(storeRoot(), 'codex-runs', build.alias);
	const rel = relative(resolve(store.root), resolve(runDir));
	const insideRepo = rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep) && !/^[a-zA-Z]:/.test(rel));
	const minutesSince = () => Math.round(((Date.now() - started.getTime()) / 60000) * 100) / 100;
	const fail = (reason: string, log: string): Build => {
		const tail = `${reason}${log.trim() ? `\n${log.trim().slice(-1500)}` : ''}`;
		const wall = minutesSince();
		return store.update<'build'>(build.id, (b) => {
			b.status = 'failed';
			b.endedAt = new Date().toISOString();
			b.cost.wallMinutes = wall;
			if (b.image) b.image.failure = tail;
		}, opts(who));
	};

	if (insideRepo) return fail(`the run folder ${runDir} is inside the repository; set XALIANS_STUDIO_STORE to a folder outside it`, '');

	mkdirSync(runDir, { recursive: true });
	for (let i = 0; i < files.length; i++) copyFileSync(files[i]!, join(runDir, names[i]!));
	const wrapper = wrapperPrompt(prompt, names);
	writeFileSync(join(runDir, 'prompt.md'), wrapper);

	const bin = process.env.STUDIO_CODEX_BIN || defaultCodexBin();
	const result = runCodex(bin, ['exec', ...(model ? ['-m', model] : []), '--sandbox', 'workspace-write', '--skip-git-repo-check', '-C', runDir, '--output-last-message', join(runDir, 'reply.md'), '-'], wrapper);
	writeFileSync(join(runDir, 'run.log'), result.log);

	if (result.timedOut) return fail('Codex did not finish within 15 minutes and was stopped', result.log);
	if (result.error) return fail(`could not run ${bin}: ${result.error}`, result.log);
	if (result.status !== 0) return fail(`Codex exited with status ${result.status}`, result.log);
	const out = join(runDir, 'output.png');
	if (!existsSync(out)) return fail('Codex finished but wrote no output.png', result.log);
	const reply = existsSync(join(runDir, 'reply.md')) ? (readFileSync(join(runDir, 'reply.md'), 'utf8').trim().split(/\r?\n/).pop() ?? '').trim() : '';
	const tokens = parseCodexTokens(result.log);
	const blob = putFile(out);
	const wall = minutesSince();
	return store.update<'build'>(build.id, (b) => {
		b.outputs = [{ name: 'output.png', blob, role: 'render' }];
		b.status = 'reported';
		b.endedAt = new Date().toISOString();
		b.cost.wallMinutes = wall;
		if (b.image) {
			b.image.generatedPath = reply;
			b.image.codexTokens = tokens;
		}
	}, opts(who));
}

/**
 * Shows reported images to Nick as an option set. The vision stage needs the element; the sheet
 * presents every reported sheet image. Each presentation is one round (regeneration count).
 */
export function presentImages(store: Store, input: { stage: string; element?: string }, who: Who): Build[] {
	const stage = checkStage(input.stage);
	if (stage === 'vision' && !input.element) throw new StudioError('presenting vision options needs --element');
	const data = store.load();
	const mine = data.builds.filter((b) => b.kind === 'image' && b.image?.stage === stage && (stage === 'sheet' || b.image.element === input.element));
	const ready = mine.filter((b) => b.status === 'reported');
	if (ready.length === 0) throw new StudioError(`no reported ${stage} images${input.element ? ` for ${input.element}` : ''} to present`);
	const round = mine.reduce((m, b) => Math.max(m, b.image?.round ?? 0), 0) + 1;
	const out = ready.map((b) => store.update<'build'>(b.id, (x) => {
		x.status = 'presented';
		if (x.image) x.image.round = round;
	}, opts(who)));
	// New images change what a submitted stage covers, so it goes back to open.
	if (data.creature.stages[stage].status === 'in-review') store.update<'creature'>(data.creature.id, (c) => { c.stages[stage] = { status: 'open' }; }, opts(who));
	return out;
}

const find = <T extends { id: string; alias: string }>(list: readonly T[], ref: string): T | undefined => list.find((r) => r.id === ref || r.alias === ref);

export interface PickInput {
	build: string;
	text?: string;
}

/**
 * Nick picks one option for a vision element. The pick becomes a reference (role = the element,
 * governs and not-for from the image build), the other options of the set are set aside, and a
 * decision note by nick records it.
 */
export function pickImage(store: Store, input: PickInput): { note: Note; reference: Reference; chosen: Build } {
	const data = store.load();
	const chosen = find(data.builds, input.build);
	if (!chosen || chosen.kind !== 'image' || chosen.image?.stage !== 'vision') throw new StudioError(`no vision option ${input.build}`);
	if (chosen.status !== 'presented') throw new StudioError(`option ${chosen.alias} is ${chosen.status}, not presented`);
	const element = chosen.image.element;
	const out = chosen.outputs[0];
	if (!out) throw new StudioError(`option ${chosen.alias} has no image`);
	const already = data.builds.find((b) => b.kind === 'image' && b.image?.stage === 'vision' && b.image.element === element && b.status === 'reviewed');
	if (already) throw new StudioError(`${element} is already picked (${already.alias}); the orchestrator changes a picked reference with studio reference edit`);

	const precedence = data.references.reduce((m, r) => Math.max(m, r.precedence), 0) + 1;
	const slug = chosen.image.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'option';
	const reference = store.create('reference', {
		blob: out.blob,
		fileName: `${element}-${slug}.png`,
		role: element,
		governs: chosen.image.governs?.length ? chosen.image.governs : [element],
		mustNotBeUsedFor: chosen.image.notFor ?? [],
		precedence,
	}, 'nick', { bypassLock: true });
	const others = data.builds.filter((b) => b.kind === 'image' && b.image?.stage === 'vision' && b.image.element === element && b.status === 'presented' && b.id !== chosen.id);
	const extra = (input.text ?? '').trim();
	const note = store.create('note', {
		kind: 'decision',
		about: { stage: 'vision', build: chosen.id, element },
		by: 'nick',
		via: 'studio',
		text: `Picked ${chosen.image.label} for ${element}${others.length ? ` over ${others.map((b) => b.image!.label).join(', ')}` : ''}.${extra ? ` ${extra}` : ''}`,
		date: new Date().toISOString().slice(0, 10),
	}, 'nick', { bypassLock: true });
	store.update<'build'>(chosen.id, (b) => { b.status = 'reviewed'; }, NICK);
	for (const b of others) store.update<'build'>(b.id, (x) => { x.status = 'superseded'; }, NICK);
	return { note, reference, chosen: store.get(chosen.id)!.record as Build };
}

/**
 * Nick takes back the pick for one vision element (through the studio screen only). The pick's
 * reference is deleted, the chosen option and the options that pick set aside come back as a
 * presented set, and a vision stage that was waiting for review goes back to open. The pick's
 * decision note stays as history.
 */
export function unpickImage(store: Store, input: { element: string }, who: Who): { note: Note; builds: Build[] } {
	if (who.actor !== 'nick') throw new StudioError('only Nick can undo a pick, in the studio screen');
	const data = store.load();
	const stage = data.creature.stages.vision;
	if (stage.status === 'approved') throw new StudioError('the vision stage is approved; a pick can no longer be undone');
	const vision = data.builds.filter((b) => b.kind === 'image' && b.image?.stage === 'vision' && b.image.element === input.element);
	const chosen = [...vision].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).reverse().find((b) => b.status === 'reviewed');
	if (!chosen || !chosen.image) throw new StudioError(`${input.element} has no pick to undo`);
	const blob = chosen.outputs[0]?.blob;
	const reference = data.references.find((r) => r.blob === blob && r.role === input.element);
	if (reference?.derivedTargets?.length) throw new StudioError(`the ${input.element} reference ${reference.alias} already has derived targets; ask the orchestrator to change it instead`);
	const note = store.create('note', {
		kind: 'decision',
		about: { stage: 'vision', build: chosen.id, element: input.element },
		by: 'nick',
		via: 'studio',
		text: `Undid the pick of ${chosen.image.label} for ${input.element}`,
		date: new Date().toISOString().slice(0, 10),
	}, 'nick', { bypassLock: true });
	if (reference) store.removeReference(reference.id, NICK);
	// The set that pick settled: the chosen build and the builds set aside in the same round.
	const round = chosen.image.round;
	const set = vision.filter((b) => b.id === chosen.id || (b.status === 'superseded' && b.image?.round === round));
	for (const b of set) store.update<'build'>(b.id, (x) => { x.status = 'presented'; }, NICK);
	if (stage.status === 'in-review') store.update<'creature'>(data.creature.id, (c) => { c.stages.vision = { status: 'open' }; }, NICK);
	return { note, builds: set.map((b) => store.get(b.id)!.record as Build) };
}

/** The orchestrator records what the description and silhouette say about each element, shown above its options. */
export function setVisionContext(store: Store, input: unknown, who: Who): Record<string, { description: string[]; silhouette?: string; note?: string }> {
	const context = VisionContextSchema.parse(input);
	for (const el of Object.keys(context)) if (!VISION_ELEMENTS.includes(el as never)) throw new StudioError(`${el} is not a vision element; use one of ${VISION_ELEMENTS.join(', ')}`);
	store.update<'creature'>(store.load().creature.id, (c) => { c.visionContext = context; }, opts(who));
	return context;
}

/** Nick rejects a whole option set for an element ("none of these") in words; the set is set aside. */
export function adjustElement(store: Store, input: { element: string; text: string }): Note {
	const text = (input.text ?? '').trim();
	if (!text) throw new StudioError('say what is wrong with these options so the next set can be different');
	const data = store.load();
	const set = data.builds.filter((b) => b.kind === 'image' && b.image?.stage === 'vision' && b.image.element === input.element && b.status === 'presented');
	if (set.length === 0) throw new StudioError(`no options are waiting for ${input.element}`);
	const note = store.create('note', {
		kind: 'review',
		about: { stage: 'vision', element: input.element },
		by: 'nick',
		via: 'studio',
		text,
		date: new Date().toISOString().slice(0, 10),
		verdict: 'adjust',
		evidence: [...new Set(set.flatMap((b) => b.outputs.map((o) => o.blob)))],
	}, 'nick', { bypassLock: true });
	for (const b of set) store.update<'build'>(b.id, (x) => { x.status = 'superseded'; }, NICK);
	return note;
}

/** Nick marks problems on a model sheet image. Each mark becomes a defect about the sheet stage. */
export function markSheetImage(store: Store, input: { build: string; marks: MarkInput[] }): Defect[] {
	const data = store.load();
	const build = find(data.builds, input.build);
	if (!build || build.kind !== 'image' || build.image?.stage !== 'sheet') throw new StudioError(`no sheet image ${input.build}`);
	if (build.status !== 'presented' && build.status !== 'reviewed') throw new StudioError(`image ${build.alias} is ${build.status}; only a shown image can be marked`);
	if (!input.marks || input.marks.length === 0) throw new StudioError('no marks to send');
	const frac = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
	for (const m of input.marks) {
		if (!m.description || !m.description.trim()) throw new StudioError('every mark needs a description of what is wrong');
		if (m.shape !== 'ellipse' && m.shape !== 'rect') throw new StudioError('mark shape must be ellipse or rect');
		if (![m.x, m.y, m.w, m.h].every(frac)) throw new StudioError('mark x, y, w and h must be numbers from 0 to 1');
	}
	return input.marks.map((m) => store.create('defect', {
		stage: 'sheet',
		description: m.description.trim(),
		region: { buildId: build.id, camera: m.camera || 'image', shape: m.shape, x: m.x, y: m.y, w: m.w, h: m.h },
		origin: 'nick',
		status: 'open',
		attempts: [],
	}, 'nick', { bypassLock: true }));
}
