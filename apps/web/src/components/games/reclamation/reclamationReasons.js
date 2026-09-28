import React from 'react';
import { speciesLabel, formatHoldShown, matchupWords } from './reclamationNarration';
import { elementOf } from './reclamationFit';
import XalianTypeSymbolBadge from '../duel/board/xalianTypeSymbolBadge';
import { strainCause } from './reclamationPreview';
import { HomeGlyph, StrainGlyph, NoMediumGlyph, CompanyGlyph, FallsGlyph, RoleGlyph, PhaseGlyph } from './reclamationGlyphs';

/*
	PASS 61, SAY WHY (docs/design/reclamation-say-why.md). Nick, 2026-09-26, on a snowflake and
	"×½" under a creature at two worlds: "I assume that means the creature would be cold and thus
	be less successful on those places? is that right? I think in the space on each planet, for
	ones where the creature is affected by something, we need to do a better job explaining what
	that effect is and why."

	reasonLines({ why, record, site, tolerance, blows }) -> [{ key, mark, effect, cause }]: one
	line for each thing that moves the creature's number at this world, in the order the number
	is made (its home, the world's temperature or air, its will, the creatures beside it, the
	Clash), each saying what it does ("it holds half") and why ("Zolton runs −40 to 20°C;
	Hippochamp is comfortable at 5 to 35°C"). Every word comes from the engine's own facts: the
	fit cell's reasons (`why`), the creature's tolerance, the site, and the forecast's own blows
	(`blows`, forecastSendBlows). Nothing here judges the move.

	Sides, since pass 60, are said in words where there are words: a creature of yours is "your
	X", the rival's is named bare.
*/

const MEDIUM_SITE = { gas: 'is open air', liquid: 'is under water', vacuum: 'has no air at all' };
const MEDIUM_LIVES = { gas: 'air', liquid: 'water', vacuum: 'vacuum' };
const CLIMATE_KIND = { cold: 'cold', hot: 'hot', medium: 'medium', breath: 'breath' };

const degrees = (n) => `${n < 0 ? '−' : ''}${Math.abs(n)}`;
const listWords = (items) => (items.length <= 1 ? items[0] || '' : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const shown = (v) => formatHoldShown(Math.max(0, v || 0));
const upper = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');
const HOLDS = { severe: 'a quarter', strained: 'half' };
// pass 68: a world too hot or too cold takes a tenth, or a quarter far off; the air keeps its half and quarter
const TEMPERATURE_HOLDS = { severe: 'three quarters', strained: 'nine tenths' };
const holdsWord = (level, cause) => ((cause === 'cold' || cause === 'hot') ? TEMPERATURE_HOLDS : HOLDS)[level] || 'less';
const COUNT_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

// the grade the world would put it at before its will lifts one step
const rawLevel = (held, shrugged) => (!shrugged ? held : held === 'strained' ? 'severe' : held === 'none' ? 'strained' : held);

function climateLine(why, name, planet, env, tol, site) {
	const climate = why.climate || null;
	const cause = climate ? climate.cause : why.shrugged ? strainCause(tol, site) : null;
	if (!cause || !CLIMATE_KIND[cause]) {
		return null;
	}
	const held = climate ? climate.level : 'none';
	const raw = rawLevel(held, !!why.shrugged);
	let what;
	if (cause === 'cold' || cause === 'hot') {
		what = `${raw === 'severe' ? 'Far too' : 'Too'} ${cause} for it`;
	} else if (cause === 'breath') {
		what = 'It cannot breathe here';
	} else {
		what = 'The wrong air or water for it';
	}
	let effect;
	if (!why.shrugged) {
		effect = `${what}: it holds ${holdsWord(held, cause)}.`;
	} else if (held === 'none') {
		effect = `${what}, but it is willful and shrugs that off.`;
	} else {
		effect = `${what}, but it is willful: it holds ${holdsWord(held, cause)}, not ${holdsWord(raw, cause)}.`;
	}
	let because = '';
	if (cause === 'cold' || cause === 'hot') {
		const t = env.temperatureC || {};
		const own = tol.temperatureC || {};
		if ([t.min, t.max, own.min, own.max].every((n) => typeof n === 'number')) {
			// the engine's test: comfortable when its band covers at least half of the world's
			const overlap = Math.min(own.max, t.max) - Math.max(own.min, t.min);
			const how = overlap > 0 ? 'mostly' : raw === 'severe' ? 'far' : 'all of it';
			because = `${planet} runs ${degrees(t.min)} to ${degrees(t.max)}°C, ${how} ${cause === 'cold' ? 'colder' : 'hotter'} than the ${degrees(own.min)} to ${degrees(own.max)}°C ${name} is comfortable at.`;
		}
	} else if (env.medium && MEDIUM_SITE[env.medium]) {
		const media = cause === 'breath' ? tol.breathes || [] : tol.ambientMedia || [];
		const words = media.map((m) => MEDIUM_LIVES[m] || m);
		if (words.length) {
			because = `${planet} here ${MEDIUM_SITE[env.medium]}; ${name} ${cause === 'breath' ? 'breathes' : 'lives in'} ${listWords(words)}.`;
		}
	}
	return { key: 'climate', mark: cause, medium: env.medium || null, effect, cause: because };
}

/*
	PASS 62. A bolster eases the world one grade for each creature of yours at its world, itself
	included, and a creature the world does not strain gains 1 instead (holdAtSite). A blind critic
	saw "It steadies itself: +6" at one world and "+1" at the next with nothing to tell them apart:
	the six was the heat eased a grade, the one the flat lift.
*/
const EASES = { hot: 'the heat', cold: 'the cold', breath: 'the want of air', medium: 'the wrong air or water' };
function bolsterWhy(why, whose) {
	const climate = why.climate || null;
	if (climate && EASES[climate.cause]) {
		return `${whose} eases ${EASES[climate.cause]} one grade for it.`;
	}
	return `${whose} adds 1 where the world does not strain it.`;
}

function companyLines(why, record) {
	const out = [];
	const traits = Array.isArray(record && record.traits) ? record.traits : [];
	if (why.selfLift) {
		out.push({ key: 'self', mark: 'self', effect: `It steadies itself: +${shown(why.selfLift)}.`, cause: `${bolsterWhy(why, 'A bolster')} Its lift reaches every creature of yours at its world, itself included.` });
	}
	if (why.company > 0) {
		out.push(traits.includes('pack-bonded')
			? { key: 'company', mark: 'company', effect: `Pack-bonded: +${shown(why.company)}.`, cause: 'Each of its kin of yours here adds 1.' }
			: { key: 'company', mark: 'company', effect: `Steadied: +${shown(why.company)}.`, cause: bolsterWhy(why, 'A bolster of yours here') });
	} else if (why.company < 0) {
		out.push({ key: 'company', mark: 'company', effect: `Solitary: −${shown(-why.company)}.`, cause: 'Each creature of yours here costs it 1.' });
	}
	return out;
}

const whoseName = (who) => (who.mine ? `your ${who.name}` : who.name);

/*
	PASS 67. Who goes first, in every case, and what the forecast rests on. Nick, on Sonalloy
	forecast to fall to Kosanos and Tizzie forecast to beat it: "How does one of them decide that
	my creature would win the fight and the other one decides that my creature would lose?" The
	winner's words said "it acts first"; the loser's said nothing about the order. Now a blow that
	lands before the creature's own attack says so ("Kosanos is quicker and strikes it first"),
	and a bolster or a shield, which never strikes, says that nothing it does weakens the attacker
	first. And while the rival can still send, or has creatures hidden, the forecast says it holds
	only if nothing else arrives: it is the Clash on the board as you can see it, not a promise.
*/
const NEVER_STRIKES = { bolster: 'A bolster mends and never strikes', shield: 'A shield guards and never strikes' };

function clashLines(why, blows, { open, role } = {}) {
	const out = [];
	if (!blows) {
		return out;
	}
	const unless = open ? ' if nothing else arrives' : '';
	const going = Number(formatHoldShown(why.going || 0));
	const kept = Number(formatHoldShown(Math.max(0, why.own || 0)));
	const parts = [];
	const hits = (blows.taken || []).filter((blow) => blow.by);
	// what it lands on creatures it does not down (those are the downs line), with the rival's number before and after
	const hurts = (blows.dealt || []).filter((h) => !h.downs).map((h) => `${whoseName(h)} for ${formatHoldShown(h.power)}${h.chart ? ` (${h.chart})` : ''}`);
	// the order of the fight says why a blow lands less: it acts first, and an attacker already hurt lands less
	if (blows.first && (hits.length || hurts.length)) {
		parts.push(hurts.length ? `it acts first and hits ${listWords(hurts)}` : 'it acts first');
	} else if (hurts.length && !hits.length) {
		parts.push(`it hits ${listWords(hurts)}`);
	}
	(blows.taken || []).forEach((blow) => {
		if (blow.by) {
			// the fight runs in exchanges, so one attacker may land more than once
			const n = blow.count || 1;
			const sweep = blow.roles && blow.roles.includes('sweep') && !blow.roles.includes('strike');
			// pass 67: a blow that lands before its own attack says the attacker is the quicker
			const quicker = !!blow.before && blows.strikes;
			const first = quicker ? ' first' : '';
			const verb = sweep
				? (n > 1 ? `catches it${first} in ${COUNT_WORDS[n] || n} sweeps for` : `catches it${first} in a sweep for`)
				: (n > 1 ? `strikes it${first} ${n === 2 ? 'twice' : `${COUNT_WORDS[n] || n} times`} for` : `strikes it${first} for`);
			parts.push(`${whoseName({ name: blow.name, mine: blow.mine })}${blow.hurt ? ', hurt by then and so weaker,' : ''}${quicker ? ' is quicker and' : ''} ${verb} ${formatHoldShown(blow.power)}${n > 1 ? ' in all' : ''}${blow.chart ? ` (${blow.chart})` : ''}`);
		} else {
			parts.push(`it loses ${formatHoldShown(blow.power)} to ${listWords(blow.statuses && blow.statuses.length ? blow.statuses : ['its condition'])}`);
		}
	});
	// pass 67: a rival that lands first is said first, and what it lands back comes after
	if (!blows.first && hurts.length && hits.length) {
		parts.push(`then it hits ${listWords(hurts)}`);
	}
	// a creature that never attacks cannot weaken its attackers first, whatever its speed
	if (blows.strikes === false && hits.length) {
		parts.push(`${(NEVER_STRIKES[role] || 'It never strikes').replace(/^./, (c) => c.toLowerCase())}, so nothing weakens ${listWords(hits.map((b) => whoseName({ name: b.name, mine: b.mine })))} first`);
	}
	if (blows.unlifted > 0.5 && (blows.alliesDowned || []).length) {
		parts.push(`your ${listWords(blows.alliesDowned)} ${blows.alliesDowned.length === 1 ? 'falls' : 'fall'} beside it, and the lift goes with ${blows.alliesDowned.length === 1 ? 'it' : 'them'} (${formatHoldShown(blows.unlifted)})`);
	}
	// pass 69: what a support creature of yours does for it, each in its own number
	if (blows.guardedOff > 0.5) {
		parts.push(`${blows.guardByName ? `${blows.guardByName === 'itself' ? 'its own' : `your ${blows.guardByName}'s`} guard` : 'a guard'} takes ${formatHoldShown(blows.guardedOff)} off`);
	}
	if ((blows.shrugged || []).length) {
		parts.push(`${blows.steadiedByName ? (blows.steadiedByName === 'itself' ? 'it keeps itself clear' : `your ${blows.steadiedByName} keeps it clear`) : 'a bolster keeps it clear'}: no ${listWords(blows.shrugged)}`);
	}
	if (blows.recovered > 0.5) {
		parts.push(`${blows.guardByName ? (blows.guardByName === 'itself' ? 'it mends' : `your ${blows.guardByName} mends`) : 'a bolster mends'} ${formatHoldShown(blows.recovered)}`);
	}
	const because = parts.length ? `${parts.join('; ').replace(/^./, (c) => c.toUpperCase())}.` : '';
	if (blows.falls || why.falls) {
		const when = blows.fallsBeforeActing ? 'before it can act' : 'in the Clash';
		out.push({ key: 'falls', mark: 'falls', effect: `It falls ${when}${unless} (it goes in with ${going}).`, cause: because });
	} else if (going - kept > 0) {
		out.push({ key: 'clash', mark: 'clash', effect: `The Clash takes ${going - kept}${unless}.`, cause: because });
	} else if (hurts.length) {
		out.push({ key: 'hits', mark: 'clash', effect: `It hits ${listWords(hurts)}${unless}.`, cause: '' });
	}
	const downs = blows.downs || [];
	if (downs.length) {
		const late = downs.filter((d) => !d.early).map(whoseName);
		const early = downs.filter((d) => d.early).map(whoseName);
		const before = early.length ? `${listWords(early)} before ${early.length === 1 ? 'it' : 'they'} can act` : '';
		const said = late.length && before ? `${listWords(late)}, and ${before}` : late.length ? listWords(late) : before;
		// the condition is said once, on the first line of the fight
		out.push({ key: 'downs', mark: 'downs', effect: `It downs ${said}${out.length ? '' : unless}.`, cause: '' });
	}
	return out;
}

/*
	nameBlows(blows, match, seat) -> the forecast's blows with each creature named, and whether it
	is yours. A creature sent leaves its roster for the board, so names come from both.
*/
export function nameBlows(blows, match, seat, recordId = null) {
	if (!blows || !match) {
		return blows || null;
	}
	const names = {};
	const ours = new Set();
	['A', 'B'].forEach((s) => {
		((match.players[s] && match.players[s].roster) || []).forEach((r) => {
			names[r.id] = speciesLabel(r);
			if (s === seat) ours.add(r.id);
		});
		Object.values(match.board || {}).forEach((side) => (side[s] || []).forEach((e) => {
			if (e.record) names[e.recordId] = speciesLabel(e.record);
			if (s === seat) ours.add(e.recordId);
		}));
	});
	const name = (id) => names[id] || 'a creature';
	// pass 71: each creature's element, for the chart's words on a blow
	const elements = {};
	['A', 'B'].forEach((s) => {
		((match.players[s] && match.players[s].roster) || []).forEach((r) => { elements[r.id] = elementOf(r); });
		// the rival's roster is not in a handler's view; its creatures on the board are
		Object.values(match.board || {}).forEach((side) => (side[s] || []).forEach((e) => { if (e.record) elements[e.recordId] = elementOf(e.record); }));
	});
	return {
		...blows,
		taken: blows.taken.map((t) => ({ ...t, name: t.by ? name(t.by) : null, mine: !!t.by && ours.has(t.by), chart: t.by ? matchupWords(t.matchup, elements[t.by], elements[recordId]) : '' })),
		dealt: (blows.dealt || []).map((h) => ({ ...h, name: name(h.to), mine: ours.has(h.to), chart: matchupWords(h.matchup, elements[recordId], elements[h.to]) })),
		downs: blows.downs.map((id) => ({ name: name(id), mine: ours.has(id), early: (blows.downsBeforeActing || []).includes(id) })),
		alliesDowned: blows.alliesDowned.map(name),
		// pass 69: whose guard and steadying, 'itself' when the previewed creature is the support creature
		guardByName: blows.guardBy ? (blows.guardBy === recordId ? 'itself' : name(blows.guardBy)) : null,
		steadiedByName: blows.steadiedBy ? (blows.steadiedBy === recordId ? 'itself' : name(blows.steadiedBy)) : null,
	};
}

export function reasonLines({ why, record, site, tolerance, blows, settled, open, role }) {
	const w = why || {};
	const name = record ? speciesLabel(record) : 'It';
	const planet = site && site.world ? site.world.planet : 'This world';
	const env = (site && site.environment) || {};
	const tol = tolerance || {};
	const out = [];
	/*
		PASS 63. First, when it no longer matters: the rival has passed with nothing hidden and you
		lead here, so the world is yours this round whatever is sent. A blind critic sent three
		creatures into worlds won by 20 or more with nothing on the table to say so.
	*/
	if (settled && settled.side === 'mine') {
		out.push({ key: 'settled', mark: 'settled', effect: 'Already yours this round.', cause: `The rival has passed and cannot answer here; you lead by ${shown(settled.lead)}.` });
	}
	if (w.home) {
		out.push({ key: 'home', mark: 'home', effect: 'Its home world: it holds a quarter more.', cause: `${name} comes from ${planet}.` });
	}
	// pass 71: the world's element, only where it is strong against this creature's
	if (w.worldElement) {
		out.push({ key: 'element', mark: 'element', element: w.worldElement.element, effect: `A ${w.worldElement.element} world is hard on ${w.worldElement.against || 'it'}: it holds nine tenths.`, cause: `${upper(w.worldElement.element)} is strong against ${w.worldElement.against || 'its element'} on the element chart.` });
	}
	const climate = climateLine(w, name, planet, env, tol, site);
	if (climate) {
		out.push(climate);
	}
	out.push(...companyLines(w, record));
	out.push(...clashLines(w, blows, { open, role }));
	return out;
}

function ReasonMark({ line }) {
	switch (line.mark) {
		case 'home':
			return <HomeGlyph />;
		case 'element':
			return line.element ? <XalianTypeSymbolBadge size={14} type={line.element} classes="rec-why-element-disc" /> : null;
		case 'cold':
		case 'hot':
			return <StrainGlyph cause={line.mark} />;
		case 'medium':
		case 'breath':
			return line.medium ? <NoMediumGlyph medium={line.medium} /> : <StrainGlyph cause="medium" />;
		case 'company':
			return <CompanyGlyph />;
		case 'self':
			return <RoleGlyph role="bolster" />;
		case 'clash':
			// the Clash's own mark, two blows crossing, not the strike role's arrow a reader took it for
			return <PhaseGlyph kind="clash" />;
		case 'falls':
		case 'downs':
			return <FallsGlyph />;
		case 'settled':
			return <svg viewBox="0 0 24 24" className="rec-reason-flag"><path d="M6 21V3" /><path d="M6 4h12l-3 4.5L18 13H6" /></svg>;
		default:
			return null;
	}
}

// the lines, each with the mark the card and the chain carry for it, what it does, and why
export function ReasonLines({ lines, className }) {
	if (!lines || !lines.length) {
		return null;
	}
	return (
		<ul className={`rec-reasons${className ? ` ${className}` : ''}`} data-reasons>
			{lines.map((line) => (
				<li className={`rec-reason rec-reason--${line.mark}`} key={line.key} data-reason={line.key}>
					<span className={`rec-reason-mark rec-why--${line.mark}`} aria-hidden="true"><ReasonMark line={line} /></span>
					<span className="rec-reason-text">
						<b className="rec-reason-effect">{line.effect}</b>
						{line.cause && <span className="rec-reason-cause"> {line.cause}</span>}
					</span>
				</li>
			))}
		</ul>
	);
}
