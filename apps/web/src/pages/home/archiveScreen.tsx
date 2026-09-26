// Tier: featured component. The home story's recordings are played back from
// an archive (Nick, 2026-09-26): every beat's picture sits on an old playback
// screen with scan lines, grain and a readout, and the screen has a power
// state the story's viewer drives.
//
//   standby  the viewer is not resting on the screen: dark glass, a faint
//            frozen static, "Standby". The picture is not shown and nothing
//            heavy runs.
//   tuning   the viewer has come to rest: a burst of static, the picture
//            opening out of a bright line, then it plays.
//   switch   another recording chosen while playing: a short burst of static.
//   on       playing: the picture, the readout's clock running.
//   off      the viewer moved on: the picture collapses to a line and goes.
//
// All of it is CSS on a few layers (`.archive` in globals.css); the only
// script is the readout's clock, ticking once a second while it plays.
import * as React from 'react';
import { cn } from '@/lib/utils';

export type ScreenState = 'standby' | 'tuning' | 'switch' | 'on' | 'off';

// How long each change takes; the viewer waits on these.
export const SCREEN_MS = { tuning: 1100, switch: 520, off: 380 } as const;

function clock(sec: number) {
	const h = Math.floor(sec / 3600);
	const m = Math.floor(sec / 60) % 60;
	const s = sec % 60;
	return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function ArchiveScreen({
	state,
	rec,
	place,
	start = 0,
	children,
	className,
}: {
	state: ScreenState;
	/** The recording's number, e.g. "01". */
	rec: string;
	/** Where it was recorded, or what it is, for the readout. */
	place: string;
	/** Where the recording's clock starts, in seconds, so each reads as a cut from a longer reel. */
	start?: number;
	children: React.ReactNode;
	className?: string;
}) {
	const [sec, setSec] = React.useState(start);
	React.useEffect(() => {
		if (state !== 'on') return undefined;
		const t = window.setInterval(() => setSec((v) => v + 1), 1000);
		return () => window.clearInterval(t);
	}, [state]);

	const playing = state === 'on' || state === 'switch';
	return (
		<div className={cn('archive', className)} data-screen={state}>
			<div className="archive-picture">{children}</div>
			<div className="archive-static" aria-hidden="true" />
			<div className="archive-glass" aria-hidden="true" />
			<div className="archive-hud type-data" aria-hidden="true">
				<span className="archive-hud-status">
					<span className="archive-dot" />
					{playing ? 'Playback' : state === 'tuning' ? 'Tuning' : 'Standby'}
				</span>
				<span className="archive-hud-clock">{clock(sec)}</span>
				<span className="archive-hud-rec">
					Rec {rec} · {place}
				</span>
			</div>
		</div>
	);
}
