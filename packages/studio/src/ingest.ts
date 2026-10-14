import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { putFile } from './blobs.ts';
import { StudioError } from './errors.ts';
import { STANDARD_CAMERAS, type Build, type Check } from './schema.ts';

const nullable = <T extends z.ZodType>(t: T) => t.nullable().optional();

export const PacketSchema = z.strictObject({
	assembly: z.string(),
	assemblySha256: z.string(),
	baseline: z.string().nullable(),
	cameras: z.array(
		z.strictObject({
			id: z.string().min(1),
			file: z.string().min(1),
			baselineFile: nullable(z.string()),
			sideBySide: nullable(z.string()),
			diffFile: nullable(z.string()),
			changedFraction: nullable(z.number()),
		}),
	),
	displacement: z
		.strictObject({
			component: z.string(),
			heatFile: z.string(),
			moved: z.number().int(),
			max: z.number(),
			median: z.number(),
			units: z.string(),
			perZone: z.record(z.string(), z.number()),
		})
		.nullable(),
	// packet.py --part: skin displacement inside versus outside one part, against the baseline blockout
	partDisplacement: nullable(
		z.strictObject({
			key: z.string(),
			method: z.string(),
			units: z.string(),
			inside: z.record(z.string(), z.number()),
			outside: z.record(z.string(), z.number()),
			heatFile: z.string(),
		}),
	),
	// packet.py --cameras-only / --quick (part-only previews, experiment X26)
	camerasOnly: nullable(z.array(z.string())),
	quick: nullable(z.union([z.boolean(), z.strictObject({ samples: z.number().int().positive() })])),
	minutes: z.number().min(0),
});

export type Packet = z.infer<typeof PacketSchema>;

export interface IngestResult {
	outputs: Build['outputs'];
	checks: Check[];
	blenderMinutes: number;
}

/** Reads `<dir>/packet.json`, blob-stores every listed image and returns the outputs, checks and Blender minutes to record on a build. */
export function ingestPacket(dir: string, storeDir?: string): IngestResult {
	const packetDir = resolve(dir);
	const file = join(packetDir, 'packet.json');
	if (!existsSync(file)) throw new StudioError(`no packet.json in ${packetDir}`);
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(file, 'utf8'));
	} catch (e) {
		throw new StudioError(`packet.json is not valid JSON: ${(e as Error).message}`);
	}
	const parsed = PacketSchema.safeParse(raw);
	if (!parsed.success) {
		const i = parsed.error.issues[0];
		throw new StudioError(`packet.json: invalid ${i?.path.join('.') || 'value'}: ${i?.message ?? 'schema error'}`);
	}
	const packet = parsed.data;
	const outputs: Build['outputs'] = [];
	const add = (name: string, rel: string, role: string, camera?: string) => {
		const path = isAbsolute(rel) ? rel : join(packetDir, rel);
		outputs.push({ name, blob: putFile(path, storeDir), role, ...(camera ? { camera } : {}) });
	};

	const checks: Check[] = [];
	for (const cam of packet.cameras) {
		add(cam.id, cam.file, 'render', cam.id);
		if (cam.baselineFile) add(`${cam.id}-baseline`, cam.baselineFile, 'baseline', cam.id);
		if (cam.sideBySide) add(`${cam.id}-compare`, cam.sideBySide, 'compare', cam.id);
		if (cam.diffFile) add(`${cam.id}-diff`, cam.diffFile, 'diff', cam.id);
		if (typeof cam.changedFraction === 'number') {
			checks.push({ id: `changed-fraction:${cam.id}`, kind: 'measure', value: cam.changedFraction, detail: `share of pixels that differ from the baseline at ${cam.id}` });
		}
	}
	if (packet.displacement) {
		const d = packet.displacement;
		add(`heat-${d.component}`, d.heatFile, 'heat');
		checks.push({
			id: 'displacement',
			kind: 'measure',
			value: { component: d.component, moved: d.moved, max: d.max, median: d.median, units: d.units, perZone: d.perZone },
			detail: `how far ${d.component} moved from the baseline, in ${d.units}`,
		});
	}
	if (packet.partDisplacement) {
		const p = packet.partDisplacement;
		add(`part-heat-${p.key}`, p.heatFile, 'heat');
		checks.push({
			id: 'part-displacement',
			kind: 'measure',
			value: { key: p.key, method: p.method, units: p.units, inside: p.inside, outside: p.outside },
			detail: `how far the skin moved inside versus outside the part ${p.key}, in ${p.units}`,
		});
	}
	checks.push({ id: 'assembly', kind: 'measure', value: { assembly: packet.assembly, assemblySha256: packet.assemblySha256, baseline: packet.baseline }, detail: 'the assembly this packet was rendered from' });
	return { outputs, checks, blenderMinutes: packet.minutes };
}

export interface OverlayResult {
	outputs: Build['outputs'];
	checks: Check[];
}

/**
 * Reads a folder of overlay images named `<view>.overlay.png` (the view is a standard camera) and an optional
 * `fit.json` ({ "<view>": iou }), blob-stores the images as outputs with role overlay and camera = view, and
 * turns each fit number into a measure check `fit-iou:<view>`.
 */
export function ingestOverlays(dir: string, storeDir?: string): OverlayResult {
	const folder = resolve(dir);
	if (!existsSync(folder)) throw new StudioError(`no folder ${folder}`);
	const cams: readonly string[] = STANDARD_CAMERAS;
	const outputs: Build['outputs'] = [];
	for (const f of readdirSync(folder).filter((n) => n.endsWith('.overlay.png')).sort()) {
		const view = f.slice(0, -'.overlay.png'.length);
		if (!cams.includes(view)) throw new StudioError(`overlay ${f}: ${view} is not a standard camera (${cams.join(', ')})`);
		outputs.push({ name: `${view}-overlay`, blob: putFile(join(folder, f), storeDir), role: 'overlay', camera: view });
	}
	if (outputs.length === 0) throw new StudioError(`no <view>.overlay.png files in ${folder}`);
	const checks: Check[] = [];
	const fitFile = join(folder, 'fit.json');
	if (existsSync(fitFile)) {
		let raw: unknown;
		try {
			raw = JSON.parse(readFileSync(fitFile, 'utf8'));
		} catch (e) {
			throw new StudioError(`fit.json is not valid JSON: ${(e as Error).message}`);
		}
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new StudioError('fit.json must be an object of { view: iou }');
		for (const [view, iou] of Object.entries(raw as Record<string, unknown>)) {
			if (!cams.includes(view)) throw new StudioError(`fit.json: ${view} is not a standard camera`);
			if (typeof iou !== 'number' || !Number.isFinite(iou) || iou < 0 || iou > 1) throw new StudioError(`fit.json: ${view} must be a number from 0 to 1`);
			checks.push({ id: `fit-iou:${view}`, kind: 'measure', value: iou, detail: `silhouette overlap (intersection over union) between the model and the sheet at ${view}` });
		}
	}
	return { outputs, checks };
}
