import React from 'react';
import { speciesLabel, formatHoldShown } from './reclamationNarration';
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
const HOLDS = { severe: 'a quarter', strained: 'half' };
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
		effect = `${what}: it holds ${HOLDS[held] || 'less'}.`;
	} else if (held === 'none') {
		effect = `${what}, but it is willful and shrugs that off.`;
	} else {
		effect = `${what}, but it is willful: it holds ${HOLDS[held]}, not ${HOLDS[raw]}.`;
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

function companyLines(why, record) {
	const out = [];
	const traits = Array.isArray(record && record.traits) ? record.traits : [];
	if (why.selfLift) {
		out.push({ key: 'self', mark: 'self', effect: `It steadies itself: +${shown(why.selfLift)}.`, cause: 'A bolster lifts every creature of yours at its world, itself included.' });
	}
	if (why.company > 0) {
		out.push(traits.includes('pack-bonded')
			? { key: 'company', mark: 'company', effect: `Pack-bonded: +${shown(why.company)}.`, cause: 'Each of its kin of yours here adds 1.' }
			: { key: 'company', mark: 'company', effect: `Steadied: +${shown(why.company)}.`, cause: 'A bolster of yours here lifts it.' });
	} else if (why.company < 0) {
		out.push({ key: 'company', mark: 'company', effect: `Solitary: −${shown(-why.company)}.`, cause: 'Each creature of yours here costs it 1.' });
	}
	return out;
}

const whoseName = (who) => (who.mine ? `your ${who.name}` : who.name);

function clashLines(why, blows) {
	const out = [];
	if (!blows) {
		return out;
	}
	const going = Number(formatHoldShown(why.going || 0));
	const kept = Number(formatHoldShown(Math.max(0, why.own || 0)));
	const parts = [];
	const hits = (blows.taken || []).filter((blow) => blow.by);
	// what it lands on creatures it does not down (those are the downs line), with the rival's number before and after
	const hurts = (blows.dealt || []).filter((h) => !h.downs).map((h) => `${whoseName(h)} for ${formatHoldShown(h.power)}`);
	// the order of the fight says why a blow lands less: it acts first, and an attacker already hurt lands less
	if (blows.first && (hits.length || hurts.length)) {
		parts.push(hurts.length ? `it acts first and hits ${listWords(hurts)}` : 'it acts first');
	} else if (hurts.length) {
		parts.push(`it hits ${listWords(hurts)}`);
	}
	(blows.taken || []).forEach((blow) => {
		if (blow.by) {
			// the fight runs in exchanges, so one attacker may land more than once
			const n = blow.count || 1;
			const sweep = blow.roles && blow.roles.includes('sweep') && !blow.roles.includes('strike');
			const verb = sweep
				? (n > 1 ? `catches it in ${COUNT_WORDS[n] || n} sweeps for` : 'catches it in a sweep for')
				: (n > 1 ? `strikes it ${n === 2 ? 'twice' : `${COUNT_WORDS[n] || n} times`} for` : 'strikes it for');
			parts.push(`${whoseName({ name: blow.name, mine: blow.mine })}${blow.hurt ? ', hurt by then and so weaker,' : ''} ${verb} ${formatHoldShown(blow.power)}${n > 1 ? ' in all' : ''}`);
		} else {
			parts.push(`it loses ${formatHoldShown(blow.power)} to ${listWords(blow.statuses && blow.statuses.length ? blow.statuses : ['its condition'])}`);
		}
	});
	if (blows.unlifted > 0.5 && (blows.alliesDowned || []).length) {
		parts.push(`your ${listWords(blows.alliesDowned)} ${blows.alliesDowned.length === 1 ? 'falls' : 'fall'} beside it, and the lift goes with ${blows.alliesDowned.length === 1 ? 'it' : 'them'} (${formatHoldShown(blows.unlifted)})`);
	}
	if (blows.recovered > 0.5) {
		parts.push(`a bolster gives ${formatHoldShown(blows.recovered)} back`);
	}
	const because = parts.length ? `${parts.join('; ').replace(/^./, (c) => c.toUpperCase())}.` : '';
	if (blows.falls || why.falls) {
		out.push({ key: 'falls', mark: 'falls', effect: `It falls in the Clash (it goes in with ${going}).`, cause: because });
	} else if (going - kept > 0) {
		out.push({ key: 'clash', mark: 'clash', effect: `The Clash takes ${going - kept}.`, cause: because });
	} else if (hurts.length) {
		out.push({ key: 'hits', mark: 'clash', effect: `It hits ${listWords(hurts)}.`, cause: '' });
	}
	const downs = blows.downs || [];
	if (downs.length) {
		const late = downs.filter((d) => !d.early).map(whoseName);
		const early = downs.filter((d) => d.early).map(whoseName);
		const before = early.length ? `${listWords(early)} before ${early.length === 1 ? 'it' : 'they'} can act` : '';
		const said = late.length && before ? `${listWords(late)}, and ${before}` : late.length ? listWords(late) : before;
		out.push({ key: 'downs', mark: 'downs', effect: `It downs ${said}.`, cause: '' });
	}
	return out;
}

/*
	nameBlows(blows, match, seat) -> the forecast's blows with each creature named, and whether it
	is yours. A creature sent leaves its roster for the board, so names come from both.
*/
export function nameBlows(blows, match, seat) {
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
	return {
		...blows,
		taken: blows.taken.map((t) => ({ ...t, name: t.by ? name(t.by) : null, mine: !!t.by && ours.has(t.by) })),
		dealt: (blows.dealt || []).map((h) => ({ ...h, name: name(h.to), mine: ours.has(h.to) })),
		downs: blows.downs.map((id) => ({ name: name(id), mine: ours.has(id), early: (blows.downsBeforeActing || []).includes(id) })),
		alliesDowned: blows.alliesDowned.map(name),
	};
}

export function reasonLines({ why, record, site, tolerance, blows }) {
	const w = why || {};
	const name = record ? speciesLabel(record) : 'It';
	const planet = site && site.world ? site.world.planet : 'This world';
	const env = (site && site.environment) || {};
	const tol = tolerance || {};
	const out = [];
	if (w.home) {
		out.push({ key: 'home', mark: 'home', effect: 'Its home world: it holds half again.', cause: `${name} comes from ${planet}.` });
	}
	const climate = climateLine(w, name, planet, env, tol, site);
	if (climate) {
		out.push(climate);
	}
	out.push(...companyLines(w, record));
	out.push(...clashLines(w, blows));
	return out;
}

function ReasonMark({ line }) {
	switch (line.mark) {
		case 'home':
			return <HomeGlyph />;
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
