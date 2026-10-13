// Tier: chrome. The blockout review of the Creature Studio screen: the same workspace as a part review
// (camera strip, large viewer, side by side or swipe), where the comparison image is the overlay of the
// model on the sheet when there is one, else the sheet's bare-body image. Fit numbers are shown as words,
// numbers and bar width, never by hue.
import * as React from 'react';
import { Check, CircleDashed, Send, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

import { api, usePolled, type BlockoutView, type BuildView, type MarkDraft } from './client';
import { BuilderPanel, CostLine, Panel } from './Panels';
import { StageVerdict } from './Stages';
import { CameraStrip, MarksList, Viewer, type CompareMode, type Overlay, type Tool } from './Viewer';
import { buildStatusWord, cameraWord, sortCameras, timeAgo } from './words';

type Out = BuildView['cameras'][string][number];

/** The sheet view a camera is compared with when it has no overlay: the flesh (bare-body) image. */
function fleshFor(view: BlockoutView, camera: string): string | undefined {
	if (camera === 'front') return view.flesh.front;
	if (camera === 'side-left' || camera === 'side-right') return view.flesh.side;
	if (camera === 'back') return view.flesh.back;
	return undefined;
}

/** What each camera is compared with: its overlay if one exists, else the sheet's flesh view, else nothing. */
export function comparisonFor(build: BuildView, view: BlockoutView): { baseline: BuildView; kind: Record<string, 'overlay' | 'sheet'> } {
	const cameras: Record<string, Out[]> = {};
	const kind: Record<string, 'overlay' | 'sheet'> = {};
	for (const cam of Object.keys(build.cameras)) {
		const overlay = build.cameras[cam]!.find((o) => o.role === 'overlay');
		const flesh = fleshFor(view, cam);
		if (overlay) {
			cameras[cam] = [{ name: overlay.name, blob: overlay.blob, role: 'render' }];
			kind[cam] = 'overlay';
		} else if (flesh) {
			cameras[cam] = [{ name: `${cam}-sheet`, blob: flesh, role: 'render' }];
			kind[cam] = 'sheet';
		}
	}
	const baseline: BuildView = { id: 'comparison', alias: 'comparison', kind: 'build', status: 'reviewed', goal: '', method: '', createdAt: '', targets: [], cameras, otherOutputs: [], checks: [], cost: {} };
	return { baseline, kind };
}

const FIT = /^fit-iou:(.+)$/;

/** Silhouette overlap per view, from the build's measure checks. */
export function fitNumbers(build: BuildView): { camera: string; iou: number }[] {
	const out: { camera: string; iou: number }[] = [];
	for (const c of build.checks) {
		const m = FIT.exec(c.id);
		if (m && typeof c.value === 'number') out.push({ camera: m[1]!, iou: c.value });
	}
	const order = sortCameras(out.map((o) => o.camera));
	return out.sort((a, b) => order.indexOf(a.camera) - order.indexOf(b.camera));
}

function FitPanel({ build, active, onCamera }: { build: BuildView; active: string; onCamera: (c: string) => void }) {
	const fits = fitNumbers(build);
	return (
		<Panel title="How well it fits the sheet" count={fits.length > 0 ? `${fits.length} ${fits.length === 1 ? 'view' : 'views'}` : undefined}>
			{fits.length === 0 ? (
				<p className="m-0 font-body text-small text-ink-2">No fit numbers recorded for this build. The orchestrator adds them with the overlays.</p>
			) : (
				<>
					<ul className="m-0 flex list-none flex-col gap-1 p-0">
						{fits.map((f) => (
							<li key={f.camera}>
								<button
									type="button"
									onClick={() => onCamera(f.camera)}
									aria-current={f.camera === active ? 'true' : undefined}
									className={`grid w-full grid-cols-[1fr_96px_44px] items-center gap-2 border px-2 py-1 text-left font-body text-small text-ink outline-none focus-visible:outline-2 focus-visible:outline-ring ${f.camera === active ? 'border-ink bg-s2' : 'border-edge bg-s0 hover:bg-s2'}`}
								>
									<span className="truncate">{cameraWord(f.camera)}</span>
									<span className="h-2 border border-edge bg-s1" aria-hidden="true">
										<span className="block h-full bg-ink" style={{ width: `${Math.round(f.iou * 100)}%` }} />
									</span>
									<span className="type-data text-right text-[12px]">{Math.round(f.iou * 100)}%</span>
								</button>
							</li>
						))}
					</ul>
					<p className="mt-2 mb-0 font-body text-small text-ink-2">Share of the silhouette the model and the sheet cover together. Higher is closer; 100% is an exact match.</p>
				</>
			)}
		</Panel>
	);
}

export function BlockoutReview({ creature }: { creature: string }) {
	const [search, setSearch] = useSearchParams();
	const { data: state, error, refresh } = usePolled(() => api.creature(creature), `bo-state:${creature}`, 4000);
	const { data: view, refresh: refreshView } = usePolled(() => api.blockout(creature), `bo:${creature}`, 4000);

	const [camera, setCamera] = React.useState<string>('front');
	const [compare, setCompare] = React.useState<CompareMode>('side');
	const [overlay, setOverlay] = React.useState<Overlay>('render');
	const [tool, setTool] = React.useState<Tool>('view');
	const [marksByBuild, setMarksByBuild] = React.useState<Record<string, MarkDraft[]>>({});
	const [busy, setBusy] = React.useState(false);
	const [sent, setSent] = React.useState(0);
	const [problem, setProblem] = React.useState<string | null>(null);

	if (error && !state) return <p role="alert" className="m-6 font-body text-body text-plague-outline-ink">{error}</p>;
	if (!state || !view) return null;

	const stage = state.stages.find((s) => s.id === 'blockout')!;
	const wanted = search.get('build');
	const build = view.builds.find((b) => b.alias === wanted) ?? view.builds.find((b) => b.alias === view.current) ?? view.builds[0];
	const cameras = build ? sortCameras(Object.keys(build.cameras)) : [];
	const cam = cameras.includes(camera) ? camera : (cameras[0] ?? camera);
	const marks = (build && marksByBuild[build.id]) || [];
	const setMarks = (m: MarkDraft[]) => build && setMarksByBuild((prev) => ({ ...prev, [build.id]: m }));
	const canMark = !!build && (build.status === 'presented' || build.status === 'reviewed');
	const changed = () => { void refresh(); void refreshView(); };
	const cmp = build ? comparisonFor(build, view) : undefined;
	const baseKind = cmp?.kind[cam];

	const sendMarks = async () => {
		if (!build || marks.length === 0) return;
		setBusy(true);
		setProblem(null);
		try {
			const r = await api.blockoutMarks(creature, { build: build.alias, marks });
			setSent(r.defects.length);
			setMarks([]);
			setTool('view');
			changed();
		} catch (e) {
			setProblem(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const selectBuild = (alias: string) => {
		const next = new URLSearchParams(search);
		next.set('build', alias);
		setSearch(next, { replace: true });
		setOverlay('render');
		setTool('view');
	};

	const picker = build ? (
		<NativeSelect size="sm" className="w-52 text-small" value={build.alias} onChange={(e) => selectBuild(e.target.value)} aria-label="Which blockout build">
			{view.builds.map((b) => (
				<option key={b.id} value={b.alias}>
					{b.alias} · {buildStatusWord(b.status)}{b.alias === view.current ? ' · current' : ''} · {timeAgo(b.createdAt)}
				</option>
			))}
		</NativeSelect>
	) : null;

	const openMarks = view.marks.filter((m) => m.status === 'open');

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
				<div className="flex shrink-0 flex-wrap items-baseline gap-x-3">
					<h1 className="type-heading m-0 text-[18px]">Blockout for {state.name}</h1>
					<span className="font-body text-small text-ink-2">
						{baseKind === 'overlay' ? 'Left: the model drawn over the sheet. Right: the model.' : baseKind === 'sheet' ? 'Left: the sheet, bare body, with no overlay for this view. Right: the model.' : ''}
					</span>
				</div>
				{build && cmp ? (
					<div className="min-h-0 flex-1">
						<Viewer
							build={build}
							baseline={cmp.baseline}
							baseLabel={baseKind === 'overlay' ? 'Overlay on sheet' : 'Sheet, bare body'}
							baseFit={baseKind === 'sheet' ? 'contain' : 'fill'}
							noBaseText="No sheet drawing for this camera; the model is shown alone."
							ownBaseline={false}
							camera={cam}
							compare={compare}
							onCompare={setCompare}
							overlay={overlay}
							onOverlay={setOverlay}
							tool={tool}
							onTool={setTool}
							marks={marks}
							onMarks={setMarks}
							canMark={canMark}
							lead={picker}
							footer={<CameraStrip build={build} cameras={cameras} camera={cam} onCamera={setCamera} marks={marks} />}
						/>
					</div>
				) : (
					<p className="m-0 flex items-start gap-2 border border-dashed border-edge-strong bg-s0 p-6 font-body text-body text-ink-2">
						<CircleDashed className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
						No blockout build yet. When the orchestrator presents one, it shows here.
					</p>
				)}
			</div>
			<div className="flex w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-edge bg-s0 p-3 min-[1700px]:w-[460px]">
				<StageVerdict creature={creature} stage={stage} notes={state.stageNotes} onDone={changed} approveHint="Approving fixes these proportions. Every part then starts from this blockout, and a later change to it marks the approval out of date." />
				{view.fitNote ? (
					<section aria-label="Fit check" className="border border-edge-strong border-l-4 border-l-ink bg-s1 p-3">
						<p className="type-legend m-0 mb-1 text-[10.5px]">Fit check by the orchestrator · {timeAgo(view.fitNote.createdAt)}</p>
						<p className="m-0 font-body text-small text-ink">{view.fitNote.text}</p>
					</section>
				) : (
					<p className="m-0 flex items-start gap-2 border-l-4 border-caution bg-caution-tint p-3 font-body text-small text-ink">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
						<span><strong>No fit check yet.</strong> The orchestrator measures the model against the sheet and writes down what does not match before the stage is submitted.</span>
					</p>
				)}
				{build ? <FitPanel build={build} active={cam} onCamera={(c) => cameras.includes(c) && setCamera(c)} /> : null}
				<MarksList marks={marks} onMarks={setMarks} />
				{marks.length > 0 ? (
					<div className="flex flex-col items-end gap-1">
						<Button type="button" disabled={busy} onClick={() => void sendMarks()}><Send /> {marks.length === 1 ? 'Send 1 mark' : `Send ${marks.length} marks`}</Button>
					</div>
				) : null}
				{sent > 0 && marks.length === 0 ? <p role="status" className="m-0 flex items-center gap-1 font-body text-small text-ink"><Check className="size-4" aria-hidden="true" />{sent === 1 ? '1 mark sent' : `${sent} marks sent`} to the orchestrator.</p> : null}
				{problem ? <p role="alert" className="m-0 font-body text-small text-plague-outline-ink">{problem}</p> : null}
				{view.marks.length > 0 ? (
					<Panel title="Problems you marked" count={`${openMarks.length} open`}>
						<ul className="m-0 flex list-none flex-col gap-1 p-0">
							{view.marks.map((m) => (
								<li key={m.alias} className="flex flex-wrap items-center gap-2 font-body text-small text-ink">
									<Badge variant="default">{m.status === 'open' ? 'Open' : m.status === 'fixed' ? 'Fixed' : 'Won’t fix'}</Badge>
									<span className="type-data text-[12px] text-ink-3">{m.build} · {cameraWord(m.camera)}</span>
									{m.description}
								</li>
							))}
						</ul>
					</Panel>
				) : null}
				{build ? <BuilderPanel build={build} /> : null}
				{build ? <CostLine build={build} budgetLine={`The blockout has used ${view.budget.builds - view.budget.buildsLeft} of ${view.budget.builds} builds and ${Math.round(view.budget.wallMinutes - view.budget.wallMinutesLeft)} of ${view.budget.wallMinutes} minutes.`} /> : null}
			</div>
		</div>
	);
}
