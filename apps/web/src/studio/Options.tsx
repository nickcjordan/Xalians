import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, blobUrl, type BuildView } from './client';
import { renderFor } from './Viewer';
import { cameraWord, minutes } from './words';

/** Previews presented together for one part: the same camera side by side, with a choose button each. */
export function OptionsView({ builds, creature, camera, onChosen }: { builds: BuildView[]; creature: string; camera: string; onChosen: () => void }) {
	const [text, setText] = React.useState('');
	const [busy, setBusy] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [done, setDone] = React.useState<string | null>(null);

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
			<ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: `repeat(${Math.min(builds.length, 3)}, minmax(0, 1fr))` }}>
				{builds.map((b, i) => {
					const out = renderFor(b, camera);
					return (
						<li key={b.id} className="flex flex-col gap-2 border border-edge bg-s1 p-3">
							<div className="flex items-baseline gap-2">
								<span className="type-heading m-0 text-[18px] text-ink">Option {i + 1}</span>
								<span className="type-data text-[12px] text-ink-3">{b.alias}</span>
							</div>
							<p className="m-0 font-body text-small text-ink-2">{b.goal}</p>
							{out ? (
								<img src={blobUrl(out.blob)} alt={`Option ${i + 1}, ${cameraWord(camera).toLowerCase()}`} className="block max-h-[min(40vh,420px)] w-full border border-edge bg-s0 object-contain" />
							) : (
								<p className="m-0 border border-edge bg-s0 p-6 font-body text-small text-ink-2">No image for this view.</p>
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
