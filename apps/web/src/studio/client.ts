// Creature Studio review screen: the client half of the dev-only /__studio/api.
// Types come from the studio library (type-only imports, erased at build).
import * as React from 'react';
import type { BuildView, NeedItem, PartView } from '@xalians/studio/engine';
import type { BoardPart, CreatureBoard, ImageView, ReferenceView, SheetView, StageView, VisionElementView, VisionView } from '@xalians/studio/stages';

export type { BuildView, NeedItem, PartView, BoardPart, CreatureBoard, ImageView, ReferenceView, SheetView, StageView, VisionElementView, VisionView };

/** GET creatures/:key: the board plus everything waiting on Nick. */
export type CreatureState = CreatureBoard & { needs: NeedItem[] };

export interface CreatureSummary {
	key: string;
	name: string;
	alias: string;
	parts: number;
	needs: number;
	error?: string;
}

export interface PartSummary {
	id: string;
	alias: string;
	key: string;
	name: string;
	status: string;
	stale: boolean;
	openDefects: { alias: string; description: string; attempts: number }[];
	stalledDefects: string[];
	buildsUsed: number;
	budgetLeft: { builds: number; wallMinutes: number };
}

export interface MarkDraft {
	camera: string;
	shape: 'ellipse' | 'rect';
	x: number;
	y: number;
	w: number;
	h: number;
	description: string;
}

const BASE = '/__studio/api/';

export const blobUrl = (sha: string) => `${BASE}blob/${sha}`;

async function send<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
	const res = await fetch(BASE + path, {
		method,
		headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Studio-Request': '1' } : undefined,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	let data: unknown;
	try {
		data = text ? JSON.parse(text) : undefined;
	} catch {
		throw new Error(`The studio server answered with something unreadable (${res.status}).`);
	}
	if (!res.ok) throw new Error((data as { error?: string } | undefined)?.error ?? `The studio server answered ${res.status}.`);
	return data as T;
}

export const api = {
	creatures: () => send<CreatureSummary[]>('GET', 'creatures'),
	creature: (creature: string) => send<CreatureState>('GET', `creatures/${encodeURIComponent(creature)}`),
	references: (creature: string) => send<ReferenceView[]>('GET', `creatures/${encodeURIComponent(creature)}/references`),
	vision: (creature: string) => send<VisionView>('GET', `creatures/${encodeURIComponent(creature)}/vision`),
	sheet: (creature: string) => send<SheetView>('GET', `creatures/${encodeURIComponent(creature)}/sheet`),
	pick: (creature: string, body: { build: string; text: string }) => send<unknown>('POST', `creatures/${encodeURIComponent(creature)}/pick`, body),
	elementAdjust: (creature: string, body: { element: string; text: string }) => send<unknown>('POST', `creatures/${encodeURIComponent(creature)}/element-adjust`, body),
	sheetMarks: (creature: string, body: { build: string; marks: MarkDraft[] }) => send<{ defects: { alias: string }[] }>('POST', `creatures/${encodeURIComponent(creature)}/sheet-marks`, body),
	stageReview: (creature: string, body: { stage: string; verdict: 'approve' | 'adjust' | 'reject'; text: string }) =>
		send<{ note: { alias: string; verdict: string; text: string }; applied: string[] }>('POST', `creatures/${encodeURIComponent(creature)}/stage-review`, body),
	needs: (creature: string) => send<NeedItem[]>('GET', `creatures/${encodeURIComponent(creature)}/needs`),
	parts: (creature: string) => send<PartSummary[]>('GET', `creatures/${encodeURIComponent(creature)}/parts`),
	part: (creature: string, part: string) => send<PartView>('GET', `creatures/${encodeURIComponent(creature)}/parts/${encodeURIComponent(part)}`),
	review: (creature: string, body: { build: string; verdict: 'approve' | 'reject' | 'adjust'; text: string; holdsStruck: string[]; defectsClosed: string[]; marks: MarkDraft[] }) =>
		send<{ note: { alias: string; verdict: string; text: string }; defects: { alias: string }[]; applied: string[] }>('POST', `creatures/${encodeURIComponent(creature)}/review`, body),
	strike: (creature: string, hold: string, reason: string) => send<unknown>('POST', `creatures/${encodeURIComponent(creature)}/holds/${encodeURIComponent(hold)}/strike`, { reason }),
	choose: (creature: string, body: { builds: string[]; chosen: string; text: string }) => send<unknown>('POST', `creatures/${encodeURIComponent(creature)}/choose`, body),
};

/**
 * Loads on mount and whenever `key` changes, then polls. State only changes
 * when the answer does, so an open form is never redrawn under the person.
 */
export function usePolled<T>(load: (() => Promise<T>) | null, key: string, intervalMs = 5000) {
	const [data, setData] = React.useState<T | undefined>(undefined);
	const [error, setError] = React.useState<string | undefined>(undefined);
	const last = React.useRef<string>('');
	const loader = React.useRef(load);
	loader.current = load;

	const refresh = React.useCallback(async () => {
		const fn = loader.current;
		if (!fn) return;
		try {
			const next = await fn();
			const s = JSON.stringify(next);
			if (s !== last.current) {
				last.current = s;
				setData(next);
			}
			setError(undefined);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	React.useEffect(() => {
		last.current = '';
		setData(undefined);
		setError(undefined);
		if (!loader.current) return;
		void refresh();
		const timer = window.setInterval(() => void refresh(), intervalMs);
		return () => window.clearInterval(timer);
	}, [key, intervalMs, refresh]);

	return { data, error, refresh };
}
