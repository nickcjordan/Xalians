// Tier: chrome. The vision board review of the Creature Studio screen: one section per signature
// element with its option set side by side, a pick button on each option, a "none of these" box,
// and the chosen image once picked. State is carried by words, icons, thick bars and edge style
// (solid for decided, dashed for waiting), never by hue alone.
import * as React from 'react';
import { Check, CircleDashed, Hourglass, Layers, RotateCcw, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { JudgeList } from './Judge';
import { api, blobUrl, usePolled, type ImageView, type ReferenceView, type VisionElementView, type VisionView } from './client';
import { Panel } from './Panels';
import { plate, ReferenceLarge, StageVerdict, WordList } from './Stages';
import { elementName, minutes, tokens as tokenWord } from './words';

function Facts({ image }: { image: ImageView }) {
	const bits = [image.wallMinutes !== undefined ? minutes(image.wallMinutes) : null, image.codexTokens !== null ? `${tokenWord(image.codexTokens)} Codex tokens` : null].filter(Boolean);
	return bits.length > 0 ? <p className="type-data m-0 text-[12px] text-ink-2">{bits.join(' · ')}</p> : null;
}

function PromptFold({ image }: { image: ImageView }) {
	return (
		<details className="border border-edge bg-s0 [&_summary]:cursor-pointer">
			<summary className="type-legend px-2 py-1 text-[10.5px] outline-none focus-visible:outline-2 focus-visible:outline-ring">Prompt</summary>
			<p className="m-0 max-h-40 overflow-y-auto border-t border-edge p-2 font-body text-small whitespace-pre-wrap text-ink-2">{image.prompt}</p>
		</details>
	);
}

/** Every pick so far in one view, beside the approval box, so the whole look is judged together (Nick, 2026-10-13). */
function PicksCollage({ elements }: { elements: VisionView['elements'] }) {
	const picked = elements.filter((e) => e.picked?.blob);
	const open = elements.filter((e) => !e.picked);
	return (
		<Panel title="Your picks" count={`${picked.length} of ${elements.length}`} className="p-3">
			{picked.length === 0 ? <p className="m-0 font-body text-small text-ink-2">Each pick appears here as you make it.</p> : (
				<ul className="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
					{picked.map((e) => (
						<li key={e.element} className="flex min-w-0 flex-col gap-0.5" title={`${elementName(e.element)}: ${e.picked!.label}`}>
							<img src={blobUrl(e.picked!.blob!)} alt={`${elementName(e.element)}: ${e.picked!.label}`} className="block aspect-square w-full border border-edge bg-s0 object-contain" />
							<span className="type-legend truncate text-[9.5px]">{elementName(e.element)}</span>
							<span className="truncate font-body text-[11.5px] leading-tight text-ink">{e.picked!.label.replace(/^[A-Z]: /, '')}</span>
						</li>
					))}
				</ul>
			)}
			{open.length > 0 ? <p className="mt-2 mb-0 font-body text-small text-ink-2">Still to pick: {open.map((e) => elementName(e.element)).join(', ')}.</p> : null}
		</Panel>
	);
}

function OptionCard({ image, index, busy, onPick }: { image: ImageView; index: number; busy: boolean; onPick: () => void }) {
	return (
		<li className="flex min-w-0 flex-col gap-2 border border-dashed border-edge-strong bg-s1 p-3">
			<div className="flex items-baseline gap-2">
				<span className="type-data border border-edge-strong px-1.5 text-[12px] text-ink">{String.fromCharCode(65 + index)}</span>
				<span className="type-heading min-w-0 text-[16px] text-ink">{image.label}</span>
			</div>
			{image.summary ? <p className="m-0 font-body text-body text-ink">{image.summary}</p> : null}
			{image.blob ? (
				<img src={blobUrl(image.blob)} alt={`${elementName(image.element)}, ${image.label}`} className="block max-h-[min(44vh,460px)] w-full border border-edge bg-s0 object-contain" />
			) : (
				<p className="m-0 border border-edge bg-s0 p-6 font-body text-small text-ink-2">No image.</p>
			)}
			{image.governs.length > 0 ? <p className="m-0 font-body text-small text-ink-2"><span className="type-legend mr-2 text-[10.5px]">Would govern</span>{image.governs.join(', ')}</p> : null}
			{image.notFor.length > 0 ? <p className="m-0 font-body text-small text-ink-2"><span className="type-legend mr-2 text-[10.5px]">Not for</span>{image.notFor.join(', ')}</p> : null}
			<PromptFold image={image} />
			<Facts image={image} />
			<Button type="button" disabled={busy} onClick={onPick}>
				<Check /> Pick {image.label}
			</Button>
		</li>
	);
}

type ElementContext = VisionView['context'][string];

function ContextBlock({ context }: { context: ElementContext | undefined }) {
	const lines = context?.description ?? [];
	return (
		<div className="flex max-w-[80ch] flex-col gap-1 border-l-4 border-edge-strong bg-s0 p-3 font-body text-small text-ink-2">
			<p className="type-legend m-0 text-[10.5px] text-ink">What your description says</p>
			{lines.length > 0 ? (
				<ul className="m-0 flex list-none flex-col gap-0.5 p-0">
					{lines.map((l) => <li key={l}>&ldquo;{l}&rdquo;</li>)}
				</ul>
			) : <p className="m-0">Nothing in the description.</p>}
			{context?.silhouette ? <p className="m-0"><span className="font-bold text-ink">From your silhouette:</span> {context.silhouette}</p> : null}
			{context?.note ? <p className="m-0">{context.note}</p> : null}
		</div>
	);
}

function ElementSection({ creature, element, context, canUnpick, onChanged, onOpenPicked }: { creature: string; element: VisionElementView; context: ElementContext | undefined; canUnpick: boolean; onChanged: () => void; onOpenPicked: (blob: string) => void }) {
	const [confirmUndo, setConfirmUndo] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [none, setNone] = React.useState('');
	const name = elementName(element.element);
	const picked = element.picked;
	const waiting = element.options.length > 0;

	const run = async (fn: () => Promise<unknown>) => {
		setBusy(true);
		setError(null);
		try {
			await fn();
			onChanged();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const state = picked ? 'Picked' : waiting ? 'Pick one' : element.adjust ? 'New set asked for' : element.running > 0 ? 'Being made' : 'Nothing to pick yet';
	const Icon = picked ? Check : waiting ? CircleDashed : element.adjust ? RotateCcw : Hourglass;

	return (
		<section aria-label={name} className="flex flex-col gap-3 border-t-2 border-ink pt-3">
			<div className="flex flex-wrap items-baseline gap-3">
				<h2 className="type-heading m-0 text-[20px]">{name}</h2>
				<Badge variant={picked ? 'ok' : 'default'}><Icon />{state}</Badge>
				<span className="font-body text-small text-ink-2">{element.rounds === 0 ? 'No set shown yet' : element.rounds === 1 ? '1 set shown' : `${element.rounds} sets shown`}</span>
				{element.rounds >= 3 && !picked ? <Badge variant="warn"><TriangleAlert />Two sets did not land</Badge> : null}
			</div>

			<ContextBlock context={context} />

			{picked ? (
				<div className="flex min-w-0 flex-wrap gap-4 border border-edge-strong bg-s2 p-3">
					<button
						type="button"
						onClick={() => picked.blob && onOpenPicked(picked.blob)}
						aria-label={`Open the picked ${name.toLowerCase()} image large`}
						className="min-w-0 flex-[1_1_320px] outline-none focus-visible:outline-2 focus-visible:outline-ring"
					>
						{picked.blob ? <img src={blobUrl(picked.blob)} alt={`${name}: ${picked.label}`} className="block max-h-[min(26vh,260px)] w-full border border-edge bg-s0 object-contain" /> : null}
					</button>
					<div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
						<p className="m-0 flex items-center gap-2 font-body text-body font-bold text-ink"><Check className="size-4 shrink-0" aria-hidden="true" />{picked.label}</p>
						<WordList label="Governs" items={picked.governs} empty="Nothing" />
						<WordList label="Do not use for" items={picked.notFor} empty="Nothing excluded" />
						<Facts image={picked} />
						{canUnpick ? (
							confirmUndo ? (
								<div role="group" aria-label={`Undo the ${name.toLowerCase()} pick`} className="flex flex-col gap-2 border border-edge-strong bg-s1 p-2">
									<p className="m-0 font-body text-small text-ink">Undo? The options come back so you can choose again.</p>
									<div className="flex flex-wrap gap-2">
										<Button type="button" variant="secondary" disabled={busy} onClick={() => void run(async () => { await api.unpick(creature, { element: element.element }); setConfirmUndo(false); })}><RotateCcw /> Yes, undo this pick</Button>
										<Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmUndo(false)}>Keep the pick</Button>
									</div>
								</div>
							) : (
								<div><Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmUndo(true)}><RotateCcw /> Undo this pick</Button></div>
							)
						) : null}
					</div>
				</div>
			) : null}

			{waiting ? (
				<>
					<JudgeList checks={element.judge} />
					<ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: `repeat(${Math.min(element.options.length, 3)}, minmax(0, 1fr))` }}>
						{element.options.map((o, i) => (
							<OptionCard key={o.id} image={o} index={i} busy={busy} onPick={() => void run(() => api.pick(creature, { build: o.alias, text: '' }))} />
						))}
					</ul>
					<form
						className="flex flex-col gap-2 border border-edge bg-s0 p-3"
						onSubmit={(e) => {
							e.preventDefault();
							if (none.trim()) void run(async () => { await api.elementAdjust(creature, { element: element.element, text: none }); setNone(''); });
						}}
					>
						<label className="type-legend" htmlFor={`none-${element.element}`}>None of these: what is wrong with all of them</label>
						<Textarea id={`none-${element.element}`} value={none} onChange={(e) => setNone(e.target.value)} className="min-h-12" rows={2} placeholder="For example: both are too orange" />
						<div>
							<Button type="submit" variant="secondary" disabled={busy || !none.trim()}><RotateCcw /> None of these, make a new set</Button>
						</div>
					</form>
				</>
			) : null}

			{!waiting && !picked && element.adjust ? (
				<p className="m-0 border-l-4 border-ink bg-s1 p-3 font-body text-small text-ink">You asked for a different set: &ldquo;{element.adjust.text}&rdquo;. The orchestrator makes the next one.</p>
			) : null}
			{!waiting && !picked && !element.adjust ? <p className="m-0 font-body text-small text-ink-2">{element.running > 0 ? 'Images for this are still being made. They appear when the orchestrator shows them to you.' : 'No option set is waiting. The orchestrator shows one when it is ready.'}</p> : null}
			{element.failed.length > 0 ? <p className="m-0 flex items-start gap-2 font-body text-small text-ink-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{element.failed.length === 1 ? '1 image run failed' : `${element.failed.length} image runs failed`} and is not shown.</p> : null}
			{error ? <p role="alert" className="m-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
		</section>
	);
}

export function VisionReview({ creature }: { creature: string }) {
	const { data: state, error, refresh } = usePolled(() => api.creature(creature), `vision-state:${creature}`, 4000);
	const { data: vision, refresh: refreshVision } = usePolled(() => api.vision(creature), `vision:${creature}`, 4000);
	const { data: refs } = usePolled(() => api.references(creature), `refs:${creature}`, 4000);
	const [open, setOpen] = React.useState<string | null>(null);
	if (error && !state) return <p role="alert" className="m-6 font-body text-body text-plague-outline-ink">{error}</p>;
	if (!state || !vision || !refs) return null;
	const stage = state.stages.find((s) => s.id === 'vision')!;
	const changed = () => { void refresh(); void refreshVision(); };
	const pickedBlobs = new Set(vision.elements.flatMap((e) => (e.picked?.blob ? [e.picked.blob] : [])));
	const byBlob = (blob: string): ReferenceView | undefined => refs.find((r) => r.blob === blob);
	const others = refs.filter((r) => !pickedBlobs.has(r.blob));
	const opened = refs.find((r) => r.id === open) ?? null;

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
				<div className="flex flex-wrap items-baseline gap-3">
					<h1 className="type-title m-0 text-[24px]">Vision board for {state.name}</h1>
					<span className="font-body text-small text-ink-2">One pick for each element. A pick becomes a reference with a role and a precedence.</span>
				</div>
				{vision.elements.length === 0 ? <p className="m-0 max-w-[62ch] border border-edge bg-s1 p-4 font-body text-body text-ink-2">No options yet. The orchestrator generates a set of images for each element (color palette, fur, glow, eyes, horn and so on) and shows them here.</p> : null}
				{vision.elements.map((e) => (
					<ElementSection
						key={e.element}
						creature={creature}
						element={e}
						context={vision.context?.[e.element]}
						canUnpick={vision.canUnpick !== false}
						onChanged={changed}
						onOpenPicked={(blob) => { const r = byBlob(blob); if (r) setOpen(r.id); }}
					/>
				))}
				{others.length > 0 ? (
					<section aria-label="Other references" className="flex flex-col gap-3 border-t-2 border-ink pt-3">
						<h2 className="type-heading m-0 text-[20px]">Other references</h2>
						<p className="m-0 font-body text-small text-ink-2">Added by the orchestrator, not picked from a set. When two images disagree, the lower precedence wins.</p>
						<ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
							{others.map((r) => (
								<li key={r.id} className="flex min-w-0">
									<button
										type="button"
										onClick={() => setOpen(r.id)}
										aria-label={`Open ${r.role} large`}
										className="flex w-full min-w-0 flex-col gap-2 border border-edge-strong bg-s1 p-3 text-left outline-none hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
									>
										<span className="flex items-center gap-2">
											<span className="type-data border border-edge-strong px-1.5 text-[12px] text-ink">{r.precedence}</span>
											<span className="type-legend text-[10.5px]">Precedence</span>
											{r.derivedTargets.length > 0 ? <Badge className="ml-auto"><Layers />Has target</Badge> : null}
										</span>
										<img src={blobUrl(r.blob)} alt="" className={cn('block h-40 w-full border border-edge object-contain', plate(r))} />
										<span className="type-heading text-[16px] text-ink">{r.role}</span>
										<WordList label="Governs" items={r.governs} empty="Nothing" />
										<WordList label="Do not use for" items={r.mustNotBeUsedFor} empty="Nothing excluded" />
									</button>
								</li>
							))}
						</ul>
					</section>
				) : null}
			</div>
			<div className="flex w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-edge bg-s0 p-3 min-[1700px]:w-[460px]">
				<PicksCollage elements={vision.elements} />
				<StageVerdict creature={creature} stage={stage} notes={state.stageNotes} onDone={changed} approveHint="Approving locks in these picks as the creature's references. Changing one later shows this stage as out of date." />
				<Panel title="How to read this">
					<p className="m-0 font-body text-small text-ink-2">Each element has its own set. Pick the one that is closest, or say what is wrong with all of them. Every option lists what it would govern and what it must not be used for; the prompt that made it is in the fold under the image. The stage is ready to approve when every element you care about is picked.</p>
				</Panel>
			</div>
			<ReferenceLarge reference={opened} onClose={() => setOpen(null)} />
		</div>
	);
}
