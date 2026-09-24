import React from 'react';
import { formatHold, formatHoldShown, wholeOrTenths } from './reclamationNarration';
import { FIT_SCALE, HOLD_BAR_SCALE } from './reclamationFit';
import { HomeGlyph, StrainGlyph } from './reclamationGlyphs';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments, so whose a thing is and how much it counts are read from where
	it sits, its color and its length, not from a label:

	  Standing    a world's two bars, the rival's above yours on one scale (pass 54; it
	              replaced pass 52's FrontLine)
	  HoldBar     a creature's hold as a bar in its side's color, the part the Clash is
	              forecast to take striped at its end
	  FitStrip    three columns on a bench card, one per world in world order: how much
	              sending it there now moves that world your way, with the rival's lead
	              ticked where the rival has one
	  RoundTrack  the game's nine worlds, three rounds of three, filled by who won them
	  ScorePips   the rival's row of five above yours, each with its turn lamp
	  SendCount   the sends each side has left, as ticks

	Every moving part is a transform or a clip-path, so pointing at a creature repaints the
	table and never moves it (pass 37's rule, held by reclamation-shift.mjs).
*/

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const EPS = 0.05;

function leadOf(theirs, mine) {
	if (Math.abs(theirs - mine) < EPS) {
		return 'level';
	}
	return theirs > mine ? 'theirs' : 'mine';
}

/*
	PASS 54, THE STANDING (Nick, 2026-09-23, on pass 52's front line: "I don't see a reason
	for there to be a distinction between anything, so it just looks weird that all the
	squares are split that way ... a number in the top left corner of something is next to
	useless").

	The front line drew a SHARE: the rival's part of a world against yours. A share says
	nothing when one side is absent, so every send into an empty world filled the whole
	field, and a 5 and a 16 looked the same. The standing draws AMOUNTS instead: two bars
	from the same edge on one scale shared by the round's three worlds, the rival's above
	yours, so the longer bar is the side that takes the world and a bar can be read against
	the bars of the next world.

	  fill     what the Clash is forecast to leave that side here, which decides the world
	  loss     the hatched run past the fill: what the Clash takes of what goes in
	  ghost    with a creature pointed at or lifted, the outlined run it adds to your bar
	  mark     the rival's end, drawn down through your lane: pass it and the world is yours
	  number   the side's total, riding the end of its bar

	`now` and `preview` are { theirs, mine, theirsBefore, mineBefore } (reclamationFit's
	forecast totals), `scale` is standingScale()'s, `marks` says what the previewed creature
	is here ({ home, strain, falls }), and `verdict` is the Court's ruling on the world once
	it is ruled, drawn as a pennant at the end of the winner's bar. Nothing is drawn for an
	empty world.
*/
const round1 = (v) => Math.round(v * 10) / 10;

export function Standing({ siteId, now, preview, scale, marks, verdict }) {
	const base = now || { theirs: 0, mine: 0, theirsBefore: 0, mineBefore: 0 };
	const shown = preview || base;
	const t = shown.theirs || 0;
	const m = shown.mine || 0;
	const tb = Math.max(t, shown.theirsBefore || 0);
	const mb = Math.max(m, shown.mineBefore || 0);
	const solidMine = preview ? Math.min(base.mine || 0, m) : m;
	const empty = !(t + m + tb + mb > EPS);
	const lead = empty ? 'empty' : leadOf(t, m);
	const s = scale > 0 ? scale : 24;
	const f = (v) => clamp01(v / s).toFixed(4);
	const [shownTheirs, shownMine] = wholeOrTenths(t, m);
	const ghost = !!preview && m > solidMine + EPS;
	const style = {
		'--st-t': f(t),
		'--st-tb': f(tb),
		'--st-m': f(m),
		'--st-m0': f(solidMine),
		'--st-mb': f(mb),
	};
	const mk = marks || {};
	const won = verdict ? (verdict.who === 'yours' ? 'mine' : verdict.who === 'theirs' ? 'theirs' : 'tie') : null;
	return (
		<span
			className={`rec-standing rec-standing--${lead}${preview ? ' rec-standing--preview' : ''}${won ? ` rec-standing--ruled rec-standing--won-${won}` : ''}`}
			style={style}
			data-standing={siteId}
			data-standing-lead={lead}
			data-standing-scale={s}
			data-standing-values={`${round1(t)}/${round1(m)}`}
			aria-hidden="true"
		>
			<span className="rec-standing-lane rec-standing-lane--theirs" data-standing-side="theirs">
				<span className="rec-standing-track" />
				{tb > t + EPS && <span className="rec-standing-loss" />}
				<span className="rec-standing-fill" />
				{(t > EPS || won === 'theirs') && (
					<span className="rec-standing-num" data-standing-total="theirs">
						<b className="g-mono">{shownTheirs}</b>
						{won === 'theirs' && <Crest verdict={verdict} />}
					</span>
				)}
			</span>
			<span className="rec-standing-lane rec-standing-lane--mine" data-standing-side="mine">
				<span className="rec-standing-track" />
				{mb > m + EPS && <span className="rec-standing-loss" />}
				{ghost && <span className="rec-standing-ghost" data-standing-ghost={round1(m - solidMine)} />}
				<span className="rec-standing-fill" />
				{t > EPS && <span className="rec-standing-mark" data-standing-mark />}
				{(m > EPS || mb > EPS || preview || won === 'mine' || won === 'tie') && (
					<span className="rec-standing-num" data-standing-total="mine">
						{preview && mk.art && <span className="rec-standing-art" data-standing-art>{mk.art}</span>}
						{(m > EPS || mb > EPS || preview || won === 'mine') && <b className="g-mono">{shownMine}</b>}
						{(won === 'mine' || won === 'tie') && <Crest verdict={verdict} />}
						{mk.home && <span className="rec-standing-why rec-standing-why--home" data-standing-home><HomeGlyph /></span>}
						{mk.strain && <span className="rec-standing-why rec-standing-why--strain" data-standing-strain={mk.strain}><StrainGlyph cause={mk.strain} /></span>}
						{mk.falls && <span className="rec-standing-why rec-standing-why--falls" data-standing-falls><svg viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg></span>}
					</span>
				)}
			</span>
		</span>
	);
}

// the words a world's standing stands for, for its reader's label
export function standingSentence(planet, theirs, mine) {
	if (!(theirs + mine > EPS)) {
		return `${planet}: nobody stands here yet`;
	}
	const lead = leadOf(theirs, mine);
	const totals = `rival ${formatHold(theirs)}, you ${formatHold(mine)}`;
	if (lead === 'level') {
		return `${planet}: level, ${totals}, after the Clash as the board stands`;
	}
	return `${planet}: ${lead === 'mine' ? 'you lead' : 'the rival leads'}, ${totals}, after the Clash as the board stands`;
}

/*
	HoldBar: `hold` now, `after` what the Clash is forecast to leave (0 is falls, undefined
	is no forecast), `unstrained` what it would hold where it is comfortable (a lifted
	creature's preview only), `side` 'mine' or 'theirs'.
*/
export function HoldBar({ hold, after, unstrained, side, className }) {
	const h = clamp01((hold || 0) / HOLD_BAR_SCALE);
	const kept = typeof after === 'number' ? clamp01(after / HOLD_BAR_SCALE) : h;
	const whole = typeof unstrained === 'number' && unstrained > hold ? clamp01(unstrained / HOLD_BAR_SCALE) : h;
	const falls = after === 0 && hold > 0;
	const classes = ['rec-hbar', `rec-hbar--${side || 'mine'}`];
	if (falls) classes.push('rec-hbar--falls');
	if (kept < h - 0.001) classes.push('rec-hbar--loses');
	if (whole > h + 0.001) classes.push('rec-hbar--strained');
	if (className) classes.push(className);
	return (
		<span className={classes.join(' ')} style={{ '--hb': h.toFixed(4), '--hb-kept': Math.min(kept, h).toFixed(4), '--hb-whole': whole.toFixed(4) }} aria-hidden="true">
			<span className="rec-hbar-whole" />
			<span className="rec-hbar-loss" />
			<span className="rec-hbar-fill" />
		</span>
	);
}

/*
	FitStrip: one column per world. `row` is fitTable's row for this creature; `sentSiteId`
	draws only the world it went to; `focusSiteId` lights one world's column and dims the
	others while that world is pointed at.
*/
export function FitStrip({ sites, row, sentSiteId, focusSiteId, off }) {
	return (
		<span className={`rec-fit${off ? ' rec-fit--off' : ''}`} data-fit aria-hidden="true">
			{sites.map((site) => {
				const classes = ['rec-fit-col', `g-el-${site.world.element}`];
				if (focusSiteId) {
					classes.push(focusSiteId === site.id ? 'rec-fit-col--focus' : 'rec-fit-col--dim');
				}
				if (sentSiteId) {
					classes.push(sentSiteId === site.id ? 'rec-fit-col--sent' : 'rec-fit-col--gone');
					return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well"><span className="rec-fit-bar" /></span></span>;
				}
				const cell = row && row[site.id];
				if (!cell) {
					classes.push('rec-fit-col--none');
					return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well" /></span>;
				}
				const height = clamp01(cell.swing / FIT_SCALE);
				const tick = cell.deficit > EPS ? clamp01(cell.deficit / FIT_SCALE) : null;
				if (cell.takes) classes.push('rec-fit-col--takes');
				else if (tick !== null) classes.push('rec-fit-col--short');
				if (cell.swing > FIT_SCALE) classes.push('rec-fit-col--over');
				if (cell.swing < -EPS) classes.push('rec-fit-col--hurts');
				return (
					<span
						className={classes.join(' ')}
						key={site.id}
						style={{ '--fit': height.toFixed(4), '--fit-tick': tick === null ? undefined : tick.toFixed(4) }}
						data-fit-site={site.id}
						data-fit-swing={cell.swing.toFixed(2)}
						data-fit-takes={cell.takes ? '' : undefined}
					>
						{/* the number sits on its column: what this send would move that world, the same unit as the totals on the world's line */}
						<span className="rec-fit-num g-mono">{cell.swing < -0.5 ? `−${formatHoldShown(-cell.swing)}` : formatHoldShown(Math.max(0, cell.swing))}</span>
						<span className="rec-fit-well">
							<span className="rec-fit-bar" />
							{tick !== null && <span className="rec-fit-tick" />}
						</span>
					</span>
				);
			})}
		</span>
	);
}

// the fit strip's reading in words, for the card's title
export function fitSentence(sites, row) {
	if (!row) {
		return '';
	}
	return sites.map((site) => {
		const cell = row[site.id];
		if (!cell) {
			return null;
		}
		const move = cell.swing >= 0 ? `+${formatHold(cell.swing)} your way` : `${formatHold(cell.swing)}, against you`;
		const lead = cell.takes ? ', takes the lead' : cell.deficit > EPS ? `, the rival still ahead by ${formatHold(Math.max(0, cell.deficit - Math.max(0, cell.swing)))}` : '';
		const home = cell.isHome ? ', home ground' : '';
		const strain = cell.strainLevel && cell.strainLevel !== 'none' ? `, ${cell.strainLevel === 'severe' ? 'severely strained' : 'strained'}` : '';
		return `${site.world.planet} ${move}${lead}${home}${strain}`;
	}).filter(Boolean).join('. ');
}

export function RoundTrack({ track, frameIndex }) {
	const rounds = track || [];
	const label = `Round ${frameIndex + 1} of ${rounds.length || 3}`;
	return (
		<span className="rec-track" data-round-track={frameIndex + 1} title={label} aria-label={label} role="img">
			{rounds.map((round) => (
				<span className={`rec-track-round${round.current ? ' rec-track-round--now' : ''}${round.index < frameIndex ? ' rec-track-round--past' : ''}`} key={round.index}>
					{round.sites.map((site) => (
						<i
							key={site.siteId}
							className={`rec-track-world rec-track-world--${site.who || 'open'}${site.staked ? ' rec-track-world--staked' : ''} g-el-${site.element}`}
							title={`${site.planet}${site.who === 'mine' ? ': yours' : site.who === 'theirs' ? ': the rival’s' : site.who === 'tie' ? ': tied' : ''}`}
						/>
					))}
				</span>
			))}
		</span>
	);
}

/*
	ScorePips: each side's row, the rival's above yours: five pennants for the worlds won
	toward the clinch (pass 54: the first blind readers of the standing took the old pips for
	more of the round track), then the sends that side has left, and a pause mark once the
	rival has passed this round.

	PASS 54. Whose move it is is a pointer at the head of that side's row, pulsing in its
	color (the turn marker a board game passes across the table), in place of the "Your
	move" and "Rival's move" words; the other row's head is empty. The sends left are a
	row of ticks, one per send the game allows, lit for each one still to spend, with the
	count after them, in place of a chevron and a bare number.
*/
export function ScorePips({ mine, theirs, toClinch, rivalPassed, mySends, theirSends, myCap, theirCap, worldsAhead, sendsTone, turn }) {
	// pass 54: each world won is a pennant, the same flag the Ruling plants on the winner's bar
	const row = (n, side) => Array.from({ length: toClinch }).map((_, i) => (
		<i className={`rec-pip rec-pip--flag rec-pip--${side}${i < n ? ' rec-pip--lit' : ''}`} key={`${i}-${i < n ? 'lit' : 'dark'}`}>
			<svg viewBox="0 0 12 14" aria-hidden="true"><path className="rec-pip-staff" d="M2.5 13.5V1" /><path className="rec-pip-cloth" d="M2.5 1.5h8L8.3 4.8l2.2 3.3h-8z" /></svg>
		</i>
	));
	const label = `First to ${toClinch} worlds wins. The rival has ${theirs}, you have ${mine}.${rivalPassed ? ' The rival has passed this round.' : ''}`;
	const lamp = (side) => (
		<span
			className={`rec-turn-lamp rec-turn-lamp--${side}${turn === side ? ' rec-turn-lamp--on' : ''}`}
			key={`lamp-${side}-${turn === side ? 'on' : 'off'}`}
			data-turn-lamp={side}
			data-turn-on={turn === side ? '' : undefined}
			title={turn === side ? (side === 'mine' ? 'Your move' : 'The rival is moving') : undefined}
		>
			{turn === side && <svg viewBox="0 0 10 12" aria-hidden="true"><path d="M1.5 1.2 9 6l-7.5 4.8z" /></svg>}
		</span>
	);
	return (
		<span className="rec-scoreboard" data-score data-turn={turn || 'none'}>
			{lamp('theirs')}
			<span className="rec-score-row rec-score-row--theirs" data-sites-b={theirs} title={label} aria-label={label} role="img">
				{row(theirs, 'theirs')}
			</span>
			{typeof theirSends === 'number' ? <SendCount left={theirSends} cap={theirCap} side="theirs" worldsAhead={worldsAhead} /> : <span />}
			<span className="rec-score-passed-slot">
				{rivalPassed && <span className="rec-score-passed" data-rival-passed title="The rival has passed this round"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="2" width="2.4" height="8" /><rect x="7.1" y="2" width="2.4" height="8" /></svg></span>}
			</span>
			{lamp('mine')}
			<span className="rec-score-row rec-score-row--mine" data-sites-a={mine} title={label} aria-label={label} role="img">{row(mine, 'mine')}</span>
			{typeof mySends === 'number' ? <SendCount left={mySends} cap={myCap} side="mine" worldsAhead={worldsAhead} tone={sendsTone} /> : <span />}
			<span className="rec-score-passed-slot" />
		</span>
	);
}

export function SendCount({ left, cap, side, worldsAhead, tone }) {
	const who = side === 'theirs' ? 'The rival has' : 'You have';
	const label = `${who} ${left} send${left === 1 ? '' : 's'} left${typeof worldsAhead === 'number' ? ` for the ${worldsAhead} world${worldsAhead === 1 ? '' : 's'} still to play` : ''}`;
	const total = Math.max(typeof cap === 'number' ? cap : left, left);
	return (
		<span className={`rec-sends rec-sends--${side}${tone ? ` rec-sends--${tone}` : ''}`} title={label} aria-label={label} role="img" data-sends-left={left} data-sends-side={side}>
			<span className="rec-sends-ticks" aria-hidden="true">
				{Array.from({ length: total }).map((_, i) => <i className={`rec-send-tick${i < left ? ' rec-send-tick--left' : ''}`} key={i} />)}
			</span>
			<b className="g-mono">{left}</b>
		</span>
	);
}

// the Ruling on a world: a pennant in the winner's color (pass 54: at the end of the winner's bar, which shows the margin)
export function Crest({ verdict }) {
	if (!verdict) {
		return null;
	}
	const who = verdict.who === 'yours' ? 'mine' : verdict.who === 'theirs' ? 'theirs' : 'tie';
	return (
		<span className={`rec-crest rec-crest--${who}`} data-crest={who} title={`${verdict.planet ? `${verdict.planet}: ` : ''}${verdict.text}`}>
			<svg viewBox="0 0 24 24" aria-hidden="true" className="rec-crest-flag">
				{who === 'tie'
					? <path d="M5 9h14M5 15h14" />
					: <><path d="M6 21V3" /><path d="M6 4h12l-3 4.5L18 13H6" /></>}
			</svg>
		</span>
	);
}
