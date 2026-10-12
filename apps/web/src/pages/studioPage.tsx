// Tier: chrome. The Creature Studio review screen is a tool for reading and
// deciding on records, so it is site chrome built from the system's own pieces.
// It is dev-only: App.js mounts it only under import.meta.env.DEV, and its API
// exists only inside the Vite dev server (apps/web/studio/plugin.js).
// Design: docs/design/creature-studio.md section 5.
import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import XalianNavbar from '@/components/navbar';
import { HelixSpinner } from '@/components/system/brand';
import { Callout } from '@/components/system/readouts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

import { api, blobUrl, usePolled, type BuildView, type MarkDraft, type NeedItem, type PartView } from '@/studio/client';
import { OptionsView } from '@/studio/Options';
import { BuilderPanel, CostLine, DefectsPanel, displacementOf, HoldsPanel, NeedsRail, NotesPanel, Panel, VerdictPanel } from '@/studio/Panels';
import { renderFor, Viewer, type CompareMode, type Overlay, type Tool } from '@/studio/Viewer';
import { buildKindWord, buildStatusWord, cameraShort, cameraWord, partStatusWord, sortCameras, timeAgo } from '@/studio/words';

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

function PartList({ creature }: { creature: string }) {
	const { data, error } = usePolled(() => api.parts(creature), `parts:${creature}`, 5000);
	if (error) return <ServerProblem message={error} />;
	if (!data) return <Loading />;
	return (
		<ul className="m-0 flex list-none flex-col gap-2 p-0">
			{data.map((p) => (
				<li key={p.id}>
					<Link to={`/studio/${creature}/${p.key}`} className="flex flex-wrap items-center gap-3 border border-edge bg-s1 p-4 text-ink no-underline hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring">
						<span className="type-heading text-[18px]">{p.name}</span>
						<Badge variant={p.status === 'stale' ? 'warn' : 'default'}>{partStatusWord(p.status)}</Badge>
						{p.stalledDefects.length > 0 ? <Badge variant="warn">Stalled</Badge> : null}
						<span className="ml-auto font-body text-small text-ink-2">
							{p.openDefects.length === 1 ? '1 open problem' : `${p.openDefects.length} open problems`} · {p.budgetLeft.builds} builds left
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
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

	if (error && !view) return <ServerProblem message={error} />;
	if (!view) return <Loading />;

	const options = view.builds.filter((b) => b.kind === 'preview' && b.status === 'presented').reverse();
	const build = pickInitialBuild(view, wantedBuild);
	const activeTab = tab ?? (options.length >= 2 && !wantedBuild ? 'options' : 'review');

	const cameras = sortCameras(Array.from(new Set((activeTab === 'options' ? options : build ? [build] : []).flatMap((b) => Object.keys(b.cameras)))));
	const cam = cameras.includes(camera) ? camera : (cameras[0] ?? camera);
	const marks = (build && marksByBuild[build.id]) || [];
	const setMarks = (m: MarkDraft[]) => build && setMarksByBuild((prev) => ({ ...prev, [build.id]: m }));
	const disp = build ? displacementOf(build) : undefined;
	const canMark = !!build && build.status === 'presented';

	const selectBuild = (alias: string) => {
		const next = new URLSearchParams(search);
		next.set('build', alias);
		setSearch(next, { replace: true });
		setOverlay('render');
		setTool('view');
	};

	const stripBuild = activeTab === 'options' ? options[0] : build;

	const reviewBody = build ? (
		<div className="flex min-w-0 flex-col gap-4">
			<ToggleGroup type="single" value={build.alias} onValueChange={(v: string) => v && selectBuild(v)} aria-label="Builds of this part" className="flex-wrap" spacing={1}>
				{view.builds.map((b) => (
					<ToggleGroupItem key={b.id} value={b.alias} className="h-auto min-h-9 flex-col items-start gap-0 py-1 normal-case">
						<span className="type-data text-[12px]">{b.alias} · {buildKindWord(b.kind)}</span>
						<span className="font-body text-[12px] tracking-normal">{buildStatusWord(b.status)} · {timeAgo(b.createdAt)}</span>
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<CameraStrip build={stripBuild} cameras={cameras} camera={cam} onCamera={setCamera} marks={marks} />
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
				heatLegend={disp ? { max: disp.max, units: disp.units } : undefined}
			/>
		</div>
	) : (
		<p className="m-0 border border-edge bg-s1 p-6 font-body text-body text-ink-2">No builds for this part yet. When the orchestrator presents one, it shows here.</p>
	);

	return (
		<div className="grid grid-cols-1 gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1700px]:grid-cols-[minmax(0,1fr)_400px]">
			<div className="min-w-0">
				{options.length >= 2 ? (
					<Tabs value={activeTab} onValueChange={(v: string) => setTab(v as 'options' | 'review')}>
						<TabsList>
							<TabsTrigger value="options">Compare options ({options.length})</TabsTrigger>
							<TabsTrigger value="review">Review one build</TabsTrigger>
						</TabsList>
						<TabsContent value="options" className="mt-2 flex flex-col gap-4">
							<CameraStrip build={options[0]} cameras={cameras} camera={cam} onCamera={setCamera} marks={[]} />
							<OptionsView builds={options} creature={creature} camera={cam} onChosen={() => void refresh()} />
						</TabsContent>
						<TabsContent value="review" className="mt-2">{reviewBody}</TabsContent>
					</Tabs>
				) : (
					reviewBody
				)}
			</div>
			<div className="flex min-w-0 flex-col gap-4">
				{build && activeTab === 'review' ? <VerdictPanel build={build} view={view} creature={creature} marks={marks} onDone={() => { setMarksByBuild((p) => ({ ...p, [build.id]: [] })); setTool('view'); void refresh(); }} /> : null}
				<HoldsPanel view={view} creature={creature} onChanged={() => void refresh()} />
				<DefectsPanel view={view} />
				{build ? <BuilderPanel build={build} /> : null}
				{build ? <CostLine build={build} view={view} /> : null}
				<NotesPanel view={view} />
			</div>
		</div>
	);
}

function CameraStrip({ build, cameras, camera, onCamera, marks }: { build: BuildView | undefined; cameras: string[]; camera: string; onCamera: (c: string) => void; marks: MarkDraft[] }) {
	if (!build || cameras.length === 0) return null;
	return (
		<div role="group" aria-label="Views" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(cameras.length, 1)}, minmax(0, 88px))` }}>
			{cameras.map((c) => {
				const out = renderFor(build, c);
				const n = marks.filter((m) => m.camera === c).length;
				const on = c === camera;
				return (
					<button
						key={c}
						type="button"
						aria-pressed={on}
						onClick={() => onCamera(c)}
						className={cn(
							'flex min-w-0 flex-col gap-1 border bg-s1 p-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring',
							on ? 'border-ink bg-s2 shadow-[inset_0_-3px_0_var(--color-ink)]' : 'border-edge hover:bg-s2',
						)}
					>
						{out ? <img src={blobUrl(out.blob)} alt="" className="aspect-[4/3] w-full bg-s0 object-cover" /> : <span className="aspect-[4/3] w-full bg-s0" />}
						<span className={cn('type-legend flex items-center justify-between px-0.5 text-[10.5px]', on ? 'text-ink' : '')}>
							<span className="truncate">{cameraShort(c)}</span>
							{n > 0 ? <span className="type-data ml-1 border border-caution px-1 text-caution">{n}</span> : null}
						</span>
					</button>
				);
			})}
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
	const needs = useNeeds(creature);

	const [search] = useSearchParams();
	const current = creature && part ? { creature, part, build: search.get('build') ?? undefined } : undefined;

	const partsLoad = React.useCallback(() => api.parts(creature!), [creature]);
	const { data: parts } = usePolled(creature ? partsLoad : null, `partnav:${creature ?? ''}`, 5000);
	const partName = parts?.find((p) => p.key === part)?.name ?? part;

	const crumb = (
		<nav aria-label="Where you are" className="flex flex-wrap items-center gap-2 font-body text-small text-ink-2">
			<Link to="/studio" className="text-ink-2 underline decoration-ink-3 underline-offset-4 hover:text-ink">All creatures</Link>
			{creature ? <><span aria-hidden="true">/</span><Link to={`/studio/${creature}`} className="text-ink-2 underline decoration-ink-3 underline-offset-4 hover:text-ink">{creature}</Link></> : null}
		</nav>
	);

	return (
		<main id="main" className="min-h-screen bg-room font-body text-ink" data-tier="chrome">
			<XalianNavbar />
			<div className="mx-auto w-full max-w-[1840px] px-4 pb-16 min-[1440px]:px-6">
				<header className="mt-4 mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
					<div className="min-w-0">
						{crumb}
						<h1 className="type-title m-0 mt-1 text-[28px]"><span className="type-legend mr-3 align-middle">Creature Studio</span>{part ? partName : creature ? creature : 'Review'}</h1>
					</div>
					{parts && part ? (
						<nav aria-label="Parts" className="flex flex-wrap gap-2">
							{parts.map((p) => (
								<Link
									key={p.id}
									to={`/studio/${creature}/${p.key}`}
									aria-current={p.key === part ? 'page' : undefined}
									className={cn(
										'type-legend border px-3 py-1.5 no-underline outline-none focus-visible:outline-2 focus-visible:outline-ring',
										p.key === part ? 'border-ink bg-s2 text-ink shadow-[inset_0_-3px_0_var(--color-ink)]' : 'border-edge bg-s1 hover:bg-s2',
									)}
								>
									{p.name} <span className="font-body text-[11px] tracking-normal normal-case">� {partStatusWord(p.status)}</span>
								</Link>
							))}
						</nav>
					) : null}
				</header>
				<div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-[232px_minmax(0,1fr)] min-[1700px]:grid-cols-[320px_minmax(0,1fr)]">
					<div>
						{needs.error ? <ServerProblem message={needs.error} /> : <NeedsRail items={needs.data} creature={creature} current={current} />}
					</div>
					<div className="min-w-0">
						{creature && part ? <PartReview key={`${creature}/${part}`} creature={creature} part={part} /> : creature ? <PartList creature={creature} /> : <CreatureList />}
						{creature && part ? null : <Panel title="How this works" className="mt-6"><p className="m-0 max-w-[62ch] font-body text-body text-ink-2">The orchestrator presents a build; it shows up under Needs you. Open it, compare it with the last approved version, mark anything wrong, and approve, ask for changes or reject. Your decision is written to the records and the orchestrator is told.</p></Panel>}
					</div>
				</div>
			</div>
		</main>
	);
}
