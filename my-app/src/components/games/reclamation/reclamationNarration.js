import { speciesDisplayName, getSpeciesTemplate } from '../../../gameplay/generator/index.js';

/*
	Reclamation - plain-sentence narration of the engine's resolution log.

	Pure functions only (no React, no engine imports beyond the species vocabulary), so
	the sentences can be unit-tested directly. See __tests__/reclamationNarration.test.js.

	THE BASE (docs/design/reclamation-base-redesign.md, 2026-09-09). Orders are gone and
	so are the sixteen acts. Every creature is a hold and one role, and the log the table
	narrates carries three kinds of resolution event, each with a `type`:

		blow   { recordId, role: 'strike' | 'area', site, target, amount, remaining,
		         outcome: 'staggered' | 'routed' | 'cancelled' | 'lapsed' | 'no-target',
		         hidden, cancelled }
		area   { recordId, role: 'area', site, amount, hitCount, hidden, cancelled,
		         cancelledAgainst }   - followed by one `blow` per victim
		shield { recordId, site, cancelled, amount }

	plus the structural 'judge' and 'vanguard-relocate' events, unchanged.

	A blow whose outcome is 'cancelled' is narrated by the SHIELD event that cancelled it
	("Yetimoth shields: Voltish's blow of 4 is cancelled"), so narrateEvent returns null
	for it rather than saying the same thing twice. Every other event gives exactly one
	sentence.
*/

// Display name for a record: the provisional roller gives records no `name`, only a
// `species` and an id, so the table calls a creature by its species. Where two creatures
// of the same species are on the table at once the caller supplies a disambiguator.
export function speciesLabel(record) {
	// the ratified species name from the template (speciesRecords.json); a record that
	// carries no known species falls back to a capitalized form of what it has
	if (!record) {
		return 'a creature';
	}
	if (record.species && getSpeciesTemplate(record.species)) {
		return speciesDisplayName(record.species);
	}
	const raw = record.name || record.species || record.id || 'creature';
	return String(raw)
		.split(/[\s_-]+/)
		.map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(' ');
}

export function classifyEvent(event) {
	if (!event) {
		return 'unknown';
	}
	if (event.type) {
		return event.type;
	}
	return 'unknown';
}

// hold values are fractional; the table prints them to one decimal, dropping a trailing .0
export function formatHold(value) {
	if (typeof value !== 'number' || !isFinite(value)) {
		return '?';
	}
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/*
	The role, as the one sentence the plinth, the bench, the dossier and the ghost preview
	all print (the base redesign's "Interface consequences": one sentence per rule). N is
	the creature's own blow magnitude, before the element matchup against any one target.
*/
export function roleSentence(role, blowMagnitude) {
	const n = typeof blowMagnitude === 'number' ? formatHold(blowMagnitude) : '?';
	switch (role) {
		case 'strike': return `Strikes one enemy here for ${n}`;
		case 'area': return `Strikes everyone here for ${n}`;
		case 'bolster': return 'Bolsters allies here against the world';
		case 'shield': return 'Shields allies here from the largest blow';
		default: return 'Stands here and throws nothing';
	}
}

// the word for the role, where a sentence is too much (a chip, a title attribute)
export function roleWord(role) {
	switch (role) {
		case 'strike': return 'strike';
		case 'area': return 'area';
		case 'bolster': return 'bolster';
		case 'shield': return 'shield';
		default: return 'none';
	}
}

// the verb a landing blow reads with: a strike is aimed, an area catches whatever
// happens to be standing at the world
function blowVerb(role) {
	return role === 'area' ? 'catches' : 'strikes';
}

/*
	narrateEvent(event, ctx) -> one plain sentence, or null for an event the table says
	elsewhere.

	ctx: { actorName, targetName, siteName, worldName }
	Every field is optional; the sentence degrades rather than printing "undefined".
*/
export function narrateEvent(event, ctx = {}) {
	if (!event) {
		return null;
	}
	const actor = ctx.actorName || 'A creature';
	const target = ctx.targetName || 'its target';
	const fromHiding = event.hidden ? ', from hiding,' : '';
	if (event.type === 'shield') {
		if (!event.cancelled) {
			return `${actor} shields, and nothing is thrown at its side.`;
		}
		const blocked = ctx.targetName || 'the blow';
		return `${actor} shields: ${blocked}'s blow of ${formatHold(event.amount)} is cancelled.`;
	}
	if (event.type === 'area') {
		const where = ctx.worldName || ctx.siteName || 'the world';
		const n = typeof event.hitCount === 'number' ? event.hitCount : 0;
		// an area standing alone at a world still declares, and "catching 0 creatures" reads
		// as a non-event; say what actually happened instead
		if (n === 0) {
			return `${actor}${fromHiding} bursts over ${where}, and catches nothing.`;
		}
		return `${actor}${fromHiding} bursts over ${where} for ${formatHold(event.amount)} each, catching ${n} creature${n === 1 ? '' : 's'}.`;
	}
	if (event.type !== 'blow') {
		return null;
	}
	switch (event.outcome) {
		case 'routed':
			return `${actor}${fromHiding} ${blowVerb(event.role)} ${target} for ${formatHold(event.amount)} and routs ${target}.`;
		case 'staggered':
			return `${actor}${fromHiding} ${blowVerb(event.role)} ${target} for ${formatHold(event.amount)}; ${target} stands at ${formatHold(event.remaining)}.`;
		case 'cancelled':
			// said by the shield event that cancelled it
			return null;
		case 'lapsed':
			return `${actor}'s blow lapses, routed first.`;
		case 'no-target':
			return `${actor}${fromHiding} finds no target.`;
		default:
			return `${actor} ${blowVerb(event.role)} ${target}.`;
	}
}

/*
	cueForEvent(event) -> the console cue an event plays, or null. Kept beside the
	sentences because it reads the same outcomes they do.
*/
export function cueForEvent(event) {
	if (!event || event.type !== 'blow') {
		return null;
	}
	if (event.outcome === 'routed') {
		return { name: 'rout' };
	}
	if (event.outcome === 'staggered') {
		return { name: 'strike', opts: { magnitude: 0.8 } };
	}
	return null;
}

export function narrateRelocate(event, ctx = {}) {
	const actor = ctx.actorName || 'The vanguard';
	const from = ctx.fromSiteName || 'its post';
	const to = ctx.toSiteName || 'another site';
	return `${actor} falls back from ${from} to ${to}.`;
}

export function narrateSend(ctx = {}) {
	const who = ctx.you ? 'You send' : 'The rival sends';
	if (ctx.hidden && !ctx.you) {
		return 'The rival sends something, hidden.';
	}
	const name = ctx.actorName || 'a creature';
	const site = ctx.siteName || 'a site';
	const hiddenTag = ctx.hidden ? ', hidden' : '';
	return `${who} ${name} to ${site}${hiddenTag}.`;
}

export function narratePass(ctx = {}) {
	return ctx.you ? 'You pass. You are out of this round’s deploy.' : 'The rival passes for this round.';
}

/*
	narrateJudge(event, ctx) -> [sentence, ...] one per site plus a summary line.
	ctx: { siteNames: {siteId: name}, you: 'A'|'B' }
*/
export function narrateJudge(event, ctx = {}) {
	const you = ctx.you || 'A';
	const names = ctx.siteNames || {};
	const lines = [];
	Object.keys(event.siteResults || {}).forEach((siteId) => {
		const r = event.siteResults[siteId];
		const name = names[siteId] || siteId;
		const a = formatHold(r.holdA);
		const b = formatHold(r.holdB);
		const mine = you === 'A' ? a : b;
		const theirs = you === 'A' ? b : a;
		if (!r.winner) {
			lines.push(`${name} reverts to the Court, ${mine} against ${theirs}.`);
		} else if (r.winner === you) {
			lines.push(`${name} is yours, ${mine} against ${theirs}.`);
		} else {
			lines.push(`${name} goes to the rival, ${theirs} against ${mine}.`);
		}
	});
	return lines;
}

export function narrateMatchEnd(ctx = {}) {
	const { winner, you, sitesYou, sitesThem, reason } = ctx;
	const why = reason === 'clinched'
		? 'clinched at five worlds'
		: reason === 'tiebreak'
			? 'settled on the tiebreak'
			: 'after the third frame';
	const sites = (n) => `${n} world${n === 1 ? '' : 's'}`;
	if (winner === you) {
		return `You take the Charter, ${sites(sitesYou)} to ${sitesThem}, ${why}.`;
	}
	if (winner) {
		return `The rival takes the Charter, ${sites(sitesThem)} to ${sitesYou}, ${why}.`;
	}
	return `The Proving ends level, ${sitesYou} to ${sitesThem}.`;
}
