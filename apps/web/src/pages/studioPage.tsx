// Tier: chrome. The Creature Studio review screen is a tool for reading and
// deciding on records, so it is site chrome built from the system's own pieces.
// It is a fixed one-screen workspace with its own slim header (no site navbar or
// footer), because the images are what gets judged and they need the room.
// It is dev-only: App.js mounts it only under import.meta.env.DEV, and its API
// exists only inside the Vite dev server (apps/web/studio/plugin.js).
// Design: docs/design/creature-studio.md section 5.
import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { HelixSpinner } from '@/components/system/brand';
import { Callout } from '@/components/system/readouts';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { api, blobUrl, usePolled, type BuildView, type MarkDraft, type NeedItem, type PartView } from '@/studio/client';
import { OptionsView } from '@/studio/Options';
import { BuilderPanel, CostLine, DefectsPanel, HoldsPanel, NeedsRail, NotesPanel, Panel, VerdictPanel } from '@/studio/Panels';
import { CameraStrip, MarksList, Viewer, type CompareMode, type Overlay, type Tool } from '@/studio/Viewer';
import { BlockoutReview } from '@/studio/Blockout';
import { CreatureBoard, IntakeReview } from '@/studio/Stages';
import { SheetReview } from '@/studio/Sheet';
import { VisionReview } from '@/studio/Vision';
import { buildKindWord, buildStatusWord, partStatusWord, sortCameras, stageName, timeAgo } from '@/studio/words';

type NeedWithCreature = NeedItem & { creature: string };

function useNeeds(creature: string | undefined) {
	const load = React.useCallback(async (): Promise<NeedWithCreature[]> => {
		const keys = creature ? [creature] : (await api.creatures()).map((c) => c.key);
		const lists = await Promise.all(keys.map(async (key) => (await api.needs(key)).map((n) => ({ ...n, creature: key }))));
		return lists.flat().sort((a, b) => a.since.localeCompare(b.since));
	}, [creature]);
	return usePolled(load, `needs:${creature ?? '*'}`, 4000);
}

function ServerProblem({ message }: { message: string }) {
	return (
		<Callout variant="caution" title="The studio did not answer">
			{message} The review screen reads records through the dev server, so it works only while <code>npm run dev</code> is running in apps/web.
		</Callout>
	);
}

function Loading() {
	return (
		<div className="grid min-h-60 place-items-center">
			<HelixSpinner />
		</div>
	);
}

const linkClass = 'text-ink-2 underline decoration-ink-3 underline-offset-4 hover:text-ink';

// ---------------------------------------------------------------------------
// /studio and /studio/:creature
// ---------------------------------------------------------------------------

function CreatureList() {
	const { data, error } = usePolled(() => api.creatures(), 'creatures', 5000);
	if (error) return <ServerProblem message={error} />;
	if (!data) return <Loading />;
	if (data.length === 0) {
		return (
			<p className="m-0 border border-edge bg-s1 p-6 font-body text-body text-ink-2">
				No creatures yet. Create one with <code>npm run studio -- init</code>, or seed a throwaway with <code>node apps/web/scripts/studio-fixture.mjs</code>.
			</p>
		);
	}
	return (
		<ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
			{data.map((c) => (
				<li key={c.key}>
					<Link to={`/studio/${c.key}`} className="flex flex-col gap-1 border border-edge bg-s1 p-4 text-ink no-underline hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring">
						<span className="type-heading text-[20px]">{c.name}</span>
						<span className="font-body text-small text-ink-2">{c.parts === 1 ? '1 part' : `${c.parts} parts`} · {c.needs === 0 ? 'nothing waiting on you' : `${c.needs} waiting on you`}</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

function BoardPage({ creature }: { creature: string }) {
	const { data: state, error } = usePolled(() => api.creature(creature), `board:${creature}`, 4000);
	const { data: summaries } = usePolled(() => api.parts(creature), `board-parts:${creature}`, 5000);
	if (error && !state) return <div className="p-6"><ServerProblem message={error} /></div>;
	if (!state) return <Loading />;
	return <CreatureBoard creature={creature} state={state} summaries={summaries} />;
}

// ---------------------------------------------------------------------------
// /studio/:creature/:part
// ---------------------------------------------------------------------------

function pickInitialBuild(view: PartView, wanted: string | null): BuildView | undefined {
	return view.builds.find((b) => b.alias === wanted) ?? view.builds.find((b) => b.status === 'presented') ?? view.builds[0];
}

function PartReview({ creature, part }: { creature: string; part: string }) {
	const [search, setSearch] = useSearchParams();
	const wantedBuild = search.get('build');
	const { data: view, error, refresh } = usePolled(() => api.part(creature, part), `part:${creature}/${part}`, 4000);

	const [camera, setCamera] = React.useState<string>('front');
	const [compare, setCompare] = React.useState<CompareMode>('side');
	const [overlay, setOverlay] = React.useState<Overlay>('render');
	const [tool, setTool] = React.useState<Tool>('view');
	const [marksByBuild, setMarksByBuild] = React.useState<Record<string, MarkDraft[]>>({});
	const [tab, setTab] = React.useState<'options' | 'review' | null>(null);

	if (error && !view) return <div className="p-6"><ServerProblem message={error} /></div>;
	if (!view) return <Loading />;

	const options = view.builds.filter((b) => b.kind === 'preview' && b.status === 'presented').reverse();
	const build = pickInitialBuild(view, wantedBuild);
	const activeTab = tab ?? (options.length >= 2 && !wantedBuild ? 'options' : 'review');

	const cameras = sortCameras(Array.from(new Set((activeTab === 'options' ? options : build ? [build] : []).flatMap((b) => Object.keys(b.cameras)))));
	const cam = cameras.includes(camera) ? camera : (cameras[0] ?? camera);
	const marks = (build && marksByBuild[build.id]) || [];
	const setMarks = (m: MarkDraft[]) => build && setMarksByBuild((prev) => ({ ...prev, [build.id]: m }));
	const canMark = !!build && build.status === 'presented';

	const selectBuild = (alias: string) => {
		const next = new URLSearchParams(search);
		next.set('build', alias);
		setSearch(next, { replace: true });
		setOverlay('render');
		setTool('view');
	};

	const buildPicker = build ? (
		<NativeSelect size="sm" className="w-44 text-small" value={build.alias} onChange={(e) => selectBuild(e.target.value)} aria-label="Which build">
			{view.builds.map((b) => (
				<option key={b.id} value={b.alias}>
					{b.alias} · {buildKindWord(b.kind)} · {buildStatusWord(b.status)} · {timeAgo(b.createdAt)}
				</option>
			))}
		</NativeSelect>
	) : null;

	const reviewBody = build ? (
		<Viewer
			build={build}
			baseline={view.baseline && view.baseline.id !== build.id ? view.baseline : undefined}
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
			lead={buildPicker}
			footer={<CameraStrip build={build} cameras={cameras} camera={cam} onCamera={setCamera} marks={marks} />}
		/>
	) : (
		<p className="m-0 border border-edge bg-s1 p-6 font-body text-body text-ink-2">No builds for this part yet. When the orchestrator presents one, it shows here.</p>
	);

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
				{options.length >= 2 ? (
					<Tabs value={activeTab} onValueChange={(v: string) => setTab(v as 'options' | 'review')} className="min-h-0 flex-1 gap-2">
						<TabsList>
							<TabsTrigger value="options">Compare options ({options.length})</TabsTrigger>
							<TabsTrigger value="review">Review one build</TabsTrigger>
						</TabsList>
						<TabsContent value="options" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
							<CameraStrip build={options[0]} cameras={cameras} camera={cam} onCamera={setCamera} marks={[]} />
							<OptionsView builds={options} creature={creature} camera={cam} onChosen={() => void refresh()} />
						</TabsContent>
						<TabsContent value="review" className="min-h-0 flex-1">{reviewBody}</TabsContent>
					</Tabs>
				) : (
					reviewBody
				)}
			</div>
			<div className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-edge bg-s0 p-3 min-[1700px]:w-[400px]">
				{build && activeTab === 'review' ? <VerdictPanel build={build} view={view} creature={creature} marks={marks} onDone={() => { setMarksByBuild((p) => ({ ...p, [build.id]: [] })); setTool('view'); void refresh(); }} /> : null}
				<MarksList marks={marks} onMarks={setMarks} />
				<HoldsPanel view={view} creature={creature} onChanged={() => void refresh()} />
				<DefectsPanel view={view} />
				{build ? <BuilderPanel build={build} /> : null}
				{build ? <CostLine build={build} view={view} /> : null}
				<NotesPanel view={view} />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export default function StudioPage() {
	const params = useParams();
	const creature = params.creature;
	const part = params.part;
	const stage = params.stage;
	const needs = useNeeds(creature);
	const [railCollapsed, setRailCollapsed] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 1500);

	const [search] = useSearchParams();
	const current = creature && part ? { creature, part, build: search.get('build') ?? undefined } : creature && stage ? { creature, stage } : undefined;

	const partsLoad = React.useCallback(() => api.parts(creature!), [creature]);
	const { data: parts } = usePolled(creature ? partsLoad : null, `partnav:${creature ?? ''}`, 5000);

	return (
		<main id="main" className="flex h-screen flex-col overflow-hidden bg-room font-body text-ink" data-tier="chrome">
			<header className="flex h-11 shrink-0 items-center gap-4 border-b border-edge bg-s0 px-3">
				<Link to="/" className={cn('type-legend', linkClass)}>Back to site</Link>
				<span className="type-legend text-ink">Creature Studio</span>
				<nav aria-label="Where you are" className="flex min-w-0 items-center gap-2 font-body text-small text-ink-2">
					<Link to="/studio" className={linkClass}>All creatures</Link>
					{creature ? <><span aria-hidden="true">/</span><Link to={`/studio/${creature}`} className={linkClass}>{creature}</Link></> : null}
					{creature && stage ? <><span aria-hidden="true">/</span><span className="text-ink">{stageName(stage)} review</span></> : null}
				</nav>
				{parts && part ? (
					<nav aria-label="Parts" className="ml-auto flex min-w-0 gap-1.5 overflow-x-auto">
						{parts.map((p) => (
							<Link
								key={p.id}
								to={`/studio/${creature}/${p.key}`}
								aria-current={p.key === part ? 'page' : undefined}
								className={cn(
									'type-legend shrink-0 border px-3 py-1 no-underline outline-none focus-visible:outline-2 focus-visible:outline-ring',
									p.key === part ? 'border-ink bg-s2 text-ink shadow-[inset_0_-3px_0_var(--color-ink)]' : 'border-edge bg-s1 hover:bg-s2',
								)}
							>
								{p.name}
								<span className="ml-2 font-body text-[11px] tracking-normal normal-case text-ink-2">{partStatusWord(p.status)}</span>
							</Link>
						))}
					</nav>
				) : null}
			</header>
			<div className="flex min-h-0 flex-1">
				{needs.error ? null : <NeedsRail items={needs.data} creature={creature} current={current} collapsed={railCollapsed} onToggle={() => setRailCollapsed((c) => !c)} />}
				<div className="min-h-0 min-w-0 flex-1">
					{needs.error ? <div className="p-6"><ServerProblem message={needs.error} /></div> : null}
					{!needs.error && creature && part ? (
						<PartReview key={`${creature}/${part}`} creature={creature} part={part} />
					) : !needs.error && creature && stage === 'intake' ? (
						<IntakeReview key={`${creature}/intake`} creature={creature} />
					) : !needs.error && creature && stage === 'vision' ? (
						<VisionReview key={`${creature}/vision`} creature={creature} />
					) : !needs.error && creature && stage === 'sheet' ? (
						<SheetReview key={`${creature}/sheet`} creature={creature} />
					) : !needs.error && creature && stage === 'blockout' ? (
						<BlockoutReview key={`${creature}/blockout`} creature={creature} />
					) : !needs.error && creature && stage ? (
						<div className="p-6"><p className="m-0 max-w-[62ch] border border-edge bg-s1 p-4 font-body text-body text-ink-2">The {stageName(stage).toLowerCase()} stage has no review screen yet.</p></div>
					) : !needs.error && creature ? (
						<BoardPage key={creature} creature={creature} />
					) : !needs.error ? (
						<div className="h-full overflow-y-auto p-6">
							<h1 className="type-title m-0 mb-4 text-[28px]">Creatures</h1>
							<CreatureList />
							<Panel title="How this works" className="mt-6 max-w-[62ch]">
								<p className="m-0 font-body text-body text-ink-2">The orchestrator presents a build or submits a stage; it shows up under Needs you. Open it, look, mark anything wrong, and approve, ask for changes or reject. Your decision is written to the records and the orchestrator is told.</p>
							</Panel>
						</div>
					) : null}
				</div>
			</div>
		</main>
	);
}
