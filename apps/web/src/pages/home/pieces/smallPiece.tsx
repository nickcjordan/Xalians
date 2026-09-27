// Tier: featured component. One of the home story's small pieces (docs/design/home-story-small-pieces.md)
// on its canvas: the piece's own clock, at the plates' film rate, drawing each moment with the pure drawing
// in `pieces.ts`. It fills its archive screen edge to edge; the recording's ground is part of the drawing.
//
// In the story's viewer a piece is live only while it is the shown beat, has settled, and the viewer is on
// the screen; `live` false holds its place, and shown again it carries on from there. Stacked (no stage) or
// under reduced motion it rests on its telling frame, `rest`.
import * as React from 'react';
import { FILM_FPS } from '@/components/plates/livePlate';
import { PIECES, type PieceKey } from './pieces';
import { W } from './stage';

function reduced() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function SmallPiece({ piece, live, label }: { piece: PieceKey; live: boolean | undefined; label: string }) {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const def = PIECES[piece];
	const still = live === undefined || reduced();
	const clock = React.useRef({ sec: still ? def.rest : 0 });

	const draw = React.useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext?.('2d');
		if (!canvas || !ctx) return;
		const { sec } = clock.current;
		const t = sec % def.loop;
		canvas.dataset.pieceT = t.toFixed(2);
		ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		def.draw(ctx, t, sec);
	}, [def]);

	// The canvas's own resolution: a little over its box, at most 1000 pixels wide. The pieces are light and
	// glow, which hold up at that; every pixel more is graphics chip work on every frame.
	React.useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;
		const fit = () => {
			const dpr = Math.min(1.25, window.devicePixelRatio || 1);
			const w = Math.max(1, Math.min(1000, Math.round(canvas.clientWidth * dpr)));
			const h = Math.max(1, Math.round((w * canvas.clientHeight) / Math.max(1, canvas.clientWidth)));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			draw();
		};
		fit();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
		ro?.observe(canvas);
		return () => ro?.disconnect();
	}, [draw]);

	React.useLayoutEffect(() => {
		if (still) clock.current.sec = def.rest;
		draw();
	}, [still, def, draw]);

	// Film rate: a new frame FILM_FPS times a second, only while live.
	React.useEffect(() => {
		if (!live || reduced()) return undefined;
		let frame = 0;
		let last = -1;
		const step = 1000 / FILM_FPS;
		const tick = (now: number) => {
			frame = window.requestAnimationFrame(tick);
			if (last < 0) last = now;
			const due = Math.floor((now - last) / step);
			if (due < 1) return;
			last += due * step;
			clock.current.sec += Math.min(due, 3) / FILM_FPS;
			draw();
		};
		frame = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frame);
	}, [live, draw]);

	return (
		<span role="img" aria-label={label} className="absolute inset-0 block" data-piece={piece} data-piece-live={String(!!live && !reduced())}>
			<canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
		</span>
	);
}
