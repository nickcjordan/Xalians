// Tier: chrome. Stage track, creature board, and the intake and references reviews of the
// Creature Studio screen. Built from the system's own pieces; state is carried by words, icons,
// position and luminance (thick bars, solid versus dashed edges), never by hue alone.
import * as React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Check, CircleDashed, CircleDot, Eye, Layers, Lock, SlidersHorizontal, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { api, blobUrl, usePolled, type BoardPart, type CreatureState, type PartSummary, type ReferenceView, type StageView } from './client';
import { Panel } from './Panels';
import { cap, partStatusWord, stageName, stageStatusWord, timeAgo, VERDICT_WORD } from './words';

// ---------------------------------------------------------------------------
// Stage track
// ---------------------------------------------------------------------------

const STATUS_ICON = { locked: Lock, open: CircleDot, 'in-review': Eye, approved: Check, stale: AlertTriangle } as const;

/** The shown status: a stale approval reads as stale, never as approved. */
const shownStatus = (s: StageView) => (s.stale ? 'stale' : s.status);

export function StageTrack({ stages, creature, current }: { stages: StageView[]; creature: string; current?: string }) {
	const one = stages.filter((s) => s.phase === 1);
	const two = stages.filter((s) => s.phase === 2);
	const cell = (s: StageView, n: number) => {
		const shown = shownStatus(s);
		const later = s.phase === 2;
		const Icon = later ? CircleDashed : STATUS_ICON[shown];
		const waiting = shown === 'in-review';
		const done = shown === 'approved';
		const body = (
			<>
				<span className="flex items-baseline justify-between gap-1">
					<span className="type-data text-[11px] text-ink-3">{String(n).padStart(2, '0')}</span>
					<Icon className={cn('size-4 shrink-0', later ? 'text-ink-3' : done || waiting ? 'text-ink' : 'text-ink-2')} aria-hidden="true" />
				</span>
				<span className={cn('font-body text-small font-bold leading-tight', later ? 'text-ink-3' : 'text-ink')}>{stageName(s.id)}</span>
				<span className={cn('type-legend text-[10.5px] leading-tight', later ? 'text-ink-3' : waiting || shown === 'stale' ? 'text-ink' : 'text-ink-2')}>{later ? 'Later' : stageStatusWord(shown)}</span>
			</>
		);
		const cls = cn(
			'flex min-w-0 flex-1 flex-col gap-1 border p-2 text-left no-underline outline-none focus-visible:outline-2 focus-visible:outline-ring',
			later ? 'border-dashed border-edge-strong bg-s0' : done ? 'border-edge-strong bg-s2' : waiting ? 'border-ink bg-s2 shadow-[inset_0_-4px_0_var(--color-ink)]' : shown === 'stale' ? 'border-caution bg-caution-tint' : 'border-edge bg-s1',
			current === s.id && 'shadow-[inset_0_-4px_0_var(--color-ink)]',
		);
		const label = `${stageName(s.id)}: ${later ? 'later, not built yet' : stageStatusWord(shown)}`;
		return s.reviewable && !later ? (
			<Link key={s.id} to={`/studio/${creature}/stage/${s.id}`} className={cn(cls, 'hover:bg-s3')} aria-label={label} aria-current={current === s.id ? 'page' : undefined}>
				{body}
			</Link>
		) : (
			<div key={s.id} className={cls} role="group" aria-label={label}>
				{body}
			</div>
		);
	};
	return (
		<ol aria-label="Stages" className="m-0 flex list-none items-stretch gap-1.5 p-0">
			{one.map((s, i) => (
				<li key={s.id} className="flex min-w-0 flex-1">{cell(s, i + 1)}</li>
			))}
			<li aria-hidden="true" className="w-3 shrink-0 self-stretch border-l border-dashed border-edge-strong" />
			{two.map((s, i) => (
				<li key={s.id} className="flex min-w-0 flex-[0.85]">{cell(s, one.length + i + 1)}</li>
			))}
		</ol>
	);
}

// ---------------------------------------------------------------------------
// Creature board
// ---------------------------------------------------------------------------

const PART_ICON = { proposed: CircleDashed, 'not-started': Lock, 'in-progress': CircleDot, 'in-review': Eye, approved: Check, stale: AlertTriangle } as const;

function dependsText(p: BoardPart): string {
	return p.dependsOn.length === 0 ? 'Depends on: nothing, it starts the chain' : `Depends on: ${p.dependsOn.map((d) => d.name).join(', ')}`;
}

export function PartRows({ creature, parts, summaries }: { creature: string; parts: BoardPart[]; summaries: PartSummary[] | undefined }) {
	if (parts.length === 0) return <p className="m-0 border border-edge bg-s1 p-4 font-body text-small text-ink-2">No parts yet. They appear when the orchestrator proposes the part list at intake.</p>;
	return (
		<ul className="m-0 flex list-none flex-col gap-2 p-0">
			{parts.map((p) => {
				const sum = summaries?.find((s) => s.key === p.key);
				const Icon = PART_ICON[p.status];
				const started = p.status !== 'proposed' && p.status !== 'not-started';
				return (
					<li key={p.id}>
						<Link
							to={started ? `/studio/${creature}/${p.key}` : `/studio/${creature}/stage/intake`}
							className="flex flex-col gap-1 border border-edge bg-s1 p-3 text-ink no-underline hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
						>
							<span className="flex flex-wrap items-center gap-3">
								<span className="type-data text-[12px] text-ink-3">{String(p.order).padStart(2, '0')}</span>
								<span className="type-heading text-[17px]">{p.name}</span>
								<Badge variant={p.status === 'stale' ? 'warn' : 'default'}><Icon />{partStatusWord(p.status)}</Badge>
								{sum && sum.stalledDefects.length > 0 ? <Badge variant="warn"><AlertTriangle />Stalled</Badge> : null}
								{started && sum ? (
									<span className="ml-auto font-body text-small text-ink-2">
										{sum.openDefects.length === 1 ? '1 open problem' : `${sum.openDefects.length} open problems`} · {sum.budgetLeft.builds} builds left
									</span>
								) : null}
							</span>
							<span className="font-body text-small text-ink-2">{dependsText(p)}</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

export function CreatureBoard({ creature, state, summaries }: { creature: string; state: CreatureState; summaries: PartSummary[] | undefined }) {
	const waiting = state.needs;
	return (
		<div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
			<div className="flex flex-wrap items-baseline gap-3">
				<h1 className="type-title m-0 text-[28px]">{state.name}</h1>
				<span className="type-data text-small text-ink-3">{state.alias}</span>
			</div>
			<section aria-label="Stage track" className="flex flex-col gap-2">
				<h2 className="type-subhead m-0 text-[15px]">Stages</h2>
				<StageTrack stages={state.stages} creature={creature} />
				<p className="m-0 font-body text-small text-ink-2">The first nine are the work. The last three are reserved for later and not built yet. A stage is approved only when you press the button on its review.</p>
				{state.stages.filter((s) => s.stale).map((s) => (
					<p key={s.id} className="m-0 flex items-start gap-2 border-l-2 border-caution bg-caution-tint p-2 font-body text-small text-ink">
						<AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
						<span><strong>{stageName(s.id)} is out of date.</strong> {s.staleReason ? cap(s.staleReason) : 'Something it covered changed after you approved it.'}</span>
					</p>
				))}
			</section>
			<div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
				<section aria-label="Parts" className="flex flex-col gap-2">
					<h2 className="type-subhead m-0 text-[15px]">Parts <span className="type-data ml-2 text-small text-ink-2">{state.parts.length}</span></h2>
					<PartRows creature={creature} parts={state.parts} summaries={summaries} />
				</section>
				<Panel title="Needs you" count={waiting.length} className="order-first self-start xl:order-last">
					{waiting.length === 0 ? <p className="m-0 font-body text-small text-ink-2">Nothing is waiting on you for {state.name}.</p> : null}
					<ul className="m-0 flex list-none flex-col gap-2 p-0">
						{waiting.map((n) => (
							<li key={`${n.kind}-${n.ref}`}>
								<Link
									to={n.kind === 'stage' ? `/studio/${creature}/stage/${n.stage}` : `/studio/${creature}/${n.partKey ?? ''}${n.kind === 'review' ? `?build=${n.ref}` : ''}`}
									className="flex flex-col gap-0.5 border border-edge bg-s0 p-2 text-ink no-underline hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring"
								>
									<span className="type-legend inline-flex items-center gap-1 text-[10.5px]">{n.kind === 'stage' ? <Layers className="size-3.5" /> : <CircleDot className="size-3.5" />}{n.kind === 'stage' ? `${stageName(n.stage ?? '')} stage` : n.kind === 'review' ? 'Look and decide' : n.kind === 'question' ? 'Question' : 'Stuck'}</span>
									<span className="font-body text-small text-ink">{n.ask}</span>
									<span className="type-data text-[11px] text-ink-3">{timeAgo(n.since)}</span>
								</Link>
							</li>
						))}
					</ul>
				</Panel>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Verdict on a stage
// ---------------------------------------------------------------------------

const NEXT_AFTER: Record<string, string> = {
	intake: 'Next the orchestrator prepares the vision board; it appears under Needs you when it is ready.',
	vision: 'Next the orchestrator prepares the model sheet; it appears under Needs you when it is ready.',
	sheet: 'Next the orchestrator builds the blockout; it appears under Needs you when it is ready.',
	blockout: 'The parts stage is open now. Each part starts from this blockout.',
};

function nextStageWord(stageId: string): string {
	return NEXT_AFTER[stageId] ?? 'The next stage opens now; the orchestrator brings its work to Needs you when it is ready.';
}

export function StageVerdict({ creature, stage, notes, onDone, approveHint }: { creature: string; stage: StageView; notes: CreatureState['stageNotes']; onDone: () => void; approveHint: string }) {
	const [text, setText] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [sent, setSent] = React.useState<{ verdict: string; text: string } | null>(null);

	const mine = notes.filter((n) => n.about?.stage === stage.id && n.verdict && !n.about.element);
	const last = mine[mine.length - 1];
	const name = stageName(stage.id);

	const submit = async (verdict: 'approve' | 'adjust' | 'reject') => {
		setBusy(true);
		setError(null);
		try {
			await api.stageReview(creature, { stage: stage.id, verdict, text });
			setSent({ verdict, text });
			setText('');
			onDone();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	if (stage.status === 'in-review' && !sent) {
		return (
			<Panel title={`${name} stage`} count="Waiting for you" className="p-3">
				<label className="type-legend mb-1 block" htmlFor="stage-verdict-text">Your words</label>
				<Textarea id="stage-verdict-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-12" rows={2} placeholder="What is right, what is not" />
				<div className="mt-2 flex flex-wrap gap-2">
					<Button type="button" disabled={busy} onClick={() => void submit('approve')}><Check /> Approve</Button>
					<Button type="button" variant="secondary" disabled={busy} onClick={() => void submit('adjust')}><SlidersHorizontal /> Adjust</Button>
					<Button type="button" variant="destructive" disabled={busy} onClick={() => void submit('reject')}><X /> Reject</Button>
				</div>
				<p className="mt-2 mb-0 font-body text-small text-ink-2 [@media(max-height:800px)]:hidden">{approveHint}</p>
				{error ? <p role="alert" className="mt-2 mb-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
			</Panel>
		);
	}

	const verdict = sent?.verdict ?? last?.verdict;
	const said = sent ? sent.text : last?.text;
	return (
		<Panel title={`${name} stage`} count={stageStatusWord(shownStatus(stage))}>
			{verdict ? (
				<>
					<p className="m-0 mb-2"><Badge variant={verdict === 'approve' ? 'ok' : 'default'}>{verdict === 'approve' ? <Check /> : null}{VERDICT_WORD[verdict] ?? verdict}</Badge></p>
					<p className="m-0 font-body text-body text-ink">{said ? `"${said}"` : 'No comment.'}</p>
				</>
			) : null}
			{stage.status === 'approved' && verdict === 'approve' ? (
				<div role="status" className="mt-3 flex items-start gap-2 border-l-4 border-edge-strong bg-s2 p-3 font-body text-body text-ink">
					<Check className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
					<span>
						<strong>Approved and recorded.</strong> {nextStageWord(stage.id)}{' '}
						<Link to={`/studio/${creature}`} className="text-ink underline">Back to the creature board</Link>
					</span>
				</div>
			) : null}
			{stage.status === 'open' ? <p className="mt-2 mb-0 font-body text-small text-ink-2">{verdict ? 'The stage is open again. The orchestrator will change it and submit it for you to look at once more.' : 'Not submitted yet. The orchestrator submits the stage when its required outputs are in place.'}</p> : null}
			{stage.status === 'locked' ? <p className="m-0 font-body text-small text-ink-2">This stage opens when the one before it is approved.</p> : null}
			{stage.stale ? (
				<p className="mt-2 mb-0 flex items-start gap-2 border-l-2 border-caution bg-caution-tint p-2 font-body text-small text-ink">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
					<span><strong>Out of date.</strong> {stage.staleReason ? cap(stage.staleReason) : 'Something it covered changed after you approved it.'}</span>
				</p>
			) : null}
		</Panel>
	);
}

// ---------------------------------------------------------------------------
// Intake review
// ---------------------------------------------------------------------------

const SOURCE_TAG = { description: 'From description', silhouette: 'From silhouette', both: 'Description and silhouette' } as const;

function FactList({ entries }: { entries: [string, string][] }) {
	return (
		<dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1">
			{entries.map(([k, v]) => (
				<div key={k} className="flex items-baseline gap-3">
					<dt className="type-legend w-[104px] shrink-0 whitespace-nowrap">{k}</dt>
					<dd className="m-0 font-body text-body text-ink">{v}</dd>
				</div>
			))}
		</dl>
	);
}

export function IntakeReview({ creature }: { creature: string }) {
	const { data: state, error, refresh } = usePolled(() => api.creature(creature), `intake:${creature}`, 4000);
	if (error && !state) return <p role="alert" className="m-6 font-body text-body text-plague-outline-ink">{error}</p>;
	if (!state) return null;
	const stage = state.stages.find((s) => s.id === 'intake')!;
	const intake = state.intake;
	if (!intake) {
		return (
			<div className="p-6">
				<p className="m-0 max-w-[62ch] border border-edge bg-s1 p-4 font-body text-body text-ink-2">No intake yet for {state.name}. The orchestrator runs <code>studio intake</code> to read the species template and your silhouette.</p>
			</div>
		);
	}
	const reading = intake.reading;
	const size = intake.sizeCm ? `${intake.sizeCm[0]} to ${intake.sizeCm[1]} cm` : 'not stated';
	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
				<div className="flex min-h-0 flex-1 items-center justify-center border border-edge-strong bg-ink p-6">
					<img src={blobUrl(intake.silhouette.blob)} alt={`Your silhouette of ${intake.name}`} className="block max-h-full max-w-full object-contain" />
				</div>
				<p className="m-0 font-body text-small text-ink-2">Your silhouette: <span className="type-data text-[12px]">{intake.silhouette.fileName}</span>. Shown dark on a light plate so the outline is plain.</p>
			</div>
			<div className="flex w-[600px] shrink-0 flex-col border-l border-edge bg-s0 min-[1700px]:w-[680px]">
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
					<h1 className="type-title m-0 text-[26px]">{intake.name}</h1>
					<p className="m-0 font-body text-body font-bold text-ink">Did I read your creature right? Approve this reading, or tell me what is off.</p>
					{reading ? (
						<div className="flex flex-col gap-4">
							<section aria-label="Must have" className="flex flex-col gap-1.5">
								<h2 className="type-subhead m-0 text-[15px]">Must have (from your description)</h2>
								<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
									{reading.mustHave.map((m) => (
										<li key={m.feature} className="flex items-start gap-2 border-l-4 border-ink bg-s1 py-1.5 pr-2 pl-3 font-body text-body text-ink">
											<span className="min-w-0 flex-1">{m.feature}</span>
											<span className="type-legend shrink-0 border border-edge-strong px-1.5 text-[10.5px] text-ink-2">{SOURCE_TAG[m.source]}</span>
										</li>
									))}
								</ul>
							</section>
							<section aria-label="Carried over from your silhouette" className="flex flex-col gap-1.5">
								<h2 className="type-subhead m-0 text-[15px]">Carried over from your silhouette</h2>
								<ul className="m-0 flex list-none flex-col gap-1 p-0">
									{reading.carryOver.map((c) => <li key={c.feature} className="border-l-2 border-edge-strong py-0.5 pl-3 font-body text-body text-ink">{c.feature}</li>)}
								</ul>
							</section>
							<section aria-label="Open for design" className="flex flex-col gap-1.5">
								<h2 className="type-subhead m-0 text-[15px]">Open for design (decided on the vision board)</h2>
								<ul className="m-0 flex list-none flex-col gap-1 p-0">
									{reading.openForDesign.map((o) => (
										<li key={o.feature} className="border-l-2 border-dashed border-edge-strong py-0.5 pl-3 font-body text-body text-ink-2">
											{o.feature}
											{o.note ? <span className="text-ink-3"> ({o.note})</span> : null}
										</li>
									))}
								</ul>
							</section>
							{reading.questions.length > 0 ? (
								<section aria-label="Questions for you" className="flex flex-col gap-1.5">
									<h2 className="type-subhead m-0 text-[15px]">Questions for you</h2>
									<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
										{reading.questions.map((q) => (
											<li key={q.text} className="flex items-start gap-2 border-l-4 border-caution bg-caution-tint py-1.5 pr-2 pl-3 font-body text-body text-ink">
												<CircleDot className="mt-1 size-4 shrink-0" aria-hidden="true" />
												{q.text}
											</li>
										))}
									</ul>
								</section>
							) : null}
						</div>
					) : (
						<p className="m-0 border border-edge bg-s1 p-3 font-body text-small text-ink-2">The reading is not written yet. The orchestrator writes it before submitting intake.</p>
					)}
					<Collapsible>
						<CollapsibleTrigger>Lore and facts</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="flex flex-col gap-4">
								<p className="m-0 font-body text-body text-ink">{intake.loreSummary}</p>
								<FactList entries={[['Element', cap(intake.element)], ['Home world', cap(intake.homeWorld)], ['Body plan', cap(intake.bodyPlan)], ['Covering', cap(intake.covering)], ['Size', size]]} />
								<div className="grid gap-4 sm:grid-cols-2">
									<section aria-label="Appearance">
										<h2 className="type-legend m-0 mb-1">Appearance</h2>
										<ul className="m-0 list-disc pl-5 font-body text-small text-ink">{intake.appearance.map((a) => <li key={a}>{a}</li>)}</ul>
									</section>
									<section aria-label="Anatomy its abilities use">
										<h2 className="type-legend m-0 mb-1">Anatomy its abilities use</h2>
										<ul className="m-0 list-disc pl-5 font-body text-small text-ink">{intake.anatomy.map((a) => <li key={a}>{cap(a)}</li>)}</ul>
									</section>
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>
					<Collapsible>
						<CollapsibleTrigger>How I plan to split it for building (my call)</CollapsibleTrigger>
						<CollapsibleContent>
							<section aria-label="Proposed parts" className="flex flex-col gap-2">
								<p className="m-0 font-body text-small text-ink-2">You do not need to approve this; say so if something looks wrong.</p>
								{state.parts.length === 0 ? <p className="m-0 font-body text-small text-ink-2">No parts proposed yet.</p> : null}
								<ol className="m-0 flex list-none flex-col gap-2 p-0">
									{state.parts.map((p) => (
										<li key={p.id} className="flex flex-col gap-2 border border-edge-strong bg-s1 p-3">
											<div className="flex flex-wrap items-center gap-3">
												<span className="type-data text-[12px] text-ink-3">{String(p.order).padStart(2, '0')}</span>
												<h3 className="type-heading m-0 text-[17px]">{p.name}</h3>
												<Badge variant="default">{partStatusWord(p.status)}</Badge>
											</div>
											<p className="m-0 font-body text-small text-ink"><span className="type-legend mr-2">Includes</span>{p.includes.join(', ')}</p>
											<p className="m-0 font-body text-small text-ink"><span className="type-legend mr-2">Why</span>{p.why}</p>
											<p className="m-0 flex items-center gap-2 font-body text-small text-ink-2"><ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />{dependsText(p)}</p>
										</li>
									))}
								</ol>
							</section>
						</CollapsibleContent>
					</Collapsible>
				</div>
				<div className="shrink-0 border-t border-edge bg-s0 p-3">
					<StageVerdict creature={creature} stage={stage} notes={state.stageNotes} onDone={() => void refresh()} approveHint="Approving fixes this reading. If the reading or the species file changes later, this stage shows as out of date." />
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Reference helpers (the vision board shows references the orchestrator added by hand)
// ---------------------------------------------------------------------------

/** A line-art SVG (black on transparent) needs a light plate to read on the dark room. */
export const plate = (r: ReferenceView) => (r.fileName.toLowerCase().endsWith('.svg') ? 'bg-ink' : 'bg-s0');

export function WordList({ label, items, empty }: { label: string; items: string[]; empty: string }) {
	return (
		<div>
			<p className="type-legend m-0">{label}</p>
			{items.length === 0 ? <p className="m-0 font-body text-small text-ink-3">{empty}</p> : <ul className="m-0 list-disc pl-5 font-body text-small text-ink">{items.map((x) => <li key={x}>{x}</li>)}</ul>}
		</div>
	);
}

export function ReferenceLarge({ reference, onClose }: { reference: ReferenceView | null; onClose: () => void }) {
	const [overlayOn, setOverlayOn] = React.useState(false);
	const [targetKind, setTargetKind] = React.useState<string>('');
	React.useEffect(() => {
		setOverlayOn(false);
		setTargetKind(reference?.derivedTargets[0]?.kind ?? '');
	}, [reference?.id]);
	const target = reference?.derivedTargets.find((t) => t.kind === targetKind) ?? reference?.derivedTargets[0];
	return (
		<Dialog open={reference !== null} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-h-[94vh] max-w-[min(1100px,96vw)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-[min(1100px,96vw)]">
				{reference ? (
					<>
						<DialogHeader>
							<DialogTitle className="type-heading m-0 text-[18px]">{reference.role}</DialogTitle>
							<DialogDescription className="type-data text-[12px]">Precedence {reference.precedence} · {reference.fileName}</DialogDescription>
						</DialogHeader>
						<div className={cn('flex min-h-0 items-center justify-center overflow-hidden border border-edge p-2', plate(reference))}>
							<div className="relative inline-flex max-h-full max-w-full">
								<img src={blobUrl(reference.blob)} alt={reference.role} className="block max-h-[62vh] max-w-full object-contain" />
								{overlayOn && target ? <img src={blobUrl(target.blob)} alt={`${target.kind} target over the reference`} className="absolute inset-0 size-full object-contain opacity-50" /> : null}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-x-8 gap-y-2">
							<WordList label="Governs" items={reference.governs} empty="Nothing" />
							<WordList label="Do not use for" items={reference.mustNotBeUsedFor} empty="Nothing excluded" />
							{target ? (
								<div className="ml-auto flex flex-wrap items-center gap-2">
									{reference.derivedTargets.length > 1 ? (
										<NativeSelect size="sm" className="w-44 text-small" value={target.kind} onChange={(e) => setTargetKind(e.target.value)} aria-label="Which derived target">
											{reference.derivedTargets.map((t) => <option key={t.kind} value={t.kind}>{t.kind}</option>)}
										</NativeSelect>
									) : null}
									<Button type="button" variant={overlayOn ? 'secondary' : 'outline'} aria-pressed={overlayOn} onClick={() => setOverlayOn((v) => !v)}>
										<Layers /> {overlayOn ? 'Hide' : 'Show'} the {target.kind} target at 50 percent{target.provisional ? ' (provisional)' : ''}
									</Button>
								</div>
							) : null}
						</div>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
