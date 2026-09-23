import React from 'react';
import { formatHold, formatHoldShown, wholeOrTenths } from './reclamationNarration';
import { FIT_SCALE, HOLD_BAR_SCALE, frontFraction } from './reclamationFit';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	The table's instruments, so whose a thing is and how much it counts are read from where
	it sits, its color and its length, not from a label:

	  FrontLine   a world's field split into the rival's ground (above, brass) and yours
	              (below, cyan) where the two totals put the line, the totals on it
	  HoldBar     a creature's hold as a bar in its side's color, the part the Clash is
	              forecast to take striped at its end
	  FitStrip    three columns on a bench card, one per world in world order: how much
	              sending it there now moves that world your way, with the rival's lead
	              ticked where the rival has one
	  RoundTrack  the game's nine worlds, three rounds of three, filled by who won them
	  ScorePips   the rival's row of five above yours
	  SendPips    the sends you have left

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
	FrontLine: `theirs` and `mine` are the totals the line stands on now; `preview`, when a
	creature is pointed at or lifted, is { theirs, mine } with it sent here, and the line
	moves there with the ground it would change hatched.
*/
export function FrontLine({ siteId, theirs, mine, preview }) {
	const at = frontFraction(theirs, mine);
	const next = preview ? frontFraction(preview.theirs, preview.mine) : null;
	const shown = preview ? next : at;
	if (shown === null) {
		return <span className="rec-front rec-front--empty" data-front={siteId} data-front-lead="empty" aria-hidden="true" />;
	}
	const t = preview ? preview.theirs : theirs;
	const m = preview ? preview.mine : mine;
	const lead = leadOf(t, m);
	const [shownTheirs, shownMine] = wholeOrTenths(t, m);
	const was = at === null ? (preview ? 0.5 : shown) : at;
	const gain = preview ? (shown < was - 0.002 ? 'mine' : shown > was + 0.002 ? 'theirs' : null) : null;
	const style = {
		'--front': (shown * 100).toFixed(2),
		'--front-was': (was * 100).toFixed(2),
		'--front-lo': (Math.min(shown, was) * 100).toFixed(2),
		'--front-hi': (Math.max(shown, was) * 100).toFixed(2),
	};
	// the totals are the ground's sibling, not its child, so they stand above the figures and the preview
	return (
		<>
			<span
				className={`rec-front rec-front--${lead}${preview ? ' rec-front--preview' : ''}${gain ? ` rec-front--gain-${gain}` : ''}`}
				style={style}
				data-front={siteId}
				data-front-lead={lead}
				data-front-at={shown.toFixed(3)}
				aria-hidden="true"
			>
				<span className="rec-front-ground rec-front-ground--theirs" />
				<span className="rec-front-ground rec-front-ground--mine" />
				{gain && <span className="rec-front-gain" />}
				{preview && at !== null && <span className="rec-front-was" />}
				<span className="rec-front-line" />
			</span>
			<span className={`rec-front-totals rec-front-totals--${lead}${preview ? ' rec-front-totals--preview' : ''}`} style={style} data-front-totals={siteId} aria-hidden="true">
				<b className="rec-front-total rec-front-total--theirs" data-front-total="theirs">{shownTheirs}</b>
				<b className="rec-front-total rec-front-total--mine" data-front-total="mine">{shownMine}</b>
			</span>
		</>
	);
}

// the words a world's line stands for, for its title and its reader's label
export function frontSentence(planet, theirs, mine) {
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
	ScorePips: each side's row, the rival's above yours: five pips for the worlds won toward
	the clinch, then the sends that side has left as a chevron and a count (a resource, read
	the way a game prints one), and a pause mark once the rival has passed this round.
*/
export function ScorePips({ mine, theirs, toClinch, rivalPassed, mySends, theirSends, worldsAhead, sendsTone }) {
	const row = (n, side) => Array.from({ length: toClinch }).map((_, i) => (
		<i className={`rec-pip rec-pip--${side}${i < n ? ' rec-pip--lit' : ''}`} key={`${i}-${i < n ? 'lit' : 'dark'}`} />
	));
	const label = `First to ${toClinch} worlds wins. The rival has ${theirs}, you have ${mine}.${rivalPassed ? ' The rival has passed this round.' : ''}`;
	return (
		<span className="rec-scoreboard" data-score>
			<span className="rec-score-row rec-score-row--theirs" data-sites-b={theirs} title={label} aria-label={label} role="img">
				{row(theirs, 'theirs')}
			</span>
			{typeof theirSends === 'number' && <SendCount left={theirSends} side="theirs" worldsAhead={worldsAhead} />}
			<span className="rec-score-passed-slot">
				{rivalPassed && <span className="rec-score-passed" data-rival-passed title="The rival has passed this round"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="2" width="2.4" height="8" /><rect x="7.1" y="2" width="2.4" height="8" /></svg></span>}
			</span>
			<span className="rec-score-row rec-score-row--mine" data-sites-a={mine} title={label} aria-label={label} role="img">{row(mine, 'mine')}</span>
			{typeof mySends === 'number' && <SendCount left={mySends} side="mine" worldsAhead={worldsAhead} tone={sendsTone} />}
			<span className="rec-score-passed-slot" />
		</span>
	);
}

export function SendCount({ left, side, worldsAhead, tone }) {
	const who = side === 'theirs' ? 'The rival has' : 'You have';
	const label = `${who} ${left} send${left === 1 ? '' : 's'} left${typeof worldsAhead === 'number' ? ` for the ${worldsAhead} world${worldsAhead === 1 ? '' : 's'} still to play` : ''}`;
	return (
		<span className={`rec-sends rec-sends--${side}${tone ? ` rec-sends--${tone}` : ''}`} title={label} aria-label={label} role="img" data-sends-left={left} data-sends-side={side}>
			<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5 5.5 6l-4 4.5M6 1.5 10 6l-4 4.5" /></svg>
			<b className="g-mono">{left}</b>
		</span>
	);
}

// the Ruling on a world: a pennant in the winner's color, the margin beside it
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
			{who !== 'tie' && !verdict.unopposed && <span className="rec-crest-by">+{formatHoldShown(typeof verdict.shownMargin === 'number' ? verdict.shownMargin : verdict.margin)}</span>}
		</span>
	);
}
