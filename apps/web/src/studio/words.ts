// Plain words for the review screen. No ids except the short alias.

export const CAMERA_ORDER = ['front', 'threequarter-left', 'threequarter-right', 'side-left', 'side-right', 'back', 'top', 'below'];

const CAMERA_WORDS: Record<string, string> = {
	front: 'Front',
	'threequarter-left': 'Three-quarter left',
	'threequarter-right': 'Three-quarter right',
	'side-left': 'Left side',
	'side-right': 'Right side',
	back: 'Back',
	top: 'Top',
	below: 'Below',
};

export const cameraWord = (id: string) => CAMERA_WORDS[id] ?? id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function sortCameras(ids: string[]): string[] {
	const rank = (id: string) => {
		const i = CAMERA_ORDER.indexOf(id);
		return i === -1 ? CAMERA_ORDER.length : i;
	};
	return [...ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const BUILD_STATUS: Record<string, string> = {
	planned: 'Not started',
	running: 'Running',
	reported: 'Reported',
	checked: 'Checked',
	presented: 'Waiting for you',
	reviewed: 'Reviewed',
	superseded: 'Set aside',
	failed: 'Failed',
};
export const buildStatusWord = (s: string) => BUILD_STATUS[s] ?? s;

const PART_STATUS: Record<string, string> = {
	'not-started': 'Not started',
	'in-progress': 'In progress',
	'in-review': 'In review',
	approved: 'Approved',
	stale: 'Needs another look',
	proposed: 'Proposed',
};
export const partStatusWord = (s: string) => PART_STATUS[s] ?? s;

export const buildKindWord = (k: string) => (k === 'preview' ? 'Preview' : k === 'image' ? 'Image' : 'Build');

export function timeAgo(iso: string, now: number = Date.now()): string {
	const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins} min ago`;
	const hours = Math.round(mins / 60);
	if (hours < 48) return `${hours} h ago`;
	return `${Math.round(hours / 24)} days ago`;
}

export function minutes(n: number): string {
	return `${Number.isInteger(n) ? n : n.toFixed(1)} min`;
}

export function tokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
	return String(n);
}

export const VERDICT_WORD: Record<string, string> = { approve: 'Approved', adjust: 'Asked for changes', reject: 'Rejected' };

const SHORT: Record<string, string> = { 'threequarter-left': '3/4 left', 'threequarter-right': '3/4 right', 'side-left': 'Left', 'side-right': 'Right' };
export const cameraShort = (id: string) => SHORT[id] ?? cameraWord(id);

const STAGE_NAME: Record<string, string> = {
	intake: 'Intake',
	vision: 'Vision board',
	sheet: 'Model sheet',
	blockout: 'Blockout',
	parts: 'Parts',
	coherence: 'Coherence',
	surface: 'Surface',
	color: 'Color and pattern',
	readiness: 'Readiness',
	rig: 'Rig',
	animate: 'Animate',
	atlas: 'Sprite atlas',
};
export const stageName = (id: string) => STAGE_NAME[id] ?? id;

const STAGE_STATUS: Record<string, string> = {
	locked: 'Not open yet',
	open: 'Open',
	'in-review': 'Waiting for you',
	approved: 'Approved',
	stale: 'Out of date',
};
export const stageStatusWord = (s: string) => STAGE_STATUS[s] ?? s;

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ELEMENT_NAME: Record<string, string> = {
	palette: 'Color palette',
	fur: 'Fur and texture',
	pattern: 'Pattern',
	anatomy: 'Anatomy studies',
	eyes: 'Eyes and expression',
	other: 'Other',
	'turnaround-front': 'Front',
	'turnaround-threequarter': 'Three-quarter',
	'turnaround-side': 'Side',
	'turnaround-back': 'Back',
	'turnaround-top': 'Top',
	closeup: 'Close-up',
	'bare-front': 'Bare body, front',
	'bare-side': 'Bare body, side',
	'bare-back': 'Bare body, back',
};
export const elementName = (id: string) => ELEMENT_NAME[id] ?? cap(id.replace(/-/g, ' '));
