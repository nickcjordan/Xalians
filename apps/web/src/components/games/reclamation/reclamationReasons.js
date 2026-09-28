import React from 'react';
import { speciesLabel, formatHoldShown, matchupWords, articleFor } from './reclamationNarration';
import XalianTypeSymbolBadge from '../duel/board/xalianTypeSymbolBadge';
import { strainCause } from './reclamationPreview';
import { HomeGlyph, StrainGlyph, NoMediumGlyph, CompanyGlyph, RoleGlyph } from './reclamationGlyphs';

/*
	PASS 61, SAY WHY (docs/design/reclamation-say-why.md). Nick, 2026-09-26, on a snowflake and
	"×½" under a creature at two worlds: "I assume that means the creature would be cold and thus
	be less successful on those places? is that right? I think in the space on each planet, for
	ones where the creature is affected by something, we need to do a better job explaining what
	that effect is and why."

	reasonLines({ why, record, site, tolerance, matchups }) -> [{ key, mark, effect, cause }]: one
	line for each thing that moves the creature's number at this world, in the order the number
	is made (its home, the world's temperature or air, its will, the creatures beside it), each
	saying what it does ("it holds half") and why ("Zolton runs −40 to 20°C; Hippochamp is
	comfortable at 5 to 35°C"). Every word comes from the engine's own facts: the fit cell's
	reasons (`why`), the creature's tolerance and the site. Nothing here judges the move.

	PASS 72, PLACEMENT STACKS (docs/design/reclamation-placement-stacks.md). The lines no longer
	play the Clash out ("it acts first ... strikes it for 13"): nobody knows how the fight goes
	until both sides have passed. What the fight will turn on is said as a fact instead: the
	element chart between it and each rival creature already there (`matchups`, both ways).

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

/*
	PASS 72. The element chart between it and each rival creature standing here, each way on its
	own line, only where the chart is not even. Its blows on theirs first, then theirs on it.
*/
const HOW_HARD = { 0.25: 'a quarter as hard', 0.5: 'half as hard', 1.5: 'half again as hard', 2: 'twice as hard' };
const howHard = (m) => HOW_HARD[m] || `${Math.round(m * 100)} percent as hard`;

function matchupLines(matchups, record) {
	const out = [];
	const own = record ? elementOfRecord(record) : null;
	(matchups || []).forEach((m) => {
		if (m.dealt) {
			out.push({ key: `chart-dealt-${m.recordId}`, mark: 'chart', element: own, effect: `${upper(matchupWords(m.dealt, own, m.element))}.`, cause: `Its blows land ${howHard(m.dealt)} on ${m.name}.` });
		}
		if (m.taken) {
			out.push({ key: `chart-taken-${m.recordId}`, mark: 'chart', element: m.element, effect: `${upper(matchupWords(m.taken, m.element, own))}.`, cause: `${m.name}'s blows land ${howHard(m.taken)} on it.` });
		}
	});
	return out;
}

const elementOfRecord = (record) => {
	const e = record && record.element;
	return typeof e === 'string' ? e : (e && e.primary) || null;
};

export function reasonLines({ why, record, site, tolerance, matchups }) {
	const w = why || {};
	const name = record ? speciesLabel(record) : 'It';
	const planet = site && site.world ? site.world.planet : 'This world';
	const env = (site && site.environment) || {};
	const tol = tolerance || {};
	const out = [];
	if (w.home) {
		out.push({ key: 'home', mark: 'home', effect: 'Its home world: it holds a quarter more.', cause: `${name} comes from ${planet}.` });
	}
	// pass 71: the world's element, only where it is strong against this creature's
	if (w.worldElement) {
		out.push({ key: 'element', mark: 'element', element: w.worldElement.element, effect: `${upper(articleFor(w.worldElement.element))} ${w.worldElement.element} world is hard on ${w.worldElement.against || 'it'}: it holds nine tenths.`, cause: `${upper(w.worldElement.element)} is strong against ${w.worldElement.against || 'its element'} on the element chart.` });
	}
	const climate = climateLine(w, name, planet, env, tol, site);
	if (climate) {
		out.push(climate);
	}
	out.push(...companyLines(w, record));
	out.push(...matchupLines(matchups, record));
	return out;
}

function ReasonMark({ line }) {
	switch (line.mark) {
		case 'home':
			return <HomeGlyph />;
		case 'element':
			return line.element ? <XalianTypeSymbolBadge size={14} type={line.element} classes="rec-why-element-disc" /> : null;
		case 'chart':
			// pass 72: the attacking element's disc, the badge its piece wears
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
