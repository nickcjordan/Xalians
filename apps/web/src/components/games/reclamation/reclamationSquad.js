import React from 'react';
import XalianImage from '../../xalianImage';
import XalianTypeSymbolBadge from '../duel/board/xalianTypeSymbolBadge';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { InfoGlyph, HiddenGlyph, RoleGlyph, PIECE_RIM } from './reclamationGlyphs';
import { speciesLabel, roleSentence, rolePower, formatBlow, formatHold, formatHoldShown, matchupWords } from './reclamationNarration';
import { elementOf } from './reclamationVocabulary';
import { whyWords, factorText } from './reclamationInstruments';
import { matchupsAt, blowsAt } from './reclamationPreview';
import { prepare, speedOf } from '@xalians/rules/expedition/creatureOnTable';

/*
	PASS 75, THE SQUAD AS A ROSTER (docs/design/reclamation-squad-roster.md). Nick, 2026-09-29:
	"I think you need to take the concept of this card and redesign it ... I don't want you to
	reuse any of the pieces just for the sake of reusing them ... It has a bunch of tiny little
	icons crammed into the bottom of the card ... after you're a round deep, all the cards still
	show, and there's no organization as to ordering the cards".

	Every turn asks one question: which creature, to which world. So the squad is a roster of the
	creatures you can still send, one row each, with a column per world lined up under the
	worlds' own symbols, so a column reads down the squad ("who holds most on Zolton") without
	pointing at anything. A world's cell is a miniature of that world's bar: what the creature
	would add there, its bar on one scale for the squad, the rival's mark to pass, at most one
	arrow for what the world did to its hold and at most one factor for the element chart against
	the rivals already there. Creatures sent, holding, fallen or spent leave the roster for the
	squad's head (SquadGone). The order is by act and attack, or by what each would add at a world
	when that world's symbol is pressed; it sorts facts and suggests nothing.
*/

const EPS = 0.05;

/*
	slotStateOf(record, view, you) -> where a creature of your squad is: 'hand' (can still be
	sent), 'sent' (on a world this round, with the site), 'holding' (won its world in an
	earlier round and stays there), 'downed' (fell in a Clash) or 'away' (spent on a world
	that was lost or tied). Moved here from the pass 4 roster rail, which nothing drew any more.
*/
export function slotStateOf(record, view, you) {
	const me = view.players[you];
	if ((me.roster || []).some((r) => r.id === record.id)) {
		return { state: 'hand' };
	}
	for (const site of view.frame.sites) {
		if ((view.board[site.id][you] || []).some((e) => e.recordId === record.id)) {
			return { state: 'sent', site };
		}
	}
	if ((me.holding || []).includes(record.id)) {
		return { state: 'holding' };
	}
	if ((me.downed || []).includes(record.id)) {
		return { state: 'downed' };
	}
	return { state: 'away' };
}
// strikers first, then sweepers, then the two that never strike
const ACT_ORDER = { strike: 0, sweep: 1, shield: 2, bolster: 3 };
/*
	PASS 76, round 7. The act is the choice a player makes, so its name is printed beside its glyph
	(Nick, 2026-09-30: "those words are descriptive of different actions ... we don't necessarily
	need to abstract those actions away into icons"). Six rounds of readers guessed every glyph right
	and could not confirm one; the word here confirms the glyph wherever else it appears.
*/
const ACT_WORDS = { strike: 'strike', sweep: 'sweep', bolster: 'mend', shield: 'guard' };

/*
	What a row reads off the engine once: its act, the number that act carries, its speed. The
	number is the creature's own, on no world: read at the round's first world it carried that
	world's strain, so it changed from round to round and sat beside an even cell's larger blow
	(pass 76, round 2). Each world's cell prints the blow as that world leaves it.
*/
export function readOf(record, view) {
	const prepared = prepare(record, null, null, 0, { rules: view.rules });
	return {
		role: prepared.role,
		power: rolePower(prepared, view.rules),
		speed: speedOf(record),
		stealthy: !!prepared.stealthy,
	};
}

/*
	squadOrder(records, reads) -> records in the order the tiles are listed: by act, then the
	strongest attack, then the name.
*/
export function squadOrder(records, reads) {
	return [...records].sort((a, b) => {
		const ra = reads[a.id] || {};
		const rb = reads[b.id] || {};
		const act = (ACT_ORDER[ra.role] ?? 9) - (ACT_ORDER[rb.role] ?? 9);
		if (act !== 0) return act;
		const power = (rb.power || 0) - (ra.power || 0);
		if (Math.abs(power) > 1e-9) return power;
		return speciesLabel(a).localeCompare(speciesLabel(b));
	});
}

/*
	cellFacts(cell) -> what one world's block draws:
		gain    what your side there would gain, the ghost's "+N"
		body    the creature's natural health, the tick on the bar's scale
		shift   'up' where the world lifted its hold above its normal hold, 'down' where it cut it
		takes   whether the send alone would give you more there than the rival
*/
export function cellFacts(cell) {
	if (!cell) {
		return null;
	}
	const own = cell.own || 0;
	const body = typeof cell.body === 'number' ? cell.body : own;
	// an arrow only for a lift or cut that matters: a tenth of the normal hold and a whole point
	const bar = Math.max(1, 0.1 * body);
	const shift = own - body >= bar ? 'up' : body - own >= bar ? 'down' : null;
	return { gain: cell.gain, body, shift, takes: !!cell.takes };
}

// the words behind a cell, for its title: what it adds, what the world did, the chart there
function cellTitle(site, cell, facts, matchups) {
	const parts = [`${site.world.planet}: adds ${formatHold(Math.max(0, facts.gain))}${facts.gain < -EPS ? `, costs your creatures there ${formatHold(-facts.gain)}` : ''}`];
	const why = whyWords(cell);
	if (why.length) parts.push(why.join('; '));
	(matchups || []).filter((m) => m.dealt).forEach((m) => parts.push(`its blows land ${factorText(m.dealt)} on ${m.name} (${matchupWords(m.dealt, null, null) || ''})`.replace(' ()', '')));
	if ((cell.clear || 0) > EPS) parts.push(`the rival holds ${formatHold(cell.clear)} more there than you now`);
	return parts.join('. ');
}

// the largest blow it would land on a rival at a world, and on whom; null when none stands there (a sweep's lands include your own, which do not count)
export function blowTargetAt(view, record, site, you, role) {
	if (role !== 'strike' && role !== 'sweep') {
		return null;
	}
	const { lands } = blowsAt(view, record, site, you, view.players[you].sentCount);
	let best = null;
	Object.entries(lands).forEach(([recordId, l]) => {
		if (!l.mine && (!best || l.power > best.power)) {
			best = { power: l.power, recordId };
		}
	});
	if (!best) {
		return null;
	}
	const theirs = flattenBoardRecord(view, site, best.recordId);
	// how many rival creatures the blow could land on: with one, the target needs no badge
	const among = Object.values(lands).filter((l) => !l.mine).length;
	return { ...best, element: elementOf(theirs), among };
}

// the record of a creature standing at a world (the blow's target), from the public board
function flattenBoardRecord(view, site, recordId) {
	const seats = (view.board && view.board[site.id]) || {};
	for (const seat of Object.keys(seats)) {
		const hit = (seats[seat] || []).find((e) => e.record && e.record.id === recordId);
		if (hit) {
			return hit.record;
		}
	}
	return null;
}

export function blowAt(view, record, site, you, role) {
	const t = blowTargetAt(view, record, site, you, role);
	return t ? t.power : null;
}

/*
	PASS 77: the squad as health-first tiles (Nick, 2026-09-30). One tile per creature you can still
	send. Health leads: three blocks, one per world in the frame's order, each the "+N" the creature
	would add there in the world's color with its bar under it on one scale for the whole squad, and
	a thin light tick at the creature's own natural health on that scale. The attack rides small and
	quiet on the tile's top line. Pointing at a world adds the creature's blow there to that line.
*/
function WorldBlock({ site, cell, facts, matchups, scale, focus }) {
	const classes = ['rec-squad-cell', `g-el-${site.world.element}`];
	if (!facts) {
		classes.push('rec-squad-cell--none');
		return <span className={classes.join(' ')} data-fit-site={site.id} />;
	}
	if (facts.takes) classes.push('rec-squad-cell--takes');
	if (facts.gain < -EPS) classes.push('rec-squad-cell--costs');
	if (focus && focus === site.id) classes.push('rec-squad-cell--focus');
	const s = scale > 0 ? scale : 24;
	const fill = Math.max(0, Math.min(1, Math.max(0, facts.gain) / s));
	const tick = Math.max(0, Math.min(1, facts.body / s));
	// signed as the creature pointed at prints it on the world ("+12"): what it would add there, not a strength of its own
	const shown = facts.gain < -0.5 ? `−${formatHoldShown(-facts.gain)}` : `+${formatHoldShown(Math.max(0, facts.gain))}`;
	return (
		<span
			className={classes.join(' ')}
			data-fit-site={site.id}
			data-fit-gain={facts.gain.toFixed(2)}
			data-fit-takes={facts.takes ? '' : undefined}
			title={cellTitle(site, cell, facts, matchups)}
			style={{ '--sq-fill': fill.toFixed(4), '--sq-tick': tick.toFixed(4) }}
		>
			<span className="rec-squad-cell-read">
				<b className="rec-squad-num g-mono">{shown}</b>
				{facts.shift && <i className={`rec-squad-shift rec-squad-shift--${facts.shift}`} data-shift={facts.shift} aria-hidden="true">{facts.shift === 'up' ? '▲' : '▼'}</i>}
			</span>
			<span className="rec-squad-bar" aria-hidden="true">
				<span className="rec-squad-fill" />
				<span className="rec-squad-tick" />
			</span>
		</span>
	);
}

/*
	A creature sent this round keeps its tile until the round is ruled, so a send moves nothing on
	the table (pass 36's rule): the tile goes quiet, and only the block of the world it went to
	carries its number, what it holds there as the sends stack. The roster closes up between rounds.
*/
function SentBlock({ site, hold, scale }) {
	const s = scale > 0 ? scale : 24;
	const fill = Math.max(0, Math.min(1, (hold || 0) / s));
	return (
		<span className={`rec-squad-cell rec-squad-cell--sent g-el-${site.world.element}`} data-fit-site={site.id} data-fit-sent={(hold || 0).toFixed(1)} title={`On ${site.world.planet} this round, holding ${formatHold(hold || 0)} as the sends stand`} style={{ '--sq-fill': fill.toFixed(4) }}>
			<span className="rec-squad-cell-read"><b className="rec-squad-num g-mono">{formatHoldShown(hold || 0)}</b></span>
			<span className="rec-squad-bar" aria-hidden="true"><span className="rec-squad-fill" /></span>
		</span>
	);
}

function Tile({ record, read, view, you, sites, fitRow, scale, focusSiteId, armed, disabled, kept, sentSite, sentHold, advanced, onArm, onInspect, onHover }) {
	const el = elementOf(record);
	const opponent = you === 'A' ? 'B' : 'A';
	const roleLine = roleSentence(read.role, read.power);
	const classes = ['rec-squad-row'];
	if (armed) classes.push('rec-squad-row--armed');
	if (disabled) classes.push('rec-squad-row--off');
	if (kept) classes.push('rec-squad-row--kept');
	if (sentSite) classes.push('rec-squad-row--sent');
	const active = !kept && !disabled && !sentSite;
	// pointing at a world adds this creature's blow there to its attack line; a mender or an empty world adds nothing
	const hoverSite = !kept && !sentSite ? sites.find((s) => s.id === focusSiteId) : null;
	const hoverBlow = hoverSite ? blowAt(view, record, hoverSite, you, read.role) : null;
	return (
		<div className={classes.join(' ')} role="listitem" data-slot={record.id} data-slot-state={sentSite ? 'sent' : kept ? 'reserve' : 'hand'}>
			<button
				type="button"
				className="rec-squad-main"
				onClick={() => active && onArm && onArm(record.id)}
				onMouseEnter={() => onHover && onHover(record.id)}
				onMouseLeave={() => onHover && onHover(null)}
				onFocus={() => onHover && onHover(record.id)}
				onBlur={() => onHover && onHover(null)}
				aria-pressed={armed}
				disabled={kept || !!sentSite}
				data-arm={active ? record.id : undefined}
				title={sentSite
					? `${speciesLabel(record)}: on ${sentSite.world.planet} this round. ${roleLine}.`
					: kept
						? `${speciesLabel(record)}: kept in reserve. Eleven sends from a squad of twelve, so one creature always stays back; unsent creatures break a tie in worlds.`
						: `${speciesLabel(record)}${armed ? ', lifted: press a world to send it there, or press it again to set it down' : ': press to lift it, then press a world'}. ${roleLine}.`}
			>
				<span className="rec-squad-top">
					<span className="rec-squad-art" aria-hidden="true">
						<XalianImage variant="token" speciesName={record.species} primaryType={el} padding="0px" fill="black" filter={pieceShadowFilter(PIECE_RIM, 28)} moreClasses="rec-squad-img" />
						{el && <XalianTypeSymbolBadge size={12} type={el} classes="rec-squad-disc" />}
					</span>
					<span className="rec-squad-id">
						<span className="rec-squad-act" title={roleLine} data-role={read.role}>
							<RoleGlyph role={read.role} />
							<span className="rec-squad-act-word" data-act-word={read.role}>{ACT_WORDS[read.role] || ''}</span>
							{typeof read.power === 'number' && <b className="g-mono" data-plinth-power={formatBlow(read.power)}>{formatBlow(read.power)}</b>}
							{advanced && <i className="rec-squad-speed g-mono" title="Speed: the faster attacks land first when the worlds resolve">{Math.round(read.speed)}</i>}
							{hoverSite && hoverBlow !== null && (
								<span className={`rec-squad-hover g-el-${hoverSite.world.element}`}>
									<i className="rec-squad-hover-to" aria-hidden="true">→</i>
									<b className="g-mono" data-hover-blow={formatBlow(hoverBlow)}>{formatBlow(hoverBlow)}</b>
								</span>
							)}
						</span>
						<span className="rec-squad-name">
							{speciesLabel(record)}
							{read.stealthy && <span className="rec-squad-hidden" title="Stealthy: arrives hidden"><HiddenGlyph /></span>}
						</span>
					</span>
				</span>
				<span className="rec-squad-blocks">
					{sites.map((site) => {
						if (sentSite) {
							return site.id === sentSite.id
								? <SentBlock key={site.id} site={site} hold={sentHold} scale={scale} />
								: <span key={site.id} className={`rec-squad-cell rec-squad-cell--none g-el-${site.world.element}`} data-fit-site={site.id} />;
						}
						const cell = fitRow ? fitRow[site.id] : null;
						const matchups = cell ? matchupsAt(view, site, record, read.role, opponent) : [];
						return <WorldBlock key={site.id} site={site} cell={cell} facts={cellFacts(cell)} matchups={matchups} scale={scale} focus={kept ? null : focusSiteId} />;
					})}
				</span>
			</button>
			<button type="button" className="rec-squad-read" onClick={(e) => { e.stopPropagation(); onInspect && onInspect(record); }} title="Read this creature's dossier" aria-label={`Read ${speciesLabel(record)}'s dossier`} data-read={record.id}>
				<InfoGlyph />
			</button>
		</div>
	);
}

/*
	squadScale(fits, records) -> the one scale for the whole squad: the largest of every listed
	creature's gain and natural health across all worlds, so no bar or tick overruns its track.
	A creature sent this round counts at what it holds as the sends stand.
*/
export function squadScale(fits, records) {
	let top = 0;
	(records || []).forEach((record) => {
		const row = fits && fits.fits ? fits.fits[record.id] : null;
		Object.values(row || {}).forEach((cell) => {
			if (cell) {
				top = Math.max(top, cell.gain || 0, typeof cell.body === 'number' ? cell.body : cell.own || 0);
			}
		});
		const sent = fits && fits.forecast ? fits.forecast[record.id] : null;
		if (sent && typeof sent.hold === 'number') {
			top = Math.max(top, sent.hold);
		}
	});
	return top > 0 ? top : 24;
}

/*
	tilesFor(width, height, count) -> { cols, rows } the grid takes. A phone (under 500 pixels) takes
	three columns. Otherwise the fewest rows, one to three, that leave every tile at least TILE_W
	wide and TILE_H tall, filled left to right; when none does, the row count that comes closest.
*/
const TILE_W = 200;
const TILE_H = 70;
const TILE_GAP = 6;
const TILE_PAD = 8;
const PHONE_W = 500;
export function tilesFor(width, height, count) {
	const n = Math.max(1, count || 0);
	if (!(width > 0) || !(height > 0) || width < PHONE_W) {
		const cols = Math.min(3, n);
		return { cols, rows: Math.ceil(n / cols) };
	}
	let best = null;
	for (let rows = 1; rows <= 3; rows += 1) {
		const cols = Math.ceil(n / rows);
		const w = (width - 2 * TILE_PAD - TILE_GAP * (cols - 1)) / cols;
		const h = (height - 2 * TILE_PAD - TILE_GAP * (rows - 1)) / rows;
		if (w >= TILE_W && h >= TILE_H) {
			return { cols, rows };
		}
		const fit = Math.min(w / TILE_W, h / TILE_H);
		if (!best || fit > best.fit) {
			best = { cols, rows, fit };
		}
	}
	return { cols: best.cols, rows: best.rows };
}

// the roster's box, measured, so its columns follow the room it has
function useBox(ref) {
	const [box, setBox] = React.useState({ w: 0, h: 0 });
	React.useLayoutEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		const read = () => {
			const r = el.getBoundingClientRect();
			setBox((prev) => (Math.round(prev.w) === Math.round(r.width) && Math.round(prev.h) === Math.round(r.height) ? prev : { w: r.width, h: r.height }));
		};
		read();
		const observer = new ResizeObserver(read);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return box;
}

export default function ReclamationSquad({ view, you, squad, fits, armedRecordId, disabled, reserve, focusSiteId, advanced, onArm, onInspect, onHover }) {
	const ref = React.useRef(null);
	const box = useBox(ref);
	const sites = view.frame.sites;
	// in hand, and sent this round (their tiles stay until the round is ruled, so a send moves nothing)
	const slots = {};
	squad.forEach((record) => { slots[record.id] = slotStateOf(record, view, you); });
	const listed = squad.filter((record) => slots[record.id].state === 'hand' || slots[record.id].state === 'sent');
	const reads = {};
	listed.forEach((record) => { reads[record.id] = readOf(record, view); });
	const ordered = squadOrder(listed, reads);
	const { cols, rows } = tilesFor(box.w, box.h, ordered.length);
	const scale = squadScale(fits, listed);
	return (
		<div className="rec-squad" ref={ref} role="list" data-squad data-squad-cols={cols} data-squad-rows={rows} data-squad-advanced={advanced ? '' : undefined} style={{ '--sq-cols': cols, '--sq-rows': rows }}>
			{ordered.map((record) => (
				<Tile
					key={record.id}
					record={record}
					read={reads[record.id]}
					view={view}
					you={you}
					sites={sites}
					fitRow={fits && fits.fits ? fits.fits[record.id] : null}
					scale={scale}
					focusSiteId={focusSiteId}
					armed={armedRecordId === record.id}
					disabled={disabled}
					kept={reserve && slots[record.id].state === 'hand'}
					sentSite={slots[record.id].state === 'sent' ? slots[record.id].site : null}
					sentHold={fits && fits.forecast && fits.forecast[record.id] ? fits.forecast[record.id].hold : null}
					advanced={advanced}
					onArm={onArm}
					onInspect={onInspect}
					onHover={onHover}
				/>
			))}
		</div>
	);
}

/*
	SquadGone: your creatures that have left the roster, as faded silhouettes in the squad's head,
	so you keep count of who is spent without a card each. On a world they carry its color under
	them; a fallen one is crossed; a spent one is plain.
*/
const GONE_ORDER = { sent: 0, holding: 1, downed: 2, away: 3 };
const GONE_WORDS = {
	sent: (slot) => `on ${slot.site.world.planet} this round`,
	holding: () => 'won its world in an earlier round, and stays there',
	downed: () => 'fell in a Clash, out of the game',
	away: () => 'spent on a world that was lost or tied, out of the game',
};
export function SquadGone({ view, you, squad, heldWorlds }) {
	// a creature sent this round still has its row; the head keeps the rounds before
	const gone = squad
		.map((record) => ({ record, slot: slotStateOf(record, view, you) }))
		.filter((g) => g.slot.state !== 'hand' && g.slot.state !== 'sent')
		.sort((a, b) => (GONE_ORDER[a.slot.state] ?? 9) - (GONE_ORDER[b.slot.state] ?? 9));
	if (gone.length === 0) {
		return null;
	}
	return (
		<div className="rec-squad-gone" data-squad-gone={gone.length}>
			{gone.map(({ record, slot }) => {
				// the view names who holds a world, not which one: the Ruling log does (heldWorlds)
				const held = slot.state === 'holding' && heldWorlds ? heldWorlds[record.id] : null;
				const world = slot.site ? slot.site.world.element : held ? held.element : null;
				const el = elementOf(record);
				const words = held ? `won ${held.planet} in an earlier round, and stays there` : (GONE_WORDS[slot.state] || GONE_WORDS.away)(slot);
				return (
					<span
						key={record.id}
						className={`rec-squad-token rec-squad-token--${slot.state}${world ? ` g-el-${world}` : ''}`}
						title={`${speciesLabel(record)}: ${words}`}
						data-gone={slot.state}
					>
						<XalianImage variant="token" speciesName={record.species} primaryType={el} padding="0px" fill="black" moreClasses="rec-squad-token-img" />
						{/* the badge the creature's row wore, so a token matches its silhouette and disc */}
						{el && <XalianTypeSymbolBadge size={12} type={el} classes="rec-squad-token-disc" />}
						{slot.state === 'downed' && <svg className="rec-squad-token-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>}
						{/* a creature holding a world stands under the flag its win planted, the one the head's count draws */}
						{slot.state === 'holding' && (
							<i className="rec-flag rec-flag--lit rec-squad-token-flag" data-token-flag>
								<svg viewBox="0 0 12 14" aria-hidden="true"><path className="rec-flag-staff" d="M2.5 13.5V1" /><path className="rec-flag-cloth" d="M2.5 1.5h8L8.3 4.8l2.2 3.3h-8z" /></svg>
							</i>
						)}
					</span>
				);
			})}
		</div>
	);
}
