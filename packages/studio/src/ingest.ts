import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { putFile } from './blobs.ts';
import { StudioError } from './errors.ts';
import type { Build, Check } from './schema.ts';

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
	checks.push({ id: 'assembly', kind: 'measure', value: { assembly: packet.assembly, assemblySha256: packet.assemblySha256, baseline: packet.baseline }, detail: 'the assembly this packet was rendered from' });
	return { outputs, checks, blenderMinutes: packet.minutes };
}
