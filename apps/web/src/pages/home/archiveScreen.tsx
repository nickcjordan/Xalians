// Tier: featured component. The home story's recordings are played back from
// an archive (Nick, 2026-09-26): every beat's picture sits on an old playback
// screen with scan lines, grain and a readout, and the screen has a power
// state the story's viewer drives.
//
//   standby  the viewer is not resting on the screen: dark glass, a faint
//            frozen static, "Standby". The picture is not shown and nothing
//            heavy runs.
//   search   the viewer has come to rest: static bursts in and holds until
//            the recording can play (at least SCREEN_MS.search; longer while
//            the catch still holds the page or the picture is still going in).
//   lock     it can: the picture opens out of a bright line, already moving,
//            and the static clears. Search and lock together are the old
//            1.1 s tuning when nothing has to wait (Nick, 2026-09-27: no still
//            picture between the static ending and the recording moving).
//   out      another recording chosen while playing: static rises over the
//            picture until it is gone (SCREEN_MS.out), and the viewer cuts to
//            the next beat, whose screen then searches and locks like any
//            other (Nick, 2026-09-27: Next and Back phase through static into
//            the next recording). The screen leaving holds its static as it goes.
//   on       playing: the picture, the readout's clock running.
//   off      the viewer moved on: the picture collapses to a line and goes.
//
// All of it is CSS on a few layers (`.archive` in globals.css); the only
// script is the readout's clock, ticking once a second while it plays.
//
// While a screen stands by, a Play key sits over it (ArchivePlay). A reader
// who stopped a little short of the resting place need not guess why nothing
// plays: Play brings the viewer to rest (Nick, 2026-09-26), and resting is
// still the one thing that starts a recording. The key is laid over the
// frame by the beat, not put inside the screen, because a scene's frame is a
// link and a key cannot sit inside a link.
import * as React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScreenState = 'standby' | 'search' | 'lock' | 'out' | 'on' | 'off';

// How long each change takes; the viewer waits on these. Search is the least it lasts.
export const SCREEN_MS = { search: 550, lock: 550, out: 320, off: 380 } as const;

function clock(sec: number) {
	const h = Math.floor(sec / 3600);
	const m = Math.floor(sec / 60) % 60;
	const s = sec % 60;
	return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** The Play key over a screen that stands by; nothing in any other state. Lay it over the frame, in a positioned box. */
export function ArchivePlay({ state, rec, onPlay }: { state: ScreenState; rec: string; onPlay: () => void }) {
	if (state !== 'standby') return null;
	return (
		<button type="button" className="archive-play type-data" onClick={onPlay} aria-label={`Play recording ${rec}`}>
			<Play aria-hidden="true" />
			Play
		</button>
	);
}

export function ArchiveScreen({
	state,
	rec,
	place,
	start = 0,
	still = false,
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
	/** A still picture, not a moving recording: the readout says so and its clock does not run. */
	still?: boolean;
	children: React.ReactNode;
	className?: string;
}) {
	const [sec, setSec] = React.useState(start);
	React.useEffect(() => {
		if (state !== 'on' || still) return undefined;
		const t = window.setInterval(() => setSec((v) => v + 1), 1000);
		return () => window.clearInterval(t);
	}, [state, still]);

	const playing = state === 'on';
	return (
		<div className={cn('archive', className)} data-screen={state} data-still={still ? '' : undefined}>
			<div className="archive-picture">{children}</div>
			<div className="archive-static" aria-hidden="true" />
			<div className="archive-glass" aria-hidden="true" />
			<div className="archive-hud type-data" aria-hidden="true">
				<span className="archive-hud-status">
					<span className="archive-dot" />
					{playing ? (still ? 'Still frame' : 'Playback') : state === 'search' || state === 'lock' || state === 'out' ? 'Tuning' : 'Standby'}
				</span>
				{still ? null : <span className="archive-hud-clock">{clock(sec)}</span>}
				<span className="archive-hud-rec">
					Rec {rec} · {place}
				</span>
			</div>
		</div>
	);
}
