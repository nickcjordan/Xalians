import React from 'react';
import { formatHold, formatHoldShown, wholeOrTenths } from './reclamationNarration';
import { FIT_SCALE, HOLD_BAR_SCALE } from './reclamationFit';
import { HomeGlyph, StrainGlyph, CompanyGlyph, FallsGlyph, NoMediumGlyph, PieceGlyph, RoleGlyph, RivalGlyph } from './reclamationGlyphs';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments, so whose a thing is and how much it counts are read from where
	it sits and its length, not from a label (pass 60: and no longer from a side color; the
	rival's is above and yours below, and a hue is a world's):

	  Standing    a world's two bars, the rival's above yours on one scale (pass 54; it
	              replaced pass 52's FrontLine)
	  HoldBar     a creature's hold as a bar in its world's color, the part the Clash is
	              forecast to take striped at its end
	  FitStrip    three columns on a bench card, one per world in world order: what your
	              side there would gain by sending it there now, what the rival would lose
	              on a tag at the top, and the rival's remaining lead as a pointer
	              (pass 58)
	  RoundTrack  the game's nine worlds, three rounds of three, a won world filled on the
	              winner's half, the rival's top and yours bottom (pass 60)
	  ScorePips   the rival's row of five above yours, each with its turn lamp
	  SendCount   the sends each side has left: a piece, then a tick per send in fives, then
	              the count (pass 58: a bare numeral beside the pennants read as the score)

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
				{/* pass 58: a preview that takes the rival's side to nothing says so, 0, rather than leaving the number off */}
				{(t > EPS || won === 'theirs' || (preview && tb > EPS)) && (
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
	fitScale()). A dashed line across the three columns marks its body, what it holds at a
	world that neither favors nor strains it, so a column that stands above the line was
	lifted by the world and one below it was cut; under each column a row of marks says by
	what: a house on its home world, a flame, a snowflake or a breath where the world is too
	hot, too cold or the wrong air, two figures where company moves it, a cross where it
	would fall.

	PASS 58, ONE SIDE PER NUMBER (docs/design/reclamation-one-side-per-number.md). Nick,
	2026-09-24, on a card reading 34 at a world where it would hold 20 and down a rival of
	14: "Why does it show 20 plus 14? Why is it adding my health and the opponent's
	health?" Nothing on a card adds the two sides any more. The column and its number are
	your side only, in your color:

	  own      what the creature would still stand with after the Clash
	  allies   lighter: what it would add to your creatures already there
	  lost     hatched red on top: what the Clash would take off it

	and the number is own and allies, what your side there would gain. What the send would
	take off the rival is the rival's side, so it is drawn where the rival's side of a world
	is, at the top: a tag hanging from the top of the column with the rival's total there
	now and after the send, "12→0" (`room` keeps the top of every column on the bench for it
	once any card has one). The small pointer on the column's edge is what the rival would still lead by after the send: a
	column that passes it would put you ahead.
*/
function FallsMark() {
	return <svg className="rec-fit-falls" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>;
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
	if (r.selfLift) out.push(`it is a bolster, and steadies itself as it steadies its allies: ${formatHold(r.selfLift)} more`);
	if (r.falls) out.push('the Clash would drive it to nothing');
	return out;
}

const upperFirst = (text) => text.replace(/^./, (c) => c.toUpperCase());

// pass 59: a factor as the card prints it beside its mark
export function factorText(v) {
	const whole = Math.floor(v + 1e-9);
	const part = Math.round((v - whole) * 4) / 4;
	const frac = part === 0.25 ? '\u00bc' : part === 0.5 ? '\u00bd' : part === 0.75 ? '\u00be' : '';
	return `\u00d7${whole > 0 ? whole : ''}${frac || (whole > 0 ? '' : '0')}`;
}

const signed = (v) => `${v < 0 ? '\u2212' : '+'}${formatHoldShown(Math.abs(v))}`;

/*
	PASS 59. With `factors`, each mark carries what it does to the number beside it: the house
	"×1½", a flame or a snowflake "×½" (or "×¼" where it is severe), the struck air the same, company
	and a bolster's own lift as "+1". Nick could not tell what the icons meant or how a bar
	was calculated; the factor is the calculation, and the mark says what caused it.
*/
function chip(key, mark, factor) {
	return (
		<span className="rec-why-chip" key={key}>
			{mark}
			{factor && <i className="rec-why-x g-mono">{factor}</i>}
		</span>
	);
}

export function WhyMarks({ reasons, className, factors: withFactors, roomy }) {
	const r = reasons || {};
	const marks = [];
	// a creature that would fall holds nothing whatever the factors, and two marks share one narrow column:
	// the cross stands alone, and only the first mark carries its factor
	const crowded = !roomy && [r.home, r.climate, r.selfLift, r.company, r.falls].filter(Boolean).length > 1;
	let factors = withFactors && !r.falls;
	const once = (text) => {
		if (!factors) return null;
		if (crowded) factors = false;
		return text;
	};
	if (r.home) {
		marks.push(chip('home', <span className="rec-why rec-why--home" data-why="home" title="Home world: it holds half again as much here"><HomeGlyph /></span>, once(factorText(r.homeFactor || 1.5))));
	}
	if (r.climate) {
		const cause = r.climate.cause || 'strained';
		const factor = typeof r.climate.factor === 'number' ? r.climate.factor : (r.climate.level === 'severe' ? 0.25 : 0.5);
		marks.push(chip(
			'climate',
			<span
				className={`rec-why rec-why--climate rec-why--${cause} rec-why--level-${r.climate.level}`}
				data-why={cause}
				data-why-level={r.climate.level}
				title={`${upperFirst(CLIMATE_WORDS[cause] || CLIMATE_WORDS.strained)}: it holds ${r.climate.level === 'severe' ? 'a quarter' : 'half'} of what it would`}
			>
				{(cause === 'breath' || cause === 'medium') && r.climate.medium
					? <NoMediumGlyph medium={r.climate.medium} />
					: <StrainGlyph cause={cause === 'strained' ? 'medium' : cause} />}
			</span>,
			once(factorText(factor)),
		));
	}
	if (r.selfLift) {
		marks.push(chip('self', <span className="rec-why rec-why--self" data-why="self" title="A bolster steadies itself as it steadies its allies"><RoleGlyph role="bolster" /></span>, once(signed(r.selfLift))));
	}
	if (r.company) {
		marks.push(chip('company', <span className={`rec-why rec-why--company rec-why--company-${r.company > 0 ? 'up' : 'down'}`} data-why="company" title={`The creatures with it here ${r.company > 0 ? 'add' : 'take'} ${formatHold(Math.abs(r.company))}`}><CompanyGlyph /></span>, once(signed(r.company))));
	}
	if (r.falls) {
		marks.push(chip('falls', <span className="rec-why rec-why--falls" data-why="falls" title="The Clash would drive it to nothing"><FallsGlyph /></span>, null));
	}
	return <span className={`rec-whys${withFactors ? ' rec-whys--factors' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true">{marks}</span>;
}

// the stacked parts of a column, as fractions of the bench's scale, bottom up; `room` is
// the share of the column's height the parts may use (the rest is the rival's tag)
function stackOf(cell, scale, room) {
	const s = scale > 0 ? scale : FIT_SCALE;
	const r = room > 0 ? room : 1;
	const own = Math.max(0, cell.own || 0);
	const allies = cell.allies || 0;
	// a creature that costs your others something stands lower by that much, and the cost is hatched with its toll
	const solid = Math.max(0, own + Math.min(0, allies));
	const parts = [['own', solid], ['allies', Math.max(0, allies)], ['lost', Math.max(0, cell.toll || 0) + (own - solid)]];
	let at = 0;
	const style = {};
	parts.forEach(([key, value]) => {
		const from = Math.min(1, at / s);
		const to = Math.min(1, (at + value) / s);
		style[`--p-${key}-at`] = (from * r).toFixed(4);
		style[`--p-${key}`] = (Math.max(0, to - from) * r).toFixed(4);
		at += value;
	});
	return { style, over: at > s + EPS };
}

function gainNumber(gain) {
	return gain < -0.5 ? `\u2212${formatHoldShown(-gain)}` : formatHoldShown(Math.max(0, gain));
}

/*
	PASS 58: what a send would do to the rival at a world, on the rival's side of the column:
	the rival's total there now and after it ("12→0"). The first build printed the change,
	"−12", and a blind reader took a minus sign on their own card for their own loss.
*/
function RivalTag({ cell }) {
	if (!(cell.taken > EPS) || typeof cell.rivalBefore !== 'number') {
		return null;
	}
	const now = formatHoldShown(cell.rivalBefore);
	const then = formatHoldShown(Math.max(0, cell.rivalBefore - cell.taken));
	if (now === then) {
		return null;
	}
	return (
		<span className={`rec-fit-rival${cell.downs > 0 ? ' rec-fit-rival--downs' : ''}${now.length + then.length > 3 ? ' rec-fit-rival--long' : ''}`} data-fit-rival={cell.taken.toFixed(1)} data-fit-downs={cell.downs || 0}>
			<i className="g-mono">{now}<span className="rec-fit-rival-to" aria-hidden="true">{'\u2192'}</span>{then}</i>
		</span>
	);
}

export function FitStrip({ sites, row, sentSiteId, sentCell, moveRow, focusSiteId, off, scale, newsSiteId, room }) {
	const s = scale > 0 ? scale : FIT_SCALE;
	const r = room > 0 ? room : 1;
	const anyCell = row ? sites.map((site) => row[site.id]).find(Boolean) : null;
	const body = anyCell && typeof anyCell.body === 'number' ? clamp01(anyCell.body / s) * r : null;
	// one column of a send or a move: your side's gain, the rival's loss on its tag, the lead still to pass
	const column = (site, cell, classes, extra) => {
		const { style, over } = stackOf(cell, s, r);
		const clear = cell.clear > EPS ? clamp01(cell.clear / s) * r : null;
		if (cell.takes) classes.push('rec-fit-col--takes');
		else if (clear !== null) classes.push('rec-fit-col--short');
		if (over) classes.push('rec-fit-col--over');
		if (cell.gain < -EPS) classes.push('rec-fit-col--hurts');
		if (cell.taken > EPS) classes.push('rec-fit-col--fights');
		if (clear !== null) style['--fit-tick'] = clear.toFixed(4);
		return (
			<span
				className={classes.join(' ')}
				key={site.id}
				style={style}
				data-fit-site={site.id}
				data-fit-gain={cell.gain.toFixed(2)}
				data-fit-parts={[cell.own, cell.allies, cell.toll].map((v) => (v || 0).toFixed(1)).join('/')}
				data-fit-takes={cell.takes ? '' : undefined}
				{...extra}
			>
				{/* the number sits on its column: what your side there would gain, the same unit as your total on the world */}
				<span className="rec-fit-num g-mono">{gainNumber(cell.gain)}</span>
				<span className="rec-fit-well">
					<RivalTag cell={cell} />
					<span className="rec-fit-part rec-fit-part--own" />
					<span className="rec-fit-part rec-fit-part--allies" />
					<span className="rec-fit-part rec-fit-part--lost" />
					{clear !== null && <span className="rec-fit-tick" />}
				</span>
				<WhyMarks reasons={cell} className="rec-fit-why" factors />
			</span>
		);
	};
	return (
		<span className={`rec-fit${off ? ' rec-fit--off' : ''}${r < 1 ? ' rec-fit--rival-room' : ''}`} data-fit data-fit-scale={s} aria-hidden="true" style={body !== null ? { '--fit-body': body.toFixed(4), '--fit-room': r.toFixed(4) } : { '--fit-room': r.toFixed(4) }}>
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
					const { style } = stackOf({ own: kept, toll: Math.max(0, going - kept) }, s, r);
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
					if (!move || typeof move.gain !== 'number') {
						classes.push('rec-fit-col--gone');
						return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well" /><span className="rec-whys rec-fit-why" /></span>;
					}
					// pass 58: a move reads like a send, at the world it would join
					classes.push('rec-fit-col--move');
					return column(site, move, classes, { 'data-fit-move': move.gain.toFixed(2) });
				}
				const cell = row && row[site.id];
				if (!cell) {
					classes.push('rec-fit-col--none');
					return <span className={classes.join(' ')} key={site.id} data-fit-site={site.id}><span className="rec-fit-num" /><span className="rec-fit-well" /><span className="rec-whys rec-fit-why" /></span>;
				}
				return column(site, cell, classes, {});
			})}
		</span>
	);
}

// the fit strip's reading in words, for the card's title: each side's part said on its own
export function fitSentence(sites, row) {
	if (!row) {
		return '';
	}
	return sites.map((site) => {
		const cell = row[site.id];
		if (!cell) {
			return null;
		}
		const parts = [];
		parts.push(cell.falls ? 'it would fall in the Clash' : `it would hold ${formatHold(cell.own)}`);
		if (cell.allies > EPS) parts.push(`add ${formatHold(cell.allies)} to your creatures there`);
		if (cell.allies < -EPS) parts.push(`cost your creatures there ${formatHold(-cell.allies)}`);
		if (cell.toll > EPS && !cell.falls) parts.push(`the Clash would take ${formatHold(cell.toll)} off it`);
		const rival = cell.taken > EPS
			? `; the rival would lose ${formatHold(cell.taken)} there${cell.downs > 0 ? ` (${cell.downs === 1 ? 'one creature downed' : `${cell.downs} creatures downed`})` : ''}`
			: '';
		const mine = cell.after ? cell.after.mine : 0;
		const theirs = cell.after ? cell.after.theirs : 0;
		const lead = mine - theirs > EPS ? `you would lead ${formatHold(mine)} to ${formatHold(theirs)}`
			: theirs - mine > EPS ? `the rival would still lead ${formatHold(theirs)} to ${formatHold(mine)}`
				: 'level';
		const why = whyWords(cell);
		return `${site.world.planet}: ${parts.join(', ')}${rival}; ${lead}${why.length ? ` (${why.join('; ')})` : ''}`;
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

	PASS 54. Whose move it is is a pointer at the head of that side's row, pulsing (the turn
	marker a board game passes across the table), in place of the "Your
	move" and "Rival's move" words; the other row's head is empty. The sends left are a
	row of ticks, one per send the game allows, lit for each one still to spend, with the
	count after them, in place of a chevron and a bare number.

	PASS 60. With the side colors gone the two rows differ only by place, and a blind reader
	had to count sends against the squad to be sure which row was theirs. So the rival's row
	carries the rival's own emblem (`rivalEmblem`, the one chosen in the lobby: the Envoy's
	hourglass, the Proctor's scales) where yours carries the piece. Hot-seat has no rival
	persona, and both rows keep the piece.
*/
export function ScorePips({ mine, theirs, toClinch, rivalPassed, mySends, theirSends, myCap, theirCap, worldsAhead, sendsTone, turn, rivalEmblem }) {
	// pass 54: each world won is a pennant, the same flag the Ruling plants on the winner's bar
	// pass 58: one world from winning, that side's last pennant burns, so the game's stakes are on the table and not only in a count
	const row = (n, side) => Array.from({ length: toClinch }).map((_, i) => (
		<i className={`rec-pip rec-pip--flag rec-pip--${side}${i < n ? ' rec-pip--lit' : ''}${i === n && n === toClinch - 1 ? ' rec-pip--point' : ''}`} key={`${i}-${i < n ? 'lit' : 'dark'}`} data-match-point={i === n && n === toClinch - 1 ? side : undefined}>
			<svg viewBox="0 0 12 14" aria-hidden="true"><path className="rec-pip-staff" d="M2.5 13.5V1" /><path className="rec-pip-cloth" d="M2.5 1.5h8L8.3 4.8l2.2 3.3h-8z" /></svg>
		</i>
	));
	const point = [theirs === toClinch - 1 ? ' The rival is one world from winning.' : '', mine === toClinch - 1 ? ' You are one world from winning.' : ''].join('');
	const label = `First to ${toClinch} worlds wins. The rival has ${theirs}, you have ${mine}.${point}${rivalPassed ? ' The rival has passed this round.' : ''}`;
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
			{typeof theirSends === 'number' ? <SendCount left={theirSends} cap={theirCap} side="theirs" worldsAhead={worldsAhead} emblem={rivalEmblem} /> : <span />}
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

export function SendCount({ left, cap, side, worldsAhead, tone, emblem }) {
	const who = side === 'theirs' ? 'The rival has' : 'You have';
	const label = `${who} ${left} send${left === 1 ? '' : 's'} left${typeof worldsAhead === 'number' ? ` for the ${worldsAhead} world${worldsAhead === 1 ? '' : 's'} still to play` : ''}`;
	const total = Math.max(typeof cap === 'number' ? cap : left, left);
	return (
		<span className={`rec-sends rec-sends--${side}${tone ? ` rec-sends--${tone}` : ''}`} title={label} aria-label={label} role="img" data-sends-left={left} data-sends-side={side}>
			{(emblem && <RivalGlyph id={emblem} className="rec-sends-emblem" />) || <PieceGlyph className="rec-sends-glyph" />}
			<span className="rec-sends-ticks" aria-hidden="true">
				{Array.from({ length: total }).map((_, i) => <i className={`rec-send-tick${i < left ? ' rec-send-tick--left' : ''}${i > 0 && i % 5 === 0 ? ' rec-send-tick--five' : ''}`} key={i} />)}
			</span>
			<b className="g-mono">{left}</b>
		</span>
	);
}

// the Ruling on a world: a pennant at the end of the winner's bar (pass 54), which shows the margin; since pass 60 the bar it rides says whose
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
