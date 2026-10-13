import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, blobUrl, type BuildView } from './client';
import { renderFor, referenceFor } from './Viewer';
import { JudgeList, firstJudge } from './Judge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cameraWord, minutes } from './words';

/** Previews presented together for one part: the same camera side by side, with a choose button each. */
export function OptionsView({ builds, creature, camera, onChosen }: { builds: BuildView[]; creature: string; camera: string; onChosen: () => void }) {
	const [text, setText] = React.useState('');
	const [busy, setBusy] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [done, setDone] = React.useState<string | null>(null);
	const [showOverlay, setShowOverlay] = React.useState(false);
	const overlayOf = (b: BuildView) => b.cameras[camera]?.find((o) => o.role === 'overlay');
	const hasOverlay = builds.some((b) => overlayOf(b));
	const reference = builds.map((b) => referenceFor(b, camera)).find(Boolean);
	const judge = firstJudge(builds);
	const columns = Math.min(builds.length + (reference ? 1 : 0), 4);

	const choose = async (chosen: BuildView) => {
		setBusy(chosen.alias);
		setError(null);
		try {
			await api.choose(creature, { builds: builds.map((b) => b.alias), chosen: chosen.alias, text });
			setDone(chosen.alias);
			onChosen();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(null);
		}
	};

	if (done) {
		return <p className="m-0 border border-edge bg-s1 p-4 font-body text-body text-ink">Recorded: you chose option {done}. A preview is a direction, not an approval; the next step is a build in that direction.</p>;
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="m-0 font-body text-small text-ink-2">
				{builds.length} options for the same view ({cameraWord(camera).toLowerCase()}), under the same light. Pick one direction.
			</p>
			<JudgeList checks={judge} />
			{hasOverlay ? (
				<div className="flex items-center gap-2">
					<ToggleGroup size="sm" type="single" value={showOverlay ? 'overlay' : 'render'} onValueChange={(v: string) => v && setShowOverlay(v === 'overlay')} aria-label="What to show on each option" spacing={1}>
						<ToggleGroupItem value="render">Render</ToggleGroupItem>
						<ToggleGroupItem value="overlay">Overlay on reference</ToggleGroupItem>
					</ToggleGroup>
					<span className="font-body text-small text-ink-2">Options without an overlay for this view keep their render.</span>
				</div>
			) : null}
			<ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
				{reference ? (
					<li className="flex flex-col gap-2 border border-edge-strong bg-s2 p-3">
						<div className="flex items-baseline gap-2">
							<span className="type-heading m-0 text-[18px] text-ink">Reference</span>
						</div>
						<p className="m-0 font-body text-small text-ink-2">{reference.label}</p>
						<img src={blobUrl(reference.blob)} alt={`Reference: ${reference.label}, ${cameraWord(camera).toLowerCase()}`} className="block aspect-square w-full border border-edge bg-s0 object-contain" />
					</li>
				) : null}
				{builds.map((b, i) => {
					const ov = showOverlay ? overlayOf(b) : undefined;
					const out = ov ?? renderFor(b, camera);
					return (
						<li key={b.id} className="flex flex-col gap-2 border border-edge bg-s1 p-3">
							<div className="flex items-baseline gap-2">
								<span className="type-heading m-0 text-[18px] text-ink">Option {i + 1}</span>
								<span className="type-data text-[12px] text-ink-3">{b.alias}</span>
							</div>
							<p className="m-0 font-body text-small text-ink-2">{b.goal}</p>
							{out ? (
								<img src={blobUrl(out.blob)} alt={`Option ${i + 1}, ${cameraWord(camera).toLowerCase()}${ov ? ', overlay' : ''}`} className="block aspect-square w-full border border-edge bg-s0 object-contain" />
							) : (
								<p className="m-0 flex aspect-square w-full items-center justify-center border border-edge bg-s0 p-6 font-body text-small text-ink-2">No image for this view.</p>
							)}
							<p className="type-data m-0 text-[12px] text-ink-2">{b.cost.wallMinutes !== undefined ? minutes(b.cost.wallMinutes) : 'time not recorded'}</p>
							<Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void choose(b)}>
								<Check /> Choose option {i + 1}
							</Button>
						</li>
					);
				})}
			</ul>
			<div>
				<label className="type-legend mb-1 block" htmlFor="choose-note">Why this one (optional)</label>
				<Textarea id="choose-note" value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" />
			</div>
			{error ? <p role="alert" className="m-0 font-body text-small text-plague-outline-ink">{error}</p> : null}
		</div>
	);
}
