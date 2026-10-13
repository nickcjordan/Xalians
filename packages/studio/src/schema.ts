import { z } from 'zod';

export const KINDS = ['creature', 'reference', 'part', 'hold', 'defect', 'build', 'note'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LETTER: Record<Kind, string> = {
	creature: 'C',
	reference: 'R',
	part: 'P',
	hold: 'H',
	defect: 'D',
	build: 'B',
	note: 'N',
};

/** Directory under art/creatures/<key>/ for each kind; the creature record is creature.json itself. */
export const KIND_DIR: Record<Exclude<Kind, 'creature'>, string> = {
	reference: 'references',
	part: 'parts',
	hold: 'holds',
	defect: 'defects',
	build: 'builds',
	note: 'notes',
};

export const STANDARD_CAMERAS = [
	'front',
	'threequarter-left',
	'threequarter-right',
	'side-left',
	'side-right',
	'back',
	'top',
	'below',
] as const;

export const STAGE_IDS = [
	'intake',
	'vision',
	'sheet',
	'blockout',
	'parts',
	'coherence',
	'surface',
	'color',
	'readiness',
	'rig',
	'animate',
	'atlas',
] as const;

const CROCKFORD = '[0-9A-HJKMNP-TV-Z]';

const idFor = (letter: string) => z.string().regex(new RegExp(`^${letter}-${CROCKFORD}{26}$`), `expected an id like ${letter}-<26 chars>`);
const aliasFor = (letter: string) => z.string().regex(new RegExp(`^${letter}-[a-z2-7]{4}$`), `expected an alias like ${letter}-abcd`);

export const ID_PATTERN = new RegExp(`^[CRPHDBN]-${CROCKFORD}{26}$`);
export const ALIAS_PATTERN = /^[CRPHDBN]-[a-z2-7]{4}$/;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'expected a lowercase sha256 hex digest');
const iso = z.iso.datetime();
const anyId = z.string().regex(ID_PATTERN);

const createdBy = z.union([z.enum(['nick', 'orchestrator', 'import']), z.string().regex(/^builder:.+$/)]);

function record<S extends z.ZodRawShape>(letter: string, body: S) {
	return z.strictObject({
		id: idFor(letter),
		alias: aliasFor(letter),
		rev: z.number().int().min(1),
		createdAt: iso,
		updatedAt: iso,
		createdBy,
		...body,
	});
}

const budget = z.strictObject({
	builds: z.number().int().min(0),
	wallMinutes: z.number().min(0),
	tokens: z.number().min(0).optional(),
});

const stage = z.strictObject({
	status: z.enum(['locked', 'open', 'in-review', 'approved', 'stale']),
	approvedBy: z.string().optional(),
	evidence: z.array(sha256).optional(),
	note: z.string().optional(),
});

/** A creature written before the vision stage existed had `references`; read it as `vision` and add the new locked stages. */
function migrateStages(raw: unknown): unknown {
	if (!raw || typeof raw !== 'object') return raw;
	const o = { ...(raw as Record<string, unknown>) };
	if ('references' in o) {
		o.vision ??= o.references;
		delete o.references;
	}
	o.sheet ??= { status: 'locked' };
	return o;
}

export const StagesSchema = z.preprocess(migrateStages, z.strictObject({
	intake: stage,
	vision: stage,
	sheet: stage,
	blockout: stage,
	parts: stage,
	coherence: stage,
	surface: stage,
	color: stage,
	readiness: stage,
	rig: stage,
	animate: stage,
	atlas: stage,
}));

/** What the orchestrator read from the description and silhouette; this is what Nick approves at intake. */
export const ReadingSchema = z.strictObject({
	/** Features the finished design must show. Source says where each came from. */
	mustHave: z.array(z.strictObject({ feature: z.string().min(1), source: z.enum(['description', 'silhouette', 'both']) })),
	/** High-level features read from the silhouette and carried over. */
	carryOver: z.array(z.strictObject({ feature: z.string().min(1) })),
	/** Details the vision board and model sheet decide. */
	openForDesign: z.array(z.strictObject({ feature: z.string().min(1), note: z.string().optional() })),
	questions: z.array(z.strictObject({ text: z.string().min(1) })),
});

export const IntakeSchema = z.strictObject({
	/** Repo-relative path of the species template this intake was read from. */
	speciesTemplate: z.string().min(1),
	templateSha256: sha256,
	name: z.string().min(1),
	element: z.string().min(1),
	homeWorld: z.string().min(1),
	bodyPlan: z.string().min(1),
	covering: z.string().min(1),
	sizeCm: z.tuple([z.number().min(0), z.number().min(0)]).nullable(),
	loreSummary: z.string().min(1),
	appearance: z.array(z.string()),
	anatomy: z.array(z.string()),
	silhouette: z.strictObject({ blob: sha256, fileName: z.string().min(1) }),
	reading: ReadingSchema.optional(),
});

export const CreatureSchema = record('C', {
	key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
	name: z.string().min(1),
	speciesTemplate: z.string(),
	silhouette: z.string(),
	intake: IntakeSchema.optional(),
	stages: StagesSchema,
	defaultBudget: budget,
	provenance: z.string().optional(),
});

export const ReferenceSchema = record('R', {
	blob: sha256,
	fileName: z.string().min(1),
	role: z.string().min(1),
	governs: z.array(z.string()),
	mustNotBeUsedFor: z.array(z.string()),
	precedence: z.number().int(),
	derivedTargets: z.array(z.strictObject({ kind: z.string(), blob: sha256, provisional: z.boolean() })).optional(),
});

export const PartSchema = record('P', {
	key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
	name: z.string().min(1),
	includes: z.array(z.string()),
	why: z.string(),
	scope: z.strictObject({ zones: z.array(z.string()).optional(), rule: z.string().optional() }),
	dependsOn: z.array(idFor('P')),
	order: z.number().int(),
	status: z.enum(['proposed', 'not-started', 'in-progress', 'in-review', 'approved', 'stale']),
	approvedBuild: idFor('B').optional(),
	budget,
	transitionBands: z.array(z.string()).optional(),
});

export const HoldSourceSchema = z.discriminatedUnion('kind', [
	z.strictObject({ kind: z.literal('nick'), quote: z.string().min(1), date: z.string(), session: z.string().optional() }),
	z.strictObject({ kind: z.literal('inferred'), reason: z.string().min(1), by: z.string().min(1) }),
	z.strictObject({ kind: z.literal('imported'), file: z.string().min(1), line: z.number().int(), quote: z.string().optional() }),
]);

export const HoldSchema = record('H', {
	statement: z.string().min(1),
	scope: z.strictObject({ part: idFor('P').optional() }),
	source: HoldSourceSchema,
	status: z.enum(['active', 'struck', 'lifted']),
	history: z.array(z.strictObject({ at: iso, status: z.enum(['active', 'struck', 'lifted']), by: z.string(), reason: z.string() })),
});

const fraction = z.number().min(0).max(1);

export const DefectSchema = record('D', {
	/** The part the problem is in; absent for a problem marked on a stage's images (see `stage`). */
	part: idFor('P').optional(),
	/** Set instead of `part` for a problem marked on a model sheet image. */
	stage: z.enum(STAGE_IDS).optional(),
	description: z.string().min(1),
	region: z
		.strictObject({
			buildId: idFor('B'),
			camera: z.string(),
			shape: z.enum(['ellipse', 'rect']),
			x: fraction,
			y: fraction,
			w: fraction,
			h: fraction,
		})
		.optional(),
	origin: z.enum(['nick', 'orchestrator', 'reader']),
	status: z.enum(['open', 'fixed', 'wontfix']),
	attempts: z.array(idFor('B')),
}).refine((d) => d.part !== undefined || d.stage !== undefined, { message: 'a defect needs a part or a stage' });

export const ReportSchema = z.strictObject({
	changed: z.string(),
	outputs: z.array(z.string()),
	defectResults: z.array(z.strictObject({ defect: idFor('D'), result: z.enum(['fixed', 'partly', 'not']), evidence: z.string() })),
	blockedBy: z.strictObject({
		hold: z.union([idFor('H'), z.literal('nothing')]),
		liftWouldAllow: z.string().optional(),
	}),
	outsideChanges: z.array(z.strictObject({ what: z.string(), why: z.string() })),
	newDefects: z.array(z.strictObject({ description: z.string() })).optional(),
	note: z.string().optional(),
});

export const CheckSchema = z.strictObject({
	id: z.string().min(1),
	kind: z.enum(['gate', 'measure', 'advisory']),
	passed: z.boolean().optional(),
	value: z.unknown().optional(),
	detail: z.string().optional(),
});

export const VISION_ELEMENTS = ['palette', 'fur', 'pattern', 'anatomy', 'eyes', 'other'] as const;
export const SHEET_ELEMENTS = ['turnaround-front', 'turnaround-threequarter', 'turnaround-side', 'turnaround-back', 'turnaround-top', 'closeup', 'bare-front', 'bare-side', 'bare-back', 'other'] as const;

/** One image generation run through Codex, recorded as a build. */
export const ImageBlockSchema = z.strictObject({
	stage: z.enum(['vision', 'sheet']),
	element: z.string().min(1),
	/** Short option name, for example "A: dawn gold". */
	label: z.string().min(1),
	/** The exact prompt text the user's prompt file held. */
	prompt: z.string().min(1),
	promptSha256: sha256,
	inputs: z.array(z.strictObject({ name: z.string().min(1), blob: sha256 })),
	tool: z.literal('codex image_gen'),
	/** Where Codex's own file was written (its reply); empty until the run reports. */
	generatedPath: z.string(),
	codexTokens: z.number().int().min(0).nullable(),
	/** Codex does not report the model; set only when STUDIO_CODEX_MODEL named one for the run. */
	model: z.string().min(1).nullable(),
	/** Vision only: what a pick of this image governs and must not be used for. */
	governs: z.array(z.string()).optional(),
	notFor: z.array(z.string()).optional(),
	/** The option set this image was presented in (counts regenerations); set when presented. */
	round: z.number().int().min(1).optional(),
	/** The tail of the run log when the run failed. */
	failure: z.string().optional(),
});

const buildBase = record('B', {
	part: idFor('P').optional(),
	kind: z.enum(['preview', 'build', 'image']),
	image: ImageBlockSchema.optional(),
	goal: z.strictObject({ text: z.string().min(1), sourceNote: idFor('N').optional() }),
	targets: z.array(idFor('D')),
	method: z.string(),
	briefHash: z.string().optional(),
	recipe: z.strictObject({ path: z.string(), sha256 }).optional(),
	commit: z.string().optional(),
	blenderVersion: z.string().optional(),
	outputs: z.array(
		z.strictObject({
			name: z.string().min(1),
			blob: sha256,
			path: z.string().optional(),
			role: z.string().optional(),
			camera: z.string().optional(),
		}),
	),
	checks: z.array(CheckSchema),
	report: ReportSchema.optional(),
	lookNotes: z.array(z.strictObject({ camera: z.string(), imageBlob: sha256, note: z.string() })),
	cost: z.strictObject({
		wallMinutes: z.number().min(0).optional(),
		blenderMinutes: z.number().min(0).optional(),
		tokens: z
			.strictObject({
				input: z.number().int().min(0),
				output: z.number().int().min(0),
				cacheRead: z.number().int().min(0),
				cacheWrite: z.number().int().min(0),
			})
			.optional(),
		/** Main-session spend in the build's time window; approximate by construction. */
		orchestratorTokens: z
			.strictObject({
				input: z.number().int().min(0),
				output: z.number().int().min(0),
				cacheRead: z.number().int().min(0),
				cacheWrite: z.number().int().min(0),
			})
			.optional(),
		agents: z
			.array(
				z.strictObject({
					file: z.string(),
					description: z.string(),
					model: z.string().optional(),
					tokens: z.strictObject({
						input: z.number().int().min(0),
						output: z.number().int().min(0),
						cacheRead: z.number().int().min(0),
						cacheWrite: z.number().int().min(0),
					}),
					minutes: z.number().min(0),
				}),
			)
			.optional(),
		approximate: z.boolean().optional(),
		manual: z.boolean().optional(),
		uncovered: z.string().optional(),
	}),
	status: z.enum(['planned', 'running', 'reported', 'checked', 'presented', 'reviewed', 'superseded', 'failed']),
	/** Session id of the orchestrator that ran this build; scopes the approximate orchestrator cost. */
	orchestratorSession: z.string().min(1).optional(),
	startedAt: iso.optional(),
	endedAt: iso.optional(),
	deadline: iso.optional(),
});

export const BuildSchema = buildBase.superRefine((b, ctx) => {
	if (b.kind === 'image') {
		if (b.part !== undefined) ctx.addIssue({ code: 'custom', message: 'an image build has no part' });
		if (b.targets.length > 0) ctx.addIssue({ code: 'custom', message: 'an image build targets no defects' });
		if (!b.image) ctx.addIssue({ code: 'custom', message: 'an image build needs its image block' });
	} else {
		if (b.part === undefined) ctx.addIssue({ code: 'custom', message: 'a build needs a part' });
		if (b.image) ctx.addIssue({ code: 'custom', message: 'only an image build carries an image block' });
	}
});

export const NoteSchema = record('N', {
	kind: z.enum(['review', 'decision', 'question', 'audit']),
	about: z
		.strictObject({
			build: idFor('B').optional(),
			part: idFor('P').optional(),
			hold: idFor('H').optional(),
			defect: idFor('D').optional(),
			stage: z.enum(STAGE_IDS).optional(),
			/** A vision or sheet element (palette, fur, ...) the note is about. */
			element: z.string().optional(),
		})
		.optional(),
	by: z.enum(['nick', 'orchestrator', 'import']),
	via: z.enum(['studio', 'chat', 'import']).optional(),
	text: z.string(),
	quote: z.string().optional(),
	date: z.string().optional(),
	session: z.string().optional(),
	// review
	verdict: z.enum(['approve', 'reject', 'adjust']).optional(),
	marks: z.array(idFor('D')).optional(),
	holdsStruck: z.array(idFor('H')).optional(),
	defectsClosed: z.array(idFor('D')).optional(),
	evidence: z.array(sha256).optional(),
	// question
	answered: idFor('N').optional(),
	// audit
	cause: z.string().optional(),
	holdsChecked: z.array(z.strictObject({ hold: idFor('H'), wouldLiftingRemoveCause: z.boolean(), reason: z.string() })).optional(),
	outcome: z.enum(['lift-inferred-hold', 'change-method', 'redefine-part', 'ask-nick']).optional(),
	outcomeDetail: z.string().optional(),
});

export const SCHEMAS = {
	creature: CreatureSchema,
	reference: ReferenceSchema,
	part: PartSchema,
	hold: HoldSchema,
	defect: DefectSchema,
	build: BuildSchema,
	note: NoteSchema,
} as const;

export type Intake = z.infer<typeof IntakeSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
export type StageId = (typeof STAGE_IDS)[number];
export type Creature = z.infer<typeof CreatureSchema>;
export type Reference = z.infer<typeof ReferenceSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Hold = z.infer<typeof HoldSchema>;
export type Defect = z.infer<typeof DefectSchema>;
export type Build = z.infer<typeof BuildSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Actor = z.infer<typeof createdBy>;

export interface RecordMap {
	creature: Creature;
	reference: Reference;
	part: Part;
	hold: Hold;
	defect: Defect;
	build: Build;
	note: Note;
}

/** The common fields every record carries, filled in by the store. */
export type CommonFields = 'id' | 'alias' | 'rev' | 'createdAt' | 'updatedAt' | 'createdBy';
export type NewRecord<K extends Kind> = Omit<RecordMap[K], CommonFields>;

export { anyId };
