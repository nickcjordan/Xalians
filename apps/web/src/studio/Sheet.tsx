// Tier: chrome. The model sheet review of the Creature Studio screen: the turnaround in a row, the
// bare-body views in a second row, close-ups in a grid. Click an image for a large view with the
// mark-a-problem tool. State is carried by words, icons and edge style, never by hue alone.
import * as React from 'react';
import { Check, CircleDashed, Send, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { api, blobUrl, usePolled, type BuildView, type ImageView, type MarkDraft, type SheetView } from './client';
import { Panel } from './Panels';
import { StageVerdict } from './Stages';
import { MarksList, Viewer, type CompareMode, type Overlay, type Tool } from './Viewer';
import { elementName, timeAgo } from './words';

const TURNAROUND = ['turnaround-front', 'turnaround-threequarter', 'turnaround-side', 'turnaround-back', 'turnaround-top'];
const REQUIRED_TURNS = TURNAROUND.slice(0, 4);
const BARE = ['bare-front', 'bare-side', 'bare-back'];

/** The viewer works on builds with cameras; a sheet image is one build with one view. */
function asBuild(img: ImageView): BuildView {
	return {
		id: img.id,
		alias: img.alias,
		kind: 'image',
		status: 'presented',
		goal: img.label,
		method: '',
		createdAt: img.createdAt,
		targets: [],
		cameras: { sheet: img.blob ? [{ name: 'output.png', blob: img.blob, role: 'render' }] : [] },
		otherOutputs: [],
		checks: [],
		cost: {},
	};
}

function Tile({ image, marks, onOpen, size }: { image: ImageView; marks: number; onOpen: () => void; size: 'tall' | 'wide' }) {
	return (
		<li className="flex min-w-0">
			<button
				type="button"
				onClick={onOpen}
				aria-label={`Open ${elementName(image.element)} ${image.label} large`}
				className="flex w-full min-w-0 flex-col gap-1.5 border border-edge-strong bg-s1 p-2 text-left outline-none hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
			>
				<span className="flex items-baseline justify-between gap-2">
					<span className="type-legend text-[10.5px] text-ink">{elementName(image.element)}</span>
					{marks > 0 ? <span className="type-data border border-caution px-1 text-[11px] text-caution">{marks} marked</span> : null}
				</span>
				{image.blob ? <img src={blobUrl(image.blob)} alt="" className={`block h-auto w-full border border-edge bg-s0 object-contain ${size === 'tall' ? 'max-h-[min(36vh,380px)]' : 'max-h-[min(28vh,300px)]'}`} /> : null}
				<span className="font-body text-small text-ink-2">{image.label}</span>
			</button>
		</li>
	);
}

function Missing({ element }: { element: string }) {
	return (
		<li className="flex min-w-0 flex-col items-center justify-center gap-1 border border-dashed border-edge-strong bg-s0 p-3 text-center">
			<CircleDashed className="size-5 text-ink-3" aria-hidden="true" />
			<span className="type-legend text-[10.5px] text-ink">{elementName(element)}</span>
			<span className="font-body text-small text-ink-2">Not made yet</span>
		</li>
	);
}

function LargeView({ creature, image, onClose, onSent }: { creature: string; image: ImageView | null; onClose: () => void; onSent: () => void }) {
	const [tool, setTool] = React.useState<Tool>('view');
	const [marks, setMarks] = React.useState<MarkDraft[]>([]);
	const [compare, setCompare] = React.useState<CompareMode>('side');
	const [overlay, setOverlay] = React.useState<Overlay>('render');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [sent, setSent] = React.useState(0);

	React.useEffect(() => {
		setTool('view');
		setMarks([]);
		setError(null);
		setSent(0);
	}, [image?.id]);

	const send = async () => {
		if (!image || marks.length === 0) return;
		setBusy(true);
		setError(null);
		try {
			const r = await api.sheetMarks(creature, { build: image.alias, marks });
			setSent(r.defects.length);
			setMarks([]);
			setTool('view');
			onSent();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={image !== null} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose(); }}>
			<DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[96vh] max-w-[min(1300px,97vw)] sm:max-w-[min(1300px,97vw)]">
				{image ? (
					<>
						<DialogHeader>
							<DialogTitle className="type-heading m-0 text-[18px]">{elementName(image.element) === image.label ? image.label : `${elementName(image.element)}: ${image.label}`}</DialogTitle>
							<DialogDescription className="type-data text-[12px]">{image.alias}. Use Circle or Box to mark what is wrong, then send the marks.</DialogDescription>
						</DialogHeader>
						<div className="h-[min(68vh,760px)] min-h-0">
							<Viewer
								build={asBuild(image)}
								camera="sheet"
								compare={compare}
								onCompare={setCompare}
								overlay={overlay}
								onOverlay={setOverlay}
								tool={tool}
								onTool={setTool}
								marks={marks}
								onMarks={setMarks}
								canMark
								plain
							/>
						</div>
						<div className="flex flex-wrap items-start gap-3">
							<div className="min-w-0 flex-1"><MarksList marks={marks} onMarks={setMarks} /></div>
							<div className="flex flex-col items-end gap-1">
								<Button type="button" disabled={busy || marks.length === 0} onClick={() => void send()}><Send /> {marks.length === 0 ? 'Send marks' : marks.length === 1 ? 'Send 1 mark' : `Send ${marks.length} marks`}</Button>
								{sent > 0 ? <p className="m-0 flex items-center gap-1 font-body text-small text-ink"><Check className="size-4" aria-hidden="true" />{sent === 1 ? '1 mark sent' : `${sent} marks sent`} to the orchestrator.</p> : null}
								{error ? <p role="alert" className="m-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
							</div>
						</div>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function Row({ title, hint, children, cols }: { title: string; hint?: string; children: React.ReactNode; cols: number }) {
	return (
		<section aria-label={title} className="flex flex-col gap-2 border-t-2 border-ink pt-3">
			<div className="flex flex-wrap items-baseline gap-3">
				<h2 className="type-heading m-0 text-[18px]">{title}</h2>
				{hint ? <span className="font-body text-small text-ink-2">{hint}</span> : null}
			</div>
			<ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{children}</ul>
		</section>
	);
}

function consistencyOk(view: SheetView) {
	return view.consistency !== undefined;
}

export function SheetReview({ creature }: { creature: string }) {
	const { data: state, error, refresh } = usePolled(() => api.creature(creature), `sheet-state:${creature}`, 4000);
	const { data: sheet, refresh: refreshSheet } = usePolled(() => api.sheet(creature), `sheet:${creature}`, 4000);
	const [open, setOpen] = React.useState<string | null>(null);
	if (error && !state) return <p role="alert" className="m-6 font-body text-body text-plague-outline-ink">{error}</p>;
	if (!state || !sheet) return null;
	const stage = state.stages.find((s) => s.id === 'sheet')!;
	const changed = () => { void refresh(); void refreshSheet(); };
	const of = (elements: string[]) => sheet.images.filter((i) => elements.includes(i.element));
	const markCount = (img: ImageView) => sheet.marks.filter((m) => m.build === img.alias && m.status === 'open').length;
	const opened = sheet.images.find((i) => i.id === open) ?? null;
	const turns: (ImageView | string)[] = TURNAROUND.flatMap((e): (ImageView | string)[] => {
		const mine = of([e]);
		return mine.length > 0 ? mine : REQUIRED_TURNS.includes(e) ? [e] : [];
	});
	const bare = BARE.flatMap((e) => of([e]));
	const rest = sheet.images.filter((i) => !TURNAROUND.includes(i.element) && !BARE.includes(i.element));
	const tile = (img: ImageView, size: 'tall' | 'wide') => <Tile key={img.id} image={img} marks={markCount(img)} onOpen={() => setOpen(img.id)} size={size} />;

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
				<div className="flex flex-wrap items-baseline gap-3">
					<h1 className="type-title m-0 text-[24px]">Model sheet for {state.name}</h1>
					<span className="font-body text-small text-ink-2">{sheet.images.length === 1 ? '1 image' : `${sheet.images.length} images`}{sheet.rounds > 0 ? ` · ${sheet.rounds === 1 ? '1 set' : `${sheet.rounds} sets`} shown` : ''}. Click an image to look closely and mark a problem.</span>
				</div>

				{consistencyOk(sheet) ? (
					<section aria-label="Consistency check" className="border border-edge-strong border-l-4 border-l-ink bg-s1 p-3">
						<p className="type-legend m-0 mb-1 text-[10.5px]">Cross-view check by the orchestrator · {timeAgo(sheet.consistency!.createdAt)}</p>
						<p className="m-0 max-w-[90ch] font-body text-body text-ink">{sheet.consistency!.text}</p>
					</section>
				) : (
					<p className="m-0 flex items-start gap-2 border-l-4 border-caution bg-caution-tint p-3 font-body text-small text-ink">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
						<span><strong>No cross-view check yet.</strong> The orchestrator compares the views and lists any contradictions before the stage is submitted.</span>
					</p>
				)}

				<Row title="Turnaround" hint="Front, three-quarter, side, back and top in a neutral modeling pose." cols={5}>
					{turns.map((t) => (typeof t === 'string' ? <Missing key={t} element={t} /> : tile(t, 'tall')))}
				</Row>

				<Row title="Bare body" hint="The body without fur, for the blockout." cols={5}>
					{bare.length === 0 ? <Missing element="bare-front" /> : bare.map((b) => tile(b, 'tall'))}
				</Row>

				{rest.length > 0 ? (
					<Row title="Close-ups" cols={5}>
						{rest.map((r) => tile(r, 'wide'))}
					</Row>
				) : null}

				{sheet.marks.length > 0 ? (
					<section aria-label="Marked problems" className="flex flex-col gap-1 border border-edge bg-s1 p-3">
						<h2 className="type-subhead m-0 text-[15px]">Problems you marked <span className="type-data ml-2 text-small text-ink-2">{sheet.marks.length}</span></h2>
						<ul className="m-0 flex list-none flex-col gap-1 p-0">
							{sheet.marks.map((m) => (
								<li key={m.alias} className="flex flex-wrap items-center gap-2 font-body text-small text-ink">
									<Badge variant="default">{m.status === 'open' ? 'Open' : m.status === 'fixed' ? 'Fixed' : 'Won’t fix'}</Badge>
									<span className="type-data text-[12px] text-ink-3">{m.build}</span>
									{m.description}
								</li>
							))}
						</ul>
					</section>
				) : null}
				{sheet.failed.length > 0 ? <p className="m-0 flex items-start gap-2 font-body text-small text-ink-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{sheet.failed.length === 1 ? '1 image run failed' : `${sheet.failed.length} image runs failed`} and is not shown.</p> : null}
			</div>
			<div className="flex w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-edge bg-s0 p-3 min-[1700px]:w-[460px]">
				<StageVerdict creature={creature} stage={stage} notes={state.stageNotes} onDone={changed} approveHint="Approving fixes the sheet as the look of this creature. The blockout settles exact proportions, so a small mismatch between views is not a reason to hold it." />
				<Panel title="How to read this">
					<p className="m-0 font-body text-small text-ink-2">The sheet governs the look and the features. Dashed boxes are views the orchestrator still has to make. A mark you send becomes a problem about the sheet that the orchestrator works from. You can approve the sheet as a whole or ask for changes.</p>
				</Panel>
			</div>
			<LargeView creature={creature} image={opened} onClose={() => setOpen(null)} onSent={changed} />
		</div>
	);
}
