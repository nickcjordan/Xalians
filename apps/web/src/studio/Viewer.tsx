import * as React from 'react';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { blobUrl, type BuildView, type MarkDraft } from './client';
import { cameraWord } from './words';

type Out = BuildView['cameras'][string][number];

export type CompareMode = 'side' | 'swipe';
export type Overlay = 'render' | 'diff' | 'heat';
export type Tool = 'view' | 'ellipse' | 'rect';

/** The main image for a camera: the render, not a diff, baseline, comparison or heat output. */
export function renderFor(build: BuildView | undefined, camera: string): Out | undefined {
	const outs = build?.cameras[camera] ?? [];
	return outs.find((o) => o.role === 'render') ?? outs.find((o) => !o.role) ?? undefined;
}

export function overlayFor(build: BuildView, camera: string, kind: 'diff' | 'heat'): Out | undefined {
	const here = build.cameras[camera]?.find((o) => o.role === kind);
	if (here) return here;
	if (kind === 'heat') return build.otherOutputs.find((o) => o.role === 'heat');
	return undefined;
}

export function baselineFor(build: BuildView, baseline: BuildView | undefined, camera: string): Out | undefined {
	return renderFor(baseline, camera) ?? build.cameras[camera]?.find((o) => o.role === 'baseline');
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
	const [size, setSize] = React.useState({ w: 0, h: 0 });
	React.useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
		read();
		const ro = new ResizeObserver(read);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return size;
}

function useRatio(url: string | undefined): number {
	const [ratio, setRatio] = React.useState(1);
	React.useEffect(() => {
		if (!url) return;
		const img = new Image();
		img.onload = () => img.naturalWidth && img.naturalHeight && setRatio(img.naturalWidth / img.naturalHeight);
		img.src = url;
	}, [url]);
	return ratio;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** The largest box of the image's shape that fits the space. */
function fit(ratio: number, w: number, h: number) {
	if (w <= 0 || h <= 0) return { w: 0, h: 0 };
	const byWidth = { w, h: w / ratio };
	return byWidth.h <= h ? byWidth : { w: h * ratio, h };
}

function Tag({ children, side }: { children: React.ReactNode; side: 'left' | 'right' }) {
	return (
		<span className={cn('type-legend pointer-events-none absolute top-2 z-10 border border-edge-strong bg-room px-2 py-0.5 text-ink', side === 'left' ? 'left-2' : 'right-2')}>
			{children}
		</span>
	);
}

/** Shapes drawn over the image. Two strokes (dark under amber) so they read on any luminance. */
function Marks({ marks, draft }: { marks: { m: MarkDraft; n: number }[]; draft?: MarkDraft | null }) {
	const shape = (m: Pick<MarkDraft, 'shape' | 'x' | 'y' | 'w' | 'h'>, key: string, dashed?: boolean) => {
		const common = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none' };
		const el = (extra: object) =>
			m.shape === 'ellipse' ? (
				<ellipse cx={(m.x + m.w / 2) * 100} cy={(m.y + m.h / 2) * 100} rx={(m.w / 2) * 100} ry={(m.h / 2) * 100} {...common} {...extra} />
			) : (
				<rect x={m.x * 100} y={m.y * 100} width={m.w * 100} height={m.h * 100} {...common} {...extra} />
			);
		return (
			<g key={key}>
				{el({ className: 'stroke-room', strokeWidth: 5 })}
				{el({ className: 'stroke-caution', strokeWidth: 2.5, strokeDasharray: dashed ? '6 4' : undefined })}
			</g>
		);
	};
	return (
		<>
			<svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
				{marks.map(({ m, n }) => shape(m, `m${n}`))}
				{draft ? shape(draft, 'draft', true) : null}
			</svg>
			{marks.map(({ m, n }) => (
				<span
					key={`n${n}`}
					className="type-data pointer-events-none absolute z-10 grid size-5 place-items-center border border-caution bg-room text-[11px] text-caution"
					style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-30%, -30%)' }}
				>
					{n}
				</span>
			))}
		</>
	);
}

/** The marks drawn so far, numbered, with a remove control. Shown beside the verdict, not under the image. */
export function MarksList({ marks, onMarks }: { marks: MarkDraft[]; onMarks: (m: MarkDraft[]) => void }) {
	if (marks.length === 0) return null;
	return (
		<section className="border border-edge bg-s1 p-3">
			<h2 className="type-subhead m-0 mb-2 text-[15px]">Marks to send <span className="type-data ml-2 text-small text-ink-2">{marks.length}</span></h2>
			<ol className="m-0 flex list-none flex-col gap-1 p-0">
				{marks.map((m, i) => (
					<li key={i} className="flex items-center gap-2 border border-edge bg-s0 py-1 pr-1 pl-2">
						<span className="type-data grid size-5 shrink-0 place-items-center border border-caution text-[11px] text-caution">{i + 1}</span>
						<span className="min-w-0 flex-1 font-body text-small text-ink">
							<span className="type-legend mr-2 text-[10.5px]">{cameraWord(m.camera)}, {m.shape === 'ellipse' ? 'circle' : 'box'}</span>
							{m.description}
						</span>
						<Button type="button" size="icon-xs" variant="ghost" onClick={() => onMarks(marks.filter((_, j) => j !== i))}>
							<Trash2 />
							<span className="sr-only">Remove mark {i + 1}</span>
						</Button>
					</li>
				))}
			</ol>
		</section>
	);
}

export interface ViewerProps {
	build: BuildView;
	baseline?: BuildView;
	camera: string;
	compare: CompareMode;
	onCompare: (m: CompareMode) => void;
	overlay: Overlay;
	onOverlay: (o: Overlay) => void;
	tool: Tool;
	onTool: (t: Tool) => void;
	marks: MarkDraft[];
	onMarks: (m: MarkDraft[]) => void;
	canMark: boolean;
	/** Controls placed first in the toolbar (the build picker). */
	lead?: React.ReactNode;
	/** Placed under the stage (the camera strip). */
	footer?: React.ReactNode;
}

/** A toolbar row that never wraps; it scrolls sideways if the space is ever too small. */
export function Toolbar({ children }: { children: React.ReactNode }) {
	return <div className="flex shrink-0 items-center gap-x-3 overflow-x-auto whitespace-nowrap pb-1 [&>*]:shrink-0">{children}</div>;
}

export function Viewer(props: ViewerProps) {
	const { build, baseline, camera, compare, overlay, tool, marks, canMark } = props;
	const render = renderFor(build, camera);
	const base = baselineFor(build, baseline, camera);
	const diff = overlayFor(build, camera, 'diff');
	const heat = overlayFor(build, camera, 'heat');
	const shown = (overlay === 'diff' ? diff : overlay === 'heat' ? heat : render) ?? render;
	const baselineIsApproved = !!renderFor(baseline, camera);
	const ratio = useRatio(shown ? blobUrl(shown.blob) : undefined);

	const stageRef = React.useRef<HTMLDivElement>(null);
	const area = useSize(stageRef);
	const frameRef = React.useRef<HTMLDivElement>(null);

	const [pos, setPos] = React.useState(0.5);
	const [draft, setDraft] = React.useState<MarkDraft | null>(null);
	const [pending, setPending] = React.useState<MarkDraft | null>(null);
	const [text, setText] = React.useState('');
	const start = React.useRef<{ x: number; y: number } | null>(null);

	React.useEffect(() => {
		setDraft(null);
		setPending(null);
		setText('');
	}, [camera, build.id]);

	const showBase = !!base && compare === 'side';
	const gap = 12;
	const pane = fit(ratio, showBase ? (area.w - gap) / 2 : area.w, area.h);
	const frameStyle: React.CSSProperties = { width: pane.w, height: pane.h };

	const point = (e: React.PointerEvent) => {
		const r = frameRef.current!.getBoundingClientRect();
		return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
	};
	const drawing = tool !== 'view' && canMark;

	const onDown = (e: React.PointerEvent) => {
		if (!drawing || pending) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		start.current = point(e);
	};
	const onMove = (e: React.PointerEvent) => {
		const s = start.current;
		if (!s) return;
		const p = point(e);
		setDraft({ camera, shape: tool === 'rect' ? 'rect' : 'ellipse', x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y), description: '' });
	};
	const onUp = () => {
		const d = draft;
		start.current = null;
		setDraft(null);
		if (d && d.w > 0.015 && d.h > 0.015) setPending(d);
	};
	const swipeMove = (e: React.PointerEvent) => {
		if (e.buttons !== 1 || drawing) return;
		setPos(point(e).x);
	};

	const here = marks.map((m, i) => ({ m, n: i + 1 })).filter(({ m }) => m.camera === camera);
	const url = shown ? blobUrl(shown.blob) : undefined;

	const addPending = () => {
		if (!pending || !text.trim()) return;
		props.onMarks([...marks, { ...pending, description: text.trim() }]);
		setPending(null);
		setText('');
	};

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<Toolbar>
				{props.lead}
				{base ? (
					<ToggleGroup size="sm" type="single" value={compare} onValueChange={(v: string) => v && props.onCompare(v as CompareMode)} aria-label="How to compare" spacing={1}>
						<ToggleGroupItem value="side">Side by side</ToggleGroupItem>
						<ToggleGroupItem value="swipe">Swipe</ToggleGroupItem>
					</ToggleGroup>
				) : (
					<span className="font-body text-small text-ink-2">Nothing approved yet to compare against.</span>
				)}
				{diff || heat ? (
					<ToggleGroup size="sm" type="single" value={overlay} onValueChange={(v: string) => v && props.onOverlay(v as Overlay)} aria-label="What to show" spacing={1}>
						<ToggleGroupItem value="render">Render</ToggleGroupItem>
						{diff ? <ToggleGroupItem value="diff">Changes</ToggleGroupItem> : null}
						{heat ? <ToggleGroupItem value="heat">Heat map</ToggleGroupItem> : null}
					</ToggleGroup>
				) : null}
				{canMark ? (
					<div className="flex items-center gap-2">
						<span className="type-legend hidden min-[1500px]:inline">Mark a problem</span>
						<ToggleGroup size="sm" type="single" value={tool} onValueChange={(v: string) => props.onTool((v || 'view') as Tool)} aria-label="Mark a problem" title="Mark a problem" spacing={1}>
							<ToggleGroupItem value="ellipse">Circle</ToggleGroupItem>
							<ToggleGroupItem value="rect">Box</ToggleGroupItem>
						</ToggleGroup>
					</div>
				) : null}
			</Toolbar>

			<div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center" style={{ gap }}>
				{!render ? (
					<p className="m-0 border border-edge bg-s0 p-6 font-body text-body text-ink-2">This build has no image for {cameraWord(camera).toLowerCase()}.</p>
				) : (
					<>
						{showBase && base ? (
							<div className="relative shrink-0 overflow-hidden border border-edge bg-s0" style={frameStyle}>
								<img src={blobUrl(base.blob)} alt={`${cameraWord(camera)}, last approved`} className="absolute inset-0 size-full object-fill" draggable={false} />
								<Tag side="left">{baselineIsApproved ? 'Last approved' : 'Before'}</Tag>
							</div>
						) : null}
						<div ref={frameRef} className="relative shrink-0 select-none overflow-hidden border border-edge bg-s0" style={frameStyle}>
							{url ? <img src={url} alt={`${cameraWord(camera)}, this build`} className="absolute inset-0 size-full object-fill" draggable={false} /> : null}
							{base && compare === 'swipe' ? (
								<>
									<img
										src={blobUrl(base.blob)}
										alt={`${cameraWord(camera)}, last approved`}
										className="absolute inset-0 size-full object-fill"
										style={{ clipPath: `inset(0 ${100 - pos * 100}% 0 0)` }}
										draggable={false}
									/>
									<div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-ink" style={{ left: `${pos * 100}%` }} />
									<Tag side="left">{baselineIsApproved ? 'Last approved' : 'Before'}</Tag>
									<Tag side="right">This build</Tag>
									<div
										role="slider"
										tabIndex={0}
										aria-label="Swipe divider"
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={Math.round(pos * 100)}
										className={cn('absolute top-1/2 z-20 grid h-10 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center border border-ink bg-s1 text-ink outline-none focus-visible:outline-2 focus-visible:outline-ring', drawing ? 'pointer-events-none opacity-50' : 'cursor-ew-resize')}
										style={{ left: `${pos * 100}%` }}
										onPointerDown={(e) => !drawing && (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
										onPointerMove={swipeMove}
										onKeyDown={(e) => {
											if (e.key === 'ArrowLeft') setPos((p) => clamp(p - 0.05));
											if (e.key === 'ArrowRight') setPos((p) => clamp(p + 0.05));
										}}
									>
										<GripVertical className="size-4" />
									</div>
								</>
							) : (
								<Tag side="right">{overlay === 'diff' ? 'Changes' : overlay === 'heat' ? 'Heat map' : 'This build'}</Tag>
							)}
							<Marks marks={here} draft={draft ?? pending} />
							{drawing ? <div className="absolute inset-0 z-30 cursor-crosshair touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} /> : null}
						</div>
					</>
				)}

				{pending ? (
					<form
						className="absolute inset-x-2 bottom-2 z-40 flex flex-wrap items-center gap-3 border border-caution bg-s1 p-3"
						onSubmit={(e) => {
							e.preventDefault();
							addPending();
						}}
					>
						<label className="type-legend" htmlFor="mark-text">What is wrong here?</label>
						<Input id="mark-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} className="min-w-64 flex-1" placeholder="For example: the brow is flat" />
						<Button type="submit" size="sm" disabled={!text.trim()}><Plus /> Add mark</Button>
						<Button type="button" size="sm" variant="ghost" onClick={() => { setPending(null); setText(''); }}><X /> Discard</Button>
					</form>
				) : null}
			</div>

			{props.footer}
		</div>
	);
}
