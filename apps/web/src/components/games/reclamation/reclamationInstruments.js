import React from 'react';
import { formatHold, formatHoldShown, wholeOrTenths } from './reclamationNarration';
import { FIT_SCALE, HOLD_BAR_SCALE } from './reclamationFit';
import { HomeGlyph, StrainGlyph, CompanyGlyph, FallsGlyph, NoMediumGlyph } from './reclamationGlyphs';

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
	forecast totals), `scale` is standingScale()'s, `marks` may carry the previewed creature's
	silhouette (`art`; since pass 57 the world passes none, because the creature pointed at
	stands in your rank as its ghost piece with its number and its reasons), and `verdict` is
	the Court's ruling on the world once
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
	FitStrip: one column per world. `row` is fitTable's row for this creature; `focusSiteId`
	lights one world's column and dims the others while that world is pointed at.

	PASS 55. A sent creature's card (`sentSiteId`) keeps its strip. The column of the world it
	went to is its own forecast there (`sentCell`, the engine's { hold, downed, before }): the
	bar is what the Clash would leave it, the hatched run above is what the Clash would take,
	and a cross stands in for the number when it would fall. A swift creature that may still
	step to another world (`moveRow`, fitTable's moves) shows, in the other columns, what the
	move would do across the frame, striped like every other "would be" on the table.

	PASS 57, THE COLUMN SAYS WHY (docs/design/reclamation-attention-and-why.md). A column is
	stacked from what makes it, bottom up, on one scale for the whole bench (`scale`,
	fitScale()):

	  own      the creature itself, what it would still stand with after the Clash, in the
	           world's color
	  lost     hatched red on top of it: what the Clash would take off it
	  allies   lighter: what it would add to your creatures already there
	  taken    brass, the rival's color: what it would take off the rival there, so a column
	           grows the moment a rival arrives and shows by what

	The solid parts add up to the number. A dashed line across the three columns marks its
	body, what it holds at a world that neither favors nor strains it, so a column that
	stands above the line was lifted by the world and one below it was cut; under each column
	a row of marks says by what: a house on its home world, a flame, a snowflake or a
	breath where the world is too hot, too cold or the wrong air, two figures where company
	moves it, a cross where it would fall.
*/
function FallsMark() {
	return <svg className="rec-fit-falls" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>;
}

function swingNumber(swing) {
	return swing < -0.5 ? `\u2212${formatHoldShown(-swing)}` : formatHoldShown(Math.max(0, swing));
}

const CLIMATE_WORDS = {
	hot: 'too hot for it here',
	cold: 'too cold for it here',
	breath: 'it cannot breathe here',
	medium: 'the wrong air or water for it here',
	strained: 'the world strains it',
};

/*
	WhyMarks: the reasons a creature's hold here is what it is, as marks. The same marks on a
	card's column, on the lifted creature's preview on a world, and on a creature standing on
	a world. `reasons` is a fit cell (or anything with { home, climate, company, falls }).
*/
export function whyWords(reasons) {
	const r = reasons || {};
	const out = [];
	if (r.home) out.push('its home world: it holds half again as much here');
	if (r.climate) out.push(`${CLIMATE_WORDS[r.climate.cause] || CLIMATE_WORDS.strained}: it holds ${r.climate.level === 'severe' ? 'a quarter' : 'half'} of what it would`);
	if (r.company) out.push(`the creatures with it here ${r.company > 0 ? 'add' : 'take'} ${formatHold(Math.abs(r.company))}`);
	if (r.falls) out.push('the Clash would drive it to nothing');
	return out;
}

const upperFirst = (text) => text.replace(/^./, (c) => c.toUpperCase());

export function WhyMarks({ reasons, className }) {
	const r = reasons || {};
	const marks = [];
	if (r.home) {
		marks.push(<span className="rec-why rec-why--home" key="home" data-why="home" title="Home world: it holds half again as much here"><HomeGlyph /></span>);
	}
	if (r.climate) {
		const cause = r.climate.cause || 'strained';
		marks.push(
			<span
				className={`rec-why rec-why--climate rec-why--${cause} rec-why--level-${r.climate.level}`}
				key="climate"
				data-why={cause}
				data-why-level={r.climate.level}
				title={`${upperFirst(CLIMATE_WORDS[cause] || CLIMATE_WORDS.strained)}: it holds ${r.climate.level === 'severe' ? 'a quarter' : 'half'} of what it would`}
			>
				{(cause === 'breath' || cause === 'medium') && r.climate.medium
					? <NoMediumGlyph medium={r.climate.medium} />
					: <StrainGlyph cause={cause === 'strained' ? 'medium' : cause} />}
			</span>,
		);
	}
	if (r.company) {
		marks.push(<span className={`rec-why rec-why--company rec-why--company-${r.company > 0 ? 'up' : 'down'}`} key="company" data-why="company" title={`The creatures with it here ${r.company > 0 ? 'add' : 'take'} ${formatHold(Math.abs(r.company))}`}><CompanyGlyph /></span>);
	}
	if (r.falls) {
		marks.push(<span className="rec-why rec-why--falls" key="falls" data-why="falls" title="The Clash would drive it to nothing"><FallsGlyph /></span>);
	}
	return <span className={`rec-whys${className ? ` ${className}` : ''}`} aria-hidden="true">{marks}</span>;
}

// the stacked parts of a column, as fractions of the bench's scale, bottom up
function stackOf(cell, scale) {
	const s = scale > 0 ? scale : FIT_SCALE;
	const parts = [['own', cell.own], ['lost', cell.toll], ['allies', cell.allies], ['taken', cell.taken]];
	let at = 0;
	const style = {};
	parts.forEach(([key, value]) => {
		const v = Math.max(0, value || 0);
		const from = Math.min(1, at / s);
		const to = Math.min(1, (at + v) / s);
		style[`--p-${key}-at`] = from.toFixed(4);
		style[`--p-${key}`] = Math.max(0, to - from).toFixed(4);
		at += v;
	});
	return { style, over: at > s + EPS };
}

export function FitStrip({ sites, row, sentSiteId, sentCell, moveRow, focusSiteId, off, scale, newsSiteId }) {
	const s = scale > 0 ? scale : FIT_SCALE;
	const anyCell = row ? sites.map((site) => row[site.id]).find(Boolean) : null;
	const body = anyCell && typeof anyCell.body === 'number' ? clamp01(anyCell.body / s) : null;
	return (
		<span className={`rec-fit${off ? ' rec-fit--off' : ''}`} data-fit data-fit-scale={s} aria-hidden="true" style={body !== null ? { '--fit-body': body.toFixed(4) } : undefined}>
			{sites.map((site) => {
				const classes = ['rec-fit-col', `g-el-${site.world.element}`];
				if (focusSiteId) {
					classes.push(focusSiteId === site.id ? 'rec-fit-col--focus' : 'rec-fit-col--dim');
				}
				if (newsSiteId && newsSiteId === site.id) {
					classes.push('rec-fit-col--news');
				}
				if (sentSiteId && sentSiteId === site.id) {
					const falls = !!(sentCell && sentCell.downed);
					const kept = sentCell && !falls ? sentCell.hold : 0;
					const going = sentCell ? Math.max(sentCell.before || 0, kept) : 0;
					const { style } = stackOf({ own: kept, toll: Math.max(0, going - kept) }, s);
					classes.push('rec-fit-col--sent');
					if (falls) classes.push('rec-fit-col--falls');
					return (
						<span className={classes.join(' ')} key={site.id} style={style} data-fit-site={site.id} data-fit-sent={sentCell ? (falls ? 'falls' : sentCell.hold.toFixed(1)) : ''}>
							<span className="rec-fit-num g-mono">{sentCell ? (falls ? <FallsMark /> : formatHoldShown(sentCell.hold)) : ''}</span>
							<span className="rec-fit-well">
								<span className="rec-fit-part rec-fit-part--own" />
								<span className="rec-fit-part rec-fit-part--lost" />
							</span>
							<span className="rec-whys rec-fit-why" />
						</span>
					);
				}
				if (sentSiteId) {
					const move = moveRow && moveRow[site.id];
					if (!move) {
						classes.push('rec-fit-col--gone');
						return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well" /><span className="rec-whys rec-fit-why" /></span>;
					}
					classes.push('rec-fit-col--move');
					if (move.swing < -EPS) classes.push('rec-fit-col--hurts');
					const { style } = stackOf({ own: Math.max(0, move.swing) }, s);
					return (
						<span className={classes.join(' ')} key={site.id} style={style} data-fit-site={site.id} data-fit-move={move.swing.toFixed(2)}>
							<span className="rec-fit-num g-mono">{swingNumber(move.swing)}</span>
							<span className="rec-fit-well"><span className="rec-fit-part rec-fit-part--own" /></span>
							<span className="rec-whys rec-fit-why" />
						</span>
					);
				}
				const cell = row && row[site.id];
				if (!cell) {
					classes.push('rec-fit-col--none');
					return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well" /><span className="rec-whys rec-fit-why" /></span>;
				}
				const { style, over } = stackOf(cell, s);
				const tick = cell.deficit > EPS ? clamp01(cell.deficit / s) : null;
				if (cell.takes) classes.push('rec-fit-col--takes');
				else if (tick !== null) classes.push('rec-fit-col--short');
				if (over) classes.push('rec-fit-col--over');
				if (cell.swing < -EPS) classes.push('rec-fit-col--hurts');
				if (cell.taken > EPS) classes.push('rec-fit-col--fights');
				if (tick !== null) style['--fit-tick'] = tick.toFixed(4);
				return (
					<span
						className={classes.join(' ')}
						key={site.id}
						style={style}
						data-fit-site={site.id}
						data-fit-swing={cell.swing.toFixed(2)}
						data-fit-parts={[cell.own, cell.toll, cell.allies, cell.taken].map((v) => (v || 0).toFixed(1)).join('/')}
						data-fit-takes={cell.takes ? '' : undefined}
					>
						{/* the number sits on its column: what this send would move that world, the same unit as the totals on the world's line */}
						<span className="rec-fit-num g-mono">{swingNumber(cell.swing)}</span>
						<span className="rec-fit-well">
							<span className="rec-fit-part rec-fit-part--own" />
							<span className="rec-fit-part rec-fit-part--lost" />
							<span className="rec-fit-part rec-fit-part--allies" />
							<span className="rec-fit-part rec-fit-part--taken">
								{cell.taken >= Math.max(3, s * 0.14) && <i className="rec-fit-part-num g-mono">{formatHoldShown(cell.taken)}</i>}
							</span>
							{tick !== null && <span className="rec-fit-tick" />}
						</span>
						<WhyMarks reasons={cell} className="rec-fit-why" />
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
		const taken = cell.taken > EPS ? `, ${formatHold(cell.taken)} of it off the rival there` : '';
		const why = whyWords(cell);
		return `${site.world.planet} ${move}${lead}${taken}${why.length ? ` (${why.join('; ')})` : ''}`;
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
