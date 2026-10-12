import * as React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CircleDot, Check, HelpCircle, Layers, Lock, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Fold } from '@/components/system/fold';
import { cn } from '@/lib/utils';
import { api, blobUrl, type BuildView, type MarkDraft, type NeedItem, type PartView } from './client';
import { buildKindWord, buildStatusWord, cameraWord, minutes, stageName, timeAgo, tokens as tokenWord, VERDICT_WORD } from './words';

export function Panel({ title, count, children, className }: { title: React.ReactNode; count?: React.ReactNode; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('border border-edge bg-s1 p-4', className)}>
			<div className="mb-3 flex items-baseline gap-3">
				<h2 className="type-subhead m-0 text-[15px]">{title}</h2>
				{count != null ? <span className="type-data text-small text-ink-2">{count}</span> : null}
			</div>
			{children}
		</section>
	);
}

// ---------------------------------------------------------------------------
// Needs you
// ---------------------------------------------------------------------------

const NEED_WORD = { review: 'Look and decide', question: 'Question', stalled: 'Stuck', stage: 'Stage review' } as const;
const NEED_ICON = { review: CircleDot, question: HelpCircle, stalled: AlertTriangle, stage: Layers } as const;

export function NeedsRail({ items, creature, current, collapsed, onToggle }: { items: (NeedItem & { creature: string })[] | undefined; creature?: string; current?: { creature: string; part?: string; build?: string; stage?: string }; collapsed: boolean; onToggle: () => void }) {
	const hrefOf = (item: NeedItem & { creature: string }) => (item.kind === 'stage' ? `/studio/${item.creature}/stage/${item.stage}` : `/studio/${item.creature}/${item.partKey ?? ''}${item.kind === 'review' ? `?build=${item.ref}` : ''}`);
	const isHere = (item: NeedItem & { creature: string }) => !!current && current.creature === item.creature && (item.kind === 'stage' ? current.stage === item.stage : current.part === item.partKey && (item.kind !== 'review' || current.build === item.ref));
	const toggle = (
		<Button type="button" size="icon-sm" variant="ghost" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? 'Show the needs list' : 'Collapse the needs list'}>
			{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
		</Button>
	);
	if (collapsed) {
		return (
			<aside aria-label="Needs you" className="flex h-full w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-edge bg-s0 py-2">
				{toggle}
				<span className="type-data text-small text-ink-2" title="Waiting on you">{items?.length ?? '�'}</span>
				{(items ?? []).map((item) => {
					const Icon = NEED_ICON[item.kind];
					return (
						<Link
							key={`${item.kind}-${item.ref}`}
							to={hrefOf(item)}
							title={`${NEED_WORD[item.kind]}: ${item.partName ?? ''} ${item.ask}`}
							aria-label={`${NEED_WORD[item.kind]}: ${item.kind === 'stage' ? stageName(item.stage ?? '') : (item.partName ?? 'whole creature')}`}
							aria-current={isHere(item) ? 'true' : undefined}
							className={cn('relative block size-10 shrink-0 border bg-s1 outline-none focus-visible:outline-2 focus-visible:outline-ring', isHere(item) ? 'border-ink shadow-[inset_0_-3px_0_var(--color-ink)]' : 'border-edge')}
						>
							{item.thumb ? <img src={blobUrl(item.thumb)} alt="" className={cn('size-full', item.kind === 'stage' ? 'bg-ink object-contain p-0.5' : 'object-cover')} /> : <span className="grid size-full place-items-center text-ink-2" aria-hidden="true"><Icon className="size-4" /></span>}
							{item.kind !== 'review' ? <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center border border-edge-strong bg-room text-ink" aria-hidden="true"><Icon className="size-3" /></span> : null}
						</Link>
					);
				})}
			</aside>
		);
	}
	return (
		<aside aria-label="Needs you" className="flex h-full w-[264px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-edge bg-s0 p-3">
			<div className="flex items-center gap-3">
				<h2 className="type-heading m-0 text-[18px]">Needs you</h2>
				{items ? <span className="type-data text-small text-ink-2">{items.length}</span> : null}
				<span className="ml-auto">{toggle}</span>
			</div>
			{!items ? <p className="m-0 font-body text-small text-ink-2">Loading.</p> : null}
			{items && items.length === 0 ? (
				<p className="m-0 border border-edge bg-s1 p-3 font-body text-small text-ink-2">Nothing is waiting on you{creature ? ` for ${creature}` : ''}.</p>
			) : null}
			<ul className="m-0 flex list-none flex-col gap-2 p-0">
				{(items ?? []).map((item) => {
					const Icon = NEED_ICON[item.kind];
					const here = isHere(item);
					return (
						<li key={`${item.kind}-${item.ref}`}>
							<Link
								to={hrefOf(item)}
								aria-current={here ? 'true' : undefined}
								className={cn(
									'flex gap-3 border bg-s1 p-2 text-ink no-underline outline-none hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring',
									here ? 'border-ink bg-s2 shadow-[inset_3px_0_0_var(--color-ink)]' : 'border-edge',
								)}
							>
								{item.thumb ? (
									<img src={blobUrl(item.thumb)} alt="" className={cn('size-12 shrink-0 border border-edge', item.kind === 'stage' ? 'bg-ink object-contain p-0.5' : 'bg-s0 object-cover')} />
								) : (
									<span className="grid size-12 shrink-0 place-items-center border border-edge bg-s0 text-ink-3" aria-hidden="true"><Icon className="size-5" /></span>
								)}
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="flex flex-wrap items-center gap-2">
										<span className="type-legend inline-flex items-center gap-1 text-[10.5px] text-ink"><Icon className="size-3.5" />{NEED_WORD[item.kind]}</span>
										{item.buildKind === 'preview' ? <Badge>Preview</Badge> : null}
									</span>
									<span className="font-body text-small font-bold text-ink">{item.kind === 'stage' ? `${stageName(item.stage ?? '')} stage` : (item.partName ?? 'Whole creature')}</span>
									<span className="line-clamp-2 font-body text-[12.5px] text-ink-2">{item.ask}</span>
									<span className="type-data text-[11px] text-ink-3">{timeAgo(item.since)}</span>
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}

// ---------------------------------------------------------------------------
// Held fixed this step
// ---------------------------------------------------------------------------

export function HoldsPanel({ view, creature, onChanged }: { view: PartView; creature: string; onChanged: () => void }) {
	const [open, setOpen] = React.useState<string | null>(null);
	const [reason, setReason] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const strike = async (alias: string) => {
		setBusy(true);
		setError(null);
		try {
			await api.strike(creature, alias, reason.trim());
			setOpen(null);
			setReason('');
			onChanged();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Panel title="Held fixed this step" count={view.holds.length}>
			{view.holds.length === 0 ? <p className="m-0 font-body text-small text-ink-2">Nothing is being held fixed. The builder may change anything the goal needs.</p> : null}
			<ul className="m-0 flex list-none flex-col gap-3 p-0">
				{view.holds.map((h) => {
					const weak = h.strength === 'weak';
					return (
						<li key={h.id} className={cn('flex flex-col gap-2 border bg-s0 p-3', weak ? 'border-dashed border-edge-strong' : 'border-edge-strong')}>
							<div className="flex flex-wrap items-center gap-2">
								<Lock className="size-3.5 shrink-0 text-ink-2" aria-hidden="true" />
								<span className="font-body text-body font-bold text-ink">{h.statement}</span>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant={weak ? 'warn' : 'default'}>{weak ? 'Weaker: the agent inferred this' : h.sourceKind === 'nick' ? 'Your word' : 'Imported'}</Badge>
								<Badge>{h.reach === 'part' ? 'This part only' : 'Whole creature'}</Badge>
								<span className="type-data text-[12px] text-ink-3">{h.alias}</span>
							</div>
							<p className="m-0 font-body text-small text-ink-2">{h.sourceText}</p>
							{open === h.alias ? (
								<form
									className="flex flex-col gap-2"
									onSubmit={(e) => {
										e.preventDefault();
										void strike(h.alias);
									}}
								>
									<label className="type-legend" htmlFor={`strike-${h.alias}`}>Why strike this?</label>
									<Input id={`strike-${h.alias}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="A short reason, kept in the record" />
									<div className="flex gap-2">
										<Button type="submit" size="sm" variant="destructive" disabled={busy || !reason.trim()}><X /> Strike it</Button>
										<Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(null); setReason(''); }}>Keep it</Button>
									</div>
								</form>
							) : (
								<div>
									<Button type="button" size="xs" variant="outline" onClick={() => { setOpen(h.alias); setReason(''); setError(null); }}>Strike</Button>
								</div>
							)}
						</li>
					);
				})}
			</ul>
			{error ? <p role="alert" className="mt-3 mb-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
		</Panel>
	);
}

// ---------------------------------------------------------------------------
// Defects
// ---------------------------------------------------------------------------

export function DefectsPanel({ view }: { view: PartView }) {
	const open = view.defects.filter((d) => d.status === 'open');
	const done = view.defects.filter((d) => d.status !== 'open');
	const row = (d: PartView['defects'][number]) => (
		<li key={d.id} className="flex flex-col gap-1 border border-edge bg-s0 p-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={d.status === 'open' ? 'default' : 'ok'}>{d.status === 'open' ? 'Open' : d.status === 'fixed' ? 'Fixed' : 'Set aside'}</Badge>
				<span className="type-data text-[12px] text-ink-3">{d.alias}</span>
				<span className="type-data ml-auto text-[12px] text-ink-2">{d.attempts.length === 1 ? '1 try' : `${d.attempts.length} tries`}</span>
			</div>
			<p className="m-0 font-body text-body text-ink">{d.description}</p>
			{d.stalled ? (
				<p className="m-0 flex items-start gap-2 border-l-2 border-caution bg-caution-tint p-2 font-body text-small text-ink">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
					<span><strong>Stalled.</strong> Two builds have not fixed it. The next build waits for an audit that names the cause and changes something.</span>
				</p>
			) : null}
		</li>
	);
	return (
		<Panel title="Problems on this part" count={`${open.length} open`}>
			{view.defects.length === 0 ? <p className="m-0 font-body text-small text-ink-2">No problems recorded yet. Mark one on an image and it appears here.</p> : null}
			<ul className="m-0 flex list-none flex-col gap-2 p-0">
				{open.map(row)}
				{done.map(row)}
			</ul>
		</Panel>
	);
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export function CostLine({ build, view }: { build: BuildView; view: PartView }) {
	const c = build.cost;
	return (
		<Panel title="What this build cost">
			<dl className="m-0 grid grid-cols-3 gap-3">
				<div>
					<dt className="type-legend">Wall time</dt>
					<dd className="type-data m-0 text-[15px] text-ink">{c.wallMinutes !== undefined ? minutes(c.wallMinutes) : 'not recorded'}</dd>
				</div>
				<div>
					<dt className="type-legend">Blender</dt>
					<dd className="type-data m-0 text-[15px] text-ink">{c.blenderMinutes !== undefined ? minutes(c.blenderMinutes) : 'not recorded'}</dd>
				</div>
				<div>
					<dt className="type-legend">Tokens</dt>
					<dd className="type-data m-0 text-[15px] text-ink">{c.tokens !== undefined ? `${tokenWord(c.tokens)}${c.approximate ? ' (about)' : ''}` : 'not collected yet'}</dd>
				</div>
			</dl>
			<p className="mt-3 mb-0 font-body text-small text-ink-2">
				This part has used {view.budget.builds} of {view.budget.total.builds} builds and {minutes(view.budget.wallMinutes)} of {minutes(view.budget.total.wallMinutes)}.
			</p>
		</Panel>
	);
}

// ---------------------------------------------------------------------------
// What moved, and what the builder says
// ---------------------------------------------------------------------------

type Displacement = { component: string; moved: number; max: number; median: number; units: string; perZone: Record<string, number> };

export function displacementOf(build: BuildView): Displacement | undefined {
	const c = build.checks.find((k) => k.id === 'displacement');
	return c && typeof c.value === 'object' && c.value ? (c.value as Displacement) : undefined;
}

export function BuilderPanel({ build }: { build: BuildView }) {
	const d = displacementOf(build);
	const zones = d ? Object.entries(d.perZone).sort((a, b) => b[1] - a[1]) : [];
	const changed = build.checks.filter((k) => k.id.startsWith('changed-fraction:') && typeof k.value === 'number');
	const r = build.report;
	if (!d && !r && changed.length === 0) return null;
	return (
		<Panel title="What changed">
			{r ? <p className="m-0 mb-3 font-body text-body text-ink">{r.changed}</p> : null}
			{r && r.outsideChanges.length > 0 ? (
				<div className="mb-3">
					<p className="type-legend m-0 mb-1">Changed outside this part, as the builder explains</p>
					<ul className="m-0 flex list-none flex-col gap-2 p-0">
						{r.outsideChanges.map((o, i) => (
							<li key={i} className="border border-edge bg-s0 p-2 font-body text-small text-ink">
								<strong>{o.what}.</strong> <span className="text-ink-2">{o.why}</span>
							</li>
						))}
					</ul>
				</div>
			) : r ? (
				<p className="m-0 mb-3 font-body text-small text-ink-2">The builder reports no changes outside this part.</p>
			) : null}
			{r ? (
				<p className="m-0 mb-3 font-body text-small text-ink-2">
					{r.blockedBy.hold === 'nothing' ? 'Blocked by nothing.' : `Blocked by a hold.${r.blockedBy.liftWouldAllow ? ` Lifting it would allow: ${r.blockedBy.liftWouldAllow}` : ''}`}
				</p>
			) : null}
			{d ? (
				<div className="mb-3">
					<p className="type-legend m-0 mb-1">How far {d.component} moved ({d.units})</p>
					<p className="type-data m-0 mb-2 text-small text-ink-2">
						{d.moved} points moved; median {d.median}, most {d.max}
					</p>
					<ul className="m-0 flex list-none flex-col gap-1 p-0">
						{zones.map(([zone, v]) => (
							<li key={zone} className="grid grid-cols-[1fr_96px_44px] items-center gap-2 font-body text-small text-ink">
								<span className="truncate">{zone}</span>
								<span className="h-2 border border-edge bg-s0" aria-hidden="true">
									<span className="block h-full bg-ink" style={{ width: `${d.max > 0 ? Math.min(100, (v / d.max) * 100) : 0}%` }} />
								</span>
								<span className="type-data text-right text-[12px]">{v}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{changed.length > 0 ? (
				<p className="type-data m-0 text-small text-ink-2">
					Pixels changed from the last approved build: {changed.map((k) => `${cameraWord(k.id.split(':')[1] ?? '')} ${Math.round((k.value as number) * 1000) / 10}%`).join(', ')}
				</p>
			) : null}
		</Panel>
	);
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function NotesPanel({ view }: { view: PartView }) {
	if (view.notes.length === 0) return null;
	return (
		<Fold label="Notes on this part" count={view.notes.length}>
			<ul className="m-0 flex list-none flex-col gap-3 p-0">
				{view.notes.map((n) => (
					<li key={n.id} className="border-l-2 border-edge-strong pl-3 font-body text-small text-ink">
						<span className="type-legend block">{n.by === 'nick' ? 'You' : n.by === 'orchestrator' ? 'The orchestrator' : n.by} · {n.kind}{n.verdict ? `, ${VERDICT_WORD[n.verdict]?.toLowerCase()}` : ''} · {timeAgo(n.createdAt)}</span>
						{n.text}
					</li>
				))}
			</ul>
		</Fold>
	);
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export function VerdictPanel({ build, view, creature, marks, onDone }: { build: BuildView; view: PartView; creature: string; marks: MarkDraft[]; onDone: () => void }) {
	const [text, setText] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [sent, setSent] = React.useState<{ verdict: string; text: string; marks: number } | null>(null);

	React.useEffect(() => {
		setText('');
		setError(null);
		setSent(null);
	}, [build.id]);

	const recorded = [...view.notes].reverse().find((n) => n.kind === 'review' && n.about?.build === build.id);
	const waiting = build.status === 'presented';
	const preview = build.kind === 'preview';

	const submit = async (verdict: 'approve' | 'adjust' | 'reject') => {
		setBusy(true);
		setError(null);
		try {
			await api.review(creature, { build: build.alias, verdict, text, holdsStruck: [], defectsClosed: [], marks });
			setSent({ verdict, text, marks: marks.length });
			onDone();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	if (!waiting || sent) {
		const verdict = sent?.verdict ?? recorded?.verdict;
		const said = sent ? sent.text : recorded?.text;
		return (
			<Panel title={`Build ${build.alias}`}>
				<p className="m-0 mb-2 flex items-center gap-2">
					<Badge variant={verdict === 'approve' ? 'ok' : 'default'}>{verdict ? <Check /> : null}{verdict ? VERDICT_WORD[verdict] : buildStatusWord(build.status)}</Badge>
				</p>
				{verdict ? (
					<>
						<p className="m-0 font-body text-body text-ink">{said ? `"${said}"` : 'No comment.'}</p>
						{sent ? <p className="mt-2 mb-0 font-body text-small text-ink-2">Recorded. {sent.marks === 1 ? '1 problem was added.' : sent.marks > 1 ? `${sent.marks} problems were added.` : 'No problems were added.'}</p> : null}
						{!sent && recorded && recorded.marks?.length ? <p className="mt-2 mb-0 font-body text-small text-ink-2">{recorded.marks.length === 1 ? '1 problem was added.' : `${recorded.marks.length} problems were added.`}</p> : null}
					</>
				) : (
					<p className="m-0 font-body text-small text-ink-2">This build is {buildStatusWord(build.status).toLowerCase()}. You can review it once it is presented.</p>
				)}
			</Panel>
		);
	}

	return (
		<Panel title={`${buildKindWord(build.kind)} ${build.alias}`} count={marks.length ? (marks.length === 1 ? '1 mark' : `${marks.length} marks`) : undefined}>
			<p className="m-0 mb-3 font-body text-small text-ink-2">Goal: {build.goal}</p>
			<label className="type-legend mb-1 block" htmlFor="verdict-text">Your words</label>
			<Textarea id="verdict-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-20" placeholder="What is right, what is not" />
			{preview ? <p className="mt-2 mb-0 font-body text-small text-ink-2">A preview cannot be approved. Pick a direction in the options view, or ask for changes.</p> : null}
			<div className="mt-3 flex flex-wrap gap-2">
				<Button type="button" disabled={busy || preview} onClick={() => void submit('approve')}><Check /> Approve</Button>
				<Button type="button" variant="secondary" disabled={busy} onClick={() => void submit('adjust')}><SlidersHorizontal /> Adjust</Button>
				<Button type="button" variant="destructive" disabled={busy} onClick={() => void submit('reject')}><X /> Reject</Button>
			</div>
			{marks.length > 0 ? <p className="mt-2 mb-0 font-body text-small text-ink-2">The {marks.length === 1 ? 'mark' : 'marks'} you drew will be added as problems when you submit.</p> : null}
			{error ? <p role="alert" className="mt-3 mb-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
		</Panel>
	);
}
