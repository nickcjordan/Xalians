// Round harness for the home story's figures (docs/design/home-story-figures.md, section 10;
// .claude/skills/story-figure-polish). Runs one figure outside the site on the same stage the viewer gives it
// (the oval fade, film rate while it only plays, full rate while it is on its way somewhere), with its beats as
// keys, Replay, and a draw-time readout, at the wide place and at a phone's. The page is what a round
// publishes as its artifact: `node scripts/design/export-figure-study.cjs <figure>` bundles it into one file
// with the round's scores and frames.
//
// Also served by the dev server: /dev/figureStudy.html?figure=generators
// Stills for a contact sheet: ?frames=0@1.5;0@4>1@2.3;c0@6  (beat@seconds, ">" runs on into the next beat
// without a reset, a leading "c" draws it compact). Sets window.__done when they are drawn.
import { FIGURES, type Figure, type FigureKey } from '../src/pages/home/pieces/figures';
import { H, W } from '../src/pages/home/pieces/stage';

type Round = {
	round: string;
	date?: string;
	summary?: string;
	scores?: Record<string, number>;
	reader?: string[];
	changes?: string[];
	open?: string[];
	frames?: { src: string; caption?: string }[];
};
type Study = { figure: FigureKey; title?: string; beats?: string[]; rounds?: Round[] };

const FILM_FPS = 20;
const BAR = 8.5;
const LINES = ['Glance', 'Lore', 'Subject', 'Setting', 'Motion', 'Changes', 'Finish', 'Phone'];

const q = new URLSearchParams(location.search);
const given = (window as unknown as { __STUDY__?: Study }).__STUDY__;
const study: Study = given ?? { figure: (q.get('figure') || 'generators') as FigureKey };
const make = FIGURES[study.figure];
if (!make) throw new Error(`no figure ${study.figure}`);
const probe = make();
const beatNames = study.beats ?? Array.from({ length: probe.stages }, (_, i) => `Beat ${i + 1}`);

/* ------------------------------------------------------------------ drawing, as the figure stage does it */

/** Draw a figure into `o` (sized to its place in device pixels) and fade it to the oval the stage uses. */
function paint(o: HTMLCanvasElement, fig: Figure, sec: number, compact: boolean) {
	const oc = o.getContext('2d')!;
	oc.setTransform(1, 0, 0, 1, 0, 0);
	oc.globalCompositeOperation = 'source-over';
	oc.globalAlpha = 1;
	oc.clearRect(0, 0, o.width, o.height);
	oc.setTransform(o.width / W, 0, 0, o.height / H, 0, 0);
	fig.draw(oc, sec, { compact });
	oc.globalCompositeOperation = 'destination-in';
	oc.globalAlpha = 1;
	oc.save();
	oc.translate(W / 2, H / 2);
	oc.scale(1, (0.46 * H) / (0.48 * W));
	const m = oc.createRadialGradient(0, 0, 0, 0, 0, 0.48 * W);
	m.addColorStop(0, 'rgba(0,0,0,1)');
	m.addColorStop(0.55, 'rgba(0,0,0,1)');
	m.addColorStop(1, 'rgba(0,0,0,0)');
	oc.fillStyle = m;
	oc.fillRect(-W, -W, 2 * W, 2 * W);
	oc.restore();
	oc.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------------ styles */

const style = document.createElement('style');
style.textContent = `
:root { color-scheme: dark; --ground: #0b0a10; --panel: #13121a; --line: #2a2833; --ink: #e7e4ee; --muted: #9a96a8; --mint: #7ff0c0; --under: #ff6f91; }
html, body { background: var(--ground); color: var(--ink); }
body { margin: 0; font: 15px/1.5 'Atkinson Hyperlegible', system-ui, sans-serif; }
.study { max-width: 1240px; margin: 0 auto; padding-inline: 16px; padding-block: 20px 48px; display: grid; gap: 28px; }
.study h1 { font: 600 26px/1.15 'Saira', system-ui, sans-serif; margin: 0; text-wrap: balance; letter-spacing: 0.01em; }
.study h2 { font: 600 18px/1.2 'Saira', system-ui, sans-serif; margin: 0 0 10px; }
.kicker { font: 500 11px/1 'Martian Mono', ui-monospace, monospace; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.lede { color: var(--muted); max-width: 62ch; margin: 8px 0 0; }
.stages { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 720px) { .stages { grid-template-columns: minmax(0, 1fr); } }
.place { display: grid; gap: 6px; }
.place canvas { display: block; width: 100%; aspect-ratio: ${W} / ${H}; background: #000; }
.place .phone-frame { max-width: 360px; }
.meta { display: flex; justify-content: space-between; gap: 8px; font: 12px/1.3 'Martian Mono', ui-monospace, monospace; color: var(--muted); font-variant-numeric: tabular-nums; }
.meta .over { color: var(--under); }
.keys { display: flex; flex-wrap: wrap; gap: 8px; }
.keys button { font: 500 13px/1 'Saira', system-ui, sans-serif; color: var(--ink); background: var(--panel); border: 1px solid var(--line); padding: 10px 14px; cursor: pointer; }
.keys button[aria-pressed="true"] { border-color: var(--mint); color: var(--mint); }
.keys button:focus-visible { outline: 2px solid var(--mint); outline-offset: 2px; }
.hint { color: var(--muted); font-size: 13px; margin: 0; max-width: 62ch; }
.round { border-top: 1px solid var(--line); padding-top: 22px; display: grid; gap: 16px; }
.scores { width: 100%; max-width: 560px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.scores td, .scores th { text-align: left; padding: 6px 10px 6px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.scores th { font: 500 11px/1 'Martian Mono', ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.scores td.n { font-family: 'Martian Mono', ui-monospace, monospace; }
.scores td.ok { color: var(--mint); }
.scores td.under { color: var(--under); }
.round ul { margin: 0; padding-left: 20px; max-width: 72ch; }
.round li { margin: 4px 0; }
.frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 10px; }
.frames figure { margin: 0; }
.frames img { display: block; width: 100%; height: auto; background: #000; }
.frames figcaption { font: 12px/1.3 'Martian Mono', ui-monospace, monospace; color: var(--muted); padding-top: 4px; }
.stills { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 6px; padding: 6px; }
.stills canvas { display: block; width: 100%; aspect-ratio: ${W} / ${H}; background: #000; }
.stills figcaption { font: 11px/1.3 'Martian Mono', ui-monospace, monospace; color: var(--muted); }
.stills figure { margin: 0; }
`;
document.head.append(style);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) => {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
	if (text != null) e.textContent = text;
	return e;
};
const root = document.getElementById('study') ?? document.body.appendChild(el('div', { id: 'study' }));
root.classList.add('study');

/* ------------------------------------------------------------------ stills mode (for contact sheets) */

const framesSpec = q.get('frames');
if (framesSpec) {
	const grid = el('div', { class: 'stills' });
	grid.style.setProperty('--cols', q.get('cols') || '3');
	root.append(grid);
	const px = Number(q.get('w') || 1000);
	const dt = 1 / 60;
	for (const item of framesSpec.split(';').filter(Boolean)) {
		const compact = item.startsWith('c');
		const legs = (compact ? item.slice(1) : item).split('>').map((leg) => leg.split('@').map(Number) as [number, number]);
		const fig = make();
		fig.reset(legs[0][0]);
		let sec = 0;
		for (const [stage, secs] of legs) for (let t = 0; t < secs - 1e-6; t += dt, sec += dt) fig.step(dt, stage, true);
		const c = el('canvas');
		c.width = compact ? Math.round(px * 0.36) : px;
		c.height = Math.round((c.width * H) / W);
		paint(c, fig, sec, compact);
		const f = el('figure');
		f.append(c, el('figcaption', {}, `${study.figure} ${item}`));
		grid.append(f);
	}
	(window as unknown as { __done: boolean }).__done = true;
} else {
	buildStudy();
}

/* ------------------------------------------------------------------ the study */

function buildStudy() {
	const head = el('header');
	head.append(el('div', { class: 'kicker' }, 'Home story figure'), el('h1', {}, study.title ?? `${study.figure} figure`));
	head.append(el('p', { class: 'lede' }, 'The figure alone, on the stage the story gives it: the oval fade, 20 frames a second while it only plays. Choose a beat to run on into it, Replay to enter it afresh.'));
	root.append(head);

	const stagesEl = el('section', { class: 'stages', 'aria-label': 'The figure at its two sizes' });
	root.append(stagesEl);
	type Place = { fig: Figure; canvas: HTMLCanvasElement; compact: boolean; times: number[]; readout: HTMLElement };
	const places: Place[] = [];
	for (const compact of [false, true]) {
		const wrap = el('div', { class: 'place' });
		const frame = el('div', { class: compact ? 'phone-frame' : 'wide-frame' });
		const canvas = el('canvas', { role: 'img', 'aria-label': `${study.figure} figure, ${compact ? 'phone' : 'wide'} place` });
		frame.append(canvas);
		const meta = el('div', { class: 'meta' });
		const label = el('span', {}, compact ? 'Phone place (compact)' : 'Wide place');
		const readout = el('span', {}, '...');
		meta.append(label, readout);
		wrap.append(frame, meta);
		stagesEl.append(wrap);
		places.push({ fig: make(), canvas, compact, times: [], readout });
	}

	const keys = el('div', { class: 'keys', role: 'group', 'aria-label': 'Beats' });
	const beatButtons = beatNames.map((name, i) => {
		const b = el('button', { type: 'button', 'aria-pressed': 'false' }, name);
		b.addEventListener('click', () => go(i));
		keys.append(b);
		return b;
	});
	const replay = el('button', { type: 'button' }, 'Replay');
	replay.addEventListener('click', () => go(stage, true));
	const pull = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Pull back');
	pull.addEventListener('click', () => {
		present = !present;
		pull.setAttribute('aria-pressed', String(!present));
		kick();
	});
	const settle = el('button', { type: 'button' }, 'Settled (reduced motion)');
	settle.addEventListener('click', () => {
		for (const p of places) p.fig.settle(stage);
		present = true;
		paused = true;
		drawAll(performance.now() / 1000);
	});
	keys.append(replay, pull, settle);
	root.append(keys);
	root.append(el('p', { class: 'hint' }, 'A later beat runs on from the one before it, as it does on the page; an earlier one, or Replay, enters afresh. Draw time is the figure plus the fade, per frame, over the last 120 frames drawn.'));

	for (const r of (study.rounds ?? []).slice().reverse()) root.append(roundSection(r));

	let stage = 0;
	let present = true;
	let paused = false;
	let frame = 0;
	let last = -1;
	let lastDraw = -1;
	let lastMs = -1;
	const gaps: number[] = [];
	// ?stress=1 draws every frame instead of at film rate: whether the screen keeps up is the GPU's share
	const stress = q.get('stress') === '1';

	function go(i: number, fresh = false) {
		paused = false;
		if (fresh || i <= stage) for (const p of places) p.fig.reset(i);
		stage = i;
		present = true;
		pull.setAttribute('aria-pressed', 'false');
		beatButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
		kick();
	}

	function fit() {
		for (const p of places) {
			const r = p.canvas.getBoundingClientRect();
			const pr = Math.min(1.25, window.devicePixelRatio || 1, 1800 / Math.max(1, r.width));
			const w = Math.max(1, Math.round(r.width * pr));
			const h = Math.max(1, Math.round((w * H) / W));
			if (p.canvas.width !== w || p.canvas.height !== h) {
				p.canvas.width = w;
				p.canvas.height = h;
			}
		}
	}

	function drawAll(sec: number) {
		for (const p of places) {
			const t0 = performance.now();
			paint(p.canvas, p.fig, sec, p.compact);
			// the script's share only: the canvas rasterizes later, on the GPU, which the frame rate below shows
			p.times.push(performance.now() - t0);
			if (p.times.length > 120) p.times.shift();
			const sorted = p.times.slice().sort((a, b) => a - b);
			const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
			const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
			const fps = gaps.length ? 1000 / (gaps.reduce((s, v) => s + v, 0) / gaps.length) : 0;
			p.readout.textContent = `draw ${avg.toFixed(1)} ms avg, ${p95.toFixed(1)} ms p95${stress ? `, ${fps.toFixed(0)} fps` : ''}`;
			p.readout.classList.toggle('over', avg > 8 || p95 > 16 || (stress && gaps.length > 60 && fps < 58));
		}
	}

	function tick(ms: number) {
		frame = 0;
		if (lastMs >= 0) gaps.push(ms - lastMs);
		if (gaps.length > 120) gaps.shift();
		lastMs = ms;
		const sec = ms / 1000;
		const dt = last < 0 ? 0 : Math.min(0.1, sec - last);
		last = sec;
		if (paused || document.hidden) {
			last = -1;
			lastMs = -1;
			return;
		}
		let busy = false;
		for (const p of places) {
			p.fig.step(dt, stage, present);
			busy = busy || p.fig.busy(stage, present);
		}
		if (stress || busy || sec - lastDraw >= 1 / FILM_FPS - 0.001) {
			drawAll(sec);
			lastDraw = sec;
		}
		frame = requestAnimationFrame(tick);
	}
	function kick() {
		if (!frame) frame = requestAnimationFrame(tick);
	}
	document.addEventListener('visibilitychange', kick);
	new ResizeObserver(fit).observe(stagesEl);
	fit();
	go(0, true);
}

function roundSection(r: Round) {
	const s = el('section', { class: 'round' });
	const h = el('div');
	h.append(el('div', { class: 'kicker' }, r.date ? `${r.round}, ${r.date}` : r.round), el('h2', {}, r.round));
	s.append(h);
	if (r.summary) s.append(el('p', { class: 'lede' }, r.summary));
	if (r.scores) {
		const t = el('table', { class: 'scores' });
		const hr = el('tr');
		hr.append(el('th', {}, 'Line'), el('th', {}, 'Score'), el('th', {}, `Bar ${BAR}`));
		t.append(hr);
		for (const line of LINES) {
			const v = r.scores[line];
			if (v == null) continue;
			const tr = el('tr');
			const ok = v >= BAR;
			tr.append(el('td', {}, line), el('td', { class: `n ${ok ? 'ok' : 'under'}` }, v.toFixed(1)), el('td', { class: ok ? 'ok' : 'under' }, ok ? 'clears' : `${(BAR - v).toFixed(1)} under`));
			t.append(tr);
		}
		s.append(t);
	}
	const list = (title: string, items?: string[]) => {
		if (!items?.length) return;
		const wrap = el('div');
		wrap.append(el('h2', {}, title));
		const ul = el('ul');
		for (const i of items) ul.append(el('li', {}, i));
		wrap.append(ul);
		s.append(wrap);
	};
	list('What the blind reader said', r.reader);
	list('Changed this round', r.changes);
	list('Still open', r.open);
	if (r.frames?.length) {
		const g = el('div', { class: 'frames' });
		for (const f of r.frames) {
			const fig = el('figure');
			fig.append(el('img', { src: f.src, alt: f.caption ?? '', loading: 'lazy' }));
			if (f.caption) fig.append(el('figcaption', {}, f.caption));
			g.append(fig);
		}
		s.append(g);
	}
	return s;
}
